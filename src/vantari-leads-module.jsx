import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabase";
import {
  Users, Plus, Search, Filter, ChevronDown, X, Edit2, Trash2,
  Mail, Phone, Building2, Tag, TrendingUp, Star, AlertCircle,
  CheckCircle, Clock, BarChart2, Home, Settings, Zap, Globe,
  Layout, MessageSquare, LogOut, Loader2, Bot, LayoutTemplate, Plug,
  Activity, ExternalLink, MousePointer
} from "lucide-react";

/* ───── DESIGN TOKENS ───── */
const T = {
  // Brand
  teal:    "#0D7491",
  blue:    "#0D7491",
  green:   "#14A273",
  brand2:  "#1F76BC",
  deep:    "#0A3D4D",
  gradient: "linear-gradient(135deg, #0D7491 0%, #14A273 100%)",
  sidebarBg: "linear-gradient(180deg, #0D7491 0%, #0A5165 60%, #0A3D4D 100%)",

  // Data accents
  violet:  "#7C5CFF",
  amber:   "#F59E0B",
  orange:  "#F59E0B",
  coral:   "#FF6B5E",
  red:     "#FF6B5E",
  cyan:    "#06B6D4",
  rose:    "#EC4899",
  purple:  "#7C5CFF",

  // Surfaces & ink
  bg:      "#F5F8FB",
  surface: "#FFFFFF",
  border:  "#E8EEF3",

  // Ink scale
  ink:     "#0E1A24",
  text:    "#2E3D4B",
  muted:   "#5A6B7A",
  faint3:  "#8696A5",
  faint:   "#F5F8FB",

  // Fonts
  font:    "'Inter', system-ui, sans-serif",
  head:    "'Sora', system-ui, sans-serif",
  mono:    "'JetBrains Mono', monospace",

  // Legacy aliases used in this file
  primary: "#0D7491",
  accent:  "#14A273",
  danger:  "#FF6B5E",
};

// ─── Score badge ─────────────────────────────────────────────────
const scoreBadge = (score) => {
  if (score >= 100) return { label: "Sales Ready", color: "#7C5CFF", bg: "#f3e8ff" };
  if (score >= 51)  return { label: "Hot",         color: "#FF6B5E", bg: "#ffeaea" };
  if (score >= 21)  return { label: "Warm",        color: "#F59E0B", bg: "#fff8e1" };
  return               { label: "Cold",        color: "#8696A5", bg: "#EEF2F6" };
};

const stageBadge = (stage) => {
  const map = {
    Visitor:     { color: T.muted,    bg: "#EEF2F6"  },
    Lead:        { color: "#0D7491",  bg: "#e0f4ff"  },
    MQL:         { color: "#7C5CFF",  bg: "#f3e8ff"  },
    SQL:         { color: "#F59E0B",  bg: "#fff8e1"  },
    Opportunity: { color: "#14A273",  bg: "#e6faf3"  },
    Customer:    { color: "#059669",  bg: "#d1fae5"  },
  };
  return map[stage] || { color: T.muted, bg: T.bg };
};

// ─── Sidebar nav helpers ──────────────────────────────────────────
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
        position: "relative",
        display: "flex", alignItems: "center", gap: 9,
        padding: "8px 20px", fontSize: 13.5,
        fontWeight: active ? 700 : 600,
        fontFamily: T.font,
        color: active ? "#fff" : hov ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.6)",
        background: active ? "rgba(255,255,255,0.10)" : hov ? "rgba(255,255,255,0.06)" : "transparent",
        cursor: "pointer", transition: "all 0.15s", userSelect: "none",
      }}>
      {active && (
        <span style={{
          position: "absolute", left: 0, top: 6, bottom: 6, width: 3,
          background: "linear-gradient(180deg, #14A273 0%, #5EEAD4 100%)",
          borderRadius: "0 3px 3px 0",
        }} />
      )}
      {Icon && <Icon size={16} aria-hidden="true" />}
      {label}
    </div>
  );
};

