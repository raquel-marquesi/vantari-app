// ════════════════════════════════════════════════════════════════
// Edge Function: /send-meta-capi
// ────────────────────────────────────────────────────────────────
// Avisa a Meta (Conversions API / Dataset Quality API) pelo servidor
// quando um negócio de fonte='meta' muda de estágio importante — hoje
// a Meta só via o Lead Ads no momento do preenchimento, sem saber se
// aquele lead virou negócio de verdade. Pedido da Catarina, 17/09/2026.
//
// Escopo ATUAL (deals com crm.deals.source = 'meta' — 100% originados
// por sync-meta-leads, Lead Ads nativo do Instant Form):
//   • 1ª vez que o negócio alcança (ou já passou por) o estágio
//     "Qualificação" (em qualquer pipeline) → evento "Lead"
//   • crm.deals.status = 'won' (estágio kind='won', ex. "Fechado
//     Ganho") → evento "Purchase", value = valor_ofertado_cents.
//     Sem valor_ofertado_cents ainda definido → pulado (reavaliado no
//     próximo run, não marcado como enviado).
//   • "Fechado Perdido" (kind='lost') → não manda nada, por decisão.
//
// Como não existe fbclid/_fbp/_fbc pra Lead Ads nativo (a pessoa nunca
// visita o site), o casamento de identidade usa e-mail/telefone
// hasheados (SHA256) + o `lead_id` do próprio Instant Form — que já é
// gravado em core.events.payload.meta_lead_id desde 14/09
// (sync-meta-leads). Ver 20260917000001_meta_capi_click_ids_and_log.sql
// pra fbc/fbp em si (preparado pra um funil diferente — site/LPs — não
// usado por este consumidor ainda).
//
// Idempotência: mkt.capi_events_log tem unique(deal_id, event_name) —
// a function INSERE a linha (status 'pending') antes de chamar a Graph
// API; se o insert falhar por conflito, o evento já foi (ou está sendo)
// processado por outra execução, e este deal/evento é pulado.
//
// Auth: mesmo padrão do sync-meta-leads — JWT de usuário logado OU
// header X-Cron-Secret == secrets.CRON_SECRET (chamada do pg_cron).
//
// Configuração (Supabase secrets, nenhuma em texto puro no código):
//   META_CAPI_ACCESS_TOKEN   — obrigatório. Sem ele, a function responde
//                              200 { skipped: true } e não toca no banco
//                              (rodar o cron antes do token existir é
//                              inofensivo, mesmo padrão do sync-meta-leads
//                              com Meta desconectado).
//   META_PIXEL_ID            — opcional, default = pixel "PIXEL - VANTARI"
//                              (785226807252342 — não é segredo, já está
//                              embutido nas 5 LPs públicas).
//   META_CAPI_TEST_EVENT_CODE — opcional. Setar pra testar na aba
//                              "Eventos de Teste" do Gerenciador de
//                              Eventos sem mudar código; remover pra
//                              voltar ao envio real.
// ════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET  = Deno.env.get("CRON_SECRET") ?? "";

const META_CAPI_ACCESS_TOKEN   = Deno.env.get("META_CAPI_ACCESS_TOKEN") ?? "";
const META_PIXEL_ID            = Deno.env.get("META_PIXEL_ID") ?? "785226807252342";
const META_CAPI_TEST_EVENT_CODE = Deno.env.get("META_CAPI_TEST_EVENT_CODE") ?? "";
const isTestMode = !!META_CAPI_TEST_EVENT_CODE;
const GRAPH_VERSION = "v21.0";

const WORKSPACE_ID = "53092199-7b75-4342-a897-f589d6f34922";
const QUALIFICATION_STAGE_NAME = "Qualificação";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// primary_phone em core.persons é gravado SEM código de país (DDD+número,
// core.normalize_phone_br) — a Conversions API exige o telefone completo
// (país + DDD + número, só dígitos) antes de hashear.
function phoneForHash(rawDigitsOnly: string | null): string | null {
  if (!rawDigitsOnly) return null;
  const d = rawDigitsOnly.replace(/\D/g, "");
  if (!d) return null;
  return d.startsWith("55") ? d : `55${d}`;
}

async function writeSyncLog(
  admin: ReturnType<typeof createClient>,
  entry: { status: "success" | "error" | "warning"; details: string; records_affected?: number; payload?: unknown }
) {
  const { error } = await admin.from("integration_sync_logs").insert({
    provider: "meta",
    action: "send_meta_capi",
    status: entry.status,
    details: entry.details,
    records_affected: entry.records_affected ?? 0,
    payload: entry.payload ?? null,
  });
  if (error) console.error("send-meta-capi: falha ao gravar integration_sync_logs", error.message);
}

