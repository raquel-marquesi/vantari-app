-- ════════════════════════════════════════════════════════════════
-- Padronização: campo "Fase do processo" (com opção "Não sei
-- informar") também no formulário da LP03 (Antecipar Ação
-- Trabalhista, slug "antecipar-acao"), igual ao que já existe no
-- formulário da LP02 (antecipar-agora). Não estava no escopo original
-- da proposta de conteúdo, mas o usuário pediu para padronizar as três.
--
-- Idempotente: só roda se o campo ainda não existir no array `fields`.
-- ════════════════════════════════════════════════════════════════

update forms
set fields = fields || jsonb_build_object(
  'id', 'fase_processual',
  'type', 'select',
  'label', 'Fase do processo',
  'options', jsonb_build_array('2ª instância', 'Trânsito em julgado', 'Não sei informar'),
  'required', true
)
where slug = 'antecipar-acao'
  and not exists (
    select 1 from jsonb_array_elements(fields) e where e ->> 'id' = 'fase_processual'
  );

-- e o "Número do processo" (opcional), pra ficar igual às outras duas
update forms
set fields = fields || jsonb_build_object(
  'id', 'numero_processo',
  'type', 'text',
  'label', 'Número do processo (opcional)',
  'placeholder', 'opcional',
  'required', false
)
where slug = 'antecipar-acao'
  and not exists (
    select 1 from jsonb_array_elements(fields) e where e ->> 'id' = 'numero_processo'
  );
