-- ════════════════════════════════════════════════════════════════
-- Storage bucket para imagens de e-mail (upload no editor de campanhas)
-- Usado por: src/vantari-email-marketing.jsx → ImageUploadField
--   supabase.storage.from('email-assets').upload(...)
-- ════════════════════════════════════════════════════════════════

-- 1) Bucket público (leitura direta por URL no e-mail)
insert into storage.buckets (id, name, public)
values ('email-assets', 'email-assets', true)
on conflict (id) do update set public = true;

-- 2) Policies abertas para DEV (padrão do projeto: using(true)).
--    TROCAR por checagem de auth.role()='authenticated' antes de produção.
drop policy if exists "email_assets_read"   on storage.objects;
drop policy if exists "email_assets_write"  on storage.objects;
drop policy if exists "email_assets_update" on storage.objects;
drop policy if exists "email_assets_delete" on storage.objects;

create policy "email_assets_read" on storage.objects
  for select using (bucket_id = 'email-assets');

create policy "email_assets_write" on storage.objects
  for insert with check (bucket_id = 'email-assets');

create policy "email_assets_update" on storage.objects
  for update using (bucket_id = 'email-assets') with check (bucket_id = 'email-assets');

create policy "email_assets_delete" on storage.objects
  for delete using (bucket_id = 'email-assets');
