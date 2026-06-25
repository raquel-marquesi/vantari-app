-- =============================================================================
-- FIN (financeiro) — contratos e recebíveis, sobre o core canônico
-- -----------------------------------------------------------------------------
-- Depende de 0001_core_foundation.sql. Modela o ciclo PÓS-venda: quando um deal
-- é ganho (crm emite core.events 'deal_won'), vira contrato + recebíveis aqui.
--
-- ESCOPO (decisão de arquitetura): isto é GESTÃO de contratos/recebíveis
-- (quem deve, quanto, vencimento, status). NÃO é ERP fiscal — emissão de NF-e,
-- boleto/CNAB, SPED e conciliação bancária ficam para integração de TERCEIRO
-- com API. Não construir fiscal in-house.
--
-- Acoplamento: fin -> core (FK em core.persons). NÃO referencia crm por FK
-- (deal_id é uuid solto) para não acoplar fin a crm; o handoff é via evento.
--
-- PROPOSTA PARA REVISÃO — não aplicada.
-- =============================================================================

create schema if not exists fin;

-- ---------------------------------------------------------------------------
-- Contratos
-- ---------------------------------------------------------------------------
create table if not exists fin.contracts (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces(id) on delete cascade,
  person_id    uuid not null references core.persons(id) on delete restrict,  -- não apaga cliente com contrato
  company_id   uuid references core.companies(id) on delete set null,
  deal_id      uuid,                       -- referencia crm.deals (sem FK: fin não depende de crm)
  number       text,
  title        text,
  value_cents  bigint not null default 0,
  currency     text not null default 'BRL',
  status       text not null default 'active'
               check (status in ('draft', 'active', 'completed', 'canceled')),
  signed_at    timestamptz,
  start_date   date,
  end_date     date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists contracts_person_idx on fin.contracts (person_id);
create index if not exists contracts_status_idx  on fin.contracts (workspace_id, status);

-- ---------------------------------------------------------------------------
-- Recebíveis (parcelas / cobranças)
-- ---------------------------------------------------------------------------
create table if not exists fin.receivables (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references core.workspaces(id) on delete cascade,
  contract_id       uuid references fin.contracts(id) on delete cascade,
  person_id         uuid not null references core.persons(id) on delete restrict,
  description       text,
  amount_cents      bigint not null,
  due_date          date not null,
  status            text not null default 'pending'
                    check (status in ('pending', 'paid', 'overdue', 'canceled')),
  paid_at           timestamptz,
  paid_amount_cents bigint,
  installment       int,
  installments_total int,
  created_at        timestamptz not null default now()
);
create index if not exists receivables_person_idx on fin.receivables (person_id);
create index if not exists receivables_due_idx     on fin.receivables (workspace_id, status, due_date);

-- updated_at nos contratos
drop trigger if exists trg_contract_touch on fin.contracts;
create trigger trg_contract_touch before update on fin.contracts
  for each row execute function core.touch_updated_at();

-- eventos de contrato na timeline única (assinado/concluído/cancelado)
create or replace function fin.log_contract_event()
returns trigger language plpgsql security definer set search_path = core, fin, public as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status
     and new.status in ('completed', 'canceled') then
    insert into core.events (workspace_id, person_id, company_id, source, type, payload)
    values (new.workspace_id, new.person_id, new.company_id, 'fin', 'contract_' || new.status,
            jsonb_build_object('contract_id', new.id));
  end if;
  return null;
end $$;

drop trigger if exists trg_contract_event on fin.contracts;
create trigger trg_contract_event after update on fin.contracts
  for each row execute function fin.log_contract_event();

-- ---------------------------------------------------------------------------
-- Handoff do crm: cria contrato + parcelas a partir de um deal ganho.
-- Chamado pelo worker/Edge Function que escuta core.events 'deal_won'.
-- ---------------------------------------------------------------------------
create or replace function fin.create_contract_from_deal(
  p_workspace    uuid,
  p_person       uuid,
  p_value_cents  bigint,
  p_title        text   default null,
  p_deal_id      uuid   default null,
  p_installments int    default 1,
  p_first_due    date   default current_date
) returns uuid
language plpgsql security definer set search_path = fin, core, public as $$
declare
  v_contract uuid;
  v_n        int := greatest(p_installments, 1);
  v_amount   bigint;
  i          int;
begin
  insert into fin.contracts (workspace_id, person_id, deal_id, title, value_cents, status, signed_at)
  values (p_workspace, p_person, p_deal_id, p_title, p_value_cents, 'active', now())
  returning id into v_contract;

  -- parcelas iguais (resto de centavos vai na 1ª — evita perder dinheiro)
  v_amount := p_value_cents / v_n;
  for i in 1..v_n loop
    insert into fin.receivables (workspace_id, contract_id, person_id, description,
                                 amount_cents, due_date, installment, installments_total)
    values (p_workspace, v_contract, p_person,
            coalesce(p_title, 'Contrato') || ' ' || i || '/' || v_n,
            case when i = 1 then v_amount + (p_value_cents - v_amount * v_n) else v_amount end,
            (p_first_due + ((i - 1) || ' month')::interval)::date,
            i, v_n);
  end loop;

  insert into core.events (workspace_id, person_id, source, type, payload)
  values (p_workspace, p_person, 'fin', 'contract_signed',
          jsonb_build_object('contract_id', v_contract, 'value_cents', p_value_cents, 'deal_id', p_deal_id));

  return v_contract;
end $$;

-- marca como 'overdue' os recebíveis vencidos ainda pendentes (rodar via cron)
create or replace function fin.mark_overdue(p_workspace uuid)
returns int language plpgsql security definer set search_path = fin, public as $$
declare n int;
begin
  update fin.receivables set status = 'overdue'
   where workspace_id = p_workspace and status = 'pending' and due_date < current_date;
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------------------------------------------------------------------------
-- Segurança — financeiro NÃO tem caminho público: anon nunca; só authenticated
-- ---------------------------------------------------------------------------
grant usage on schema fin to authenticated, service_role;
revoke all on schema fin from anon;
grant select, insert, update, delete on all tables in schema fin to authenticated;
grant all on all tables in schema fin to service_role;
alter default privileges in schema fin
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema fin grant all on tables to service_role;
grant execute on function fin.create_contract_from_deal(uuid, uuid, bigint, text, uuid, int, date)
  to authenticated, service_role;
grant execute on function fin.mark_overdue(uuid) to authenticated, service_role;

alter table fin.contracts   enable row level security;
alter table fin.receivables enable row level security;

create policy contracts_rw on fin.contracts for all to authenticated
  using (workspace_id in (select core.current_workspace_ids()))
  with check (workspace_id in (select core.current_workspace_ids()));
create policy receivables_rw on fin.receivables for all to authenticated
  using (workspace_id in (select core.current_workspace_ids()))
  with check (workspace_id in (select core.current_workspace_ids()));
