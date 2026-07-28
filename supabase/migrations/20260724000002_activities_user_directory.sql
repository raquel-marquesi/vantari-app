-- Atividades/Tarefas: view para resolver owner_id (auth.users) -> nome/email exibível.
-- auth.users não é exposto via PostgREST; a view roda com privilégios do dono (postgres)
-- e expõe só id/email/name, cruzando com public.team_members pelo email.

create or replace view public.v_user_directory as
select
  u.id,
  u.email,
  coalesce(tm.name, u.email) as name
from auth.users u
left join public.team_members tm on tm.email = u.email;

grant select on public.v_user_directory to authenticated;

-- Índices de suporte às novas telas de Atividades/Tarefas (listagem por vencimento/status)
create index if not exists activities_due_at_idx  on crm.activities (due_at);
create index if not exists activities_owner_idx   on crm.activities (owner_id);
create index if not exists activities_type_idx    on crm.activities (type);
create index if not exists activities_workspace_idx on crm.activities (workspace_id);
