-- ════════════════════════════════════════════════════════════════
-- ai_settings + ai_generations — persistência real da aba IA & Automação
-- ────────────────────────────────────────────────────────────────
-- Problema: a tela /ai-marketing usava MOCK_SETTINGS em memória (nada
-- persistia — recarregar a página resetava modelo/temperatura/prompts
-- customizados) e a aba "Histórico & Analytics" nunca tinha nenhum dado
-- (nada gravava as gerações feitas nas outras abas). O rodapé da própria
-- tela já chegou a expor o SQL pretendido (ai_generations) mas nunca foi
-- de fato criado — isto aqui cria de verdade e o front passa a ler/escrever.
--
-- Simples de propósito: 1 linha de configuração por workspace, e um log
-- append-only de gerações (email/subject/summary/personalization).
-- ════════════════════════════════════════════════════════════════

create table if not exists public.ai_settings (
  workspace_id     uuid primary key references public.workspaces(id) on delete cascade,
  model_preference text not null default 'gemini-flash-latest',
  temperature      numeric(3,2) not null default 0.7,
  custom_prompts   jsonb not null default '{
    "email":   "Você é um copywriter especialista em marketing B2B brasileiro. Escreva emails persuasivos, claros e com boa entregabilidade.",
    "subject": "Gere assuntos de email com alta taxa de abertura para público B2B brasileiro.",
    "summary": "Analise as interações de um lead e gere um resumo estratégico em português."
  }'::jsonb,
  updated_at       timestamptz not null default now()
);

create table if not exists public.ai_generations (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  type         text not null check (type in ('email','subject','summary','personalization')),
  prompt       text not null,
  result       text not null,
  model        text not null,
  temperature  numeric(3,2),
  tokens       integer default 0,
  rating       smallint check (rating between 1 and 5),
  used         boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists ai_generations_ws_created_idx
  on public.ai_generations (workspace_id, created_at desc);

alter table public.ai_settings     enable row level security;
alter table public.ai_generations  enable row level security;

-- mesma convenção do resto do public.* neste banco: RLS aberta pra
-- authenticated em dev (endurece pra auth.uid()/membership antes de prod,
-- igual ao resto das tabelas legadas do workspace único).
drop policy if exists ai_settings_rw on public.ai_settings;
create policy ai_settings_rw on public.ai_settings for all to authenticated
  using (true) with check (true);

drop policy if exists ai_generations_rw on public.ai_generations;
create policy ai_generations_rw on public.ai_generations for all to authenticated
  using (true) with check (true);

grant select, insert, update, delete on public.ai_settings, public.ai_generations to authenticated;
grant all on public.ai_settings, public.ai_generations to service_role;

-- seed: workspace único Vantari já com uma linha de configuração default
insert into public.ai_settings (workspace_id)
values ('53092199-7b75-4342-a897-f589d6f34922')
on conflict (workspace_id) do nothing;
