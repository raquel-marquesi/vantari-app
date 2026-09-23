-- Corrige regressao causada por revoke_anon_authenticated_sensitive_rpcs_21set2026.sql
--
-- O PASSO 2 daquele fix revogou EXECUTE do PUBLIC assumindo que a service role
-- "nao depende desses GRANTs". Errado: a service_role ignora RLS (BYPASSRLS),
-- mas NAO ignora privilegio de EXECUTE em funcao. As funcoes abaixo nao tinham
-- grant direto pra service_role (dependiam do PUBLIC) e passaram a falhar com
-- "permission denied for function ..." nas Edge Functions:
--   ingest-message, ingest, sync-meta-leads, sync-google-ads-leads
-- Efeito: de 21/09/2026 14:38 BRT ate a aplicacao deste fix, nenhuma mensagem
-- da Nina chegou em core.messages e nenhum lead do Meta/Google Ads foi ingerido.
--
-- Funcoes de trigger (retornam trigger) nao precisam de EXECUTE pra disparar,
-- por isso ficam de fora.
--
-- Licao: depois de mexer em GRANT de funcao, checar
--   has_function_privilege('service_role', oid, 'execute')
-- pra tudo que as Edge Functions chamam via .rpc().

begin;

grant execute on function core.resolve_person(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text) to service_role;
grant execute on function core.delete_person(uuid) to service_role;
grant execute on function core.update_person_manual(uuid, text, text, text, text, uuid) to service_role;
grant execute on function core.get_channel_funnel(uuid, timestamptz) to service_role;
grant execute on function crm.create_draft_deal(uuid, uuid, text, text, uuid, uuid, boolean, text, text, bigint, text, date, jsonb) to service_role;
grant execute on function crm.delete_deal(uuid) to service_role;
grant execute on function crm.ingest_processo_lead(uuid, uuid, text, numeric, text, text, uuid, uuid, boolean, text, text, bigint, text, date, jsonb) to service_role;
grant execute on function crm.transfer_deal_pipeline(uuid, uuid, uuid) to service_role;

commit;
