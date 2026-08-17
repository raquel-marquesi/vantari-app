-- ═══════════════════════════════════════════════════════════════════
-- Fix (2026-08-17): pedido da Catarina — pontuar leads de landing page
-- com o que dá pra inferir sem perguntar nada novo (fonte pelo UTM,
-- momento pelo horário, engajamento pela completude) + criar negócio
-- automático se a pessoa informou número de processo, sem duplicar
-- caso já tenha um negócio (ex: já falou com a Nina).
--
-- Investigando isso, achamos 3 gatilhos em public.leads com o mesmo
-- bug: chamavam funções sem qualificar o schema, com search_path
-- vazio — nunca resolviam. Resultado: TODO insert em public.leads
-- com CPF falhava silenciosamente (o erro subia até o exception
-- handler externo de trg_form_submission_to_lead e abortava a função
-- inteira). public.leads tinha só 2 registros no total; a maioria das
-- ~13 submissões reais das 3 LPs desde 30/06 nunca virou lead de
-- verdade. Corrigidos: trg_normalize_cpf, trg_lead_profile_recalc,
-- recompute_lead_profile, get_lead_field_value (todos com schema
-- qualificado). Não houve backfill dos ~6 registros históricos
-- restantes (são todos testes da própria Catarina, não leads reais).
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.trg_normalize_cpf()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  new.cpf := public.clean_cpf(new.cpf);
  return new;
end $$;

create or replace function public.trg_lead_profile_recalc()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  perform public.recompute_lead_profile(new.id);
  return new;
end $$;

create or replace function public.recompute_lead_profile(p_lead_id uuid)
returns void
language plpgsql
set search_path to ''
as $$
declare
  total_points int := 0;
  r record;
  v text;
  matched boolean;
  ta int; tb int; tc int;
  new_profile public.lead_profile;
begin
  -- Soma pontos das regras ativas que dão match
  for r in select id, field_source, field_key, operator, value, points
             from public.profile_rules
            where active = true loop
    v := public.get_lead_field_value(p_lead_id, r.field_source, r.field_key);
    matched := public.eval_profile_rule(r.operator, r.value, v);
    if matched then
      total_points := total_points + r.points;
    end if;
  end loop;

  -- Pega thresholds atuais
  select threshold_a, threshold_b, threshold_c
    into ta, tb, tc
    from public.profile_thresholds where id = 1;

  -- Decide letra
  if    total_points >= ta then new_profile := 'A';
  elsif total_points >= tb then new_profile := 'B';
  elsif total_points >= tc then new_profile := 'C';
  else                          new_profile := 'D';
  end if;

  update public.leads
     set profile = new_profile,
         profile_points = total_points,
         updated_at = now()
   where id = p_lead_id;
end $$;

create or replace function public.get_lead_field_value(p_lead_id uuid, p_source text, p_key text)
returns text
language plpgsql
set search_path to ''
as $$
declare
  v text;
  q text;
  lcv_exists boolean;
begin
  if p_source = 'lead_column' then
    q := format('select coalesce(%I::text, '''') from public.leads where id = $1', p_key);
    execute q into v using p_lead_id;
    return v;
  elsif p_source = 'custom_field' then
    select exists (
      select 1 from information_schema.tables
       where table_schema='public' and table_name='lead_custom_values'
    ) into lcv_exists;
    if not lcv_exists then return null; end if;
    execute $q$
      select lcv.value #>> '{}'
        from public.lead_custom_values lcv
        join public.custom_fields cf on cf.id = lcv.custom_field_id
       where lcv.lead_id = $1 and cf.api_id = $2
    $q$ into v using p_lead_id, p_key;
    return v;
  end if;
  return null;
exception when others then
  return null;
end $$;

-- mkt.on_form_submission / page_visit_to_lead_event (ver 20260817000002)
-- já cobrem o schema mkt/o site novo. Este trigger é para as 3 LPs
-- reais, que ainda usam o schema legado public.forms/form_submissions.
create or replace function public.trg_form_submission_to_lead()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
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
begin
  p_email   := nullif(lower(coalesce(new.payload ->> 'email', new.payload ->> 'Email', '')), '');

  -- normaliza CPF inline (evita depender de resolução de função externa
  -- em contexto de trigger)
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
      p_utm_term     => new.utm_term
    ) into v_person_id;
  exception when others then
    raise warning 'core.resolve_person falhou (submission %): %', new.id, sqlerrm;
  end;

  if v_person_id is not null then
    -- bloco A: atributos derivados sem perguntar nada (fonte/momento)
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

    -- bloco B: engajamento + negócio automático (separado do bloco A)
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

      v_numero_processo := core.normalize_numero_cnj(new.payload->>'numero_processo');
      if v_numero_processo is not null
         and not exists (select 1 from crm.deals where person_id = v_person_id)
      then
        perform crm.ingest_processo_lead(v_ws, v_person_id, v_numero_processo, null, 'form');
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
$$;

notify pgrst, 'reload schema';
