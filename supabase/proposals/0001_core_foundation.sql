-- =============================================================================
-- CORE FOUNDATION — system of record canônico (Vantari)
-- -----------------------------------------------------------------------------
-- Alicerce do ambiente unificado: Flow (crm), Next (mkt) e Financeiro (fin)
-- são SCHEMAS-irmãos que referenciam este core. Nina fica federada e alimenta
-- o core por eventos (Edge Function com service_role).
--
-- Princípios:
--   * 1 pessoa = 1 linha. Identidade por CPF (primário) ou telefone (fallback).
--   * Multi-tenant por workspace_id em TODA tabela.
--   * RLS fechada: anon NÃO acessa nada. authenticated só enxerga seu workspace.
--     Form público / Nina / ads escrevem via Edge Function (service_role).
--
-- PROPOSTA PARA REVISÃO — não aplicada. Depois de revisar:
--   supabase db push        (ou rodar este arquivo no SQL editor)
-- E em Project Settings > API > Exposed schemas, adicionar: core
-- (mantém RLS protegendo as linhas; sem expor, o front não lê via supabase-js).
-- =============================================================================

create schema if not exists core;

-- =============================================================================
-- 0. HELPERS
-- =============================================================================

-- só dígitos (normaliza CPF/telefone); '' vira NULL
create or replace function core.only_digits(p text)
returns text language sql immutable as $$
  select nullif(regexp_replace(coalesce(p, ''), '\D', '', 'g'), '')
$$;

-- validação de CPF por checksum (rejeita dígitos repetidos e DV inválido)
create or replace function core.is_valid_cpf(p text)
returns boolean language plpgsql immutable as $$
declare
  d text := core.only_digits(p);
  s int; r int; i int;
begin
  if d is null or length(d) <> 11 then return false; end if;
  if d ~ '^(\d)\1{10}$' then return false; end if;          -- todos iguais
  s := 0;
  for i in 1..9 loop s := s + substr(d, i, 1)::int * (11 - i); end loop;
  r := 11 - (s % 11); if r >= 10 then r := 0; end if;
  if r <> substr(d, 10, 1)::int then return false; end if;
  s := 0;
  for i in 1..10 loop s := s + substr(d, i, 1)::int * (12 - i); end loop;
  r := 11 - (s % 11); if r >= 10 then r := 0; end if;
  if r <> substr(d, 11, 1)::int then return false; end if;
  return true;
end $$;

-- trigger genérico de updated_at
create or replace function core.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

-- =============================================================================
-- 1. TENANCY
-- =============================================================================

