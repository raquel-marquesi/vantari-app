-- ════════════════════════════════════════════════════════════════
-- core.companies — campos de CRM para a tela "Empresas"
-- ────────────────────────────────────────────────────────────────
-- core.companies hoje só tem cnpj + name (suficiente pro core.resolve_person
-- e pro vínculo com crm.processos.reclamada_company_id). A tela Empresas
-- (inventariada em docs/FLOW_SPEC.md) precisa de mais contexto de negócio:
-- domínio, indústria, porte, receita estimada. Aditivo — não toca nada
-- que já existe, só adiciona colunas opcionais.
-- ════════════════════════════════════════════════════════════════

alter table core.companies
  add column if not exists domain        text,
  add column if not exists industry      text,
  add column if not exists size          text check (size is null or size in ('MEI','ME','EPP','Médio','Grande')),
  add column if not exists revenue_cents bigint;
