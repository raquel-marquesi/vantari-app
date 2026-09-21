-- Fecha o acesso via API REST (/rest/v1/rpc/...) a funcoes SECURITY DEFINER
-- sensiveis que estavam liberadas por padrao para anon e/ou authenticated,
-- mas que na pratica so devem ser chamadas:
--   a) pelo app logado (client usa o papel "authenticated") -> mantem GRANT authenticated, revoga anon
--   b) so pelas Edge Functions com a service role key, ou so internamente por
--      triggers/outras funcoes SECURITY DEFINER -> revoga anon E authenticated
--
-- Levantamento (checkup de seguranca, 21/09/2026): nenhuma pagina do
-- frontend (grep de `.rpc(` em src/) nem nenhuma Edge Function que usa a
-- anon key chama essas funcoes fora do escopo abaixo. Todas as Edge
-- Functions que de fato precisam delas (ingest, ingest-message,
-- sync-meta-leads, sync-google-ads-leads, lookup-person, conversation-send,
-- resend-webhook) usam a SUPABASE_SERVICE_ROLE_KEY, que nao depende desses
-- GRANTs.
--
-- Ficam de fora (permanecem publicas de proposito, paginas sem login):
--   public.get_lp_whatsapp()              -> /f/:slug e /email precisam, sem auth
--   core.set_email_consent(...)            -> /unsubscribe e publica
--   public.is_workspace_member(...)        -> ja estava restrita a authenticated (RLS de tabelas {public})
--
-- ATENCAO — PEGADINHA DESCOBERTA NA APLICACAO (21/09/2026): rodar só o REVOKE
-- abaixo (FROM anon / FROM anon, authenticated) NAO fechou nada sozinho. Toda
-- funcao criada sem "revoke ... from public" explicito ganha EXECUTE pro
-- pseudo-papel PUBLIC por padrao no Postgres — e QUALQUER papel (anon,
-- authenticated, etc.) herda do PUBLIC automaticamente, mesmo sem grant
-- direto. Como a grande maioria dessas funcoes tinha esse grant residual pro
-- PUBLIC, o REVOKE por papel especifico nao surtia efeito nenhum na pratica
-- (confirmado com `has_function_privilege('anon', ..., 'execute')` = true
-- mesmo depois do revoke). O fix de verdade precisou de um segundo passo,
-- revogando do PUBLIC e, pras funcoes que o app logado usa, re-concedendo
-- explicitamente a `authenticated` — ver bloco no final deste arquivo
-- ("PASSO 2 — a correcao real"). Confirmado depois com o advisor de
-- seguranca do Supabase: anon caiu de 37 funcoes executaveis pra 2 (as duas
-- que devem mesmo ficar publicas), authenticated ficou só com as ~19 que o
-- app realmente usa.
--
-- Nota tambem util pra proxima vez: core/crm ja nao tem nem USAGE de schema
-- liberado pro anon (`select nspacl from pg_namespace`), entao essas duas
-- especificamente ja estavam protegidas por uma camada a mais mesmo antes
-- do fix. mkt e public liberam USAGE pro anon por padrao — sao as que
-- importavam de verdade nesse levantamento.

begin;

-- (a) revoga so de anon — o app logado (authenticated) continua usando
revoke execute on function core.resolve_person(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text) from anon;
revoke execute on function core.set_person_attributes(uuid, jsonb, text) from anon;
revoke execute on function core.set_phone_identifier(uuid, uuid, text, jsonb) from anon;
revoke execute on function core.delete_person(uuid) from anon;
revoke execute on function core.update_person_manual(uuid, text, text, text, text, uuid) from anon;
revoke execute on function core.get_channel_funnel(uuid, timestamptz) from anon;
revoke execute on function core.current_workspace_ids() from anon;
revoke execute on function crm.assign_next_captador_round_robin(uuid, uuid, text, text, text[]) from anon;
revoke execute on function crm.create_draft_deal(uuid, uuid, text, text, uuid, uuid, boolean, text, text, bigint, text, date, jsonb) from anon;
revoke execute on function crm.delete_deal(uuid) from anon;
revoke execute on function crm.ingest_processo_lead(uuid, uuid, text, numeric, text, text, uuid, uuid, boolean, text, text, bigint, text, date, jsonb) from anon;
revoke execute on function crm.pick_captador_for_person(uuid, uuid, text[]) from anon;
revoke execute on function crm.transfer_deal_pipeline(uuid, uuid, uuid) from anon;
revoke execute on function mkt.recompute_all_scores_inicial(uuid) from anon;
revoke execute on function public.current_role_in_workspace(uuid) from anon;
revoke execute on function public.list_workspace_team(uuid) from anon;

