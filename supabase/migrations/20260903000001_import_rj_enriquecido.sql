-- ═══════════════════════════════════════════════════════════════════
-- Importação da base enriquecida de recuperação judicial (grupo Casas
-- Bahia), pedido da Catarina (03/09/2026). A planilha final cruza pelo
-- CPF a base de dados do processo (CNJ, TRT, VALOR_CAUSA, DISTRIBUICAO,
-- ADV_RECLAMANTE, ...) com o retorno do Direct Data (nome, email,
-- telefone_1/2 + indicador de WhatsApp de cada um) — já vem
-- identificada, ao contrário da leva anterior (34 leads de teste, sem
-- enriquecimento). O fluxo da Tarefa A/B (toda linha vira lead,
-- reclamada_em_rj = true, sem bloqueio automático de elegibilidade)
-- continua valendo — isso só acrescenta campos ao que já é importado.
--
-- Só a amostra (1.000 CPFs) já voltou enriquecida; o volume maior
-- (13.872) ainda está processando no Direct Data e vai rodar pelo
-- mesmo fluxo depois — por isso as funções abaixo ganham parâmetros
-- opcionais (default null), em vez de uma rotina hardcoded pra essa
-- leva: os callers existentes (Nina, sync-meta-leads, trigger de
-- formulário) não passam esses parâmetros novos e continuam
-- funcionando exatamente como antes.
--
-- Em toda coluna nova de crm.processos, update usa coalesce(existente,
-- nova) — nunca sobrescreve o que um analista já tiver preenchido
-- manualmente no card. dados_importados é jsonb "catch-all" pros
-- campos de texto livre que não têm coluna própria (ADV_RECLAMADA,
-- OUTROS_INTERESSADOS, INSTANCIA, RECLAMADAS) — merge (||) em vez de
-- substituição, pra reimportações futuras da mesma pessoa enriquecerem
-- em vez de apagar dados anteriores.
-- ═══════════════════════════════════════════════════════════════════

alter table core.person_identifiers add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table crm.processos add column if not exists advogado_reclamante text;
alter table crm.processos add column if not exists data_distribuicao date;
alter table crm.processos add column if not exists dados_importados jsonb not null default '{}'::jsonb;

-- ---------- upsert genérico de telefone com metadata (whatsapp/principal) ----------
-- core.resolve_person já grava o telefone principal em core.person_identifiers,
-- mas sem metadata e sem suporte a um segundo telefone. Esta função é o
-- complemento reutilizável: chamar depois de resolve_person, uma vez por
-- telefone (inclusive o já resolvido, pra anexar a metadata a ele).
create or replace function core.set_phone_identifier(
  p_workspace uuid,
  p_person uuid,
  p_phone text,
  p_metadata jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path to 'core', 'public'
as $$
declare
  v_phone text := core.normalize_phone_br(p_phone);
begin
  if v_phone is null then
    return;
  end if;

  if auth.uid() is not null
     and p_workspace not in (select workspace_id from public.workspace_members where user_id = auth.uid())
  then
    raise exception 'sem acesso ao workspace %', p_workspace;
  end if;

  insert into core.person_identifiers (workspace_id, person_id, kind, value, metadata)
  values (p_workspace, p_person, 'phone', v_phone, coalesce(p_metadata, '{}'::jsonb))
  on conflict (workspace_id, kind, value)
  do update set person_id = excluded.person_id,
                metadata = coalesce(core.person_identifiers.metadata, '{}'::jsonb) || excluded.metadata;
end $$;

grant execute on function core.set_phone_identifier(uuid, uuid, text, jsonb) to authenticated, service_role;

-- ---------- crm.ingest_processo_lead ganha os campos do processo enriquecido ----------
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

-- ---------- crm.create_draft_deal — espelha os mesmos campos opcionais ----------
create or replace function crm.create_draft_deal(
  p_workspace uuid,
  p_person uuid,
  p_source text default 'import',
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

  insert into crm.processos (workspace_id, numero_cnj, reclamante_person_id, status, reclamada_em_rj,
                             tribunal, vara, valor_causa_cents, advogado_reclamante, data_distribuicao, dados_importados)
  values (p_workspace, null, p_person, 'em_analise', p_reclamada_em_rj,
          p_tribunal, p_vara, p_valor_causa_cents, p_advogado_reclamante, p_data_distribuicao,
          coalesce(p_dados_importados, '{}'::jsonb))
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
