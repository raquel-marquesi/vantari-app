// ════════════════════════════════════════════════════════════════
// Edge Function: /ingest
// ────────────────────────────────────────────────────────────────
// PORTA ÚNICA de entrada de leads no core canônico.
// Recebe webhooks de fontes server-to-server (Nina, Meta Lead Ads,
// Google, importadores) → resolve a pessoa por CPF/telefone/email
// via core.resolve_person() → grava um core.events.
//
// Roda com SERVICE_ROLE (bypassa RLS). É por isso que o `anon` NUNCA
// precisa de acesso ao core — nada escreve direto no banco pelo browser.
//
// Segurança: exige header  X-Ingest-Secret == env INGEST_SECRET.
// (Form público de browser NÃO usa esta função — ele tem rota própria
//  com captcha/origem; aqui é só tráfego de servidor confiável.)
//
// Body esperado (JSON):
// {
//   "workspace":  "<uuid ou slug>",                 // obrigatório
//   "source":     "nina|meta|google|form|manual",   // obrigatório
//   "event_type": "whatsapp_in",                     // opcional (default por source)
//   "person": { "cpf":"...", "phone":"+55 11 9...", "email":"...", "name":"..." },
//   "payload": { ...qualquer coisa... }              // opcional → vai pro evento
//   // Alternativa Meta Lead Ads: enviar "field_data":[{name,values[]}] em vez de person
// }
//
// Resposta: { "person_id": "<uuid>", "source": "...", "event_type": "..." }
//
// Deploy:  supabase functions deploy ingest
// Secret:  supabase secrets set INGEST_SECRET=<aleatório forte>
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

// default de event_type por fonte, quando o caller não manda
const DEFAULT_EVENT_TYPE: Record<string, string> = {
  nina:   "whatsapp_in",
  meta:   "lead_created",
  google: "lead_created",
  form:   "form_submit",
  manual: "lead_created",
};

// Mapeia o field_data nativo do Meta Lead Ads para identificadores
function fromMetaFieldData(fd: Array<{ name: string; values: string[] }>) {
  const get = (...keys: string[]) => {
    for (const f of fd) {
      const n = (f.name || "").toLowerCase();
      if (keys.some((k) => n.includes(k))) return f.values?.[0] ?? null;
    }
    return null;
  };
  return {
    email: get("email"),
    phone: get("phone", "telefone", "whatsapp"),
    name:  get("full_name", "name", "nome"),
    cpf:   get("cpf"),
  };
}

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST")    return jsonResp({ error: "Method not allowed" }, 405);

  // —— autenticação do servidor chamador ——
  if (!INGEST_SECRET || req.headers.get("X-Ingest-Secret") !== INGEST_SECRET) {
    return jsonResp({ error: "unauthorized" }, 401);
  }

  let body: any;
  try { body = await req.json(); }
  catch { return jsonResp({ error: "Invalid JSON" }, 400); }

  const source = String(body.source ?? "").toLowerCase();
  if (!source)       return jsonResp({ error: "source obrigatório" }, 400);
  if (!body.workspace) return jsonResp({ error: "workspace obrigatório" }, 400);

  // identificadores: ou body.person, ou field_data do Meta
  const p = body.person ?? (Array.isArray(body.field_data)
    ? fromMetaFieldData(body.field_data)
    : {});
  const cpf   = p.cpf   ?? null;
  const phone = p.phone ?? null;
  const email = p.email ?? null;
  const name  = p.name  ?? null;

  if (!cpf && !phone && !email) {
    return jsonResp({ error: "pelo menos um identificador (cpf, phone ou email) é obrigatório" }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const core = supabase.schema("core");

  // —— resolver workspace_id (aceita uuid direto ou slug) ——
  let workspaceId = String(body.workspace);
  if (!UUID_RE.test(workspaceId)) {
    const { data: ws, error: wsErr } = await core
      .from("workspaces").select("id").eq("slug", workspaceId).maybeSingle();
    if (wsErr)  return jsonResp({ error: "erro ao resolver workspace", detail: wsErr.message }, 500);
    if (!ws)    return jsonResp({ error: `workspace não encontrado: ${workspaceId}` }, 404);
    workspaceId = ws.id;
  }

  // —— resolver/criar a pessoa canônica ——
  const { data: personId, error: rpcErr } = await core.rpc("resolve_person", {
    p_workspace: workspaceId,
    p_cpf:   cpf,
    p_phone: phone,
    p_email: email,
    p_name:  name,
    p_source: source,
  });
  if (rpcErr) {
    // CPF inválido cai aqui (raise exception no banco) → 422
    const invalid = /CPF inválido/i.test(rpcErr.message);
    return jsonResp({ error: "falha ao resolver pessoa", detail: rpcErr.message },
      invalid ? 422 : 500);
  }

  // —— registrar o evento ——
  const eventType = String(body.event_type ?? DEFAULT_EVENT_TYPE[source] ?? "lead_created");
  const { error: evErr } = await core.from("events").insert({
    workspace_id: workspaceId,
    person_id:    personId,
    source,
    type:         eventType,
    payload:      body.payload ?? {},
  });
  if (evErr) {
    // pessoa já resolvida; falha só no log → reporta mas não perde o lead
    return jsonResp({ person_id: personId, warning: "evento não registrado", detail: evErr.message }, 207);
  }

  return jsonResp({ person_id: personId, source, event_type: eventType });
});
