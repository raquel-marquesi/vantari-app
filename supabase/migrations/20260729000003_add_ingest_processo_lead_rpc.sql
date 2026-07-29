-- Auto-criação de negócio no CRM a partir de um processo capturado pela Nina
-- (pedido da Catarina, 29/07/2026): conforme a Nina vai atendendo pessoas e
-- captura um número de processo (numero_cnj), o ideal é que isso já vire um
-- negócio na Esteira de Aquisição, estágio "Novos Leads", pronto pra um
-- analista avaliar — em vez de só existir como pessoa/evento solto no core.
--
-- valor_face_cents = 0 é um placeholder explícito de "ainda não avaliado":
-- a Nina não coleta os dados de due diligence da reclamada necessários pra
-- crm.avaliar_elegibilidade rodar sozinha, então o valor real só entra
-- depois que um analista abre o negócio e avalia manualmente.
--
-- Idempotente: se a Nina mandar o mesmo numero_cnj de novo (nova mensagem no
-- mesmo atendimento), reaproveita o processo e o negócio já existentes em
-- vez de duplicar (chave: processo_id + person_id + credit_type).

alter table crm.deals add column if not exists honorarios_pct numeric;

create or replace function crm.ingest_processo_lead(
  p_workspace uuid,
  p_person uuid,
  p_numero_cnj text,
  p_honorarios_pct numeric default null,
  p_source text default 'nina'
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
  v_numero text := nullif(trim(p_numero_cnj), '');
begin
  if v_numero is null then
    raise exception 'numero_cnj obrigatório';
  end if;

  if auth.uid() is not null
     and p_workspace not in (select workspace_id from public.workspace_members where user_id = auth.uid())
  then
    raise exception 'sem acesso ao workspace %', p_workspace;
  end if;

  -- trava por processo: evita duas chamadas concorrentes duplicando processo/negócio
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
    select pl.id into v_pipeline_id from crm.pipelines pl
      where pl.workspace_id = p_workspace and pl.name = 'Esteira de Aquisição' limit 1;
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

grant execute on function crm.ingest_processo_lead(uuid, uuid, text, numeric, text) to authenticated, service_role;
