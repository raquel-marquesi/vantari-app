-- 010 - Integration credentials (Meta Ads, Google Ads, etc.)
-- Persiste API keys, OAuth tokens e configuracoes por provider.

create type integration_provider as enum (
  'meta',
  'google',
  'whatsapp',
  'webhook'
);

create type integration_status as enum (
  'disconnected',
  'pending',
  'connected',
  'expired',
  'error'
);

create table if not exists integration_credentials (
  id              uuid primary key default gen_random_uuid(),
  provider        integration_provider not null unique,
  status          integration_status   not null default 'disconnected',

  -- OAuth app credentials (configurados manualmente)
  client_id       text,
  client_secret   text,

  -- Tokens recebidos do provedor (apos OAuth)
  access_token    text,
  refresh_token   text,
  expires_at      timestamptz,
  scope           text,

  -- Identificadores no provedor (ex: ad_account_id, customer_id)
  account_id      text,

  -- Config extra (jsonb): pixel_id, form_ids, conversion_actions, etc.
  config          jsonb not null default '{}'::jsonb,

  -- Estado de sync
  last_sync       timestamptz,
  error_message   text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_integration_credentials_provider on integration_credentials(provider);
create index if not exists idx_integration_credentials_status   on integration_credentials(status);

-- Trigger updated_at
create or replace function tg_integration_credentials_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_integration_credentials_updated_at on integration_credentials;
create trigger trg_integration_credentials_updated_at
  before update on integration_credentials
  for each row execute function tg_integration_credentials_updated_at();

-- RLS - permissivo em dev (trocar por auth.uid() em producao)
alter table integration_credentials enable row level security;

drop policy if exists integration_credentials_all on integration_credentials;
create policy integration_credentials_all
  on integration_credentials for all using (true) with check (true);

-- Seed: cria registros 'disconnected' para os 4 providers
insert into integration_credentials (provider, status)
values
  ('meta',     'disconnected'),
  ('google',   'disconnected'),
  ('whatsapp', 'disconnected'),
  ('webhook',  'disconnected')
on conflict (provider) do nothing;
