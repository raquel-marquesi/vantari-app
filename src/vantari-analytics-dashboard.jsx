import { useState, useEffect } from "react";
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
  blue:    "#0079a9",
  teal:    "#0079a9",
  green:   "#05b27b",
  purple:  "#6d45d9",
  orange:  "#e07b00",
  red:     "#EF4444",
  bg:      "#f2f5f8",
  surface: "#ffffff",
  border:  "#e2e8f0",
  text:    "#5f5f64",
  muted:   "#888891",
  faint3:  "#adadb5",
  faint:   "#f8fafc",
  font:    "'Aptos', 'Nunito Sans', sans-serif",
  head:    "'Montserrat', sans-serif",
};

const STAGE_COLORS = {
  Visitor: { bg: "#f1f5f9", text: "#475569", border: "#cbd5e1", hex: "#94a3b8" },
  Lead:    { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe", hex: "#3b82f6" },
  MQL:     { bg: "#fef3c7", text: "#92400e", border: "#fde68a", hex: "#f59e0b" },
  SQL:     { bg: "#f3f0ff", text: "#5b21b6", border: "#c4b5fd", hex: "#7c3aed" },
  Cliente: { bg: "#f0fdf4", text: "#14532d", border: "#86efac", hex: "#05b27b" },
};

/* ───── MOCK DATA ───── */
const monthlyTrend = [
  { month: "Jan", leads: 320, mqls: 89,  sqls: 34, clientes: 12, receita: 48000  },
  { month: "Fev", leads: 380, mqls: 112, sqls: 42, clientes: 15, receita: 60000  },
  { month: "Mar", leads: 410, mqls: 128, sqls: 51, clientes: 19, receita: 76000  },
  { month: "Abr", leads: 390, mqls: 118, sqls: 47, clientes: 17, receita: 68000  },
  { month: "Mai", leads: 520, mqls: 163, sqls: 68, clientes: 24, receita: 96000  },
  { month: "Jun", leads: 490, mqls: 155, sqls: 64, clientes: 22, receita: 88000  },
  { month: "Jul", leads: 560, mqls: 178, sqls: 74, clientes: 27, receita: 108000 },
  { month: "Ago", leads: 610, mqls: 196, sqls: 83, clientes: 30, receita: 120000 },
  { month: "Set", leads: 580, mqls: 184, sqls: 77, clientes: 28, receita: 112000 },
  { month: "Out", leads: 650, mqls: 209, sqls: 89, clientes: 32, receita: 128000 },
  { month: "Nov", leads: 720, mqls: 236, sqls: 101,clientes: 37, receita: 148000 },
  { month: "Dez", leads: 680, mqls: 220, sqls: 94, clientes: 34, receita: 136000 },
];

const channelData = [
  { canal: "Organic",    leads: 1840, custo: 2400,  roi: 767,  conversao: 4.2, cor: T.green },
  { canal: "Google Ads", leads: 1320, custo: 18600, roi: 324,  conversao: 3.1, cor: T.blue  },
  { canal: "Meta Ads",   leads: 980,  custo: 12400, roi: 289,  conversao: 2.8, cor: "#1877F2"},
  { canal: "Email Mkt",  leads: 760,  custo: 1800,  roi: 924,  conversao: 5.6, cor: T.teal  },
  { canal: "LinkedIn",   leads: 420,  custo: 8200,  roi: 187,  conversao: 6.1, cor: "#0A66C2"},
  { canal: "Indicação",  leads: 310,  custo: 0,     roi: 9999, conversao: 12.4,cor: T.purple },
];

const attributionData = [
  { name: "Google Ads", first: 38, last: 29, multi: 31 },
  { name: "Organic",    first: 24, last: 18, multi: 22 },
  { name: "Meta Ads",   first: 18, last: 22, multi: 19 },
  { name: "Email",      first: 10, last: 18, multi: 16 },
  { name: "LinkedIn",   first: 7,  last: 9,  multi: 8  },
  { name: "Outros",     first: 3,  last: 4,  multi: 4  },
];

const funnelStages = [
  { name: "Visitor", count: 48320, pct: 100,  conv: null, avgDays: null },
  { name: "Lead",    count: 5640,  pct: 11.7, conv: 11.7, avgDays: 0.3  },
  { name: "MQL",     count: 1180,  pct: 2.4,  conv: 20.9, avgDays: 8.2  },
  { name: "SQL",     count: 312,   pct: 0.6,  conv: 26.4, avgDays: 14.5 },
  { name: "Cliente", count: 94,    pct: 0.2,  conv: 30.1, avgDays: 22.8 },
];

const liveActivity = [
  { id: 1, type: "lead_novo",    msg: "Novo lead: Carla Mendonça (TechNova)",          time: "agora", color: T.blue   },
  { id: 2, type: "email_open",   msg: "Roberto Alves abriu campanha 'Q4 Nurturing'",   time: "2min",  color: T.teal   },
  { id: 3, type: "sql_convert",  msg: "SQL detectado: Lucas Pereira (Score 91)",        time: "5min",  color: T.green  },
  { id: 4, type: "email_click",  msg: "Ana Costa clicou em CTA — /pricing",             time: "8min",  color: T.purple },
  { id: 5, type: "form_submit",  msg: "Demo solicitada: Beatriz Nunes (E-shop Max)",    time: "12min", color: T.orange },
  { id: 6, type: "email_open",   msg: "Diego Rocha abriu campanha 'Boas-vindas'",       time: "15min", color: T.teal   },
  { id: 7, type: "lead_novo",    msg: "Novo lead: Fernanda Lima (StartupHub)",           time: "18min", color: T.blue   },
  { id: 8, type: "sql_convert",  msg: "Score alto: Marcos Oliveira (Score 88)",         time: "22min", color: T.green  },
];

const EVENT_ICONS = {
  lead_novo:   User,
  email_open:  Mail,
  sql_convert: Zap,
  email_click: Link2,
  form_submit: ClipboardList,
};

const campaignPerf = [
  { name: "Q4 Nurturing Series",        enviados: 4820,  abertos: 1688, cliques: 437, conversoes: 89,  abertura: 35.0, ctr: 9.1,  status: "ativo"     },
  { name: "Black Friday 2024",           enviados: 12400, abertos: 3720, cliques: 744, conversoes: 186, abertura: 30.0, ctr: 6.0,  status: "encerrado"  },
  { name: "Boas-vindas Onboarding",      enviados: 2310,  abertos: 1617, cliques: 578, conversoes: 231, abertura: 70.0, ctr: 25.0, status: "ativo"     },
  { name: "Reengajamento Inativos",      enviados: 1840,  abertos: 386,  cliques: 55,  conversoes: 11,  abertura: 21.0, ctr: 3.0,  status: "pausado"    },
  { name: "Demo Request Follow-up",      enviados: 312,   abertos: 265,  cliques: 140, conversoes: 78,  abertura: 84.9, ctr: 44.9, status: "ativo"     },
];

const alertsDB = [
  { id: 1, name: "Lead SQL detectado",      condition: "score >= 85",          recipients: ["equipe@vantari.com"],    last: "5min", count: 47,  enabled: true,  urgency: "high"   },
  { id: 2, name: "Campanha baixa abertura", condition: "abertura < 15%",       recipients: ["marketing@vantari.com"], last: "2h",   count: 8,   enabled: true,  urgency: "medium" },
  { id: 3, name: "Lead inativo há 30 dias", condition: "last_interaction > 30d",recipients: ["crm@vantari.com"],      last: "1d",   count: 124, enabled: true,  urgency: "low"    },
  { id: 4, name: "Erro sistema integração", condition: "webhook_error = true",  recipients: ["tech@vantari.com"],     last: "nunca",count: 0,   enabled: false, urgency: "high"   },
];

const todayVsYesterday = [
  { hora: "06h", hoje: 12,  ontem: 8   },
  { hora: "08h", hoje: 34,  ontem: 28  },
  { hora: "10h", hoje: 67,  ontem: 54  },
  { hora: "12h", hoje: 89,  ontem: 71  },
  { hora: "14h", hoje: 102, ontem: 88  },
  { hora: "16h", hoje: 118, ontem: 95  },
  { hora: "18h", hoje: 134, ontem: 108 },
];

const leadsPerStage = {
  Visitor: Array.from({ length: 8 }, (_, i) => ({ id: i, name: ["Maria","João","Ana","Pedro","Lucas","Beatriz","Carlos","Fern"][i], company: ["TechNova","Pixel","Hub","Brasil","Forte","Minds","Pro","Elite"][i], score: 10 + i * 3, source: ["Organic","Google Ads","Meta"][i % 3] })),
  Lead:    Array.from({ length: 6 }, (_, i) => ({ id: i, name: ["Silva","Rocha","Lima","Costa","Alves","Mendes"][i], company: ["TechA","TechB","TechC","TechD","TechE","TechF"][i], score: 25 + i * 5, source: ["Email","LinkedIn","Organic"][i % 3] })),
  MQL:     Array.from({ length: 5 }, (_, i) => ({ id: i, name: ["Ferreira","Martins","Nunes","Sousa","Ribeiro"][i], company: ["Alpha","Beta","Gamma","Delta","Epsilon"][i], score: 55 + i * 5, source: ["Google Ads","Email","Meta"][i % 3] })),
  SQL:     Array.from({ length: 4 }, (_, i) => ({ id: i, name: ["Pereira","Oliveira","Santos","Barbosa"][i], company: ["BigCo","ScaleUp","Enterprise","StartupX"][i], score: 80 + i * 5, source: ["Indicação","Google Ads","Email","LinkedIn"][i] })),
  Cliente: Array.from({ length: 3 }, (_, i) => ({ id: i, name: ["Monteiro","Carvalho","Dias"][i], company: ["Premium A","Premium B","Premium C"][i], score: 95 + i, source: ["Indicação","LinkedIn","Demo"][i] })),
};

const savedReports = [
  { id: 1, name: "Overview Executivo Mensal",       owner: "Você",       shared: 3, updated: "2h atrás" },
  { id: 2, name: "Performance Campanhas Q4",         owner: "marketing@", shared: 1, updated: "1d atrás" },
  { id: 3, name: "Pipeline SQL — Relatório Semanal", owner: "crm@",       shared: 5, updated: "3d atrás" },
];

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
    primary:   { bg: hov ? "#006a93" : T.blue,  color: "#fff", border: "none",                      shadow: hov ? "0 4px 12px rgba(0,121,169,0.35)" : "0 1px 4px rgba(0,121,169,0.2)" },
    secondary: { bg: hov ? "#e8f5fb" : "#fff",  color: T.blue, border: `1.5px solid ${T.blue}`,     shadow: "none" },
    ghost:     { bg: hov ? "#f1f5f9" : "transparent", color: T.text, border: "none",                shadow: "none" },
    danger:    { bg: hov ? "#dc2626" : "#ef4444", color: "#fff", border: "none",                    shadow: "none" },
    success:   { bg: hov ? "#04996a" : T.green,  color: "#fff", border: "none",                     shadow: "none" },
  }[variant] || {};
  const pad = { xs: "4px 8px", sm: "7px 14px", md: "9px 18px", lg: "11px 22px" }[size];
  const fs  = { xs: 10, sm: 12, md: 13, lg: 14 }[size];
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, background: v.bg, color: v.color, border: v.border || "none", borderRadius: 8, padding: pad, fontSize: fs, fontWeight: 700, fontFamily: T.font, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, boxShadow: v.shadow, transition: "all 0.15s", whiteSpace: "nowrap", ...s }}>
      {Icon && <Icon size={fs} aria-hidden="true" />}
      {children}
    </button>
  );
};

