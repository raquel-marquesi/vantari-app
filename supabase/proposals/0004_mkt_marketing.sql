-- =============================================================================
-- MKT (Next/marketing) — captação, scoring e campanhas, sobre o core canônico
-- -----------------------------------------------------------------------------
-- Depende de 0001_core_foundation.sql (não depende de crm).
-- Aqui mora o que o MARKETING usa: formulários de captação, score de interesse
-- (dinâmico, a partir de core.events) e campanhas de email.
--
-- Integração com o core (dependência só mkt -> core; core não conhece mkt):
--   * mkt.forms/form_submissions resolvem a pessoa via core.resolve_person e
--     emitem core.events('form_submit').
--   * O score recalcula a partir de core.events (trigger que o mkt PENDURA em
--     core.events — o core foi aplicado sem saber dele).
--   * Descadastro/consentimento usa core.consents (não duplica aqui).
--
-- PROPOSTA PARA REVISÃO — não aplicada.
-- =============================================================================

create schema if not exists mkt;

-- ---------------------------------------------------------------------------
-- Scoring de INTERESSE (dinâmico): regras event_type -> pontos
-- ---------------------------------------------------------------------------
create table if not exists mkt.scoring_rules (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces(id) on delete cascade,
  event_type   text not null,          -- casa com core.events.type (form_submit, page_visit, email_open...)
  points       int  not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  constraint scoring_rule_unica unique (workspace_id, event_type)
);

-- Estado materializado do score por pessoa (1 linha por pessoa)
create table if not exists mkt.lead_scores (
  workspace_id    uuid not null references core.workspaces(id) on delete cascade,
  person_id       uuid primary key references core.persons(id) on delete cascade,
  interest_points int  not null default 0,
  interest_band   text not null default 'cold'
                  check (interest_band in ('cold', 'warm', 'hot', 'sql')),
  profile         char(1) check (profile in ('A', 'B', 'C', 'D')),  -- Perfil A-D: Fase 2
  updated_at      timestamptz not null default now()
);
create index if not exists lead_scores_ws_idx on mkt.lead_scores (workspace_id, interest_band);

-- Recalcula o score de UMA pessoa a partir dos eventos + regras.
-- Bandas (CLAUDE.md): cold 0-20 | warm 21-50 | hot 51-79 | sql 80+
create or replace function mkt.recompute_score(p_person uuid)
returns void language plpgsql security definer set search_path = mkt, core, public as $$
declare
  v_ws     uuid;
  v_points int;
  v_band   text;
begin
  select workspace_id into v_ws from core.persons where id = p_person;
  if v_ws is null then return; end if;

  select coalesce(sum(r.points), 0) into v_points
    from core.events e
    join mkt.scoring_rules r
      on r.workspace_id = e.workspace_id and r.event_type = e.type and r.active
   where e.person_id = p_person;

  v_band := case
    when v_points >= 80 then 'sql'
    when v_points >= 51 then 'hot'
    when v_points >= 21 then 'warm'
    else 'cold'
  end;

  insert into mkt.lead_scores (workspace_id, person_id, interest_points, interest_band, updated_at)
  values (v_ws, p_person, v_points, v_band, now())
  on conflict (person_id) do update
    set interest_points = excluded.interest_points,
        interest_band   = excluded.interest_band,
        updated_at      = now();
end $$;

-- Hook que o mkt PENDURA em core.events: recalcula quando entra um evento
-- pontuável. (core foi aplicado sem conhecer isto; a dependência é mkt->core.)
create or replace function mkt.on_event_score()
returns trigger language plpgsql security definer set search_path = mkt, core, public as $$
begin
  if new.person_id is not null and exists (
     select 1 from mkt.scoring_rules r
      where r.workspace_id = new.workspace_id and r.event_type = new.type and r.active)
  then
    perform mkt.recompute_score(new.person_id);
  end if;
  return null;
end $$;

drop trigger if exists trg_event_score on core.events;
create trigger trg_event_score after insert on core.events
  for each row execute function mkt.on_event_score();

-- ---------------------------------------------------------------------------
-- Formulários de captação (a versão "core" do form público)
-- ---------------------------------------------------------------------------
create table if not exists mkt.forms (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references core.workspaces(id) on delete cascade,
  slug            text not null,
  name            text,
  fields          jsonb not null default '[]',
  source_label    text,
  success_message text,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  constraint form_slug_unico unique (workspace_id, slug)
);

create table if not exists mkt.form_submissions (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces(id) on delete cascade,
  form_id      uuid not null references mkt.forms(id) on delete cascade,
  person_id    uuid references core.persons(id) on delete set null,
  payload      jsonb not null default '{}',
  utm_source   text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
  created_at   timestamptz not null default now()
);
create index if not exists fs_form_idx   on mkt.form_submissions (form_id);
create index if not exists fs_person_idx on mkt.form_submissions (person_id);

