-- Achado 18/09/2026 investigando "está tudo ok pra enviar campanha de
-- email?": mkt.campaigns_status_check só permitia
-- draft/scheduled/sending/sent/active — mas send-campaign (desde sempre)
-- tenta gravar status='failed' quando um envio não teve nenhum sucesso.
-- Essa própria atualização violava a constraint, o que explica por que as
-- 2 campanhas de teste de julho/2026 ficaram travadas em "sending" pra
-- sempre (o guard de "já foi enviada" só bloqueia reenvio quando
-- status='sent', então nem isso ajudava). Sem essa correção, o try/catch
-- que acabei de adicionar em send-campaign/index.ts (pra nunca deixar a
-- campanha presa em "sending") também bateria nesse mesmo erro.
alter table mkt.campaigns drop constraint campaigns_status_check;
alter table mkt.campaigns add constraint campaigns_status_check
  check (status = any (array['draft','scheduled','sending','sent','active','failed']));
