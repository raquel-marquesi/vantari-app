-- =====================================================================
-- 0007_scoring_vantari_etapa1.sql
-- Motor de Lead Scoring da Vantari Crédito — ETAPA 1 (Scoring Inicial 0-50).
--
-- Substitui o modelo 2D do RD (Perfil A-D × banda de Interesse) pelo modelo
-- REAL do negócio (doc "LEAD SCORING REVISADO - VANTARI CRÉDITO"): um score
-- cumulativo ponderado, configurável, em duas etapas. Aqui mora só a Etapa 1
-- (dados do primeiro contato). A Etapa 2 (0-100, sobre crm.processos) é frente
-- separada.
--
-- Inputs da Etapa 1 vivem em core.person_attributes (key/value). As regras
-- mapeiam (field_key, match_value) -> pontos; recompute soma e classifica em
-- segmentos (Prioritário/Interessado/Educativo/Descartado).
--
-- ADITIVO: não remove interest_points/interest_band/profile de mkt.lead_scores
-- (o /segments ainda lê essas colunas). Idempotente.
--
-- ⚠️ APLICAR EM PROD só após revisão. NÃO aplicado ainda.
-- Dependência de pipeline (fora deste arquivo): Nina/forms/ingest precisam
-- gravar os atributos da Etapa 1 em core.person_attributes com as chaves/opções
-- canônicas semeadas abaixo.
-- =====================================================================

-- ---------------------------------------------------------------------------
-- 1) core.person_attributes — atributos key/value por pessoa
--    (reimplanta os "custom fields" do RD dentro do core)
-- ---------------------------------------------------------------------------
create table if not exists core.person_attributes (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  person_id    uuid not null references core.persons(id)      on delete cascade,
  key          text not null,
  value        text,
  source       text,                       -- nina | form | import | manual | crm
  updated_at   timestamptz not null default now(),
  primary key (person_id, key)
);
create index if not exists person_attr_ws_key_idx
  on core.person_attributes (workspace_id, key, value);

alter table core.person_attributes enable row level security;
drop policy if exists person_attributes_rw on core.person_attributes;
create policy person_attributes_rw on core.person_attributes for all to authenticated
  using      (workspace_id in (select core.current_workspace_ids()))
  with check (workspace_id in (select core.current_workspace_ids()));

revoke all on core.person_attributes from anon;
grant select, insert, update, delete on core.person_attributes to authenticated;
grant all on core.person_attributes to service_role;

-- ---------------------------------------------------------------------------
-- 2) mkt.score_rules — regras ponderadas (motor configurável; o doc pede
--    "ajuste mensal dos pesos", então é dado, não hardcode)
-- ---------------------------------------------------------------------------
create table if not exists mkt.score_rules (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  stage        smallint not null default 1,   -- 1 = inicial (0-50) | 2 = completo (futuro)
  category     text,                           -- demografico | comportamento | urgencia | qualidade
  label        text,                           -- rótulo legível da opção
  field_key    text not null,                  -- casa com core.person_attributes.key
  match_value  text not null,                  -- opção que concede os pontos
  points       int  not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  constraint score_rule_unica unique (workspace_id, stage, field_key, match_value)
);
create index if not exists score_rules_ws_stage_idx
  on mkt.score_rules (workspace_id, stage, active);

-- ---------------------------------------------------------------------------
-- 3) mkt.score_bands — segmentos configuráveis por etapa
-- ---------------------------------------------------------------------------
create table if not exists mkt.score_bands (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  stage        smallint not null default 1,
  label        text not null,                  -- Prioritário | Interessado | Educativo | Descartado
  min_points   int  not null default 0,        -- banda = maior min_points <= score
  sort         int  not null default 0,
  constraint score_band_unica unique (workspace_id, stage, label)
);

alter table mkt.score_rules enable row level security;
alter table mkt.score_bands enable row level security;
drop policy if exists score_rules_rw on mkt.score_rules;
create policy score_rules_rw on mkt.score_rules for all to authenticated
  using      (workspace_id in (select core.current_workspace_ids()))
  with check (workspace_id in (select core.current_workspace_ids()));
drop policy if exists score_bands_rw on mkt.score_bands;
create policy score_bands_rw on mkt.score_bands for all to authenticated
  using      (workspace_id in (select core.current_workspace_ids()))
  with check (workspace_id in (select core.current_workspace_ids()));

-- grants explícitos (além do alter default privileges do 0004)
grant select, insert, update, delete on mkt.score_rules, mkt.score_bands to authenticated;
grant all on mkt.score_rules, mkt.score_bands to service_role;

-- ---------------------------------------------------------------------------
-- 4) mkt.lead_scores — colunas da Etapa 1 (aditivo)
-- ---------------------------------------------------------------------------
alter table mkt.lead_scores add column if not exists score_inicial   int  not null default 0;
alter table mkt.lead_scores add column if not exists segment_inicial  text;
alter table mkt.lead_scores add column if not exists scored_at        timestamptz;

