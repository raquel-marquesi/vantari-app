-- O builder visual de Workflows guarda o(s) trigger(s) dentro do JSON
-- automation_flows.definition (nodes/edges) — suporta 10 tipos, incluindo "Manual".
-- A coluna legada "trigger_type" (NOT NULL + CHECK com só 6 valores) nunca é
-- preenchida pelo front-end, o que quebrava a criação de qualquer workflow novo:
-- "null value in column 'trigger_type' of relation 'automation_flows' violates
-- not-null constraint". Como o dado real vive em `definition`, tornamos a coluna
-- legada opcional em vez de forçar um valor arbitrário que não reflete a realidade.

ALTER TABLE "public"."automation_flows"
  ALTER COLUMN "trigger_type" DROP NOT NULL;
