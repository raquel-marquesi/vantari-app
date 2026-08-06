// ════════════════════════════════════════════════════════════════
// Edge Function: /run-scheduled-campaigns
// ────────────────────────────────────────────────────────────────
// Motor de disparo RECORRENTE de campanhas de email (pedido da Catarina,
// 06/08/2026 — equivalente ao "disparo programado semanal" do RD Station).
// Chamada periodicamente via pg_cron (a cada 5min, mesmo padrão de
// /run-automations) — também pode ser chamada manualmente pra testar.
//
// Pra cada campanha com recurrence_enabled=true e next_run_at <= now():
//   1. Resolve os destinatários do segmento vinculado (mkt.campaigns.
//      segment_id). A resolução normalmente acontece no FRONTEND
//      (src/segment-resolver.js), porque lá quem dispara é um clique do
//      usuário — aqui quem dispara é o cron, então a mesma lógica de regras
//      precisa rodar no servidor. É um espelho fiel de
//      segment-resolver.js::buildPersonConstraints/applyConstraints —
//      qualquer mudança nas regras de segmento lá TEM que ser replicada aqui.
//   2. Chama /send-campaign internamente com os destinatários resolvidos —
//      reaproveita 100% do envio real (Resend, consentimento, qualidade de
//      email, tracking em mkt.campaign_sends). send-campaign já sabe lidar
//      com recurrence_enabled=true (não bloqueia reenvio, não trava status
//      em "sent" terminal — ver migration 20260806000001).
//   3. Avança next_run_at pra próxima ocorrência (mesmo dia da semana +
//      horário, semana seguinte) e grava last_run_at = agora.
//
// Fuso: Brasil não observa mais horário de verão desde 2019 — America/
// Sao_Paulo é UTC-3 fixo o ano inteiro, então dá pra fazer a conta na mão
// sem lib de timezone (ver nextOccurrenceUtc).
//
// Deploy: supabase functions deploy run-scheduled-campaigns
// ════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WORKSPACE_VANTARI = "53092199-7b75-4342-a897-f589d6f34922";
const NIL = "00000000-0000-0000-0000-000000000000";
const BR_OFFSET_MS = 3 * 3600_000; // America/Sao_Paulo = UTC-3 fixo (sem DST desde 2019)

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

/* próxima ocorrência (dia da semana 0=domingo..6=sábado + hora:min, horário
   de Brasília) estritamente APÓS afterUtc, convertida de volta pra UTC real */
function nextOccurrenceUtc(dayOfWeek: number, hour: number, minute: number, afterUtc: Date): Date {
  const localRef = new Date(afterUtc.getTime() - BR_OFFSET_MS);
  const candidate = new Date(Date.UTC(
    localRef.getUTCFullYear(), localRef.getUTCMonth(), localRef.getUTCDate(), hour, minute, 0
  ));
  const diffDays = (dayOfWeek - candidate.getUTCDay() + 7) % 7;
  candidate.setUTCDate(candidate.getUTCDate() + diffDays);
  if (candidate.getTime() <= localRef.getTime()) candidate.setUTCDate(candidate.getUTCDate() + 7);
  return new Date(candidate.getTime() + BR_OFFSET_MS);
}

/* ════════════════════════════════════════════════════════════════
   RESOLUÇÃO DE SEGMENTO — espelho server-side de src/segment-resolver.js
   ════════════════════════════════════════════════════════════════ */
type Rule = { field: string; op: string; value: any };

const FIELD_COL: Record<string, string> = {
  status: "status", full_name: "full_name", email: "primary_email", phone: "primary_phone",
};
const FIELD_SRC: Record<string, string> = {
  score_inicial: "score", segment_inicial: "score", status: "person", stage: "deal",
  full_name: "person", email: "person", phone: "person", company: "company",
  visited_page: "event", unsubscribed: "consent", email_status: "person",
};

function applyOp(q: any, col: string, type: string, rule: Rule) {
  const val = type === "number" ? Number(rule.value) : type === "bool" ? rule.value === "true" : rule.value;
  switch (rule.op) {
    case "gt": return q.gt(col, val);
    case "gte": return q.gte(col, val);
    case "lt": return q.lt(col, val);
    case "lte": return q.lte(col, val);
    case "eq": return q.eq(col, val);
    case "neq": return q.neq(col, val);
    case "ilike_c": return q.ilike(col, `%${val}%`);
    default: return q;
  }
}

function intersect(allowed: Set<string> | null, ids: string[]): Set<string> {
  const set = new Set(ids);
  if (allowed === null) return set;
  return new Set([...allowed].filter((x) => set.has(x)));
}

