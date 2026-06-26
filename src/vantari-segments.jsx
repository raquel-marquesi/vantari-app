import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabase";
import {
  Loader2, AlertCircle, BarChart2, Users, Mail, Star,
  LayoutTemplate, Bot, Plug, Settings, Zap, Plus, X,
  Filter, Layers, Trash2, Copy, Edit2, Briefcase,
} from "lucide-react";

/* ───── DESIGN TOKENS ───── */
const T = {
  // Brand
  teal:    "#0D7491",
  blue:    "#0D7491",
  green:   "#14A273",
  brand2:  "#1F76BC",
  deep:    "#0A3D4D",
  gradient: "linear-gradient(135deg, #0D7491 0%, #14A273 100%)",
  sidebarBg: "linear-gradient(180deg, #0D7491 0%, #0A5165 60%, #0A3D4D 100%)",

  // Data accents
  violet:  "#7C5CFF",
  amber:   "#F59E0B",
  orange:  "#F59E0B",
  coral:   "#FF6B5E",
  red:     "#FF6B5E",
  cyan:    "#06B6D4",
  rose:    "#EC4899",
  purple:  "#7C5CFF",

  // Surfaces & ink
  bg:      "#F5F8FB",
  surface: "#FFFFFF",
  border:  "#E8EEF3",

  // Ink scale
  ink:     "#0E1A24",
  text:    "#2E3D4B",
  muted:   "#5A6B7A",
  faint3:  "#8696A5",
  faint:   "#F5F8FB",

  // Fonts
  font:    "'Inter', system-ui, sans-serif",
  head:    "'Sora', system-ui, sans-serif",
  mono:    "'JetBrains Mono', monospace",

  // Aliases for compat
  primary: "#0D7491",
  accent:  "#14A273",
  danger:  "#FF6B5E",
};

const SPIN = `@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`;

/* ───── CORE CANÔNICO ─────
   Segmentação roda sobre o cadastro único:
     - pessoa     → core.persons
     - score      → mkt.lead_scores   (Interesse + Perfil A-D)
     - estágio    → crm.deals → crm.stages (Esteira de Aquisição)
     - eventos    → core.events       (visita de página etc.)
     - consent    → core.consents     (descadastro de email)
   `mkt` precisa estar exposto no PostgREST (Supabase → API → Exposed schemas). */
const WORKSPACE_VANTARI = "53092199-7b75-4342-a897-f589d6f34922";
const core = () => supabase.schema("core");
const mkt  = () => supabase.schema("mkt");
const crm  = () => supabase.schema("crm");
const NIL  = "00000000-0000-0000-0000-000000000000"; // id impossível p/ forçar conjunto vazio

/* ───── SIDEBAR NAV HELPERS ───── */
const NavSection = ({ label }) => (
  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.18em", color: "rgba(255,255,255,0.4)", padding: "10px 20px 4px", textTransform: "uppercase", fontFamily: T.head }}>
    {label}
  </div>
);

const NavItem = ({ icon: Icon, label, active = false, path }) => {
  const [hov, setHov] = useState(false);
  const navigate = useNavigate();
  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={() => path && navigate(path)}
      style={{
        position: "relative",
        display: "flex", alignItems: "center", gap: 9,
        padding: "8px 20px", fontSize: 13.5,
        fontWeight: active ? 700 : 600, fontFamily: T.font,
        color: active ? "#fff" : hov ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.6)",
        background: active ? "rgba(255,255,255,0.10)" : hov ? "rgba(255,255,255,0.06)" : "transparent",
        cursor: "pointer", transition: "all 0.15s", userSelect: "none",
      }}
    >
      {active && (
        <span style={{
          position: "absolute", left: 0, top: 6, bottom: 6, width: 3,
          background: "linear-gradient(180deg, #14A273 0%, #5EEAD4 100%)",
          borderRadius: "0 3px 3px 0",
        }} />
      )}
      {Icon && <Icon size={16} aria-hidden="true" />}{label}
    </div>
  );
};

/* ─── filter fields and operators (sobre o core) ─── */
const FIELDS = [
  // src indica de onde o valor é resolvido (ver computeLeads)
  { value: "interest_points", label: "Score (Interesse)",   type: "number", src: "score" },
  { value: "interest_band",   label: "Faixa de Interesse",  type: "enum",   src: "score", opts: ["cold","warm","hot","sql"] },
  { value: "profile",         label: "Perfil (A-D)",        type: "enum",   src: "score", opts: ["A","B","C","D"] },
  { value: "status",          label: "Status",              type: "enum",   src: "person", col: "status", opts: ["identificado","pendente"] },
  { value: "stage",           label: "Estágio (negócio)",   type: "stage",  src: "deal" },
  { value: "full_name",       label: "Nome",                type: "text",   src: "person", col: "full_name" },
  { value: "email",           label: "Email",               type: "text",   src: "person", col: "primary_email" },
  { value: "phone",           label: "Telefone",            type: "text",   src: "person", col: "primary_phone" },
  { value: "company",         label: "Empresa",             type: "text",   src: "company" },
  { value: "visited_page",    label: "Visitou página",      type: "page",   src: "event" },   // core.events (inerte até tracker no core)
  { value: "unsubscribed",    label: "Descadastrado (email)", type: "bool", src: "consent" }, // core.consents (inerte até consent no core)
];
const fieldOf = (rule) => FIELDS.find(f => f.value === rule.field) || FIELDS[0];

