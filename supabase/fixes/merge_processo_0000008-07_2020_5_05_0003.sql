-- ═══════════════════════════════════════════════════════════════════
-- Fusão do último par duplicado de crm.processos (2026-08-28), pendente
-- desde a varredura de 27/08 que achou 7 pares (ver
-- 20260827000001_normalize_numero_cnj_in_ingest_processo_lead.sql). Os
-- outros 6 pares já tinham sido fundidos direto em produção sem deixar
-- registro em arquivo; este documenta o 7º que restava.
--
-- Par: numero_cnj "0000008-07.2020.5.05.0003-9" (37dc14c8) vs
-- "0000008-07.2020.5.05.0003" (cef6b39b) — mesma pessoa
-- (10c06816-091a-4609-bf71-757a482dd8b4). Ambos os negócios já estavam
-- com status lost (lost_reason: valor_acima_regua) — não afetava
-- pipeline ativo, só limpeza de dado.
--
-- Sobrevivente: processo 37dc14c8 (criado 01/08, fonte "nina", deal com
-- honorarios_pct=30 preenchido) — mais completo que o de 14/08 (fonte
-- "nina_backfill", sem honorarios_pct).
-- ═══════════════════════════════════════════════════════════════════

select crm.merge_processos(
  '37dc14c8-af25-4fd3-b302-a889c2669480'::uuid,  -- p_survivor
  'cef6b39b-b412-4ac8-a76e-981e88b9ed4a'::uuid,  -- p_loser
  '2d3c2934-1430-4131-a994-308d0f097a21'::uuid   -- p_survivor_deal_id
);
