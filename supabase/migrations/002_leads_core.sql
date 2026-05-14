-- ════════════════════════════════════════════════════════════════
-- Migration 002 — Leads Core (leads + lead_events + score trigger)
-- ────────────────────────────────────────────────────────────────
-- Cria a tabela principal de leads e o histórico de eventos
-- comportamentais. Inclui trigger que recalcula leads.score
-- automaticamente conforme novos eventos são inseridos.
--
-- Compatível com módulos existentes:
--   • vantari-leads-module.jsx        (CRUD leads)
--   • vantari-scoring-system.jsx      (lead_events + score)
--   • vantari-analytics-dashboard.jsx (KPIs)
-- ════════════════════════════════════════════════════════════════

-- ─── ENUM: estágios do funil ───
do $$ begin
  create type lead_stage as enum (
    'Visitor', 'Lead', 'MQL', 'SQL', 'Opportunity', 'Customer'
  );
exception when duplicate_object then null; end $$;

-- ─── Tabela: leads ───
create table if not exists leads (
  id            uuid primary key default gen_random_uuid(),
  name          text,
  email         text not null,
  phone         text,
  company       text,
  source        text,
  stage         lead_stage not null default 'Lead',
  score         integer not null default 0,
  tags          text[] default '{}',
  unsubscribed  boolean not null default false,
  owner_id      uuid,                    -- usuário responsável (futuro: FK auth.users)
  city          text,
  state         text,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,
  utm_term      text,
  last_event_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- Dedupe por email (regra do CLAUDE.md)
  constraint leads_email_unique unique (email)
);

create index if not exists idx_leads_email      on leads(email);
create index if not exists idx_leads_stage      on leads(stage);
create index if not exists idx_leads_score      on leads(score desc);
create index if not exists idx_leads_created    on leads(created_at desc);
create index if not exists idx_leads_owner      on leads(owner_id);
create index if not exists idx_leads_tags       on leads using gin(tags);

-- ─── Tabela: lead_events ───
-- Histórico de comportamento. Cada evento pode ter score_delta
-- (positivo ou negativo). O trigger atualiza leads.score automaticamente.
create table if not exists lead_events (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid not null references leads(id) on delete cascade,
  event_type    text not null,           -- 'page_visit', 'form_submit', 'email_open', etc.
  event_data    jsonb default '{}'::jsonb,
  score_delta   integer not null default 0,
  source        text,                    -- canal/origem do evento
  created_at    timestamptz not null default now()
);

create index if not exists idx_lev_lead    on lead_events(lead_id);
create index if not exists idx_lev_type    on lead_events(event_type);
create index if not exists idx_lev_created on lead_events(created_at desc);

-- ─── Função: aplica score_delta no lead após inserir evento ───
create or replace function apply_lead_event_score()
returns trigger as $$
begin
  update leads
    set score          = greatest(0, score + coalesce(new.score_delta, 0)),
        last_event_at  = new.created_at,
        updated_at     = now()
    where id = new.lead_id;
  return new;
end $$ language plpgsql;

drop trigger if exists trg_lead_event_score on lead_events;
create trigger trg_lead_event_score
  after insert on lead_events
  for each row execute function apply_lead_event_score();

-- ─── Trigger: updated_at em leads ───
-- (função set_updated_at já existe da migration 001)
do $$ begin
  if not exists (select 1 from pg_proc where proname = 'set_updated_at') then
    execute $f$
      create function set_updated_at() returns trigger as $body$
      begin new.updated_at = now(); return new; end $body$ language plpgsql;
    $f$;
  end if;
end $$;

drop trigger if exists trg_leads_updated on leads;
create trigger trg_leads_updated
  before update on leads
  for each row execute function set_updated_at();

-- ─── RLS aberto pra dev ───
alter table leads enable row level security;
alter table lead_events enable row level security;

drop policy if exists "dev_all_leads" on leads;
create policy "dev_all_leads" on leads for all using (true) with check (true);

drop policy if exists "dev_all_lead_events" on lead_events;
create policy "dev_all_lead_events" on lead_events for all using (true) with check (true);

-- ─── Ativa FK lead_custom_values.lead_id -> leads.id (da migration 001) ───
do $$
begin
  if not exists (select 1 from information_schema.table_constraints
                 where table_name='lead_custom_values' and constraint_name='lcv_lead_fk')
  then
    alter table lead_custom_values
      add constraint lcv_lead_fk
      foreign key (lead_id) references leads(id) on delete cascade;
  end if;
end $$;