const OPS = {
  number: [{ v: "gt", l: ">" }, { v: "gte", l: "≥" }, { v: "lt", l: "<" }, { v: "lte", l: "≤" }, { v: "eq", l: "=" }],
  text:   [{ v: "ilike_c", l: "contém" }, { v: "eq", l: "=" }, { v: "neq", l: "≠" }],
  enum:   [{ v: "eq", l: "=" }, { v: "neq", l: "≠" }],
  bool:   [{ v: "eq", l: "=" }],
  stage:  [{ v: "eq", l: "está em" }, { v: "neq", l: "não está em" }],
  page:   [{ v: "visited", l: "visitou" }, { v: "not_visited", l: "não visitou" }],
};

/* ─── aplica um operador a um query builder do PostgREST ─── */
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

/* intersecta arrays de person_id (lógica AND entre conjuntos). null = irrestrito. */
function intersect(allowed, ids) {
  const set = new Set(ids);
  if (allowed === null) return set;
  return new Set([...allowed].filter(x => set.has(x)));
}

/* ─── resolve as restrições de um segmento sobre o core ───
   Filtros que vivem em outros schemas (score/estágio/visita/consent/empresa)
   são resolvidos para conjuntos de person_id aqui. Devolve um objeto de
   restrições; quem consulta core.persons chama .select() primeiro e só então
   aplica via applyConstraints (no supabase-js os filtros exigem pós-select). */
async function buildPersonConstraints(filters) {
  const rules = (filters || []).filter(r => r.field && r.op && r.value !== "" && r.value != null);

  let allowed = null;            // conjunto de person_id permitidos (AND); null = todos
  const exclude = new Set();     // person_id removidos

  // SCORE / PERFIL — mkt.lead_scores (todas as regras de score numa query só)
  const scoreRules = rules.filter(r => fieldOf(r).src === "score");
  if (scoreRules.length) {
    let q = mkt().from("lead_scores").select("person_id").eq("workspace_id", WORKSPACE_VANTARI);
    for (const r of scoreRules) q = applyOp(q, r.field, fieldOf(r), r);
    const { data, error } = await q.limit(5000);
    if (error) throw error;
    allowed = intersect(allowed, (data || []).map(x => x.person_id));
  }

  // ESTÁGIO — crm.deals (pessoa com negócio no estágio). value = stage_id
  for (const r of rules.filter(r => r.field === "stage")) {
    const { data, error } = await crm().from("deals")
      .select("person_id").eq("workspace_id", WORKSPACE_VANTARI).eq("stage_id", r.value).limit(5000);
    if (error) throw error;
    const ids = (data || []).map(x => x.person_id).filter(Boolean);
    if (r.op === "neq") ids.forEach(i => exclude.add(i));
    else allowed = intersect(allowed, ids);
  }

  // VISITOU PÁGINA — core.events type=page_visit. value = path observado
  for (const r of rules.filter(r => r.field === "visited_page")) {
    const { data, error } = await core().from("events")
      .select("person_id").eq("type", "page_visit").eq("payload->>path", r.value)
      .not("person_id", "is", null).limit(5000);
    if (error) throw error;
    const ids = Array.from(new Set((data || []).map(x => x.person_id)));
    if (r.op === "not_visited") ids.forEach(i => exclude.add(i));
    else allowed = intersect(allowed, ids);
  }

  // DESCADASTRO — core.consents (email revogado)
  const unsub = rules.find(r => r.field === "unsubscribed");
  if (unsub) {
    const { data, error } = await core().from("consents")
      .select("person_id").eq("channel", "email").eq("status", "revoked").limit(5000);
    if (error) throw error;
    const ids = Array.from(new Set((data || []).map(x => x.person_id)));
    if (unsub.value === "true") allowed = intersect(allowed, ids);
    else ids.forEach(i => exclude.add(i));   // descadastrado = não → exclui revogados
  }

  // EMPRESA — resolve nome → company_ids (vira filtro direto persons.company_id in)
  let companyIds = null;
  for (const r of rules.filter(r => r.field === "company")) {
    let cq = core().from("companies").select("id").eq("workspace_id", WORKSPACE_VANTARI);
    cq = applyOp(cq, "name", { type: "text" }, r);
    const { data, error } = await cq.limit(5000);
    if (error) throw error;
    const ids = (data || []).map(x => x.id);
    companyIds = companyIds === null ? ids : companyIds.filter(i => ids.includes(i));
  }

  // BASE — devolve as restrições da pessoa; o chamador aplica DEPOIS do .select()
  // (no supabase-js os filtros .eq/.in/.not só existem no builder pós-select)
  return {
    personRules: rules.filter(r => fieldOf(r).src === "person"),
    companyIds,
    allowed,
    exclude,
  };
}

/* aplica as restrições a um builder de core.persons que JÁ chamou .select() */
function applyConstraints(q, c) {
  for (const r of c.personRules) q = applyOp(q, fieldOf(r).col || r.field, fieldOf(r), r);
  if (c.companyIds !== null) q = q.in("company_id", c.companyIds.length ? c.companyIds : [NIL]);
  if (c.allowed !== null) { const arr = [...c.allowed]; q = q.in("id", arr.length ? arr : [NIL]); }
  if (c.exclude.size) q = q.not("id", "in", `(${[...c.exclude].join(",")})`);
  return q;
}

