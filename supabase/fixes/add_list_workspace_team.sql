-- ════════════════════════════════════════════════════════════════
-- Função nova — public.list_workspace_team
-- ────────────────────────────────────────────────────────────────
-- 10/08/2026 — seletor de atendente no /inbox (atribuir/reatribuir uma
-- conversa a uma pessoa do time, ver vantari-inbox.jsx). O frontend precisa
-- mostrar nome + e-mail de quem pode receber uma conversa, mas:
--   - auth.users não é exposto via API pro client autenticado;
--   - public.team_members (usada em Configurações → Equipe) é uma lista
--     À PARTE, sem vínculo com login real — alguém pode estar cadastrado lá
--     sem ter acesso de verdade, e nesse caso NÃO pode ser dono de conversa
--     (core.conversations.assigned_user_id referencia auth.users).
--
-- Esta função (SECURITY DEFINER) faz a ponte certa: junta
-- public.workspace_members (quem realmente tem login) com auth.users (nome
-- via raw_user_meta_data, com fallback pro prefixo do e-mail), restrita a
-- quem já pertence ao workspace pedido (mesma checagem de
-- public.is_workspace_member usada em outros lugares do projeto).
--
-- COMO FOI APLICADA: via mcp apply_migration (Supabase MCP), direto no banco
-- vivo do projeto ejhrlrasepowdcdnggmv. Este arquivo é só o registro no repo.
-- ════════════════════════════════════════════════════════════════

create or replace function public.list_workspace_team(p_workspace uuid)
returns table(user_id uuid, email text, name text, role public.workspace_role)
language sql
stable
security definer
set search_path = 'public'
as $$
  select wm.user_id,
         u.email,
         coalesce(nullif(trim(u.raw_user_meta_data->>'name'), ''), split_part(u.email, '@', 1)) as name,
         wm.role
  from public.workspace_members wm
  join auth.users u on u.id = wm.user_id
  where wm.workspace_id = p_workspace
    and public.is_workspace_member(p_workspace)
  order by name;
$$;

grant execute on function public.list_workspace_team(uuid) to authenticated;
