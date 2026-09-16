-- Segue o fix da duplicação de mensagens humanas no /inbox
-- (20260916000001_fix_inbox_human_message_duplication.sql).
--
-- Depois de aplicar aquela migration, uma auditoria mais ampla achou pares
-- de duplicata em ORDEM INVERTIDA: a linha com external_message_id (a
-- chamada da Nina em /ingest-message, confirmando o despacho real no
-- WhatsApp) às vezes commita ANTES da linha sem external_message_id
-- (o insert direto que /conversation-send fazia). O fix anterior só
-- procurava o placeholder no passado (created_at >= p_occurred_at - 2min),
-- então não pegava esse caso — a corrida pode ir nos dois sentidos,
-- dependendo de qual das duas chamadas de rede é mais rápida.
--
-- Fix definitivo: em vez de duas escritas independentes (uma via insert
-- direto em /conversation-send, outra via core.ingest_message), as duas
-- passam a usar o MESMO advisory lock por conversa (já existia em
-- core.ingest_message) e o mesmo texto/mídia como chave de dedup, olhando
-- pra trás E pra frente no tempo. Sob o lock, a segunda chamada sempre
-- enxerga (ou nunca vai deixar de enxergar) o que a primeira já commitou,
-- então não tem mais janela de corrida.
--
-- core.record_human_message() é a nova função que /conversation-send passa
-- a chamar via RPC em vez de inserir direto na tabela.

create or replace function core.record_human_message(
  p_workspace uuid,
  p_conversation_id uuid,
  p_person uuid,
  p_body text default null,
  p_media_url text default null,
  p_media_type text default null,
  p_media_filename text default null,
  p_occurred_at timestamptz default now()
) returns table (message_id uuid, created_new boolean)
language plpgsql
security definer
set search_path to 'core', 'public'
as $function$
declare
  v_message_id uuid;
  v_existing_id uuid;
  v_display_body text;
begin
  perform pg_advisory_xact_lock(hashtextextended('core_conversation:' || p_workspace::text || ':' || p_person::text, 0));

  -- a Nina pode já ter confirmado o despacho real (via /ingest-message,
  -- external_message_id preenchido) antes desta chamada rodar — não cria
  -- uma segunda linha nesse caso, só devolve a que já existe
  select m.id into v_existing_id
    from core.messages m
    where m.conversation_id = p_conversation_id
      and m.sender = 'human'
      and m.direction = 'out'
      and m.external_message_id is not null
      and coalesce(m.body, '') = coalesce(p_body, '')
      and coalesce(m.media_url, '') = coalesce(p_media_url, '')
      and m.created_at between p_occurred_at - interval '2 minutes' and p_occurred_at + interval '2 minutes'
    order by m.created_at desc
    limit 1;

  if v_existing_id is not null then
    return query select v_existing_id, false;
    return;
  end if;

  v_display_body := coalesce(p_body, case
    when p_media_type like 'audio/%' then '[Áudio]'
    when p_media_url is not null then '[Arquivo]'
    else null
  end);

  insert into core.messages (workspace_id, conversation_id, person_id, direction, sender,
                             body, external_message_id, created_at, updated_at,
                             media_url, media_type, media_filename)
  values (p_workspace, p_conversation_id, p_person, 'out', 'human',
          p_body, null, p_occurred_at, now(),
          p_media_url, p_media_type, p_media_filename)
  returning id into v_message_id;

  update core.conversations set
    last_message_at = greatest(coalesce(last_message_at, p_occurred_at), p_occurred_at),
    last_message_body = v_display_body,
    last_message_sender = 'human',
    updated_at = now()
  where id = p_conversation_id;

  return query select v_message_id, true;
end;
$function$;

grant execute on function core.record_human_message(
  uuid, uuid, uuid, text, text, text, text, timestamptz
) to authenticated, service_role;

-- amplia a janela de busca do placeholder em core.ingest_message pro mesmo
-- sentido (pra frente também, não só pra trás) — cobre o caso em que a Nina
-- chega primeiro e o insert direto (agora substituído por
-- record_human_message, mas pode haver chamadas em trânsito no momento do
-- deploy) commita alguns instantes depois.
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
        and m.created_at between p_occurred_at - interval '2 minutes' and p_occurred_at + interval '2 minutes'
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

-- limpeza (2ª passada): a versão anterior só apagava pares onde a linha
-- "real" (com external_message_id) veio DEPOIS da placeholder — perdia os
-- casos de ordem invertida. Esta apaga qualquer par duplicado nos dois
-- sentidos, sempre mantendo a linha com external_message_id (é a confirmada
-- pela Nina como realmente despachada).
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
    and real.created_at between ph.created_at - interval '2 minutes' and ph.created_at + interval '2 minutes'
  where ph.sender = 'human'
    and ph.direction = 'out'
    and ph.external_message_id is null
)
delete from core.messages where id in (select placeholder_id from dups);
