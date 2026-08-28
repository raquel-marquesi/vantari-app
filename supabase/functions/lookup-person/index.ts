// ════════════════════════════════════════════════════════════════
// Edge Function: /lookup-person
// ────────────────────────────────────────────────────────────────
// Prioridade 7a do plano de unificação de leads (site / Google Ads /
// WhatsApp). A Nina chama isso ANTES de começar a triagem, pra saber
// o que já sabemos sobre o contato (CPF, nome, negócios já abertos,
// atributos já respondidos em outro canal) e só perguntar o que ainda
// falta.
//
// SÓ LEITURA — diferente de /ingest e /ingest-message (que criam
// pessoa se não existir), esta função nunca grava nada. Se não achar
// ninguém com esse telefone, devolve found:false e a Nina segue o
// fluxo normal de qualificação do zero.
//
// Segurança: mesmo header X-Ingest-Secret == env INGEST_SECRET das
// outras duas portas de entrada.
//
// Body esperado (JSON):
// { "workspace": "<uuid ou slug>", "phone": "+55 11 9..." }
//
// Resposta (found:true):
// {
//   "found": true, "person_id": "...", "cpf": "...", "full_name": "...",
//   "primary_email": "...",
//   "attributes": { "conhece_processo": "sim", "momento": "...", ... },
//   "deals": [ { "numero_cnj": "...", "credit_type": "reclamante",
//                "stage": "Novos Leads", "status": "open", "honorarios_pct": 30 } ]
// }
// Resposta (found:false): { "found": false }
//
// Deploy:  supabase functions deploy lookup-person
// ════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INGEST_SECRET = Deno.env.get("INGEST_SECRET") ?? "";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Ingest-Secret",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST")    return jsonResp({ error: "Method not allowed" }, 405);

  if (!INGEST_SECRET || req.headers.get("X-Ingest-Secret") !== INGEST_SECRET) {
    return jsonResp({ error: "unauthorized" }, 401);
  }

  let body: any;
  try { body = await req.json(); }
  catch { return jsonResp({ error: "Invalid JSON" }, 400); }

  if (!body.workspace) return jsonResp({ error: "workspace obrigatório" }, 400);
  if (!body.phone)     return jsonResp({ error: "phone obrigatório" }, 400);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const core = supabase.schema("core");

  let workspaceId = String(body.workspace);
  if (!UUID_RE.test(workspaceId)) {
    const { data: ws, error: wsErr } = await core
      .from("workspaces").select("id").eq("slug", workspaceId).maybeSingle();
    if (wsErr)  return jsonResp({ error: "erro ao resolver workspace", detail: wsErr.message }, 500);
    if (!ws)    return jsonResp({ error: `workspace não encontrado: ${workspaceId}` }, 404);
    workspaceId = ws.id;
  }

  const { data, error } = await core.rpc("lookup_person_by_phone", {
    p_workspace: workspaceId,
    p_phone: String(body.phone),
  });
  if (error) {
    return jsonResp({ error: "falha ao consultar pessoa", detail: error.message }, 500);
  }

  return jsonResp(data ?? { found: false });
});
