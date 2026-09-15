-- Aplicado direto no banco vivo em 15/09/2026 (via MCP Supabase), a pedido
-- da Catarina: Gustavo passa a poder ser atribuído como responsável/captador
-- de negócios no CRM (filtro "Responsável" em /crm). Não muda o papel dele
-- em workspace_members (continua 'member', acesso total ao workspace) —
-- public.captadores só mapeia nome -> usuário real pra atribuição de
-- negócios, é ortogonal ao RLS de captador (ver 20260904000001_acesso_
-- restrito_captadoras.sql). Registrado aqui, não em migrations/, porque
-- tem um UUID real e não é reaplicável genericamente — mesmo padrão do
-- vincula_captadoras_04set2026.sql.

insert into public.captadores (name, user_id, workspace_id)
values ('Gustavo', '2b57dd3d-6698-4a17-905b-8c1c7827c0a8', '53092199-7b75-4342-a897-f589d6f34922')
on conflict (name) do update set user_id = excluded.user_id;
