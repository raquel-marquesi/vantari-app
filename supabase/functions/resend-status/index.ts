// ════════════════════════════════════════════════════════════════
// Edge Function: /resend-status
// ────────────────────────────────────────────────────────────────
// Ferramenta de diagnóstico: consulta a API da Resend (domínios +
// verificação DNS) pra responder "está tudo pronto pra mandar campanha
// de email?" sem a Catarina precisar caçar isso no painel da Resend.
// Nunca devolve a RESEND_API_KEY em si — só o que a Resend informa
// sobre os domínios cadastrados (nome, status, região, registros DNS).
//
// Auth: mesmo padrão do sync-meta-leads/send-meta-capi — Authorization
// Bearer com a anon key (satisfaz verify_jwt=true da plataforma) +
// header X-Diag-Secret == secrets.DIAG_SECRET (chamada de diagnóstico
// pontual, não é uma rota pensada pro frontend usar).
// ════════════════════════════════════════════════════════════════

const DIAG_SECRET = Deno.env.get("DIAG_SECRET") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-diag-secret",
};

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  if (!DIAG_SECRET || req.headers.get("X-Diag-Secret") !== DIAG_SECRET) {
    return jsonResp({ error: "unauthorized" }, 401);
  }
  if (!RESEND_API_KEY) {
    return jsonResp({ error: "RESEND_API_KEY não configurada" }, 500);
  }

  const res = await fetch("https://api.resend.com/domains", {
    headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return jsonResp({ error: "Falha ao consultar a Resend", status: res.status, detail: body }, 502);
  }

  const domains = (body?.data ?? []).map((d: any) => ({
    name: d.name,
    status: d.status,          // "verified" | "pending" | "failed" | "not_started" ...
    region: d.region,
    created_at: d.created_at,
  }));

  return jsonResp({ domains, total: domains.length });
});
