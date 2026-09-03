-- ═══════════════════════════════════════════════════════════════════
-- Bug achado pela Catarina no teste do round-robin de captadoras
-- (03/09/2026): a distribuição em ImportLeadsModal avançava o rodízio a
-- cada LINHA importada (cada processo), não por PESSOA — um CPF com 4
-- processos diferentes acabou com 2 negócios da Alexandra e 2 da
-- Vanessa, quebrando o modelo de relacionamento pessoal que a
-- captadora precisa ter com o lead.
--
-- Fix: a decisão de captador passa a viver no banco, não mais num
-- contador local no JS do importador (que também reiniciava do zero a
-- cada sessão de importação, um problema relacionado). Essa função:
--   1. Se a pessoa já tem QUALQUER negócio com captador atribuído
--      (desse lote ou de uma importação/fluxo anterior), reaproveita
--      sempre o mais antigo — nunca deixa a mesma pessoa com dois
--      "donos" diferentes.
--   2. Se é gente nova (nenhum negócio dela tem captador ainda),
--      distribui pra quem tem menos pessoas na carteira agora. Isso
--      equivale a um rodízio, mas sem precisar guardar um contador à
--      parte — funciona igual entre lotes de importação diferentes ou
--      qualquer fluxo futuro que crie mais de um processo pra mesma
--      pessoa (completar CNJ depois, reimportação, etc.).
-- ═══════════════════════════════════════════════════════════════════

create or replace function crm.pick_captador_for_person(
  p_workspace uuid,
  p_person uuid,
  p_captadores text[] default array['Alexandra', 'Vanessa']
) returns text
language plpgsql
security definer
set search_path to 'crm', 'public'
as $$
declare
  v_captador text;
begin
  if auth.uid() is not null
     and p_workspace not in (select workspace_id from public.workspace_members where user_id = auth.uid())
  then
    raise exception 'sem acesso ao workspace %', p_workspace;
  end if;

  select captador into v_captador
  from crm.deals
  where person_id = p_person and captador is not null
  order by created_at asc
  limit 1;
  if v_captador is not null then
    return v_captador;
  end if;

  select c.nome into v_captador
  from unnest(p_captadores) with ordinality as c(nome, idx)
  order by (
    select count(distinct d.person_id) from crm.deals d
    where d.workspace_id = p_workspace and d.captador = c.nome
  ) asc, c.idx asc
  limit 1;

  return v_captador;
end $$;

grant execute on function crm.pick_captador_for_person(uuid, uuid, text[]) to authenticated, service_role;

notify pgrst, 'reload schema';
