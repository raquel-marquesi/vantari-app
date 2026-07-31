// ════════════════════════════════════════════════════════════════
// Edge Function: /resend-webhook
// ────────────────────────────────────────────────────────────────
// Recebe eventos assíncronos do Resend (bounce, spam complaint, open,
// click) e atualiza mkt.campaign_sends — hoje nada populava isso, então
// bounces nunca eram registrados nem excluídos de envios futuros.
//
// Segurança: Resend assina o payload via Svix (não é JWT do Supabase, por
// isso verify_jwt:false — a autenticação é a verificação de assinatura
// abaixo, não o header Authorization).
//
// Setup (Catarina, uma vez só):
//   1. supabase secrets set RESEND_WEBHOOK_SECRET=whsec_...
//      (pegar em resend.com/webhooks ao criar o endpoint)
//   2. No painel do Resend → Webhooks → Add Endpoint:
//      URL: https://ejhrlrasepowdcdnggmv.supabase.co/functions/v1/resend-webhook
//      Eventos: email.bounced, email.complained, email.opened, email.clicked
//
// Efeitos por tipo de evento:
//   email.bounced     → campaign_sends.status = 'bounced' + error
//   email.complained  → campaign_sends.status = 'bounced' (motivo: reclamação
//                        de spam) + REVOGA consentimento de email automaticamente
//                        (core.consents) — reclamação de spam tem que parar
//                        de receber, sem exigir descadastro manual
//   email.opened      → opened_at (só se ainda não tiver sido marcado)
//   email.clicked     → clicked_at (idem) + status 'clicked' se ainda 'sent'/'opened'
//   outros tipos       → ignorados (200 OK, sem ação)
// ════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Webhook } from "https://esm.sh/svix@1.24.0";

const RESEND_WEBHOOK_SECRET = Deno.env.get("RESEND_WEBHOOK_SECRET") ?? "";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const payload = await req.text();

  // ── verifica assinatura Svix (Resend usa Svix pra assinar webhooks) ──
  if (!RESEND_WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: "RESEND_WEBHOOK_SECRET não configurada" }), { status: 500 });
  }
  const svixHeaders = {
    "svix-id":        req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  };
  let event: any;
  try {
    const wh = new Webhook(RESEND_WEBHOOK_SECRET);
    event = wh.verify(payload, svixHeaders);
  } catch (err) {
    console.error("Assinatura de webhook inválida:", err);
    return new Response(JSON.stringify({ error: "assinatura inválida" }), { status: 401 });
  }

  const type: string = event?.type ?? "";
  const emailId: string | undefined = event?.data?.email_id ?? event?.data?.id;

  if (!emailId) {
    return new Response(JSON.stringify({ ok: true, ignored: "sem email_id" }), { status: 200 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  const mkt = supabase.schema("mkt");

  try {
    // acha o registro de envio correspondente (guardado pelo send-campaign)
    const { data: sendRow } = await mkt
      .from("campaign_sends")
      .select("id, person_id, workspace_id, status")
      .eq("resend_email_id", emailId)
      .maybeSingle();

    if (!sendRow) {
      return new Response(JSON.stringify({ ok: true, ignored: "envio não encontrado" }), { status: 200 });
    }

    if (type === "email.bounced") {
      await mkt.from("campaign_sends").update({
        status: "bounced",
        error: event?.data?.bounce?.message || event?.data?.reason || "bounce",
      }).eq("id", sendRow.id);

    } else if (type === "email.complained") {
      await mkt.from("campaign_sends").update({
        status: "bounced",
        error: "reclamação de spam (complaint)",
      }).eq("id", sendRow.id);

      // reclamação de spam revoga consentimento automaticamente — não faz
      // sentido exigir que a pessoa também clique em "descadastrar"
      if (sendRow.person_id) {
        await supabase.schema("core").rpc("set_email_consent", {
          p_workspace: sendRow.workspace_id,
          p_person:    sendRow.person_id,
          p_source:    "resend_complaint",
        });
      }

    } else if (type === "email.opened") {
      if (sendRow.status === "sent") {
        await mkt.from("campaign_sends").update({ status: "opened", opened_at: new Date().toISOString() }).eq("id", sendRow.id);
      } else {
        // já bounced/clicked/etc — só registra o timestamp de abertura sem regredir status
        await mkt.from("campaign_sends").update({ opened_at: new Date().toISOString() }).eq("id", sendRow.id);
      }

    } else if (type === "email.clicked") {
      const nextStatus = ["sent", "opened"].includes(sendRow.status) ? "clicked" : sendRow.status;
      await mkt.from("campaign_sends").update({ status: nextStatus, clicked_at: new Date().toISOString() }).eq("id", sendRow.id);
    }
    // outros tipos (delivered, delivery_delayed, sent): sem coluna própria, ignorados

    return new Response(JSON.stringify({ ok: true, type }), { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Erro processando webhook Resend:", msg);
    // 200 mesmo em erro interno — não queremos que o Resend fique reenviando
    // o mesmo evento indefinidamente por causa de um bug do nosso lado
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 200 });
  }
});
