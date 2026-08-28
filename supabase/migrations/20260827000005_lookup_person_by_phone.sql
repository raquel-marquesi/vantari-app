-- ═══════════════════════════════════════════════════════════════════
-- core.lookup_person_by_phone — Prioridade 7a do plano de unificação
-- de leads: dá pra Nina consultar o que já sabemos sobre um contato
-- ANTES de fazer as perguntas de qualificação de novo.
--
-- Só leitura — NUNCA cria pessoa (diferente de core.resolve_person,
-- usado em /ingest e /ingest-message, que são portas de ENTRADA). Se
-- não achar ninguém com esse telefone, devolve found:false e a Nina
-- segue o fluxo normal dela, perguntando tudo do zero.
--
-- Usada pela Edge Function nova /lookup-person.
-- ═══════════════════════════════════════════════════════════════════

create or replace function core.lookup_person_by_phone(p_workspace uuid, p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = core, crm, public
as $$
declare
  v_phone text := core.normalize_phone_br(p_phone);
  v_person core.persons;
  v_attrs  jsonb;
  v_deals  jsonb;
begin
  if v_phone is null then
    return jsonb_build_object('found', false);
  end if;

  select p.* into v_person
    from core.persons p
    join core.person_identifiers i on i.person_id = p.id
    where i.workspace_id = p_workspace and i.kind = 'phone' and i.value = v_phone
    limit 1;

  if v_person.id is null then
    return jsonb_build_object('found', false);
  end if;

  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into v_attrs
    from core.person_attributes where person_id = v_person.id;

  select coalesce(jsonb_agg(jsonb_build_object(
      'numero_cnj', pr.numero_cnj,
      'credit_type', d.credit_type,
      'stage', s.name,
      'status', d.status,
      'honorarios_pct', d.honorarios_pct
    )), '[]'::jsonb) into v_deals
    from crm.deals d
    join crm.processos pr on pr.id = d.processo_id
    join crm.stages s on s.id = d.stage_id
    where d.person_id = v_person.id;

  return jsonb_build_object(
    'found', true,
    'person_id', v_person.id,
    'cpf', v_person.cpf,
    'full_name', v_person.full_name,
    'primary_email', v_person.primary_email,
    'attributes', v_attrs,
    'deals', v_deals
  );
end $$;

grant execute on function core.lookup_person_by_phone(uuid, text) to service_role;

notify pgrst, 'reload schema';
