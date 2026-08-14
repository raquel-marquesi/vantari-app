-- Investigação pedida pela Catarina (04/08/2026): a Nina continua respondendo
-- no WhatsApp mesmo depois que um humano assume a conversa (status='human').
-- Teste real: a conversa do Jorge Costa Cerqueira ficou com status='human' o
-- dia inteiro (assigned_user_id preenchido, atendente já tinha mandado
-- mensagem), o cliente respondeu "Tudo" — e a Nina emendou uma triagem
-- inteira logo em seguida ("Oi, J! Sou a Nina, da Vantari." → pergunta sobre
-- processo trabalhista → etc.), com o status continuando 'human' o tempo
-- todo em core.conversations (confirmado via SQL).
--
-- Conclusão da investigação: o Next já faz a parte que cabe a ele — a Edge
-- Function /conversation-takeover chama o webhook da Nina
-- (NINA_API_URL/conversation-status) toda vez que alguém clica "Assumir" ou
-- "Devolver pra Nina", exatamente pra avisar ela do status. Não existe
-- nenhum código aqui que devesse estar bloqueando a Nina de responder e não
-- está — o bug de ela responder mesmo assim é do lado do backend dela (não
-- está consultando esse status antes de responder, ou perdeu essa
-- informação nalgum reset de sessão). Isso não é corrigível só com mudanças
-- neste código; precisa de ajuste do lado da Nina (ver mensagem separada
-- pra quem administra a sessão dela).
--
-- O que ESTE arquivo faz (mitigação/observabilidade do lado do Next):
--
--  1. core.ingest_message passa a registrar em core.events (type
--     'nina_replied_during_human') toda vez que uma mensagem chega com
--     sender='nina' para uma conversa cujo status ANTES dessa chamada já
--     era 'human' — cria uma trilha auditável (antes só dava pra descobrir
--     isso rodando SQL manual).
--  2. A função agora também retorna o status anterior à chamada e o
--     external_conversation_id, pra Edge Function poder reenviar o aviso de
--     status pra Nina como reforço (ver ingest-message/index.ts).
--
-- Isso NÃO impede a mensagem de já ter sido enviada pro cliente (a Nina já
-- respondeu antes de nos avisar) — só deixa rastro auditável (banner em
-- /inbox lê esse evento) e reforça o aviso de status, reduzindo a chance de
-- repetir na mensagem seguinte.

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
begin
  if p_direction not in ('in', 'out') then
    raise exception 'direction inválido: %', p_direction;
  end if;
  if p_sender not in ('customer', 'nina', 'human') then
    raise exception 'sender inválido: %', p_sender;
  end if;

  -- trava por pessoa: serializa mensagens quase simultâneas da mesma conversa
  perform pg_advisory_xact_lock(hashtextextended('core_conversation:' || p_workspace::text || ':' || p_person::text, 0));

  -- alias "cv" evita ambiguidade: o parâmetro de retorno
  -- "external_conversation_id" tem o mesmo nome da coluna da tabela, e
  -- PL/pgSQL trata parâmetros de RETURNS TABLE como variáveis implícitas.
  select cv.id, cv.status into v_conversation_id, v_prior_status from core.conversations cv
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
      updated_at = now()
    where cv.id = v_conversation_id
    returning cv.external_conversation_id into v_external_conversation_id;
  end if;

  if p_external_message_id is not null then
    -- upsert de verdade: 1ª vez cria, chamadas seguintes com o mesmo id
    -- ATUALIZAM o body (ex: placeholder de áudio → texto transcrito)
    insert into core.messages (workspace_id, conversation_id, person_id, direction, sender,
                               body, external_message_id, created_at, updated_at)
    values (p_workspace, v_conversation_id, p_person, p_direction, p_sender,
            p_body, p_external_message_id, p_occurred_at, now())
    on conflict (workspace_id, external_message_id) do update set
      body = coalesce(excluded.body, core.messages.body),
      updated_at = now()
    returning id into v_message_id;
  else
    -- sem external_message_id não dá pra deduplicar/atualizar — sempre insere
    insert into core.messages (workspace_id, conversation_id, person_id, direction, sender,
                               body, external_message_id, created_at, updated_at)
    values (p_workspace, v_conversation_id, p_person, p_direction, p_sender,
            p_body, null, p_occurred_at, now())
    returning id into v_message_id;
  end if;

  -- flagra o drift: Nina respondeu (out) mesmo com a conversa já em 'human'
  -- ANTES dessa mensagem chegar (v_prior_status foi lido antes do update)
  if p_sender = 'nina' and p_direction = 'out' and v_prior_status = 'human' then
    insert into core.events (workspace_id, person_id, source, type, payload)
    values (p_workspace, p_person, 'nina', 'nina_replied_during_human', jsonb_build_object(
      'conversation_id', v_conversation_id,
      'message_id', v_message_id,
      'body', p_body,
      'occurred_at', p_occurred_at
    ));
  end if;

  return query select v_conversation_id, v_message_id, v_is_new, v_prior_status, v_external_conversation_id;
end $function$;

grant execute on function core.ingest_message(uuid, uuid, text, text, text, text, text, timestamptz, text) to authenticated, service_role;
