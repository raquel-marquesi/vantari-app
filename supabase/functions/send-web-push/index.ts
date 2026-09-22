// ════════════════════════════════════════════════════════════════
// Edge Function: /send-web-push
// ────────────────────────────────────────────────────────────────
// Dispara uma notificação Web Push pra todos os inscritos ativos em
// public.push_subscriptions (capturados por Vantari.enablePush() no
// tracker.js). Usa a lib `web-push` (protocolo VAPID + criptografia
// aes128gcm) via npm: — Edge Functions do Supabase suportam NPM
// nativamente (Deno).
//
// Auth: usuário logado do app (verify_jwt = true, padrão) — ação
// administrativa, sem chamada por cron.
//
// Configuração (Supabase secrets, nenhuma em texto puro no código):
//   VAPID_PUBLIC_KEY  — mesma chave pública embutida em tracker.js
//   VAPID_PRIVATE_KEY — NUNCA vai pro frontend nem pro git
//   VAPID_SUBJECT     — mailto: ou https:// exigido pelo protocolo VAPID
//
// Body: { "title": "...", "body": "...", "url"?: "https://..." }
// Resposta: { sent, failed, deactivated }
//
// Cada falha de envio é isolada (Promise.allSettled) — uma inscrição
// expirada (410 Gone / 404) é marcada active=false automaticamente
// (limpeza natural da base, sem job separado); outros erros só contam
// como "failed" e não derrubam o restante do disparo.
// ════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const VAPID_PUBLIC_KEY  = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT     = Deno.env.get("VAPID_SUBJECT") ?? "";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return jsonResp({ error: "unauthorized" }, 401);

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
    return jsonResp({ error: "VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/VAPID_SUBJECT não configurados (supabase secrets set)" }, 400);
  }

  let body: any;
  try { body = await req.json(); } catch { return jsonResp({ error: "Invalid JSON" }, 400); }
  const title = String(body?.title || "").trim();
  const text  = String(body?.body || "").trim();
  if (!title || !text) return jsonResp({ error: "title e body obrigatórios" }, 400);
  const url = body?.url ? String(body.url) : "/";

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: subs, error: subsErr } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("active", true);
  if (subsErr) return jsonResp({ error: subsErr.message }, 500);

  if (!subs || subs.length === 0) {
    return jsonResp({ sent: 0, failed: 0, deactivated: 0, detail: "nenhum inscrito ativo" });
  }

  const payload = JSON.stringify({ title, body: text, url });
  const toDeactivate: string[] = [];
  let sent = 0, failed = 0;

  const results = await Promise.allSettled(subs.map((s) =>
    webpush.sendNotification(
      { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
      payload,
    ).then(() => s.id)
  ));

  results.forEach((r, i) => {
    if (r.status === "fulfilled") { sent++; return; }
    failed++;
    const statusCode = (r.reason as any)?.statusCode;
    // 404/410 = inscrição não existe mais no lado do navegador (usuário
    // desinstalou, limpou dados, revogou permissão) — nunca vai funcionar
    // de novo, então desativa pra não tentar pra sempre.
    if (statusCode === 404 || statusCode === 410) toDeactivate.push(subs[i].id);
  });

  if (toDeactivate.length) {
    await admin.from("push_subscriptions")
      .update({ active: false, unsubscribed_at: new Date().toISOString() })
      .in("id", toDeactivate);
  }

  return jsonResp({ sent, failed, deactivated: toDeactivate.length });
});
