-- ════════════════════════════════════════════════════════════════
-- Conteúdo das LPs — campos de formulário pendentes (proposta de
-- conteúdo, seção "FORMULÁRIO (PADRÃO)"):
--   - "Fase do processo" (com opção "Não sei informar") no formulário
--     da LP Antecipar Agora (pessoa física).
--   - "Número do processo" (opcional) nos formulários Antecipar Agora
--     e Escritórios Jurídicos.
--
-- Idempotente: cada UPDATE só roda se o campo ainda não existir no
-- array `fields` daquele formulário (checagem por `id`), então pode
-- ser aplicada mais de uma vez sem duplicar campos.
-- ════════════════════════════════════════════════════════════════

-- Antecipar Agora (pessoa física) — "Fase do processo"
update forms
set fields = fields || jsonb_build_object(
  'id', 'fase_processual',
  'type', 'select',
  'label', 'Fase do processo',
  'options', jsonb_build_array('2ª instância', 'Trânsito em julgado', 'Não sei informar'),
  'required', true
)
where slug = 'antecipar-agora'
  and not exists (
    select 1 from jsonb_array_elements(fields) e where e ->> 'id' = 'fase_processual'
  );

-- Antecipar Agora (pessoa física) — "Número do processo" (opcional)
update forms
set fields = fields || jsonb_build_object(
  'id', 'numero_processo',
  'type', 'text',
  'label', 'Número do processo (opcional)',
  'placeholder', 'opcional',
  'required', false
)
where slug = 'antecipar-agora'
  and not exists (
    select 1 from jsonb_array_elements(fields) e where e ->> 'id' = 'numero_processo'
  );

-- Escritórios Jurídicos (B2B) — "Número do processo" (opcional)
update forms
set fields = fields || jsonb_build_object(
  'id', 'numero_processo',
  'type', 'text',
  'label', 'Número do processo (opcional)',
  'placeholder', 'opcional',
  'required', false
)
where slug = 'escritorios-juridicos'
  and not exists (
    select 1 from jsonb_array_elements(fields) e where e ->> 'id' = 'numero_processo'
  );
