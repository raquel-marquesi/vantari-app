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
