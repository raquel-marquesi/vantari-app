-- Painel "Em Risco" (/risco): limiares de inatividade configuráveis por workspace.
-- medio_dias / alto_dias = nº de dias sem atividade (crm.activities) a partir dos
-- quais um negócio/contato entra em risco médio ou alto.

alter table public.workspace_settings
  add column if not exists risk_rules jsonb not null default '{"medio_dias":7,"alto_dias":14}'::jsonb;
