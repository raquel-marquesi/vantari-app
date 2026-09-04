import { useState, useEffect, useCallback } from "react";
import { useSidebarCollapsed } from "./sidebar-collapsed";
import { useWorkspaceRole } from "./useWorkspaceRole";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabase";
import {
  BarChart2, Users, Mail, Star, LayoutTemplate, Bot, Plug, Settings, Briefcase,
  Plus, Search, Loader2, AlertCircle, X, Building2, Zap, Filter, Edit3, Trash2,
  ChevronLeft, ChevronRight, LogOut,
} from "lucide-react";
import { Activity, ListChecks } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import { Inbox } from "lucide-react";
import { FileBarChart } from "lucide-react";

/* ───── DESIGN TOKENS (padrão Vantari) ───── */
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

/* helpers (self-contained, mesmo padrão do resto do CRM) */
const onlyDigits = (s) => (s || "").replace(/\D/g, "");
const maskCnpj = (raw) => {
  const d = onlyDigits(raw).slice(0, 14);
  if (d.length > 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  if (d.length > 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  if (d.length > 5) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length > 2) return `${d.slice(0, 2)}.${d.slice(2)}`;
  return d;
};
const fmtDate = (s) => s ? new Date(s).toLocaleDateString("pt-BR") : "—";
const reaisToCents = (v) => { if (v == null || v === "") return null; const n = parseFloat(String(v).replace(/\./g, "").replace(",", ".")); return Number.isFinite(n) ? Math.round(n * 100) : null; };
const centsToInput = (c) => c == null ? "" : (c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const maskMoney = (raw) => { let s = String(raw).replace(/[^\d,]/g, ""); const c = s.indexOf(","); let intp, decp = null; if (c >= 0) { intp = s.slice(0, c).replace(/\D/g, ""); decp = s.slice(c + 1).replace(/\D/g, "").slice(0, 2); } else { intp = s.replace(/\D/g, ""); } intp = intp.replace(/^0+(?=\d)/, ""); const g = intp.replace(/\B(?=(\d{3})+(?!\d))/g, "."); let out = g || (decp != null ? "0" : ""); if (decp != null) out += "," + decp; return out; };
const fmtBRL = (cents) => cents == null ? "—" : "R$ " + (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SIZE_OPTS = ["MEI", "ME", "EPP", "Médio", "Grande"];

/* ─── Sidebar (mesmo padrão do resto do projeto: cópia self-contained por página) ─── */
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
        <NavItem icon={Users} label="Leads" path="/leads" collapsed={collapsed} />
        <NavItem icon={Inbox} label="Atendimento" path="/inbox" collapsed={collapsed} />
        <NavSection label="CRM" collapsed={collapsed} />
        <NavItem icon={Briefcase} label="Negócios" path="/crm" collapsed={collapsed} />
        <NavItem icon={Building2} label="Empresas" path="/empresas" active collapsed={collapsed} />
        <NavItem icon={Activity} label="Atividades" path="/activities" collapsed={collapsed} />
        <NavItem icon={ListChecks} label="Tarefas" path="/tasks" collapsed={collapsed} />
        <NavItem icon={AlertTriangle} label="Em Risco" path="/risco" collapsed={collapsed} />
        <NavItem icon={FileBarChart} label="Relatórios" path="/reports" collapsed={collapsed} />
        {role !== "captador" && (
          <>
            <NavSection label="Ferramentas" collapsed={collapsed} />
            <NavItem icon={Mail} label="Email Marketing" path="/email" collapsed={collapsed} />
            <NavItem icon={Star} label="Scoring" path="/scoring" collapsed={collapsed} />
            <NavItem icon={LayoutTemplate} label="Landing Pages" path="/landing" collapsed={collapsed} />
            <NavItem icon={Filter} label="Segmentações" path="/segments" collapsed={collapsed} />
            <NavItem icon={Bot} label="IA & Automação" path="/ai-marketing" collapsed={collapsed} />
            <NavItem icon={Zap} label="Automação de Marketing" path="/workflow" collapsed={collapsed} />
            <NavSection label="Sistema" collapsed={collapsed} />
            <NavItem icon={Plug} label="Integrações" path="/integrations" collapsed={collapsed} />
          </>
        )}
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

/* ─── Modal Nova/Editar Empresa ─── */
const EMPTY_EMPRESA = { name: "", cnpj: "", domain: "", industry: "", size: "", revenue: "" };

function EmpresaModal({ empresa, onClose, onSaved }) {
  const isEdit = !!empresa;
  const [f, setF] = useState(() => empresa ? {
    name: empresa.name || "", cnpj: onlyDigits(empresa.cnpj), domain: empresa.domain || "",
    industry: empresa.industry || "", size: empresa.size || "", revenue: centsToInput(empresa.revenue_cents),
  } : EMPTY_EMPRESA);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const inputSt = { width: "100%", padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, color: T.text, outline: "none", fontFamily: T.font, boxSizing: "border-box", background: T.surface };
  const labelSt = { fontSize: 11.5, fontWeight: 600, color: T.text, display: "block", marginBottom: 4, fontFamily: T.font };

  const save = async () => {
    setError(null);
    if (!f.name.trim() && !f.cnpj.trim()) { setError("Informe ao menos o nome ou o CNPJ."); return; }
    const cnpjDigits = onlyDigits(f.cnpj) || null;
    setSaving(true);
    const payload = {
      name: f.name.trim() || null,
      cnpj: cnpjDigits,
      domain: f.domain.trim() || null,
      industry: f.industry.trim() || null,
      size: f.size || null,
      revenue_cents: reaisToCents(f.revenue),
    };
    const core = supabase.schema("core");
    const res = isEdit
      ? await core.from("companies").update(payload).eq("id", empresa.id)
      : await core.from("companies").insert({ workspace_id: WORKSPACE_VANTARI, ...payload });
    setSaving(false);
    if (res.error) { setError(res.error.message); return; }
    onSaved();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: T.surface, borderRadius: 16, width: 480, maxWidth: "94vw", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.18)" }}>
        <div style={{ padding: "18px 22px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: T.head, fontWeight: 700, fontSize: 15, color: T.ink }}>{isEdit ? "Editar empresa" : "Nova empresa"}</span>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: T.muted }}><X size={18} /></button>
        </div>
        <div style={{ padding: "18px 22px" }}>
          <div style={{ marginBottom: 12 }}>
            <label style={labelSt}>Razão social</label>
            <input value={f.name} onChange={(e) => set("name", e.target.value)} style={inputSt} placeholder="Nome da empresa" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ marginBottom: 12 }}>
              <label style={labelSt}>CNPJ</label>
              <input inputMode="numeric" value={maskCnpj(f.cnpj)} onChange={(e) => set("cnpj", onlyDigits(e.target.value))} style={inputSt} placeholder="00.000.000/0000-00" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelSt}>Domínio</label>
              <input value={f.domain} onChange={(e) => set("domain", e.target.value)} style={inputSt} placeholder="empresa.com.br" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelSt}>Indústria/Setor</label>
              <input value={f.industry} onChange={(e) => set("industry", e.target.value)} style={inputSt} placeholder="Ex: Varejo, Logística" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelSt}>Porte</label>
              <select value={f.size} onChange={(e) => set("size", e.target.value)} style={inputSt}>
                <option value="">— selecionar —</option>
                {SIZE_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 4, gridColumn: "1 / -1" }}>
              <label style={labelSt}>Receita anual estimada (R$)</label>
              <input inputMode="decimal" value={f.revenue} onChange={(e) => set("revenue", maskMoney(e.target.value))} style={inputSt} placeholder="0,00" />
            </div>
          </div>
          {error && <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, color: "#9B2C2C", fontSize: 12.5 }}><AlertCircle size={15} color={T.coral} /> {error}</div>}
        </div>
        <div style={{ padding: "14px 22px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} disabled={saving} style={{ padding: "8px 16px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 9, color: T.text, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: T.font }}>Cancelar</button>
          <button onClick={save} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 18px", background: T.gradient, border: "none", borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1, fontFamily: T.font }}>
            {saving && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />} {isEdit ? "Salvar" : "Criar empresa"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Empresas() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [procCounts, setProcCounts] = useState({});
  const [q, setQ] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const role = useWorkspaceRole();

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const core = supabase.schema("core");
      let query = core.from("companies")
        .select("id,name,cnpj,domain,industry,size,revenue_cents,created_at")
        .eq("workspace_id", WORKSPACE_VANTARI)
        .order("created_at", { ascending: false }).limit(500);
      const term = q.trim();
      if (term) {
        const d = onlyDigits(term);
        const ors = [`name.ilike.%${term}%`, `domain.ilike.%${term}%`];
        if (d) ors.push(`cnpj.ilike.%${d}%`);
        query = query.or(ors.join(","));
      }
      const { data, error: e } = await query;
      if (e) throw e;
      setRows(data || []);

      const ids = (data || []).map((r) => r.id);
      if (ids.length) {
        const { data: procs } = await supabase.schema("crm").from("processos")
          .select("reclamada_company_id").in("reclamada_company_id", ids);
        const counts = {};
        (procs || []).forEach((p) => { counts[p.reclamada_company_id] = (counts[p.reclamada_company_id] || 0) + 1; });
        setProcCounts(counts);
      } else setProcCounts({});
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const remove = async (empresa) => {
    const n = procCounts[empresa.id] || 0;
    const warn = n > 0 ? `\n\nAtenção: ${n} processo(s) referenciam esta empresa — o vínculo ficará vazio, o processo não é apagado.` : "";
    if (!confirm(`Excluir a empresa "${empresa.name || empresa.cnpj || "sem nome"}"?${warn}`)) return;
    const { error: e } = await supabase.schema("core").from("companies").delete().eq("id", empresa.id);
    if (e) { setError(e.message); return; }
    load();
  };

  const th = { textAlign: "left", fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.04em", padding: "10px 14px", fontFamily: T.font, borderBottom: `1px solid ${T.border}` };
  const td = { padding: "11px 14px", fontSize: 13, color: T.text, fontFamily: T.font, borderBottom: `1px solid ${T.bg}` };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div style={{ marginLeft: collapsed ? 64 : 240, transition: "margin-left 0.15s", padding: "28px 32px", minHeight: "100vh" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: T.ink, fontFamily: T.head, letterSpacing: "-0.03em", margin: 0 }}>Empresas</h1>
            <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>Empresas do cadastro único (core) · {rows.length}{rows.length === 500 ? "+" : ""}</div>
          </div>
          <button onClick={() => { setEditing(null); setShowModal(true); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: T.gradient, border: "none", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: T.font }}>
            <Plus size={15} /> Nova Empresa
          </button>
        </div>

        <div style={{ position: "relative", marginBottom: 16, maxWidth: 420 }}>
          <Search size={15} color={T.faint3} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, CNPJ ou domínio..."
            style={{ width: "100%", padding: "9px 12px 9px 34px", border: `1px solid ${T.border}`, borderRadius: 9, fontSize: 13, color: T.text, outline: "none", fontFamily: T.font, boxSizing: "border-box", background: T.surface }} />
        </div>

        {error && !loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#FFF1F0", border: `1px solid ${T.coral}`, color: "#9B2C2C", borderRadius: 12, padding: "14px 16px", fontSize: 13, marginBottom: 16 }}>
            <AlertCircle size={18} color={T.coral} /> <span><strong>Erro:</strong> {error}</span>
          </div>
        )}

        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 220, color: T.muted, gap: 10, fontSize: 14 }}>
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Carregando empresas...
            </div>
          ) : rows.length === 0 ? (
            <div style={{ textAlign: "center", color: T.muted, padding: "70px 0", fontSize: 14 }}>
              <Building2 size={28} color={T.faint3} style={{ marginBottom: 8 }} />
              <div>Nenhuma empresa {q ? "para esta busca" : "ainda"}.</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Empresas aparecem aqui quando criadas aqui ou como reclamada de um novo Processo em Negócios.</div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                <th style={th}>Empresa</th><th style={th}>CNPJ</th><th style={th}>Domínio</th>
                <th style={th}>Indústria</th><th style={th}>Porte</th><th style={th}>Receita</th>
                <th style={th}>Processos</th><th style={th}>Criado em</th><th style={{ ...th, textAlign: "right" }}>Ações</th>
              </tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}
                    onMouseEnter={(e) => e.currentTarget.style.background = T.bg}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    <td style={{ ...td, fontWeight: 700, color: T.ink }}>{r.name || "—"}</td>
                    <td style={{ ...td, fontFamily: T.mono }}>{r.cnpj ? maskCnpj(r.cnpj) : "—"}</td>
                    <td style={td}>{r.domain || "—"}</td>
                    <td style={td}>{r.industry || "—"}</td>
                    <td style={td}>{r.size || "—"}</td>
                    <td style={{ ...td, fontFamily: T.mono }}>{fmtBRL(r.revenue_cents)}</td>
                    <td style={td}>{procCounts[r.id] || 0}</td>
                    <td style={{ ...td, color: T.muted, fontFamily: T.mono }}>{fmtDate(r.created_at)}</td>
                    <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                      <button onClick={() => { setEditing(r); setShowModal(true); }} title="Editar"
                        style={{ background: "none", border: "none", cursor: "pointer", color: T.teal, padding: 4, marginRight: 4 }}>
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => remove(r)} title="Excluir"
                        style={{ background: "none", border: "none", cursor: "pointer", color: T.coral, padding: 4 }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <EmpresaModal empresa={editing} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />
      )}
    </div>
  );
}
