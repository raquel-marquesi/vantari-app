# Vantari — CLAUDE.md

## Visão geral do projeto

Vantari é uma plataforma de marketing SaaS com interface React + Vite. Tema escuro, sidebar colapsável, roteamento client-side via React Router.

## Stack

- **Framework**: React 19 + Vite 8
- **Roteamento**: react-router-dom v7
- **Gráficos**: recharts
- **Ícones**: lucide-react
- **Deploy**: Vercel — https://vantari-app.vercel.app

## Estrutura de arquivos

```
src/
  App.jsx                          # Layout principal + sidebar + rotas
  main.jsx                         # Entry point
  index.css / App.css              # Estilos globais
  vantari-auth-system.jsx          # /login
  vantari-analytics-dashboard-v2.jsx  # /dashboard
  vantari-leads-module.jsx         # /leads
  vantari-scoring-system-v2.jsx    # /scoring
  vantari-email-marketing (1).jsx  # /email
  vantari-landing-pages.jsx        # /landing
  vantari-ai-marketing.jsx         # /ai-marketing
  vantari-integrations-hub.jsx     # /integrations
  vantari-settings-admin.jsx       # (não roteado ainda)
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

## Comandos úteis

```bash
npm run dev       # servidor local (porta 5173)
npm run build     # build de produção
npm run preview   # preview do build local
vercel            # deploy preview
vercel --prod     # deploy produção
```

## Convenções

- Arquivos de página ficam direto em `src/` (sem subpasta `pages/`)
- Cada página exporta um default export
- Paleta: fundo `#060d1f`, sidebar `#0a0f1e`, azul ativo `#60a5fa`
- Não há testes automatizados no projeto atualmente
