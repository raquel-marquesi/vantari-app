-- Motor de execução de automações (Etapa 1: gatilho "Pertence à Segmentação",
-- só para segmentações ESTÁTICAS — rules = [{field:"id", op:"in", value:[...]}]).
--
-- flow_runs hoje só sabe apontar pra public.leads (tabela legada, substituída
-- por core.persons desde o PR #12). Adiciona person_id como a referência real,
-- sem remover lead_id (não usado por ninguém, mas evita quebrar FKs antigas).
--
-- current_node_id / resume_at: o motor caminha nó a nó pelo grafo salvo em
-- automation_flows.definition; current_node_id guarda o ÚLTIMO nó processado
-- (não o próximo), resume_at é usado só quando o run está "waiting" (nó de
-- Espera) pra saber quando retomar.
--
-- tags: primeira ação real do motor (Adicionar/Remover Tag) — não existia
-- nenhum conceito de tag em core.persons ainda.

alter table core.persons add column if not exists tags text[] not null default '{}';
create index if not exists persons_tags_idx on core.persons using gin (tags);

alter table public.flow_runs add column if not exists person_id uuid references core.persons(id) on delete cascade;
alter table public.flow_runs add column if not exists current_node_id text;
alter table public.flow_runs add column if not exists resume_at timestamptz;
create index if not exists flow_runs_person_idx on public.flow_runs (person_id);

-- uma pessoa só passa por um determinado fluxo uma vez (evita duplicar o
-- envio/execução a cada passagem do cron enquanto ela continuar no segmento)
create unique index if not exists flow_runs_unique_person_flow
  on public.flow_runs (flow_id, person_id) where person_id is not null;
