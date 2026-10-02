-- Negócio vindo da Nina só nasce se o processo for da Justiça do Trabalho.
--
-- Achado em 02/10/2026: a trava core.retract_deal_on_nina_rejection funciona,
-- mas só desfaz negócio que JÁ existe quando a rejeição da Nina chega, e só
-- das fontes nina_auto_detect/nina_backfill. Em 3 casos (04/09, 25/09, 02/10)
-- a Nina rejeitou o processo ("não é trabalhista") e, segundos ou minutos
-- DEPOIS, mandou o mesmo processo pelo /ingest estruturado (source 'nina').
-- O negócio nasceu depois da rejeição e ficou aberto.
--
-- Em vez de depender da frase ou da ordem das mensagens, olha o próprio
-- número: no CNJ (NNNNNNN-DD.AAAA.J.TR.OOOO), J = 5 é a Justiça do Trabalho.
-- É a mesma regra que a Nina usa na triagem ("o segmento da Justiça no número
-- não corresponde..."). Vale só pras fontes da Nina; form/meta/import seguem
-- como antes. Número fora do formato CNJ não é bloqueado aqui.
--
-- Mesma assinatura (15 args) da versão atual — CREATE OR REPLACE, sem criar
-- sobrecarga nova.

create or replace function crm.ingest_processo_lead(p_workspace uuid, p_person uuid, p_numero_cnj text, p_honorarios_pct numeric DEFAULT NULL::numeric, p_source text DEFAULT 'nina'::text, p_pipeline_name text DEFAULT NULL::text, p_pipeline_id uuid DEFAULT NULL::uuid, p_stage_id uuid DEFAULT NULL::uuid, p_reclamada_em_rj boolean DEFAULT false, p_tribunal text DEFAULT NULL::text, p_vara text DEFAULT NULL::text, p_valor_causa_cents bigint DEFAULT NULL::bigint, p_advogado_reclamante text DEFAULT NULL::text, p_data_distribuicao date DEFAULT NULL::date, p_dados_importados jsonb DEFAULT NULL::jsonb)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'crm', 'core', 'public'
as $function$
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

  if p_source in ('nina', 'nina_auto_detect', 'nina_backfill')
     and v_numero ~ '^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$'
     and split_part(v_numero, '.', 3) <> '5'
  then
    insert into core.events (workspace_id, person_id, source, type, payload)
    values (p_workspace, p_person, 'system', 'deal_skipped_nao_trabalhista',
            jsonb_build_object('numero_cnj', v_numero, 'segmento', split_part(v_numero, '.', 3),
                               'source', p_source));
    return null;
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
end $function$;
