# Vantari — Histórico de Desenvolvimento

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
