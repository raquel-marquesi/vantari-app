-- ═══════════════════════════════════════════════════════════════════
-- Preparação pra Meta Conversions API (Conversões via servidor) — pedido
-- da Catarina, 17/09/2026.
--
-- Contexto: a Meta só via até hoje quando alguém preenchia um formulário
-- (Pixel no navegador) — não sabia se aquele lead virou negócio de
-- verdade. O plano é o Vantari avisar a Meta pelo servidor quando um
-- negócio muda de estágio importante (fonte = 'meta'). Antes de codar
-- isso, foi levantado se já guardávamos fbclid/_fbp/_fbc — resposta:
-- não. Mas o achado importante foi outro: `crm.deals.source = 'meta'`
-- (o filtro pedido) é 100% originado por sync-meta-leads — Lead Ads
-- NATIVO do Instant Form, onde a pessoa nunca visita o site, então
-- fbclid/_fbp/_fbc não existem nem existiriam nesse fluxo. Pra esse
-- caso a correspondência certa (recomendada pela própria Meta) é o
-- `lead_id` do Instant Form — e isso a gente já grava desde 14/09 em
-- core.events.payload.meta_lead_id. Essa parte não depende desta
-- migration.
--
-- O que ESTA migration prepara é o outro funil (site/LPs → Pixel já
-- instalado, confirmado fbq('init','785226807252342') nas 5 LPs), pra
-- não perder histórico de clique enquanto uma eventual expansão futura
-- do CAPI pra esse funil não é decidida:
--   1) fbclid/_fbp/_fbc capturados e gravados (primeiro toque, mesmo
--      padrão dos UTMs) em core.persons, public.form_submissions e
--      public.page_visits — só o legado (usado pelas LPs de RJ); o
--      formulário novo (mkt.form_submissions) ficou fora de propósito,
--      não é o path usado pela campanha que motivou isso.
--   2) mkt.capi_events_log — tabela de log/idempotência pro consumidor
--      do CAPI (send-meta-capi), com unique (deal_id, event_name) pra
--      nunca mandar o mesmo evento duas vezes pro mesmo negócio.
-- ═══════════════════════════════════════════════════════════════════

-- ---------- 1) Colunas novas (mesmo padrão dos UTMs) ----------
alter table core.persons
  add column if not exists fbclid text,
  add column if not exists fbp    text,
  add column if not exists fbc    text;

alter table public.form_submissions
  add column if not exists fbclid text,
  add column if not exists fbp    text,
  add column if not exists fbc    text;

alter table public.page_visits
  add column if not exists fbclid text,
  add column if not exists fbp    text,
  add column if not exists fbc    text;

comment on column core.persons.fbclid is 'Meta Click ID cru da URL, primeiro toque. Guardado só pra debug/auditoria — quem casa evento na Meta é o fbc.';
comment on column core.persons.fbp    is 'Cookie _fbp (Meta Pixel), primeiro toque — identifica o browser.';
comment on column core.persons.fbc    is 'Cookie _fbc (Meta Pixel, derivado do fbclid), primeiro toque — usado em user_data.fbc na Conversions API.';

-- ---------- 2) core.resolve_person — + 3 parâmetros opcionais, mesmo
--    comportamento de primeiro-toque dos UTMs (só grava se ainda vazio) ----------
create or replace function core.resolve_person(
  p_workspace uuid,
  p_cpf       text default null,
  p_phone     text default null,
  p_email     text default null,
  p_name      text default null,
  p_source    text default 'system',
  p_utm_source   text default null,
  p_utm_medium   text default null,
  p_utm_campaign text default null,
  p_utm_content  text default null,
  p_utm_term     text default null,
  p_fbclid       text default null,
  p_fbp          text default null,
  p_fbc          text default null
) returns uuid
language plpgsql security definer set search_path = core, public as $$
declare
  v_cpf   text := core.only_digits(p_cpf);
  v_phone text := core.normalize_phone_br(p_phone);
  v_email text := lower(nullif(trim(p_email), ''));
  v_name  text := case when core.looks_like_whatsapp_profile_name(p_name) then null else p_name end;
  v_by_cpf uuid; v_by_phone uuid; v_by_email uuid;
  v_person uuid;
  v_old_email text;
  v_old_phone text;
  v_lock_keys text[] := array[]::text[];
  v_key text;
