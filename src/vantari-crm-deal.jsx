import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "./supabase";
import {
  BarChart2, Users, Mail, Star, LayoutTemplate, Bot, Plug, Settings, Briefcase,
  ArrowLeft, Loader2, AlertCircle, Scale, Building2, User, Trophy, XCircle,
  CheckCircle2, Phone, StickyNote, CalendarClock, Send, Clock,
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

const elegBadge = (proc) => {
  if (!proc) return null;
  const ok = proc.elegivel;
  return { label: ok ? "Elegível" : "Inelegível", color: ok ? T.green : T.coral, bg: ok ? "#F0FDF7" : "#FFF1F0", border: ok ? "#6EE7B7" : T.coral };
};

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

const Card = ({ title, icon: Icon, children }) => (
  <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px", boxShadow: "0 1px 0 rgba(14,26,36,.03)" }}>
    {title && (
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12, color: T.ink, fontFamily: T.head, fontWeight: 700, fontSize: 13 }}>
        {Icon && <Icon size={15} color={T.teal} />} {title}
      </div>
    )}
    {children}
  </div>
);
const Row = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "5px 0", fontSize: 12.5, fontFamily: T.font, borderBottom: `1px solid ${T.bg}` }}>
    <span style={{ color: T.muted }}>{label}</span>
    <span style={{ color: T.ink, fontWeight: 600, textAlign: "right" }}>{value ?? "—"}</span>
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
      setStages(st || []);
      setActs(ac || []);

      if (d.processo_id) {
        const { data: p } = await crm.from("processos").select("*").eq("id", d.processo_id).single();
        setProcesso(p || null);
        if (p?.reclamada_company_id) {
          const { data: co } = await supabase.schema("core").from("companies").select("*").eq("id", p.reclamada_company_id).single();
          setCompany(co || null);
        }
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

  const setOutcome = async (kind) => {
    const target = stages.find((s) => s.kind === kind);
    if (target) moveStage(target.id);
  };

  const addActivity = async () => {
    if (!actContent.trim()) return;
    setPosting(true);
    let owner = null;
    try { const { data: u } = await supabase.auth.getUser(); owner = u?.user?.id || null; } catch { /* ignore */ }
    const { error: e } = await supabase.schema("crm").from("activities").insert({
      workspace_id: WORKSPACE_VANTARI,
      deal_id: deal.id,
      processo_id: deal.processo_id,
      person_id: deal.person_id,
      type: actType,
      content: actContent.trim(),
      owner_id: owner,
    });
    setPosting(false);
    if (e) { setError(e.message); return; }
    setActContent("");
    load();
  };

  const valor = deal ? (deal.valor_ofertado_cents ?? deal.valor_face_cents) : 0;
  const eb = elegBadge(processo);

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
            {/* Cabeçalho */}
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
                {/* Estágio */}
                <select value={deal.stage_id} disabled={busy} onChange={(e) => moveStage(e.target.value)}
                  style={{ padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 9, fontSize: 13, fontWeight: 600, color: T.ink, background: T.surface, fontFamily: T.font, cursor: "pointer" }}>
                  {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button onClick={() => setOutcome("won")} disabled={busy} title="Marcar como Ganho"
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: curStage?.kind === "won" ? T.green : T.surface, border: `1px solid ${curStage?.kind === "won" ? T.green : "#6EE7B7"}`, borderRadius: 9, cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: curStage?.kind === "won" ? "#fff" : T.green, fontFamily: T.font }}>
                  <Trophy size={14} /> Ganho
                </button>
                <button onClick={() => setOutcome("lost")} disabled={busy} title="Marcar como Perdido"
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: curStage?.kind === "lost" ? T.coral : T.surface, border: `1px solid ${curStage?.kind === "lost" ? T.coral : T.coral}`, borderRadius: 9, cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: curStage?.kind === "lost" ? "#fff" : T.coral, fontFamily: T.font }}>
                  <XCircle size={14} /> Perdido
                </button>
              </div>
            </div>

            {/* Grid principal */}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(280px, 1fr)", gap: 20, alignItems: "start" }}>
              {/* Coluna esquerda: atividades */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Card title="Registrar atividade" icon={StickyNote}>
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
                </Card>

                <Card title={`Timeline (${acts.length})`} icon={Clock}>
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
                </Card>
              </div>

              {/* Coluna direita: processo / contato / negócio */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Card title="Processo" icon={Scale}>
                  {processo ? (
                    <>
                      {eb && (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 99, marginBottom: 10, background: eb.bg, border: `1px solid ${eb.border}`, color: eb.color, fontSize: 12, fontWeight: 700, fontFamily: T.font }}>
                          {processo.elegivel ? <CheckCircle2 size={13} /> : <XCircle size={13} />} {eb.label}
                        </div>
                      )}
                      <Row label="CNJ" value={processo.numero_cnj} />
                      <Row label="Tribunal" value={processo.tribunal} />
                      <Row label="Vara" value={processo.vara} />
                      <Row label="UF" value={processo.uf} />
                      <Row label="Fase" value={processo.fase} />
                      <Row label="Valor da causa" value={processo.valor_causa_cents ? fmtBRL(processo.valor_causa_cents) : "—"} />
                      <Row label="Estimado líquido" value={processo.valor_estimado_liquido_cents ? fmtBRL(processo.valor_estimado_liquido_cents) : "—"} />
                    </>
                  ) : <div style={{ color: T.muted, fontSize: 13 }}>Sem processo vinculado.</div>}
                </Card>

                <Card title="Reclamada" icon={Building2}>
                  {company ? (
                    <>
                      <Row label="Razão social" value={company.name} />
                      <Row label="CNPJ" value={company.cnpj} />
                      {processo && <Row label="CNDT" value={processo.reclamada_cndt} />}
                      {processo && <Row label="Porte" value={processo.reclamada_porte} />}
                    </>
                  ) : <div style={{ color: T.muted, fontSize: 13 }}>Sem reclamada vinculada.</div>}
                </Card>

                <Card title="Contato (titular)" icon={User}>
                  {person ? (
                    <>
                      <Row label="Nome" value={person.full_name} />
                      <Row label="CPF" value={person.cpf} />
                      <Row label="Telefone" value={person.primary_phone} />
                      <Row label="E-mail" value={person.primary_email} />
                      <Row label="Status" value={person.status} />
                    </>
                  ) : <div style={{ color: T.muted, fontSize: 13 }}>Sem contato vinculado.</div>}
                </Card>

                <Card title="Negócio" icon={Briefcase}>
                  <Row label="Tipo de crédito" value={creditTypeLabel(deal.credit_type)} />
                  <Row label="Modalidade" value={deal.modalidade} />
                  <Row label="Valor de face" value={fmtBRL(deal.valor_face_cents)} />
                  <Row label="Valor ofertado" value={deal.valor_ofertado_cents != null ? fmtBRL(deal.valor_ofertado_cents) : "—"} />
                  <Row label="Deságio" value={deal.desagio_pct != null ? `${Number(deal.desagio_pct).toFixed(0)}%` : "—"} />
                  <Row label="Captador/a" value={deal.captador} />
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
