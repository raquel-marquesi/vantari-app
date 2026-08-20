-- Backfill único, ago/2026: processos com reclamada_em_rj = true que ficaram
-- 'inelegivel' por causa do veto automático antigo (removido em
-- 20260820000001_rj_revisao_manual_e_playbook_captacao.sql) voltam para
-- 'em_analise' — passam a exigir revisão manual, não reprovação automática.
-- Não recalcula 'elegivel' (o trigger já mantém isso atualizado); só corrige
-- o 'status' que ficou congelado com o veredito antigo.
update crm.processos
set status = 'em_analise'
where reclamada_em_rj = true
  and status = 'inelegivel';
