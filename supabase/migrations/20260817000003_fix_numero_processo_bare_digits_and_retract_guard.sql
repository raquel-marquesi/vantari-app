-- ═══════════════════════════════════════════════════════════════════
-- Fix (2026-08-17): dois bugs achados investigando report de contatos
-- que foram pra /leads mas não viraram negócio no CRM.
--
-- 1) core.detect_numero_processo_in_message só reconhecia o número do
--    processo pontuado ("0001634-07.2025.5.05.0611"). Muita gente manda
--    só os 20 dígitos corridos ("00111575120245030185") — a Nina
--    reconhece e segue a triagem normalmente, mas o robô do nosso lado
--    nunca criava o negócio. Casos reais: Thiago (11/08), Liliane
--    Nascimento (16/08). Corrigido com core.normalize_numero_cnj, que
--    reconhece os dois formatos e sempre devolve o formato padrão.
--
-- 2) core.retract_deal_on_nina_rejection cancelava um negócio válido
--    se, DEPOIS de já confirmado (com honorários coletados), o cliente
--    perguntasse qualquer coisa que soasse como recusa (ex: perguntar
--    sobre seguro-desemprego numa conversa já aprovada) — caso real:
--    Marcelo/"Lobo" (17/08, mesmo dia). Corrigido: só cancela se o
--    negócio ainda não tiver honorarios_pct (triagem ainda em aberto).
-- ═══════════════════════════════════════════════════════════════════

create or replace function core.normalize_numero_cnj(p_content text)
returns text
language plpgsql
immutable
as $$
declare
  v_punct text;
  v_bare  text;
begin
  if p_content is null then return null; end if;

  -- formato padrão já pontuado
  v_punct := (regexp_match(p_content, '(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})'))[1];
  if v_punct is not null then return v_punct; end if;

  -- formato "corrido" (20 dígitos seguidos, sem pontuação) — comum no
  -- WhatsApp. \m/\M = fronteira de palavra, evita casar dentro de um
  -- número maior (ex: um telefone concatenado com outra coisa).
  v_bare := (regexp_match(p_content, '\m(\d{20})\M'))[1];
  if v_bare is not null then
    return substring(v_bare from 1 for 7) || '-' || substring(v_bare from 8 for 2) || '.'
        || substring(v_bare from 10 for 4) || '.' || substring(v_bare from 14 for 1) || '.'
        || substring(v_bare from 15 for 2) || '.' || substring(v_bare from 17 for 4);
  end if;

  return null;
end $$;

create or replace function core.detect_numero_processo_in_message()
returns trigger
language plpgsql
security definer
set search_path = core, crm, public
as $$
declare
  v_numero text;
  v_deal_id uuid;
begin
  if new.source = 'nina'
     and new.type = 'whatsapp_in'
     and new.payload->>'direction' = 'inbound'
  then
    v_numero := core.normalize_numero_cnj(new.payload->>'content');
    if v_numero is not null then
      begin
        select crm.ingest_processo_lead(new.workspace_id, new.person_id, v_numero, null, 'nina_auto_detect')
          into v_deal_id;
      exception when others then
        insert into core.events (workspace_id, person_id, source, type, payload)
        values (new.workspace_id, new.person_id, 'system', 'auto_deal_detection_failed',
                jsonb_build_object('numero_cnj', v_numero, 'error', sqlerrm));
      end;
    end if;
  end if;
  return new;
end;
$$;

create or replace function core.retract_deal_on_nina_rejection()
returns trigger
language plpgsql
security definer
set search_path = core, crm, public
as $$
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
        and d.honorarios_pct is null -- só cancela se a triagem ainda estava em aberto (sem honorários confirmados)
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
$$;

notify pgrst, 'reload schema';

-- ───────────────────────────────────────────────────────────────────
-- Backfill pontual: Thiago e Liliane Nascimento reportados pelo
-- usuário como "foram pra /leads mas não entraram no CRM" — ambos
-- mandaram o número sem pontuação, confirmado o motivo acima.
-- ───────────────────────────────────────────────────────────────────
select crm.ingest_processo_lead(
  '53092199-7b75-4342-a897-f589d6f34922'::uuid,
  '744d818d-cd26-403d-978e-d7405429d69f'::uuid,
  '0011157-51.2024.5.03.0185', 30, 'nina_backfill'
);

select crm.ingest_processo_lead(
  '53092199-7b75-4342-a897-f589d6f34922'::uuid,
  '854867f3-b433-4dd2-9c02-0a26ab58a25e'::uuid,
  '0100573-09.2024.5.01.0501', 30, 'nina_backfill'
);
