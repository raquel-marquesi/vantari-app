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
| Dashboard Analytics | vantari-analytics-dashboard.jsx | ✅ KPIs reais | ✅ Fases 1–4 |
| Lead Management | vantari-leads-module.jsx | ✅ 4 abas + CPF + Atividades 8 cat | ✅ Fases 1+5+6 |
| Lead Scoring | vantari-scoring-system.jsx | ✅ Perfil 2D + Interesse persistidos | ✅ Fases 1+5 |
| Email Marketing | vantari-email-marketing.jsx | ✅ Templates DB + import RD; campaigns OK | ✅ Fases 1+5 |
| Landing Pages | vantari-landing-pages.jsx | ✅ tab Formulários standalone | ✅ Fases 1+5 |
| AI Marketing | vantari-ai-marketing.jsx | ✅ leads reais | ✅ Fase 1 |
| Integrações | vantari-integrations-hub.jsx | — configuração | ✅ Fase 1 |
| Settings | vantari-settings-admin.jsx | ✅ 8 abas + Custom Fields + Lead Tracking | ✅ Fase 1 |
| Onboarding Wizard | vantari-onboarding-wizard.jsx | localStorage | ✅ Fase 1 |
| Workflow Builder | vantari-workflow-builder.jsx | — aguarda dados | ✅ Fase 1 |
| Segmentos | vantari-segments.jsx | ✅ filtros + perfil A-D | ✅ Fases 1+5 |
| **Public Form** | **vantari-public-form.jsx** | ✅ rota pública `/f/:slug` sem auth | ✅ Standalone |

---

## Plano de Migração do RD Station

Substituição 100% do RD Station Marketing em 11 etapas.

| Etapa | Status | Entrega |
|---|---|---|
| **0** Campos Personalizados | ✅ 2026-05-14 | Migration 001 (49 cf_* + cf_cpf) + aba CRUD em `/settings` |
| **1** Lead Scoring 2D (Perfil A-D + Interesse) | ✅ 2026-05-18 | Migration 005 + tab `/scoring → Perfil` + matriz 2D + thresholds configuráveis |
| **2** Lead Tracking | ✅ 2026-05-14 | Migration 003 + Edge Function `/track` + `tracker.js` + UI + filtro segments |
| **3** Meta Lead Ads | ⏭️ pulada | Requer Meta Developer App |
| **4** Atrair (Social/SEO/Link Bio) | ⏳ | |
| **5** Conversão (Forms/Pop-ups/Web Push) | 🟡 parcial | **Forms ✅** (Migration 006 + tab `/landing → Formulários` + rota `/f/:slug` + snippet `forms-embed.js`). Pop-ups e Web Push pendentes |
| **6** Leads ampliado | ✅ 2026-05-14 | Migration 004 + 4 abas + Atividades 8 cat |
| **7** Analisar (Canais/UTM/Atribuição) | ⏳ | |
| **8** GA4 + Google Ads | ⏳ | |
| **9** Relacionar (WhatsApp Cloud API + SMS + Chatbot) | 🟡 parcial | Tabelas `campaigns` + `campaign_sends` criadas (Migration 009). WhatsApp pendente |
| **10** Validador Email + Lista Inteligente | ⏳ | **Próximo bloco recomendado** |
| **11** Polimento + cutover do RD | 🟡 parcial | Importador RD turbinado ✅; Importador templates (HTML + BeeFree JSON) ✅; Importar 12k completo ⏳; Recriar segmentos críticos ⏳; cutover ⏳ |

### Decisões arquiteturais
- **CPF como identidade única** (Migration 007). Email continua UNIQUE quando preenchido (fallback). Lead sem CPF = status PENDENTE.
- **Função `merge_lead_by_cpf`**: ao descobrir CPF de um lead email-only, funde com lead CPF existente automaticamente
- **Segmentos do RD**: API não expõe regras → recriação manual em `/segments`
- **28 arquivos RD**: confirmado que são campanhas históricas, não templates. Templates reais ainda a baixar
- **Templates de email**: suporta `html` puro, `blocks` (editor Vantari) e `bee_json` (BeeFree do RD)

---

## Próximos passos (ordem sugerida)

### 1. Etapa 10 — Validador Email + Smart Lists (Recomendado)
**Por quê primeiro:** antes do primeiro disparo massivo para 12k leads, a base precisa ser higienizada para evitar bounces e bloqueios da conta de envio.

- Função SQL `valid_email_format(text)`
- Detecção de role-based, descartáveis, MX inválido
- Coluna `leads.email_status`: `valid` / `invalid` / `risky` / `disposable` / `unknown`
- Edge Function `validate-email` para checagem MX/SMTP opcional
- Ação em massa em `/leads` → "Validar emails"
- Smart Lists em `/segments`: filtros por `email_status` + atividade

### 2. Etapa 11 — Cutover RD → Vantari
- [ ] Importar 12.154 leads completos via CSV (preset RD)
- [ ] Baixar e importar templates reais do RD (.html/.json)
- [ ] Recriar manualmente segmentos críticos em `/segments`
- [ ] Reconfigurar workflows críticos em `/workflow`
- [ ] Apontar `tracker.js` no site oficial
- [ ] Mudar webhooks de formulários e Meta Ads
- [ ] Operação dupla (1-2 semanas)
- [ ] Desativar conta RD

