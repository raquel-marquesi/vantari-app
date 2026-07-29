// ════════════════════════════════════════════════════════════════
// Edge Function: /conversation-takeover
// ────────────────────────────────────────────────────────────────
// Chamada pela tela /inbox do Next quando um atendente clica em
// "Assumir conversa" ou "Devolver pra Nina". Faz duas coisas:
//
//   1. Atualiza core.conversations.status no PRÓPRIO banco do Next
//      (com o client autenticado do usuário — respeita RLS normalmente).
//   2. Avisa o backend da Nina (webhook) pra ela também mudar o status
//      do lado dela — é ESSE status que a Nina consulta antes de
//      responder no WhatsApp. Sem esse passo 2, a Nina continuaria
//      respondendo mesmo com o humano "assumindo" só visualmente no Next.
//
// O passo 2 depende de duas secrets ainda não configuradas em produção:
//   NINA_API_URL    — base URL do backend da Nina
//   NINA_API_SECRET — secret compartilhado (Nina expõe um endpoint que
//                     aceita { phone|cpf, external_conversation_id, status })
// Enquanto essas secrets não existirem, a função aplica a mudança só no
// Next e devolve nina_synced:false com um aviso — não trava o atendente.
//
// Auth: JWT do usuário logado no Next (verify_jwt = true, padrão).
//
// Body: { "conversation_id": "<uuid>", "action": "take" | "release" }
// Resposta: { conversation_id, status, nina_synced, warning? }
// ════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY")!;
const NINA_API_URL    = Deno.env.get("NINA_API_URL") ?? "";
const NINA_API_SECRET = Deno.env.get("NINA_API_SECRET") ?? "";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST")    return jsonResp({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResp({ error: "unauthorized" }, 401);

  let body: any;
  try { body = await req.json(); }
  catch { return jsonResp({ error: "Invalid JSON" }, 400); }

  const conversationId = body.conversation_id;
  const action = body.action;
  if (!conversationId) return jsonResp({ error: "conversation_id obrigatório" }, 400);
  if (!["take", "release"].includes(action)) {
    return jsonResp({ error: "action deve ser 'take' ou 'release'" }, 400);
  }

  // client autenticado como o usuário chamador — respeita a RLS de
  // core.conversations (só enxerga/edita conversas do workspace dele)
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return jsonResp({ error: "unauthorized" }, 401);
  const userId = userData.user.id;

  const core = userClient.schema("core");

  const { data: conv, error: convErr } = await core
    .from("conversations")
    .select("id, workspace_id, person_id, external_conversation_id, status")
    .eq("id", conversationId)
    .maybeSingle();
  if (convErr) return jsonResp({ error: "falha ao buscar conversa", detail: convErr.message }, 500);
  if (!conv)   return jsonResp({ error: "conversa não encontrada" }, 404);

  const newStatus = action === "take" ? "human" : "nina";
  const { error: updErr } = await core
    .from("conversations")
    .update({ status: newStatus, assigned_user_id: action === "take" ? userId : null, updated_at: new Date().toISOString() })
    .eq("id", conversationId);
  if (updErr) return jsonResp({ error: "falha ao atualizar conversa", detail: updErr.message }, 500);

  if (!NINA_API_URL || !NINA_API_SECRET) {
    return jsonResp({
      conversation_id: conversationId,
      status: newStatus,
      nina_synced: false,
      warning: "NINA_API_URL/NINA_API_SECRET ainda não configuradas — a mudança só foi aplicada no Next. A Nina pode continuar respondendo até isso ser configurado.",
    });
  }

  const { data: person } = await core
    .from("persons")
    .select("primary_phone, cpf")
    .eq("id", conv.person_id)
    .maybeSingle();

  try {
    const ninaRes = await fetch(`${NINA_API_URL}/conversation-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Nina-Secret": NINA_API_SECRET },
      body: JSON.stringify({
        phone: person?.primary_phone ?? null,
        cpf: person?.cpf ?? null,
        external_conversation_id: conv.external_conversation_id,
        status: newStatus,
      }),
    });
    if (!ninaRes.ok) {
      const detail = await ninaRes.text().catch(() => "");
      return jsonResp({
        conversation_id: conversationId, status: newStatus, nina_synced: false,
        warning: `Nina retornou erro (${ninaRes.status}) ao sincronizar status. Detalhe: ${detail}`,
      }, 207);
    }
  } catch (e) {
    return jsonResp({
      conversation_id: conversationId, status: newStatus, nina_synced: false,
      warning: `Não foi possível conectar ao backend da Nina: ${e.message}`,
    }, 207);
  }

  return jsonResp({ conversation_id: conversationId, status: newStatus, nina_synced: true });
});
