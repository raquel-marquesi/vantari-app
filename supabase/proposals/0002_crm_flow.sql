-- =============================================================================
-- CRM (Flow) — pipeline de vendas, pendurado no core canônico
-- -----------------------------------------------------------------------------
-- Depende de 0001_core_foundation.sql. Aqui mora o que o COMERCIAL usa:
-- funis, estágios, negócios (deals) e atividades. A identidade da pessoa NÃO
-- é copiada — deals.person_id referencia core.persons(id).
--
-- Integração com o core:
--   * Toda mudança de estágio/ganho/perda emite core.events (timeline única).
--   * core.merge_persons() repontua crm.deals.person_id AUTOMATICAMENTE
--     (descoberta dinâmica de FK) — nada a fazer aqui.
--   * 'deal_won' vira o gatilho de handoff para o financeiro (fin/ERP).
--
-- PROPOSTA PARA REVISÃO — não aplicada.
-- =============================================================================

create schema if not exists crm;

-- ---------- Funis e estágios (configuráveis por workspace) ----------
create table if not exists crm.pipelines (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces(id) on delete cascade,
  name         text not null,
  is_default   boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists pipelines_ws_idx on crm.pipelines (workspace_id);

create table if not exists crm.stages (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces(id) on delete cascade,
  pipeline_id  uuid not null references crm.pipelines(id) on delete cascade,
  name         text not null,
  position     int  not null default 0,
  kind         text not null default 'open' check (kind in ('open', 'won', 'lost')),
  created_at   timestamptz not null default now()
);
create index if not exists stages_pipeline_idx on crm.stages (pipeline_id, position);

-- ---------- Negócios ----------
create table if not exists crm.deals (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces(id) on delete cascade,
  person_id    uuid not null references core.persons(id)   on delete cascade,
  company_id   uuid references core.companies(id) on delete set null,
  pipeline_id  uuid not null references crm.pipelines(id),
  stage_id     uuid not null references crm.stages(id),
  title        text,
  value_cents  bigint not null default 0,
  currency     text not null default 'BRL',
  status       text not null default 'open' check (status in ('open', 'won', 'lost')),
  owner_id     uuid references auth.users(id) on delete set null,
  source       text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  closed_at    timestamptz
);
create index if not exists deals_stage_idx  on crm.deals (workspace_id, stage_id);
create index if not exists deals_person_idx on crm.deals (person_id);
create index if not exists deals_owner_idx  on crm.deals (workspace_id, owner_id);

-- ---------- Atividades (notas, ligações, tarefas) ----------
create table if not exists crm.activities (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces(id) on delete cascade,
  deal_id      uuid references crm.deals(id)     on delete cascade,
  person_id    uuid references core.persons(id)  on delete cascade,
  type         text not null check (type in ('note', 'call', 'meeting', 'task', 'whatsapp', 'email')),
  content      text,
  due_at       timestamptz,
  done         boolean not null default false,
  owner_id     uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists activities_deal_idx   on crm.activities (deal_id);
create index if not exists activities_person_idx on crm.activities (person_id);

-- =============================================================================
-- Triggers: status derivado do estágio + emissão de eventos no core
-- =============================================================================

-- BEFORE: status do deal sempre reflete o kind do estágio; carimba closed_at
create or replace function crm.sync_deal_status()
returns trigger language plpgsql set search_path = crm, public as $$
declare v_kind text;
begin
  new.updated_at := now();
  select kind into v_kind from crm.stages where id = new.stage_id;
  new.status := coalesce(v_kind, 'open');
  if new.status in ('won', 'lost')
     then new.closed_at := coalesce(new.closed_at, now());
     else new.closed_at := null;
  end if;
  return new;
end $$;

drop trigger if exists trg_deal_status on crm.deals;
create trigger trg_deal_status before insert or update on crm.deals
  for each row execute function crm.sync_deal_status();

-- AFTER: alimenta a timeline única (core.events). SECURITY DEFINER para poder
-- escrever em core.events independente da RLS do chamador (só grava o próprio
-- workspace do deal, então é seguro).
create or replace function crm.log_deal_event()
returns trigger language plpgsql security definer set search_path = core, crm, public as $$
begin
  if tg_op = 'INSERT' then
    insert into core.events (workspace_id, person_id, company_id, source, type, payload)
    values (new.workspace_id, new.person_id, new.company_id, 'crm', 'deal_created',
            jsonb_build_object('deal_id', new.id, 'stage_id', new.stage_id,
                               'value_cents', new.value_cents));
  elsif tg_op = 'UPDATE' and new.stage_id is distinct from old.stage_id then
    insert into core.events (workspace_id, person_id, company_id, source, type, payload)
    values (new.workspace_id, new.person_id, new.company_id, 'crm', 'stage_changed',
            jsonb_build_object('deal_id', new.id, 'from', old.stage_id,
                               'to', new.stage_id, 'status', new.status));
    -- gatilho de handoff para o financeiro quando ganha
    if new.status = 'won' then
      insert into core.events (workspace_id, person_id, company_id, source, type, payload)
      values (new.workspace_id, new.person_id, new.company_id, 'crm', 'deal_won',
              jsonb_build_object('deal_id', new.id, 'value_cents', new.value_cents));
    end if;
  end if;
  return null;
end $$;

drop trigger if exists trg_deal_event on crm.deals;
create trigger trg_deal_event after insert or update on crm.deals
  for each row execute function crm.log_deal_event();

-- =============================================================================
-- Helper: garante um funil padrão para um workspace (idempotente)
-- =============================================================================
create or replace function crm.ensure_default_pipeline(p_workspace uuid)
returns uuid language plpgsql security definer set search_path = crm, public as $$
declare v_pipe uuid;
begin
  select id into v_pipe from crm.pipelines
   where workspace_id = p_workspace and is_default limit 1;
  if v_pipe is not null then return v_pipe; end if;

  insert into crm.pipelines (workspace_id, name, is_default)
  values (p_workspace, 'Funil de Vendas', true) returning id into v_pipe;

  insert into crm.stages (workspace_id, pipeline_id, name, position, kind) values
    (p_workspace, v_pipe, 'Novo lead',    1, 'open'),
    (p_workspace, v_pipe, 'Qualificação', 2, 'open'),
    (p_workspace, v_pipe, 'Proposta',     3, 'open'),
    (p_workspace, v_pipe, 'Negociação',   4, 'open'),
    (p_workspace, v_pipe, 'Ganho',        5, 'won'),
    (p_workspace, v_pipe, 'Perdido',      6, 'lost');
  return v_pipe;
end $$;

-- =============================================================================
-- Segurança — mesma postura do core: anon nunca; authenticated só seu workspace
-- =============================================================================
grant usage on schema crm to authenticated, service_role;
revoke all on schema crm from anon;
grant select, insert, update, delete on all tables in schema crm to authenticated;
grant all on all tables in schema crm to service_role;
alter default privileges in schema crm
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema crm grant all on tables to service_role;
grant execute on function crm.ensure_default_pipeline(uuid) to authenticated, service_role;

alter table crm.pipelines  enable row level security;
alter table crm.stages     enable row level security;
alter table crm.deals      enable row level security;
alter table crm.activities enable row level security;

create policy pipelines_rw on crm.pipelines for all to authenticated
  using      (workspace_id in (select core.current_workspace_ids()))
  with check (workspace_id in (select core.current_workspace_ids()));
create policy stages_rw on crm.stages for all to authenticated
  using      (workspace_id in (select core.current_workspace_ids()))
  with check (workspace_id in (select core.current_workspace_ids()));
create policy deals_rw on crm.deals for all to authenticated
  using      (workspace_id in (select core.current_workspace_ids()))
  with check (workspace_id in (select core.current_workspace_ids()));
create policy activities_rw on crm.activities for all to authenticated
  using      (workspace_id in (select core.current_workspace_ids()))
  with check (workspace_id in (select core.current_workspace_ids()));
