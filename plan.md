# Vantari — Plano de Desenvolvimento

## Stack
- **Frontend:** React 19 + Vite 8, hospedado na Vercel
- **Backend:** Supabase (PostgreSQL + Auth + RLS)
- **URL produção:** https://vantari-app.vercel.app
- **Supabase project:** https://ejhrlrasepowdcdnggmv.supabase.co
- **Repositório:** https://github.com/raquel-marquesi/vantari-app (privado)

---

## Status dos Módulos

| Módulo | Arquivo | Backend | Design |
|---|---|---|---|
| Auth / Login | vantari-auth-system.jsx | ✅ Supabase Auth | ✅ Fase 1 |
| Dashboard Analytics | vantari-analytics-dashboard.jsx | ✅ KPIs reais (leads, MQL, SQL, campanhas) | ✅ Fases 1–4 |
| Lead Management | vantari-leads-module.jsx | ✅ 4 abas + Atividades 8 cat | ✅ Fases 1+5+6 |
| Lead Scoring | vantari-scoring-system.jsx | ⚠️ leads carregados, sem lead_events | ✅ Fases 1+5 |
| Email Marketing | vantari-email-marketing.jsx | ⚠️ campaigns/sends parcial | ✅ Fases 1+5 |
| Landing Pages | vantari-landing-pages.jsx | ⚠️ form_submissions (sparklines), páginas mockadas | ✅ Fases 1+5 |
| AI Marketing | vantari-ai-marketing.jsx | ✅ leads reais via Supabase | ✅ Fase 1 |
| Integrações | vantari-integrations-hub.jsx | — configuração, sem dados | ✅ Fase 1 |
| Settings | vantari-settings-admin.jsx | ✅ 8 abas (+ Custom Fields + Lead Tracking) | ✅ Fase 1 |
| Onboarding Wizard | vantari-onboarding-wizard.jsx | localStorage | ✅ Fase 1 |
| Workflow Builder | vantari-workflow-builder.jsx | — aguarda dados | ✅ Fase 1 |
| Segmentos | vantari-segments.jsx | ✅ filtro "visitou página" funcional | ✅ Fases 1+5 |

---

## Redesign Visual — Fases concluídas

| Fase | Entregue | Descrição |
|---|---|---|
| **1** | ✅ 2026-05-13 | Design tokens (Sora/Inter/JBMono, teal→green gradient, sidebar bg) em todos os 12 módulos |
| **2** | ✅ 2026-05-13 | HeroKpiCard + SparklineChart + hero AreaChart interativo com 3 séries + linha de meta no dashboard |
| **3** | ✅ 2026-05-13 | Anel SVG concêntrico (CampaignRing) + feed ao vivo com polling Supabase 5s no dashboard |
| **4** | ✅ 2026-05-13 | Alertas com severidade (barra esquerda + pill pulsante) + funil horizontal com dados reais no dashboard |
| **5** | ✅ 2026-05-13 | HeroKpiCard + sparklines replicados para leads, scoring, email, landing pages, segments |

---

## Infraestrutura

- [x] Deploy na Vercel (deploy automático via push no `main`)
- [x] Repositório GitHub criado e conectado ao Vercel
- [x] `vercel.json` com rewrite SPA (resolve 404 ao recarregar)
- [x] Supabase provisionado e schema criado
- [x] `src/supabase.js` com `createClient`
- [x] Variáveis de ambiente no Vercel e `.env` local
- [x] `vite-plugin-node-polyfills` — resolve bundling do `@supabase/supabase-js` no Vite 8 / Rolldown
- [x] Supabase Auth ativo (2 usuários: raquel + catarina)
- [x] Tabela `team_members` criada com RLS
- [x] Edge Function `send-campaign` criada (Deno + Resend)
- [ ] Edge Function `send-campaign` deployada no Supabase
- [ ] Colunas `html_content`, `from_name`, `from_email` adicionadas à tabela `campaigns`
- [ ] Domínio customizado no Vercel
- [ ] RLS com `auth.uid()` (atualmente `using (true)` para dev)

---

## Plano de Migração do RD Station (em andamento)

Substituição 100% do RD Station Marketing em 11 etapas. Baseado na auditoria técnica de 14/05/2026 (`auditoria rd/*.docx`): 12.154 leads, 49 campos personalizados, 149 segmentos, 72 emails, 28 templates, 78 páginas rastreadas, 3 LPs, 3 formulários, integrações Meta Ads + Google Ads + GA4 + CRM RD.

