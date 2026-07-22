NOTIFY pgrst, 'reload schema';
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_schema = 'mkt' 
ORDER BY table_name;
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_schema = 'core' 
ORDER BY table_name;
INSERT INTO public.workspaces (id, name, owner_id)
SELECT '53092199-7b75-4342-a897-f589d6f34922', 'Vantari', id
FROM auth.users
LIMIT 1;