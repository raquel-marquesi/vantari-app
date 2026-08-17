-- ═══════════════════════════════════════════════════════════════════
-- Fix (2026-08-17): a migration 20260623000007_scoring_vantari_etapa1
-- foi aplicada pela metade em produção — core.person_attributes,
-- mkt.score_rules/score_bands e as funções de recompute já existiam,
-- mas core.set_person_attributes + o trigger trg_attr_score nunca
-- chegaram a rodar. Resultado: /ingest tentava chamar
-- core.set_person_attributes e o PostgREST devolvia "function not
-- found" (207 pra Nina), e mkt.lead_scores nunca era populado.
-- Reaplica exatamente o trecho que faltou (idempotente).
-- ═══════════════════════════════════════════════════════════════════

-- porta única: upsert dos atributos (core puro, não conhece mkt)
create or replace function core.set_person_attributes(p_person uuid, p_attrs jsonb, p_source text default null)
returns void language plpgsql security definer set search_path = core, public as $$
declare
  v_ws uuid;
  k text;
  v text;
begin
  if p_attrs is null or jsonb_typeof(p_attrs) <> 'object' then return; end if;
  select workspace_id into v_ws from core.persons where id = p_person;
  if v_ws is null then return; end if;

  for k, v in select key, value from jsonb_each_text(p_attrs) loop
    insert into core.person_attributes (workspace_id, person_id, key, value, source, updated_at)
    values (v_ws, p_person, k, v, p_source, now())
    on conflict (person_id, key) do update
       set value = excluded.value, source = excluded.source, updated_at = now();
  end loop;
end $$;
grant execute on function core.set_person_attributes(uuid, jsonb, text) to authenticated, service_role;

-- mkt PENDURA a recompute em core.person_attributes (igual ao trg_event_score)
create or replace function mkt.on_attr_change()
returns trigger language plpgsql security definer set search_path = mkt, core, public as $$
begin
  perform mkt.recompute_score_inicial(coalesce(new.person_id, old.person_id));
  return null;
end $$;
drop trigger if exists trg_attr_score on core.person_attributes;
create trigger trg_attr_score after insert or update or delete on core.person_attributes
  for each row execute function mkt.on_attr_change();

-- força o PostgREST a recarregar o cache de funções na hora
notify pgrst, 'reload schema';
