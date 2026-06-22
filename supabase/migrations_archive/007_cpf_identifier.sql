-- ════════════════════════════════════════════════════════════════
-- Migration 007 — CPF como identificador único (substitui email)
-- ────────────────────────────────────────────────────────────────
-- Decisão arquitetural: pessoas mudam de email, mas não mudam de CPF.
-- CPF passa a ser o identificador único primário de cada lead.
--
-- Estratégia:
--   • Adiciona coluna `cpf` em leads (text, 11 dígitos limpos)
--   • UNIQUE quando preenchido (índice parcial → permite NULL)
--   • Email continua único quando preenchido (legacy)
--   • Lead sem CPF = status "pendente" (precisa completar)
--   • Função merge_lead_by_cpf: ao descobrir CPF de lead email-only,
--     funde com lead CPF existente se houver duplicata.
-- ════════════════════════════════════════════════════════════════

-- ─── Adiciona coluna cpf ───
do $$ begin
  if not exists (
    select 1 from information_schema.columns
     where table_name='leads' and column_name='cpf'
  ) then
    alter table leads add column cpf text;
  end if;
end $$;

-- ─── Função: limpa CPF (remove pontos, traços, espaços) ───
create or replace function clean_cpf(p_cpf text)
returns text as $$
declare
  v text;
begin
  if p_cpf is null then return null; end if;
  v := regexp_replace(p_cpf, '[^0-9]', '', 'g');
  if length(v) <> 11 then return null; end if;
  if v ~ '^(\d)\1{10}$' then return null; end if;  -- rejeita 11111111111 etc.
  return v;
end $$ language plpgsql immutable;

-- ─── Função: valida CPF (checksum brasileiro) ───
create or replace function valid_cpf(p_cpf text)
returns boolean as $$
declare
  v text;
  d1 int := 0;
  d2 int := 0;
  i  int;
begin
  v := clean_cpf(p_cpf);
  if v is null then return false; end if;

  for i in 1..9 loop
    d1 := d1 + (substring(v, i, 1)::int * (11 - i));
  end loop;
  d1 := 11 - (d1 % 11);
  if d1 >= 10 then d1 := 0; end if;
  if d1 <> substring(v, 10, 1)::int then return false; end if;

  for i in 1..10 loop
    d2 := d2 + (substring(v, i, 1)::int * (12 - i));
  end loop;
  d2 := 11 - (d2 % 11);
  if d2 >= 10 then d2 := 0; end if;
  return d2 = substring(v, 11, 1)::int;
end $$ language plpgsql immutable;

-- ─── Trigger: normaliza CPF ao inserir/atualizar ───
create or replace function trg_normalize_cpf()
returns trigger as $$
begin
  new.cpf := clean_cpf(new.cpf);
  return new;
end $$ language plpgsql;

drop trigger if exists trg_leads_normalize_cpf on leads;
create trigger trg_leads_normalize_cpf
  before insert or update of cpf on leads
  for each row execute function trg_normalize_cpf();

-- ─── UNIQUE constraint em CPF (parcial: só quando preenchido) ───
-- Limpa CPFs duplicados primeiro (caso existam)
update leads set cpf = clean_cpf(cpf) where cpf is not null;

-- Remove duplicatas mantendo o mais antigo
delete from leads l1
using leads l2
where l1.cpf is not null
  and l2.cpf is not null
  and l1.cpf = l2.cpf
  and l1.created_at > l2.created_at;

create unique index if not exists leads_cpf_unique on leads(cpf) where cpf is not null;

create index if not exists idx_leads_cpf on leads(cpf);

-- ─── Função: completude do lead ───
-- Retorna true se o lead tem identificação suficiente (CPF preenchido)
create or replace function lead_is_complete(p_lead leads)
returns boolean as $$
begin
  return p_lead.cpf is not null and length(p_lead.cpf) = 11;
end $$ language plpgsql immutable;

-- View útil pra ver leads pendentes (sem CPF)
create or replace view leads_pending as
  select id, name, email, phone, company, created_at, source
    from leads
   where cpf is null;

-- ─── Função: merge automático quando descobre CPF ───
-- Quando um lead recebe CPF e já existe outro lead com mesmo CPF,
-- funde os dois: mantém o lead "alvo" (com CPF) e copia dados do "fonte".
create or replace function merge_lead_by_cpf(p_source_lead_id uuid, p_cpf text)
returns uuid as $$
declare
  v_cpf text;
  v_target_id uuid;
  v_source leads%rowtype;
