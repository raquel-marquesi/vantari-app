// ════════════════════════════════════════════════════════════════
// Edge Function: /conversation-takeover
// ────────────────────────────────────────────────────────────────
// Chamada pela tela /inbox do Next quando um atendente clica em
// "Assumir conversa", "Devolver pra Nina", "Encerrar conversa" ou
// "Reabrir". Faz duas coisas:
//
//   1. Atualiza core.conversations no PRÓPRIO banco do Next (com o
//      client autenticado do usuário — respeita RLS normalmente).
//   2. Avisa o backend da Nina (webhook /conversation-status) pra ela
//      também mudar o status do lado dela — é ESSE status que a Nina
//      consulta antes de responder no WhatsApp. Sem esse passo 2, a Nina
//      continuaria respondendo mesmo com a conversa "assumida"/"resolvida"
//      só visualmente no Next.
//
// 06/08/2026 — BUG CRÍTICO CORRIGIDO: até esta versão, o botão "Encerrar
// conversa" em /inbox fazia um UPDATE direto em core.conversations
// (archived_at) no FRONTEND, sem NUNCA chamar este endpoint — ou seja, a
// Nina nunca era avisada de que a conversa tinha sido encerrada e continuava
// respondendo no WhatsApp mesmo com o caso em "Resolvido" no Next. A sessão
// da Nina implementou um novo status "resolved" em /conversation-status
// (além de "human") e pediu que o Next passasse a chamá-lo ao encerrar.
// Agora as ações "resolve"/"reopen" passam por AQUI, então nenhum encerrar/
// reabrir escapa sem notificar a Nina.
//
//   - action "take":    status -> human    (Nina passa a ignorar essa conversa)
//   - action "release": status -> nina     (Nina volta a responder)
//   - action "resolve": archived_at = now(), avisa Nina status="resolved"
//                       (não mexe na coluna status — é ortogonal a human/nina)
//   - action "reopen":  archived_at = null, avisa Nina com o status ATUAL da
//                       coluna (human ou nina) — ela pode ter sido encerrada
//                       enquanto um humano ou a própria Nina estava com ela
//
// O passo 2 depende de duas secrets já configuradas em produção:
//   NINA_API_URL    — base URL do backend da Nina
//   NINA_API_SECRET — secret compartilhado (Nina expõe um endpoint que
//                     aceita { phone|cpf, external_conversation_id, status })
// Se essas secrets faltarem, a função aplica a mudança só no Next e devolve
// nina_synced:false com um aviso — não trava o atendente.
//
// Auth: JWT do usuário logado no Next (verify_jwt = true, padrão).
//
// Body: { "conversation_id": "<uuid>", "action": "take" | "release" | "resolve" | "reopen" }
// Resposta: { conversation_id, status, archived, nina_synced, warning? }
// ════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { toWhatsAppPhone, ninaCallWithPhoneRetry, healPhoneIfNeeded } from "../_shared/nina-phone.ts";

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
  if (!["take", "release", "resolve", "reopen"].includes(action)) {
    return jsonResp({ error: "action deve ser 'take', 'release', 'resolve' ou 'reopen'" }, 400);
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
    .select("id, workspace_id, person_id, external_conversation_id, status, archived_at")
    .eq("id", conversationId)
    .maybeSingle();
  if (convErr) return jsonResp({ error: "falha ao buscar conversa", detail: convErr.message }, 500);
  if (!conv)   return jsonResp({ error: "conversa não encontrada" }, 404);

  // "resolve"/"reopen" mexem em archived_at (aba Resolvido), não na coluna
  // status (human/nina) — são conceitos ortogonais. "take"/"release" mexem
  // só na coluna status.
  const isResolveAction = action === "resolve" || action === "reopen";
  const dbUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
  let statusForNina: string;

  if (action === "take") {
    dbUpdate.status = "human";
    dbUpdate.assigned_user_id = userId;
    statusForNina = "human";
  } else if (action === "release") {
    dbUpdate.status = "nina";
    dbUpdate.assigned_user_id = null;
    statusForNina = "nina";
  } else if (action === "resolve") {
    dbUpdate.archived_at = new Date().toISOString();
    statusForNina = "resolved";
  } else {
    // reopen: some da coluna archived_at; a Nina volta a obedecer o status
    // que já estava valendo (human ou nina) antes de ter sido encerrada
    dbUpdate.archived_at = null;
    statusForNina = conv.status || "nina";
  }

  const { error: updErr } = await core
    .from("conversations")
    .update(dbUpdate)
    .eq("id", conversationId);
  if (updErr) return jsonResp({ error: "falha ao atualizar conversa", detail: updErr.message }, 500);

  const responseBase = {
    conversation_id: conversationId,
    status: isResolveAction ? conv.status : statusForNina,
    archived: action === "resolve" ? true : action === "reopen" ? false : !!conv.archived_at,
  };

  if (!NINA_API_URL || !NINA_API_SECRET) {
    return jsonResp({
      ...responseBase,
      nina_synced: false,
      warning: "NINA_API_URL/NINA_API_SECRET ainda não configuradas — a mudança só foi aplicada no Next. A Nina pode continuar respondendo até isso ser configurado.",
    });
  }

  const { data: person } = await core
    .from("persons")
    .select("primary_phone, cpf")
    .eq("id", conv.person_id)
    .maybeSingle();

  const phoneOnFile = toWhatsAppPhone(person?.primary_phone);
  try {
    const result = await ninaCallWithPhoneRetry(`${NINA_API_URL}/conversation-status`, NINA_API_SECRET, {
      cpf: person?.cpf ?? null,
      external_conversation_id: conv.external_conversation_id,
      status: statusForNina,
    }, phoneOnFile);
    if (!result.ok) {
      return jsonResp({
        ...responseBase, nina_synced: false,
        warning: `Nina retornou erro (${result.status}) ao sincronizar status. Detalhe: ${result.detail}`,
      }, 207);
    }
    await healPhoneIfNeeded(core, conv.workspace_id, conv.person_id, phoneOnFile, result);
  } catch (e) {
    return jsonResp({
      ...responseBase, nina_synced: false,
      warning: `Não foi possível conectar ao backend da Nina: ${e.message}`,
    }, 207);
  }

  return jsonResp({ ...responseBase, nina_synced: true });
});
