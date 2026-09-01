import { useState, useEffect, useCallback } from "react";
import { useSidebarCollapsed } from "./sidebar-collapsed";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "./supabase";
import {
  BarChart2, Users, Mail, Star, LayoutTemplate, Bot, Plug, Settings, Briefcase,
  ArrowLeft, Loader2, AlertCircle, Scale, Building2, User, Trophy, XCircle,
  CheckCircle2, Phone, StickyNote, CalendarClock, Send, Clock, Pencil, Check, X,
  Zap, Filter, ChevronLeft, ChevronRight, LogOut, Trash2, MessageCircle, ExternalLink,
} from "lucide-react";

import { IdCard } from "lucide-react";
import { Activity, ListChecks } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import { Inbox } from "lucide-react";
import { FileBarChart } from "lucide-react";
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
const LOST_REASONS = [
  { v: "valor_abaixo_regua",          l: "Valor abaixo da régua de compra" },
  { v: "valor_acima_regua",           l: "Valor acima da régua de compra" },
  { v: "acordo_formalizado",          l: "Acordo formalizado no processo" },
  { v: "fase_avancada_execucao",      l: "Fase avançada de execução" },
  { v: "reclamada_pf_mei",            l: "Reclamada Pessoa Física / MEI" },
  { v: "reclamada_me_epp",            l: "Reclamada ME / EPP" },
  { v: "recuperacao_judicial_falencia", l: "Recuperação Judicial / Falência" },
  { v: "risco_solvencia",             l: "Risco de solvência da reclamada" },
  { v: "cnpj_baixado",                l: "CNPJ baixado / empresa inativa" },
  { v: "processo_plurimo",            l: "Processo plúrimo" },
  { v: "verbas_nao_passiveis",        l: "Verbas não passíveis de compra" },
  { v: "concentracao_risco_verba",    l: "Concentração de risco em verba relevante" },
  { v: "risco_juridico_elevado",      l: "Risco jurídico elevado" },
  { v: "incerteza_liquidacao",        l: "Incerteza na liquidação / cálculo do crédito" },
  { v: "processo_suspenso",           l: "Processo suspenso / sobrestado" },
  { v: "advogado_nao_aceita_termos",  l: "Advogado não aceita os termos contratuais" },
  { v: "documentacao_impeditiva",     l: "Documentação ou condição impeditiva" },
  { v: "fora_politica_interna",       l: "Fora da política interna de aquisição" },
  { v: "cliente_desistiu",            l: "Cliente desistiu da antecipação" },
  { v: "cliente_fechou_concorrente",  l: "Cliente fechou com concorrente" },
  { v: "sem_retorno",                 l: "Sem retorno do cliente" },
  // sinais de "Quando NÃO avançar" do Playbook de captação ativa — risco de
  // anulação judicial (estado de perigo/lesão, arts. 156/157 CC) ou de
  // reclamação, não motivo comercial.
  { v: "idoso_sem_terceiro_confianca",        l: "Idoso(a)/dificuldade de compreensão, sem terceiro de confiança", g: "risco" },
  { v: "necessidade_urgente_saude_despejo_divida", l: "Precisa do dinheiro p/ saúde, despejo ou dívida em cobrança", g: "risco" },
  { v: "nao_compreende_a_operacao",           l: "Não conseguiu explicar a operação com as próprias palavras", g: "risco" },
  { v: "recusa_advogado",                     l: "Recusa a participação do advogado", g: "risco" },
  { v: "aceita_qualquer_valor",               l: "Diz que aceita qualquer valor", g: "risco" },
  { v: "acredita_valor_integral_avista",      l: "Acredita que vai receber o valor integral à vista", g: "risco" },
  { v: "sem_numero_processo",                 l: "Não tem/não consegue o número do processo", g: "risco" },
  { v: "outro",                       l: "Outro" },
];
const LOST_REASONS_COMERCIAL = LOST_REASONS.filter((r) => r.g !== "risco");
const LOST_REASONS_RISCO = LOST_REASONS.filter((r) => r.g === "risco");

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
const toDatetimeLocal = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromDatetimeLocal = (v) => v ? new Date(v).toISOString() : null;
const hoursBetween = (a, b) => (a && b) ? (new Date(b) - new Date(a)) / 36e5 : null;