begin
  v_cpf := clean_cpf(p_cpf);
  if v_cpf is null then
    raise exception 'CPF inválido: %', p_cpf;
  end if;

  -- Busca lead já existente com esse CPF
  select id into v_target_id from leads where cpf = v_cpf and id <> p_source_lead_id limit 1;

  if v_target_id is null then
    -- Não há merge: só atualiza CPF do source
    update leads set cpf = v_cpf, updated_at = now() where id = p_source_lead_id;
    return p_source_lead_id;
  end if;

  -- Existe duplicata: fundir source no target (CPF wins)
  select * into v_source from leads where id = p_source_lead_id;

  -- Move lead_events e form_submissions para o target
  update lead_events     set lead_id = v_target_id where lead_id = p_source_lead_id;
  update form_submissions set lead_id = v_target_id where lead_id = p_source_lead_id;

  -- Move custom values (resolve conflitos: target ganha)
  insert into lead_custom_values (lead_id, custom_field_id, value)
    select v_target_id, custom_field_id, value
      from lead_custom_values
     where lead_id = p_source_lead_id
  on conflict (lead_id, custom_field_id) do nothing;
  delete from lead_custom_values where lead_id = p_source_lead_id;

  -- Atualiza target com dados do source que estão NULL no target
  update leads set
    name    = coalesce(name, v_source.name),
    email   = coalesce(email, v_source.email),
    phone   = coalesce(phone, v_source.phone),
    company = coalesce(company, v_source.company),
    source  = coalesce(source, v_source.source),
    tags    = (select array(select distinct unnest(coalesce(tags,'{}') || coalesce(v_source.tags,'{}')))),
    score   = greatest(score, coalesce(v_source.score, 0)),
    updated_at = now()
  where id = v_target_id;

  -- Deleta o source
  delete from leads where id = p_source_lead_id;

  return v_target_id;
end $$ language plpgsql;

-- ─── Atualizar trigger do form_submissions pra usar CPF quando disponível ───
-- (substitui a função criada em migration 006)
create or replace function trg_form_submission_to_lead()
returns trigger as $$
declare
  p_email text;
  p_cpf   text;
  p_name  text;
  p_phone text;
  p_company text;
  v_lead_id uuid;
  v_form record;
begin
  p_email   := lower(coalesce(new.payload ->> 'email', new.payload ->> 'Email'));
  p_cpf     := clean_cpf(coalesce(new.payload ->> 'cpf', new.payload ->> 'CPF'));
  p_name    := coalesce(new.payload ->> 'name', new.payload ->> 'nome', new.payload ->> 'Nome');
  p_phone   := coalesce(new.payload ->> 'phone', new.payload ->> 'telefone', new.payload ->> 'Telefone');
  p_company := coalesce(new.payload ->> 'company', new.payload ->> 'empresa', new.payload ->> 'Empresa');

  -- Precisa pelo menos CPF ou email
  if p_cpf is null and (p_email is null or p_email = '') then
    return new;
  end if;

  select * into v_form from forms where id = new.form_id;

  -- Caso 1: tem CPF → upsert por CPF
  if p_cpf is not null then
    insert into leads (cpf, email, name, phone, company, source, stage, utm_source, utm_medium, utm_campaign, tags)
    values (
      p_cpf, p_email, p_name, p_phone, p_company,
      coalesce(v_form.source_label, 'Form: ' || coalesce(v_form.name,'')),
      coalesce(v_form.stage_on_submit, 'Lead'),
      new.utm_source, new.utm_medium, new.utm_campaign,
      coalesce(v_form.tags, '{}')
    )
    on conflict (cpf) do update set
      email      = coalesce(leads.email, excluded.email),
      name       = coalesce(leads.name, excluded.name),
      phone      = coalesce(leads.phone, excluded.phone),
      company    = coalesce(leads.company, excluded.company),
      tags       = (select array(select distinct unnest(coalesce(leads.tags,'{}') || coalesce(excluded.tags,'{}')))),
      updated_at = now()
    returning id into v_lead_id;

    -- Se já existe lead com mesmo email mas sem CPF → merge
    if p_email is not null and p_email <> '' then
      perform merge_lead_by_cpf(l.id, p_cpf)
        from leads l
       where l.email = p_email
         and l.cpf is null
         and l.id <> v_lead_id;
    end if;

  else
    -- Caso 2: só email → cria/atualiza lead "pendente" (sem CPF)
    insert into leads (email, name, phone, company, source, stage, utm_source, utm_medium, utm_campaign, tags)
    values (
      p_email, p_name, p_phone, p_company,
      coalesce(v_form.source_label, 'Form: ' || coalesce(v_form.name,'')),
      coalesce(v_form.stage_on_submit, 'Lead'),
      new.utm_source, new.utm_medium, new.utm_campaign,
      coalesce(v_form.tags, '{}')
    )
    on conflict (email) do update set
      name       = coalesce(leads.name, excluded.name),
      phone      = coalesce(leads.phone, excluded.phone),
      company    = coalesce(leads.company, excluded.company),
      tags       = (select array(select distinct unnest(coalesce(leads.tags,'{}') || coalesce(excluded.tags,'{}')))),
      updated_at = now()
    returning id into v_lead_id;
  end if;

  update form_submissions set lead_id = v_lead_id where id = new.id;

  insert into lead_events (lead_id, event_type, event_data, score_delta, source)
  values (
    v_lead_id,
    'form_submit',
    jsonb_build_object('form_id', new.form_id, 'form_name', coalesce(v_form.name,''), 'submission_id', new.id),
    coalesce((select points from scoring_rules where action = 'form_submit' and active = true limit 1), 10),
    coalesce(v_form.source_label, 'form')
  );

  update forms set submission_count = submission_count + 1, updated_at = now() where id = new.form_id;

  return new;
exception when others then
  return new;
end $$ language plpgsql security definer;

-- ─── Inclui cpf como campo padrão do importador via custom_fields ───
-- Cria campo cf_cpf se não existir
insert into custom_fields (label, api_id, type, source, required, active, position)
values ('CPF', 'cf_cpf', 'text', 'manual', false, true, 0)
on conflict (api_id) do nothing;