### 3. Etapa 7 — Analisar (UTM/Atribuição)
- Dashboard de canais (UTM × leads × clientes)
- Tabela `lead_attribution` com modelo configurável (first/last/linear/time-decay)
- Filtros de canal em `/leads` e `/segments`

### 4. Etapa 8 — GA4 + Google Ads
- GA4 Measurement Protocol (server-side)
- Google Ads offline conversion import
- UI em `/integrations`

### 5. Etapa 9 — WhatsApp via Meta Cloud API
- OAuth Meta Cloud em `/integrations`
- Tabelas `whatsapp_conversations` + `whatsapp_messages`
- Tela `/whatsapp` (inbox + envio em massa)
- Templates aprovados Meta
- Trigger SQL: msg recebida → `lead_event` (+8 pts)

### 6. Etapa 5 (resto) — Pop-ups + Web Push
- Pop-ups: editor visual + regras (exit-intent, scroll, tempo, URL) + snippet JS
- Web Push: VAPID keys + Service Worker + opt-in + envio via Edge Function

### 7. Etapa 4 — Atrair (Social/SEO/Bio)
- Link Bio (tipo Linktree)
- SEO audit por landing page
- Agendamento de posts sociais

### 8. Etapa 3 — Meta Lead Ads
- Quando tiver Meta Developer App aprovado

---

## Infraestrutura e operações paralelas

- [x] Deploy automático Vercel via push no `main`
- [x] Repositório GitHub conectado
- [x] `vercel.json` com rewrite SPA
- [x] Supabase Auth (2 usuários)
- [x] `vite-plugin-node-polyfills` (resolve bundling Vite 8)
- [x] Edge Function `track` deployada
- [x] Edge Function `send-campaign` criada
- [ ] Edge Function `send-campaign` deployada (`supabase functions deploy send-campaign`)
- [ ] Domínio customizado no Vercel (vantari-app.com.br)
- [ ] Migrar RLS de `using (true)` para `auth.uid()`
- [ ] SPF/DKIM/DMARC do domínio `vantari.com.br`
- [ ] Backup automático Supabase
- [ ] Eliminar diretórios `dist*/` órfãos

---

## Schema Supabase (implementado)

### Migrações versionadas em `supabase/migrations/`
- **001_custom_fields.sql** — `custom_fields` + `lead_custom_values` + 49 cf_* + ENUMs
- **002_leads_core.sql** — `leads` + `lead_events` + ENUM `lead_stage` + trigger score
- **003_lead_tracking.sql** — `tracked_pages` + `page_visits` + ENUM `page_funnel` + trigger
- **004_companies_imports.sql** — `companies` + `lead_imports` + `lead_exports`
- **005_lead_scoring_2d.sql** — ENUM `lead_profile` + `profile_rules` + `profile_thresholds` + `scoring_rules` + funções de recálculo + triggers
- **006_forms_standalone.sql** — `forms` + `form_submissions` + trigger upsert lead
- **007_cpf_identifier.sql** — coluna `cpf` + validador checksum + função `merge_lead_by_cpf`
- **008_email_templates.sql** — `email_templates` com `html`, `blocks`, `bee_json`
- **009_campaigns.sql** — `campaigns` + `campaign_sends` (FKs condicionais)

### Triggers ativos
- `apply_lead_event_score` — atualiza `leads.score` ao inserir `lead_events`
- `page_visit_to_lead_event` — gera `lead_event` quando visita em página rastreada
- `trg_leads_profile_recalc` — recalcula `profile`/`profile_points` ao inserir lead
- `trg_lcv_profile_recalc` — recalcula perfil ao mudar `lead_custom_values`
- `trg_normalize_cpf` — normaliza CPF antes de insert/update
- `trg_form_submission_to_lead` — cria/atualiza lead automaticamente em submissions
- `set_updated_at` — em todas as tabelas com `updated_at`

### Edge Functions
- `track` — recebe pings do tracker.js (deployada)
- `send-campaign` — Resend para campanhas (criada, **pendente deploy**)

---

## Snippets públicos em `/public`

- **`tracker.js`** — instalado em vantari.com.br, registra `page_visits`
- **`forms-embed.js`** — `<script async data-form="slug">` que injeta iframe do form em sites externos

---

## Limites técnicos identificados

| Tópico | Limitação | Plano |
|---|---|---|
| BeeFree JSON → HTML | Extrator cobre text/image/button/divider; layouts complexos simplificam | Renderer mais completo ou BeeFree SDK |
| Segmentos RD | API não expõe conditions | Recriação manual |
| Schema legado Supabase | Tabelas pré-existentes com NOT NULL | Migrations 005-009 já tratam defensivamente |
| Lockfile `.git/index.lock` | Aparece após builds do sandbox | `rm -f .git/index.lock` antes do push |

---

## Sequência de cutover sugerida

1. **Semana 1:** importar leads + templates + segmentos críticos
2. **Semana 2:** operação dupla, testes A/B
3. **Semana 3:** mudar webhooks para Vantari
4. **Semana 4:** parar RD, monitorar engajamento
5. **Após estabilização:** cancelar RD

---

## Variáveis de Ambiente

```env
VITE_SUPABASE_URL=https://ejhrlrasepowdcdnggmv.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
```

Configuradas em: Vercel → Environment Variables **e** `.env` local.
