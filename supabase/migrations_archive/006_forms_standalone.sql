-- ════════════════════════════════════════════════════════════════
-- Migration 006 — Forms Standalone
-- ────────────────────────────────────────────────────────────────
-- Cria a infra de formulários embedáveis (substitui formulários do RD).
--
-- Tabelas:
--   • forms              — definição (slug, fields jsonb, style, redirect)
--   • form_submissions   — submissões dos leads no site externo
--
-- Flow:
--   1. Vantari → criar form em /landing → Formulários
--   2. Copiar embed code (iframe ou JS snippet)
--   3. Visitante preenche → POST /rest/v1/form_submissions
--   4. Trigger: upsert em leads + insert em lead_events (form_submit +10pts)
-- ════════════════════════════════════════════════════════════════

-- ─── Tabela: forms ───
-- Cria se não existir. Caso já exista (schema legado), adiciona as colunas faltantes.
create table if not exists forms (
  id            uuid primary key default gen_random_uuid(),
  name          text,
  slug          text,
  description   text,
  fields        jsonb default '[]'::jsonb,
  style         jsonb default '{}'::jsonb,
  redirect_url  text,
  success_msg   text default 'Obrigado! Recebemos seus dados.',
  tags          text[] default '{}',
  source_label  text,
  active        boolean default true,
  submission_count int default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Adiciona colunas que possam estar faltando no schema legado
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='forms' and column_name='slug')           then alter table forms add column slug text; end if;
  if not exists (select 1 from information_schema.columns where table_name='forms' and column_name='description')    then alter table forms add column description text; end if;
  if not exists (select 1 from information_schema.columns where table_name='forms' and column_name='fields')         then alter table forms add column fields jsonb default '[]'::jsonb; end if;
  if not exists (select 1 from information_schema.columns where table_name='forms' and column_name='style')          then alter table forms add column style jsonb default '{}'::jsonb; end if;
  if not exists (select 1 from information_schema.columns where table_name='forms' and column_name='redirect_url')   then alter table forms add column redirect_url text; end if;
  if not exists (select 1 from information_schema.columns where table_name='forms' and column_name='success_msg')    then alter table forms add column success_msg text default 'Obrigado! Recebemos seus dados.'; end if;
  if not exists (select 1 from information_schema.columns where table_name='forms' and column_name='tags')           then alter table forms add column tags text[] default '{}'; end if;
  if not exists (select 1 from information_schema.columns where table_name='forms' and column_name='source_label')   then alter table forms add column source_label text; end if;
  if not exists (select 1 from information_schema.columns where table_name='forms' and column_name='active')         then alter table forms add column active boolean default true; end if;
  if not exists (select 1 from information_schema.columns where table_name='forms' and column_name='submission_count') then alter table forms add column submission_count int default 0; end if;
  if not exists (select 1 from information_schema.columns where table_name='forms' and column_name='created_at')     then alter table forms add column created_at timestamptz default now(); end if;
  if not exists (select 1 from information_schema.columns where table_name='forms' and column_name='updated_at')     then alter table forms add column updated_at timestamptz default now(); end if;
end $$;

-- Adiciona stage_on_submit (depende do enum lead_stage existir)
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='forms' and column_name='stage_on_submit') then
    if exists (select 1 from pg_type where typname='lead_stage') then
      alter table forms add column stage_on_submit lead_stage default 'Lead';
    else
      alter table forms add column stage_on_submit text default 'Lead';
    end if;
  end if;
end $$;

-- Relaxa NOT NULL em colunas legadas que possam atrapalhar inserts
do $$
declare col record;
begin
  for col in
    select column_name from information_schema.columns
     where table_schema='public' and table_name='forms'
       and is_nullable='NO'
       and column_name not in ('id','created_at','updated_at')
  loop
    execute format('alter table forms alter column %I drop not null', col.column_name);
  end loop;
end $$;