-- (b) revoga de anon E authenticated — sem chamador legitimo pelo client;
-- so uso interno (trigger/outra funcao SECURITY DEFINER) ou pela Edge
-- Function com service role, nenhum dos dois precisa desse GRANT
revoke execute on function core.bump_engajamento(uuid, text, text) from anon, authenticated;
revoke execute on function core.detect_numero_processo_in_message() from anon, authenticated;
revoke execute on function core.ingest_message(uuid, uuid, text, text, text, text, text, timestamptz, text) from anon, authenticated;
revoke execute on function core.ingest_message(uuid, uuid, text, text, text, text, text, timestamptz, text, text, text, text) from anon, authenticated;
revoke execute on function core.lookup_person_by_phone(uuid, text) from anon, authenticated;
revoke execute on function core.merge_persons(uuid, uuid) from anon, authenticated;
revoke execute on function core.record_human_message(uuid, uuid, uuid, text, text, text, text, timestamptz) from anon, authenticated;
revoke execute on function core.retract_deal_on_nina_rejection() from anon, authenticated;
revoke execute on function crm.ensure_default_pipeline(uuid) from anon, authenticated;
revoke execute on function crm.merge_processos(uuid, uuid, uuid) from anon, authenticated;
revoke execute on function mkt.on_attr_change() from anon, authenticated;
revoke execute on function mkt.recompute_score(uuid) from anon, authenticated;
revoke execute on function mkt.recompute_score_inicial(uuid) from anon, authenticated;
revoke execute on function public.apply_form_scoring(uuid, uuid) from anon, authenticated;
revoke execute on function public.apply_scoring(uuid, text, integer, text) from anon, authenticated;
revoke execute on function public.count_segment_leads(uuid, jsonb) from anon, authenticated;
revoke execute on function public.get_campaign_recipients(uuid) from anon, authenticated;
revoke execute on function public.provision_workspace_defaults() from anon, authenticated;
revoke execute on function public.simulate_campaign_send(uuid) from anon, authenticated;
revoke execute on function public.simulate_workflow_execution(uuid, uuid) from anon, authenticated;
revoke execute on function public.tier_of(integer, uuid) from anon, authenticated;
revoke execute on function public.trigger_workflow(uuid, uuid) from anon, authenticated;
revoke execute on function public.user_workspace_ids(uuid) from anon, authenticated;

commit;

-- =====================================================================
-- PASSO 2 — a correcao real (migration separada:
-- revoke_public_grant_sensitive_rpcs, aplicada na sequencia no mesmo dia)
-- =====================================================================
begin;

-- (a) revoga do PUBLIC, mas garante authenticated (app logado) continua ok
revoke execute on function core.resolve_person(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text) from public;
grant  execute on function core.resolve_person(uuid, text, text, text, text, text, text, text, text, text, text, text, text, text) to authenticated;

revoke execute on function core.set_person_attributes(uuid, jsonb, text) from public;
grant  execute on function core.set_person_attributes(uuid, jsonb, text) to authenticated;

revoke execute on function core.set_phone_identifier(uuid, uuid, text, jsonb) from public;
grant  execute on function core.set_phone_identifier(uuid, uuid, text, jsonb) to authenticated;

revoke execute on function core.delete_person(uuid) from public;
grant  execute on function core.delete_person(uuid) to authenticated;

revoke execute on function core.update_person_manual(uuid, text, text, text, text, uuid) from public;
grant  execute on function core.update_person_manual(uuid, text, text, text, text, uuid) to authenticated;

