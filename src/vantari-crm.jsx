import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabase";
import {
  BarChart2, Users, Mail, Star, LayoutTemplate, Bot, Plug, Settings,
  Briefcase, Plus, Filter, Loader2, AlertCircle, Kanban, List, TrendingUp,
  X, Info,
} from "lucide-react";

/* ───── DESIGN TOKENS (padrão Vantari) ───── */
const T = {
  teal: "#0D7491", blue: "#0D7491", green: "#14A273", brand2: "#1F76BC", deep: "#0A3D4D",
  gradient: "linear-gradient(135deg, #0D7491 0%, #14A273 100%)",
  sidebarBg: "linear-gradient(180deg, #0D7491 0%, #0A5165 60%, #0A3D4D 100%)",
  violet: "#7C5CFF", amber: "#F59E0B", orange: "#F59E0B", coral: "#FF6B5E", red: "#FF6B5E",
  cyan: "#06B6D4", rose: "#EC4899", purple: "#7C5CFF",
  bg: "#F5F8FB", surface: "#FFFFFF", border: "#E8EEF3",
  ink: "#0E1A24", text: "#2E3D4B", muted: "#5A6B7A", faint3: "#8696A5", faint: "#F5F8FB",
  font: "'Inter', system-ui, sans-serif", head: "'Sora', system-ui, sans-serif", mono: "'JetBrains Mono', monospace",
};

const WORKSPACE_VANTARI = "53092199-7b75-4342-a897-f589d6f34922";

// Cores de coluna por posição/tipo (won=verde, lost=coral, demais por ordem)
const STAGE_ACCENTS = [T.blue, T.violet, T.amber, T.coral, T.green, T.faint3];
const stageAccent = (stage, idx) =>
  stage.kind === "won" ? T.green : stage.kind === "lost" ? T.coral : STAGE_ACCENTS[idx % STAGE_ACCENTS.length];

const fmtBRL = (cents) =>
  "R$ " + ((cents || 0) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const creditTypeLabel = (t) =>
  t === "advogado_honorario" ? "Honorário (adv.)" : t === "reclamante" ? "Reclamante" : t || "—";

/* ─── Sidebar (padrão do projeto: cada página tem a sua) ─── */
const NavSection = ({ label }) => (
  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.18em", color: "rgba(255,255,255,0.4)", padding: "10px 20px 4px", textTransform: "uppercase", fontFamily: T.head }}>
    {label}
  </div>
);

const NavItem = ({ icon: Icon, label, active = false, path }) => {
  const [hov, setHov] = useState(false);
  const navigate = useNavigate();
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={() => path && navigate(path)}
      style={{
        position: "relative", display: "flex", alignItems: "center", gap: 9,
        padding: "8px 20px", fontSize: 13.5, fontWeight: active ? 700 : 600, fontFamily: T.font,
        color: active ? "#fff" : hov ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.6)",
        background: active ? "rgba(255,255,255,0.10)" : hov ? "rgba(255,255,255,0.06)" : "transparent",
        cursor: "pointer", transition: "all 0.15s", userSelect: "none",
      }}>
      {active && (
        <span style={{ position: "absolute", left: 0, top: 6, bottom: 6, width: 3,
          background: "linear-gradient(180deg, #14A273 0%, #5EEAD4 100%)", borderRadius: "0 3px 3px 0" }} />
      )}
      {Icon && <Icon size={16} aria-hidden="true" />}
      {label}
    </div>
  );
};

