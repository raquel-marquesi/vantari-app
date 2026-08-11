// ════════════════════════════════════════════════════════════════
// Edge Function: /conversation-send
// ────────────────────────────────────────────────────────────────
// Chamada pela tela /inbox quando um atendente humano digita e envia uma
// mensagem. O Next NÃO tem acesso direto ao WhatsApp/Evolution API — quem
// despacha de fato é o backend da Nina. Por isso:
//
//   1. Chama o webhook de envio da Nina (NINA_API_URL + /send-message).
//   2. Só se a Nina confirmar o envio, grava a mensagem em core.messages
//      (sender='human') — assim o Next nunca mostra uma mensagem como
//      enviada se ela não foi de fato despachada.
//
// Exige que a conversa já esteja com status='human' (ou seja, alguém
// clicou em "Assumir conversa" antes) — evita atendente e Nina responderem
// ao mesmo tempo pro cliente.
//
// Depende das mesmas secrets do conversation-takeover:
//   NINA_API_URL, NINA_API_SECRET — enquanto não configuradas, retorna
//   501 e não fabrica uma mensagem "fantasma" no histórico.
//
// Auth: JWT do usuário logado no Next (verify_jwt = true, padrão).
//
// Body: { "conversation_id": "<uuid>", "body": "texto da mensagem" }
// Resposta: { message_id, conversation_id, created_at }
// ════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { toWhatsAppPhone, ninaCallWithPhoneRetry, healPhoneIfNeeded, logNinaFailure } from "../_shared/nina-phone.ts";

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
  const text = String(body.body ?? "").trim();
  if (!conversationId) return jsonResp({ error: "conversation_id obrigatório" }, 400);
  if (!text)           return jsonResp({ error: "body (texto da mensagem) obrigatório" }, 400);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return jsonResp({ error: "unauthorized" }, 401);

  const core = userClient.schema("core");

  const { data: conv, error: convErr } = await core
    .from("conversations")
    .select("id, workspace_id, person_id, external_conversation_id, status")
    .eq("id", conversationId)
    .maybeSingle();
  if (convErr) return jsonResp({ error: "falha ao buscar conversa", detail: convErr.message }, 500);
  if (!conv)   return jsonResp({ error: "conversa não encontrada" }, 404);
  if (conv.status !== "human") {
    return jsonResp({ error: "esta conversa não está com um humano — clique em Assumir conversa antes de enviar" }, 409);
  }

  if (!NINA_API_URL || !NINA_API_SECRET) {
    return jsonResp({
      error: "NINA_API_URL/NINA_API_SECRET ainda não configuradas — não é possível despachar a mensagem pelo WhatsApp ainda.",
    }, 501);
  }

  const { data: person } = await core
    .from("persons")
    .select("primary_phone, cpf")
    .eq("id", conv.person_id)
    .maybeSingle();

  const phoneOnFile = toWhatsAppPhone(person?.primary_phone);
  try {
    const result = await ninaCallWithPhoneRetry(`${NINA_API_URL}/send-message`, NINA_API_SECRET, {
      cpf: person?.cpf ?? null,
      external_conversation_id: conv.external_conversation_id,
      body: text,
      sender: "human",
    }, phoneOnFile);
    if (!result.ok) {
      await logNinaFailure(core, conv.workspace_id, conv.person_id, "send-message", result);
      return jsonResp({ error: `Nina retornou erro (${result.status}) ao despachar a mensagem`, detail: result.detail }, 502);
    }
    // autocura silenciosa: se o formato alternativo funcionou, corrige
    // primary_phone pra essa pessoa nunca mais cair nesse retry
    await healPhoneIfNeeded(core, conv.workspace_id, conv.person_id, phoneOnFile, result);
  } catch (e) {
    return jsonResp({ error: `Não foi possível conectar ao backend da Nina: ${e.message}` }, 502);
  }

  const nowIso = new Date().toISOString();
  const { data: msg, error: msgErr } = await core
    .from("messages")
    .insert({
      workspace_id: conv.workspace_id,
      conversation_id: conversationId,
      person_id: conv.person_id,
      direction: "out",
      sender: "human",
      body: text,
      created_at: nowIso,
    })
    .select("id, created_at")
    .single();
  if (msgErr) {
    // mensagem já foi despachada pro cliente pela Nina; só o registro local falhou
    return jsonResp({ warning: "mensagem enviada mas não registrada no histórico do Next", detail: msgErr.message }, 207);
  }

  await core
    .from("conversations")
    .update({ last_message_at: nowIso, last_message_body: text, last_message_sender: "human", updated_at: nowIso })
    .eq("id", conversationId);

  return jsonResp({ message_id: msg.id, conversation_id: conversationId, created_at: msg.created_at });
});
