# Migrations arquivadas (001–010)

Estes arquivos descrevem um schema **single-tenant antigo** que **não corresponde**
ao banco de produção atual. O banco vivo (`ejhrlrasepowdcdnggmv` · NEXT-marketing.crm)
evoluiu para um modelo **multi-tenant** (tabelas `workspaces`, coluna `workspace_id`,
RLS por workspace, `profiles`, `lead_score_history`, etc.) por um caminho que não passou
por estes arquivos — eles nunca constaram como aplicados no tracking remoto
(`supabase_migrations.schema_migrations`).

Mantê-los em `supabase/migrations/` era perigoso: um `supabase db push` tentaria
reaplicá-los sobre o schema vivo divergente e quebraria.

## O que passou a valer

A verdade do schema agora é o baseline único:
`supabase/migrations/20260622130000_remote_baseline.sql` — gerado via
`supabase db dump --linked` a partir do banco de produção (já inclui o hotfix do
trigger `trg_form_submission_to_lead`).

O tracking remoto foi reconciliado (`supabase migration repair`) para refletir só
esse baseline.

## Por que guardar

Servem de referência histórica do desenho original (Etapas 0–11 da migração do RD).
Não devem ser movidos de volta para `migrations/` nem reaplicados.
