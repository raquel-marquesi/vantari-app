import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ════════════════════════════════════════════════════════════════
// Edge Function: /send-campaign  (core/mkt)
// ────────────────────────────────────────────────────────────────
// Envia uma campanha de mkt.campaigns via Resend.
//
// Destinatários (jeito A): a TELA resolve o segmento e manda a lista pronta
// em `recipients: [{ person_id, email, name }]`. Esta função reverifica o
// descadastro em core.consents (rede de segurança) antes de disparar e grava
// os envios em mkt.campaign_sends.
//
// Body: { campaign_id, recipients?: [{person_id,email,name}], test_email? }
//   - test_email → manda 1 email de teste, não grava campaign_sends
//   - recipients → envio real pro segmento escolhido
// ════════════════════════════════════════════════════════════════

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Recipient = { person_id: string; email: string; name: string | null };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { campaign_id, test_email, recipients } = await req.json();
    if (!campaign_id) {
      return new Response(JSON.stringify({ error: "campaign_id obrigatório" }), { status: 400, headers: CORS });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const mkt  = supabase.schema("mkt");
    const core = supabase.schema("core");

    /* ── campanha (mkt.campaigns) ── */
    const { data: campaign, error: campErr } = await mkt
      .from("campaigns")
      .select("id, workspace_id, name, subject, template_html, from_name, from_email, status")
      .eq("id", campaign_id)
      .single();

    if (campErr || !campaign) {
      return new Response(JSON.stringify({ error: "Campanha não encontrada" }), { status: 404, headers: CORS });
    }
    if (campaign.status === "sent" && !test_email) {
      return new Response(JSON.stringify({ error: "Campanha já foi enviada" }), { status: 400, headers: CORS });
    }

    /* ── destinatários ── */
    let list: Recipient[];
    if (test_email) {
      list = [{ person_id: "test", email: test_email, name: "Teste" }];
    } else {
      list = (Array.isArray(recipients) ? recipients : [])
        .filter((r: Recipient) => r && !!r.email);

      // rede de segurança: descarta quem revogou consent de email (core.consents)
      const { data: revoked } = await core
        .from("consents").select("person_id").eq("channel", "email").eq("status", "revoked");
      const blocked = new Set((revoked || []).map((c: { person_id: string }) => c.person_id));
      list = list.filter(r => !blocked.has(r.person_id));
    }

    if (list.length === 0) {
      if (!test_email) await mkt.from("campaigns").update({ status: "draft" }).eq("id", campaign_id);
      return new Response(JSON.stringify({ sent: 0, total: 0, error: "Nenhum destinatário válido" }), { headers: CORS });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      if (!test_email) await mkt.from("campaigns").update({ status: "failed" }).eq("id", campaign_id);
      return new Response(JSON.stringify({ error: "RESEND_API_KEY não configurada" }), { status: 500, headers: CORS });
    }

    if (!test_email) await mkt.from("campaigns").update({ status: "sending" }).eq("id", campaign_id);

    const fromEmail = campaign.from_email || Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";
    const fromName  = campaign.from_name  || "Vantari";

    /* ── envia em lotes de 100 ── */
    const BATCH = 100;
    let sentCount = 0;
    const sendRecords: object[] = [];
    const now = () => new Date().toISOString();

    for (let i = 0; i < list.length; i += BATCH) {
      const batch = list.slice(i, i + BATCH);
      const emails = batch.map(r => ({
        from:    `${fromName} <${fromEmail}>`,
        to:      [r.email],
        subject: campaign.subject || campaign.name,
        html:    buildHtml(campaign.template_html, r, campaign.name),
      }));

      const res = await fetch("https://api.resend.com/emails/batch", {
        method:  "POST",
        headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body:    JSON.stringify(emails),
      });

      if (!res.ok) {
        console.error("Resend error:", await res.text());
      } else {
        sentCount += batch.length;
        if (!test_email) {
          sendRecords.push(...batch.map(r => ({
            workspace_id: campaign.workspace_id,
            campaign_id,
            person_id:    r.person_id,
            status:       "sent",
            sent_at:      now(),
          })));
        }
      }
    }

    /* ── grava envios (mkt.campaign_sends) ── */
    if (sendRecords.length > 0) {
      await mkt.from("campaign_sends").upsert(sendRecords, { onConflict: "campaign_id,person_id" });
    }

    /* ── status final ── */
    if (!test_email) {
      await mkt.from("campaigns").update({
        status: sentCount > 0 ? "sent" : "failed",
        sent_at: sentCount > 0 ? now() : null,
      }).eq("id", campaign_id);
    }

    return new Response(
      JSON.stringify({ sent: sentCount, total: list.length, test: !!test_email }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: CORS });
  }
});

/* ── HTML builder ── */
function buildHtml(
  htmlContent: string | null,
  r: { name: string | null; email: string },
  campaignName: string
): string {
  const name = r.name || r.email;
  const body = htmlContent
    ? htmlContent
        .replace(/\{\{lead\.name\}\}/g,  name)
        .replace(/\{\{lead\.email\}\}/g, r.email)
    : `<p>Olá, ${name}!</p><p>${campaignName}</p>`;

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
              © 2025 Vantari · Você está recebendo este email porque se cadastrou em nossa plataforma.<br/>
              <a href="#" style="color:#0079a9;text-decoration:none;">Descadastrar</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
