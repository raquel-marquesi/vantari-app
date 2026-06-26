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
- **Tenancy (decidido 2026-06-25):** o core **REUSA** a tenancy do banco vivo (`public.workspaces` / `public.workspace_members` / `is_workspace_member()`), **não cria a sua**. O banco vivo já tinha multi-tenant — duas tenancies paralelas seriam o mesmo erro de drift. ✅ **`0001_core_foundation.sql` reescrito (2026-06-25):** removidas `core.workspaces`/`core.workspace_members`; todos os FKs `workspace_id` apontam para `public.workspaces(id)`; `core.current_workspace_ids()` lê de `public.workspace_members`. **Validado** rodando o arquivo inteiro num `begin/rollback` contra o banco vivo (sem deixar rastro: `schema core` não persistiu).

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

## ✅ Core aplicado em PRODUÇÃO (2026-06-25)

A pilha `0001`+`0002`+`0004`+`0005` foi **aplicada no banco vivo** (`ejhrlrasepowdcdnggmv`) numa transação única. Branch do Supabase exigiria plano Pro pago (API recusou com HTTP 402) — como os schemas só **adicionam** (`core`/`crm`/`mkt`/`fin`) sem tocar `public` e são reversíveis (`drop schema ... cascade`), aplicamos direto. Resultado vivo: `core` 5 tabelas + 7 funções, `crm` 6, `mkt` 6, `fin` 2.

**Smoke test passou** (em `begin/rollback`, sem deixar dado): `core.resolve_person` chamado 2× com a sala Vantari (1ª como Nina: telefone+email; 2ª como form: mesmo telefone em outro formato + CPF) resolveu para **1 única pessoa** — normalização de telefone/email/CPF ok, status virou `identificado` quando o CPF chegou, 3 identificadores ligados. Bug corrigido no caminho: o guard de `resolve_person` ainda citava `core.workspace_members` (commit b1671c5).

**Backfill dos 108 leads → `core.persons` executado e depois REVERTIDO (2026-06-25):** o backfill (script `supabase/proposals/backfill_leads_to_core_persons.sql`, one-off idempotente) criou 108 pessoas / 211 identificadores com mapeamento 1:1 — provando a máquina. **Mas os 108 leads eram dados de teste** (fictícios + amigos testando o cadastro; `lead_events`/`scores`/`interactions` = 0). Decisão: **slate limpo.** Backup salvo fora do git em `~/vantari-backups/2026-06-25_*.json` (leads, form_submissions, core_persons, identifiers). Depois apagados: 108 leads (cascata limpa) + 11 form_submissions + 108 core.persons. **Core e public.leads agora vazios na sala Vantari** — estruturas de pé, esperando dado REAL da Nina + FlowCRM (não há mais dado de marketing legado a migrar).

## Artefatos do core (status individual)

| Artefato | Conteúdo | Status |
|---|---|---|
| `supabase/proposals/0001_core_foundation.sql` | core: persons, identifiers, companies, events, consents, resolve_person, merge_persons, RLS. Reusa `public.workspaces` (não cria tenancy própria) | ✅ aplicado prod |
| `supabase/proposals/0002_crm_flow.sql` | crm domínio: processos (+elegibilidade), deals por crédito, advogados, funil real | ✅ aplicado prod |
| `supabase/proposals/0004_mkt_marketing.sql` | mkt: scoring_rules + lead_scores (recálculo via evento), forms, campanhas, can_email (LGPD) | ✅ aplicado prod |
| `supabase/proposals/0005_fin_receivables.sql` | fin: antecipações (deságio auto) + recebimentos em tranches + ciclo de status | ✅ aplicado prod |
| `supabase/functions/ingest/` | Edge Function porta-única (Nina/Meta/Google → resolve_person → evento) | ⏳ não deployada |

## O que JÁ foi aplicado em produção

- **`supabase/proposals/0003_rls_hardening.sql`** — fechou o vazamento anon (leads/CPF). **Aplicado e verificado** em 2026-06-25. Fase 1 = "exige login" (não escopa por workspace ainda).
- **Workspace canônico "Vantari" criado + dados migrados** — **aplicado em 2026-06-25**. O banco vivo tinha 3 workspaces pessoais vazios (Raquel/Catarina/Gustavo) e 108 leads soltos (workspace_id NULL = origem do vazamento). Decisão: renomeei "Raquel's workspace" → **Vantari** (id `53092199-7b75-4342-a897-f589d6f34922`), adicionei Catarina e Gustavo como membros, e atribuí à sala todos os dados órfãos: **108 leads + 11 form_submissions + 5 forms + 10 email_templates + 1 campaign**. `scoring_rules` ficou de fora (config misturada, 11 soltas + 4 por workspace — limpeza dedicada pendente). Reversível (campos eram NULL). **Nota:** os 108 leads + 11 form_submissions foram depois apagados (eram teste — ver seção do core). Restam na sala: 5 forms, 10 email_templates, 1 campaign.

## Deferido (camadas, não fundação)