-- BEFORE insert: resolve a pessoa pelos campos do payload + emite o evento.
-- (o core.event dispara o recálculo de score automaticamente)
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

  return new;
end $$;

drop trigger if exists trg_form_submission on mkt.form_submissions;
create trigger trg_form_submission before insert on mkt.form_submissions
  for each row execute function mkt.on_form_submission();

-- ---------------------------------------------------------------------------
-- Campanhas de email (o disparo real continua na Edge Function send-campaign)
-- ---------------------------------------------------------------------------
create table if not exists mkt.campaigns (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references core.workspaces(id) on delete cascade,
  name          text not null,
  subject       text,
  from_email    text,
  from_name     text,
  template_html text,
  status        text not null default 'draft'
                check (status in ('draft', 'scheduled', 'sending', 'sent')),
  scheduled_at  timestamptz,
  sent_at       timestamptz,
  created_at    timestamptz not null default now()
);

create table if not exists mkt.campaign_sends (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces(id) on delete cascade,
  campaign_id  uuid not null references mkt.campaigns(id) on delete cascade,
  person_id    uuid not null references core.persons(id) on delete cascade,
  status       text not null default 'queued'
               check (status in ('queued', 'sent', 'opened', 'clicked', 'bounced', 'failed')),
  sent_at      timestamptz, opened_at timestamptz, clicked_at timestamptz,
  error        text,
  constraint send_unico unique (campaign_id, person_id)
);
create index if not exists sends_person_idx on mkt.campaign_sends (person_id);

-- pode enviar email? (respeita descadastro registrado em core.consents)
create or replace function mkt.can_email(p_person uuid)
returns boolean language sql stable set search_path = mkt, core, public as $$
  select not exists (
    select 1 from core.consents c
     where c.person_id = p_person and c.channel = 'email' and c.status = 'revoked')
$$;

-- ---------------------------------------------------------------------------
-- Segurança — mesma postura do core/crm
-- ---------------------------------------------------------------------------
grant usage on schema mkt to authenticated, service_role;
revoke all on schema mkt from anon;
grant select, insert, update, delete on all tables in schema mkt to authenticated;
grant all on all tables in schema mkt to service_role;
alter default privileges in schema mkt
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema mkt grant all on tables to service_role;
grant execute on function mkt.recompute_score(uuid) to authenticated, service_role;
grant execute on function mkt.can_email(uuid) to authenticated, service_role;

alter table mkt.scoring_rules    enable row level security;
alter table mkt.lead_scores      enable row level security;
alter table mkt.forms            enable row level security;
alter table mkt.form_submissions enable row level security;
alter table mkt.campaigns        enable row level security;
alter table mkt.campaign_sends   enable row level security;

-- CRUD escopado ao workspace para usuário autenticado
create policy scoring_rules_rw on mkt.scoring_rules for all to authenticated
  using (workspace_id in (select core.current_workspace_ids()))
  with check (workspace_id in (select core.current_workspace_ids()));
create policy lead_scores_rw on mkt.lead_scores for all to authenticated
  using (workspace_id in (select core.current_workspace_ids()))
  with check (workspace_id in (select core.current_workspace_ids()));
create policy forms_rw on mkt.forms for all to authenticated
  using (workspace_id in (select core.current_workspace_ids()))
  with check (workspace_id in (select core.current_workspace_ids()));
create policy form_subs_rw on mkt.form_submissions for all to authenticated
  using (workspace_id in (select core.current_workspace_ids()))
  with check (workspace_id in (select core.current_workspace_ids()));
create policy campaigns_rw on mkt.campaigns for all to authenticated
  using (workspace_id in (select core.current_workspace_ids()))
  with check (workspace_id in (select core.current_workspace_ids()));
create policy campaign_sends_rw on mkt.campaign_sends for all to authenticated
  using (workspace_id in (select core.current_workspace_ids()))
  with check (workspace_id in (select core.current_workspace_ids()));

-- EXCEÇÃO anon: o form público precisa LER forms ativos e INSERIR submissão
-- (mesma lógica do hardening 0003, mas já no schema novo)
create policy forms_anon_read_active on mkt.forms for select to anon
  using (active = true);
grant usage on schema mkt to anon;            -- só para alcançar as 2 tabelas abaixo
grant select on mkt.forms to anon;
grant insert on mkt.form_submissions to anon;
create policy form_subs_anon_insert on mkt.form_submissions for insert to anon
  with check (true);
