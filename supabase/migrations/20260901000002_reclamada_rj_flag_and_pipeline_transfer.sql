-- ═══════════════════════════════════════════════════════════════════
-- Três correções descobertas investigando a importação de 34 leads de
-- teste da campanha RECJUD (01/09/2026):
--
-- 1) crm.set_elegibilidade() (trigger BEFORE INSERT/UPDATE em
--    crm.processos) já tem a exceção certa pra recuperação judicial —
--    quando reclamada_em_rj = true, nunca reprova sozinho, só marca
--    status = 'em_analise' na criação. Mas nenhum caminho que cria
--    processo pra essa campanha (importação CSV, sync-meta-leads,
--    /ingest, trigger do form da LP, auto-detect da Nina) estava
--    passando essa flag — cada linha caía no julgamento automático
--    padrão (5 critérios de risco, todos NULL numa importação de
--    lista) e virava "inelegível" quase sempre. Corrigido adicionando
--    p_reclamada_em_rj nas duas funções de criação de negócio e
--    propagando de todo caller ligado à campanha
--    recuperacao_judicial_varejo.
--
-- 2) core.delete_person() apagava a pessoa (cascade limpa
--    crm.deals/crm.activities/etc.) mas crm.processos.
--    reclamante_person_id é ON DELETE SET NULL, não CASCADE — o
--    processo ficava órfão pra sempre (numero_cnj preenchido, sem
--    pessoa, sem negócio). É o que gerou os "leads" com CNJ aparecendo
--    como nome na tela de Leads depois de excluir.
--
-- 3) Task B do pedido: RPC crm.transfer_deal_pipeline pra mover um
--    negócio entre pipelines pelo card do lead.
-- ═══════════════════════════════════════════════════════════════════

-- ---------- 1a) crm.ingest_processo_lead ganha p_reclamada_em_rj ----------
create or replace function crm.ingest_processo_lead(
  p_workspace uuid,
  p_person uuid,
  p_numero_cnj text,
  p_honorarios_pct numeric default null,
  p_source text default 'nina',
  p_pipeline_name text default null,
  p_pipeline_id uuid default null,
  p_stage_id uuid default null,
  p_reclamada_em_rj boolean default false
)
returns uuid
language plpgsql
security definer
set search_path to 'crm', 'core', 'public'
as $$
declare
  v_processo_id uuid;
  v_deal_id uuid;
  v_pipeline_id uuid;
  v_stage_id uuid;
  v_numero text := coalesce(core.normalize_numero_cnj(p_numero_cnj), nullif(trim(p_numero_cnj), ''));
begin
  if v_numero is null then
    raise exception 'numero_cnj obrigatório';
  end if;

  if auth.uid() is not null
     and p_workspace not in (select workspace_id from public.workspace_members where user_id = auth.uid())
  then
    raise exception 'sem acesso ao workspace %', p_workspace;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('crm_processo:' || p_workspace::text || ':' || v_numero, 0));

  select id into v_processo_id from crm.processos
    where workspace_id = p_workspace and numero_cnj = v_numero limit 1;

  if v_processo_id is null then
    insert into crm.processos (workspace_id, numero_cnj, reclamante_person_id, status, reclamada_em_rj)
    values (p_workspace, v_numero, p_person, 'em_analise', p_reclamada_em_rj)
    returning id into v_processo_id;
  else
    update crm.processos set
      reclamante_person_id = coalesce(reclamante_person_id, p_person),
      reclamada_em_rj = (coalesce(reclamada_em_rj, false) or p_reclamada_em_rj)
      where id = v_processo_id;
  end if;

  select id into v_deal_id from crm.deals
    where processo_id = v_processo_id and person_id = p_person and credit_type = 'reclamante'
    limit 1;

  if v_deal_id is null then
    if p_pipeline_id is not null and p_stage_id is not null then
      v_pipeline_id := p_pipeline_id;
      v_stage_id := p_stage_id;
    else
      if p_pipeline_name is not null then
        select id into v_pipeline_id from crm.pipelines
          where workspace_id = p_workspace and name = p_pipeline_name limit 1;
      end if;
      if v_pipeline_id is null then
        select pl.id into v_pipeline_id from crm.pipelines pl
          where pl.workspace_id = p_workspace and pl.name = 'Esteira de Aquisição' limit 1;
      end if;
      if v_pipeline_id is null then
        select id into v_pipeline_id from crm.pipelines where workspace_id = p_workspace order by created_at limit 1;
      end if;
      select id into v_stage_id from crm.stages
        where pipeline_id = v_pipeline_id order by position asc limit 1;
    end if;

    insert into crm.deals (workspace_id, processo_id, person_id, credit_type, valor_face_cents,
                           pipeline_id, stage_id, status, source, honorarios_pct)
    values (p_workspace, v_processo_id, p_person, 'reclamante', 0,
            v_pipeline_id, v_stage_id, 'open', p_source, p_honorarios_pct)
    returning id into v_deal_id;

    insert into core.events (workspace_id, person_id, source, type, payload)
    values (p_workspace, p_person, p_source, 'deal_created_auto',
            jsonb_build_object('deal_id', v_deal_id, 'processo_id', v_processo_id,
                                'numero_cnj', v_numero, 'honorarios_pct', p_honorarios_pct));
  elsif p_honorarios_pct is not null then
    update crm.deals set honorarios_pct = coalesce(honorarios_pct, p_honorarios_pct) where id = v_deal_id;
  end if;

  return v_deal_id;
