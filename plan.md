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
| Lead Management | vantari-leads-module.jsx | ✅ Supabase (CRUD completo) | ✅ Fases 1+5 |
| Lead Scoring | vantari-scoring-system.jsx | ⚠️ leads carregados, sem lead_events | ✅ Fases 1+5 |
| Email Marketing | vantari-email-marketing.jsx | ⚠️ campaigns/sends parcial | ✅ Fases 1+5 |
| Landing Pages | vantari-landing-pages.jsx | ⚠️ form_submissions (sparklines), páginas mockadas | ✅ Fases 1+5 |
| AI Marketing | vantari-ai-marketing.jsx | ✅ leads reais via Supabase | ✅ Fase 1 |
| Integrações | vantari-integrations-hub.jsx | — configuração, sem dados | ✅ Fase 1 |
| Settings | vantari-settings-admin.jsx | ✅ team_members via Supabase | ✅ Fase 1 |
| Onboarding Wizard | vantari-onboarding-wizard.jsx | localStorage | ✅ Fase 1 |
| Workflow Builder | vantari-workflow-builder.jsx | — aguarda dados | ✅ Fase 1 |
| Segmentos | vantari-segments.jsx | ⚠️ sparklines de leads, sem dados de segmentos | ✅ Fases 1+5 |

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

## Próximos passos (ordem de prioridade)

### Dados reais (backend)
1. **Importar leads reais** via CSV → tabela `leads`
2. **Email Marketing** → adicionar colunas `html_content`, `from_name`, `from_email` em `campaigns`; deploy da Edge Function `send-campaign`
3. **Scoring** → conectar `lead_events` para histórico real de score
4. **Landing Pages** → conectar `landing_pages` + `form_submissions` (substituir dados mockados)
5. **Segments** → conectar tabela `segments` (atualmente mostra contagem de leads, não de segmentos)
6. **Workflow Builder** → conectar `automation_flows` + `flow_runs`

### Próximas fases de design (Fase 6+)
6. **Fase 6 — Replicação Fase 3+4** → feed ao vivo + alertas de severidade nos módulos `/leads`, `/email`, `/scoring`
7. **Fase 7 — Módulos restantes** → HeroKpiCard para `/ai-marketing`, `/workflow`, `/integrations`
8. **Fase 8 — Realtime** → substituir polling 5s por Supabase Realtime subscriptions
9. **Fase 9 — Mobile** → sidebar colapsa, grid de KPIs quebra em 2 col abaixo de 1024px

### Produção
10. **RLS com `auth.uid()`** → antes de go-live com dados sensíveis

---

## Schema Supabase (implementado)

```
leads              — contatos com score, stage, tags, unsubscribed
lead_events        — comportamento; trigger atualiza leads.score
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

Triggers ativos:
- `trg_update_lead_score` — score automático ao inserir `lead_events`
- `trg_leads_updated_at`, `trg_campaigns_updated_at`, `trg_flows_updated_at`

---

## Variáveis de Ambiente

```env
VITE_SUPABASE_URL=https://ejhrlrasepowdcdnggmv.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
```

Configuradas em: Vercel Dashboard → Settings → Environment Variables **e** `.env` local na raiz do projeto.
