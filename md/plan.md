# Vantari — Plano de Desenvolvimento

## Stack
- **Frontend:** React + Vite, hospedado na Vercel
- **Backend:** Supabase (PostgreSQL + Auth + RLS)
- **URL produção:** https://vantari-app.vercel.app
- **Supabase project:** https://ejhrlrasepowdcdnggmv.supabase.co
- **Repositório:** https://github.com/raquel-marquesi/vantari-app

---

## Status dos Módulos

### ✅ Concluído
| Módulo | Arquivo | Backend |
|---|---|---|
| Auth / Login | vantari-auth-*.jsx | — |
| Dashboard Analytics | vantari-analytics-dashboard.jsx | mock |
| **Lead Management** | vantari-leads-module.jsx | **✅ Supabase real** |
| Lead Scoring (UI) | vantari-scoring-system.jsx | mock |
| Email Marketing (UI) | vantari-email-marketing.jsx | mock |
| Landing Pages (UI) | vantari-landing-page-*.jsx | mock |
| AI Marketing (UI) | vantari-ai-marketing.jsx | mock |
| Integrações (UI) | vantari-integrations-*.jsx | mock |
| Settings (UI) | vantari-settings-*.jsx | mock |
| Onboarding Wizard | vantari-onboarding-wizard.jsx | localStorage |

### 🔄 Em andamento
- Conexão Supabase nos módulos restantes

### ❌ Pendente
| Módulo | Prioridade |
|---|---|
| Automation Flows (builder) | Alta |
| Segmentação dinâmica | Alta |
| Email sending real (Resend / SendGrid) | Alta |
| Lead Scoring com eventos reais | Média |
| CRM Integration (webhook) | Média |
| Reports com dados reais | Média |
| Progressive profiling em forms | Baixa |
| UTM capture em landing pages | Baixa |
| Auth real (Supabase Auth) | Alta |
| Mobile responsivo | Baixa |

---

## Schema Supabase (implementado)

Tabelas criadas via SQL Editor:
- `leads` — com trigger `update_lead_score` e `set_updated_at`
- `lead_events` — pontuação automática via trigger
- `campaigns`
- `campaign_sends`
- `automation_flows`
- `flow_runs`
- `landing_pages`
- `form_submissions`
- `segments`

RLS habilitado com policies abertas para dev (`using (true)`).  
**Antes de produção:** trocar policies por `auth.uid()`.

---

## Variáveis de Ambiente

### Vercel (produção)
```
VITE_SUPABASE_URL=https://ejhrlrasepowdcdnggmv.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
```

### Local (.env na raiz)
```
VITE_SUPABASE_URL=https://ejhrlrasepowdcdnggmv.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
```

---

## Próximos passos recomendados (ordem)
1. Conectar `vantari-scoring-system.jsx` ao Supabase (`lead_events`)
2. Conectar `vantari-email-marketing.jsx` (`campaigns`, `campaign_sends`)
3. Criar módulo `vantari-automation-flows.jsx` do zero
4. Adicionar Supabase Auth real (substituir auth mock)
5. Implementar segmentação dinâmica (`segments`)