function Sidebar() {
  return (
    <div style={{ width: 240, background: T.sidebarBg, display: "flex", flexDirection: "column",
      flexShrink: 0, position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 10, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(circle at 90% 0%, rgba(20,162,115,.25) 0%, transparent 50%)" }} />
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

/* ─── Card de negócio ─── */
function DealCard({ deal, personName }) {
  const [hov, setHov] = useState(false);
  const valor = deal.valor_ofertado_cents ?? deal.valor_face_cents;
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10,
        padding: "11px 12px", cursor: "pointer", transition: "all 0.15s",
        boxShadow: hov ? "0 8px 20px -12px rgba(14,26,36,.18)" : "0 1px 0 rgba(14,26,36,.03)",
        transform: hov ? "translateY(-1px)" : "none" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, fontFamily: T.font, marginBottom: 3 }}>
        {personName || "Sem titular"}
      </div>
      <div style={{ fontSize: 11, color: T.muted, fontFamily: T.font, marginBottom: 8 }}>
        {creditTypeLabel(deal.credit_type)}{deal.modalidade ? ` · ${deal.modalidade}` : ""}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.teal, fontFamily: T.mono }}>{fmtBRL(valor)}</span>
        {deal.desagio_pct != null && (
          <span style={{ fontSize: 10, fontWeight: 700, fontFamily: T.mono, color: T.amber,
            background: `${T.amber}14`, padding: "2px 6px", borderRadius: 99 }}>
            deságio {Number(deal.desagio_pct).toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Coluna do estágio ─── */
function StageColumn({ stage, accent, deals, personMap }) {
  const total = deals.reduce((s, d) => s + (d.valor_ofertado_cents ?? d.valor_face_cents ?? 0), 0);
  return (
    <div style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ height: 3, background: accent }} />
        <div style={{ padding: "10px 12px" }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.04em", color: T.ink, fontFamily: T.head, textTransform: "uppercase" }}>
            {stage.name}
          </div>
          <div style={{ fontSize: 11, color: T.muted, fontFamily: T.mono, marginTop: 2 }}>
            {fmtBRL(total)} · {deals.length} {deals.length === 1 ? "negócio" : "negócios"}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {deals.map((d) => <DealCard key={d.id} deal={d} personName={personMap[d.person_id]} />)}
      </div>
    </div>
  );
}

export default function CRM() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pipeline, setPipeline] = useState(null);
  const [stages, setStages] = useState([]);
  const [deals, setDeals] = useState([]);
  const [personMap, setPersonMap] = useState({});
  const [view, setView] = useState("kanban");
  const [showNewInfo, setShowNewInfo] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const crm = supabase.schema("crm");
      const { data: pipes, error: e1 } = await crm
        .from("pipelines").select("id,name").eq("is_default", true).limit(1);
      if (e1) throw e1;
      const pipe = pipes?.[0];
      if (!pipe) { setPipeline(null); setStages([]); setDeals([]); setLoading(false); return; }
      setPipeline(pipe);

      const { data: st, error: e2 } = await crm
        .from("stages").select("id,name,position,kind").eq("pipeline_id", pipe.id).order("position");
      if (e2) throw e2;
      setStages(st || []);

      const { data: dl, error: e3 } = await crm
        .from("deals")
        .select("id,person_id,credit_type,modalidade,valor_face_cents,valor_ofertado_cents,desagio_pct,stage_id,status")
        .eq("pipeline_id", pipe.id);
      if (e3) throw e3;
      setDeals(dl || []);

      const ids = [...new Set((dl || []).map((d) => d.person_id).filter(Boolean))];
      if (ids.length) {
        const { data: ppl } = await supabase.schema("core")
          .from("persons").select("id,full_name,primary_email").in("id", ids);
        const map = {};
        (ppl || []).forEach((p) => { map[p.id] = p.full_name || p.primary_email; });
        setPersonMap(map);
      } else {
        setPersonMap({});
      }
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const dealsByStage = (stageId) => deals.filter((d) => d.stage_id === stageId);
  const totalGeral = deals.reduce((s, d) => s + (d.valor_ofertado_cents ?? d.valor_face_cents ?? 0), 0);

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font }}>
      <Sidebar />
      <div style={{ marginLeft: 240, padding: "28px 32px", minHeight: "100vh" }}>
        {/* Cabeçalho */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 22 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: T.ink, fontFamily: T.head, letterSpacing: "-0.03em", margin: 0 }}>
              Negócios
            </h1>
            <div style={{ fontSize: 13, color: T.muted, fontFamily: T.font, marginTop: 4 }}>
              {pipeline ? pipeline.name : "Pipeline"} · {fmtBRL(totalGeral)} em {deals.length} {deals.length === 1 ? "negócio" : "negócios"}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Toggle de visão */}
            <div style={{ display: "flex", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 9, padding: 3, gap: 2 }}>
              {[
                { id: "kanban", label: "Kanban", icon: Kanban, on: true },
                { id: "lista", label: "Lista", icon: List, on: false },
                { id: "previsao", label: "Previsão", icon: TrendingUp, on: false },
              ].map((v) => (
                <button key={v.id} onClick={() => v.on && setView(v.id)} disabled={!v.on}
                  title={v.on ? "" : "Em breve"}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 7,
                    border: "none", cursor: v.on ? "pointer" : "not-allowed", fontSize: 12.5, fontWeight: 600, fontFamily: T.font,
                    background: view === v.id ? T.teal : "transparent",
                    color: view === v.id ? "#fff" : v.on ? T.text : T.faint3 }}>
                  <v.icon size={14} /> {v.label}
                </button>
              ))}
            </div>
            <button onClick={() => alert("Em construção")} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px",
              background: T.surface, border: `1px solid ${T.border}`, borderRadius: 9, cursor: "pointer",
              fontSize: 12.5, fontWeight: 600, color: T.text, fontFamily: T.font }}>
              <Filter size={14} /> Filtro
            </button>
            <button onClick={() => setShowNewInfo(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
              background: T.gradient, border: "none", borderRadius: 9, cursor: "pointer",
              fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: T.font }}>
              <Plus size={15} /> Negócio
            </button>
          </div>
        </div>

        {/* Estados */}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 320, color: T.muted, gap: 10, fontSize: 14 }}>
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Carregando pipeline...
          </div>
        )}

        {error && !loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#FFF1F0", border: `1px solid ${T.coral}`,
            color: "#9B2C2C", borderRadius: 12, padding: "14px 16px", fontSize: 13, fontFamily: T.font }}>
            <AlertCircle size={18} color={T.coral} />
            <span><strong>Erro ao carregar:</strong> {error}</span>
          </div>
        )}

        {!loading && !error && !pipeline && (
          <div style={{ textAlign: "center", color: T.muted, padding: "80px 0", fontSize: 14 }}>
            Nenhum pipeline configurado para este workspace.
          </div>
        )}

        {/* Board Kanban */}
        {!loading && !error && pipeline && (
          <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 16, alignItems: "flex-start" }}>
            {stages.map((s, i) => (
              <StageColumn key={s.id} stage={s} accent={stageAccent(s, i)} deals={dealsByStage(s.id)} personMap={personMap} />
            ))}
          </div>
        )}
      </div>

      {/* Modal informativo do "+ Negócio" (fluxo real depende de Processo) */}
      {showNewInfo && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
          onClick={() => setShowNewInfo(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: T.surface, borderRadius: 16, width: 440, maxWidth: "90vw", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.15)" }}>
            <div style={{ padding: "18px 22px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: T.head, fontWeight: 700, fontSize: 15, color: T.ink }}>Novo negócio</span>
              <button onClick={() => setShowNewInfo(false)} style={{ border: "none", background: "none", cursor: "pointer", color: T.muted }}><X size={18} /></button>
            </div>
            <div style={{ padding: "20px 22px", fontSize: 13.5, color: T.text, lineHeight: 1.6, fontFamily: T.font }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px" }}>
                <Info size={18} color={T.teal} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>No domínio da Vantari, um <strong>negócio nasce de um Processo</strong> (CNJ, reclamante, reclamada, elegibilidade). O cadastro de Processo → Negócio é a próxima etapa em construção.</span>
              </div>
            </div>
            <div style={{ padding: "0 22px 20px", display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => setShowNewInfo(false)} style={{ padding: "8px 16px", background: T.teal, border: "none", borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: T.font }}>
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
