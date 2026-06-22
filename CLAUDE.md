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
  vantari-leads-module.jsx         # /leads         ← 4 abas: Leads / Empresas / Importações / Exportações
  vantari-scoring-system.jsx       # /scoring       ← HeroKpiCard + sparklines
  vantari-email-marketing.jsx      # /email         ← HeroKpiCard + sparklines (campaigns/sends) + aba "Biblioteca Vantari" em Templates com 5 cards e iframe preview
  vantari-landing-pages.jsx        # /landing       ← HeroKpiCard + sparklines (form_submissions) + aba "Biblioteca" com 3 LPs (LibraryLPCard, LibraryView, MODULAR_BLOCKS, LP_PREVIEW_BODIES)
  vantari-ai-marketing.jsx         # /ai-marketing  ← leads reais via Supabase
  vantari-integrations-hub.jsx     # /integrations
  vantari-settings-admin.jsx       # /settings      ← 5 abas: Minha Conta (perfil + troca de senha via Supabase Auth) / Geral (empresa, região, remetente — persiste em localStorage) / Equipe / Campos Personalizados / Lead Tracking
  vantari-onboarding-wizard.jsx    # /onboarding    ← localStorage
  vantari-workflow-builder.jsx     # /workflow
  vantari-segments.jsx             # /segments      ← HeroKpiCard + sparklines + filtro "visitou página"
  assets/                          # hero.png, react.svg, vite.svg

supabase/
  migrations/
    001_custom_fields.sql          # custom_fields + lead_custom_values + seed 49 cf_*
    002_leads_core.sql             # leads + lead_events + trigger score
    003_lead_tracking.sql          # tracked_pages + page_visits + trigger → lead_event
    004_companies_imports.sql      # companies + lead_imports + lead_exports
    005_lead_scoring_2d.sql        # lead_profile enum + profile_rules + profile_thresholds + scoring_rules + função recompute_lead_profile + triggers
    006_forms_standalone.sql       # forms + form_submissions + trigger que cria lead automaticamente
    007_cpf_identifier.sql         # coluna cpf em leads (UNIQUE) + validador checksum + função merge_lead_by_cpf
    008_email_templates.sql        # email_templates + bee_json column (BeeFree) + seed 3 templates
    009_campaigns.sql              # campaigns + campaign_sends (FKs condicionais)
  functions/
    track/index.ts                 # Edge Function que recebe pings do tracker.js

src/
  vantari-public-form.jsx          # /f/:slug — página pública embedável (sem auth)

public/
  tracker.js                       # Snippet JS público (instalar em vantari.com.br)
  forms-embed.js                   # Snippet JS para embedar form via <script> em sites externos
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
| `/f/:slug` | PublicForm (rota pública, sem auth) — render do form embedável |

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
8. **Identidade do lead**: CPF é o identificador único primário (UNIQUE). Email é UNIQUE quando preenchido (fallback). Lead sem CPF aparece como **PENDENTE**.
9. Navegação interna sempre via `useNavigate` do react-router-dom.
10. Ícones Lucide: sempre checar com `typeof icon !== "string"` (são objetos `forwardRef`, não funções).
11. Sparklines: buscar `created_at` + campo relevante dos últimos 7 meses, bucketar por mês em JS.
12. Cores de severidade: coral = crítico, amber = atenção, cyan = info.

## Tabelas Supabase

| Tabela | Uso |
|---|---|
| `leads` | CRUD principal. Identidade: **CPF (UNIQUE)** + email (UNIQUE). Coluna `profile` (A/B/C/D) e `profile_points` (migration 002 + 005 + 007) |
| `lead_events` | Histórico comportamental + score (trigger automático, migration 002) |
| `custom_fields` | Definição dos 49 campos personalizados cf_* + `cf_cpf` (migration 001 + 007) |
| `lead_custom_values` | Valores dos campos personalizados por lead (migration 001) |
| `tracked_pages` | Catálogo de URLs rastreadas (migration 003) |
| `page_visits` | Visitas registradas pelo tracker.js — trigger gera `lead_event` (migration 003) |
| `companies` | Empresas vinculadas aos leads via `leads.company_id` (migration 004) |
| `lead_imports` | Histórico de importações CSV (migration 004) |
| `lead_exports` | Histórico de exportações CSV (migration 004) |
| `profile_rules` | Regras de Perfil (A-D) configuráveis em `/scoring` (migration 005) |
| `profile_thresholds` | Thresholds A/B/C/D em pontos (migration 005) |
| `scoring_rules` | Regras de Interesse (pontuação dinâmica) — persistido (migration 005) |
| `forms` | Formulários standalone embedáveis (migration 006) |
| `form_submissions` | Submissões — trigger cria/atualiza lead (migration 006/007) |
| `email_templates` | Templates de email com suporte a `html`, `blocks` e `bee_json` (BeeFree do RD) (migration 008) |
| `campaigns` | Campanhas de email (migration 009) |
| `campaign_sends` | Métricas agregadas por campanha (migration 009) |
| `automation_flows` | Fluxos de automação |
| `flow_runs` | Log de execução por lead |
| `landing_pages` | Páginas e formulários |
| `segments` | Listas estáticas e dinâmicas |
| `team_members` | Membros da equipe (usado em /settings → Equipe) |
| `dashboard_alerts` | Alertas configurados (usado em /dashboard → Overview) |

