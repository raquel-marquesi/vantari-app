# Vantari — Histórico de Alterações

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
