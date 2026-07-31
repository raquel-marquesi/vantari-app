-- ════════════════════════════════════════════════════════════════
-- Corrige core.normalize_phone_br pra reconciliar o "9" do celular BR
-- ────────────────────────────────────────────────────────────────
-- Bug encontrado: a normalização antiga só removia código de país (+55) e o
-- "0" de operadora/DDD — não reconciliava números com/sem o dígito "9" que
-- todo celular brasileiro tem hoje (ex: "7998303670" vs "79998303670" são o
-- MESMO número, mas normalizavam pra strings diferentes). Resultado: se uma
-- mensagem/contato chegava com o "9" e outra sem, core.resolve_person criava
-- DUAS pessoas pro mesmo contato real, em vez de reconhecer como a mesma.
--
-- Regra nova: depois de tirar código de país e "0", se sobrar EXATAMENTE
-- 10 dígitos (DDD + 8 dígitos) e o 1º dígito do número (sem DDD) for 6-9
-- (padrão de celular), insere o "9" na frente → vira 11 dígitos. Fixo (DDD +
-- 8 dígitos começando 2-5) continua com 10 dígitos, sem alteração — não tem
-- esse problema, "9" não se aplica a fixo.
-- ════════════════════════════════════════════════════════════════

create or replace function core.normalize_phone_br(p text)
returns text
language plpgsql
immutable
as $$
declare d text := core.only_digits(p);
begin
  if d is null then return null; end if;
  if length(d) in (12, 13) and left(d, 2) = '55' then   -- código país +55
    d := substr(d, 3);
  end if;
  if length(d) in (11, 12) and left(d, 1) = '0' then     -- 0 de operadora/DDD
    d := substr(d, 2);
  end if;
  -- celular sem o "9" (10 dígitos, DDD + 8) → insere o "9" que falta.
  -- Fixo tem 8 dígitos começando 2-5, então só mexe se começar 6-9 (celular).
  if length(d) = 10 and substr(d, 3, 1) between '6' and '9' then
    d := substr(d, 1, 2) || '9' || substr(d, 3);
  end if;
  return d;
end;
$$;

-- ── backfill: reconcilia identificadores de telefone já gravados ──
-- Pra cada telefone cuja nova normalização difere da antiga, ou funde com
-- a pessoa que já tinha esse número no formato certo (core.merge_persons,
-- a mesma função usada pelo resolve_person em tempo real), ou só atualiza o
-- valor quando não há conflito. Sobrevivente = pessoa mais antiga (mais
-- histórico) quando há fusão.
do $$
declare
  r record;
  v_new text;
  v_conflict_person uuid;
  v_survivor uuid;
  v_loser uuid;
  v_merges int := 0;
  v_updates int := 0;
begin
  for r in
    select id, workspace_id, person_id, value
    from core.person_identifiers
    where kind = 'phone'
  loop
    v_new := core.normalize_phone_br(r.value);
    if v_new is null or v_new = r.value then
      continue;
    end if;

    select person_id into v_conflict_person
      from core.person_identifiers
     where workspace_id = r.workspace_id and kind = 'phone' and value = v_new
       and person_id <> r.person_id
     limit 1;

    if v_conflict_person is not null then
      -- sobrevivente = pessoa criada há mais tempo (mais chance de ter histórico)
      select case when a.created_at <= b.created_at then a.id else b.id end,
             case when a.created_at <= b.created_at then b.id else a.id end
        into v_survivor, v_loser
      from core.persons a, core.persons b
      where a.id = r.person_id and b.id = v_conflict_person;

      perform core.merge_persons(v_survivor, v_loser);
      v_merges := v_merges + 1;
    else
      update core.person_identifiers set value = v_new
       where id = r.id;
      v_updates := v_updates + 1;
    end if;
  end loop;

  raise notice 'telefones fundidos: %, telefones só reformatados: %', v_merges, v_updates;
end $$;

-- ── alinha core.persons.primary_phone com a nova normalização ──
update core.persons
   set primary_phone = core.normalize_phone_br(primary_phone)
 where primary_phone is not null
   and primary_phone <> core.normalize_phone_br(primary_phone);
