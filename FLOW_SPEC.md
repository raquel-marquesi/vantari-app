# FlowCRM — Inventário de telas (spec para recriar o módulo CRM no Next)

> Mapeado em 2026-06-25 navegando o app vivo: https://crm-vant-interno.lovable.app
> (login da Raquel). Objetivo: recriar a seção **CRM** dentro do Next, sobre os
> schemas `crm`/`core`/`fin` já aplicados em produção. Flow (Lovable) será aposentado.

## Aviso de natureza (importante)

O FlowCRM é um **template B2B genérico do Lovable** com a marca trocada. Logo:
- A **estrutura/UX** das telas é boa referência (sidebar, kanban, listas, detalhe).
- Os **campos de domínio NÃO batem** com cessão/antecipação de crédito trabalhista.
  Ex.: a tela de negócio mostra "Qualificação BANT" (Budget/Authority/Need/Timeline) —
  conceito de venda B2B, **irrelevante** pro nosso caso. O nosso domínio quer:
  PROCESSO (CNJ, fase, reclamada, elegibilidade), deságio, produto (integral/MRD),
  modalidade (kicker/tradicional), tranches, aprovação Leandro/Rodrigo.
- **Regra de recriação:** copiar o esqueleto/UX, **trocar os campos** pelos do nosso
  `crm.processos`/`crm.deals`/`fin.*`. Não recriar BANT.

## Escopo: o que recriar vs o que o Next já tem

| Seção Flow | Recriar? | Motivo |
|---|---|---|
| **GERAL** (Dashboard, Contatos, Empresas, Negócios, Atividades, Tarefas, Em Risco) | ✅ SIM | É o CRM que o Next não tem |
| EMAIL (Caixa de Entrada, Templates, Sequências) | ❌ | Next já tem em `/email` |
| ANALYTICS → Lead Scoring | ❌ | Next já tem em `/scoring` |
| ANALYTICS → Metas, Relatórios | 🟡 talvez | Next tem analytics em `/dashboard`; avaliar lacunas |
| ANALYTICS → Automações | ❌ | Next já tem em `/workflow` |
| ADMIN → Equipe, Configurações | 🟡 parcial | Next tem `/settings`; trazer **Pipelines** (estágios) e Campos |

## Shell / layout (comum a todas as telas)

- Sidebar fixa à esquerda, agrupada: **GERAL / EMAIL / ANALYTICS / ADMIN**.
- Topbar: toggle sidebar, breadcrumb (`FlowCRM > Página`), botão **+** (criar rápido),
  ícone de dica, sino de notificações, busca global (⌘K).
- Rodapé da sidebar: avatar + nome/email do usuário + logout.
- Org no app: **"Vantari Crédito e Consultoria"**, moeda **BRL**, fuso **São Paulo**.
- Tema claro. (Reusar o design system `T` do Next — não copiar cores do Flow.)

## Telas mapeadas (seção GERAL = o que recriar)

### 1. Dashboard — `/dashboard`
KPIs em cards: **Receita**, **Ganhos** (+ "R$ em pipeline"), **Win Rate** (+ nº fechados),
**Ticket Médio**, **Ciclo Médio** (dias), **Contatos** (+ novos).
Gráficos: **Receita Mensal** (12 meses, barras), **Meta do Mês**.
Filtros: período ("Este mês") + equipe ("Toda equipe") + refresh.
→ Fonte: `crm.deals` (valor, stage, won/lost, datas), `core.persons` (contatos).

### 2. Negócios (pipeline) — `/deals`  ⭐ coração  — ✅ RECRIADO no Next (`/crm`, 2026-06-25)
> Slice 1 entregue: `src/vantari-crm.jsx`, board Kanban lendo `crm.*` via `supabase.schema('crm')`,
> 6 estágios reais, totais por coluna. Falta: criar negócio (depende do fluxo de Processo),
> visões Lista/Previsão, detalhe do negócio, drag-and-drop entre estágios.
- 3 visões: **Kanban** / **Lista** / **Previsão** (forecast).
- Kanban: colunas = estágios, cada coluna mostra **total R$ + nº negócios**.
  Card do negócio: nome, contato vinculado, **valor R$**, avatar do responsável.
  "+ Adicionar" por coluna; "+ Negócio" global; **Filtro**; seletor de pipeline.
- Estágios reais (do nosso funil): **NOVOS LEADS → ANÁLISE PROCESSUAL → INTERESSE
  FUTURO → NEGOCIAÇÃO/PROPOSTA ENVIADA → GANHO → (PERDIDO)**.
→ Fonte: `crm.deals` + `crm.stages` + `crm.pipelines`.

