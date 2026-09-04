-- ═══════════════════════════════════════════════════════════════════
-- Acesso real ao vantari-app para Alexandra e Vanessa (captadoras), com
-- visão restrita à própria carteira (04/09/2026).
--
-- Até aqui elas só existiam como texto livre no campo crm.deals.captador.
-- Este arquivo registra, pra histórico do repo, as migrations que foram
-- aplicadas direto no banco vivo (via mcp Supabase) nesta sessão — em
-- produção elas já estão commitadas; aqui é só a cópia versionada.
--
-- Ordem importa: o novo valor do enum precisa estar commitado antes de
-- ser referenciado em qualquer outra parte (Postgres não permite usar um
-- valor de enum recém-criado na mesma transação em que foi criado) — por
-- isso o `alter type` fica isolado no início.
-- ═══════════════════════════════════════════════════════════════════

alter type public.workspace_role add value if not exists 'captador';

-- Coluna real de dono do deal — substitui gradualmente o texto livre
-- "captador" como fonte de verdade de controle de acesso.
alter table crm.deals add column if not exists captador_user_id uuid references auth.users(id);

-- Mapeamento nome exibido -> usuário real. Usado pelos 3 lugares que só
-- conheciam o nome em texto (importador CSV em vantari-crm-contatos.jsx,
-- criação manual de negócio em vantari-crm.jsx, edição em
-- vantari-crm-deal.jsx) — todos passaram a gravar captador_user_id junto
-- com o texto, consultando esta tabela.
create table if not exists public.captadores (
  name text primary key,
  user_id uuid not null references auth.users(id),
  workspace_id uuid not null references public.workspaces(id) default '53092199-7b75-4342-a897-f589d6f34922'
);
alter table public.captadores enable row level security;
drop policy if exists captadores_rw on public.captadores;
create policy captadores_rw on public.captadores
for all to authenticated
using (workspace_id in (select core.current_workspace_ids()))
with check (workspace_id in (select core.current_workspace_ids()));

-- Papel do usuário atual no workspace (usado pelas policies abaixo e pelo front-end)
create or replace function public.current_role_in_workspace(_workspace_id uuid)
returns public.workspace_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.workspace_members
  where workspace_id = _workspace_id and user_id = auth.uid()
  limit 1
$$;
grant execute on function public.current_role_in_workspace(uuid) to authenticated;

-- ─── RLS: dono/admin/member continuam vendo tudo do workspace; captador
-- só vê o que for da própria carteira (via crm.deals.captador_user_id) ───

drop policy if exists deals_rw on crm.deals;
create policy deals_rw on crm.deals
for all to authenticated
using (
  workspace_id in (select core.current_workspace_ids())
  and (
    public.current_role_in_workspace(workspace_id) <> 'captador'
    or captador_user_id = auth.uid()
  )
)
with check (
  workspace_id in (select core.current_workspace_ids())
  and (
    public.current_role_in_workspace(workspace_id) <> 'captador'
    or captador_user_id = auth.uid()
  )
);

-- crm.activities: deal_id, processo_id ou person_id (a tabela está vazia
-- hoje, mas pode receber atividade ligada só ao processo/pessoa, sem
-- deal_id, no futuro — cobrir só deal_id quebraria esse caso)
drop policy if exists activities_rw on crm.activities;
create policy activities_rw on crm.activities
for all to authenticated
using (
  workspace_id in (select core.current_workspace_ids())
  and (
    public.current_role_in_workspace(workspace_id) <> 'captador'
    or exists (select 1 from crm.deals d where d.id = activities.deal_id and d.captador_user_id = auth.uid())
    or exists (select 1 from crm.deals d where d.processo_id = activities.processo_id and d.captador_user_id = auth.uid())
    or exists (select 1 from crm.deals d where d.person_id = activities.person_id and d.captador_user_id = auth.uid())
  )
)
with check (
  workspace_id in (select core.current_workspace_ids())
  and (
    public.current_role_in_workspace(workspace_id) <> 'captador'
    or exists (select 1 from crm.deals d where d.id = activities.deal_id and d.captador_user_id = auth.uid())
    or exists (select 1 from crm.deals d where d.processo_id = activities.processo_id and d.captador_user_id = auth.uid())
    or exists (select 1 from crm.deals d where d.person_id = activities.person_id and d.captador_user_id = auth.uid())
  )
);

