import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "./supabase";
import {
  BarChart2, Users, Mail, Star, LayoutTemplate, Bot, Plug, Settings, Briefcase,
  ArrowLeft, Loader2, AlertCircle, Scale, Building2, User, Trophy, XCircle,
  CheckCircle2, Phone, StickyNote, CalendarClock, Send, Clock, Pencil, Check, X,
} from "lucide-react";

/* ───── DESIGN TOKENS ───── */
const T = {
  teal: "#0D7491", blue: "#0D7491", green: "#14A273", brand2: "#1F76BC", deep: "#0A3D4D",
  gradient: "linear-gradient(135deg, #0D7491 0%, #14A273 100%)",
  sidebarBg: "linear-gradient(180deg, #0D7491 0%, #0A5165 60%, #0A3D4D 100%)",
  violet: "#7C5CFF", amber: "#F59E0B", coral: "#FF6B5E", red: "#FF6B5E", cyan: "#06B6D4",
  bg: "#F5F8FB", surface: "#FFFFFF", border: "#E8EEF3",
  ink: "#0E1A24", text: "#2E3D4B", muted: "#5A6B7A", faint3: "#8696A5",
  font: "'Inter', system-ui, sans-serif", head: "'Sora', system-ui, sans-serif", mono: "'JetBrains Mono', monospace",
};
const WORKSPACE_VANTARI = "53092199-7b75-4342-a897-f589d6f34922";
const CAPTADORES = ["Alexandra", "Vanessa", "Camila"];
const CNDT_OPTS = [
  { v: "negativa", l: "Negativa (ok)" },
  { v: "positiva_efeito_negativa", l: "Positiva c/ efeito negativo (ok)" },
  { v: "positiva", l: "Positiva (veta)" },
];
const PORTE_OPTS = ["MEI", "ME", "EPP", "Médio", "Grande"];