begin
  if auth.uid() is not null
     and p_workspace not in (
        select workspace_id from public.workspace_members where user_id = auth.uid())
  then
    raise exception 'sem acesso ao workspace %', p_workspace;
  end if;

  if v_cpf is not null and not core.is_valid_cpf(v_cpf) then
    raise exception 'CPF inválido: %', p_cpf;
  end if;

  if v_cpf is not null then v_lock_keys := array_append(v_lock_keys, 'cpf:' || v_cpf); end if;
  if v_phone is not null then v_lock_keys := array_append(v_lock_keys, 'phone:' || v_phone); end if;
  if v_email is not null then v_lock_keys := array_append(v_lock_keys, 'email:' || v_email); end if;

  if coalesce(array_length(v_lock_keys, 1), 0) > 0 then
    select array_agg(k order by k) into v_lock_keys from unnest(v_lock_keys) as k;
    foreach v_key in array v_lock_keys loop
      perform pg_advisory_xact_lock(hashtextextended('core_person:' || p_workspace::text || ':' || v_key, 0));
    end loop;
  end if;

  select person_id into v_by_cpf   from core.person_identifiers
    where workspace_id = p_workspace and kind = 'cpf'   and value = v_cpf   limit 1;
  select person_id into v_by_phone from core.person_identifiers
    where workspace_id = p_workspace and kind = 'phone' and value = v_phone limit 1;
  select person_id into v_by_email from core.person_identifiers
    where workspace_id = p_workspace and kind = 'email' and value = v_email limit 1;

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
    v_person := v_by_email;
  end if;

  if v_person is null then
    insert into core.persons (workspace_id, cpf, status, full_name,
                              primary_email, primary_phone,
                              utm_source, utm_medium, utm_campaign, utm_content, utm_term,
                              first_source, fbclid, fbp, fbc)
    values (p_workspace, v_cpf,
            case when v_cpf is not null then 'identificado' else 'pendente' end,
            v_name, v_email, v_phone,
            p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_utm_term,
            p_source, p_fbclid, p_fbp, p_fbc)
    returning id into v_person;
  else
    select primary_email, primary_phone into v_old_email, v_old_phone
      from core.persons where id = v_person;

    update core.persons set
       cpf           = coalesce(cpf, v_cpf),
       status        = case when coalesce(cpf, v_cpf) is not null
                            then 'identificado' else status end,
       full_name     = coalesce(full_name, v_name),
       primary_email = coalesce(v_email, primary_email),
       primary_phone = coalesce(v_phone, primary_phone),
       utm_source    = coalesce(utm_source, p_utm_source),
       utm_medium    = coalesce(utm_medium, p_utm_medium),
       utm_campaign  = coalesce(utm_campaign, p_utm_campaign),
       utm_content   = coalesce(utm_content, p_utm_content),
       utm_term      = coalesce(utm_term, p_utm_term),
       first_source  = coalesce(first_source, p_source),
       fbclid        = coalesce(fbclid, p_fbclid),
       fbp           = coalesce(fbp, p_fbp),
       fbc           = coalesce(fbc, p_fbc),
       updated_at    = now()
    where id = v_person;

    if v_email is not null and v_old_email is not null and v_email <> v_old_email then
      insert into core.events (workspace_id, person_id, source, type, payload)
      values (p_workspace, v_person, p_source, 'contact_updated',
              jsonb_build_object('field', 'email', 'old', v_old_email, 'new', v_email));
    end if;
    if v_phone is not null and v_old_phone is not null and v_phone <> v_old_phone then
      insert into core.events (workspace_id, person_id, source, type, payload)
      values (p_workspace, v_person, p_source, 'contact_updated',
              jsonb_build_object('field', 'phone', 'old', v_old_phone, 'new', v_phone));
    end if;
  end if;

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

