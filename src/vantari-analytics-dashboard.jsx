import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabase";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, ComposedChart
} from "recharts";
import {
  BarChart2, Filter, FileText, Radio, Zap, Upload,
  Users, Mail, Star, LayoutTemplate, Bot, Plug, Settings,
  TrendingUp, TrendingDown, DollarSign, User, Link2,
  RefreshCw, Download, Plus, Pencil, Save, X,
  Hash, Table2, PieChart as PieIcon, BookOpen, KeyRound,
  Monitor, ClipboardList, Activity, Bell, Clock,
  AlertTriangle, AlertCircle, Info, FileSpreadsheet,
  ChevronRight, CheckCircle2
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   DATABASE SCHEMA (Supabase-compatible)
   ─────────────────────────────────────────────────────────
   TABLE: analytics_cache
     id          uuid primary key default gen_random_uuid()
     metric      text not null
     value       jsonb not null
     period      text not null
     calculated_at timestamptz default now()
     workspace_id uuid references workspaces(id)

   TABLE: custom_reports
     id          uuid primary key default gen_random_uuid()
     name        text not null
     config      jsonb not null
     filters     jsonb not null
     owner_id    uuid references users(id)
     shared_with uuid[]
     created_at  timestamptz default now()
     updated_at  timestamptz default now()
     workspace_id uuid references workspaces(id)

   TABLE: dashboard_alerts
     id          uuid primary key default gen_random_uuid()
     name        text not null
     condition   jsonb not null
     recipients  text[]
     channels    text[]
     last_triggered timestamptz
     trigger_count  int default 0
     enabled     bool default true
     workspace_id uuid references workspaces(id)
     created_at  timestamptz default now()
═══════════════════════════════════════════════════════════ */

/* ───── DESIGN TOKENS ───── */
const T = {
  // Brand
  teal:    "#0D7491",
  blue:    "#0D7491",   // compat com refs antigas
  green:   "#14A273",
  brand2:  "#1F76BC",
  deep:    "#0A3D4D",
  gradient: "linear-gradient(135deg, #0D7491 0%, #14A273 100%)",
  sidebarBg: "linear-gradient(180deg, #0D7491 0%, #0A5165 60%, #0A3D4D 100%)",

  // Data accents
  violet:  "#7C5CFF",
  amber:   "#F59E0B",
  orange:  "#F59E0B",   // alias retrocompat
  coral:   "#FF6B5E",
  red:     "#FF6B5E",   // alias retrocompat
  cyan:    "#06B6D4",
  rose:    "#EC4899",
  purple:  "#7C5CFF",   // alias retrocompat

  // Surfaces & ink
  bg:      "#F5F8FB",
  surface: "#FFFFFF",
  border:  "#E8EEF3",

  // Ink scale (text)
  ink:     "#0E1A24",   // títulos grandes
  text:    "#2E3D4B",   // body principal
  muted:   "#5A6B7A",   // secundário
  faint3:  "#8696A5",   // terciário
  faint:   "#F5F8FB",

  // Fonts
  font:    "'Inter', system-ui, sans-serif",
  head:    "'Sora', system-ui, sans-serif",
  mono:    "'JetBrains Mono', monospace",
};

const STAGE_COLORS = {
  Visitor: { bg: "#f1f5f9", text: "#475569", border: "#cbd5e1", hex: "#94a3b8" },
  Lead:    { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe", hex: "#3b82f6" },
  MQL:     { bg: "#fef3c7", text: "#92400e", border: "#fde68a", hex: "#F59E0B" },
  SQL:     { bg: "#f3f0ff", text: "#5b21b6", border: "#c4b5fd", hex: "#7C5CFF" },
  Cliente: { bg: "#f0fdf4", text: "#14532d", border: "#86efac", hex: "#14A273" },
};

/* ───── MOCK DATA ───── */
const monthlyTrend = [];
const channelData = [];
const attributionData = [];

const funnelStages = [
  { name: "Visitor", count: 0, pct: 100,  conv: null, avgDays: null },
  { name: "Lead",    count: 0, pct: 0,    conv: 0,    avgDays: 0    },
  { name: "MQL",     count: 0, pct: 0,    conv: 0,    avgDays: 0    },
  { name: "SQL",     count: 0, pct: 0,    conv: 0,    avgDays: 0    },
  { name: "Cliente", count: 0, pct: 0,    conv: 0,    avgDays: 0    },
];

const liveActivity = [];

const EVENT_ICONS = {
  lead_novo:   User,
  email_open:  Mail,
  sql_convert: Zap,
  email_click: Link2,
  form_submit: ClipboardList,
};

const campaignPerf = [];
const alertsDB = [];
const todayVsYesterday = [];
const leadsPerStage = { Visitor: [], Lead: [], MQL: [], SQL: [], Cliente: [] };
const savedReports = [];

const METRIC_OPTIONS = [
  "Total Leads","MQLs","SQLs","Clientes","Taxa Conversão",
  "Abertura Email","CTR Email","Receita","ROI por Canal","Score Médio",
];

const apiEndpoints = [
  { method: "GET",  path: "/api/v1/analytics/overview",   desc: "KPIs principais e métricas do overview executivo",     auth: "Bearer token" },
  { method: "GET",  path: "/api/v1/analytics/funnel",     desc: "Dados do funil de vendas por etapa",                  auth: "Bearer token" },
  { method: "GET",  path: "/api/v1/analytics/channels",   desc: "Performance e ROI por canal de aquisição",            auth: "Bearer token" },
  { method: "POST", path: "/api/v1/reports/generate",     desc: "Gera relatório personalizado (body: report config)",  auth: "Bearer token" },
  { method: "GET",  path: "/api/v1/dashboard/embed/:id",  desc: "Token embeddable para dashboard específico",          auth: "API Key"      },
  { method: "GET",  path: "/api/v1/alerts",               desc: "Lista e status dos alertas configurados",             auth: "Bearer token" },
];

/* ───── SHARED COMPONENTS ───── */
const Btn = ({ children, onClick, variant = "primary", size = "sm", icon: Icon, disabled, style: s = {} }) => {
  const [hov, setHov] = useState(false);
  const v = {
    primary:   {
      bg: hov
        ? "linear-gradient(135deg, #0A5F7A 0%, #108A60 100%)"
        : "linear-gradient(135deg, #0D7491 0%, #14A273 100%)",
      color: "#fff", border: "none",
      shadow: hov
        ? "0 8px 22px -6px rgba(13,116,145,.5)"
        : "0 4px 14px -4px rgba(13,116,145,.4)",
    },
    secondary: { bg: hov ? `${T.teal}14` : "#fff",  color: T.teal, border: `1.5px solid ${T.teal}`,  shadow: "none" },
    ghost:     { bg: hov ? "#EEF2F6" : "transparent", color: T.text, border: "none",                  shadow: "none" },
    danger:    { bg: hov ? "#e04d42" : T.coral,       color: "#fff", border: "none",                  shadow: "none" },
    success:   { bg: hov ? "#108A60" : T.green,       color: "#fff", border: "none",                  shadow: "none" },
  }[variant] || {};
  const pad = { xs: "4px 8px", sm: "7px 14px", md: "9px 18px", lg: "11px 22px" }[size];
  const fs  = { xs: 10, sm: 12, md: 13, lg: 14 }[size];
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: v.bg, color: v.color, border: v.border || "none",
        borderRadius: 10, padding: pad, fontSize: fs, fontWeight: 700,
        fontFamily: T.font, cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1, boxShadow: v.shadow,
        transition: "all 0.15s",
        transform: hov && variant === "primary" ? "translateY(-1px)" : "none",
        whiteSpace: "nowrap", ...s,
      }}>
      {Icon && <Icon size={fs} aria-hidden="true" />}
      {children}
    </button>
  );
};

