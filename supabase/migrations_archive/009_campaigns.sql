-- ════════════════════════════════════════════════════════════════
-- Migration 009 — Campaigns + campaign_sends
-- ────────────────────────────────────────────────────────────────
-- Cria a infra que /email precisa para listar/criar campanhas e
-- registrar métricas (delivered, opened, clicked, bounced, unsub).
-- ════════════════════════════════════════════════════════════════

-- ─── Tabela: campaigns ───
-- template_id sem FK rígida (campaigns pode existir sem email_templates)
create table if not exists campaigns (
  id              uuid primary key default gen_random_uuid(),
  name            text,
  subject         text,
  sender          text,
  from_name       text,
  from_email      text,
  html_content    text,
  bee_json        jsonb,                       -- estrutura BeeFree quando aplicável
  blocks          jsonb default '[]'::jsonb,   -- blocos do editor visual Vantari
  template_id     uuid,                        -- FK opcional adicionada depois se email_templates existir
  status          text default 'draft',        -- draft, scheduled, sending, sent, paused
  type            text default 'newsletter',   -- newsletter, promotional, follow-up, etc.
  audience        text,                        -- nome do segmento alvo
  audience_count  int default 0,               -- snapshot do tamanho do segmento
  segment_id      uuid,
  scheduled_at    timestamptz,
  sent_at         timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Defensivo: adiciona colunas faltantes se tabela já existir (ANTES da FK)
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='campaigns' and column_name='name')           then alter table campaigns add column name text; end if;
  if not exists (select 1 from information_schema.columns where table_name='campaigns' and column_name='subject')        then alter table campaigns add column subject text; end if;
  if not exists (select 1 from information_schema.columns where table_name='campaigns' and column_name='sender')         then alter table campaigns add column sender text; end if;
  if not exists (select 1 from information_schema.columns where table_name='campaigns' and column_name='from_name')      then alter table campaigns add column from_name text; end if;
  if not exists (select 1 from information_schema.columns where table_name='campaigns' and column_name='from_email')     then alter table campaigns add column from_email text; end if;
  if not exists (select 1 from information_schema.columns where table_name='campaigns' and column_name='html_content')   then alter table campaigns add column html_content text; end if;
  if not exists (select 1 from information_schema.columns where table_name='campaigns' and column_name='bee_json')       then alter table campaigns add column bee_json jsonb; end if;
  if not exists (select 1 from information_schema.columns where table_name='campaigns' and column_name='blocks')         then alter table campaigns add column blocks jsonb default '[]'::jsonb; end if;
  if not exists (select 1 from information_schema.columns where table_name='campaigns' and column_name='template_id')    then alter table campaigns add column template_id uuid; end if;
  if not exists (select 1 from information_schema.columns where table_name='campaigns' and column_name='status')         then alter table campaigns add column status text default 'draft'; end if;
  if not exists (select 1 from information_schema.columns where table_name='campaigns' and column_name='type')           then alter table campaigns add column type text default 'newsletter'; end if;
  if not exists (select 1 from information_schema.columns where table_name='campaigns' and column_name='audience')       then alter table campaigns add column audience text; end if;
  if not exists (select 1 from information_schema.columns where table_name='campaigns' and column_name='audience_count') then alter table campaigns add column audience_count int default 0; end if;
  if not exists (select 1 from information_schema.columns where table_name='campaigns' and column_name='segment_id')     then alter table campaigns add column segment_id uuid; end if;
  if not exists (select 1 from information_schema.columns where table_name='campaigns' and column_name='scheduled_at')   then alter table campaigns add column scheduled_at timestamptz; end if;
  if not exists (select 1 from information_schema.columns where table_name='campaigns' and column_name='sent_at')        then alter table campaigns add column sent_at timestamptz; end if;
  if not exists (select 1 from information_schema.columns where table_name='campaigns' and column_name='created_at')     then alter table campaigns add column created_at timestamptz default now(); end if;
  if not exists (select 1 from information_schema.columns where table_name='campaigns' and column_name='updated_at')     then alter table campaigns add column updated_at timestamptz default now(); end if;
end $$;

-- Relaxa NOT NULL legados
do $$
declare col record;
begin
  for col in
    select column_name from information_schema.columns
     where table_schema='public' and table_name='campaigns'
       and is_nullable='NO'
       and column_name not in ('id','created_at','updated_at')
  loop
    execute format('alter table campaigns alter column %I drop not null', col.column_name);
  end loop;
end $$;

create index if not exists idx_campaigns_status     on campaigns(status);
create index if not exists idx_campaigns_created    on campaigns(created_at desc);
create index if not exists idx_campaigns_scheduled  on campaigns(scheduled_at);

