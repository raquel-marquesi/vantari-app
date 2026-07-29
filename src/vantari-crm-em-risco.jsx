import { useState, useEffect, useCallback, useMemo } from "react";
import { useSidebarCollapsed } from "./sidebar-collapsed";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabase";
import {
  BarChart2, Users, Mail, Star, LayoutTemplate, Bot, Plug, Settings, Briefcase,
  Loader2, AlertCircle, X, Building2, Zap, Filter, ChevronLeft, ChevronRight,
  LogOut, Activity, ListChecks, AlertTriangle, Flame, Settings2,
} from "lucide-react";
import { Inbox } from "lucide-react";

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
const DEFAULT_RULES = { medio_dias: 7, alto_dias: 14 };

const fmtBRL = (cents) => "R$ " + ((cents || 0) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const daysSince = (iso) => iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)) : null;
const riskOf = (days, rules) => {
  if (days == null) return "sem_atividade"; // nunca teve atividade registrada — tratado como alto risco
  if (days >= rules.alto_dias) return "alto";
  if (days >= rules.medio_dias) return "medio";
  return "baixo";
};

/* ─── Sidebar (padrão self-contained do projeto) ─── */
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
        <NavItem icon={Building2} label="Empresas" path="/empresas" collapsed={collapsed} />
        <NavItem icon={Activity} label="Atividades" path="/activities" collapsed={collapsed} />
        <NavItem icon={ListChecks} label="Tarefas" path="/tasks" collapsed={collapsed} />
        <NavItem icon={AlertTriangle} label="Em Risco" path="/risco" active collapsed={collapsed} />
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

const RISK_META = {
  alto: { label: "Alto risco", color: T.coral, bg: "#FFF1F0" },
  sem_atividade: { label: "Alto risco", color: T.coral, bg: "#FFF1F0" },
  medio: { label: "Médio risco", color: T.amber, bg: "#FFFBEB" },
  baixo: { label: "Baixo risco", color: T.green, bg: "#ECFDF5" },
};

