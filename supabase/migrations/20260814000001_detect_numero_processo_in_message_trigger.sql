-- Correção (14/08/2026): contatos da Nina que mandam o número do processo
-- no WhatsApp mas não viram negócio no CRM porque a Nina parou de repassar
-- esse dado de forma estruturada (via body.processo.numero_cnj) desde a
-- noite de 11/08/2026 (investigado ao vivo: 0 negócios criados a partir daí,
-- apesar de pessoas mandando números válidos). Em vez de depender só do
-- aviso estruturado da Nina, o Next passa a ler a PRÓPRIA mensagem do
-- cliente: se aparecer um número de processo (formato CNJ) numa mensagem
-- inbound, cria o negócio sozinho — funciona mesmo se a Nina quebrar de
-- novo do lado dela.

create or replace function core.detect_numero_processo_in_message()
returns trigger
language plpgsql
security definer
set search_path to 'core', 'crm', 'public'
as $function$
declare
  v_numero text;
  v_deal_id uuid;
begin
  if new.source = 'nina'
     and new.type = 'whatsapp_in'
     and new.payload->>'direction' = 'inbound'
     and new.payload->>'content' ~ '\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}'
  then
    v_numero := (regexp_match(new.payload->>'content', '(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})'))[1];
    begin
      select crm.ingest_processo_lead(new.workspace_id, new.person_id, v_numero, null, 'nina_auto_detect')
        into v_deal_id;
    exception when others then
      -- nunca deve derrubar o registro da mensagem por causa disso
      insert into core.events (workspace_id, person_id, source, type, payload)
      values (new.workspace_id, new.person_id, 'system', 'auto_deal_detection_failed',
              jsonb_build_object('numero_cnj', v_numero, 'error', sqlerrm));
    end;
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_detect_numero_processo on core.events;
create trigger trg_detect_numero_processo
  after insert on core.events
  for each row
  execute function core.detect_numero_processo_in_message();
