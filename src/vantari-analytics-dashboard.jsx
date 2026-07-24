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
  FileSpreadsheet, AlertCircle,
  ChevronRight, ChevronLeft, CheckCircle2, LogOut
} from "lucide-react";

import { IdCard } from "lucide-react";
import { Briefcase } from "lucide-react";
import { Building2 } from "lucide-react";
import { ListChecks } from "lucide-react";
import { AlertTriangle } from "lucide-react";
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

/* ───── MOCK DATA ─────
   Só o que ainda é consumido de verdade fica aqui. channelData/attributionData
   seguem mock até a aba "Canais" ganhar busca real (fora do escopo desta
   rodada de correções). monthlyTrend/savedReports seguem mock até
   "Relatórios" ganhar persistência real no banco (idem). */
const monthlyTrend = [];
const channelData = [];
const attributionData = [];
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

/* Exporta core.persons como CSV real — usado no botão global "Exportar" e na
   aba Export & API. PDF/Excel/API pública ficam de fora por enquanto (não
   existem de verdade ainda). */
const exportPersonsCsv = async () => {
  const { data, error } = await supabase.schema("core").from("persons")
    .select("full_name,cpf,primary_email,primary_phone,status,created_at")
    .order("created_at", { ascending: false });
  if (error) { alert("Não foi possível exportar: " + error.message); return; }
  const rows = data || [];
  const header = ["Nome", "CPF", "Email", "Telefone", "Status", "Criado em"];
  const csvLines = [
    header.join(";"),
    ...rows.map(r => [
      r.full_name || "", r.cpf || "", r.primary_email || "", r.primary_phone || "",
      r.status || "", r.created_at ? new Date(r.created_at).toLocaleDateString("pt-BR") : "",
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(";")),
  ];
  const blob = new Blob(["﻿" + csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `vantari-pessoas-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
};

/* ───── SHARED COMPONENTS ───── */
const Btn = ({ children, onClick, variant = "primary", size = "sm", icon: Icon, disabled, style: s = {}, ...rest }) => {
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
    <button onClick={onClick} disabled={disabled} {...rest}
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

/* Banner de erro padrão — usado sempre que uma query Supabase falha, pra não
   deixar a seção só mostrar zero/vazio como se fosse "sem dado" quando na
   verdade a consulta quebrou. */
const ErrorBanner = ({ children }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 8, marginBottom: 14,
    padding: "10px 14px", borderRadius: 10,
    background: `${T.coral}12`, border: `1px solid ${T.coral}40`,
  }}>
    <AlertCircle size={15} color={T.coral} style={{ flexShrink: 0 }} />
    <span style={{ fontSize: 12.5, fontWeight: 600, color: "#9B2C2C", fontFamily: T.font }}>{children}</span>
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
        position: "relative",
        display: "flex", alignItems: "center", gap: 9,
        padding: collapsed ? "8px 0" : "8px 20px", justifyContent: collapsed ? "center" : "flex-start",
        fontSize: 13.5,
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

/* ───── FASE 3 HELPERS ───── */

const relTime = (iso) => {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60)   return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
};

/* chaveado por core.events.type (ver convenção em 0001_core_foundation.sql) */
const EVENT_META = {
  lead_created:    { color: T => T.teal,   Icon: User,          fmt: (e, T) => ({ title: `Novo lead · ${e.persons?.full_name || "Anônimo"}`, sub: <>fonte <b style={{color: T.teal}}>{e.source || "—"}</b></> }) },
  form_submit:     { color: T => T.violet, Icon: ClipboardList, fmt: (e, T) => ({ title: `Formulário enviado`,                              sub: <>lead <b style={{color: T.violet}}>{e.persons?.full_name || "—"}</b></> }) },
  page_visit:      { color: T => T.cyan,   Icon: Link2,         fmt: (e, T) => ({ title: `Visitou página · ${e.persons?.full_name || "Anônimo"}`, sub: <>url <b style={{color: T.cyan}}>{e.payload?.path || e.payload?.url || "—"}</b></> }) },
  stage_changed:   { color: T => T.green,  Icon: Zap,           fmt: (e, T) => ({ title: `${e.persons?.full_name || "Lead"} mudou de estágio`, sub: <>para <b style={{color: T.green}}>{e.payload?.to || e.payload?.stage || "—"}</b></> }) },
  whatsapp_in:     { color: T => T.amber,  Icon: Mail,          fmt: (e, T) => ({ title: `WhatsApp · ${e.persons?.full_name || "Lead"}`,        sub: <>via <b style={{color: T.amber}}>Nina</b></> }) },
  contract_signed: { color: T => T.green,  Icon: Zap,           fmt: (e, T) => ({ title: `Contrato assinado · ${e.persons?.full_name || "—"}`, sub: null }) },
  email_open:      { color: T => T.amber,  Icon: Mail,          fmt: (e, T) => ({ title: `Email aberto · ${e.persons?.full_name || "Lead"}`,    sub: <>abertura <b style={{color: T.amber}}>{e.payload?.rate || "—"}</b></> }) },
  email_click:     { color: T => T.rose,   Icon: Link2,         fmt: (e, T) => ({ title: `Click em email · ${e.persons?.full_name || "Lead"}`,   sub: <>link <b style={{color: T.rose}}>{e.payload?.url || "email"}</b></> }) },
};

/* ───── ANEL DE CAMPANHAS (Fase 3) ───── */
const CampaignRing = ({ campaignCount }) => {
  const [stats, setStats] = useState({ open: 0, ctr: 0, conversions: 0, active: campaignCount || 0 });

  useEffect(() => {
    const load = async () => {
      const mkt = supabase.schema("mkt");
      const [{ data: sends }, { count: active }] = await Promise.all([
        mkt.from("campaign_sends").select("status, opened_at, clicked_at, converted_at"),
        mkt.from("campaigns").select("*", { count: "exact", head: true }).eq("status", "active"),
      ]);
      if (!sends?.length) return;
      const total     = sends.length;
      const opened    = sends.filter(s => s.opened_at  || ["opened", "clicked", "converted"].includes(s.status)).length;
      const clicked   = sends.filter(s => s.clicked_at || ["clicked", "converted"].includes(s.status)).length;
      const converted = sends.filter(s => s.converted_at || s.status === "converted").length;
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
  const [activeMetric, setActiveMetric] = useState("pessoas");
  const [kpis,        setKpis]        = useState({ pessoas: 0, abertos: 0, ganhos: 0, pipelineCents: 0, campaigns: 0 });
  const [monthlyData, setMonthlyData] = useState([]);
  const [sparkData,   setSparkData]   = useState({ pessoas: [], negocios: [] });
  const [error,       setError]       = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setError(null);
      const sevenMonthsAgo = new Date();
      sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);

      const core = supabase.schema("core");
      const crm = supabase.schema("crm");
      const mkt = supabase.schema("mkt");

      const results = await Promise.all([
        core.from("persons").select("*", { count: "exact", head: true }),
        crm.from("deals").select("valor_ofertado_cents,valor_face_cents").eq("status", "open"),
        crm.from("deals").select("*", { count: "exact", head: true }).eq("status", "won"),
        mkt.from("campaigns").select("*", { count: "exact", head: true }).eq("status", "sent"),
        core.from("persons").select("created_at").gte("created_at", sevenMonthsAgo.toISOString()),
        crm.from("deals").select("created_at").gte("created_at", sevenMonthsAgo.toISOString()),
      ]);

      const firstError = results.find(r => r.error)?.error;
      if (firstError) { setError(firstError.message); return; }

      const [
        { count: pessoas },
        { data: openDeals },
        { count: ganhos },
        { count: campaigns },
        { data: rawPersons },
        { data: rawDeals },
      ] = results;

      const abertos = (openDeals || []).length;
      const pipelineCents = (openDeals || []).reduce((s, d) => s + (d.valor_ofertado_cents ?? d.valor_face_cents ?? 0), 0);
      setKpis({ pessoas: pessoas || 0, abertos, ganhos: ganhos || 0, pipelineCents, campaigns: campaigns || 0 });

      /* buckets mensais (pessoas e negócios) para sparkline + chart */
      const now = new Date();
      const buckets = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1);
        return {
          key:    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
          month:  d.toLocaleString("pt-BR", { month: "short" }),
          pessoas: 0, negocios: 0,
        };
      });
      const bump = (arr, field) => (arr || []).forEach(r => {
        const d = new Date(r.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const b = buckets.find(m => m.key === key);
        if (b) b[field]++;
      });
      bump(rawPersons, "pessoas");
      bump(rawDeals, "negocios");

      const goalBase = Math.max(10, Math.round((pessoas || 0) / 6));
      const withGoal = buckets.map((b, i) => ({ ...b, goal: goalBase + Math.round(goalBase * 0.12 * i) }));
      setMonthlyData(withGoal);
      setSparkData({ pessoas: buckets.map(b => b.pessoas), negocios: buckets.map(b => b.negocios) });
    };
    fetchData();
  }, []);

  const prevP = sparkData.pessoas.at(-2) || 0;
  const thisP = sparkData.pessoas.at(-1) || 0;
  const pessoasDelta = thisP - prevP;
  const fmtMoney = (cents) => "R$ " + ((cents || 0) / 100).toLocaleString("pt-BR", { maximumFractionDigits: 0 });

  const lineKeys = {
    pessoas:  { key: "pessoas",  color: T.teal,   label: "Pessoas"  },
    negocios: { key: "negocios", color: T.violet, label: "Negócios" },
  };
  const activeMeta = lineKeys[activeMetric];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {error && <ErrorBanner>Não foi possível carregar os dados do Overview: {error}</ErrorBanner>}
      {/* ── Hero KPI cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <HeroKpiCard
          icon={Users}      color={T.teal}
          label="Pessoas (core)"
          value={kpis.pessoas.toLocaleString("pt-BR")}
          sub={pessoasDelta >= 0 ? `+${pessoasDelta} no mês` : `${pessoasDelta} no mês`}
          sparkData={sparkData.pessoas}
        />
        <HeroKpiCard
          icon={Star}       color={T.amber}
          label="Negócios abertos"
          value={kpis.abertos.toLocaleString("pt-BR")}
          sub="em andamento"
          sparkData={sparkData.negocios}
        />
        <HeroKpiCard
          icon={Zap}        color={T.violet}
          label="Ganhos"
          value={kpis.ganhos.toLocaleString("pt-BR")}
          sub="negócios fechados"
          sparkData={sparkData.negocios}
        />
        <HeroKpiCard
          icon={DollarSign} color={T.green}
          label="Valor em pipeline"
          value={fmtMoney(kpis.pipelineCents)}
          sub="ofertado · abertos"
          sparkData={sparkData.pessoas}
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
            Últimos 7 meses · linha tracejada verde = meta
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
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SECTION 2 — FUNIL DE VENDAS
═══════════════════════════════════════════════════════════ */
const FUNNEL_COLORS = [T.brand2, T.violet, T.amber, T.coral, T.green, T.faint3];
const stageKindSub = (k) => k === "won" ? "ganho" : k === "lost" ? "perdido" : "em aberto";

const FunnelSection = () => {
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [noPipeline, setNoPipeline] = useState(false);

  useEffect(() => {
    const load = async () => {
      setError(null); setNoPipeline(false);
      const crm = supabase.schema("crm");
      const { data: pipes, error: pipeErr } = await crm.from("pipelines").select("id").eq("is_default", true).limit(1);
      if (pipeErr) { setError(pipeErr.message); setLoading(false); return; }
      const pipe = pipes?.[0];
      if (!pipe) { setNoPipeline(true); setLoading(false); return; }
      const [{ data: st, error: stErr }, { data: deals, error: dealsErr }] = await Promise.all([
        crm.from("stages").select("id,name,position,kind").eq("pipeline_id", pipe.id).order("position"),
        crm.from("deals").select("stage_id").eq("pipeline_id", pipe.id),
      ]);
      if (stErr || dealsErr) { setError((stErr || dealsErr).message); setLoading(false); return; }
      const c = {};
      (deals || []).forEach(d => { c[d.stage_id] = (c[d.stage_id] || 0) + 1; });
      setStages((st || []).map((s, i) => ({
        key: s.id, label: s.name, sub: stageKindSub(s.kind),
        color: s.kind === "won" ? T.green : s.kind === "lost" ? T.coral : FUNNEL_COLORS[i % FUNNEL_COLORS.length],
        count: c[s.id] || 0,
      })));
      setLoading(false);
    };
    load();
  }, []);

  const FUNNEL_STAGES = stages;
  const counts  = FUNNEL_STAGES.map(s => s.count);
  const maxCount = Math.max(...counts, 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {error && <ErrorBanner>Não foi possível carregar o funil: {error}</ErrorBanner>}
      <Card>
        <SectionTitle sub="Negócios por estágio — dados ao vivo do CRM">Esteira de Aquisição</SectionTitle>
        {loading ? (
          <div style={{ fontSize: 12, color: T.muted, fontFamily: T.font, padding: "20px 0", textAlign: "center" }}>Carregando…</div>
        ) : noPipeline ? (
          <div style={{ fontSize: 12.5, color: T.muted, fontFamily: T.font, padding: "20px 0", textAlign: "center" }}>
            Nenhum pipeline padrão configurado ainda. Configure um em <b>Negócios</b> para ver o funil aqui.
          </div>
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
  const [reports,       setReports]       = useState(savedReports);
  const [statusMsg,     setStatusMsg]     = useState(null);

  const addWidget   = (type) => { const newW = { id: `w${Date.now()}`, type: type.id, metric: METRIC_OPTIONS[0], col: widgets.length % 3, row: Math.floor(widgets.length / 3) }; setWidgets([...widgets, newW]); setShowAddWidget(false); };
  const removeWidget = (id) => setWidgets(widgets.filter(w => w.id !== id));

  const flash = (msg) => { setStatusMsg(msg); setTimeout(() => setStatusMsg(null), 2500); };

  const handleNewReport = () => {
    const id = Date.now();
    const rep = { id, name: `Novo relatório ${reports.length + 1}`, owner: "Você", shared: 0, updated: "agora" };
    setReports(r => [...r, rep]);
    setActiveReport(id);
    setWidgets([]);
    flash("Relatório criado.");
  };
  const handleSaveReport = () => {
    setReports(r => r.map(rep => rep.id === activeReport ? { ...rep, updated: "agora" } : rep));
    flash("Layout do relatório salvo.");
  };
  const handleShareLink = async () => {
    const link = `${window.location.origin}${window.location.pathname}?report=${activeReport}`;
    try { await navigator.clipboard.writeText(link); flash("Link copiado para a área de transferência."); }
    catch { flash("Não foi possível copiar automaticamente. Link: " + link); }
  };
  const handleExportPdf = () => { flash("Abrindo diálogo de impressão/PDF..."); window.print(); };

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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {statusMsg && (
              <span style={{ fontSize: 11.5, fontWeight: 600, color: T.green, fontFamily: T.font }}>{statusMsg}</span>
            )}
            <Btn icon={Plus} onClick={handleNewReport}>Novo relatório</Btn>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {reports.length === 0 && (
            <div style={{ fontSize: 12.5, color: T.muted, fontFamily: T.font, padding: "8px 2px" }}>
              Nenhum relatório salvo ainda — clique em "Novo relatório" para criar um.
            </div>
          )}
          {reports.map(r => (
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
          <Btn variant="secondary" icon={Save} onClick={handleSaveReport}>Salvar relatório</Btn>
          <Btn variant="ghost"     icon={Link2} onClick={handleShareLink}>Compartilhar link</Btn>
          <Btn icon={Download} onClick={handleExportPdf}>Exportar PDF</Btn>
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
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
        borderRadius: 12, background: `${T.amber}12`, border: `1px solid ${T.amber}40`,
      }}>
        <AlertCircle size={16} color={T.amber} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: T.text, fontFamily: T.font }}>
          Esta aba ainda não busca dados reais — precisa antes definir de onde vem canal/origem e custo por canal. Os gráficos abaixo ficam vazios até essa fonte existir.
        </span>
      </div>
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
  const [feed,  setFeed]  = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [today, setToday] = useState({ lead_created: 0, form_submit: 0, page_visit: 0 });
  const [hourly, setHourly] = useState([]);
  const [campaignPerf, setCampaignPerf] = useState([]);
  const [error, setError] = useState(null);

  const liveStats = [
    { Icon: User,          label: "Novos leads hoje", value: today.lead_created, color: T.teal,   pulse: true },
    { Icon: ClipboardList, label: "Forms hoje",       value: today.form_submit,  color: T.violet, pulse: true },
    { Icon: Link2,         label: "Visitas hoje",     value: today.page_visit,   color: T.cyan,   pulse: true },
  ];

  useEffect(() => {
    const core = supabase.schema("core");
    const mkt  = supabase.schema("mkt");
    const load = async () => {
      const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
      const startOfYesterday = new Date(startOfToday); startOfYesterday.setDate(startOfYesterday.getDate() - 1);

      const [
        { data: events, error: feedErr },
        { data: hourEvents, error: hourErr },
        { data: campaigns, error: campErr },
      ] = await Promise.all([
        core.from("events")
          .select("id, type, source, payload, occurred_at, persons(full_name)")
          .order("occurred_at", { ascending: false })
          .limit(8),
        core.from("events")
          .select("occurred_at, type")
          .in("type", ["lead_created", "form_submit", "page_visit"])
          .gte("occurred_at", startOfYesterday.toISOString()),
        mkt.from("campaigns")
          .select("id, name, status, sent_at")
          .in("status", ["active", "sent", "sending"])
          .order("sent_at", { ascending: false, nullsFirst: false })
          .limit(5),
      ]);

      const firstErr = feedErr || hourErr || campErr;
      if (firstErr) { setError(firstErr.message); setFeedLoading(false); return; }

      if (events) setFeed(events);
      setFeedLoading(false);

      // contadores de hoje (pro card de KPI) + série por hora (hoje vs ontem)
      const c = {};
      const buckets = Array.from({ length: 24 }, (_, h) => ({ hora: `${String(h).padStart(2, "0")}h`, hoje: 0, ontem: 0 }));
      (hourEvents || []).forEach(e => {
        const d = new Date(e.occurred_at);
        const isToday = d >= startOfToday;
        if (isToday) c[e.type] = (c[e.type] || 0) + 1;
        if (e.type === "lead_created" || e.type === "form_submit") {
          const bucket = buckets[d.getHours()];
          if (isToday) bucket.hoje++;
          else bucket.ontem++;
        }
      });
      setToday({ lead_created: c.lead_created || 0, form_submit: c.form_submit || 0, page_visit: c.page_visit || 0 });
      setHourly(buckets);

      // performance das campanhas ativas/enviadas mais recentes
      const campaignIds = (campaigns || []).map(cp => cp.id);
      let sends = [];
      if (campaignIds.length) {
        const { data: sendRows, error: sendErr } = await mkt.from("campaign_sends")
          .select("campaign_id, status, opened_at, clicked_at, converted_at")
          .in("campaign_id", campaignIds);
        if (sendErr) { setError(sendErr.message); return; }
        sends = sendRows || [];
      }
      setCampaignPerf((campaigns || []).map(cp => {
        const rows = sends.filter(s => s.campaign_id === cp.id);
        const total     = rows.length;
        const opened    = rows.filter(s => s.opened_at  || ["opened", "clicked", "converted"].includes(s.status)).length;
        const clicked   = rows.filter(s => s.clicked_at || ["clicked", "converted"].includes(s.status)).length;
        const converted = rows.filter(s => s.converted_at || s.status === "converted").length;
        return {
          name: cp.name,
          status: cp.status,
          abertura: total ? Math.round((opened / total) * 100) : 0,
          ctr:      total ? Math.round((clicked / total) * 100) : 0,
          conversoes: converted,
        };
      }));
    };
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {error && <ErrorBanner>Não foi possível atualizar o Tempo Real: {error}</ErrorBanner>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
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
            {feedLoading && (
              <div style={{ fontSize: 12, color: T.muted, fontFamily: T.font, padding: "20px 0", textAlign: "center" }}>
                Carregando…
              </div>
            )}
            {!feedLoading && feed.length === 0 && (
              <div style={{ fontSize: 12, color: T.muted, fontFamily: T.font, padding: "20px 0", textAlign: "center" }}>
                Nenhum evento recente
              </div>
            )}
            {feed.map((e, i) => {
              const meta    = EVENT_META[e.type] || {};
              const color   = (meta.color || (() => T.cyan))(T);
              const EIcon   = meta.Icon || Activity;
              const fmt     = meta.fmt ? meta.fmt(e, T) : { title: e.type, sub: null };
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
                    {relTime(e.occurred_at)}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <SectionTitle sub="Leads gerados por hora — comparado a ontem">Hoje vs. Ontem</SectionTitle>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={hourly}>
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
        <SectionTitle sub="Campanhas ativas ou enviadas mais recentemente">Campanhas — Performance atual</SectionTitle>
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
              {campaignPerf.length === 0 && (
                <tr><td colSpan={6} style={{ padding: "20px 12px", textAlign: "center", fontSize: 12, color: T.muted }}>Nenhuma campanha ativa ou enviada recentemente.</td></tr>
              )}
              {campaignPerf.map((c, i) => {
                const statusColor = { active: T.green, sent: T.muted, sending: T.amber }[c.status] || T.muted;
                const statusLabel = { active: "ativa", sent: "enviada", sending: "enviando" }[c.status] || c.status;
                const perfPct     = Math.round((c.abertura / 40) * 100);
                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 === 0 ? T.faint : "#fff" }}>
                    <td style={{ padding: "11px 12px", fontSize: 12, fontWeight: 700, color: T.text }}>{c.name}</td>
                    <td style={{ padding: "11px 12px" }}><Badge color={statusColor}>{statusLabel}</Badge></td>
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
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SECTION 6 — EXPORT E AUTOMAÇÃO
═══════════════════════════════════════════════════════════ */
const ExportSection = () => {
  const [schedules, setSchedules] = useState([]);
  const [exportingCsv, setExportingCsv] = useState(false);

  const exportOptions = [
    { Icon: FileSpreadsheet,label: "Export CSV",             sub: "Pessoas do core, dados reais",        format: "CSV",   color: T.teal,   ready: true  },
    { Icon: FileText,       label: "Export PDF",             sub: "Relatório completo com logo e cores", format: "PDF",   color: T.coral,  ready: false },
    { Icon: BarChart2,      label: "Export Excel",           sub: "Dados tabulares + gráficos",          format: "XLSX",  color: T.green,  ready: false },
    { Icon: Link2,          label: "Dashboard Embeddable",   sub: "Link iframe para stakeholders",       format: "EMBED", color: T.violet, ready: false },
  ];

  const handleCsvClick = async () => {
    setExportingCsv(true);
    try { await exportPersonsCsv(); }
    finally { setExportingCsv(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card>
          <SectionTitle sub="Só o CSV está pronto por enquanto — o resto é roadmap">Export Rápido</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {exportOptions.map((e, i) => {
              const EIcon = e.Icon;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: T.faint, border: `1px solid ${T.border}`, borderRadius: 10, opacity: e.ready ? 1 : 0.6 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: `${e.color}14`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <EIcon size={18} color={e.color} aria-hidden="true" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: T.font }}>{e.label}</div>
                    <div style={{ fontSize: 11, color: T.muted, fontFamily: T.font, fontWeight: 600 }}>{e.sub}</div>
                  </div>
                  {e.ready
                    ? <Btn size="xs" variant="secondary" icon={Download} onClick={handleCsvClick} disabled={exportingCsv}>{exportingCsv ? "..." : e.format}</Btn>
                    : <Badge color={T.muted}>Em breve</Badge>}
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <SectionTitle sub="Envio automático por email — em breve">Relatórios Agendados</SectionTitle>
            <Btn icon={Plus} size="xs" disabled title="Em breve — ainda não persiste no banco">Agendar</Btn>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {schedules.length === 0 && (
              <div style={{ fontSize: 12, color: T.muted, fontFamily: T.font, padding: "16px 0", textAlign: "center" }}>
                Nenhum relatório agendado ainda — feature em construção.
              </div>
            )}
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
          <SectionTitle sub="Integre com Power BI, Looker, Tableau ou BI customizado — roadmap, nada disso existe ainda de verdade">API de Integração BI</SectionTitle>
          <Badge color={T.muted}>Em breve</Badge>
        </div>
        <div style={{ background: "#0f172a", borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontFamily: T.mono }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>Base URL (planejada)</div>
          <div style={{ fontSize: 13, color: "#E8EEF3" }}>https://api.vantari.com.br/v1</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {apiEndpoints.map((ep, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "11px 14px", background: T.faint, border: `1px solid ${T.border}`, borderRadius: 10, alignItems: "center", opacity: 0.65 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: ep.method === "GET" ? T.green : T.teal, fontFamily: T.mono, background: `${ep.method === "GET" ? T.green : T.teal}14`, padding: "3px 8px", borderRadius: 6, flexShrink: 0 }}>
                {ep.method}
              </span>
              <code style={{ fontSize: 12, color: T.teal, fontFamily: T.mono, flex: "0 0 auto" }}>{ep.path}</code>
              <span style={{ fontSize: 11, color: T.muted, fontFamily: T.font, fontWeight: 600, flex: 1 }}>{ep.desc}</span>
              <Badge color={T.violet}>{ep.auth}</Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <SectionTitle sub="Dashboards embeddable para stakeholders externos — roadmap, ainda não existe">Dashboards Embeddable</SectionTitle>
          <Badge color={T.muted}>Em breve</Badge>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 12 }}>
          {[
            { name: "Overview Executivo" },
            { name: "Pipeline Comercial" },
            { name: "Performance Mktg" },
          ].map((d, i) => (
            <div key={i} style={{ padding: "16px", background: T.faint, border: `1px solid ${T.border}`, borderRadius: 12, opacity: 0.65 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: T.text, fontFamily: T.font, marginBottom: 8 }}>
                <Monitor size={14} color={T.teal} aria-hidden="true" /> {d.name}
              </div>
              <div style={{ fontSize: 11, color: T.muted, fontFamily: T.font, fontWeight: 600 }}>Ainda não disponível</div>
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
  const [collapsed, setCollapsed] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [exporting, setExporting] = useState(false);

  const TAB_LABELS = { overview: "Overview", funnel: "Funil", reports: "Relatórios", channels: "Canais", realtime: "Tempo Real", export: "Export & API" };

  // "Atualizar": remonta a aba ativa, o que refaz todas as buscas dela do zero.
  const handleRefresh = () => setRefreshKey(k => k + 1);

  // "Exportar" (topbar): CSV real das pessoas do core — dataset mais estável
  // e útil independente da aba ativa. PDF/Excel/API ficam pra quando essas
  // features existirem de verdade (ver aba Export & API).
  const handleExportCsv = async () => {
    setExporting(true);
    try { await exportPersonsCsv(); }
    finally { setExporting(false); }
  };

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
        width: collapsed ? 64 : 240,
        transition: "width 0.15s",
        background: T.sidebarBg,
        display: "flex", flexDirection: "column", flexShrink: 0,
        position: "relative", overflow: "visible",
      }}>
        {/* glow topo-direito */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(circle at 90% 0%, rgba(20,162,115,.25) 0%, transparent 50%)",
        }} />

        {/* Brand */}
        <div style={{ padding: collapsed ? "20px 0 0" : "20px 20px 0", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", gap: 10, paddingBottom: 20, borderBottom: "1px solid rgba(255,255,255,.08)", marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, background: "white", borderRadius: 8, display: "grid", placeItems: "center", flexShrink: 0 }}>
              <img src="/icone.png" alt="" style={{ width: 22, height: 22 }} />
            </div>
            {!collapsed && <span style={{ fontFamily: T.head, fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "white" }}>vantari</span>}
            {!collapsed && <span style={{ marginLeft: "auto", fontSize: 10, background: "rgba(255,255,255,.12)", padding: "3px 8px", borderRadius: 6, letterSpacing: "0.08em", fontWeight: 600, color: "rgba(255,255,255,.85)" }}>PRO</span>}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 0 8px", position: "relative" }}>
          <NavSection label="Principal" collapsed={collapsed} />
          <NavItem icon={BarChart2}      label="Analytics"     path="/dashboard"    active collapsed={collapsed} />
          <NavItem icon={Users}          label="Leads"         path="/leads"        collapsed={collapsed} />
          <NavItem icon={Mail}           label="Email Marketing" path="/email"      collapsed={collapsed} />
          <NavSection label="CRM" collapsed={collapsed} />
          <NavItem icon={Briefcase} label="Negócios" path="/crm" collapsed={collapsed} />
          <NavItem icon={Building2} label="Empresas" path="/empresas" collapsed={collapsed} />
          <NavItem icon={Activity} label="Atividades" path="/activities" collapsed={collapsed} />
          <NavItem icon={ListChecks} label="Tarefas" path="/tasks" collapsed={collapsed} />
          <NavItem icon={AlertTriangle} label="Em Risco" path="/risco" collapsed={collapsed} />
          <NavSection label="Ferramentas" collapsed={collapsed} />
          <NavItem icon={Star}           label="Scoring"       path="/scoring"      collapsed={collapsed} />
          <NavItem icon={LayoutTemplate} label="Landing Pages" path="/landing"      collapsed={collapsed} />
          <NavItem icon={Filter}         label="Segmentações"  path="/segments"     collapsed={collapsed} />
          <NavItem icon={Bot}            label="IA & Automação" path="/ai-marketing" collapsed={collapsed} />
          <NavItem icon={Zap}            label="Automação de Marketing" path="/workflow" collapsed={collapsed} />
          <NavSection label="Sistema" collapsed={collapsed} />
          <NavItem icon={Plug}           label="Integrações"   path="/integrations" collapsed={collapsed} />
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "8px 0", position: "relative" }}>
          <AccountMenu collapsed={collapsed} />
          <NavItem icon={Settings} label="Configurações" path="/settings" collapsed={collapsed} />
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "8px 0", position: "relative" }}>
          <div onClick={() => setCollapsed(c => !c)} title={collapsed ? "Expandir menu" : "Recolher menu"}
            style={{ display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-end", gap: 6, padding: collapsed ? "8px 0" : "8px 20px", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", cursor: "pointer", fontFamily: T.font }}>
            {collapsed ? <ChevronRight size={16} aria-hidden="true" /> : <><span>Recolher</span><ChevronLeft size={16} aria-hidden="true" /></>}
          </div>
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
            <Btn variant="secondary" icon={RefreshCw} size="sm" onClick={handleRefresh}>Atualizar</Btn>
            <Btn icon={Download} size="sm" onClick={handleExportCsv} disabled={exporting}>{exporting ? "Exportando…" : "Exportar"}</Btn>
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
          {activeTab === "overview"  && <OverviewSection key={`overview-${refreshKey}`} />}
          {activeTab === "funnel"    && <FunnelSection key={`funnel-${refreshKey}`} />}
          {activeTab === "reports"   && <ReportBuilder />}
          {activeTab === "channels"  && <ChannelSection key={`channels-${refreshKey}`} />}
          {activeTab === "realtime"  && <RealtimeSection key={`realtime-${refreshKey}`} />}
          {activeTab === "export"    && <ExportSection />}
        </div>
      </div>
    </div>
  );
}
