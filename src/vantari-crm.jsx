import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabase";
import {
  BarChart2, Users, Mail, Star, LayoutTemplate, Bot, Plug, Settings,
  Briefcase, Plus, Filter, Loader2, AlertCircle, Kanban, List, TrendingUp,
  X, Scale, Building2, UserPlus, CheckCircle2, XCircle,
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

const onlyDigits = (s) => (s || "").replace(/\D/g, "");

const cleanCpf = (raw) => {
  const v = onlyDigits(raw);
  if (v.length !== 11) return null;
  if (/^(\d)\1{10}$/.test(v)) return null;
  const dv = (base, factorStart) => {
    let s = 0;
    for (let i = 0; i < base.length; i++) s += Number(base[i]) * (factorStart - i);
    const r = 11 - (s % 11);
    return r >= 10 ? 0 : r;
  };
  if (dv(v.slice(0, 9), 10) !== Number(v[9])) return null;
  if (dv(v.slice(0, 10), 11) !== Number(v[10])) return null;
  return v;
};

const reaisToCents = (v) => {
  if (v == null || v === "") return 0;
  const n = parseFloat(String(v).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};

/* ─── Máscaras (estado guarda só dígitos; exibe formatado) ─── */
const maskCpf = (raw) => {
  const d = onlyDigits(raw).slice(0, 11);
  if (d.length > 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length > 6) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  if (d.length > 3) return `${d.slice(0, 3)}.${d.slice(3)}`;
  return d;
};
const maskCnpj = (raw) => {
  const d = onlyDigits(raw).slice(0, 14);
  if (d.length > 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  if (d.length > 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  if (d.length > 5) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length > 2) return `${d.slice(0, 2)}.${d.slice(2)}`;
  return d;
};
const maskCnj = (raw) => {
  const d = onlyDigits(raw).slice(0, 20);
  let r = d.slice(0, 7);
  if (d.length > 7) r += `-${d.slice(7, 9)}`;
  if (d.length > 9) r += `.${d.slice(9, 13)}`;
  if (d.length > 13) r += `.${d.slice(13, 14)}`;
  if (d.length > 14) r += `.${d.slice(14, 16)}`;
  if (d.length > 16) r += `.${d.slice(16, 20)}`;
  return r;
};

// TRT (Justiça do Trabalho, segmento J=5) → UF
const TRT_UF = {
  1: "RJ", 2: "SP", 3: "MG", 4: "RS", 5: "BA", 6: "PE", 7: "CE", 8: "PA",
  9: "PR", 10: "DF", 11: "AM", 12: "SC", 13: "PB", 14: "RO", 15: "SP",
  16: "MA", 17: "ES", 18: "GO", 19: "AL", 20: "SE", 21: "RN", 22: "PI",
  23: "MT", 24: "MS",
};
// extrai tribunal/UF/vara do CNJ (NNNNNNN-DD.AAAA.J.TR.OOOO)
const parseCnj = (raw) => {
  const d = onlyDigits(raw);
  if (d.length < 16) return null;
  const J = d[13], TR = parseInt(d.slice(14, 16), 10);
  const out = { tribunal: null, uf: null, vara: null };
  if (J === "5" && TR > 0) { out.tribunal = `TRT-${TR}`; out.uf = TRT_UF[TR] || null; }
  if (d.length >= 20) { const o = parseInt(d.slice(16, 20), 10); if (o > 0) out.vara = `${o}ª Vara do Trabalho`; }
  return out;
};

// espelha crm.avaliar_elegibilidade — só para feedback de UI
const elegibilidadeMotivos = (f) => {
  const m = [];
  if (f.teses && f.teses.trim()) m.push("tem tese restritiva");
  if (!["negativa", "positiva_efeito_negativa"].includes(f.rda_cndt)) m.push("CNDT positiva");
  if (f.rda_rj) m.push("reclamada em recuperação judicial");
  if (["MEI", "ME"].includes(f.rda_porte)) m.push("reclamada MEI/ME");
  if (f.rda_precatorio) m.push("paga por precatório");
  if (!f.rda_solvente) m.push("reclamada insolvente");
  return m;
};

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

/* ─── Modal: Novo Processo → Negócio ─── */
const EMPTY_PROC = {
  rcl_nome: "", rcl_cpf: "", rcl_phone: "", rcl_email: "",
  rda_nome: "", rda_cnpj: "", rda_cndt: "negativa", rda_porte: "Grande",
  rda_rj: false, rda_precatorio: false, rda_solvente: true,
  numero_cnj: "", tribunal: "", vara: "", uf: "", fase: "Acórdão de RO",
  valor_causa: "", valor_liquido: "", teses: "",
  credit_type: "reclamante", modalidade: "tradicional", valor_face: "", desagio: "",
  _autoTribunal: "", _autoVara: "", _autoUf: "",
};

const CNDT_OPTS = [
  { v: "negativa", l: "Negativa (ok)" },
  { v: "positiva_efeito_negativa", l: "Positiva c/ efeito negativo (ok)" },
  { v: "positiva", l: "Positiva (veta)" },
];
const PORTE_OPTS = ["MEI", "ME", "EPP", "Médio", "Grande"];

function NovoProcessoModal({ workspaceId, pipeline, stages, onClose, onCreated }) {
  const [f, setF] = useState(EMPTY_PROC);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  // CNJ: guarda dígitos e auto-preenche Tribunal/Vara/UF (sem sobrescrever edição manual)
  const onCnj = (raw) => {
    const d = onlyDigits(raw).slice(0, 20);
    setF((s) => {
      const next = { ...s, numero_cnj: d };
      const p = parseCnj(d);
      if (p) {
        if (p.tribunal && (!s.tribunal || s.tribunal === s._autoTribunal)) { next.tribunal = p.tribunal; next._autoTribunal = p.tribunal; }
        if (p.uf && (!s.uf || s.uf === s._autoUf)) { next.uf = p.uf; next._autoUf = p.uf; }
        if (p.vara && (!s.vara || s.vara === s._autoVara)) { next.vara = p.vara; next._autoVara = p.vara; }
      }
      return next;
    });
  };

  const motivos = elegibilidadeMotivos(f);
  const elegivelPreview = motivos.length === 0;
  const faceC = reaisToCents(f.valor_face);
  const desagioN = f.desagio === "" ? null : parseFloat(String(f.desagio).replace(",", "."));
  const ofertadoC = desagioN != null ? Math.round(faceC * (1 - desagioN / 100)) : null;

  const firstStage = [...stages].sort((a, b) => a.position - b.position)[0];

  const save = async () => {
    setError(null);
    if (!f.rcl_nome.trim()) { setError("Informe o nome do reclamante."); return; }
    let cpfClean = null;
    if (f.rcl_cpf.trim()) {
      cpfClean = cleanCpf(f.rcl_cpf);
      if (!cpfClean) { setError("CPF do reclamante inválido (11 dígitos)."); return; }
    }
    if (!cpfClean && !f.rcl_email.trim() && !f.rcl_phone.trim()) {
      setError("Reclamante precisa de CPF, e-mail ou telefone.");
      return;
    }
    if (!f.numero_cnj || f.numero_cnj.length < 20) { setError("Informe o número CNJ completo (20 dígitos)."); return; }
    if (!firstStage) { setError("Pipeline sem estágios."); return; }

    setSaving(true);
    try {
      const core = supabase.schema("core");
      const crm = supabase.schema("crm");

      // 1) reclamante -> core.persons (idempotente)
      const { data: personId, error: ep } = await core.rpc("resolve_person", {
        p_workspace: workspaceId,
        p_cpf: cpfClean,
        p_phone: f.rcl_phone || null,
        p_email: f.rcl_email || null,
        p_name: f.rcl_nome || null,
        p_source: "crm",
      });
      if (ep) throw ep;

      // 2) reclamada -> core.companies (opcional)
      let companyId = null;
      const cnpjDigits = onlyDigits(f.rda_cnpj) || null;
      if (f.rda_nome.trim() || cnpjDigits) {
        if (cnpjDigits) {
          const { data: ex } = await core.from("companies")
            .select("id").eq("workspace_id", workspaceId).eq("cnpj", cnpjDigits).maybeSingle();
          if (ex) companyId = ex.id;
        }
        if (!companyId) {
          const { data: ins, error: ec } = await core.from("companies")
            .insert({ workspace_id: workspaceId, cnpj: cnpjDigits, name: f.rda_nome || null })
            .select("id").single();
          if (ec) throw ec;
          companyId = ins.id;
        }
      }

      // 3) processo (trigger calcula elegibilidade)
      const teses = f.teses.split(",").map((t) => t.trim()).filter(Boolean);
      const { data: proc, error: epr } = await crm.from("processos").insert({
        workspace_id: workspaceId,
        numero_cnj: maskCnj(f.numero_cnj),
        reclamante_person_id: personId,
        reclamada_company_id: companyId,
        tribunal: f.tribunal || null,
        vara: f.vara || null,
        uf: f.uf ? f.uf.toUpperCase().slice(0, 2) : null,
        fase: f.fase || null,
        valor_causa_cents: reaisToCents(f.valor_causa),
        valor_estimado_liquido_cents: reaisToCents(f.valor_liquido),
        reclamada_cndt: f.rda_cndt,
        reclamada_em_rj: f.rda_rj,
        reclamada_porte: f.rda_porte,
        reclamada_paga_precatorio: f.rda_precatorio,
        reclamada_solvente: f.rda_solvente,
        teses_restritivas: teses,
      }).select("id,elegivel,status").single();
      if (epr) throw epr;

      // 4) negócio inicial (entra em "Novos Leads")
      const { error: ed } = await crm.from("deals").insert({
        workspace_id: workspaceId,
        processo_id: proc.id,
        person_id: personId,
        credit_type: f.credit_type,
        modalidade: f.modalidade || null,
        valor_face_cents: faceC,
        valor_ofertado_cents: ofertadoC,
        desagio_pct: desagioN,
        pipeline_id: pipeline.id,
        stage_id: firstStage.id,
        source: "crm",
      });
      if (ed) throw ed;

      onCreated({ elegivel: proc.elegivel });
    } catch (err) {
      setError(err.message || String(err));
      setSaving(false);
    }
  };

  const inputStyle = { width: "100%", padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, color: T.text, outline: "none", fontFamily: T.font, boxSizing: "border-box", background: T.surface };
  const labelStyle = { fontSize: 11.5, fontWeight: 600, color: T.text, display: "block", marginBottom: 4, fontFamily: T.font };
  // funções (NÃO componentes) — retornam host elements direto, sem remount/perda de foco
  const field = (label, k, type = "text", ph = "", full = false, mask = null) => (
    <div style={{ marginBottom: 12, gridColumn: full ? "1 / -1" : "auto" }}>
      <label style={labelStyle}>{label}</label>
      <input type={type} inputMode={mask ? "numeric" : undefined}
        value={mask ? mask(f[k]) : f[k]}
        onChange={(e) => set(k, mask ? onlyDigits(e.target.value) : e.target.value)}
        placeholder={ph} style={inputStyle} />
    </div>
  );
  const sectionTitle = (Icon, children) => (
    <div style={{ display: "flex", alignItems: "center", gap: 7, margin: "18px 0 10px", color: T.ink, fontFamily: T.head, fontWeight: 700, fontSize: 13 }}>
      <Icon size={15} color={T.teal} /> {children}
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: T.surface, borderRadius: 16, width: 640, maxWidth: "95vw", maxHeight: "92vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,.18)" }}>
        <div style={{ padding: "18px 24px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: T.head, fontWeight: 700, fontSize: 16, color: T.ink }}>Novo Processo → Negócio</span>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: T.muted }}><X size={18} /></button>
        </div>

        <div style={{ padding: "8px 24px 20px", overflowY: "auto" }}>
          {sectionTitle(UserPlus, "Reclamante (titular do crédito)")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {field("Nome *", "rcl_nome", "text", "Nome completo")}
            {field("CPF", "rcl_cpf", "text", "000.000.000-00", false, maskCpf)}
            {field("Telefone", "rcl_phone", "text", "(11) 9....")}
            {field("E-mail", "rcl_email", "email", "email@exemplo.com")}
          </div>

          {sectionTitle(Building2, "Reclamada (empresa)")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {field("Razão social", "rda_nome", "text", "Empresa reclamada")}
            {field("CNPJ", "rda_cnpj", "text", "00.000.000/0000-00", false, maskCnpj)}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>CNDT</label>
              <select value={f.rda_cndt} onChange={(e) => set("rda_cndt", e.target.value)} style={inputStyle}>
                {CNDT_OPTS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Porte</label>
              <select value={f.rda_porte} onChange={(e) => set("rda_porte", e.target.value)} style={inputStyle}>
                {PORTE_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", margin: "2px 0 4px" }}>
            {[
              { k: "rda_rj", l: "Em recuperação judicial" },
              { k: "rda_precatorio", l: "Paga por precatório" },
              { k: "rda_solvente", l: "Solvente" },
            ].map((c) => (
              <label key={c.k} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: T.text, fontFamily: T.font, cursor: "pointer" }}>
                <input type="checkbox" checked={f[c.k]} onChange={(e) => set(c.k, e.target.checked)} /> {c.l}
              </label>
            ))}
          </div>

          {sectionTitle(Scale, "Processo")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ marginBottom: 12, gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Número CNJ *</label>
              <input inputMode="numeric" value={maskCnj(f.numero_cnj)} onChange={(e) => onCnj(e.target.value)}
                placeholder="0000000-00.0000.5.00.0000" style={inputStyle} />
              <div style={{ fontSize: 10.5, color: T.faint3, marginTop: 3, fontFamily: T.font }}>
                Só números — Tribunal, Vara e UF preenchem sozinhos.
              </div>
            </div>
            {field("Tribunal", "tribunal", "text", "TRT-2")}
            {field("Vara", "vara", "text", "1ª Vara do Trabalho")}
            {field("UF", "uf", "text", "SP")}
            {field("Fase", "fase", "text", "Acórdão de RO")}
            {field("Valor da causa (R$)", "valor_causa", "text", "0,00")}
            {field("Valor estimado líquido (R$)", "valor_liquido", "text", "0,00")}
            {field("Teses restritivas (separadas por vírgula)", "teses", "text", "ex: vínculo, grupo econômico", true)}
          </div>

          {sectionTitle(Briefcase, "Negócio inicial")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Tipo de crédito</label>
              <select value={f.credit_type} onChange={(e) => set("credit_type", e.target.value)} style={inputStyle}>
                <option value="reclamante">Reclamante</option>
                <option value="advogado_honorario">Honorário (advogado)</option>
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Modalidade</label>
              <select value={f.modalidade} onChange={(e) => set("modalidade", e.target.value)} style={inputStyle}>
                <option value="tradicional">Tradicional</option>
                <option value="kicker">Kicker</option>
              </select>
            </div>
            {field("Valor de face (R$)", "valor_face", "text", "0,00")}
            {field("Deságio (%)", "desagio", "text", "ex: 45")}
          </div>
          {ofertadoC != null && faceC > 0 && (
            <div style={{ fontSize: 12, color: T.muted, fontFamily: T.mono, marginTop: -4 }}>
              Valor ofertado (calc.): <strong style={{ color: T.teal }}>{fmtBRL(ofertadoC)}</strong>
            </div>
          )}

          {/* Prévia de elegibilidade */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16, padding: "10px 12px", borderRadius: 10,
            background: elegivelPreview ? "#F0FDF7" : "#FFF1F0", border: `1px solid ${elegivelPreview ? "#6EE7B7" : T.coral}` }}>
            {elegivelPreview ? <CheckCircle2 size={16} color={T.green} /> : <XCircle size={16} color={T.coral} />}
            <span style={{ fontSize: 12.5, color: elegivelPreview ? "#0F6E4E" : "#9B2C2C", fontFamily: T.font }}>
              {elegivelPreview ? "Prévia: elegível pelos critérios informados." : `Prévia: inelegível — ${motivos.join(", ")}.`}
            </span>
          </div>

          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, color: "#9B2C2C", fontSize: 12.5, fontFamily: T.font }}>
              <AlertCircle size={15} color={T.coral} /> {error}
            </div>
          )}
        </div>

        <div style={{ padding: "14px 24px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} disabled={saving} style={{ padding: "8px 16px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 9, color: T.text, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: T.font }}>Cancelar</button>
          <button onClick={save} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 18px", background: T.gradient, border: "none", borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", fontFamily: T.font, opacity: saving ? 0.7 : 1 }}>
            {saving && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
            {saving ? "Criando..." : "Criar processo e negócio"}
          </button>
        </div>
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
  const [showNovo, setShowNovo] = useState(false);
  const [toast, setToast] = useState(null);

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
            <button onClick={() => pipeline && setShowNovo(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
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

      {/* Modal Novo Processo → Negócio */}
      {showNovo && pipeline && (
        <NovoProcessoModal
          workspaceId={WORKSPACE_VANTARI}
          pipeline={pipeline}
          stages={stages}
          onClose={() => setShowNovo(false)}
          onCreated={({ elegivel }) => {
            setShowNovo(false);
            setToast({ elegivel });
            load();
            setTimeout(() => setToast(null), 6000);
          }}
        />
      )}

      {/* Toast de veredito */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 200, display: "flex", alignItems: "center", gap: 10,
          background: T.surface, border: `1px solid ${toast.elegivel ? "#6EE7B7" : T.coral}`, borderRadius: 12,
          padding: "12px 16px", boxShadow: "0 12px 32px -12px rgba(14,26,36,.25)", fontFamily: T.font, fontSize: 13 }}>
          {toast.elegivel ? <CheckCircle2 size={18} color={T.green} /> : <XCircle size={18} color={T.coral} />}
          <span style={{ color: T.ink, fontWeight: 600 }}>
            Negócio criado — processo {toast.elegivel ? "ELEGÍVEL" : "INELEGÍVEL"}.
          </span>
        </div>
      )}
    </div>
  );
}
