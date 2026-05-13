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

## Pendente para próximas sessões

- [ ] `vantari-scoring-system.jsx` → conectar `lead_events`
- [ ] `vantari-email-marketing.jsx` → conectar `campaigns` + `campaign_sends`
- [ ] Criar `vantari-automation-flows.jsx` do zero (ou conectar workflow builder ao Supabase)
- [ ] Supabase Auth real (substituir auth mock)
- [ ] Segmentação dinâmica (`segments`)
- [ ] Reports com dados reais
- [ ] RLS com `auth.uid()` antes de produção
