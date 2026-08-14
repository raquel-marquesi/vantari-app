-- Correção da correção (14/08/2026, pedido da Catarina): o gatilho anterior
-- (detect_numero_processo_in_message) cria o negócio assim que o CLIENTE
-- manda um número de processo — mas a Nina faz uma triagem própria logo
-- depois (lê o segmento da Justiça no número do CNJ) e pode concluir que
-- NÃO é trabalhista, ou que é INSS/cível/seguro-desemprego/reclamada em
-- recuperação judicial etc. Regra de negócio: processo inválido ou não
-- trabalhista NÃO deve virar negociação no CRM.
--
-- Como a rejeição da Nina chega DEPOIS da mensagem com o número (a criação
-- já aconteceu), este gatilho complementar DESFAZ o negócio auto-criado
-- (só os criados por nina_auto_detect/nina_backfill, nunca os manuais nem
-- os que vieram pelo caminho estruturado antigo) assim que a mensagem de
-- rejeição da Nina chega — e só se ninguém ainda mexeu no negócio
-- (status ainda 'open').
--
-- Aplicado em produção 14/08/2026: removeu retroativamente 3 negócios do
-- backfill anterior (20260814000002) que eram de processos que a própria
-- Nina já tinha identificado como não trabalhistas.

create or replace function core.retract_deal_on_nina_rejection()
returns trigger
language plpgsql
security definer
set search_path to 'core', 'crm', 'public'
as $function$
declare
  v_deal record;
begin
  if new.source = 'nina' and new.type = 'whatsapp_in' and new.payload->>'direction' = 'outbound'
     and (
       new.payload->>'content' ilike '%não é trabalhista%'
       or new.payload->>'content' ilike '%não são%trabalh%'
       or new.payload->>'content' ilike '%não é na área trabalhista%'
       or new.payload->>'content' ilike '%contra o INSS%'
       or new.payload->>'content' ilike '%processo cível%'
       or new.payload->>'content' ilike '%Recuperação Judicial%'
       or new.payload->>'content' ilike '%seguro-desemprego%'
       or new.payload->>'content' ilike '%outra área da justiça%'
       or new.payload->>'content' ilike '%não conseguimos seguir%'
       or new.payload->>'content' ilike '%não conseguimos te ajudar%'
       or new.payload->>'content' ilike '%não conseguimos antecipar%'
     )
  then
    for v_deal in
      select d.id, d.processo_id from crm.deals d
      where d.person_id = new.person_id
        and d.source in ('nina_auto_detect', 'nina_backfill')
        and d.status = 'open'
    loop
      delete from crm.deals where id = v_deal.id;
      delete from crm.processos p
        where p.id = v_deal.processo_id
          and not exists (select 1 from crm.deals d2 where d2.processo_id = p.id);
      insert into core.events (workspace_id, person_id, source, type, payload)
      values (new.workspace_id, new.person_id, 'system', 'deal_auto_retracted',
              jsonb_build_object('deal_id', v_deal.id, 'motivo', 'nina_rejeitou_triagem',
                                  'mensagem_rejeicao', new.payload->>'content'));
    end loop;
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_retract_deal_on_nina_rejection on core.events;
create trigger trg_retract_deal_on_nina_rejection
  after insert on core.events
  for each row
  execute function core.retract_deal_on_nina_rejection();
