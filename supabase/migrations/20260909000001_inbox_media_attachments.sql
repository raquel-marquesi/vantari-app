-- Anexos (arquivo/áudio) no Atendimento (/inbox) — pedido do time, 09/09/2026.
-- Adiciona suporte a mídia nas mensagens trocadas com a Nina:
--
--   SAÍDA (humano → cliente, via /inbox): o Vantari sobe o arquivo/áudio no
--   bucket privado "inbox-media" (Storage), gera uma signed URL e manda pra
--   Nina junto com a mensagem (conversation-send) — ela baixa dessa URL e
--   despacha pelo WhatsApp de verdade.
--
--   ENTRADA (cliente → Nina pelo WhatsApp): a Nina hospeda a mídia recebida
--   do lado dela e manda a URL (pública/acessível) via /ingest-message — o
--   Vantari só guarda e exibe essa URL, não faz cópia.
--
-- Contrato combinado com quem cuida da Nina em docs/NINA_MEDIA_ATTACHMENTS.md.

alter table core.messages
  add column if not exists media_url text,
  add column if not exists media_type text,
  add column if not exists media_filename text;

-- bucket privado só pra anexos enviados PELO Vantari (saída) — a mídia
-- recebida do cliente fica hospedada do lado da Nina, aqui só guardamos a URL.
insert into storage.buckets (id, name, public)
values ('inbox-media', 'inbox-media', false)
on conflict (id) do nothing;

drop policy if exists "inbox-media authenticated read" on storage.objects;
create policy "inbox-media authenticated read" on storage.objects
  for select to authenticated
  using (bucket_id = 'inbox-media');

drop policy if exists "inbox-media authenticated write" on storage.objects;
create policy "inbox-media authenticated write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'inbox-media');

-- core.ingest_message ganha 3 parâmetros novos (com default, no final da
-- lista — não quebra quem já chama sem eles). Não muda o RETURNS TABLE, então
-- não precisa dropar a função antes (CREATE OR REPLACE aceita adicionar
-- parâmetro com default no fim mantendo o mesmo OID/grants).
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
  -- texto mostrado na lista de conversas (last_message_body) quando a
  -- mensagem é só mídia, sem legenda — a bolha em si (core.messages.body)
  -- continua guardando p_body cru (pode ser null), quem decide como
  -- desenhar é o /inbox olhando media_type
  v_display_body text;
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

  if p_external_message_id is not null then
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
