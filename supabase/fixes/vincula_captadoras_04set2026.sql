-- Aplicado direto no banco vivo em 04/09/2026, depois da migration
-- 20260904000001_acesso_restrito_captadoras.sql. Registrado aqui (não em
-- migrations/) porque tem UUIDs reais e não é reaplicável genericamente —
-- é o registro histórico do que rodou, igual aos outros arquivos desta pasta.

insert into public.workspace_members (workspace_id, user_id, role)
values
  ('53092199-7b75-4342-a897-f589d6f34922', '63457073-49bf-49fd-848a-b4b5574ccce2', 'captador'), -- Alexandra
  ('53092199-7b75-4342-a897-f589d6f34922', 'e9d02ce0-3edb-4ae1-a7ee-2078e337d02e', 'captador')   -- Vanessa
on conflict (workspace_id, user_id) do update set role = excluded.role;

insert into public.captadores (name, user_id, workspace_id)
values
  ('Alexandra', '63457073-49bf-49fd-848a-b4b5574ccce2', '53092199-7b75-4342-a897-f589d6f34922'),
  ('Vanessa', 'e9d02ce0-3edb-4ae1-a7ee-2078e337d02e', '53092199-7b75-4342-a897-f589d6f34922')
on conflict (name) do update set user_id = excluded.user_id;

-- Backfill dos negócios que já existiam antes das duas terem login (304
-- deals no total; 56 da Alexandra, 61 da Vanessa, confirmado batendo com
-- os números que a Catarina esperava)
update crm.deals set captador_user_id = '63457073-49bf-49fd-848a-b4b5574ccce2' where captador = 'Alexandra';
update crm.deals set captador_user_id = 'e9d02ce0-3edb-4ae1-a7ee-2078e337d02e' where captador = 'Vanessa';