-- Slug unique (parcial pra permitir NULL durante migração)
create unique index if not exists forms_slug_unique on forms(slug) where slug is not null;
create index if not exists idx_forms_active on forms(active);

-- ─── Tabela: form_submissions ───
create table if not exists form_submissions (
  id            uuid primary key default gen_random_uuid(),
  form_id       uuid,
  lead_id       uuid,
  payload       jsonb default '{}'::jsonb,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,
  utm_term      text,
  user_agent    text,
  referrer      text,
  ip            text,
  created_at    timestamptz default now()
);

-- Adiciona colunas faltantes (schema legado)
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='form_submissions' and column_name='form_id')      then alter table form_submissions add column form_id uuid; end if;
  if not exists (select 1 from information_schema.columns where table_name='form_submissions' and column_name='lead_id')      then alter table form_submissions add column lead_id uuid; end if;
  if not exists (select 1 from information_schema.columns where table_name='form_submissions' and column_name='payload')      then alter table form_submissions add column payload jsonb default '{}'::jsonb; end if;
  if not exists (select 1 from information_schema.columns where table_name='form_submissions' and column_name='utm_source')   then alter table form_submissions add column utm_source text; end if;
  if not exists (select 1 from information_schema.columns where table_name='form_submissions' and column_name='utm_medium')   then alter table form_submissions add column utm_medium text; end if;
  if not exists (select 1 from information_schema.columns where table_name='form_submissions' and column_name='utm_campaign') then alter table form_submissions add column utm_campaign text; end if;
  if not exists (select 1 from information_schema.columns where table_name='form_submissions' and column_name='utm_content')  then alter table form_submissions add column utm_content text; end if;
  if not exists (select 1 from information_schema.columns where table_name='form_submissions' and column_name='utm_term')     then alter table form_submissions add column utm_term text; end if;
  if not exists (select 1 from information_schema.columns where table_name='form_submissions' and column_name='user_agent')   then alter table form_submissions add column user_agent text; end if;
  if not exists (select 1 from information_schema.columns where table_name='form_submissions' and column_name='referrer')     then alter table form_submissions add column referrer text; end if;
  if not exists (select 1 from information_schema.columns where table_name='form_submissions' and column_name='ip')           then alter table form_submissions add column ip text; end if;
  if not exists (select 1 from information_schema.columns where table_name='form_submissions' and column_name='created_at')   then alter table form_submissions add column created_at timestamptz default now(); end if;
end $$;

-- Relaxa NOT NULL legados
do $$
declare col record;
begin
  for col in
    select column_name from information_schema.columns
     where table_schema='public' and table_name='form_submissions'
       and is_nullable='NO'
       and column_name not in ('id','created_at')
  loop
    execute format('alter table form_submissions alter column %I drop not null', col.column_name);
  end loop;
end $$;

create index if not exists idx_fs_form    on form_submissions(form_id);
create index if not exists idx_fs_lead    on form_submissions(lead_id);
create index if not exists idx_fs_created on form_submissions(created_at desc);

-- ─── Função: ao criar uma submission, upsert lead + lead_event ───
create or replace function trg_form_submission_to_lead()
returns trigger as $$
declare
  p_email text;
  p_name  text;
  p_phone text;
  p_company text;
  v_lead_id uuid;
  v_form record;
