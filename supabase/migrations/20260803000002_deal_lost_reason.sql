-- ════════════════════════════════════════════════════════════════
-- Motivo de declínio (relatório mensal de casos)
-- ────────────────────────────────────────────────────────────────
-- Hoje, quando um negócio é marcado como "Perdido" (stage com kind='lost',
-- via trg_deal_status), nada registra POR QUE ele foi perdido. Pra dar o
-- relatório mensal de "quantos casos entraram / quantos foram declinados /
-- quais os motivos", esse dado precisa começar a ser capturado a partir de
-- agora — os negócios já perdidos (4, na data desta migration) ficam sem
-- motivo retroativo.
--
-- Motivos em lista fixa (evita texto livre inconsistente no relatório),
-- mais um campo de detalhe opcional pra contexto (obrigatório na prática
-- só quando o motivo é "outro", mas fica livre pra qualquer caso).
-- ════════════════════════════════════════════════════════════════

alter table crm.deals
  add column if not exists lost_reason text,
  add column if not exists lost_reason_detail text;

alter table crm.deals
  drop constraint if exists deals_lost_reason_check;
alter table crm.deals
  add constraint deals_lost_reason_check check (
    lost_reason is null or lost_reason in (
      'reclamada_insolvente',      -- reclamada sem capacidade de pagamento
      'reclamada_em_rj',           -- reclamada em recuperação judicial
      'tese_restritiva',           -- tese jurídica restritiva no processo
      'processo_inelegivel',       -- não passou nos critérios de elegibilidade
      'cliente_desistiu',          -- cliente desistiu da antecipação
      'proposta_recusada',         -- cliente recusou o deságio/proposta
      'documentacao_incompleta',   -- documentação não enviada/incompleta
      'sem_contato',               -- perda de contato com o cliente
      'outro'
    )
  );

-- ajusta sync_deal_status: ao voltar um negócio de "Perdido" pra outra etapa
-- (reabertura), limpa o motivo antigo pra não ficar um motivo órfão de uma
-- perda que não é mais válida.
create or replace function crm.sync_deal_status()
returns trigger
language plpgsql
set search_path to 'crm', 'public'
as $function$
declare v_kind text;
begin
  new.updated_at := now();
  select kind into v_kind from crm.stages where id = new.stage_id;
  new.status := coalesce(v_kind, 'open');
  if new.status in ('won', 'lost')
     then new.closed_at := coalesce(new.closed_at, now());
     else new.closed_at := null;
  end if;
  if new.status <> 'lost' then
    new.lost_reason := null;
    new.lost_reason_detail := null;
  end if;
  return new;
end $function$;

comment on column crm.deals.lost_reason is 'Motivo do declínio, capturado ao mover o negócio pra uma etapa kind=lost. Lista fixa, ver constraint deals_lost_reason_check.';
comment on column crm.deals.lost_reason_detail is 'Detalhe livre opcional do motivo de declínio (obrigatório na UI só quando lost_reason = outro).';