const Card = ({ children, style: s = {}, hover = false }) => {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={() => path && navigate(path)}
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 16, padding: 20,
        boxShadow: hov
          ? "0 1px 0 rgba(14,26,36,.04), 0 16px 36px -16px rgba(14,26,36,.15)"
          : "0 1px 0 rgba(14,26,36,.03), 0 8px 24px -16px rgba(14,26,36,.08)",
        transition: "all 0.2s", ...s,
      }}>
      {children}
    </div>
  );
};

const SectionTitle = ({ children, sub }) => (
  <div style={{ marginBottom: 16 }}>
    <h2 style={{ fontSize: 15, fontWeight: 700, color: T.ink, fontFamily: T.head, margin: 0, letterSpacing: "-0.01em" }}>{children}</h2>
    {sub && <p style={{ fontSize: 12, color: T.muted, margin: "4px 0 0", fontFamily: T.font, fontWeight: 500 }}>{sub}</p>}
  </div>
);

const Badge = ({ children, color = T.teal, bg }) => (
  <span style={{ display: "inline-block", background: bg || `${color}18`, color, border: `0.5px solid ${color}30`, borderRadius: 20, padding: "2px 9px", fontSize: 11, fontWeight: 700, fontFamily: T.font }}>
    {children}
  </span>
);

const TrendChip = ({ value }) => {
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: up ? `${T.green}14` : `${T.coral}14`, color: up ? T.green : T.coral, borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700, fontFamily: T.font }}>
      <Icon size={10} aria-hidden="true" /> {Math.abs(value)}%
    </span>
  );
};

const MetricCard = ({ icon: Icon, label, value, trend, color = T.teal, sub }) => (
  <Card hover style={{ borderRadius: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, background: `${color}14`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {Icon && <Icon size={20} color={color} aria-hidden="true" />}
      </div>
      {trend !== undefined && <TrendChip value={trend} />}
    </div>
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 36, fontWeight: 700, color: T.ink, fontFamily: T.head, letterSpacing: "-0.035em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 12, color: T.muted, fontFamily: T.font, marginTop: 4, fontWeight: 600 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color, fontFamily: T.font, marginTop: 3, fontWeight: 700 }}>{sub}</div>}
    </div>
  </Card>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px", boxShadow: "0 4px 16px rgba(14,26,36,0.1)", fontFamily: T.font }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 12, color: p.color, fontWeight: 600 }}>
          {p.name}: <strong>{typeof p.value === "number" && p.value > 1000 ? `${(p.value / 1000).toFixed(1)}k` : p.value}</strong>
        </div>
      ))}
    </div>
  );
};

/* tooltip rico do hero chart — mês + série atual + meta */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 9, padding: "8px 12px", boxShadow: "0 8px 24px -8px rgba(14,26,36,.15)", fontFamily: T.font, minWidth: 148 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.ink, marginBottom: 5, fontFamily: T.head }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, margin: "2px 0" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
          <span style={{ color: T.muted, flex: 1, fontSize: 11.5 }}>{p.name}</span>
          <span style={{ fontFamily: T.mono, fontWeight: 700, color: T.ink, fontSize: 11.5 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

/* ───── FASE 2: HERO KPI COMPONENTS ───── */

/* sparkline SVG na base do KPI card */
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
    <svg
      viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
      style={{ display: "block", width: "calc(100% + 32px)", height: 36, margin: "8px -16px -1px" }}
      aria-hidden="true"
    >
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

/* chip de tendência com JetBrains Mono — usado nos KPI cards */
const TrendChipHero = ({ value }) => {
  const up = value >= 0;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99,
      fontFamily: T.mono,
      background: up ? `${T.green}14` : `${T.coral}14`,
      color: up ? T.green : T.coral,
    }}>
      {up ? "↗" : "↘"} {Math.abs(value)}%
    </span>
  );
};

/* KPI card com barra colorida no topo + sparkline na base */
const HeroKpiCard = ({ icon: Icon, label, value, trend, color, sub, sparkData }) => (
  <div style={{
    background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14,
    padding: "14px 16px 0", position: "relative", overflow: "hidden",
    boxShadow: "0 1px 0 rgba(14,26,36,.03), 0 8px 24px -16px rgba(14,26,36,.08)",
  }}>
    {/* barra colorida no topo */}
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: "14px 14px 0 0" }} />

    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ width: 32, height: 32, borderRadius: 9, background: `${color}14`, display: "grid", placeItems: "center" }}>
        {Icon && <Icon size={16} color={color} aria-hidden="true" />}
      </div>
      {trend !== undefined && <TrendChipHero value={trend} />}
    </div>

    <div style={{ fontSize: 28, fontWeight: 700, color: T.ink, fontFamily: T.head, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", margin: "10px 0 3px", lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 11.5, color: T.muted, fontWeight: 600, fontFamily: T.font }}>{label}</div>
    {sub && <div style={{ fontSize: 10.5, color, fontWeight: 700, fontFamily: T.mono, margin: "2px 0 8px" }}>{sub}</div>}
    {!sub && <div style={{ height: 8 }} />}

    <SparklineChart data={sparkData} color={color} />
  </div>
);

/* ───── SIDEBAR NAV HELPERS ───── */
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

/* ───── FASE 3 HELPERS ───── */

const relTime = (iso) => {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60)   return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
};

const EVENT_META = {
  lead_novo:   { color: T => T.teal,   Icon: User,         fmt: (e, T) => ({ title: `Novo lead · ${e.leads?.name || "Anônimo"}`, sub: <>fonte <b style={{color: T.teal}}>{e.leads?.source || "—"}</b></> }) },
  email_open:  { color: T => T.amber,  Icon: Mail,         fmt: (e, T) => ({ title: `Email aberto · ${e.leads?.name || "Lead"}`,  sub: <>abertura <b style={{color: T.amber}}>{e.data?.rate || "—"}</b></> }) },
  sql_convert: { color: T => T.green,  Icon: Zap,          fmt: (e, T) => ({ title: `${e.leads?.name || "Lead"} atingiu SQL`,     sub: <>score <b style={{color: T.green}}>{e.data?.score || "—"}</b></> }) },
  email_click: { color: T => T.rose,   Icon: Link2,        fmt: (e, T) => ({ title: `Click em email · ${e.leads?.name || "Lead"}`, sub: <>link <b style={{color: T.rose}}>{e.data?.url || "email"}</b></> }) },
  form_submit: { color: T => T.violet, Icon: ClipboardList, fmt: (e, T) => ({ title: `Formulário enviado`,                        sub: <>lead <b style={{color: T.violet}}>{e.leads?.name || "—"}</b></> }) },
};

