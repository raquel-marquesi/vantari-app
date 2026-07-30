import { useState, useEffect, useCallback } from "react";
import { useSidebarCollapsed } from "./sidebar-collapsed";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabase";
import {
  BarChart2, Users, Mail, Star, LayoutTemplate, Bot, Plug, Settings, Briefcase,
  Plus, Search, Loader2, AlertCircle, X, UserPlus, IdCard, Zap, Filter,
  ChevronLeft, ChevronRight, LogOut, Building2, Upload, Download, FileText,
  CheckCircle2, ArrowRight, ArrowLeft, Edit3, Save, Trash2,
} from "lucide-react";
import { Activity, ListChecks } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import { Inbox } from "lucide-react";

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

/* helpers (self-contained) */
const onlyDigits = (s) => (s || "").replace(/\D/g, "");
const cleanCpf = (raw) => {
  const v = onlyDigits(raw); if (v.length !== 11) return null; if (/^(\d)\1{10}$/.test(v)) return null;
  const dv = (b, fs) => { let s = 0; for (let i = 0; i < b.length; i++) s += Number(b[i]) * (fs - i); const r = 11 - (s % 11); return r >= 10 ? 0 : r; };
  if (dv(v.slice(0, 9), 10) !== Number(v[9])) return null; if (dv(v.slice(0, 10), 11) !== Number(v[10])) return null; return v;
};
const maskCpf = (raw) => { const d = onlyDigits(raw).slice(0, 11); if (d.length > 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`; if (d.length > 6) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`; if (d.length > 3) return `${d.slice(0, 3)}.${d.slice(3)}`; return d; };
const maskPhone = (raw) => { const d = onlyDigits(raw).slice(0, 11); if (!d) return ""; if (d.length <= 2) return `(${d}`; const ddd = d.slice(0, 2), rest = d.slice(2); if (rest.length <= 4) return `(${ddd}) ${rest}`; if (d.length <= 10) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`; return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`; };
const fmtDate = (s) => s ? new Date(s).toLocaleDateString("pt-BR") : "—";

/* ─── CSV: parser + helpers nativos (sem dependência externa) ─── */
function parseCsv(text) {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.split(/\r\n|\n|\r/)[0] || "";
  const delim = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ";" : ",";
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i], next = clean[i + 1];
    if (inQuotes) {
      if (c === '"' && next === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else field += c;
    } else if (c === '"') { inQuotes = true; }
    else if (c === delim) { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && next === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

const FIELD_ALIASES = {
  nome: ["nome", "name", "nome completo", "cliente", "full_name", "fullname"],
  cpf: ["cpf", "documento", "cpf/cnpj", "cpfcnpj"],
  email: ["email", "e-mail", "mail", "e mail"],
  telefone: ["telefone", "phone", "celular", "whatsapp", "fone", "tel"],
};
const normHeader = (s) => (s || "").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
function guessMapping(headers) {
  const map = { nome: null, cpf: null, email: null, telefone: null };
  headers.forEach((h, idx) => {
    const n = normHeader(h);
    for (const field of Object.keys(FIELD_ALIASES)) {
      if (map[field] == null && FIELD_ALIASES[field].includes(n)) map[field] = idx;
    }
  });
  return map;
}

function csvEscape(v) {
  const s = v == null ? "" : String(v);
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function downloadCsv(filename, headerRow, dataRows) {
  const lines = [headerRow, ...dataRows].map((r) => r.map(csvEscape).join(","));
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

const statusBadge = (st) => st === "identificado"
  ? { label: "Identificado", color: "#0F6E4E", bg: "#F0FDF7", border: "#6EE7B7" }
  : { label: "Pendente", color: "#9A6A00", bg: "#FFF8E6", border: "#F5D58A" };

/* ─── Sidebar ─── */
const NavSection = ({ label, collapsed = false }) => (
  collapsed ? <div style={{ height: 10 }} /> : (
    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.18em", color: "rgba(255,255,255,0.4)", padding: "10px 20px 4px", textTransform: "uppercase", fontFamily: T.head }}>
      {label}
    </div>
  )
);
const NavItem = ({ icon: Icon, label, active = false, path, collapsed = false }) => {
  const [hov, setHov] = useState(false);
  const navigate = useNavigate();
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={() => path && navigate(path)}
      title={collapsed ? label : undefined}
      style={{
        position: "relative", display: "flex", alignItems: "center", gap: 9,
        padding: collapsed ? "8px 0" : "8px 20px", justifyContent: collapsed ? "center" : "flex-start",
        fontSize: 13.5, fontWeight: active ? 700 : 600, fontFamily: T.font,
        color: active ? "#fff" : hov ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.6)",
        background: active ? "rgba(255,255,255,0.10)" : hov ? "rgba(255,255,255,0.06)" : "transparent",
        cursor: "pointer", transition: "all 0.15s", userSelect: "none",
      }}>
      {active && (
        <span style={{ position: "absolute", left: 0, top: 6, bottom: 6, width: 3,
          background: "linear-gradient(180deg, #14A273 0%, #5EEAD4 100%)", borderRadius: "0 3px 3px 0" }} />
      )}
      {Icon && <Icon size={16} aria-hidden="true" />}
      {!collapsed && label}
    </div>
  );
};
/* ─── Menu de conta (avatar + email + Sair) ─── */
function AccountMenu({ collapsed }) {
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data?.user?.email || ""));
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  const initial = (email || "?").charAt(0).toUpperCase();

  return (
    <div style={{ position: "relative" }}>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 25 }} />
          <div style={{
            position: "absolute", bottom: "100%", left: collapsed ? 8 : 12, right: collapsed ? undefined : 12,
            marginBottom: 8, background: "#fff", borderRadius: 10, boxShadow: "0 8px 24px -8px rgba(0,0,0,.35)",
            border: `1px solid ${T.border}`, overflow: "hidden", minWidth: collapsed ? 176 : undefined, zIndex: 30,
          }}>
            <div style={{ padding: "10px 14px", borderBottom: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.ink, fontFamily: T.font, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{email || "Usuário"}</div>
            </div>
            <div
              onClick={handleLogout}
              onMouseEnter={ev => (ev.currentTarget.style.background = T.faint)}
              onMouseLeave={ev => (ev.currentTarget.style.background = "transparent")}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", fontSize: 13, fontWeight: 600, color: T.coral, cursor: "pointer", fontFamily: T.font }}
            >
              <LogOut size={15} aria-hidden="true" />
              Sair
            </div>
          </div>
        </>
      )}
      <div
        onClick={() => setOpen(o => !o)}
        title={collapsed ? (email || "Conta") : undefined}
        style={{ display: "flex", alignItems: "center", gap: 9, padding: collapsed ? "8px 0" : "8px 20px", justifyContent: collapsed ? "center" : "flex-start", cursor: "pointer", userSelect: "none" }}
      >
        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(255,255,255,0.15)", color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, fontFamily: T.head, flexShrink: 0 }}>
          {initial}
        </div>
        {!collapsed && (
          <>
            <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.75)", fontFamily: T.font, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>{email || "Conta"}</span>
            <ChevronRight size={14} aria-hidden="true" style={{ color: "rgba(255,255,255,0.4)", transform: open ? "rotate(-90deg)" : "none", transition: "transform .12s", flexShrink: 0 }} />
          </>
        )}
      </div>
    </div>
  );
}
function Sidebar({ collapsed, onToggle }) {
  return (
    <div style={{ width: collapsed ? 64 : 240, background: T.sidebarBg, display: "flex", flexDirection: "column",
      flexShrink: 0, position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 10, overflow: "visible", transition: "width 0.15s" }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(circle at 90% 0%, rgba(20,162,115,.25) 0%, transparent 50%)" }} />
      <div style={{ padding: collapsed ? "20px 8px 0" : "20px 20px 0", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 20, borderBottom: "1px solid rgba(255,255,255,.08)", marginBottom: 16, justifyContent: collapsed ? "center" : "flex-start" }}>
          <div style={{ width: 32, height: 32, background: "white", borderRadius: 8, display: "grid", placeItems: "center", flexShrink: 0 }}>
            <img src="/icone.png" alt="" style={{ width: 22, height: 22 }} />
          </div>
          {!collapsed && <>
            <span style={{ fontFamily: T.head, fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "white" }}>vantari</span>
            <span style={{ marginLeft: "auto", fontSize: 10, background: "rgba(255,255,255,.12)", padding: "3px 8px", borderRadius: 6, letterSpacing: "0.08em", fontWeight: 600, color: "rgba(255,255,255,.85)" }}>PRO</span>
          </>}
        </div>
      </div>
      <div className="vantari-sidebar-nav" style={{ flex: 1, overflowY: "auto", padding: "0 0 8px", position: "relative" }}>
        <NavSection label="Principal" collapsed={collapsed} />
        <NavItem icon={BarChart2} label="Analytics" path="/dashboard" collapsed={collapsed} />
        <NavItem icon={Users} label="Leads" path="/leads" active collapsed={collapsed} />
        <NavItem icon={Inbox} label="Atendimento" path="/inbox" collapsed={collapsed} />
        <NavSection label="CRM" collapsed={collapsed} />
        <NavItem icon={Briefcase} label="Negócios" path="/crm" collapsed={collapsed} />
        <NavItem icon={Building2} label="Empresas" path="/empresas" collapsed={collapsed} />
        <NavItem icon={Activity} label="Atividades" path="/activities" collapsed={collapsed} />
        <NavItem icon={ListChecks} label="Tarefas" path="/tasks" collapsed={collapsed} />
        <NavItem icon={AlertTriangle} label="Em Risco" path="/risco" collapsed={collapsed} />
        <NavSection label="Ferramentas" collapsed={collapsed} />
        <NavItem icon={Mail} label="Email Marketing" path="/email" collapsed={collapsed} />
        <NavItem icon={Star} label="Scoring" path="/scoring" collapsed={collapsed} />
        <NavItem icon={LayoutTemplate} label="Landing Pages" path="/landing" collapsed={collapsed} />
        <NavItem icon={Filter} label="Segmentações" path="/segments" collapsed={collapsed} />
        <NavItem icon={Bot} label="IA & Automação" path="/ai-marketing" collapsed={collapsed} />
        <NavItem icon={Zap} label="Automação de Marketing" path="/workflow" collapsed={collapsed} />
        <NavSection label="Sistema" collapsed={collapsed} />
        <NavItem icon={Plug} label="Integrações" path="/integrations" collapsed={collapsed} />
      </div>
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "8px 0", position: "relative" }}>
        <AccountMenu collapsed={collapsed} />
        <NavItem icon={Settings} label="Configurações" path="/settings" collapsed={collapsed} />
      </div>
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "8px 0", position: "relative" }}>
        <div onClick={onToggle} title={collapsed ? "Expandir menu" : "Recolher menu"}
          style={{ display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-end", gap: 6, padding: collapsed ? "8px 0" : "8px 20px", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", cursor: "pointer", fontFamily: T.font }}>
          {collapsed ? <ChevronRight size={16} aria-hidden="true" /> : <><span>Recolher</span><ChevronLeft size={16} aria-hidden="true" /></>}
        </div>
      </div>
    </div>
  );
}

