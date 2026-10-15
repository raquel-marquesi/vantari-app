-- 15/10/2026 — modelos de mensagem do WhatsApp (Cloud API) que o /inbox pode
-- enviar fora da janela de 24h. A aprovação de verdade fica na Meta
-- (Gerenciador do WhatsApp → Modelos de mensagem); aqui só fica o catálogo
-- que a tela usa pra montar a prévia e preencher as variáveis.
--
-- body:   texto exatamente como aprovado na Meta, com {{1}}, {{2}}...
-- params: uma entrada por variável, na ordem — { label, source }
--         source = 'first_name' | 'processo_cnj' | null (preenchimento manual)

create table if not exists public.whatsapp_templates (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  name         text not null,
  language     text not null default 'pt_BR',
  category     text not null check (category in ('utility', 'marketing', 'authentication')),
  label        text not null,
  body         text not null,
  params       jsonb not null default '[]'::jsonb,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (workspace_id, name, language)
);

alter table public.whatsapp_templates enable row level security;

drop policy if exists whatsapp_templates_rw on public.whatsapp_templates;
create policy whatsapp_templates_rw on public.whatsapp_templates
  for all to authenticated
  using (workspace_id in (select core.current_workspace_ids()))
  with check (workspace_id in (select core.current_workspace_ids()));

insert into public.whatsapp_templates (workspace_id, name, language, category, label, body, params, active) values
  ('53092199-7b75-4342-a897-f589d6f34922', 'resultado_analise_negativa', 'pt_BR', 'utility',
   'Resultado da análise — não enquadrado',
   E'Olá, {{1}}! Aqui é o Gustavo, gerente comercial da Vantari. Você entrou em contato com a gente para avaliarmos a antecipação do seu crédito trabalhista.\n\nFinalizamos a análise do processo {{2}} e, neste momento, ele não se enquadrou nos critérios internos que utilizamos para aquisição de créditos. Por isso, infelizmente não vamos conseguir avançar com uma proposta.\n\nIsso não significa que exista algum problema com o seu processo ou com o seu direito de receber. É apenas uma questão dos parâmetros de risco e operação que a Vantari precisa seguir.\n\nAgradeço pelo contato e pela confiança em procurar a Vantari.',
   '[{"label":"Nome do cliente","source":"first_name"},{"label":"Número do processo","source":"processo_cnj"}]', true),
  ('53092199-7b75-4342-a897-f589d6f34922', 'retomada_instabilidade', 'pt_BR', 'marketing',
   'Retomada após instabilidade (com nome)',
   'Olá, {{1}}! Aqui é a Nina, da Vantari. Nosso WhatsApp passou por uma instabilidade nos últimos dias e algumas mensagens podem não ter chegado até nós. Pedimos desculpas! Quer continuar a análise do seu processo? É só tocar em um dos botões abaixo.',
   '[{"label":"Nome do cliente","source":"first_name"}]', true),
  -- ainda em criação na Meta (15/10) — ligar active quando for aprovado
  ('53092199-7b75-4342-a897-f589d6f34922', 'retomada_instabilidade_sem_nome', 'pt_BR', 'marketing',
   'Retomada após instabilidade (sem nome)',
   'Olá! Aqui é a Nina, da Vantari Crédito. Nosso WhatsApp passou por uma instabilidade nos últimos dias e algumas mensagens podem não ter chegado até nós. Pedimos desculpas! Quer continuar a análise do seu processo? É só tocar em um dos botões abaixo.',
   '[]', false)
on conflict (workspace_id, name, language) do nothing;