-- ---------------------------------------------------------------------------
-- 5) Funções de recompute (espelham mkt.recompute_score)
-- ---------------------------------------------------------------------------
create or replace function mkt.recompute_score_inicial(p_person uuid)
returns void language plpgsql security definer set search_path = mkt, core, public as $$
declare
  v_ws  uuid;
  v_pts int;
  v_seg text;
begin
  select workspace_id into v_ws from core.persons where id = p_person;
  if v_ws is null then return; end if;

  -- soma os pontos das regras stage=1 cujo (field_key, match_value) casa
  -- com um atributo da pessoa
  select coalesce(sum(r.points), 0) into v_pts
    from mkt.score_rules r
    join core.person_attributes a
      on a.person_id = p_person
     and a.key   = r.field_key
     and a.value = r.match_value
   where r.workspace_id = v_ws
     and r.stage  = 1
     and r.active;

  -- segmento = banda de maior min_points <= score
  select b.label into v_seg
    from mkt.score_bands b
   where b.workspace_id = v_ws and b.stage = 1 and b.min_points <= v_pts
   order by b.min_points desc
   limit 1;

  insert into mkt.lead_scores (workspace_id, person_id, score_inicial, segment_inicial, scored_at, updated_at)
       values (v_ws, p_person, v_pts, v_seg, now(), now())
  on conflict (person_id) do update
       set score_inicial   = excluded.score_inicial,
           segment_inicial = excluded.segment_inicial,
           scored_at       = excluded.scored_at,
           updated_at      = now();
end $$;

create or replace function mkt.recompute_all_scores_inicial(p_workspace uuid)
returns void language plpgsql security definer set search_path = mkt, core, public as $$
declare r record;
begin
  for r in select id from core.persons where workspace_id = p_workspace loop
    perform mkt.recompute_score_inicial(r.id);
  end loop;
end $$;

grant execute on function mkt.recompute_score_inicial(uuid)      to authenticated, service_role;
grant execute on function mkt.recompute_all_scores_inicial(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5b) CONTRATO DE INTEGRAÇÃO — como os produtores (forms, Nina, ingest, import)
--     populam os atributos da Etapa 1.
--
--   Envelope canônico: o produtor manda os atributos sob `payload.attributes`
--   (objeto JSON chave→valor com o vocabulário do seed). Uma porta única
--   (core.set_person_attributes) grava; a recompute reage via trigger no
--   core.person_attributes (mesmo padrão de trg_event_score em core.events).
-- ---------------------------------------------------------------------------

-- porta única: upsert dos atributos (core puro, não conhece mkt)
create or replace function core.set_person_attributes(p_person uuid, p_attrs jsonb, p_source text default null)
returns void language plpgsql security definer set search_path = core, public as $$
declare
  v_ws uuid;
  k text;
  v text;
begin
  if p_attrs is null or jsonb_typeof(p_attrs) <> 'object' then return; end if;
  select workspace_id into v_ws from core.persons where id = p_person;
  if v_ws is null then return; end if;

  for k, v in select key, value from jsonb_each_text(p_attrs) loop
    insert into core.person_attributes (workspace_id, person_id, key, value, source, updated_at)
    values (v_ws, p_person, k, v, p_source, now())
    on conflict (person_id, key) do update
       set value = excluded.value, source = excluded.source, updated_at = now();
  end loop;
end $$;
grant execute on function core.set_person_attributes(uuid, jsonb, text) to authenticated, service_role;

-- mkt PENDURA a recompute em core.person_attributes (igual ao trg_event_score)
create or replace function mkt.on_attr_change()
returns trigger language plpgsql security definer set search_path = mkt, core, public as $$
begin
  perform mkt.recompute_score_inicial(coalesce(new.person_id, old.person_id));
  return null;
end $$;
drop trigger if exists trg_attr_score on core.person_attributes;
create trigger trg_attr_score after insert or update or delete on core.person_attributes
  for each row execute function mkt.on_attr_change();

-- override do trigger de form submission (0004) p/ rotear payload.attributes
create or replace function mkt.on_form_submission()
returns trigger language plpgsql security definer set search_path = mkt, core, public as $$
declare
  v_label  text;
  v_person uuid;
begin
  select coalesce(source_label, 'form') into v_label from mkt.forms where id = new.form_id;

  v_person := core.resolve_person(
    new.workspace_id,
    new.payload->>'cpf',
    new.payload->>'phone',
    new.payload->>'email',
    new.payload->>'name',
    v_label);

  new.person_id := v_person;

  insert into core.events (workspace_id, person_id, source, type, payload)
  values (new.workspace_id, v_person, 'form', 'form_submit',
          jsonb_build_object('form_id', new.form_id) || coalesce(new.payload, '{}'::jsonb));

  -- Etapa 1: atributos de scoring chegam no envelope canônico payload.attributes
  if new.payload ? 'attributes' then
    perform core.set_person_attributes(v_person, new.payload->'attributes', 'form');
  end if;

  return new;
end $$;

-- ---------------------------------------------------------------------------