type Deal = {
  id: string;
  workspace_id: string;
  person_id: string;
  stage_id: string;
  pipeline_id: string;
  status: string;
  valor_ofertado_cents: number | null;
};

type Person = {
  id: string;
  primary_email: string | null;
  primary_phone: string | null;
  fbc: string | null;
  fbp: string | null;
};

async function reserveLogRow(
  mkt: ReturnType<typeof createClient>,
  entry: { workspace_id: string; deal_id: string; person_id: string; event_name: string; request: unknown }
): Promise<string | null> {
  const { data, error } = await mkt
    .from("capi_events_log")
    .insert({ ...entry, status: "pending" })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return null; // já reservado por outra execução — pula
    throw error;
  }
  return data.id as string;
}

async function sendToMeta(eventPayload: Record<string, unknown>) {
  const body: Record<string, unknown> = { data: [eventPayload] };
  if (META_CAPI_TEST_EVENT_CODE) body.test_event_code = META_CAPI_TEST_EVENT_CODE;

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${META_PIXEL_ID}/events?access_token=${encodeURIComponent(META_CAPI_ACCESS_TOKEN)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json, sentBody: body };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST")    return jsonResp({ error: "Method not allowed" }, 405);

  const isCronCall = !!CRON_SECRET && req.headers.get("X-Cron-Secret") === CRON_SECRET;
  if (!isCronCall) {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResp({ error: "unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return jsonResp({ error: "unauthorized" }, 401);
  }

  if (!META_CAPI_ACCESS_TOKEN) {
    return jsonResp({ skipped: true, reason: "META_CAPI_ACCESS_TOKEN não configurado" });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const crm   = admin.schema("crm");
  const core  = admin.schema("core");
  const mkt   = admin.schema("mkt");

  try {
    const { data: deals, error: dealsErr } = await crm
      .from("deals")
      .select("id, workspace_id, person_id, stage_id, pipeline_id, status, valor_ofertado_cents")
      .eq("source", "meta")
      .returns<Deal[]>();
    if (dealsErr) throw dealsErr;
    if (!deals || deals.length === 0) {
      return jsonResp({ ok: true, sent: 0, skipped: 0, errors: 0, details: "nenhum negócio com source=meta" });
    }

    const stageIds = [...new Set(deals.map((d) => d.stage_id))];
    const { data: stages, error: stagesErr } = await crm
      .from("stages")
      .select("id, pipeline_id, name, position")
      .in("id", stageIds);
    if (stagesErr) throw stagesErr;

    const stageById = new Map((stages || []).map((s) => [s.id, s]));
    const qualPositionByPipeline = new Map<string, number>();
    for (const s of stages || []) {
      if (s.name === QUALIFICATION_STAGE_NAME) qualPositionByPipeline.set(s.pipeline_id, s.position);
    }
    // estágio "Qualificação" pode existir num pipeline que nenhum deal candidato
    // atual está usando — busca também nas pipelines dos deals, sem limitar a `stages`.
    const pipelineIds = [...new Set(deals.map((d) => d.pipeline_id))];
    const missingPipelines = pipelineIds.filter((p) => !qualPositionByPipeline.has(p));
    if (missingPipelines.length > 0) {
      const { data: extraStages } = await crm
        .from("stages")
        .select("pipeline_id, position")
        .eq("name", QUALIFICATION_STAGE_NAME)
        .in("pipeline_id", missingPipelines);
      for (const s of extraStages || []) qualPositionByPipeline.set(s.pipeline_id, s.position);
    }

    const personIds = [...new Set(deals.map((d) => d.person_id))];
    const { data: persons, error: personsErr } = await core
      .from("persons")
      .select("id, primary_email, primary_phone, fbc, fbp")
      .in("id", personIds)
      .returns<Person[]>();
    if (personsErr) throw personsErr;
    const personById = new Map((persons || []).map((p) => [p.id, p]));

    const { data: leadEvents } = await core
      .from("events")
      .select("person_id, payload, created_at")
      .eq("source", "meta")
      .eq("type", "lead_created")
      .in("person_id", personIds)
      .order("created_at", { ascending: true });
    const metaLeadIdByPerson = new Map<string, string>();
    for (const ev of leadEvents || []) {
      const leadId = (ev.payload as any)?.meta_lead_id;
      if (leadId && !metaLeadIdByPerson.has(ev.person_id)) metaLeadIdByPerson.set(ev.person_id, leadId);
    }

    let sent = 0, skipped = 0, errors = 0;
    const details: unknown[] = [];

    for (const deal of deals) {
      const stage = stageById.get(deal.stage_id);
      const qualPosition = qualPositionByPipeline.get(deal.pipeline_id);
      const reachedQualification = qualPosition != null && stage != null && stage.position >= qualPosition;

      const candidates: Array<{ eventName: string; value?: number }> = [];
      if (reachedQualification) candidates.push({ eventName: "Lead" });
      if (deal.status === "won") {
        if (deal.valor_ofertado_cents != null) {
          candidates.push({ eventName: "Purchase", value: deal.valor_ofertado_cents / 100 });
        } else {
          skipped++;
          details.push({ deal_id: deal.id, event: "Purchase", skipped: "sem valor_ofertado_cents ainda" });
        }
      }
      if (candidates.length === 0) continue;

      const person = personById.get(deal.person_id);
      const metaLeadId = metaLeadIdByPerson.get(deal.person_id);

      const userData: Record<string, unknown> = {};
      if (person?.primary_email) userData.em = [await sha256Hex(person.primary_email.trim().toLowerCase())];
      const phone = phoneForHash(person?.primary_phone ?? null);
      if (phone) userData.ph = [await sha256Hex(phone)];
      if (metaLeadId) userData.lead_id = metaLeadId;
      if (person?.fbc) userData.fbc = person.fbc;
      if (person?.fbp) userData.fbp = person.fbp;

      for (const cand of candidates) {
        const eventPayload: Record<string, unknown> = {
          event_name: cand.eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: `${deal.id}:${cand.eventName}`,
          action_source: "system_generated",
          user_data: userData,
        };
        if (cand.eventName === "Purchase") {
          eventPayload.custom_data = { value: cand.value, currency: "BRL" };
        }

        // Modo teste (META_CAPI_TEST_EVENT_CODE setado): NUNCA grava em
        // mkt.capi_events_log. Se gravasse, o teste "consumiria" o slot de
        // idempotência (unique deal_id+event_name) e o envio REAL de
        // verdade, depois, seria bloqueado pra sempre pra esse negócio —
        // fica só reenviando pra aba "Eventos de Teste", sem tocar no log.
        if (isTestMode) {
          try {
            const result = await sendToMeta(eventPayload);
            if (result.ok) { sent++; } else { errors++; }
            details.push({ deal_id: deal.id, event: cand.eventName, ok: result.ok, status: result.status, test: true, response: result.json });
          } catch (sendErr) {
            errors++;
            details.push({ deal_id: deal.id, event: cand.eventName, error: String(sendErr), test: true });
          }
          continue;
        }

        const logId = await reserveLogRow(mkt, {
          workspace_id: deal.workspace_id || WORKSPACE_ID,
          deal_id: deal.id,
          person_id: deal.person_id,
          event_name: cand.eventName,
          request: eventPayload,
        });
        if (!logId) { skipped++; continue; } // já enviado (ou em andamento) antes

        try {
          const result = await sendToMeta(eventPayload);
          await mkt.from("capi_events_log").update({
            status: result.ok ? "sent" : "error",
            http_status: result.status,
            response: result.json,
            error: result.ok ? null : JSON.stringify(result.json),
            sent_at: new Date().toISOString(),
          }).eq("id", logId);

          if (result.ok) { sent++; } else { errors++; }
          details.push({ deal_id: deal.id, event: cand.eventName, ok: result.ok, status: result.status });
        } catch (sendErr) {
          errors++;
          await mkt.from("capi_events_log").update({
            status: "error",
            error: sendErr instanceof Error ? sendErr.message : String(sendErr),
          }).eq("id", logId);
          details.push({ deal_id: deal.id, event: cand.eventName, error: String(sendErr) });
        }
      }
    }

    await writeSyncLog(admin, {
      status: errors > 0 ? "warning" : "success",
      details: `send-meta-capi${isTestMode ? " (TEST MODE)" : ""}: ${sent} enviado(s), ${skipped} pulado(s), ${errors} erro(s)`,
      records_affected: sent,
      payload: details,
    });

    return jsonResp({ ok: true, sent, skipped, errors, details });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await writeSyncLog(admin, { status: "error", details: message });
    return jsonResp({ error: message }, 500);
  }
});
