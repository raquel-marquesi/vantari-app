-- Backfill único (14/08/2026): cria negócio retroativo para todo contato da
-- Nina que já mandou um número de processo (formato CNJ) no WhatsApp mas
-- ficou sem negócio no CRM devido à falha investigada em
-- 20260814000001_detect_numero_processo_in_message_trigger.sql. Idempotente
-- via crm.ingest_processo_lead (reaproveita processo/negócio se já existir)
-- — seguro rodar mesmo pras pessoas que já tinham sido processadas
-- corretamente antes (28/07 a 10/08). Resultado real (produção, 14/08/2026):
-- 37 processos/negócios criados; as 96 pessoas que já tinham mandado um
-- número de processo válido ficaram todas com negócio no CRM.
do $$
declare
  r record;
  v_deal_id uuid;
  v_criados int := 0;
  v_falhas int := 0;
begin
  for r in (
    select distinct on (e.person_id) e.workspace_id, e.person_id,
           (regexp_match(e.payload->>'content', '(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})'))[1] as numero_cnj
    from core.events e
    where e.source = 'nina' and e.type = 'whatsapp_in'
      and e.payload->>'direction' = 'inbound'
      and e.payload->>'content' ~ '\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}'
    order by e.person_id, e.created_at asc
  )
  loop
    begin
      select crm.ingest_processo_lead(r.workspace_id, r.person_id, r.numero_cnj, null, 'nina_backfill')
        into v_deal_id;
      v_criados := v_criados + 1;
    exception when others then
      v_falhas := v_falhas + 1;
      raise notice 'falhou pessoa %: %', r.person_id, sqlerrm;
    end;
  end loop;
  raise notice 'processados: %, falhas: %', v_criados, v_falhas;
end $$;
