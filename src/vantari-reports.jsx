import { useState, useEffect, useCallback, useMemo } from "react";
import { useSidebarCollapsed } from "./sidebar-collapsed";
import { useWorkspaceRole } from "./useWorkspaceRole";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabase";
import {
  BarChart2, Users, Mail, Star, LayoutTemplate, Bot, Plug, Settings, Briefcase,
  Loader2, AlertCircle, Building2, Zap, Filter, ChevronLeft, ChevronRight,
  LogOut, Activity, ListChecks, AlertTriangle, Download, TrendingDown, TrendingUp, Minus,
} from "lucide-react";
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

const LOST_REASONS = [
  { v: "reclamada_insolvente", l: "Reclamada insolvente" },
  { v: "reclamada_em_rj", l: "Reclamada em recuperação judicial" },
  { v: "tese_restritiva", l: "Tese jurídica restritiva" },
  { v: "processo_inelegivel", l: "Processo não elegível" },
  { v: "cliente_desistiu", l: "Cliente desistiu" },
  { v: "proposta_recusada", l: "Cliente recusou a proposta" },
  { v: "documentacao_incompleta", l: "Documentação incompleta" },
  { v: "sem_contato", l: "Perda de contato com o cliente" },
  // sinais de "Quando NÃO avançar" do Playbook de captação ativa — mesmos
  // valores gravados pelo seletor de "Perdido" em vantari-crm.jsx/vantari-crm-deal.jsx
  { v: "idoso_sem_terceiro_confianca", l: "Idoso(a)/dificuldade de compreensão, sem terceiro de confiança" },
  { v: "necessidade_urgente_saude_despejo_divida", l: "Precisa do dinheiro p/ saúde, despejo ou dívida em cobrança" },
  { v: "nao_compreende_a_operacao", l: "Não conseguiu explicar a operação com as próprias palavras" },
  { v: "recusa_advogado", l: "Recusa a participação do advogado" },
  { v: "aceita_qualquer_valor", l: "Diz que aceita qualquer valor" },
  { v: "acredita_valor_integral_avista", l: "Acredita que vai receber o valor integral à vista" },
  { v: "sem_numero_processo", l: "Não tem/não consegue o número do processo" },
  { v: "outro", l: "Outro" },
];
const reasonLabel = (v) => v ? (LOST_REASONS.find((r) => r.v === v)?.l || v) : "Sem motivo registrado";

