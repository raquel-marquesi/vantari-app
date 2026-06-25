-- =============================================================================
-- FIN (financeiro) — antecipação de crédito trabalhista, sobre o core canônico
-- -----------------------------------------------------------------------------
-- Depende de 0001_core_foundation.sql. Ciclo PÓS-aceite: quando um crédito é
-- ganho (crm emite 'deal_won'), o jurídico formaliza e a Vantari desembolsa.
-- Aqui mora a ANTECIPAÇÃO (o que a Vantari pagou, com deságio) e os
-- RECEBIMENTOS em TRANCHES (o retorno ao longo do processo — datas incertas).
--
-- Acoplamento: fin -> core (FK em core.persons). deal_id/processo_id são uuid
-- soltos (sem FK) para fin não depender de crm; o handoff é via evento deal_won.
--
-- ESCOPO: gestão de antecipação e recebíveis. NÃO é ERP fiscal (NF-e/boleto/
-- CNAB/SPED = integração de terceiro).
--
-- PROPOSTA PARA REVISÃO — não aplicada. (Substitui a versão de parcelas iguais.)
-- =============================================================================

create schema if not exists fin;

-- ---------------------------------------------------------------------------
-- Antecipações (1 por crédito ganho)
-- ---------------------------------------------------------------------------
create table if not exists fin.antecipacoes (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid not null references core.workspaces(id) on delete cascade,
  person_id            uuid not null references core.persons(id) on delete restrict,  -- titular do crédito
  deal_id              uuid,                       -- crm.deals (sem FK: fin não depende de crm)
  processo_id          uuid,                       -- crm.processos
  credit_type          text check (credit_type in ('reclamante', 'advogado_honorario')),
  modalidade           text check (modalidade in ('kicker', 'tradicional')),
  valor_face_cents     bigint not null,            -- valor de face do crédito
  valor_antecipado_cents bigint not null,          -- quanto a Vantari pagou
  desagio_pct          numeric(5,2),
  data_desembolso      date,
  status               text not null default 'pendente_formalizacao'
                       check (status in ('pendente_formalizacao', 'desembolsada',
                                         'em_recebimento', 'liquidada', 'cancelada')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists antecip_person_idx on fin.antecipacoes (person_id);
create index if not exists antecip_status_idx  on fin.antecipacoes (workspace_id, status);

-- ---------------------------------------------------------------------------
-- Recebimentos (tranches): o retorno esperado/realizado do crédito
-- ---------------------------------------------------------------------------
create table if not exists fin.recebimentos (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid not null references core.workspaces(id) on delete cascade,
  antecipacao_id      uuid not null references fin.antecipacoes(id) on delete cascade,
  person_id           uuid not null references core.persons(id) on delete restrict,
  descricao           text,                        -- RPV | acordo parcela N | execução | complemento...
  valor_previsto_cents bigint not null,
  data_prevista       date,                        -- estimada (incerta, ligada à fase do processo)
  status              text not null default 'previsto'
                      check (status in ('previsto', 'recebido', 'atrasado', 'cancelado')),
  valor_recebido_cents bigint,
  data_recebimento    date,
  created_at          timestamptz not null default now()
);
create index if not exists receb_antecip_idx on fin.recebimentos (antecipacao_id);
create index if not exists receb_due_idx      on fin.recebimentos (workspace_id, status, data_prevista);

drop trigger if exists trg_antecip_touch on fin.antecipacoes;
create trigger trg_antecip_touch before update on fin.antecipacoes
  for each row execute function core.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Handoff do crm (deal_won): cria a antecipação + as tranches previstas.
-- p_tranches: jsonb array [{descricao, valor_cents, data_prevista}, ...]
-- Nasce 'pendente_formalizacao' (o desembolso ocorre após assinatura).
-- ---------------------------------------------------------------------------
create or replace function fin.criar_antecipacao(
  p_workspace        uuid,
  p_person           uuid,
  p_valor_face       bigint,
  p_valor_antecipado bigint,
  p_credit_type      text   default null,
  p_modalidade       text   default null,
  p_deal_id          uuid   default null,
  p_processo_id      uuid   default null,
  p_desagio_pct      numeric default null,
  p_tranches         jsonb  default '[]'
) returns uuid
language plpgsql security definer set search_path = fin, core, public as $$
declare
  v_antecip uuid;
  v_t       jsonb;
begin
  insert into fin.antecipacoes (workspace_id, person_id, deal_id, processo_id, credit_type,
                                modalidade, valor_face_cents, valor_antecipado_cents, desagio_pct)
  values (p_workspace, p_person, p_deal_id, p_processo_id, p_credit_type,
          p_modalidade, p_valor_face, p_valor_antecipado,
          coalesce(p_desagio_pct, round((1 - p_valor_antecipado::numeric / nullif(p_valor_face, 0)) * 100, 2)))
  returning id into v_antecip;

  for v_t in select * from jsonb_array_elements(coalesce(p_tranches, '[]'::jsonb)) loop
    insert into fin.recebimentos (workspace_id, antecipacao_id, person_id, descricao,
                                  valor_previsto_cents, data_prevista)
    values (p_workspace, v_antecip, p_person, v_t->>'descricao',
            (v_t->>'valor_cents')::bigint, (v_t->>'data_prevista')::date);
  end loop;

  insert into core.events (workspace_id, person_id, source, type, payload)
  values (p_workspace, p_person, 'fin', 'antecipacao_criada',
          jsonb_build_object('antecipacao_id', v_antecip, 'deal_id', p_deal_id,
                             'valor_antecipado_cents', p_valor_antecipado));
  return v_antecip;
end $$;

-- registra desembolso (após formalização/assinatura)
create or replace function fin.registrar_desembolso(p_antecip uuid, p_data date default current_date)
returns void language plpgsql security definer set search_path = fin, core, public as $$
declare v_ws uuid; v_person uuid;
begin
  update fin.antecipacoes
     set status = 'desembolsada', data_desembolso = p_data, updated_at = now()
   where id = p_antecip
   returning workspace_id, person_id into v_ws, v_person;
  if v_ws is not null then
    insert into core.events (workspace_id, person_id, source, type, payload)
    values (v_ws, v_person, 'fin', 'desembolso_realizado',
            jsonb_build_object('antecipacao_id', p_antecip, 'data', p_data));
  end if;
end $$;

-- registra recebimento de uma tranche; liquida a antecipação se todas recebidas
create or replace function fin.registrar_recebimento(p_receb uuid, p_valor bigint, p_data date default current_date)
returns void language plpgsql security definer set search_path = fin, core, public as $$
declare v_antecip uuid; v_ws uuid; v_pendentes int;
begin
  update fin.recebimentos
     set status = 'recebido', valor_recebido_cents = p_valor, data_recebimento = p_data
   where id = p_receb
   returning antecipacao_id, workspace_id into v_antecip, v_ws;

  select count(*) into v_pendentes from fin.recebimentos
   where antecipacao_id = v_antecip and status in ('previsto', 'atrasado');

  update fin.antecipacoes
     set status = case when v_pendentes = 0 then 'liquidada' else 'em_recebimento' end,
         updated_at = now()
   where id = v_antecip;
end $$;

-- marca como 'atrasado' as tranches vencidas ainda previstas (cron)
create or replace function fin.marcar_atrasados(p_workspace uuid)
returns int language plpgsql security definer set search_path = fin, public as $$
declare n int;
begin
  update fin.recebimentos set status = 'atrasado'
   where workspace_id = p_workspace and status = 'previsto' and data_prevista < current_date;
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------------------------------------------------------------------------
-- Segurança — financeiro NÃO tem caminho público: anon nunca
-- ---------------------------------------------------------------------------
grant usage on schema fin to authenticated, service_role;
revoke all on schema fin from anon;
grant select, insert, update, delete on all tables in schema fin to authenticated;
grant all on all tables in schema fin to service_role;
alter default privileges in schema fin grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema fin grant all on tables to service_role;
grant execute on function fin.criar_antecipacao(uuid, uuid, bigint, bigint, text, text, uuid, uuid, numeric, jsonb) to authenticated, service_role;
grant execute on function fin.registrar_desembolso(uuid, date)  to authenticated, service_role;
grant execute on function fin.registrar_recebimento(uuid, bigint, date) to authenticated, service_role;
grant execute on function fin.marcar_atrasados(uuid) to authenticated, service_role;

alter table fin.antecipacoes enable row level security;
alter table fin.recebimentos enable row level security;

create policy antecipacoes_rw on fin.antecipacoes for all to authenticated
  using (workspace_id in (select core.current_workspace_ids()))
  with check (workspace_id in (select core.current_workspace_ids()));
create policy recebimentos_rw on fin.recebimentos for all to authenticated
  using (workspace_id in (select core.current_workspace_ids()))
  with check (workspace_id in (select core.current_workspace_ids()));
