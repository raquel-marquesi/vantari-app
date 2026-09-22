// ════════════════════════════════════════════════════════════════
// Edge Function: /track
// ────────────────────────────────────────────────────────────────
// Endpoint público que recebe pings do tracker.js instalado no site
// vantari.com.br. Cada ping registra uma page_visit.
//
// Acionado por:
//   • Snippet tracker.js em cada página
//   • Identificação por cookie (visitor_id) + opcional email/lead_id
//
// Body esperado (JSON):
// {
//   "url":         "vantari.com.br/post-x/",   // obrigatório
//   "referrer":    "...",
//   "visitor_id":  "v_abc123",                  // cookie 1ª-parte
//   "email":       "lead@x.com",                // opcional (vincula a lead)
//   "lead_id":     "uuid",                      // opcional (precedência)
//   "user_agent":  "...",
//   "utm_source":  "...", "utm_medium": "...",
//   "utm_campaign":"...", "utm_content":"...", "utm_term": "...",
//   "fbclid":      "...", "fbp": "...", "fbc": "...",  // Meta Pixel — 17/09
//   "duration_s":  42                           // opcional (heartbeat)
// }
// ════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Visitor-Id",
};

function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    return (u.hostname + u.pathname).replace(/\/$/, "") + (u.pathname === "/" ? "/" : "");
  } catch { return raw; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST")    return new Response("Method not allowed", { status: 405, headers: CORS });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  let body: any;
  try { body = await req.json(); }
  catch { return json({ error: "Invalid JSON" }, 400); }

  const url = body.url;
  if (!url) return json({ error: "url required" }, 400);

  const normalizedUrl = normalizeUrl(url);
  const path = (() => {
    try { return new URL(url.startsWith("http") ? url : `https://${url}`).pathname; }
    catch { return null; }
  })();

  // 1) Resolver lead — precedência: lead_id > email
  let leadId: string | null = body.lead_id || null;
  if (!leadId && body.email) {
    const { data: lead } = await supabase
      .from("leads")
      .select("id")
      .eq("email", String(body.email).trim().toLowerCase())
      .maybeSingle();
    leadId = lead?.id || null;
  }

  // 2) Resolver tracked_page (match por url normalizada)
  let trackedPageId: string | null = null;
  const { data: tp } = await supabase
    .from("tracked_pages")
    .select("id, popup_enabled, popup_form_slug, popup_trigger, popup_trigger_value, popup_frequency_days")
    .eq("url", normalizedUrl)
    .eq("active", true)
    .maybeSingle();
  trackedPageId = tp?.id || null;

  // 3) Inserir page_visit (trigger no Postgres adiciona lead_event automaticamente)
  const { error } = await supabase.from("page_visits").insert({
    lead_id:         leadId,
    tracked_page_id: trackedPageId,
    url:             normalizedUrl,
    path,
    referrer:        body.referrer || null,
    visitor_id:      body.visitor_id || req.headers.get("X-Visitor-Id") || null,
    user_agent:      body.user_agent || req.headers.get("User-Agent") || null,
    ip_country:      req.headers.get("CF-IPCountry") || null,
    utm_source:      body.utm_source   || null,
    utm_medium:      body.utm_medium   || null,
    utm_campaign:    body.utm_campaign || null,
    utm_content:     body.utm_content  || null,
    utm_term:        body.utm_term     || null,
    fbclid:          body.fbclid       || null,
    fbp:             body.fbp          || null,
    fbc:             body.fbc          || null,
    duration_s:      body.duration_s   || null,
  });

  if (error) return json({ error: error.message }, 500);

  // 4) Config do pop-up (Etapa 5) — só devolve quando a página rastreada
  // tem popup_enabled = true e um formulário associado. tracker.js decide
  // localmente (localStorage) se já mostrou pra esse visitante recentemente.
  const popup = (tp && tp.popup_enabled && tp.popup_form_slug)
    ? {
        page_id:        tp.id,
        form_slug:      tp.popup_form_slug,
        trigger:        tp.popup_trigger,
        trigger_value:  tp.popup_trigger_value,
        frequency_days: tp.popup_frequency_days,
      }
    : null;

  return json({
    ok: true,
    identified: !!leadId,
    tracked:    !!trackedPageId,
    popup,
  });
});

function json(payload: any, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" }
  });
}
