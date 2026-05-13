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
  vantari-auth-system.jsx          # /login
  vantari-analytics-dashboard.jsx  # /dashboard
  vantari-leads-module.jsx         # /leads  ← conectado ao Supabase
  vantari-scoring-system.jsx       # /scoring
  vantari-email-marketing.jsx      # /email
  vantari-landing-pages.jsx        # /landing
  vantari-ai-marketing.jsx         # /ai-marketing
  vantari-integrations-hub.jsx     # /integrations
  vantari-settings-admin.jsx       # /settings
  vantari-onboarding-wizard.jsx    # /onboarding
  vantari-workflow-builder.jsx     # /workflow
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

## Comandos úteis

```bash
npm run dev          # servidor local (porta 5173)
npm run build        # build de produção
npm run preview      # preview do build local
git push             # dispara deploy automático no Vercel via GitHub
vercel --prod --yes  # deploy direto pelo CLI (alternativo)
```

## Design System

```js
const T = {
  bg:      "#f2f5f8",
  surface: "#fff",
  primary: "#0079a9",
  accent:  "#05b27b",
  text:    "#5f5f64",
  muted:   "#888891",
  danger:  "#e53935",
  border:  "#e8edf2",
};
```
- Fonte display/títulos: `Montserrat, sans-serif`
- Fonte corpo: `'Aptos', 'Nunito Sans', sans-serif`
- Bordas: `borderRadius` entre 8–16px
- Sombras leves: `0 1px 4px rgba(0,0,0,.05)`
- Estilos todos inline (sem arquivos CSS por página)

## Regras de código

1. **Sempre entregar o arquivo completo reescrito** — nunca snippets para merge manual.
2. Dados reais via Supabase. Nunca retornar a dados mock após conectar.
3. `useEffect` + `useCallback` para fetches com dependências de filtro.
4. Loading state com `<Loader2>` do lucide-react + `@keyframes spin`.
5. Error state com banner vermelho (`T.danger`) e ícone `<AlertCircle>`.
6. Formulários sem tag `<form>` — usar `onClick` nos botões.
7. Busca e filtros por estágio aplicados diretamente na query Supabase (não no array local).
8. Deduplicação de leads garantida pelo `UNIQUE` na coluna `email`.
9. Navegação interna sempre via `useNavigate` do react-router-dom.
10. Ícones Lucide: sempre checar com `typeof icon !== "string"` (são objetos `forwardRef`, não funções).

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
