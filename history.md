# Vantari — Histórico de Desenvolvimento

---

## 2026-05-14 — Auditoria RD + Plano de Migração em 11 Etapas

### Leitura da auditoria
- Documentos lidos: `auditoria rd/Auditoria_RDStation_Vantari.docx` + `Auditoria_RDStation_Vantari_Complemento.docx`
- Inventário identificado: 12.154 leads, 49 campos personalizados (cf_*), 149 segmentos, 72 emails, 28 templates, 78 páginas rastreadas, 3 LPs, 3 formulários, 2 pop-ups (rascunho)
- Integrações ativas no RD: Meta Ads, Google Ads, GA4, RD Station CRM, reCAPTCHA
- Lead Scoring 2D: 8 critérios de Perfil (Urgência 20%, Estado 20%, Valor 18%, Conhecimento 12%, Faixa etária 10%, Tempo 8%, Profissão 8%, Responsividade 3%) + 5 grupos de Interesse

### Decisões tomadas com a usuária
- **Objetivo:** substituir 100% o RD Station (não coexistir)
- **Migração de dados:** só estrutura agora; leads vêm depois via CSV
- **Scoring:** adotar modelo 2D do RD, mostrar Perfil e Interesse separados
- **Integrações:** reais desde o início (Meta, GA4)
- **WhatsApp:** Meta Cloud API oficial (não Z-API)
- **Lead Tracking:** script real (Edge Function + cookie + heartbeat)

### Plano gerado (11 etapas)
0. Campos Personalizados • 1. Lead Scoring 2D • 2. Lead Tracking • 3. Meta Lead Ads • 4. Atrair (Social/SEO/Bio) • 5. Conversão (Forms/Pop-ups/Push) • 6. Leads ampliado • 7. Analisar • 8. GA4 + Google Ads • 9. Relacionar (WhatsApp/SMS/Chatbot) • 10. Validador + Smart Lists • 11. Polimento + cutover

---

## 2026-05-14 — Etapa 0 + 2 + 6 entregues

### Etapa 0 — Campos Personalizados
- `supabase/migrations/001_custom_fields.sql` — tabelas `custom_fields` + `lead_custom_values` + 2 ENUMs + seed dos 49 campos `cf_*` (16 manuais, 7 do CRM `cf_plug_*`, 13 do Meta Lead Ads `cf_fb_forms_*`)
- `supabase/migrations/002_leads_core.sql` — tabelas `leads` (21 colunas) + `lead_events` + trigger `apply_lead_event_score` que recalcula `leads.score` ao inserir evento + ativa FK `lead_custom_values.lead_id`
- `vantari-settings-admin.jsx` — nova aba **Campos Personalizados**: CRUD com busca, filtro por origem, auto-slug do api_id, copiar com clique, 6 cards de contagem por origem
- Modal de edição com 12 tipos de campo (text/email/phone/url/number/date/select/radio/checkbox/etc) + opções configuráveis pra select/radio

### Etapa 2 — Lead Tracking real
- `supabase/migrations/003_lead_tracking.sql` — `tracked_pages` (10 URLs seed da auditoria com funnel + score_delta) + `page_visits` (anônimas ou identificadas) + ENUM `page_funnel` + trigger `page_visit_to_lead_event` que gera `lead_event` automaticamente
- `supabase/functions/track/index.ts` — Edge Function Deno que recebe POST do tracker.js, resolve lead por email/cookie, faz match com tracked_pages e insere page_visit (com CORS aberto pra `*`)
- `public/tracker.js` — snippet ~150 linhas com: cookie `_vantari_vid` (2 anos), identificação via `Vantari.identify()`, `sendBeacon` quando disponível, heartbeat 30s, suporte a SPA (patch history pushState/replaceState), captura de UTMs
- `vantari-settings-admin.jsx` — aba **Lead Tracking**: 5 cards por funil + tabela de páginas (toggle ativo/inativo, score_delta editável) + snippet de instalação copiável + modal CRUD
- `vantari-leads-module.jsx` (panel) — timeline das 30 últimas visitas com cor por funil + tempo relativo
- `vantari-segments.jsx` — filtro "Visitou página" / "Não visitou" com select de páginas ativas (pre-query em `page_visits` antes do `.in()`)

