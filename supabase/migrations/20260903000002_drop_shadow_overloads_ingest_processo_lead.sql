-- Achado ao aplicar a migration de import RJ enriquecido (03/09/2026):
-- cada migration anterior que estendeu ingest_processo_lead/create_draft_deal
-- com mais parâmetros opcionais usou "create or replace function nome(args
-- NOVOS)" — como a lista de parâmetros mudava a cada vez, isso cria uma nova
-- sobrecarga em vez de substituir a função antiga, que fica pra trás no
-- catálogo. Resultado: coexistiam 4 versões de cada função. Isso é uma
-- bomba-relógio pra chamada com argumentos nomeados (ex: os triggers que
-- passam só `p_reclamada_em_rj => ...`) — o Postgres pode não conseguir
-- decidir entre duas sobrecargas candidatas e falhar com "function is not
-- unique". Remove as sobrecargas antigas; a mais nova (20260903000001) já
-- cobre 100% dos parâmetros (mesmo nome/tipo/default) de todas elas, então
-- nenhum caller muda de comportamento.
drop function if exists crm.ingest_processo_lead(uuid, uuid, text, numeric, text, text);
drop function if exists crm.ingest_processo_lead(uuid, uuid, text, numeric, text, text, uuid, uuid);
drop function if exists crm.ingest_processo_lead(uuid, uuid, text, numeric, text, text, uuid, uuid, boolean);
drop function if exists crm.create_draft_deal(uuid, uuid, text, text);
drop function if exists crm.create_draft_deal(uuid, uuid, text, text, uuid, uuid);
drop function if exists crm.create_draft_deal(uuid, uuid, text, text, uuid, uuid, boolean);

notify pgrst, 'reload schema';