async function buildPersonConstraints(supabase: any, rules: Rule[]) {
  const core = supabase.schema("core");
  const mkt = supabase.schema("mkt");
  const crm = supabase.schema("crm");

  let allowed: Set<string> | null = null;
  const exclude = new Set<string>();

  const scoreRules = rules.filter((r) => FIELD_SRC[r.field] === "score");
  if (scoreRules.length) {
    let q = mkt.from("lead_scores").select("person_id").eq("workspace_id", WORKSPACE_VANTARI);
    for (const r of scoreRules) q = applyOp(q, r.field, r.field === "score_inicial" ? "number" : "text", r);
    const { data, error } = await q.limit(5000);
    if (error) throw error;
    allowed = intersect(allowed, (data || []).map((x: any) => x.person_id));
  }

  for (const r of rules.filter((r) => r.field === "stage")) {
    const { data, error } = await crm.from("deals")
      .select("person_id").eq("workspace_id", WORKSPACE_VANTARI).eq("stage_id", r.value).limit(5000);
    if (error) throw error;
    const ids = (data || []).map((x: any) => x.person_id).filter(Boolean);
    if (r.op === "neq") ids.forEach((i: string) => exclude.add(i));
    else allowed = intersect(allowed, ids);
  }

  for (const r of rules.filter((r) => r.field === "visited_page")) {
    const { data, error } = await core.from("events")
      .select("person_id").eq("type", "page_visit").eq("payload->>path", r.value)
      .not("person_id", "is", null).limit(5000);
    if (error) throw error;
    const ids = Array.from(new Set((data || []).map((x: any) => x.person_id)));
    if (r.op === "not_visited") (ids as string[]).forEach((i) => exclude.add(i));
    else allowed = intersect(allowed, ids as string[]);
  }

  const unsub = rules.find((r) => r.field === "unsubscribed");
  {
    const { data, error } = await core.from("consents")
      .select("person_id").eq("channel", "email").eq("status", "revoked").limit(5000);
    if (error) throw error;
    const ids = Array.from(new Set((data || []).map((x: any) => x.person_id))) as string[];
    if (unsub && unsub.value === "true") allowed = intersect(allowed, ids);
    else ids.forEach((i) => exclude.add(i));
  }

  const hasEmailStatusRule = rules.some((r) => r.field === "email_status");
  if (!hasEmailStatusRule) {
    const { data, error } = await core.from("persons")
      .select("id").eq("workspace_id", WORKSPACE_VANTARI).eq("email_status", "invalid").limit(5000);
    if (error) throw error;
    (data || []).forEach((p: any) => exclude.add(p.id));
  }

  let companyIds: string[] | null = null;
  for (const r of rules.filter((r) => r.field === "company")) {
    let cq = core.from("companies").select("id").eq("workspace_id", WORKSPACE_VANTARI);
    cq = applyOp(cq, "name", "text", r);
    const { data, error } = await cq.limit(5000);
    if (error) throw error;
    const ids = (data || []).map((x: any) => x.id);
    companyIds = companyIds === null ? ids : companyIds.filter((i) => ids.includes(i));
  }

  return {
    personRules: rules.filter((r) => FIELD_SRC[r.field] === "person"),
    companyIds, allowed, exclude,
  };
}

function applyConstraints(q: any, c: any) {
  for (const r of c.personRules) q = applyOp(q, FIELD_COL[r.field] || r.field, r.field === "email" || r.field === "full_name" || r.field === "phone" ? "text" : "text", r);
  if (c.companyIds !== null) q = q.in("company_id", c.companyIds.length ? c.companyIds : [NIL]);
  if (c.allowed !== null) { const arr = [...c.allowed]; q = q.in("id", arr.length ? arr : [NIL]); }
  if (c.exclude.size) q = q.not("id", "in", `(${[...c.exclude].join(",")})`);
  return q;
}

async function resolveRecipients(supabase: any, rules: Rule[]) {
  const c = await buildPersonConstraints(supabase, rules);
  let q = supabase.schema("core").from("persons")
    .select("id, full_name, primary_email")
    .eq("workspace_id", WORKSPACE_VANTARI)
    .not("primary_email", "is", null);
  q = applyConstraints(q, c);
  const { data, error } = await q.limit(5000);
  if (error) throw error;
  return (data || [])
    .filter((p: any) => p.primary_email)
    .map((p: any) => ({ person_id: p.id, name: p.full_name, email: p.primary_email }));
}

/* ════════════════════════════════════════════════════════════════
   HANDLER
   ════════════════════════════════════════════════════════════════ */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const mkt = supabase.schema("mkt");

  const results: any[] = [];

  try {
    const nowUtc = new Date();
    const { data: due, error } = await mkt.from("campaigns")
      .select("id, name, segment_id, recurrence_day_of_week, recurrence_hour, recurrence_minute, next_run_at")
      .eq("recurrence_enabled", true)
      .lte("next_run_at", nowUtc.toISOString());

    if (error) return jsonResp({ error: "falha ao buscar campanhas devidas", detail: error.message }, 500);

    for (const camp of due || []) {
      const entry: any = { campaign_id: camp.id, name: camp.name };
      try {
        if (!camp.segment_id) {
          entry.skipped = "sem segmento vinculado";
        } else {
          const { data: seg, error: segErr } = await supabase
            .from("segments").select("rules").eq("id", camp.segment_id).maybeSingle();
          if (segErr) throw segErr;
          const recipients = await resolveRecipients(supabase, (seg?.rules as Rule[]) || []);

          if (recipients.length === 0) {
            entry.skipped = "segmento resolveu 0 destinatários";
          } else {
            const res = await fetch(`${SUPABASE_URL}/functions/v1/send-campaign`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
              body: JSON.stringify({ campaign_id: camp.id, recipients }),
            });
            const sendResult = await res.json();
            entry.send_result = sendResult;
            if (!res.ok || sendResult?.error) entry.error = sendResult?.error || `HTTP ${res.status}`;
          }
        }
      } catch (e) {
        entry.error = e instanceof Error ? e.message : String(e);
      }

      // sempre avança next_run_at, mesmo se falhou/pulou — evita loop de
      // retry a cada 5min pra sempre a mesma campanha com problema
      if (camp.recurrence_day_of_week != null && camp.recurrence_hour != null) {
        const next = nextOccurrenceUtc(camp.recurrence_day_of_week, camp.recurrence_hour, camp.recurrence_minute ?? 0, nowUtc);
        await mkt.from("campaigns").update({
          next_run_at: next.toISOString(), last_run_at: nowUtc.toISOString(),
        }).eq("id", camp.id);
        entry.next_run_at = next.toISOString();
      }

      results.push(entry);
    }

    return jsonResp({ checked: (due || []).length, results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonResp({ error: msg }, 500);
  }
});
