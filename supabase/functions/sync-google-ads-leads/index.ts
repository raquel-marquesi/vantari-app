// ════════════════════════════════════════════════════════════════
// Edge Function: /sync-google-ads-leads
// ────────────────────────────────────────────────────────────────
// Prioridade 7b do plano de unificação de leads (site / Google Ads /
// WhatsApp). Até 2026-08-27 não existia NENHUMA ingestão do Lead Form
// nativo do Google Ads — a tela /integrations → Google Ads era 100%
// mock (ver PreviewBanner em vantari-integrations-hub.jsx). Esta
// função fecha isso, no mesmo padrão do /sync-meta-leads que já
// funciona em produção: PULL (não webhook — evita a burocracia de App
// Review que o Meta tem pra leadgen webhooks), chamado pelo botão
// "Sincronizar Agora" em /integrations, reaproveitando as mesmas RPCs
// que /ingest usa (core.resolve_person, crm.ingest_processo_lead)
// direto, sem round-trip HTTP.
//
// ⚠️ NÃO TESTADO CONTRA UMA CONTA REAL — não há Google Ads conectado
// nem Developer Token aprovado neste workspace ainda (ver
// docs/INTEGRATIONS.md, seção 4.3). O shape da Google Ads API abaixo
// segue a documentação oficial (GAQL sobre lead_form_submission_data),
// mas precisa de um teste ponta-a-ponta assim que houver uma conta
// real + Developer Token pra validar nomes de campo e paginação.
//
// Auth: JWT do usuário logado no Next (verify_jwt = true, padrão).
//
// Pré-requisitos (variáveis de ambiente do projeto):
//   GOOGLE_ADS_DEVELOPER_TOKEN — token de app, não é por conexão OAuth
//     (solicitar em ads.google.com/aw/apicenter, ver docs/INTEGRATIONS.md)
//
// Credenciais por conexão (tabela integration_credentials, provider='google'):
//   access_token / refresh_token / expires_at — já preenchidos pelo
//     fluxo OAuth existente (oauth-callback). Esta função renova o
//     access_token sozinha quando expirado, usando o refresh_token.
//   account_id — Customer ID do Google Ads (só dígitos, sem hífen)
//   config.login_customer_id — opcional, só necessário se a conta for
//     gerenciada por uma MCC (Manager Account)
//   config.last_sync_ts — timestamp Unix da última sincronização
//     (paginação incremental, mesmo padrão do Meta)
//
// Body: { "provider": "google" }
// Resposta: { synced, skipped, error? }
// ════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DEVELOPER_TOKEN = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN") ?? "";

// App single-tenant hoje (só a sala "Vantari") — mesmo uuid usado em
// sync-meta-leads e nos seeds de tracked_pages/team_members.
const WORKSPACE_ID = "53092199-7b75-4342-a897-f589d6f34922";

const GOOGLE_ADS_API_VERSION = "v17";

// Nota: assim como o /sync-meta-leads, esta função NÃO chama
// crm.ingest_processo_lead — Lead Form do Google Ads é lead-gen
// genérico, sem campo de número de processo (CNJ). Se um dia um
// formulário customizado do Google Ads passar a coletar isso, replicar
// aqui o mesmo mapeamento campanha → pipeline usado em /ingest
// (Prioridade 4).

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

// Campos do Lead Form do Google Ads: valores de FieldType conforme a
// documentação (FULL_NAME, EMAIL, PHONE_NUMBER, ...). Mesma heurística
// por substring do /ingest e /sync-meta-leads, adaptada ao enum do Google.
function fromGoogleLeadFields(fields: Array<{ fieldType?: string; fieldValue?: string }>) {
  const get = (...types: string[]) => {
    for (const f of fields) {
      const t = (f.fieldType || "").toUpperCase();
      if (types.some((k) => t.includes(k))) return f.fieldValue ?? null;
    }
    return null;
  };
  return {
    email: get("EMAIL"),
    phone: get("PHONE"),
    name:  get("FULL_NAME", "FIRST_NAME"),
    cpf:   get("CPF"), // não é um FieldType padrão do Google — só bate se vier num campo customizado nomeado "CPF"
  };
}

async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }).toString(),
  });
  if (!res.ok) throw new Error(`google token refresh: ${await res.text()}`);
  const json = await res.json();
  return { access_token: json.access_token as string, expires_in: json.expires_in as number };
}

