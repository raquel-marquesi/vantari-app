-- ════════════════════════════════════════════════════════════════
-- Persistência real para a tela /settings (Configurações)
-- ────────────────────────────────────────────────────────────────
-- Problema: as abas Workspace, Avançado e Audit Log usavam apenas estado
-- em memória (MOCK_* / useState local) — tudo resetava ao recarregar a
-- página. As tabelas abaixo já estavam documentadas em comentário no
-- topo do arquivo vantari-settings-admin.jsx mas nunca foram criadas de
-- fato. Isto aqui cria e o front passa a ler/escrever de verdade.
--
-- Billing e Suporte continuam como prévia (dependem de Stripe/helpdesk
-- que a empresa ainda não tem) — não criam tabela.
-- ════════════════════════════════════════════════════════════════

-- 1 linha de configuração por workspace (identidade, branding, região,
-- LGPD/retenção e feature flags — tudo que hoje é "Workspace" + parte
-- de "Avançado")
create table if not exists public.workspace_settings (
  workspace_id   uuid primary key references public.workspaces(id) on delete cascade,
  company_name   text not null default 'Vantari',
  domain         text,
  logo_url       text,
  primary_color  text not null default '#0D7491',
  timezone       text not null default 'America/Sao_Paulo',
  date_format    text not null default 'DD/MM/YYYY',
  language       text not null default 'pt-BR',
  lgpd_enabled   boolean not null default true,
  retention_days text not null default '365',
  feature_flags  jsonb not null default '{"ai_assistant":true,"beta_scoring":false,"dark_mode":false,"bulk_import":true}'::jsonb,
  updated_at     timestamptz not null default now()
);

create table if not exists public.api_keys (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  name          text not null,
  key_hash      text not null,
  key_prefix    text not null default 'vnt_live',
  scopes        text[] not null default '{}',
  last_used_at  timestamptz,
  expires_at    timestamptz,
  created_at    timestamptz not null default now(),
  revoked_at    timestamptz
);

create table if not exists public.webhook_endpoints (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references public.workspaces(id) on delete cascade,
  name           text not null,
  url            text not null,
  secret         text,
  events         text[] not null default '{}',
  enabled        boolean not null default true,
  last_triggered timestamptz,
  fail_count     int not null default 0,
  created_at     timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_email   text,
  action       text not null,   -- 'created' | 'updated' | 'deleted' | 'invited'
  resource     text not null,   -- 'team_members' | 'custom_fields' | 'tracked_pages' | 'workspace_settings' | 'api_keys' | 'webhook_endpoints'
  resource_id  text,
  details      jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists audit_logs_ws_created_idx
  on public.audit_logs (workspace_id, created_at desc);

alter table public.workspace_settings  enable row level security;
alter table public.api_keys            enable row level security;
alter table public.webhook_endpoints   enable row level security;
alter table public.audit_logs          enable row level security;

-- mesma convenção do resto do public.* neste banco: RLS aberta pra
-- authenticated em dev.
drop policy if exists workspace_settings_rw on public.workspace_settings;
create policy workspace_settings_rw on public.workspace_settings for all to authenticated
  using (true) with check (true);

drop policy if exists api_keys_rw on public.api_keys;
create policy api_keys_rw on public.api_keys for all to authenticated
  using (true) with check (true);

drop policy if exists webhook_endpoints_rw on public.webhook_endpoints;
create policy webhook_endpoints_rw on public.webhook_endpoints for all to authenticated
  using (true) with check (true);

drop policy if exists audit_logs_rw on public.audit_logs;
create policy audit_logs_rw on public.audit_logs for all to authenticated
  using (true) with check (true);

grant select, insert, update, delete on public.workspace_settings, public.api_keys, public.webhook_endpoints, public.audit_logs to authenticated;
grant all on public.workspace_settings, public.api_keys, public.webhook_endpoints, public.audit_logs to service_role;

-- seed: workspace único Vantari já com identidade real (era "Empresa LTDA")
insert into public.workspace_settings (workspace_id, company_name, domain)
values ('53092199-7b75-4342-a897-f589d6f34922', 'Vantari', 'vantari.com.br')
on conflict (workspace_id) do nothing;

-- ────────────────────────────────────────────────────────────────
-- Fix de dado: team_members mostrava os 3 membros reais como
-- role=admin / status=invited. Por CLAUDE.md, só raquel@vantari.com.br
-- é Admin; catarina e gustavo são Membro (mapeado aqui pra 'manager',
-- já que 'user' no ROLE_DEFAULTS do front não tem acesso a Analytics/
-- Integrações que ambos usam no dia a dia). Os 3 já são contas ativas
-- no Supabase Auth, não convites pendentes.
-- ────────────────────────────────────────────────────────────────
update public.team_members set role = 'admin', status = 'active'
  where email = 'raquel@vantari.com.br';
update public.team_members set role = 'manager', status = 'active'
  where email in ('catarina.quartucci@vantari.com.br', 'gustavo@vantari.com.br');