/* ─── Phase 5: Hero KPI Components ─── */
const SparklineChart = ({ data = [], color }) => {
  const pts = (data.length >= 2 ? data : Array(7).fill(0));
  const max = Math.max(...pts) || 1;
  const min = Math.min(...pts);
  const range = max - min || 1;
  const W = 220, H = 36;
  const x = (i) => (i / (pts.length - 1)) * W;
  const y = (v) => H - ((v - min) / range) * (H - 6) - 3;
  const line = pts.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H}Z`;
  const gradId = `sg${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
      style={{ display: "block", width: "calc(100% + 32px)", height: 36, margin: "8px -16px -1px" }}
      aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <path d={line} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const TrendChipHero = ({ value }) => {
  const up = value >= 0;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, fontFamily: T.mono,
      background: up ? `${T.green}14` : `${T.coral}14`, color: up ? T.green : T.coral }}>
      {up ? "↗" : "↘"} {Math.abs(value)}%
    </span>
  );
};

const HeroKpiCard = ({ icon: Icon, label, value, trend, color, sub, sparkData }) => (
  <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14,
    padding: "14px 16px 0", position: "relative", overflow: "hidden",
    boxShadow: "0 1px 0 rgba(14,26,36,.03), 0 8px 24px -16px rgba(14,26,36,.08)" }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: "14px 14px 0 0" }} />
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ width: 32, height: 32, borderRadius: 9, background: `${color}14`, display: "grid", placeItems: "center" }}>
        {Icon && <Icon size={16} color={color} aria-hidden="true" />}
      </div>
      {trend !== undefined && <TrendChipHero value={trend} />}
    </div>
    <div style={{ fontSize: 28, fontWeight: 700, color: T.ink, fontFamily: T.head, letterSpacing: "-0.03em",
      fontVariantNumeric: "tabular-nums", margin: "10px 0 3px", lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 11.5, color: T.muted, fontWeight: 600, fontFamily: T.font }}>{label}</div>
    {sub && <div style={{ fontSize: 10.5, color, fontWeight: 700, fontFamily: T.mono, margin: "2px 0 8px" }}>{sub}</div>}
    {!sub && <div style={{ height: 8 }} />}
    <SparklineChart data={sparkData} color={color} />
  </div>
);

function Sidebar() {
  return (
    <div style={{
      width: 240,
      background: T.sidebarBg,
      display: "flex", flexDirection: "column", flexShrink: 0,
      position: "fixed", top: 0, left: 0, height: "100vh",
      zIndex: 10,
      overflow: "hidden",
    }}>
      {/* glow topo-direito */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(circle at 90% 0%, rgba(20,162,115,.25) 0%, transparent 50%)",
      }} />

      {/* Brand */}
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
        <NavItem icon={BarChart2}      label="Analytics"      path="/dashboard"    />
        <NavItem icon={Users}          label="Leads"          path="/leads"        active />
        <NavItem icon={Mail}           label="Email Marketing" path="/email"       />
        <NavSection label="Ferramentas" />
        <NavItem icon={Star}           label="Scoring"        path="/scoring"      />
        <NavItem icon={LayoutTemplate} label="Landing Pages"  path="/landing"      />
        <NavItem icon={Bot}            label="IA & Automação" path="/ai-marketing" />
        <NavSection label="Sistema" />
        <NavItem icon={Plug}           label="Integrações"    path="/integrations" />
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "8px 0", position: "relative" }}>
        <NavItem icon={Settings} label="Configurações" path="/settings" />
      </div>
    </div>
  );
}

// ─── Modal de lead ────────────────────────────────────────────────
const STAGES = ["Visitor", "Lead", "MQL", "SQL", "Opportunity", "Customer"];
const EMPTY = { name: "", email: "", phone: "", company: "", source: "", stage: "Lead", tags: "" };

