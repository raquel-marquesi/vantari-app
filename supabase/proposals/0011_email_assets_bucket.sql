-- =====================================================================
-- 0011_email_assets_bucket.sql
-- Bucket de Storage pra upload de imagem direto do computador no editor
-- visual de /email (bloco "Imagem"). Sem isso o upload cai em erro de
-- bucket inexistente.
--
-- Público de leitura (a imagem precisa carregar no cliente de email do
-- lead, que não está autenticado); escrita liberada pra dev, igual ao
-- resto do projeto (using(true)) — apertar quando entrar auth real.
--
-- Idempotente. Aplicar em prod (SQL editor ou supabase db push) antes do
-- deploy do código que faz upload.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('email-assets', 'email-assets', true)
on conflict (id) do nothing;

drop policy if exists "email-assets: leitura pública" on storage.objects;
create policy "email-assets: leitura pública"
  on storage.objects for select
  using (bucket_id = 'email-assets');

drop policy if exists "email-assets: upload liberado (dev)" on storage.objects;
create policy "email-assets: upload liberado (dev)"
  on storage.objects for insert
  with check (bucket_id = 'email-assets');

drop policy if exists "email-assets: update liberado (dev)" on storage.objects;
create policy "email-assets: update liberado (dev)"
  on storage.objects for update
  using (bucket_id = 'email-assets');

drop policy if exists "email-assets: delete liberado (dev)" on storage.objects;
create policy "email-assets: delete liberado (dev)"
  on storage.objects for delete
  using (bucket_id = 'email-assets');