end $$;

-- ---------- 1b) crm.create_draft_deal ganha p_reclamada_em_rj ----------
-- (e para de fixar status='pendente_cnj' — agora que reclamada_em_rj=true
-- já garante 'em_analise' via trigger, esse status especial não é mais
-- necessário; a distinção "sem CNJ" já é numero_cnj is null)
create or replace function crm.create_draft_deal(
  p_workspace uuid,
  p_person uuid,
  p_source text default 'import',
  p_pipeline_name text default null,
  p_pipeline_id uuid default null,
  p_stage_id uuid default null,
  p_reclamada_em_rj boolean default false
)
returns uuid
language plpgsql
security definer
set search_path to 'crm', 'core', 'public'
as $$
declare
  v_processo_id uuid;
  v_deal_id uuid;
  v_pipeline_id uuid;
  v_stage_id uuid;
begin
  if auth.uid() is not null
     and p_workspace not in (select workspace_id from public.workspace_members where user_id = auth.uid())
  then
    raise exception 'sem acesso ao workspace %', p_workspace;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('crm_draft_deal:' || p_workspace::text || ':' || p_person::text, 0));

  select id into v_deal_id from crm.deals
    where person_id = p_person and credit_type = 'reclamante'
    limit 1;
  if v_deal_id is not null then
    return v_deal_id;
  end if;

  insert into crm.processos (workspace_id, numero_cnj, reclamante_person_id, status, reclamada_em_rj)
  values (p_workspace, null, p_person, 'em_analise', p_reclamada_em_rj)
  returning id into v_processo_id;

  if p_pipeline_id is not null and p_stage_id is not null then
    v_pipeline_id := p_pipeline_id;
    v_stage_id := p_stage_id;
  else
    if p_pipeline_name is not null then
      select id into v_pipeline_id from crm.pipelines
        where workspace_id = p_workspace and name = p_pipeline_name limit 1;
    end if;
    if v_pipeline_id is null then
      select pl.id into v_pipeline_id from crm.pipelines pl
        where pl.workspace_id = p_workspace and pl.name = 'Esteira de Aquisição' limit 1;
    end if;
    if v_pipeline_id is null then
      select id into v_pipeline_id from crm.pipelines where workspace_id = p_workspace order by created_at limit 1;
    end if;
    select id into v_stage_id from crm.stages
      where pipeline_id = v_pipeline_id order by position asc limit 1;
  end if;

  insert into crm.deals (workspace_id, processo_id, person_id, credit_type, valor_face_cents,
                         pipeline_id, stage_id, status, source)
  values (p_workspace, v_processo_id, p_person, 'reclamante', 0,
          v_pipeline_id, v_stage_id, 'open', p_source)
  returning id into v_deal_id;

  insert into core.events (workspace_id, person_id, source, type, payload)
  values (p_workspace, p_person, p_source, 'deal_created_auto',
          jsonb_build_object('deal_id', v_deal_id, 'processo_id', v_processo_id, 'numero_cnj', null));

  return v_deal_id;
end $$;

-- ---------- 2) core.delete_person limpa processos órfãos ----------
create or replace function core.delete_person(p_person uuid)
returns void
language plpgsql
security definer
set search_path to 'core', 'crm', 'fin', 'public'
as $$
declare
  v_workspace uuid;
  v_antecipacoes int;
  v_recebimentos int;
