// ════════════════════════════════════════════════════════════════
// Edge Function: /verify-captcha
// ────────────────────────────────────────────────────────────────
// Verifica um token de hCaptcha (invisible) server-side, antes do
// formulário público (/f/:slug) aceitar a submissão. O segredo do
// hCaptcha nunca pode ficar no browser — por isso essa checagem
// precisa ser uma function, não uma checagem só no cliente.
//
// Body esperado: { "token": "<resposta do hcaptcha.execute()>" }
// Resposta:      { "success": true|false }
//
// Secret: por padrão usa a chave de TESTE oficial do hCaptcha
// (0x0000000000000000000000000000000000000000), que sempre aprova —
// serve só para desenvolvimento. Antes de publicar de verdade, criar
// conta em https://dashboard.hcaptcha.com, cadastrar o domínio e rodar:
//   supabase secrets set HCAPTCHA_SECRET=<secret key real>
//
// Deploy: supabase functions deploy verify-captcha
// ════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const SECRET = Deno.env.get("HCAPTCHA_SECRET") ?? "0x0000000000000000000000000000000000000000";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return jsonResp({ success: false, error: "Method not allowed" }, 405);

  let body: any;
  try { body = await req.json(); }
  catch { return jsonResp({ success: false, error: "Invalid JSON" }, 400); }

  const token = body?.token;
  if (!token) return jsonResp({ success: false, error: "token obrigatório" }, 400);

  try {
    const form = new URLSearchParams();
    form.set("secret", SECRET);
    form.set("response", String(token));

    const r = await fetch("https://hcaptcha.com/siteverify", { method: "POST", body: form });
    const data = await r.json();

    return jsonResp({ success: !!data.success }, data.success ? 200 : 403);
  } catch (err) {
    return jsonResp({ success: false, error: "falha ao verificar com o hCaptcha", detail: String(err) }, 502);
  }
});
