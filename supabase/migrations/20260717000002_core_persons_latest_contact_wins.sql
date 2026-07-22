-- ════════════════════════════════════════════════════════════════
-- FIX — contato mais recente vence, com histórico da troca
-- ────────────────────────────────────────────────────────────────
-- Pedido: quando o mesmo CPF preenche um formulário de novo com um e-mail
-- ou telefone diferente do que já está salvo, o cadastro deve atualizar
-- para o mais recente (a pessoa pode ter trocado de contato há meses) —
-- e não simplesmente ignorar o dado novo. Ao mesmo tempo, o contato
-- anterior não pode se perder: fica registrado como evento no histórico
-- da pessoa.
--
-- Antes: core.resolve_person fazia coalesce(primary_email, v_email) —
-- ou seja, mantinha sempre o e-mail/telefone ORIGINAL e descartava
-- qualquer valor novo informado depois. O dado novo só ficava guardado
-- de forma invisível em core.person_identifiers, sem aparecer em
-- nenhuma tela.
--
-- Agora: coalesce(v_email, primary_email) — o valor mais recente
-- informado passa a ser o principal — e, quando o valor muda de fato,
-- grava um evento 'contact_updated' em core.events (com o valor antigo
-- e o novo), pra aparecer no histórico do lead.
-- ════════════════════════════════════════════════════════════════

create or replace function core.resolve_person(
  p_workspace uuid,
  p_cpf       text default null,
  p_phone     text default null,
  p_email     text default null,
  p_name      text default null,
  p_source    text default 'system'
) returns uuid
language plpgsql security definer set search_path = core, public as $$
declare
  v_cpf   text := core.only_digits(p_cpf);
  v_phone text := core.normalize_phone_br(p_phone);
  v_email text := lower(nullif(trim(p_email), ''));
  v_by_cpf uuid; v_by_phone uuid; v_by_email uuid;
  v_person uuid;
  v_old_email text;
  v_old_phone text;
begin
  if auth.uid() is not null
     and p_workspace not in (
        select workspace_id from public.workspace_members where user_id = auth.uid())
  then
    raise exception 'sem acesso ao workspace %', p_workspace;
  end if;

  if v_cpf is not null and not core.is_valid_cpf(v_cpf) then
    raise exception 'CPF inválido: %', p_cpf;
  end if;

  select person_id into v_by_cpf   from core.person_identifiers
    where workspace_id = p_workspace and kind = 'cpf'   and value = v_cpf   limit 1;
  select person_id into v_by_phone from core.person_identifiers
    where workspace_id = p_workspace and kind = 'phone' and value = v_phone limit 1;
  select person_id into v_by_email from core.person_identifiers
    where workspace_id = p_workspace and kind = 'email' and value = v_email limit 1;

  if v_by_cpf is not null then
    if v_by_phone is not null and v_by_phone <> v_by_cpf then
      perform core.merge_persons(v_by_cpf, v_by_phone);
    end if;
    if v_by_email is not null and v_by_email <> v_by_cpf then
      perform core.merge_persons(v_by_cpf, v_by_email);
    end if;
    v_person := v_by_cpf;
  elsif v_by_phone is not null then
    if v_by_email is not null and v_by_email <> v_by_phone then
      perform core.merge_persons(v_by_phone, v_by_email);
    end if;
    v_person := v_by_phone;
  else
    v_person := v_by_email;  -- pode ser NULL
  end if;

  if v_person is null then
    insert into core.persons (workspace_id, cpf, status, full_name,
                              primary_email, primary_phone)
    values (p_workspace, v_cpf,
            case when v_cpf is not null then 'identificado' else 'pendente' end,
            p_name, v_email, v_phone)
    returning id into v_person;
  else
    select primary_email, primary_phone into v_old_email, v_old_phone
      from core.persons where id = v_person;

    update core.persons set
       cpf           = coalesce(cpf, v_cpf),
       status        = case when coalesce(cpf, v_cpf) is not null
                            then 'identificado' else status end,
       full_name     = coalesce(full_name, p_name),
       primary_email = coalesce(v_email, primary_email),
       primary_phone = coalesce(v_phone, primary_phone),
       updated_at    = now()
    where id = v_person;

    -- histórico: sempre que o contato mais recente vier diferente do que já
    -- tínhamos, registra o evento — o contato antigo fica visível na linha
    -- do tempo mesmo depois de o principal ser atualizado.
    if v_email is not null and v_old_email is not null and v_email <> v_old_email then
      insert into core.events (workspace_id, person_id, source, type, payload)
      values (p_workspace, v_person, p_source, 'contact_updated',
              jsonb_build_object('field', 'email', 'old', v_old_email, 'new', v_email));
    end if;
    if v_phone is not null and v_old_phone is not null and v_phone <> v_old_phone then
      insert into core.events (workspace_id, person_id, source, type, payload)
      values (p_workspace, v_person, p_source, 'contact_updated',
              jsonb_build_object('field', 'phone', 'old', v_old_phone, 'new', v_phone));
    end if;
  end if;

  -- gravar identificadores (idempotente) — todo e-mail/telefone já visto
  -- continua reconhecendo a mesma pessoa, mesmo que não seja mais o principal
  if v_cpf is not null then
    insert into core.person_identifiers (workspace_id, person_id, kind, value, verified)
    values (p_workspace, v_person, 'cpf', v_cpf, true)
    on conflict (workspace_id, kind, value) do update set person_id = excluded.person_id;
  end if;
  if v_phone is not null then
    insert into core.person_identifiers (workspace_id, person_id, kind, value)
    values (p_workspace, v_person, 'phone', v_phone)
    on conflict (workspace_id, kind, value) do nothing;
  end if;
  if v_email is not null then
    insert into core.person_identifiers (workspace_id, person_id, kind, value)
    values (p_workspace, v_person, 'email', v_email)
    on conflict (workspace_id, kind, value) do nothing;
  end if;

  return v_person;
end $$;

-- mesma política de "mais recente vence" no lado legado (public.leads),
-- pra não os dois sistemas divergirem de novo
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

  if p_cpf is null and p_email is null then
    return new;
  end if;

  select * into v_form from forms where id = new.form_id;
  v_ws     := coalesce(new.workspace_id, v_form.workspace_id, '53092199-7b75-4342-a897-f589d6f34922'::uuid);
  v_source := coalesce(v_form.source_label, 'Form: ' || coalesce(v_form.name, ''));
  v_stage  := coalesce(v_form.stage_on_submit, 'Lead');

  if new.workspace_id is null and v_ws is not null then
    update form_submissions set workspace_id = v_ws where id = new.id;
  end if;

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
      email      = coalesce(p_email, email),
      name       = coalesce(name, p_name),
      phone      = coalesce(p_phone, phone),
      company    = coalesce(company, p_company),
      tags       = (select array(select distinct unnest(coalesce(leads.tags, '{}') || coalesce(v_form.tags, '{}')))),
      updated_at = now()
    where id = v_lead_id;
  end if;

  update form_submissions set lead_id = v_lead_id where id = new.id;

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

  update forms set submission_count = coalesce(submission_count, 0) + 1, updated_at = now()
   where id = new.form_id;

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
  raise warning 'trg_form_submission_to_lead falhou (submission %): %', new.id, sqlerrm;
  return new;
end;
$$;