- Teses restritivas como tabela de config + validação automática.
- Rastreio de documentos (procuração RTD, substabelecimento, contrato de cessão).
- Workflow formal de aprovação (Leandro/Rodrigo).
- Validação de faixa de valor/deságio.
- Pop-ups / Web Push / validador de email / atribuição (itens da fase RD em plan.md, reavaliar se ainda são meta).

## Roadmap — próxima fase (outro tipo de trabalho: banco vivo + frontend)

1. ✅ **Core aplicado** em produção (mesmo projeto). Ver seção do core.
2. ✅ **Migração de leads:** os 108 eram TESTE e foram apagados (slate limpo, backup em `~/vantari-backups/`). Dado real virá da **Nina** (via `ingest`). FlowCRM está VAZIO/fora de produção — não há nada a migrar dele.
3. **Ponte da Nina** — guardar o `person_id` que a `ingest` devolve. (pendente: deploy da `ingest`.)
4. **App único = Next.** Decidido (Flow vazio → abandonado). Construir o **CRM como módulo novo no Next sobre o core**, depois migrar marketing. Telas do Flow inventariadas em [FLOW_SPEC.md](FLOW_SPEC.md).
   - ✅ Slice 1: tela **Negócios** (pipeline Kanban) em `/crm` (`src/vantari-crm.jsx`), lendo `crm.*`. Pré-reqs aplicados: pipeline "Esteira de Aquisição" semeado + schemas `core`/`crm` expostos na API.
   - ⏳ Próximas slices: cadastro de **Processo → Negócio** (deal exige processo_id), detalhe do negócio, Contatos, Empresas, Atividades, Tarefas, Em Risco.
5. **Worker `deal_won → fin.criar_antecipacao`** (Edge Function escutando eventos).

### Convergência do front pro core (marketing)
- ✅ **`/leads`** abre o cadastro único (`core.persons`) — renomeou Contatos→Leads; tela legada `vantari-leads-module.jsx` órfã (commit 2e0a81f).
- ✅ **`/segments`** (`src/vantari-segments.jsx`) reescrito sobre o core (jun/2026): motor `buildPersonQuery/computeLeads/countLeads` filtra `core.persons` + resolve conjuntos de `person_id` de `mkt.lead_scores` (score/perfil), `crm.deals→crm.stages` (estágio), `core.events` (visita), `core.consents` (descadastro). Campos podados do mundo RD: `tags`, `source`, `profile_points`, `stage` Visitor→Customer (virou estágio do negócio). `visited_page`/`unsubscribed` ligados ao lugar certo mas **inertes** (sem produtor no core: tracker ainda grava `public.page_visits`; não há fluxo de consent no core).
  - ⚠️ **PRÉ-REQ INFRA: expor `mkt` no PostgREST.** Hoje só `public, graphql_public, core, crm` estão expostos (verificado via `PGRST106` no banco vivo). Sem `mkt` exposto, filtros de **Score/Perfil/Faixa** falham no navegador (a UI mostra banner de erro). Ação: Supabase → Project Settings → API → Exposed schemas → adicionar `mkt`. O schema `mkt` já está **aplicado** no banco; falta só expor. (Isso também destrava o front ler `mkt.campaigns`/`lead_scores` no futuro.)

## Decisões fechadas (2026-06-25)

- **Onde o core mora:** mesmo projeto Supabase (`ejhrlrasepowdcdnggmv`) como schemas novos. FK cross-schema exige mesmo banco; projeto novo recriaria o dual-DB. Não há escolha real.
- **Tenancy:** core reusa `public.workspaces` (ver seção Decisão de arquitetura).
- **Workspace canônico:** sala **Vantari** (`53092199-7b75-4342-a897-f589d6f34922`), 3 membros, dados órfãos migrados (ver "O que JÁ foi aplicado").

## Pendências de fase futura (apontadas pela Raquel)

- **Estrutura de papéis & permissões + cadastro de captadores.** Captadores (quem traz o processo) ainda não existem no sistema. Por ora: coluna `crm.deals.captador` (texto) + lista fixa no form (`CAPTADORES` em `vantari-crm.jsx`). Evoluir para cadastro gerenciável + roles/permissões (talvez login do captador, comissão). Quando houver cadastro, `captador` vira FK.

## Decisões em aberto

- **Qual codebase vira o app único?** FlowCRM tem o funil real; Next tem o módulo de marketing (e muita cenografia). Recomendação: construir novo sobre o core, usar Flow como referência visual. Depende de olhar o repo do Flow (não está aqui).
- **A fase RD (plan.md) ainda é meta** ou foi subsumida pela reestruturação? Decidir.
- **Limpeza de `scoring_rules`:** 11 regras soltas + 4 duplicadas por workspace pessoal. Decidir qual conjunto é o verdadeiro e deduplicar.
- **Apertar RLS de `public.leads`** de `using(true)` para `is_workspace_member(workspace_id)` agora que os leads têm sala — só depois de garantir que o app seta o workspace nas queries.

## Referências

- Doc de regras: `Downloads/Regras para aquisição e esteira operacional.pdf` (Raquel).
- FlowCRM: https://crm-vant-interno.lovable.app (Lovable, login próprio).
- Supabase: projeto `ejhrlrasepowdcdnggmv` (NEXT-marketing.crm).
- Observações honestas de risco: [feedback.md](feedback.md).
