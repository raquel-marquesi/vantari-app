-- ════════════════════════════════════════════════════════════════
-- Migration 008 — Email Templates (substitui templates hardcoded)
-- ────────────────────────────────────────────────────────────────
-- Persiste templates de email no banco. Permite importar templates
-- do RD Station (HTML bruto) e usar como base em campanhas.
--
-- Estrutura:
--   • email_templates(id, name, category, html, blocks, source, ...)
--   • Cada template pode ter HTML puro (importado) OU blocks (editor visual)
--   • Quando html preenchido: usa como base. Quando blocks: editor visual gera.
-- ════════════════════════════════════════════════════════════════

create table if not exists email_templates (
  id            uuid primary key default gen_random_uuid(),
  name          text,
  slug          text,
  category      text default 'general',     -- newsletter, promotional, follow-up, etc.
  description   text,
  subject       text,                       -- assunto padrão sugerido
  preheader     text,                       -- preview text
  html          text,                       -- HTML completo (importado do RD)
  blocks        jsonb default '[]'::jsonb,  -- blocks do editor visual Vantari
  thumbnail_url text,
  source        text default 'manual',      -- 'manual', 'rd_station', 'imported'
  tags          text[] default '{}',
  active        boolean default true,
  use_count     int default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Defensivo: adiciona colunas faltantes se tabela já existir
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='email_templates' and column_name='name')          then alter table email_templates add column name text; end if;
  if not exists (select 1 from information_schema.columns where table_name='email_templates' and column_name='slug')          then alter table email_templates add column slug text; end if;
  if not exists (select 1 from information_schema.columns where table_name='email_templates' and column_name='category')      then alter table email_templates add column category text default 'general'; end if;
  if not exists (select 1 from information_schema.columns where table_name='email_templates' and column_name='description')   then alter table email_templates add column description text; end if;
  if not exists (select 1 from information_schema.columns where table_name='email_templates' and column_name='subject')       then alter table email_templates add column subject text; end if;
  if not exists (select 1 from information_schema.columns where table_name='email_templates' and column_name='preheader')     then alter table email_templates add column preheader text; end if;
  if not exists (select 1 from information_schema.columns where table_name='email_templates' and column_name='html')          then alter table email_templates add column html text; end if;
  if not exists (select 1 from information_schema.columns where table_name='email_templates' and column_name='blocks')        then alter table email_templates add column blocks jsonb default '[]'::jsonb; end if;
  if not exists (select 1 from information_schema.columns where table_name='email_templates' and column_name='thumbnail_url') then alter table email_templates add column thumbnail_url text; end if;
  if not exists (select 1 from information_schema.columns where table_name='email_templates' and column_name='source')        then alter table email_templates add column source text default 'manual'; end if;
  if not exists (select 1 from information_schema.columns where table_name='email_templates' and column_name='tags')          then alter table email_templates add column tags text[] default '{}'; end if;
  if not exists (select 1 from information_schema.columns where table_name='email_templates' and column_name='active')        then alter table email_templates add column active boolean default true; end if;
  if not exists (select 1 from information_schema.columns where table_name='email_templates' and column_name='use_count')     then alter table email_templates add column use_count int default 0; end if;
  if not exists (select 1 from information_schema.columns where table_name='email_templates' and column_name='created_at')    then alter table email_templates add column created_at timestamptz default now(); end if;
  if not exists (select 1 from information_schema.columns where table_name='email_templates' and column_name='updated_at')    then alter table email_templates add column updated_at timestamptz default now(); end if;
  if not exists (select 1 from information_schema.columns where table_name='email_templates' and column_name='bee_json')     then alter table email_templates add column bee_json jsonb; end if;
end $$;

-- Relaxa NOT NULL legados
do $$
declare col record;
begin
  for col in
    select column_name from information_schema.columns
     where table_schema='public' and table_name='email_templates'
       and is_nullable='NO'
       and column_name not in ('id','created_at','updated_at')
  loop
    execute format('alter table email_templates alter column %I drop not null', col.column_name);
  end loop;
end $$;

create index if not exists idx_et_category on email_templates(category);
create index if not exists idx_et_active   on email_templates(active);
create index if not exists idx_et_source   on email_templates(source);
create unique index if not exists email_templates_slug_unique on email_templates(slug) where slug is not null;

-- Updated_at automático
drop trigger if exists trg_et_updated on email_templates;
create trigger trg_et_updated
  before update on email_templates
  for each row execute function set_updated_at();

-- ─── RLS ───
alter table email_templates enable row level security;
drop policy if exists "et_dev_all" on email_templates;
create policy "et_dev_all" on email_templates for all using (true) with check (true);

-- ─── Seed: 3 templates iniciais (idempotente sem ON CONFLICT) ───
do $$
declare
  seed record;
begin
  for seed in
    select * from (values
      ('Newsletter Mensal',  'newsletter-mensal',  'newsletter',  'Layout editorial com destaque para artigos e conteúdo', 'Vantari Insights — Edição mensal'),
      ('Oferta Promocional', 'oferta-promocional', 'promotional', 'Alta conversão com urgência e CTA em destaque',          'Oferta especial — por tempo limitado'),
      ('Follow-up de Vendas','follow-up-vendas',   'follow-up',   'Sequência de nurturing focada em conversão',             'Podemos conversar 15 minutos?')
    ) as t(name, slug, category, description, subject)
  loop
    if not exists (select 1 from email_templates where slug = seed.slug) then
      insert into email_templates (name, slug, category, description, subject, blocks, source, active)
      values (seed.name, seed.slug, seed.category, seed.description, seed.subject, '[]'::jsonb, 'manual', true);
    end if;
  end loop;
end $$;
