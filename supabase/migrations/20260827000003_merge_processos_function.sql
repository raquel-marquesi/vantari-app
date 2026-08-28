-- ═══════════════════════════════════════════════════════════════════
-- crm.merge_processos — Prioridade 2 do plano de unificação de leads.
--
-- Ferramenta genérica pra mesclar dois crm.processos que representam
-- o mesmo processo real (tipicamente: mesmo numero_cnj em formatos
-- diferentes, causa raiz corrigida na migration anterior). Mesmo
-- espírito de core.merge_persons: repontua tudo que referencia o
-- "loser", enriquece o "survivor" com o que faltar, apaga o loser.
--
-- Cuidado extra que core.merge_persons não precisa: dois crm.deals
-- podem existir, um em cada processo, pro MESMO (person_id,
-- credit_type) — repontuar sem mais nada recriaria a duplicata dentro
-- do processo sobrevivente. Por isso, pra cada par de negócios que
-- colide, este função funde os dois negócios num só (em vez de só
-- repontuar), preenchendo campos vazios do lado que sobra com o que
-- tiver no lado que sai, migrando as atividades, e então apagando o
-- perdedor. Por padrão, "sobrevive" o negócio do processo p_survivor;
-- passe p_survivor_deal_id explicitamente pra escolher o outro lado
-- quando ele for o mais completo (caso real: Tiago Fagner Pinheiro,
-- onde o negócio mais informativo estava no processo com numero_cnj
-- em formato "corrido", não no formato pontuado).
--
-- Só cria a CAPACIDADE de mesclar — nenhuma chamada real está incluída
-- nesta migration. As mesclagens específicas (os 7 pares já
-- levantados) vão num arquivo à parte, fora da cadeia de migrations
-- aplicadas automaticamente, aguardando aprovação explícita antes de
-- rodar em produção.
-- ═══════════════════════════════════════════════════════════════════

create or replace function crm.merge_processos(
  p_survivor uuid,
  p_loser uuid,
  p_survivor_deal_id uuid default null
) returns void
language plpgsql
security definer
set search_path to 'crm', 'core', 'public'
as $function$
declare
  v_loser_deal record;
  v_survivor_deal record;