/* ─── computa as pessoas de um segmento dinâmico (com score p/ exibição) ─── */
async function computeLeads(filters) {
  try {
    const c = await buildPersonConstraints(filters);
    let q = core().from("persons")
      .select("id, full_name, primary_email, status, company_id")
      .eq("workspace_id", WORKSPACE_VANTARI);
    q = applyConstraints(q, c);
    const { data: persons, error } = await q.order("created_at", { ascending: false }).limit(200);
    if (error) throw error;

    const ids = (persons || []).map(p => p.id);
    const scoreMap = {};
    if (ids.length) {
      const { data: sc } = await mkt().from("lead_scores")
        .select("person_id, interest_points, interest_band, profile").in("person_id", ids);
      (sc || []).forEach(s => { scoreMap[s.person_id] = s; });
    }
    const out = (persons || []).map(p => ({
      id: p.id,
      name: p.full_name,
      email: p.primary_email,
      status: p.status,
      score: scoreMap[p.id]?.interest_points ?? 0,
      band: scoreMap[p.id]?.interest_band ?? "cold",
      profile: scoreMap[p.id]?.profile ?? null,
    }));
    return { data: out, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

/* ─── conta as pessoas de um segmento (sem enriquecer) ─── */
async function countLeads(filters) {
  try {
    const c = await buildPersonConstraints(filters);
    let q = core().from("persons")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", WORKSPACE_VANTARI);
    q = applyConstraints(q, c);
    const { count, error } = await q;
    if (error) throw error;
    return { count: count ?? 0, error: null };
  } catch (err) {
    return { count: 0, error: err };
  }
}

/* ─── score badge (bandas do core: cold/warm/hot/sql) ─── */
function ScoreBadge({ score, band }) {
  const b = band || (score >= 80 ? "sql" : score >= 51 ? "hot" : score >= 21 ? "warm" : "cold");
  const map = {
    sql:  { label: "Sales Ready", bg: "#d1fae5",        cl: "#059669" },
    hot:  { label: "Hot",         bg: `${T.coral}18`,   cl: T.coral   },
    warm: { label: "Warm",        bg: "#fef3c7",        cl: "#d97706" },
    cold: { label: "Cold",        bg: T.border,         cl: T.muted   },
  };
  const s = map[b] || map.cold;
  return (
    <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: s.bg, color: s.cl, fontWeight: 700, fontFamily: T.font }}>
      {score} · {s.label}
    </span>
  );
}

/* ─── status badge (core: pendente / identificado) ─── */
function StatusBadge({ status }) {
  const s = status === "identificado"
    ? { label: "Identificado", bg: "#F0FDF7", cl: "#0F6E4E" }
    : { label: "Pendente",     bg: "#FFF8E6", cl: "#9A6A00" };
  return (
    <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: s.bg, color: s.cl, fontWeight: 700, fontFamily: T.font }}>
      {s.label}
    </span>
  );
}

