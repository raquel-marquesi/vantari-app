-- ═══════════════════════════════════════════════════════════════════
-- Fecha o gap descoberto investigando os leads "sem informação" na
-- etapa Lead capturado do funil Recuperação Judicial — Varejo: quem
-- envia o formulário da LP sem o número do processo (CNJ ausente ou
-- incompleto) vira pessoa no CRM mas NUNCA vira negócio — fica
-- invisível no funil, e quando fala com a Nina ela não tem nenhum
-- negócio pra puxar (ela pergunta o processo de novo do zero).
--
-- crm.create_draft_deal já existe desde 01/09 (usado hoje só pelo
-- importador de CSV) e resolve exatamente isso: cria um crm.processos
-- rascunho (numero_cnj = null) + o negócio já na 1ª etapa da pipeline,
-- respeitando crm.deals.processo_id NOT NULL. Esta migration:
--
-- 1) crm.ingest_processo_lead — antes de criar o negócio pelo CNJ
--    real, funde (crm.merge_processos) qualquer processo-rascunho que
--    a pessoa já tenha, em vez de deixar dois negócios pra trás quando
--    o CNJ chega depois (Nina qualifica, reenvio do form, digitação
--    manual). Sem isso, ligar create_draft_deal ao form criaria uma
--    duplicata sempre que o CNJ fosse confirmado depois.
-- 2) trg_form_submission_to_lead — quando o form é de uma das campanhas
--    de Recuperação Judicial e o CNJ veio ausente/incompleto, chama
--    create_draft_deal em vez de não fazer nada.
-- 3) Backfill dos 2 casos já presos (submissões de 08-09/09 sem CNJ
--    válido, ainda sem negócio nenhum).
-- ═══════════════════════════════════════════════════════════════════

-- ---------- 1) crm.ingest_processo_lead — funde rascunho antes de criar negócio ----------
create or replace function crm.ingest_processo_lead(
  p_workspace uuid,
  p_person uuid,
  p_numero_cnj text,
  p_honorarios_pct numeric default null,
  p_source text default 'nina',
  p_pipeline_name text default null,
  p_pipeline_id uuid default null,
  p_stage_id uuid default null,
  p_reclamada_em_rj boolean default false,
  p_tribunal text default null,
  p_vara text default null,
  p_valor_causa_cents bigint default null,
  p_advogado_reclamante text default null,
  p_data_distribuicao date default null,
  p_dados_importados jsonb default null
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
  v_draft_processo_id uuid;
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
    insert into crm.processos (workspace_id, numero_cnj, reclamante_person_id, status, reclamada_em_rj,
                               tribunal, vara, valor_causa_cents, advogado_reclamante, data_distribuicao, dados_importados)
    values (p_workspace, v_numero, p_person, 'em_analise', p_reclamada_em_rj,
            p_tribunal, p_vara, p_valor_causa_cents, p_advogado_reclamante, p_data_distribuicao,
            coalesce(p_dados_importados, '{}'::jsonb))
    returning id into v_processo_id;
  else
    update crm.processos set
      reclamante_person_id = coalesce(reclamante_person_id, p_person),
      reclamada_em_rj       = (coalesce(reclamada_em_rj, false) or p_reclamada_em_rj),
      tribunal              = coalesce(tribunal, p_tribunal),
      vara                  = coalesce(vara, p_vara),
      valor_causa_cents     = coalesce(valor_causa_cents, p_valor_causa_cents),
      advogado_reclamante   = coalesce(advogado_reclamante, p_advogado_reclamante),
      data_distribuicao     = coalesce(data_distribuicao, p_data_distribuicao),
      dados_importados      = coalesce(dados_importados, '{}'::jsonb) || coalesce(p_dados_importados, '{}'::jsonb)
      where id = v_processo_id;
  end if;

  -- a pessoa já tem um negócio de reclamante num processo "rascunho"
  -- (sem CNJ — ex: veio do form da LP sem informar o número)? funde
  -- esse rascunho no processo real que acabou de ser resolvido, em vez
  -- de deixar um segundo negócio duplicado pra trás.
  select pr.id into v_draft_processo_id
    from crm.deals d
    join crm.processos pr on pr.id = d.processo_id
    where d.person_id = p_person and d.credit_type = 'reclamante'
      and pr.numero_cnj is null and pr.id <> v_processo_id
    limit 1;

  if v_draft_processo_id is not null then
    perform crm.merge_processos(p_survivor => v_processo_id, p_loser => v_draft_processo_id);
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

-- ---------- 2) trg_form_submission_to_lead — cria rascunho quando falta o CNJ ----------
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
          -- CNJ ausente ou digitado incompleto, mas é uma das campanhas
          -- de Recuperação Judicial: cria o negócio mesmo assim, como
          -- rascunho (crm.processos.numero_cnj = null) — pra ninguém
          -- ficar invisível no funil e pra Nina já achar o contato
          -- (com nome/telefone/CPF) quando ele mandar mensagem. Alguém
          -- confirma o número certo depois; crm.ingest_processo_lead já
          -- funde o rascunho no processo real nesse momento.
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

-- ---------- 3) backfill dos 2 casos já presos (Ingrid e Danielle, 08-09/09) ----------
do $$
declare
  v_ws uuid := '53092199-7b75-4342-a897-f589d6f34922';
  v_person_id uuid;
begin
  for v_person_id in
    select unnest(array[
      '7d6e6c1d-3a26-4484-a58b-934581d8b2fd'::uuid,  -- Ingrid — CNJ em branco
      'b3366e77-631b-4965-9288-6308116257c0'::uuid   -- Danielle — CNJ digitado incompleto
    ])
  loop
    if exists (select 1 from core.persons where id = v_person_id)
       and not exists (select 1 from crm.deals where person_id = v_person_id)
    then
      perform crm.create_draft_deal(v_ws, v_person_id, 'form', 'Recuperação Judicial — Varejo',
        p_reclamada_em_rj => true);
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