create table if not exists core.workspaces (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists core.workspace_members (
  workspace_id uuid not null references core.workspaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id)      on delete cascade,
  role         text not null default 'member'
               check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

-- workspaces do usuário logado. SECURITY DEFINER = roda como dono e ignora RLS,
-- evitando recursão quando as policies abaixo consultam workspace_members.
create or replace function core.current_workspace_ids()
returns setof uuid
language sql stable security definer set search_path = core, public as $$
  select workspace_id from core.workspace_members where user_id = auth.uid()
$$;

-- =============================================================================
-- 2. ENTIDADES CANÔNICAS
-- =============================================================================

create table if not exists core.companies (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces(id) on delete cascade,
  cnpj         text,
  name         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint cnpj_unico_por_workspace unique (workspace_id, cnpj)
);

create table if not exists core.persons (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references core.workspaces(id) on delete cascade,
  company_id    uuid references core.companies(id) on delete set null,
  cpf           text,                       -- 11 dígitos, NULL = PENDENTE
  status        text not null default 'pendente'
                check (status in ('pendente', 'identificado')),
  full_name     text,
  primary_email text,
  primary_phone text,                        -- dígitos (com DDD)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint cpf_formato  check (cpf is null or cpf ~ '^\d{11}$'),
  constraint cpf_valido   check (cpf is null or core.is_valid_cpf(cpf)),
  -- CPF único POR workspace (NULLs não colidem → muitos PENDENTE convivem)
  constraint cpf_unico_por_workspace unique (workspace_id, cpf)
);
create index if not exists persons_company_idx on core.persons (company_id);

-- N identificadores por pessoa: resolve "telefone antes do CPF"
create table if not exists core.person_identifiers (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces(id) on delete cascade,
  person_id    uuid not null references core.persons(id) on delete cascade,
  kind         text not null
               check (kind in ('cpf', 'phone', 'email', 'whatsapp_id',
                               'meta_lead_id', 'external')),
  value        text not null,
  verified     boolean not null default false,
  created_at   timestamptz not null default now(),
  constraint identifier_unico unique (workspace_id, kind, value)
);
create index if not exists identifiers_person_idx on core.person_identifiers (person_id);

-- log append-only: trilha de auditoria + fonte de analytics + gatilho de fan-out
create table if not exists core.events (
  id           bigint generated always as identity primary key,
  workspace_id uuid not null references core.workspaces(id) on delete cascade,
  person_id    uuid references core.persons(id)   on delete set null,
  company_id   uuid references core.companies(id) on delete set null,
  source       text not null,    -- meta | google | form | nina | email | manual | system
  type         text not null,    -- lead_created | page_visit | form_submit | whatsapp_in
                                  -- | stage_changed | contract_signed | persons_merged ...
  payload      jsonb not null default '{}',
  occurred_at  timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
create index if not exists events_person_idx on core.events (workspace_id, person_id, occurred_at desc);
create index if not exists events_type_idx   on core.events (workspace_id, type, occurred_at desc);

-- consentimento LGPD: estado atual por canal (histórico fica em core.events)
create table if not exists core.consents (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces(id) on delete cascade,
  person_id    uuid not null references core.persons(id) on delete cascade,
  channel      text not null
               check (channel in ('email', 'whatsapp', 'sms', 'phone', 'data_processing')),
  status       text not null check (status in ('granted', 'revoked')),
  basis        text,             -- base legal: consentimento | legitimo_interesse | contrato
  source       text,
  occurred_at  timestamptz not null default now(),
  constraint consent_unico unique (workspace_id, person_id, channel)
);

-- updated_at triggers
drop trigger if exists trg_ws_touch on core.workspaces;
create trigger trg_ws_touch before update on core.workspaces
  for each row execute function core.touch_updated_at();
drop trigger if exists trg_co_touch on core.companies;
create trigger trg_co_touch before update on core.companies
  for each row execute function core.touch_updated_at();
drop trigger if exists trg_pe_touch on core.persons;
create trigger trg_pe_touch before update on core.persons
  for each row execute function core.touch_updated_at();

-- =============================================================================
-- 3. RESOLUÇÃO DE IDENTIDADE  (o coração do hub)
-- =============================================================================

-- Funde 'loser' em 'survivor'. Repontua DINAMICAMENTE qualquer FK que aponte
-- para core.persons(id) — então crm.deals / mkt.* / fin.* (criados depois)
-- são corrigidos automaticamente, sem alterar esta função.
create or replace function core.merge_persons(p_survivor uuid, p_loser uuid)
returns void
language plpgsql security definer set search_path = core, public as $$
declare
  r record;
begin
  if p_survivor is null or p_loser is null or p_survivor = p_loser then
    return;
  end if;

  -- 1) repontar todas as FKs → core.persons, EXCETO tabelas com unicidade por
  --    pessoa (tratadas à mão abaixo, com resolução de conflito)
  for r in
    select n.nspname as sch, c.relname as tbl, a.attname as col
    from pg_constraint con
    join pg_class      c  on c.oid = con.conrelid
    join pg_namespace  n  on n.oid = c.relnamespace
    join pg_attribute  a  on a.attrelid = con.conrelid and a.attnum = any (con.conkey)
    join pg_class      fc on fc.oid = con.confrelid
    join pg_namespace  fn on fn.oid = fc.relnamespace
    where con.contype = 'f'
      and fn.nspname = 'core' and fc.relname = 'persons'
      and not (n.nspname = 'core' and c.relname in ('person_identifiers', 'consents'))
  loop
    execute format('update %I.%I set %I = %L where %I = %L',
                   r.sch, r.tbl, r.col, p_survivor, r.col, p_loser);
  end loop;

  -- 2) identificadores: mover os que não colidem, descartar duplicados
  update core.person_identifiers i set person_id = p_survivor
   where i.person_id = p_loser
     and not exists (
       select 1 from core.person_identifiers j
       where j.workspace_id = i.workspace_id and j.kind = i.kind
         and j.value = i.value and j.person_id = p_survivor);
  delete from core.person_identifiers where person_id = p_loser;

  -- 3) consents: idem (unique por person+channel)
  update core.consents c set person_id = p_survivor
   where c.person_id = p_loser
     and not exists (
       select 1 from core.consents d
       where d.workspace_id = c.workspace_id and d.person_id = p_survivor
         and d.channel = c.channel);
  delete from core.consents where person_id = p_loser;

  -- 4) enriquecer survivor com campos vazios vindos do loser
  update core.persons s set
     cpf           = coalesce(s.cpf, l.cpf),
     full_name     = coalesce(s.full_name, l.full_name),
     primary_email = coalesce(s.primary_email, l.primary_email),
     primary_phone = coalesce(s.primary_phone, l.primary_phone),
     status        = case when coalesce(s.cpf, l.cpf) is not null
                          then 'identificado' else s.status end,
     updated_at    = now()
  from core.persons l
  where s.id = p_survivor and l.id = p_loser;

  -- 5) registrar e remover
  insert into core.events (workspace_id, person_id, source, type, payload)
  select workspace_id, p_survivor, 'system', 'persons_merged',
         jsonb_build_object('survivor', p_survivor, 'loser', p_loser)
  from core.persons where id = p_survivor;

  delete from core.persons where id = p_loser;
