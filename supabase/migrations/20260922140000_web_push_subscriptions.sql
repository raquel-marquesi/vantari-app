-- Web Push (Etapa 5, parte 2/2 — junto com Pop-ups fecha a Etapa "Conversão").
-- Mesma convenção de public.tracked_pages/page_visits: sem workspace_id
-- (app single-tenant hoje, só a sala Vantari), lead_id aponta pro legado
-- public.leads (mesmo padrão que page_visits.lead_id já usa via /track).
create table if not exists public.push_subscriptions (
  id               uuid primary key default gen_random_uuid(),
  lead_id          uuid references public.leads(id) on delete set null,
  visitor_id       text,
  endpoint         text not null unique,
  p256dh           text not null,
  auth             text not null,
  url              text,
  user_agent       text,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  unsubscribed_at  timestamptz
);

comment on table public.push_subscriptions is
  'Inscrições de notificação push do navegador (Web Push), capturadas por Vantari.enablePush() no tracker.js. Envio via Edge Function send-web-push.';
comment on column public.push_subscriptions.endpoint is
  'URL única do provedor de push do navegador (FCM/Mozilla/etc.) — é a "identidade" da inscrição, por isso é UNIQUE (upsert por endpoint).';

create index if not exists idx_push_subscriptions_active on public.push_subscriptions (active) where active;
create index if not exists idx_push_subscriptions_lead on public.push_subscriptions (lead_id) where lead_id is not null;

alter table public.push_subscriptions enable row level security;

-- Mesmo padrão de RLS "aberta pra dev" do resto do projeto (ver CLAUDE.md,
-- Behavioral rules): usuário autenticado do app pode ler/gerenciar. Inserts
-- de visitantes anônimos só acontecem via Edge Function push-subscribe
-- (service role, ignora RLS) — nunca direto do navegador com a anon key.
create policy "authenticated read push_subscriptions" on public.push_subscriptions
  for select to authenticated using (true);
create policy "authenticated manage push_subscriptions" on public.push_subscriptions
  for update to authenticated using (true);
