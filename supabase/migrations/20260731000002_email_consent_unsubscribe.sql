-- ════════════════════════════════════════════════════════════════
-- Descadastro de email (LGPD) — RPC pública pra flipar core.consents
-- ────────────────────────────────────────────────────────────────
-- Contexto: os links "Descadastrar" nos emails (templates + send-campaign)
-- sempre apontaram pra href="#" — não existia rota nem RPC funcional.
-- core.consents (channel='email', status='revoked') já é a tabela lida por
-- segment-resolver.js e mkt.can_email(), só nunca foi escrita por ninguém.
--
-- Esta RPC é chamada pela página pública /unsubscribe (sem login, anon key),
-- então roda security definer e é restrita a UMA ação: revogar consentimento
-- de email de uma pessoa específica dentro do workspace informado. Não expõe
-- nem lê nenhum dado pessoal de volta.
-- ════════════════════════════════════════════════════════════════

create or replace function core.set_email_consent(
  p_workspace uuid,
  p_person    uuid,
  p_source    text default 'unsubscribe_page'
)
returns boolean
language plpgsql
security definer
set search_path = core, public
as $$
begin
  if p_workspace is null or p_person is null then
    return false;
  end if;

  -- confirma que a pessoa pertence de fato ao workspace informado
  if not exists (
    select 1 from core.persons
     where id = p_person and workspace_id = p_workspace
  ) then
    return false;
  end if;

  insert into core.consents (workspace_id, person_id, channel, status, basis, source, occurred_at)
  values (p_workspace, p_person, 'email', 'revoked', 'user_request', p_source, now())
  on conflict (workspace_id, person_id, channel)
  do update set status = 'revoked', source = excluded.source, occurred_at = now();

  return true;
end;
$$;

grant execute on function core.set_email_consent(uuid, uuid, text) to anon, authenticated;