/* ─── helpers (duplicados do form, padrão self-contained) ─── */
const onlyDigits = (s) => (s || "").replace(/\D/g, "");
const cleanCpf = (raw) => {
  const v = onlyDigits(raw);
  if (v.length !== 11) return null;
  if (/^(\d)\1{10}$/.test(v)) return null;
  const dv = (base, fs) => { let s = 0; for (let i = 0; i < base.length; i++) s += Number(base[i]) * (fs - i); const r = 11 - (s % 11); return r >= 10 ? 0 : r; };
  if (dv(v.slice(0, 9), 10) !== Number(v[9])) return null;
  if (dv(v.slice(0, 10), 11) !== Number(v[10])) return null;
  return v;
};
const reaisToCents = (v) => { if (v == null || v === "") return 0; const n = parseFloat(String(v).replace(/\./g, "").replace(",", ".")); return Number.isFinite(n) ? Math.round(n * 100) : 0; };
const centsToInput = (c) => c == null ? "" : (c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const maskCpf = (raw) => { const d = onlyDigits(raw).slice(0, 11); if (d.length > 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`; if (d.length > 6) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`; if (d.length > 3) return `${d.slice(0, 3)}.${d.slice(3)}`; return d; };
const maskCnpj = (raw) => { const d = onlyDigits(raw).slice(0, 14); if (d.length > 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`; if (d.length > 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`; if (d.length > 5) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`; if (d.length > 2) return `${d.slice(0, 2)}.${d.slice(2)}`; return d; };
const maskPhone = (raw) => { const d = onlyDigits(raw).slice(0, 11); if (!d) return ""; if (d.length <= 2) return `(${d}`; const ddd = d.slice(0, 2), rest = d.slice(2); if (rest.length <= 4) return `(${ddd}) ${rest}`; if (d.length <= 10) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`; return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`; };
const maskCnj = (raw) => { const d = onlyDigits(raw).slice(0, 20); let r = d.slice(0, 7); if (d.length > 7) r += `-${d.slice(7, 9)}`; if (d.length > 9) r += `.${d.slice(9, 13)}`; if (d.length > 13) r += `.${d.slice(13, 14)}`; if (d.length > 14) r += `.${d.slice(14, 16)}`; if (d.length > 16) r += `.${d.slice(16, 20)}`; return r; };
const maskMoney = (raw) => { let s = String(raw).replace(/[^\d,]/g, ""); const c = s.indexOf(","); let intp, decp = null; if (c >= 0) { intp = s.slice(0, c).replace(/\D/g, ""); decp = s.slice(c + 1).replace(/\D/g, "").slice(0, 2); } else { intp = s.replace(/\D/g, ""); } intp = intp.replace(/^0+(?=\d)/, ""); const g = intp.replace(/\B(?=(\d{3})+(?!\d))/g, "."); let out = g || (decp != null ? "0" : ""); if (decp != null) out += "," + decp; return out; };

const fmtBRL = (cents) => "R$ " + ((cents || 0) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const creditTypeLabel = (t) => t === "advogado_honorario" ? "Honorário (adv.)" : t === "reclamante" ? "Reclamante" : t || "—";
const fmtDateTime = (s) => s ? new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

const ACT_TYPES = [
  { v: "note", l: "Nota", icon: StickyNote },
  { v: "call", l: "Ligação", icon: Phone },
  { v: "meeting", l: "Reunião", icon: Users },
  { v: "task", l: "Tarefa", icon: CalendarClock },
];
const actMeta = (t) => ACT_TYPES.find((a) => a.v === t) || { v: t, l: t, icon: StickyNote };

/* ─── estilos de input compartilhados ─── */
const inputSt = { width: "100%", padding: "7px 9px", border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 12.5, color: T.text, outline: "none", fontFamily: T.font, boxSizing: "border-box", background: T.surface };
const labelSt = { fontSize: 11, fontWeight: 600, color: T.muted, display: "block", marginBottom: 3, fontFamily: T.font };

/* ─── Sidebar ─── */
const NavSection = ({ label }) => (
  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.18em", color: "rgba(255,255,255,0.4)", padding: "10px 20px 4px", textTransform: "uppercase", fontFamily: T.head }}>{label}</div>
);
const NavItem = ({ icon: Icon, label, active = false, path }) => {
  const [hov, setHov] = useState(false);
  const navigate = useNavigate();
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={() => path && navigate(path)}
      style={{ position: "relative", display: "flex", alignItems: "center", gap: 9, padding: "8px 20px", fontSize: 13.5,
        fontWeight: active ? 700 : 600, fontFamily: T.font,
        color: active ? "#fff" : hov ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.6)",
        background: active ? "rgba(255,255,255,0.10)" : hov ? "rgba(255,255,255,0.06)" : "transparent",
        cursor: "pointer", transition: "all 0.15s", userSelect: "none" }}>
      {active && <span style={{ position: "absolute", left: 0, top: 6, bottom: 6, width: 3, background: "linear-gradient(180deg, #14A273 0%, #5EEAD4 100%)", borderRadius: "0 3px 3px 0" }} />}
      {Icon && <Icon size={16} aria-hidden="true" />}{label}
    </div>
  );
};
function Sidebar() {
  return (
    <div style={{ width: 240, background: T.sidebarBg, display: "flex", flexDirection: "column", flexShrink: 0, position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 10, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(circle at 90% 0%, rgba(20,162,115,.25) 0%, transparent 50%)" }} />
      <div style={{ padding: "20px 20px 0", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 20, borderBottom: "1px solid rgba(255,255,255,.08)", marginBottom: 16 }}>
          <div style={{ width: 32, height: 32, background: "white", borderRadius: 8, display: "grid", placeItems: "center", flexShrink: 0 }}>
            <img src="/icone.png" alt="" style={{ width: 22, height: 22 }} />
          </div>
          <span style={{ fontFamily: T.head, fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "white" }}>vantari</span>
          <span style={{ marginLeft: "auto", fontSize: 10, background: "rgba(255,255,255,.12)", padding: "3px 8px", borderRadius: 6, letterSpacing: "0.08em", fontWeight: 600, color: "rgba(255,255,255,.85)" }}>PRO</span>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 0 8px", position: "relative" }}>
        <NavSection label="Principal" />
        <NavItem icon={BarChart2} label="Analytics" path="/dashboard" />
        <NavItem icon={Users} label="Leads" path="/leads" />
        <NavItem icon={Mail} label="Email Marketing" path="/email" />
        <NavSection label="CRM" />
        <NavItem icon={Briefcase} label="Negócios" path="/crm" active />
        <NavSection label="Ferramentas" />
        <NavItem icon={Star} label="Scoring" path="/scoring" />
        <NavItem icon={LayoutTemplate} label="Landing Pages" path="/landing" />
        <NavItem icon={Bot} label="IA & Automação" path="/ai-marketing" />
        <NavSection label="Sistema" />
        <NavItem icon={Plug} label="Integrações" path="/integrations" />
      </div>
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "8px 0", position: "relative" }}>
        <NavItem icon={Settings} label="Configurações" path="/settings" />
      </div>
    </div>
  );
}

const Row = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "5px 0", fontSize: 12.5, fontFamily: T.font, borderBottom: `1px solid ${T.bg}` }}>
    <span style={{ color: T.muted }}>{label}</span>
    <span style={{ color: T.ink, fontWeight: 600, textAlign: "right" }}>{value ?? "—"}</span>
  </div>
);

/* Card com edição: header tem Editar; em modo edição mostra Salvar/Cancelar */
const EditCard = ({ title, icon: Icon, editing, onEdit, onSave, onCancel, saving, canEdit = true, children }) => (
  <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px", boxShadow: "0 1px 0 rgba(14,26,36,.03)" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, color: T.ink, fontFamily: T.head, fontWeight: 700, fontSize: 13 }}>
        {Icon && <Icon size={15} color={T.teal} />} {title}
      </div>
      {canEdit && !editing && (
        <button onClick={onEdit} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: T.teal, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: T.font }}>
          <Pencil size={13} /> Editar
        </button>
      )}
      {editing && (
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={onCancel} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 4, background: T.surface, border: `1px solid ${T.border}`, color: T.muted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: T.font, borderRadius: 7, padding: "4px 9px" }}>
            <X size={13} /> Cancelar
          </button>
          <button onClick={onSave} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 4, background: T.teal, border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: T.font, borderRadius: 7, padding: "4px 10px" }}>
            {saving ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={13} />} Salvar
          </button>
        </div>
      )}
    </div>
    {children}
  </div>
);

export default function DealDetail() {
  const { dealId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deal, setDeal] = useState(null);
  const [processo, setProcesso] = useState(null);
  const [person, setPerson] = useState(null);
  const [company, setCompany] = useState(null);
  const [stages, setStages] = useState([]);
  const [acts, setActs] = useState([]);
  const [actType, setActType] = useState("note");
  const [actContent, setActContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [busy, setBusy] = useState(false);

  const [editing, setEditing] = useState(null); // 'deal' | 'processo' | 'person' | 'company'
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const setF = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const crm = supabase.schema("crm");
      const { data: d, error: e1 } = await crm.from("deals").select("*").eq("id", dealId).single();
      if (e1) throw e1;
      setDeal(d);
      const [{ data: st }, { data: ac }] = await Promise.all([
        crm.from("stages").select("id,name,position,kind").eq("pipeline_id", d.pipeline_id).order("position"),
        crm.from("activities").select("*").eq("deal_id", dealId).order("created_at", { ascending: false }),
      ]);
      setStages(st || []); setActs(ac || []);
      if (d.processo_id) {
        const { data: p } = await crm.from("processos").select("*").eq("id", d.processo_id).single();
        setProcesso(p || null);
        if (p?.reclamada_company_id) {
          const { data: co } = await supabase.schema("core").from("companies").select("*").eq("id", p.reclamada_company_id).single();
          setCompany(co || null);
        } else setCompany(null);
      }
      if (d.person_id) {
        const { data: pe } = await supabase.schema("core").from("persons").select("*").eq("id", d.person_id).single();
        setPerson(pe || null);
      }
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => { load(); }, [load]);

  const stageById = (id) => stages.find((s) => s.id === id);
  const curStage = deal ? stageById(deal.stage_id) : null;

  const moveStage = async (stageId) => {
    if (!deal || stageId === deal.stage_id) return;
    setBusy(true);
    const { error: e } = await supabase.schema("crm").from("deals").update({ stage_id: stageId }).eq("id", deal.id);
    setBusy(false);
    if (e) { setError(e.message); return; }
    load();
  };
  const setOutcome = async (kind) => { const t = stages.find((s) => s.kind === kind); if (t) moveStage(t.id); };

  const addActivity = async () => {
    if (!actContent.trim()) return;
    setPosting(true);
    let owner = null;
    try { const { data: u } = await supabase.auth.getUser(); owner = u?.user?.id || null; } catch { /* ignore */ }
    const { error: e } = await supabase.schema("crm").from("activities").insert({
      workspace_id: WORKSPACE_VANTARI, deal_id: deal.id, processo_id: deal.processo_id, person_id: deal.person_id,
      type: actType, content: actContent.trim(), owner_id: owner,
    });
    setPosting(false);
    if (e) { setError(e.message); return; }
    setActContent(""); load();
  };

  /* ─── edição ─── */
  const startEdit = (card) => {
    setError(null);
    if (card === "deal") setForm({
      credit_type: deal.credit_type || "reclamante", modalidade: deal.modalidade || "",
      valor_face: centsToInput(deal.valor_face_cents), valor_ofertado: centsToInput(deal.valor_ofertado_cents),
      desagio: deal.desagio_pct != null ? String(deal.desagio_pct) : "", captador: deal.captador || "",
    });
    if (card === "processo") setForm({
      numero_cnj: onlyDigits(processo.numero_cnj), tribunal: processo.tribunal || "", vara: processo.vara || "",
      uf: processo.uf || "", fase: processo.fase || "", valor_causa: centsToInput(processo.valor_causa_cents),
      valor_liquido: centsToInput(processo.valor_estimado_liquido_cents), reclamada_cndt: processo.reclamada_cndt || "negativa",
      reclamada_porte: processo.reclamada_porte || "Grande", reclamada_em_rj: !!processo.reclamada_em_rj,
      reclamada_paga_precatorio: !!processo.reclamada_paga_precatorio, reclamada_solvente: !!processo.reclamada_solvente,
      teses: (processo.teses_restritivas || []).join(", "),
    });
    if (card === "person") setForm({
      full_name: person.full_name || "", cpf: onlyDigits(person.cpf), primary_phone: onlyDigits(person.primary_phone), primary_email: person.primary_email || "",
    });
    if (card === "company") setForm({ name: company?.name || "", cnpj: onlyDigits(company?.cnpj) });
    setEditing(card);
  };
  const cancelEdit = () => { setEditing(null); setForm({}); };

  const saveDeal = async () => {
    setSaving(true); setError(null);
    const { error: e } = await supabase.schema("crm").from("deals").update({
      credit_type: form.credit_type, modalidade: form.modalidade || null,
      valor_face_cents: reaisToCents(form.valor_face), valor_ofertado_cents: form.valor_ofertado === "" ? null : reaisToCents(form.valor_ofertado),
      desagio_pct: form.desagio === "" ? null : parseFloat(String(form.desagio).replace(",", ".")), captador: form.captador || null,
    }).eq("id", deal.id);
    setSaving(false);
    if (e) { setError(e.message); return; }
    cancelEdit(); load();
  };
  const saveProcesso = async () => {
    setSaving(true); setError(null);
    const { error: e } = await supabase.schema("crm").from("processos").update({
      numero_cnj: maskCnj(form.numero_cnj), tribunal: form.tribunal || null, vara: form.vara || null,
      uf: form.uf ? form.uf.toUpperCase().slice(0, 2) : null, fase: form.fase || null,
      valor_causa_cents: reaisToCents(form.valor_causa), valor_estimado_liquido_cents: reaisToCents(form.valor_liquido),
      reclamada_cndt: form.reclamada_cndt, reclamada_porte: form.reclamada_porte,
      reclamada_em_rj: form.reclamada_em_rj, reclamada_paga_precatorio: form.reclamada_paga_precatorio, reclamada_solvente: form.reclamada_solvente,
      teses_restritivas: form.teses.split(",").map((t) => t.trim()).filter(Boolean),
    }).eq("id", processo.id);
    setSaving(false);
    if (e) { setError(e.message); return; }
    cancelEdit(); load();
  };
  const savePerson = async () => {
    setError(null);
    let cpfClean = null;
    if (form.cpf) { cpfClean = cleanCpf(form.cpf); if (!cpfClean) { setError("CPF inválido (11 dígitos)."); return; } }
    setSaving(true);
    const { error: e } = await supabase.schema("core").from("persons").update({
      full_name: form.full_name || null, cpf: cpfClean, primary_phone: form.primary_phone || null,
      primary_email: form.primary_email ? form.primary_email.trim().toLowerCase() : null,
      status: cpfClean ? "identificado" : (person.status || "pendente"),
    }).eq("id", person.id);
    setSaving(false);
    if (e) { setError(e.message); return; }
    cancelEdit(); load();
  };
  const saveCompany = async () => {
    setSaving(true); setError(null);
    const cnpjDigits = onlyDigits(form.cnpj) || null;
    const { error: e } = await supabase.schema("core").from("companies").update({ name: form.name || null, cnpj: cnpjDigits }).eq("id", company.id);
    setSaving(false);
    if (e) { setError(e.message); return; }
    cancelEdit(); load();
  };

  /* inputs de edição */
  const efield = (label, k, { mask, type = "text", full } = {}) => (
    <div style={{ marginBottom: 9, gridColumn: full ? "1 / -1" : "auto" }}>
      <label style={labelSt}>{label}</label>
      <input type={type} inputMode={mask ? (mask === maskMoney ? "decimal" : "numeric") : undefined}
        value={mask ? mask(form[k]) : (form[k] ?? "")}
        onChange={(e) => setF(k, mask ? (mask === maskMoney ? maskMoney(e.target.value) : onlyDigits(e.target.value)) : e.target.value)}
        style={inputSt} />
    </div>
  );
  const eselect = (label, k, opts) => (
    <div style={{ marginBottom: 9 }}>
      <label style={labelSt}>{label}</label>
      <select value={form[k] ?? ""} onChange={(e) => setF(k, e.target.value)} style={inputSt}>
        {opts.map((o) => typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
  const echeck = (label, k, exclusive) => (
    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.text, fontFamily: T.font, cursor: "pointer", marginBottom: 6 }}>
      <input type="checkbox" checked={!!form[k]} onChange={(e) => {
        const v = e.target.checked;
        setForm((s) => { const n = { ...s, [k]: v }; if (v && exclusive) n[exclusive] = false; return n; });
      }} /> {label}
    </label>
  );

  const valor = deal ? (deal.valor_ofertado_cents ?? deal.valor_face_cents) : 0;
  const eb = processo ? { ok: processo.elegivel } : null;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font }}>
      <Sidebar />
      <div style={{ marginLeft: 240, padding: "24px 32px", minHeight: "100vh" }}>
        <button onClick={() => navigate("/crm")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: T.muted, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: T.font, marginBottom: 14, padding: 0 }}>
          <ArrowLeft size={15} /> Voltar para Negócios
        </button>

        {loading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 320, color: T.muted, gap: 10, fontSize: 14 }}>
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Carregando negócio...
          </div>
        )}
        {error && !loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#FFF1F0", border: `1px solid ${T.coral}`, color: "#9B2C2C", borderRadius: 12, padding: "14px 16px", fontSize: 13, marginBottom: 16 }}>
            <AlertCircle size={18} color={T.coral} /> <span><strong>Erro:</strong> {error}</span>
          </div>
        )}

        {!loading && deal && (
          <>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: T.ink, fontFamily: T.head, letterSpacing: "-0.03em", margin: 0 }}>
                  {person?.full_name || person?.primary_email || "Sem titular"}
                </h1>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: T.teal, fontFamily: T.mono }}>{fmtBRL(valor)}</span>
                  <span style={{ fontSize: 12, color: T.muted }}>{creditTypeLabel(deal.credit_type)}{deal.modalidade ? ` · ${deal.modalidade}` : ""}</span>
                  {deal.captador && <span style={{ fontSize: 11.5, color: T.muted }}>captador: <strong style={{ color: T.text }}>{deal.captador}</strong></span>}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <select value={deal.stage_id} disabled={busy} onChange={(e) => moveStage(e.target.value)}
                  style={{ padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 9, fontSize: 13, fontWeight: 600, color: T.ink, background: T.surface, fontFamily: T.font, cursor: "pointer" }}>
                  {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button onClick={() => setOutcome("won")} disabled={busy} title="Marcar como Ganho"
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: curStage?.kind === "won" ? T.green : T.surface, border: `1px solid ${curStage?.kind === "won" ? T.green : "#6EE7B7"}`, borderRadius: 9, cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: curStage?.kind === "won" ? "#fff" : T.green, fontFamily: T.font }}>
                  <Trophy size={14} /> Ganho
                </button>
                <button onClick={() => setOutcome("lost")} disabled={busy} title="Marcar como Perdido"
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: curStage?.kind === "lost" ? T.coral : T.surface, border: `1px solid ${T.coral}`, borderRadius: 9, cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: curStage?.kind === "lost" ? "#fff" : T.coral, fontFamily: T.font }}>
                  <XCircle size={14} /> Perdido
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(300px, 1fr)", gap: 20, alignItems: "start" }}>
              {/* Esquerda: atividades */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12, color: T.ink, fontFamily: T.head, fontWeight: 700, fontSize: 13 }}>
                    <StickyNote size={15} color={T.teal} /> Registrar atividade
                  </div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                    {ACT_TYPES.map((a) => (
                      <button key={a.v} onClick={() => setActType(a.v)}
                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: T.font, cursor: "pointer",
                          border: `1px solid ${actType === a.v ? T.teal : T.border}`, background: actType === a.v ? `${T.teal}10` : T.surface, color: actType === a.v ? T.teal : T.text }}>
                        <a.icon size={13} /> {a.l}
                      </button>
                    ))}
                  </div>
                  <textarea value={actContent} onChange={(e) => setActContent(e.target.value)} rows={3}
                    placeholder="Telefonema, detalhe da negociação, observação..."
                    style={{ width: "100%", padding: "9px 11px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, color: T.text, outline: "none", fontFamily: T.font, boxSizing: "border-box", resize: "vertical" }} />
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                    <button onClick={addActivity} disabled={posting || !actContent.trim()}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: T.gradient, border: "none", borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 700, cursor: posting || !actContent.trim() ? "default" : "pointer", opacity: posting || !actContent.trim() ? 0.6 : 1, fontFamily: T.font }}>
                      {posting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={14} />} Adicionar
                    </button>
                  </div>
                </div>

                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12, color: T.ink, fontFamily: T.head, fontWeight: 700, fontSize: 13 }}>
                    <Clock size={15} color={T.teal} /> Timeline ({acts.length})
                  </div>
                  {acts.length === 0 && <div style={{ color: T.muted, fontSize: 13, padding: "8px 0" }}>Nenhuma atividade registrada ainda.</div>}
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {acts.map((a) => {
                      const m = actMeta(a.type);
                      return (
                        <div key={a.id} style={{ display: "flex", gap: 11, padding: "10px 0", borderBottom: `1px solid ${T.bg}` }}>
                          <div style={{ width: 30, height: 30, borderRadius: 8, background: `${T.teal}10`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                            <m.icon size={15} color={T.teal} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: T.ink, fontFamily: T.font }}>{m.l}</span>
                              <span style={{ fontSize: 10.5, color: T.faint3, fontFamily: T.mono, whiteSpace: "nowrap" }}>{fmtDateTime(a.created_at)}</span>
                            </div>
                            <div style={{ fontSize: 13, color: T.text, marginTop: 2, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{a.content}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Direita: blocos editáveis */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <EditCard title="Processo" icon={Scale} canEdit={!!processo} editing={editing === "processo"} saving={saving}
                  onEdit={() => startEdit("processo")} onCancel={cancelEdit} onSave={saveProcesso}>
                  {!processo ? <div style={{ color: T.muted, fontSize: 13 }}>Sem processo vinculado.</div>
                    : editing === "processo" ? (
                      <div>
                        {efield("Número CNJ", "numero_cnj", { mask: maskCnj, full: true })}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          {efield("Tribunal", "tribunal")}
                          {efield("Vara", "vara")}
                          {efield("UF", "uf")}
                          {efield("Fase", "fase")}
                          {efield("Valor da causa (R$)", "valor_causa", { mask: maskMoney })}
                          {efield("Estimado líquido (R$)", "valor_liquido", { mask: maskMoney })}
                          {eselect("CNDT", "reclamada_cndt", CNDT_OPTS)}
                          {eselect("Porte", "reclamada_porte", PORTE_OPTS)}
                        </div>
                        <div style={{ marginTop: 4 }}>
                          {echeck("Em recuperação judicial", "reclamada_em_rj", "reclamada_solvente")}
                          {echeck("Paga por precatório", "reclamada_paga_precatorio")}
                          {echeck("Solvente", "reclamada_solvente", "reclamada_em_rj")}
                        </div>
                        {efield("Teses restritivas (vírgula)", "teses", { full: true })}
                        <div style={{ fontSize: 11, color: T.faint3, marginTop: 2 }}>A elegibilidade recalcula ao salvar.</div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 99, marginBottom: 10, background: eb.ok ? "#F0FDF7" : "#FFF1F0", border: `1px solid ${eb.ok ? "#6EE7B7" : T.coral}`, color: eb.ok ? T.green : T.coral, fontSize: 12, fontWeight: 700 }}>
                          {eb.ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />} {eb.ok ? "Elegível" : "Inelegível"}
                        </div>
                        <Row label="CNJ" value={processo.numero_cnj} />
                        <Row label="Tribunal" value={processo.tribunal} />
                        <Row label="Vara" value={processo.vara} />
                        <Row label="UF" value={processo.uf} />
                        <Row label="Fase" value={processo.fase} />
                        <Row label="Valor da causa" value={processo.valor_causa_cents ? fmtBRL(processo.valor_causa_cents) : "—"} />
                        <Row label="Estimado líquido" value={processo.valor_estimado_liquido_cents ? fmtBRL(processo.valor_estimado_liquido_cents) : "—"} />
                        <Row label="CNDT" value={processo.reclamada_cndt} />
                        <Row label="Porte reclamada" value={processo.reclamada_porte} />
                        <Row label="Teses restritivas" value={(processo.teses_restritivas || []).join(", ") || "nenhuma"} />
                      </>
                    )}
                </EditCard>

                <EditCard title="Reclamada" icon={Building2} canEdit={!!company} editing={editing === "company"} saving={saving}
                  onEdit={() => startEdit("company")} onCancel={cancelEdit} onSave={saveCompany}>
                  {!company ? <div style={{ color: T.muted, fontSize: 13 }}>Sem reclamada vinculada.</div>
                    : editing === "company" ? (
                      <div>
                        {efield("Razão social", "name")}
                        {efield("CNPJ", "cnpj", { mask: maskCnpj })}
                      </div>
                    ) : (
                      <>
                        <Row label="Razão social" value={company.name} />
                        <Row label="CNPJ" value={company.cnpj ? maskCnpj(company.cnpj) : "—"} />
                      </>
                    )}
                </EditCard>

                <EditCard title="Contato (titular)" icon={User} canEdit={!!person} editing={editing === "person"} saving={saving}
                  onEdit={() => startEdit("person")} onCancel={cancelEdit} onSave={savePerson}>
                  {!person ? <div style={{ color: T.muted, fontSize: 13 }}>Sem contato vinculado.</div>
                    : editing === "person" ? (
                      <div>
                        {efield("Nome", "full_name")}
                        {efield("CPF", "cpf", { mask: maskCpf })}
                        {efield("Telefone", "primary_phone", { mask: maskPhone })}
                        {efield("E-mail", "primary_email", { type: "email" })}
                      </div>
                    ) : (
                      <>
                        <Row label="Nome" value={person.full_name} />
                        <Row label="CPF" value={person.cpf ? maskCpf(person.cpf) : "—"} />
                        <Row label="Telefone" value={person.primary_phone ? maskPhone(person.primary_phone) : "—"} />
                        <Row label="E-mail" value={person.primary_email} />
                        <Row label="Status" value={person.status} />
                      </>
                    )}
                </EditCard>

                <EditCard title="Negócio" icon={Briefcase} editing={editing === "deal"} saving={saving}
                  onEdit={() => startEdit("deal")} onCancel={cancelEdit} onSave={saveDeal}>
                  {editing === "deal" ? (
                    <div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        {eselect("Tipo de crédito", "credit_type", [{ v: "reclamante", l: "Reclamante" }, { v: "advogado_honorario", l: "Honorário (adv.)" }])}
                        {eselect("Modalidade", "modalidade", [{ v: "", l: "—" }, { v: "tradicional", l: "Tradicional" }, { v: "kicker", l: "Kicker" }])}
                        {efield("Valor de face (R$)", "valor_face", { mask: maskMoney })}
                        {efield("Valor ofertado (R$)", "valor_ofertado", { mask: maskMoney })}
                        {efield("Deságio (%)", "desagio")}
                        {eselect("Captador/a", "captador", [{ v: "", l: "— selecionar —" }, ...CAPTADORES.map((c) => ({ v: c, l: c }))])}
                      </div>
                    </div>
                  ) : (
                    <>
                      <Row label="Tipo de crédito" value={creditTypeLabel(deal.credit_type)} />
                      <Row label="Modalidade" value={deal.modalidade} />
                      <Row label="Valor de face" value={fmtBRL(deal.valor_face_cents)} />
                      <Row label="Valor ofertado" value={deal.valor_ofertado_cents != null ? fmtBRL(deal.valor_ofertado_cents) : "—"} />
                      <Row label="Deságio" value={deal.desagio_pct != null ? `${Number(deal.desagio_pct).toFixed(0)}%` : "—"} />
                      <Row label="Captador/a" value={deal.captador} />
                    </>
                  )}
                </EditCard>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
