-- =============================================================================
-- CRM (Flow) — crédito trabalhista, pendurado no core canônico
-- -----------------------------------------------------------------------------
-- Depende de 0001_core_foundation.sql. Domínio: cessão de crédito trabalhista.
--
-- Peça central = o PROCESSO (a Análise Processual é por processo). Um processo
-- gera até 2 negócios (deals): o crédito do RECLAMANTE e o HONORÁRIO do ADVOGADO
-- — decisão: sempre 1 negócio por crédito, agrupados pelo processo.
--
-- Reclamante e advogado são core.persons (CPF). A reclamada é core.companies.
-- core.merge_persons repontua crm.deals.person_id automaticamente.
--
-- Codifica as REGRAS DE ELEGIBILIDADE do doc de aquisição (veta tese restritiva,
-- RJ, MEI/ME, precatório; exige CNDT ok + solvente).
--
-- Fora de escopo aqui (camadas posteriores): rastreio de documentos
-- (procuração RTD/substabelecimento), workflow formal de aprovação, lista das
-- teses como tabela de config, validação de faixa de valor/deságio.
--
-- PROPOSTA PARA REVISÃO — não aplicada. (Substitui a versão genérica anterior.)
-- =============================================================================

create schema if not exists crm;

-- ---------- Funil (configurável) ----------
create table if not exists crm.pipelines (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name         text not null,
  is_default   boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists crm.stages (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  pipeline_id  uuid not null references crm.pipelines(id) on delete cascade,
  name         text not null,
  position     int  not null default 0,
  kind         text not null default 'open' check (kind in ('open', 'won', 'lost')),
  created_at   timestamptz not null default now()
);
create index if not exists stages_pipeline_idx on crm.stages (pipeline_id, position);

-- ---------- PROCESSO (a peça central; onde mora a Análise) ----------
create table if not exists crm.processos (
  id                      uuid primary key default gen_random_uuid(),
  workspace_id            uuid not null references public.workspaces(id) on delete cascade,
  numero_cnj              text,
  reclamante_person_id    uuid references core.persons(id) on delete set null,
  reclamada_company_id    uuid references core.companies(id) on delete set null,
  tribunal                text,                 -- ex.: TRT-2
  vara                    text,
  uf                      char(2),
  fase                    text,                 -- a partir do Acórdão de RO: conhecimento|sentenca|RO|execucao|liquidacao|acordo
  valor_causa_cents       bigint,
  valor_estimado_liquido_cents bigint,          -- crédito líquido estimado (projeção 48h)
  -- dossiê de elegibilidade da reclamada (devedora) — o coração do risco
  reclamada_cndt          text check (reclamada_cndt in ('negativa', 'positiva_efeito_negativa', 'positiva')),
  reclamada_em_rj         boolean,              -- Recuperação Judicial → veta
  reclamada_porte         text,                 -- veta 'MEI' e 'ME'
  reclamada_paga_precatorio boolean,            -- paga por precatório → veta
  reclamada_solvente      boolean,
  teses_restritivas       text[] not null default '{}',  -- presença de qualquer = inelegível
  riscos                  text[] not null default '{}',  -- fianca|alimentos|divida_honorarios|fraude
  elegivel                boolean,              -- veredito (calculado pelo trigger abaixo)
  status                  text not null default 'em_analise'
                          check (status in ('em_analise', 'elegivel', 'inelegivel', 'arquivado')),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint cnj_unico_por_workspace unique (workspace_id, numero_cnj)
);
create index if not exists processos_reclamante_idx on crm.processos (reclamante_person_id);
create index if not exists processos_reclamada_idx  on crm.processos (reclamada_company_id);

-- advogados vinculados ao processo (podem ser alvo de captação do honorário)
create table if not exists crm.processo_advogados (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces(id) on delete cascade,
  processo_id      uuid not null references crm.processos(id) on delete cascade,
  person_id        uuid not null references core.persons(id) on delete cascade,
  oab              text,
  papel            text default 'reclamante' check (papel in ('reclamante', 'reclamada')),
  captar_honorario boolean not null default false,
  created_at       timestamptz not null default now(),
  constraint advogado_unico_no_processo unique (processo_id, person_id)
);

-- ---------- NEGÓCIO = crédito/aquisição (1 por crédito) ----------
create table if not exists crm.deals (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null references public.workspaces(id) on delete cascade,
  processo_id        uuid not null references crm.processos(id) on delete cascade,
  person_id          uuid not null references core.persons(id) on delete cascade,  -- titular do crédito
  credit_type        text not null check (credit_type in ('reclamante', 'advogado_honorario')),
  modalidade         text check (modalidade in ('kicker', 'tradicional')),
  valor_face_cents   bigint not null default 0,      -- valor de face do crédito
  valor_ofertado_cents bigint,                       -- quanto a Vantari paga (antecipado)
  desagio_pct        numeric(5,2),                   -- teto 55% no integral (validar no app)
  pipeline_id        uuid not null references crm.pipelines(id),
  stage_id           uuid not null references crm.stages(id),
  status             text not null default 'open' check (status in ('open', 'won', 'lost')),
  owner_id           uuid references auth.users(id) on delete set null,
  source             text,
  aprovado_por       uuid references auth.users(id) on delete set null,  -- governança (Leandro/Rodrigo)
  aprovado_em        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  closed_at          timestamptz
);
create index if not exists deals_processo_idx on crm.deals (processo_id);
create index if not exists deals_stage_idx     on crm.deals (workspace_id, stage_id);
create index if not exists deals_person_idx    on crm.deals (person_id);

-- ---------- Atividades ----------
create table if not exists crm.activities (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  deal_id      uuid references crm.deals(id) on delete cascade,
  processo_id  uuid references crm.processos(id) on delete cascade,
  person_id    uuid references core.persons(id) on delete cascade,
  type         text not null check (type in ('note', 'call', 'meeting', 'task', 'whatsapp', 'email')),
  content      text,
  due_at       timestamptz,
  done         boolean not null default false,
  owner_id     uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists activities_deal_idx on crm.activities (deal_id);

-- =============================================================================
-- Elegibilidade — codifica as regras do doc de aquisição
-- =============================================================================
create or replace function crm.avaliar_elegibilidade(p crm.processos)
returns boolean language sql immutable as $$
  select
        coalesce(array_length(p.teses_restritivas, 1), 0) = 0   -- nenhuma tese restritiva
    and p.reclamada_cndt in ('negativa', 'positiva_efeito_negativa')
    and coalesce(p.reclamada_em_rj, true)        = false         -- não em RJ
    and coalesce(p.reclamada_porte, 'MEI') not in ('MEI', 'ME')  -- não MEI/ME
    and coalesce(p.reclamada_paga_precatorio, true) = false      -- não paga por precatório
    and coalesce(p.reclamada_solvente, false)    = true          -- solvente
$$;

create or replace function crm.set_elegibilidade()
returns trigger language plpgsql set search_path = crm, public as $$
begin
  new.updated_at := now();
  new.elegivel   := crm.avaliar_elegibilidade(new);
  -- status acompanha o veredito enquanto estiver em triagem
  if new.status in ('em_analise', 'elegivel', 'inelegivel') then
    new.status := case when new.elegivel then 'elegivel' else 'inelegivel' end;
  end if;
  return new;
end $$;

drop trigger if exists trg_proc_elegib on crm.processos;
create trigger trg_proc_elegib before insert or update on crm.processos
  for each row execute function crm.set_elegibilidade();

-- =============================================================================
-- Triggers do deal: status derivado do estágio + timeline no core
-- =============================================================================
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

create or replace function crm.log_deal_event()
returns trigger language plpgsql security definer set search_path = core, crm, public as $$
begin
  if tg_op = 'INSERT' then
    insert into core.events (workspace_id, person_id, source, type, payload)
    values (new.workspace_id, new.person_id, 'crm', 'deal_created',
            jsonb_build_object('deal_id', new.id, 'processo_id', new.processo_id,
                               'credit_type', new.credit_type, 'valor_face_cents', new.valor_face_cents));
  elsif tg_op = 'UPDATE' and new.stage_id is distinct from old.stage_id then
    insert into core.events (workspace_id, person_id, source, type, payload)
    values (new.workspace_id, new.person_id, 'crm', 'stage_changed',
            jsonb_build_object('deal_id', new.id, 'from', old.stage_id, 'to', new.stage_id, 'status', new.status));
    if new.status = 'won' then
      insert into core.events (workspace_id, person_id, source, type, payload)
      values (new.workspace_id, new.person_id, 'crm', 'deal_won',
              jsonb_build_object('deal_id', new.id, 'processo_id', new.processo_id,
                                 'credit_type', new.credit_type, 'valor_face_cents', new.valor_face_cents));
    end if;
  end if;
  return null;
end $$;

drop trigger if exists trg_deal_event on crm.deals;
create trigger trg_deal_event after insert or update on crm.deals
  for each row execute function crm.log_deal_event();

-- =============================================================================
-- Funil padrão = os estágios REAIS da Vantari
-- =============================================================================
create or replace function crm.ensure_default_pipeline(p_workspace uuid)
returns uuid language plpgsql security definer set search_path = crm, public as $$
declare v_pipe uuid;
begin
  select id into v_pipe from crm.pipelines where workspace_id = p_workspace and is_default limit 1;
  if v_pipe is not null then return v_pipe; end if;

  insert into crm.pipelines (workspace_id, name, is_default)
  values (p_workspace, 'Esteira de Aquisição', true) returning id into v_pipe;

  insert into crm.stages (workspace_id, pipeline_id, name, position, kind) values
    (p_workspace, v_pipe, 'Novos Leads',                    1, 'open'),
    (p_workspace, v_pipe, 'Análise Processual',             2, 'open'),
    (p_workspace, v_pipe, 'Interesse Futuro',               3, 'open'),
    (p_workspace, v_pipe, 'Negociação/Proposta Enviada',    4, 'open'),
    (p_workspace, v_pipe, 'Ganho',                          5, 'won'),
    (p_workspace, v_pipe, 'Perdido',                        6, 'lost');
  return v_pipe;
end $$;

-- =============================================================================
-- Segurança — anon nunca; authenticated só seu workspace
-- =============================================================================
grant usage on schema crm to authenticated, service_role;
revoke all on schema crm from anon;
grant select, insert, update, delete on all tables in schema crm to authenticated;
grant all on all tables in schema crm to service_role;
alter default privileges in schema crm grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema crm grant all on tables to service_role;
grant execute on function crm.ensure_default_pipeline(uuid) to authenticated, service_role;
grant execute on function crm.avaliar_elegibilidade(crm.processos) to authenticated, service_role;

alter table crm.pipelines         enable row level security;
alter table crm.stages            enable row level security;
alter table crm.processos         enable row level security;
alter table crm.processo_advogados enable row level security;
alter table crm.deals             enable row level security;
alter table crm.activities        enable row level security;

create policy pipelines_rw on crm.pipelines for all to authenticated
  using (workspace_id in (select core.current_workspace_ids())) with check (workspace_id in (select core.current_workspace_ids()));
create policy stages_rw on crm.stages for all to authenticated
  using (workspace_id in (select core.current_workspace_ids())) with check (workspace_id in (select core.current_workspace_ids()));
create policy processos_rw on crm.processos for all to authenticated
  using (workspace_id in (select core.current_workspace_ids())) with check (workspace_id in (select core.current_workspace_ids()));
create policy proc_adv_rw on crm.processo_advogados for all to authenticated
  using (workspace_id in (select core.current_workspace_ids())) with check (workspace_id in (select core.current_workspace_ids()));
create policy deals_rw on crm.deals for all to authenticated
  using (workspace_id in (select core.current_workspace_ids())) with check (workspace_id in (select core.current_workspace_ids()));
create policy activities_rw on crm.activities for all to authenticated
  using (workspace_id in (select core.current_workspace_ids())) with check (workspace_id in (select core.current_workspace_ids()));
