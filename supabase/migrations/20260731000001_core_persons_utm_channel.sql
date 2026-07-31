-- ════════════════════════════════════════════════════════════════
-- Canais e atribuição — pedido da Catarina, 31/07/2026
-- ────────────────────────────────────────────────────────────────
-- Achado ao investigar: o UTM já é capturado de ponta a ponta em
-- public.page_visits e public.form_submissions (tracker.js + formulários),
-- e até chega a ficar salvo em public.leads na criação — mas NUNCA
-- chegava em core.persons, que é o que /leads, /crm e /dashboard leem
-- hoje (pós-convergência pro core canônico). Ou seja: o dado já existe,
-- só não chegava no lugar certo. É por isso que a aba "Canais" do
-- Dashboard está mockada (vazia) — não tinha de onde puxar.
--
-- Modelo escolhido: PRIMEIRO TOQUE (first-touch). UTM só é gravado na
-- criação da pessoa e nunca é sobrescrito depois — ao contrário do
-- e-mail/telefone (onde "o mais recente vence"). Faz sentido porque a
-- pergunta que a atribuição de canal responde é "de onde essa pessoa
-- veio originalmente", não "qual foi a última página que ela visitou".
--
-- Também adiciona first_source (form | nina | tracking | import | manual),
-- gravado do mesmo jeito (primeiro toque) — usado como canal quando não
-- há UTM (ex: um lead que chegou direto pelo WhatsApp da Nina não tem UTM
-- nenhum, mas não faz sentido classificar isso como "Direto").
-- ════════════════════════════════════════════════════════════════

alter table core.persons
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists utm_term text,
  add column if not exists first_source text;

-- ── core.resolve_person: mesma função, + 5 parâmetros de UTM opcionais ──
create or replace function core.resolve_person(
  p_workspace uuid,
  p_cpf       text default null,
  p_phone     text default null,
  p_email     text default null,
  p_name      text default null,
  p_source    text default 'system',
  p_utm_source   text default null,
  p_utm_medium   text default null,
  p_utm_campaign text default null,
  p_utm_content  text default null,
  p_utm_term     text default null
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
                              primary_email, primary_phone,
                              utm_source, utm_medium, utm_campaign, utm_content, utm_term,
                              first_source)
    values (p_workspace, v_cpf,
            case when v_cpf is not null then 'identificado' else 'pendente' end,
            p_name, v_email, v_phone,
            p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_utm_term,
            p_source)
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
       -- primeiro toque: só grava se ainda não tinha nada
       utm_source    = coalesce(utm_source, p_utm_source),
       utm_medium    = coalesce(utm_medium, p_utm_medium),
       utm_campaign  = coalesce(utm_campaign, p_utm_campaign),
       utm_content   = coalesce(utm_content, p_utm_content),
       utm_term      = coalesce(utm_term, p_utm_term),
       first_source  = coalesce(first_source, p_source),
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

