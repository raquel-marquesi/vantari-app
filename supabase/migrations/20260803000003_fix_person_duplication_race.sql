-- ════════════════════════════════════════════════════════════════
-- INCIDENTE: conversas duplicadas no /inbox
-- ────────────────────────────────────────────────────────────────
-- CAUSA RAIZ: core.resolve_person não tinha nenhuma trava de concorrência.
-- A Nina costuma disparar /ingest e /ingest-message quase ao mesmo tempo pro
-- mesmo evento (às vezes várias mensagens em rajada). Quando um contato NOVO
-- manda a primeira mensagem, chamadas concorrentes a resolve_person faziam
-- o SELECT "essa pessoa já existe?" antes de qualquer uma ter COMMITado o
-- INSERT — todas viam "não existe" e cada uma criava sua PRÓPRIA linha em
-- core.persons. Cada pessoa duplicada gera sua própria conversa em
-- core.ingest_message (que é keyed por person_id) — daí as conversas
-- duplicadas no /inbox.
-- Achado no banco: 30 números de telefone com pessoas duplicadas (maioria
-- criada com poucos milissegundos de diferença), 21 já com DUAS conversas
-- de fato (o sintoma visível relatado).
--
-- FIX (definitivo, mesmo padrão de core.ingest_message):
--  1) resolve_person agora trava (pg_advisory_xact_lock) por identificador
--     (cpf/telefone/email) ANTES de checar se a pessoa já existe — chamadas
--     concorrentes pro mesmo identificador passam a serializar: só a
--     primeira cria a pessoa, as demais encontram e reutilizam.
--  2) merge_persons tinha bugs latentes: repontava todas as FKs de
--     core.persons genericamente, mas várias tabelas têm unicidade por
--     pessoa (core.conversations, core.person_attributes, mkt.lead_scores,
--     crm.processo_advogados, mkt.campaign_sends) — se as duas pessoas já
--     tivessem linha própria nelas, o merge quebrava com "duplicate key".
--     Corrigido: cada uma agora é tratada à mão. core.conversations é o
--     caso especial de verdade — a conversa do "loser" é CONSOLIDADA na do
--     "survivor" (mensagens migram, timestamps mais recentes vencem) em vez
--     de só descartada, porque carrega histórico de verdade.
--  3) BACKFILL: funde as 30 duplicatas já existentes, escolhendo como
--     sobrevivente a pessoa mais antiga (created_at) de cada grupo.
-- ════════════════════════════════════════════════════════════════

-- ── 1) resolve_person: trava por identificador antes de resolver/criar ──
create or replace function core.resolve_person(
  p_workspace uuid, p_cpf text default null::text, p_phone text default null::text,
  p_email text default null::text, p_name text default null::text, p_source text default 'system'::text,
  p_utm_source text default null::text, p_utm_medium text default null::text,
  p_utm_campaign text default null::text, p_utm_content text default null::text, p_utm_term text default null::text
)
returns uuid
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

  -- trava por identificador, em ordem determinística (evita deadlock entre
  -- chamadas concorrentes com conjuntos de identificadores diferentes).
  -- Liberada automaticamente no commit/rollback da transação (xact lock).
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
end $function$;

-- ── 2) merge_persons: trata TODAS as tabelas com unicidade por pessoa ──
-- (inclui um segundo bug achado no meio do backfill: core.persons também
-- tem UNIQUE(workspace_id, cpf) — enriquecer o survivor com o cpf do loser
-- ANTES de apagar a linha do loser fazia as duas coexistirem com o mesmo
-- cpf por um instante dentro da mesma transação = violação. Corrigido
-- invertendo a ordem: apaga o loser primeiro, guarda os dados dele em
-- variável, só depois enriquece o survivor.)
create or replace function core.merge_persons(p_survivor uuid, p_loser uuid)
returns void
language plpgsql
security definer
set search_path to 'core', 'public'
as $function$
declare
  r record;
  v_survivor_conv uuid;
  v_loser_conv uuid;
  v_workspace uuid;
  v_survivor_cpf text;
  v_loser_cpf text;
  v_loser_full_name text;
  v_loser_email text;
  v_loser_phone text;
  v_cpf_taken_elsewhere boolean;