const CHECKLIST_ITEMS = [
  { k: "proposta_enviada_em", l: "Proposta enviada por escrito", type: "datetime" },
  { k: "assinatura_em", l: "Data da assinatura", type: "datetime" },
  { k: "advogado_contatado", l: "Advogado do processo contatado e ciente", type: "bool" },
  { k: "honorarios_tratados", l: "Honorários contratuais tratados na operação", type: "bool" },
  { k: "termo_ciencia_gravado", l: "Termo de ciência assinado, com gravação em vídeo", type: "bool" },
  { k: "cliente_explicou_proprias_palavras", l: "Cliente explicou com as próprias palavras (na gravação)", type: "bool" },
  { k: "contrato_entregue_copia", l: "Contrato entregue em cópia ao cliente", type: "bool" },
  { k: "registro_conversa_completo", l: "Registro completo da conversa no CRM", type: "bool" },
];
const checklistDoneCount = (cl) => CHECKLIST_ITEMS.filter((i) => !!(cl || {})[i.k]).length;

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
        <NavItem icon={Users} label="Leads" path="/leads" collapsed={collapsed} />
        <NavItem icon={Inbox} label="Atendimento" path="/inbox" collapsed={collapsed} />
        <NavSection label="CRM" collapsed={collapsed} />
        <NavItem icon={Briefcase} label="Negócios" path="/crm" active collapsed={collapsed} />
        <NavItem icon={Building2} label="Empresas" path="/empresas" collapsed={collapsed} />
        <NavItem icon={Activity} label="Atividades" path="/activities" collapsed={collapsed} />
        <NavItem icon={ListChecks} label="Tarefas" path="/tasks" collapsed={collapsed} />
        <NavItem icon={AlertTriangle} label="Em Risco" path="/risco" collapsed={collapsed} />
        <NavItem icon={FileBarChart} label="Relatórios" path="/reports" collapsed={collapsed} />
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
  const [pipelines, setPipelines] = useState([]);
  const [acts, setActs] = useState([]);
  const [actType, setActType] = useState("note");
  const [actContent, setActContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [busy, setBusy] = useState(false);

  const [editing, setEditing] = useState(null); // 'deal' | 'processo' | 'person' | 'company' | 'advogado' | 'checklist'
  const [form, setForm] = useState({});
  const [advogado, setAdvogado] = useState(null); // crm.processo_advogados + core.persons (advogado do reclamante)
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const setF = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const crm = supabase.schema("crm");
      const { data: d, error: e1 } = await crm.from("deals").select("*").eq("id", dealId).single();
      if (e1) throw e1;
      setDeal(d);
      const [{ data: st }, { data: ac }, { data: pls }] = await Promise.all([
        crm.from("stages").select("id,name,position,kind").eq("pipeline_id", d.pipeline_id).order("position"),
        crm.from("activities").select("*").eq("deal_id", dealId).order("created_at", { ascending: false }),
        crm.from("pipelines").select("id,name").eq("workspace_id", WORKSPACE_VANTARI).order("is_default", { ascending: false }),
      ]);
      setStages(st || []); setActs(ac || []); setPipelines(pls || []);
      if (d.processo_id) {
        const { data: p } = await crm.from("processos").select("*").eq("id", d.processo_id).single();
        setProcesso(p || null);
        if (p?.reclamada_company_id) {
          const { data: co } = await supabase.schema("core").from("companies").select("*").eq("id", p.reclamada_company_id).single();
          setCompany(co || null);
        } else setCompany(null);
        const { data: pa } = await crm.from("processo_advogados").select("*")
          .eq("processo_id", p.id).eq("papel", "reclamante").order("created_at").limit(1).maybeSingle();
        if (pa) {
          const { data: adPerson } = await supabase.schema("core").from("persons").select("*").eq("id", pa.person_id).single();
          setAdvogado({ ...pa, person: adPerson || null });
        } else setAdvogado(null);
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

  const [conv, setConv] = useState(null);
  const [convMessages, setConvMessages] = useState([]);
  const [convLoading, setConvLoading] = useState(true);

  useEffect(() => {
    if (!deal?.person_id) return;
    let alive = true;
    (async () => {
      setConvLoading(true);
      const core = supabase.schema("core");
      const { data: convs } = await core.from("conversations")
        .select("id, status, last_message_at")
        .eq("person_id", deal.person_id)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(1);
      const c = convs?.[0] || null;
      if (!alive) return;
      setConv(c);
      if (c) {
        const { data: msgs } = await core.from("messages")
          .select("id, direction, sender, body, created_at")
          .eq("conversation_id", c.id)
          .order("created_at", { ascending: false })
          .limit(10);
        if (alive) setConvMessages((msgs || []).reverse());
      }
      if (alive) setConvLoading(false);
    })();
    return () => { alive = false; };
  }, [deal?.person_id]);

  const stageById = (id) => stages.find((s) => s.id === id);
  const curStage = deal ? stageById(deal.stage_id) : null;
  const [lostModalStage, setLostModalStage] = useState(null); // stage_id pendente aguardando motivo

  const moveStage = async (stageId, extra) => {
    if (!deal || stageId === deal.stage_id) return;
    const target = stageById(stageId);
    // mover pra uma etapa "Perdido" exige motivo — abre modal em vez de gravar direto
    if (target?.kind === "lost" && !extra) { setLostModalStage(stageId); return; }
    setBusy(true);
    const { error: e } = await supabase.schema("crm").from("deals").update({ stage_id: stageId, ...(extra || {}) }).eq("id", deal.id);
    setBusy(false);
    if (e) { setError(e.message); return; }
    setLostModalStage(null);
    load();
  };
  const movePipeline = async (newPipelineId) => {
    if (!deal || newPipelineId === deal.pipeline_id) return;
    setBusy(true);
    // RPC única e atômica: valida que a pipeline é do workspace certo, escolhe
    // a 1ª etapa (por position) do destino e já grava pipeline_id+stage_id
    // juntos — evita a corrida de duas queries separadas (buscar etapa, depois
    // gravar) que o front fazia antes.
    const { error: e } = await supabase.schema("crm").rpc("transfer_deal_pipeline", {
      p_deal_id: deal.id, p_target_pipeline_id: newPipelineId, p_target_stage_id: null,
    });
    setBusy(false);
    if (e) { setError(e.message); return; }
    load();
  };
  const setOutcome = async (kind) => {
    const t = stages.find((s) => s.kind === kind);
    if (!t) return;
    if (kind === "won") {
      const done = checklistDoneCount(deal.checklist_formalizacao);
      if (done < CHECKLIST_ITEMS.length) {
        const missing = CHECKLIST_ITEMS.filter((i) => !(deal.checklist_formalizacao || {})[i.k]).map((i) => `- ${i.l}`).join("\n");
        const ok = window.confirm(`Checklist de formalização incompleto (${done}/${CHECKLIST_ITEMS.length}).\n\nFaltam:\n${missing}\n\nMarcar como Ganho mesmo assim?`);
        if (!ok) return;
      }
    }
    moveStage(t.id);
  };
  const confirmLostReason = async (reason, detail) => {
    await moveStage(lostModalStage, { lost_reason: reason, lost_reason_detail: detail || null });
  };

  const handleDeleteDeal = async () => {
    setError(null);
    const ok = confirm(
      `Excluir este negócio definitivamente?\n\nIsso apaga o negócio${person?.full_name ? ` de "${person.full_name}"` : ""}, junto com as atividades registradas nele. O lead/pessoa e o processo continuam existindo. Não tem como desfazer.`
    );
    if (!ok) return;
    setDeleting(true);
    const { error: e } = await supabase.schema("crm").rpc("delete_deal", { p_deal: deal.id });
    setDeleting(false);
    if (e) { setError(e.message); return; }
    navigate("/crm");
  };

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
      execucao_suspensa: !!processo.execucao_suspensa, saida_vs_pedido_rj: processo.saida_vs_pedido_rj || "desconhecido",
      preocupacao_principal: processo.preocupacao_principal || "", tem_proposta_concorrente: !!processo.tem_proposta_concorrente,
    });
    if (card === "person") setForm({
      full_name: person.full_name || "", cpf: onlyDigits(person.cpf), primary_phone: onlyDigits(person.primary_phone), primary_email: person.primary_email || "",
    });
    if (card === "company") setForm({ name: company?.name || "", cnpj: onlyDigits(company?.cnpj) });
    if (card === "advogado") setForm({
      full_name: advogado?.person?.full_name || "", primary_phone: onlyDigits(advogado?.person?.primary_phone || ""),
      primary_email: advogado?.person?.primary_email || "", oab: advogado?.oab || "",
      percentual_honorarios: advogado?.percentual_honorarios != null ? String(advogado.percentual_honorarios) : "",
      contato_confirmado: !!advogado?.contato_confirmado,
    });
    if (card === "checklist") {
      const cl = deal.checklist_formalizacao || {};
      setForm({
        proposta_enviada_em: toDatetimeLocal(cl.proposta_enviada_em), assinatura_em: toDatetimeLocal(cl.assinatura_em),
        advogado_contatado: !!cl.advogado_contatado, honorarios_tratados: !!cl.honorarios_tratados,
        termo_ciencia_gravado: !!cl.termo_ciencia_gravado, cliente_explicou_proprias_palavras: !!cl.cliente_explicou_proprias_palavras,
        contrato_entregue_copia: !!cl.contrato_entregue_copia, registro_conversa_completo: !!cl.registro_conversa_completo,
      });
    }
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
      execucao_suspensa: form.execucao_suspensa, saida_vs_pedido_rj: form.saida_vs_pedido_rj || null,
      preocupacao_principal: form.preocupacao_principal || null, tem_proposta_concorrente: form.tem_proposta_concorrente,
    }).eq("id", processo.id);
    setSaving(false);
    if (e) { setError(e.message); return; }
    cancelEdit(); load();
  };
  const saveAdvogado = async () => {
    setSaving(true); setError(null);
    try {
      const { data: personId, error: ep } = await supabase.schema("core").rpc("resolve_person", {
        p_workspace: WORKSPACE_VANTARI, p_cpf: null, p_phone: form.primary_phone || null,
        p_email: form.primary_email || null, p_name: form.full_name || null, p_source: "crm",
      });
      if (ep) throw ep;
      const { error: ea } = await supabase.schema("crm").from("processo_advogados").upsert({
        workspace_id: WORKSPACE_VANTARI, processo_id: processo.id, person_id: personId,
        papel: "reclamante", oab: form.oab || null,
        percentual_honorarios: form.percentual_honorarios === "" ? null : parseFloat(String(form.percentual_honorarios).replace(",", ".")),
        contato_confirmado: form.contato_confirmado,
      }, { onConflict: "processo_id,person_id" });
      if (ea) throw ea;
      cancelEdit(); load();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  };
  const saveChecklist = async () => {
    setSaving(true); setError(null);
    const { error: e } = await supabase.schema("crm").from("deals").update({
      checklist_formalizacao: {
        proposta_enviada_em: fromDatetimeLocal(form.proposta_enviada_em), assinatura_em: fromDatetimeLocal(form.assinatura_em),
        advogado_contatado: form.advogado_contatado, honorarios_tratados: form.honorarios_tratados,
        termo_ciencia_gravado: form.termo_ciencia_gravado, cliente_explicou_proprias_palavras: form.cliente_explicou_proprias_palavras,
        contrato_entregue_copia: form.contrato_entregue_copia, registro_conversa_completo: form.registro_conversa_completo,
      },
    }).eq("id", deal.id);
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
  const eb = processo ? { ok: processo.elegivel, manual: processo.status === "em_analise" && processo.reclamada_em_rj } : null;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div style={{ marginLeft: collapsed ? 64 : 240, transition: "margin-left 0.15s", padding: "24px 32px", minHeight: "100vh" }}>
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
                {pipelines.length > 1 && (
                  <select value={deal.pipeline_id} disabled={busy} onChange={(e) => movePipeline(e.target.value)}
                    title="Mover negócio para outro pipeline (entra no 1º estágio de lá)"
                    style={{ padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 9, fontSize: 13, fontWeight: 600, color: T.ink, background: T.surface, fontFamily: T.font, cursor: "pointer" }}>
                    {pipelines.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                )}
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
                <button onClick={handleDeleteDeal} disabled={deleting} title="Excluir negócio definitivamente"
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 9, cursor: deleting ? "default" : "pointer", opacity: deleting ? 0.6 : 1, fontSize: 12.5, fontWeight: 700, color: T.coral, fontFamily: T.font }}>
                  {deleting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={14} />} Excluir
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

              {/* Conversa com a Nina */}
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, color: T.ink, fontFamily: T.head, fontWeight: 700, fontSize: 13 }}>
                    <MessageCircle size={15} color={T.teal} /> Conversa com a Nina
                  </div>
                  {conv && (
                    <button onClick={() => navigate("/inbox", { state: { selectConvId: conv.id } })}
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", background: "none", border: `1px solid ${T.border}`, borderRadius: 7, cursor: "pointer", fontSize: 11.5, fontWeight: 600, color: T.teal, fontFamily: T.font }}>
                      <ExternalLink size={11} /> Abrir no Atendimento
                    </button>
                  )}
                </div>
                {convLoading && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.muted, fontSize: 13 }}>
                    <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Carregando...
                  </div>
                )}
                {!convLoading && !conv && (
                  <div style={{ color: T.muted, fontSize: 13 }}>Nenhuma conversa registrada com este cliente ainda.</div>
                )}
                {!convLoading && conv && convMessages.length === 0 && (
                  <div style={{ color: T.muted, fontSize: 13 }}>Conversa encontrada, mas sem mensagens registradas.</div>
                )}
                {!convLoading && conv && convMessages.length > 0 && (
                  <div style={{ background: T.bg, borderRadius: 10, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6, maxHeight: 240, overflowY: "auto" }}>
                    {convMessages.map((m) => {
                      const isNina = m.sender === "nina";
                      const isHuman = m.sender === "human";
                      const isOut = m.direction === "out";
                      return (
                        <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: isOut ? "flex-end" : "flex-start" }}>
                          <div style={{ maxWidth: "82%", padding: "7px 10px", borderRadius: isOut ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                            background: isNina ? T.teal : isHuman ? T.violet : T.surface,
                            color: isOut ? "#fff" : T.text, fontSize: 12.5, lineHeight: 1.45, fontFamily: T.font,
                            border: isOut ? "none" : `1px solid ${T.border}` }}>
                            {m.body || "—"}
                          </div>
                          <div style={{ fontSize: 10, color: T.faint3, marginTop: 2, fontFamily: T.mono }}>
                            {isNina ? "Nina" : isHuman ? "Humano" : "Cliente"} · {new Date(m.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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
                          {echeck("Em recuperação judicial", "reclamada_em_rj")}
                          {echeck("Paga por precatório", "reclamada_paga_precatorio")}
                          {echeck("Solvente", "reclamada_solvente")}
                        </div>
                        {efield("Teses restritivas (vírgula)", "teses", { full: true })}
                        <div style={{ fontSize: 11, color: T.faint3, marginTop: 2 }}>A elegibilidade recalcula ao salvar. Reclamada em RJ não reprova mais sozinha — entra em revisão manual.</div>
                        <div style={{ marginTop: 10, fontWeight: 700, fontSize: 12, color: T.ink, fontFamily: T.head }}>Diagnóstico (Playbook de captação ativa)</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 6 }}>
                          {eselect("Saída x pedido de RJ", "saida_vs_pedido_rj", [
                            { v: "desconhecido", l: "Não sei / não se aplica" }, { v: "antes", l: "Antes (concursal)" }, { v: "depois", l: "Depois (extraconcursal)" },
                          ])}
                          {eselect("O que mais preocupa", "preocupacao_principal", [
                            { v: "", l: "— não perguntado —" }, { v: "valor", l: "Valor" }, { v: "prazo", l: "Prazo" }, { v: "outro", l: "Outro" },
                          ])}
                        </div>
                        <div style={{ marginTop: 4 }}>
                          {echeck("Execução suspensa (comunicada ao cliente)", "execucao_suspensa")}
                          {echeck("Já recebeu proposta de outra empresa", "tem_proposta_concorrente")}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 99, marginBottom: 10,
                          background: eb.manual ? "#FFFBEB" : eb.ok ? "#F0FDF7" : "#FFF1F0",
                          border: `1px solid ${eb.manual ? T.amber : eb.ok ? "#6EE7B7" : T.coral}`,
                          color: eb.manual ? "#92650B" : eb.ok ? T.green : T.coral, fontSize: 12, fontWeight: 700 }}>
                          {eb.manual ? <AlertTriangle size={13} /> : eb.ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                          {" "}{eb.manual ? "Em análise — revisão manual (RJ)" : eb.ok ? "Elegível" : "Inelegível"}
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
                        <Row label="Saída x pedido de RJ" value={{ antes: "Antes (concursal)", depois: "Depois (extraconcursal)", desconhecido: "Não sei / não se aplica" }[processo.saida_vs_pedido_rj] || "—"} />
                        <Row label="O que mais preocupa" value={{ valor: "Valor", prazo: "Prazo", outro: "Outro" }[processo.preocupacao_principal] || "—"} />
                        <Row label="Execução suspensa" value={processo.execucao_suspensa ? "Sim" : "Não"} />
                        <Row label="Proposta concorrente" value={processo.tem_proposta_concorrente ? "Sim" : "Não"} />
                      </>
                    )}
                </EditCard>

                <EditCard title="Advogado do processo" icon={Scale} canEdit={!!processo} editing={editing === "advogado"} saving={saving}
                  onEdit={() => startEdit("advogado")} onCancel={cancelEdit} onSave={saveAdvogado}>
                  {!processo ? <div style={{ color: T.muted, fontSize: 13 }}>Sem processo vinculado.</div>
                    : editing === "advogado" ? (
                      <div>
                        {efield("Nome", "full_name", { full: true })}
                        {efield("Telefone", "primary_phone", { mask: maskPhone })}
                        {efield("E-mail", "primary_email", { type: "email" })}
                        {efield("OAB", "oab")}
                        {efield("% Honorários combinados", "percentual_honorarios")}
                        <div style={{ marginTop: 4 }}>{echeck("Contato confirmado", "contato_confirmado")}</div>
                      </div>
                    ) : !advogado ? (
                      <div style={{ color: T.muted, fontSize: 13 }}>Nenhum advogado registrado ainda — dado do diagnóstico (playbook, seção 2).</div>
                    ) : (
                      <>
                        <Row label="Nome" value={advogado.person?.full_name} />
                        <Row label="Telefone" value={advogado.person?.primary_phone ? maskPhone(advogado.person.primary_phone) : "—"} />
                        <Row label="E-mail" value={advogado.person?.primary_email} />
                        <Row label="OAB" value={advogado.oab} />
                        <Row label="% Honorários" value={advogado.percentual_honorarios != null ? `${Number(advogado.percentual_honorarios).toFixed(1)}%` : "—"} />
                        <Row label="Contato confirmado" value={advogado.contato_confirmado ? "Sim" : "Não"} />
                      </>
                    )}
                </EditCard>

                <EditCard title={`Checklist de formalização (${checklistDoneCount(deal.checklist_formalizacao)}/${CHECKLIST_ITEMS.length})`} icon={ListChecks}
                  editing={editing === "checklist"} saving={saving} onEdit={() => startEdit("checklist")} onCancel={cancelEdit} onSave={saveChecklist}>
                  {editing === "checklist" ? (
                    <div>
                      {efield("Proposta enviada em", "proposta_enviada_em", { type: "datetime-local" })}
                      {efield("Assinatura em", "assinatura_em", { type: "datetime-local" })}
                      {form.proposta_enviada_em && form.assinatura_em && (
                        <div style={{ fontSize: 11, color: hoursBetween(fromDatetimeLocal(form.proposta_enviada_em), fromDatetimeLocal(form.assinatura_em)) < 48 ? T.coral : T.faint3, marginBottom: 8 }}>
                          {Math.round(hoursBetween(fromDatetimeLocal(form.proposta_enviada_em), fromDatetimeLocal(form.assinatura_em)))}h entre proposta e assinatura
                          {hoursBetween(fromDatetimeLocal(form.proposta_enviada_em), fromDatetimeLocal(form.assinatura_em)) < 48 ? " — abaixo de 48h, alerta do playbook" : ""}
                        </div>
                      )}
                      {CHECKLIST_ITEMS.filter((i) => i.type === "bool").map((i) => (
                        <div key={i.k} style={{ marginTop: 2 }}>{echeck(i.l, i.k)}</div>
                      ))}
                    </div>
                  ) : (
                    <>
                      {CHECKLIST_ITEMS.map((i) => (
                        <Row key={i.k} label={i.l}
                          value={i.type === "datetime" ? fmtDateTime((deal.checklist_formalizacao || {})[i.k]) || "—"
                            : (deal.checklist_formalizacao || {})[i.k] ? "Sim" : "Não"} />
                      ))}
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
                      {deal.status === "lost" && (
                        <>
                          <Row label="Motivo do declínio" value={LOST_REASONS.find((r) => r.v === deal.lost_reason)?.l || "—"} />
                          {deal.lost_reason_detail && <Row label="Detalhe" value={deal.lost_reason_detail} />}
                        </>
                      )}
                    </>
                  )}
                </EditCard>
              </div>
            </div>
          </>
        )}

        {lostModalStage && (
          <LostReasonModal
            busy={busy}
            onCancel={() => setLostModalStage(null)}
            onConfirm={confirmLostReason}
          />
        )}
      </div>
    </div>
  );
}