-- ── trg_form_submission_to_lead: mesmo corpo, + repassa UTM da submissão ──
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
      email      = coalesce(email, p_email),
      name       = coalesce(name, p_name),
      phone      = coalesce(phone, p_phone),
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

  -- NOVO: repassa o UTM da submissão pro core canônico (primeiro toque)
  begin
    select core.resolve_person(
      p_workspace    => v_ws,
      p_cpf          => p_cpf,
      p_phone        => p_phone,
      p_email        => p_email,
      p_name         => p_name,
      p_source       => 'form',
      p_utm_source   => new.utm_source,
      p_utm_medium   => new.utm_medium,
      p_utm_campaign => new.utm_campaign,
      p_utm_content  => new.utm_content,
      p_utm_term     => new.utm_term
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

-- ── page_visit_to_lead_event: mesmo corpo, + repassa UTM da própria visita ──
create or replace function public.page_visit_to_lead_event()
returns trigger
language plpgsql
as $$
declare
  v_delta     int;
  v_lead      record;
  v_person_id uuid;
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

  begin
    select * into v_lead from leads where id = new.lead_id;
    if v_lead.id is not null and (v_lead.cpf is not null or v_lead.email is not null) then
      select core.resolve_person(
        p_workspace    => coalesce(v_lead.workspace_id, '53092199-7b75-4342-a897-f589d6f34922'::uuid),
        p_cpf          => v_lead.cpf,
        p_phone        => v_lead.phone,
        p_email        => v_lead.email,
        p_name         => v_lead.name,
        p_source       => 'tracking',
        p_utm_source   => new.utm_source,
        p_utm_medium   => new.utm_medium,
        p_utm_campaign => new.utm_campaign,
        p_utm_content  => new.utm_content,
        p_utm_term     => new.utm_term
      ) into v_person_id;

      if v_person_id is not null then
        insert into core.events (workspace_id, person_id, source, type, payload)
        values (
          coalesce(v_lead.workspace_id, '53092199-7b75-4342-a897-f589d6f34922'::uuid),
          v_person_id, 'tracking', 'page_visit',
          jsonb_build_object('path', new.path, 'url', new.url, 'tracked_page_id', new.tracked_page_id)
        );
      end if;
    end if;
  exception when others then
    raise warning 'page_visit_to_lead_event: falha ao sincronizar core.events (page_visit %): %', new.id, sqlerrm;
  end;

  return new;
end $$;

-- ── Classificação de canal (convenção estilo GA4) ──
create or replace function core.channel_of(
  p_utm_source text, p_utm_medium text, p_first_source text default null
) returns text
language sql immutable as $$
  select case
    when p_utm_source is not null and lower(coalesce(p_utm_medium,'')) in ('cpc','ppc','paid','paidsearch')
         and lower(p_utm_source) like '%google%'
      then 'Busca paga (Google Ads)'
    when p_utm_source is not null and lower(p_utm_source) like '%google%'
      then 'Busca orgânica'
    when lower(coalesce(p_utm_medium,'')) in ('cpc','ppc','paid','paidsocial')
         and lower(coalesce(p_utm_source,'')) in ('facebook','instagram','meta','fb','ig')
      then 'Social paga (Meta Ads)'
    when lower(coalesce(p_utm_source,'')) in ('facebook','instagram','meta','fb','ig')
      then 'Social orgânica'
    when lower(coalesce(p_utm_medium,'')) = 'email' or lower(coalesce(p_utm_source,'')) = 'email'
      then 'Email marketing'
    when lower(coalesce(p_utm_medium,'')) = 'referral'
      then 'Indicação'
    when p_utm_source is not null
      then initcap(p_utm_source) || ' (' || coalesce(p_utm_medium, 'outro') || ')'
    when p_first_source = 'nina' then 'WhatsApp (Nina)'
    when p_first_source = 'form' then 'Formulário (sem UTM)'
    when p_first_source = 'tracking' then 'Site (sem origem identificada)'
    when p_first_source = 'import' then 'Importação manual'
    when p_first_source is not null then initcap(p_first_source)
    else 'Direto'
  end;
$$;

-- ── Funil (Leads → Negócios → Ganhos) agrupado por canal ──
-- Nota: não inclui MQL/Interesse — mkt.lead_scores está vazio em produção
-- hoje (o motor de scoring "Vantari Crédito" ainda não populou nenhuma
-- pessoa). Achado à parte, fora do escopo desta frente.
create or replace function core.get_channel_funnel(p_workspace uuid)
returns table(channel text, leads bigint, negocios bigint, ganhos bigint)
language plpgsql
security definer
set search_path = core, crm, public
as $$
begin
  if auth.uid() is not null
     and p_workspace not in (select workspace_id from public.workspace_members where user_id = auth.uid())
  then
    raise exception 'sem acesso ao workspace %', p_workspace;
  end if;

  return query
  select
    core.channel_of(p.utm_source, p.utm_medium, p.first_source) as channel,
    count(distinct p.id) as leads,
    count(distinct d.id) filter (where d.id is not null) as negocios,
    count(distinct d.id) filter (where d.status = 'won') as ganhos
  from core.persons p
  left join crm.deals d on d.person_id = p.id and d.workspace_id = p_workspace
  where p.workspace_id = p_workspace
  group by 1
  order by leads desc;
end;
$$;

grant execute on function core.get_channel_funnel(uuid) to authenticated;