begin
  if p_survivor is null or p_loser is null or p_survivor = p_loser then
    return;
  end if;

  -- captura os dados do loser ANTES de apagar a linha dele
  select workspace_id, cpf, full_name, primary_email, primary_phone
    into v_workspace, v_loser_cpf, v_loser_full_name, v_loser_email, v_loser_phone
    from core.persons where id = p_loser;
  select cpf into v_survivor_cpf from core.persons where id = p_survivor;

  -- 0) conversas — caso especial de verdade: consolida histórico (mensagens
  --    migram pra conversa do survivor) em vez de só descartar a do loser.
  select id into v_survivor_conv from core.conversations where person_id = p_survivor;
  select id into v_loser_conv    from core.conversations where person_id = p_loser;
  if v_loser_conv is not null then
    if v_survivor_conv is null then
      update core.conversations set person_id = p_survivor where id = v_loser_conv;
    else
      update core.messages set conversation_id = v_survivor_conv, person_id = p_survivor
        where conversation_id = v_loser_conv;
      update core.conversations c set
        last_message_at     = greatest(c.last_message_at, l.last_message_at),
        last_message_body   = case when l.last_message_at > c.last_message_at then l.last_message_body   else c.last_message_body   end,
        last_message_sender = case when l.last_message_at > c.last_message_at then l.last_message_sender else c.last_message_sender end,
        external_conversation_id = coalesce(c.external_conversation_id, l.external_conversation_id),
        updated_at = now()
      from core.conversations l
      where c.id = v_survivor_conv and l.id = v_loser_conv;
      delete from core.conversations where id = v_loser_conv;
    end if;
  end if;

  -- 1) demais tabelas com unicidade por pessoa (chave simples ou composta):
  --    move a linha do loser só se não colidir com uma já existente do
  --    survivor; o que sobrar (colidiu) é descartado — não é histórico de
  --    conversa, então descartar é seguro.
  update core.person_identifiers i set person_id = p_survivor
   where i.person_id = p_loser and not exists (
     select 1 from core.person_identifiers j
     where j.workspace_id = i.workspace_id and j.kind = i.kind and j.value = i.value and j.person_id = p_survivor);
  delete from core.person_identifiers where person_id = p_loser;

  update core.consents c set person_id = p_survivor
   where c.person_id = p_loser and not exists (
     select 1 from core.consents d
     where d.workspace_id = c.workspace_id and d.person_id = p_survivor and d.channel = c.channel);
  delete from core.consents where person_id = p_loser;

  update core.person_attributes a set person_id = p_survivor
   where a.person_id = p_loser and not exists (
     select 1 from core.person_attributes b where b.person_id = p_survivor and b.key = a.key);
  delete from core.person_attributes where person_id = p_loser;

  update crm.processo_advogados pa set person_id = p_survivor
   where pa.person_id = p_loser and not exists (
     select 1 from crm.processo_advogados pb where pb.person_id = p_survivor and pb.processo_id = pa.processo_id);
  delete from crm.processo_advogados where person_id = p_loser;

  update mkt.campaign_sends cs set person_id = p_survivor
   where cs.person_id = p_loser and not exists (
     select 1 from mkt.campaign_sends cd where cd.person_id = p_survivor and cd.campaign_id = cs.campaign_id);
  delete from mkt.campaign_sends where person_id = p_loser;

  -- mkt.lead_scores: PK simples (person_id) — se o survivor já tiver score
  -- próprio, mantém o dele e descarta o do loser; senão, herda o do loser.
  if not exists (select 1 from mkt.lead_scores where person_id = p_survivor) then
    update mkt.lead_scores set person_id = p_survivor where person_id = p_loser;
  else
    delete from mkt.lead_scores where person_id = p_loser;
  end if;

  -- 2) repontar as demais FKs → core.persons genericamente (sem unicidade
  --    por pessoa, update direto é seguro)
  for r in
    select n.nspname as sch, c.relname as tbl, a.attname as col
    from pg_constraint con
    join pg_class      c  on c.oid = con.conrelid
    join pg_namespace  n  on n.oid = c.relnamespace
    join pg_attribute  a  on a.attrelid = con.conrelid and a.attnum = any (con.conkey)
    join pg_class      fc on fc.oid = con.confrelid
    join pg_namespace  fn on fn.oid = fc.relnamespace
    where con.contype = 'f'
      and fn.nspname = 'core' and fc.relname = 'persons'
      and not (n.nspname = 'core' and c.relname in ('person_identifiers', 'consents', 'conversations', 'person_attributes'))
      and not (n.nspname = 'crm' and c.relname = 'processo_advogados')
      and not (n.nspname = 'mkt' and c.relname in ('campaign_sends', 'lead_scores'))
  loop
    execute format('update %I.%I set %I = %L where %I = %L',
                   r.sch, r.tbl, r.col, p_survivor, r.col, p_loser);
  end loop;

  -- checa se o cpf do loser já pertence a uma TERCEIRA pessoa (caso raro,
  -- mas real — visto no backfill de 03/ago) — se sim, não sobrescreve.
  v_cpf_taken_elsewhere := v_survivor_cpf is null and v_loser_cpf is not null and exists (
    select 1 from core.persons where workspace_id = v_workspace and cpf = v_loser_cpf and id <> p_survivor and id <> p_loser
  );
  if v_cpf_taken_elsewhere then
    insert into core.events (workspace_id, person_id, source, type, payload)
    values (v_workspace, p_survivor, 'system', 'merge_cpf_conflict_skipped',
            jsonb_build_object('loser', p_loser, 'cpf_ignorado', v_loser_cpf));
  end if;

  -- apaga o loser ANTES de gravar o cpf dele no survivor — as duas linhas
  -- nunca coexistem com o mesmo cpf sob unique(workspace_id, cpf).
  delete from core.persons where id = p_loser;

  -- 3) enriquecer survivor com campos vazios vindos do loser
  update core.persons s set
     cpf           = case when v_cpf_taken_elsewhere then s.cpf else coalesce(s.cpf, v_loser_cpf) end,
     full_name     = coalesce(s.full_name, v_loser_full_name),
     primary_email = coalesce(s.primary_email, v_loser_email),
     primary_phone = coalesce(s.primary_phone, v_loser_phone),
     status        = case when (not v_cpf_taken_elsewhere) and coalesce(s.cpf, v_loser_cpf) is not null
                          then 'identificado' else s.status end,
     updated_at    = now()
  where s.id = p_survivor;

  -- 4) registrar
  insert into core.events (workspace_id, person_id, source, type, payload)
  values (v_workspace, p_survivor, 'system', 'persons_merged',
          jsonb_build_object('survivor', p_survivor, 'loser', p_loser));
end $function$;

-- ── 3) backfill: funde as duplicatas já existentes (30 números de telefone) ──
do $$
declare
  g record;
  v_survivor uuid;
  v_loser uuid;
  v_ids uuid[];
  v_fundidas int := 0;
  v_grupos int := 0;
begin
  for g in
    select primary_phone, array_agg(id order by created_at) as ids
    from core.persons
    where workspace_id = '53092199-7b75-4342-a897-f589d6f34922' and primary_phone is not null
    group by primary_phone
    having count(*) > 1
  loop
    v_grupos := v_grupos + 1;
    v_ids := g.ids;
    v_survivor := v_ids[1];
    for i in 2 .. array_length(v_ids, 1) loop
      v_loser := v_ids[i];
      perform core.merge_persons(v_survivor, v_loser);
      v_fundidas := v_fundidas + 1;
    end loop;
  end loop;
  raise notice 'grupos de duplicatas: %, pessoas fundidas: %', v_grupos, v_fundidas;
end $$;
