-- =============================================================================
-- Fundação do funil "Recuperação Judicial — Varejo" (campanha Meta/Google Ads +
-- lista importada, créditos trabalhistas contra empresas em RJ) — pedido da
-- Catarina, 25/08/2026.
--
-- Escopo desta migration (Fase 1 do plano combinado com ela):
--   1) Novo pipeline dedicado, com estágios próprios — separado da "Esteira de
--      Aquisição" pra não misturar com o fluxo geral que já roda pela Nina.
--   2) Campos de origem (UTM) em crm.deals — hoje só existe "source" (texto
--      livre, sempre "crm"), insuficiente pra medir Meta x Google x lista.
--   3) Cadastro das 10 entidades do Grupo Casas Bahia confirmadas via CNPJ
--      (Lojas Marabraz ainda pendente — CNPJ não recebido).
--   4) Dois motivos de perda novos, específicos dessa campanha.
--   5) crm.ingest_processo_lead ganha parâmetro opcional de pipeline —
--      100% retrocompatível (default null preserva o comportamento atual:
--      resolve por nome "Esteira de Aquisição"). Isso deixa a Fase 2 (rotear
--      de fato a automação da Nina/LP pra esse pipeline novo) pronta pra
--      ligar sem precisar mexer de novo nessa função.
--   6) FIX URGENTE em core.retract_deal_on_nina_rejection: o gatilho atual
--      apaga automaticamente qualquer negócio sempre que a Nina menciona a
--      frase "Recuperação Judicial" numa resposta (fazia sentido quando RJ
--      era motivo de recusa automática — não faz mais sentido pra uma
--      campanha cujo tema é literalmente esse). Sem esse fix, todo negócio
--      dessa campanha seria autodeletado assim que a Nina falasse sobre RJ.
--      Continua retraindo normalmente por qualquer OUTRO motivo de recusa
--      (não trabalhista, cível, INSS, seguro-desemprego etc.), em qualquer
--      pipeline — só a frase "Recuperação Judicial", sozinha, deixa de
--      derrubar negócios que já pertencem ao pipeline novo.
--
-- Fora de escopo aqui (Fase 2, ainda não ligada): fazer a automação da Nina/
-- formulário da LP de fato passar o nome do pipeline novo pra
-- ingest_processo_lead; "processo provisório" sem CNJ (hoje a função ainda
-- exige numero_cnj obrigatório); tag de campanha do lado da Nina.
-- =============================================================================

-- ---------- 1) Pipeline + estágios ----------
do $$
declare
  v_workspace uuid := '53092199-7b75-4342-a897-f589d6f34922';
  v_pipe uuid;
begin
  select id into v_pipe from crm.pipelines
    where workspace_id = v_workspace and name = 'Recuperação Judicial — Varejo' limit 1;

  if v_pipe is null then
    insert into crm.pipelines (workspace_id, name, is_default)
    values (v_workspace, 'Recuperação Judicial — Varejo', false)
    returning id into v_pipe;

    insert into crm.stages (workspace_id, pipeline_id, name, position, kind, color, probability) values
      (v_workspace, v_pipe, 'Lead capturado',    1, 'open', '#0D7491', 5),
      (v_workspace, v_pipe, 'Contato iniciado',  2, 'open', '#06B6D4', 15),
      (v_workspace, v_pipe, 'Qualificação',      3, 'open', '#7C5CFF', 30),
      (v_workspace, v_pipe, 'Proposta enviada',  4, 'open', '#F59E0B', 50),
      (v_workspace, v_pipe, 'Negociação',        5, 'open', '#EC4899', 70),
      (v_workspace, v_pipe, 'Fechado Ganho',     6, 'won',  '#14A273', 100),
      (v_workspace, v_pipe, 'Fechado Perdido',   7, 'lost', '#FF6B5E', 0);
  end if;
end $$;

-- ---------- 2) Origem/atribuição no negócio ----------
alter table crm.deals
  add column if not exists utm_source   text,
  add column if not exists utm_medium   text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content  text,
  add column if not exists utm_term     text;

comment on column crm.deals.utm_source   is 'Origem paga capturada no primeiro toque que gerou este negócio (ex: meta, google) — independente do first-touch já gravado em core.persons, que não é sobrescrito se a pessoa já existia antes desta campanha.';
comment on column crm.deals.utm_campaign is 'Nome da campanha (Meta/Google Ads) ou "lista_importada" quando vier de prospecção ativa.';

-- ---------- 3) Reclamadas do Grupo Casas Bahia (CNPJ confirmado 25/08/2026) ----------
-- Marabraz segue pendente — CNPJ ainda não recebido.
insert into core.companies (workspace_id, cnpj, name)
select '53092199-7b75-4342-a897-f589d6f34922'::uuid, v.cnpj, v.name
from (values
  ('04221023000187', 'Asap Log - Logística e Soluções Ltda.'),
  ('07170938000107', 'Cnova Comércio Eletrônico S.A.'),
  ('13135724000194', 'CNT Soluções em Negócios Digitais e Logística Ltda'),
  ('17096609000109', 'CNTLOG Express Logística e Transporte Ltda'),
  ('19629612000176', 'Asap Log Ltda'),
  ('27936226000155', 'Integra Soluções para Varejo Digital Ltda'),
  ('33041260065290', 'Grupo Casas Bahia S.A.'),
  ('42516173000107', 'Casas Bahia Tecnologia Ltda.'),
  ('42569335000175', 'Globex Administração e Serviços Ltda'),
  ('59105825000113', 'Indústria de Móveis Bartira Ltda')
) as v(cnpj, name)
where not exists (
  select 1 from core.companies c
  where c.workspace_id = '53092199-7b75-4342-a897-f589d6f34922'::uuid and c.cnpj = v.cnpj
);

