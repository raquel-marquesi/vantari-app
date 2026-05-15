-- ════════════════════════════════════════════════════════════════
-- Migration 004 — Companies + Importações + Exportações
-- ────────────────────────────────────────────────────────────────
-- Replica as abas Empresas, Importações e Exportações do RD Station.
--   • companies         — empresas vinculadas aos leads
--   • lead_imports      — histórico de uploads CSV
--   • lead_exports      — histórico de exportações
--
-- Cada lead pode pertencer a uma empresa (FK leads.company_id).
-- Cada importação registra arquivo, status e contadores.
-- ════════════════════════════════════════════════════════════════

-- ─── Tabela: companies ───
create table if not exists companies (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  website       text,
  industry      text,
  size          text,                    -- "1-10", "11-50", "51-200", "201-500", "500+"
  cnpj          text,
  state         text,
  city          text,
  description   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_companies_name   on companies(lower(name));
create index if not exists idx_companies_cnpj   on companies(cnpj);

drop trigger if exists trg_companies_updated on companies;
create trigger trg_companies_updated
  before update on companies
  for each row execute function set_updated_at();

-- ─── FK: leads.company_id → companies.id ───
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='leads' and column_name='company_id') then
    alter table leads add column company_id uuid references companies(id) on delete set null;
    create index idx_leads_company on leads(company_id);
  end if;
end $$;

-- ─── ENUM: status de importação ───
do $$ begin
  create type import_status as enum ('pending','processing','done','failed','canceled');
exception when duplicate_object then null; end $$;

-- ─── Tabela: lead_imports ───
create table if not exists lead_imports (
  id            uuid primary key default gen_random_uuid(),
  filename      text not null,
  total_rows    integer default 0,
  imported      integer default 0,
  updated       integer default 0,
  skipped       integer default 0,
  failed        integer default 0,
  status        import_status not null default 'pending',
  field_mapping jsonb default '{}'::jsonb,  -- { csv_column: target_field }
  errors        jsonb default '[]'::jsonb,
  source        text,                       -- 'rd_station', 'manual_csv', etc
  imported_by   uuid,
  created_at    timestamptz not null default now(),
  finished_at   timestamptz
);

create index if not exists idx_imports_status  on lead_imports(status);
create index if not exists idx_imports_created on lead_imports(created_at desc);

-- ─── Tabela: lead_exports ───
create table if not exists lead_exports (
  id            uuid primary key default gen_random_uuid(),
  filename      text not null,
  total_rows    integer default 0,
  filters       jsonb default '{}'::jsonb,   -- filtros aplicados
  fields        text[],                       -- colunas exportadas
  file_url      text,                         -- URL do arquivo (Supabase Storage futuro)
  source        text,                         -- 'manual', 'segment', 'scheduled'
  exported_by   uuid,
  created_at    timestamptz not null default now()
);

create index if not exists idx_exports_created on lead_exports(created_at desc);

-- ─── RLS aberto pra dev ───
alter table companies enable row level security;
alter table lead_imports enable row level security;
alter table lead_exports enable row level security;

drop policy if exists "dev_all_companies" on companies;
create policy "dev_all_companies" on companies for all using (true) with check (true);

drop policy if exists "dev_all_imports" on lead_imports;
create policy "dev_all_imports" on lead_imports for all using (true) with check (true);

drop policy if exists "dev_all_exports" on lead_exports;
create policy "dev_all_exports" on lead_exports for all using (true) with check (true);
