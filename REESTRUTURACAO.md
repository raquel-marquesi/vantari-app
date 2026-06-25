# Vantari — Reestruturação para Core Canônico

> Documento mestre da reestruturação iniciada em **2026-06-25**.
> Substitui conceitualmente a fase anterior descrita em [plan.md](plan.md) (replicação do RD Station).
> Fatos duráveis também na memória do projeto (`.claude/.../memory/`).

## Por que esta reestruturação existe

Três sistemas internos (todos da Vantari) gravando/rastreando o mesmo lead em bancos separados:
- **Nina** — atendimento WhatsApp por IA. **Em produção, banco próprio.**
- **Flow (FlowCRM)** — CRM/pipeline. App Lovable isolado, ainda em desenvolvimento.
- **Next (vantari-app)** — marketing. Este repo. App Lovable, em desenvolvimento.

O erro a evitar era o *dual-write*: o mesmo lead em 3 bancos sincronizando = drift garantido.
Além disso, a auditoria provou um **vazamento de PII** (anon lia 107 leads com CPF) — já corrigido (ver abaixo).

## Decisão de arquitetura

**Um único banco canônico (o `core`)**; Flow/Next/Financeiro viram **schemas-irmãos** que referenciam `core.persons` por FK (sem copiar a pessoa). **Nina fica federada** (mantém banco próprio) e alimenta o core via Edge Function `ingest`.

```
        core (pessoas · identidade CPF/telefone · eventos · LGPD · RLS fechada)
       /        |              |                    \
   crm          mkt            fin                   ingest
  (Flow)       (Next)        (financeiro)          porta única
  processos    score          antecipação          Nina/Meta/Google → core
  + créditos   forms          + tranches
               campanhas
```

- **Identidade:** CPF (primário) + telefone (fallback, normalizado p/ BR). `core.resolve_person()` é a porta idempotente; `core.merge_persons()` repontua FKs dinamicamente (qualquer schema novo funciona sem alterá-la).
- **Segurança:** anon nunca toca o core; authenticated escopado por workspace; service_role (Edge Functions) para entradas públicas.

## Domínio: cessão/antecipação de crédito trabalhista

(Confirmado pela Raquel + doc "Regras para aquisição e esteira operacional".)

- **Funil (Esteira de Aquisição):** Novos Leads → Análise Processual → Interesse Futuro → Negociação/Proposta Enviada → Ganho / Perdido. Pós-Ganho (operacional): formalização → desembolso.
- **Peça central = o PROCESSO** (CNJ, fase a partir do Acórdão de RO, dossiê de elegibilidade da reclamada).
- **1 processo → até 2 créditos** (decisão: sempre 1 negócio por crédito): do **reclamante** e do **advogado** (honorário). Ambos são `core.persons` (CPF); advogado tem OAB.
- **Produtos:** integral (Honorários + Reclamante) | MRD (reclamante sem honorários). **Modalidades:** kicker | tradicional.
- **Aquisição:** mín R$30k, máx R$500k, deságio ≤55% no integral.
- **Elegibilidade (codificada em `crm.avaliar_elegibilidade`):** veta tese restritiva, RJ, MEI/ME, reclamada que paga por precatório; exige CNDT ok + solvente.
- **Retorno em tranches** (RPV/acordo/execução), datas incertas.
- **Aprovação:** Leandro/Rodrigo.

## O que está PRONTO e validado (Postgres 16 local) — NÃO aplicado em banco

| Artefato | Conteúdo |
|---|---|
| `supabase/proposals/0001_core_foundation.sql` | core: persons, identifiers, companies, events, consents, resolve_person, merge_persons, RLS |
| `supabase/proposals/0002_crm_flow.sql` | crm domínio: processos (+elegibilidade), deals por crédito, advogados, funil real |
| `supabase/proposals/0004_mkt_marketing.sql` | mkt: scoring_rules + lead_scores (recálculo via evento), forms, campanhas, can_email (LGPD) |
| `supabase/proposals/0005_fin_receivables.sql` | fin: antecipações (deságio auto) + recebimentos em tranches + ciclo de status |
| `supabase/functions/ingest/` | Edge Function porta-única (Nina/Meta/Google → resolve_person → evento) |

## O que JÁ foi aplicado em produção

- **`supabase/proposals/0003_rls_hardening.sql`** — fechou o vazamento anon (leads/CPF). **Aplicado e verificado** em 2026-06-25. Fase 1 = "exige login" (não escopa por workspace ainda — os 107 leads têm workspace_id NULL).

## Deferido (camadas, não fundação)

- Teses restritivas como tabela de config + validação automática.
- Rastreio de documentos (procuração RTD, substabelecimento, contrato de cessão).
- Workflow formal de aprovação (Leandro/Rodrigo).
- Validação de faixa de valor/deságio.
- Pop-ups / Web Push / validador de email / atribuição (itens da fase RD em plan.md, reavaliar se ainda são meta).

## Roadmap — próxima fase (outro tipo de trabalho: banco vivo + frontend)

1. **Decidir onde o core mora** e **aplicar** os schemas (de preferência testar numa branch do Supabase antes — schema vivo é multi-tenant).
2. **Migrar dados reais** para o core: 107 leads do Next (workspace_id NULL → definir workspace canônico) + contatos do FlowCRM. Deduplicar via `resolve_person`/`merge_persons`.
3. **Ponte da Nina** — guardar o `person_id` que a `ingest` devolve.
4. **App único** — Flow + Next convergem num app só (Nina à parte). Recomendação: **recriar limpo sobre o core, não migrar código Lovable** (carrega cenografia/lixo). Antes: inventariar telas do FlowCRM como spec.
5. **Worker `deal_won → fin.criar_antecipacao`** (Edge Function escutando eventos).

## Decisões em aberto

- **Qual codebase vira o app único?** FlowCRM tem o funil real; Next tem o módulo de marketing (e muita cenografia). Recomendação: construir novo sobre o core, usar Flow como referência visual. Depende de olhar o repo do Flow (não está aqui).
- **A fase RD (plan.md) ainda é meta** ou foi subsumida pela reestruturação? Decidir.
- **Workspace canônico** para a migração dos leads existentes.

## Referências

- Doc de regras: `Downloads/Regras para aquisição e esteira operacional.pdf` (Raquel).
- FlowCRM: https://crm-vant-interno.lovable.app (Lovable, login próprio).
- Supabase: projeto `ejhrlrasepowdcdnggmv` (NEXT-marketing.crm).
- Observações honestas de risco: [feedback.md](feedback.md).
