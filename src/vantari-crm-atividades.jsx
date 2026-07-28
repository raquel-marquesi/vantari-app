import { useState, useEffect, useCallback, useMemo } from "react";
import { useSidebarCollapsed } from "./sidebar-collapsed";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabase";
import {
  BarChart2, Users, Mail, Star, LayoutTemplate, Bot, Plug, Settings, Briefcase,
  Plus, Loader2, AlertCircle, X, Building2, Zap, Filter, Edit3, Trash2, Phone,
  StickyNote, CalendarClock, Send, ChevronLeft, ChevronRight, LogOut, Activity,
  ListChecks, CheckCircle2, Circle, MessageCircle,
} from "lucide-react";
import { AlertTriangle } from "lucide-react";

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

const ACT_TYPES = [
  { v: "note", l: "Nota", icon: StickyNote, color: T.faint3 },
  { v: "call", l: "Ligação", icon: Phone, color: T.brand2 },
  { v: "meeting", l: "Reunião", icon: Users, color: T.violet },
  { v: "task", l: "Tarefa", icon: CalendarClock, color: T.amber },
  { v: "email", l: "Email", icon: Mail, color: T.cyan },
  { v: "whatsapp", l: "WhatsApp", icon: MessageCircle, color: T.green },
];
const actMeta = (t) => ACT_TYPES.find((a) => a.v === t) || { v: t, l: t, icon: StickyNote, color: T.faint3 };

