-- =============================================================================
-- BACKFILL — public.leads  ->  core.persons   (one-off, JÁ EXECUTADO 2026-06-25)
-- -----------------------------------------------------------------------------
-- Reprocessa os leads existentes (já atribuídos à sala Vantari) pelo
-- core.resolve_person, criando as pessoas canônicas + identificadores.
--
-- Idempotente: resolve_person dedup por cpf/telefone/email, então rodar de novo
-- NÃO duplica. CPF inválido (checksum) entra como NULL (pessoa fica 'pendente')
-- em vez de derrubar o lote.
--
-- Resultado verificado (workspace Vantari 53092199-7b75-4342-a897-f589d6f34922):
--   108 leads -> 108 pessoas (6 identificadas, 102 pendentes), 211 identificadores.
--   Mapeamento 1:1 por email (0 leads sem pessoa, 0 pessoas sem lead).
--   Sem deduplicação porque não havia email/telefone repetido na origem.
--
-- NÃO é migração de schema — não recolocar no fluxo de migrations. Mantido aqui
-- só como registro do que foi rodado. Para outros workspaces, troque o id.
-- =============================================================================

do $$
declare
  v_ws  uuid := '53092199-7b75-4342-a897-f589d6f34922';  -- sala Vantari
  r     record;
  v_cpf text;
  n     int := 0;
begin
  for r in
    select id, cpf, phone, email, name, source
    from public.leads
    where workspace_id = v_ws
  loop
    -- só passa o CPF se for válido; senão a pessoa nasce 'pendente'
    v_cpf := case when core.is_valid_cpf(r.cpf) then core.only_digits(r.cpf) else null end;
    perform core.resolve_person(
      v_ws, v_cpf, r.phone, r.email, r.name,
      coalesce(nullif(trim(r.source), ''), 'import_next')
    );
    n := n + 1;
  end loop;
  raise notice 'backfill: % leads processados', n;
end $$;