function LeadModal({ lead, onClose, onSave }) {
  const [form, setForm] = useState(
    lead
      ? { ...lead, tags: (lead.tags || []).join(", ") }
      : EMPTY
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.email) { setError("E-mail obrigatório."); return; }
    setSaving(true); setError(null);

    const payload = {
      name:    form.name    || null,
      email:   form.email.trim().toLowerCase(),
      phone:   form.phone   || null,
      company: form.company || null,
      source:  form.source  || null,
      stage:   form.stage,
      tags:    form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
    };

    let err;
    if (lead?.id) {
      ({ error: err } = await supabase.from("leads").update(payload).eq("id", lead.id));
    } else {
      ({ error: err } = await supabase.from("leads").insert(payload));
    }

    setSaving(false);
    if (err) { setError(err.message); return; }
    onSave();
  };

  const field = (label, key, type = "text", placeholder = "") => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: T.text, display: "block", marginBottom: 4, fontFamily: T.font }}>
        {label}
      </label>
      <input
        type={type}
        value={form[key] || ""}
        onChange={e => set(key, e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", padding: "8px 12px", border: `1px solid ${T.border}`,
          borderRadius: 8, fontSize: 13, color: T.text, outline: "none",
          fontFamily: T.font, boxSizing: "border-box",
          background: T.surface,
        }}
      />
    </div>
  );

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.35)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
    }}>
      <div style={{
        background: T.surface, borderRadius: 16, width: 480, maxWidth: "90vw",
        boxShadow: "0 20px 60px rgba(0,0,0,.15)", overflow: "hidden",
      }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: T.head, fontWeight: 700, fontSize: 15, color: T.text }}>
            {lead ? "Editar Lead" : "Novo Lead"}
          </span>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: T.muted }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          {field("Nome", "name", "text", "Nome completo")}
          {field("E-mail *", "email", "email", "email@empresa.com")}
          {field("Telefone", "phone", "text", "(11) 99999-9999")}
          {field("Empresa", "company", "text", "Nome da empresa")}
          {field("Fonte", "source", "text", "landing_page, google_ads...")}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: T.text, display: "block", marginBottom: 4, fontFamily: T.font }}>
              Estágio
            </label>
            <select
              value={form.stage}
              onChange={e => set("stage", e.target.value)}
              style={{
                width: "100%", padding: "8px 12px", border: `1px solid ${T.border}`,
                borderRadius: 8, fontSize: 13, color: T.text, background: T.surface,
                fontFamily: T.font,
              }}
            >
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {field("Tags", "tags", "text", "tag1, tag2, tag3")}

          {error && (
            <div style={{ display: "flex", gap: 6, alignItems: "center", color: T.danger, fontSize: 12, marginBottom: 8, fontFamily: T.font }}>
              <AlertCircle size={13} /> {error}
            </div>
          )}
        </div>
        <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            padding: "9px 18px", border: `1px solid ${T.border}`, borderRadius: 8,
            background: "transparent", color: T.text, fontSize: 13, cursor: "pointer",
            fontFamily: T.font,
          }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} style={{
            padding: "9px 20px", border: "none", borderRadius: 8,
            background: "linear-gradient(135deg, #0D7491 0%, #14A273 100%)",
            color: "#fff", fontSize: 13, fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6,
            opacity: saving ? .7 : 1, fontFamily: T.font,
          }}>
            {saving ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Salvando…</> : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Painel lateral de detalhes ───────────────────────────────────
function LeadPanel({ lead, onClose, onEdit, onDelete }) {
  const score = scoreBadge(lead.score || 0);
  const stage = stageBadge(lead.stage);
  const [visits, setVisits]       = useState([]);
  const [visitsLoading, setVL]    = useState(true);

  useEffect(() => {
    let alive = true;
    setVL(true);
    supabase
      .from("page_visits")
      .select("id, url, path, referrer, created_at, tracked_pages(title, funnel)")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (!alive) return;
        setVisits(data || []);
        setVL(false);
      });
    return () => { alive = false; };
  }, [lead.id]);

  const funnelColor = (f) => ({ topo:"#06B6D4", meio:"#F59E0B", fundo:"#14A273", institucional:"#7C5CFF" }[f] || T.muted);
  const fmtDate = (d) => {
    const dt = new Date(d);
    const today = new Date();
    const diff = (today - dt) / 36e5;
    if (diff < 1)  return Math.round(diff*60) + "min";
    if (diff < 24) return Math.round(diff) + "h";
    return dt.toLocaleDateString("pt-BR", { day:"2-digit", month:"short" });
  };

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, width: 340, height: "100vh",
      background: T.surface, borderLeft: `1px solid ${T.border}`,
      boxShadow: "-8px 0 32px rgba(0,0,0,.08)", zIndex: 20,
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: T.head, fontWeight: 700, fontSize: 14, color: T.text }}>Detalhes</span>
        <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: T.muted }}><X size={17} /></button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {/* Avatar + nome */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%", background: T.teal,
            color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: T.head, fontWeight: 700, fontSize: 18,
          }}>
            {(lead.name || lead.email || "?")[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: T.text, fontSize: 15, fontFamily: T.head }}>{lead.name || "—"}</div>
            <div style={{ fontSize: 12, color: T.muted, fontFamily: T.font }}>{lead.email}</div>
          </div>
        </div>

        {/* Score + Stage */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: score.bg, color: score.color, fontFamily: T.font }}>
            {lead.score || 0} pts — {score.label}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: stage.bg, color: stage.color, fontFamily: T.font }}>
            {lead.stage || "Visitor"}
          </span>
        </div>

        {/* Campos */}
        {[
          { icon: Phone,    label: "Telefone",  val: lead.phone    },
          { icon: Building2,label: "Empresa",   val: lead.company  },
          { icon: Star,     label: "Fonte",     val: lead.source   },
        ].map(({ icon: Icon, label, val }) => val && (
          <div key={label} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
            <Icon size={14} color={T.muted} />
            <div>
              <div style={{ fontSize: 11, color: T.muted, fontFamily: T.font }}>{label}</div>
              <div style={{ fontSize: 13, color: T.text, fontFamily: T.font }}>{val}</div>
            </div>
          </div>
        ))}

        {/* Tags */}
        {lead.tags?.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 6, display: "flex", alignItems: "center", gap: 4, fontFamily: T.font }}>
              <Tag size={11} /> Tags
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {lead.tags.map(t => (
                <span key={t} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, background: "#e0f4ff", color: T.teal, fontWeight: 600, fontFamily: T.font }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div style={{ marginTop: 20, padding: 12, background: T.bg, borderRadius: 10 }}>
          <div style={{ fontSize: 11, color: T.muted, marginBottom: 6, display: "flex", alignItems: "center", gap: 4, fontFamily: T.font }}>
            <Clock size={11} /> Histórico
          </div>
          <div style={{ fontSize: 12, color: T.text, fontFamily: T.font }}>
            Criado: {new Date(lead.created_at).toLocaleDateString("pt-BR")}<br />
            Atualizado: {new Date(lead.updated_at).toLocaleDateString("pt-BR")}
          </div>
        </div>

        {/* Últimas visitas (Lead Tracking) */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 11, color: T.muted, marginBottom: 8, display: "flex", alignItems: "center", gap: 4, fontFamily: T.font }}>
            <Activity size={11} /> Últimas visitas
            {visits.length > 0 && <span style={{ marginLeft: "auto", fontSize: 10, color: T.faint3 }}>{visits.length} {visits.length === 1 ? "visita" : "visitas"}</span>}
          </div>
          {visitsLoading && (
            <div style={{ fontSize: 12, color: T.muted, padding: 10, textAlign: "center", fontFamily: T.font }}>Carregando...</div>
          )}
          {!visitsLoading && visits.length === 0 && (
            <div style={{ fontSize: 12, color: T.muted, padding: "10px 12px", background: T.bg, borderRadius: 8, fontFamily: T.font }}>
              Nenhuma visita registrada ainda. Instale o tracker.js no site.
            </div>
          )}
          {!visitsLoading && visits.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 240, overflowY: "auto" }}>
              {visits.map(v => {
                const c = funnelColor(v.tracked_pages?.funnel);
                return (
                  <div key={v.id} style={{ padding: "8px 10px", background: T.bg, borderRadius: 8, borderLeft: `3px solid ${c}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <MousePointer size={10} color={c} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.font, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {v.tracked_pages?.title || v.path || v.url}
                      </span>
                      <span style={{ fontSize: 10, color: T.muted, fontFamily: T.mono, whiteSpace: "nowrap" }}>{fmtDate(v.created_at)}</span>
                    </div>
                    <div style={{ fontSize: 10, color: T.muted, fontFamily: T.mono, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.url}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Custom fields */}
        {lead.custom_fields && Object.keys(lead.custom_fields).length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 8, fontFamily: T.font }}>Campos customizados</div>
            {Object.entries(lead.custom_fields).map(([k, v]) => (
              <div key={k} style={{ fontSize: 12, color: T.text, marginBottom: 4, fontFamily: T.font }}>
                <strong>{k}:</strong> {String(v)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ações */}
      <div style={{ padding: 16, borderTop: `1px solid ${T.border}`, display: "flex", gap: 8 }}>
        <button onClick={onEdit} style={{
          flex: 1, padding: "9px 0", border: `1px solid ${T.teal}`, borderRadius: 8,
          background: "transparent", color: T.teal, fontSize: 13, fontWeight: 600,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          fontFamily: T.font,
        }}>
          <Edit2 size={13} /> Editar
        </button>
        <button onClick={onDelete} style={{
          flex: 1, padding: "9px 0", border: `1px solid #fca5a5`, borderRadius: 8,
          background: "#fff5f5", color: T.danger, fontSize: 13, fontWeight: 600,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          fontFamily: T.font,
        }}>
          <Trash2 size={13} /> Excluir
        </button>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────
export default function LeadsModule() {
  const [leads, setLeads]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [stageFilter, setStageFilter] = useState("Todos");
  const [showModal, setShowModal] = useState(false);
  const [editLead, setEditLead]   = useState(null);
  const [selected, setSelected]   = useState(null);
  const [error, setError]         = useState(null);
  const [sparkData, setSparkData] = useState({ total: [], hot: [], mql: [], customer: [] });

  useEffect(() => {
    const loadSpark = async () => {
      const sevenAgo = new Date();
      sevenAgo.setMonth(sevenAgo.getMonth() - 7);
      const { data } = await supabase.from("leads").select("created_at, stage, score").gte("created_at", sevenAgo.toISOString());
      const now = new Date();
      const buckets = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1);
        return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, total: 0, hot: 0, mql: 0, customer: 0 };
      });
      (data || []).forEach(r => {
        const d = new Date(r.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const b = buckets.find(m => m.key === key);
        if (!b) return;
        b.total++;
        if (r.score >= 51) b.hot++;
        if (r.stage === "MQL") b.mql++;
        if (r.stage === "Customer") b.customer++;
      });
      setSparkData({ total: buckets.map(b => b.total), hot: buckets.map(b => b.hot), mql: buckets.map(b => b.mql), customer: buckets.map(b => b.customer) });
    };
    loadSpark();
  }, []);

  // Estatísticas rápidas
  const stats = {
    total:    leads.length,
    hot:      leads.filter(l => l.score >= 51).length,
    mql:      leads.filter(l => l.stage === "MQL").length,
    customer: leads.filter(l => l.stage === "Customer").length,
  };

  const fetchLeads = useCallback(async () => {
    setLoading(true); setError(null);
    let query = supabase.from("leads").select("*").order("created_at", { ascending: false });
    if (stageFilter !== "Todos") query = query.eq("stage", stageFilter);
    if (search.trim()) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
    const { data, error: err } = await query;
    setLoading(false);
    if (err) { setError(err.message); return; }
    setLeads(data || []);
  }, [search, stageFilter]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleDelete = async (id) => {
    if (!confirm("Excluir este lead?")) return;
    await supabase.from("leads").delete().eq("id", id);
    setSelected(null);
    fetchLeads();
  };

  const handleSaved = () => {
    setShowModal(false);
    setEditLead(null);
    fetchLeads();
  };

  const filtered = leads; // filtro já aplicado no Supabase

  return (
    <div style={{ display: "flex", height: "100vh", background: T.bg, fontFamily: T.font, overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #B3BFCA; border-radius: 99px; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(20,162,115,0.3); }
          50%       { box-shadow: 0 0 0 6px rgba(20,162,115,0.1); }
        }
        @keyframes pulse-live {
          0%, 100% { box-shadow: 0 0 0 0 rgba(6,182,212,0.6); }
          50%       { box-shadow: 0 0 0 8px rgba(6,182,212,0); }
        }
      `}</style>

      <Sidebar />

      {/* Main */}
      <main style={{ marginLeft: 240, flex: 1, overflowY: "auto", paddingRight: selected ? 340 : 0, background: "linear-gradient(180deg, #FEF9EF 0%, #FFF4E8 100%)" }}>
        <div style={{ padding: 32 }}>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
            <div>
              <h1 style={{ fontFamily: T.head, fontWeight: 800, fontSize: 22, color: T.ink, margin: 0, letterSpacing: "-0.02em" }}>
                Leads
              </h1>
              <p style={{ fontSize: 13, color: T.muted, margin: "4px 0 0", fontFamily: T.font, fontWeight: 500 }}>
                Gerencie e acompanhe sua base de contatos
              </p>
            </div>
            <button onClick={() => { setEditLead(null); setShowModal(true); }} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "10px 18px",
              background: "linear-gradient(135deg, #0D7491 0%, #14A273 100%)",
              color: "#fff", border: "none", borderRadius: 10,
              fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: T.font,
              boxShadow: "0 4px 14px -4px rgba(13,116,145,.4)",
              transition: "all 0.15s",
            }}>
              <Plus size={15} /> Novo Lead
            </button>
          </div>

          {/* Hero KPI cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
            <HeroKpiCard icon={Users}        color={T.teal}   trend={0}
              label="Total de Leads"
              value={stats.total.toLocaleString("pt-BR")}
              sub={`${leads.length} carregados`}
              sparkData={sparkData.total}
            />
            <HeroKpiCard icon={TrendingUp}   color={T.coral}  trend={0}
              label="Leads Quentes"
              value={stats.hot.toLocaleString("pt-BR")}
              sub={`score ≥ 51`}
              sparkData={sparkData.hot}
            />
            <HeroKpiCard icon={Star}         color={T.violet} trend={0}
              label="MQLs"
              value={stats.mql.toLocaleString("pt-BR")}
              sub="qualificados marketing"
              sparkData={sparkData.mql}
            />
            <HeroKpiCard icon={CheckCircle}  color={T.green}  trend={0}
              label="Clientes"
              value={stats.customer.toLocaleString("pt-BR")}
              sub="stage Customer"
              sparkData={sparkData.customer}
            />
          </div>

          {/* Busca + filtro */}
          <div style={{ display: "flex", gap: 12, marginBottom: 18, alignItems: "center" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: T.muted }} />
              <input
                placeholder="Buscar por nome, e-mail ou empresa…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: "100%", padding: "9px 12px 9px 36px", border: `1px solid ${T.border}`,
                  borderRadius: 10, fontSize: 13, color: T.text, background: T.surface,
                  outline: "none", boxSizing: "border-box", fontFamily: T.font,
                }}
              />
            </div>
            <div style={{ position: "relative" }}>
              <select
                value={stageFilter}
                onChange={e => setStageFilter(e.target.value)}
                style={{
                  padding: "9px 36px 9px 14px", border: `1px solid ${T.border}`, borderRadius: 10,
                  fontSize: 13, color: T.text, background: T.surface, cursor: "pointer", appearance: "none",
                  fontFamily: T.font,
                }}
              >
                <option value="Todos">Todos os estágios</option>
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: T.muted, pointerEvents: "none" }} />
            </div>
          </div>

          {/* Erro */}
          {error && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", color: T.danger, background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, fontFamily: T.font }}>
              <AlertCircle size={15} /> {error}
            </div>
          )}

          {/* Tabela */}
          <div style={{
            background: T.surface, borderRadius: 14,
            boxShadow: "0 1px 0 rgba(14,26,36,.03), 0 8px 24px -16px rgba(14,26,36,.08)",
            border: `1px solid ${T.border}`,
            overflow: "hidden",
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: T.faint }}>
                  {["Lead", "Empresa", "Estágio", "Score", "Tags", "Fonte", ""].map(h => (
                    <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: T.muted, fontFamily: T.head, textTransform: "uppercase", letterSpacing: .5 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: 48, color: T.muted }}>
                      <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: 48, color: T.muted, fontSize: 14, fontFamily: T.font }}>
                      Nenhum lead encontrado.
                    </td>
                  </tr>
                ) : (
                  filtered.map(lead => {
                    const sc = scoreBadge(lead.score || 0);
                    const st = stageBadge(lead.stage);
                    const isSelected = selected?.id === lead.id;
                    return (
                      <tr key={lead.id}
                        onClick={() => setSelected(isSelected ? null : lead)}
                        style={{
                          borderTop: `1px solid ${T.border}`,
                          background: isSelected ? `${T.teal}08` : "transparent",
                          cursor: "pointer", transition: "background .1s",
                        }}
                        onMouseEnter={e => !isSelected && (e.currentTarget.style.background = T.faint)}
                        onMouseLeave={e => !isSelected && (e.currentTarget.style.background = "transparent")}
                      >
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: T.teal, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                              {(lead.name || lead.email || "?")[0].toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13, color: T.text, fontFamily: T.font }}>{lead.name || "—"}</div>
                              <div style={{ fontSize: 11, color: T.muted, fontFamily: T.font }}>{lead.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: 13, color: T.text, fontFamily: T.font }}>{lead.company || "—"}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: st.bg, color: st.color, fontFamily: T.font }}>
                            {lead.stage || "Visitor"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: sc.bg, color: sc.color, fontFamily: T.font }}>
                            {lead.score || 0}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {(lead.tags || []).slice(0, 2).map(t => (
                              <span key={t} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: `${T.teal}14`, color: T.teal, fontWeight: 600, fontFamily: T.font }}>{t}</span>
                            ))}
                            {(lead.tags || []).length > 2 && (
                              <span style={{ fontSize: 10, color: T.muted, fontFamily: T.font }}>+{lead.tags.length - 2}</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: 12, color: T.muted, fontFamily: T.font }}>{lead.source || "—"}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <button
                            onClick={e => { e.stopPropagation(); setEditLead(lead); setShowModal(true); }}
                            style={{ border: "none", background: "transparent", cursor: "pointer", color: T.muted, padding: 4 }}
                          >
                            <Edit2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Contagem */}
          {!loading && (
            <div style={{ fontSize: 12, color: T.muted, marginTop: 12, textAlign: "right", fontFamily: T.font }}>
              {filtered.length} lead{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </main>

      {/* Painel lateral */}
      {selected && (
        <LeadPanel
          lead={selected}
          onClose={() => setSelected(null)}
          onEdit={() => { setEditLead(selected); setShowModal(true); }}
          onDelete={() => handleDelete(selected.id)}
        />
      )}

      {/* Modal */}
      {showModal && (
        <LeadModal
          lead={editLead}
          onClose={() => { setShowModal(false); setEditLead(null); }}
          onSave={handleSaved}
        />
      )}
    </div>
  );
}
