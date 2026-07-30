-- Excluir lead (/leads) e excluir negócio (/crm/:dealId) — pedido da
-- Catarina, 30/07/2026.
--
-- core.persons.id → crm.deals.person_id é ON DELETE CASCADE (junto com
-- activities, conversations, messages, events, person_identifiers etc.) —
-- ou seja, excluir uma pessoa já cascateia e apaga o histórico dela toda.
-- Isso é intencional (não faz sentido manter negócios órfãos sem titular),
-- mas por segurança bloqueamos a exclusão se a pessoa já tiver algo
-- financeiro real (fin.antecipacoes/recebimentos são ON DELETE RESTRICT,
-- então isso já travaria mesmo sem essa checagem — só damos uma mensagem
-- amigável em vez do erro cru de FK).
--
-- crm.deals não tem cascade nenhum apontando pra ele exceto crm.activities.
-- fin.antecipacoes tem uma coluna deal_id mas SEM constraint de FK formal —
-- então checamos manualmente antes de excluir, pra não deixar uma
-- antecipação de verdade órfã apontando pra um negócio que não existe mais.

create or replace function core.delete_person(p_person uuid)
returns void
language plpgsql
security definer
set search_path to 'core', 'fin', 'public'
as $function$
declare
  v_workspace uuid;
  v_antecipacoes int;
  v_recebimentos int;
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

  select count(*) into v_antecipacoes from fin.antecipacoes where person_id = p_person;
  if v_antecipacoes > 0 then
    raise exception 'não é possível excluir: essa pessoa já tem % antecipação(ões) financeira(s) registrada(s)', v_antecipacoes;
  end if;

  select count(*) into v_recebimentos from fin.recebimentos where person_id = p_person;
  if v_recebimentos > 0 then
    raise exception 'não é possível excluir: essa pessoa já tem % recebimento(s) financeiro(s) registrado(s)', v_recebimentos;
  end if;

  delete from core.persons where id = p_person;
end $function$;

grant execute on function core.delete_person(uuid) to authenticated;

create or replace function crm.delete_deal(p_deal uuid)
returns void
language plpgsql
security definer
set search_path to 'crm', 'fin', 'public'
as $function$
declare
  v_workspace uuid;
  v_antecipacoes int;
begin
  select workspace_id into v_workspace from crm.deals where id = p_deal;
  if v_workspace is null then
    raise exception 'negócio não encontrado: %', p_deal;
  end if;

  if auth.uid() is not null
     and v_workspace not in (select workspace_id from public.workspace_members where user_id = auth.uid())
  then
    raise exception 'sem acesso ao workspace %', v_workspace;
  end if;

  select count(*) into v_antecipacoes from fin.antecipacoes where deal_id = p_deal;
  if v_antecipacoes > 0 then
    raise exception 'não é possível excluir: este negócio já tem % antecipação(ões) financeira(s) registrada(s)', v_antecipacoes;
  end if;

  delete from crm.deals where id = p_deal;
end $function$;

grant execute on function crm.delete_deal(uuid) to authenticated;
