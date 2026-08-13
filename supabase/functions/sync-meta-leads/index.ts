// ════════════════════════════════════════════════════════════════
// Edge Function: /sync-meta-leads
// ────────────────────────────────────────────────────────────────
// Chamada pelo botão "Sincronizar Agora" em /integrations → Meta →
// Leads de Formulário. Busca leads novos dos formulários de Lead Ads
// configurados (integration_credentials.config.form_ids) via Graph
// API, e resolve cada um como pessoa canônica (core.persons), do
// mesmo jeito que a função /ingest faz — só que aqui é ESTE servidor
// quem busca o dado no Meta (pull), em vez do Meta empurrar via
// webhook (que exigiria App Review pra leadgen webhooks). Reaproveita
// as mesmas RPCs que /ingest usa (core.resolve_person, core.events),
// direto (sem round-trip HTTP), já que ambas rodam com service_role.
//
// Auth: JWT do usuário logado no Next (verify_jwt = true, padrão).
//
// Body: { "provider": "meta" }  (form_ids vêm de integration_credentials.config)
// Resposta: { synced, skipped, forms: [{id,label,found,synced,error?}] }
// ════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// App single-tenant hoje (só a sala "Vantari") — mesmo uuid usado em
// workspace_settings e nos seeds de tracked_pages/team_members.
const WORKSPACE_ID = "53092199-7b75-4342-a897-f589d6f34922";

const GRAPH_VERSION = "v19.0";
const MAX_PAGES_PER_FORM = 10; // trava de segurança (até 1000 leads/formulário por sync)

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

// Mesma heurística da função /ingest — casa por substring no nome do
// campo, já que o Meta devolve a "key" da pergunta, não um schema fixo.
function fromMetaFieldData(fd: Array<{ name: string; values: string[] }>) {
  const get = (...keys: string[]) => {
    for (const f of fd) {
      const n = (f.name || "").toLowerCase();
      if (keys.some((k) => n.includes(k))) return f.values?.[0] ?? null;
    }
    return null;
  };
  return {
    email: get("email"),
    phone: get("phone", "telefone", "whatsapp"),
    name:  get("full_name", "name", "nome"),
    cpf:   get("cpf"),
  };
}

type MetaLead = {
  id: string;
  created_time: string;
  field_data: Array<{ name: string; values: string[] }>;
  ad_id?: string; ad_name?: string;
  adset_id?: string; adset_name?: string;
  campaign_id?: string; campaign_name?: string;
  platform?: string;
};

async function fetchFormLeads(formId: string, accessToken: string, sinceUnix: number | null): Promise<MetaLead[]> {
  const leads: MetaLead[] = [];
  const fields = "id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,platform";
  const filtering = sinceUnix
    ? `&filtering=${encodeURIComponent(JSON.stringify([{ field: "time_created", operator: "GREATER_THAN", value: sinceUnix }]))}`
    : "";
  let url = `https://graph.facebook.com/${GRAPH_VERSION}/${formId}/leads?fields=${fields}&limit=100${filtering}&access_token=${encodeURIComponent(accessToken)}`;

  for (let page = 0; page < MAX_PAGES_PER_FORM && url; page++) {
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error?.message || `Graph API error (${res.status})`);
    leads.push(...(json.data || []));
    url = json.paging?.next || "";
  }
  return leads;
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

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const core  = admin.schema("core");

  const { data: creds, error: credsErr } = await admin
    .from("integration_credentials")
    .select("status, access_token, config")
    .eq("provider", "meta")
    .maybeSingle();
  if (credsErr) return jsonResp({ error: credsErr.message }, 500);
  if (!creds?.access_token || creds.status !== "connected") {
    return jsonResp({ error: "Meta não está conectado. Salve as credenciais e clique em \"Conectar via OAuth\" primeiro." }, 400);
  }

  const formIds: Array<{ id: string; label?: string; last_sync_ts?: number }> = creds.config?.form_ids || [];
  if (!formIds.length) {
    return jsonResp({ error: "Nenhum formulário configurado. Adicione o ID de um Lead Ads Form em Configuração." }, 400);
  }

  const results: Array<{ id: string; label?: string; found: number; synced: number; skipped: number; error?: string }> = [];
  let totalSynced = 0, totalSkipped = 0;
  const nextFormIds = [...formIds];

  for (let i = 0; i < formIds.length; i++) {
    const form = formIds[i];
    const stat = { id: form.id, label: form.label, found: 0, synced: 0, skipped: 0, error: undefined as string | undefined };
    try {
      const metaLeads = await fetchFormLeads(form.id, creds.access_token, form.last_sync_ts || null);
      stat.found = metaLeads.length;

      for (const lead of metaLeads) {
        // idempotência: não duplica se essa sync já rodou sobre o mesmo lead antes
        // (rede de segurança além do filtro "since" por formulário).
        const { data: dup } = await core
          .from("events")
          .select("id")
          .eq("source", "meta")
          .eq("type", "lead_created")
          .contains("payload", { meta_lead_id: lead.id })
          .maybeSingle();
        if (dup) { stat.skipped++; totalSkipped++; continue; }

        const p = fromMetaFieldData(lead.field_data || []);
        if (!p.cpf && !p.phone && !p.email) { stat.skipped++; totalSkipped++; continue; }

        const { data: personId, error: rpcErr } = await core.rpc("resolve_person", {
          p_workspace: WORKSPACE_ID,
          p_cpf: p.cpf, p_phone: p.phone, p_email: p.email, p_name: p.name,
          p_source: "meta",
          p_utm_source:   lead.platform === "ig" ? "instagram" : "facebook",
          p_utm_medium:   "paid-social",
          p_utm_campaign: lead.campaign_name || null,
          p_utm_content:  lead.ad_name || null,
          p_utm_term:     lead.adset_name || null,
        });
        if (rpcErr) { stat.error = rpcErr.message; continue; }

        await core.from("events").insert({
          workspace_id: WORKSPACE_ID,
          person_id:    personId,
          source:       "meta",
          type:         "lead_created",
          occurred_at:  lead.created_time || undefined, // quando o lead foi enviado no Meta, não quando sincronizamos
          payload: {
            meta_lead_id: lead.id,
            form_id: form.id, form_label: form.label || null,
            field_data: lead.field_data,
            ad_id: lead.ad_id, ad_name: lead.ad_name,
            adset_id: lead.adset_id, adset_name: lead.adset_name,
            campaign_id: lead.campaign_id, campaign_name: lead.campaign_name,
            platform: lead.platform, created_time: lead.created_time,
          },
        });
        stat.synced++; totalSynced++;
      }

      nextFormIds[i] = { ...form, last_sync_ts: Math.floor(Date.now() / 1000) };
    } catch (err: unknown) {
      stat.error = err instanceof Error ? err.message : String(err);
    }
    results.push(stat);
  }

  await admin
    .from("integration_credentials")
    .update({
      last_sync: new Date().toISOString(),
      config: { ...(creds.config || {}), form_ids: nextFormIds },
      error_message: results.find(r => r.error)?.error || null,
    })
    .eq("provider", "meta");

  return jsonResp({ synced: totalSynced, skipped: totalSkipped, forms: results });
});
