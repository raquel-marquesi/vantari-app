// ════════════════════════════════════════════════════════════════
// segment-resolver.js
// Resolve um segmento dinâmico (regras em public.segments.rules) para a lista
// de pessoas do core. Usado pelo /email (envio por segmento — "jeito A": a tela
// resolve e manda a lista pronta pra Edge send-campaign).
//
// ⚠️ ESPELHO de vantari-segments.jsx (FIELDS / applyOp / buildPersonConstraints
//    / computeLeads). Mantido autocontido de propósito pra não refatorar a tela
//    de /segments (viva em prod). Se as regras de segmento mudarem lá, ESPELHAR
//    aqui — dívida técnica a reconciliar (extrair /segments p/ usar este módulo).
// ════════════════════════════════════════════════════════════════
import { supabase } from "./supabase";

const WORKSPACE_VANTARI = "53092199-7b75-4342-a897-f589d6f34922";
const core = () => supabase.schema("core");
const mkt  = () => supabase.schema("mkt");
const crm  = () => supabase.schema("crm");
const NIL  = "00000000-0000-0000-0000-000000000000";

/* campos de filtro — mesma definição do /segments (pós-convergência do score) */
const FIELDS = [
  { value: "score_inicial",   label: "Score (Etapa 1)", type: "number", src: "score" },
  { value: "segment_inicial", label: "Segmento",        type: "enum",   src: "score" },
  { value: "status",          label: "Status",          type: "enum",   src: "person", col: "status" },
  { value: "stage",           label: "Estágio",         type: "stage",  src: "deal" },
  { value: "full_name",       label: "Nome",            type: "text",   src: "person", col: "full_name" },
  { value: "email",           label: "Email",           type: "text",   src: "person", col: "primary_email" },
  { value: "phone",           label: "Telefone",        type: "text",   src: "person", col: "primary_phone" },
  { value: "company",         label: "Empresa",         type: "text",   src: "company" },
  { value: "visited_page",    label: "Visitou página",  type: "page",   src: "event" },
  { value: "unsubscribed",    label: "Descadastrado",   type: "bool",   src: "consent" },
];
const fieldOf = (rule) => FIELDS.find(f => f.value === rule.field) || FIELDS[0];

function applyOp(q, col, field, rule) {
  const val = field.type === "number" ? Number(rule.value)
            : field.type === "bool"   ? rule.value === "true"
            : rule.value;
  switch (rule.op) {
    case "gt":      return q.gt(col, val);
    case "gte":     return q.gte(col, val);
    case "lt":      return q.lt(col, val);
    case "lte":     return q.lte(col, val);
    case "eq":      return q.eq(col, val);
    case "neq":     return q.neq(col, val);
    case "ilike_c": return q.ilike(col, `%${val}%`);
    default:        return q;
  }
}

function intersect(allowed, ids) {
  const set = new Set(ids);
  if (allowed === null) return set;
  return new Set([...allowed].filter(x => set.has(x)));
}

async function buildPersonConstraints(filters) {
  const rules = (filters || []).filter(r => r.field && r.op && r.value !== "" && r.value != null);
  let allowed = null;
  const exclude = new Set();

  // SCORE — mkt.lead_scores (score_inicial / segment_inicial)
  const scoreRules = rules.filter(r => fieldOf(r).src === "score");
  if (scoreRules.length) {
    let q = mkt().from("lead_scores").select("person_id").eq("workspace_id", WORKSPACE_VANTARI);
    for (const r of scoreRules) q = applyOp(q, r.field, fieldOf(r), r);
    const { data, error } = await q.limit(5000);
    if (error) throw error;
    allowed = intersect(allowed, (data || []).map(x => x.person_id));
  }

  // ESTÁGIO — crm.deals
  for (const r of rules.filter(r => r.field === "stage")) {
    const { data, error } = await crm().from("deals")
      .select("person_id").eq("workspace_id", WORKSPACE_VANTARI).eq("stage_id", r.value).limit(5000);
    if (error) throw error;
    const ids = (data || []).map(x => x.person_id).filter(Boolean);
    if (r.op === "neq") ids.forEach(i => exclude.add(i));
    else allowed = intersect(allowed, ids);
  }

  // VISITOU PÁGINA — core.events
  for (const r of rules.filter(r => r.field === "visited_page")) {
    const { data, error } = await core().from("events")
      .select("person_id").eq("type", "page_visit").eq("payload->>path", r.value)
      .not("person_id", "is", null).limit(5000);
    if (error) throw error;
    const ids = Array.from(new Set((data || []).map(x => x.person_id)));
    if (r.op === "not_visited") ids.forEach(i => exclude.add(i));
    else allowed = intersect(allowed, ids);
  }

  // DESCADASTRO — core.consents
  const unsub = rules.find(r => r.field === "unsubscribed");
  if (unsub) {
    const { data, error } = await core().from("consents")
      .select("person_id").eq("channel", "email").eq("status", "revoked").limit(5000);
    if (error) throw error;
    const ids = Array.from(new Set((data || []).map(x => x.person_id)));
    if (unsub.value === "true") allowed = intersect(allowed, ids);
    else ids.forEach(i => exclude.add(i));
  }

  // EMPRESA — core.companies → company_id
  let companyIds = null;
  for (const r of rules.filter(r => r.field === "company")) {
    let cq = core().from("companies").select("id").eq("workspace_id", WORKSPACE_VANTARI);
    cq = applyOp(cq, "name", { type: "text" }, r);
    const { data, error } = await cq.limit(5000);
    if (error) throw error;
    const ids = (data || []).map(x => x.id);
    companyIds = companyIds === null ? ids : companyIds.filter(i => ids.includes(i));
  }

  return {
    personRules: rules.filter(r => fieldOf(r).src === "person"),
    companyIds,
    allowed,
    exclude,
  };
}

function applyConstraints(q, c) {
  for (const r of c.personRules) q = applyOp(q, fieldOf(r).col || r.field, fieldOf(r), r);
  if (c.companyIds !== null) q = q.in("company_id", c.companyIds.length ? c.companyIds : [NIL]);
  if (c.allowed !== null) { const arr = [...c.allowed]; q = q.in("id", arr.length ? arr : [NIL]); }
  if (c.exclude.size) q = q.not("id", "in", `(${[...c.exclude].join(",")})`);
  return q;
}

/* ─── API pública ─── */

/* lista os segmentos salvos (public.segments) da sala Vantari */
export async function loadEmailSegments() {
  const { data, error } = await supabase
    .from("segments").select("id, name, rules")
    .eq("workspace_id", WORKSPACE_VANTARI)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

/* conta destinatários de um conjunto de regras */
export async function countRecipients(rules) {
  const c = await buildPersonConstraints(rules);
  let q = core().from("persons").select("id", { count: "exact", head: true })
    .eq("workspace_id", WORKSPACE_VANTARI)
    .not("primary_email", "is", null);
  q = applyConstraints(q, c);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

/* resolve a lista de destinatários { person_id, email, name } de um segmento */
export async function resolveRecipients(rules) {
  const c = await buildPersonConstraints(rules);
  let q = core().from("persons")
    .select("id, full_name, primary_email")
    .eq("workspace_id", WORKSPACE_VANTARI)
    .not("primary_email", "is", null);
  q = applyConstraints(q, c);
  const { data, error } = await q.limit(5000);
  if (error) throw error;
  return (data || [])
    .filter(p => p.primary_email)
    .map(p => ({ person_id: p.id, name: p.full_name, email: p.primary_email }));
}
