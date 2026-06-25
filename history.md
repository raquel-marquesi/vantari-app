# Vantari — Histórico de Desenvolvimento

---

## 2026-05-19 — Bibliotecas de templates (Email + Landing Pages)

### Email Marketing — Biblioteca Vantari de Templates ✅

**Frontend (`vantari-email-marketing.jsx`):**
- Tab **Biblioteca Vantari** + tab **Importados do RD** no view Templates
- 5 cards com preview iframe sandboxed escalado a 0.46x (600px → container)
- `LIBRARY_TEMPLATES`: Editorial (teal), Comparativo (green), Oferta Qualificada (amber), Boas-vindas (violet), Atualização de Status (coral)
- Cada card: badge numerado, tag de categoria, meta strip (cadência/audiência/CTA/tempo de leitura), slots ativados, variáveis de personalização (`*|PRIMEIRO_NOME|*` etc.)
- `EMAIL_BODIES`: 5 corpos HTML completos com CSS inline (fontes Montserrat/Nunito Sans via Google Fonts)
- `EMAIL_PREVIEW_CSS`: CSS compartilhado para todos os iframes (classes `.pre`, `.hdr`, `.hero`, `.body`, `.ey`, `.h1`, `.lead`, `.tldr`, `.cta`, `.compare`, `.stats`, `.offer`, `.steps`, `.payout`, `.timeline`, `.banner`, `.ftr`)
- Botão "Usar template →" pré-preenche rascunho de campanha
- Fix: curly quotes (`"Newsletter Blog"`) dentro de string JS → single-quote outer wrapper

### Landing Pages — Biblioteca Vantari de LPs ✅

**Frontend (`vantari-landing-pages.jsx`):**
- Tab toggle **Páginas | Formulários | Biblioteca** no topbar de `/landing`
- `LIBRARY_LP_TEMPLATES`: 3 templates com metadados (cor, tag, audiência, CTA, tração, conv. alvo, URL, blocos)
- `LibraryLPCard`: browser-frame mockup com escala dinâmica via `ResizeObserver` (iframe 1280px → escala proporcional ao container), barra de chrome com traffic lights + URL bar
- `LP_PREVIEW_BODIES`: 3 corpos HTML com CSS inline fiel ao design doc:
  - **LP01 B2B Escritórios** — hero-light, 2 colunas, form-card branco, kpi-row, paleta teal
  - **LP02 B2C Performance** — hero-dark com `radial-gradient` azul-preto, live-strip "Última liberação", form dark
  - **LP03 B2C Educativa** — hero-split, phone-mockup com progress steps, calc-row (R$ 80k → R$ 52.3k)
- `LibraryView` com info strip (16 blocos / 3 paletas / densidades) + grid de 16 blocos modulares documentados
- Botão "Usar template →" abre modal Nova Página

### Problemas resolvidos
- Curly quotes Unicode dentro de JS template literals: outer wrapper com single-quote
- Build limpo: `vantari-email-marketing.jsx` 112 kB, `vantari-landing-pages.jsx` 113 kB

---

## 2026-05-18 — Sessão intensiva: Scoring 2D, CPF, Forms, Templates RD

### Etapa 1 — Lead Scoring 2D ✅

**Backend (`005_lead_scoring_2d.sql`):**
- ENUM `lead_profile` (A/B/C/D); colunas `leads.profile` e `leads.profile_points`
- Tabela `profile_rules` (regras configuráveis: lead_column ou custom_field + operador + valor + pontos)
- Tabela `profile_thresholds` (linha única, defaults 70/40/20)
- Tabela `scoring_rules` (persiste regras de Interesse antes hardcoded)
- Funções `eval_profile_rule`, `get_lead_field_value`, `recompute_lead_profile`, `recompute_all_profiles`
- Triggers automáticos em `leads` (insert) e `lead_custom_values` (qualquer mudança) → recalculam perfil
- Seeds: 11 regras de Interesse + 5 regras de Perfil