const fmtBRL = (cents) => "R$ " + ((cents || 0) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ─── Modal Detalhe do Lead (perfil: dados + negócios associados) ─── */
const EVENT_LABELS = {
  contact_updated: "Contato atualizado",
  persons_merged:  "Cadastros unificados",
  lead_created:    "Lead criado",
  form_submit:     "Formulário enviado",
  page_visit:      "Visita a página",
  stage_changed:   "Etapa alterada",
};
const FIELD_LABELS_HIST = { email: "E-mail", phone: "Telefone" };

function EventRow({ ev }) {
  const label = EVENT_LABELS[ev.type] || ev.type;
  let detail = null;
  if (ev.type === "contact_updated" && ev.payload) {
    const f = FIELD_LABELS_HIST[ev.payload.field] || ev.payload.field;
    detail = `${f}: ${ev.payload.old || "—"} → ${ev.payload.new || "—"}`;
  }
  return (
    <div style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: `0.5px solid ${T.border}` }}>
      <div style={{ width: 6, height: 6, borderRadius: 99, background: T.teal, marginTop: 6, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: T.ink }}>{label}</div>
        {detail && <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{detail}</div>}
      </div>
      <div style={{ fontSize: 11, color: T.faint3, fontFamily: T.mono, whiteSpace: "nowrap" }}>{fmtDate(ev.occurred_at)}</div>
    </div>
  );
}