### Etapa 6 — Leads ampliado
- `supabase/migrations/004_companies_imports.sql` — `companies` (CNPJ, setor, tamanho, etc) + `lead_imports` (com `field_mapping` JSONB + status) + `lead_exports` + FK `leads.company_id` + ENUM `import_status`
- `vantari-leads-module.jsx` reestruturado em 4 abas:
  - **Leads** (existente) — KPIs + tabela
  - **Empresas** — CRUD completo (nome, website, CNPJ, setor, tamanho, localização)
  - **Importações** — Upload CSV com detecção automática de separador (`,` ou `;` do RD), parser sem deps externas, auto-mapeamento heurístico (Nome→name, Email→email, etc), mapeamento manual pros 49 cf_*, insert em lotes de 50 com barra de progresso, upsert por email
  - **Exportações** — Botão "Exportar CSV" + histórico
- `ActivitiesPanel` no painel do lead — 8 categorias filtráveis (Ecommerce, Conversões, Visitas, Emails, Fluxos, Social, Propriedades, LGPD) com auto-categorização de `event_type` + combinação de `page_visits` + `lead_events` em timeline única

### Etapas puladas
- **Etapa 1** (Lead Scoring 2D) — adiada
- **Etapa 3** (Meta Lead Ads) — requer Meta Developer App; usuária optou por pular agora

### Validações de build
- Vite build OK em todas as 3 etapas (vantari-leads-module.jsx cresceu de ~25KB para ~55KB)

---

## 2026-05-12 — Deploy inicial e correções

### Primeiro deploy (preview)
- Projeto vinculado ao Vercel: `raquel-marquesis-projects/vantari-app`
- Corrigido: imports em `App.jsx` apontavam para `./pages/vantari-*` mas arquivos estão em `src/` diretamente
- Instalada dependência `recharts` que estava ausente do `package.json`
- Preview: https://vantari-lbeu2wszd-raquel-marquesis-projects.vercel.app

### Atualização de páginas
- `vantari-analytics-dashboard.jsx` substituído por `vantari-analytics-dashboard-v2.jsx`
- `vantari-scoring-system.jsx` substituído por `vantari-scoring-system-v2.jsx`
- `vantari-email-marketing.jsx` substituído por `vantari-email-marketing (1).jsx`
- Instalada dependência `lucide-react` requerida pelo scoring v2
- Preview: https://vantari-r40dug5ly-raquel-marquesis-projects.vercel.app

### Deploy em produção
- Promovido para produção
- URL final: https://vantari-app.vercel.app

---

## 2026-05-12 — Reestruturação e melhorias de qualidade

### Code splitting e roteamento
- `App.jsx` reescrito: removida sidebar global, cada página gerencia seu próprio layout
- Implementado `React.lazy` + `Suspense` para todas as 9 páginas
- Bundle principal reduzido de 1.075 MB para 229 KB
- Adicionada página 404 (`NotFound`) e loading state (`PageLoader`)
- Adicionada rota `/settings` para `vantari-settings-admin.jsx`

### Navegação via React Router
- Adicionado `useNavigate` em todas as 7 páginas com sidebar
- Todos os itens de navegação receberam props `path` e `onClick` com `navigate(path)`
- Eliminado uso de `<a href>` que causava recarregamento de página

### Correção de bugs
- **Tela branca em Integrações**: bug em `Btn` component — ícones Lucide usam `forwardRef` (typeof === "object"), não funções. Corrigido `typeof icon === "function"` → `typeof icon !== "string"`
- **Sidebar de Configurações ausente**: página usava layout de topbar apenas. Adicionada sidebar completa com `useNavigate`

