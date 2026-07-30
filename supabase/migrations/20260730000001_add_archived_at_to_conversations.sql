-- Encerrar/Reabrir conversa no /inbox (pedido da Catarina, 30/07/2026): time
-- enxuta, quase sem atendentes humanas dedicadas — o jurídico é quem
-- resolve manualmente. Precisam poder tirar uma conversa já tratada da
-- lista ativa sem apagar o histórico (auditoria/continuidade).
--
-- archived_at é independente do status nina/human: uma conversa pode ter
-- sido resolvida enquanto estava com qualquer um dos dois. null = ativa,
-- preenchida = arquivada/resolvida (guarda quando foi encerrada).

alter table core.conversations add column if not exists archived_at timestamptz;

create index if not exists idx_conversations_workspace_archived_last
  on core.conversations (workspace_id, archived_at, last_message_at desc);