-- ---------- 3) trg_form_submission_to_lead — repassa fbclid/fbp/fbc da
--    submissão (mesma versão de 20260910000001, só com o repasse novo) ----------
create or replace function public.trg_form_submission_to_lead()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  p_email     text;
  p_cpf       text;
  v_cpf_raw   text;
  p_name      text;
  p_phone     text;
  p_company   text;
  v_form      record;
  v_ws        uuid;
  v_lead_id   uuid;
  v_points    integer;
  v_source    text;
  v_stage     text;
  v_person_id uuid;
  v_fonte     text;
  v_hora      int;
  v_dow       int;
  v_momento   text;
  v_total     int;
  v_filled    int;
  v_engaj     text;
  v_numero_processo text;
  v_pipeline_name text;
begin
  p_email   := nullif(lower(coalesce(new.payload ->> 'email', new.payload ->> 'Email', '')), '');

  v_cpf_raw := regexp_replace(coalesce(new.payload ->> 'cpf', new.payload ->> 'CPF', ''), '[^0-9]', '', 'g');
  p_cpf := case
    when length(v_cpf_raw) = 11 and v_cpf_raw !~ '^(\d)\1{10}$' then v_cpf_raw
    else null
  end;

  p_name    := coalesce(new.payload ->> 'name',  new.payload ->> 'nome',     new.payload ->> 'Nome');
  p_phone   := coalesce(new.payload ->> 'phone', new.payload ->> 'telefone', new.payload ->> 'Telefone');
  p_company := coalesce(new.payload ->> 'company', new.payload ->> 'empresa', new.payload ->> 'Empresa');

  if p_cpf is null and p_email is null then
    return new;
  end if;

  select * into v_form from public.forms where id = new.form_id;
  v_ws     := coalesce(new.workspace_id, v_form.workspace_id, '53092199-7b75-4342-a897-f589d6f34922'::uuid);
  v_source := coalesce(v_form.source_label, 'Form: ' || coalesce(v_form.name, ''));
  v_stage  := coalesce(v_form.stage_on_submit, 'Lead');

  if new.workspace_id is null and v_ws is not null then
    update public.form_submissions set workspace_id = v_ws where id = new.id;
  end if;

  if p_cpf is not null then
    select id into v_lead_id from public.leads where cpf = p_cpf limit 1;
  end if;
  if v_lead_id is null and p_email is not null then
    select id into v_lead_id from public.leads
     where lower(email) = p_email
       and workspace_id is not distinct from v_ws
     limit 1;
  end if;

  if v_lead_id is null then
    insert into public.leads (workspace_id, cpf, email, name, phone, company, source, stage,
                       utm_source, utm_medium, utm_campaign, utm_content, utm_term, tags)
    values (v_ws, p_cpf, p_email, p_name, p_phone, p_company, v_source, v_stage,
            new.utm_source, new.utm_medium, new.utm_campaign, new.utm_content, new.utm_term,
            coalesce(v_form.tags, '{}'))
    returning id into v_lead_id;
  else
    update public.leads set
      cpf        = coalesce(cpf, p_cpf),
      email      = coalesce(email, p_email),
      name       = coalesce(name, p_name),
      phone      = coalesce(phone, p_phone),
      company    = coalesce(company, p_company),
      tags       = (select array(select distinct unnest(coalesce(leads.tags, '{}') || coalesce(v_form.tags, '{}')))),
      updated_at = now()
    where id = v_lead_id;
  end if;

  update public.form_submissions set lead_id = v_lead_id where id = new.id;

  if v_ws is not null then
    v_points := coalesce(
      (select points from public.scoring_rules
        where action = 'form_submit' and active = true
          and (workspace_id = v_ws or workspace_id is null)
        order by workspace_id nulls last
        limit 1),
      10);
    insert into public.lead_events (lead_id, event_type, score_delta, metadata)
    values (v_lead_id, 'form_fill', v_points,
            jsonb_build_object('form_id', new.form_id,
                               'form_name', coalesce(v_form.name, ''),
                               'submission_id', new.id,
                               'origin', 'form_submit'));
  end if;

  update public.forms set submission_count = coalesce(submission_count, 0) + 1, updated_at = now()
   where id = new.form_id;

  begin
    select core.resolve_person(
      p_workspace    => v_ws,
      p_cpf          => p_cpf,
      p_phone        => p_phone,
      p_email        => p_email,
      p_name         => p_name,
      p_source       => 'form',
      p_utm_source   => new.utm_source,
      p_utm_medium   => new.utm_medium,
      p_utm_campaign => new.utm_campaign,
      p_utm_content  => new.utm_content,
      p_utm_term     => new.utm_term,
      p_fbclid       => new.fbclid,
      p_fbp          => new.fbp,
      p_fbc          => new.fbc
    ) into v_person_id;
  exception when others then
    raise warning 'core.resolve_person falhou (submission %): %', new.id, sqlerrm;
  end;

  if v_person_id is not null then
    begin
      v_fonte := case
        when new.utm_source is not null and lower(coalesce(new.utm_medium,'')) in ('cpc','ppc','paid','paidsocial','paidsearch')
          then 'pago'
        when lower(coalesce(new.utm_source,'')) like '%google%'
          then 'organica'
        when lower(coalesce(new.utm_medium,'')) = 'referral'
          then 'indicacao'
        when lower(coalesce(new.utm_source,'')) in ('facebook','instagram','meta','fb','ig')
          then 'social'
        when new.utm_source is not null
          then 'outros'
        else null
      end;

      v_hora := extract(hour from (new.created_at at time zone 'America/Sao_Paulo'));
      v_dow  := extract(dow  from (new.created_at at time zone 'America/Sao_Paulo'));
      v_momento := case
        when v_dow in (0,6)               then 'madrugada_fds'
        when v_hora >= 9  and v_hora < 18  then 'comercial'
        when v_hora >= 18 and v_hora < 22  then 'noite'
        else 'madrugada_fds'
      end;

      if v_fonte is not null or v_momento is not null then
        perform core.set_person_attributes(v_person_id,
          jsonb_strip_nulls(jsonb_build_object('fonte', v_fonte, 'momento', v_momento)),
          'form');
      end if;
    exception when others then
      raise warning 'trg_form_submission_to_lead: falha em fonte/momento (submission %): %', new.id, sqlerrm;
    end;

    begin
      v_total  := jsonb_array_length(coalesce(v_form.fields, '[]'::jsonb));
      v_filled := (select count(*) from jsonb_object_keys(coalesce(new.payload, '{}'::jsonb)));
      v_engaj := case
        when v_total > 0 and v_filled >= v_total then 'form_completo'
        when v_filled > 0 then 'form_parcial'
        else null
      end;
      if v_engaj is not null then
        perform core.bump_engajamento(v_person_id, v_engaj, 'form');
      end if;

      v_pipeline_name := case
        when v_form.slug in ('recuperacao-judicial', 'advogados-recuperacao-judicial')
          then 'Recuperação Judicial — Varejo'
        else null
      end;

      v_numero_processo := core.normalize_numero_cnj(new.payload->>'numero_processo');

      if not exists (select 1 from crm.deals where person_id = v_person_id) then
        if v_numero_processo is not null then
          perform crm.ingest_processo_lead(v_ws, v_person_id, v_numero_processo, null, 'form', v_pipeline_name,
            p_reclamada_em_rj => (v_pipeline_name is not null));
        elsif v_pipeline_name is not null then
          perform crm.create_draft_deal(v_ws, v_person_id, 'form', v_pipeline_name,
            p_reclamada_em_rj => true);
        end if;
      end if;
    exception when others then
      raise warning 'trg_form_submission_to_lead: falha em engajamento/negócio (submission %): %', new.id, sqlerrm;
    end;
  end if;

  return new;
