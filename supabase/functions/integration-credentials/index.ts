// ════════════════════════════════════════════════════════════════
// Edge Function: /integration-credentials
// ────────────────────────────────────────────────────────────────
// Ponte segura entre a tela /integrations e a tabela
// public.integration_credentials. Desde a migration de hardening de
// RLS (20260623000003_rls_hardening.sql), essa tabela só é acessível
// por service_role — de propósito, porque guarda client_secret e
// access_token/refresh_token em texto puro. O front antes lia/escrevia
// direto via supabase.from("integration_credentials"), o que parou de
// funcionar (nenhuma policy pra "authenticated") e nunca foi corrigido.
//
// Esta função substitui esse acesso direto: confere que quem chamou é
// um usuário autenticado do Next, e só ela (com a service role key)
// fala com a tabela. Os segredos (client_secret, access_token,
// refresh_token) NUNCA voltam pro navegador — só booleans (has_*) e
// metadados não-sensíveis (status, account_id, last_sync, expires_at,
// scope, error_message).
//
// Auth: JWT do usuário logado no Next (verify_jwt = true, padrão).
//
// Body: { "action": "status" | "save" | "disconnect", "provider": "meta" | "google",
//          "client_id"?, "client_secret"?, "account_id"? }   // usados só em "save"
// Resposta ("status"/"save"): { provider, status, account_id, has_client_id,
//   has_client_secret, scope, last_sync, expires_at, error_message }
// ════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY      = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

const PROVIDERS = ["meta", "google"];

function mask(row: any, provider: string) {
  return {
    provider,
    status:            row?.status || "disconnected",
    account_id:        row?.account_id || null,
    // client_id (App ID) não é segredo — o próprio Meta/Google o expõem
    // publicamente na URL de login. Só client_secret nunca sai daqui.
    client_id:         row?.client_id || null,
    has_client_secret: !!row?.client_secret,
    scope:             row?.scope || null,
    last_sync:         row?.last_sync || null,
    expires_at:        row?.expires_at || null,
    error_message:     row?.error_message || null,
    // config não é sensível (ex: form_ids do Meta Lead Ads a sincronizar).
    config:            row?.config || {},
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST")    return jsonResp({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResp({ error: "unauthorized" }, 401);

  // Confere que quem chamou é um usuário de verdade logado no Next —
  // não usa esse client pra tocar na tabela (RLS bloquearia mesmo),
  // é só a checagem de identidade.
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return jsonResp({ error: "unauthorized" }, 401);

  let body: any;
  try { body = await req.json(); }
  catch { return jsonResp({ error: "Invalid JSON" }, 400); }

  const { action, provider } = body;
  if (!PROVIDERS.includes(provider)) {
    return jsonResp({ error: "provider deve ser 'meta' ou 'google'" }, 400);
  }
  if (!["status", "save", "disconnect"].includes(action)) {
    return jsonResp({ error: "action deve ser 'status', 'save' ou 'disconnect'" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  if (action === "status") {
    const { data, error } = await admin
      .from("integration_credentials")
      .select("status, account_id, client_id, client_secret, scope, last_sync, expires_at, error_message, config")
      .eq("provider", provider)
      .maybeSingle();
    if (error) return jsonResp({ error: error.message }, 500);
    return jsonResp(mask(data, provider));
  }

  if (action === "save") {
    // client_secret só é sobrescrito se vier um valor novo — assim o front
    // não precisa (e não deveria) reenviar o segredo já salvo de volta.
    const patch: Record<string, unknown> = { provider };
    if (typeof body.client_id === "string")  patch.client_id  = body.client_id.trim() || null;
    if (typeof body.client_secret === "string" && body.client_secret.trim()) patch.client_secret = body.client_secret.trim();
    if (typeof body.account_id === "string") patch.account_id = body.account_id.trim() || null;

    const { data: existing } = await admin
      .from("integration_credentials")
      .select("status, client_id, client_secret, config")
      .eq("provider", provider)
      .maybeSingle();

    // form_ids (config.form_ids): lista de formulários de Lead Ads a sincronizar.
    // Mescla com o config existente em vez de substituir tudo, pra não perder
    // outras chaves que possam existir ali no futuro.
    if (Array.isArray(body.form_ids)) {
      patch.config = { ...(existing?.config || {}), form_ids: body.form_ids };
    }

    const hasId     = patch.client_id     !== undefined ? !!patch.client_id     : !!existing?.client_id;
    const hasSecret = patch.client_secret !== undefined ? !!patch.client_secret : !!existing?.client_secret;
    if (existing?.status !== "connected") {
      patch.status = hasId && hasSecret ? "pending" : "disconnected";
    }

    const { data, error } = await admin
      .from("integration_credentials")
      .upsert(patch, { onConflict: "provider" })
      .select("status, account_id, client_id, client_secret, scope, last_sync, expires_at, error_message, config")
      .single();
    if (error) return jsonResp({ error: error.message }, 500);
    return jsonResp(mask(data, provider));
  }

  // disconnect
  const { data, error } = await admin
    .from("integration_credentials")
    .update({ status: "disconnected", access_token: null, refresh_token: null, expires_at: null })
    .eq("provider", provider)
    .select("status, account_id, client_id, client_secret, scope, last_sync, expires_at, error_message, config")
    .single();
  if (error) return jsonResp({ error: error.message }, 500);
  return jsonResp(mask(data, provider));
});