begin
  select workspace_id into v_workspace from core.persons where id = p_person;
  if v_workspace is null then
    raise exception 'pessoa não encontrada: %', p_person;
  end if;

  if auth.uid() is not null
     and v_workspace not in (select workspace_id from public.workspace_members where user_id = auth.uid())
  then
    raise exception 'sem acesso ao workspace %', v_workspace;
  end if;

  select count(*) into v_antecipacoes from fin.antecipacoes where person_id = p_person;
  if v_antecipacoes > 0 then
    raise exception 'não é possível excluir: essa pessoa já tem % antecipação(ões) financeira(s) registrada(s)', v_antecipacoes;
  end if;

  select count(*) into v_recebimentos from fin.recebimentos where person_id = p_person;
  if v_recebimentos > 0 then
    raise exception 'não é possível excluir: essa pessoa já tem % recebimento(s) financeiro(s) registrado(s)', v_recebimentos;
  end if;

  -- crm.processos.reclamante_person_id é ON DELETE SET NULL (pra não sumir
  -- com o numero_cnj em cascatas do dia a dia) — mas nesse fluxo, de apagar
  -- a pessoa inteira, um processo sem reclamante fica órfão pra sempre.
  -- Apaga explicitamente antes (cascade limpa negócios/atividades/advogados
  -- ligados a esse processo).
  delete from crm.processos where reclamante_person_id = p_person;

  delete from core.persons where id = p_person;
end $$;

-- ---------- 3) crm.transfer_deal_pipeline ----------
create or replace function crm.transfer_deal_pipeline(
  p_deal_id uuid,
  p_target_pipeline_id uuid,
  p_target_stage_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path to 'crm', 'core', 'public'
as $$
declare
  v_workspace uuid;
  v_stage_id uuid;
begin
  select workspace_id into v_workspace from crm.deals where id = p_deal_id;
  if v_workspace is null then
    raise exception 'negócio não encontrado: %', p_deal_id;
  end if;

  if auth.uid() is not null
     and v_workspace not in (select workspace_id from public.workspace_members where user_id = auth.uid())
  then
    raise exception 'sem acesso ao workspace %', v_workspace;
  end if;

  if not exists (select 1 from crm.pipelines where id = p_target_pipeline_id and workspace_id = v_workspace) then
    raise exception 'pipeline de destino não pertence a esse workspace: %', p_target_pipeline_id;
  end if;

  if p_target_stage_id is not null then
    if not exists (select 1 from crm.stages where id = p_target_stage_id and pipeline_id = p_target_pipeline_id) then
      raise exception 'etapa % não pertence à pipeline de destino %', p_target_stage_id, p_target_pipeline_id;
    end if;
    v_stage_id := p_target_stage_id;
  else
    select id into v_stage_id from crm.stages
      where pipeline_id = p_target_pipeline_id order by position asc limit 1;
    if v_stage_id is null then
      raise exception 'pipeline de destino não tem nenhuma etapa: %', p_target_pipeline_id;
    end if;
  end if;

  update crm.deals set pipeline_id = p_target_pipeline_id, stage_id = v_stage_id, updated_at = now()
    where id = p_deal_id;

  return v_stage_id;
end $$;

-- ---------- 4) propaga reclamada_em_rj nos outros callers da campanha ----------
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
      p_utm_term     => new.utm_term
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

      v_numero_processo := core.normalize_numero_cnj(new.payload->>'numero_processo');
      if v_numero_processo is not null
         and not exists (select 1 from crm.deals where person_id = v_person_id)
      then
        v_pipeline_name := case
          when v_form.slug in ('recuperacao-judicial', 'advogados-recuperacao-judicial')
            then 'Recuperação Judicial — Varejo'
          else null
        end;
        perform crm.ingest_processo_lead(v_ws, v_person_id, v_numero_processo, null, 'form', v_pipeline_name,
          p_reclamada_em_rj => (v_pipeline_name is not null));
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

create or replace function core.detect_numero_processo_in_message()
returns trigger
language plpgsql
security definer
set search_path = core, crm, public
as $$
declare
  v_numero text;
  v_deal_id uuid;
  v_campanha text;
  v_pipeline_name text;
begin
  if new.source = 'nina'
     and new.type = 'whatsapp_in'
     and new.payload->>'direction' = 'inbound'
  then
    v_numero := core.normalize_numero_cnj(new.payload->>'content');
    if v_numero is not null then
      begin
        select value into v_campanha from core.person_attributes
          where person_id = new.person_id and key = 'campanha';
        v_pipeline_name := case
          when v_campanha = 'recuperacao_judicial_varejo' then 'Recuperação Judicial — Varejo'
          else null
        end;
        select crm.ingest_processo_lead(new.workspace_id, new.person_id, v_numero, null, 'nina_auto_detect', v_pipeline_name,
          p_reclamada_em_rj => (v_pipeline_name is not null))
          into v_deal_id;
      exception when others then
        insert into core.events (workspace_id, person_id, source, type, payload)
        values (new.workspace_id, new.person_id, 'system', 'auto_deal_detection_failed',
                jsonb_build_object('numero_cnj', v_numero, 'error', sqlerrm));
      end;
    end if;
  end if;
  return new;
end;
$$;

notify pgrst, 'reload schema';
