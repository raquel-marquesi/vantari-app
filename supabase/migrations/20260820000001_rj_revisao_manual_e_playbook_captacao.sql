-- =============================================================================
-- Campanha "crédito trabalhista em recuperação judicial" — ago/2026
-- -----------------------------------------------------------------------------
-- 1) Reclamada em RJ deixa de ser veto automático de elegibilidade (Lei
--    14.112/2020, art. 83 §5º: crédito cedido mantém classificação/prioridade
--    mesmo com a reclamada em recuperação judicial). Passa a exigir revisão
--    manual em vez de reprovação ou aprovação automática.
-- 2) Campos de diagnóstico e checklist de compliance do "Playbook de captação
--    ativa" (uso interno — cessão pode ser anulada por estado de perigo/lesão,
--    arts. 156/157 CC, se parecer feita sob pressão).
-- =============================================================================

-- ---------- 1) Elegibilidade: RJ sai do veto automático ----------
create or replace function crm.avaliar_elegibilidade(p crm.processos)
returns boolean language sql immutable set search_path to '' as $$
  select
        coalesce(array_length(p.teses_restritivas, 1), 0) = 0   -- nenhuma tese restritiva
    and p.reclamada_cndt in ('negativa', 'positiva_efeito_negativa')
    and coalesce(p.reclamada_porte, 'MEI') not in ('MEI', 'ME')  -- não MEI/ME
    and coalesce(p.reclamada_paga_precatorio, true) = false      -- não paga por precatório
    and coalesce(p.reclamada_solvente, false)    = true          -- solvente
    -- reclamada_em_rj NÃO entra mais aqui: cessão mantém prioridade (Lei 14.112/2020,
    -- art. 83 §5º). RJ passa a exigir revisão manual — ver crm.set_elegibilidade().
$$;

create or replace function crm.set_elegibilidade()
returns trigger language plpgsql set search_path to 'crm', 'public' as $$
begin
  new.updated_at := now();
  new.elegivel   := crm.avaliar_elegibilidade(new);

  if coalesce(new.reclamada_em_rj, false) then
    -- RJ: nunca aprova/reprova sozinho. Só define o status inicial na
    -- criação; numa atualização, preserva a decisão manual do time.
    if tg_op = 'INSERT' then
      new.status := 'em_analise';
    end if;
  elsif new.status in ('em_analise', 'elegivel', 'inelegivel') then
    new.status := case when new.elegivel then 'elegivel' else 'inelegivel' end;
  end if;

  return new;
end $$;

-- ---------- 2) Diagnóstico (playbook, etapas 2 e 4) ----------
alter table crm.processos
  add column if not exists execucao_suspensa boolean,
  add column if not exists saida_vs_pedido_rj text
    check (saida_vs_pedido_rj in ('antes', 'depois', 'desconhecido')),
  add column if not exists preocupacao_principal text
    check (preocupacao_principal in ('valor', 'prazo', 'outro')),
  add column if not exists tem_proposta_concorrente boolean;

comment on column crm.processos.execucao_suspensa is 'Cliente recebeu comunicação de que a execução foi suspensa (playbook, diagnóstico)';
comment on column crm.processos.saida_vs_pedido_rj is 'Saída do reclamante antes/depois do pedido de RJ — muda concursal x extraconcursal (playbook, seção 7)';
comment on column crm.processos.preocupacao_principal is 'O que mais preocupa o cliente: valor ou prazo (playbook, pergunta-filtro de risco)';
comment on column crm.processos.tem_proposta_concorrente is 'Cliente já recebeu proposta de outra empresa sobre esse crédito';

-- ---------- 3) Advogado do processo — tabela existe desde 0002_crm_flow.sql,
--    nunca teve tela nenhuma até agora. Adiciona os campos que o playbook pede
--    coletar sobre ele (seção 2 do diagnóstico).
alter table crm.processo_advogados
  add column if not exists contato_confirmado boolean not null default false,
  add column if not exists percentual_honorarios numeric(5,2);

comment on column crm.processo_advogados.contato_confirmado is 'Time confirmou contato ativo com o advogado do processo (playbook, diagnóstico)';
comment on column crm.processo_advogados.percentual_honorarios is 'Percentual de honorários contratuais combinado com o cliente';

-- ---------- 4) Checklist de formalização (playbook, "checklist antes de
--    formalizar" — 8 itens). jsonb porque é um checklist fechado e opcional,
--    mesmo padrão de crm.processos.teses_restritivas / email_templates.bee_json.
--    Chaves esperadas: proposta_enviada_em, assinatura_em, advogado_contatado,
--    honorarios_tratados, termo_ciencia_gravado,
--    cliente_explicou_proprias_palavras, contrato_entregue_copia,
--    registro_conversa_completo.
alter table crm.deals
  add column if not exists checklist_formalizacao jsonb not null default '{}'::jsonb;

comment on column crm.deals.checklist_formalizacao is 'Checklist de compliance antes de formalizar a cessão (Playbook de captação ativa)';

-- ---------- 5) Novos motivos de desqualificação — "Quando NÃO avançar"
--    (playbook): sinais de risco de anulação/reclamação, não motivo comercial.
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
    -- novos — sinais de "quando não avançar" do playbook de captação ativa
    'idoso_sem_terceiro_confianca', 'necessidade_urgente_saude_despejo_divida',
    'nao_compreende_a_operacao', 'recusa_advogado', 'aceita_qualquer_valor',
    'acredita_valor_integral_avista', 'sem_numero_processo',
    'outro'
  ]::text[]));
