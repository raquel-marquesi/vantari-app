-- ════════════════════════════════════════════════════════════════
-- HOTFIX — trg_form_submission_to_lead compatível com o schema VIVO (multi-tenant)
-- ────────────────────────────────────────────────────────────────
-- Problema: a função em produção insere em lead_events com colunas
--   (event_data, source) e event_type='form_submit', que NÃO existem no
--   schema real (a tabela tem `metadata`, sem `source`, e CHECK só aceita
--   'form_fill'). O insert estoura, o `exception when others` engole, e a
--   subtransação desfaz o lead + o contador. Resultado: 201 grava a submissão
--   mas nenhum lead nasce e o contador não sobe.
--
-- Correção:
--   1. Seta leads.workspace_id := forms.workspace_id (necessário p/ o lead
--      aparecer no painel e p/ a cascata lead_score_history que exige NOT NULL).
--   2. Insert em lead_events com (metadata, event_type='form_fill').
--   3. Upsert manual (sem ON CONFLICT) p/ não depender de inferência de índice
--      parcial — robusto contra a divergência do schema.
--   4. Troca o swallow silencioso por `raise warning` (erro vai pro log do
--      Postgres em vez de sumir).
--
-- COMO APLICAR: rodar este bloco no Supabase → SQL Editor do projeto
--   ejhrlrasepowdcdnggmv (NEXT-marketing.crm). NÃO usar `supabase db push`
--   (o tracking remoto não tem as migrations locais 001–010; um push tentaria
--   reaplicar tudo no schema vivo e quebraria).
-- ════════════════════════════════════════════════════════════════

create or replace function public.trg_form_submission_to_lead()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  p_email   text;
  p_cpf     text;
  p_name    text;
  p_phone   text;
  p_company text;
  v_form    record;
  v_ws      uuid;
  v_lead_id uuid;
  v_points  integer;
  v_source  text;
  v_stage   text;
begin
  p_email   := nullif(lower(coalesce(new.payload ->> 'email', new.payload ->> 'Email', '')), '');
  p_cpf     := clean_cpf(coalesce(new.payload ->> 'cpf', new.payload ->> 'CPF'));
  p_name    := coalesce(new.payload ->> 'name',  new.payload ->> 'nome',     new.payload ->> 'Nome');
  p_phone   := coalesce(new.payload ->> 'phone', new.payload ->> 'telefone', new.payload ->> 'Telefone');
  p_company := coalesce(new.payload ->> 'company', new.payload ->> 'empresa', new.payload ->> 'Empresa');

  -- precisa de pelo menos CPF ou email
  if p_cpf is null and p_email is null then
    return new;
  end if;

  select * into v_form from forms where id = new.form_id;
  v_ws     := coalesce(new.workspace_id, v_form.workspace_id);
  v_source := coalesce(v_form.source_label, 'Form: ' || coalesce(v_form.name, ''));
  v_stage  := coalesce(v_form.stage_on_submit, 'Lead');

  -- herda o workspace na própria submission, se faltava
  if new.workspace_id is null and v_ws is not null then
    update form_submissions set workspace_id = v_ws where id = new.id;
  end if;

  -- localizar lead existente: CPF tem prioridade; depois (workspace, email)
  if p_cpf is not null then
    select id into v_lead_id from leads where cpf = p_cpf limit 1;
  end if;
  if v_lead_id is null and p_email is not null then
    select id into v_lead_id from leads
     where lower(email) = p_email
       and workspace_id is not distinct from v_ws
     limit 1;
  end if;

  if v_lead_id is null then
    insert into leads (workspace_id, cpf, email, name, phone, company, source, stage,
                       utm_source, utm_medium, utm_campaign, utm_content, utm_term, tags)
    values (v_ws, p_cpf, p_email, p_name, p_phone, p_company, v_source, v_stage,
            new.utm_source, new.utm_medium, new.utm_campaign, new.utm_content, new.utm_term,
            coalesce(v_form.tags, '{}'))
    returning id into v_lead_id;
  else
    update leads set
      cpf        = coalesce(cpf, p_cpf),
      email      = coalesce(email, p_email),
      name       = coalesce(name, p_name),
      phone      = coalesce(phone, p_phone),
      company    = coalesce(company, p_company),
      tags       = (select array(select distinct unnest(coalesce(leads.tags, '{}') || coalesce(v_form.tags, '{}')))),
      updated_at = now()
    where id = v_lead_id;
  end if;

  -- vincula a submission ao lead
  update form_submissions set lead_id = v_lead_id where id = new.id;

  -- evento de score (apenas com workspace: a cascata lead_score_history exige workspace_id NOT NULL)
  if v_ws is not null then
    v_points := coalesce(
      (select points from scoring_rules
        where action = 'form_submit' and active = true
          and (workspace_id = v_ws or workspace_id is null)
        order by workspace_id nulls last
        limit 1),
      10);
    insert into lead_events (lead_id, event_type, score_delta, metadata)
    values (v_lead_id, 'form_fill', v_points,
            jsonb_build_object('form_id', new.form_id,
                               'form_name', coalesce(v_form.name, ''),
                               'submission_id', new.id,
                               'origin', 'form_submit'));
  end if;

  -- incrementa o contador do formulário
  update forms set submission_count = coalesce(submission_count, 0) + 1, updated_at = now()
   where id = new.form_id;

  return new;
exception when others then
  -- não bloqueia a gravação da submissão, mas registra o erro no log do Postgres
  raise warning 'trg_form_submission_to_lead falhou (submission %): %', new.id, sqlerrm;
  return new;
end;
$$;
