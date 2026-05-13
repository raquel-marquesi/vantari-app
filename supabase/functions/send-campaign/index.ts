import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const { campaign_id, test_email } = await req.json();
    if (!campaign_id) {
      return new Response(JSON.stringify({ error: "campaign_id obrigatório" }), { status: 400, headers: CORS });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    /* ── fetch campaign ── */
    const { data: campaign, error: campErr } = await supabase
      .from("campaigns")
      .select("id, name, subject, sender, html_content, from_name, from_email, status")
      .eq("id", campaign_id)
      .single();

    if (campErr || !campaign) {
      return new Response(JSON.stringify({ error: "Campanha não encontrada" }), { status: 404, headers: CORS });
    }
    if (campaign.status === "sent" && !test_email) {
      return new Response(JSON.stringify({ error: "Campanha já foi enviada" }), { status: 400, headers: CORS });
    }

    /* ── set status to sending ── */
    if (!test_email) {
      await supabase.from("campaigns").update({ status: "sending" }).eq("id", campaign_id);
    }

    /* ── fetch recipients ── */
    let leads: Array<{ id: string; email: string; name: string | null; company: string | null }>;
    if (test_email) {
      leads = [{ id: "test", email: test_email, name: "Teste", company: null }];
    } else {
      const { data } = await supabase
        .from("leads")
        .select("id, email, name, company")
        .eq("unsubscribed", false)
        .not("email", "is", null);
      leads = (data || []).filter(l => !!l.email);
    }

    if (leads.length === 0) {
      await supabase.from("campaigns").update({ status: "draft" }).eq("id", campaign_id);
      return new Response(JSON.stringify({ sent: 0, error: "Nenhum lead ativo encontrado" }), { headers: CORS });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      await supabase.from("campaigns").update({ status: "failed" }).eq("id", campaign_id);
      return new Response(JSON.stringify({ error: "RESEND_API_KEY não configurada" }), { status: 500, headers: CORS });
    }

    const fromEmail = campaign.from_email || Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";
    const fromName  = campaign.from_name  || campaign.sender || "Vantari";

    /* ── send in batches of 100 ── */
    const BATCH = 100;
    let sentCount = 0;
    const sendRecords: object[] = [];

    for (let i = 0; i < leads.length; i += BATCH) {
      const batch = leads.slice(i, i + BATCH);
      const emails = batch.map(lead => ({
        from:    `${fromName} <${fromEmail}>`,
        to:      [lead.email],
        subject: campaign.subject || campaign.name,
        html:    buildHtml(campaign.html_content, lead, campaign.name),
      }));

      const res = await fetch("https://api.resend.com/emails/batch", {
        method:  "POST",
        headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body:    JSON.stringify(emails),
      });

      if (!res.ok) {
        const errBody = await res.text();
        console.error("Resend error:", errBody);
        /* continue with remaining batches even if one fails */
      } else {
        sentCount += batch.length;
        if (!test_email) {
          sendRecords.push(...batch.map(lead => ({
            campaign_id,
            lead_id:      lead.id,
            sent_at:      new Date().toISOString(),
            delivered:    true,
            opened:       false,
            clicked:      false,
            bounced:      false,
            unsubscribed: false,
          })));
        }
      }
    }

    /* ── persist send records ── */
    if (sendRecords.length > 0) {
      await supabase.from("campaign_sends").insert(sendRecords);
    }

    /* ── final status ── */
    if (!test_email) {
      const finalStatus = sentCount > 0 ? "sent" : "failed";
      await supabase.from("campaigns").update({ status: finalStatus }).eq("id", campaign_id);
    }

    return new Response(
      JSON.stringify({ sent: sentCount, total: leads.length, test: !!test_email }),
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
  lead: { name: string | null; email: string; company: string | null },
  campaignName: string
): string {
  const name    = lead.name    || lead.email;
  const company = lead.company || "";

  const body = htmlContent
    ? htmlContent
        .replace(/\{\{lead\.name\}\}/g,    name)
        .replace(/\{\{lead\.company\}\}/g, company)
        .replace(/\{\{lead\.email\}\}/g,   lead.email)
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
