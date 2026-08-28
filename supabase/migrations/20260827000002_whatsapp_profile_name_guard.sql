-- ═══════════════════════════════════════════════════════════════════
-- Fix (2026-08-27) — Prioridade 5 do plano de unificação de leads.
--
-- Problema (achado investigando o caso do Tiago Fagner Pinheiro,
-- 26-27/08): core.resolve_person só PREENCHE full_name quando ele
-- ainda está vazio (coalesce(full_name, p_name)) — nunca sobrescreve.
-- Isso não é o bug que se suspeitava ("sobrescreve nome bom com nome
-- de perfil"); é o oposto: o PRIMEIRO nome que chega fica travado pra
-- sempre, mesmo que seja o nome de perfil do WhatsApp (captado antes
-- de qualquer conversa) e mesmo que a pessoa diga o nome certo duas
-- mensagens depois — porque nada depois disso nunca mais atualiza o
-- campo. Prova: o registro do Tiago tem full_name = nome de perfil em
-- grego, mesmo a Nina já tendo chamado ele de "Tiago" na mesma
-- conversa.
--
-- Correção: nunca deixar um nome que parece nome-de-perfil (emoji,
-- alfabeto não-latino) virar o full_name definitivo no momento da
-- CRIAÇÃO da pessoa. Se vier um nome suspeito, grava full_name = null
-- em vez dele — assim o campo continua "vazio" e o coalesce de sempre
-- (já existente, sem mudança) preenche naturalmente assim que chegar
-- um nome que passe no filtro. Não mexe no branch de UPDATE (já é
-- seguro por natureza).
--
-- Critério deliberadamente conservador: só sinais INEQUÍVOCOS (fora do
-- alfabeto latino estendido — pega grego, cirílico, CJK, emoji). NÃO
-- usa "mais de N palavras" como rejeição automática (nome real
-- brasileiro às vezes tem 4-5 palavras) — isso fica só como sinal pra
-- revisão manual, não pra descarte automático.
-- ═══════════════════════════════════════════════════════════════════

create or replace function core.looks_like_whatsapp_profile_name(p_name text)
returns boolean
language sql
immutable
as $$
  select p_name is not null
     and trim(p_name) <> ''
     -- qualquer caractere fora do latin estendido (U+0020 a U+024F) --
     -- cobre grego, cirilico, CJK, emoji e simbolos em geral.
     and p_name ~ '[^ -ɏ]'
$$;

grant execute on function core.looks_like_whatsapp_profile_name(text) to authenticated, service_role;

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
  v_name  text := case when core.looks_like_whatsapp_profile_name(p_name) then null else p_name end;
  v_by_cpf uuid; v_by_phone uuid; v_by_email uuid;
  v_person uuid;
  v_old_email text;
  v_old_phone text;
  v_lock_keys text[] := array[]::text[];
  v_key text;
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

  if v_cpf is not null then v_lock_keys := array_append(v_lock_keys, 'cpf:' || v_cpf); end if;
  if v_phone is not null then v_lock_keys := array_append(v_lock_keys, 'phone:' || v_phone); end if;
  if v_email is not null then v_lock_keys := array_append(v_lock_keys, 'email:' || v_email); end if;

  if coalesce(array_length(v_lock_keys, 1), 0) > 0 then
    select array_agg(k order by k) into v_lock_keys from unnest(v_lock_keys) as k;
    foreach v_key in array v_lock_keys loop
      perform pg_advisory_xact_lock(hashtextextended('core_person:' || p_workspace::text || ':' || v_key, 0));
    end loop;
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
                              primary_email, primary_phone,
                              utm_source, utm_medium, utm_campaign, utm_content, utm_term,
                              first_source)
    values (p_workspace, v_cpf,
            case when v_cpf is not null then 'identificado' else 'pendente' end,
            v_name, v_email, v_phone,
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
       full_name     = coalesce(full_name, v_name),
       primary_email = coalesce(v_email, primary_email),
       primary_phone = coalesce(v_phone, primary_phone),
       utm_source    = coalesce(utm_source, p_utm_source),
       utm_medium    = coalesce(utm_medium, p_utm_medium),
       utm_campaign  = coalesce(utm_campaign, p_utm_campaign),
       utm_content   = coalesce(utm_content, p_utm_content),
       utm_term      = coalesce(utm_term, p_utm_term),
       first_source  = coalesce(first_source, p_source),
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
end $$;

notify pgrst, 'reload schema';