### 3. Detalhe do negócio — `/deals/:id`  — ✅ RECRIADO no Next (`/crm/:dealId`, 2026-06-25)
> `src/vantari-crm-deal.jsx` (página inteira, não modal). Cabeçalho c/ titular/valor/estágio
> (mover no funil) + Ganho/Perdido; esquerda = registrar atividade (nota/ligação/reunião/tarefa)
> + timeline (crm.activities); direita = Processo (CNJ/elegibilidade), Reclamada, Contato, Negócio.
> Substitui o "BANT" genérico do Flow pelo domínio real. Falta: editar campos do processo/negócio inline.
- Cabeçalho: nome, **valor R$**, dropdown de **estágio**, status (Ativo/Inativo),
  botões **Ganho** / **Perdido**.
- Coluna esq.: **Adicionar Atividade** (tipo: Nota/Ligação/Reunião/Tarefa/Email + Título +
  Descrição) → **timeline** de atividades do negócio.
- Coluna dir.: ~~Qualificação BANT~~ (TROCAR por bloco **Processo/Elegibilidade**:
  CNJ, fase, reclamada, deságio, produto, modalidade), **Contato** vinculado,
  **Empresa** vinculada.
→ Fonte: `crm.deals` + `crm.activities` + `crm.processos` + `core.persons`/`core.companies`.

### 4. Contatos — `/contacts`
- 3 visões: **Tabela** / **Cartões** / **Vendedor** (agrupado por responsável).
- Tabela: **Nome, Email, Empresa, Cargo, Telefone, Status, Criado em** (colunas ordenáveis,
  checkbox de seleção em massa).
- Ações: **Filtros, Importar, Exportar, Novo Contato**, busca por nome/email.
→ Fonte: `core.persons` (+ `core.companies` p/ Empresa, + cargo como campo).

### 5. Empresas — `/companies`
- Visões: **Tabela** / **Cartões**.
- Tabela: **Empresa, Domínio, Indústria, Tamanho, Receita, Criado em**.
- Ações: Filtros, Importar, Exportar, **Nova Empresa**, busca.
→ Fonte: `core.companies` — ⚠️ hoje só tem `cnpj`+`name`; precisa de domínio,
  indústria, tamanho, receita (estender schema ou usar custom fields).

### 6. Atividades — `/activities`
- Tipos: **Tudo / Ligação / Reunião / Tarefa / Email / Nota**.
- Abas temporais: Para fazer / Vencido / Hoje / Amanhã / Esta semana / Próxima semana.
- Tabela: **Assunto, Negócio, Pessoa de contato, E-mail, Telefone, Organização,
  Data de venc., Atribuído a**. Visão **lista** ou **calendário**. "+ Atividade".
→ Fonte: `crm.activities`.

### 7. Tarefas — `/tasks`
- Filtros: **Minhas / Equipe**. Abas: Para fazer / Vencidas / Hoje / Amanhã / Esta semana / Concluídas.
- Tabela: **Tarefa, Negócio, Contato, Data de venc., Atribuído a**. "+ Tarefa".
→ Fonte: `crm.activities` (tipo=tarefa) ou subconjunto.

### 8. Em Risco — painel lateral (overlay, sobre qualquer tela)
- Monitor de **inatividade**. KPIs: **Alto Risco**, **Médio Risco**, **Valor em Risco (R$)**.
- Abas: **Negócios** / **Contatos**. Card: nome, estágio, **inatividade média/alta (dias)**.
- Botão **Regras** (configura limiares de inatividade).
→ Fonte: query sobre `crm.deals`/`core.persons` por última atividade (`crm.activities`).

## Configurações relevantes — `/settings`
Abas: Geral / **Pipelines** / **Campos** / Membros / Notificações / Aparência / Plano.
- **Pipelines**: criar/excluir pipeline; **Estágios** com **cor + probabilidade % + ordem**,
  arrastáveis. Valores atuais: NOVOS LEADS 10%, ANÁLISE PROCESSUAL 25%, INTERESSE FUTURO 40%,
  NEGOCIAÇÃO/PROPOSTA 55%, GANHO, PERDIDO. → `crm.stages`/`crm.pipelines`.
- **Campos**: campos customizados por entidade (Contatos/Empresas/Negócios).
- Geral: perfil pessoal + organização (nome, moeda, fuso).

## Ainda NÃO mapeado em detalhe (secundário / já existe no Next)
Lead Scoring, Metas, Relatórios, Automações, Caixa de Entrada, Templates, Sequências,
e sub-abas de settings (Membros, Notificações, Aparência, Plano). Mapear só se necessário.

## Lacunas de schema descobertas (a resolver antes/durante o build)
1. `core.companies` precisa de: domínio, indústria, tamanho, receita (ou via custom fields).
2. `core.persons` precisa de: **cargo** e **status** de CRM (campo já existe? validar).
3. Bloco de domínio no detalhe do negócio: ligar `crm.deals` ↔ `crm.processos` na UI.
4. Expor schemas `crm`+`core` na API do Supabase (hoje só `public` exposto) — pré-requisito.
