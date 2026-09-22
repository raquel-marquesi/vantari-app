// ════════════════════════════════════════════════════════════════
// Edge Function: /push-subscribe
// ────────────────────────────────────────────────────────────────
// Endpoint público (igual /track) que recebe as inscrições de Web Push
// criadas por Vantari.enablePush() no tracker.js. Guarda em
// public.push_subscriptions — service role, nunca expõe a chave de
// serviço pro navegador (a anon key não teria permissão de INSERT
// nessa tabela, RLS é só pra authenticated).
//
// POST { endpoint, keys: { p256dh, auth }, visitor_id?, lead_id?, url? }
//   → upsert por endpoint (cada endpoint é único por navegador/dispositivo)
// DELETE { endpoint }
//   → marca active=false (chamado no unsubscribe / pushsubscriptionchange)
// ════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  let body: any;
  try { body = await req.json(); }
  catch { return jsonResp({ error: "Invalid JSON" }, 400); }

  const endpoint = body?.endpoint;
  if (!endpoint) return jsonResp({ error: "endpoint obrigatório" }, 400);

  if (req.method === "DELETE") {
    const { error } = await supabase.from("push_subscriptions")
      .update({ active: false, unsubscribed_at: new Date().toISOString() })
      .eq("endpoint", endpoint);
    if (error) return jsonResp({ error: error.message }, 500);
    return jsonResp({ ok: true });
  }

  if (req.method !== "POST") return jsonResp({ error: "Method not allowed" }, 405);

  const p256dh = body?.keys?.p256dh;
  const auth   = body?.keys?.auth;
  if (!p256dh || !auth) return jsonResp({ error: "keys.p256dh e keys.auth obrigatórios" }, 400);

  const { error } = await supabase.from("push_subscriptions").upsert({
    endpoint,
    p256dh,
    auth,
    visitor_id: body.visitor_id || null,
    lead_id:    body.lead_id || null,
    url:        body.url || null,
    user_agent: req.headers.get("User-Agent") || null,
    active:     true,
    unsubscribed_at: null,
  }, { onConflict: "endpoint" });

  if (error) return jsonResp({ error: error.message }, 500);
  return jsonResp({ ok: true });
});
