# Vantari — Plano de Desenvolvimento

## Stack
- **Frontend:** React 19 + Vite 8, hospedado na Vercel
- **Backend:** Supabase (PostgreSQL + Auth + RLS)
- **URL produção:** https://vantari-app.vercel.app
- **Supabase project:** https://ejhrlrasepowdcdnggmv.supabase.co
- **Repositório:** https://github.com/raquel-marquesi/vantari-app (privado)

---

## Status dos Módulos

| Módulo | Arquivo | Backend |
|---|---|---|
| Auth / Login | vantari-auth-system.jsx | — (mock) |
| Dashboard Analytics | vantari-analytics-dashboard.jsx | mock |
| **Lead Management** | vantari-leads-module.jsx | **✅ Supabase real** |
| Lead Scoring | vantari-scoring-system.jsx | mock |
| Email Marketing | vantari-email-marketing.jsx | mock |
| Landing Pages | vantari-landing-pages.jsx | mock |
| AI Marketing | vantari-ai-marketing.jsx | mock |
| Integrações | vantari-integrations-hub.jsx | mock |
| Settings | vantari-settings-admin.jsx | mock |
| Onboarding Wizard | vantari-onboarding-wizard.jsx | localStorage |
| Workflow Builder | vantari-workflow-builder.jsx | mock |

---

## Infraestrutura

- [x] Deploy na Vercel
- [x] Repositório GitHub criado e conectado ao Vercel (deploy automático no push `main`)
- [x] `vercel.json` com rewrite SPA (resolve 404 ao recarregar)
- [x] Supabase provisionado e schema criado
- [x] `src/supabase.js` com `createClient`
- [x] Variáveis de ambiente no Vercel e `.env` local
- [ ] Domínio customizado no Vercel
- [ ] RLS com `auth.uid()` (atualmente `using (true)` para dev)

---

## Próximos passos (ordem de prioridade)

1. **Conectar `vantari-scoring-system.jsx`** → tabela `lead_events`
2. **Conectar `vantari-email-marketing.jsx`** → tabelas `campaigns`, `campaign_sends`
3. **Auth real com Supabase Auth** → substituir login mock, proteger rotas
4. **Criar módulo de Automation Flows** → conectar workflow builder ao Supabase (`automation_flows`, `flow_runs`)
5. **Segmentação dinâmica** → tabela `segments`
6. **Email sending real** → Resend ou SendGrid via Supabase Edge Functions
7. **Reports com dados reais** → queries agregadas no dashboard
8. **RLS com `auth.uid()`** → antes de ir a produção real
9. **Mobile responsivo** → layout adaptativo nas páginas principais

---

## Schema Supabase (implementado)

```
leads              — contatos com score, stage, tags, unsubscribed
lead_events        — comportamento; trigger atualiza leads.score
campaigns          — campanhas de email
campaign_sends     — métricas por lead/campanha
automation_flows   — definição dos fluxos
flow_runs          — log de execução por lead
landing_pages      — páginas e formulários
form_submissions   — submissões com UTM
segments           — listas estáticas e dinâmicas
```

Triggers ativos:
- `trg_update_lead_score` — score automático ao inserir `lead_events`
- `trg_leads_updated_at`, `trg_campaigns_updated_at`, `trg_flows_updated_at`

---

## Variáveis de Ambiente

```env
VITE_SUPABASE_URL=https://ejhrlrasepowdcdnggmv.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
```

Configuradas em: Vercel Dashboard → Settings → Environment Variables **e** `.env` local na raiz do projeto.
