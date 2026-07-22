-- ════════════════════════════════════════════════════════════════
-- FIX — trg_form_submission_to_lead também sincroniza com core.persons
-- ────────────────────────────────────────────────────────────────
-- Problema: o gatilho de submissão de formulário grava só em public.leads
-- (tabela legada). A tela /leads e o CRM já leem de core.persons (pós
-- reestruturação, PR #12/13). Resultado: preencher um formulário incrementa
-- o contador do form e cria evento de score, mas o lead nunca aparece em
-- /leads nem no CRM.
--
-- Correção: mantém 100% do comportamento atual em public.leads (Score,
-- Automação de Marketing, Email Marketing e Lead Tracking continuam
-- funcionando sem nenhuma mudança, pois todos referenciam leads.id via FK).
-- ADICIONA uma chamada a core.resolve_person() — a porta de entrada oficial
-- da pessoa canônica, documentada no próprio banco como "use esta função em
-- TODA porta de entrada (form, Nina, ads, import)".
--
-- Workspace: usa o da submissão/formulário; na ausência (ex.: formulários
-- criados sem workspace_id, caso dos 3 criados via UI antes deste fix),
-- cai no workspace único "Vantari" (53092199-7b75-4342-a897-f589d6f34922).
-- ════════════════════════════════════════════════════════════════

create or replace function public.trg_form_submission_to_lead()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  p_email     text;
  p_cpf       text;
  p_name      text;
  p_phone     text;
  p_company   text;
  v_form      record;
  v_ws        uuid;
  v_lead_id   uuid;
  v_points    integer;
  v_source    text;
  v_stage     text;
  v_person_id uuid;
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
  v_ws     := coalesce(new.workspace_id, v_form.workspace_id, '53092199-7b75-4342-a897-f589d6f34922'::uuid);
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

  -- ── NOVO: sincroniza com a pessoa canônica (core.persons) ──
  -- mesma porta de entrada usada por /leads → "Novo Contato" e por futuras
  -- integrações (Nina, ads, import). Sem isso, o lead do formulário nunca
  -- aparecia na tela nova de Leads nem no CRM.
  begin
    select core.resolve_person(
      p_workspace => v_ws,
      p_cpf       => p_cpf,
      p_phone     => p_phone,
      p_email     => p_email,
      p_name      => p_name,
      p_source    => 'form'
    ) into v_person_id;
  exception when others then
    raise warning 'core.resolve_person falhou (submission %): %', new.id, sqlerrm;
  end;

  return new;
exception when others then
  -- não bloqueia a gravação da submissão, mas registra o erro no log do Postgres
  raise warning 'trg_form_submission_to_lead falhou (submission %): %', new.id, sqlerrm;
  return new;
end;
$$;

-- retroativo: os 3 formulários das landing pages foram criados via UI antes
-- deste fix e nasceram sem workspace_id — sem isso, o fallback do gatilho
-- ainda funcionaria, mas é mais correto o formulário já ter o dado certo.
update forms set workspace_id = '53092199-7b75-4342-a897-f589d6f34922'::uuid
 where workspace_id is null
   and slug in ('escritorios-juridicos', 'antecipar-agora', 'antecipar-acao');