-- FK para email_templates (só agora, depois das colunas)
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='email_templates')
     and exists (select 1 from information_schema.columns where table_name='campaigns' and column_name='template_id')
     and not exists (select 1 from information_schema.table_constraints where constraint_name='campaigns_template_fk')
  then
    alter table campaigns
      add constraint campaigns_template_fk
      foreign key (template_id) references email_templates(id) on delete set null;
  end if;
end $$;

-- ─── Tabela: campaign_sends ───
-- Métricas agregadas por campanha (ou por lead+campanha — flexível).
create table if not exists campaign_sends (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   uuid,
  lead_id       uuid,
  delivered     int default 0,
  opened        int default 0,
  clicked       int default 0,
  bounced       int default 0,
  unsubscribed  int default 0,
  status        text default 'pending',     -- pending, delivered, opened, clicked, bounced, unsub
  sent_at       timestamptz default now(),
  opened_at     timestamptz,
  clicked_at    timestamptz,
  created_at    timestamptz default now()
);

-- Defensivo
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='campaign_sends' and column_name='campaign_id')  then alter table campaign_sends add column campaign_id uuid; end if;
  if not exists (select 1 from information_schema.columns where table_name='campaign_sends' and column_name='lead_id')      then alter table campaign_sends add column lead_id uuid; end if;
  if not exists (select 1 from information_schema.columns where table_name='campaign_sends' and column_name='delivered')    then alter table campaign_sends add column delivered int default 0; end if;
  if not exists (select 1 from information_schema.columns where table_name='campaign_sends' and column_name='opened')       then alter table campaign_sends add column opened int default 0; end if;
  if not exists (select 1 from information_schema.columns where table_name='campaign_sends' and column_name='clicked')      then alter table campaign_sends add column clicked int default 0; end if;
  if not exists (select 1 from information_schema.columns where table_name='campaign_sends' and column_name='bounced')      then alter table campaign_sends add column bounced int default 0; end if;
  if not exists (select 1 from information_schema.columns where table_name='campaign_sends' and column_name='unsubscribed') then alter table campaign_sends add column unsubscribed int default 0; end if;
  if not exists (select 1 from information_schema.columns where table_name='campaign_sends' and column_name='status')       then alter table campaign_sends add column status text default 'pending'; end if;
  if not exists (select 1 from information_schema.columns where table_name='campaign_sends' and column_name='sent_at')      then alter table campaign_sends add column sent_at timestamptz default now(); end if;
  if not exists (select 1 from information_schema.columns where table_name='campaign_sends' and column_name='opened_at')    then alter table campaign_sends add column opened_at timestamptz; end if;
  if not exists (select 1 from information_schema.columns where table_name='campaign_sends' and column_name='clicked_at')   then alter table campaign_sends add column clicked_at timestamptz; end if;
  if not exists (select 1 from information_schema.columns where table_name='campaign_sends' and column_name='created_at')   then alter table campaign_sends add column created_at timestamptz default now(); end if;
end $$;

do $$
declare col record;
begin
  for col in
    select column_name from information_schema.columns
     where table_schema='public' and table_name='campaign_sends'
       and is_nullable='NO'
       and column_name not in ('id','created_at')
  loop
    execute format('alter table campaign_sends alter column %I drop not null', col.column_name);
  end loop;
end $$;

create index if not exists idx_cs_campaign on campaign_sends(campaign_id);
create index if not exists idx_cs_lead     on campaign_sends(lead_id);
create index if not exists idx_cs_status   on campaign_sends(status);

-- Adiciona FKs condicionais (só se as tabelas referenciadas existirem)
do $$ begin
  if not exists (select 1 from information_schema.table_constraints where constraint_name='cs_campaign_fk') then
    alter table campaign_sends add constraint cs_campaign_fk
      foreign key (campaign_id) references campaigns(id) on delete cascade;
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='leads')
     and not exists (select 1 from information_schema.table_constraints where constraint_name='cs_lead_fk')
  then
    alter table campaign_sends add constraint cs_lead_fk
      foreign key (lead_id) references leads(id) on delete set null;
  end if;
end $$;

-- Updated_at automático para campaigns
drop trigger if exists trg_campaigns_updated on campaigns;
create trigger trg_campaigns_updated
  before update on campaigns
  for each row execute function set_updated_at();

-- RLS aberto pra dev
alter table campaigns      enable row level security;
alter table campaign_sends enable row level security;

drop policy if exists "campaigns_dev_all" on campaigns;
create policy "campaigns_dev_all" on campaigns for all using (true) with check (true);

drop policy if exists "cs_dev_all" on campaign_sends;
create policy "cs_dev_all" on campaign_sends for all using (true) with check (true);
