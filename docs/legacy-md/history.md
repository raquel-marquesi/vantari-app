# Vantari — Histórico de Desenvolvimento

---

## Sessão 1 — Auditoria e Setup (Mai 2026)

### Auditoria inicial
- Analisado o deploy em https://vantari-app.vercel.app/dashboard
- Identificados 10 módulos com UI completa mas zero backend
- Gap crítico: módulo de Automation Flows ausente
- Todos os dados eram mock estáticos

### Setup Supabase
- Projeto criado: `ejhrlrasepowdcdnggmv.supabase.co`
- Instalado `@supabase/supabase-js` via npm
- Criado `src/supabase.js` com `createClient`
- Variáveis de ambiente configuradas no Vercel e `.env` local

### Schema SQL criado (via SQL Editor do Supabase)
Tabelas: `leads`, `lead_events`, `campaigns`, `campaign_sends`,
`automation_flows`, `flow_runs`, `landing_pages`, `form_submissions`, `segments`

Triggers criados:
- `trg_update_lead_score` — atualiza `leads.score` ao inserir em `lead_events`
- `trg_leads_updated_at` / `trg_campaigns_updated_at` / `trg_flows_updated_at`

RLS habilitado com policies abertas (`using (true)`) para fase de desenvolvimento.

### Módulo Leads — conectado ao Supabase
**Arquivo:** `src/vantari-leads-module.jsx`

Funcionalidades implementadas com dados reais:
- Listagem de leads com busca (nome/email/empresa) via query Supabase
- Filtro por estágio aplicado na query
- Stat cards (total, hot, MQL, customers) calculados do array retornado
- Modal de criação (`INSERT`) com deduplicação por email
- Modal de edição (`UPDATE`)
- Exclusão (`DELETE`) com confirmação
- Painel lateral de detalhes ao clicar na linha
- Score badge (Cold/Warm/Hot/Sales Ready) e stage badge coloridos
- Loading state com spinner, error state com banner

---

## Pendente para próximas sessões
- [ ] `vantari-scoring-system.jsx` → conectar `lead_events`
- [ ] `vantari-email-marketing.jsx` → conectar `campaigns` + `campaign_sends`
- [ ] Criar `vantari-automation-flows.jsx` do zero
- [ ] Supabase Auth real (substituir auth mock)
- [ ] Segmentação dinâmica (`segments`)
- [ ] Reports com dados reais
- [ ] RLS com `auth.uid()` antes de produção