/* ─── Modal Regras ─── */
function RegrasModal({ rules, onClose, onSaved }) {
  const [medio, setMedio] = useState(String(rules.medio_dias));
  const [alto, setAlto] = useState(String(rules.alto_dias));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const inputSt = { width: "100%", padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, color: T.text, outline: "none", fontFamily: T.font, boxSizing: "border-box", background: T.surface };
  const labelSt = { fontSize: 11.5, fontWeight: 600, color: T.text, display: "block", marginBottom: 4, fontFamily: T.font };

  const save = async () => {
    setError(null);
    const m = parseInt(medio, 10), a = parseInt(alto, 10);
    if (!Number.isFinite(m) || !Number.isFinite(a) || m < 1 || a < 1) { setError("Informe números de dias válidos."); return; }
    if (a <= m) { setError("O limiar de alto risco deve ser maior que o de médio risco."); return; }
    setSaving(true);
    const { error: e } = await supabase.from("workspace_settings")
      .update({ risk_rules: { medio_dias: m, alto_dias: a } })
      .eq("workspace_id", WORKSPACE_VANTARI);
    setSaving(false);
    if (e) { setError(e.message); return; }
    onSaved({ medio_dias: m, alto_dias: a });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: T.surface, borderRadius: 16, width: 420, maxWidth: "94vw", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.18)" }}>
        <div style={{ padding: "18px 22px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: T.head, fontWeight: 700, fontSize: 15, color: T.ink }}>Regras de inatividade</span>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: T.muted }}><X size={18} /></button>
        </div>
        <div style={{ padding: "18px 22px" }}>
          <div style={{ fontSize: 12.5, color: T.muted, marginBottom: 14 }}>
            Um negócio ou contato entra em risco quando fica X dias sem nenhuma atividade registrada (nota, ligação, reunião, tarefa, email ou WhatsApp).
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelSt}>Médio risco a partir de (dias)</label>
            <input inputMode="numeric" value={medio} onChange={(e) => setMedio(e.target.value.replace(/\D/g, ""))} style={inputSt} />
          </div>
          <div style={{ marginBottom: 4 }}>
            <label style={labelSt}>Alto risco a partir de (dias)</label>
            <input inputMode="numeric" value={alto} onChange={(e) => setAlto(e.target.value.replace(/\D/g, ""))} style={inputSt} />
          </div>
          {error && <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, color: "#9B2C2C", fontSize: 12.5 }}><AlertCircle size={15} color={T.coral} /> {error}</div>}
        </div>
        <div style={{ padding: "14px 22px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} disabled={saving} style={{ padding: "8px 16px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 9, color: T.text, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: T.font }}>Cancelar</button>
          <button onClick={save} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 18px", background: T.gradient, border: "none", borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1, fontFamily: T.font }}>
            {saving && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />} Salvar regras
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EmRisco() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [deals, setDeals] = useState([]); // {id, personName, stageName, valor_ofertado_cents, lastActivity, days, risk}
  const [contacts, setContacts] = useState([]); // {person_id, personName, email, phone, dealsCount, lastActivity, days, risk}
  const [tab, setTab] = useState("negocios");
  const [showRegras, setShowRegras] = useState(false);
  const [collapsed, setCollapsed] = useSidebarCollapsed();

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const crm = supabase.schema("crm");
      const { data: ws } = await supabase.from("workspace_settings").select("risk_rules").eq("workspace_id", WORKSPACE_VANTARI).maybeSingle();
      const currentRules = ws?.risk_rules || DEFAULT_RULES;
      setRules(currentRules);

      const { data: openDeals, error: e1 } = await crm.from("deals")
        .select("id,person_id,stage_id,valor_ofertado_cents,created_at")
        .eq("workspace_id", WORKSPACE_VANTARI).eq("status", "open");
      if (e1) throw e1;

      const dealIds = (openDeals || []).map((d) => d.id);
      const personIds = [...new Set((openDeals || []).map((d) => d.person_id).filter(Boolean))];
      const stageIds = [...new Set((openDeals || []).map((d) => d.stage_id).filter(Boolean))];

      const [{ data: stages }, { data: persons }, { data: acts }] = await Promise.all([
        stageIds.length ? crm.from("stages").select("id,name").in("id", stageIds) : Promise.resolve({ data: [] }),
        personIds.length ? supabase.schema("core").from("persons").select("id,full_name,primary_email,primary_phone").in("id", personIds) : Promise.resolve({ data: [] }),
        dealIds.length ? crm.from("activities").select("deal_id,person_id,created_at").or(
          [`deal_id.in.(${dealIds.join(",")})`, personIds.length ? `person_id.in.(${personIds.join(",")})` : null].filter(Boolean).join(",")
        ) : Promise.resolve({ data: [] }),
      ]);

      const stageById = {}; (stages || []).forEach((s) => stageById[s.id] = s.name);
      const personById = {}; (persons || []).forEach((p) => personById[p.id] = p);

      const lastActByDeal = {};
      const lastActByPerson = {};
      (acts || []).forEach((a) => {
        if (a.deal_id && (!lastActByDeal[a.deal_id] || a.created_at > lastActByDeal[a.deal_id])) lastActByDeal[a.deal_id] = a.created_at;
        if (a.person_id && (!lastActByPerson[a.person_id] || a.created_at > lastActByPerson[a.person_id])) lastActByPerson[a.person_id] = a.created_at;
      });

      const dealRows = (openDeals || []).map((d) => {
        const last = lastActByDeal[d.id] || null;
        const refDate = last || d.created_at;
        const days = daysSince(refDate);
        return {
          id: d.id, personName: personById[d.person_id]?.full_name || personById[d.person_id]?.primary_email || "Titular pendente",
          stageName: stageById[d.stage_id] || "—", valor: d.valor_ofertado_cents,
          lastActivity: last, days, risk: riskOf(days, currentRules),
        };
      });
      setDeals(dealRows.filter((d) => d.risk === "alto" || d.risk === "medio" || d.risk === "sem_atividade")
        .sort((a, b) => (b.days ?? 999) - (a.days ?? 999)));

      // agrega por pessoa (pode ter mais de um negócio aberto)
      const byPerson = {};
      (openDeals || []).forEach((d) => {
        if (!d.person_id) return;
        if (!byPerson[d.person_id]) byPerson[d.person_id] = { dealsCount: 0, minRefDate: null };
        byPerson[d.person_id].dealsCount++;
        const last = lastActByPerson[d.person_id] || null;
        const refDate = last || d.created_at;
        if (!byPerson[d.person_id].minRefDate || refDate > byPerson[d.person_id].minRefDate) byPerson[d.person_id].minRefDate = refDate;
      });
      const contactRows = Object.entries(byPerson).map(([pid, agg]) => {
        const days = daysSince(agg.minRefDate);
        return {
          person_id: pid, personName: personById[pid]?.full_name || personById[pid]?.primary_email || "Titular pendente",
          email: personById[pid]?.primary_email || null, phone: personById[pid]?.primary_phone || null,
          dealsCount: agg.dealsCount, days, risk: riskOf(days, currentRules),
        };
      });
      setContacts(contactRows.filter((c) => c.risk === "alto" || c.risk === "medio" || c.risk === "sem_atividade")
        .sort((a, b) => (b.days ?? 999) - (a.days ?? 999)));
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const kpis = useMemo(() => {
    const alto = deals.filter((d) => d.risk === "alto" || d.risk === "sem_atividade").length;
    const medio = deals.filter((d) => d.risk === "medio").length;
    const valor = deals.reduce((sum, d) => sum + (d.valor || 0), 0);
    return { alto, medio, valor };
  }, [deals]);

  const th = { textAlign: "left", fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.04em", padding: "10px 14px", fontFamily: T.font, borderBottom: `1px solid ${T.border}` };
  const td = { padding: "11px 14px", fontSize: 13, color: T.text, fontFamily: T.font, borderBottom: `1px solid ${T.bg}` };

  const RiskBadge = ({ risk }) => {
    const m = RISK_META[risk] || RISK_META.baixo;
    return <span style={{ fontSize: 11.5, fontWeight: 700, color: m.color, background: m.bg, padding: "3px 9px", borderRadius: 20 }}>{m.label}</span>;
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div style={{ marginLeft: collapsed ? 64 : 240, transition: "margin-left 0.15s", padding: "28px 32px", minHeight: "100vh" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: T.ink, fontFamily: T.head, letterSpacing: "-0.03em", margin: 0 }}>Em Risco</h1>
            <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>Monitor de inatividade — negócios e contatos sem atividade recente</div>
          </div>
          <button onClick={() => setShowRegras(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 700, color: T.text, fontFamily: T.font }}>
            <Settings2 size={15} /> Regras
          </button>
        </div>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 20 }}>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.coral, fontSize: 12, fontWeight: 700, marginBottom: 6 }}><Flame size={15} /> ALTO RISCO</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: T.ink, fontFamily: T.head }}>{kpis.alto}</div>
          </div>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.amber, fontSize: 12, fontWeight: 700, marginBottom: 6 }}><AlertTriangle size={15} /> MÉDIO RISCO</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: T.ink, fontFamily: T.head }}>{kpis.medio}</div>
          </div>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 6 }}>VALOR EM RISCO (R$)</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.ink, fontFamily: T.mono }}>{fmtBRL(kpis.valor)}</div>
          </div>
        </div>

        {/* abas */}
        <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${T.border}`, marginBottom: 16 }}>
          {[{ v: "negocios", l: `Negócios (${deals.length})` }, { v: "contatos", l: `Contatos (${contacts.length})` }].map((t) => (
            <button key={t.v} onClick={() => setTab(t.v)}
              style={{
                padding: "8px 14px", border: "none", borderBottom: tab === t.v ? `2px solid ${T.teal}` : "2px solid transparent",
                background: "none", color: tab === t.v ? T.teal : T.muted, fontSize: 13, fontWeight: tab === t.v ? 700 : 600,
                cursor: "pointer", fontFamily: T.font,
              }}>
              {t.l}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#FFF1F0", border: `1px solid ${T.coral}`, color: "#9B2C2C", borderRadius: 12, padding: "14px 16px", fontSize: 13, marginBottom: 16 }}>
            <AlertCircle size={18} color={T.coral} /> <span><strong>Erro:</strong> {error}</span>
          </div>
        )}

        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 220, color: T.muted, gap: 10, fontSize: 14 }}>
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Carregando...
            </div>
          ) : tab === "negocios" ? (
            deals.length === 0 ? (
              <div style={{ textAlign: "center", color: T.muted, padding: "70px 0", fontSize: 14 }}>
                <AlertTriangle size={28} color={T.faint3} style={{ marginBottom: 8 }} />
                <div>Nenhum negócio em risco.</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Ótimo sinal — todos os negócios abertos tiveram atividade recente.</div>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={th}>Negócio</th><th style={th}>Estágio</th><th style={th}>Valor ofertado</th>
                  <th style={th}>Inatividade</th><th style={th}>Risco</th>
                </tr></thead>
                <tbody>
                  {deals.map((d) => (
                    <tr key={d.id} onClick={() => navigate(`/crm/${d.id}`)}
                      onMouseEnter={(e) => e.currentTarget.style.background = T.bg}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      style={{ cursor: "pointer" }}>
                      <td style={{ ...td, fontWeight: 700, color: T.ink }}>{d.personName}</td>
                      <td style={td}>{d.stageName}</td>
                      <td style={{ ...td, fontFamily: T.mono }}>{fmtBRL(d.valor)}</td>
                      <td style={td}>{d.days == null ? "sem atividade" : `${d.days} dia${d.days === 1 ? "" : "s"}`}</td>
                      <td style={td}><RiskBadge risk={d.risk} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            contacts.length === 0 ? (
              <div style={{ textAlign: "center", color: T.muted, padding: "70px 0", fontSize: 14 }}>
                <AlertTriangle size={28} color={T.faint3} style={{ marginBottom: 8 }} />
                <div>Nenhum contato em risco.</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Ótimo sinal — todos os contatos com negócio aberto tiveram atividade recente.</div>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={th}>Contato</th><th style={th}>Email / Telefone</th><th style={th}>Negócios abertos</th>
                  <th style={th}>Inatividade</th><th style={th}>Risco</th>
                </tr></thead>
                <tbody>
                  {contacts.map((c) => (
                    <tr key={c.person_id}
                      onMouseEnter={(e) => e.currentTarget.style.background = T.bg}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                      <td style={{ ...td, fontWeight: 700, color: T.ink }}>{c.personName}</td>
                      <td style={{ ...td, color: T.muted, fontSize: 12.5 }}>{c.email || c.phone || "—"}</td>
                      <td style={td}>{c.dealsCount}</td>
                      <td style={td}>{c.days == null ? "sem atividade" : `${c.days} dia${c.days === 1 ? "" : "s"}`}</td>
                      <td style={td}><RiskBadge risk={c.risk} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>

      {showRegras && (
        <RegrasModal rules={rules} onClose={() => setShowRegras(false)} onSaved={(r) => { setRules(r); setShowRegras(false); load(); }} />
      )}
    </div>
  );
}
