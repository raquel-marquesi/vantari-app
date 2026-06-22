-- ════════════════════════════════════════════════════════════════
-- Migration 003 — Lead Tracking (Páginas + Visitas)
-- ────────────────────────────────────────────────────────────────
-- Substitui o módulo Lead Tracking do RD Station.
-- • tracked_pages  — catálogo de URLs que o tracker registra
-- • page_visits    — cada visita feita por um lead (ou anônima)
--
-- Visitas em páginas conhecidas geram lead_events automaticamente
-- (via trigger) para alimentar o Lead Scoring.
-- ════════════════════════════════════════════════════════════════

-- ─── ENUM: categoria de funil da página ───
do $$ begin
  create type page_funnel as enum ('topo', 'meio', 'fundo', 'institucional', 'outro');
exception when duplicate_object then null; end $$;

-- ─── Tabela: tracked_pages ───
create table if not exists tracked_pages (
  id          uuid primary key default gen_random_uuid(),
  url         text not null unique,        -- ex: vantari.com.br/verbas-rescisorias/
  title       text,                         -- nome amigável
  funnel      page_funnel default 'outro',
  score_delta integer not null default 5,   -- pontos somados ao lead quando visita
  category    text,                         -- agrupamento livre (blog, lp, produto)
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_tp_active on tracked_pages(active);
create index if not exists idx_tp_funnel on tracked_pages(funnel);

drop trigger if exists trg_tp_updated on tracked_pages;
create trigger trg_tp_updated
  before update on tracked_pages
  for each row execute function set_updated_at();

-- ─── Tabela: page_visits ───
-- Pode ser anônima (lead_id null) ou identificada.
-- O cookie do tracker.js identifica o lead via email no formulário.
create table if not exists page_visits (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid references leads(id) on delete cascade,
  tracked_page_id uuid references tracked_pages(id) on delete set null,
  url           text not null,             -- URL exata (com query string)
  path          text,                       -- pathname só
  referrer      text,
  visitor_id    text,                       -- cookie/fingerprint anônimo
  user_agent    text,
  ip_country    text,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,
  utm_term      text,
  duration_s    integer,                    -- tempo na página em segundos (opcional)
  created_at    timestamptz not null default now()
);

create index if not exists idx_pv_lead    on page_visits(lead_id);
create index if not exists idx_pv_page    on page_visits(tracked_page_id);
create index if not exists idx_pv_created on page_visits(created_at desc);
create index if not exists idx_pv_visitor on page_visits(visitor_id);

-- ─── Trigger: visita em página rastreada → lead_event (pra Scoring) ───
create or replace function page_visit_to_lead_event()
returns trigger as $$
declare
  v_delta int;
begin
  if new.lead_id is null or new.tracked_page_id is null then
    return new;
  end if;

  select score_delta into v_delta
    from tracked_pages
    where id = new.tracked_page_id and active = true;

  if v_delta is null then return new; end if;

  insert into lead_events (lead_id, event_type, event_data, score_delta, source, created_at)
  values (
    new.lead_id,
    'page_visit',
    jsonb_build_object('url', new.url, 'tracked_page_id', new.tracked_page_id),
    v_delta,
    'lead_tracking',
    new.created_at
  );
  return new;
end $$ language plpgsql;

drop trigger if exists trg_pv_to_event on page_visits;
create trigger trg_pv_to_event
  after insert on page_visits
  for each row execute function page_visit_to_lead_event();

-- ─── RLS ───
alter table tracked_pages enable row level security;
alter table page_visits enable row level security;

drop policy if exists "dev_all_tp" on tracked_pages;
create policy "dev_all_tp" on tracked_pages for all using (true) with check (true);

drop policy if exists "dev_all_pv" on page_visits;
create policy "dev_all_pv" on page_visits for all using (true) with check (true);

-- Permite a Edge Function inserir page_visits anonimamente
drop policy if exists "anon_insert_pv" on page_visits;
create policy "anon_insert_pv" on page_visits for insert to anon with check (true);

-- ════════════════════════════════════════════════════════════════
-- SEED — 10 URLs amostra da auditoria RD (14/05/2026)
-- As outras 68 podem ser cadastradas pela UI.
-- ════════════════════════════════════════════════════════════════

insert into tracked_pages (url, title, funnel, score_delta, category) values
  ('vantari.com.br/verbas-rescisorias-direitos-do-trabalhador/',                                                'Verbas Rescisórias: Direitos do Trabalhador',                  'topo',  10, 'blog'),
  ('vantari.com.br/vender-o-processo-ou-pedir-emprestimo-entenda-por-que-a-antecipacao-nao-gera-dividas/',     'Vender o processo ou pedir empréstimo?',                       'meio',  10, 'blog'),
  ('vantari.com.br/vender-creditos-trabalhistas-erros-comuns/',                                                 'Vender Créditos Trabalhistas: Erros Comuns',                   'meio',  10, 'blog'),
  ('vantari.com.br/venda-de-processos-trabalhistas/',                                                           'Venda de Processos Trabalhistas: Como Funciona?',              'meio',  10, 'blog'),
  ('vantari.com.br/venda-de-processo-trabalhista/',                                                             'Venda de Processo Trabalhista: Tudo o que Você Precisa Saber', 'meio',  10, 'blog'),
  ('vantari.com.br/valor-real-do-seu-processo-trabalhista/',                                                    'Valor Real do Seu Processo: Como Calcular e Antecipar',        'fundo', 15, 'blog'),
  ('vantari.com.br/transacoes-comerciais/',                                                                     'Transações Comerciais e Antecipação de Créditos Trabalhistas', 'topo',  10, 'blog'),
  ('vantari.com.br/trabalho-sem-carteira-assinada-direitos/',                                                   'Trabalho sem carteira assinada: Conheça seus direitos',        'topo',  10, 'blog'),
  ('vantari.com.br/tipos-de-arquivamento/',                                                                     'Tipos de Arquivamento no Processo Trabalhista',                'topo',  10, 'blog'),
  ('credito.vantari.com.br/ligamos-para-voce',                                                                  'LP — Ligamos para você',                                       'fundo', 25, 'lp')
on conflict (url) do nothing;
