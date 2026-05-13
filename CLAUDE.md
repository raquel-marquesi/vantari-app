# Vantari — CLAUDE.md

## Visão geral do projeto

Vantari é uma plataforma de marketing SaaS equivalente ao RD Station Marketing — gestão de leads, email marketing, automação de fluxos, scoring e landing pages. Interface React + Vite, tema claro, sidebar fixa por página, roteamento client-side via React Router. Cada página é um componente independente que gerencia seu próprio layout (sidebar + conteúdo).

## Stack

- **Framework**: React 19 + Vite 8
- **Roteamento**: react-router-dom v7 (`useNavigate`, sem `<a href>` interno)
- **Backend**: Supabase (PostgreSQL + RLS)
- **Gráficos**: recharts
- **Ícones**: lucide-react (atenção: ícones são objetos `forwardRef`, não funções — usar `typeof icon !== "string"` para checar)
- **Ícones extras**: @tabler/icons-webfont (usado em `vantari-workflow-builder.jsx` via classes CSS `ti ti-*`)
- **Deploy**: Vercel — https://vantari-app.vercel.app (deploy automático via push no `main`)
- **Repositório**: https://github.com/raquel-marquesi/vantari-app

## Cliente Supabase

Sempre importar de `./supabase` ou `../supabase`:
```js
import { supabase } from "./supabase";
```
O arquivo `src/supabase.js` já existe com `createClient` configurado via env vars.

## Estrutura de arquivos

```
src/
  App.jsx                          # Roteamento principal (lazy + Suspense, sem sidebar global)
  supabase.js                      # Cliente Supabase (createClient)
  main.jsx                         # Entry point
  index.css / App.css              # Estilos globais
  vantari-auth-system.jsx          # /login         ← Supabase Auth
  vantari-analytics-dashboard.jsx  # /dashboard     ← KPIs reais via Supabase + design Fases 2-4
  vantari-leads-module.jsx         # /leads         ← Supabase (CRUD completo) + HeroKpiCard
  vantari-scoring-system.jsx       # /scoring       ← HeroKpiCard + sparklines
  vantari-email-marketing.jsx      # /email         ← HeroKpiCard + sparklines (campaigns/sends)
  vantari-landing-pages.jsx        # /landing       ← HeroKpiCard + sparklines (form_submissions)
  vantari-ai-marketing.jsx         # /ai-marketing  ← leads reais via Supabase
  vantari-integrations-hub.jsx     # /integrations
  vantari-settings-admin.jsx       # /settings      ← team_members via Supabase
  vantari-onboarding-wizard.jsx    # /onboarding    ← localStorage
  vantari-workflow-builder.jsx     # /workflow
  vantari-segments.jsx             # /segments      ← HeroKpiCard + sparklines
  assets/                          # hero.png, react.svg, vite.svg
```

## Rotas

| Path | Componente |
|------|-----------|
| `/` | Redireciona para `/dashboard` |
| `/login` | AuthSystem |
| `/dashboard` | Analytics |
| `/leads` | Leads |
| `/scoring` | Scoring |
| `/email` | EmailMarketing |
| `/landing` | LandingPages |
| `/ai-marketing` | AIMarketing |
| `/integrations` | Integrations |
| `/settings` | Settings |
| `/onboarding` | Onboarding (wizard 4 fases) |
| `/workflow` | WorkflowBuilder |
| `/segments` | Segments |

## Comandos úteis

```bash
npm run dev          # servidor local (porta 5173)
npm run build        # build de produção
npm run preview      # preview do build local
git push             # dispara deploy automático no Vercel via GitHub
vercel --prod --yes  # deploy direto pelo CLI (alternativo)
```

## Design System — atual (pós Fase 1–5)

```js
const T = {
  // Brand
  teal:    "#0D7491",
  blue:    "#0D7491",
  green:   "#14A273",
  brand2:  "#1F76BC",
  deep:    "#0A3D4D",
  gradient: "linear-gradient(135deg, #0D7491 0%, #14A273 100%)",
  sidebarBg: "linear-gradient(180deg, #0D7491 0%, #0A5165 60%, #0A3D4D 100%)",

  // Data accents
  violet:  "#7C5CFF",
  amber:   "#F59E0B",
  orange:  "#F59E0B",
  coral:   "#FF6B5E",
  red:     "#FF6B5E",
  cyan:    "#06B6D4",
  rose:    "#EC4899",
  purple:  "#7C5CFF",

  // Surfaces & ink
  bg:      "#F5F8FB",
  surface: "#FFFFFF",
  border:  "#E8EEF3",

  // Ink scale
  ink:     "#0E1A24",
  text:    "#2E3D4B",
  muted:   "#5A6B7A",
  faint3:  "#8696A5",
  faint:   "#F5F8FB",

  // Fonts
  font:    "'Inter', system-ui, sans-serif",
  head:    "'Sora', system-ui, sans-serif",
  mono:    "'JetBrains Mono', monospace",
};
```