### Limpeza de arquivos
- Arquivos duplicados e com sufixo `-v2` consolidados com nomes canônicos
- `vantari-email-marketing (1).jsx` renomeado para remover espaço

### Deploy de produção
- URL: https://vantari-app.vercel.app

---

## 2026-05-12 — Onboarding Wizard

### Novo módulo: `vantari-onboarding-wizard.jsx`
- Wizard de 4 fases e 11 sub-passos baseado no plano `onboarding-plan.md`
- **Fase 1 — Conta e Identidade**: dados da empresa, perfil do responsável, faturamento
- **Fase 2 — Equipe e Acessos**: convite de membros, permissões por módulo
- **Fase 3 — Configuração Técnica**: domínio de email (SPF/DKIM/DMARC), integrações (Meta Ads, Google Ads, WhatsApp, Webhook), mapeamento de campos
- **Fase 4 — Regras de Negócio**: pipeline de leads, modelo de scoring, alertas, metas e KPIs
- Persistência automática via `localStorage` (chave: `vantari_onboarding`)
- Validação de campos obrigatórios com mensagens inline
- Indicador de progresso (% concluído) no cabeçalho do wizard

### Integração em Configurações
- Card de onboarding adicionado no topo da aba Workspace em `vantari-settings-admin.jsx`
- Exibe progresso % lido do `localStorage`
- Indica quais das 4 fases estão concluídas (✓ / ○)
- Botão "Iniciar / Continuar / Ver resumo" conforme estado do onboarding

### Roteamento
- `App.jsx` atualizado: nova rota `/onboarding` → `Onboarding` (lazy)

### Deploy de produção
- URL: https://vantari-app.vercel.app
- Deploy ID: `dpl_JXF7SeZ5rUAwsMa2MbsavbAj7FCR`

---

## 2026-05-13 — Workflow Builder, GitHub e correção de 404

### Integração do Workflow Builder
- Convertido `marketing_workflow_builder_v2.html` (script inline UMD) para módulo React ESM
- Criado `src/vantari-workflow-builder.jsx` com:
  - Canvas drag-and-drop de nós (Trigger, Condition, Ação, Delay)
  - Conexões entre nós via SVG bezier
  - Tabs: Builder, Workflows, Logs, Analytics
  - Minimap e controles de zoom
  - Sidebar de paleta / painel de configuração de nó
- Instalado `@tabler/icons-webfont` (ícones `ti ti-*` usados no componente)
- Adicionada rota `/workflow` em `App.jsx`

### Correção de 404 ao recarregar páginas
- Criado `vercel.json` com rewrite `/(.*) → /index.html`
- Resolve o problema clássico de SPA no Vercel: servidor tentava servir rotas como arquivos físicos

### GitHub e deploy automático
- Repositório criado: https://github.com/raquel-marquesi/vantari-app (privado)
- Remote `origin` adicionado e código enviado com `git push -u origin main`
- Vercel conectado ao GitHub via `vercel git connect`
- Deploy automático ativo: push no `main` → Vercel deploya em https://vantari-app.vercel.app
- Deploy pelo CLI (`vercel --prod`) continua funcionando como alternativa

---

## 2026-05-13 — Setup Supabase e conexão do módulo Leads