function LeadDetailModal({ lead, companyName, onClose, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deals, setDeals] = useState([]);
  const [events, setEvents] = useState([]);
  const sb = statusBadge(lead.status);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [form, setForm] = useState({
    full_name: lead.full_name || "", cpf: lead.cpf || "",
    phone: lead.primary_phone || "", email: lead.primary_email || "",
  });
  const setF = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const inputSt = { width: "100%", padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, color: T.text, outline: "none", fontFamily: T.font, boxSizing: "border-box", background: T.surface };
  const labelSt = { fontSize: 11, color: T.faint3, marginBottom: 2 };

  const startEdit = () => {
    setForm({ full_name: lead.full_name || "", cpf: lead.cpf || "", phone: lead.primary_phone || "", email: lead.primary_email || "" });
    setSaveError(null);
    setEditing(true);
  };

  const save = async () => {
    setSaveError(null);
    let cpfClean = null;
    if (form.cpf.trim()) {
      cpfClean = cleanCpf(form.cpf);
      if (!cpfClean) { setSaveError("CPF inválido (confira os 11 dígitos)."); return; }
    }
    setSaving(true);
    const { error: e } = await supabase.schema("core").rpc("update_person_manual", {
      p_person: lead.id,
      p_full_name: form.full_name.trim() || null,
      p_cpf: cpfClean,
      p_phone: form.phone || null,
      p_email: form.email.trim() || null,
    });
    setSaving(false);
    if (e) { setSaveError(e.message); return; }
    setEditing(false);
    onSaved?.();
  };

  const handleDelete = async () => {
    setDeleteError(null);
    const dealsWord = deals.length ? ` e ${deals.length} negócio(s) vinculado(s)` : "";
    const ok = confirm(
      `Excluir "${lead.full_name || "este lead"}" definitivamente?\n\nIsso apaga a pessoa${dealsWord}, todo o histórico de eventos, atividades e conversas dela. Não tem como desfazer.`
    );
    if (!ok) return;
    setDeleting(true);
    const { error: e } = await supabase.schema("core").rpc("delete_person", { p_person: lead.id });
    setDeleting(false);
    if (e) { setDeleteError(e.message); return; }
    onSaved?.();
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setError(null);
      try {
        const [{ data, error: e }, { data: ev }] = await Promise.all([
          supabase.schema("crm").from("deals")
            .select("id,credit_type,modalidade,valor_face_cents,valor_ofertado_cents,stage_id,status,created_at")
            .eq("person_id", lead.id)
            .order("created_at", { ascending: false }),
          supabase.schema("core").from("events")
            .select("id,type,payload,occurred_at")
            .eq("person_id", lead.id)
            .order("occurred_at", { ascending: false })
            .limit(20),
        ]);
        if (e) throw e;
        if (alive) { setDeals(data || []); setEvents(ev || []); }
      } catch (err) {
        if (alive) setError(err.message || String(err));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [lead.id]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: T.surface, borderRadius: 16, width: 560, maxWidth: "94vw", maxHeight: "88vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,.18)" }}>
        <div style={{ padding: "18px 24px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <span style={{ fontFamily: T.head, fontWeight: 700, fontSize: 17, color: T.ink }}>{lead.full_name || "Sem nome"}</span>
            <div style={{ marginTop: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: sb.bg, color: sb.color, border: `1px solid ${sb.border}` }}>{sb.label}</span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {!editing && (
              <button onClick={startEdit} title="Editar dados de contato"
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: T.text, fontFamily: T.font }}>
                <Edit3 size={13} /> Editar
              </button>
            )}
            <button onClick={handleDelete} disabled={deleting} title="Excluir lead definitivamente"
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, cursor: deleting ? "default" : "pointer", opacity: deleting ? 0.6 : 1, fontSize: 12.5, fontWeight: 700, color: T.coral, fontFamily: T.font }}>
              {deleting ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={13} />} Excluir
            </button>
            <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: T.muted }}><X size={18} /></button>
          </div>
        </div>
        {deleteError && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 24px", background: "#FFF1F0", color: "#9B2C2C", fontSize: 12.5, borderBottom: `1px solid ${T.border}` }}>
            <AlertCircle size={14} color={T.coral} /> {deleteError}
          </div>
        )}

        <div style={{ padding: "18px 24px", overflowY: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontFamily: T.head, fontSize: 12.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Dados de contato
            </div>
          </div>

          {editing ? (
            <div style={{ marginBottom: 22 }}>
              <div style={{ marginBottom: 10 }}>
                <label style={labelSt}>Nome</label>
                <input value={form.full_name} onChange={(e) => setF("full_name", e.target.value)} style={inputSt} placeholder="Nome completo" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
                <div>
                  <label style={labelSt}>CPF</label>
                  <input inputMode="numeric" value={maskCpf(form.cpf)} onChange={(e) => setF("cpf", onlyDigits(e.target.value))} style={inputSt} placeholder="000.000.000-00" />
                </div>
                <div>
                  <label style={labelSt}>Telefone</label>
                  <input inputMode="numeric" value={maskPhone(form.phone)} onChange={(e) => setF("phone", onlyDigits(e.target.value))} style={inputSt} placeholder="(11) 90000-0000" />
                </div>
              </div>
              <div style={{ marginBottom: 4 }}>
                <label style={labelSt}>E-mail</label>
                <input type="email" value={form.email} onChange={(e) => setF("email", e.target.value)} style={inputSt} placeholder="email@exemplo.com" />
              </div>
              {saveError && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, color: "#9B2C2C", fontSize: 12.5 }}>
                  <AlertCircle size={15} color={T.coral} /> {saveError}
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={save} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: T.gradient, border: "none", borderRadius: 8, color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1, fontFamily: T.font }}>
                  {saving ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={13} />} Salvar
                </button>
                <button onClick={() => { setEditing(false); setSaveError(null); }} disabled={saving} style={{ padding: "7px 14px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: T.font }}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 22 }}>
              <div><div style={{ fontSize: 11, color: T.faint3, marginBottom: 2 }}>CPF</div><div style={{ fontSize: 13, fontFamily: T.mono, color: T.text }}>{lead.cpf ? maskCpf(lead.cpf) : "—"}</div></div>
              <div><div style={{ fontSize: 11, color: T.faint3, marginBottom: 2 }}>Telefone</div><div style={{ fontSize: 13, fontFamily: T.mono, color: T.text }}>{lead.primary_phone ? maskPhone(lead.primary_phone) : "—"}</div></div>
              <div><div style={{ fontSize: 11, color: T.faint3, marginBottom: 2 }}>E-mail</div><div style={{ fontSize: 13, color: T.text }}>{lead.primary_email || "—"}</div></div>
              <div><div style={{ fontSize: 11, color: T.faint3, marginBottom: 2 }}>Empresa</div><div style={{ fontSize: 13, color: T.text }}>{companyName || "—"}</div></div>
              <div><div style={{ fontSize: 11, color: T.faint3, marginBottom: 2 }}>Criado em</div><div style={{ fontSize: 13, fontFamily: T.mono, color: T.text }}>{fmtDate(lead.created_at)}</div></div>
            </div>
          )}

          <div style={{ fontFamily: T.head, fontSize: 12.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
            Negócios associados (CRM)
          </div>
          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.muted, fontSize: 13 }}>
              <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> Carregando...
            </div>
          )}
          {error && !loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#9B2C2C", fontSize: 12.5 }}>
              <AlertCircle size={15} color={T.coral} /> {error}
            </div>
          )}
          {!loading && !error && deals.length === 0 && (
            <div style={{ fontSize: 13, color: T.muted }}>Nenhum negócio associado a este lead ainda.</div>
          )}
          {!loading && !error && deals.map((d) => (
            <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 12px", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 9, marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: T.ink }}>{d.credit_type === "advogado_honorario" ? "Honorário (adv.)" : "Reclamante"}{d.modalidade ? ` · ${d.modalidade}` : ""}</div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{d.status || "aberto"} · {fmtDate(d.created_at)}</div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.teal, fontFamily: T.mono }}>{fmtBRL(d.valor_ofertado_cents ?? d.valor_face_cents)}</span>
            </div>
          ))}

          <div style={{ fontFamily: T.head, fontSize: 12.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", margin: "22px 0 10px" }}>
            Histórico
          </div>
          {!loading && !error && events.length === 0 && (
            <div style={{ fontSize: 13, color: T.muted }}>Nenhum evento registrado ainda.</div>
          )}
          {!loading && !error && events.length > 0 && (
            <div>
              {events.map((ev) => <EventRow key={ev.id} ev={ev} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Modal Novo Contato (resolve_person no core) ─── */
function NovoContatoModal({ onClose, onCreated }) {
  const [f, setF] = useState({ nome: "", cpf: "", phone: "", email: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const inputSt = { width: "100%", padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, color: T.text, outline: "none", fontFamily: T.font, boxSizing: "border-box", background: T.surface };
  const labelSt = { fontSize: 11.5, fontWeight: 600, color: T.text, display: "block", marginBottom: 4, fontFamily: T.font };

  const save = async () => {
    setError(null);
    if (!f.nome.trim()) { setError("Informe o nome."); return; }
    let cpfClean = null;
    if (f.cpf.trim()) { cpfClean = cleanCpf(f.cpf); if (!cpfClean) { setError("CPF inválido (11 dígitos)."); return; } }
    if (!cpfClean && !f.email.trim() && !f.phone.trim()) { setError("Informe CPF, e-mail ou telefone."); return; }
    setSaving(true);
    const { error: e } = await supabase.schema("core").rpc("resolve_person", {
      p_workspace: WORKSPACE_VANTARI, p_cpf: cpfClean, p_phone: f.phone || null, p_email: f.email || null, p_name: f.nome || null, p_source: "manual",
    });
    setSaving(false);
    if (e) { setError(e.message); return; }
    onCreated();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: T.surface, borderRadius: 16, width: 460, maxWidth: "92vw", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.18)" }}>
        <div style={{ padding: "18px 22px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: T.head, fontWeight: 700, fontSize: 15, color: T.ink }}>Novo lead</span>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: T.muted }}><X size={18} /></button>
        </div>
        <div style={{ padding: "18px 22px" }}>
          <div style={{ marginBottom: 12 }}><label style={labelSt}>Nome *</label><input value={f.nome} onChange={(e) => set("nome", e.target.value)} style={inputSt} placeholder="Nome completo" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ marginBottom: 12 }}><label style={labelSt}>CPF</label><input inputMode="numeric" value={maskCpf(f.cpf)} onChange={(e) => set("cpf", onlyDigits(e.target.value))} style={inputSt} placeholder="000.000.000-00" /></div>
            <div style={{ marginBottom: 12 }}><label style={labelSt}>Telefone</label><input inputMode="numeric" value={maskPhone(f.phone)} onChange={(e) => set("phone", onlyDigits(e.target.value))} style={inputSt} placeholder="(11) 90000-0000" /></div>
          </div>
          <div style={{ marginBottom: 4 }}><label style={labelSt}>E-mail</label><input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} style={inputSt} placeholder="email@exemplo.com" /></div>
          {error && <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, color: "#9B2C2C", fontSize: 12.5 }}><AlertCircle size={15} color={T.coral} /> {error}</div>}
        </div>
        <div style={{ padding: "14px 22px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} disabled={saving} style={{ padding: "8px 16px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 9, color: T.text, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: T.font }}>Cancelar</button>
          <button onClick={save} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 18px", background: T.gradient, border: "none", borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1, fontFamily: T.font }}>
            {saving && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />} Criar lead
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Modal Importar Leads (CSV → resolve_person em lote) ─── */
function ImportLeadsModal({ onClose, onDone }) {
  const [step, setStep] = useState("file"); // file | mapping | processing | done
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState([]);
  const [dataRows, setDataRows] = useState([]);
  const [mapping, setMapping] = useState({ nome: null, cpf: null, email: null, telefone: null });
  const [createSegment, setCreateSegment] = useState(true);
  const [segmentName, setSegmentName] = useState("");
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [summary, setSummary] = useState(null);

  const inputSt = { width: "100%", padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, color: T.text, outline: "none", fontFamily: T.font, boxSizing: "border-box", background: T.surface };
  const labelSt = { fontSize: 11.5, fontWeight: 600, color: T.text, display: "block", marginBottom: 4, fontFamily: T.font };
  const selSt = { ...inputSt, cursor: "pointer" };

  const onFile = async (file) => {
    setError(null);
    if (!file) return;
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      if (rows.length < 2) { setError("O arquivo não tem linhas de dados (apenas cabeçalho ou vazio)."); return; }
      const [head, ...rest] = rows;
      setHeaders(head);
      setDataRows(rest);
      setMapping(guessMapping(head));
      setFileName(file.name);
      const stamp = new Date().toLocaleDateString("pt-BR");
      setSegmentName(`Importação ${file.name.replace(/\.csv$/i, "")} ${stamp}`);
      setStep("mapping");
    } catch (err) {
      setError("Não foi possível ler o arquivo: " + (err.message || String(err)));
    }
  };

  const runImport = async () => {
    setError(null);
    setStep("processing");
    let processed = 0, failed = 0;
    const personIds = [];
    setProgress({ done: 0, total: dataRows.length });
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const nome = mapping.nome != null ? (row[mapping.nome] || "").trim() : "";
      const cpfRaw = mapping.cpf != null ? (row[mapping.cpf] || "").trim() : "";
      const emailRaw = mapping.email != null ? (row[mapping.email] || "").trim() : "";
      const phoneRaw = mapping.telefone != null ? (row[mapping.telefone] || "").trim() : "";
      const cpfClean = cpfRaw ? cleanCpf(cpfRaw) : null;
      const phoneClean = phoneRaw ? onlyDigits(phoneRaw) : "";
      if (!cpfClean && !emailRaw && !phoneClean) {
        failed++;
      } else {
        try {
          const { data, error: e } = await supabase.schema("core").rpc("resolve_person", {
            p_workspace: WORKSPACE_VANTARI, p_cpf: cpfClean, p_phone: phoneClean || null,
            p_email: emailRaw || null, p_name: nome || null, p_source: "import",
          });
          if (e) { failed++; } else { processed++; if (data) personIds.push(data); }
        } catch { failed++; }
      }
      setProgress({ done: i + 1, total: dataRows.length });
    }

    let segmentId = null;
    if (createSegment && personIds.length > 0) {
      const { data: seg, error: segErr } = await supabase.from("segments").insert({
        name: segmentName.trim() || `Importação ${fileName}`,
        description: `Criado automaticamente ao importar "${fileName}".`,
        rules: [{ field: "id", op: "in", value: personIds }],
        workspace_id: WORKSPACE_VANTARI,
      }).select("id").single();
      if (!segErr && seg) segmentId = seg.id;
    }

    const { data: userData } = await supabase.auth.getUser();
    await supabase.schema("core").from("import_batches").insert({
      workspace_id: WORKSPACE_VANTARI,
      filename: fileName,
      total_rows: dataRows.length,
      processed, failed,
      field_mapping: mapping,
      segment_id: segmentId,
      created_by: userData?.user?.email || null,
    });

    setSummary({ processed, failed, segmentId, segmentName });
    setStep("done");
  };

  const mapField = (key, label) => (
    <div style={{ marginBottom: 12 }}>
      <label style={labelSt}>{label}</label>
      <select value={mapping[key] == null ? "" : mapping[key]} onChange={(e) => setMapping((m) => ({ ...m, [key]: e.target.value === "" ? null : Number(e.target.value) }))} style={selSt}>
        <option value="">— nenhuma coluna —</option>
        {headers.map((h, idx) => <option key={idx} value={idx}>{h || `Coluna ${idx + 1}`}</option>)}
      </select>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }} onClick={step === "processing" ? undefined : onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: T.surface, borderRadius: 16, width: 540, maxWidth: "94vw", maxHeight: "88vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.18)" }}>
        <div style={{ padding: "18px 22px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: T.head, fontWeight: 700, fontSize: 15, color: T.ink, display: "flex", alignItems: "center", gap: 8 }}>
            <Upload size={16} color={T.teal} /> Importar leads (CSV)
          </span>
          {step !== "processing" && <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: T.muted }}><X size={18} /></button>}
        </div>

        <div style={{ padding: "20px 22px" }}>
          {step === "file" && (
            <div>
              <div style={{ fontSize: 13, color: T.muted, marginBottom: 14 }}>
                Selecione um arquivo <strong>.csv</strong> com os leads. As colunas podem ter qualquer nome — você mapeia na próxima etapa.
              </div>
              <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "34px 16px", border: `2px dashed ${T.border}`, borderRadius: 12, cursor: "pointer", color: T.muted, fontSize: 13 }}>
                <FileText size={26} color={T.faint3} />
                Clique para escolher o arquivo CSV
                <input type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={(e) => onFile(e.target.files?.[0])} />
              </label>
              {error && <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, color: "#9B2C2C", fontSize: 12.5 }}><AlertCircle size={15} color={T.coral} /> {error}</div>}
            </div>
          )}

          {step === "mapping" && (
            <div>
              <div style={{ fontSize: 12.5, color: T.muted, marginBottom: 14 }}>
                <strong>{fileName}</strong> · {dataRows.length} linha{dataRows.length === 1 ? "" : "s"} de dados
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {mapField("nome", "Nome")}
                {mapField("cpf", "CPF")}
                {mapField("telefone", "Telefone")}
                {mapField("email", "E-mail")}
              </div>

              <div style={{ marginTop: 6, marginBottom: 14, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "auto", maxHeight: 140 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr>{headers.map((h, i) => <th key={i} style={{ textAlign: "left", padding: "6px 10px", background: T.bg, color: T.muted, fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {dataRows.slice(0, 3).map((r, i) => (
                      <tr key={i}>{headers.map((_, j) => <td key={j} style={{ padding: "6px 10px", color: T.text, whiteSpace: "nowrap" }}>{r[j] || "—"}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.text, cursor: "pointer", marginBottom: createSegment ? 8 : 0 }}>
                <input type="checkbox" checked={createSegment} onChange={(e) => setCreateSegment(e.target.checked)} />
                Criar segmentação com este lote
              </label>
              {createSegment && (
                <input value={segmentName} onChange={(e) => setSegmentName(e.target.value)} style={inputSt} placeholder="Nome da segmentação" />
              )}

              {error && <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, color: "#9B2C2C", fontSize: 12.5 }}><AlertCircle size={15} color={T.coral} /> {error}</div>}
            </div>
          )}

          {step === "processing" && (
            <div style={{ textAlign: "center", padding: "30px 0" }}>
              <Loader2 size={26} style={{ animation: "spin 1s linear infinite" }} color={T.teal} />
              <div style={{ marginTop: 12, fontSize: 13, color: T.text }}>Processando {progress.done} de {progress.total}...</div>
              <div style={{ marginTop: 10, height: 6, background: T.bg, borderRadius: 99, overflow: "hidden", width: "80%", marginLeft: "auto", marginRight: "auto" }}>
                <div style={{ height: "100%", width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`, background: T.gradient, transition: "width 0.2s" }} />
              </div>
            </div>
          )}

          {step === "done" && summary && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <CheckCircle2 size={30} color={T.green} />
              <div style={{ marginTop: 10, fontSize: 15, fontWeight: 700, color: T.ink, fontFamily: T.head }}>Importação concluída</div>
              <div style={{ marginTop: 6, fontSize: 13, color: T.muted }}>
                {summary.processed} processado{summary.processed === 1 ? "" : "s"} · {summary.failed} ignorado{summary.failed === 1 ? "" : "s"} (sem CPF, telefone ou e-mail)
              </div>
              {summary.segmentId && (
                <div style={{ marginTop: 10, fontSize: 12.5, color: T.teal }}>📥 Segmentação "{summary.segmentName}" criada com {summary.processed} pessoa(s).</div>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: "14px 22px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", gap: 10 }}>
          {step === "mapping" ? (
            <button onClick={() => setStep("file")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 9, color: T.text, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: T.font }}>
              <ArrowLeft size={14} /> Voltar
            </button>
          ) : <span />}
          {step === "mapping" && (
            <button onClick={runImport} disabled={!mapping.cpf && !mapping.email && !mapping.telefone}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 18px", background: T.gradient, border: "none", borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: T.font, opacity: (!mapping.cpf && !mapping.email && !mapping.telefone) ? 0.5 : 1 }}>
              Importar {dataRows.length} linha{dataRows.length === 1 ? "" : "s"} <ArrowRight size={14} />
            </button>
          )}
          {step === "done" && (
            <button onClick={onDone} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7, padding: "8px 18px", background: T.gradient, border: "none", borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>
              Concluir
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Contatos() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [companies, setCompanies] = useState({});
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNovo, setShowNovo] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [collapsed, setCollapsed] = useSidebarCollapsed();

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const core = supabase.schema("core");
      let query = core.from("persons")
        .select("id,full_name,cpf,primary_email,primary_phone,status,company_id,created_at")
        .order("created_at", { ascending: false }).limit(500);
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      const term = q.trim();
      if (term) {
        const d = onlyDigits(term);
        const ors = [`full_name.ilike.%${term}%`, `primary_email.ilike.%${term}%`];
        if (d) { ors.push(`cpf.ilike.%${d}%`); ors.push(`primary_phone.ilike.%${d}%`); }
        query = query.or(ors.join(","));
      }
      const { data, error: e } = await query;
      if (e) throw e;
      setRows(data || []);
      const ids = [...new Set((data || []).map((r) => r.company_id).filter(Boolean))];
      if (ids.length) {
        const { data: co } = await core.from("companies").select("id,name").in("id", ids);
        const map = {}; (co || []).forEach((c) => { map[c.id] = c.name; }); setCompanies(map);
      } else setCompanies({});
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [q, statusFilter]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const exportCsv = () => {
    const header = ["Nome", "CPF", "Telefone", "E-mail", "Empresa", "Status", "Criado em"];
    const data = rows.map((r) => [
      r.full_name || "", r.cpf || "", r.primary_phone || "", r.primary_email || "",
      r.company_id ? (companies[r.company_id] || "") : "", statusBadge(r.status).label, fmtDate(r.created_at),
    ]);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`vantari-leads-${stamp}.csv`, header, data);
  };

  const th = { textAlign: "left", fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.04em", padding: "10px 14px", fontFamily: T.font, borderBottom: `1px solid ${T.border}` };
  const td = { padding: "11px 14px", fontSize: 13, color: T.text, fontFamily: T.font, borderBottom: `1px solid ${T.bg}` };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div style={{ marginLeft: collapsed ? 64 : 240, transition: "margin-left 0.15s", padding: "28px 32px", minHeight: "100vh" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: T.ink, fontFamily: T.head, letterSpacing: "-0.03em", margin: 0 }}>Leads</h1>
            <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>Pessoas do cadastro único (core) · {rows.length}{rows.length === 500 ? "+" : ""}</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowImport(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 700, color: T.text, fontFamily: T.font }}>
              <Upload size={15} /> Importar
            </button>
            <button onClick={exportCsv} disabled={rows.length === 0} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 9, cursor: rows.length === 0 ? "default" : "pointer", fontSize: 13, fontWeight: 700, color: rows.length === 0 ? T.faint3 : T.text, fontFamily: T.font, opacity: rows.length === 0 ? 0.6 : 1 }}>
              <Download size={15} /> Exportar
            </button>
            <button onClick={() => setShowNovo(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: T.gradient, border: "none", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: T.font }}>
              <Plus size={15} /> Novo Lead
            </button>
          </div>
        </div>

        {/* filtros */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
            <Search size={15} color={T.faint3} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, e-mail, CPF, telefone..."
              style={{ width: "100%", padding: "9px 12px 9px 34px", border: `1px solid ${T.border}`, borderRadius: 9, fontSize: 13, color: T.text, outline: "none", fontFamily: T.font, boxSizing: "border-box", background: T.surface }} />
          </div>
          <div style={{ display: "flex", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 9, padding: 3, gap: 2 }}>
            {[{ v: "all", l: "Todos" }, { v: "identificado", l: "Identificados" }, { v: "pendente", l: "Pendentes" }].map((s) => (
              <button key={s.v} onClick={() => setStatusFilter(s.v)} style={{ padding: "5px 11px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600, fontFamily: T.font, background: statusFilter === s.v ? T.teal : "transparent", color: statusFilter === s.v ? "#fff" : T.text }}>{s.l}</button>
            ))}
          </div>
        </div>

        {error && !loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#FFF1F0", border: `1px solid ${T.coral}`, color: "#9B2C2C", borderRadius: 12, padding: "14px 16px", fontSize: 13, marginBottom: 16 }}>
            <AlertCircle size={18} color={T.coral} /> <span><strong>Erro:</strong> {error}</span>
          </div>
        )}

        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 220, color: T.muted, gap: 10, fontSize: 14 }}>
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Carregando contatos...
            </div>
          ) : rows.length === 0 ? (
            <div style={{ textAlign: "center", color: T.muted, padding: "70px 0", fontSize: 14 }}>
              <UserPlus size={28} color={T.faint3} style={{ marginBottom: 8 }} />
              <div>Nenhum lead {q || statusFilter !== "all" ? "para este filtro" : "ainda"}.</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Leads aparecem aqui quando criados aqui, via negócio (CRM) ou pela Nina.</div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                <th style={th}>Nome</th><th style={th}>CPF</th><th style={th}>Telefone</th><th style={th}>E-mail</th>
                <th style={th}>Empresa</th><th style={th}>Status</th><th style={th}>Criado em</th>
              </tr></thead>
              <tbody>
                {rows.map((r) => {
                  const sb = statusBadge(r.status);
                  return (
                    <tr key={r.id} onClick={() => setSelectedLead(r)} style={{ cursor: "pointer" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = T.bg}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                      <td style={{ ...td, fontWeight: 700, color: T.ink }}>{r.full_name || "—"}</td>
                      <td style={{ ...td, fontFamily: T.mono }}>{r.cpf ? maskCpf(r.cpf) : "—"}</td>
                      <td style={{ ...td, fontFamily: T.mono }}>{r.primary_phone ? maskPhone(r.primary_phone) : "—"}</td>
                      <td style={td}>{r.primary_email || "—"}</td>
                      <td style={td}>{r.company_id ? (companies[r.company_id] || "—") : "—"}</td>
                      <td style={td}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: sb.bg, color: sb.color, border: `1px solid ${sb.border}` }}>{sb.label}</span>
                      </td>
                      <td style={{ ...td, color: T.muted, fontFamily: T.mono }}>{fmtDate(r.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showNovo && <NovoContatoModal onClose={() => setShowNovo(false)} onCreated={() => { setShowNovo(false); load(); }} />}
      {showImport && <ImportLeadsModal onClose={() => setShowImport(false)} onDone={() => { setShowImport(false); load(); }} />}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          companyName={selectedLead.company_id ? companies[selectedLead.company_id] : null}
          onClose={() => setSelectedLead(null)}
          onSaved={() => { setSelectedLead(null); load(); }}
        />
      )}
    </div>
  );
}
