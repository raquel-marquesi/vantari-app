-- Bug reportado 16/09/2026: toda mensagem que um humano manda pelo /inbox
-- aparecia duplicada na conversa.
--
-- Causa raiz (confirmada em core.messages): duas escritas independentes pro
-- mesmo envio —
--   1. /conversation-send grava a mensagem na hora (sender='human',
--      external_message_id=null), assim que a Nina confirma que despachou.
--   2. A Nina, ao efetivamente entregar no WhatsApp, chama /ingest-message de
--      volta pra registrar o envio (sender='human', com o external_message_id
--      de verdade) — que caía no ramo "insert" de core.ingest_message porque
--      o conflito é só em (workspace_id, external_message_id), e a linha do
--      passo 1 tem external_message_id null (nunca colide).
-- Resultado: 2 linhas em core.messages pra 1 mensagem só, ~0.2-0.3s de
-- diferença, mesmo texto — exatamente o padrão visto na auditoria.
--
-- Fix: quando core.ingest_message recebe um external_message_id novo pra uma
-- mensagem sender='human'/direction='out', primeiro procura uma linha
-- "placeholder" recém-criada pelo /conversation-send (mesma conversa, mesmo
-- corpo/mídia, ainda sem external_message_id) e só COMPLETA ela — em vez de
-- inserir uma segunda. Mesma ideia já usada pro placeholder de áudio
-- "transcrevendo..." (atualiza a mesma linha em vez de duplicar).
create or replace function core.ingest_message(
  p_workspace uuid,
  p_person uuid,
  p_external_conversation_id text default null,
  p_direction text default 'in',
  p_sender text default 'customer',
  p_body text default null,
  p_external_message_id text default null,
  p_occurred_at timestamptz default now(),
  p_source text default 'nina',
  p_media_url text default null,
  p_media_type text default null,
  p_media_filename text default null
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
  v_display_body text;
  v_placeholder_id uuid;
begin
  if p_direction not in ('in', 'out') then
    raise exception 'direction inválido: %', p_direction;
  end if;
  if p_sender not in ('customer', 'nina', 'human') then
    raise exception 'sender inválido: %', p_sender;
  end if;

  v_display_body := coalesce(p_body, case
    when p_media_type like 'audio/%' then '[Áudio]'
    when p_media_url is not null then '[Arquivo]'
    else null
  end);

  perform pg_advisory_xact_lock(hashtextextended('core_conversation:' || p_workspace::text || ':' || p_person::text, 0));

  select cv.id, cv.status, (cv.archived_at is not null)
    into v_conversation_id, v_prior_status, v_was_archived
    from core.conversations cv
    where cv.workspace_id = p_workspace and cv.person_id = p_person;

  if v_conversation_id is null then
    insert into core.conversations as cv (workspace_id, person_id, external_conversation_id, status,
                                    last_message_at, last_message_body, last_message_sender)
    values (p_workspace, p_person, p_external_conversation_id, 'nina',
            p_occurred_at, v_display_body, p_sender)
    returning cv.id, cv.external_conversation_id into v_conversation_id, v_external_conversation_id;
    v_is_new := true;
    v_prior_status := 'nina';
  else
    update core.conversations as cv set
      external_conversation_id = coalesce(cv.external_conversation_id, p_external_conversation_id),
      last_message_at    = greatest(coalesce(cv.last_message_at, p_occurred_at), p_occurred_at),
      last_message_body  = v_display_body,
      last_message_sender = p_sender,
      archived_at = case when p_sender = 'customer' then null else cv.archived_at end,
      updated_at = now()
    where cv.id = v_conversation_id
    returning cv.external_conversation_id into v_external_conversation_id;
  end if;

  if p_external_message_id is not null and p_sender = 'human' and p_direction = 'out' then
    select m.id into v_placeholder_id
      from core.messages m
      where m.conversation_id = v_conversation_id
        and m.sender = 'human'
        and m.direction = 'out'
        and m.external_message_id is null
        and coalesce(m.body, '') = coalesce(p_body, '')
        and coalesce(m.media_url, '') = coalesce(p_media_url, '')
        and m.created_at >= p_occurred_at - interval '2 minutes'
      order by m.created_at desc
      limit 1;
  end if;

  if v_placeholder_id is not null then
    update core.messages set
      external_message_id = p_external_message_id,
      media_url = coalesce(media_url, p_media_url),
      media_type = coalesce(media_type, p_media_type),
      media_filename = coalesce(media_filename, p_media_filename),
      updated_at = now()
    where id = v_placeholder_id
    returning id into v_message_id;
  elsif p_external_message_id is not null then
    insert into core.messages (workspace_id, conversation_id, person_id, direction, sender,
                               body, external_message_id, created_at, updated_at,
                               media_url, media_type, media_filename)
    values (p_workspace, v_conversation_id, p_person, p_direction, p_sender,
            p_body, p_external_message_id, p_occurred_at, now(),
            p_media_url, p_media_type, p_media_filename)
    on conflict (workspace_id, external_message_id) do update set
      body = coalesce(excluded.body, core.messages.body),
      media_url = coalesce(excluded.media_url, core.messages.media_url),
      media_type = coalesce(excluded.media_type, core.messages.media_type),
      media_filename = coalesce(excluded.media_filename, core.messages.media_filename),
      updated_at = now()
    returning id into v_message_id;
  else
    insert into core.messages (workspace_id, conversation_id, person_id, direction, sender,
                               body, external_message_id, created_at, updated_at,
                               media_url, media_type, media_filename)
    values (p_workspace, v_conversation_id, p_person, p_direction, p_sender,
            p_body, null, p_occurred_at, now(),
            p_media_url, p_media_type, p_media_filename)
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

grant execute on function core.ingest_message(
  uuid, uuid, text, text, text, text, text, timestamptz, text, text, text, text
) to authenticated, service_role;

-- limpa as duplicatas já existentes: pra cada par (linha sem
-- external_message_id + linha com, mesmo texto/mídia, mesma conversa, até
-- 2min de diferença), apaga a linha "placeholder" sem external_message_id.
-- A conversa recalcula last_message_* sozinha na próxima mensagem, então não
-- precisa mexer em core.conversations aqui.
with dups as (
  select ph.id as placeholder_id
  from core.messages ph
  join core.messages real on
    real.conversation_id = ph.conversation_id
    and real.sender = 'human'
    and real.direction = 'out'
    and real.external_message_id is not null
    and coalesce(real.body, '') = coalesce(ph.body, '')
    and coalesce(real.media_url, '') = coalesce(ph.media_url, '')
    and real.created_at >= ph.created_at
    and real.created_at <= ph.created_at + interval '2 minutes'
  where ph.sender = 'human'
    and ph.direction = 'out'
    and ph.external_message_id is null
)
delete from core.messages where id in (select placeholder_id from dups);
