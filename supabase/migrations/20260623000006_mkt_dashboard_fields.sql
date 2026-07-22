-- =====================================================================
-- 0006_mkt_dashboard_fields.sql
-- Campos que o dashboard (/dashboard) precisa para ler do schema `mkt`
-- em vez das tabelas legadas `public.campaigns` / `public.campaign_sends`.
--
-- Decisões (alinhadas com a Raquel, 2026-06-29):
--   1. mkt.campaigns ganha o status 'active'  (campanha em veiculação contínua,
--      distinto de 'sending' = disparo pontual em andamento).
--   2. mkt.campaign_sends ganha o status 'converted' + coluna converted_at,
--      para o CampaignRing medir conversão (o modelo antigo usava boolean
--      `converted`; aqui derivamos de status/timestamp).
--
-- Idempotente: só ALTER (drop/recreate de CHECK + add column if not exists).
-- Não recria tabelas, não toca em dados. Reversível.
--
-- ⚠️ APLICAR EM PRODUÇÃO ANTES de deployar o front que lê estas colunas —
--    senão o PostgREST devolve erro ao selecionar `converted_at`.
-- =====================================================================

-- 1) mkt.campaigns: adiciona 'active' ao enum de status -----------------
alter table mkt.campaigns drop constraint if exists campaigns_status_check;
alter table mkt.campaigns add constraint campaigns_status_check
  check (status in ('draft', 'scheduled', 'sending', 'sent', 'active'));

-- 2) mkt.campaign_sends: adiciona 'converted' + converted_at ------------
alter table mkt.campaign_sends drop constraint if exists campaign_sends_status_check;
alter table mkt.campaign_sends add constraint campaign_sends_status_check
  check (status in ('queued', 'sent', 'opened', 'clicked', 'bounced', 'failed', 'converted'));

alter table mkt.campaign_sends add column if not exists converted_at timestamptz;
