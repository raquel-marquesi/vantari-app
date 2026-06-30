-- =====================================================================
-- 0009_mkt_campaign_fields.sql
-- Campos que a tela /email usa e que faltavam em mkt.campaigns.
-- Convergência do /email do legado public.campaigns pro mkt.campaigns.
--
-- mkt.campaigns já tem: name, subject, from_email, from_name, template_html,
--   status (draft|scheduled|sending|sent|active), scheduled_at, sent_at.
-- A UI também usa: type (newsletter/oferta/...), audience (rótulo do público)
--   e audience_count. html_content da UI mapeia pra template_html no código;
--   sender mapeia pra from_email.
--
-- Idempotente (add column if not exists). Aplicar em prod após revisão.
-- =====================================================================

alter table mkt.campaigns add column if not exists type           text default 'newsletter';
alter table mkt.campaigns add column if not exists audience       text;
alter table mkt.campaigns add column if not exists audience_count int default 0;