const fmtBRL = (cents) => "R$ " + ((cents || 0) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString("pt-BR") : "—";
const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const monthLabel = (key) => { const [y, m] = key.split("-").map(Number); return `${MONTH_NAMES[m - 1]} ${y}`; };
const monthLabelShort = (key) => { const [y, m] = key.split("-").map(Number); return `${MONTH_NAMES[m - 1].slice(0, 3)}/${String(y).slice(2)}`; };
const inMonth = (iso, key) => !!iso && iso.slice(0, 7) === key;

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
              onMouseEnter={ev => (ev.currentTarget.style.background = T.bg)}
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
        <NavItem icon={AlertTriangle} label="Em Risco" path="/risco" collapsed={collapsed} />
        <NavItem icon={FileBarChart} label="Relatórios" path="/reports" active collapsed={collapsed} />
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

/* ─── KPI card ─── */
function Kpi({ label, value, color, sub }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: color || T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: T.ink, fontFamily: T.head }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: T.faint3, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function Reports() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deals, setDeals] = useState([]); // todos os negócios do workspace
  const [personMap, setPersonMap] = useState({});
  const [month, setMonth] = useState(monthKey(new Date()));
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const role = useWorkspaceRole();

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const crm = supabase.schema("crm");
      const { data: d, error: e1 } = await crm.from("deals")
        .select("id,person_id,created_at,closed_at,status,lost_reason,lost_reason_detail,valor_ofertado_cents,valor_face_cents")
        .eq("workspace_id", WORKSPACE_VANTARI);
      if (e1) throw e1;
      setDeals(d || []);

      const personIds = [...new Set((d || []).map((x) => x.person_id).filter(Boolean))];
      if (personIds.length) {
        const { data: persons } = await supabase.schema("core").from("persons").select("id,full_name,primary_email").in("id", personIds);
        const map = {}; (persons || []).forEach((p) => map[p.id] = p);
        setPersonMap(map);
      } else setPersonMap({});
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // lista de meses disponíveis pro seletor: do mês mais antigo com dado até o atual
  const availableMonths = useMemo(() => {
    const now = new Date();
    const keys = new Set([monthKey(now)]);
    deals.forEach((d) => {
      if (d.created_at) keys.add(d.created_at.slice(0, 7));
      if (d.closed_at) keys.add(d.closed_at.slice(0, 7));
    });
    return [...keys].sort().reverse();
  }, [deals]);

  // agregação por mês (usada tanto pro mês selecionado quanto pro histórico de 12 meses)
  const aggFor = useCallback((key) => {
    const entraram = deals.filter((d) => inMonth(d.created_at, key));
    const declinados = deals.filter((d) => d.status === "lost" && inMonth(d.closed_at, key));
    const ganhos = deals.filter((d) => d.status === "won" && inMonth(d.closed_at, key));
    const fechados = declinados.length + ganhos.length;
    const taxaDeclinio = fechados > 0 ? (declinados.length / fechados) * 100 : null;
    return { key, entraram, declinados, ganhos, taxaDeclinio };
  }, [deals]);

  const current = useMemo(() => aggFor(month), [aggFor, month]);

  const motivos = useMemo(() => {
    const counts = {};
    current.declinados.forEach((d) => {
      const k = d.lost_reason || "_sem_motivo";
      counts[k] = (counts[k] || 0) + 1;
    });
    const total = current.declinados.length;
    return Object.entries(counts)
      .map(([k, count]) => ({ key: k, label: k === "_sem_motivo" ? "Sem motivo registrado" : reasonLabel(k), count, pct: total ? (count / total) * 100 : 0 }))
      .sort((a, b) => b.count - a.count);
  }, [current]);

  // histórico dos últimos 12 meses (incluindo o atual selecionado como referência de "até")
  const historico = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const out = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(y, m - 1 - i, 1);
      out.push(aggFor(monthKey(d)));
    }
    return out;
  }, [month, aggFor]);

  const maxHistCount = Math.max(1, ...historico.map((h) => Math.max(h.entraram.length, h.declinados.length)));

  const personName = (pid) => personMap[pid]?.full_name || personMap[pid]?.primary_email || "Titular pendente";

  const exportCsv = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    const header = ["Mês", "Casos entrados", "Casos declinados", "Casos ganhos", "Taxa de declínio (%)"];
    const rows = historico.map((h) => [
      monthLabel(h.key), h.entraram.length, h.declinados.length, h.ganhos.length,
      h.taxaDeclinio == null ? "" : h.taxaDeclinio.toFixed(1),
    ]);
    rows.push([]);
    rows.push([`Motivos do declínio — ${monthLabel(month)}`]);
    rows.push(["Motivo", "Quantidade", "% dos declínios do mês"]);
    motivos.forEach((m) => rows.push([m.label, m.count, m.pct.toFixed(1)]));
    rows.push([]);
    rows.push([`Negócios declinados — ${monthLabel(month)}`]);
    rows.push(["Titular", "Valor ofertado", "Motivo", "Detalhe", "Data do declínio"]);
    current.declinados.forEach((d) => rows.push([
      personName(d.person_id), fmtBRL(d.valor_ofertado_cents ?? d.valor_face_cents), reasonLabel(d.lost_reason), d.lost_reason_detail || "", fmtDate(d.closed_at),
    ]));
    downloadCsv(`vantari-relatorio-mensal-${month}-${stamp}.csv`, header, rows);
  };

  const th = { textAlign: "left", fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.04em", padding: "10px 14px", fontFamily: T.font, borderBottom: `1px solid ${T.border}` };
  const td = { padding: "11px 14px", fontSize: 13, color: T.text, fontFamily: T.font, borderBottom: `1px solid ${T.bg}` };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div style={{ marginLeft: collapsed ? 64 : 240, transition: "margin-left 0.15s", padding: "28px 32px", minHeight: "100vh" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: T.ink, fontFamily: T.head, letterSpacing: "-0.03em", margin: 0 }}>Relatórios</h1>
            <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>Resumo mensal de casos — entradas, declínios e motivos</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <select value={month} onChange={(e) => setMonth(e.target.value)}
              style={{ padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 9, fontSize: 13, fontWeight: 600, color: T.ink, background: T.surface, fontFamily: T.font, cursor: "pointer" }}>
              {availableMonths.map((k) => <option key={k} value={k}>{monthLabel(k)}</option>)}
            </select>
            <button onClick={exportCsv} disabled={loading} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 9, cursor: loading ? "default" : "pointer", fontSize: 13, fontWeight: 700, color: T.text, fontFamily: T.font, opacity: loading ? 0.6 : 1 }}>
              <Download size={15} /> Exportar CSV
            </button>
          </div>
        </div>

        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#FFF1F0", border: `1px solid ${T.coral}`, color: "#9B2C2C", borderRadius: 12, padding: "14px 16px", fontSize: 13, marginBottom: 16 }}>
            <AlertCircle size={18} color={T.coral} /> <span><strong>Erro:</strong> {error}</span>
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 320, color: T.muted, gap: 10, fontSize: 14 }}>
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Carregando relatório...
          </div>
        ) : (
          <>
            {/* KPIs do mês */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 20 }}>
              <Kpi label="Casos entrados" value={current.entraram.length} color={T.teal} sub={monthLabel(month)} />
              <Kpi label="Casos declinados" value={current.declinados.length} color={T.coral} sub={monthLabel(month)} />
              <Kpi label="Casos ganhos" value={current.ganhos.length} color={T.green} sub={monthLabel(month)} />
              <Kpi label="Taxa de declínio"
                value={current.taxaDeclinio == null ? "—" : `${current.taxaDeclinio.toFixed(0)}%`}
                color={T.amber} sub="dos casos fechados no mês" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 16, marginBottom: 16, alignItems: "start" }}>
              {/* Motivos do declínio */}
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ fontFamily: T.head, fontWeight: 700, fontSize: 14, color: T.ink, marginBottom: 12 }}>Motivos do declínio</div>
                {motivos.length === 0 ? (
                  <div style={{ color: T.muted, fontSize: 13, padding: "16px 0", textAlign: "center" }}>
                    Nenhum negócio declinado em {monthLabel(month)}.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {motivos.map((m) => (
                      <div key={m.key}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                          <span style={{ color: m.key === "_sem_motivo" ? T.faint3 : T.text, fontWeight: 600, fontStyle: m.key === "_sem_motivo" ? "italic" : "normal" }}>{m.label}</span>
                          <span style={{ color: T.muted, fontFamily: T.mono }}>{m.count} · {m.pct.toFixed(0)}%</span>
                        </div>
                        <div style={{ height: 7, background: T.bg, borderRadius: 99, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${m.pct}%`, background: m.key === "_sem_motivo" ? T.faint3 : T.coral, borderRadius: 99 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Histórico 12 meses */}
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ fontFamily: T.head, fontWeight: 700, fontSize: 14, color: T.ink, marginBottom: 12 }}>Últimos 12 meses</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 120 }}>
                  {historico.map((h) => (
                    <div key={h.key} title={`${monthLabel(h.key)}: ${h.entraram.length} entraram, ${h.declinados.length} declinados`}
                      style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, height: "100%", justifyContent: "flex-end", cursor: "pointer" }}
                      onClick={() => setMonth(h.key)}>
                      <div style={{ width: "100%", display: "flex", gap: 2, alignItems: "flex-end", height: "100%" }}>
                        <div style={{ flex: 1, background: h.key === month ? T.teal : "#B9DEE7", borderRadius: "3px 3px 0 0", height: `${(h.entraram.length / maxHistCount) * 100}%`, minHeight: h.entraram.length ? 3 : 0 }} />
                        <div style={{ flex: 1, background: h.key === month ? T.coral : "#FFD2CC", borderRadius: "3px 3px 0 0", height: `${(h.declinados.length / maxHistCount) * 100}%`, minHeight: h.declinados.length ? 3 : 0 }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 5, marginTop: 4 }}>
                  {historico.map((h) => (
                    <div key={h.key} style={{ flex: 1, textAlign: "center", fontSize: 9.5, color: h.key === month ? T.ink : T.faint3, fontWeight: h.key === month ? 700 : 500, fontFamily: T.mono }}>
                      {monthLabelShort(h.key)}
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 14, marginTop: 12, fontSize: 11.5, color: T.muted }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: T.teal }} /> Entraram</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: T.coral }} /> Declinados</span>
                </div>
              </div>
            </div>

            {/* Tabela de declinados do mês */}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.border}`, fontFamily: T.head, fontWeight: 700, fontSize: 14, color: T.ink }}>
                Negócios declinados em {monthLabel(month)} ({current.declinados.length})
              </div>
              {current.declinados.length === 0 ? (
                <div style={{ textAlign: "center", color: T.muted, padding: "50px 0", fontSize: 13.5 }}>
                  Nenhum negócio declinado neste mês.
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr>
                    <th style={th}>Titular</th><th style={th}>Valor</th><th style={th}>Motivo</th><th style={th}>Detalhe</th><th style={th}>Data</th>
                  </tr></thead>
                  <tbody>
                    {current.declinados
                      .sort((a, b) => (b.closed_at || "").localeCompare(a.closed_at || ""))
                      .map((d) => (
                        <tr key={d.id} onClick={() => navigate(`/crm/${d.id}`)}
                          onMouseEnter={(e) => e.currentTarget.style.background = T.bg}
                          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                          style={{ cursor: "pointer" }}>
                          <td style={{ ...td, fontWeight: 700, color: T.ink }}>{personName(d.person_id)}</td>
                          <td style={{ ...td, fontFamily: T.mono }}>{fmtBRL(d.valor_ofertado_cents ?? d.valor_face_cents)}</td>
                          <td style={td}>{reasonLabel(d.lost_reason)}</td>
                          <td style={{ ...td, color: T.muted, fontSize: 12.5, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.lost_reason_detail || "—"}</td>
                          <td style={td}>{fmtDate(d.closed_at)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
