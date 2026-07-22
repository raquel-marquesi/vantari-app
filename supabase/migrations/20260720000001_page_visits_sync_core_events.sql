-- ════════════════════════════════════════════════════════════════
-- FIX — page_visits também sincroniza com core.events
-- ────────────────────────────────────────────────────────────────
-- Problema: o tracker.js/edge function `track` grava visitas em
-- public.page_visits (legado), cujo trigger só cria public.lead_events.
-- A tela /segments (Segmentações) filtra "Visitou página" lendo de
-- core.events (type = 'page_visit') — que nunca recebia nada. Resultado:
-- o filtro sempre existe na UI mas nunca casa ninguém (lista de páginas
-- fica vazia e nenhuma pessoa é encontrada).
--
-- Correção: mesmo padrão já usado em 20260717000001 (form_submissions) —
-- ADICIONA uma chamada a core.resolve_person() dentro do trigger existente
-- de page_visits, e grava um core.events espelho. Não remove nem altera
-- nada do comportamento atual em lead_events/tracked_pages/score.
--
-- Só sincroniza visitas de leads identificados (lead_id setado pelo
-- tracker via email) com cpf ou email conhecidos — visitas anônimas
-- continuam sem side-effect no core, como já é o caso hoje na tela de
-- Segmentações (query filtra person_id is not null).
-- ════════════════════════════════════════════════════════════════

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

  -- NOVO: espelha em core.events para a Segmentação dinâmica ("Visitou página")
  begin
    select * into v_lead from leads where id = new.lead_id;
    if v_lead.id is not null and (v_lead.cpf is not null or v_lead.email is not null) then
      select core.resolve_person(
        p_workspace => coalesce(v_lead.workspace_id, '53092199-7b75-4342-a897-f589d6f34922'::uuid),
        p_cpf       => v_lead.cpf,
        p_phone     => v_lead.phone,
        p_email     => v_lead.email,
        p_name      => v_lead.name,
        p_source    => 'tracking'
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
