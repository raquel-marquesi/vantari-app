


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."custom_field_source" AS ENUM (
    'manual',
    'crm_sync',
    'fb_forms',
    'google_ads',
    'imported',
    'system'
);


ALTER TYPE "public"."custom_field_source" OWNER TO "postgres";


CREATE TYPE "public"."custom_field_type" AS ENUM (
    'text',
    'email',
    'phone',
    'url',
    'number',
    'date',
    'datetime',
    'select',
    'multiselect',
    'radio',
    'checkbox',
    'textarea'
);


ALTER TYPE "public"."custom_field_type" OWNER TO "postgres";


CREATE TYPE "public"."import_status" AS ENUM (
    'pending',
    'processing',
    'done',
    'failed',
    'canceled'
);


ALTER TYPE "public"."import_status" OWNER TO "postgres";


CREATE TYPE "public"."integration_provider" AS ENUM (
    'meta',
    'google',
    'whatsapp',
    'webhook'
);


ALTER TYPE "public"."integration_provider" OWNER TO "postgres";


CREATE TYPE "public"."integration_status" AS ENUM (
    'disconnected',
    'pending',
    'connected',
    'expired',
    'error'
);


ALTER TYPE "public"."integration_status" OWNER TO "postgres";


CREATE TYPE "public"."lead_profile" AS ENUM (
    'A',
    'B',
    'C',
    'D'
);


ALTER TYPE "public"."lead_profile" OWNER TO "postgres";


CREATE TYPE "public"."page_funnel" AS ENUM (
    'topo',
    'meio',
    'fundo',
    'institucional',
    'outro'
);


ALTER TYPE "public"."page_funnel" OWNER TO "postgres";


CREATE TYPE "public"."workspace_role" AS ENUM (
    'owner',
    'admin',
    'member'
);


ALTER TYPE "public"."workspace_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_build_segment_condition"("_c" "jsonb") RETURNS "text"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  field text;
  op text;
  v text;
  n int;
begin
  field := _c->>'field';
  op := _c->>'op';
  v := coalesce(_c->>'value', '');

  if field = 'score' then
    if op not in ('=','!=','>','<','>=','<=') then return 'true'; end if;
    n := nullif(v,'')::int;
    return format('l.score %s %L', op, n);
  elsif field = 'tier' then
    if v not in ('cold','warm','hot') then return 'true'; end if;
    return format('public.tier_of(l.score, l.workspace_id) = %L', v);
  elsif field = 'stage' then
    return format('l.stage = %L', v);
  elsif field = 'company' then
    if op = 'eq' then return format('lower(coalesce(l.company,'''')) = lower(%L)', v);
    else return format('lower(coalesce(l.company,'''')) like lower(%L)', '%'||v||'%'); end if;
  elsif field = 'tag' then
    return format('%L = ANY(l.tags)', v);
  elsif field = 'created_days' then
    n := nullif(v,'')::int;
    return format('l.created_at >= now() - interval ''%s days''', n);
  elsif field = 'last_activity_days' then
    n := nullif(v,'')::int;
    return format(
      'exists (select 1 from public.lead_interactions li where li.lead_id = l.id and li.created_at >= now() - interval ''%s days'')',
      n);
  end if;
  return 'true';
end;
$$;


