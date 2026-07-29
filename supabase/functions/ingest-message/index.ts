// ════════════════════════════════════════════════════════════════
// Edge Function: /ingest-message
// ────────────────────────────────────────────────────────────────
// Porta de entrada de MENSAGENS pro Inbox de Atendimento (/inbox no Next).
// A Nina chama esta função a cada mensagem trocada na conversa (mensagem do
// cliente chegando, ou resposta da Nina/humano saindo) — diferente de
// /ingest, que é só pro evento "lead chegou" e roda uma vez por contato/
// atualização de dados. Aqui é streaming contínuo da conversa inteira.
//
// Roda com SERVICE_ROLE (bypassa RLS), igual /ingest.
//
// Segurança: mesmo header  X-Ingest-Secret == env INGEST_SECRET  do /ingest.
//
// Body esperado (JSON):
// {
//   "workspace": "<uuid ou slug>",                        // obrigatório
//   "person": { "cpf":"...", "phone":"+55...", "email":"...", "name":"..." }, // obrigatório (≥1 identificador)
//   "external_conversation_id": "<id da conversa na Nina>", // opcional, só referência
//   "direction": "in" | "out",                              // obrigatório: in = cliente→nós, out = nós→cliente
//   "sender": "customer" | "nina" | "human",                 // obrigatório
//   "body": "texto da mensagem",                             // opcional (ex: mensagem só de mídia)
//   "external_message_id": "<id único da mensagem na Nina>", // MUITO recomendado: evita duplicar se a Nina reenviar
//   "occurred_at": "2026-07-29T18:40:00Z"                    // opcional, default = agora
// }
//
// Resposta: { "person_id", "conversation_id", "message_id", "is_new_conversation" }
//
// Deploy:  supabase functions deploy ingest-message
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

  const direction = String(body.direction ?? "");
  if (!["in", "out"].includes(direction)) {
    return jsonResp({ error: "direction deve ser 'in' ou 'out'" }, 400);
  }
  const sender = String(body.sender ?? "");
  if (!["customer", "nina", "human"].includes(sender)) {
    return jsonResp({ error: "sender deve ser 'customer', 'nina' ou 'human'" }, 400);
  }

  const p = body.person ?? {};
  const cpf   = p.cpf   ?? null;
  const phone = p.phone ?? null;
  const email = p.email ?? null;
  const name  = p.name  ?? null;
  if (!cpf && !phone && !email) {
    return jsonResp({ error: "pelo menos um identificador (cpf, phone ou email) é obrigatório em person" }, 400);
  }

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

  // mesma resolução de identidade do /ingest — garante que a mensagem cai
  // na pessoa certa mesmo que ainda não exista (cria na hora)
  const { data: personId, error: rpcErr } = await core.rpc("resolve_person", {
    p_workspace: workspaceId,
    p_cpf:   cpf,
    p_phone: phone,
    p_email: email,
    p_name:  name,
    p_source: "nina",
  });
  if (rpcErr) {
    const invalid = /CPF inválido/i.test(rpcErr.message);
    return jsonResp({ error: "falha ao resolver pessoa", detail: rpcErr.message },
      invalid ? 422 : 500);
  }

  const { data: msgResult, error: msgErr } = await core.rpc("ingest_message", {
    p_workspace: workspaceId,
    p_person: personId,
    p_external_conversation_id: body.external_conversation_id ?? null,
    p_direction: direction,
    p_sender: sender,
    p_body: body.body ?? null,
    p_external_message_id: body.external_message_id ?? null,
    p_occurred_at: body.occurred_at ?? new Date().toISOString(),
    p_source: "nina",
  });
  if (msgErr) {
    return jsonResp({ person_id: personId, error: "falha ao registrar mensagem", detail: msgErr.message }, 500);
  }

  const row = Array.isArray(msgResult) ? msgResult[0] : msgResult;
  return jsonResp({
    person_id: personId,
    conversation_id: row?.conversation_id,
    message_id: row?.message_id,
    is_new_conversation: row?.is_new_conversation,
  });
});