begin
  -- Extrai campos básicos do payload (jsonb)
  p_email   := lower(coalesce(new.payload ->> 'email', new.payload ->> 'Email'));
  p_name    := coalesce(new.payload ->> 'name', new.payload ->> 'nome', new.payload ->> 'Nome');
  p_phone   := coalesce(new.payload ->> 'phone', new.payload ->> 'telefone', new.payload ->> 'Telefone');
  p_company := coalesce(new.payload ->> 'company', new.payload ->> 'empresa', new.payload ->> 'Empresa');

  if p_email is null or p_email = '' then
    return new;
  end if;

  -- Busca config do form pra aplicar source/tags/stage
  select * into v_form from forms where id = new.form_id;

  -- Upsert lead
  insert into leads (email, name, phone, company, source, stage, utm_source, utm_medium, utm_campaign, utm_content, utm_term, tags)
  values (
    p_email, p_name, p_phone, p_company,
    coalesce(v_form.source_label, 'Form: ' || coalesce(v_form.name,'')),
    coalesce(v_form.stage_on_submit, 'Lead'),
    new.utm_source, new.utm_medium, new.utm_campaign, new.utm_content, new.utm_term,
    coalesce(v_form.tags, '{}')
  )
  on conflict (email) do update set
    name         = coalesce(excluded.name, leads.name),
    phone        = coalesce(excluded.phone, leads.phone),
    company      = coalesce(excluded.company, leads.company),
    utm_source   = coalesce(excluded.utm_source, leads.utm_source),
    utm_medium   = coalesce(excluded.utm_medium, leads.utm_medium),
    utm_campaign = coalesce(excluded.utm_campaign, leads.utm_campaign),
    tags         = (
      select array(select distinct unnest(coalesce(leads.tags,'{}') || coalesce(excluded.tags,'{}')))
    ),
    updated_at   = now()
  returning id into v_lead_id;

  -- Atualiza submission com lead_id
  update form_submissions set lead_id = v_lead_id where id = new.id;

  -- Registra evento de form_submit (trigger de lead_events soma score automaticamente)
  insert into lead_events (lead_id, event_type, event_data, score_delta, source)
  values (
    v_lead_id,
    'form_submit',
    jsonb_build_object('form_id', new.form_id, 'form_name', coalesce(v_form.name,''), 'submission_id', new.id),
    coalesce((select points from scoring_rules where action = 'form_submit' and active = true limit 1), 10),
    coalesce(v_form.source_label, 'form')
  );

  -- Incrementa contador no form
  update forms set submission_count = submission_count + 1, updated_at = now() where id = new.form_id;

  return new;
exception when others then
  -- Não bloqueia a submission se algo der errado no processamento
  return new;
end $$ language plpgsql security definer;

drop trigger if exists trg_fs_to_lead on form_submissions;
create trigger trg_fs_to_lead
  after insert on form_submissions
  for each row execute function trg_form_submission_to_lead();

-- ─── Função: updated_at automático em forms ───
drop trigger if exists trg_forms_updated on forms;
create trigger trg_forms_updated
  before update on forms
  for each row execute function set_updated_at();

-- ─── RLS ───
alter table forms enable row level security;
alter table form_submissions enable row level security;

-- Forms: leitura pública (precisa para renderizar o /f/:slug)
drop policy if exists "forms_public_read" on forms;
create policy "forms_public_read" on forms for select using (active = true);

-- Forms: escrita aberta (dev) — trocar por auth.uid() em produção
drop policy if exists "forms_dev_all" on forms;
create policy "forms_dev_all" on forms for all using (true) with check (true);

-- Form submissions: insert público (qualquer visitante anônimo)
drop policy if exists "fs_public_insert" on form_submissions;
create policy "fs_public_insert" on form_submissions for insert with check (true);

-- Form submissions: leitura/update apenas dev
drop policy if exists "fs_dev_read" on form_submissions;
create policy "fs_dev_read" on form_submissions for select using (true);

drop policy if exists "fs_dev_update" on form_submissions;
create policy "fs_dev_update" on form_submissions for update using (true);

-- ─── Seed: form de exemplo ───
insert into forms (name, slug, description, fields, source_label, success_msg)
values (
  'Newsletter Vantari',
  'newsletter',
  'Captura simples de email para newsletter.',
  '[
    {"id":"name","type":"text","label":"Nome","required":true,"placeholder":"Seu nome"},
    {"id":"email","type":"email","label":"Email","required":true,"placeholder":"seu@email.com"}
  ]'::jsonb,
  'Newsletter',
  'Inscrição confirmada! Em breve você receberá nossas novidades.'
) on conflict (slug) do nothing;