const Card = ({ children, style: s = {}, hover = false }) => {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => hover && setHov(true)} onMouseLeave={() => hover && setHov(false)}
      style={{ background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 12, padding: 20, boxShadow: hov ? "0 8px 24px rgba(0,0,0,0.08)" : "0 1px 3px rgba(0,0,0,0.04)", transition: "all 0.2s", ...s }}>
      {children}
    </div>
  );
};

const SectionTitle = ({ children, sub }) => (
  <div style={{ marginBottom: 16 }}>
    <h2 style={{ fontSize: 15, fontWeight: 700, color: T.text, fontFamily: T.head, margin: 0, letterSpacing: "-0.01em" }}>{children}</h2>
    {sub && <p style={{ fontSize: 12, color: T.muted, margin: "4px 0 0", fontFamily: T.font, fontWeight: 600 }}>{sub}</p>}
  </div>
);

const Badge = ({ children, color = T.blue, bg }) => (
  <span style={{ display: "inline-block", background: bg || `${color}18`, color, border: `0.5px solid ${color}30`, borderRadius: 20, padding: "2px 9px", fontSize: 11, fontWeight: 700, fontFamily: T.font }}>
    {children}
  </span>
);

const TrendChip = ({ value }) => {
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: up ? "#05b27b14" : "#fef2f2", color: up ? T.green : "#dc2626", borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700, fontFamily: T.font }}>
      <Icon size={10} aria-hidden="true" /> {Math.abs(value)}%
    </span>
  );
};