**Frontend (`vantari-scoring-system.jsx`):**
- Tab **Perfil (A-D)** com construtor visual de regras (categoria, origem, campo, operador, valor, pontos)
- Sliders A/B/C de thresholds persistidos no banco
- Botão **Recalcular todos** (chama `recompute_all_profiles` via RPC)
- **Matriz 2D Perfil × Interesse** com células coloridas e destaque "MQL ideal" em A/B × Hot/SQL
- Distribuição A/B/C/D em barras horizontais
- Badges A/B/C no topbar ao lado de WARM/HOT/SQL

**`vantari-leads-module.jsx`:** coluna **Perfil** (chip + pontos), filtro por perfil, painel detalhe com Perfil + Interesse lado a lado.
**`vantari-segments.jsx`:** filtros `profile` e `profile_points` no segment builder.

### Etapa 11 (parcial) — Importador de Leads RD turbinado ✅

- Preset **RD Station** auto-mapeia colunas conhecidas
- Match por `label` de custom_fields
- Bulk upsert 200/chamada (20-50x mais rápido)
- Dedupe: cada campo recebe apenas primeira ocorrência
- Detector visual de conflitos + bloqueio do botão
- Auto-skip de linhas de título antes do header real

### Identidade do lead — CPF como primário (decisão arquitetural) ✅

Motivação: pessoas mudam de email, não mudam de CPF. RD usa email como ID — ponto fraco a evitar.

**Backend (`007_cpf_identifier.sql`):**
- Coluna `cpf` em leads + `clean_cpf()` (normaliza p/ 11 dígitos) + `valid_cpf()` (checksum brasileiro)
- Trigger `trg_normalize_cpf` antes de insert/update
- Índice UNIQUE parcial em `cpf` (NULL permitido)
- **Função `merge_lead_by_cpf`**: quando CPF é descoberto e já há lead com mesmo CPF, funde os dois:
  - Move `lead_events`, `form_submissions`
  - Move `lead_custom_values` (target ganha em conflito)
  - Atualiza campos NULL do target com source
  - Funde tags, mantém maior score
  - Deleta source
- View `leads_pending` para consulta rápida
- Cria `cf_cpf` em custom_fields

**Frontend:**
- Coluna **CPF** formatada em `/leads` (`000.000.000-00`)
- Badge **PENDENTE** vermelho + filtro toggle "Pendentes" + busca por CPF
- Modal de criação/edição: CPF + email; valida checksum
- Importador detecta "CPF", "Documento", "CPF/CNPJ" automaticamente
- doImport separa em 2 grupos (byCpf, byEmail) e faz bulk upsert por grupo

### Etapa 5 (parcial) — Forms standalone ✅

**Backend (`006_forms_standalone.sql`):**
- Tabela `forms` (slug, fields jsonb, style, source_label, tags, success_msg, redirect_url, stage_on_submit)
- Tabela `form_submissions` (payload jsonb, UTMs, user_agent, referrer)
- **Função `trg_form_submission_to_lead`**:
  - Upsert por CPF (prioridade) ou email
  - Merge automático quando CPF descoberto + email existente em outro lead
  - Insere lead_event `form_submit` (+10 pts via scoring_rules)
  - Incrementa `forms.submission_count`

**Frontend:**
- Tab toggle **Páginas | Formulários** em `/landing`
- `FormsManager` — CRUD de forms, embed code modal
- `FormEditor` — campos jsonb editáveis (drag-order, tipos: text/email/cpf/phone/number/date/textarea/select/checkbox)
- `EmbedCodeModal` — 3 formatos: URL pública / iframe / script JS
- **Rota pública** `/f/:slug` em novo `vantari-public-form.jsx`:
  - Validação CPF (checksum) + email
  - Format on-type
  - Forward de UTMs da querystring
  - Mensagem de sucesso ou redirect
- **Snippet `public/forms-embed.js`** — injeta iframe responsivo no site externo

### Etapa 11 (parcial) — Importador de Email Templates ✅

