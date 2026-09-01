-- ═══════════════════════════════════════════════════════════════════
-- Completa o importador novo de leads (/leads → Importar leads (CSV),
-- ImportLeadsModal) com criação de negócio no CRM. Hoje ele só chama
-- core.resolve_person por linha — não existe nenhum jeito de criar um
-- negócio pra quem não tem número de processo (CNJ), porque
-- crm.deals.processo_id é NOT NULL e crm.ingest_processo_lead exige
-- numero_cnj.
--
-- Esta migration adiciona o caminho "sem CNJ": cria um crm.processos
-- rascunho (numero_cnj = null) e o negócio na primeira etapa da
-- pipeline, igual ao que ingest_processo_lead já faz quando o CNJ
-- existe. Reaproveita a mesma lógica de resolução de
-- pipeline/etapa — não duplica.
--
-- ⚠️ Correção (mesmo dia): a resolução de pipeline por NOME (fallback
-- pra 'Esteira de Aquisição' quando p_pipeline_name é null) mandou o
-- teste de importação pro pipeline errado — 'Esteira de Aquisição' é
-- o CRM padrão (183 negócios reais, todos da Nina), sem relação com a
-- campanha de recuperação judicial. Ambas as funções abaixo ganham
-- p_pipeline_id/p_stage_id opcionais: quando os dois vêm preenchidos,
-- usam o ID direto (sem lookup por nome, que é frágil quando existe
-- mais de uma pipeline com o mesmo nome). Callers existentes
-- (/ingest, sync-meta-leads, trigger de formulário, nina auto-detect)
-- não passam esses parâmetros novos — comportamento deles não muda.
-- ═══════════════════════════════════════════════════════════════════

-- ---------- 1) novo status em crm.processos pra rascunho sem CNJ ----------
alter table crm.processos drop constraint if exists processos_status_check;
alter table crm.processos add constraint processos_status_check
  check (status = any (array['em_analise', 'elegivel', 'inelegivel', 'arquivado', 'pendente_cnj']));

-- ---------- 2) crm.ingest_processo_lead — pipeline/etapa explícitos ----------
create or replace function crm.ingest_processo_lead(
  p_workspace uuid,
  p_person uuid,
  p_numero_cnj text,
  p_honorarios_pct numeric default null,
  p_source text default 'nina',
  p_pipeline_name text default null,
  p_pipeline_id uuid default null,
  p_stage_id uuid default null
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

-- ---------- 3) crm.create_draft_deal — espelha ingest_processo_lead sem CNJ ----------
create or replace function crm.create_draft_deal(
  p_workspace uuid,
  p_person uuid,
  p_source text default 'import',
  p_pipeline_name text default null,
  p_pipeline_id uuid default null,
  p_stage_id uuid default null
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

  -- idempotente: se a pessoa já tem negócio de reclamante (com ou sem CNJ), reaproveita
  select id into v_deal_id from crm.deals
    where person_id = p_person and credit_type = 'reclamante'
    limit 1;
  if v_deal_id is not null then
    return v_deal_id;
  end if;

  insert into crm.processos (workspace_id, numero_cnj, reclamante_person_id, status)
  values (p_workspace, null, p_person, 'pendente_cnj')
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

notify pgrst, 'reload schema';
