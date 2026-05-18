-- ════════════════════════════════════════════════════════════════
-- Migration 005 — Lead Scoring 2D (Perfil A-D + Interesse)
-- ────────────────────────────────────────────────────────────────
-- Implementa o modelo de scoring 2D do RD Station:
--   • Perfil   → letra A/B/C/D baseada em dados estáticos (cargo,
--                segmento, porte). Regras configuráveis em
--                profile_rules. Recálculo automático via trigger.
--   • Interesse → pontuação dinâmica baseada em comportamento. Já
--                 existe como leads.score (migration 002). Regras
--                 agora persistidas em scoring_rules.
--
-- Combinação 2D para MQL:
--   MQL ideal = Perfil A ou B + Interesse alto
--
-- Compatível com:
--   • vantari-scoring-system.jsx     (UI de regras)
--   • vantari-leads-module.jsx       (exibe letra de perfil)
--   • vantari-segments.jsx           (filtro por perfil)
-- ════════════════════════════════════════════════════════════════

-- ─── ENUM: perfil A/B/C/D ───
do $$ begin
  create type lead_profile as enum ('A', 'B', 'C', 'D');
exception when duplicate_object then null; end $$;

-- ─── Adiciona coluna profile na tabela leads ───
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name='leads' and column_name='profile'
  ) then
    alter table leads add column profile lead_profile;
    alter table leads add column profile_points int not null default 0;
  end if;
end $$;

create index if not exists idx_leads_profile on leads(profile);

-- ─── Tabela: profile_thresholds ───
-- Linha única com thresholds A/B/C/D (default 70/40/20/0)
create table if not exists profile_thresholds (
  id          int primary key default 1,
  threshold_a int not null default 70,
  threshold_b int not null default 40,
  threshold_c int not null default 20,
  updated_at  timestamptz default now(),
  constraint pt_single check (id = 1)
);

insert into profile_thresholds (id) values (1) on conflict do nothing;

-- ─── Tabela: profile_rules ───
-- Cada regra dá pontos quando um campo do lead bate com a condição.
-- field_source: 'lead_column' ou 'custom_field'
-- field_key:    nome da coluna OU api_id do custom_field
-- operator:     'equals' | 'in' | 'contains' | 'gte' | 'lte' | 'is_set' | 'is_not_set'
-- value:        valor de comparação (jsonb para flexibilidade)
create table if not exists profile_rules (
  id            uuid primary key default gen_random_uuid(),
  label         text not null,
  category      text default 'manual',  -- 'cargo', 'segmento', 'porte', 'manual'
  field_source  text not null check (field_source in ('lead_column', 'custom_field')),
  field_key     text not null,
  operator      text not null,
  value         jsonb,
  points        int not null default 0,
  active        boolean default true,
  position      int default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists idx_profile_rules_active on profile_rules(active);
create index if not exists idx_profile_rules_field  on profile_rules(field_source, field_key);

-- ─── Tabela: scoring_rules (regras de interesse) ───
-- Persiste as regras que antes só viviam no front. Mantém compat com DEFAULT_RULES.
-- Cria a tabela se não existir, OU adiciona colunas faltantes se já existir
-- com schema antigo (de outro setup).
create table if not exists scoring_rules (
  id            uuid primary key default gen_random_uuid(),
  action        text,
  label         text,
  category      text,
  points        int not null default 0,
  active        boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Adiciona colunas faltantes (caso a tabela já existisse com schema diferente)
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='scoring_rules' and column_name='action') then
    alter table scoring_rules add column action text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='scoring_rules' and column_name='label') then
    alter table scoring_rules add column label text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='scoring_rules' and column_name='category') then
    alter table scoring_rules add column category text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='scoring_rules' and column_name='points') then
    alter table scoring_rules add column points int not null default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='scoring_rules' and column_name='active') then
    alter table scoring_rules add column active boolean default true;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='scoring_rules' and column_name='created_at') then
    alter table scoring_rules add column created_at timestamptz default now();
  end if;
  if not exists (select 1 from information_schema.columns where table_name='scoring_rules' and column_name='updated_at') then
    alter table scoring_rules add column updated_at timestamptz default now();
  end if;
end $$;

-- Relaxa NOT NULL em colunas legadas (schema antigo de outro setup).
-- Mantém NOT NULL apenas em id (PK) e nas colunas que o app realmente popula.
do $$
declare
  col record;
begin
  for col in
    select column_name
      from information_schema.columns
     where table_schema = 'public'
       and table_name   = 'scoring_rules'
       and is_nullable  = 'NO'
       and column_name not in ('id', 'points', 'active', 'created_at', 'updated_at')
  loop
    execute format('alter table scoring_rules alter column %I drop not null', col.column_name);
  end loop;