drop policy if exists processos_rw on crm.processos;
create policy processos_rw on crm.processos
for all to authenticated
using (
  workspace_id in (select core.current_workspace_ids())
  and (
    public.current_role_in_workspace(workspace_id) <> 'captador'
    or exists (select 1 from crm.deals d where d.processo_id = processos.id and d.captador_user_id = auth.uid())
  )
)
with check (
  workspace_id in (select core.current_workspace_ids())
  and (
    public.current_role_in_workspace(workspace_id) <> 'captador'
    or exists (select 1 from crm.deals d where d.processo_id = processos.id and d.captador_user_id = auth.uid())
  )
);

drop policy if exists persons_rw on core.persons;
create policy persons_rw on core.persons
for all to authenticated
using (
  workspace_id in (select core.current_workspace_ids())
  and (
    public.current_role_in_workspace(workspace_id) <> 'captador'
    or exists (select 1 from crm.deals d where d.person_id = persons.id and d.captador_user_id = auth.uid())
  )
)
with check (
  workspace_id in (select core.current_workspace_ids())
  and (
    public.current_role_in_workspace(workspace_id) <> 'captador'
    or exists (select 1 from crm.deals d where d.person_id = persons.id and d.captador_user_id = auth.uid())
  )
);

drop policy if exists identifiers_rw on core.person_identifiers;
create policy identifiers_rw on core.person_identifiers
for all to authenticated
using (
  workspace_id in (select core.current_workspace_ids())
  and (
    public.current_role_in_workspace(workspace_id) <> 'captador'
    or exists (select 1 from crm.deals d where d.person_id = person_identifiers.person_id and d.captador_user_id = auth.uid())
  )
)
with check (
  workspace_id in (select core.current_workspace_ids())
  and (
    public.current_role_in_workspace(workspace_id) <> 'captador'
    or exists (select 1 from crm.deals d where d.person_id = person_identifiers.person_id and d.captador_user_id = auth.uid())
  )
);

-- core.conversations / core.messages: tinham with_check nulo e role
-- "public" antes (não só "authenticated") — corrigido de passagem.
drop policy if exists conversations_rw on core.conversations;
create policy conversations_rw on core.conversations
for all to authenticated
using (
  workspace_id in (select core.current_workspace_ids())
  and (
    public.current_role_in_workspace(workspace_id) <> 'captador'
    or exists (select 1 from crm.deals d where d.person_id = conversations.person_id and d.captador_user_id = auth.uid())
  )
)
with check (
  workspace_id in (select core.current_workspace_ids())
  and (
    public.current_role_in_workspace(workspace_id) <> 'captador'
    or exists (select 1 from crm.deals d where d.person_id = conversations.person_id and d.captador_user_id = auth.uid())
  )
);

drop policy if exists messages_rw on core.messages;
create policy messages_rw on core.messages
for all to authenticated
using (
  workspace_id in (select core.current_workspace_ids())
  and (
    public.current_role_in_workspace(workspace_id) <> 'captador'
    or exists (select 1 from crm.deals d where d.person_id = messages.person_id and d.captador_user_id = auth.uid())
  )
)
with check (
  workspace_id in (select core.current_workspace_ids())
  and (
    public.current_role_in_workspace(workspace_id) <> 'captador'
    or exists (select 1 from crm.deals d where d.person_id = messages.person_id and d.captador_user_id = auth.uid())
  )
);

-- Não mexido de propósito (sem dado sensível por pessoa / kanban precisa
-- renderizar pra todo mundo): crm.pipelines, crm.stages, core.companies,
-- mkt.*, core.consents, core.person_attributes, core.events,
-- core.import_batches. Candidatos a uma segunda rodada se fizer sentido.

notify pgrst, 'reload schema';