exception when others then
  raise warning 'trg_form_submission_to_lead falhou (submission %): %', new.id, sqlerrm;
  return new;
end;
$function$;

-- ---------- 4) page_visit_to_lead_event — repassa fbclid/fbp/fbc da
--    visita (mesma versão de 20260817000002, só com o repasse novo) ----------
create or replace function public.page_visit_to_lead_event()
returns trigger
language plpgsql
set search_path to ''
as $$
declare
  v_delta     int;
  v_lead      record;
  v_person_id uuid;
begin
  if new.lead_id is null or new.tracked_page_id is null then
    return new;
  end if;

  select score_delta into v_delta
    from tracked_pages
    where id = new.tracked_page_id and active = true;

  if v_delta is null then return new; end if;

  insert into lead_events (lead_id, event_type, event_data, score_delta, source, created_at)
  values (
    new.lead_id,
    'page_visit',
    jsonb_build_object('url', new.url, 'tracked_page_id', new.tracked_page_id),
    v_delta,
    'lead_tracking',
    new.created_at
  );

  begin
    select * into v_lead from leads where id = new.lead_id;
    if v_lead.id is not null and (v_lead.cpf is not null or v_lead.email is not null) then
      select core.resolve_person(
        p_workspace    => coalesce(v_lead.workspace_id, '53092199-7b75-4342-a897-f589d6f34922'::uuid),
        p_cpf          => v_lead.cpf,
        p_phone        => v_lead.phone,
        p_email        => v_lead.email,
        p_name         => v_lead.name,
        p_source       => 'tracking',
        p_utm_source   => new.utm_source,
        p_utm_medium   => new.utm_medium,
        p_utm_campaign => new.utm_campaign,
        p_utm_content  => new.utm_content,
        p_utm_term     => new.utm_term,
        p_fbclid       => new.fbclid,
        p_fbp          => new.fbp,
        p_fbc          => new.fbc
      ) into v_person_id;

      if v_person_id is not null then
        insert into core.events (workspace_id, person_id, source, type, payload)
        values (
          coalesce(v_lead.workspace_id, '53092199-7b75-4342-a897-f589d6f34922'::uuid),
          v_person_id, 'tracking', 'page_visit',
          jsonb_build_object('path', new.path, 'url', new.url, 'tracked_page_id', new.tracked_page_id)
        );
        perform core.bump_engajamento(v_person_id, 'visitou_paginas', 'tracking');
      end if;
    end if;
  exception when others then
    raise warning 'page_visit_to_lead_event: falha ao sincronizar core.events (page_visit %): %', new.id, sqlerrm;
  end;

  return new;