end $$;

-- Cria índice único em action (só funciona se a coluna estiver populada)
do $$ begin
  if not exists (
    select 1 from pg_indexes where indexname = 'scoring_rules_action_unique'
  ) then
    -- Só cria UNIQUE se não houver duplicatas existentes
    if not exists (
      select action from scoring_rules where action is not null
      group by action having count(*) > 1
    ) then
      create unique index scoring_rules_action_unique on scoring_rules(action) where action is not null;
    end if;
  end if;
end $$;

create index if not exists idx_scoring_rules_action on scoring_rules(action);
create index if not exists idx_scoring_rules_active on scoring_rules(active);

-- ─── Função: avalia operador de regra de perfil ───
create or replace function eval_profile_rule(rule_op text, rule_val jsonb, lead_val text)
returns boolean as $$
begin
  if lead_val is null and rule_op not in ('is_not_set') then
    return rule_op = 'is_not_set';
  end if;

  case rule_op
    when 'equals'      then return lower(lead_val) = lower(rule_val #>> '{}');
    when 'contains'    then return lower(lead_val) like '%' || lower(rule_val #>> '{}') || '%';
    when 'in'          then return rule_val ? lead_val;
    when 'gte'         then return (lead_val ~ '^-?[0-9]+(\.[0-9]+)?$')
                                   and lead_val::numeric >= (rule_val #>> '{}')::numeric;
    when 'lte'         then return (lead_val ~ '^-?[0-9]+(\.[0-9]+)?$')
                                   and lead_val::numeric <= (rule_val #>> '{}')::numeric;
    when 'is_set'      then return lead_val is not null and lead_val <> '';
    when 'is_not_set'  then return lead_val is null or lead_val = '';
    else return false;
  end case;
end $$ language plpgsql immutable;

-- ─── Função: lê valor de um campo (coluna ou custom) para um lead ───
-- Usa SQL dinâmico para acessar lead_custom_values/custom_fields para que a
-- função compile mesmo se essas tabelas não existirem no banco ainda.
create or replace function get_lead_field_value(p_lead_id uuid, p_source text, p_key text)
returns text as $$
declare
  v text;
  q text;
  lcv_exists boolean;
begin
  if p_source = 'lead_column' then
    q := format('select coalesce(%I::text, '''') from leads where id = $1', p_key);
    execute q into v using p_lead_id;
    return v;
  elsif p_source = 'custom_field' then
    select exists (
      select 1 from information_schema.tables
       where table_schema='public' and table_name='lead_custom_values'
    ) into lcv_exists;
    if not lcv_exists then return null; end if;
    execute $q$
      select lcv.value #>> '{}'
        from lead_custom_values lcv
        join custom_fields cf on cf.id = lcv.custom_field_id
       where lcv.lead_id = $1 and cf.api_id = $2
    $q$ into v using p_lead_id, p_key;
    return v;
  end if;
  return null;
exception when others then
  return null;
end $$ language plpgsql;

-- ─── Função: recalcula profile + profile_points de um lead ───
create or replace function recompute_lead_profile(p_lead_id uuid)
returns void as $$
declare
  total_points int := 0;
  r record;
  v text;
  matched boolean;
  ta int; tb int; tc int;
  new_profile lead_profile;
begin
  -- Soma pontos das regras ativas que dão match
  for r in select id, field_source, field_key, operator, value, points
             from profile_rules
            where active = true loop
    v := get_lead_field_value(p_lead_id, r.field_source, r.field_key);
    matched := eval_profile_rule(r.operator, r.value, v);
    if matched then
      total_points := total_points + r.points;
    end if;
  end loop;

  -- Pega thresholds atuais
  select threshold_a, threshold_b, threshold_c
    into ta, tb, tc
    from profile_thresholds where id = 1;

  -- Decide letra
  if    total_points >= ta then new_profile := 'A';
  elsif total_points >= tb then new_profile := 'B';
  elsif total_points >= tc then new_profile := 'C';
  else                          new_profile := 'D';
  end if;

  update leads
     set profile = new_profile,
         profile_points = total_points,
         updated_at = now()
   where id = p_lead_id;
end $$ language plpgsql;

-- ─── Função: recalcula perfil de TODOS os leads (manual / bulk) ───
create or replace function recompute_all_profiles()
returns int as $$
declare
  c int := 0;
  lid uuid;
begin
  for lid in select id from leads loop
    perform recompute_lead_profile(lid);
    c := c + 1;
  end loop;
  return c;
end $$ language plpgsql;

-- ─── Trigger: ao inserir/atualizar lead → recalcula perfil ───
create or replace function trg_lead_profile_recalc()
returns trigger as $$
begin
  perform recompute_lead_profile(new.id);
  return new;
end $$ language plpgsql;

drop trigger if exists trg_leads_profile_recalc on leads;
create trigger trg_leads_profile_recalc
  after insert on leads
  for each row execute function trg_lead_profile_recalc();

-- ─── Trigger: ao mudar um lead_custom_value → recalcula perfil ───
-- Só cria se a tabela lead_custom_values existir (migration 001 aplicada).
create or replace function trg_lcv_profile_recalc()
returns trigger as $$
declare
  target_lead uuid;
begin
  target_lead := coalesce(new.lead_id, old.lead_id);
  if target_lead is not null then
    perform recompute_lead_profile(target_lead);
  end if;
  return coalesce(new, old);
end $$ language plpgsql;

do $$ begin
  if exists (
    select 1 from information_schema.tables
     where table_schema='public' and table_name='lead_custom_values'
  ) then
    drop trigger if exists trg_lcv_profile_recalc on lead_custom_values;
    create trigger trg_lcv_profile_recalc
      after insert or update or delete on lead_custom_values
      for each row execute function trg_lcv_profile_recalc();
  end if;
end $$;

-- ─── RLS aberto pra dev ───
alter table profile_thresholds enable row level security;
alter table profile_rules      enable row level security;
alter table scoring_rules      enable row level security;

drop policy if exists "dev_all_profile_thresholds" on profile_thresholds;
create policy "dev_all_profile_thresholds" on profile_thresholds for all using (true) with check (true);

drop policy if exists "dev_all_profile_rules" on profile_rules;
create policy "dev_all_profile_rules" on profile_rules for all using (true) with check (true);

drop policy if exists "dev_all_scoring_rules" on scoring_rules;
create policy "dev_all_scoring_rules" on scoring_rules for all using (true) with check (true);

-- ─── Seed: regras de interesse padrão (idempotente) ───
-- Insere apenas as regras que ainda não existem (por action).
do $$
declare
  seed record;
begin
  for seed in
    select * from (values
      ('email_open',    'Email aberto',              'email',     2,  true),
      ('email_click',   'Clique em link de email',   'email',     5,  true),
      ('form_submit',   'Formulário preenchido',     'form',      10, true),
      ('page_pricing',  'Visitou /pricing',          'page',      15, true),
      ('page_visit',    'Visitou página genérica',   'page',      1,  true),
      ('whatsapp_msg',  'Mensagem WhatsApp',         'whatsapp',  8,  true),
      ('demo_request',  'Solicitou demo',            'form',      20, true),
      ('webinar',       'Participou de webinar',     'event',     12, false),
      ('inactivity_30', 'Inatividade 30 dias',       'decay',    -5,  true),
      ('email_bounce',  'Email bounce',              'decay',   -10,  true),
      ('unsub',         'Descadastrou de email',     'decay',   -15,  true)
    ) as t(action, label, category, points, active)
  loop
    if not exists (select 1 from scoring_rules where action = seed.action) then
      insert into scoring_rules (action, label, category, points, active)
      values (seed.action, seed.label, seed.category, seed.points, seed.active);
    end if;
  end loop;
end $$;

-- ─── Seed: regras de perfil de exemplo (RD-like) ───
-- Só insere se não houver nenhuma regra ainda (primeira execução)
do $$
begin
  if not exists (select 1 from profile_rules) then
    insert into profile_rules (label, category, field_source, field_key, operator, value, points, active) values
      ('Cargo: C-Level/Diretor',     'cargo',    'lead_column',  'company',      'is_set',    'null'::jsonb,                30, true),
      ('Segmento: SaaS/Tech',        'segmento', 'custom_field', 'cf_segmento',  'in',        '["SaaS","Tecnologia","Software"]'::jsonb, 25, true),
      ('Porte: Médio/Grande',        'porte',    'custom_field', 'cf_porte',     'in',        '["51-200","200+"]'::jsonb,   20, true),
      ('Email corporativo',          'manual',   'lead_column',  'email',        'contains',  '"@"'::jsonb,                 5,  true),
      ('UTM: campanha paga',         'manual',   'lead_column',  'utm_medium',   'in',        '["cpc","paid","ads"]'::jsonb,15, true);
  end if;
end $$;

-- ─── Recalcula perfil de todos os leads existentes ───
select recompute_all_profiles();