/* ───── ANEL DE CAMPANHAS (Fase 3) ───── */
const CampaignRing = ({ campaignCount }) => {
  const [stats, setStats] = useState({ open: 0, ctr: 0, conversions: 0, active: campaignCount || 0 });

  useEffect(() => {
    const load = async () => {
      const [{ data: sends }, { count: active }] = await Promise.all([
        supabase.from("campaign_sends").select("opened, clicked, converted"),
        supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("status", "active"),
      ]);
      if (!sends?.length) return;
      const total     = sends.length;
      const opened    = sends.filter(s => s.opened).length;
      const clicked   = sends.filter(s => s.clicked).length;
      const converted = sends.filter(s => s.converted).length;
      setStats({
        open:        parseFloat(((opened    / total) * 100).toFixed(1)),
        ctr:         parseFloat(((clicked   / total) * 100).toFixed(1)),
        conversions: converted,
        active:      active || 0,
      });
    };
    load();
  }, [campaignCount]);

  /* SVG concentric rings */
  const rings = [
    { r: 95, pct: stats.open, color: T.teal,   circ: 2 * Math.PI * 95 },
    { r: 75, pct: stats.ctr,  color: T.green,  circ: 2 * Math.PI * 75 },
    { r: 55, pct: Math.min(stats.conversions, 100), color: T.violet, circ: 2 * Math.PI * 55 },
  ];

  const legend = [
    { color: T.teal,   label: "Abertura média",  delta: "vs anterior",     value: `${stats.open}%`         },
    { color: T.green,  label: "CTR médio",        delta: "vs anterior",     value: `${stats.ctr}%`          },
    { color: T.violet, label: "Conversões",       delta: "este mês",        value: stats.conversions        },
    { color: T.amber,  label: "Campanhas",        delta: `${stats.active} ativas`, value: campaignCount || 0 },
  ];

  return (
    <Card>
      <SectionTitle sub="últimas campanhas enviadas">Campanhas</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 16, alignItems: "center" }}>
        {/* anel SVG */}
        <div style={{ position: "relative", width: 180, height: 180, flexShrink: 0 }}>
          <svg viewBox="0 0 220 220" style={{ width: 180, height: 180 }}>
            <g transform="translate(110,110)">
              {rings.map((ring, i) => {
                const offset = ring.circ * (1 - Math.min(ring.pct, 100) / 100);
                return (
                  <g key={i}>
                    <circle r={ring.r} fill="none" stroke={ring.color + "20"} strokeWidth={14} />
                    <circle r={ring.r} fill="none" stroke={ring.color} strokeWidth={14}
                      strokeLinecap="round"
                      strokeDasharray={ring.circ.toFixed(1)}
                      strokeDashoffset={offset.toFixed(1)}
                      transform="rotate(-90)"
                      style={{ transition: "stroke-dashoffset 1s ease" }}
                    />
                  </g>
                );
              })}
            </g>
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center", pointerEvents: "none" }}>
            <div>
              <div style={{ fontFamily: T.head, fontSize: 26, fontWeight: 700, letterSpacing: "-0.03em", color: T.ink, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                {stats.conversions}
              </div>
              <div style={{ fontSize: 9.5, color: T.faint3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", lineHeight: 1.4, marginTop: 3 }}>
                conversões<br />este mês
              </div>
            </div>
          </div>
        </div>

        {/* legenda */}
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {legend.map((row, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "14px 1fr auto", alignItems: "center", gap: 10, padding: "7px 10px", background: T.faint, borderRadius: 10 }}>
              <div style={{ width: 14, height: 14, borderRadius: "50%", background: row.color }} />
              <div>
                <div style={{ fontSize: 11.5, color: T.muted, fontWeight: 600, fontFamily: T.font }}>{row.label}</div>
                <div style={{ fontSize: 10.5, color: T.faint3, fontFamily: T.mono }}>{row.delta}</div>
              </div>
              <div style={{ fontFamily: T.head, fontWeight: 700, fontSize: 17, color: T.ink, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>{row.value}</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

/* ═══════════════════════════════════════════════════════════
   SECTION 1 — OVERVIEW EXECUTIVO
═══════════════════════════════════════════════════════════ */
const OverviewSection = () => {
  const [activeMetric, setActiveMetric] = useState("leads");
  const [kpis,        setKpis]        = useState({ leads: 0, mqls: 0, sqls: 0, campaigns: 0 });
  const [monthlyData, setMonthlyData] = useState([]);
  const [sparkData,   setSparkData]   = useState({ leads: [], mqls: [], sqls: [], conv: [] });
  const [alerts,      setAlerts]      = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const sevenMonthsAgo = new Date();
      sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);

      const [
        { count: leads },
        { count: mqls },
        { count: sqls },
        { count: campaigns },
        { data: rawLeads },
        { data: alertData },
      ] = await Promise.all([
        supabase.from("leads").select("*", { count: "exact", head: true }),
        supabase.from("leads").select("*", { count: "exact", head: true }).eq("stage", "MQL"),
        supabase.from("leads").select("*", { count: "exact", head: true }).eq("stage", "SQL"),
        supabase.from("campaigns").select("*", { count: "exact", head: true }).eq("status", "sent"),
        supabase.from("leads").select("created_at, stage").gte("created_at", sevenMonthsAgo.toISOString()),
        supabase.from("dashboard_alerts").select("id, name, condition, last_triggered, trigger_count, enabled").eq("enabled", true).order("last_triggered", { ascending: false }).limit(6),
      ]);

      setKpis({ leads: leads || 0, mqls: mqls || 0, sqls: sqls || 0, campaigns: campaigns || 0 });

      /* agrupa em buckets mensais para sparkline + chart */
      const now = new Date();
      const buckets = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1);
        return {
          key:    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
          month:  d.toLocaleString("pt-BR", { month: "short" }),
          leads:  0, mqls: 0, sqls: 0, receita: 0,
        };
      });

      (rawLeads || []).forEach(r => {
        const d   = new Date(r.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const b   = buckets.find(m => m.key === key);
        if (!b) return;
        b.leads++;
        if (r.stage === "MQL") b.mqls++;
        if (r.stage === "SQL") b.sqls++;
      });

      /* linha de meta: rampa simples baseada no total atual */
      const goalBase = Math.max(20, Math.round((leads || 0) / 6));
      const withGoal = buckets.map((b, i) => ({
        ...b,
        goal: goalBase + Math.round(goalBase * 0.12 * i),
      }));

      setMonthlyData(withGoal);
      setSparkData({
        leads: buckets.map(b => b.leads),
        mqls:  buckets.map(b => b.mqls),
        sqls:  buckets.map(b => b.sqls),
        conv:  buckets.map(b => b.leads > 0 ? parseFloat((b.sqls / b.leads * 100).toFixed(2)) : 0),
      });
      setAlerts(alertData || []);
    };
    fetchData();
  }, []);

  const convRate = kpis.leads > 0 ? (kpis.sqls / kpis.leads * 100).toFixed(2) : "0";
  const mqlRate  = kpis.leads > 0 ? (kpis.mqls / kpis.leads * 100).toFixed(1) : "0";
  const sqlRate  = kpis.leads > 0 ? (kpis.sqls / kpis.leads * 100).toFixed(1) : "0";
  const prevMonth = sparkData.leads.at(-2) || 0;
  const thisMonth = sparkData.leads.at(-1) || 0;
  const leadsDelta = thisMonth - prevMonth;

  const lineKeys = {
    leads:   { key: "leads",   color: T.teal,   label: "Leads"        },
    mqls:    { key: "mqls",    color: T.amber,   label: "MQLs"         },
    sqls:    { key: "sqls",    color: T.violet,  label: "SQLs"         },
    receita: { key: "receita", color: T.green,   label: "Receita (R$)" },
  };
  const activeMeta = lineKeys[activeMetric];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── Hero KPI cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <HeroKpiCard
          icon={Users}      color={T.teal}   trend={12.4}
          label="Total de Leads"
          value={kpis.leads.toLocaleString("pt-BR")}
          sub={leadsDelta >= 0 ? `+${leadsDelta} vs anterior` : `${leadsDelta} vs anterior`}
          sparkData={sparkData.leads}
        />
        <HeroKpiCard
          icon={Star}       color={T.amber}  trend={8.7}
          label="MQLs este mês"
          value={kpis.mqls.toLocaleString("pt-BR")}
          sub={`Taxa MQL · ${mqlRate}%`}
          sparkData={sparkData.mqls}
        />
        <HeroKpiCard
          icon={Zap}        color={T.violet} trend={15.2}
          label="SQLs qualificados"
          value={kpis.sqls.toLocaleString("pt-BR")}
          sub={`Taxa SQL · ${sqlRate}%`}
          sparkData={sparkData.sqls}
        />
        <HeroKpiCard
          icon={DollarSign} color={T.green}  trend={3.1}
          label="Taxa de Conversão"
          value={`${convRate}%`}
          sub="R$ — receita"
          sparkData={sparkData.conv}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
        {/* ── Hero chart ── */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <div>
              <SectionTitle>Crescimento Mensal</SectionTitle>
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              {Object.entries(lineKeys).map(([k, v]) => (
                <button key={k} onClick={() => setActiveMetric(k)}
                  style={{
                    padding: "4px 9px", borderRadius: 7, cursor: "pointer",
                    border: `1px solid ${activeMetric === k ? v.color : T.border}`,
                    background: activeMetric === k ? `${v.color}14` : "transparent",
                    fontSize: 11, fontWeight: 600,
                    color: activeMetric === k ? v.color : T.muted,
                    fontFamily: T.font,
                    display: "inline-flex", alignItems: "center", gap: 5,
                  }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: v.color, flexShrink: 0 }} />
                  {v.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 11, color: T.faint3, fontFamily: T.mono, marginBottom: 12 }}>
            {new Date().getFullYear()} · — meta dashed verde
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={activeMeta.color} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={activeMeta.color} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 4" stroke="#EEF2F6" />
              <XAxis dataKey="month" tick={{ fontSize: 9, fontFamily: T.mono, fill: T.faint3 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fontFamily: T.font, fill: T.muted }} axisLine={false} tickLine={false} width={32} />
              <Tooltip
                cursor={{ stroke: activeMeta.color, strokeWidth: 1, opacity: 0.4 }}
                content={<ChartTooltip />}
              />
              <Area
                type="monotone" dataKey={activeMeta.key} name={activeMeta.label}
                stroke={activeMeta.color} strokeWidth={2.5} fill="url(#areaGrad)"
                dot={{ fill: "#fff", stroke: activeMeta.color, strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, fill: activeMeta.color, stroke: "#fff", strokeWidth: 2 }}
              />
              <Line
                type="monotone" dataKey="goal" name="Meta"
                stroke={T.green} strokeWidth={1.5} strokeDasharray="6 4"
                dot={false} opacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <CampaignRing campaignCount={kpis.campaigns} />
      </div>

      {/* Alerts */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <SectionTitle>Alertas Importantes</SectionTitle>
          <Badge color={T.coral}>{alerts.length} ativos</Badge>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          {alerts.length === 0 && (
            <div style={{ gridColumn: "1/-1", fontSize: 12, color: T.muted, fontFamily: T.font, padding: "20px 0", textAlign: "center" }}>
              Nenhum alerta ativo
            </div>
          )}
          {alerts.map((a, idx) => {
            const sev = idx === 0
              ? { color: T.coral,  anim: "pulse-coral",  label: "Crítico", Icon: AlertTriangle }
              : idx === 1
              ? { color: T.amber,  anim: "pulse-amber",  label: "Atenção", Icon: AlertCircle  }
              :   { color: T.cyan,  anim: "pulse-cyan2",  label: "Info",    Icon: Info         };
            const condStr = a.condition && typeof a.condition === "object"
              ? Object.entries(a.condition).map(([k, v]) => `${k} ${v}`).join(" · ")
              : String(a.condition || "—");
            const lastFired = a.last_triggered ? relTime(a.last_triggered) : "—";
            const SevIcon = sev.Icon;
            return (
              <div key={a.id} style={{ position: "relative", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 18px 14px 22px", overflow: "hidden" }}>
                {/* barra colorida esquerda */}
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: sev.color, borderRadius: "12px 0 0 12px" }} />
                {/* pill severidade */}
                <span style={{ position: "absolute", right: 14, top: 14, display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, color: sev.color, fontFamily: T.mono, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: sev.color, animation: `${sev.anim} 1.5s infinite`, flexShrink: 0 }} />
                  {sev.label}
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "40px 1fr", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ width: 40, height: 40, background: `${sev.color}14`, color: sev.color, borderRadius: 10, display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <SevIcon size={18} aria-hidden="true" />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, fontFamily: T.head, marginBottom: 4, paddingRight: 56 }}>{a.name}</div>
                    <div style={{ fontSize: 11.5, color: T.muted }}>
                      Condição:{" "}
                      <code style={{ fontFamily: T.mono, background: `${sev.color}14`, color: sev.color, padding: "1px 6px", borderRadius: 4, fontWeight: 600, fontSize: 11 }}>{condStr}</code>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 11, color: sev.color, fontFamily: T.mono, fontWeight: 600 }}>
                      Último disparo · {lastFired} · {a.trigger_count || 0} ocorrências
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SECTION 2 — FUNIL DE VENDAS
═══════════════════════════════════════════════════════════ */
const FUNNEL_STAGES = [
  { key: "Lead",     label: "Leads",     sub: "cadastro",        color: T.brand2 },
  { key: "MQL",      label: "MQLs",      sub: "marketing",       color: T.amber  },
  { key: "SQL",      label: "SQLs",      sub: "vendas",          color: T.violet },
  { key: "Customer", label: "Clientes",  sub: "conversão final", color: T.green  },
];

const FunnelSection = () => {
  const [stageCounts, setStageCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("leads").select("stage");
      const counts = {};
      (data || []).forEach(r => { counts[r.stage] = (counts[r.stage] || 0) + 1; });
      setStageCounts(counts);
      setLoading(false);
    };
    load();
  }, []);

  const counts  = FUNNEL_STAGES.map(s => stageCounts[s.key] || 0);
  const maxCount = Math.max(...counts, 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card>
        <SectionTitle sub="Distribuição real por etapa do funil — dados ao vivo">Funil de Vendas</SectionTitle>
        {loading ? (
          <div style={{ fontSize: 12, color: T.muted, fontFamily: T.font, padding: "20px 0", textAlign: "center" }}>Carregando…</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {FUNNEL_STAGES.map((s, i) => {
              const count    = counts[i];
              const prev     = i > 0 ? counts[i - 1] : count;
              const barPct   = maxCount > 0 ? Math.max((count / maxCount) * 100, count > 0 ? 3 : 0) : 0;
              const totalPct = counts[0] > 0 ? ((count / counts[0]) * 100).toFixed(1) : "0";
              const conv     = prev > 0 ? ((count / prev) * 100).toFixed(1) : null;

              return (
                <div key={s.key} style={{ display: "flex", flexDirection: "column" }}>
                  {/* chip de conversão entre linhas */}
                  {i > 0 && conv !== null && (
                    <div style={{ paddingLeft: 134, paddingBottom: 2 }}>
                      <span style={{ background: "white", border: `1px solid ${T.border}`, borderRadius: 99, padding: "1px 7px", fontSize: 10, fontFamily: T.mono, fontWeight: 700, color: T.green }}>
                        ↘ {conv}%
                      </span>
                    </div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 90px", gap: 14, alignItems: "center", padding: "10px 0", cursor: "default" }}>
                    {/* nome */}
                    <div style={{ fontFamily: T.head, fontWeight: 600, fontSize: 13, color: T.ink, display: "flex", flexDirection: "column", gap: 1 }}>
                      {s.label}
                      <span style={{ fontSize: 10.5, color: T.faint3, fontFamily: T.mono, fontWeight: 500 }}>{s.sub}</span>
                    </div>
                    {/* barra */}
                    <div style={{ height: 32, background: T.faint, borderRadius: 9, overflow: "hidden", position: "relative" }}>
                      <div style={{
                        height: "100%", width: `${barPct}%`,
                        background: s.color, borderRadius: 9,
                        display: "flex", alignItems: "center", padding: "0 12px",
                        color: "white", fontWeight: 700, fontFamily: T.mono, fontSize: 12,
                        position: "relative", transition: "width 0.8s ease",
                        minWidth: count > 0 ? 40 : 0,
                      }}>
                        {count > 0 ? count.toLocaleString("pt-BR") : ""}
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent 60%, rgba(255,255,255,.18))", borderRadius: 9, pointerEvents: "none" }} />
                      </div>
                      {count === 0 && (
                        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: T.faint3, fontFamily: T.mono, fontWeight: 600 }}>0</span>
                      )}
                    </div>
                    {/* meta */}
                    <div style={{ fontSize: 11, color: T.muted, textAlign: "right", fontFamily: T.font }}>
                      <b style={{ color: T.ink, fontFamily: T.mono, fontWeight: 700 }}>{totalPct}%</b>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* mini KPI cards por etapa */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {FUNNEL_STAGES.map((s, i) => (
          <Card key={s.key} style={{ padding: 14, borderRadius: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: T.muted, fontFamily: T.font, fontWeight: 600 }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: T.ink, fontFamily: T.head, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>
              {(counts[i] || 0).toLocaleString("pt-BR")}
            </div>
            {i > 0 && counts[i - 1] > 0 && (
              <div style={{ fontSize: 10, color: s.color, fontFamily: T.mono, fontWeight: 700, marginTop: 4 }}>
                {((counts[i] / counts[i - 1]) * 100).toFixed(1)}% da etapa anterior
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SECTION 3 — RELATÓRIOS PERSONALIZÁVEIS
═══════════════════════════════════════════════════════════ */
const WIDGET_TYPES = [
  { id: "big_number", icon: Hash,       label: "Número grande"    },
  { id: "line_chart", icon: TrendingUp, label: "Gráfico de linha" },
  { id: "bar_chart",  icon: BarChart2,  label: "Gráfico de barra" },
  { id: "pie_chart",  icon: PieIcon,    label: "Gráfico pizza"    },
  { id: "table",      icon: Table2,     label: "Tabela"           },
];

const ReportBuilder = () => {
  const [widgets,       setWidgets]       = useState([
    { id: "w1", type: "big_number", metric: "Total Leads", col: 0, row: 0 },
    { id: "w2", type: "line_chart", metric: "MQLs",        col: 1, row: 0 },
    { id: "w3", type: "bar_chart",  metric: "Receita",     col: 2, row: 0 },
  ]);
  const [dragOver,      setDragOver]      = useState(null);
  const [dragging,      setDragging]      = useState(null);
  const [filters,       setFilters]       = useState({ dateRange: "30d", source: "Todos", segment: "Todos" });
  const [activeReport,  setActiveReport]  = useState(1);
  const [showAddWidget, setShowAddWidget] = useState(false);

  const addWidget   = (type) => { const newW = { id: `w${Date.now()}`, type: type.id, metric: METRIC_OPTIONS[0], col: widgets.length % 3, row: Math.floor(widgets.length / 3) }; setWidgets([...widgets, newW]); setShowAddWidget(false); };
  const removeWidget = (id) => setWidgets(widgets.filter(w => w.id !== id));

  const WidgetPreview = ({ w }) => {
    const WIcon = WIDGET_TYPES.find(t => t.id === w.type)?.icon || Hash;
    const mini = {
      big_number: () => (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 80 }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: T.teal, fontFamily: T.head, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>5.640</div>
          <div style={{ fontSize: 11, color: T.muted, fontFamily: T.font, fontWeight: 600 }}>{w.metric}</div>
        </div>
      ),
      line_chart: () => (
        <ResponsiveContainer width="100%" height={80}>
          <LineChart data={monthlyTrend.slice(-6)}>
            <Line type="monotone" dataKey="leads" stroke={T.teal} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      ),
      bar_chart: () => (
        <ResponsiveContainer width="100%" height={80}>
          <BarChart data={monthlyTrend.slice(-6)}>
            <Bar dataKey="mqls" fill={T.teal} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ),
      pie_chart: () => (
        <ResponsiveContainer width="100%" height={80}>
          <PieChart>
            <Pie data={[{ value: 38 }, { value: 24 }, { value: 18 }, { value: 20 }]} cx="50%" cy="50%" outerRadius={30} dataKey="value">
              {[T.teal, T.green, T.violet, T.amber].map((c, i) => <Cell key={i} fill={c} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      ),
      table: () => (
        <div style={{ fontSize: 11, color: T.muted, fontFamily: T.font, fontWeight: 600, padding: 8 }}>
          {["Canal","Leads","Conv."].map((h, i) => <div key={i} style={{ display: "inline-block", marginRight: 16, fontWeight: 700 }}>{h}</div>)}
          {["Organic — 1840 — 4.2%", "Google — 1320 — 3.1%"].map((r, i) => (
            <div key={i} style={{ fontSize: 10, color: T.text, marginTop: 4, fontWeight: 600 }}>{r}</div>
          ))}
        </div>
      ),
    };
    const Preview = mini[w.type] || mini.big_number;
    return (
      <div draggable onDragStart={() => setDragging(w.id)}
        onDragOver={(e) => { e.preventDefault(); setDragOver(w.id); }}
        onDragEnd={() => { setDragging(null); setDragOver(null); }}
        style={{ background: dragOver === w.id ? `${T.teal}0a` : T.surface, border: `1.5px ${dragging === w.id ? "dashed" : "solid"} ${dragOver === w.id ? T.teal : T.border}`, borderRadius: 12, padding: "12px 14px", cursor: "grab", transition: "all 0.15s", position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: T.text, fontFamily: T.font }}>
            <WIcon size={12} color={T.teal} aria-hidden="true" /> {w.metric}
          </span>
          <button onClick={() => removeWidget(w.id)} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontSize: 14, display: "flex", alignItems: "center" }}>
            <X size={14} aria-hidden="true" />
          </button>
        </div>
        <Preview />
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <SectionTitle>Relatórios Salvos</SectionTitle>
          <Btn icon={Plus} onClick={() => {}}>Novo relatório</Btn>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {savedReports.map(r => (
            <div key={r.id} onClick={() => setActiveReport(r.id)}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: activeReport === r.id ? `${T.teal}0a` : T.faint, border: `1px solid ${activeReport === r.id ? T.teal : T.border}`, borderRadius: 10, cursor: "pointer", transition: "all 0.15s" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: T.text, fontFamily: T.font }}>
                  <BarChart2 size={13} color={activeReport === r.id ? T.teal : T.muted} aria-hidden="true" />
                  {r.name}
                </div>
                <div style={{ fontSize: 11, color: T.muted, fontFamily: T.font, marginTop: 2, fontWeight: 600 }}>Por {r.owner} · {r.shared} compartilhamentos · Atualizado {r.updated}</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <Btn size="xs" variant="ghost" icon={Pencil} />
                <Btn size="xs" variant="secondary">Compartilhar</Btn>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <SectionTitle sub="Arraste widgets para reorganizar">Builder de Relatório</SectionTitle>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { label: "Período",  value: filters.dateRange, options: ["7d","30d","90d","12m"],             key: "dateRange" },
              { label: "Fonte",    value: filters.source,    options: ["Todos","Organic","Paid","Email"],   key: "source"    },
              { label: "Segmento", value: filters.segment,   options: ["Todos","B2B","B2C","SaaS"],         key: "segment"   },
            ].map(f => (
              <select key={f.key} value={f.value} onChange={e => setFilters({ ...filters, [f.key]: e.target.value })}
                style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", fontSize: 12, fontFamily: T.font, fontWeight: 600, color: T.text, background: "#fff", cursor: "pointer" }}>
                {f.options.map(o => <option key={o}>{o}</option>)}
              </select>
            ))}
            <Btn icon={Plus} onClick={() => setShowAddWidget(!showAddWidget)}>Widget</Btn>
          </div>
        </div>

        {showAddWidget && (
          <div style={{ display: "flex", gap: 10, padding: "12px 14px", background: `${T.teal}0a`, border: `1px solid ${T.teal}30`, borderRadius: 10, marginBottom: 16, flexWrap: "wrap" }}>
            {WIDGET_TYPES.map(wt => {
              const WtIcon = wt.icon;
              return (
                <button key={wt.id} onClick={() => addWidget(wt)}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, fontFamily: T.font, cursor: "pointer", fontWeight: 700 }}>
                  <WtIcon size={13} color={T.teal} aria-hidden="true" /> {wt.label}
                </button>
              );
            })}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {widgets.map(w => <WidgetPreview key={w.id} w={w} />)}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <Btn variant="secondary" icon={Save}>Salvar relatório</Btn>
          <Btn variant="ghost"     icon={Link2}>Compartilhar link</Btn>
          <Btn icon={Download}>Exportar PDF</Btn>
        </div>
      </Card>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SECTION 4 — ANALYTICS POR CANAL
═══════════════════════════════════════════════════════════ */
const ChannelSection = () => {
  const [attribution, setAttribution] = useState("multi");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 14 }}>
        <Card>
          <SectionTitle sub="Leads gerados vs custo por canal — últimos 30 dias">Performance por Fonte</SectionTitle>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={channelData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fontFamily: T.font, fill: T.muted }} axisLine={false} tickLine={false} />
              <YAxis dataKey="canal" type="category" tick={{ fontSize: 11, fontFamily: T.font, fill: T.text }} axisLine={false} tickLine={false} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="leads" name="Leads" radius={[0, 4, 4, 0]} fill={T.teal} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionTitle>ROI por Canal</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {channelData.map((c, i) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontFamily: T.font, color: T.text, fontWeight: 600 }}>{c.canal}</span>
                  <span style={{ fontSize: 12, fontFamily: T.font, color: T.text, fontWeight: 700 }}>
                    {c.roi === 9999 ? "∞" : `${c.roi}%`}
                  </span>
                </div>
                <div style={{ height: 6, background: T.border, borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min((c.roi / 1000) * 100, 100)}%`, background: c.roi > 500 ? T.green : c.cor, borderRadius: 99, transition: "width 0.6s ease" }} />
                </div>
                <div style={{ fontSize: 10, color: T.muted, fontFamily: T.font, marginTop: 2, fontWeight: 600 }}>
                  Conv: {c.conversao}% · {c.custo > 0 ? `R$ ${c.custo.toLocaleString("pt-BR")}` : "Sem custo"}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <SectionTitle sub="Crédito de conversão por modelo de atribuição">Attribution Modeling</SectionTitle>
          <div style={{ display: "flex", gap: 6 }}>
            {[{ k: "first", label: "First Touch" }, { k: "last", label: "Last Touch" }, { k: "multi", label: "Multi-Touch" }].map(m => (
              <button key={m.k} onClick={() => setAttribution(m.k)}
                style={{ background: attribution === m.k ? T.teal : "#fff", color: attribution === m.k ? "#fff" : T.muted, border: `1px solid ${attribution === m.k ? T.teal : T.border}`, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, fontFamily: T.font, cursor: "pointer" }}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={attributionData.map(d => ({ name: d.name, value: d[attribution] }))}
                cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="value" nameKey="name">
                {attributionData.map((_, i) => (
                  <Cell key={i} fill={[T.teal, T.green, "#1877F2", T.brand2, "#0A66C2", T.amber][i]} />
                ))}
              </Pie>
              <Tooltip formatter={v => `${v}%`} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
            {attributionData.map((d, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: [T.teal, T.green, "#1877F2", T.brand2, "#0A66C2", T.amber][i], flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontFamily: T.font, color: T.text, flex: 1, fontWeight: 600 }}>{d.name}</span>
                <span style={{ fontSize: 13, fontWeight: 700, fontFamily: T.head, color: T.ink, fontVariantNumeric: "tabular-nums" }}>{d[attribution]}%</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle sub="vs. período anterior (30 dias)">Comparação de Canais</SectionTitle>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: T.font }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${T.border}` }}>
                {["Canal","Leads","Δ Leads","Conv. %","Δ Conv.","Custo/Lead","ROI"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {channelData.map((c, i) => {
                const deltaLeads = [+12, -4, +8, +23, +6, +31][i];
                const deltaCnv   = [+0.3, -0.2, +0.1, +0.8, -0.1, +1.2][i];
                const cpLead     = c.custo > 0 ? `R$ ${Math.round(c.custo / c.leads)}` : "—";
                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 === 0 ? T.faint : "#fff" }}>
                    <td style={{ padding: "11px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.cor }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{c.canal}</span>
                      </div>
                    </td>
                    <td style={{ padding: "11px 12px", fontSize: 13, fontWeight: 700, color: T.ink, fontVariantNumeric: "tabular-nums" }}>{c.leads?.toLocaleString("pt-BR")}</td>
                    <td style={{ padding: "11px 12px" }}><TrendChip value={deltaLeads} /></td>
                    <td style={{ padding: "11px 12px", fontSize: 12, color: T.muted, fontWeight: 600 }}>{c.conversao}%</td>
                    <td style={{ padding: "11px 12px" }}><TrendChip value={deltaCnv} /></td>
                    <td style={{ padding: "11px 12px", fontSize: 12, color: T.muted, fontWeight: 600 }}>{cpLead}</td>
                    <td style={{ padding: "11px 12px" }}>
                      <span style={{ fontWeight: 700, color: c.roi > 500 ? T.green : c.roi > 200 ? T.amber : T.coral, fontSize: 13 }}>
                        {c.roi === 9999 ? "∞" : `${c.roi}%`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SECTION 5 — REAL-TIME MONITORING
═══════════════════════════════════════════════════════════ */
const RealtimeSection = () => {
  const [feed,      setFeed]      = useState([]);
  const [feedTick,  setFeedTick]  = useState(0);

  const liveStats = [
    { Icon: Users,         label: "Online agora",        value: 0, color: T.green },
    { Icon: Mail,          label: "Emails abertos hoje",  value: 0, color: T.teal  },
    { Icon: ClipboardList, label: "Forms hoje",           value: 0, color: T.teal  },
    { Icon: Zap,           label: "SQLs hoje",            value: 0, color: T.amber },
  ];

  useEffect(() => {
    const loadFeed = async () => {
      const { data } = await supabase
        .from("lead_events")
        .select("id, event_type, data, created_at, leads(name, source)")
        .order("created_at", { ascending: false })
        .limit(8);
      if (data?.length) setFeed(data);
    };
    loadFeed();
    const iv = setInterval(loadFeed, 5000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {liveStats.map((s, i) => {
          const SIcon = s.Icon;
          return (
            <Card key={i} style={{ borderRadius: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${s.color}14`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <SIcon size={18} color={s.color} aria-hidden="true" />
                </div>
                {s.pulse && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.green, animation: "pulse 1.5s infinite" }} />
                    <span style={{ fontSize: 10, color: T.green, fontWeight: 700, fontFamily: T.font }}>AO VIVO</span>
                  </div>
                )}
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: T.ink, fontFamily: T.head, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>{s.value.toLocaleString("pt-BR")}</div>
              <div style={{ fontSize: 11, color: T.muted, fontFamily: T.font, marginTop: 3, fontWeight: 600 }}>{s.label}</div>
            </Card>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card style={{ maxHeight: 400, overflow: "hidden" }}>
          {/* cabeçalho AO VIVO */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: T.cyan, animation: "pulse-live 1.5s infinite", flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: T.cyan, fontFamily: T.mono, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              AO VIVO · atualiza a cada 5s
            </span>
          </div>

          <div style={{ overflowY: "auto", maxHeight: 320 }}>
            {feed.length === 0 && (
              <div style={{ fontSize: 12, color: T.muted, fontFamily: T.font, padding: "20px 0", textAlign: "center" }}>
                Nenhum evento recente
              </div>
            )}
            {feed.map((e, i) => {
              const meta    = EVENT_META[e.event_type] || {};
              const color   = (meta.color || (() => T.cyan))(T);
              const EIcon   = meta.Icon || Activity;
              const fmt     = meta.fmt ? meta.fmt(e, T) : { title: e.event_type, sub: null };
              return (
                <div key={e.id}
                  style={{
                    display: "grid", gridTemplateColumns: "36px 1fr auto", gap: 12,
                    alignItems: "center", padding: "11px 0",
                    borderBottom: i < feed.length - 1 ? "1px dashed #EEF2F6" : "none",
                    animation: "slideIn 0.4s both",
                  }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}14`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <EIcon size={18} color={color} aria-hidden="true" />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, lineHeight: 1.25, fontFamily: T.font }}>{fmt.title}</div>
                    {fmt.sub && <div style={{ fontSize: 11.5, color: T.faint3, marginTop: 2, fontFamily: T.font }}>{fmt.sub}</div>}
                  </div>
                  <div style={{ fontSize: 11, color: T.faint3, fontFamily: T.mono, fontWeight: 600, flexShrink: 0 }}>
                    {relTime(e.created_at)}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <SectionTitle sub="Leads gerados por hora">Hoje vs. Ontem</SectionTitle>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={todayVsYesterday}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F6" />
              <XAxis dataKey="hora" tick={{ fontSize: 11, fontFamily: T.font, fill: T.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fontFamily: T.font, fill: T.muted }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontFamily: T.font, fontSize: 12 }} />
              <Line type="monotone" dataKey="hoje"  name="Hoje"  stroke={T.teal}   strokeWidth={2.5} dot={{ fill: T.teal,   r: 3 }} />
              <Line type="monotone" dataKey="ontem" name="Ontem" stroke={T.border} strokeWidth={2}   strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <SectionTitle sub="Performance das campanhas abertas hoje">Campanhas — Visão Hoje</SectionTitle>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: T.font }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${T.border}` }}>
                {["Campanha","Status","Abertura","CTR","Conversões","Performance"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaignPerf.map((c, i) => {
                const statusColor = { ativo: T.green, encerrado: T.muted, pausado: T.amber }[c.status];
                const perfPct     = Math.round((c.abertura / 40) * 100);
                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 === 0 ? T.faint : "#fff" }}>
                    <td style={{ padding: "11px 12px", fontSize: 12, fontWeight: 700, color: T.text }}>{c.name}</td>
                    <td style={{ padding: "11px 12px" }}><Badge color={statusColor}>{c.status}</Badge></td>
                    <td style={{ padding: "11px 12px", fontSize: 13, fontWeight: 700, color: c.abertura < 20 ? T.coral : T.text, fontVariantNumeric: "tabular-nums" }}>{c.abertura}%</td>
                    <td style={{ padding: "11px 12px", fontSize: 13, color: T.muted, fontWeight: 600 }}>{c.ctr}%</td>
                    <td style={{ padding: "11px 12px", fontSize: 13, fontWeight: 700, color: T.green }}>{c.conversoes}</td>
                    <td style={{ padding: "11px 12px", width: 120 }}>
                      <div style={{ height: 6, background: T.border, borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(perfPct, 100)}%`, background: perfPct >= 75 ? T.green : perfPct >= 40 ? T.amber : T.coral, borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: 10, color: T.muted, fontFamily: T.font, fontWeight: 600 }}>{Math.min(perfPct, 100)}% do target</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <SectionTitle sub="Alertas configurados para a equipe">Gerenciar Alertas</SectionTitle>
          <Btn icon={Plus} onClick={() => {}}>Novo alerta</Btn>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {alertsDB.map(a => {
            const urgencyColor = { high: T.coral, medium: T.amber, low: T.teal }[a.urgency];
            return (
              <div key={a.id} style={{ display: "flex", gap: 14, padding: "12px 16px", background: T.faint, border: `1px solid ${T.border}`, borderRadius: 10, alignItems: "center" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: a.enabled ? urgencyColor : T.border, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: T.font }}>{a.name}</span>
                    {!a.enabled && <Badge color={T.muted}>Desativado</Badge>}
                  </div>
                  <div style={{ fontSize: 11, color: T.muted, fontFamily: T.font, marginTop: 2, fontWeight: 600 }}>
                    Se <code style={{ background: "#EEF2F6", padding: "1px 5px", borderRadius: 4, fontFamily: T.mono }}>{a.condition}</code> → envia para {a.recipients.join(", ")}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: T.muted, fontFamily: T.font, fontWeight: 600 }}>Último: {a.last}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: urgencyColor, fontFamily: T.font }}>{a.count} disparos</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn size="xs" variant="ghost" icon={Pencil} />
                  <Btn size="xs" variant={a.enabled ? "danger" : "success"}>{a.enabled ? "Pausar" : "Ativar"}</Btn>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SECTION 6 — EXPORT E AUTOMAÇÃO
═══════════════════════════════════════════════════════════ */
const ExportSection = () => {
  const [schedules, setSchedules] = useState([]);
  const [apiCopied, setApiCopied] = useState(null);
  const copyEndpoint = (path) => { setApiCopied(path); setTimeout(() => setApiCopied(null), 2000); };

  const exportOptions = [
    { Icon: FileText,       label: "Export PDF",             sub: "Relatório completo com logo e cores", format: "PDF",   color: T.coral   },
    { Icon: BarChart2,      label: "Export Excel",           sub: "Dados tabulares + gráficos",          format: "XLSX",  color: T.green   },
    { Icon: FileSpreadsheet,label: "Export CSV",             sub: "Dados brutos para BI externo",        format: "CSV",   color: T.teal    },
    { Icon: Link2,          label: "Dashboard Embeddable",   sub: "Link iframe para stakeholders",       format: "EMBED", color: T.violet  },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card>
          <SectionTitle sub="Exporte qualquer relatório com branding Vantari">Export Rápido</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {exportOptions.map((e, i) => {
              const EIcon = e.Icon;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: T.faint, border: `1px solid ${T.border}`, borderRadius: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: `${e.color}14`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <EIcon size={18} color={e.color} aria-hidden="true" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: T.font }}>{e.label}</div>
                    <div style={{ fontSize: 11, color: T.muted, fontFamily: T.font, fontWeight: 600 }}>{e.sub}</div>
                  </div>
                  <Btn size="xs" variant="secondary" icon={Download}>{e.format}</Btn>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <SectionTitle sub="Envio automático por email">Relatórios Agendados</SectionTitle>
            <Btn icon={Plus} size="xs">Agendar</Btn>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {schedules.map(s => (
              <div key={s.id} style={{ padding: "12px 14px", background: s.active ? `${T.green}08` : T.faint, border: `1px solid ${s.active ? T.green + "40" : T.border}`, borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.text, fontFamily: T.font }}>{s.report}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: s.active ? T.green : T.muted }} />
                    <span style={{ fontSize: 10, color: s.active ? T.green : T.muted, fontWeight: 700, fontFamily: T.font }}>{s.active ? "Ativo" : "Pausado"}</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: T.muted, fontFamily: T.font, fontWeight: 600 }}>
                  {s.frequency} · {s.day !== "—" ? `${s.day} às` : ""} {s.time} → {s.recipients}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <Btn size="xs" variant="ghost"    icon={Pencil}>Editar</Btn>
                  <Btn size="xs" variant={s.active ? "danger" : "success"} onClick={() => setSchedules(schedules.map(sc => sc.id === s.id ? { ...sc, active: !sc.active } : sc))}>
                    {s.active ? "Pausar" : "Ativar"}
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <SectionTitle sub="Integre com Power BI, Looker, Tableau ou BI customizado">API de Integração BI</SectionTitle>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="secondary" icon={BookOpen}>Docs</Btn>
            <Btn icon={KeyRound}>Gerar API Key</Btn>
          </div>
        </div>
        <div style={{ background: "#0f172a", borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontFamily: T.mono }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>Base URL</div>
          <div style={{ fontSize: 13, color: "#E8EEF3" }}>https://api.vantari.com.br/v1</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {apiEndpoints.map((ep, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "11px 14px", background: T.faint, border: `1px solid ${T.border}`, borderRadius: 10, alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: ep.method === "GET" ? T.green : T.teal, fontFamily: T.mono, background: `${ep.method === "GET" ? T.green : T.teal}14`, padding: "3px 8px", borderRadius: 6, flexShrink: 0 }}>
                {ep.method}
              </span>
              <code style={{ fontSize: 12, color: T.teal, fontFamily: T.mono, flex: "0 0 auto" }}>{ep.path}</code>
              <span style={{ fontSize: 11, color: T.muted, fontFamily: T.font, fontWeight: 600, flex: 1 }}>{ep.desc}</span>
              <Badge color={T.violet}>{ep.auth}</Badge>
              <button onClick={() => copyEndpoint(ep.path)}
                style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 10px", fontSize: 11, fontFamily: T.font, fontWeight: 700, cursor: "pointer", color: apiCopied === ep.path ? T.green : T.muted, display: "flex", alignItems: "center", gap: 4 }}>
                {apiCopied === ep.path ? <><CheckCircle2 size={11} aria-hidden="true" /> Copiado</> : "Copiar"}
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle sub="Dashboards embeddable para stakeholders externos">Dashboards Embeddable</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { name: "Overview Executivo",  views: 24, lastView: "2h atrás",  token: "dash_exec_••••••" },
            { name: "Pipeline Comercial",  views: 8,  lastView: "1d atrás",  token: "dash_pipe_••••••" },
            { name: "Performance Mktg",    views: 16, lastView: "5h atrás",  token: "dash_mktg_••••••" },
          ].map((d, i) => (
            <div key={i} style={{ padding: "16px", background: T.faint, border: `1px solid ${T.border}`, borderRadius: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: T.text, fontFamily: T.font, marginBottom: 8 }}>
                <Monitor size={14} color={T.teal} aria-hidden="true" /> {d.name}
              </div>
              <div style={{ fontSize: 11, color: T.muted, fontFamily: T.font, marginBottom: 4, fontWeight: 600 }}>{d.views} visualizações · {d.lastView}</div>
              <code style={{ fontSize: 10, color: T.teal, background: `${T.teal}10`, padding: "3px 8px", borderRadius: 6, display: "block", marginBottom: 10, fontFamily: T.mono }}>{d.token}</code>
              <div style={{ display: "flex", gap: 6 }}>
                <Btn size="xs" variant="secondary" icon={Link2}>Link</Btn>
                <Btn size="xs" variant="ghost">iframe</Btn>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   TABS CONFIG
═══════════════════════════════════════════════════════════ */
const TABS = [
  { id: "overview",  icon: BarChart2,  label: "Overview"     },
  { id: "funnel",    icon: Filter,     label: "Funil"         },
  { id: "reports",   icon: FileText,   label: "Relatórios"   },
  { id: "channels",  icon: Radio,      label: "Canais"        },
  { id: "realtime",  icon: Activity,   label: "Tempo Real"   },
  { id: "export",    icon: Upload,     label: "Export & API"  },
];

/* ═══════════════════════════════════════════════════════════
   ROOT COMPONENT
═══════════════════════════════════════════════════════════ */
export default function VantariAnalyticsDashboard() {
  const [activeTab,       setActiveTab]       = useState("overview");
  const [globalDateRange, setGlobalDateRange] = useState("30d");

  const TAB_LABELS = { overview: "Overview", funnel: "Funil", reports: "Relatórios", channels: "Canais", realtime: "Tempo Real", export: "Export & API" };

  return (
    <div style={{ display: "flex", height: "100vh", background: T.bg, fontFamily: T.font, overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #B3BFCA; border-radius: 99px; }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(20,162,115,0.3); }
          50%       { box-shadow: 0 0 0 6px rgba(20,162,115,0.1); }
        }
        @keyframes pulse-live {
          0%, 100% { box-shadow: 0 0 0 0 rgba(6,182,212,0.6); }
          50%       { box-shadow: 0 0 0 8px rgba(6,182,212,0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-coral {
          0%,100% { box-shadow: 0 0 0 0 rgba(255,107,94,.6); }
          50%      { box-shadow: 0 0 0 6px rgba(255,107,94,0); }
        }
        @keyframes pulse-amber {
          0%,100% { box-shadow: 0 0 0 0 rgba(245,158,11,.6); }
          50%      { box-shadow: 0 0 0 6px rgba(245,158,11,0); }
        }
        @keyframes pulse-cyan2 {
          0%,100% { box-shadow: 0 0 0 0 rgba(13,116,145,.6); }
          50%      { box-shadow: 0 0 0 6px rgba(13,116,145,0); }
        }
      `}</style>

      {/* ── SIDEBAR ── */}
      <div style={{
        width: 240,
        background: T.sidebarBg,
        display: "flex", flexDirection: "column", flexShrink: 0,
        position: "relative", overflow: "hidden",
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
          <NavItem icon={BarChart2}      label="Analytics"     path="/dashboard"    active />
          <NavItem icon={Users}          label="Leads"         path="/leads"        />
          <NavItem icon={Mail}           label="Email Marketing" path="/email"      />
          <NavSection label="Ferramentas" />
          <NavItem icon={Star}           label="Scoring"       path="/scoring"      />
          <NavItem icon={LayoutTemplate} label="Landing Pages" path="/landing"      />
          <NavItem icon={Bot}            label="IA & Automação" path="/ai-marketing" />
          <NavSection label="Sistema" />
          <NavItem icon={Plug}           label="Integrações"   path="/integrations" />
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "8px 0", position: "relative" }}>
          <NavItem icon={Settings} label="Configurações" path="/settings" />
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Topbar */}
        <div style={{ height: 56, background: T.surface, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0, zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: T.ink, fontFamily: T.head, letterSpacing: "-0.02em" }}>
              {TAB_LABELS[activeTab]}
            </span>
            {activeTab === "overview" && (
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: T.cyan, animation: "pulse-live 2s infinite" }} />
            )}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select value={globalDateRange} onChange={e => setGlobalDateRange(e.target.value)}
              style={{ border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", fontSize: 12, fontFamily: T.font, fontWeight: 600, color: T.text, background: "#fff", cursor: "pointer" }}>
              {["7d","30d","90d","12m"].map(o => <option key={o}>{o}</option>)}
            </select>
            <Btn variant="secondary" icon={RefreshCw} size="sm">Atualizar</Btn>
            <Btn icon={Download} size="sm">Exportar</Btn>
          </div>
        </div>

        {/* Sub-tabs */}
        <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: "0 24px", display: "flex", gap: 2, flexShrink: 0 }}>
          {TABS.map(t => {
            const TIcon = t.icon;
            const active = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", background: "none", border: "none", borderBottom: active ? `2px solid ${T.teal}` : "2px solid transparent", cursor: "pointer", fontSize: 12, fontWeight: active ? 700 : 500, color: active ? T.teal : T.muted, fontFamily: T.font, transition: "all 0.15s" }}>
                <TIcon size={14} aria-hidden="true" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", background: "linear-gradient(180deg, #F0F9FC 0%, #EBF7F3 100%)" }}>
          {activeTab === "overview"  && <OverviewSection />}
          {activeTab === "funnel"    && <FunnelSection />}
          {activeTab === "reports"   && <ReportBuilder />}
          {activeTab === "channels"  && <ChannelSection />}
          {activeTab === "realtime"  && <RealtimeSection />}
          {activeTab === "export"    && <ExportSection />}
        </div>
      </div>
    </div>
  );
}