end $$;

-- Acha (ou cria) a pessoa canônica a partir de qualquer combinação de
-- CPF / telefone / email. Promove a 'identificado' quando o CPF chega e funde
-- registros que se revelarem a mesma pessoa. Idempotente.
-- Use esta função em TODA porta de entrada (form, Nina, ads, import).
create or replace function core.resolve_person(
  p_workspace uuid,
  p_cpf       text default null,
  p_phone     text default null,
  p_email     text default null,
  p_name      text default null,
  p_source    text default 'system'
) returns uuid
language plpgsql security definer set search_path = core, public as $$
declare
  v_cpf   text := core.only_digits(p_cpf);
  v_phone text := core.only_digits(p_phone);
  v_email text := lower(nullif(trim(p_email), ''));
  v_by_cpf uuid; v_by_phone uuid; v_by_email uuid;
  v_person uuid;
begin
  -- guarda de tenant: caller autenticado só mexe no próprio workspace.
  -- (service_role tem auth.uid() NULL → liberado para as Edge Functions.)
  if auth.uid() is not null
     and p_workspace not in (
        select workspace_id from core.workspace_members where user_id = auth.uid())
  then
    raise exception 'sem acesso ao workspace %', p_workspace;
  end if;

  if v_cpf is not null and not core.is_valid_cpf(v_cpf) then
    raise exception 'CPF inválido: %', p_cpf;
  end if;

  select person_id into v_by_cpf   from core.person_identifiers
    where workspace_id = p_workspace and kind = 'cpf'   and value = v_cpf   limit 1;
  select person_id into v_by_phone from core.person_identifiers
    where workspace_id = p_workspace and kind = 'phone' and value = v_phone limit 1;
  select person_id into v_by_email from core.person_identifiers
    where workspace_id = p_workspace and kind = 'email' and value = v_email limit 1;

  -- prioridade CPF > telefone > email; funde quando identificadores apontam
  -- para pessoas diferentes (descoberta tardia de CPF, p.ex.)
  if v_by_cpf is not null then
    if v_by_phone is not null and v_by_phone <> v_by_cpf then
      perform core.merge_persons(v_by_cpf, v_by_phone);
    end if;
    if v_by_email is not null and v_by_email <> v_by_cpf then
      perform core.merge_persons(v_by_cpf, v_by_email);
    end if;
    v_person := v_by_cpf;
  elsif v_by_phone is not null then
    if v_by_email is not null and v_by_email <> v_by_phone then
      perform core.merge_persons(v_by_phone, v_by_email);
    end if;
    v_person := v_by_phone;
  else
    v_person := v_by_email;  -- pode ser NULL
  end if;

  if v_person is null then
    insert into core.persons (workspace_id, cpf, status, full_name,
                              primary_email, primary_phone)
    values (p_workspace, v_cpf,
            case when v_cpf is not null then 'identificado' else 'pendente' end,
            p_name, v_email, v_phone)
    returning id into v_person;
  else
    update core.persons set
       cpf           = coalesce(cpf, v_cpf),
       status        = case when coalesce(cpf, v_cpf) is not null
                            then 'identificado' else status end,
       full_name     = coalesce(full_name, p_name),
       primary_email = coalesce(primary_email, v_email),
       primary_phone = coalesce(primary_phone, v_phone),
       updated_at    = now()
    where id = v_person;
  end if;

  -- gravar identificadores (idempotente)
  if v_cpf is not null then
    insert into core.person_identifiers (workspace_id, person_id, kind, value, verified)
    values (p_workspace, v_person, 'cpf', v_cpf, true)
    on conflict (workspace_id, kind, value) do update set person_id = excluded.person_id;
  end if;
  if v_phone is not null then
    insert into core.person_identifiers (workspace_id, person_id, kind, value)
    values (p_workspace, v_person, 'phone', v_phone)
    on conflict (workspace_id, kind, value) do nothing;
  end if;
  if v_email is not null then
    insert into core.person_identifiers (workspace_id, person_id, kind, value)
    values (p_workspace, v_person, 'email', v_email)
    on conflict (workspace_id, kind, value) do nothing;
  end if;

  return v_person;