begin
  if p_survivor is null or p_loser is null or p_survivor = p_loser then
    return;
  end if;

  -- 1) para cada negócio do processo perdedor, funde com o equivalente
  --    do processo sobrevivente (mesma pessoa + mesmo credit_type), se existir.
  for v_loser_deal in select * from crm.deals where processo_id = p_loser loop
    select * into v_survivor_deal from crm.deals
      where processo_id = p_survivor
        and person_id = v_loser_deal.person_id
        and credit_type = v_loser_deal.credit_type
      limit 1;

    if v_survivor_deal.id is null then
      -- não colide com nada no processo sobrevivente: só repontua
      update crm.deals set processo_id = p_survivor where id = v_loser_deal.id;
      continue;
    end if;

    if p_survivor_deal_id is not null and p_survivor_deal_id = v_loser_deal.id then
      -- override explícito: o negócio do lado "loser" é quem deveria sobreviver
      update crm.deals set
        valor_ofertado_cents = coalesce(v_loser_deal.valor_ofertado_cents, v_survivor_deal.valor_ofertado_cents),
        desagio_pct          = coalesce(v_loser_deal.desagio_pct, v_survivor_deal.desagio_pct),
        honorarios_pct       = coalesce(v_loser_deal.honorarios_pct, v_survivor_deal.honorarios_pct),
        captador             = coalesce(v_loser_deal.captador, v_survivor_deal.captador),
        processo_id          = p_survivor
      where id = v_loser_deal.id;
      update crm.activities set deal_id = v_loser_deal.id where deal_id = v_survivor_deal.id;
      delete from crm.deals where id = v_survivor_deal.id;
      continue;
    end if;

    -- default: sobrevive o negócio do processo p_survivor, enriquecido com
    -- o que faltar do outro lado.
    update crm.deals set
      valor_ofertado_cents = coalesce(valor_ofertado_cents, v_loser_deal.valor_ofertado_cents),
      desagio_pct          = coalesce(desagio_pct, v_loser_deal.desagio_pct),
      honorarios_pct       = coalesce(honorarios_pct, v_loser_deal.honorarios_pct),
      captador             = coalesce(captador, v_loser_deal.captador)
    where id = v_survivor_deal.id;
    update crm.activities set deal_id = v_survivor_deal.id where deal_id = v_loser_deal.id;
    delete from crm.deals where id = v_loser_deal.id;
  end loop;

  -- 2) qualquer negócio do loser que não colidiu com nada (credit_type
  --    diferente etc.) — repontua o que sobrou.
  update crm.deals set processo_id = p_survivor where processo_id = p_loser;

  -- 3) advogados vinculados: move os que não colidem, descarta duplicados
  update crm.processo_advogados a set processo_id = p_survivor
   where a.processo_id = p_loser
     and not exists (
       select 1 from crm.processo_advogados b
       where b.processo_id = p_survivor and b.person_id = a.person_id);
  delete from crm.processo_advogados where processo_id = p_loser;

  -- 4) atividades que ainda apontam pro processo (não só pro negócio)
  update crm.activities set processo_id = p_survivor where processo_id = p_loser;

  -- 5) enriquece o processo sobrevivente com o que faltar do perdedor.
  --    NÃO recanoniza numero_cnj aqui ainda: se o perdedor já tiver
  --    exatamente a forma canônica (caso real: sobrevivente no formato
  --    "corrido", perdedor no formato pontuado — mesmo processo), essa
  --    atualização colidiria com a constraint UNIQUE(workspace_id,
  --    numero_cnj) enquanto o perdedor ainda existe. Recanoniza só
  --    depois de apagar o perdedor (passo 7).
  update crm.processos s set
    reclamante_person_id         = coalesce(s.reclamante_person_id, l.reclamante_person_id),
    reclamada_company_id         = coalesce(s.reclamada_company_id, l.reclamada_company_id),
    tribunal                     = coalesce(s.tribunal, l.tribunal),
    vara                         = coalesce(s.vara, l.vara),
    uf                           = coalesce(s.uf, l.uf),
    fase                         = coalesce(s.fase, l.fase),
    valor_causa_cents            = coalesce(s.valor_causa_cents, l.valor_causa_cents),
    valor_estimado_liquido_cents = coalesce(s.valor_estimado_liquido_cents, l.valor_estimado_liquido_cents),
    reclamada_cndt                = coalesce(s.reclamada_cndt, l.reclamada_cndt),
    reclamada_em_rj               = coalesce(s.reclamada_em_rj, l.reclamada_em_rj),
    reclamada_porte                = coalesce(s.reclamada_porte, l.reclamada_porte),
    reclamada_paga_precatorio      = coalesce(s.reclamada_paga_precatorio, l.reclamada_paga_precatorio),
    reclamada_solvente             = coalesce(s.reclamada_solvente, l.reclamada_solvente),
    teses_restritivas              = (select array(select distinct unnest(s.teses_restritivas || l.teses_restritivas))),
    riscos                         = (select array(select distinct unnest(s.riscos || l.riscos))),
    updated_at                     = now()
  from crm.processos l
  where s.id = p_survivor and l.id = p_loser;

  -- 6) registro de auditoria
  insert into core.events (workspace_id, person_id, source, type, payload)
  select workspace_id, reclamante_person_id, 'system', 'processos_merged',
         jsonb_build_object('survivor', p_survivor, 'loser', p_loser)
  from crm.processos where id = p_survivor;

  -- 7) remove o perdedor (só depois de tudo repontuado/mesclado acima)
  delete from crm.processos where id = p_loser;

  -- 8) só agora recanoniza o numero_cnj do sobrevivente (garante formato
  --    pontuado padrão de saída, independente de qual dos dois lados
  --    sobreviveu) — seguro porque o perdedor já não existe mais.
  update crm.processos set
    numero_cnj = coalesce(core.normalize_numero_cnj(numero_cnj), numero_cnj),
    updated_at = now()
  where id = p_survivor;
end $function$;

grant execute on function crm.merge_processos(uuid, uuid, uuid) to service_role;

notify pgrst, 'reload schema';
