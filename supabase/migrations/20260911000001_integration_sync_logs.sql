-- =============================================================================
-- integration_sync_logs — tabela real por trás da tela "Logs de Sincronização"
-- -----------------------------------------------------------------------------
-- Até aqui a tela em /integrations (LogsView + StatsBar + "Atividade Recente")
-- lia de um array mock hardcoded no frontend (DB.integration_logs = []), que
-- nunca foi ligado a nada — por isso o contador ficava sempre 0/0/0/0, mesmo
-- com o pg_cron rodando sync-meta-leads de verdade a cada 10 min. Esta tabela
-- passa a ser gravada por qualquer function de sync (uma linha por execução,
-- sucesso ou erro), e o frontend passa a ler daqui.
-- =============================================================================

create table if not exists public.integration_sync_logs (
  id                uuid primary key default gen_random_uuid(),
  provider          text not null,                    -- 'meta' | 'google' | 'webhook'
  action            text not null default 'sync',      -- ex.: 'sync_meta_leads'
  status            text not null                       -- 'success' | 'error' | 'warning'
                      check (status in ('success','error','warning')),
  details           text,                               -- mensagem curta pra exibir na lista
  records_affected  integer not null default 0,         -- leads sincronizados nessa execução
  payload           jsonb,                               -- breakdown por formulário/objeto (debug)
  created_at        timestamptz not null default now()
);

comment on table public.integration_sync_logs is
  'Uma linha por execução de sync de integração (manual ou via pg_cron), sucesso ou erro. Alimenta a tela /integrations → Logs de Sincronização.';

create index if not exists idx_integration_sync_logs_created_at
  on public.integration_sync_logs using btree (created_at desc);
create index if not exists idx_integration_sync_logs_provider
  on public.integration_sync_logs using btree (provider);

-- RLS: mesmo padrão do resto do app pós-hardening (authenticated full access,
-- sem exceção pra anon — não é um dado público como forms/tracker).
alter table public.integration_sync_logs enable row level security;
create policy integration_sync_logs_authenticated on public.integration_sync_logs
  for all to authenticated using (true) with check (true);

grant select, insert, update, delete on public.integration_sync_logs to authenticated;
grant all on public.integration_sync_logs to service_role;