-- ---------- 4) Motivos de perda específicos da campanha ----------
alter table crm.deals drop constraint if exists deals_lost_reason_check;
alter table crm.deals add constraint deals_lost_reason_check
  check (lost_reason is null or lost_reason = any (array[
    'reclamada_insolvente', 'reclamada_em_rj', 'tese_restritiva', 'processo_inelegivel',
    'proposta_recusada', 'documentacao_incompleta', 'sem_contato',
    'valor_abaixo_regua', 'valor_acima_regua', 'acordo_formalizado', 'fase_avancada_execucao',
    'reclamada_pf_mei', 'reclamada_me_epp', 'recuperacao_judicial_falencia', 'risco_solvencia',
    'cnpj_baixado', 'processo_plurimo', 'verbas_nao_passiveis', 'concentracao_risco_verba',
    'risco_juridico_elevado', 'incerteza_liquidacao', 'processo_suspenso',
    'advogado_nao_aceita_termos', 'documentacao_impeditiva', 'fora_politica_interna',
    'cliente_desistiu', 'cliente_fechou_concorrente', 'sem_retorno',
    'idoso_sem_terceiro_confianca', 'necessidade_urgente_saude_despejo_divida',
    'nao_compreende_a_operacao', 'recusa_advogado', 'aceita_qualquer_valor',
    'acredita_valor_integral_avista', 'sem_numero_processo',
    -- novos — campanha "Recuperação Judicial — Varejo"
    'reclamada_fora_do_escopo_campanha',  -- não é Casas Bahia/Marabraz nem grupo compatível
    'credito_ja_cedido_terceiro',         -- crédito já vendido a outro comprador
    'outro'
  ]::text[]));

-- ---------- 5) crm.ingest_processo_lead — parâmetro opcional de pipeline ----------
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

grant execute on function crm.ingest_processo_lead(uuid, uuid, text, numeric, text, text) to authenticated, service_role;

-- ---------- 6) FIX: retract não deve derrubar negócios da campanha de RJ só
--    por a Nina mencionar "Recuperação Judicial" ----------
create or replace function core.retract_deal_on_nina_rejection()
returns trigger
language plpgsql
security definer
set search_path to 'core', 'crm', 'public'
as $function$
declare
  v_deal record;
  v_rj_pipeline_id uuid;
  v_hard_reject boolean;
  v_rj_phrase boolean;
begin
  if new.source = 'nina' and new.type = 'whatsapp_in' and new.payload->>'direction' = 'outbound' then

    v_hard_reject := (
         new.payload->>'content' ilike '%não é trabalhista%'
      or new.payload->>'content' ilike '%não são%trabalh%'
      or new.payload->>'content' ilike '%não é na área trabalhista%'
      or new.payload->>'content' ilike '%contra o INSS%'
      or new.payload->>'content' ilike '%processo cível%'
      or new.payload->>'content' ilike '%seguro-desemprego%'
      or new.payload->>'content' ilike '%outra área da justiça%'
      or new.payload->>'content' ilike '%não conseguimos seguir%'
      or new.payload->>'content' ilike '%não conseguimos te ajudar%'
      or new.payload->>'content' ilike '%não conseguimos antecipar%'
    );
    v_rj_phrase := new.payload->>'content' ilike '%Recuperação Judicial%';

    if v_hard_reject or v_rj_phrase then
      select id into v_rj_pipeline_id from crm.pipelines
        where workspace_id = new.workspace_id and name = 'Recuperação Judicial — Varejo' limit 1;

      for v_deal in
        select d.id, d.processo_id, d.pipeline_id from crm.deals d
        where d.person_id = new.person_id
          and d.source in ('nina_auto_detect', 'nina_backfill')
          and d.status = 'open'
          and d.honorarios_pct is null
      loop
        -- campanha de Recuperação Judicial: o tema RJ aparece o tempo todo nas
        -- conversas de propósito, então a frase sozinha não é motivo de recusa
        -- pra negócios desse pipeline — só retrai se outro motivo bater junto.
        if v_rj_pipeline_id is not null and v_deal.pipeline_id = v_rj_pipeline_id and not v_hard_reject then
          continue;
        end if;

        delete from crm.deals where id = v_deal.id;
        delete from crm.processos p
          where p.id = v_deal.processo_id
            and not exists (select 1 from crm.deals d2 where d2.processo_id = p.id);
        insert into core.events (workspace_id, person_id, source, type, payload)
        values (new.workspace_id, new.person_id, 'system', 'deal_auto_retracted',
                jsonb_build_object('deal_id', v_deal.id, 'motivo', 'nina_rejeitou_triagem',
                                    'mensagem_rejeicao', new.payload->>'content'));
      end loop;
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_retract_deal_on_nina_rejection on core.events;
create trigger trg_retract_deal_on_nina_rejection
  after insert on core.events
  for each row
  execute function core.retract_deal_on_nina_rejection();

notify pgrst, 'reload schema';
