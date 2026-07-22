-- =============================================================================
-- HARDENING DE RLS — Fase 1: fechar o acesso ANÔNIMO (vazamento de PII/LGPD)
-- -----------------------------------------------------------------------------
-- A auditoria provou que a chave anon (pública no bundle) LÊ e ESCREVE tabelas
-- de negócio sem login (leads com CPF retornaram 200; insert retornou 201).
-- Este script tranca tudo para "exige usuário autenticado", com 3 exceções
-- cirúrgicas para não quebrar o formulário público.
--
-- POR QUE "authenticated USING(true)" e NÃO escopo por workspace nesta fase:
--   Os 107 leads têm workspace_id = NULL e os usuários do app não estão
--   mapeados em workspace_members. Escopar por workspace agora deixaria o app
--   logado vendo ZERO linhas. O escopo multi-tenant entra junto com o core
--   (0001/0002), migrando os dados. Aqui o objetivo é só estancar o anon.
--
-- NÃO MEXE nas tabelas que já têm RLS correta (não as afrouxar):
--   email_sends, workflows, workflow_runs, workspaces, workspace_members, unsubscribes
--
-- EXCEÇÕES (verificadas no código):
--   • forms            → anon SELECT só de forms ativos  (public-form: .eq active true)
--   • form_submissions → anon INSERT apenas (não pode LER); o trigger que cria o
--                        lead é SECURITY DEFINER, então grava em leads mesmo com RLS.
--   • integration_credentials → ninguém além de service_role (tokens OAuth)
--   • page_visits / tracked_pages → SEM anon: a Edge Function `track` grava com
--                        service_role, o browser nunca escreve direto.
--
-- PROPOSTA PARA REVISÃO — validar e aplicar com cuidado (de preferência fora de
-- horário de pico). Testar o /f/:slug logo após aplicar.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) LOCKDOWN GENÉRICO: enable RLS + remove policies permissivas + só authenticated
-- ---------------------------------------------------------------------------
do $$
declare
  t      text;
  v_kind text;
  pol    record;
  lockdown text[] := array[
    'leads', 'leads_pending', 'companies', 'lead_events', 'custom_fields',
    'lead_custom_values', 'page_visits', 'tracked_pages', 'email_templates',
    'campaigns', 'campaign_sends', 'segments', 'scoring_rules', 'profile_rules',
    'profile_thresholds', 'scoring_settings', 'automation_flows', 'workflow_logs',
    'flow_runs', 'team_members', 'profiles', 'lead_interactions',
    'lead_score_history', 'lead_imports', 'lead_exports', 'landing_pages'
  ];
begin
  foreach t in array lockdown loop
    -- só tabela base (relkind 'r'); views/matviews são tratadas no bloco 1b
    select c.relkind into v_kind
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname = t;
    if v_kind is null then
      raise notice 'pulando %, não existe', t;
      continue;
    elsif v_kind <> 'r' then
      raise notice 'pulando % (não é tabela base, relkind=%) — vai no bloco de views', t, v_kind;
      continue;
    end if;
    execute format('alter table public.%I enable row level security', t);
    -- remove QUALQUER policy existente (inclui as using(true) abertas a anon)
    for pol in
      select policyname from pg_policies where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy %I on public.%I', pol.policyname, t);
    end loop;
    -- única política: somente sessão autenticada
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true)',
      t || '_authenticated', t);
    raise notice 'trancada: %', t;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 1b) VIEWS — fecham o BYPASS de RLS
--     Uma view roda com os privilégios do dono (security-definer por padrão),
--     então anon lendo a view ignora a RLS da tabela base. leads_pending é uma
--     dessas (a auditoria leu 102 linhas por ela). Revogar anon de TODAS as
--     views fecha esse caminho — o anon não precisa de view nenhuma (o form
--     público lê a TABELA forms direto).
-- ---------------------------------------------------------------------------
do $$
declare v record;
begin
  for v in
    select c.relname
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('v', 'm')   -- view, matview
  loop
    execute format('revoke all on public.%I from anon', v.relname);
    raise notice 'anon revogado da view %', v.relname;
  end loop;
end $$;
-- Obs: em Postgres 15+ dá pra, em vez de revogar, fazer a view respeitar a RLS
-- da base com  alter view public.<v> set (security_invoker = on);  — mas revogar
-- o anon é à prova de versão e suficiente aqui.

-- ---------------------------------------------------------------------------
-- helper local: limpa todas as policies de uma tabela (para as exceções abaixo)
-- ---------------------------------------------------------------------------
create or replace function pg_temp.drop_all_policies(p_table text)
returns void language plpgsql as $$
declare pol record;
begin
  for pol in select policyname from pg_policies
             where schemaname = 'public' and tablename = p_table loop
    execute format('drop policy %I on public.%I', pol.policyname, p_table);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 2) forms — authenticated full + anon SELECT só de forms ATIVOS
-- ---------------------------------------------------------------------------
alter table public.forms enable row level security;
select pg_temp.drop_all_policies('forms');
create policy forms_authenticated on public.forms
  for all to authenticated using (true) with check (true);
create policy forms_anon_read_active on public.forms
  for select to anon using (active = true);

-- ---------------------------------------------------------------------------
-- 3) form_submissions — authenticated full + anon INSERT apenas (sem SELECT)
--    (o trigger trg_form_submission_to_lead é SECURITY DEFINER → cria o lead)
-- ---------------------------------------------------------------------------
alter table public.form_submissions enable row level security;
select pg_temp.drop_all_policies('form_submissions');
create policy fs_authenticated on public.form_submissions
  for all to authenticated using (true) with check (true);
create policy fs_anon_insert on public.form_submissions
  for insert to anon with check (true);

-- ---------------------------------------------------------------------------
-- 4) integration_credentials — SÓ service_role (tokens OAuth). Sem policy
--    para anon/authenticated + revoke defensivo (nem um acidente futuro expõe).
-- ---------------------------------------------------------------------------
alter table public.integration_credentials enable row level security;
select pg_temp.drop_all_policies('integration_credentials');
revoke all on public.integration_credentials from anon, authenticated;
-- (nenhuma policy criada → apenas service_role, que bypassa RLS, acessa)

-- ---------------------------------------------------------------------------
-- 5) VERIFICAÇÃO rápida (rode após aplicar): nenhuma tabela de negócio deve
--    ter policy concedendo a 'anon' algo além das exceções acima.
-- ---------------------------------------------------------------------------
-- select tablename, policyname, roles, cmd
--   from pg_policies
--  where schemaname='public' and 'anon' = any(roles)
--  order by tablename;
--  -- esperado SOMENTE: forms_anon_read_active (SELECT), fs_anon_insert (INSERT)