const MetricCard = ({ icon: Icon, label, value, trend, color = T.blue, sub }) => (
  <Card hover>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, background: `${color}14`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {Icon && <Icon size={20} color={color} aria-hidden="true" />}
      </div>
      {trend !== undefined && <TrendChip value={trend} />}
    </div>
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: T.text, fontFamily: T.head, letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: T.muted, fontFamily: T.font, marginTop: 4, fontWeight: 600 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color, fontFamily: T.font, marginTop: 3, fontWeight: 700 }}>{sub}</div>}
    </div>
  </Card>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: `0.5px solid ${T.border}`, borderRadius: 10, padding: "10px 14px", boxShadow: "0 4px 16px rgba(0,0,0,0.1)", fontFamily: T.font }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 12, color: p.color, fontWeight: 600 }}>
          {p.name}: <strong>{typeof p.value === "number" && p.value > 1000 ? `${(p.value / 1000).toFixed(1)}k` : p.value}</strong>
        </div>
      ))}
    </div>
  );
};

/* ───── SIDEBAR NAV HELPERS ───── */
const NavSection = ({ label }) => (
  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.45)", padding: "10px 20px 4px", textTransform: "uppercase", fontFamily: T.head }}>
    {label}
  </div>
);

const NavItem = ({ icon: Icon, label, active = false }) => {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 20px", fontSize: 13, fontWeight: active ? 700 : 600, fontFamily: T.font, color: active ? "#fff" : hov ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.6)", background: active ? "rgba(255,255,255,0.18)" : hov ? "rgba(255,255,255,0.08)" : "transparent", borderRight: active ? "2px solid #fff" : "2px solid transparent", cursor: "pointer", transition: "all 0.15s", userSelect: "none" }}>
      {Icon && <Icon size={16} aria-hidden="true" />}
      {label}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SECTION 1 — OVERVIEW EXECUTIVO
═══════════════════════════════════════════════════════════ */
const OverviewSection = () => {
  const [activeMetric, setActiveMetric] = useState("leads");

  const lineKeys = {
    leads:   { key: "leads",   color: T.blue,   label: "Leads"      },
    mqls:    { key: "mqls",    color: T.orange,  label: "MQLs"       },
    sqls:    { key: "sqls",    color: T.green,   label: "SQLs"       },
    receita: { key: "receita", color: T.purple,  label: "Receita (R$)" },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <MetricCard icon={Users}      label="Total de Leads"    value="5.640"  trend={12.4} color={T.blue}   sub="623 vs mês anterior" />
        <MetricCard icon={Star}       label="MQLs este mês"     value="236"    trend={8.7}  color={T.orange} sub="Taxa MQL: 4.2%" />
        <MetricCard icon={Zap}        label="SQLs qualificados" value="101"    trend={15.2} color={T.green}  sub="Taxa SQL: 1.8%" />
        <MetricCard icon={DollarSign} label="Taxa Conversão"    value="1.67%"  trend={3.1}  color={T.purple} sub="R$ 136k receita" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <SectionTitle>Crescimento Mensal</SectionTitle>
            <div style={{ display: "flex", gap: 6 }}>
              {Object.entries(lineKeys).map(([k, v]) => (
                <button key={k} onClick={() => setActiveMetric(k)}
                  style={{ background: activeMetric === k ? `${v.color}18` : "transparent", border: `0.5px solid ${activeMetric === k ? v.color : T.border}`, borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: activeMetric === k ? v.color : T.muted, fontFamily: T.font, cursor: "pointer" }}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyTrend}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={lineKeys[activeMetric].color} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={lineKeys[activeMetric].color} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: T.font, fill: T.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fontFamily: T.font, fill: T.muted }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey={lineKeys[activeMetric].key} name={lineKeys[activeMetric].label}
                stroke={lineKeys[activeMetric].color} strokeWidth={2.5} fill="url(#areaGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionTitle>Campanhas Ativas</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "Abertura Média",    value: "34.2%", sub: "+2.1pp vs anterior",        color: T.blue   },
              { label: "CTR Médio",         value: "9.4%",  sub: "+0.8pp vs anterior",         color: T.teal   },
              { label: "Conversões totais", value: "595",   sub: "este mês",                   color: T.green  },
              { label: "Campanhas ativas",  value: "3",     sub: "1 pausada, 1 encerrada",     color: T.purple },
            ].map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: T.faint, borderRadius: 10, border: `0.5px solid ${T.border}` }}>
                <div>
                  <div style={{ fontSize: 11, color: T.muted, fontFamily: T.font, fontWeight: 600 }}>{m.label}</div>
                  <div style={{ fontSize: 10, color: m.color, fontFamily: T.font, fontWeight: 700 }}>{m.sub}</div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: T.text, fontFamily: T.head, letterSpacing: "-0.03em" }}>{m.value}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Alerts */}
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <SectionTitle>Alertas Importantes</SectionTitle>
          <Badge color={T.red}>3 ativos</Badge>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
          {alertsDB.filter(a => a.enabled).map(a => {
            const urgencyColor = { high: T.red, medium: T.orange, low: T.teal }[a.urgency];
            const AlertIcon = a.urgency === "high" ? AlertTriangle : a.urgency === "medium" ? AlertCircle : Info;
            return (
              <div key={a.id} style={{ display: "flex", gap: 12, padding: "12px 14px", background: `${urgencyColor}08`, border: `0.5px solid ${urgencyColor}25`, borderRadius: 10, alignItems: "center" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${urgencyColor}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <AlertIcon size={16} color={urgencyColor} aria-hidden="true" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.text, fontFamily: T.font }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: T.muted, fontFamily: T.font, marginTop: 2, fontWeight: 600 }}>
                    Condição: <code style={{ background: "#f1f5f9", padding: "1px 5px", borderRadius: 4 }}>{a.condition}</code>
                  </div>
                  <div style={{ fontSize: 10, color: urgencyColor, fontFamily: T.font, marginTop: 2, fontWeight: 700 }}>
                    Último disparo: {a.last} · {a.count} ocorrências
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
const FunnelSection = () => {
  const [selectedStage, setSelectedStage] = useState(null);
  const [drillLeads,    setDrillLeads]    = useState([]);

  const handleStageClick = (stage) => {
    if (selectedStage === stage) { setSelectedStage(null); setDrillLeads([]); return; }
    setSelectedStage(stage);
    setDrillLeads(leadsPerStage[stage] || []);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card>
        <SectionTitle sub="Clique em cada etapa para ver os leads">Visualização do Pipeline</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 0, alignItems: "center" }}>
          {funnelStages.map((stage, i) => {
            const maxWidth = 700;
            const w   = maxWidth * (stage.count / funnelStages[0].count);
            const col = Object.values(STAGE_COLORS)[i];
            const isSelected = selectedStage === stage.name;
            return (
              <div key={stage.name} style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div onClick={() => handleStageClick(stage.name)}
                  style={{ width: `${(w / maxWidth) * 100}%`, minWidth: 220, padding: "14px 24px", background: isSelected ? col.hex : col.bg, border: `2px solid ${isSelected ? col.hex : col.border}`, borderRadius: i === 0 ? "12px 12px 0 0" : i === funnelStages.length - 1 ? "0 0 12px 12px" : "0", cursor: "pointer", transition: "all 0.2s", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? "#fff" : col.text, fontFamily: T.font }}>{stage.name}</span>
                    {stage.conv && <span style={{ fontSize: 11, color: isSelected ? "#ffffffaa" : T.muted, fontFamily: T.font, marginLeft: 8, fontWeight: 600 }}>conv. {stage.conv}%</span>}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: isSelected ? "#fff" : T.text, fontFamily: T.head, letterSpacing: "-0.03em" }}>
                      {stage.count.toLocaleString("pt-BR")}
                    </div>
                    <div style={{ fontSize: 10, color: isSelected ? "#ffffffaa" : T.muted, fontFamily: T.font, fontWeight: 600 }}>
                      {stage.avgDays ? `~${stage.avgDays}d nesta etapa` : "tráfego total"}
                    </div>
                  </div>
                </div>
                {i < funnelStages.length - 1 && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "4px 0" }}>
                    <div style={{ width: 1, height: 8, background: T.border }} />
                    <div style={{ fontSize: 10, color: T.muted, fontFamily: T.font, fontWeight: 600, padding: "2px 10px", background: "#f8fafc", borderRadius: 20, border: `0.5px solid ${T.border}` }}>
                      {funnelStages[i + 1].conv}% converte
                    </div>
                    <div style={{ width: 1, height: 8, background: T.border }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
        {funnelStages.map((s, i) => {
          const col = Object.values(STAGE_COLORS)[i];
          return (
            <Card key={s.name} hover style={{ padding: 14, cursor: "pointer", border: selectedStage === s.name ? `2px solid ${col.hex}` : `0.5px solid ${T.border}` }}
              onClick={() => handleStageClick(s.name)}>
              <div style={{ fontSize: 11, color: T.muted, fontFamily: T.font, marginBottom: 6, fontWeight: 600 }}>{s.name}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: T.text, fontFamily: T.head, letterSpacing: "-0.03em" }}>{s.count.toLocaleString("pt-BR")}</div>
              {s.avgDays && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: col.hex, fontFamily: T.font, fontWeight: 700, marginTop: 4 }}>
                  <Clock size={10} aria-hidden="true" /> {s.avgDays}d médios
                </div>
              )}
              {s.conv && <div style={{ fontSize: 10, color: T.muted, fontFamily: T.font, marginTop: 2, fontWeight: 600 }}>Conv: {s.conv}%</div>}
            </Card>
          );
        })}
      </div>

      {selectedStage && (
        <Card style={{ border: `2px solid ${STAGE_COLORS[selectedStage]?.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <SectionTitle>Leads em: {selectedStage}</SectionTitle>
            <Btn variant="ghost" icon={X} onClick={() => { setSelectedStage(null); setDrillLeads([]); }}>Fechar</Btn>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: T.font }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${T.border}` }}>
                  {["Nome","Empresa","Score","Fonte","Ação"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {drillLeads.map((l, i) => (
                  <tr key={l.id} style={{ borderBottom: `0.5px solid ${T.border}`, background: i % 2 === 0 ? T.faint : "#fff" }}>
                    <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 700, color: T.text }}>{l.name}</td>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: T.muted, fontWeight: 600 }}>{l.company}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{ background: l.score >= 80 ? "#05b27b14" : l.score >= 50 ? "#fef3c7" : "#fef2f2", color: l.score >= 80 ? T.green : l.score >= 50 ? "#92400e" : "#dc2626", borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>
                        {l.score}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 12, color: T.muted, fontWeight: 600 }}>{l.source}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <Btn size="xs" variant="secondary">Ver perfil</Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
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
          <div style={{ fontSize: 32, fontWeight: 800, color: T.blue, fontFamily: T.head, letterSpacing: "-0.03em" }}>5.640</div>
          <div style={{ fontSize: 11, color: T.muted, fontFamily: T.font, fontWeight: 600 }}>{w.metric}</div>
        </div>
      ),
      line_chart: () => (
        <ResponsiveContainer width="100%" height={80}>
          <LineChart data={monthlyTrend.slice(-6)}>
            <Line type="monotone" dataKey="leads" stroke={T.blue} strokeWidth={2} dot={false} />
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
              {[T.blue, T.teal, T.green, T.orange].map((c, i) => <Cell key={i} fill={c} />)}
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
        style={{ background: dragOver === w.id ? "#e8f5fb" : T.surface, border: `1.5px ${dragging === w.id ? "dashed" : "solid"} ${dragOver === w.id ? T.blue : T.border}`, borderRadius: 12, padding: "12px 14px", cursor: "grab", transition: "all 0.15s", position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: T.text, fontFamily: T.font }}>
            <WIcon size={12} color={T.blue} aria-hidden="true" /> {w.metric}
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
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: activeReport === r.id ? "#e8f5fb" : T.faint, border: `0.5px solid ${activeReport === r.id ? T.blue : T.border}`, borderRadius: 10, cursor: "pointer", transition: "all 0.15s" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: T.text, fontFamily: T.font }}>
                  <BarChart2 size={13} color={activeReport === r.id ? T.blue : T.muted} aria-hidden="true" />
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
                style={{ border: `0.5px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", fontSize: 12, fontFamily: T.font, fontWeight: 600, color: T.text, background: "#fff", cursor: "pointer" }}>
                {f.options.map(o => <option key={o}>{o}</option>)}
              </select>
            ))}
            <Btn icon={Plus} onClick={() => setShowAddWidget(!showAddWidget)}>Widget</Btn>
          </div>
        </div>

        {showAddWidget && (
          <div style={{ display: "flex", gap: 10, padding: "12px 14px", background: "#e8f5fb", border: `0.5px solid ${T.blue}30`, borderRadius: 10, marginBottom: 16, flexWrap: "wrap" }}>
            {WIDGET_TYPES.map(wt => {
              const WtIcon = wt.icon;
              return (
                <button key={wt.id} onClick={() => addWidget(wt)}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: `0.5px solid ${T.border}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, fontFamily: T.font, cursor: "pointer", fontWeight: 700 }}>
                  <WtIcon size={13} color={T.blue} aria-hidden="true" /> {wt.label}
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
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fontFamily: T.font, fill: T.muted }} axisLine={false} tickLine={false} />
              <YAxis dataKey="canal" type="category" tick={{ fontSize: 11, fontFamily: T.font, fill: T.text }} axisLine={false} tickLine={false} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="leads" name="Leads" radius={[0, 4, 4, 0]} fill={T.blue} />
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
                style={{ background: attribution === m.k ? T.blue : "#fff", color: attribution === m.k ? "#fff" : T.muted, border: `0.5px solid ${attribution === m.k ? T.blue : T.border}`, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, fontFamily: T.font, cursor: "pointer" }}>
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
                  <Cell key={i} fill={[T.blue, T.green, "#1877F2", T.teal, "#0A66C2", T.orange][i]} />
                ))}
              </Pie>
              <Tooltip formatter={v => `${v}%`} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
            {attributionData.map((d, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: [T.blue, T.green, "#1877F2", T.teal, "#0A66C2", T.orange][i], flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontFamily: T.font, color: T.text, flex: 1, fontWeight: 600 }}>{d.name}</span>
                <span style={{ fontSize: 13, fontWeight: 700, fontFamily: T.font, color: T.text }}>{d[attribution]}%</span>
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
                  <tr key={i} style={{ borderBottom: `0.5px solid ${T.border}`, background: i % 2 === 0 ? T.faint : "#fff" }}>
                    <td style={{ padding: "11px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.cor }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{c.canal}</span>
                      </div>
                    </td>
                    <td style={{ padding: "11px 12px", fontSize: 13, fontWeight: 700, color: T.text }}>{c.leads.toLocaleString("pt-BR")}</td>
                    <td style={{ padding: "11px 12px" }}><TrendChip value={deltaLeads} /></td>
                    <td style={{ padding: "11px 12px", fontSize: 12, color: T.muted, fontWeight: 600 }}>{c.conversao}%</td>
                    <td style={{ padding: "11px 12px" }}><TrendChip value={deltaCnv} /></td>
                    <td style={{ padding: "11px 12px", fontSize: 12, color: T.muted, fontWeight: 600 }}>{cpLead}</td>
                    <td style={{ padding: "11px 12px" }}>
                      <span style={{ fontWeight: 700, color: c.roi > 500 ? T.green : c.roi > 200 ? T.orange : T.red, fontSize: 13 }}>
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
  const [feed, setFeed] = useState(liveActivity);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
      const types  = ["lead_novo","email_open","email_click","form_submit"];
      const msgs   = [
        "Novo lead: Camila Ferreira (Alpha Co)",
        "Eduardo Lopes abriu email 'Demo Follow-up'",
        "Novo lead: Rodrigo Melo (ScaleUp)",
        "Demo solicitada: Priscila Torres",
        "Score alto: Wilson Teixeira (Score 87)",
      ];
      const colors = [T.blue, T.teal, T.green, T.orange];
      const t2     = types[Math.floor(Math.random() * types.length)];
      setFeed(prev => [{
        id:    Date.now(),
        type:  t2,
        msg:   msgs[Math.floor(Math.random() * msgs.length)],
        time:  "agora",
        color: colors[Math.floor(Math.random() * colors.length)],
      }, ...prev.slice(0, 11)]);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const liveStats = [
    { Icon: Users,         label: "Online agora",       getValue: (t) => 234 + (t % 7),             color: T.green, pulse: true  },
    { Icon: Mail,          label: "Emails abertos hoje", getValue: (t) => 1684 + t * 3,              color: T.blue,  pulse: false },
    { Icon: ClipboardList, label: "Forms hoje",          getValue: (t) => 47 + Math.floor(t / 2),    color: T.teal,  pulse: false },
    { Icon: Zap,           label: "SQLs hoje",           getValue: (t) => 8 + (t > 3 ? 1 : 0),       color: T.orange,pulse: false },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {liveStats.map((s, i) => {
          const SIcon = s.Icon;
          return (
            <Card key={i}>
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
              <div style={{ fontSize: 26, fontWeight: 800, color: T.text, fontFamily: T.head, letterSpacing: "-0.03em" }}>{s.getValue(tick).toLocaleString("pt-BR")}</div>
              <div style={{ fontSize: 11, color: T.muted, fontFamily: T.font, marginTop: 3, fontWeight: 600 }}>{s.label}</div>
            </Card>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card style={{ maxHeight: 360, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <SectionTitle>Atividade ao Vivo</SectionTitle>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.green, animation: "pulse 1.5s infinite" }} />
              <span style={{ fontSize: 11, color: T.green, fontWeight: 700, fontFamily: T.font }}>Streaming</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", maxHeight: 280 }}>
            {feed.map((e, i) => {
              const EIcon = EVENT_ICONS[e.type] || Activity;
              return (
                <div key={e.id} style={{ display: "flex", gap: 10, padding: "10px 12px", background: i === 0 ? `${e.color}08` : T.faint, border: `0.5px solid ${i === 0 ? e.color + "30" : T.border}`, borderRadius: 10, alignItems: "center", transition: "all 0.3s" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${e.color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <EIcon size={14} color={e.color} aria-hidden="true" />
                  </div>
                  <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.font }}>{e.msg}</div>
                  <div style={{ fontSize: 10, color: T.muted, fontFamily: T.font, flexShrink: 0, fontWeight: 600 }}>{e.time}</div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <SectionTitle sub="Leads gerados por hora">Hoje vs. Ontem</SectionTitle>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={todayVsYesterday}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="hora" tick={{ fontSize: 11, fontFamily: T.font, fill: T.muted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fontFamily: T.font, fill: T.muted }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontFamily: T.font, fontSize: 12 }} />
              <Line type="monotone" dataKey="hoje"  name="Hoje"  stroke={T.blue}   strokeWidth={2.5} dot={{ fill: T.blue,   r: 3 }} />
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
                const statusColor = { ativo: T.green, encerrado: T.muted, pausado: T.orange }[c.status];
                const perfPct     = Math.round((c.abertura / 40) * 100);
                return (
                  <tr key={i} style={{ borderBottom: `0.5px solid ${T.border}`, background: i % 2 === 0 ? T.faint : "#fff" }}>
                    <td style={{ padding: "11px 12px", fontSize: 12, fontWeight: 700, color: T.text }}>{c.name}</td>
                    <td style={{ padding: "11px 12px" }}><Badge color={statusColor}>{c.status}</Badge></td>
                    <td style={{ padding: "11px 12px", fontSize: 13, fontWeight: 700, color: c.abertura < 20 ? T.red : T.text }}>{c.abertura}%</td>
                    <td style={{ padding: "11px 12px", fontSize: 13, color: T.muted, fontWeight: 600 }}>{c.ctr}%</td>
                    <td style={{ padding: "11px 12px", fontSize: 13, fontWeight: 700, color: T.green }}>{c.conversoes}</td>
                    <td style={{ padding: "11px 12px", width: 120 }}>
                      <div style={{ height: 6, background: T.border, borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(perfPct, 100)}%`, background: perfPct >= 75 ? T.green : perfPct >= 40 ? T.orange : T.red, borderRadius: 99 }} />
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
            const urgencyColor = { high: T.red, medium: T.orange, low: T.teal }[a.urgency];
            return (
              <div key={a.id} style={{ display: "flex", gap: 14, padding: "12px 16px", background: T.faint, border: `0.5px solid ${T.border}`, borderRadius: 10, alignItems: "center" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: a.enabled ? urgencyColor : T.border, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: T.font }}>{a.name}</span>
                    {!a.enabled && <Badge color={T.muted}>Desativado</Badge>}
                  </div>
                  <div style={{ fontSize: 11, color: T.muted, fontFamily: T.font, marginTop: 2, fontWeight: 600 }}>
                    Se <code style={{ background: "#f1f5f9", padding: "1px 5px", borderRadius: 4 }}>{a.condition}</code> → envia para {a.recipients.join(", ")}
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
  const [schedules, setSchedules] = useState([
    { id: 1, report: "Overview Executivo Mensal",       frequency: "Semanal", day: "Segunda", time: "08:00", recipients: "diretoria@vantari.com", active: true  },
    { id: 2, report: "Pipeline SQL — Relatório Semanal",frequency: "Diário",  day: "—",       time: "07:00", recipients: "crm@vantari.com",       active: true  },
    { id: 3, report: "Performance Campanhas",           frequency: "Mensal",  day: "Dia 1",   time: "09:00", recipients: "marketing@vantari.com",  active: false },
  ]);
  const [apiCopied, setApiCopied] = useState(null);
  const copyEndpoint = (path) => { setApiCopied(path); setTimeout(() => setApiCopied(null), 2000); };

  const exportOptions = [
    { Icon: FileText,       label: "Export PDF",             sub: "Relatório completo com logo e cores", format: "PDF",   color: T.red    },
    { Icon: BarChart2,      label: "Export Excel",           sub: "Dados tabulares + gráficos",          format: "XLSX",  color: T.green  },
    { Icon: FileSpreadsheet,label: "Export CSV",             sub: "Dados brutos para BI externo",        format: "CSV",   color: T.blue   },
    { Icon: Link2,          label: "Dashboard Embeddable",   sub: "Link iframe para stakeholders",       format: "EMBED", color: T.purple },
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
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: T.faint, border: `0.5px solid ${T.border}`, borderRadius: 10 }}>
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
              <div key={s.id} style={{ padding: "12px 14px", background: s.active ? "#05b27b08" : T.faint, border: `0.5px solid ${s.active ? T.green + "40" : T.border}`, borderRadius: 10 }}>
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
        <div style={{ background: "#0f172a", borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontFamily: "monospace" }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>Base URL</div>
          <div style={{ fontSize: 13, color: "#e2e8f0" }}>https://api.vantari.com.br/v1</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {apiEndpoints.map((ep, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "11px 14px", background: T.faint, border: `0.5px solid ${T.border}`, borderRadius: 10, alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: ep.method === "GET" ? T.green : T.blue, fontFamily: "monospace", background: `${ep.method === "GET" ? T.green : T.blue}14`, padding: "3px 8px", borderRadius: 6, flexShrink: 0 }}>
                {ep.method}
              </span>
              <code style={{ fontSize: 12, color: T.blue, fontFamily: "monospace", flex: "0 0 auto" }}>{ep.path}</code>
              <span style={{ fontSize: 11, color: T.muted, fontFamily: T.font, fontWeight: 600, flex: 1 }}>{ep.desc}</span>
              <Badge color={T.purple}>{ep.auth}</Badge>
              <button onClick={() => copyEndpoint(ep.path)}
                style={{ background: "none", border: `0.5px solid ${T.border}`, borderRadius: 6, padding: "4px 10px", fontSize: 11, fontFamily: T.font, fontWeight: 700, cursor: "pointer", color: apiCopied === ep.path ? T.green : T.muted, display: "flex", alignItems: "center", gap: 4 }}>
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
            <div key={i} style={{ padding: "16px", background: T.faint, border: `0.5px solid ${T.border}`, borderRadius: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: T.text, fontFamily: T.font, marginBottom: 8 }}>
                <Monitor size={14} color={T.blue} aria-hidden="true" /> {d.name}
              </div>
              <div style={{ fontSize: 11, color: T.muted, fontFamily: T.font, marginBottom: 4, fontWeight: 600 }}>{d.views} visualizações · {d.lastView}</div>
              <code style={{ fontSize: 10, color: T.blue, background: "#e8f5fb", padding: "3px 8px", borderRadius: 6, display: "block", marginBottom: 10 }}>{d.token}</code>
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
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700&family=Nunito+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(5,178,123,0.3); }
          50%       { box-shadow: 0 0 0 6px rgba(5,178,123,0.1); }
        }
      `}</style>

      {/* ── SIDEBAR ── Analytics = dashboard principal: sem logo */}
      <div style={{ width: 220, background: "#0079a9", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#fff", fontFamily: T.head, letterSpacing: "0.04em" }}>Vantari</span>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          <NavSection label="Principal" />
          <NavItem icon={BarChart2}      label="Analytics"      active />
          <NavItem icon={Users}          label="Leads"          />
          <NavItem icon={Mail}           label="Email Marketing"/>
          <NavSection label="Ferramentas" />
          <NavItem icon={Star}           label="Scoring"        />
          <NavItem icon={LayoutTemplate} label="Landing Pages"  />
          <NavItem icon={Bot}            label="IA & Automação" />
          <NavSection label="Sistema" />
          <NavItem icon={Plug}           label="Integrações"    />
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)", padding: "8px 0" }}>
          <NavItem icon={Settings} label="Configurações" />
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Topbar */}
        <div style={{ height: 52, background: T.surface, borderBottom: `0.5px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0, zIndex: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: T.text, fontFamily: T.head, letterSpacing: "-0.01em" }}>
            {TAB_LABELS[activeTab]}
          </span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select value={globalDateRange} onChange={e => setGlobalDateRange(e.target.value)}
              style={{ border: `0.5px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", fontSize: 12, fontFamily: T.font, fontWeight: 600, color: T.text, background: "#fff", cursor: "pointer" }}>
              {["7d","30d","90d","12m"].map(o => <option key={o}>{o}</option>)}
            </select>
            <Btn variant="secondary" icon={RefreshCw} size="sm">Atualizar</Btn>
            <Btn icon={Download} size="sm">Exportar</Btn>
          </div>
        </div>

        {/* Sub-tabs */}
        <div style={{ background: T.surface, borderBottom: `0.5px solid ${T.border}`, padding: "0 24px", display: "flex", gap: 2, flexShrink: 0 }}>
          {TABS.map(t => {
            const TIcon = t.icon;
            const active = activeTab === t.id;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", background: "none", border: "none", borderBottom: active ? `2px solid ${T.blue}` : "2px solid transparent", cursor: "pointer", fontSize: 12, fontWeight: active ? 700 : 600, color: active ? T.blue : T.muted, fontFamily: T.font, transition: "all 0.15s" }}>
                <TIcon size={14} aria-hidden="true" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
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
