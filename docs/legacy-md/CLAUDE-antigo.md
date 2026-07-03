# CLAUDE.md — Instruções para Claude Code

## Projeto
Vantari — plataforma de email marketing e gestão de leads (equivalente ao RD Station Marketing).

## Stack
- React + Vite
- Supabase (PostgreSQL, RLS habilitado)
- Vercel (deploy automático via GitHub main)
- Lucide React (ícones)
- Recharts (gráficos no dashboard)

## Cliente Supabase
Sempre importar de `./supabase` ou `../supabase`:
```js
import { supabase } from "./supabase";
```
O arquivo `src/supabase.js` já existe com `createClient` configurado via env vars.

## Design System
Usar sempre estes tokens (objeto `T` presente em cada módulo):
```js
const T = {
  bg: "#f2f5f8",
  surface: "#fff",
  primary: "#0079a9",
  accent: "#05b27b",
  text: "#5f5f64",
  muted: "#888891",
  danger: "#e53935",
  border: "#e8edf2",
};
```
- Fonte display/títulos: `Montserrat, sans-serif`
- Fonte corpo: `'Aptos', 'Nunito Sans', sans-serif`
- Bordas: `borderRadius` entre 8–16px
- Sombras leves: `0 1px 4px rgba(0,0,0,.05)`

## Sidebar
Todos os módulos usam o componente `<Sidebar active="/rota-atual" />` definido localmente em cada arquivo (padrão atual do projeto — não há componente compartilhado ainda).

## Regras de código
1. **Sempre entregar o arquivo completo reescrito** — nunca snippets para merge manual.
2. Dados reais via Supabase. Nunca retornar a dados mock após conectar.
3. `useEffect` + `useCallback` para fetches com dependências de filtro.
4. Loading state com `<Loader2>` do lucide-react + `@keyframes spin`.
5. Error state com banner vermelho (`T.danger`) e ícone `<AlertCircle>`.
6. Formulários sem tag `<form>` — usar `onClick` nos botões.
7. Busca e filtros por estágio aplicados diretamente na query Supabase (não no array local).
8. Deduplicação de leads garantida pelo `UNIQUE` na coluna `email`.

## Tabelas principais
| Tabela | Uso |
|---|---|
| `leads` | CRUD principal de contatos |
| `lead_events` | Histórico de comportamento + score (trigger automático) |
| `campaigns` | Campanhas de email |
| `campaign_sends` | Métricas por lead/campanha |
| `automation_flows` | Fluxos de automação |
| `flow_runs` | Log de execução por lead |
| `landing_pages` | Páginas e formulários |
| `form_submissions` | Submissões com UTM |
| `segments` | Listas estáticas e dinâmicas |

## Score thresholds
- Cold: 0–20
- Warm: 21–50
- Hot: 51–100
- Sales Ready: 100+

## Estágios do funil
Visitor → Lead → MQL → SQL → Opportunity → Customer

## Behavioral rules (implementar em todos os módulos)
- Nunca enviar email para `unsubscribed = true`
- Deduplicate por `email` (constraint no banco)
- Max 1 email/dia por lead (exceto transacional)
- Log cada step de flow com timestamp em `flow_runs.log`