- Fonte display/títulos: `Sora` (pesos 600–800)
- Fonte corpo: `Inter` (pesos 400–700)
- Fonte mono/código/IDs: `JetBrains Mono` (pesos 500–700)
- Bordas: `borderRadius` entre 8–16px
- Sombras: `0 1px 0 rgba(14,26,36,.03), 0 8px 24px -16px rgba(14,26,36,.08)` (card), lift no hover
- Estilos todos inline (sem arquivos CSS por página)

## Componentes visuais implementados (Fases 2–5)

Estes componentes estão definidos em cada arquivo que os usa (padrão do projeto: tudo self-contained):

| Componente | Descrição | Arquivos |
|---|---|---|
| `HeroKpiCard` | Card com barra colorida 3px no topo, ícone, valor Sora 28px, sub JBMono, sparkline | dashboard, leads, scoring, email, landing, segments |
| `SparklineChart` | SVG area+line que sangra às bordas do card (`calc(100% + 32px)`) | idem |
| `TrendChipHero` | Pill JBMono com ↗/↘ e % colorido | idem |
| `CampaignRing` | 3 anéis SVG concêntricos para métricas de campanha | dashboard |
| `RealtimeSection` | Feed de eventos via polling Supabase 5s com `slideIn` | dashboard |
| `FunnelSection` | Funil horizontal com barras coloridas e chips de conversão | dashboard |
| Alertas severity | Cards com barra esquerda 4px + pill pulsante (pulse-coral/amber/cyan2) | dashboard |

## Keyframes CSS (no `<style>` do dashboard e `index.css`)

```css
@keyframes pulse-live   /* dot cyan pulsante no live feed */
@keyframes pulse        /* dot verde geral */
@keyframes slideIn      /* entrada dos itens do feed */
@keyframes pulse-coral  /* alerta crítico */
@keyframes pulse-amber  /* alerta atenção */
@keyframes pulse-cyan2  /* alerta info */
```

## Regras de código

1. **Sempre entregar o arquivo completo reescrito** — nunca snippets para merge manual.
2. Dados reais via Supabase. Nunca retornar a dados mock após conectar.
3. `useEffect` + `useCallback` para fetches com dependências de filtro.
4. Loading state com `<Loader2>` do lucide-react + `@keyframes spin`.
5. Error state com banner vermelho (`T.coral`) e ícone `<AlertCircle>`.
6. Formulários sem tag `<form>` — usar `onClick` nos botões.
7. Busca e filtros por estágio aplicados diretamente na query Supabase (não no array local).
8. Deduplicação de leads garantida pelo `UNIQUE` na coluna `email`.
9. Navegação interna sempre via `useNavigate` do react-router-dom.
10. Ícones Lucide: sempre checar com `typeof icon !== "string"` (são objetos `forwardRef`, não funções).
11. Sparklines: buscar `created_at` + campo relevante dos últimos 7 meses, bucketar por mês em JS.
12. Cores de severidade: coral = crítico, amber = atenção, cyan = info.

## Tabelas Supabase

| Tabela | Uso |
|---|---|
| `leads` | CRUD principal de contatos |
| `lead_events` | Histórico de comportamento + score (trigger automático) |
| `campaigns` | Campanhas de email |
| `campaign_sends` | Métricas por lead/campanha |
| `automation_flows` | Fluxos de automação |
| `flow_runs` | Log de execução por lead |
| `landing_pages` | Páginas e formulários |
| `form_submissions` | Submissões com UTM |
| `segments` | Listas estáticas e dinâmicas |
| `team_members` | Membros da equipe (usado em /settings → Equipe) |
| `dashboard_alerts` | Alertas configurados (usado em /dashboard → Overview) |

## Usuários de autenticação (Supabase Auth)

| Email | Perfil |
|---|---|
| `raquel@vantari.com.br` | Admin (acesso total) |
| `catarina.quartucci@vantari.com.br` | Membro |

Senhas gerenciadas via Supabase Auth. Para redefinir: `UPDATE auth.users SET encrypted_password = crypt('NovaSenha', gen_salt('bf')) WHERE email = '...'`

## Score thresholds

- Cold: 0–20
- Warm: 21–50
- Hot: 51–100
- Sales Ready: 100+

## Estágios do funil

Visitor → Lead → MQL → SQL → Opportunity → Customer

## Behavioral rules (aplicar em todos os módulos)

- Nunca enviar email para `unsubscribed = true`
- Deduplicate por `email` (constraint no banco)
- Max 1 email/dia por lead (exceto transacional)
- Log cada step de flow com timestamp em `flow_runs.log`
- RLS habilitado com policies abertas (`using (true)`) para dev — trocar por `auth.uid()` antes de produção
