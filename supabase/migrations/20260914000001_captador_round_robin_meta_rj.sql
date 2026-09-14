-- ═══════════════════════════════════════════════════════════════════
-- Automação pedida pela Catarina (14/09/2026): todo lead do formulário
-- RECJUD (Meta Lead Ads, form_id 1725125341868971) que virar negócio na
-- pipeline "Recuperação Judicial — Varejo" já entra com um captador
-- atribuído, alternando Alexandra/Vanessa 50/50 — sem contador em
-- memória (reseta a cada execução da function), o estado vive no banco.
--
-- Reaproveita exatamente a estrutura que já existe pra captador (não
-- cria coluna nova): crm.deals.captador (text) + crm.deals.captador_user_id
-- (uuid → auth.users, migration 20260904000001) + public.captadores
-- (nome → user_id). Mesmo padrão de crm.pick_captador_for_person
-- (20260903000003), mas com uma regra diferente de propósito: aqui é
-- alternância simples pelo ÚLTIMO captador atribuído num negócio da
-- MESMA pipeline + MESMA source (não balanceamento por carga total),
-- porque a Catarina pediu explicitamente 50/50 "na ordem em que
-- chegam", não por quem tem menos negócios.
--
-- Só atribui se o negócio ainda não tiver captador — protege contra
-- sobrescrever uma atribuição manual/anterior caso a function chamadora
-- reaproveite um negócio já existente (create_draft_deal/ingest_processo_lead
-- são idempotentes e podem devolver um deal_id que já tinha dono).
-- ═══════════════════════════════════════════════════════════════════

create or replace function crm.assign_next_captador_round_robin(
  p_workspace uuid,
  p_deal_id uuid,
  p_pipeline_name text,
  p_source text default 'meta',
  p_captadores text[] default array['Alexandra', 'Vanessa']
)
returns text
language plpgsql
security definer
set search_path to 'crm', 'public'
as $$
declare
  v_pipeline_id uuid;
  v_last text;
  v_next text;
  v_user_id uuid;
begin
  if auth.uid() is not null
     and p_workspace not in (select workspace_id from public.workspace_members where user_id = auth.uid())
  then
    raise exception 'sem acesso ao workspace %', p_workspace;
  end if;

  select id into v_pipeline_id from crm.pipelines
    where workspace_id = p_workspace and name = p_pipeline_name limit 1;
  if v_pipeline_id is null then
    raise exception 'pipeline "%" não encontrada no workspace %', p_pipeline_name, p_workspace;
  end if;

  -- trava por pipeline+source pra duas execuções concorrentes (cron +
  -- clique manual, por exemplo) não lerem o mesmo "último captador" e
  -- escolherem o mesmo nome pro próximo negócio.
  perform pg_advisory_xact_lock(hashtextextended(
    'crm_captador_rr:' || p_workspace::text || ':' || v_pipeline_id::text || ':' || p_source, 0));

  select captador into v_last
  from crm.deals
  where workspace_id = p_workspace and pipeline_id = v_pipeline_id and source = p_source
    and captador is not null and id <> p_deal_id
  order by created_at desc
  limit 1;

  v_next := case
    when v_last is null then p_captadores[1]
    else coalesce((select c from unnest(p_captadores) as c where c <> v_last limit 1), p_captadores[1])
  end;

  select user_id into v_user_id from public.captadores
    where workspace_id = p_workspace and name = v_next limit 1;

  update crm.deals set captador = v_next, captador_user_id = v_user_id
    where id = p_deal_id and workspace_id = p_workspace and captador is null;

  if not found then
    -- negócio reaproveitado (já tinha captador de antes) — não sobrescreve,
    -- só informa qual já está atribuído.
    select captador into v_next from crm.deals where id = p_deal_id;
  end if;

  return v_next;
end $$;

grant execute on function crm.assign_next_captador_round_robin(uuid, uuid, text, text, text[]) to authenticated, service_role;

notify pgrst, 'reload schema';
