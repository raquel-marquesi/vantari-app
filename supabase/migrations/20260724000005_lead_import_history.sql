-- Importação/Exportação de leads em massa (/leads): histórico de lotes importados
-- via CSV. Cada linha processada chama core.resolve_person (idempotente, já
-- usado pelo "Novo Lead"), então este histórico é só um resumo/auditoria —
-- não guarda os person_id individualmente (isso vive, quando pedido, numa
-- segmentação estática criada junto: public.segments.rules = [{field:"id", op:"in", value:[...]}]).

create table if not exists core.import_batches (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  filename      text,
  total_rows    int  not null default 0,
  processed     int  not null default 0,   -- linhas com CPF/telefone/email suficientes p/ resolve_person
  failed        int  not null default 0,   -- linhas ignoradas (sem identificador nenhum) ou com erro
  field_mapping jsonb,                     -- {"nome":"Nome completo","cpf":"CPF", ...}
  segment_id    uuid references public.segments(id) on delete set null,
  created_by    text,                      -- email do usuário (auth.users não é lido pelo front)
  created_at    timestamptz not null default now()
);
create index if not exists import_batches_workspace_idx on core.import_batches (workspace_id, created_at desc);

alter table core.import_batches enable row level security;
drop policy if exists import_batches_rw on core.import_batches;
create policy import_batches_rw on core.import_batches for all to authenticated using (true) with check (true);

grant select, insert, update, delete on core.import_batches to authenticated;
grant all on core.import_batches to service_role;
