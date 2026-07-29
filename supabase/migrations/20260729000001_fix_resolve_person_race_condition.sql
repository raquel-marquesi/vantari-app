-- Bug real encontrado em produção (29/07/2026): a Nina passou a mandar
-- chamadas de ingest quase simultâneas pro mesmo contato novo (duas
-- chamadas a poucos microssegundos de distância). Como resolve_person
-- fazia primeiro um SELECT pra checar se a pessoa já existe e só DEPOIS
-- um INSERT, duas chamadas concorrentes viam as duas "pessoa não existe"
-- e criavam DUAS pessoas pro mesmo telefone (7 duplicatas confirmadas).
--
-- Fix: trava consultiva (pg_advisory_xact_lock) por workspace+identificador
-- antes da checagem. A trava é liberada automaticamente no fim da
-- transação, então chamadas concorrentes pro MESMO identificador agora
-- serializam — a segunda só roda depois que a primeira já commitou,
-- e aí ela enxerga a pessoa recém-criada e atualiza em vez de duplicar.

create or replace function core.resolve_person(
  p_workspace uuid,
  p_cpf text default null,
  p_phone text default null,
  p_email text default null,
  p_name text default null,
  p_source text default 'system'
) returns uuid
language plpgsql
security definer
set search_path to 'core', 'public'
as $function$
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

  -- ── trava consultiva por identificador: serializa chamadas concorrentes
  --    pro mesmo cpf/telefone/email dentro do mesmo workspace ──
  if v_cpf is not null then
    perform pg_advisory_xact_lock(hashtextextended('core_person:cpf:' || p_workspace::text || ':' || v_cpf, 0));
  end if;
  if v_phone is not null then
    perform pg_advisory_xact_lock(hashtextextended('core_person:phone:' || p_workspace::text || ':' || v_phone, 0));
  end if;
  if v_email is not null then
    perform pg_advisory_xact_lock(hashtextextended('core_person:email:' || p_workspace::text || ':' || v_email, 0));
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
    v_person := v_by_email;
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
end $function$;