### Setup Supabase
- Projeto Supabase: `ejhrlrasepowdcdnggmv.supabase.co`
- Instalado `@supabase/supabase-js` via npm
- Criado `src/supabase.js` com `createClient` via `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
- Variáveis configuradas no Vercel (produção) e `.env` local

### Schema SQL criado (via SQL Editor do Supabase)
Tabelas: `leads`, `lead_events`, `campaigns`, `campaign_sends`,
`automation_flows`, `flow_runs`, `landing_pages`, `form_submissions`, `segments`

Triggers criados:
- `trg_update_lead_score` — atualiza `leads.score` ao inserir em `lead_events`
- `trg_leads_updated_at` / `trg_campaigns_updated_at` / `trg_flows_updated_at`

RLS habilitado com policies abertas (`using (true)`) para fase de desenvolvimento.

### Módulo Leads — conectado ao Supabase
**Arquivo:** `src/vantari-leads-module.jsx`

Funcionalidades com dados reais:
- Listagem com busca (nome/email/empresa) via query Supabase
- Filtro por estágio aplicado na query
- Stat cards calculados do array retornado
- Modal de criação (`INSERT`) com deduplicação por email
- Modal de edição (`UPDATE`) e exclusão (`DELETE`) com confirmação
- Painel lateral de detalhes ao clicar na linha
- Score badge (Cold/Warm/Hot/Sales Ready) e stage badge coloridos
- Loading state com spinner, error state com banner

---

## 2026-05-13 — Correção de build Vite 8 + Supabase Auth real

### Problema: tela branca em produção
- Vite 8 usa Rolldown (bundler Rust). No Linux (Vercel), o Rolldown externalizava `@supabase/supabase-js` por causa da dependência `ws` (Node.js built-in). O browser recebia um import não resolvido e quebrava.
- Tentativa inicial: `rolldownOptions.onwarn` para suprimir o warning — **errada**, o pacote ainda era externalizado.
- **Solução correta**: instalado `vite-plugin-node-polyfills@0.26.0` em `vite.config.js`. O plugin polyfilla os built-ins do Node para browser, forçando o bundle correto do Supabase.

### Supabase Auth real
- `ProtectedRoute` implementado em `App.jsx` usando `supabase.auth.getSession()` + `onAuthStateChange`
- Todas as rotas protegidas; `/login` redireciona para `/dashboard` se já autenticado
- Problema: senha de `raquel@vantari.com.br` desconhecida; magic link redirecionava para `localhost:3000` (Site URL estava errada no Supabase)
- Corrigido Site URL para `https://vantari-app.vercel.app` em Supabase → Auth → URL Configuration
- Senha redefinida via SQL: `UPDATE auth.users SET encrypted_password = crypt('...', gen_salt('bf')) WHERE email = '...'`
- Dois usuários ativos: `raquel@vantari.com.br` e `catarina.quartucci@vantari.com.br`

---

## 2026-05-13 — Settings conectado ao Supabase + novos módulos

### team_members
- Criada tabela `team_members` no Supabase com RLS `using (true)`
- `vantari-settings-admin.jsx` — aba Equipe reescrita: lista, convida e remove membros via Supabase (sem mock)

### Edge Function de envio de email
- Criada `supabase/functions/send-campaign/index.ts` (Deno)
- Envia campanhas em lotes de 100 via API Resend
- Suporte a `test_email` para envio de teste
- Substitui variáveis `{{lead.name}}`, `{{lead.email}}`, `{{lead.company}}` no HTML
- Status da campanha atualizado: `sending` → `sent` / `failed`
- Registra em `campaign_sends` (delivered, opened, clicked, bounced)
- **Pendente**: deploy via `supabase functions deploy send-campaign`

### Módulo Segmentos (`/segments`)
- Criado `src/vantari-segments.jsx` com estado vazio, pronto para dados reais
- Rota `/segments` adicionada em `App.jsx`

---

## 2026-05-13 — Zeragem de dados fictícios

### Objetivo
Plataforma preparada para receber dados reais — todos os mocks removidos.

### O que foi feito no banco
- `TRUNCATE leads, lead_events, campaigns, campaign_sends, automation_flows, flow_runs, landing_pages, form_submissions, segments RESTART IDENTITY CASCADE`
- Usuários de autenticação preservados (raquel + catarina)

### O que foi feito no código (commit `9dcfa2d`)
| Arquivo | Alteração |
|---|---|
| `vantari-analytics-dashboard.jsx` | Todos os arrays mock zerados; KPIs reais via Supabase (leads, MQL, SQL, campanhas enviadas) |
| `vantari-ai-marketing.jsx` | `MOCK_LEADS` e `MOCK_GENERATIONS` removidos; leads reais via Supabase com estado vazio se nenhum |
| `vantari-leads-module.jsx` | Quaisquer dados remanescentes limpos; já conectado ao Supabase |
| `vantari-settings-admin.jsx` | `MOCK_AUDIT`, `MOCK_KEYS`, `MOCK_WEBHOOKS`, `MOCK_INVOICES` zerados; uso (`MOCK_USAGE`) com `used: 0` |

