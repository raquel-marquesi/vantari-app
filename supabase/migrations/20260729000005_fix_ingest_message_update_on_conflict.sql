-- Bug real encontrado em produção (29/07/2026, print da Catarina): mensagens
-- de áudio ficavam para sempre com o texto "[áudio - processando
-- transcrição...]" no /inbox, mesmo depois de passado tempo suficiente pra
-- transcrição terminar.
--
-- Causa: core.ingest_message (criada em 20260729000004) usava
-- "on conflict (workspace_id, external_message_id) do nothing" ao inserir a
-- mensagem. Isso foi pensado só pra evitar duplicar quando a Nina reenvia o
-- MESMO evento (idempotência) — mas também significa que se a Nina chamar
-- ingest-message de novo com o MESMO external_message_id só que agora com o
-- texto já transcrito (fluxo natural: manda o placeholder na hora, manda o
-- texto real depois que a transcrição termina), a atualização era
-- silenciosamente descartada e o placeholder ficava preso pra sempre.
--
-- Fix: trocar pra "do update set body = ..." — a primeira chamada cria a
-- mensagem, qualquer chamada seguinte com o mesmo external_message_id
-- ATUALIZA o body (ex: troca o placeholder pelo texto transcrito) em vez de
-- criar uma segunda linha ou ser ignorada.

alter table core.messages add column if not exists updated_at timestamptz not null default now();

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
) returns table (conversation_id uuid, message_id uuid, is_new_conversation boolean)
language plpgsql
security definer
set search_path to 'core', 'public'
as $function$
declare
  v_conversation_id uuid;
  v_message_id uuid;
  v_is_new boolean := false;
begin
  if p_direction not in ('in', 'out') then
    raise exception 'direction inválido: %', p_direction;
  end if;
  if p_sender not in ('customer', 'nina', 'human') then
    raise exception 'sender inválido: %', p_sender;
  end if;

  -- trava por pessoa: serializa mensagens quase simultâneas da mesma conversa
  perform pg_advisory_xact_lock(hashtextextended('core_conversation:' || p_workspace::text || ':' || p_person::text, 0));

  select id into v_conversation_id from core.conversations
    where workspace_id = p_workspace and person_id = p_person;

  if v_conversation_id is null then
    insert into core.conversations (workspace_id, person_id, external_conversation_id, status,
                                    last_message_at, last_message_body, last_message_sender)
    values (p_workspace, p_person, p_external_conversation_id, 'nina',
            p_occurred_at, p_body, p_sender)
    returning id into v_conversation_id;
    v_is_new := true;
  else
    update core.conversations set
      external_conversation_id = coalesce(external_conversation_id, p_external_conversation_id),
      last_message_at    = greatest(coalesce(last_message_at, p_occurred_at), p_occurred_at),
      last_message_body  = p_body,
      last_message_sender = p_sender,
      updated_at = now()
    where id = v_conversation_id;
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

  return query select v_conversation_id, v_message_id, v_is_new;
end $function$;
