-- ════════════════════════════════════════════════════════════════
-- Centraliza o número de WhatsApp usado nas landing pages publicadas
-- (public/landing-pages/*.html). Antes: número hardcoded e duplicado
-- em cada arquivo HTML — trocar exigia editar os 3 e redeployar.
-- Agora: 1 campo em workspace_settings, editável em /settings, e as
-- LPs buscam o valor em tempo real via RPC pública.
-- ════════════════════════════════════════════════════════════════

alter table public.workspace_settings
  add column if not exists whatsapp_number text not null default '5511952135676';

update public.workspace_settings
  set whatsapp_number = '5511952135676'
  where workspace_id = '53092199-7b75-4342-a897-f589d6f34922'
    and (whatsapp_number is null or whatsapp_number = '');

-- RPC pública e estreita: expõe SÓ o número de WhatsApp (dado já visível
-- a qualquer visitante do site, hoje hardcoded no HTML), sem abrir leitura
-- da tabela inteira (workspace_settings guarda feature_flags, retenção
-- de dados etc. — isso não deve ir pro anon).
create or replace function public.get_lp_whatsapp()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select whatsapp_number
  from public.workspace_settings
  where workspace_id = '53092199-7b75-4342-a897-f589d6f34922'
  limit 1;
$$;

grant execute on function public.get_lp_whatsapp() to anon, authenticated;