end $$;

-- ---------- 5) mkt.capi_events_log — log + idempotência do consumidor
--    (send-meta-capi). Unique (deal_id, event_name) garante que o mesmo
--    negócio nunca manda o mesmo evento pra Meta duas vezes. ----------
create table if not exists mkt.capi_events_log (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  deal_id       uuid not null references crm.deals(id) on delete cascade,
  person_id     uuid references core.persons(id) on delete set null,
  event_name    text not null,                       -- 'Lead' | 'Purchase' (padrão Meta)
  status        text not null default 'pending'
                  check (status in ('pending', 'sent', 'error')),
  http_status   int,
  request       jsonb,                                -- payload enviado (sem access_token)
  response      jsonb,                                -- resposta da Graph API
  error         text,
  created_at    timestamptz not null default now(),
  sent_at       timestamptz
);

create unique index if not exists capi_events_log_dedup
  on mkt.capi_events_log (deal_id, event_name);

comment on table mkt.capi_events_log is
  'Uma linha reservada por (deal_id, event_name) antes de chamar a Graph API — garante que send-meta-capi nunca manda o mesmo evento duas vezes, mesmo com cron concorrente.';

alter table mkt.capi_events_log enable row level security;
create policy capi_events_log_authenticated on mkt.capi_events_log
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete on mkt.capi_events_log to authenticated;
grant all on mkt.capi_events_log to service_role;

notify pgrst, 'reload schema';