end $$;

-- =============================================================================
-- 4. SEGURANÇA — RLS fechada + grants (anon nunca toca o core)
-- =============================================================================

grant usage on schema core to authenticated, service_role;
revoke all on schema core from anon;

grant select, insert, update, delete on all tables in schema core to authenticated;
grant all on all tables in schema core to service_role;
alter default privileges in schema core
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema core grant all on tables to service_role;

grant execute on function core.resolve_person(uuid, text, text, text, text, text)
  to authenticated, service_role;
grant execute on function core.merge_persons(uuid, uuid) to service_role;
grant execute on function core.current_workspace_ids() to authenticated, service_role;

-- habilitar RLS
alter table core.workspaces         enable row level security;
alter table core.workspace_members  enable row level security;
alter table core.companies          enable row level security;
alter table core.persons            enable row level security;
alter table core.person_identifiers enable row level security;
alter table core.events             enable row level security;
alter table core.consents           enable row level security;

-- workspaces / membership: leitura escopada; criação/gestão via service_role
create policy ws_select on core.workspaces for select to authenticated
  using (id in (select core.current_workspace_ids()));
create policy wm_select on core.workspace_members for select to authenticated
  using (workspace_id in (select core.current_workspace_ids()));

-- entidades de negócio: CRUD restrito ao próprio workspace
create policy companies_rw on core.companies for all to authenticated
  using      (workspace_id in (select core.current_workspace_ids()))
  with check (workspace_id in (select core.current_workspace_ids()));
create policy persons_rw on core.persons for all to authenticated
  using      (workspace_id in (select core.current_workspace_ids()))
  with check (workspace_id in (select core.current_workspace_ids()));
create policy identifiers_rw on core.person_identifiers for all to authenticated
  using      (workspace_id in (select core.current_workspace_ids()))
  with check (workspace_id in (select core.current_workspace_ids()));
create policy consents_rw on core.consents for all to authenticated
  using      (workspace_id in (select core.current_workspace_ids()))
  with check (workspace_id in (select core.current_workspace_ids()));

-- events: APPEND-ONLY para authenticated (sem update/delete)
revoke update, delete on core.events from authenticated;
create policy events_select on core.events for select to authenticated
  using (workspace_id in (select core.current_workspace_ids()));
create policy events_insert on core.events for insert to authenticated
  with check (workspace_id in (select core.current_workspace_ids()));

-- =============================================================================
-- 5. COMO OS SCHEMAS-IRMÃOS SE PENDURAM NO CORE  (exemplo, não criado aqui)
-- =============================================================================
--
--  create schema crm;                       -- Flow (pipeline de vendas)
--  create table crm.deals (
--    id           uuid primary key default gen_random_uuid(),
--    workspace_id uuid not null references core.workspaces(id) on delete cascade,
--    person_id    uuid not null references core.persons(id)    on delete cascade,
--    stage        text not null,
--    value_cents  bigint,
--    owner_id     uuid references auth.users(id),
--    created_at   timestamptz not null default now()
--  );
--  -- Ao fundir pessoas, core.merge_persons repontua crm.deals.person_id
--  -- AUTOMATICAMENTE (descoberta dinâmica de FK). Nada a fazer aqui.
--
--  Mesmo padrão para:
--    mkt.scores / mkt.campaigns / mkt.form_submissions   (Next)
--    fin.contratos / fin.recebiveis                       (Financeiro)
--
--  Nina (banco próprio) NÃO ganha schema aqui: ela chama
--  resolve_person() via Edge Function (service_role) e guarda o person_id
--  retornado do seu lado.
-- =============================================================================
