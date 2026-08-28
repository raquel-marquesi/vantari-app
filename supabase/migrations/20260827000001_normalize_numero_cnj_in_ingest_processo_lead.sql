-- ═══════════════════════════════════════════════════════════════════
-- Fix (2026-08-27) — Prioridade 1 do plano de unificação de leads
-- (site / Google Ads / WhatsApp), pedido da Catarina.
--
-- Problema: crm.ingest_processo_lead usava o numero_cnj cru (só trim)
-- como chave de dedup. O mesmo processo chegando pontuado
-- ("0010854-70.2023.5.03.0153") e "corrido" ("00108547020235030153")
-- virava DOIS crm.processos e portanto DOIS crm.deals, mesmo com o
-- person_id correto e idêntico nos dois — foi a causa raiz confirmada
-- de 2 das 3 negociações duplicadas do Tiago Fagner Pinheiro (26/08) e
-- de mais 6 outros pares de processos achados numa varredura completa
-- do banco (7 pares no total).
--
-- core.normalize_numero_cnj já existe (fix de 17/08) e já é usada pelo
-- gatilho que lê o texto da mensagem — mas nunca tinha sido aplicada
-- DENTRO de crm.ingest_processo_lead em si, então os outros dois
-- chamadores (o processo estruturado vindo direto da Nina via /ingest,
-- e o gatilho do formulário da LP) continuavam vulneráveis.
--
-- Fallback: se core.normalize_numero_cnj não reconhecer o formato (não
-- bate nem pontuado nem 20-dígitos corridos), cai pro comportamento
-- atual (nullif(trim(...))) — não passa a rejeitar número que antes
-- era aceito, só melhora a dedup pro que já era reconhecível.
--
-- Bônus: o pg_advisory_xact_lock já usa v_numero na chave — como agora
-- ele trava pelo valor NORMALIZADO, duas chamadas concorrentes pro
-- mesmo processo em formatos diferentes passam a serializar
-- corretamente (antes usavam chaves de lock diferentes e não se viam).
-- ═══════════════════════════════════════════════════════════════════

create or replace function crm.ingest_processo_lead(
  p_workspace uuid,
  p_person uuid,
  p_numero_cnj text,
  p_honorarios_pct numeric default null,
  p_source text default 'nina',
  p_pipeline_name text default null
) returns uuid
language plpgsql
security definer
set search_path to 'crm', 'core', 'public'
as $function$
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
    insert into crm.processos (workspace_id, numero_cnj, reclamante_person_id, status)
    values (p_workspace, v_numero, p_person, 'em_analise')
    returning id into v_processo_id;
  else
    update crm.processos set reclamante_person_id = coalesce(reclamante_person_id, p_person)
      where id = v_processo_id;
  end if;

  select id into v_deal_id from crm.deals
    where processo_id = v_processo_id and person_id = p_person and credit_type = 'reclamante'
    limit 1;

  if v_deal_id is null then
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

notify pgrst, 'reload schema';
