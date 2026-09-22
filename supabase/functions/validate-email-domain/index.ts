// ════════════════════════════════════════════════════════════════
// Edge Function: /validate-email-domain
// ────────────────────────────────────────────────────────────────
// Validador de Email (Etapa 10) — parte 2: checagem de domínio via DNS.
//
// A classificação por trigger (migration 20260731000004_email_validator.sql,
// core.classify_email) só olha sintaxe + lista de domínios descartáveis
// conhecidos — roda dentro do Postgres, sem acesso a rede, então não pega
// domínio digitado errado ou que não existe de verdade (ex: fulano@gmial.com
// em vez de gmail.com). Esta function fecha essa lacuna: verifica, via DNS
// (registro MX, com fallback pra A — RFC permite mail sem MX explícito),
// se o domínio de cada email 'valid' realmente aceita correio. Se não
// aceitar, rebaixa pra 'invalid'.
//
// Chamada a cada 10 min pelo cron validate-email-domain-every-10-min
// (pg_cron + pg_net, mesmo padrão do sync-meta-leads) — processa só quem
// ainda não foi checado (email_domain_checked_at is null), em lotes, até
// convergir. A trigger de classificação já reseta email_domain_checked_at
// pra null sempre que o email muda, então email trocado é rechecado
// automaticamente na rodada seguinte.
//
// Auth: mesmo padrão do sync-meta-leads/send-meta-capi — JWT de usuário
// logado OU header X-Cron-Secret == secrets.CRON_SECRET (chamada do
// pg_cron). Reaproveita o mesmo CRON_SECRET já configurado, não precisa
// de secret novo.
//
// Body opcional: { "person_id"?: "<uuid>", "batch_size"?: number (default 300) }
// Resposta: { checked, downgraded_to_invalid, still_valid, domains_looked_up }
// ════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY      = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET    = Deno.env.get("CRON_SECRET") ?? "";

const DEFAULT_BATCH_SIZE = 300;

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

// Checa se o domínio aceita email: primeiro tenta registro MX (o normal),
// e se não achar nenhum, cai pro fallback de registro A (RFC 5321 permite
// entrega direta no host quando não existe MX — raro, mas existe, ex. em
// domínios pequenos mal configurados que ainda recebem email assim).
// Qualquer exceção (NXDOMAIN, timeout) conta como "não aceita".
async function domainHasMailRoute(domain: string): Promise<boolean> {
  try {
    const mx = await Deno.resolveDns(domain, "MX");
    if (mx && mx.length > 0) return true;
  } catch { /* sem MX — tenta A abaixo antes de desistir */ }
  try {
    const a = await Deno.resolveDns(domain, "A");
    return !!(a && a.length > 0);
  } catch {
    return false;
  }
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

  let body: any = {};
  try { body = await req.json(); } catch { /* body vazio (chamada do cron) é válido */ }
  const batchSize = Number(body?.batch_size) > 0 ? Number(body.batch_size) : DEFAULT_BATCH_SIZE;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const core  = admin.schema("core");

  try {
    let query = core
      .from("persons")
      .select("id, primary_email")
      .eq("email_status", "valid")
      .is("email_domain_checked_at", null)
      .not("primary_email", "is", null)
      .limit(batchSize);
    if (body?.person_id) query = query.eq("id", body.person_id);

    const { data: persons, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;

    if (!persons || persons.length === 0) {
      return jsonResp({ checked: 0, downgraded_to_invalid: 0, still_valid: 0, domains_looked_up: 0 });
    }

    // cache por domínio — evita repetir a mesma consulta DNS pra cada
    // pessoa (muita gente compartilha @gmail.com, @hotmail.com etc.)
    const domainCache = new Map<string, boolean>();
    const nowInvalid: string[] = [];
    const stillValid: string[] = [];

    for (const p of persons) {
      const domain = String(p.primary_email).toLowerCase().split("@")[1];
      if (!domain) { nowInvalid.push(p.id); continue; }
      if (!domainCache.has(domain)) {
        domainCache.set(domain, await domainHasMailRoute(domain));
      }
      if (domainCache.get(domain)) stillValid.push(p.id);
      else nowInvalid.push(p.id);
    }

    const nowIso = new Date().toISOString();
    if (nowInvalid.length) {
      const { error } = await core.from("persons")
        .update({ email_status: "invalid", email_domain_checked_at: nowIso })
        .in("id", nowInvalid);
      if (error) throw error;
    }
    if (stillValid.length) {
      const { error } = await core.from("persons")
        .update({ email_domain_checked_at: nowIso })
        .in("id", stillValid);
      if (error) throw error;
    }

    return jsonResp({
      checked: persons.length,
      downgraded_to_invalid: nowInvalid.length,
      still_valid: stillValid.length,
      domains_looked_up: domainCache.size,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResp({ error: message }, 500);
  }
});