function LostReasonModal({ busy, onCancel, onConfirm }) {
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const needsDetail = reason === "outro";
  const canConfirm = !!reason && (!needsDetail || detail.trim());
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && !busy && onCancel()}>
      <div style={{ background: "#fff", borderRadius: 16, width: "90%", maxWidth: 420, boxShadow: "0 25px 60px rgba(0,0,0,0.18)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${T.border}` }}>
          <h3 style={{ margin: 0, fontFamily: T.head, fontSize: 15.5, fontWeight: 700, color: T.ink }}>Motivo do declínio</h3>
          <button onClick={onCancel} disabled={busy} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted }}><X size={18} /></button>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ fontSize: 12.5, color: T.muted, marginBottom: 12 }}>
            Antes de marcar como Perdido, registre por quê — isso alimenta o relatório mensal de declínios.
          </div>
          <label style={labelSt}>Motivo</label>
          <select value={reason} onChange={(e) => setReason(e.target.value)} style={{ ...inputSt, marginBottom: 12 }}>
            <option value="">— selecionar —</option>
            <optgroup label="Comercial">
              {LOST_REASONS_COMERCIAL.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
            </optgroup>
            <optgroup label="Sinal de risco (não avançar) — Playbook">
              {LOST_REASONS_RISCO.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
            </optgroup>
          </select>
          <label style={labelSt}>Detalhe {needsDetail ? "" : "(opcional)"}</label>
          <textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={3}
            placeholder={needsDetail ? "Descreva o motivo..." : "Contexto adicional (opcional)"}
            style={{ width: "100%", padding: "9px 11px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, color: T.text, outline: "none", fontFamily: T.font, boxSizing: "border-box", resize: "vertical" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 20px", borderTop: `1px solid ${T.border}` }}>
          <button onClick={onCancel} disabled={busy} style={{ padding: "8px 14px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 9, fontSize: 12.5, fontWeight: 600, color: T.text, cursor: "pointer", fontFamily: T.font }}>Cancelar</button>
          <button onClick={() => onConfirm(reason, detail.trim())} disabled={!canConfirm || busy}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: T.coral, border: "none", borderRadius: 9, fontSize: 12.5, fontWeight: 700, color: "#fff", cursor: !canConfirm || busy ? "default" : "pointer", opacity: !canConfirm || busy ? 0.6 : 1, fontFamily: T.font }}>
            {busy ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <XCircle size={14} />} Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