ALTER FUNCTION "public"."_build_segment_condition"("_c" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_build_segment_where"("_rules" "jsonb") RETURNS "text"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  op text;
  parts text[] := array[]::text[];
  child jsonb;
  cond_sql text;
  joiner text;
begin
  op := lower(coalesce(_rules->>'op', 'and'));
  if op not in ('and','or') then op := 'and'; end if;
  joiner := case op when 'or' then ' OR ' else ' AND ' end;

  if jsonb_typeof(_rules->'conditions') is distinct from 'array' then
    return 'true';
  end if;

  for child in select * from jsonb_array_elements(_rules->'conditions') loop
    if child ? 'op' then
      cond_sql := '(' || public._build_segment_where(child) || ')';
    else
      cond_sql := public._build_segment_condition(child);
    end if;
    if (child->>'negate')::boolean is true then
      cond_sql := 'NOT (' || cond_sql || ')';
    end if;
    parts := array_append(parts, cond_sql);
  end loop;

  if array_length(parts,1) is null then return 'true'; end if;
  return array_to_string(parts, joiner);
end;
$$;


ALTER FUNCTION "public"."_build_segment_where"("_rules" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_form_scoring"("_form_id" "uuid", "_lead_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  ws uuid;
  ws_lead uuid;
  cur int;
  pts int;
  new_score int;
begin
  select workspace_id into ws from public.forms where id = _form_id and is_active = true;
  if ws is null then return null; end if;

  select workspace_id, score into ws_lead, cur from public.leads where id = _lead_id;
  if ws_lead is null or ws_lead <> ws then return null; end if;

  select coalesce(sum(points), 0) into pts
    from public.scoring_rules
    where workspace_id = ws and action_type = 'form_submit' and is_active = true;

  if pts = 0 then return cur; end if;

  new_score := greatest(0, least(100, cur + pts));
  perform set_config('app.score_reason', 'form_submit', true);
  update public.leads set score = new_score where id = _lead_id;
  return new_score;
end;
$$;


ALTER FUNCTION "public"."apply_form_scoring"("_form_id" "uuid", "_lead_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_scoring"("_lead_id" "uuid", "_action_type" "text", "_custom_points" integer DEFAULT NULL::integer, "_reason" "text" DEFAULT NULL::"text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  ws uuid;
  cur int;
  pts int;
  new_score int;
begin
  select workspace_id, score into ws, cur from public.leads where id = _lead_id;
  if ws is null then
    raise exception 'lead not found';
  end if;
  if not public.is_workspace_member(ws) then
    raise exception 'forbidden';
  end if;

  if _custom_points is not null then
    pts := _custom_points;
  else
    select coalesce(sum(points), 0) into pts
      from public.scoring_rules
      where workspace_id = ws and action_type = _action_type and is_active = true;
  end if;

  new_score := greatest(0, least(100, cur + pts));
  perform set_config('app.score_reason', coalesce(_reason, _action_type), true);
  update public.leads set score = new_score where id = _lead_id;
  return new_score;
end;
$$;


ALTER FUNCTION "public"."apply_scoring"("_lead_id" "uuid", "_action_type" "text", "_custom_points" integer, "_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clean_cpf"("p_cpf" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $_$
declare
  v text;
begin
  if p_cpf is null then return null; end if;
  v := regexp_replace(p_cpf, '[^0-9]', '', 'g');
  if length(v) <> 11 then return null; end if;
  if v ~ '^(\d)\1{10}$' then return null; end if;  -- rejeita 11111111111 etc.
  return v;
end $_$;


ALTER FUNCTION "public"."clean_cpf"("p_cpf" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."count_segment_leads"("_workspace_id" "uuid", "_rules" "jsonb") RETURNS integer
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  total int;
  where_sql text;
begin
  if not public.is_workspace_member(_workspace_id) then
    raise exception 'forbidden';
  end if;

  where_sql := public._build_segment_where(_rules);
  execute format(
    'select count(*)::int from public.leads l where l.workspace_id = %L and (%s)',
    _workspace_id, where_sql
  ) into total;
  return total;
end;
$$;


ALTER FUNCTION "public"."count_segment_leads"("_workspace_id" "uuid", "_rules" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."eval_profile_rule"("rule_op" "text", "rule_val" "jsonb", "lead_val" "text") RETURNS boolean
    LANGUAGE "plpgsql" IMMUTABLE
    AS $_$
begin
  if lead_val is null and rule_op not in ('is_not_set') then
    return rule_op = 'is_not_set';
  end if;

  case rule_op
    when 'equals'      then return lower(lead_val) = lower(rule_val #>> '{}');
    when 'contains'    then return lower(lead_val) like '%' || lower(rule_val #>> '{}') || '%';
    when 'in'          then return rule_val ? lead_val;
    when 'gte'         then return (lead_val ~ '^-?[0-9]+(\.[0-9]+)?$')
                                   and lead_val::numeric >= (rule_val #>> '{}')::numeric;
    when 'lte'         then return (lead_val ~ '^-?[0-9]+(\.[0-9]+)?$')
                                   and lead_val::numeric <= (rule_val #>> '{}')::numeric;
    when 'is_set'      then return lead_val is not null and lead_val <> '';
    when 'is_not_set'  then return lead_val is null or lead_val = '';
    else return false;
  end case;
end $_$;


ALTER FUNCTION "public"."eval_profile_rule"("rule_op" "text", "rule_val" "jsonb", "lead_val" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_lead_field_value"("p_lead_id" "uuid", "p_source" "text", "p_key" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $_$
declare
  v text;
  q text;
  lcv_exists boolean;
begin
  if p_source = 'lead_column' then
    q := format('select coalesce(%I::text, '''') from leads where id = $1', p_key);
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
        from lead_custom_values lcv
        join custom_fields cf on cf.id = lcv.custom_field_id
       where lcv.lead_id = $1 and cf.api_id = $2
    $q$ into v using p_lead_id, p_key;
    return v;
  end if;
  return null;
exception when others then
  return null;
end $_$;


ALTER FUNCTION "public"."get_lead_field_value"("p_lead_id" "uuid", "p_source" "text", "p_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  new_workspace_id uuid;
  display_name text;
begin
  display_name := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));

  insert into public.profiles (id, name, email)
  values (new.id, display_name, new.email);

  insert into public.workspaces (name, owner_id)
  values (display_name || '''s workspace', new.id)
  returning id into new_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, new.id, 'owner');

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_workspace_member"("_workspace_id" "uuid", "_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = _workspace_id and user_id = _user_id
  );
$$;


ALTER FUNCTION "public"."is_workspace_member"("_workspace_id" "uuid", "_user_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."leads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid",
    "name" "text",
    "email" "text",
    "phone" "text",
    "company" "text",
    "score" integer DEFAULT 0 NOT NULL,
    "stage" "text" DEFAULT 'new'::"text" NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "source" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb",
    "company_id" "uuid",
    "profile" "public"."lead_profile",
    "profile_points" integer DEFAULT 0 NOT NULL,
    "city" "text",
    "state" "text",
    "utm_source" "text",
    "utm_medium" "text",
    "utm_campaign" "text",
    "utm_content" "text",
    "utm_term" "text",
    "unsubscribed" boolean DEFAULT false NOT NULL,
    "owner_id" "uuid",
    "last_event_at" timestamp with time zone,
    "cpf" "text"
);


ALTER TABLE "public"."leads" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lead_is_complete"("p_lead" "public"."leads") RETURNS boolean
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
begin
  return p_lead.cpf is not null and length(p_lead.cpf) = 11;
end $$;


ALTER FUNCTION "public"."lead_is_complete"("p_lead" "public"."leads") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_lead_score_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  reason_text text;
  old_t text;
  new_t text;
begin
  if new.score is distinct from old.score then
    reason_text := coalesce(current_setting('app.score_reason', true), 'manual');
    old_t := public.tier_of(old.score, new.workspace_id);
    new_t := public.tier_of(new.score, new.workspace_id);

    insert into public.lead_score_history (lead_id, workspace_id, old_score, new_score, old_tier, new_tier, reason)
    values (new.id, new.workspace_id, old.score, new.score, old_t, new_t, reason_text);

    if old_t is distinct from new_t then
      insert into public.lead_interactions (lead_id, workspace_id, type, data)
      values (new.id, new.workspace_id, 'tier_change',
              jsonb_build_object('from', old_t, 'to', new_t, 'score', new.score));
    end if;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."log_lead_score_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."merge_lead_by_cpf"("p_source_lead_id" "uuid", "p_cpf" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_cpf text;
  v_target_id uuid;
  v_source leads%rowtype;
begin
  v_cpf := clean_cpf(p_cpf);
  if v_cpf is null then
    raise exception 'CPF inválido: %', p_cpf;
  end if;

  -- Busca lead já existente com esse CPF
  select id into v_target_id from leads where cpf = v_cpf and id <> p_source_lead_id limit 1;

  if v_target_id is null then
    -- Não há merge: só atualiza CPF do source
    update leads set cpf = v_cpf, updated_at = now() where id = p_source_lead_id;
    return p_source_lead_id;
  end if;

  -- Existe duplicata: fundir source no target (CPF wins)
  select * into v_source from leads where id = p_source_lead_id;

  -- Move lead_events e form_submissions para o target
  update lead_events     set lead_id = v_target_id where lead_id = p_source_lead_id;
  update form_submissions set lead_id = v_target_id where lead_id = p_source_lead_id;

  -- Move custom values (resolve conflitos: target ganha)
  insert into lead_custom_values (lead_id, custom_field_id, value)
    select v_target_id, custom_field_id, value
      from lead_custom_values
     where lead_id = p_source_lead_id
  on conflict (lead_id, custom_field_id) do nothing;
  delete from lead_custom_values where lead_id = p_source_lead_id;

  -- Atualiza target com dados do source que estão NULL no target
  update leads set
    name    = coalesce(name, v_source.name),
    email   = coalesce(email, v_source.email),
    phone   = coalesce(phone, v_source.phone),
    company = coalesce(company, v_source.company),
    source  = coalesce(source, v_source.source),
    tags    = (select array(select distinct unnest(coalesce(tags,'{}') || coalesce(v_source.tags,'{}')))),
    score   = greatest(score, coalesce(v_source.score, 0)),
    updated_at = now()
  where id = v_target_id;

  -- Deleta o source
  delete from leads where id = p_source_lead_id;

  return v_target_id;
end $$;


ALTER FUNCTION "public"."merge_lead_by_cpf"("p_source_lead_id" "uuid", "p_cpf" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."page_visit_to_lead_event"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_delta int;
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
  return new;
end $$;


ALTER FUNCTION "public"."page_visit_to_lead_event"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recompute_all_profiles"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
declare
  c int := 0;
  lid uuid;
begin
  for lid in select id from leads loop
    perform recompute_lead_profile(lid);
    c := c + 1;
  end loop;
  return c;
end $$;


ALTER FUNCTION "public"."recompute_all_profiles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recompute_lead_profile"("p_lead_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  total_points int := 0;
  r record;
  v text;
  matched boolean;
  ta int; tb int; tc int;
  new_profile lead_profile;
begin
  -- Soma pontos das regras ativas que dão match
  for r in select id, field_source, field_key, operator, value, points
             from profile_rules
            where active = true loop
    v := get_lead_field_value(p_lead_id, r.field_source, r.field_key);
    matched := eval_profile_rule(r.operator, r.value, v);
    if matched then
      total_points := total_points + r.points;
    end if;
  end loop;

  -- Pega thresholds atuais
  select threshold_a, threshold_b, threshold_c
    into ta, tb, tc
    from profile_thresholds where id = 1;

  -- Decide letra
  if    total_points >= ta then new_profile := 'A';
  elsif total_points >= tb then new_profile := 'B';
  elsif total_points >= tc then new_profile := 'C';
  else                          new_profile := 'D';
  end if;

  update leads
     set profile = new_profile,
         profile_points = total_points,
         updated_at = now()
   where id = p_lead_id;
end $$;


ALTER FUNCTION "public"."recompute_lead_profile"("p_lead_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."seed_workspace_scoring"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.scoring_settings (workspace_id) values (new.id)
  on conflict (workspace_id) do nothing;

  insert into public.scoring_rules (workspace_id, action_type, points)
  values
    (new.id, 'form_submit', 10),
    (new.id, 'email_open', 2),
    (new.id, 'email_click', 5),
    (new.id, 'page_visit', 1);

  return new;
end;
$$;


ALTER FUNCTION "public"."seed_workspace_scoring"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin new.updated_at = now(); return new; end $$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."simulate_campaign_send"("_campaign_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  ws uuid;
  c record;
  recipient record;
  total int := 0;
  delivered int := 0;
  opened int := 0;
  clicked int := 0;
  bounced int := 0;
  unsub int := 0;
  seg_where text;
  sql text;
  r float;
begin
  select * into c from public.campaigns where id = _campaign_id;
  if c.id is null then raise exception 'campaign not found'; end if;
  ws := c.workspace_id;
  if not public.is_workspace_member(ws) then raise exception 'forbidden'; end if;

  delete from public.email_sends where campaign_id = _campaign_id;

  -- Build recipient query depending on audience type
  if c.audience_type = 'segment' and c.segment_id is not null then
    select public._build_segment_where(rules) into seg_where from public.segments where id = c.segment_id;
    sql := format(
      'select id, email from public.leads l where l.workspace_id = %L and l.email is not null and l.email <> '''' and (%s)',
      ws, coalesce(seg_where, 'true')
    );
  elsif c.audience_type = 'manual' then
    sql := format(
      'select id, email from public.leads where workspace_id = %L and email is not null and email <> '''' and id = any(%L::uuid[])',
      ws, c.manual_lead_ids
    );
  else
    sql := format(
      'select id, email from public.leads where workspace_id = %L and email is not null and email <> ''''',
      ws
    );
  end if;

  for recipient in execute sql loop
    -- Skip unsubscribed
    if exists (select 1 from public.unsubscribes u where u.workspace_id = ws and lower(u.email) = lower(recipient.email)) then
      unsub := unsub + 1;
      insert into public.email_sends (workspace_id, campaign_id, lead_id, email, status)
      values (ws, _campaign_id, recipient.id, recipient.email, 'unsubscribed');
      continue;
    end if;

    total := total + 1;
    r := random();
    if r < 0.05 then
      bounced := bounced + 1;
      insert into public.email_sends (workspace_id, campaign_id, lead_id, email, status, sent_at, bounced_at)
      values (ws, _campaign_id, recipient.id, recipient.email, 'bounced', now(), now());
    else
      delivered := delivered + 1;
      declare
        was_opened boolean := random() < 0.45;
        was_clicked boolean := false;
        st text := 'delivered';
        opened_t timestamptz := null;
        clicked_t timestamptz := null;
      begin
        if was_opened then
          opened := opened + 1;
          opened_t := now() - (random() * interval '6 hours');
          st := 'opened';
          if random() < 0.35 then
            was_clicked := true;
            clicked := clicked + 1;
            clicked_t := opened_t + (random() * interval '30 minutes');
            st := 'clicked';
          end if;
        end if;
        insert into public.email_sends (workspace_id, campaign_id, lead_id, email, status, sent_at, delivered_at, opened_at, clicked_at, clicked_url)
        values (ws, _campaign_id, recipient.id, recipient.email, st, now(), now(), opened_t, clicked_t,
          case when was_clicked then 'https://example.com' else null end);
      end;
    end if;
  end loop;

  update public.campaigns
  set status = 'sent',
      sent_at = now(),
      metrics = jsonb_build_object(
        'sent', total,
        'delivered', delivered,
        'opened', opened,
        'clicked', clicked,
        'bounced', bounced,
        'unsubscribed', unsub
      )
  where id = _campaign_id;

  return jsonb_build_object('total', total, 'delivered', delivered, 'opened', opened, 'clicked', clicked, 'bounced', bounced, 'unsubscribed', unsub);
end;
$$;


ALTER FUNCTION "public"."simulate_campaign_send"("_campaign_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."simulate_workflow_execution"("_workflow_id" "uuid", "_lead_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  ws uuid;
  wf record;
  exec_id uuid;
  step jsonb;
  step_idx int := 0;
  action_label text;
begin
  select * into wf from public.workflows where id = _workflow_id;
  if wf.id is null then raise exception 'workflow not found'; end if;
  ws := wf.workspace_id;
  if not public.is_workspace_member(ws) then raise exception 'forbidden'; end if;

  insert into public.workflow_runs (workspace_id, workflow_id, lead_id, status, context)
  values (ws, _workflow_id, _lead_id, 'completed', jsonb_build_object('simulated', true))
  returning id into exec_id;

  insert into public.workflow_logs (workspace_id, workflow_id, execution_id, lead_id, step_id, action, result, message)
  values (ws, _workflow_id, exec_id, _lead_id, 'trigger', wf.trigger_type, 'success', 'Trigger acionado');

  for step in select * from jsonb_array_elements(coalesce(wf.steps, '[]'::jsonb)) loop
    step_idx := step_idx + 1;
    action_label := coalesce(step->>'type', 'action');
    insert into public.workflow_logs (workspace_id, workflow_id, execution_id, lead_id, step_id, action, result, message, data)
    values (ws, _workflow_id, exec_id, _lead_id, coalesce(step->>'id', step_idx::text), action_label, 'success',
            'Etapa simulada: '||action_label, coalesce(step->'config','{}'::jsonb));
  end loop;

  update public.workflow_runs
  set status = 'completed', finished_at = now(), current_step = step_idx
  where id = exec_id;

  update public.workflows
  set stats = jsonb_set(
        jsonb_set(stats, '{runs}', to_jsonb(coalesce((stats->>'runs')::int,0) + 1)),
        '{completed}', to_jsonb(coalesce((stats->>'completed')::int,0) + 1)
      ),
      triggers_count = triggers_count + 1
  where id = _workflow_id;

  return exec_id;
end;
$$;


ALTER FUNCTION "public"."simulate_workflow_execution"("_workflow_id" "uuid", "_lead_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_integration_credentials_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."tg_integration_credentials_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tier_of"("_score" integer, "_workspace_id" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select case
    when _score <= coalesce((select cold_max from public.scoring_settings where workspace_id = _workspace_id), 20) then 'cold'
    when _score <= coalesce((select warm_max from public.scoring_settings where workspace_id = _workspace_id), 50) then 'warm'
    else 'hot'
  end
$$;


ALTER FUNCTION "public"."tier_of"("_score" integer, "_workspace_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_form_submission_to_lead"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  p_email   text;
  p_cpf     text;
  p_name    text;
  p_phone   text;
  p_company text;
  v_form    record;
  v_ws      uuid;
  v_lead_id uuid;
  v_points  integer;
  v_source  text;
  v_stage   text;
begin
  p_email   := nullif(lower(coalesce(new.payload ->> 'email', new.payload ->> 'Email', '')), '');
  p_cpf     := clean_cpf(coalesce(new.payload ->> 'cpf', new.payload ->> 'CPF'));
  p_name    := coalesce(new.payload ->> 'name',  new.payload ->> 'nome',     new.payload ->> 'Nome');
  p_phone   := coalesce(new.payload ->> 'phone', new.payload ->> 'telefone', new.payload ->> 'Telefone');
  p_company := coalesce(new.payload ->> 'company', new.payload ->> 'empresa', new.payload ->> 'Empresa');

  -- precisa de pelo menos CPF ou email
  if p_cpf is null and p_email is null then
    return new;
  end if;

  select * into v_form from forms where id = new.form_id;
  v_ws     := coalesce(new.workspace_id, v_form.workspace_id);
  v_source := coalesce(v_form.source_label, 'Form: ' || coalesce(v_form.name, ''));
  v_stage  := coalesce(v_form.stage_on_submit, 'Lead');

  -- herda o workspace na própria submission, se faltava
  if new.workspace_id is null and v_ws is not null then
    update form_submissions set workspace_id = v_ws where id = new.id;
  end if;

  -- localizar lead existente: CPF tem prioridade; depois (workspace, email)
  if p_cpf is not null then
    select id into v_lead_id from leads where cpf = p_cpf limit 1;
  end if;
  if v_lead_id is null and p_email is not null then
    select id into v_lead_id from leads
     where lower(email) = p_email
       and workspace_id is not distinct from v_ws
     limit 1;
  end if;

  if v_lead_id is null then
    insert into leads (workspace_id, cpf, email, name, phone, company, source, stage,
                       utm_source, utm_medium, utm_campaign, utm_content, utm_term, tags)
    values (v_ws, p_cpf, p_email, p_name, p_phone, p_company, v_source, v_stage,
            new.utm_source, new.utm_medium, new.utm_campaign, new.utm_content, new.utm_term,
            coalesce(v_form.tags, '{}'))
    returning id into v_lead_id;
  else
    update leads set
      cpf        = coalesce(cpf, p_cpf),
      email      = coalesce(email, p_email),
      name       = coalesce(name, p_name),
      phone      = coalesce(phone, p_phone),
      company    = coalesce(company, p_company),
      tags       = (select array(select distinct unnest(coalesce(leads.tags, '{}') || coalesce(v_form.tags, '{}')))),
      updated_at = now()
    where id = v_lead_id;
  end if;

  -- vincula a submission ao lead
  update form_submissions set lead_id = v_lead_id where id = new.id;

  -- evento de score (apenas com workspace: a cascata lead_score_history exige workspace_id NOT NULL)
  if v_ws is not null then
    v_points := coalesce(
      (select points from scoring_rules
        where action = 'form_submit' and active = true
          and (workspace_id = v_ws or workspace_id is null)
        order by workspace_id nulls last
        limit 1),
      10);
    insert into lead_events (lead_id, event_type, score_delta, metadata)
    values (v_lead_id, 'form_fill', v_points,
            jsonb_build_object('form_id', new.form_id,
                               'form_name', coalesce(v_form.name, ''),
                               'submission_id', new.id,
                               'origin', 'form_submit'));
  end if;

  -- incrementa o contador do formulário
  update forms set submission_count = coalesce(submission_count, 0) + 1, updated_at = now()
   where id = new.form_id;

  return new;
exception when others then
  -- não bloqueia a gravação da submissão, mas registra o erro no log do Postgres
  raise warning 'trg_form_submission_to_lead falhou (submission %): %', new.id, sqlerrm;
  return new;
end;
$$;


ALTER FUNCTION "public"."trg_form_submission_to_lead"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_lcv_profile_recalc"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  target_lead uuid;
begin
  target_lead := coalesce(new.lead_id, old.lead_id);
  if target_lead is not null then
    perform recompute_lead_profile(target_lead);
  end if;
  return coalesce(new, old);
end $$;


ALTER FUNCTION "public"."trg_lcv_profile_recalc"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_lead_profile_recalc"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  perform recompute_lead_profile(new.id);
  return new;
end $$;


ALTER FUNCTION "public"."trg_lead_profile_recalc"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_normalize_cpf"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.cpf := clean_cpf(new.cpf);
  return new;
end $$;


ALTER FUNCTION "public"."trg_normalize_cpf"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_workflow"("_workflow_id" "uuid", "_lead_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  ws uuid;
  run_id uuid;
begin
  select workspace_id into ws from public.workflows where id = _workflow_id and status = 'active';
  if ws is null then return null; end if;
  if not public.is_workspace_member(ws) then raise exception 'forbidden'; end if;

  insert into public.workflow_runs (workspace_id, workflow_id, lead_id)
  values (ws, _workflow_id, _lead_id)
  returning id into run_id;

  update public.workflows
  set stats = jsonb_set(
    jsonb_set(stats, '{runs}', to_jsonb(coalesce((stats->>'runs')::int,0) + 1)),
    '{active}', to_jsonb(coalesce((stats->>'active')::int,0) + 1)
  )
  where id = _workflow_id;

  return run_id;
end;
$$;


ALTER FUNCTION "public"."trigger_workflow"("_workflow_id" "uuid", "_lead_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_lead_score"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  update leads
  set score = score + new.score_delta,
      updated_at = now()
  where id = new.lead_id;
  return new;
end;
$$;


ALTER FUNCTION "public"."update_lead_score"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_workspace_ids"("_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS SETOF "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select workspace_id from public.workspace_members where user_id = _user_id;
$$;


ALTER FUNCTION "public"."user_workspace_ids"("_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."valid_cpf"("p_cpf" "text") RETURNS boolean
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
declare
  v text;
  d1 int := 0;
  d2 int := 0;
  i  int;
begin
  v := clean_cpf(p_cpf);
  if v is null then return false; end if;

  for i in 1..9 loop
    d1 := d1 + (substring(v, i, 1)::int * (11 - i));
  end loop;
  d1 := 11 - (d1 % 11);
  if d1 >= 10 then d1 := 0; end if;
  if d1 <> substring(v, 10, 1)::int then return false; end if;

  for i in 1..10 loop
    d2 := d2 + (substring(v, i, 1)::int * (12 - i));
  end loop;
  d2 := 11 - (d2 % 11);
  if d2 >= 10 then d2 := 0; end if;
  return d2 = substring(v, 11, 1)::int;
end $$;


ALTER FUNCTION "public"."valid_cpf"("p_cpf" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."automation_flows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "trigger_type" "text" NOT NULL,
    "trigger_config" "jsonb" DEFAULT '{}'::"jsonb",
    "steps" "jsonb" DEFAULT '[]'::"jsonb",
    "status" "text" DEFAULT 'inactive'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "automation_flows_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'draft'::"text"]))),
    CONSTRAINT "automation_flows_trigger_type_check" CHECK (("trigger_type" = ANY (ARRAY['form_submission'::"text", 'tag_added'::"text", 'score_threshold'::"text", 'date_based'::"text", 'email_interaction'::"text", 'page_visit'::"text"])))
);


ALTER TABLE "public"."automation_flows" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."campaign_sends" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid",
    "lead_id" "uuid",
    "sent_at" timestamp with time zone,
    "opened_at" timestamp with time zone,
    "clicked_at" timestamp with time zone,
    "bounced_at" timestamp with time zone,
    "unsubscribed_at" timestamp with time zone,
    "delivered" integer DEFAULT 0,
    "opened" integer DEFAULT 0,
    "clicked" integer DEFAULT 0,
    "bounced" integer DEFAULT 0,
    "unsubscribed" integer DEFAULT 0,
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."campaign_sends" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."campaigns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid",
    "name" "text",
    "subject" "text" DEFAULT ''::"text",
    "from_name" "text" DEFAULT ''::"text",
    "from_email" "text" DEFAULT ''::"text",
    "reply_to" "text",
    "content_html" "text" DEFAULT ''::"text",
    "content_text" "text",
    "category" "text" DEFAULT 'newsletter'::"text",
    "status" "text" DEFAULT 'draft'::"text",
    "audience_type" "text" DEFAULT 'all'::"text",
    "segment_id" "uuid",
    "manual_lead_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "scheduled_at" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "timezone" "text" DEFAULT 'UTC'::"text",
    "throttle_per_minute" integer DEFAULT 0,
    "ab_test" "jsonb" DEFAULT '{}'::"jsonb",
    "metrics" "jsonb" DEFAULT '{"sent": 0, "opened": 0, "bounced": 0, "clicked": 0, "delivered": 0, "unsubscribed": 0}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "html_content" "text",
    "sender" "text",
    "bee_json" "jsonb",
    "blocks" "jsonb" DEFAULT '[]'::"jsonb",
    "template_id" "uuid",
    "type" "text" DEFAULT 'newsletter'::"text",
    "audience" "text",
    "audience_count" integer DEFAULT 0
);


ALTER TABLE "public"."campaigns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "website" "text",
    "industry" "text",
    "size" "text",
    "cnpj" "text",
    "state" "text",
    "city" "text",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."custom_fields" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "label" "text" NOT NULL,
    "api_id" "text" NOT NULL,
    "type" "public"."custom_field_type" DEFAULT 'text'::"public"."custom_field_type" NOT NULL,
    "source" "public"."custom_field_source" DEFAULT 'manual'::"public"."custom_field_source" NOT NULL,
    "options" "jsonb" DEFAULT '[]'::"jsonb",
    "description" "text",
    "required" boolean DEFAULT false,
    "active" boolean DEFAULT true,
    "position" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."custom_fields" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_sends" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "lead_id" "uuid",
    "email" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "sent_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "opened_at" timestamp with time zone,
    "clicked_at" timestamp with time zone,
    "bounced_at" timestamp with time zone,
    "clicked_url" "text",
    "error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."email_sends" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid",
    "name" "text",
    "category" "text" DEFAULT 'newsletter'::"text",
    "subject" "text" DEFAULT ''::"text",
    "content_html" "text" DEFAULT ''::"text",
    "thumbnail_url" "text",
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "slug" "text",
    "description" "text",
    "html" "text",
    "blocks" "jsonb" DEFAULT '[]'::"jsonb",
    "bee_json" "jsonb",
    "source" "text" DEFAULT 'manual'::"text",
    "active" boolean DEFAULT true,
    "use_count" integer DEFAULT 0
);


ALTER TABLE "public"."email_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."flow_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "flow_id" "uuid",
    "lead_id" "uuid",
    "current_step" integer DEFAULT 0,
    "status" "text" DEFAULT 'running'::"text",
    "log" "jsonb" DEFAULT '[]'::"jsonb",
    "started_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "flow_runs_status_check" CHECK (("status" = ANY (ARRAY['running'::"text", 'completed'::"text", 'failed'::"text", 'waiting'::"text"])))
);


ALTER TABLE "public"."flow_runs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."form_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "form_id" "uuid",
    "workspace_id" "uuid",
    "lead_id" "uuid",
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb",
    "utm_source" "text",
    "utm_medium" "text",
    "utm_campaign" "text",
    "utm_content" "text",
    "utm_term" "text",
    "user_agent" "text",
    "referrer" "text",
    "ip" "text"
);


ALTER TABLE "public"."form_submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."forms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid",
    "name" "text",
    "slug" "text",
    "fields" "jsonb" DEFAULT '[]'::"jsonb",
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "active" boolean DEFAULT true,
    "description" "text",
    "style" "jsonb" DEFAULT '{}'::"jsonb",
    "redirect_url" "text",
    "success_msg" "text" DEFAULT 'Obrigado! Recebemos seus dados.'::"text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "source_label" "text",
    "submission_count" integer DEFAULT 0,
    "stage_on_submit" "text" DEFAULT 'Lead'::"text"
);


ALTER TABLE "public"."forms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."integration_credentials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider" "public"."integration_provider" NOT NULL,
    "status" "public"."integration_status" DEFAULT 'disconnected'::"public"."integration_status" NOT NULL,
    "client_id" "text",
    "client_secret" "text",
    "access_token" "text",
    "refresh_token" "text",
    "expires_at" timestamp with time zone,
    "scope" "text",
    "account_id" "text",
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "last_sync" timestamp with time zone,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."integration_credentials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."landing_pages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "fields" "jsonb" DEFAULT '[]'::"jsonb",
    "redirect_url" "text",
    "thank_you_message" "text",
    "status" "text" DEFAULT 'draft'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "landing_pages_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."landing_pages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lead_custom_values" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lead_id" "uuid" NOT NULL,
    "custom_field_id" "uuid" NOT NULL,
    "value" "jsonb",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."lead_custom_values" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lead_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lead_id" "uuid",
    "event_type" "text" NOT NULL,
    "score_delta" integer DEFAULT 0,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "lead_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['page_visit'::"text", 'specific_page_visit'::"text", 'email_open'::"text", 'email_click'::"text", 'form_fill'::"text", 'unsubscribe'::"text", 'inactivity'::"text"])))
);


ALTER TABLE "public"."lead_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lead_exports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "filename" "text" NOT NULL,
    "total_rows" integer DEFAULT 0,
    "filters" "jsonb" DEFAULT '{}'::"jsonb",
    "fields" "text"[],
    "file_url" "text",
    "source" "text",
    "exported_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."lead_exports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lead_imports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "filename" "text" NOT NULL,
    "total_rows" integer DEFAULT 0,
    "imported" integer DEFAULT 0,
    "updated" integer DEFAULT 0,
    "skipped" integer DEFAULT 0,
    "failed" integer DEFAULT 0,
    "status" "public"."import_status" DEFAULT 'pending'::"public"."import_status" NOT NULL,
    "field_mapping" "jsonb" DEFAULT '{}'::"jsonb",
    "errors" "jsonb" DEFAULT '[]'::"jsonb",
    "source" "text",
    "imported_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "finished_at" timestamp with time zone
);


ALTER TABLE "public"."lead_imports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lead_interactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lead_id" "uuid" NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."lead_interactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lead_score_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lead_id" "uuid" NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "old_score" integer NOT NULL,
    "new_score" integer NOT NULL,
    "old_tier" "text",
    "new_tier" "text",
    "reason" "text",
    "rule_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."lead_score_history" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."leads_pending" AS
 SELECT "id",
    "name",
    "email",
    "phone",
    "company",
    "created_at",
    "source"
   FROM "public"."leads"
  WHERE ("cpf" IS NULL);


ALTER VIEW "public"."leads_pending" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."page_visits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lead_id" "uuid",
    "tracked_page_id" "uuid",
    "url" "text" NOT NULL,
    "path" "text",
    "referrer" "text",
    "visitor_id" "text",
    "user_agent" "text",
    "ip_country" "text",
    "utm_source" "text",
    "utm_medium" "text",
    "utm_campaign" "text",
    "utm_content" "text",
    "utm_term" "text",
    "duration_s" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."page_visits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profile_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "label" "text" NOT NULL,
    "category" "text" DEFAULT 'manual'::"text",
    "field_source" "text" NOT NULL,
    "field_key" "text" NOT NULL,
    "operator" "text" NOT NULL,
    "value" "jsonb",
    "points" integer DEFAULT 0 NOT NULL,
    "active" boolean DEFAULT true,
    "position" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "profile_rules_field_source_check" CHECK (("field_source" = ANY (ARRAY['lead_column'::"text", 'custom_field'::"text"])))
);


ALTER TABLE "public"."profile_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profile_thresholds" (
    "id" integer DEFAULT 1 NOT NULL,
    "threshold_a" integer DEFAULT 70 NOT NULL,
    "threshold_b" integer DEFAULT 40 NOT NULL,
    "threshold_c" integer DEFAULT 20 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "pt_single" CHECK (("id" = 1))
);


ALTER TABLE "public"."profile_thresholds" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "name" "text",
    "email" "text",
    "company" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scoring_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid",
    "action_type" "text",
    "points" integer DEFAULT 0 NOT NULL,
    "conditions" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "action" "text",
    "label" "text",
    "category" "text",
    "active" boolean DEFAULT true
);


ALTER TABLE "public"."scoring_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scoring_settings" (
    "workspace_id" "uuid" NOT NULL,
    "cold_max" integer DEFAULT 20 NOT NULL,
    "warm_max" integer DEFAULT 50 NOT NULL,
    "decay_per_month" integer DEFAULT 5 NOT NULL,
    "decay_enabled" boolean DEFAULT true NOT NULL,
    "webhook_url" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."scoring_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."segments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "rules" "jsonb" DEFAULT '{"op": "and", "conditions": []}'::"jsonb" NOT NULL,
    "lead_count" integer DEFAULT 0 NOT NULL,
    "last_calculated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."segments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "name" "text",
    "role" "text" DEFAULT 'user'::"text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text",
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "last_active" timestamp with time zone
);


ALTER TABLE "public"."team_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tracked_pages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "url" "text" NOT NULL,
    "title" "text",
    "funnel" "public"."page_funnel" DEFAULT 'outro'::"public"."page_funnel",
    "score_delta" integer DEFAULT 5 NOT NULL,
    "category" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tracked_pages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."unsubscribes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "campaign_id" "uuid",
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."unsubscribes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "workflow_id" "uuid" NOT NULL,
    "execution_id" "uuid" NOT NULL,
    "lead_id" "uuid",
    "step_id" "text",
    "action" "text" NOT NULL,
    "result" "text" DEFAULT 'success'::"text" NOT NULL,
    "message" "text",
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."workflow_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "workflow_id" "uuid" NOT NULL,
    "lead_id" "uuid",
    "status" "text" DEFAULT 'running'::"text" NOT NULL,
    "current_step" integer DEFAULT 0 NOT NULL,
    "context" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "log" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "finished_at" timestamp with time zone,
    "next_run_at" timestamp with time zone
);


ALTER TABLE "public"."workflow_runs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "trigger_type" "text" DEFAULT 'manual'::"text" NOT NULL,
    "trigger_config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "steps" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "stats" "jsonb" DEFAULT '{"runs": 0, "active": 0, "failed": 0, "completed": 0}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "triggers_count" integer DEFAULT 0 NOT NULL,
    "canvas" "jsonb" DEFAULT '{"edges": [], "nodes": []}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."workflows" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workspace_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workspace_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."workspace_role" DEFAULT 'member'::"public"."workspace_role" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."workspace_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workspaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "settings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."workspaces" OWNER TO "postgres";


ALTER TABLE ONLY "public"."automation_flows"
    ADD CONSTRAINT "automation_flows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaign_sends"
    ADD CONSTRAINT "campaign_sends_campaign_id_lead_id_key" UNIQUE ("campaign_id", "lead_id");



ALTER TABLE ONLY "public"."campaign_sends"
    ADD CONSTRAINT "campaign_sends_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."custom_fields"
    ADD CONSTRAINT "custom_fields_api_id_key" UNIQUE ("api_id");



ALTER TABLE ONLY "public"."custom_fields"
    ADD CONSTRAINT "custom_fields_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_sends"
    ADD CONSTRAINT "email_sends_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."flow_runs"
    ADD CONSTRAINT "flow_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."form_submissions"
    ADD CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."forms"
    ADD CONSTRAINT "forms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."forms"
    ADD CONSTRAINT "forms_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."integration_credentials"
    ADD CONSTRAINT "integration_credentials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."integration_credentials"
    ADD CONSTRAINT "integration_credentials_provider_key" UNIQUE ("provider");



ALTER TABLE ONLY "public"."landing_pages"
    ADD CONSTRAINT "landing_pages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."landing_pages"
    ADD CONSTRAINT "landing_pages_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."lead_custom_values"
    ADD CONSTRAINT "lead_custom_values_lead_id_custom_field_id_key" UNIQUE ("lead_id", "custom_field_id");



ALTER TABLE ONLY "public"."lead_custom_values"
    ADD CONSTRAINT "lead_custom_values_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_events"
    ADD CONSTRAINT "lead_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_exports"
    ADD CONSTRAINT "lead_exports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_imports"
    ADD CONSTRAINT "lead_imports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_interactions"
    ADD CONSTRAINT "lead_interactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_score_history"
    ADD CONSTRAINT "lead_score_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_email_unique" UNIQUE ("email");



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."page_visits"
    ADD CONSTRAINT "page_visits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profile_rules"
    ADD CONSTRAINT "profile_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profile_thresholds"
    ADD CONSTRAINT "profile_thresholds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scoring_rules"
    ADD CONSTRAINT "scoring_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scoring_settings"
    ADD CONSTRAINT "scoring_settings_pkey" PRIMARY KEY ("workspace_id");



ALTER TABLE ONLY "public"."segments"
    ADD CONSTRAINT "segments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tracked_pages"
    ADD CONSTRAINT "tracked_pages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tracked_pages"
    ADD CONSTRAINT "tracked_pages_url_key" UNIQUE ("url");



ALTER TABLE ONLY "public"."unsubscribes"
    ADD CONSTRAINT "unsubscribes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."unsubscribes"
    ADD CONSTRAINT "unsubscribes_workspace_id_email_key" UNIQUE ("workspace_id", "email");



ALTER TABLE ONLY "public"."workflow_logs"
    ADD CONSTRAINT "workflow_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflow_runs"
    ADD CONSTRAINT "workflow_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflows"
    ADD CONSTRAINT "workflows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_workspace_id_user_id_key" UNIQUE ("workspace_id", "user_id");



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "email_templates_slug_unique" ON "public"."email_templates" USING "btree" ("slug") WHERE ("slug" IS NOT NULL);



CREATE UNIQUE INDEX "forms_slug_unique" ON "public"."forms" USING "btree" ("slug") WHERE ("slug" IS NOT NULL);



CREATE INDEX "idx_campaigns_created" ON "public"."campaigns" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_campaigns_scheduled" ON "public"."campaigns" USING "btree" ("scheduled_at");



CREATE INDEX "idx_campaigns_status" ON "public"."campaigns" USING "btree" ("status");



CREATE INDEX "idx_campaigns_workspace" ON "public"."campaigns" USING "btree" ("workspace_id");



CREATE INDEX "idx_companies_cnpj" ON "public"."companies" USING "btree" ("cnpj");



CREATE INDEX "idx_companies_name" ON "public"."companies" USING "btree" ("lower"("name"));



CREATE INDEX "idx_cs_campaign" ON "public"."campaign_sends" USING "btree" ("campaign_id");



CREATE INDEX "idx_cs_lead" ON "public"."campaign_sends" USING "btree" ("lead_id");



CREATE INDEX "idx_cs_status" ON "public"."campaign_sends" USING "btree" ("status");



CREATE INDEX "idx_custom_fields_active" ON "public"."custom_fields" USING "btree" ("active");



CREATE INDEX "idx_custom_fields_api_id" ON "public"."custom_fields" USING "btree" ("api_id");



CREATE INDEX "idx_custom_fields_source" ON "public"."custom_fields" USING "btree" ("source");



CREATE INDEX "idx_email_sends_campaign" ON "public"."email_sends" USING "btree" ("campaign_id");



CREATE INDEX "idx_email_sends_status" ON "public"."email_sends" USING "btree" ("status");



CREATE INDEX "idx_email_sends_workspace" ON "public"."email_sends" USING "btree" ("workspace_id");



CREATE INDEX "idx_et_active" ON "public"."email_templates" USING "btree" ("active");



CREATE INDEX "idx_exports_created" ON "public"."lead_exports" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_forms_active" ON "public"."forms" USING "btree" ("active");



CREATE INDEX "idx_forms_slug" ON "public"."forms" USING "btree" ("slug");



CREATE INDEX "idx_forms_workspace" ON "public"."forms" USING "btree" ("workspace_id");



CREATE INDEX "idx_fs_created" ON "public"."form_submissions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_fs_form" ON "public"."form_submissions" USING "btree" ("form_id");



CREATE INDEX "idx_fs_lead" ON "public"."form_submissions" USING "btree" ("lead_id");



CREATE INDEX "idx_imports_created" ON "public"."lead_imports" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_imports_status" ON "public"."lead_imports" USING "btree" ("status");



CREATE INDEX "idx_integration_credentials_provider" ON "public"."integration_credentials" USING "btree" ("provider");



CREATE INDEX "idx_integration_credentials_status" ON "public"."integration_credentials" USING "btree" ("status");



CREATE INDEX "idx_interactions_lead" ON "public"."lead_interactions" USING "btree" ("lead_id");



CREATE INDEX "idx_interactions_workspace" ON "public"."lead_interactions" USING "btree" ("workspace_id");



CREATE INDEX "idx_lcv_field" ON "public"."lead_custom_values" USING "btree" ("custom_field_id");



CREATE INDEX "idx_lcv_lead" ON "public"."lead_custom_values" USING "btree" ("lead_id");



CREATE INDEX "idx_leads_company" ON "public"."leads" USING "btree" ("company_id");



CREATE INDEX "idx_leads_cpf" ON "public"."leads" USING "btree" ("cpf");



CREATE INDEX "idx_leads_email" ON "public"."leads" USING "btree" ("email");



CREATE INDEX "idx_leads_profile" ON "public"."leads" USING "btree" ("profile");



CREATE INDEX "idx_leads_score" ON "public"."leads" USING "btree" ("score");



CREATE INDEX "idx_leads_stage" ON "public"."leads" USING "btree" ("stage");



CREATE INDEX "idx_leads_tags" ON "public"."leads" USING "gin" ("tags");



CREATE INDEX "idx_leads_workspace" ON "public"."leads" USING "btree" ("workspace_id");



CREATE INDEX "idx_profile_rules_active" ON "public"."profile_rules" USING "btree" ("active");



CREATE INDEX "idx_profile_rules_field" ON "public"."profile_rules" USING "btree" ("field_source", "field_key");



CREATE INDEX "idx_pv_created" ON "public"."page_visits" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_pv_lead" ON "public"."page_visits" USING "btree" ("lead_id");



CREATE INDEX "idx_pv_page" ON "public"."page_visits" USING "btree" ("tracked_page_id");



CREATE INDEX "idx_pv_visitor" ON "public"."page_visits" USING "btree" ("visitor_id");



CREATE INDEX "idx_score_history_lead" ON "public"."lead_score_history" USING "btree" ("lead_id");



CREATE INDEX "idx_score_history_workspace" ON "public"."lead_score_history" USING "btree" ("workspace_id", "created_at" DESC);



CREATE INDEX "idx_scoring_rules_action" ON "public"."scoring_rules" USING "btree" ("action");



CREATE INDEX "idx_scoring_rules_active" ON "public"."scoring_rules" USING "btree" ("active");



CREATE INDEX "idx_scoring_rules_workspace" ON "public"."scoring_rules" USING "btree" ("workspace_id");



CREATE INDEX "idx_segments_workspace" ON "public"."segments" USING "btree" ("workspace_id");



CREATE INDEX "idx_submissions_form" ON "public"."form_submissions" USING "btree" ("form_id");



CREATE INDEX "idx_submissions_workspace" ON "public"."form_submissions" USING "btree" ("workspace_id");



CREATE INDEX "idx_tp_active" ON "public"."tracked_pages" USING "btree" ("active");



CREATE INDEX "idx_tp_funnel" ON "public"."tracked_pages" USING "btree" ("funnel");



CREATE INDEX "idx_unsubscribes_workspace_email" ON "public"."unsubscribes" USING "btree" ("workspace_id", "email");



CREATE INDEX "idx_workflow_logs_execution" ON "public"."workflow_logs" USING "btree" ("execution_id");



CREATE INDEX "idx_workflow_logs_workflow" ON "public"."workflow_logs" USING "btree" ("workflow_id");



CREATE INDEX "idx_workflow_runs_status" ON "public"."workflow_runs" USING "btree" ("status");



CREATE INDEX "idx_workflow_runs_workflow" ON "public"."workflow_runs" USING "btree" ("workflow_id");



CREATE INDEX "idx_workflow_runs_workspace" ON "public"."workflow_runs" USING "btree" ("workspace_id");



CREATE INDEX "idx_workflows_trigger" ON "public"."workflows" USING "btree" ("trigger_type") WHERE ("status" = 'active'::"text");



CREATE INDEX "idx_workflows_workspace" ON "public"."workflows" USING "btree" ("workspace_id");



CREATE UNIQUE INDEX "leads_cpf_unique" ON "public"."leads" USING "btree" ("cpf") WHERE ("cpf" IS NOT NULL);



CREATE UNIQUE INDEX "scoring_rules_action_unique" ON "public"."scoring_rules" USING "btree" ("action") WHERE ("action" IS NOT NULL);



CREATE UNIQUE INDEX "uniq_leads_workspace_email" ON "public"."leads" USING "btree" ("workspace_id", "lower"("email")) WHERE ("email" IS NOT NULL);



CREATE OR REPLACE TRIGGER "campaigns_set_updated_at" BEFORE UPDATE ON "public"."campaigns" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "forms_updated_at" BEFORE UPDATE ON "public"."forms" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "leads_score_history" AFTER UPDATE OF "score" ON "public"."leads" FOR EACH ROW EXECUTE FUNCTION "public"."log_lead_score_change"();



CREATE OR REPLACE TRIGGER "leads_updated_at" BEFORE UPDATE ON "public"."leads" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "scoring_rules_updated_at" BEFORE UPDATE ON "public"."scoring_rules" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "scoring_settings_updated_at" BEFORE UPDATE ON "public"."scoring_settings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "segments_updated_at" BEFORE UPDATE ON "public"."segments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "templates_set_updated_at" BEFORE UPDATE ON "public"."email_templates" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_campaigns_updated" BEFORE UPDATE ON "public"."campaigns" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_campaigns_updated_at" BEFORE UPDATE ON "public"."campaigns" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_companies_updated" BEFORE UPDATE ON "public"."companies" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_custom_fields_updated" BEFORE UPDATE ON "public"."custom_fields" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_flows_updated_at" BEFORE UPDATE ON "public"."automation_flows" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_forms_updated" BEFORE UPDATE ON "public"."forms" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_fs_to_lead" AFTER INSERT ON "public"."form_submissions" FOR EACH ROW EXECUTE FUNCTION "public"."trg_form_submission_to_lead"();



CREATE OR REPLACE TRIGGER "trg_integration_credentials_updated_at" BEFORE UPDATE ON "public"."integration_credentials" FOR EACH ROW EXECUTE FUNCTION "public"."tg_integration_credentials_updated_at"();



CREATE OR REPLACE TRIGGER "trg_lcv_profile_recalc" AFTER INSERT OR DELETE OR UPDATE ON "public"."lead_custom_values" FOR EACH ROW EXECUTE FUNCTION "public"."trg_lcv_profile_recalc"();



CREATE OR REPLACE TRIGGER "trg_lcv_updated" BEFORE UPDATE ON "public"."lead_custom_values" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_leads_normalize_cpf" BEFORE INSERT OR UPDATE OF "cpf" ON "public"."leads" FOR EACH ROW EXECUTE FUNCTION "public"."trg_normalize_cpf"();



CREATE OR REPLACE TRIGGER "trg_leads_profile_recalc" AFTER INSERT ON "public"."leads" FOR EACH ROW EXECUTE FUNCTION "public"."trg_lead_profile_recalc"();



CREATE OR REPLACE TRIGGER "trg_leads_updated_at" BEFORE UPDATE ON "public"."leads" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_pv_to_event" AFTER INSERT ON "public"."page_visits" FOR EACH ROW EXECUTE FUNCTION "public"."page_visit_to_lead_event"();



CREATE OR REPLACE TRIGGER "trg_tp_updated" BEFORE UPDATE ON "public"."tracked_pages" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_update_lead_score" AFTER INSERT ON "public"."lead_events" FOR EACH ROW EXECUTE FUNCTION "public"."update_lead_score"();



CREATE OR REPLACE TRIGGER "workflows_set_updated_at" BEFORE UPDATE ON "public"."workflows" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "workspaces_seed_scoring" AFTER INSERT ON "public"."workspaces" FOR EACH ROW EXECUTE FUNCTION "public"."seed_workspace_scoring"();



CREATE OR REPLACE TRIGGER "workspaces_updated_at" BEFORE UPDATE ON "public"."workspaces" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."campaign_sends"
    ADD CONSTRAINT "campaign_sends_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaign_sends"
    ADD CONSTRAINT "campaign_sends_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_template_fk" FOREIGN KEY ("template_id") REFERENCES "public"."email_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."email_sends"
    ADD CONSTRAINT "email_sends_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_sends"
    ADD CONSTRAINT "email_sends_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."flow_runs"
    ADD CONSTRAINT "flow_runs_flow_id_fkey" FOREIGN KEY ("flow_id") REFERENCES "public"."automation_flows"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."flow_runs"
    ADD CONSTRAINT "flow_runs_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."form_submissions"
    ADD CONSTRAINT "form_submissions_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."form_submissions"
    ADD CONSTRAINT "form_submissions_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."form_submissions"
    ADD CONSTRAINT "form_submissions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."forms"
    ADD CONSTRAINT "forms_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lead_custom_values"
    ADD CONSTRAINT "lcv_lead_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lead_custom_values"
    ADD CONSTRAINT "lead_custom_values_custom_field_id_fkey" FOREIGN KEY ("custom_field_id") REFERENCES "public"."custom_fields"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lead_events"
    ADD CONSTRAINT "lead_events_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lead_interactions"
    ADD CONSTRAINT "lead_interactions_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lead_interactions"
    ADD CONSTRAINT "lead_interactions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lead_score_history"
    ADD CONSTRAINT "lead_score_history_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lead_score_history"
    ADD CONSTRAINT "lead_score_history_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "public"."scoring_rules"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lead_score_history"
    ADD CONSTRAINT "lead_score_history_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."leads"
    ADD CONSTRAINT "leads_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."page_visits"
    ADD CONSTRAINT "page_visits_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."page_visits"
    ADD CONSTRAINT "page_visits_tracked_page_id_fkey" FOREIGN KEY ("tracked_page_id") REFERENCES "public"."tracked_pages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scoring_rules"
    ADD CONSTRAINT "scoring_rules_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scoring_settings"
    ADD CONSTRAINT "scoring_settings_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."segments"
    ADD CONSTRAINT "segments_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."unsubscribes"
    ADD CONSTRAINT "unsubscribes_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workflow_runs"
    ADD CONSTRAINT "workflow_runs_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workflow_runs"
    ADD CONSTRAINT "workflow_runs_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspace_members"
    ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workspaces"
    ADD CONSTRAINT "workspaces_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Authenticated creates workspace" ON "public"."workspaces" FOR INSERT WITH CHECK (("owner_id" = "auth"."uid"()));



CREATE POLICY "Insert submission for active form" ON "public"."form_submissions" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."forms" "f"
  WHERE (("f"."id" = "form_submissions"."form_id") AND ("f"."is_active" = true) AND ("f"."workspace_id" = "form_submissions"."workspace_id")))));



CREATE POLICY "Members delete campaigns" ON "public"."campaigns" FOR DELETE USING ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members delete email_sends" ON "public"."email_sends" FOR DELETE USING ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members delete forms" ON "public"."forms" FOR DELETE USING ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members delete interactions" ON "public"."lead_interactions" FOR DELETE USING ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members delete leads" ON "public"."leads" FOR DELETE USING ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members delete scoring_rules" ON "public"."scoring_rules" FOR DELETE USING ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members delete segments" ON "public"."segments" FOR DELETE USING ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members delete templates" ON "public"."email_templates" FOR DELETE USING ((("workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("workspace_id")));



CREATE POLICY "Members delete unsubscribes" ON "public"."unsubscribes" FOR DELETE USING ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members delete workflow_logs" ON "public"."workflow_logs" FOR DELETE USING ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members delete workflow_runs" ON "public"."workflow_runs" FOR DELETE USING ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members delete workflows" ON "public"."workflows" FOR DELETE USING ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members insert campaigns" ON "public"."campaigns" FOR INSERT WITH CHECK ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members insert email_sends" ON "public"."email_sends" FOR INSERT WITH CHECK ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members insert forms" ON "public"."forms" FOR INSERT WITH CHECK ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members insert interactions" ON "public"."lead_interactions" FOR INSERT WITH CHECK ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members insert leads" ON "public"."leads" FOR INSERT WITH CHECK ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members insert score_history" ON "public"."lead_score_history" FOR INSERT WITH CHECK ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members insert scoring_rules" ON "public"."scoring_rules" FOR INSERT WITH CHECK ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members insert scoring_settings" ON "public"."scoring_settings" FOR INSERT WITH CHECK ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members insert segments" ON "public"."segments" FOR INSERT WITH CHECK ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members insert templates" ON "public"."email_templates" FOR INSERT WITH CHECK ((("workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("workspace_id")));



CREATE POLICY "Members insert workflow_logs" ON "public"."workflow_logs" FOR INSERT WITH CHECK ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members insert workflow_runs" ON "public"."workflow_runs" FOR INSERT WITH CHECK ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members insert workflows" ON "public"."workflows" FOR INSERT WITH CHECK ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members update campaigns" ON "public"."campaigns" FOR UPDATE USING ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members update email_sends" ON "public"."email_sends" FOR UPDATE USING ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members update forms" ON "public"."forms" FOR UPDATE USING ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members update leads" ON "public"."leads" FOR UPDATE USING ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members update scoring_rules" ON "public"."scoring_rules" FOR UPDATE USING ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members update scoring_settings" ON "public"."scoring_settings" FOR UPDATE USING ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members update segments" ON "public"."segments" FOR UPDATE USING ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members update templates" ON "public"."email_templates" FOR UPDATE USING ((("workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("workspace_id")));



CREATE POLICY "Members update workflow_runs" ON "public"."workflow_runs" FOR UPDATE USING ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members update workflows" ON "public"."workflows" FOR UPDATE USING ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members view campaigns" ON "public"."campaigns" FOR SELECT USING ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members view email_sends" ON "public"."email_sends" FOR SELECT USING ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members view forms" ON "public"."forms" FOR SELECT USING ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members view interactions" ON "public"."lead_interactions" FOR SELECT USING ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members view leads" ON "public"."leads" FOR SELECT USING ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members view memberships" ON "public"."workspace_members" FOR SELECT USING ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members view score_history" ON "public"."lead_score_history" FOR SELECT USING ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members view scoring_rules" ON "public"."scoring_rules" FOR SELECT USING ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members view scoring_settings" ON "public"."scoring_settings" FOR SELECT USING ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members view segments" ON "public"."segments" FOR SELECT USING ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members view submissions" ON "public"."form_submissions" FOR SELECT USING ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members view unsubscribes" ON "public"."unsubscribes" FOR SELECT USING ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members view workflow_logs" ON "public"."workflow_logs" FOR SELECT USING ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members view workflow_runs" ON "public"."workflow_runs" FOR SELECT USING ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members view workflows" ON "public"."workflows" FOR SELECT USING ("public"."is_workspace_member"("workspace_id"));



CREATE POLICY "Members view workspace" ON "public"."workspaces" FOR SELECT USING ("public"."is_workspace_member"("id"));



CREATE POLICY "Owner deletes workspace" ON "public"."workspaces" FOR DELETE USING (("owner_id" = "auth"."uid"()));



CREATE POLICY "Owner updates workspace" ON "public"."workspaces" FOR UPDATE USING (("owner_id" = "auth"."uid"()));



CREATE POLICY "Public insert unsubscribe" ON "public"."unsubscribes" FOR INSERT WITH CHECK (true);



CREATE POLICY "Public views active forms" ON "public"."forms" FOR SELECT USING (("is_active" = true));



CREATE POLICY "User joins as self" ON "public"."workspace_members" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "User leaves self" ON "public"."workspace_members" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "View workspace or default templates" ON "public"."email_templates" FOR SELECT USING ((("is_default" = true) OR (("workspace_id" IS NOT NULL) AND "public"."is_workspace_member"("workspace_id"))));



CREATE POLICY "allow all" ON "public"."team_members" USING (true);



CREATE POLICY "anon_insert_pv" ON "public"."page_visits" FOR INSERT TO "anon" WITH CHECK (true);



ALTER TABLE "public"."automation_flows" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."campaign_sends" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."campaigns" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "campaigns_dev_all" ON "public"."campaigns" USING (true) WITH CHECK (true);



ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "cs_dev_all" ON "public"."campaign_sends" USING (true) WITH CHECK (true);



ALTER TABLE "public"."custom_fields" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "dev_all_campaign_sends" ON "public"."campaign_sends" USING (true) WITH CHECK (true);



CREATE POLICY "dev_all_campaigns" ON "public"."campaigns" USING (true) WITH CHECK (true);



CREATE POLICY "dev_all_companies" ON "public"."companies" USING (true) WITH CHECK (true);



CREATE POLICY "dev_all_custom_fields" ON "public"."custom_fields" USING (true) WITH CHECK (true);



CREATE POLICY "dev_all_exports" ON "public"."lead_exports" USING (true) WITH CHECK (true);



CREATE POLICY "dev_all_flow_runs" ON "public"."flow_runs" USING (true) WITH CHECK (true);



CREATE POLICY "dev_all_flows" ON "public"."automation_flows" USING (true) WITH CHECK (true);



CREATE POLICY "dev_all_form_submissions" ON "public"."form_submissions" USING (true) WITH CHECK (true);



CREATE POLICY "dev_all_imports" ON "public"."lead_imports" USING (true) WITH CHECK (true);



CREATE POLICY "dev_all_landing_pages" ON "public"."landing_pages" USING (true) WITH CHECK (true);



CREATE POLICY "dev_all_lcv" ON "public"."lead_custom_values" USING (true) WITH CHECK (true);



CREATE POLICY "dev_all_lead_events" ON "public"."lead_events" USING (true) WITH CHECK (true);



CREATE POLICY "dev_all_leads" ON "public"."leads" USING (true) WITH CHECK (true);



CREATE POLICY "dev_all_profile_rules" ON "public"."profile_rules" USING (true) WITH CHECK (true);



CREATE POLICY "dev_all_profile_thresholds" ON "public"."profile_thresholds" USING (true) WITH CHECK (true);



CREATE POLICY "dev_all_pv" ON "public"."page_visits" USING (true) WITH CHECK (true);



CREATE POLICY "dev_all_scoring_rules" ON "public"."scoring_rules" USING (true) WITH CHECK (true);



CREATE POLICY "dev_all_segments" ON "public"."segments" USING (true) WITH CHECK (true);



CREATE POLICY "dev_all_tp" ON "public"."tracked_pages" USING (true) WITH CHECK (true);



ALTER TABLE "public"."email_sends" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "et_dev_all" ON "public"."email_templates" USING (true) WITH CHECK (true);



ALTER TABLE "public"."flow_runs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."form_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."forms" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "forms_dev_all" ON "public"."forms" USING (true) WITH CHECK (true);



CREATE POLICY "forms_public_read" ON "public"."forms" FOR SELECT USING (("active" = true));



CREATE POLICY "fs_dev_read" ON "public"."form_submissions" FOR SELECT USING (true);



CREATE POLICY "fs_dev_update" ON "public"."form_submissions" FOR UPDATE USING (true);



CREATE POLICY "fs_public_insert" ON "public"."form_submissions" FOR INSERT WITH CHECK (true);



ALTER TABLE "public"."integration_credentials" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "integration_credentials_all" ON "public"."integration_credentials" USING (true) WITH CHECK (true);



ALTER TABLE "public"."landing_pages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lead_custom_values" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lead_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lead_exports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lead_imports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lead_interactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lead_score_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."leads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."page_visits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profile_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profile_thresholds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scoring_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scoring_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."segments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tracked_pages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."unsubscribes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workflow_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workflow_runs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workflows" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workspace_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workspaces" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."_build_segment_condition"("_c" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_build_segment_condition"("_c" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."_build_segment_where"("_rules" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_build_segment_where"("_rules" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."apply_form_scoring"("_form_id" "uuid", "_lead_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."apply_form_scoring"("_form_id" "uuid", "_lead_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."apply_form_scoring"("_form_id" "uuid", "_lead_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."apply_form_scoring"("_form_id" "uuid", "_lead_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."apply_scoring"("_lead_id" "uuid", "_action_type" "text", "_custom_points" integer, "_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."apply_scoring"("_lead_id" "uuid", "_action_type" "text", "_custom_points" integer, "_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_scoring"("_lead_id" "uuid", "_action_type" "text", "_custom_points" integer, "_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."clean_cpf"("p_cpf" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."clean_cpf"("p_cpf" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."clean_cpf"("p_cpf" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."count_segment_leads"("_workspace_id" "uuid", "_rules" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."count_segment_leads"("_workspace_id" "uuid", "_rules" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_segment_leads"("_workspace_id" "uuid", "_rules" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."eval_profile_rule"("rule_op" "text", "rule_val" "jsonb", "lead_val" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."eval_profile_rule"("rule_op" "text", "rule_val" "jsonb", "lead_val" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."eval_profile_rule"("rule_op" "text", "rule_val" "jsonb", "lead_val" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_lead_field_value"("p_lead_id" "uuid", "p_source" "text", "p_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_lead_field_value"("p_lead_id" "uuid", "p_source" "text", "p_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_lead_field_value"("p_lead_id" "uuid", "p_source" "text", "p_key" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_workspace_member"("_workspace_id" "uuid", "_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_workspace_member"("_workspace_id" "uuid", "_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_workspace_member"("_workspace_id" "uuid", "_user_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."leads" TO "anon";
GRANT ALL ON TABLE "public"."leads" TO "authenticated";
GRANT ALL ON TABLE "public"."leads" TO "service_role";



GRANT ALL ON FUNCTION "public"."lead_is_complete"("p_lead" "public"."leads") TO "anon";
GRANT ALL ON FUNCTION "public"."lead_is_complete"("p_lead" "public"."leads") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lead_is_complete"("p_lead" "public"."leads") TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_lead_score_change"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_lead_score_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."merge_lead_by_cpf"("p_source_lead_id" "uuid", "p_cpf" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."merge_lead_by_cpf"("p_source_lead_id" "uuid", "p_cpf" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."merge_lead_by_cpf"("p_source_lead_id" "uuid", "p_cpf" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."page_visit_to_lead_event"() TO "anon";
GRANT ALL ON FUNCTION "public"."page_visit_to_lead_event"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."page_visit_to_lead_event"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recompute_all_profiles"() TO "anon";
GRANT ALL ON FUNCTION "public"."recompute_all_profiles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recompute_all_profiles"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recompute_lead_profile"("p_lead_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recompute_lead_profile"("p_lead_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recompute_lead_profile"("p_lead_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."seed_workspace_scoring"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."seed_workspace_scoring"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."simulate_campaign_send"("_campaign_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."simulate_campaign_send"("_campaign_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."simulate_campaign_send"("_campaign_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."simulate_workflow_execution"("_workflow_id" "uuid", "_lead_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."simulate_workflow_execution"("_workflow_id" "uuid", "_lead_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."simulate_workflow_execution"("_workflow_id" "uuid", "_lead_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."tg_integration_credentials_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."tg_integration_credentials_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."tg_integration_credentials_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."tier_of"("_score" integer, "_workspace_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."tier_of"("_score" integer, "_workspace_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."tier_of"("_score" integer, "_workspace_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_form_submission_to_lead"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_form_submission_to_lead"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_form_submission_to_lead"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_lcv_profile_recalc"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_lcv_profile_recalc"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_lcv_profile_recalc"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_lead_profile_recalc"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_lead_profile_recalc"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_lead_profile_recalc"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_normalize_cpf"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_normalize_cpf"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_normalize_cpf"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_workflow"("_workflow_id" "uuid", "_lead_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_workflow"("_workflow_id" "uuid", "_lead_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_workflow"("_workflow_id" "uuid", "_lead_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_lead_score"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_lead_score"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_lead_score"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."user_workspace_ids"("_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."user_workspace_ids"("_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_workspace_ids"("_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."valid_cpf"("p_cpf" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."valid_cpf"("p_cpf" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."valid_cpf"("p_cpf" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."automation_flows" TO "anon";
GRANT ALL ON TABLE "public"."automation_flows" TO "authenticated";
GRANT ALL ON TABLE "public"."automation_flows" TO "service_role";



GRANT ALL ON TABLE "public"."campaign_sends" TO "anon";
GRANT ALL ON TABLE "public"."campaign_sends" TO "authenticated";
GRANT ALL ON TABLE "public"."campaign_sends" TO "service_role";



GRANT ALL ON TABLE "public"."campaigns" TO "anon";
GRANT ALL ON TABLE "public"."campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."companies" TO "anon";
GRANT ALL ON TABLE "public"."companies" TO "authenticated";
GRANT ALL ON TABLE "public"."companies" TO "service_role";



GRANT ALL ON TABLE "public"."custom_fields" TO "anon";
GRANT ALL ON TABLE "public"."custom_fields" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_fields" TO "service_role";



GRANT ALL ON TABLE "public"."email_sends" TO "anon";
GRANT ALL ON TABLE "public"."email_sends" TO "authenticated";
GRANT ALL ON TABLE "public"."email_sends" TO "service_role";



GRANT ALL ON TABLE "public"."email_templates" TO "anon";
GRANT ALL ON TABLE "public"."email_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."email_templates" TO "service_role";



GRANT ALL ON TABLE "public"."flow_runs" TO "anon";
GRANT ALL ON TABLE "public"."flow_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."flow_runs" TO "service_role";



GRANT ALL ON TABLE "public"."form_submissions" TO "anon";
GRANT ALL ON TABLE "public"."form_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."form_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."forms" TO "anon";
GRANT ALL ON TABLE "public"."forms" TO "authenticated";
GRANT ALL ON TABLE "public"."forms" TO "service_role";



GRANT ALL ON TABLE "public"."integration_credentials" TO "anon";
GRANT ALL ON TABLE "public"."integration_credentials" TO "authenticated";
GRANT ALL ON TABLE "public"."integration_credentials" TO "service_role";



GRANT ALL ON TABLE "public"."landing_pages" TO "anon";
GRANT ALL ON TABLE "public"."landing_pages" TO "authenticated";
GRANT ALL ON TABLE "public"."landing_pages" TO "service_role";



GRANT ALL ON TABLE "public"."lead_custom_values" TO "anon";
GRANT ALL ON TABLE "public"."lead_custom_values" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_custom_values" TO "service_role";



GRANT ALL ON TABLE "public"."lead_events" TO "anon";
GRANT ALL ON TABLE "public"."lead_events" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_events" TO "service_role";



GRANT ALL ON TABLE "public"."lead_exports" TO "anon";
GRANT ALL ON TABLE "public"."lead_exports" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_exports" TO "service_role";



GRANT ALL ON TABLE "public"."lead_imports" TO "anon";
GRANT ALL ON TABLE "public"."lead_imports" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_imports" TO "service_role";



GRANT ALL ON TABLE "public"."lead_interactions" TO "anon";
GRANT ALL ON TABLE "public"."lead_interactions" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_interactions" TO "service_role";



GRANT ALL ON TABLE "public"."lead_score_history" TO "anon";
GRANT ALL ON TABLE "public"."lead_score_history" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_score_history" TO "service_role";



GRANT ALL ON TABLE "public"."leads_pending" TO "anon";
GRANT ALL ON TABLE "public"."leads_pending" TO "authenticated";
GRANT ALL ON TABLE "public"."leads_pending" TO "service_role";



GRANT ALL ON TABLE "public"."page_visits" TO "anon";
GRANT ALL ON TABLE "public"."page_visits" TO "authenticated";
GRANT ALL ON TABLE "public"."page_visits" TO "service_role";



GRANT ALL ON TABLE "public"."profile_rules" TO "anon";
GRANT ALL ON TABLE "public"."profile_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."profile_rules" TO "service_role";



GRANT ALL ON TABLE "public"."profile_thresholds" TO "anon";
GRANT ALL ON TABLE "public"."profile_thresholds" TO "authenticated";
GRANT ALL ON TABLE "public"."profile_thresholds" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."scoring_rules" TO "anon";
GRANT ALL ON TABLE "public"."scoring_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."scoring_rules" TO "service_role";



GRANT ALL ON TABLE "public"."scoring_settings" TO "anon";
GRANT ALL ON TABLE "public"."scoring_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."scoring_settings" TO "service_role";



GRANT ALL ON TABLE "public"."segments" TO "anon";
GRANT ALL ON TABLE "public"."segments" TO "authenticated";
GRANT ALL ON TABLE "public"."segments" TO "service_role";



GRANT ALL ON TABLE "public"."team_members" TO "anon";
GRANT ALL ON TABLE "public"."team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."team_members" TO "service_role";



GRANT ALL ON TABLE "public"."tracked_pages" TO "anon";
GRANT ALL ON TABLE "public"."tracked_pages" TO "authenticated";
GRANT ALL ON TABLE "public"."tracked_pages" TO "service_role";



GRANT ALL ON TABLE "public"."unsubscribes" TO "anon";
GRANT ALL ON TABLE "public"."unsubscribes" TO "authenticated";
GRANT ALL ON TABLE "public"."unsubscribes" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_logs" TO "anon";
GRANT ALL ON TABLE "public"."workflow_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_logs" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_runs" TO "anon";
GRANT ALL ON TABLE "public"."workflow_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_runs" TO "service_role";



GRANT ALL ON TABLE "public"."workflows" TO "anon";
GRANT ALL ON TABLE "public"."workflows" TO "authenticated";
GRANT ALL ON TABLE "public"."workflows" TO "service_role";



GRANT ALL ON TABLE "public"."workspace_members" TO "anon";
GRANT ALL ON TABLE "public"."workspace_members" TO "authenticated";
GRANT ALL ON TABLE "public"."workspace_members" TO "service_role";



GRANT ALL ON TABLE "public"."workspaces" TO "anon";
GRANT ALL ON TABLE "public"."workspaces" TO "authenticated";
GRANT ALL ON TABLE "public"."workspaces" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































