-- ════════════════════════════════════════════════════════════════
-- Coluna pra correlacionar mkt.campaign_sends com o evento de webhook
-- do Resend (bounce/complaint/open/click).
-- ────────────────────────────────────────────────────────────────
-- O Resend retorna um "id" por email no /emails/batch. Sem guardar esse id,
-- não tem como saber DEPOIS (via webhook assíncrono) qual campaign_sends
-- corresponde a qual envio — hoje nada popula bounced_at/error de verdade.
-- ════════════════════════════════════════════════════════════════

alter table mkt.campaign_sends
  add column if not exists resend_email_id text;

create unique index if not exists campaign_sends_resend_email_id_key
  on mkt.campaign_sends (resend_email_id)
  where resend_email_id is not null;
