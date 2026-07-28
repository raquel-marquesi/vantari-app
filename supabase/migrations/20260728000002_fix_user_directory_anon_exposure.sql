-- Fix de segurança: a migration 20260724000002 concedeu select em
-- public.v_user_directory pra "authenticated, anon". Essa view expõe
-- id/email/nome de usuários internos (via auth.users) — o grant pra
-- anon deixava esses dados acessíveis sem login. Revoga o acesso anônimo;
-- authenticated continua podendo ler (necessário pras telas de
-- Atividades/Tarefas resolverem o owner_id em nome/email).

revoke select on public.v_user_directory from anon;
