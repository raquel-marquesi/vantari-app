-- Fix schema mismatch between DB and frontend (vantari-workflow-builder.jsx)
-- Frontend reads/writes automation_flows.definition and flow_runs.step,
-- but the baseline migration only created automation_flows.steps and
-- flow_runs.current_step. This blocked saving/activating any workflow
-- ("Could not find the 'definition' column of 'automation_flows'") and
-- broke the execution logs screen ("column flow_runs.step does not exist").

ALTER TABLE "public"."automation_flows"
  ADD COLUMN IF NOT EXISTS "definition" "jsonb" DEFAULT '{"nodes": [], "edges": []}'::"jsonb";

ALTER TABLE "public"."flow_runs"
  ADD COLUMN IF NOT EXISTS "step" integer DEFAULT 0;

COMMENT ON COLUMN "public"."automation_flows"."definition" IS 'Visual builder state: { nodes, edges } used by the Workflows canvas.';
COMMENT ON COLUMN "public"."flow_runs"."step" IS 'Current step index in the flow execution, read by the Logs de Execução screen.';