/* ─── helpers ─── */
const fmtDateTime = (s) => s ? new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const fmtDate = (s) => s ? new Date(s).toLocaleDateString("pt-BR") : "—";
const toInputDT = (s) => { if (!s) return ""; const d = new Date(s); const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

function bucketOf(due_at, done) {
  if (done) return "done";
  if (!due_at) return "sem_data";
  const now = new Date();
  const today = startOfDay(now);
  const due = new Date(due_at);
  const dueDay = startOfDay(due);
  if (due < now) return "vencido";
  if (dueDay.getTime() === today.getTime()) return "hoje";
  if (dueDay.getTime() === addDays(today, 1).getTime()) return "amanha";
  const weekStart = addDays(today, -today.getDay());
  const weekEnd = addDays(weekStart, 6);
  const nextWeekEnd = addDays(weekEnd, 7);
  if (dueDay >= today && dueDay <= weekEnd) return "semana";
  if (dueDay > weekEnd && dueDay <= nextWeekEnd) return "prox_semana";
  return "futuro";
}

// "para_fazer" é um agregado (tudo que não está concluído), não um bucket exclusivo de bucketOf
function matchesTab(a, tabValue) {
  if (tabValue === "todas") return true;
  if (tabValue === "para_fazer") return !a.done;
  return bucketOf(a.due_at, a.done) === tabValue;
}

const TABS = [
  { v: "todas", l: "Todas" },
  { v: "para_fazer", l: "Para fazer" },
  { v: "vencido", l: "Vencido" },
  { v: "hoje", l: "Hoje" },
  { v: "amanha", l: "Amanhã" },
  { v: "semana", l: "Esta semana" },
  { v: "prox_semana", l: "Próxima semana" },
];

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
      <div style={{ flex: 1, overflowY: "auto", padding: "0 0 8px", position: "relative" }}>
        <NavSection label="Principal" collapsed={collapsed} />
        <NavItem icon={BarChart2} label="Analytics" path="/dashboard" collapsed={collapsed} />
        <NavItem icon={Users} label="Leads" path="/leads" collapsed={collapsed} />
        <NavItem icon={Mail} label="Email Marketing" path="/email" collapsed={collapsed} />
        <NavSection label="CRM" collapsed={collapsed} />
        <NavItem icon={Briefcase} label="Negócios" path="/crm" collapsed={collapsed} />
        <NavItem icon={Building2} label="Empresas" path="/empresas" collapsed={collapsed} />
        <NavItem icon={Activity} label="Atividades" path="/activities" active collapsed={collapsed} />
        <NavItem icon={ListChecks} label="Tarefas" path="/tasks" collapsed={collapsed} />
        <NavItem icon={AlertTriangle} label="Em Risco" path="/risco" collapsed={collapsed} />
        <NavSection label="Ferramentas" collapsed={collapsed} />
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

/* ─── Modal Nova/Editar Atividade ─── */
function AtividadeModal({ activity, deals, users, onClose, onSaved }) {
  const isEdit = !!activity;
  const [dealId, setDealId] = useState(activity?.deal_id || "");
  const [dealSearch, setDealSearch] = useState("");
  const [type, setType] = useState(activity?.type || "task");
  const [content, setContent] = useState(activity?.content || "");
  const [dueAt, setDueAt] = useState(toInputDT(activity?.due_at));
  const [ownerId, setOwnerId] = useState(activity?.owner_id || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const inputSt = { width: "100%", padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, color: T.text, outline: "none", fontFamily: T.font, boxSizing: "border-box", background: T.surface };
  const labelSt = { fontSize: 11.5, fontWeight: 600, color: T.text, display: "block", marginBottom: 4, fontFamily: T.font };

  const filteredDeals = useMemo(() => {
    const term = dealSearch.trim().toLowerCase();
    if (!term) return deals.slice(0, 30);
    return deals.filter((d) => (d.label || "").toLowerCase().includes(term)).slice(0, 30);
  }, [deals, dealSearch]);

  const selectedDeal = deals.find((d) => d.id === dealId);

  const save = async () => {
    setError(null);
    if (!isEdit && !dealId) { setError("Selecione o negócio vinculado."); return; }
    if (!content.trim()) { setError("Descreva a atividade."); return; }
    setSaving(true);
    const deal = deals.find((d) => d.id === dealId) || (isEdit ? null : null);
    const payload = {
      type, content: content.trim(),
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      owner_id: ownerId || null,
    };
    let res;
    if (isEdit) {
      res = await supabase.schema("crm").from("activities").update(payload).eq("id", activity.id);
    } else {
      res = await supabase.schema("crm").from("activities").insert({
        workspace_id: WORKSPACE_VANTARI, deal_id: dealId,
        processo_id: deal?.processo_id || null, person_id: deal?.person_id || null,
        done: false, ...payload,
      });
    }
    setSaving(false);
    if (res.error) { setError(res.error.message); return; }
    onSaved();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: T.surface, borderRadius: 16, width: 480, maxWidth: "94vw", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.18)" }}>
        <div style={{ padding: "18px 22px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: T.head, fontWeight: 700, fontSize: 15, color: T.ink }}>{isEdit ? "Editar atividade" : "Nova atividade"}</span>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: T.muted }}><X size={18} /></button>
        </div>
        <div style={{ padding: "18px 22px", maxHeight: "70vh", overflowY: "auto" }}>
          {!isEdit && (
            <div style={{ marginBottom: 12, position: "relative" }}>
              <label style={labelSt}>Negócio</label>
              {selectedDeal ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 8, background: T.bg }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{selectedDeal.label}</span>
                  <button onClick={() => setDealId("")} style={{ border: "none", background: "none", color: T.muted, cursor: "pointer" }}><X size={14} /></button>
                </div>
              ) : (
                <>
                  <input value={dealSearch} onChange={(e) => setDealSearch(e.target.value)} style={inputSt} placeholder="Buscar por nome do titular..." />
                  {dealSearch && (
                    <div style={{ position: "absolute", zIndex: 5, top: "100%", left: 0, right: 0, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, marginTop: 4, maxHeight: 180, overflowY: "auto", boxShadow: "0 8px 24px -8px rgba(0,0,0,.2)" }}>
                      {filteredDeals.length === 0 ? (
                        <div style={{ padding: 10, fontSize: 12.5, color: T.muted }}>Nenhum negócio encontrado.</div>
                      ) : filteredDeals.map((d) => (
                        <div key={d.id} onClick={() => { setDealId(d.id); setDealSearch(""); }}
                          style={{ padding: "8px 10px", fontSize: 13, cursor: "pointer", borderBottom: `1px solid ${T.bg}` }}
                          onMouseEnter={(e) => e.currentTarget.style.background = T.bg}
                          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                          {d.label}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ marginBottom: 12 }}>
              <label style={labelSt}>Tipo</label>
              <select value={type} onChange={(e) => setType(e.target.value)} style={inputSt}>
                {ACT_TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelSt}>Atribuído a</label>
              <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} style={inputSt}>
                <option value="">— ninguém —</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelSt}>Assunto / Descrição</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} style={{ ...inputSt, resize: "vertical", fontFamily: T.font }} placeholder="Descreva a atividade..." />
          </div>
          <div style={{ marginBottom: 4 }}>
            <label style={labelSt}>Data de vencimento (opcional)</label>
            <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} style={inputSt} />
          </div>
          {error && <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, color: "#9B2C2C", fontSize: 12.5 }}><AlertCircle size={15} color={T.coral} /> {error}</div>}
        </div>
        <div style={{ padding: "14px 22px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} disabled={saving} style={{ padding: "8px 16px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 9, color: T.text, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: T.font }}>Cancelar</button>
          <button onClick={save} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 18px", background: T.gradient, border: "none", borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1, fontFamily: T.font }}>
            {saving && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />} {isEdit ? "Salvar" : "Criar atividade"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Atividades() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acts, setActs] = useState([]);
  const [dealMap, setDealMap] = useState({});
  const [dealOptions, setDealOptions] = useState([]);
  const [users, setUsers] = useState([]);
  const [typeFilter, setTypeFilter] = useState("all");
  const [tab, setTab] = useState("todas");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [collapsed, setCollapsed] = useSidebarCollapsed();

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const crm = supabase.schema("crm");
      const { data: ac, error: e1 } = await crm.from("activities").select("*")
        .eq("workspace_id", WORKSPACE_VANTARI)
        .order("due_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(500);
      if (e1) throw e1;
      setActs(ac || []);

      const dealIds = [...new Set((ac || []).map((a) => a.deal_id).filter(Boolean))];
      let dMap = {};
      if (dealIds.length) {
        const { data: deals } = await crm.from("deals").select("id,person_id,processo_id,credit_type,modalidade").in("id", dealIds);
        const personIds = [...new Set((deals || []).map((d) => d.person_id).filter(Boolean))];
        const processoIds = [...new Set((deals || []).map((d) => d.processo_id).filter(Boolean))];
        const [{ data: persons }, { data: processos }] = await Promise.all([
          personIds.length ? supabase.schema("core").from("persons").select("id,full_name,primary_email,primary_phone").in("id", personIds) : Promise.resolve({ data: [] }),
          processoIds.length ? crm.from("processos").select("id,reclamada_company_id").in("id", processoIds) : Promise.resolve({ data: [] }),
        ]);
        const personById = {}; (persons || []).forEach((p) => personById[p.id] = p);
        const processoById = {}; (processos || []).forEach((p) => processoById[p.id] = p);
        const companyIds = [...new Set((processos || []).map((p) => p.reclamada_company_id).filter(Boolean))];
        let companyById = {};
        if (companyIds.length) {
          const { data: companies } = await supabase.schema("core").from("companies").select("id,name").in("id", companyIds);
          (companies || []).forEach((c) => companyById[c.id] = c);
        }
        (deals || []).forEach((d) => {
          const person = personById[d.person_id];
          const processo = processoById[d.processo_id];
          const company = processo ? companyById[processo.reclamada_company_id] : null;
          dMap[d.id] = {
            id: d.id,
            personName: person?.full_name || person?.primary_email || "Titular pendente",
            personEmail: person?.primary_email || null,
            personPhone: person?.primary_phone || null,
            companyName: company?.name || null,
            processo_id: d.processo_id,
            person_id: d.person_id,
          };
        });
        setDealMap(dMap);
      } else setDealMap({});

      // opções de negócio para o combobox do modal (negócios em aberto)
      const { data: openDeals } = await crm.from("deals").select("id,person_id,processo_id,status").eq("workspace_id", WORKSPACE_VANTARI).eq("status", "open").limit(300);
      const openPersonIds = [...new Set((openDeals || []).map((d) => d.person_id).filter(Boolean))];
      let openPersonById = {};
      if (openPersonIds.length) {
        const { data: pl } = await supabase.schema("core").from("persons").select("id,full_name,primary_email").in("id", openPersonIds);
        (pl || []).forEach((p) => openPersonById[p.id] = p);
      }
      setDealOptions((openDeals || []).map((d) => ({
        id: d.id, processo_id: d.processo_id, person_id: d.person_id,
        label: openPersonById[d.person_id]?.full_name || openPersonById[d.person_id]?.primary_email || "Titular pendente",
      })));

      const { data: dir } = await supabase.from("v_user_directory").select("id,name,email");
      setUsers(dir || []);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    return acts.filter((a) => {
      if (typeFilter !== "all" && a.type !== typeFilter) return false;
      return matchesTab(a, tab);
    });
  }, [acts, typeFilter, tab]);

  const counts = useMemo(() => {
    const c = {};
    TABS.forEach((t) => c[t.v] = 0);
    acts.forEach((a) => {
      if (typeFilter !== "all" && a.type !== typeFilter) return;
      TABS.forEach((t) => { if (matchesTab(a, t.v)) c[t.v]++; });
    });
    return c;
  }, [acts, typeFilter]);

  const toggleDone = async (a) => {
    const { error: e } = await supabase.schema("crm").from("activities").update({ done: !a.done }).eq("id", a.id);
    if (e) { setError(e.message); return; }
    load();
  };
  const remove = async (a) => {
    if (!confirm("Excluir esta atividade?")) return;
    const { error: e } = await supabase.schema("crm").from("activities").delete().eq("id", a.id);
    if (e) { setError(e.message); return; }
    load();
  };

  const th = { textAlign: "left", fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.04em", padding: "10px 14px", fontFamily: T.font, borderBottom: `1px solid ${T.border}` };
  const td = { padding: "11px 14px", fontSize: 13, color: T.text, fontFamily: T.font, borderBottom: `1px solid ${T.bg}` };

  const ownerName = (id) => users.find((u) => u.id === id)?.name || users.find((u) => u.id === id)?.email || "—";

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div style={{ marginLeft: collapsed ? 64 : 240, transition: "margin-left 0.15s", padding: "28px 32px", minHeight: "100vh" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: T.ink, fontFamily: T.head, letterSpacing: "-0.03em", margin: 0 }}>Atividades</h1>
            <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>Histórico e agenda de todos os negócios · {acts.length}{acts.length === 500 ? "+" : ""}</div>
          </div>
          <button onClick={() => { setEditing(null); setShowModal(true); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: T.gradient, border: "none", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: T.font }}>
            <Plus size={15} /> Nova Atividade
          </button>
        </div>

        {/* filtro por tipo */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {[{ v: "all", l: "Tudo" }, ...ACT_TYPES].map((t) => (
            <button key={t.v} onClick={() => setTypeFilter(t.v)}
              style={{
                padding: "6px 12px", borderRadius: 20, border: `1px solid ${typeFilter === t.v ? T.teal : T.border}`,
                background: typeFilter === t.v ? T.teal : T.surface, color: typeFilter === t.v ? "#fff" : T.text,
                fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: T.font,
              }}>
              {t.l}
            </button>
          ))}
        </div>

        {/* abas temporais */}
        <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${T.border}`, marginBottom: 16, flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <button key={t.v} onClick={() => setTab(t.v)}
              style={{
                padding: "8px 14px", border: "none", borderBottom: tab === t.v ? `2px solid ${T.teal}` : "2px solid transparent",
                background: "none", color: tab === t.v ? T.teal : T.muted, fontSize: 13, fontWeight: tab === t.v ? 700 : 600,
                cursor: "pointer", fontFamily: T.font, display: "flex", alignItems: "center", gap: 6,
              }}>
              {t.l} <span style={{ fontSize: 11, color: T.faint3 }}>({counts[t.v] || 0})</span>
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
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Carregando atividades...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", color: T.muted, padding: "70px 0", fontSize: 14 }}>
              <Activity size={28} color={T.faint3} style={{ marginBottom: 8 }} />
              <div>Nenhuma atividade nesta visão.</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Atividades aparecem aqui quando registradas no detalhe de um Negócio ou criadas por aqui.</div>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                <th style={{ ...th, width: 34 }}></th>
                <th style={th}>Assunto</th><th style={th}>Negócio</th><th style={th}>Contato</th>
                <th style={th}>Organização</th><th style={th}>Vencimento</th><th style={th}>Atribuído a</th>
                <th style={{ ...th, textAlign: "right" }}>Ações</th>
              </tr></thead>
              <tbody>
                {filtered.map((a) => {
                  const meta = actMeta(a.type);
                  const Icon = meta.icon;
                  const deal = dealMap[a.deal_id];
                  const overdue = bucketOf(a.due_at, a.done) === "vencido";
                  return (
                    <tr key={a.id}
                      onMouseEnter={(e) => e.currentTarget.style.background = T.bg}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                      <td style={{ ...td, textAlign: "center" }}>
                        <button onClick={() => toggleDone(a)} title={a.done ? "Reabrir" : "Concluir"} style={{ border: "none", background: "none", cursor: "pointer", color: a.done ? T.green : T.faint3, display: "flex" }}>
                          {a.done ? <CheckCircle2 size={17} /> : <Circle size={17} />}
                        </button>
                      </td>
                      <td style={{ ...td, maxWidth: 260 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <Icon size={14} color={meta.color} style={{ flexShrink: 0 }} />
                          <span style={{ textDecoration: a.done ? "line-through" : "none", color: a.done ? T.muted : T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.content || "—"}</span>
                        </div>
                      </td>
                      <td style={{ ...td, fontWeight: 600, color: T.ink, cursor: deal ? "pointer" : "default" }} onClick={() => deal && navigate(`/crm/${a.deal_id}`)}>
                        {deal?.personName || "—"}
                      </td>
                      <td style={{ ...td, color: T.muted, fontSize: 12.5 }}>{deal?.personEmail || deal?.personPhone || "—"}</td>
                      <td style={td}>{deal?.companyName || "—"}</td>
                      <td style={{ ...td, fontFamily: T.mono, color: overdue ? T.coral : T.text, fontWeight: overdue ? 700 : 400 }}>{fmtDateTime(a.due_at)}</td>
                      <td style={td}>{ownerName(a.owner_id)}</td>
                      <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                        <button onClick={() => { setEditing(a); setShowModal(true); }} title="Editar"
                          style={{ background: "none", border: "none", cursor: "pointer", color: T.teal, padding: 4, marginRight: 4 }}>
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => remove(a)} title="Excluir"
                          style={{ background: "none", border: "none", cursor: "pointer", color: T.coral, padding: 4 }}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <AtividadeModal activity={editing} deals={dealOptions} users={users} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />
      )}
    </div>
  );
}
