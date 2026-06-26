import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabase";
import {
  BarChart2, Users, Mail, Star, LayoutTemplate, Bot, Plug, Settings, Briefcase,
  Plus, Search, Loader2, AlertCircle, X, UserPlus, IdCard,
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

const statusBadge = (st) => st === "identificado"
  ? { label: "Identificado", color: "#0F6E4E", bg: "#F0FDF7", border: "#6EE7B7" }
  : { label: "Pendente", color: "#9A6A00", bg: "#FFF8E6", border: "#F5D58A" };

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
        <NavItem icon={Users} label="Leads" path="/leads" active />
        <NavItem icon={Mail} label="Email Marketing" path="/email" />
        <NavSection label="CRM" />
        <NavItem icon={Briefcase} label="Negócios" path="/crm" />
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

export default function Contatos() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [companies, setCompanies] = useState({});
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showNovo, setShowNovo] = useState(false);

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

  const th = { textAlign: "left", fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.04em", padding: "10px 14px", fontFamily: T.font, borderBottom: `1px solid ${T.border}` };
  const td = { padding: "11px 14px", fontSize: 13, color: T.text, fontFamily: T.font, borderBottom: `1px solid ${T.bg}` };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font }}>
      <Sidebar />
      <div style={{ marginLeft: 240, padding: "28px 32px", minHeight: "100vh" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: T.ink, fontFamily: T.head, letterSpacing: "-0.03em", margin: 0 }}>Leads</h1>
            <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>Pessoas do cadastro único (core) · {rows.length}{rows.length === 500 ? "+" : ""}</div>
          </div>
          <button onClick={() => setShowNovo(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: T.gradient, border: "none", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: T.font }}>
            <Plus size={15} /> Novo Lead
          </button>
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
                    <tr key={r.id}>
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
    </div>
  );
}
