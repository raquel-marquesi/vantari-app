-- =====================================================================
-- 0010_mkt_forms_extra_fields.sql
-- Campos que o builder de /landing → Formulários usa e faltavam em
-- mkt.forms. Convergência do FormsManager do legado public.forms pro
-- mkt.forms (motor de scoring).
--
-- mkt.forms já tem: slug, name, fields, source_label, success_message,
--   active. A UI também usa: description (texto de apoio no form público)
--   e tags (organização interna, não exibida no form público).
--
-- Idempotente (add column if not exists). Aplicar em prod antes do deploy
-- do código que passa a gravar em mkt.forms.
-- =====================================================================

alter table mkt.forms add column if not exists description text;
alter table mkt.forms add column if not exists tags         text[] default '{}';