/* ─── rule row ─── */
function RuleRow({ rule, onChange, onRemove }) {
  const field = fieldOf(rule);
  const ops   = OPS[field.type] || OPS.text;
  const inp = { fontFamily: T.font, fontSize: 13, border: `1px solid ${T.border}`, borderRadius: 7, padding: "6px 10px", outline: "none", background: "#fff", color: T.text };
  const [pages, setPages]   = useState([]);
  const [stages, setStages] = useState([]);

  useEffect(() => {
    if (field.type === "page") {
      core().from("events").select("payload").eq("type", "page_visit").limit(500)
        .then(({ data }) => {
          const paths = Array.from(new Set((data || []).map(e => e.payload?.path || e.payload?.url).filter(Boolean)));
          setPages(paths.map(p => ({ id: p, label: p })));
        });
    } else if (field.type === "stage") {
      crm().from("stages").select("id, name, position").eq("workspace_id", WORKSPACE_VANTARI)
        .order("position", { ascending: true })
        .then(({ data }) => setStages(data || []));
    }
  }, [field.type]);

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
      <select value={rule.field} onChange={e => onChange({ ...rule, field: e.target.value, op: (OPS[fieldOf({ field: e.target.value }).type] || OPS.text)[0].v, value: "" })} style={{ ...inp, flex: "0 0 160px" }}>
        {FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
      </select>
      <select value={rule.op} onChange={e => onChange({ ...rule, op: e.target.value })} style={{ ...inp, flex: "0 0 110px" }}>
        {ops.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
      {field.type === "enum" ? (
        <select value={rule.value} onChange={e => onChange({ ...rule, value: e.target.value })} style={{ ...inp, flex: 1 }}>
          <option value="">— selecionar —</option>
          {field.opts.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : field.type === "bool" ? (
        <select value={rule.value} onChange={e => onChange({ ...rule, value: e.target.value })} style={{ ...inp, flex: 1 }}>
          <option value="false">Não</option>
          <option value="true">Sim</option>
        </select>
      ) : field.type === "stage" ? (
        <select value={rule.value} onChange={e => onChange({ ...rule, value: e.target.value })} style={{ ...inp, flex: 1 }}>
          <option value="">— selecionar estágio —</option>
          {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      ) : field.type === "page" ? (
        <select value={rule.value} onChange={e => onChange({ ...rule, value: e.target.value })} style={{ ...inp, flex: 1 }}>
          <option value="">— página observada —</option>
          {pages.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      ) : (
        <input value={rule.value} onChange={e => onChange({ ...rule, value: e.target.value })} placeholder={field.type === "number" ? "0" : "valor..."} style={{ ...inp, flex: 1 }} type={field.type === "number" ? "number" : "text"} />
      )}
      <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, padding: 4, display: "flex", alignItems: "center" }}>
        <X size={15} aria-hidden="true" />
      </button>
    </div>
  );
}

/* ─── create / edit modal ─── */
function SegmentModal({ segment, onClose, onSave }) {
  const isEdit = !!segment?.id;
  const [name, setName]         = useState(segment?.name || "");
  const [desc, setDesc]         = useState(segment?.description || "");
  const [filters, setFilters]   = useState(segment?.rules || []);
  const [preview, setPreview]   = useState([]);
  const [previewCount, setPreviewCount] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState(null);

  const addRule = () => setFilters(f => [...f, { field: "interest_points", op: "gte", value: "" }]);
  const updateRule = (i, r) => setFilters(f => f.map((x, idx) => idx === i ? r : x));
  const removeRule = (i) => setFilters(f => f.filter((_, idx) => idx !== i));

  const runPreview = useCallback(async () => {
    setPreviewLoading(true); setPreviewError(null);
    const { data, error: err } = await computeLeads(filters);
    if (err) { setPreviewError(err.message || String(err)); setPreview([]); setPreviewCount(null); }
    else { setPreview(data || []); setPreviewCount(data?.length ?? 0); }
    setPreviewLoading(false);
  }, [filters]);

  useEffect(() => {
    const t = setTimeout(runPreview, 600);
    return () => clearTimeout(t);
  }, [runPreview]);

  const handleSave = async () => {
    if (!name.trim()) { setError("Nome obrigatório"); return; }
    setSaving(true); setError(null);
    const payload = { name: name.trim(), description: desc.trim(), rules: filters, updated_at: new Date().toISOString() };
    let err;
    if (isEdit) {
      ({ error: err } = await supabase.from("segments").update(payload).eq("id", segment.id));
    } else {
      ({ error: err } = await supabase.from("segments").insert(payload));
    }
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSave();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#fff", borderRadius: 16, width: "90%", maxWidth: 900, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 25px 60px rgba(0,0,0,0.18)", animation: "fadeUp 0.2s ease" }}>
        <style>{SPIN}</style>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: `1px solid ${T.border}` }}>
          <h3 style={{ margin: 0, fontFamily: T.head, fontSize: 16, fontWeight: 700, color: T.ink }}>{isEdit ? "Editar Segmento" : "Novo Segmento"}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted }}><X size={20} aria-hidden="true" /></button>
        </div>

        <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
          {/* left: form */}
          <div style={{ flex: "0 0 430px", padding: "20px 24px", borderRight: `1px solid ${T.border}`, overflowY: "auto" }}>
            {error && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: `${T.danger}14`, border: `1px solid ${T.danger}`, borderRadius: 8, padding: "9px 12px", marginBottom: 14 }}>
                <AlertCircle size={15} color={T.danger} aria-hidden="true" />
                <span style={{ fontSize: 13, color: T.danger, fontFamily: T.font }}>{error}</span>
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontFamily: T.head, fontSize: 11, fontWeight: 700, color: T.muted, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>Nome *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Leads Quentes Perfil A" style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", fontSize: 14, fontFamily: T.font, border: `1px solid ${T.border}`, borderRadius: 8, outline: "none", color: T.text }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontFamily: T.head, fontSize: 11, fontWeight: 700, color: T.muted, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>Descrição</label>
              <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descrição opcional..." style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", fontSize: 13, fontFamily: T.font, border: `1px solid ${T.border}`, borderRadius: 8, outline: "none", color: T.text }} />
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <label style={{ fontFamily: T.head, fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>Regras (AND)</label>
                <button onClick={addRule} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: `1px solid ${T.teal}`, borderRadius: 6, padding: "4px 10px", fontSize: 11, color: T.teal, cursor: "pointer", fontFamily: T.font, fontWeight: 700 }}>
                  <Plus size={12} aria-hidden="true" /> Adicionar regra
                </button>
              </div>
              {filters.length === 0 && (
                <div style={{ textAlign: "center", padding: "20px 10px", background: T.faint, borderRadius: 8, color: T.muted, fontSize: 13, fontFamily: T.font }}>
                  Sem regras = todas as pessoas do core. Clique em "Adicionar regra" para filtrar.
                </div>
              )}
              {filters.map((rule, i) => (
                <RuleRow key={i} rule={rule} onChange={r => updateRule(i, r)} onRemove={() => removeRule(i)} />
              ))}
            </div>
          </div>

          {/* right: preview */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10 }}>
              <Filter size={14} color={T.teal} aria-hidden="true" />
              <span style={{ fontFamily: T.head, fontSize: 13, fontWeight: 700, color: T.ink }}>Preview</span>
              {previewLoading
                ? <Loader2 size={14} style={{ animation: "spin 0.7s linear infinite", marginLeft: "auto" }} aria-hidden="true" />
                : previewCount !== null
                  ? <span style={{ marginLeft: "auto", fontFamily: T.font, fontSize: 13, fontWeight: 700, color: T.teal }}>{previewCount} pessoas</span>
                  : null
              }
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 20px" }}>
              {previewError ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: T.danger, gap: 8, textAlign: "center", padding: "0 16px" }}>
                  <AlertCircle size={28} color={T.danger} aria-hidden="true" />
                  <span style={{ fontFamily: T.font, fontSize: 12.5 }}>{previewError}</span>
                  <span style={{ fontFamily: T.font, fontSize: 11, color: T.muted }}>Score/Perfil exigem o schema <code>mkt</code> exposto no PostgREST.</span>
                </div>
              ) : previewLoading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 8, color: T.muted }}>
                  <Loader2 size={18} style={{ animation: "spin 0.7s linear infinite" }} aria-hidden="true" />
                  <span style={{ fontFamily: T.font, fontSize: 13 }}>Computando...</span>
                </div>
              ) : preview.length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: T.muted, gap: 8 }}>
                  <Users size={32} color={T.border} aria-hidden="true" />
                  <span style={{ fontFamily: T.font, fontSize: 13 }}>Nenhuma pessoa corresponde às regras</span>
                </div>
              ) : (
                preview.slice(0, 50).map(lead => (
                  <div key={lead.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: `1px solid ${T.border}` }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#E8F5FB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontFamily: T.head, fontSize: 12, fontWeight: 700, color: T.teal }}>{(lead.name || lead.email || "?")[0].toUpperCase()}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: T.font, fontSize: 13, fontWeight: 700, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lead.name || "—"}</div>
                      <div style={{ fontFamily: T.font, fontSize: 11, color: T.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lead.email}</div>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <StatusBadge status={lead.status} />
                      <ScoreBadge score={lead.score || 0} band={lead.band} />
                    </div>
                  </div>
                ))
              )}
              {preview.length > 50 && (
                <div style={{ textAlign: "center", padding: 12, fontFamily: T.font, fontSize: 12, color: T.muted }}>+ {preview.length - 50} pessoas não exibidas</div>
              )}
            </div>
          </div>
        </div>

        {/* footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 24px", borderTop: `1px solid ${T.border}` }}>
          <button onClick={onClose} style={{ padding: "8px 18px", borderRadius: 10, border: `1px solid ${T.border}`, background: "#fff", color: T.text, fontSize: 13, cursor: "pointer", fontFamily: T.font, fontWeight: 600 }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={{ padding: "8px 22px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #0D7491 0%, #14A273 100%)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, fontFamily: T.font, display: "flex", alignItems: "center", gap: 6 }}>
            {saving && <Loader2 size={14} style={{ animation: "spin 0.7s linear infinite" }} aria-hidden="true" />}
            {isEdit ? "Salvar alterações" : "Criar segmento"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── segment card ─── */
function SegmentCard({ segment, leadCount, loading, onEdit, onDuplicate, onDelete }) {
  const [hov, setHov] = useState(false);
  const ruleCount = segment.rules?.length || 0;

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: "#fff", borderRadius: 14,
        border: `1px solid ${hov ? T.teal + "66" : T.border}`,
        padding: "18px 20px", transition: "all 0.15s",
        boxShadow: hov
          ? "0 1px 0 rgba(14,26,36,.04), 0 16px 36px -16px rgba(14,26,36,.15)"
          : "0 1px 0 rgba(14,26,36,.03), 0 8px 24px -16px rgba(14,26,36,.08)",
      }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
          <h3 style={{ margin: "0 0 4px", fontFamily: T.head, fontSize: 14, fontWeight: 700, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{segment.name}</h3>
          {segment.description && <p style={{ margin: 0, fontFamily: T.font, fontSize: 12, color: T.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{segment.description}</p>}
        </div>
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, padding: "3px 8px", borderRadius: 20, background: "#E8F5FB", color: T.teal, fontWeight: 700, fontFamily: T.font, flexShrink: 0 }}>
          <Filter size={11} aria-hidden="true" />{ruleCount > 0 ? `${ruleCount} regra${ruleCount > 1 ? "s" : ""}` : "todos"}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
        {loading
          ? <Loader2 size={14} style={{ animation: "spin 0.7s linear infinite", color: T.muted }} aria-hidden="true" />
          : <><Users size={14} color={T.teal} aria-hidden="true" /><span style={{ fontFamily: T.head, fontSize: 22, fontWeight: 700, color: T.ink, letterSpacing: "-0.035em", fontVariantNumeric: "tabular-nums" }}>{leadCount ?? "—"}</span><span style={{ fontFamily: T.font, fontSize: 12, color: T.muted }}>pessoas</span></>
        }
      </div>

      {ruleCount > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
          {segment.rules.slice(0, 3).map((rule, i) => {
            const f = FIELDS.find(x => x.value === rule.field);
            const allOps = [...OPS.number, ...OPS.text, ...OPS.enum, ...OPS.stage, ...OPS.page];
            const o = allOps.find(x => x.v === rule.op);
            return (
              <span key={i} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: T.faint, color: T.muted, border: `1px solid ${T.border}`, fontFamily: T.font }}>
                {f?.label} {o?.l} {f?.type === "stage" || f?.type === "page" ? "" : rule.value}
              </span>
            );
          })}
          {ruleCount > 3 && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: T.faint, color: T.muted, border: `1px solid ${T.border}`, fontFamily: T.font }}>+{ruleCount - 3} regras</span>}
        </div>
      )}

      <div style={{ display: "flex", gap: 6, paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
        <button onClick={() => onEdit(segment)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "6px 0", borderRadius: 8, border: `1px solid ${T.border}`, background: "none", color: T.text, fontSize: 12, cursor: "pointer", fontFamily: T.font, fontWeight: 600 }}>
          <Edit2 size={12} aria-hidden="true" /> Editar
        </button>
        <button onClick={() => onDuplicate(segment)} style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${T.border}`, background: "none", color: T.muted, cursor: "pointer" }} title="Duplicar">
          <Copy size={13} aria-hidden="true" />
        </button>
        <button onClick={() => onDelete(segment.id)} style={{ padding: "6px 10px", borderRadius: 8, border: "none", background: "none", color: T.muted, cursor: "pointer" }} title="Remover">
          <Trash2 size={13} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/* ─── Phase 5: Hero KPI Components ─── */
const SparklineChart = ({ data = [], color }) => {
  const pts = (data.length >= 2 ? data : Array(7).fill(0));
  const max = Math.max(...pts) || 1;
  const min = Math.min(...pts);
  const range = max - min || 1;
  const W = 220, H = 36;
  const x = (i) => (i / (pts.length - 1)) * W;
  const y = (v) => H - ((v - min) / range) * (H - 6) - 3;
  const line = pts.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H}Z`;
  const gradId = `sg${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
      style={{ display: "block", width: "calc(100% + 32px)", height: 36, margin: "8px -16px -1px" }}
      aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={line} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const TrendChipHero = ({ value }) => {
  const up = value >= 0;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, fontFamily: T.mono,
      background: up ? `${T.green}14` : `${T.coral}14`, color: up ? T.green : T.coral }}>
      {up ? "↗" : "↘"} {Math.abs(value)}%
    </span>
  );
};

const HeroKpiCard = ({ icon: Icon, label, value, trend, color, sub, sparkData }) => (
  <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14,
    padding: "14px 16px 0", position: "relative", overflow: "hidden",
    boxShadow: "0 1px 0 rgba(14,26,36,.03), 0 8px 24px -16px rgba(14,26,36,.08)" }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: "14px 14px 0 0" }} />
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ width: 32, height: 32, borderRadius: 9, background: `${color}14`, display: "grid", placeItems: "center" }}>
        {Icon && <Icon size={16} color={color} aria-hidden="true" />}
      </div>
      {trend !== undefined && <TrendChipHero value={trend} />}
    </div>
    <div style={{ fontSize: 28, fontWeight: 700, color: T.ink, fontFamily: T.head, letterSpacing: "-0.03em",
      fontVariantNumeric: "tabular-nums", margin: "10px 0 3px", lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 11.5, color: T.muted, fontWeight: 600, fontFamily: T.font }}>{label}</div>
    {sub && <div style={{ fontSize: 10.5, color, fontWeight: 700, fontFamily: T.mono, margin: "2px 0 8px" }}>{sub}</div>}
    {!sub && <div style={{ height: 8 }} />}
    <SparklineChart data={sparkData} color={color} />
  </div>
);

/* ─── detail panel ─── */
function SegmentDetail({ segment, onClose }) {
  const [leads, setLeads]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError(null);
      const { data, error: err } = await computeLeads(segment.rules || []);
      if (err) setError(err.message || String(err));
      else setLeads(data || []);
      setLoading(false);
    };
    load();
  }, [segment]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 900, display: "flex", justifyContent: "flex-end" }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: 420, height: "100%", background: "#fff", borderLeft: `1px solid ${T.border}`, boxShadow: "-4px 0 30px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", animation: "slideIn 0.2s ease" }}>
        <style>{`${SPIN}@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: `1px solid ${T.border}` }}>
          <div>
            <h3 style={{ margin: "0 0 2px", fontFamily: T.head, fontSize: 15, fontWeight: 700, color: T.ink }}>{segment.name}</h3>
            {segment.description && <p style={{ margin: 0, fontFamily: T.font, fontSize: 12, color: T.muted }}>{segment.description}</p>}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted }}><X size={18} aria-hidden="true" /></button>
        </div>
        <div style={{ padding: "12px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8 }}>
          <Users size={14} color={T.teal} aria-hidden="true" />
          <span style={{ fontFamily: T.head, fontSize: 14, fontWeight: 700, color: T.ink }}>{loading ? "..." : leads.length} pessoas</span>
          {loading && <Loader2 size={14} style={{ animation: "spin 0.7s linear infinite", color: T.muted }} aria-hidden="true" />}
        </div>
        {error && (
          <div style={{ margin: "12px 20px", display: "flex", alignItems: "center", gap: 8, background: `${T.danger}14`, border: `1px solid ${T.danger}`, borderRadius: 8, padding: "9px 12px" }}>
            <AlertCircle size={14} color={T.danger} aria-hidden="true" />
            <span style={{ fontSize: 12, color: T.danger, fontFamily: T.font }}>{error}</span>
          </div>
        )}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 20px" }}>
          {!loading && leads.length === 0 && !error && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, gap: 8, color: T.muted }}>
              <Users size={28} color={T.border} aria-hidden="true" />
              <span style={{ fontFamily: T.font, fontSize: 13 }}>Nenhuma pessoa corresponde a este segmento</span>
            </div>
          )}
          {leads.map(lead => (
            <div key={lead.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#E8F5FB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontFamily: T.head, fontSize: 13, fontWeight: 700, color: T.teal }}>{(lead.name || lead.email || "?")[0].toUpperCase()}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: T.font, fontSize: 13, fontWeight: 700, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lead.name || "—"}</div>
                <div style={{ fontFamily: T.font, fontSize: 11, color: T.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lead.email}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
                <StatusBadge status={lead.status} />
                <ScoreBadge score={lead.score || 0} band={lead.band} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── main page ─── */
export default function VantariSegments() {
  const [segments, setSegments]   = useState([]);
  const [leadCounts, setLeadCounts] = useState({});
  const [counting, setCounting]   = useState({});
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [modal, setModal]         = useState(null);
  const [detail, setDetail]       = useState(null);
  const [search, setSearch]       = useState("");

  const [segSpark, setSegSpark] = useState({ segments: [], leads: [] });

  useEffect(() => {
    const loadSpark = async () => {
      const sevenAgo = new Date();
      sevenAgo.setMonth(sevenAgo.getMonth() - 7);
      const [{ data: segData }, { data: personData }] = await Promise.all([
        supabase.from("segments").select("created_at").gte("created_at", sevenAgo.toISOString()),
        core().from("persons").select("created_at").eq("workspace_id", WORKSPACE_VANTARI).gte("created_at", sevenAgo.toISOString()),
      ]);
      const now = new Date();
      const buckets = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1);
        return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, segs: 0, leads: 0 };
      });
      (segData || []).forEach(r => {
        const d = new Date(r.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const b = buckets.find(m => m.key === key);
        if (b) b.segs++;
      });
      (personData || []).forEach(r => {
        const d = new Date(r.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const b = buckets.find(m => m.key === key);
        if (b) b.leads++;
      });
      setSegSpark({ segments: buckets.map(b => b.segs), leads: buckets.map(b => b.leads) });
    };
    loadSpark();
  }, []);

  const loadSegments = useCallback(async () => {
    setLoading(true); setError(null);
    const { data, error: err } = await supabase
      .from("segments")
      .select("*")
      .order("created_at", { ascending: false });
    if (err) { setError(err.message); setLoading(false); return; }
    setSegments(data || []);
    setLoading(false);
    for (const seg of (data || [])) {
      setCounting(c => ({ ...c, [seg.id]: true }));
      const { count } = await countLeads(seg.rules || []);
      setLeadCounts(lc => ({ ...lc, [seg.id]: count ?? 0 }));
      setCounting(c => ({ ...c, [seg.id]: false }));
    }
  }, []);

  useEffect(() => { loadSegments(); }, [loadSegments]);

  const handleDelete = async (id) => {
    if (!confirm("Remover este segmento?")) return;
    await supabase.from("segments").delete().eq("id", id);
    setSegments(s => s.filter(x => x.id !== id));
    setLeadCounts(lc => { const n = { ...lc }; delete n[id]; return n; });
    if (detail?.id === id) setDetail(null);
  };

  const handleDuplicate = async (seg) => {
    const { data } = await supabase.from("segments")
      .insert({ name: seg.name + " (cópia)", description: seg.description, rules: seg.rules })
      .select().single();
    if (data) setSegments(s => [data, ...s]);
  };

  const handleSave = () => {
    setModal(null);
    loadSegments();
  };

  const filtered = segments.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  const totalLeads = Object.values(leadCounts).reduce((a, b) => a + b, 0);

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: T.font, background: T.bg }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #B3BFCA; border-radius: 99px; }
        ${SPIN}
      `}</style>

      {/* ── SIDEBAR ── */}
      <div style={{
        width: 240, flexShrink: 0,
        background: T.sidebarBg,
        display: "flex", flexDirection: "column",
        height: "100vh", position: "sticky", top: 0,
        overflow: "hidden",
      }}>
        {/* glow topo-direito */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(circle at 90% 0%, rgba(20,162,115,.25) 0%, transparent 50%)",
        }} />

        {/* Brand */}
        <div style={{ padding: "20px 20px 0", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 20, borderBottom: "1px solid rgba(255,255,255,.08)", marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, background: "white", borderRadius: 8, display: "grid", placeItems: "center", flexShrink: 0 }}>
              <img src="/icone.png" alt="" style={{ width: 22, height: 22 }} />
            </div>
            <span style={{ fontFamily: T.head, fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "white" }}>vantari</span>
            <span style={{ marginLeft: "auto", fontSize: 10, background: "rgba(255,255,255,.12)", padding: "3px 8px", borderRadius: 6, letterSpacing: "0.08em", fontWeight: 600, color: "rgba(255,255,255,.85)" }}>PRO</span>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", paddingTop: 0, position: "relative" }}>
          <NavSection label="Principal" />
          <NavItem icon={BarChart2}      label="Analytics"       path="/dashboard"    />
          <NavItem icon={Users}          label="Leads"           path="/leads"        />
          <NavItem icon={Mail}           label="Email Marketing" path="/email"        />
          <NavSection label="CRM" />
          <NavItem icon={Briefcase} label="Negócios" path="/crm" />
          <NavSection label="Ferramentas" />
          <NavItem icon={Star}           label="Scoring"         path="/scoring"      />
          <NavItem icon={Filter}         label="Segmentação"     path="/segments"     active />
          <NavItem icon={LayoutTemplate} label="Landing Pages"   path="/landing"      />
          <NavItem icon={Bot}            label="IA & Automação"  path="/ai-marketing" />
          <NavItem icon={Zap}            label="Workflows"       path="/workflow"     />
          <NavSection label="Sistema" />
          <NavItem icon={Plug}           label="Integrações"     path="/integrations" />
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "8px 0", position: "relative" }}>
          <NavItem icon={Settings} label="Configurações" path="/settings" />
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* topbar */}
        <div style={{ padding: "20px 28px 16px", borderBottom: `1px solid ${T.border}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <h1 style={{ fontFamily: T.head, fontSize: 20, fontWeight: 700, color: T.ink, margin: 0, letterSpacing: "-0.02em" }}>Segmentação</h1>
            <p style={{ fontSize: 13, color: T.muted, margin: "4px 0 0", fontFamily: T.font }}>
              {loading ? "Carregando..." : `${segments.length} segmentos · cadastro único (core)`}
            </p>
          </div>
          <button onClick={() => setModal("new")} style={{ display: "flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg, #0D7491 0%, #14A273 100%)", color: "#fff", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: T.font, boxShadow: "0 4px 14px -4px rgba(13,116,145,.4)" }}>
            <Plus size={15} aria-hidden="true" /> Novo Segmento
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", background: "linear-gradient(180deg, #F7F4FF 0%, #F0EAFF 100%)" }}>
          {/* Hero KPI cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
            <HeroKpiCard
              icon={Layers}   color={T.teal}   trend={0}
              label="Total de Segmentos"
              value={segments.length.toLocaleString("pt-BR")}
              sub="criados"
              sparkData={segSpark.segments}
            />
            <HeroKpiCard
              icon={Users}    color={T.violet} trend={0}
              label="Pessoas Segmentadas"
              value={totalLeads.toLocaleString("pt-BR")}
              sub="em segmentos"
              sparkData={segSpark.leads}
            />
            <HeroKpiCard
              icon={Zap}      color={T.green}  trend={0}
              label="Média por Segmento"
              value={Math.round(totalLeads / (segments.length || 1)).toLocaleString("pt-BR")}
              sub="pessoas / segmento"
              sparkData={segSpark.leads}
            />
            <HeroKpiCard
              icon={Filter}   color={T.amber}  trend={0}
              label="Com Regras"
              value={segments.filter(s => (s.rules?.length || 0) > 0).length.toLocaleString("pt-BR")}
              sub="segmentos filtrados"
              sparkData={segSpark.segments}
            />
          </div>

          {/* search */}
          <div style={{ marginBottom: 18 }}>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar segmento..."
              style={{ width: "100%", maxWidth: 360, boxSizing: "border-box", padding: "8px 14px", fontSize: 13, fontFamily: T.font, border: `1px solid ${T.border}`, borderRadius: 8, outline: "none", background: "#fff", color: T.text }}
            />
          </div>

          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: `${T.danger}14`, border: `1px solid ${T.danger}`, borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}>
              <AlertCircle size={16} color={T.danger} aria-hidden="true" />
              <span style={{ fontSize: 13, color: T.danger, fontFamily: T.font }}>{error}</span>
            </div>
          )}

          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: 60, color: T.muted }}>
              <Loader2 size={20} style={{ animation: "spin 0.7s linear infinite" }} aria-hidden="true" />
              <span style={{ fontFamily: T.font, fontSize: 14 }}>Carregando segmentos...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <Filter size={48} color={T.border} style={{ marginBottom: 16 }} aria-hidden="true" />
              <p style={{ fontFamily: T.font, fontSize: 14, color: T.muted, margin: "0 0 16px" }}>
                {search ? `Nenhum segmento encontrado para "${search}"` : "Nenhum segmento criado ainda."}
              </p>
              {!search && (
                <button onClick={() => setModal("new")} style={{ background: "linear-gradient(135deg, #0D7491 0%, #14A273 100%)", color: "#fff", border: "none", borderRadius: 10, padding: "8px 20px", fontSize: 13, cursor: "pointer", fontFamily: T.font, fontWeight: 700 }}>
                  Criar primeiro segmento
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
              {filtered.map(seg => (
                <div key={seg.id} onClick={() => setDetail(seg)} style={{ cursor: "pointer" }}>
                  <SegmentCard
                    segment={seg}
                    leadCount={leadCounts[seg.id]}
                    loading={counting[seg.id]}
                    onEdit={s => { setModal(s); }}
                    onDuplicate={s => { handleDuplicate(s); }}
                    onDelete={id => { handleDelete(id); }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* modals */}
      {modal && (
        <SegmentModal
          segment={modal === "new" ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
      {detail && <SegmentDetail segment={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