revoke execute on function core.get_channel_funnel(uuid, timestamptz) from public;
grant  execute on function core.get_channel_funnel(uuid, timestamptz) to authenticated;

revoke execute on function core.current_workspace_ids() from public;
grant  execute on function core.current_workspace_ids() to authenticated;

revoke execute on function crm.assign_next_captador_round_robin(uuid, uuid, text, text, text[]) from public;
grant  execute on function crm.assign_next_captador_round_robin(uuid, uuid, text, text, text[]) to authenticated;

revoke execute on function crm.create_draft_deal(uuid, uuid, text, text, uuid, uuid, boolean, text, text, bigint, text, date, jsonb) from public;
grant  execute on function crm.create_draft_deal(uuid, uuid, text, text, uuid, uuid, boolean, text, text, bigint, text, date, jsonb) to authenticated;

revoke execute on function crm.delete_deal(uuid) from public;
grant  execute on function crm.delete_deal(uuid) to authenticated;

revoke execute on function crm.ingest_processo_lead(uuid, uuid, text, numeric, text, text, uuid, uuid, boolean, text, text, bigint, text, date, jsonb) from public;
grant  execute on function crm.ingest_processo_lead(uuid, uuid, text, numeric, text, text, uuid, uuid, boolean, text, text, bigint, text, date, jsonb) to authenticated;

revoke execute on function crm.pick_captador_for_person(uuid, uuid, text[]) from public;
grant  execute on function crm.pick_captador_for_person(uuid, uuid, text[]) to authenticated;

revoke execute on function crm.transfer_deal_pipeline(uuid, uuid, uuid) from public;
grant  execute on function crm.transfer_deal_pipeline(uuid, uuid, uuid) to authenticated;

revoke execute on function mkt.recompute_all_scores_inicial(uuid) from public;
grant  execute on function mkt.recompute_all_scores_inicial(uuid) to authenticated;

revoke execute on function public.current_role_in_workspace(uuid) from public;
grant  execute on function public.current_role_in_workspace(uuid) to authenticated;

revoke execute on function public.list_workspace_team(uuid) from public;
grant  execute on function public.list_workspace_team(uuid) to authenticated;

-- (b) revoga do PUBLIC, sem regrant — nenhum chamador legitimo
revoke execute on function core.bump_engajamento(uuid, text, text) from public;
revoke execute on function core.detect_numero_processo_in_message() from public;
revoke execute on function core.ingest_message(uuid, uuid, text, text, text, text, text, timestamptz, text) from public;
revoke execute on function core.ingest_message(uuid, uuid, text, text, text, text, text, timestamptz, text, text, text, text) from public;
revoke execute on function core.lookup_person_by_phone(uuid, text) from public;
revoke execute on function core.merge_persons(uuid, uuid) from public;
revoke execute on function core.record_human_message(uuid, uuid, uuid, text, text, text, text, timestamptz) from public;
revoke execute on function core.retract_deal_on_nina_rejection() from public;
revoke execute on function crm.ensure_default_pipeline(uuid) from public;
revoke execute on function crm.merge_processos(uuid, uuid, uuid) from public;
revoke execute on function mkt.on_attr_change() from public;
revoke execute on function mkt.recompute_score(uuid) from public;
revoke execute on function mkt.recompute_score_inicial(uuid) from public;
revoke execute on function public.apply_form_scoring(uuid, uuid) from public;
revoke execute on function public.apply_scoring(uuid, text, integer, text) from public;
revoke execute on function public.count_segment_leads(uuid, jsonb) from public;
revoke execute on function public.get_campaign_recipients(uuid) from public;
revoke execute on function public.provision_workspace_defaults() from public;
revoke execute on function public.simulate_campaign_send(uuid) from public;
revoke execute on function public.simulate_workflow_execution(uuid, uuid) from public;
revoke execute on function public.tier_of(integer, uuid) from public;
revoke execute on function public.trigger_workflow(uuid, uuid) from public;
revoke execute on function public.user_workspace_ids(uuid) from public;

commit;
