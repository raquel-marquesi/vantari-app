# Vantari — CLAUDE.md

## Visão geral do projeto

Vantari é uma plataforma de marketing SaaS com interface React + Vite. Tema claro, sidebar fixa por página, roteamento client-side via React Router. Cada página é um componente independente que gerencia seu próprio layout (sidebar + conteúdo).

## Stack

- **Framework**: React 19 + Vite 8
- **Roteamento**: react-router-dom v7 (`useNavigate`, sem `<a href>` interno)
- **Gráficos**: recharts
- **Ícones**: lucide-react (atenção: ícones são objetos `forwardRef`, não funções — usar `typeof icon !== "string"` para checar)
- **Deploy**: Vercel — https://vantari-app.vercel.app

## Estrutura de arquivos

```
src/
  App.jsx                          # Roteamento principal (lazy + Suspense, sem sidebar global)
  main.jsx                         # Entry point
  index.css / App.css              # Estilos globais
  vantari-auth-system.jsx          # /login
  vantari-analytics-dashboard.jsx  # /dashboard
  vantari-leads-module.jsx         # /leads
  vantari-scoring-system.jsx       # /scoring
  vantari-email-marketing.jsx      # /email
  vantari-landing-pages.jsx        # /landing
  vantari-ai-marketing.jsx         # /ai-marketing
  vantari-integrations-hub.jsx     # /integrations
  vantari-settings-admin.jsx       # /settings
  vantari-onboarding-wizard.jsx    # /onboarding
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

## Comandos úteis

```bash
npm run dev       # servidor local (porta 5173)
npm run build     # build de produção
npm run preview   # preview do build local
vercel            # deploy preview
vercel --prod     # deploy produção
vercel --prod --yes  # deploy produção sem confirmação interativa
```

## Convenções

- Arquivos de página ficam direto em `src/` (sem subpasta `pages/`)
- Cada página exporta um default export e gerencia seu próprio layout completo (sidebar + main)
- Paleta de design tokens: `bg #f2f5f8`, `surface #fff`, `primary #0079a9`, `accent #05b27b`, `text #5f5f64`, `muted #888891`
- Fontes: `Montserrat` para títulos/sidebar, `'Aptos', 'Nunito Sans', sans-serif` para corpo
- Estilos todos inline (sem arquivos CSS por página)
- Navegação interna sempre via `useNavigate` do react-router-dom
- Ícones Lucide: sempre checar com `typeof icon !== "string"` (são objetos `forwardRef`, não funções)
- Onboarding do cliente persistido em `localStorage` sob a chave `vantari_onboarding`
- Não há testes automatizados no projeto atualmente
