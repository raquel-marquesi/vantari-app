-- ═══════════════════════════════════════════════════════════════════
-- Backfill em lote (2026-08-17): recupera negócio de todo contato da
-- Nina que mandou o número do processo (pontuado ou "corrido", 20
-- dígitos) mas ficou sem negócio no CRM porque o detector antigo só
-- reconhecia o formato pontuado. Usa core.normalize_numero_cnj (fix
-- desta mesma sessão). Idempotente via crm.ingest_processo_lead.
--
-- Segurança: pula (não cria) qualquer pessoa cuja Nina tenha respondido
-- com uma mensagem de rejeição de triagem nos 10 minutos seguintes ao
-- número enviado — mesmo critério do trigger de retração, pra não
-- repetir o erro do backfill de 14/08 (que criou negócio pro Mario com
-- um número que a própria Nina tinha rejeitado como não-trabalhista).
-- Esses casos ficam registrados em core.events pra revisão manual.
--
-- Resultado real (produção, 17/08/2026): 23 negócios criados, 3
-- pulados por rejeição da Nina. Achado à parte (revisão manual pedida
-- à Catarina): SELMA corrigiu um número incompleto e trocou sem querer
-- o segmento "5" (trabalhista) por "8" (não-trabalhista) na tentativa
-- seguinte — a Nina nunca validou essa segunda tentativa, então o
-- filtro de rejeição não pegou (não foi uma rejeição explícita da
-- Nina, foi um erro de digitação da própria cliente). Deal criado com
-- o número '0000008-07.2020.8.05.0003' pode estar errado; não foi
-- corrigido automaticamente para não adivinhar o número certo.
-- ═══════════════════════════════════════════════════════════════════
do $$
declare
  r record;
  v_deal_id uuid;
  v_rejeitado boolean;
  v_criados int := 0;
  v_pulados_ja_tinha int := 0;
  v_pulados_rejeitados int := 0;
  v_falhas int := 0;
begin
  for r in (
    select distinct on (e.person_id) e.workspace_id, e.person_id, e.occurred_at,
           core.normalize_numero_cnj(e.payload->>'content') as numero_cnj
    from core.events e
    where e.source = 'nina' and e.type = 'whatsapp_in'
      and e.payload->>'direction' = 'inbound'
      and core.normalize_numero_cnj(e.payload->>'content') is not null
    order by e.person_id, e.occurred_at asc
  )
  loop
    if exists (select 1 from crm.deals d where d.person_id = r.person_id) then
      v_pulados_ja_tinha := v_pulados_ja_tinha + 1;
      continue;
    end if;

    select exists (
      select 1 from core.events e2
      where e2.person_id = r.person_id
        and e2.source = 'nina' and e2.type = 'whatsapp_in'
        and e2.payload->>'direction' = 'outbound'
        and e2.occurred_at > r.occurred_at
        and e2.occurred_at < r.occurred_at + interval '10 minutes'
        and (
          e2.payload->>'content' ilike '%não é trabalhista%'
          or e2.payload->>'content' ilike '%não são%trabalh%'
          or e2.payload->>'content' ilike '%não é na área trabalhista%'
          or e2.payload->>'content' ilike '%contra o INSS%'
          or e2.payload->>'content' ilike '%processo cível%'
          or e2.payload->>'content' ilike '%Recuperação Judicial%'
          or e2.payload->>'content' ilike '%seguro-desemprego%'
          or e2.payload->>'content' ilike '%outra área da justiça%'
          or e2.payload->>'content' ilike '%não conseguimos seguir%'
          or e2.payload->>'content' ilike '%não conseguimos te ajudar%'
          or e2.payload->>'content' ilike '%não conseguimos antecipar%'
        )
    ) into v_rejeitado;

    if v_rejeitado then
      v_pulados_rejeitados := v_pulados_rejeitados + 1;
      insert into core.events (workspace_id, person_id, source, type, payload)
      values (r.workspace_id, r.person_id, 'system', 'backfill_skipped_rejected',
              jsonb_build_object('numero_cnj', r.numero_cnj, 'motivo', 'nina_rejeitou_essa_triagem'));
      continue;
    end if;

    begin
      select crm.ingest_processo_lead(r.workspace_id, r.person_id, r.numero_cnj, null, 'nina_backfill')
        into v_deal_id;
      v_criados := v_criados + 1;
    exception when others then
      v_falhas := v_falhas + 1;
      raise notice 'falhou pessoa %: %', r.person_id, sqlerrm;
    end;
  end loop;
  raise notice 'criados: %, já tinham negócio: %, pulados (rejeitados pela Nina): %, falhas: %',
    v_criados, v_pulados_ja_tinha, v_pulados_rejeitados, v_falhas;
end $$;
