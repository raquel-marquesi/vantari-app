-- RPC pra edição manual de um lead em /leads (pedido da Catarina, 29/07/2026).
-- Reusa a mesma normalização/validação de core.resolve_person (CPF, telefone
-- BR) e mantém core.person_identifiers em sincronia, pra não quebrar a
-- resolução de identidade automática (ex: se alguém adicionar o CPF manual
-- aqui, uma futura mensagem da Nina com esse mesmo CPF já casa com a pessoa
-- certa em vez de criar outra).

create or replace function core.update_person_manual(
  p_person uuid,
  p_full_name text default null,
  p_cpf text default null,
  p_phone text default null,
  p_email text default null,
  p_company_id uuid default null
) returns void
language plpgsql
security definer
set search_path to 'core', 'public'
as $function$
declare
  v_workspace uuid;
  v_cpf   text := core.only_digits(p_cpf);
  v_phone text := core.normalize_phone_br(p_phone);
  v_email text := lower(nullif(trim(p_email), ''));
begin
  select workspace_id into v_workspace from core.persons where id = p_person;
  if v_workspace is null then
    raise exception 'pessoa não encontrada: %', p_person;
  end if;

  if auth.uid() is not null
     and v_workspace not in (select workspace_id from public.workspace_members where user_id = auth.uid())
  then
    raise exception 'sem acesso ao workspace %', v_workspace;
  end if;

  if v_cpf is not null and not core.is_valid_cpf(v_cpf) then
    raise exception 'CPF inválido: %', p_cpf;
  end if;

  -- mesma trava consultiva usada em resolve_person, pra não colidir com
  -- uma chamada de ingest concorrente pro mesmo identificador
  if v_cpf is not null then
    perform pg_advisory_xact_lock(hashtextextended('core_person:cpf:' || v_workspace::text || ':' || v_cpf, 0));
  end if;
  if v_phone is not null then
    perform pg_advisory_xact_lock(hashtextextended('core_person:phone:' || v_workspace::text || ':' || v_phone, 0));
  end if;
  if v_email is not null then
    perform pg_advisory_xact_lock(hashtextextended('core_person:email:' || v_workspace::text || ':' || v_email, 0));
  end if;

  update core.persons set
    full_name     = p_full_name,
    cpf           = v_cpf,
    status        = case when v_cpf is not null then 'identificado' else status end,
    primary_phone = v_phone,
    primary_email = v_email,
    company_id    = coalesce(p_company_id, company_id),
    updated_at    = now()
  where id = p_person;

  if v_cpf is not null then
    insert into core.person_identifiers (workspace_id, person_id, kind, value, verified)
    values (v_workspace, p_person, 'cpf', v_cpf, true)
    on conflict (workspace_id, kind, value) do update set person_id = excluded.person_id;
  end if;
  if v_phone is not null then
    insert into core.person_identifiers (workspace_id, person_id, kind, value)
    values (v_workspace, p_person, 'phone', v_phone)
    on conflict (workspace_id, kind, value) do update set person_id = excluded.person_id;
  end if;
  if v_email is not null then
    insert into core.person_identifiers (workspace_id, person_id, kind, value)
    values (v_workspace, p_person, 'email', v_email)
    on conflict (workspace_id, kind, value) do update set person_id = excluded.person_id;
  end if;

  insert into core.events (workspace_id, person_id, source, type, payload)
  values (v_workspace, p_person, 'manual', 'person_edited', '{}'::jsonb);
end $function$;

grant execute on function core.update_person_manual(uuid, text, text, text, text, uuid) to authenticated;