| Etapa | Status | Entrega |
|---|---|---|
| **0** Campos Personalizados | ✅ 2026-05-14 | Migration 001 (49 cf_* seedados) + aba CRUD em `/settings` |
| **1** Lead Scoring 2D (Perfil A-D + Interesse) | ⏭️ pulada | Pendente |
| **2** Lead Tracking | ✅ 2026-05-14 | Migration 003 (10 URLs seed) + Edge Function `/track` + `public/tracker.js` + UI gestão + timeline no perfil + filtro segments |
| **3** Meta Lead Ads (OAuth + Webhook) | ⏭️ pulada | Requer Meta Developer App |
| **4** Atrair (Social/SEO/Link Bio) | ⏳ | |
| **5** Conversão (Forms/Pop-ups/Web Push) | ⏳ | |
| **6** Leads ampliado | ✅ 2026-05-14 | Migration 004 + 4 abas (Leads/Empresas/Importações/Exportações) + Atividades 8 cat |
| **7** Analisar (Canais/UTM/Atribuição/Dashboards) | ⏳ | |
| **8** GA4 + Google Ads | ⏳ | |
| **9** Relacionar (WhatsApp Cloud API + SMS + Chatbot) | ⏳ | |
| **10** Validador Email + Lista Inteligente | ⏳ | |
| **11** Polimento + cutover do RD | ⏳ | Migrar leads, segments, emails, templates |

### Decisões já tomadas
- **Objetivo:** substituir 100% o RD
- **Estratégia:** construir estrutura agora, migrar dados na Etapa 11 via CSV (aba Importações)
- **Scoring:** adotar modelo RD 2D (Perfil A-D + Interesse por pontos) — mostrar separadamente
- **Integrações:** reais (não mock) — Meta Ads, GA4, etc desde o início
- **WhatsApp:** Meta Cloud API oficial (não Z-API)
- **Lead Tracking:** script real (Edge Function + cookie + heartbeat)

## Próximos passos (ordem de prioridade)

### Dados reais (backend)
1. **Importar leads reais** via CSV → usar aba `/leads → Importações` (suporta 49 cf_*)
2. **Email Marketing** → adicionar colunas `html_content`, `from_name`, `from_email` em `campaigns`; deploy da Edge Function `send-campaign`
3. **Scoring** → conectar `lead_events` para histórico real de score (já está vindo via `page_visits`)
4. **Landing Pages** → conectar `landing_pages` + `form_submissions` (substituir dados mockados)
5. **Segments** → conectar tabela `segments` (atualmente mostra contagem de leads, não de segmentos)
6. **Workflow Builder** → conectar `automation_flows` + `flow_runs`

### Próximas fases de design (Fase 6+)
- **Fase 6 — Replicação Fase 3+4** → feed ao vivo + alertas de severidade nos módulos `/leads`, `/email`, `/scoring`
- **Fase 7 — Módulos restantes** → HeroKpiCard para `/ai-marketing`, `/workflow`, `/integrations`
- **Fase 8 — Realtime** → substituir polling 5s por Supabase Realtime subscriptions
- **Fase 9 — Mobile** → sidebar colapsa, grid de KPIs quebra em 2 col abaixo de 1024px

### Produção
- **RLS com `auth.uid()`** → antes de go-live com dados sensíveis
- **Deploy Edge Function `/track`** → `supabase functions deploy track --no-verify-jwt`
- **Snippet tracker.js** instalado em `vantari.com.br` (WordPress via WPCode) ✅

---

## Schema Supabase (implementado)

### Migrações versionadas em `supabase/migrations/`
- **001_custom_fields.sql** — `custom_fields` (49 cf_* seedados) + `lead_custom_values` (JSONB) + ENUMs `custom_field_type` / `custom_field_source`
- **002_leads_core.sql** — `leads` (21 colunas + UTMs + unsubscribed + owner) + `lead_events` (event_type + score_delta) + ENUM `lead_stage` + trigger `apply_lead_event_score`
- **003_lead_tracking.sql** — `tracked_pages` (10 URLs seed) + `page_visits` (anônimas ou identificadas) + ENUM `page_funnel` + trigger `page_visit_to_lead_event`
- **004_companies_imports.sql** — `companies` + `lead_imports` (com `field_mapping` JSONB) + `lead_exports` + FK `leads.company_id` + ENUM `import_status`

### Tabelas pré-existentes (legado pré-migration)
```
campaigns          — campanhas de email
campaign_sends     — métricas por lead/campanha
automation_flows   — definição dos fluxos
flow_runs          — log de execução por lead
landing_pages      — páginas e formulários
form_submissions   — submissões com UTM
segments           — listas estáticas e dinâmicas
team_members       — equipe (nome, email, role, status)
dashboard_alerts   — alertas configurados para o dashboard
```

### Triggers ativos
- `apply_lead_event_score` — atualiza `leads.score` ao inserir `lead_events`
- `page_visit_to_lead_event` — gera `lead_event` quando visita em página rastreada
- `set_updated_at` — em todas as tabelas com `updated_at`

### Edge Functions
- `track` — recebe pings do tracker.js (em `supabase/functions/track/index.ts`)
- `send-campaign` — criada, ainda não deployada

---

## Variáveis de Ambiente

```env
VITE_SUPABASE_URL=https://ejhrlrasepowdcdnggmv.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
```

Configuradas em: Vercel Dashboard → Settings → Environment Variables **e** `.env` local na raiz do projeto.