---

## 2026-05-13 — Redesign Visual Fases 1–5 (commit `d1e32cb`)

### Fase 1 — Design System (todos os 12 módulos)
- Novo objeto `T` com tokens atualizados: gradiente teal→green, sidebar bg gradiente, fontes Sora/Inter/JBMono, ink scale azulada
- Mapeamento de cores: `#0079a9` → `#0D7491`, `#05b27b` → `#14A273`, `#5f5f64` → `#2E3D4B`, etc.
- Sidebar redesenhada em todos os módulos: gradiente vertical, glow radial, ícone `/icone.png`, badge PRO, barra left-gradient no item ativo
- Backgrounds tonais por contexto (teal para dashboard, amber para leads, violet para scoring, etc.)
- `index.html`: fontes Google atualizadas (Sora + Inter + JetBrains Mono)
- `index.css`: keyframe `pulse-live` global
- `App.jsx`: cores corrigidas no `PageLoader` e `NotFound`

### Fase 2 — Hero KPIs + Chart Interativo (dashboard)
- `HeroKpiCard`: card com barra colorida 3px no topo, ícone 32px, valor Sora 28px, sub JBMono, sparkline SVG que sangra às bordas
- `SparklineChart`: SVG com gradient area + stroke, `calc(100% + 32px)` width, `margin: 8px -16px -1px`
- `TrendChipHero`: pill JBMono com ↗/↘
- `OverviewSection`: busca 7 meses de `leads.created_at, stage` do Supabase; bucketa por mês; hero AreaChart com linha de meta dashed
- `ChartTooltip`: tooltip rico (Sora título + JBMono valores)

### Fase 3 — Anel de Campanhas + Feed ao Vivo (dashboard)
- `CampaignRing`: 3 anéis SVG concêntricos (r=95/75/55), animação `stroke-dashoffset`, fetch de `campaign_sends` + `campaigns`
- `RealtimeSection`: polling `lead_events` a cada 5s, `EVENT_META` com formatação por tipo, separadores dashed, header "AO VIVO · atualiza a cada 5s" em JBMono cyan, animação `slideIn`
- Keyframes adicionados: `pulse`, `pulse-live`, `slideIn`

### Fase 4 — Alertas com Severidade + Funil Horizontal (dashboard)
- Alertas: fetch `dashboard_alerts` via Supabase; cards com barra esquerda 4px + pill pulsante (coral/amber/cyan) no top-right
- Keyframes: `pulse-coral`, `pulse-amber`, `pulse-cyan2`
- `FunnelSection` reescrita: fetch `leads.stage` do Supabase; `grid-template-columns: 120px 1fr 90px`; barras coloridas JBMono; chips de conversão ↘ entre linhas; mini KPI cards abaixo

### Fase 5 — Replicação HeroKpiCard aos demais módulos
- `vantari-leads-module.jsx`: 4 stat cards → HeroKpiCard + sparklines de `leads.created_at` (total, hot, mql, customer)
- `vantari-scoring-system.jsx`: 4 StatCards → HeroKpiCard + sparklines de `leads.score` (total, média, SQL, hot)
- `vantari-email-marketing.jsx`: KPI row adicionada do zero; fetch `campaigns` + `campaign_sends` (total, enviadas, abertura, ativas)
- `vantari-landing-pages.jsx`: MetricCard strip → HeroKpiCard + sparklines de `form_submissions.created_at`
- `vantari-segments.jsx`: flat stat tiles → HeroKpiCard + sparklines de `segments` + `leads` (total, leads, dinâmicos, estáticos)

**Deploy:** commit `d1e32cb` → push → Vercel auto-deploy → https://vantari-app.vercel.app
