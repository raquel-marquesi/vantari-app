-- ═══════════════════════════════════════════════════════════════════
-- Fix (2026-08-17): mapeia o campo "Fase do processo" (já existente em
-- 2 das 3 LPs reais: Antecipar Agora, Antecipar Ação) pro motor de
-- scoring "Vantari Crédito". O campo já é coletado, só não alimentava
-- o motor. Adiciona scoring_key ao field (rotina já existente no
-- vantari-public-form.jsx faz o resto automaticamente) + as regras de
-- pontuação (pontos iniciais — ajustáveis em /scoring → Perfil):
--   Trânsito em julgado (processo decidido, sem risco de recurso) = 6
--   2ª instância (ainda em recurso, incerto)                      = 3
--   Não sei informar (menor qualidade de informação)              = 1
-- ═══════════════════════════════════════════════════════════════════

update public.forms
set fields = (
  select jsonb_agg(
    case when f->>'id' = 'fase_processual'
      then f || '{"scoring_key":"fase_processual"}'::jsonb
      else f
    end
  )
  from jsonb_array_elements(fields) f
)
where slug in ('antecipar-agora', 'antecipar-acao');

insert into mkt.score_rules (workspace_id, stage, category, label, field_key, match_value, points, active)
values
  ('53092199-7b75-4342-a897-f589d6f34922'::uuid, 1, 'qualidade', 'Trânsito em julgado (processo decidido, sem risco de recurso)', 'fase_processual', 'Trânsito em julgado', 6, true),
  ('53092199-7b75-4342-a897-f589d6f34922'::uuid, 1, 'qualidade', '2ª instância (ainda em recurso)', 'fase_processual', '2ª instância', 3, true),
  ('53092199-7b75-4342-a897-f589d6f34922'::uuid, 1, 'qualidade', 'Não sabe informar a fase', 'fase_processual', 'Não sei informar', 1, true)
on conflict (workspace_id, stage, field_key, match_value) do update set points = excluded.points, active = true;
