-- ════════════════════════════════════════════════════════════════
-- Resolve os destinatários de uma campanha conforme audience_type:
--   'segment' → usa as regras do segmento (_build_segment_where)
--   'manual'  → lista explícita de lead ids
--   'all'     → todos os leads ativos do workspace
-- Reutilizado pela edge function send-campaign (chamada via RPC).
--
-- Filtro de workspace é resiliente: só aplica quando há workspace_id
-- (campanhas legadas sem workspace continuam enviando p/ todos os leads).
-- ════════════════════════════════════════════════════════════════
create or replace function public.get_campaign_recipients(_campaign_id uuid)
returns table(id uuid, email text, name text, company text)
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
  ws uuid;
  seg_where text := 'true';
  ws_clause text := '';
  id_clause text := '';
  sql text;
begin
  select * into c from public.campaigns where campaigns.id = _campaign_id;
  if c.id is null then
    return;
  end if;

  ws := c.workspace_id;

  if c.audience_type = 'segment' and c.segment_id is not null then
    select public._build_segment_where(s.rules), s.workspace_id
      into seg_where, ws
      from public.segments s where s.id = c.segment_id;
    seg_where := coalesce(seg_where, 'true');
  elsif c.audience_type = 'manual' then
    id_clause := format(' and l.id = any(%L::uuid[])', coalesce(c.manual_lead_ids, '{}'::uuid[]));
  end if;

  if ws is not null then
    ws_clause := format(' and l.workspace_id = %L', ws);
  end if;

  sql := format(
    'select l.id, l.email, l.name, l.company
       from public.leads l
      where l.unsubscribed = false
        and l.email is not null and l.email <> ''''
        and (%s)%s%s',
    seg_where, ws_clause, id_clause
  );

  return query execute sql;
end;
$$;

grant execute on function public.get_campaign_recipients(uuid) to service_role, authenticated, anon;