async function fetchLeadFormSubmissions(
  customerId: string, accessToken: string, loginCustomerId: string | null, sinceUnix: number | null,
) {
  const since = sinceUnix
    ? new Date(sinceUnix * 1000).toISOString().slice(0, 19).replace("T", " ")
    : null;
  const query = `
    SELECT
      lead_form_submission_data.id,
      lead_form_submission_data.asset_id,
      lead_form_submission_data.campaign_id,
      lead_form_submission_data.lead_form_submission_fields,
      lead_form_submission_data.submission_date_time,
      campaign.name
    FROM lead_form_submission_data
    ${since ? `WHERE lead_form_submission_data.submission_date_time > '${since}'` : ""}
  `.trim();

  const headers: Record<string, string> = {
    "Authorization": `Bearer ${accessToken}`,
    "developer-token": DEVELOPER_TOKEN,
    "Content-Type": "application/json",
  };
  if (loginCustomerId) headers["login-customer-id"] = loginCustomerId;

  const res = await fetch(
    `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}/googleAds:searchStream`,
    { method: "POST", headers, body: JSON.stringify({ query }) },
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `Google Ads API error (${res.status})`);

  // searchStream devolve um array de "chunks", cada um com .results
  const results: any[] = [];
  for (const chunk of Array.isArray(json) ? json : [json]) {
    if (Array.isArray(chunk?.results)) results.push(...chunk.results);
  }
  return results;
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

  if (!DEVELOPER_TOKEN) {
    return jsonResp({ error: "GOOGLE_ADS_DEVELOPER_TOKEN não configurado (supabase secrets set)" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const core  = admin.schema("core");

  const { data: creds, error: credsErr } = await admin
    .from("integration_credentials")
    .select("status, access_token, refresh_token, expires_at, client_id, client_secret, account_id, config")
    .eq("provider", "google")
    .maybeSingle();
  if (credsErr) return jsonResp({ error: credsErr.message }, 500);
  if (!creds?.access_token || creds.status !== "connected") {
    return jsonResp({ error: "Google Ads não está conectado. Salve as credenciais e clique em \"Conectar via OAuth\" primeiro." }, 400);
  }
  if (!creds.account_id) {
    return jsonResp({ error: "Customer ID não configurado em Google Ads → Configuração." }, 400);
  }

  let accessToken = creds.access_token;
  const expiresAt = creds.expires_at ? new Date(creds.expires_at).getTime() : 0;
  if (creds.refresh_token && expiresAt && expiresAt < Date.now() + 60_000) {
    try {
      const refreshed = await refreshAccessToken(creds.refresh_token, creds.client_id, creds.client_secret);
      accessToken = refreshed.access_token;
      await admin.from("integration_credentials").update({
        access_token: refreshed.access_token,
        expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      }).eq("provider", "google");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return jsonResp({ error: "falha ao renovar access_token do Google", detail: msg }, 500);
    }
  }

  const customerId = String(creds.account_id).replace(/\D/g, "");
  const loginCustomerId = creds.config?.login_customer_id
    ? String(creds.config.login_customer_id).replace(/\D/g, "")
    : null;
  const lastSyncTs: number | null = creds.config?.last_sync_ts ?? null;

  let synced = 0, skipped = 0;
  let errorMessage: string | null = null;

  try {
    const rows = await fetchLeadFormSubmissions(customerId, accessToken, loginCustomerId, lastSyncTs);

    for (const row of rows) {
      const sub = row.leadFormSubmissionData;
      if (!sub?.id) { skipped++; continue; }

      // idempotência: mesmo padrão do /sync-meta-leads
      const { data: dup } = await core
        .from("events")
        .select("id")
        .eq("source", "google")
        .eq("type", "lead_created")
        .contains("payload", { google_lead_id: sub.id })
        .maybeSingle();
      if (dup) { skipped++; continue; }

      const fields = fromGoogleLeadFields(sub.leadFormSubmissionFields || []);
      if (!fields.cpf && !fields.phone && !fields.email) { skipped++; continue; }

      const campaignName: string | undefined = row.campaign?.name;
      const { data: personId, error: rpcErr } = await core.rpc("resolve_person", {
        p_workspace: WORKSPACE_ID,
        p_cpf: fields.cpf, p_phone: fields.phone, p_email: fields.email, p_name: fields.name,
        p_source: "google",
        p_utm_source:   "google",
        p_utm_medium:   "paid-search",
        p_utm_campaign: campaignName || null,
      });
      if (rpcErr) { errorMessage = rpcErr.message; continue; }

      await core.from("events").insert({
        workspace_id: WORKSPACE_ID,
        person_id: personId,
        source: "google",
        type: "lead_created",
        occurred_at: sub.submissionDateTime || undefined,
        payload: {
          google_lead_id: sub.id,
          asset_id: sub.assetId,
          campaign_id: sub.campaignId,
          campaign_name: campaignName,
          lead_form_submission_fields: sub.leadFormSubmissionFields,
          submission_date_time: sub.submissionDateTime,
        },
      });
      synced++;
    }

    await admin.from("integration_credentials").update({
      last_sync: new Date().toISOString(),
      config: { ...(creds.config || {}), last_sync_ts: Math.floor(Date.now() / 1000) },
      error_message: errorMessage,
    }).eq("provider", "google");

  } catch (err: unknown) {
    errorMessage = err instanceof Error ? err.message : String(err);
    await admin.from("integration_credentials").update({ error_message: errorMessage }).eq("provider", "google");
    return jsonResp({ error: errorMessage }, 500);
  }

  return jsonResp({ synced, skipped, error: errorMessage });
});
