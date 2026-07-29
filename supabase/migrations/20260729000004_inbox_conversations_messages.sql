-- Inbox de Atendimento (pedido da Catarina, 29/07/2026): área pra equipe humana
-- acompanhar e assumir as conversas que a Nina conduz no WhatsApp, no estilo
-- RD Conversas/Zendesk. Duas tabelas novas no core canônico:
--
--   core.conversations — uma linha por pessoa em atendimento (1 thread por
--   person_id, reaproveitada ao longo do tempo, igual uma conversa contínua
--   de WhatsApp). status 'nina' (IA responde) ou 'human' (equipe assumiu) —
--   é ESSA coluna que a Nina consulta antes de responder.
--
--   core.messages — cada mensagem trocada (cliente/Nina/humano), com
--   external_message_id pra idempotência (a Nina pode reenviar o mesmo
--   evento sem duplicar).
--
-- RLS segue o mesmo padrão hardened já aplicado em 0003 (core.current_workspace_ids()).
-- Ambas as tabelas entram na publication de Realtime pra tela do /inbox
-- atualizar sozinha sem polling.

create table if not exists core.conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  person_id uuid not null references core.persons(id) on delete cascade,
  channel text not null default 'whatsapp',
  external_conversation_id text,
  status text not null default 'nina' check (status in ('nina', 'human')),
  assigned_user_id uuid references auth.users(id) on delete set null,
  last_message_at timestamptz,
  last_message_body text,
  last_message_sender text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, person_id)
);

create table if not exists core.messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  conversation_id uuid not null references core.conversations(id) on delete cascade,
  person_id uuid not null references core.persons(id) on delete cascade,
  direction text not null check (direction in ('in', 'out')),
  sender text not null check (sender in ('customer', 'nina', 'human')),
  body text,
  external_message_id text,
  created_at timestamptz not null default now(),
  inserted_at timestamptz not null default now(),
  unique (workspace_id, external_message_id)
);

create index if not exists idx_messages_conversation on core.messages (conversation_id, created_at);
create index if not exists idx_conversations_workspace_last on core.conversations (workspace_id, last_message_at desc);

alter table core.conversations replica identity full;
alter table core.messages replica identity full;

alter table core.conversations enable row level security;
alter table core.messages enable row level security;

drop policy if exists conversations_rw on core.conversations;
create policy conversations_rw on core.conversations
  for all using (workspace_id in (select core.current_workspace_ids()));

drop policy if exists messages_rw on core.messages;
create policy messages_rw on core.messages
  for all using (workspace_id in (select core.current_workspace_ids()));

grant select, insert, update on core.conversations to authenticated, service_role;
grant select, insert, update on core.messages to authenticated, service_role;

-- entrar na publication de Realtime (lista + chat atualizam sem F5)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'core' and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table core.conversations;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'core' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table core.messages;
  end if;
end $$;

-- RPC chamada pela Edge Function ingest-message (Nina → Next, uma vez por
-- mensagem). Reaproveita o padrão de trava consultiva do resolve_person pra
-- não duplicar a conversa quando a Nina mandar duas mensagens quase juntas.
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
    select id into v_message_id from core.messages
      where workspace_id = p_workspace and external_message_id = p_external_message_id;
  end if;

  if v_message_id is null then
    insert into core.messages (workspace_id, conversation_id, person_id, direction, sender,
                               body, external_message_id, created_at)
    values (p_workspace, v_conversation_id, p_person, p_direction, p_sender,
            p_body, p_external_message_id, p_occurred_at)
    on conflict (workspace_id, external_message_id) do nothing
    returning id into v_message_id;

    if v_message_id is null then
      select id into v_message_id from core.messages
        where workspace_id = p_workspace and external_message_id = p_external_message_id;
    end if;
  end if;

  return query select v_conversation_id, v_message_id, v_is_new;
end $function$;

grant execute on function core.ingest_message(uuid, uuid, text, text, text, text, text, timestamptz, text) to authenticated, service_role;
