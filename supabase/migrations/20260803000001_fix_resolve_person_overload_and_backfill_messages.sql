-- ════════════════════════════════════════════════════════════════
-- INCIDENTE (fim de semana 01-02/ago): conversas da Nina sumiram do /inbox
-- ────────────────────────────────────────────────────────────────
-- CAUSA RAIZ: a migration 20260731000001_core_persons_utm_channel.sql criou
-- uma SEGUNDA versão de core.resolve_person (com params de UTM) em vez de
-- substituir a existente — ficaram duas funções com o mesmo nome (overload).
-- supabase-js sempre chama RPC por nome de parâmetro; qualquer chamador que
-- não manda os novos params de UTM (ingest-message, NovoContatoModal em
-- /leads, criação manual de negócio em /crm) passou a bater em "function
-- core.resolve_person(...) is not unique" — o Postgres não consegue mais
-- escolher qual das duas usar. Só /ingest continuou funcionando porque foi
-- o único ponto atualizado pra mandar os params de UTM também.
-- Resultado prático: desde 31/jul ~18:19 (última mensagem real registrada),
-- toda mensagem que a Nina mandou pro /ingest-message falhou silenciosamente
-- — o lead/evento/negócio continuavam sendo criados via /ingest (que não
-- quebrou), mas a conversa em si nunca chegava ao /inbox.
--
-- FIX: elimina a ambiguidade removendo a versão antiga (6 parâmetros) —
-- fica só a versão com UTM (que já tem default null pros parâmetros novos,
-- então nenhum chamador existente precisa mudar).
--
-- BACKFILL: os eventos core.events (type=whatsapp_in, gerados pelo /ingest,
-- que NÃO quebrou) guardam o conteúdo e a direção de cada mensagem da Nina
-- durante a janela quebrada — dá pra reconstruir a conversa inteira a partir
-- deles, replaying via core.ingest_message (a mesma função que o
-- /ingest-message chamaria se estivesse funcionando).
-- ════════════════════════════════════════════════════════════════

-- ── 1) elimina a ambiguidade: remove o overload antigo de 6 parâmetros ──
drop function if exists core.resolve_person(uuid, text, text, text, text, text);

-- ── 2) backfill: reconstrói core.conversations/core.messages a partir dos
--    eventos whatsapp_in que ficaram sem par em core.messages ──
do $$
declare
  r record;
  v_direction text;
  v_sender text;
  v_criadas int := 0;
  v_ignoradas int := 0;
begin
  for r in
    select id, workspace_id, person_id, payload, created_at
    from core.events
    where type = 'whatsapp_in'
      and payload->>'direction' is not null
      and person_id is not null
      and created_at > (select coalesce(max(created_at), '2000-01-01'::timestamptz) from core.messages)
    order by created_at
  loop
    if r.payload->>'direction' = 'inbound' then
      v_direction := 'in';
      v_sender := 'customer';
    elsif r.payload->>'direction' = 'outbound' then
      v_direction := 'out';
      v_sender := 'nina';
    else
      v_ignoradas := v_ignoradas + 1;
      continue;
    end if;

    perform core.ingest_message(
      p_workspace              := r.workspace_id,
      p_person                 := r.person_id,
      p_external_conversation_id := null,
      p_direction              := v_direction,
      p_sender                 := v_sender,
      p_body                   := r.payload->>'content',
      p_external_message_id    := 'backfill-event-' || r.id::text,
      p_occurred_at            := r.created_at,
      p_source                 := 'nina'
    );
    v_criadas := v_criadas + 1;
  end loop;

  raise notice 'mensagens reconstruídas: %, eventos ignorados (sem direção válida): %', v_criadas, v_ignoradas;
end $$;
