-- Achado ao investigar o report da Catarina (05/08/2026): depois da migração
-- da Nina pra Evolution API na Cloudfy, ela reportou que "os dados chegam e
-- são aceitos pelo ingest-message (person_id/conversation_id/message_id
-- retornados), mas não aparecem no /inbox".
--
-- Causa raiz encontrada via SQL: a conversa JÁ EXISTIA e tinha sido encerrada
-- antes (core.conversations.archived_at preenchido, via botão "Encerrar" no
-- /inbox — task #92). Quando o cliente manda mensagem NOVA numa conversa já
-- encerrada, core.ingest_message atualiza last_message_at/body normalmente,
-- mas nunca limpava archived_at — a conversa continuava marcada como
-- encerrada mesmo tendo mensagem novíssima. A tela /inbox filtra por
-- Ativas/Encerradas (view === "active" exclui archived_at != null por
-- padrão), então a conversa ficava escondida na aba errada.
--
-- Achadas 5 conversas reais nesse estado (cliente respondeu depois do
-- encerramento e ninguém via, incluindo uma conversa de teste da própria
-- Catarina com 6 mensagens novas depois do "encerrar").
--
-- Fix:
--  1. core.ingest_message: quando quem manda é o cliente (sender='customer')
--     numa conversa que já está com archived_at preenchido, reabre
--     (archived_at = null) automaticamente — mesmo comportamento de
--     Zendesk/Intercom: resposta do cliente reabre o ticket.
--  2. Backfill: reabre agora as conversas já presas nesse estado.

drop function if exists core.ingest_message(uuid,uuid,text,text,text,text,text,timestamptz,text);

create or replace function core.ingest_message(
  p_workspace uuid,
  p_person uuid,
  p_external_conversation_id text default null,
  p_direction text default 'in',
  p_sender text default 'customer',
  p_body text default null,
  p_external_message_id text default null,
  p_occurred_at timestamptz default now(),
  p_source text default 'nina'
) returns table (conversation_id uuid, message_id uuid, is_new_conversation boolean,
                  prior_status text, external_conversation_id text)
language plpgsql
security definer
set search_path to 'core', 'public'
as $function$
declare
  v_conversation_id uuid;
  v_message_id uuid;
  v_is_new boolean := false;
  v_prior_status text;
  v_external_conversation_id text;
  v_was_archived boolean := false;
begin
  if p_direction not in ('in', 'out') then
    raise exception 'direction inválido: %', p_direction;
  end if;
  if p_sender not in ('customer', 'nina', 'human') then
    raise exception 'sender inválido: %', p_sender;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('core_conversation:' || p_workspace::text || ':' || p_person::text, 0));

  select cv.id, cv.status, (cv.archived_at is not null)
    into v_conversation_id, v_prior_status, v_was_archived
    from core.conversations cv
    where cv.workspace_id = p_workspace and cv.person_id = p_person;

  if v_conversation_id is null then
    insert into core.conversations as cv (workspace_id, person_id, external_conversation_id, status,
                                    last_message_at, last_message_body, last_message_sender)
    values (p_workspace, p_person, p_external_conversation_id, 'nina',
            p_occurred_at, p_body, p_sender)
    returning cv.id, cv.external_conversation_id into v_conversation_id, v_external_conversation_id;
    v_is_new := true;
    v_prior_status := 'nina';
  else
    update core.conversations as cv set
      external_conversation_id = coalesce(cv.external_conversation_id, p_external_conversation_id),
      last_message_at    = greatest(coalesce(cv.last_message_at, p_occurred_at), p_occurred_at),
      last_message_body  = p_body,
      last_message_sender = p_sender,
      -- resposta do cliente reabre a conversa se ela estava encerrada —
      -- sem isso, a mensagem nova fica invisível na aba "Ativas" do /inbox
      archived_at = case when p_sender = 'customer' then null else cv.archived_at end,
      updated_at = now()
    where cv.id = v_conversation_id
    returning cv.external_conversation_id into v_external_conversation_id;
  end if;

  if p_external_message_id is not null then
    insert into core.messages (workspace_id, conversation_id, person_id, direction, sender,
                               body, external_message_id, created_at, updated_at)
    values (p_workspace, v_conversation_id, p_person, p_direction, p_sender,
            p_body, p_external_message_id, p_occurred_at, now())
    on conflict (workspace_id, external_message_id) do update set
      body = coalesce(excluded.body, core.messages.body),
      updated_at = now()
    returning id into v_message_id;
  else
    insert into core.messages (workspace_id, conversation_id, person_id, direction, sender,
                               body, external_message_id, created_at, updated_at)
    values (p_workspace, v_conversation_id, p_person, p_direction, p_sender,
            p_body, null, p_occurred_at, now())
    returning id into v_message_id;
  end if;

  if p_sender = 'nina' and p_direction = 'out' and v_prior_status = 'human' then
    insert into core.events (workspace_id, person_id, source, type, payload)
    values (p_workspace, p_person, 'nina', 'nina_replied_during_human', jsonb_build_object(
      'conversation_id', v_conversation_id,
      'message_id', v_message_id,
      'body', p_body,
      'occurred_at', p_occurred_at
    ));
  end if;

  if p_sender = 'customer' and v_was_archived then
    insert into core.events (workspace_id, person_id, source, type, payload)
    values (p_workspace, p_person, p_source, 'conversation_reopened_by_customer', jsonb_build_object(
      'conversation_id', v_conversation_id,
      'message_id', v_message_id,
      'occurred_at', p_occurred_at
    ));
  end if;

  return query select v_conversation_id, v_message_id, v_is_new, v_prior_status, v_external_conversation_id;
end $function$;

grant execute on function core.ingest_message(uuid, uuid, text, text, text, text, text, timestamptz, text) to authenticated, service_role;

-- backfill: reabre agora as conversas que já ficaram presas nesse estado
-- (mensagem de cliente chegou depois do encerramento, sem reabrir sozinha)
update core.conversations c
   set archived_at = null, updated_at = now()
 where c.archived_at is not null
   and exists (
     select 1 from core.messages m
      where m.conversation_id = c.id
        and m.sender = 'customer'
        and m.created_at > c.archived_at
   );