### ENUMs criados
- `custom_field_type`: text, textarea, email, phone, url, number, date, datetime, select, multiselect, radio, checkbox
- `custom_field_source`: manual, crm_sync, fb_forms, google_ads, imported, system
- `lead_stage`: Visitor, Lead, MQL, SQL, Opportunity, Customer
- `lead_profile`: A, B, C, D (migration 005)
- `page_funnel`: topo, meio, fundo, institucional, outro
- `import_status`: pending, processing, done, failed, canceled

### Convenção `api_id` dos custom_fields
- `cf_*` — campos manuais
- `cf_plug_*` — sincronizados com CRM externo (legado RD)
- `cf_fb_forms_*` — preenchidos via Meta Lead Ads (13 campos: P1-P4 + 5 UTMs)

## Migração do RD Station (em andamento)

Plano em 11 etapas pra substituir 100% o RD Station Marketing.

| Etapa | Status | Descrição |
|---|---|---|
| **0** — Campos Personalizados | ✅ | Migration 001 + aba `/settings` → Campos Personalizados (CRUD dos 49 cf_*) |
| **1** — Lead Scoring 2D | ✅ | Migration 005 + tab `/scoring → Perfil (A-D)` + matriz 2D Perfil×Interesse + thresholds configuráveis |
| **2** — Lead Tracking | ✅ | Migration 003 + Edge Function `/track` + `public/tracker.js` + UI em /settings + timeline no perfil + filtro em /segments |
| **3** — Meta Lead Ads | ⏭️ pulada | Requer Meta Developer App. Pendente |
| **4** — Atrair (Social/SEO/Link Bio) | ⏳ | |
| **5** — Conversão (Forms/Pop-ups/Web Push) | 🟡 parcial | Forms standalone ✅ (migration 006 + tab `/landing → Formulários` + rota pública `/f/:slug` + snippet `forms-embed.js`). Pop-ups e Web Push ⏳ |
| **6** — Leads ampliado | ✅ | Migration 004 + 4 abas (Leads / Empresas / Importações / Exportações) + 8 categorias de Atividades no perfil |
| **7** — Analisar (Canais/UTM/Atribuição) | ⏳ | |
| **8** — GA4 + Google Ads | ⏳ | |
| **9** — Relacionar (WhatsApp/SMS/Chatbot) | ⏳ | WhatsApp via Meta Cloud API (oficial) |
| **10** — Validador Email + Lista Inteligente | ⏳ | |
| **11** — Polimento + cutover | 🟡 parcial | Importador de leads RD turbinado (preset + bulk upsert) ✅. Importador de templates (HTML + BeeFree JSON) ✅. **Biblioteca de 5 templates de email** ✅ (EMAIL_BODIES + iframe preview + aba "Biblioteca Vantari"). **Biblioteca de 3 LPs Vantari** ✅ (LP_PREVIEW_BODIES + browser-frame + LibraryView + 16 MODULAR_BLOCKS). Importador de segmentos: usuário recriará manualmente. Importador de campanhas históricas ⏳. Cutover ⏳ |

### Identidade do lead (decisão arquitetural)
- **CPF é o identificador único primário** (migration 007). Pessoas mudam de email, mas não mudam de CPF.
- Email continua UNIQUE quando preenchido (legacy/fallback)
- Lead sem CPF = status **PENDENTE** (precisa completar antes do faturamento)
- Função `merge_lead_by_cpf` no banco funde leads quando CPF descoberto depois (eventos, custom values, tags, form submissions migram para o lead com CPF)

Auditoria do RD em `auditoria rd/Auditoria_RDStation_Vantari.docx` + `Auditoria_RDStation_Vantari_Complemento.docx`.

## Usuários de autenticação (Supabase Auth)

| Email | Perfil |
|---|---|
| `raquel@vantari.com.br` | Admin (acesso total) |
| `catarina.quartucci@vantari.com.br` | Membro |

Senhas gerenciadas via Supabase Auth. Para redefinir: `UPDATE auth.users SET encrypted_password = crypt('NovaSenha', gen_salt('bf')) WHERE email = '...'`

## Score thresholds (Interesse)

- Cold: 0–20
- Warm: 21–50
- Hot: 51–79
- SQL: 80+

## Perfil thresholds (modelo RD 2D)

- Perfil A (ideal): ≥ 70 pts (default, configurável em `/scoring → Perfil`)
- Perfil B (bom): ≥ 40 pts
- Perfil C (médio): ≥ 20 pts
- Perfil D: 0–19 pts

**MQL = Perfil A ou B com Interesse Hot ou SQL** (matriz 2D em `/scoring → Perfil`)

