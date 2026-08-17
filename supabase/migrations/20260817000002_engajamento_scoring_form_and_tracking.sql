-- ═══════════════════════════════════════════════════════════════════
-- Fix (2026-08-17): engajamento (scoring Etapa 1) nunca era gravado.
-- Além disso, mkt.on_form_submission() nunca chegou a rotear
-- payload.attributes pro core.set_person_attributes (a versão 0007
-- que fazia isso não tinha sido aplicada) — mesmo o form real já vindo
-- com fields[].scoring_key prontos do lado do cliente.
-- ═══════════════════════════════════════════════════════════════════

-- helper: só "sobe" o engajamento se o novo valor valer mais que o atual
-- (evita que uma visita de página depois de um form_completo derrube o valor)
create or replace function core.bump_engajamento(p_person uuid, p_novo text, p_source text default null)
returns void language plpgsql security definer set search_path = core, public as $$
declare
  v_atual text;
  v_rank constant jsonb := '{"visitou_paginas":1,"form_parcial":2,"form_completo":3}'::jsonb;
begin
  if p_novo is null then return; end if;
  select value into v_atual from core.person_attributes where person_id = p_person and key = 'engajamento';
  if v_atual is null or coalesce((v_rank->>p_novo)::int, 0) > coalesce((v_rank->>v_atual)::int, 0) then
    perform core.set_person_attributes(p_person, jsonb_build_object('engajamento', p_novo), p_source);
  end if;
end $$;
grant execute on function core.bump_engajamento(uuid, text, text) to authenticated, service_role;

-- mkt.on_form_submission: + roteia payload.attributes + calcula engajamento
-- (completo = respondeu todos os campos do form; parcial = respondeu alguns)
create or replace function mkt.on_form_submission()
returns trigger
language plpgsql
security definer
set search_path = mkt, core, public
as $$
declare
  v_label  text;
  v_fields jsonb;
  v_person uuid;
  v_total  int;
  v_filled int;
  v_engaj  text;
  v_attrs  jsonb;
begin
  select coalesce(source_label, 'form'), coalesce(fields, '[]'::jsonb)
    into v_label, v_fields
    from mkt.forms where id = new.form_id;

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

  if v_person is not null then
    -- atributos de scoring que o form já manda prontos (fields[].scoring_key)
    v_attrs := coalesce(new.payload->'attributes', '{}'::jsonb);
    if v_attrs <> '{}'::jsonb then
      perform core.set_person_attributes(v_person, v_attrs, 'form');
    end if;

    -- engajamento: completude da resposta (campos do form vs. respondidos)
    v_total  := jsonb_array_length(v_fields);
    v_filled := (select count(*) from jsonb_object_keys(coalesce(new.payload, '{}'::jsonb)) k where k <> 'attributes')
              + (select count(*) from jsonb_object_keys(v_attrs));
    v_engaj := case
      when v_total > 0 and v_filled >= v_total then 'form_completo'
      when v_filled > 0 then 'form_parcial'
      else null
    end;
    if v_engaj is not null then
      perform core.bump_engajamento(v_person, v_engaj, 'form');
    end if;
  end if;

  return new;
end $$;

-- page_visit_to_lead_event: + bump de engajamento = visitou_paginas
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
        p_utm_term     => new.utm_term
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

notify pgrst, 'reload schema';
