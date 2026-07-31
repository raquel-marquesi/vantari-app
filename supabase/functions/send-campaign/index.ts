// ════════════════════════════════════════════════════════════════
// Edge Function: /send-campaign
// ────────────────────────────────────────────────────────────────
// Dispara uma campanha de email via Resend.
//
// ⚠️ REESCRITA (jul/2026): a versão anterior buscava destinatários em
// public.leads (tabela legada, quase vazia em produção) e a campanha em
// public.campaigns — mas o frontend (/email) já migrou pra mkt.campaigns
// há tempo, e resolve os destinatários reais via core.persons no próprio
// front (src/segment-resolver.js), mandando a lista pronta no body como
// `recipients`. Ou seja: campanhas "por segmento" nunca alcançavam a base
// real, e o link "Descadastrar" nos templates apontava pra href="#" porque
// não existia rota/RPC de descadastro. Esta versão:
//   1. Lê a campanha de mkt.campaigns (schema correto).
//   2. Usa `recipients` do body (resolvidos no front) em vez de public.leads.
//   3. Filtra quem revogou consentimento de email (core.consents via
//      mkt.can_email) mesmo que o front já tenha filtrado — defesa em
//      profundidade.
//   4. Gera link de descadastro real: /unsubscribe?p=<person_id>&w=<workspace>
//      (a página pública chama core.set_email_consent).
//   5. Grava em mkt.campaign_sends (person_id, não lead_id) — só para
//      destinatários com person_id (vindos de segmento). Emails digitados
//      manualmente sem person_id são enviados mas não geram registro de
//      tracking (não existe pessoa no core pra associar).
//
// Body esperado:
// {
//   "campaign_id": "<uuid de mkt.campaigns>",
//   "test_email"?: "alguem@exemplo.com",             // envio de teste, não mexe em tracking/status
//   "recipients"?: [{ "person_id": "<uuid|null>", "email": "...", "name": "..." }]
// }
//
// Resposta: { sent, total, skipped_invalid, skipped_unsubscribed, test }
//
// Deploy: supabase functions deploy send-campaign
// ════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = Deno.env.get("PUBLIC_APP_URL") || "https://vantari-app.vercel.app";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Recipient = { person_id: string | null; email: string; name: string | null };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const { campaign_id, test_email, recipients: rawRecipients } = await req.json();
    if (!campaign_id) {
      return new Response(JSON.stringify({ error: "campaign_id obrigatório" }), { status: 400, headers: CORS });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const mkt = supabase.schema("mkt");

    /* ── fetch campaign (schema correto: mkt, não public) ── */
    const { data: campaign, error: campErr } = await mkt
      .from("campaigns")
      .select("id, workspace_id, name, subject, from_name, from_email, template_html, status")
      .eq("id", campaign_id)
      .single();

    if (campErr || !campaign) {
      return new Response(JSON.stringify({ error: "Campanha não encontrada" }), { status: 404, headers: CORS });
    }
    if (campaign.status === "sent" && !test_email) {
      return new Response(JSON.stringify({ error: "Campanha já foi enviada" }), { status: 400, headers: CORS });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY não configurada" }), { status: 500, headers: CORS });
    }
    const fromEmail = campaign.from_email || Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";
    const fromName  = campaign.from_name  || "Vantari";

    /* ── envio de teste: não mexe em status/tracking, não passa por consentimento ── */
    if (test_email) {
      const html = buildHtml(campaign.template_html, { name: "Teste", email: test_email }, campaign.name, null);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail}>`,
          to: [test_email],
          subject: campaign.subject || campaign.name,
          html,
        }),
      });
      if (!res.ok) {
        const errBody = await res.text();
        return new Response(JSON.stringify({ error: "Falha ao enviar teste", detail: errBody }), { status: 502, headers: CORS });
      }
      return new Response(JSON.stringify({ sent: 1, total: 1, test: true }), { headers: { ...CORS, "Content-Type": "application/json" } });
    }

    /* ── destinatários reais: SEMPRE vêm do body (resolvidos no front via core.persons) ── */
    const incoming: Recipient[] = Array.isArray(rawRecipients) ? rawRecipients : [];
    const seen = new Set<string>();
    let skippedInvalid = 0;
    let recipients: Recipient[] = [];
    for (const r of incoming) {
      const email = String(r?.email || "").trim();
      const key = email.toLowerCase();
      if (!email || !EMAIL_RE.test(email) || seen.has(key)) { if (email) skippedInvalid++; continue; }
      seen.add(key);
      recipients.push({ person_id: r?.person_id ?? null, email, name: r?.name ?? null });
    }

    if (recipients.length === 0) {
      return new Response(JSON.stringify({
        sent: 0, total: 0, skipped_invalid: skippedInvalid,
        error: "Nenhum destinatário válido informado. Selecione um segmento ou digite emails.",
      }), { status: 400, headers: CORS });
    }

    /* ── defesa em profundidade: exclui quem revogou consentimento de email,
       mesmo que o front já devesse ter filtrado (core.consents) ── */
    const personIds = recipients.map(r => r.person_id).filter((x): x is string => !!x);
    let revoked = new Set<string>();
    if (personIds.length) {
      const { data: consentRows } = await supabase
        .schema("core").from("consents")
        .select("person_id")
        .eq("channel", "email").eq("status", "revoked")
        .in("person_id", personIds);
      revoked = new Set((consentRows || []).map((c: any) => c.person_id));
    }
    const skippedUnsubscribed = recipients.filter(r => r.person_id && revoked.has(r.person_id)).length;
    recipients = recipients.filter(r => !(r.person_id && revoked.has(r.person_id)));

    if (recipients.length === 0) {
      return new Response(JSON.stringify({
        sent: 0, total: 0, skipped_invalid: skippedInvalid, skipped_unsubscribed: skippedUnsubscribed,
        error: "Todos os destinatários resolvidos já descadastraram email.",
      }), { status: 400, headers: CORS });
    }

    await mkt.from("campaigns").update({ status: "sending" }).eq("id", campaign_id);

    /* ── envio em lotes de 100 ── */
    const BATCH = 100;
    let sentCount = 0;
    const sendRecords: object[] = [];

    for (let i = 0; i < recipients.length; i += BATCH) {
      const batch = recipients.slice(i, i + BATCH);
      const emails = batch.map(r => ({
        from:    `${fromName} <${fromEmail}>`,
        to:      [r.email],
        subject: campaign.subject || campaign.name,
        html:    buildHtml(campaign.template_html, r, campaign.name, campaign.workspace_id),
      }));

      const res = await fetch("https://api.resend.com/emails/batch", {
        method:  "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body:    JSON.stringify(emails),
      });

      if (!res.ok) {
        const errBody = await res.text();
        console.error("Resend error:", errBody);
        batch.forEach(r => {
          if (r.person_id) {
            sendRecords.push({ workspace_id: campaign.workspace_id, campaign_id, person_id: r.person_id, status: "failed", error: errBody.slice(0, 500) });
          }
        });
      } else {
        sentCount += batch.length;
        batch.forEach(r => {
          if (r.person_id) {
            sendRecords.push({ workspace_id: campaign.workspace_id, campaign_id, person_id: r.person_id, status: "sent", sent_at: new Date().toISOString() });
          }
        });
      }
    }

    /* ── persist tracking (só quem tem person_id — mkt.campaign_sends.person_id é NOT NULL) ── */
    if (sendRecords.length > 0) {
      const { error: sendErr } = await mkt.from("campaign_sends").insert(sendRecords);
      if (sendErr) console.error("Falha ao gravar campaign_sends:", sendErr.message);
    }

    const finalStatus = sentCount > 0 ? "sent" : "failed";
    await mkt.from("campaigns").update({
      status: finalStatus,
      sent_at: sentCount > 0 ? new Date().toISOString() : null,
      audience_count: recipients.length,
    }).eq("id", campaign_id);

    return new Response(
      JSON.stringify({
        sent: sentCount,
        total: recipients.length,
        skipped_invalid: skippedInvalid,
        skipped_unsubscribed: skippedUnsubscribed,
        test: false,
      }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: CORS });
  }
});

/* ── HTML builder ── */
function buildHtml(
  templateHtml: string | null,
  recipient: { name: string | null; email: string; person_id?: string | null },
  campaignName: string,
  workspaceId: string | null
): string {
  const name = recipient.name || recipient.email;

  const body = templateHtml
    ? templateHtml
        .replace(/\{\{lead\.name\}\}/g,  name)
        .replace(/\{\{lead\.email\}\}/g, recipient.email)
    : `<p>Olá, ${name}!</p><p>${campaignName}</p>`;

  // link real de descadastro só existe pra quem tem person_id (veio de segmento
  // resolvido via core.persons) e workspace conhecido; senão, sem link clicável
  const unsubUrl = recipient.person_id && workspaceId
    ? `${APP_URL}/unsubscribe?p=${recipient.person_id}&w=${workspaceId}`
    : null;
  const unsubLine = unsubUrl
    ? `<a href="${unsubUrl}" style="color:#0079a9;text-decoration:none;">Descadastrar</a>`
    : `Para se descadastrar, responda este email.`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${campaignName}</title>
</head>
<body style="margin:0;padding:0;background:#f2f5f8;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0"
             style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <tr><td>${body}</td></tr>
        <tr>
          <td style="padding:20px 40px;background:#f8fafc;text-align:center;border-top:1px solid #e8edf2;">
            <p style="margin:0;font-size:11px;color:#888891;">
              © 2026 Vantari · Você está recebendo este email porque se cadastrou em nossa plataforma.<br/>
              ${unsubLine}
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
