-- Ajuste em core.reconcile_lid_person (20261002120000): quando a duplicata já
-- existe, as duas pessoas têm conversa com o MESMO external_conversation_id
-- (cada uma criou a sua antes da correção). O "limit 1" sem ordem podia pegar
-- a conversa da própria pessoa e não juntar nada. Agora prefere sempre a
-- conversa de OUTRA pessoa.

create or replace function core.reconcile_lid_person(
  p_workspace uuid,
  p_person uuid,
  p_external_conversation_id text,
  p_phone text
) returns uuid
language plpgsql
security definer
set search_path to 'core', 'public'
as $function$
declare
  v_phone text := core.normalize_phone_br(p_phone);
  v_old_person uuid;
  v_old_phone text;
  v_old_cpf text;
  v_new_cpf text;
  v_survivor uuid;
  v_loser uuid;
begin
  if p_person is null or p_external_conversation_id is null
     or v_phone is null or length(v_phone) not in (10, 11) then
    return p_person;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    'core_lid_reconcile:' || p_workspace::text || ':' || p_external_conversation_id, 0));

  select cv.person_id into v_old_person
    from core.conversations cv
   where cv.workspace_id = p_workspace
     and cv.external_conversation_id = p_external_conversation_id
   order by (cv.person_id = p_person)
   limit 1;

  if v_old_person is null or v_old_person = p_person then
    return p_person;
  end if;

  select core.normalize_phone_br(primary_phone), cpf
    into v_old_phone, v_old_cpf
    from core.persons where id = v_old_person;

  -- só age se o cadastro antigo tinha um LID no lugar do telefone
  if v_old_phone is not null and length(v_old_phone) in (10, 11) then
    return p_person;
  end if;

  select cpf into v_new_cpf from core.persons where id = p_person;

  -- dois CPFs diferentes = duas pessoas de verdade; não junta, só registra
  if v_old_cpf is not null and v_new_cpf is not null and v_old_cpf <> v_new_cpf then
    insert into core.events (workspace_id, person_id, source, type, payload)
    values (p_workspace, p_person, 'system', 'lid_reconcile_cpf_conflict',
            jsonb_build_object('lid_person', v_old_person,
                               'external_conversation_id', p_external_conversation_id));
    return p_person;
  end if;

  -- sobrevive quem tem CPF; empate fica com a pessoa do telefone real
  if v_old_cpf is not null and v_new_cpf is null then
    v_survivor := v_old_person; v_loser := p_person;
  else
    v_survivor := p_person; v_loser := v_old_person;
  end if;

  perform core.merge_persons(v_survivor, v_loser);

  update core.persons
     set primary_phone = v_phone, updated_at = now()
   where id = v_survivor;

  insert into core.events (workspace_id, person_id, source, type, payload)
  values (p_workspace, v_survivor, 'system', 'lid_person_reconciled',
          jsonb_build_object('survivor', v_survivor, 'loser', v_loser,
                             'lid', v_old_phone, 'phone', v_phone,
                             'external_conversation_id', p_external_conversation_id));

  return v_survivor;
end $function$;

revoke execute on function core.reconcile_lid_person(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function core.reconcile_lid_person(uuid, uuid, text, text) to service_role;