**Backend (`008_email_templates.sql`):**
- Tabela `email_templates` com `html`, `blocks` (Vantari), `bee_json` (BeeFree do RD)
- Colunas defensivas (compat com schema legado)
- Seed: 3 templates iniciais

**Frontend (`vantari-email-marketing.jsx`):**
- Tab Templates puxa do banco (antes hardcoded)
- Filtro por categoria, contador de uso, badge "DO RD"
- `RdImportModal`: aceita `.html`, `.htm`, `.json` (auto-detecta)
- **Extrator BeeFree**: parseia rows/columns/modules e gera HTML básico para preview (text/image/button/divider)
- `TemplatePreviewModal` com iframe sandboxed

### Etapa 9 (parcial) — Campaigns ✅

**Backend (`009_campaigns.sql`):**
- Tabela `campaigns` (html_content, bee_json, blocks, template_id com FK condicional, audience_count, scheduled_at)
- Tabela `campaign_sends` (delivered/opened/clicked/bounced/unsubscribed)
- FKs adicionadas DEPOIS das colunas (fix de ordem)

### Discussões / Decisões

- **149 segmentos RD**: API não expõe regras. Usuário decidiu recriar manualmente os críticos em vez de importar listas estáticas.
- **28 arquivos RD**: confirmado que são campanhas históricas (não templates). Usuário vai baixar templates reais e importar.

### Problemas resolvidos

- Schemas legados em `scoring_rules`, `leads`, `forms`, `campaigns`: ALTER COLUMN DROP NOT NULL + ADD COLUMN IF NOT EXISTS via DO blocks
- Lockfile do git: documentado fluxo de remoção antes do push
- Índice UNIQUE parcial não funciona com ON CONFLICT: troca por constraint UNIQUE completa
- Coluna `tags` NOT NULL bloqueando upsert: relaxado
- FK duplicada `campaigns × campaign_sends`: removida a nova, mantida a legacy
- CSV com linha de título antes do header: auto-skip implementado

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

---

## 2026-06-25 — Auditoria, correção de RLS e reestruturação para core canônico

Sessão longa, branch `claude/funny-ramanujan-9d11e5`. (Detalhes e arquitetura em [REESTRUTURACAO.md](REESTRUTURACAO.md); riscos em [feedback.md](feedback.md).)

### Auditoria de prontidão para produção
- Varredura do repo + banco vivo (`ejhrlrasepowdcdnggmv`). Provado empiricamente que a **chave anon lia E escrevia** tabelas de negócio sem login — `leads` (107 reais, com CPF) retornou 200; insert retornou 201. Vazamento ativo de PII (LGPD).
- Achados: AI Marketing 100% cenográfico (fetch a api.anthropic.com sem auth → cai em mock disfarçado), dashboard com gráficos vazios, ~13 botões fantasma em Integrations; envio de email (Resend/`send-campaign`) é REAL e operacional.

### Correção de segurança (APLICADA em produção)
- `supabase/proposals/0003_rls_hardening.sql` — fechou o acesso anon (lockdown "exige login" + exceções p/ form público + `integration_credentials` só service_role + revoga anon de views como `leads_pending`). **Aplicado e verificado**: anon agora vê 0 leads, form público intacto.

### Reestruturação: core canônico (PROPOSTAS, não aplicadas)
- Decidido consolidar Nina/Flow/Next num **core canônico** (1 banco); Nina federada via Edge Function `ingest`. Domínio confirmado: **cessão/antecipação de crédito trabalhista**.
- Criados e validados em Postgres 16 local: `0001_core_foundation` (identidade CPF/telefone + merge dinâmico + RLS), `0002_crm_flow` (processos + elegibilidade + deals por crédito), `0004_mkt_marketing` (score/forms/campanhas), `0005_fin_receivables` (antecipações + tranches), `supabase/functions/ingest`.
- Docs: `REESTRUTURACAO.md` (mestre), `feedback.md` (diário de auditor). `plan.md` marcado como fase anterior.