## Estágios do funil

Visitor → Lead → MQL → SQL → Opportunity → Customer

## Lead Tracking — como funciona

1. **Snippet `public/tracker.js`** instalado em `vantari.com.br` (via plugin WordPress WPCode)
2. Cada visita dispara `POST` para a Edge Function `/track`
3. Edge Function:
   - Resolve `lead_id` por cookie `_vantari_vid` (anônimo) ou `email` (identificado)
   - Procura match em `tracked_pages` (URL normalizada)
   - Insere registro em `page_visits`
4. Trigger SQL: se a `page_visits` é identificada **e** a página é rastreada, gera `lead_event` com `score_delta` configurado na página → recalcula `leads.score`
5. UI:
   - `/settings` → Lead Tracking: gerenciar páginas rastreadas (CRUD) + snippet copiável
   - `/leads/:id` (panel): **Atividades** com 8 categorias filtráveis
   - `/segments`: filtro "Visitou página X / Não visitou"

API JS no site:
- `Vantari.identify({ email, lead_id })` — vincula visitante anônimo a um lead
- `Vantari.track("/path")` — disparo manual de visita
- `Vantari.reset()` — limpa identificação (logout)

## Forms standalone — como funciona

1. Criar form em `/landing → Formulários` (CRUD: nome, slug, campos, source_label, tags, mensagem de sucesso)
2. Embed code disponível em 3 formatos:
   - **URL pública**: `https://vantari-app.vercel.app/f/:slug` (compartilhar direto)
   - **Iframe**: `<iframe src=".../f/:slug" style="width:100%;max-width:520px;height:520px;border:0"></iframe>`
   - **Script JS**: `<script async src=".../forms-embed.js" data-form=":slug"></script>` — injeta iframe responsivo
3. UTMs vêm da querystring da página hospedeira (forward automático)
4. Submissão → `form_submissions` → trigger `trg_form_submission_to_lead`:
   - Se CPF: upsert por CPF (merge automático com lead email-only se houver match)
   - Senão se email: upsert por email
   - Insere `lead_event` com `form_submit` (+10 pts via `scoring_rules`)
5. Source do lead = `forms.source_label` ou `"Form: <name>"`

## Bibliotecas de templates (Etapa 11)

### Email — Biblioteca Vantari (`/email → Templates → Biblioteca Vantari`)
- 5 cards de template com iframe preview isolado
- `EMAIL_PREVIEW_CSS`: estilos base compartilhados para os previews
- `EMAIL_BODIES`: objeto `{ [id]: htmlString }` com HTML de cada template
- `getEmailPreviewHtml(id)` — monta `<!doctype html>` com CSS + body para o `srcDoc` do iframe
- Cada card: nome, tag de categoria, from/subject, iframe preview + botões "Usar" / "Pré-visualizar"

### Landing Pages — Biblioteca Vantari (`/landing → Biblioteca`)
- 3 LP templates: B2B Consultivo (01), B2C Performance/dark (02), B2C Educativa/light (03)
- `LIBRARY_LP_TEMPLATES`: array com metadados (id, num, color, name, tag, audience, cta, traction, convTarget, url, blocks[])
- `LP_PREVIEW_BODIES`: objeto `{ [id]: htmlString }` com HTML/CSS de cada LP
- `getLPPreviewHtml(id)` — monta o doctype completo para `srcDoc`
- `LibraryLPCard`: card com browser-frame mockup + `ResizeObserver` para escala dinâmica (`scale = containerWidth / 1280`), `iframeH = visibleH / scale`
- `LibraryView`: grid `repeat(auto-fill, minmax(380px,1fr))` + seção de 16 `MODULAR_BLOCKS`
- Terceiro estado de `viewMode`: `"pages" | "forms" | "biblioteca"`

### Padrão iframe preview (ambas as bibliotecas)
- `srcDoc` com `sandbox="allow-same-origin"` para isolamento
- `ResizeObserver` no container → recalcula `scale` dinamicamente
- HTML das previews: conteúdo ASCII-safe (evitar acentos diretos em template literals para evitar encoding issues)

## Email templates — como importar do RD

1. No RD Station: **Email Marketing → Templates → exportar** (HTML ou JSON BeeFree)
2. No Vantari: `/email → Templates → Importar do RD`
3. Aceita: `.html`, `.htm`, `.json` (BeeFree) — auto-detecta formato
4. Para BeeFree: extrai texto/imagem/botão/divider e gera HTML básico para preview; salva JSON original em `email_templates.bee_json` para conversão completa futura

## Behavioral rules (aplicar em todos os módulos)

- Nunca enviar email para `unsubscribed = true`
- **Identidade única**: CPF primeiro, email como fallback (constraint no banco)
- Lead sem CPF = status PENDENTE (não enviar campanhas até completar)
- Max 1 email/dia por lead (exceto transacional)
- Log cada step de flow com timestamp em `flow_runs.log`
- RLS habilitado com policies abertas (`using (true)`) para dev — trocar por `auth.uid()` antes de produção
