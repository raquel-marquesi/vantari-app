-- ═══════════════════════════════════════════════════════════════════
-- Backfill pontual (14/09/2026): os 57 leads do formulário RECJUD (Meta
-- Lead Ads, form_id 1725125341868971) importados entre 18:20-18:36 de
-- 14/09 nunca ganharam negócio na pipeline "Recuperação Judicial —
-- Varejo" — bug real achado nessa investigação: `integration_credentials
-- .config.form_ids[0].campanha` estava salvo como o texto livre
-- "Recuperação Judicial / Crédito Trabalhista" (digitado na UI de
-- /integrations), mas o CAMPAIGN_PIPELINE_MAP do sync-meta-leads só
-- reconhecia o slug 'recuperacao_judicial_varejo' — sem bater, a
-- function nunca resolvia pipelineName e pulava a criação do negócio
-- por completo. Corrigido via UPDATE direto (não é código, é dado) e a
-- migration 20260914000001 adicionou o RPC de captador round-robin.
--
-- Deste backfill, só a fatia SEM AMBIGUIDADE roda aqui:
--   a) 9 pessoas sem NENHUM negócio de reclamante ainda → cria negócio
--      novo na pipeline RJ ("Lead capturado") + capta captador.
--   b) 4 pessoas que já têm negócio NESSA MESMA pipeline (criado por
--      algum fluxo anterior) mas sem captador → só atribui captador.
--
-- NÃO mexe nas outras 44 pessoas que já tinham negócio em OUTRA pipeline
-- (na prática, "Esteira de Aquisição" — a maioria, 29, já em "Perdido").
-- Mover esse negócio pra RJ seria uma decisão de negócio (reativar lead
-- perdido, redefinir o funil de alguém em andamento), não uma correção
-- técnica — fica para decisão explícita da Catarina.
-- ═══════════════════════════════════════════════════════════════════

do $$
declare
  v_ws uuid := '53092199-7b75-4342-a897-f589d6f34922';
  v_pipeline_name text := 'Recuperação Judicial — Varejo';
  v_deal_id uuid;
  v_captador text;
  r record;
begin
  -- (a) sem negócio nenhum ainda → cria na pipeline RJ, na ordem em que o lead
  -- chegou no Meta (core.events.occurred_at = lead.created_time do Meta)
  for r in
    select e.person_id, min(e.occurred_at) as occurred_at
    from core.events e
    where e.workspace_id = v_ws
      and e.source = 'meta' and e.type = 'lead_created'
      and e.payload ->> 'form_id' = '1725125341868971'
      and not exists (select 1 from crm.deals d where d.person_id = e.person_id and d.credit_type = 'reclamante')
    group by e.person_id
    order by occurred_at asc
  loop
    v_deal_id := crm.create_draft_deal(
      p_workspace => v_ws, p_person => r.person_id, p_source => 'meta',
      p_pipeline_name => v_pipeline_name, p_reclamada_em_rj => true
    );
    v_captador := crm.assign_next_captador_round_robin(
      p_workspace => v_ws, p_deal_id => v_deal_id, p_pipeline_name => v_pipeline_name, p_source => 'meta'
    );
    raise notice '[novo] pessoa % -> negocio % -> captador %', r.person_id, v_deal_id, v_captador;
  end loop;

  -- (b) já tem negócio na própria pipeline RJ, mas ainda sem captador (topo-up)
  for r in
    select d.id as deal_id, d.person_id
    from crm.deals d
    join crm.pipelines p on p.id = d.pipeline_id and p.workspace_id = v_ws and p.name = v_pipeline_name
    where d.captador is null
      and exists (
        select 1 from core.events e
        where e.person_id = d.person_id and e.source = 'meta' and e.type = 'lead_created'
          and e.payload ->> 'form_id' = '1725125341868971'
      )
    order by d.created_at asc
  loop
    v_captador := crm.assign_next_captador_round_robin(
      p_workspace => v_ws, p_deal_id => r.deal_id, p_pipeline_name => v_pipeline_name, p_source => 'meta'
    );
    raise notice '[topo-up captador] pessoa % -> negocio % -> captador %', r.person_id, r.deal_id, v_captador;
  end loop;
end $$;
