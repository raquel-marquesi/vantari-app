import { useState, useEffect, useCallback } from "react";
import {
  BarChart2, Users, Mail, Star, Layout, Bot, Plug, Settings,
  TrendingUp, TrendingDown, AlertCircle, AlertTriangle, Info,
  Download, RefreshCw, ChevronDown, Bell, Search, Filter,
  X, Plus, Share2, FileText, Zap, Clock, Eye, Activity,
  MousePointer, Send, Globe, Target, DollarSign, Percent,
  Edit2, Play, Pause, Copy, Check, ExternalLink, Code,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, ComposedChart, Legend,
} from "recharts";

/* ═══════════════════════════════════════════════════════════
   DESIGN TOKENS — Vantari Unified Brand System v2
═══════════════════════════════════════════════════════════ */
const T = {
  blue:       "#0079a9",
  blueLight:  "#e0f3fa",
  blueMid:    "#3a9fc4",
  green:      "#05b27b",
  greenLight: "#e3f9f1",
  teal:       "#0E7CA3",
  tealLight:  "#e4f3f8",
  orange:     "#e07b00",
  orangeLight:"#fff3e0",
  red:        "#dc2626",
  redLight:   "#fef2f2",
  purple:     "#6d45d9",
  purpleLight:"#ede9fe",

  sidebar:        "#0079a9",
  sidebarHov:     "rgba(255,255,255,0.10)",
  sidebarActive:  "rgba(0,0,0,0.18)",
  sidebarBorder:  "rgba(255,255,255,0.12)",
  sidebarText:    "rgba(255,255,255,0.65)",
  sidebarTextHov: "rgba(255,255,255,0.95)",

  bg:       "#f2f5f8",
  surface:  "#ffffff",
  border:   "#e3e8ee",
  borderMid:"#c8d3dc",
  faint:    "#f7f9fb",

  text:    "#5f5f64",
  textSec: "#888891",
  textTer: "#adadb5",

  heading: "'Montserrat', sans-serif",
  body:    "'Aptos', 'Nunito Sans', sans-serif",
};

/* ═══════════════════════════════════════════════════════════
   MOCK DATA
═══════════════════════════════════════════════════════════ */
const monthlyTrend = [
  { month:"Jan", leads:320, mqls:89,  sqls:34,  clientes:12, receita:48000  },
  { month:"Fev", leads:380, mqls:112, sqls:42,  clientes:15, receita:60000  },
  { month:"Mar", leads:410, mqls:128, sqls:51,  clientes:19, receita:76000  },
  { month:"Abr", leads:390, mqls:118, sqls:47,  clientes:17, receita:68000  },
  { month:"Mai", leads:520, mqls:163, sqls:68,  clientes:24, receita:96000  },
  { month:"Jun", leads:490, mqls:155, sqls:64,  clientes:22, receita:88000  },
  { month:"Jul", leads:560, mqls:178, sqls:74,  clientes:27, receita:108000 },
  { month:"Ago", leads:610, mqls:196, sqls:83,  clientes:30, receita:120000 },
  { month:"Set", leads:580, mqls:184, sqls:77,  clientes:28, receita:112000 },
  { month:"Out", leads:650, mqls:209, sqls:89,  clientes:32, receita:128000 },
  { month:"Nov", leads:720, mqls:236, sqls:101, clientes:37, receita:148000 },
  { month:"Dez", leads:680, mqls:220, sqls:94,  clientes:34, receita:136000 },
];

const channelData = [
  { canal:"Organic",    leads:1840, custo:2400,  roi:767,  conversao:4.2, cor:T.green  },
  { canal:"Google Ads", leads:1320, custo:18600, roi:324,  conversao:3.1, cor:T.blue   },
  { canal:"Meta Ads",   leads:980,  custo:12400, roi:289,  conversao:2.8, cor:"#1877F2"},
  { canal:"Email Mkt",  leads:760,  custo:1800,  roi:924,  conversao:5.6, cor:T.teal   },
  { canal:"LinkedIn",   leads:420,  custo:8200,  roi:187,  conversao:6.1, cor:"#0A66C2"},
  { canal:"Indicação",  leads:310,  custo:0,     roi:9999, conversao:12.4,cor:T.purple },
];

const attributionData = [
  { name:"Google Ads", first:38, last:29, multi:31 },
  { name:"Organic",    first:24, last:18, multi:22 },
  { name:"Meta Ads",   first:18, last:22, multi:19 },
  { name:"Email",      first:10, last:18, multi:16 },
  { name:"LinkedIn",   first:7,  last:9,  multi:8  },
  { name:"Outros",     first:3,  last:4,  multi:4  },
];

const funnelStages = [
  { name:"Visitantes", count:48320, pct:100,  conv:null, avgDays:null },
  { name:"Lead",       count:5640,  pct:11.7, conv:11.7, avgDays:0.3  },
  { name:"MQL",        count:1180,  pct:2.4,  conv:20.9, avgDays:8.2  },
  { name:"SQL",        count:312,   pct:0.6,  conv:26.4, avgDays:14.5 },
  { name:"Cliente",    count:94,    pct:0.2,  conv:30.1, avgDays:22.8 },
];

const stageColors = [T.textTer, T.blue, T.orange, T.teal, T.green]; // green = #05b27b accent

const alertsDB = [
  { id:1, name:"Lead SQL detectado",      condition:"score >= 85",        recipients:["equipe@vantari.com"],    last:"5min", count:47,  enabled:true,  urgency:"high"   },
  { id:2, name:"Campanha baixa abertura", condition:"abertura < 15%",     recipients:["marketing@vantari.com"], last:"2h",   count:8,   enabled:true,  urgency:"medium" },
  { id:3, name:"Lead inativo 30d",        condition:"last_interaction>30d",recipients:["crm@vantari.com"],      last:"1d",   count:124, enabled:true,  urgency:"low"    },
  { id:4, name:"Erro integração",         condition:"webhook_error=true",  recipients:["tech@vantari.com"],      last:"—",    count:0,   enabled:false, urgency:"high"   },
];

const campaignPerf = [
  { name:"Q4 Nurturing Series",     enviados:4820,  abertura:35.0, ctr:9.1,  conversoes:89,  status:"ativo"     },
  { name:"Black Friday 2024",       enviados:12400, abertura:30.0, ctr:6.0,  conversoes:186, status:"encerrado" },
  { name:"Boas-vindas Onboarding",  enviados:2310,  abertura:70.0, ctr:25.0, conversoes:231, status:"ativo"     },
  { name:"Reengajamento Inativos",  enviados:1840,  abertura:21.0, ctr:3.0,  conversoes:11,  status:"pausado"   },
  { name:"Demo Request Follow-up",  enviados:312,   abertura:84.9, ctr:44.9, conversoes:78,  status:"ativo"     },
];

const todayVsYesterday = [
  { hora:"06h", hoje:12,  ontem:8   },
  { hora:"08h", hoje:34,  ontem:28  },
  { hora:"10h", hoje:67,  ontem:54  },
  { hora:"12h", hoje:89,  ontem:71  },
  { hora:"14h", hoje:102, ontem:88  },
  { hora:"16h", hoje:118, ontem:95  },
  { hora:"18h", hoje:134, ontem:108 },
];

const liveActivity = [
  { id:1, type:"lead_novo",   msg:"Novo lead: Carla Mendonça (TechNova)",         time:"agora", color:T.blue   },
  { id:2, type:"email_open",  msg:"Roberto Alves abriu 'Q4 Nurturing'",           time:"2min",  color:T.teal   },
  { id:3, type:"sql_convert", msg:"SQL detectado: Lucas Pereira (Score 91)",       time:"5min",  color:T.green  },
  { id:4, type:"email_click", msg:"Ana Costa clicou em CTA — /pricing",           time:"8min",  color:T.purple },
  { id:5, type:"form_submit", msg:"Demo solicitada: Beatriz Nunes (E-shop Max)",  time:"12min", color:T.orange },
  { id:6, type:"email_open",  msg:"Diego Rocha abriu 'Boas-vindas'",              time:"15min", color:T.teal   },
  { id:7, type:"lead_novo",   msg:"Novo lead: Fernanda Lima (StartupHub)",         time:"18min", color:T.blue   },
  { id:8, type:"sql_convert", msg:"Score alto: Marcos Oliveira (Score 88)",        time:"22min", color:T.green  },
];

const schedules = [
  { id:1, report:"Overview Executivo Mensal",    frequency:"Semanal", time:"08:00", recipients:"diretoria@vantari.com", active:true  },
  { id:2, report:"Pipeline SQL — Semanal",        frequency:"Diário",  time:"07:00", recipients:"crm@vantari.com",       active:true  },
  { id:3, report:"Performance Campanhas",         frequency:"Mensal",  time:"09:00", recipients:"marketing@vantari.com", active:false },
];

const apiEndpoints = [
  { method:"GET",  path:"/api/v1/analytics/overview",   desc:"KPIs principais do overview executivo",     auth:"Bearer" },
  { method:"GET",  path:"/api/v1/analytics/funnel",     desc:"Dados do funil de vendas por etapa",        auth:"Bearer" },
  { method:"GET",  path:"/api/v1/analytics/channels",   desc:"Performance e ROI por canal",               auth:"Bearer" },
  { method:"POST", path:"/api/v1/reports/generate",     desc:"Gera relatório personalizado",              auth:"Bearer" },
  { method:"GET",  path:"/api/v1/dashboard/embed/:id",  desc:"Token embeddable para dashboard",           auth:"API Key"},
];

const savedReports = [
  { id:1, name:"Overview Executivo Mensal",     owner:"Você",        shared:3, updated:"2h atrás" },
  { id:2, name:"Performance Campanhas Q4",       owner:"marketing@",  shared:1, updated:"1d atrás" },
  { id:3, name:"Pipeline SQL — Semanal",         owner:"crm@",        shared:5, updated:"3d atrás" },
];

/* ═══════════════════════════════════════════════════════════
   PRIMITIVE COMPONENTS
═══════════════════════════════════════════════════════════ */
const Btn = ({ children, onClick, variant="primary", size="sm", icon:Icon, disabled, style:sx={} }) => {
  const [hov, setHov] = useState(false);
  const v = {
    primary:   { bg: hov ? "#0a4d99" : T.blue,   color:"#fff",    border:"none"                            },
    secondary: { bg: hov ? T.blueLight : "#fff",  color:T.blue,   border:`1px solid ${hov?T.blue:T.border}`},
    ghost:     { bg: hov ? T.faint : "transparent", color:T.textSec, border:`1px solid ${T.border}`         },
    danger:    { bg: hov ? "#b91c1c" : T.red,     color:"#fff",    border:"none"                            },
    success:   { bg: hov ? "#059669" : T.green,   color:"#fff",    border:"none"                            },
    outline:   { bg: "transparent", color:T.textSec, border:`1px solid ${T.border}`                         },
  }[variant] || {};
  const pad = { xs:"4px 10px", sm:"7px 14px", md:"9px 18px", lg:"11px 24px" }[size];
  const fs  = { xs:11, sm:12, md:13, lg:14 }[size];
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ display:"inline-flex", alignItems:"center", gap:6, background:v.bg, color:v.color,
        border:v.border||"none", borderRadius:8, padding:pad, fontSize:fs, fontWeight:500,
        fontFamily:T.body, cursor:disabled?"not-allowed":"pointer", opacity:disabled?.5:1,
        transition:"all .15s", whiteSpace:"nowrap", letterSpacing:"0.01em", ...sx }}>
      {Icon && <Icon size={fs+1} />}
      {children}
    </button>
  );
};

const Card = ({ children, style:sx={}, accent }) => (
  <div style={{
    background: T.surface, border:`1px solid ${T.border}`, borderRadius:12,
    padding:20, borderLeft: accent ? `3px solid ${T.blue}` : undefined, ...sx
  }}>
    {children}
  </div>
);

const PageTitle = ({ children, sub }) => (
  <div style={{ marginBottom:20 }}>
    <h1 style={{ fontSize:22, fontWeight:700, color:T.text, fontFamily:T.heading,
      letterSpacing:"-0.02em", margin:0 }}>{children}</h1>
    {sub && <p style={{ fontSize:13, color:T.textSec, margin:"4px 0 0", fontFamily:T.body }}>{sub}</p>}
  </div>
);

const SectionTitle = ({ children, sub }) => (
  <div style={{ marginBottom:14 }}>
    <h2 style={{ fontSize:14, fontWeight:600, color:T.text, fontFamily:T.heading,
      letterSpacing:"-0.01em", margin:0 }}>{children}</h2>
    {sub && <p style={{ fontSize:12, color:T.textSec, margin:"3px 0 0", fontFamily:T.body }}>{sub}</p>}
  </div>
);

const Pill = ({ children, color=T.blue, bg }) => (
  <span style={{ display:"inline-block", background:bg||`${color}16`, color,
    border:`1px solid ${color}30`, borderRadius:20, padding:"2px 10px",
    fontSize:11, fontWeight:500, fontFamily:T.body, letterSpacing:"0.01em" }}>
    {children}
  </span>
);

const TrendBadge = ({ value }) => {
  const up = value >= 0;
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:3,
      background: up?"#ecfdf5":"#fef2f2", color: up?"#059669":"#dc2626",
      borderRadius:20, padding:"2px 8px", fontSize:11, fontWeight:500, fontFamily:T.body }}>
      {up ? <TrendingUp size={10}/> : <TrendingDown size={10}/>}
      {Math.abs(value)}%
    </span>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#fff", border:`1px solid ${T.border}`, borderRadius:10,
      padding:"10px 14px", boxShadow:"0 4px 16px rgba(0,0,0,0.08)", fontFamily:T.body }}>
      <div style={{ fontSize:12, fontWeight:600, color:T.text, marginBottom:6 }}>{label}</div>
      {payload.map((p,i) => (
        <div key={i} style={{ fontSize:12, color:p.color, fontWeight:500 }}>
          {p.name}: <strong>{typeof p.value==="number"&&p.value>1000?`${(p.value/1000).toFixed(1)}k`:p.value}</strong>
        </div>
      ))}
    </div>
  );
};

const StatusPill = ({ status }) => {
  const cfg = {
    ativo:     { color:T.green,  bg:T.greenLight,  label:"Ativo"     },
    encerrado: { color:T.textSec,bg:T.faint,       label:"Encerrado" },
    pausado:   { color:T.orange, bg:T.orangeLight,  label:"Pausado"   },
  }[status] || { color:T.textSec, bg:T.faint, label:status };
  return <Pill color={cfg.color} bg={cfg.bg}>{cfg.label}</Pill>;
};

/* ─── Metric Card ─── */
const MetricCard = ({ IconComponent, label, value, trend, color=T.blue, sub }) => (
  <Card style={{ padding:"18px 20px" }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
      <div style={{ width:38, height:38, borderRadius:10, background:`${color}14`,
        display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <IconComponent size={18} color={color} />
      </div>
      {trend !== undefined && <TrendBadge value={trend} />}
    </div>
    <div style={{ fontSize:28, fontWeight:700, color:T.text, fontFamily:T.heading,
      letterSpacing:"-0.03em", lineHeight:1 }}>{value}</div>
    <div style={{ fontSize:12, color:T.textSec, fontFamily:T.body, marginTop:4 }}>{label}</div>
    {sub && <div style={{ fontSize:11, color, fontFamily:T.body, marginTop:3, fontWeight:500 }}>{sub}</div>}
  </Card>
);

/* ═══════════════════════════════════════════════════════════
   SECTION 1 — OVERVIEW
═══════════════════════════════════════════════════════════ */
const OverviewSection = () => {
  const [metric, setMetric] = useState("leads");
  const metricMap = {
    leads:   { key:"leads",   color:T.blue,   label:"Leads"       },
    mqls:    { key:"mqls",    color:T.orange,  label:"MQLs"        },
    sqls:    { key:"sqls",    color:T.teal,   label:"SQLs"        },
    receita: { key:"receita", color:T.green,  label:"Receita (R$)"},
  };
  const m = metricMap[metric];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
        <MetricCard IconComponent={Users}      label="Total de leads"    value="5.640"  trend={12.4} color={T.blue}   sub="↑ 623 vs mês anterior" />
        <MetricCard IconComponent={Target}     label="MQLs este mês"    value="236"    trend={8.7}  color={T.orange}  sub="Taxa MQL: 4.2%" />
        <MetricCard IconComponent={Zap}        label="SQLs qualificados" value="101"    trend={15.2} color={T.teal}   sub="Taxa SQL: 1.8%" />
        <MetricCard IconComponent={DollarSign} label="Receita mensal"    value="R$ 136k" trend={3.1} color={T.green}  sub="1.67% taxa conversão" />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:14 }}>
        <Card>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <SectionTitle>Crescimento mensal</SectionTitle>
            <div style={{ display:"flex", gap:5 }}>
              {Object.entries(metricMap).map(([k,v]) => (
                <button key={k} onClick={()=>setMetric(k)}
                  style={{ background: metric===k?`${v.color}14`:"transparent",
                    border:`1px solid ${metric===k?v.color:T.border}`, borderRadius:7,
                    padding:"4px 10px", fontSize:11, fontWeight:500,
                    color: metric===k?v.color:T.textSec, fontFamily:T.body, cursor:"pointer" }}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyTrend}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={m.color} stopOpacity={0.12}/>
                  <stop offset="95%" stopColor={m.color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f3f7" />
              <XAxis dataKey="month" tick={{ fontSize:11, fontFamily:T.body, fill:T.textTer }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:11, fontFamily:T.body, fill:T.textTer }} axisLine={false} tickLine={false}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Area type="monotone" dataKey={m.key} name={m.label}
                stroke={m.color} strokeWidth={2.5} fill="url(#grad)" dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionTitle>Campanhas ativas</SectionTitle>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {[
              { label:"Abertura média",    value:"34.2%", delta:"+2.1pp", color:T.blue  },
              { label:"CTR médio",          value:"9.4%",  delta:"+0.8pp", color:T.teal  },
              { label:"Conversões totais", value:"595",   delta:"este mês",color:T.green },
              { label:"Campanhas ativas",  value:"3",     delta:"1 pausada",color:T.orange},
            ].map((item,i)=>(
              <div key={i} style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center", padding:"10px 12px", background:T.faint,
                borderRadius:8, border:`1px solid ${T.border}` }}>
                <div>
                  <div style={{ fontSize:11, color:T.textSec, fontFamily:T.body }}>{item.label}</div>
                  <div style={{ fontSize:10, color:item.color, fontFamily:T.body, marginTop:1, fontWeight:500 }}>{item.delta}</div>
                </div>
                <div style={{ fontSize:20, fontWeight:700, color:T.text,
                  fontFamily:T.heading, letterSpacing:"-0.02em" }}>{item.value}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card accent>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <SectionTitle>Alertas ativos</SectionTitle>
          <Pill color={T.red}>3 ativos</Pill>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {alertsDB.filter(a=>a.enabled).map(a => {
            const urgColor = { high:T.red, medium:T.orange, low:T.teal }[a.urgency];
            const UrgIcon  = { high:AlertCircle, medium:AlertTriangle, low:Info }[a.urgency];
            return (
              <div key={a.id} style={{ display:"flex", gap:12, padding:"12px 14px",
                background:`${urgColor}06`, border:`1px solid ${urgColor}22`,
                borderRadius:10, alignItems:"flex-start" }}>
                <div style={{ width:34, height:34, borderRadius:9, background:`${urgColor}16`,
                  display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
                  <UrgIcon size={16} color={urgColor}/>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:T.text, fontFamily:T.body }}>{a.name}</div>
                  <div style={{ fontSize:11, color:T.textSec, fontFamily:T.body, marginTop:2 }}>
                    Condição: <code style={{ background:"#f1f5f9", padding:"1px 6px",
                      borderRadius:4, fontSize:10 }}>{a.condition}</code>
                  </div>
                  <div style={{ fontSize:10, color:urgColor, fontFamily:T.body, marginTop:2, fontWeight:500 }}>
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
   SECTION 2 — FUNIL
═══════════════════════════════════════════════════════════ */
const FunnelSection = () => {
  const [selected, setSelected] = useState(null);
  const toggle = (name) => setSelected(p => p===name ? null : name);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
      <Card>
        <SectionTitle sub="Clique em cada etapa para detalhes">Visualização do pipeline</SectionTitle>
        <div style={{ display:"flex", flexDirection:"column", gap:0, alignItems:"center" }}>
          {funnelStages.map((s,i) => {
            const w = (s.count / funnelStages[0].count) * 100;
            const color = stageColors[i];
            const isSelected = selected===s.name;
            return (
              <div key={s.name} style={{ width:"100%", display:"flex", flexDirection:"column", alignItems:"center" }}>
                <div onClick={()=>toggle(s.name)}
                  style={{ width:`${Math.max(w,25)}%`, minWidth:220, padding:"14px 24px",
                    background: isSelected ? color : `${color}12`,
                    border:`1.5px solid ${isSelected?color:`${color}30`}`,
                    borderRadius: i===0?"10px 10px 0 0" : i===funnelStages.length-1?"0 0 10px 10px":"0",
                    cursor:"pointer", transition:"all .2s",
                    display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <span style={{ fontSize:13, fontWeight:600,
                      color: isSelected?"#fff":T.text, fontFamily:T.body }}>{s.name}</span>
                    {s.conv && <span style={{ fontSize:11,
                      color: isSelected?"rgba(255,255,255,0.65)":T.textSec,
                      fontFamily:T.body, marginLeft:8 }}>conv. {s.conv}%</span>}
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:20, fontWeight:700,
                      color: isSelected?"#fff":T.text, fontFamily:T.heading,
                      letterSpacing:"-0.02em" }}>{s.count.toLocaleString("pt-BR")}</div>
                    <div style={{ fontSize:10, color: isSelected?"rgba(255,255,255,0.6)":T.textTer,
                      fontFamily:T.body }}>
                      {s.avgDays ? `~${s.avgDays}d nesta etapa` : "tráfego total"}
                    </div>
                  </div>
                </div>
                {i<funnelStages.length-1 && (
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"4px 0" }}>
                    <div style={{ width:1, height:8, background:T.border }}/>
                    <div style={{ fontSize:10, color:T.textTer, fontFamily:T.body,
                      padding:"2px 10px", background:T.faint, borderRadius:20, border:`1px solid ${T.border}` }}>
                      ↓ {funnelStages[i+1].conv}% converte
                    </div>
                    <div style={{ width:1, height:8, background:T.border }}/>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10 }}>
        {funnelStages.map((s,i)=>(
          <Card key={s.name} style={{ padding:14, cursor:"pointer",
            border: selected===s.name?`1.5px solid ${stageColors[i]}`:`1px solid ${T.border}`,
            borderLeft: `3px solid ${stageColors[i]}` }}
            onClick={()=>toggle(s.name)}>
            <div style={{ fontSize:10, color:T.textSec, fontFamily:T.body, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.06em" }}>{s.name}</div>
            <div style={{ fontSize:22, fontWeight:700, color:T.text, fontFamily:T.heading,
              letterSpacing:"-0.02em" }}>{s.count.toLocaleString("pt-BR")}</div>
            {s.avgDays && <div style={{ fontSize:10, color:stageColors[i], fontFamily:T.body, fontWeight:500, marginTop:4, display:"flex", alignItems:"center", gap:3 }}>
              <Clock size={10}/> {s.avgDays}d médios
            </div>}
            {s.conv && <div style={{ fontSize:10, color:T.textTer, fontFamily:T.body, marginTop:2 }}>Conv. {s.conv}%</div>}
          </Card>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:14 }}>
        <Card>
          <SectionTitle sub="Velocidade média por etapa do funil">Tempo médio por etapa</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={funnelStages.filter(s=>s.avgDays)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f3f7"/>
              <XAxis dataKey="name" tick={{ fontSize:11, fontFamily:T.body, fill:T.textTer }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:11, fontFamily:T.body, fill:T.textTer }} axisLine={false} tickLine={false}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Bar dataKey="avgDays" name="Dias médios" fill={T.blue} radius={[6,6,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionTitle>Distribuição atual</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={funnelStages.slice(1)} dataKey="count" nameKey="name"
                cx="50%" cy="50%" outerRadius={75} innerRadius={40}>
                {funnelStages.slice(1).map((_,i)=><Cell key={i} fill={stageColors[i+1]}/>)}
              </Pie>
              <Tooltip formatter={v=>v.toLocaleString("pt-BR")}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:"flex", flexDirection:"column", gap:5, marginTop:8 }}>
            {funnelStages.slice(1).map((s,i)=>(
              <div key={s.name} style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:stageColors[i+1], flexShrink:0 }}/>
                <span style={{ fontSize:11, color:T.textSec, fontFamily:T.body, flex:1 }}>{s.name}</span>
                <span style={{ fontSize:11, fontWeight:600, color:T.text, fontFamily:T.body }}>{s.count.toLocaleString("pt-BR")}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SECTION 3 — RELATÓRIOS
═══════════════════════════════════════════════════════════ */
const WIDGET_TYPES = [
  { id:"big_number", Icon:BarChart2, label:"Número grande" },
  { id:"line_chart", Icon:TrendingUp, label:"Linha"        },
  { id:"bar_chart",  Icon:BarChart2, label:"Barra"        },
  { id:"pie_chart",  Icon:Target,    label:"Pizza"        },
  { id:"table",      Icon:FileText,  label:"Tabela"       },
];

const ReportBuilder = () => {
  const [widgets, setWidgets] = useState([
    { id:"w1", type:"big_number" },
    { id:"w2", type:"line_chart" },
    { id:"w3", type:"bar_chart"  },
  ]);
  const [activeReport, setActiveReport] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [filters, setFilters] = useState({ period:"30d", source:"Todos", seg:"Todos" });

  const WidgetPreview = ({ w }) => {
    const content = {
      big_number: () => (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:90 }}>
          <div style={{ fontSize:34, fontWeight:700, color:T.blue, fontFamily:T.heading, letterSpacing:"-0.03em" }}>5.640</div>
          <div style={{ fontSize:11, color:T.textSec, fontFamily:T.body, marginTop:3 }}>Total de Leads</div>
        </div>
      ),
      line_chart: () => (
        <ResponsiveContainer width="100%" height={90}>
          <LineChart data={monthlyTrend.slice(-6)}>
            <Line type="monotone" dataKey="leads" stroke={T.blue} strokeWidth={2} dot={false}/>
          </LineChart>
        </ResponsiveContainer>
      ),
      bar_chart: () => (
        <ResponsiveContainer width="100%" height={90}>
          <BarChart data={monthlyTrend.slice(-6)}>
            <Bar dataKey="mqls" fill={T.teal} radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      ),
      pie_chart: () => (
        <ResponsiveContainer width="100%" height={90}>
          <PieChart>
            <Pie data={[38,24,18,20].map((v,i)=>({value:v}))} cx="50%" cy="50%"
              outerRadius={35} dataKey="value">
              {[T.blue,T.teal,T.green,T.orange].map((c,i)=><Cell key={i} fill={c}/>)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      ),
      table: () => (
        <div style={{ fontSize:11, fontFamily:T.body, padding:"8px 4px" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:4, marginBottom:4 }}>
            {["Canal","Leads","Conv."].map(h=>(
              <div key={h} style={{ fontSize:10, fontWeight:600, color:T.textSec, textTransform:"uppercase" }}>{h}</div>
            ))}
          </div>
          {[["Organic","1840","4.2%"],["Google","1320","3.1%"]].map((r,i)=>(
            <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:4, padding:"3px 0",
              borderTop:`1px solid ${T.border}` }}>
              {r.map((c,j)=><div key={j} style={{ fontSize:11, color: j===0?T.text:T.textSec }}>{c}</div>)}
            </div>
          ))}
        </div>
      ),
    };
    const P = content[w.type] || content.big_number;
    return (
      <div style={{ background:T.faint, border:`1px solid ${T.border}`, borderRadius:10,
        padding:"12px 14px", position:"relative" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <span style={{ fontSize:11, color:T.textSec, fontFamily:T.body, fontWeight:500 }}>
            {WIDGET_TYPES.find(t=>t.id===w.type)?.label}
          </span>
          <button onClick={()=>setWidgets(ws=>ws.filter(x=>x.id!==w.id))}
            style={{ background:"none", border:"none", cursor:"pointer", color:T.textTer, padding:2, display:"flex" }}>
            <X size={13}/>
          </button>
        </div>
        <P/>
      </div>
    );
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
      <Card>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <SectionTitle>Relatórios salvos</SectionTitle>
          <Btn icon={Plus} size="sm">Novo relatório</Btn>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {savedReports.map(r=>(
            <div key={r.id} onClick={()=>setActiveReport(r.id)}
              style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                padding:"11px 14px", background: activeReport===r.id?T.blueLight:T.faint,
                border:`1px solid ${activeReport===r.id?T.blue:T.border}`,
                borderRadius:9, cursor:"pointer", transition:"all .15s" }}>
              <div>
                <div style={{ fontSize:13, fontWeight:500, color:T.text, fontFamily:T.body,
                  display:"flex", alignItems:"center", gap:6 }}>
                  <FileText size={13} color={activeReport===r.id?T.blue:T.textSec}/>
                  {r.name}
                </div>
                <div style={{ fontSize:11, color:T.textSec, fontFamily:T.body, marginTop:2 }}>
                  Por {r.owner} · {r.shared} compartilhamentos · Atualizado {r.updated}
                </div>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <Btn size="xs" variant="ghost" icon={Edit2}>Editar</Btn>
                <Btn size="xs" variant="outline" icon={Share2}>Compartilhar</Btn>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <SectionTitle sub="Arraste widgets para reorganizar">Builder de relatório</SectionTitle>
          <div style={{ display:"flex", gap:8 }}>
            {[
              { label:"Período", val:filters.period, opts:["7d","30d","90d","12m"], key:"period" },
              { label:"Fonte",   val:filters.source, opts:["Todos","Organic","Paid","Email"], key:"source" },
            ].map(f=>(
              <select key={f.key} value={f.val} onChange={e=>setFilters({...filters,[f.key]:e.target.value})}
                style={{ border:`1px solid ${T.border}`, borderRadius:8, padding:"6px 10px",
                  fontSize:12, fontFamily:T.body, color:T.text, background:"#fff", cursor:"pointer" }}>
                {f.opts.map(o=><option key={o}>{o}</option>)}
              </select>
            ))}
            <Btn size="sm" variant="secondary" icon={Plus} onClick={()=>setShowAdd(!showAdd)}>Widget</Btn>
          </div>
        </div>

        {showAdd && (
          <div style={{ display:"flex", gap:8, padding:"10px 14px", background:T.blueLight,
            border:`1px solid ${T.blue}25`, borderRadius:9, marginBottom:16, flexWrap:"wrap" }}>
            {WIDGET_TYPES.map(wt=>(
              <button key={wt.id}
                onClick={()=>{ setWidgets(ws=>[...ws,{id:`w${Date.now()}`,type:wt.id}]); setShowAdd(false); }}
                style={{ display:"flex", alignItems:"center", gap:6, background:"#fff",
                  border:`1px solid ${T.border}`, borderRadius:8, padding:"7px 12px",
                  fontSize:12, fontFamily:T.body, cursor:"pointer", fontWeight:500 }}>
                <wt.Icon size={13} color={T.blue}/> {wt.label}
              </button>
            ))}
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
          {widgets.map(w=><WidgetPreview key={w.id} w={w}/>)}
        </div>

        <div style={{ display:"flex", gap:8, marginTop:16, justifyContent:"flex-end" }}>
          <Btn variant="ghost" icon={Share2} size="sm">Compartilhar</Btn>
          <Btn variant="secondary" icon={Download} size="sm">Exportar PDF</Btn>
          <Btn icon={Check} size="sm">Salvar relatório</Btn>
        </div>
      </Card>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SECTION 4 — CANAIS
═══════════════════════════════════════════════════════════ */
const ChannelSection = () => {
  const [attribution, setAttribution] = useState("multi");
  const attrColors = [T.blue,T.green,"#1877F2",T.teal,"#0A66C2",T.orange];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
      <div style={{ display:"grid", gridTemplateColumns:"3fr 2fr", gap:14 }}>
        <Card>
          <SectionTitle sub="Leads gerados vs custo — últimos 30 dias">Performance por fonte</SectionTitle>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={channelData} layout="vertical" margin={{ left:10, right:20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f3f7" horizontal={false}/>
              <XAxis type="number" tick={{ fontSize:10, fontFamily:T.body, fill:T.textTer }} axisLine={false} tickLine={false}/>
              <YAxis dataKey="canal" type="category" tick={{ fontSize:11, fontFamily:T.body, fill:T.text }}
                axisLine={false} tickLine={false} width={80}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Bar dataKey="leads" name="Leads" radius={[0,5,5,0]} fill={T.blue}/>
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionTitle>ROI por canal</SectionTitle>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {channelData.map((c,i)=>(
              <div key={i}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                  <span style={{ fontSize:12, fontFamily:T.body, color:T.text, fontWeight:500 }}>{c.canal}</span>
                  <span style={{ fontSize:12, fontFamily:T.body, color:T.text, fontWeight:700 }}>
                    {c.roi===9999?"∞":`${c.roi}%`}
                  </span>
                </div>
                <div style={{ height:5, background:T.faint, borderRadius:99, overflow:"hidden",
                  border:`1px solid ${T.border}` }}>
                  <div style={{ height:"100%", width:`${Math.min((c.roi/1000)*100,100)}%`,
                    background:c.cor, borderRadius:99 }}/>
                </div>
                <div style={{ fontSize:10, color:T.textTer, fontFamily:T.body, marginTop:2 }}>
                  Conv: {c.conversao}% · {c.custo>0?`R$ ${c.custo.toLocaleString("pt-BR")}`:"Sem custo"}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <SectionTitle sub="Crédito de conversão por modelo">Attribution modeling</SectionTitle>
          <div style={{ display:"flex", gap:5 }}>
            {[{k:"first",l:"First Touch"},{k:"last",l:"Last Touch"},{k:"multi",l:"Multi-Touch"}].map(m=>(
              <button key={m.k} onClick={()=>setAttribution(m.k)}
                style={{ background: attribution===m.k?T.blue:"#fff",
                  color: attribution===m.k?"#fff":T.textSec,
                  border:`1px solid ${attribution===m.k?T.blue:T.border}`,
                  borderRadius:8, padding:"6px 12px", fontSize:11, fontWeight:500,
                  fontFamily:T.body, cursor:"pointer" }}>
                {m.l}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={attributionData.map(d=>({name:d.name,value:d[attribution]}))}
                cx="50%" cy="50%" outerRadius={80} innerRadius={42} dataKey="value">
                {attributionData.map((_,i)=><Cell key={i} fill={attrColors[i]}/>)}
              </Pie>
              <Tooltip formatter={v=>`${v}%`}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:"flex", flexDirection:"column", justifyContent:"center", gap:8 }}>
            {attributionData.map((d,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:9, height:9, borderRadius:"50%", background:attrColors[i], flexShrink:0 }}/>
                <span style={{ fontSize:12, color:T.textSec, fontFamily:T.body, flex:1 }}>{d.name}</span>
                <span style={{ fontSize:13, fontWeight:600, color:T.text, fontFamily:T.body }}>{d[attribution]}%</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle sub="vs. período anterior (30 dias)">Comparação de canais</SectionTitle>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:T.body }}>
            <thead>
              <tr style={{ borderBottom:`1.5px solid ${T.border}` }}>
                {["Canal","Leads","Δ Leads","Conv. %","Custo/Lead","ROI"].map(h=>(
                  <th key={h} style={{ textAlign:"left", padding:"8px 12px", fontSize:10,
                    fontWeight:600, color:T.textTer, textTransform:"uppercase", letterSpacing:"0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {channelData.map((c,i)=>{
                const delta = [+12,-4,+8,+23,+6,+31][i];
                const cpLead = c.custo>0?`R$ ${Math.round(c.custo/c.leads)}`:"—";
                return (
                  <tr key={i} style={{ borderBottom:`1px solid ${T.faint}`,
                    background: i%2===0?T.faint:"#fff" }}>
                    <td style={{ padding:"11px 12px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", background:c.cor }}/>
                        <span style={{ fontSize:13, fontWeight:500, color:T.text }}>{c.canal}</span>
                      </div>
                    </td>
                    <td style={{ padding:"11px 12px", fontSize:13, fontWeight:700, color:T.text }}>
                      {c.leads.toLocaleString("pt-BR")}
                    </td>
                    <td style={{ padding:"11px 12px" }}><TrendBadge value={delta}/></td>
                    <td style={{ padding:"11px 12px", fontSize:12, color:T.textSec }}>{c.conversao}%</td>
                    <td style={{ padding:"11px 12px", fontSize:12, color:T.textSec }}>{cpLead}</td>
                    <td style={{ padding:"11px 12px" }}>
                      <span style={{ fontWeight:700, fontSize:13,
                        color: c.roi>500?T.green:c.roi>200?T.orange:T.red }}>
                        {c.roi===9999?"∞":`${c.roi}%`}
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
   SECTION 5 — TEMPO REAL
═══════════════════════════════════════════════════════════ */
const eventTypeIcon = {
  lead_novo:   { Icon:Users,       label:"Novo lead"   },
  email_open:  { Icon:Mail,        label:"Email aberto"},
  sql_convert: { Icon:Zap,         label:"SQL detectado"},
  email_click: { Icon:MousePointer,label:"Clique email"},
  form_submit: { Icon:FileText,    label:"Form enviado"},
};

const RealtimeSection = () => {
  const [feed, setFeed] = useState(liveActivity);
  const [tick, setTick] = useState(0);

  useEffect(()=>{
    const t = setInterval(()=>{
      setTick(n=>n+1);
      setFeed(prev=>[{
        id:Date.now(),
        type:["lead_novo","email_open","email_click","form_submit"][Math.floor(Math.random()*4)],
        msg:["Novo lead: Camila Ferreira (Alpha Co)",
          "Eduardo Lopes abriu 'Demo Follow-up'",
          "Demo solicitada: Priscila Torres",
          "Score alto: Wilson Teixeira (Score 87)",
        ][Math.floor(Math.random()*4)],
        time:"agora",
        color:[T.blue,T.teal,T.green,T.orange][Math.floor(Math.random()*4)],
      },...prev.slice(0,11)]);
    },4000);
    return ()=>clearInterval(t);
  },[]);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
        {[
          { Icon:Activity, label:"Online agora",     value:234+(tick%7), color:T.green,  pulse:true },
          { Icon:Mail,     label:"Emails abertos hoje",value:1684+tick*3, color:T.blue              },
          { Icon:FileText, label:"Forms hoje",        value:47+Math.floor(tick/2), color:T.teal    },
          { Icon:Zap,      label:"SQLs hoje",          value:8+(tick>3?1:0), color:T.orange         },
        ].map((s,i)=>(
          <Card key={i} style={{ padding:"18px 20px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
              <div style={{ width:36, height:36, borderRadius:9, background:`${s.color}14`,
                display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <s.Icon size={17} color={s.color}/>
              </div>
              {s.pulse && (
                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", background:T.green,
                    boxShadow:`0 0 0 3px ${T.green}30`, animation:"pulse 1.5s infinite" }}/>
                  <span style={{ fontSize:10, color:T.green, fontWeight:600, fontFamily:T.body, letterSpacing:"0.06em" }}>AO VIVO</span>
                </div>
              )}
            </div>
            <div style={{ fontSize:26, fontWeight:700, color:T.text, fontFamily:T.heading,
              letterSpacing:"-0.03em" }}>{s.value.toLocaleString("pt-BR")}</div>
            <div style={{ fontSize:11, color:T.textSec, fontFamily:T.body, marginTop:3 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <Card style={{ maxHeight:380, overflow:"hidden" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <SectionTitle>Atividade ao vivo</SectionTitle>
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:T.green,
                boxShadow:`0 0 0 3px ${T.green}25` }}/>
              <span style={{ fontSize:11, color:T.green, fontWeight:500, fontFamily:T.body }}>Streaming</span>
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:7, overflowY:"auto", maxHeight:290 }}>
            {feed.map((e,i)=>{
              const et = eventTypeIcon[e.type] || eventTypeIcon.email_open;
              return (
                <div key={e.id} style={{ display:"flex", gap:10, padding:"9px 12px",
                  background: i===0?`${e.color}06`:T.faint,
                  border:`1px solid ${i===0?e.color+"28":T.border}`,
                  borderRadius:9, alignItems:"center", transition:"all .3s" }}>
                  <div style={{ width:30, height:30, borderRadius:7, background:`${e.color}16`,
                    display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <et.Icon size={13} color={e.color}/>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:500, color:T.text, fontFamily:T.body }}>{e.msg}</div>
                    <div style={{ fontSize:10, color:e.color, fontFamily:T.body, fontWeight:500, marginTop:1 }}>{et.label}</div>
                  </div>
                  <div style={{ fontSize:10, color:T.textTer, fontFamily:T.body, flexShrink:0 }}>{e.time}</div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <SectionTitle sub="Leads gerados por hora">Hoje vs. ontem</SectionTitle>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={todayVsYesterday}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f3f7"/>
              <XAxis dataKey="hora" tick={{ fontSize:11, fontFamily:T.body, fill:T.textTer }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize:11, fontFamily:T.body, fill:T.textTer }} axisLine={false} tickLine={false}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Legend wrapperStyle={{ fontFamily:T.body, fontSize:12 }}/>
              <Line type="monotone" dataKey="hoje" name="Hoje" stroke={T.blue} strokeWidth={2.5} dot={{ fill:T.blue,r:3 }}/>
              <Line type="monotone" dataKey="ontem" name="Ontem" stroke={T.borderMid} strokeWidth={1.5} strokeDasharray="5 5" dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <SectionTitle sub="Campanhas com atividade aberta hoje">Campanhas — visão hoje</SectionTitle>
        <table style={{ width:"100%", borderCollapse:"collapse", fontFamily:T.body }}>
          <thead>
            <tr style={{ borderBottom:`1.5px solid ${T.border}` }}>
              {["Campanha","Status","Abertura","CTR","Conversões","Performance"].map(h=>(
                <th key={h} style={{ textAlign:"left", padding:"8px 12px", fontSize:10,
                  fontWeight:600, color:T.textTer, textTransform:"uppercase", letterSpacing:"0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {campaignPerf.map((c,i)=>{
              const perf = Math.round((c.abertura/40)*100);
              return (
                <tr key={i} style={{ borderBottom:`1px solid ${T.faint}`, background:i%2===0?T.faint:"#fff" }}>
                  <td style={{ padding:"11px 12px", fontSize:12, fontWeight:500, color:T.text }}>{c.name}</td>
                  <td style={{ padding:"11px 12px" }}><StatusPill status={c.status}/></td>
                  <td style={{ padding:"11px 12px", fontSize:13, fontWeight:700,
                    color:c.abertura<20?T.red:T.text }}>{c.abertura}%</td>
                  <td style={{ padding:"11px 12px", fontSize:12, color:T.textSec }}>{c.ctr}%</td>
                  <td style={{ padding:"11px 12px", fontSize:13, fontWeight:700, color:T.green }}>{c.conversoes}</td>
                  <td style={{ padding:"11px 12px", width:130 }}>
                    <div style={{ height:5, background:T.border, borderRadius:99, overflow:"hidden", marginBottom:3 }}>
                      <div style={{ height:"100%", width:`${Math.min(perf,100)}%`,
                        background: perf>=75?T.green:perf>=40?T.orange:T.red, borderRadius:99 }}/>
                    </div>
                    <span style={{ fontSize:10, color:T.textTer }}>{Math.min(perf,100)}% do target</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SECTION 6 — EXPORT & API
═══════════════════════════════════════════════════════════ */
const ExportSection = () => {
  const [copied, setCopied] = useState(null);
  const copy = (path) => { setCopied(path); setTimeout(()=>setCopied(null),2000); };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <Card>
          <SectionTitle sub="Export com branding Vantari">Export rápido</SectionTitle>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {[
              { Icon:FileText,    label:"Export PDF",             sub:"Relatório completo com logo",    fmt:"PDF",   color:T.red    },
              { Icon:BarChart2,   label:"Export Excel",           sub:"Dados tabulares + gráficos",     fmt:"XLSX",  color:T.green  },
              { Icon:Download,    label:"Export CSV",             sub:"Dados brutos para BI externo",   fmt:"CSV",   color:T.blue   },
              { Icon:ExternalLink,label:"Dashboard embeddable",  sub:"Link iframe para stakeholders",  fmt:"EMBED", color:T.purple },
            ].map((e,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px",
                background:T.faint, border:`1px solid ${T.border}`, borderRadius:9 }}>
                <div style={{ width:36, height:36, borderRadius:9, background:`${e.color}12`,
                  display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <e.Icon size={16} color={e.color}/>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:500, color:T.text, fontFamily:T.body }}>{e.label}</div>
                  <div style={{ fontSize:11, color:T.textSec, fontFamily:T.body }}>{e.sub}</div>
                </div>
                <Btn size="xs" variant="secondary" icon={Download}>{e.fmt}</Btn>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <SectionTitle sub="Envio automático por email">Relatórios agendados</SectionTitle>
            <Btn icon={Plus} size="xs">Agendar</Btn>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {schedules.map(s=>(
              <div key={s.id} style={{ padding:"12px 14px",
                background: s.active?T.greenLight:T.faint,
                border:`1px solid ${s.active?"#86efac":T.border}`, borderRadius:9 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                  <span style={{ fontSize:12, fontWeight:500, color:T.text, fontFamily:T.body }}>{s.report}</span>
                  <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                    <div style={{ width:6, height:6, borderRadius:"50%",
                      background: s.active?T.green:T.textTer }}/>
                    <span style={{ fontSize:10, color:s.active?T.green:T.textTer,
                      fontWeight:500, fontFamily:T.body }}>
                      {s.active?"Ativo":"Pausado"}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize:11, color:T.textSec, fontFamily:T.body }}>
                  {s.frequency} · {s.time} → {s.recipients}
                </div>
                <div style={{ display:"flex", gap:6, marginTop:8 }}>
                  <Btn size="xs" variant="ghost" icon={Edit2}>Editar</Btn>
                  <Btn size="xs" variant={s.active?"outline":"success"} icon={s.active?Pause:Play}>
                    {s.active?"Pausar":"Ativar"}
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card accent>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <SectionTitle sub="Integre com Power BI, Looker, Tableau">API de integração BI</SectionTitle>
          <div style={{ display:"flex", gap:8 }}>
            <Btn variant="ghost" icon={FileText} size="sm">Docs</Btn>
            <Btn icon={Code} size="sm">Gerar API Key</Btn>
          </div>
        </div>
        <div style={{ background:"#0f172a", borderRadius:9, padding:"10px 14px", marginBottom:14 }}>
          <div style={{ fontSize:10, color:"#64748b", marginBottom:4, fontFamily:T.body, textTransform:"uppercase", letterSpacing:"0.06em" }}>Base URL</div>
          <div style={{ fontSize:13, color:"#e2e8f0", fontFamily:"monospace" }}>https://api.vantari.com.br/v1</div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {apiEndpoints.map((ep,i)=>(
            <div key={i} style={{ display:"flex", gap:12, padding:"10px 14px",
              background:T.faint, border:`1px solid ${T.border}`, borderRadius:9, alignItems:"center" }}>
              <span style={{ fontSize:10, fontWeight:700,
                color: ep.method==="GET"?T.green:T.blue,
                background: ep.method==="GET"?T.greenLight:T.blueLight,
                padding:"3px 8px", borderRadius:5, fontFamily:"monospace", flexShrink:0 }}>
                {ep.method}
              </span>
              <code style={{ fontSize:12, color:T.blue, fontFamily:"monospace", flex:"0 0 auto" }}>{ep.path}</code>
              <span style={{ fontSize:11, color:T.textSec, fontFamily:T.body, flex:1 }}>{ep.desc}</span>
              <Pill color={T.purple}>{ep.auth}</Pill>
              <button onClick={()=>copy(ep.path)}
                style={{ background:"none", border:`1px solid ${T.border}`, borderRadius:6,
                  padding:"4px 10px", fontSize:11, fontFamily:T.body, cursor:"pointer",
                  color: copied===ep.path?T.green:T.textSec,
                  display:"flex", alignItems:"center", gap:4 }}>
                {copied===ep.path?<Check size={12}/>:<Copy size={12}/>}
                {copied===ep.path?"Copiado":"Copiar"}
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SIDEBAR NAVIGATION
═══════════════════════════════════════════════════════════ */
const NAV = [
  { section:"Principal", items:[
    { id:"analytics", label:"Analytics",     Icon:BarChart2 },
    { id:"leads",     label:"Leads",          Icon:Users     },
    { id:"email",     label:"Email Marketing",Icon:Mail      },
  ]},
  { section:"Ferramentas", items:[
    { id:"scoring",   label:"Scoring",        Icon:Star      },
    { id:"pages",     label:"Landing Pages",  Icon:Layout    },
    { id:"ai",        label:"IA & Automação", Icon:Bot       },
  ]},
  { section:"Sistema", items:[
    { id:"integrations",label:"Integrações",  Icon:Plug      },
    { id:"settings",   label:"Configurações", Icon:Settings  },
  ]},
];

const ANALYTICS_TABS = [
  { id:"overview",  label:"Overview"    },
  { id:"funnel",    label:"Funil"       },
  { id:"reports",   label:"Relatórios" },
  { id:"channels",  label:"Canais"     },
  { id:"realtime",  label:"Tempo real" },
  { id:"export",    label:"Export & API"},
];

const LOGO_SRC = "data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAeBB4EDASIAAhEBAxEB/8QAHQABAAIDAQEBAQAAAAAAAAAAAAUIAwYHBAkCAf/EAE8QAQABAwICBAkGCggGAgIDAQABAgMEBQYRQQchMVESFDI2VGF0k7IIExUiUmIXM0JWcYGRlKHRFiMkVaKxwdI0Q1NykvCC4WOjJXPCw//EABsBAQACAwEBAAAAAAAAAAAAAAADBgIEBQcB/8QANxEBAAEDAQQHBwMFAQEBAQAAAAECAwQFERIxURMhM2FxodEUIjJBUpHBFoHxBkJT4fAVsSND/9oADAMBAAIRAxEAPwDku3MXGq29ptVWPZmZxLUzM0R1/Uh7/FMX0az7uHl215uaZ7Ja+CEg9JsU09HT1fKHmV+urpKuv5yw+KYvo1n3cHimL6NZ93DMJdynkj36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubD4pi+jWfdweKYvo1n3cMwblPI36ubweK43o1n/wAIGYRblPJJv1c2DbXm5pnslr4ISCP215uaZ7Ja+CEgysdnT4Q+X+0q8ZAEqIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB5gESVg215uaZ7Ja+CEgj9tebmmeyWvghIFjs6fCC/2lXjIAlRAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPMAiSsG2vNzTPZLXwQkEftrzc0z2S18EJAsdnT4QX+0q8ZAEqIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB5gESVg215uaZ7Ja+CEgj9tebmmeyWvghIFjs6fCC/2lXjIAlRAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPMAiSsG2vNzTPZLXwQkEftrzc0z2S18EJAsdnT4QX+0q8ZAEqIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB5gESVg215uaZ7Ja+CEgj9tebmmeyWvghIFjs6fCC/wBpV4yAJUQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADzAIkrBtrzc0z2S18EJBH7a83NM9ktfBCQLHZ0+EF/tKvGQBKiAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeYBElYNtebmmeyWvghII/bXm5pnslr4ISBY7Onwgv9pV4yAJUQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADzAIkrBtrzc0z2S18EJBH7a83NM9ktfBCQLHZ0+EF/tKvGQBKiAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeYBElYNtebmmeyWvghII/bXm5pnslr4ISBY7Onwgv9pV4yAJUQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADzAIkrBtrzc0z2S18EJBH7a83NM9ktfBCQLHZ0+EF/tKvGQBKiAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeYBElYNtebmmeyWvghII/bXm5pnslr4ISBY7Onwgv9pV4yAJUQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADzAIkrBtrzc0z2S18EJBH7a83NM9ktfBCQLHZ0+EF/tKvGQBKiAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeYBElYNtebmmeyWvghII/bXm5pnslr4ISBY7Onwgv8AaVeMgCVEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8wCJKwba83NM9ktfBCQR+2vNzTPZLXwQkCx2dPhBf7SrxkASogAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHmARJWDbXm5pnslr4ISCP215uaZ7Ja+CEgWOzp8IL/aVeMgCVEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8wCJKwba83NM9ktfBCQR+2vNzTPZLXwQkCx2dPhBf7SrxkASogAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHmARJWDbXm5pnslr4ISCP215uaZ7Ja+CEgWOzp8IL/aVeMgCVEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8wCJKwba83NM9ktfBCQR+2vNzTPZLXwQkCx2dPhBf7SrxkASogAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHmARJWDbXm5pnslr4ISCP215uaZ7Ja+CEgWOzp8IL/aVeMgCVEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8wCJKwba83NM9ktfBCQR+2vNzTPZLXwQkCx2dPhBf7SrxkASogAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHmARJWDbXm5pnslr4ISCP215uaZ7Ja+CEgWOzp8IL/AGlXjIAlRAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPMAiSsG2vNzTPZLXwQkEftrzc0z2S18EJAsdnT4QX+0q8ZAEqIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB5gESVg215uaZ7Ja+CEgj9tebmmeyWvghIFjs6fCC/2lXjIAlRAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPMAiSsG2vNzTPZLXwQkEftrzc0z2S18EJAsdnT4QX+0q8ZAEqIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB5gESVg215uaZ7Ja+CEgj9tebmmeyWvghIFjs6fCC/2lXjIAlRAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPMAiSsG2vNzTPZLXwQkEftrzc0z2S18EJAsdnT4QX+0q8ZAEqIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB5gESVg215uaZ7Ja+CEgj9tebmmeyWvghIFjs6fCC/2lXjIAlRAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPMAiSsG2vNzTPZLXwQkEftrzc0z2S18EJAsdnT4QX+0q8ZAEqIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB5gESVg215uaZ7Ja+CEgj9tebmmeyWvghIFjs6fCC/wBpV4yAJUQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADzAIkrBtrzc0z2S18EJBH7a83NM9ktfBCQLHZ0+EF/tKvGQBKiAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeYBElYNtebmmeyWvghII/bXm5pnslr4ISBY7Onwgv9pV4yAJUQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADzAIkrBtrzc0z2S18EJBH7a83NM9ktfBCQLHZ0+EF/tKvGQBKiAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAZMaxeyb9FjHs3L165Pg0W7dM1VVT3REdcgxjqmzegreuuxRf1C1a0PFq6/Cy+M3Zj1W464n1VeC7BtboB2VpdNFzVZy9avx2/PVzbtcfVRRwn9UzLmZGr4tjq3ts93X/p1MfR8u/17uyO/q/2qbRRVXXFFFM1VTPCIiOMy2DTdjbz1KIqwtraxdonsr8Trimf/AJTHBdrRNA0PRLfzej6RgYFPDh/Z7FNEz+mYjjP60m5Nz+o5/so+8uvb/pqP/wClz7QpVa6Ieki5Txp2tlRH3rtun/Op+/wOdJX5r3v3iz/vXSGv+osj6Y8/VsfpzG+qry9FLfwOdJX5r3v3iz/vPwOdJX5r3v3iz/vXSD9RZP00+fqfpzG+qry9FLfwOdJX5r3v3iz/ALz8DnSV+a9794s/710g/UWT9NPn6n6cxvqq8vRS38DnSV+a9794s/7z8DnSV+a9794s/wC9dIP1Fk/TT5+p+nMb6qvL0Ut/A50lfmve/eLP+8/A50lfmve/eLP+9dIP1Fk/TT5+p+nMb6qvL0Ut/A50lfmve/eLP+8/A50lfmve/eLP+9dIP1Fk/TT5+p+nMb6qvL0Ut/A50lfmve/eLP8AvPwOdJX5r3v3iz/vXSD9RZP00+fqfpzG+qry9FLfwOdJX5r3v3iz/vPwOdJX5r3v3iz/AL10g/UWT9NPn6n6cxvqq8vRS38DnSV+a9794s/7z8DnSV+a9794s/710g/UWT9NPn6n6cxvqq8vRS38DnSV+a9794s/7z8DnSV+a9794s/710g/UWT9NPn6n6cxvqq8vRS38DnSV+a9794s/wC8/A50lfmve/eLP+9dIP1Fk/TT5+p+nMb6qvL0Ut/A50lfmve/eLP+8/A50lfmve/eLP8AvXSD9RZP00+fqfpzG+qry9FLfwOdJX5r3v3iz/vPwOdJX5r3v3iz/vXSD9RZP00+fqfpzG+qry9FLfwOdJX5r3v3iz/vebL6KukTGpmq5tTUKoj/AKUU3J/ZTMrtj7H9RZHzpjz9Xyf6cx/lVPl6Pn9qukatpN35rVdMzcCvjw8HJsVW5/xRDwvoVlY2Pl2KsfKsWr9muOFVu5RFVNX6YnqlyzfvQVtLXrdy/o1v6Cz5iZpnHp42Kp+9b7Ij/t4frb2P/UNuqdl2nZ38f+82hkf07dojbaq3u6er/vJUgbFvvZmvbL1b6P1vE+b8LjNm/R9a1eiOdNXP9E8JjnDXVgorpuUxVTO2JV6uiq3VNNUbJgAZMQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHmARJWDbXm5pnslr4ISCP215uaZ7Ja+CEgWOzp8IL/aVeMgCVEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP3YtXb96ixYtV3btyqKaKKKZqqqmeyIiO2W5dGnRpuPfWT4WDZjF06irhdzr1M/N098U/bq9UfrmFpujno12zsjHpq0/FjJ1CaeFzOvxFV2rvinlRHqj9fFy87VrOJ7vGrl6urgaRey/e4U8/Rw7o76Adc1eLebum9Vo2HVwnxemIqya49cdlH6+M+pYLZuyNr7RsRb0LSbGPcmOFeRVHh3q/01z1/qjq9TYxUsvUsjKn356uUcFvxNMx8WPcjr5zxAGg3wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAENvHbWk7s0G/o2s40Xse7H1ao8u1VyronlVH/ANT1TKlfSJtLUNl7pydE1CPD8D69i9EcKb1qfJrj9nCY5TEwva5L8qDalvW9hVa1YtROdo8/OxVEddVmeEXKf1dVX/xnvdrRs6qxei3VPu1eUuJrWBTfszdpj3qfOFSgF2UcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB5gESVg215uaZ7Ja+CEgj9tebmmeyWvghIFjs6fCC/2lXjIAlRAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMmNYvZWRbxsazcvXrtUUW7dFM1VV1TPCIiI7ZB+IiZmIiOMy7z0OdBl7Pixrm9bVdjFnhXZ07rpuXY5Tc50x93tnnw57b0HdDeNt23Y3BuezbyNZnhXZx6uFVGJ3T3VV+vsjl19btCranrUzttY8+M+nqtel6HEbLuRHhHr6fdhw8XGwsS1iYdi1j49qmKLdq1RFNNER2RER1RDMCsTO1aIjYAAAAAx371qxaqu37tFq3T11V11RER+mZBkGu5W+tlYtc27+7dDorjtpnPt8Y/VxYPwibD/O/RP32j+aWMe7P9s/ZDORajjVH3htI1b8Imw/zv0T99o/mfhE2H+d+ifvtH8332e99M/aT2mz9cfeG0jVvwibD/O/RP32j+Z+ETYf536J++0fzPZ730z9pPabP1x94bSNW/CJsP8AO/RP32j+Z+ETYf536J++0fzPZ730z9pPabP1x94bSNW/CJsP879E/faP5n4RNh/nfon77R/M9nvfTP2k9ps/XH3htI1b8Imw/wA79E/faP5n4RNh/nfon77R/M9nvfTP2k9ps/XH3htI1b8Imw/zv0T99o/mfhE2H+d+ifvtH8z2e99M/aT2mz9cfeG0jVvwibD/ADv0T99o/mfhE2H+d+ifvtH8z2e99M/aT2mz9cfeG0jVvwibD/O/RP32j+Z+ETYf536J++0fzPZ730z9pPabP1x94bSNW/CJsP8AO/RP32j+Z+ETYf536J++0fzPZ730z9pPabP1x94bSNW/CJsP879E/faP5n4RNh/nfon77R/M9nvfTP2k9ps/XH3htI1b8Imw/wA79E/faP5n4RNh/nfon77R/M9nvfTP2k9ps/XH3htI1b8Imw/zv0T99o/mfhE2H+d+ifvtH8z2e99M/aT2mz9cfeG0jXcHfOzc7Ms4eFujSMjJvVxRatW8qiqquqeyIiJ65bEjroqo6qo2M6LlNfXTO0AYsx5tVwrOo6Xl6fkRxs5Vmuzcj7tVMxP8JekfYmYnbD5MRMbJfPTJs14+RcsXI4V265oqj1xPCWNI7nqpq3LqlVHDwZzL008O7w5Rz02mdsRLy6qNkzAAyfAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHmARJWDbXm5pnslr4ISCP215uaZ7Ja+CEgWOzp8IL/AGlXjIAlRAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP1at3L12i1aoquXK6opoopjjNUz2REc5Wv6BOiiztPEt6/rtmi5r16jjRRPXGHTMeTH35jtnl2RzmYD5NXRh4nas703Bjf2m5T4Wm49yPxdM/8ANmPtT+T3R19sxw76qes6pvzNi1PV8559y3aLpW5EZF2Ov5Ry7wBW1lAAAa5vnem3tmad45rmdTaqqifmcej6169PdTT/AKzwiOcs6KKrlUU0xtmWFdym3TNVc7IhsbRN+dK2ztoTcx8vP8dz6OrxPD4XLkT3VTx8Gn9c8fVKv3ST02bm3RNzD0uurRNLnjHzdiv+uuR9+5HX+qnhHfxcsnrnjKx4f9PzPvZE7O6PzKtZn9QxHu48be+fxDsW8PlBbt1SquzoVjG0THnqiqmIvXpj11VR4Mfqp4x3uW61resa1f8An9X1TNz7nHjFWRfqr4fo4z1I8WKxiWLEbLdMR/3NXb+ZfyJ23Kpn/uQA2GsAAAAAAAAAAAAAAAAAAAAAAA3voZ6Pcvfm44tVxXZ0jFmK83Iju5W6Z+1V/COM+qY716izRNdc7IhJZs13q4t0RtmXRPkqbEru5le+NSszFm14VrTqao8uuequ5+iI40x65nuWQefTsPF07AsYGDYox8bHtxbtWqI4U0UxHCIh6Hn2dl1Zd6bk/t4PQ8HEpxLMW4/fvkAajcHg3DqNvSNB1DVbsxFvDxrl+rj3UUzV/o97k3ypNx06P0czpVu5wytXuxZpiJ64tUzFVc/o8mn/AOTYxbM371NuPnLXy70WLNVyflCpddVVddVdczNVU8ZmecvyD0h5oAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8wCJKwba83NM9ktfBCQR+2vNzTPZLXwQkCx2dPhBf7SrxkASogAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB2L5O3RjO6NRp3HrePx0XEuf1VuuOrLuxy9dEc++erv4at0OdH+ZvzckY8xXZ0rGmK87IiOynlRT96rl3dc8uE3N0vAw9L07H07T8ejHxce3Fu1aojhFNMdkOBrOp9BT0Nufenj3R6rBoumdPV01yPdjh3z6PRERERERwiH9BTlzAAAV86eumWbFeRtbaGVwuxxt5moW6vI76Lc9/fVy5dfXG1iYlzKubluP8ATVy8y3iW9+5P+2ydMnTPgbVm9ou3/ms/Wo403K567OLP3vtV/d5c+6au67q+p65qd3U9Xzb2Zl3p413btXGf0R3RHKI6oeKZmZmZmZmeuZl/F4wtPtYdOyiOv5yomdqF3Mq21z1fKABvNEAAAAAAAAAAAAAAAAAAAAAAAAB6dLwMzVNRx9O0/HryMrIuRbtWqI4zVVPZD5MxEbZIiZnZCU2LtfU94bkxtE0q3xu3Z43Lkx9Wzbjyq6vVH8Z4R2yuvsjbOmbR25jaJpVvwbNmONdcx9a7XPlV1d8z/DqjshA9DnR/h7D23GPPgXtVyYivOyIjtq5UU/dp5d/XPPhG8qRq2pTlV7lHwR59/ovWkabGJRv1/HPl3eoA47sgAP5MxEcZ6oUx6ed4xvDfuRexbvh6bgx4rh8J6qqYn61cf91XGePd4Lt3ylukCnbu3Z23pt/hqup25i5NM9dixPVM+qauumPV4U8oVRWrQMKaYnIr+fVHqqf9QZ0VTGPRPDrn0AFmVgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB5gESVg215uaZ7Ja+CEgj9tebmmeyWvghIFjs6fCC/wBpV4yAJUQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAm9kbZ1Pd248bRNKteFevTxrrmPq2qI8quruiP49UdsozTcLL1LPsYGDj15GVkXIt2rVEcaq6pnhEQuX0M9HuJsPbkWq4ovavlRFebkR38rdM/Zp/jPGe6I5up6hTh2+r4p4erp6Zp9WZd6/hjjP4T+xdr6Zs/bePoml2+Fu1HG5cmPrXrk+VXV65/hHCOyE6Ch111V1TVVO2ZX6iimimKaY2RAAxZAObdOnSRZ2NoXi2DXRc13NomMa32/M09k3ao7o5Rzn1RKWxYrv3It0R1yhv36LFublc9UNU+Uh0o1aRZu7Q29k+DqF2nhnZFueuxRMfi6Z5VzHbPKPXPVWRkyb97KybuTkXa7167XNdy5XVxqrqmeMzM85mWNf8ACw6MS1FFPH5zzefZ2bXmXZrq4fKOUADcaYAAAAAAAAAAAAAAAAAAAAAAAAAD+xEzMREcZlaz5O3RjG19Op3HrePw1rLt/wBVbrjrxLU8vVXVHb3R1d/HTvk1dGHjl6zvXX8f+zW6vC03Hrj8ZVH/ADZj7MT5PfPXyjjZNVdb1Pbtx7U+M/j1WvQ9M3dmRdjwj8+gArK0AADVuk3emnbG2xd1bNmLl+rjRiY0Twqv3OHVHqiO2Z5R6+ETM7i1nTtv6LlaxquRTYw8aia7lc9vqiI5zM8IiOcypX0o721HfW5ruqZfhWsajjRh43HjFm3x7PXVPbM859UREdXStOnLubavhjj6OTqupRh29lPxzw9UJuPWdQ3BreVrOqX5v5eVcmu5VyjuiI5REcIiOUQjwXqmmKY2RwUOqqapmZ4gD6+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPMAiSsG2vNzTPZLXwQkEftrzc0z2S18EJAsdnT4QX+0q8ZAEqIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB3j5NfRh9I37W89fx/7Haq8LT7Fcfjq4n8bMfZiezvnr7I69bLyqMW1Nyv+WziYteVdi3R/Dcvk6dGP9G8Cjc+uY/DWcq3/AFFquOvFtTHdyrqjt7o6u92UFAycmvJuTcr4y9CxcajGtRbo4QANdsAPBr+r6foWjZWr6pkU4+Hi0TXcrq7u6O+ZnqiOcy+xE1Tsji+VVRTG2eCI6Sd5absjbN7WM+YrueRjY8Twqv3OHVTHdHOZ5R+xSndOu6luXXcrWtWvzey8mvwqp5UxyppjlTEdUQmulTfGob73Nc1PJ8K1iW+NGHjceqzb4/FPbM/6RDUl50rToxLe9V8c8e7uUTVtSnLubtPwRw7+8AdZyAAAAAAAAAAAAAAAAAAAAAAAAAAB07oG6Nbu9tb8f1G3XRoOFXHz9XZ8/X2xapn+NU8o9cw1vow2VqO+dz2tKw+NrHo4V5eTw402bfHrn11T2RHOfVEzF1Nt6Lp23tExdH0rHixiY1HgW6Y7Z75meczPGZnnMuHrGpezU9Fbn3p8o9Xc0bTPaa+luR7kec+j3WLVqxZosWbdFu1bpiiiiiOFNNMRwiIjlD9gpa7gAD8XrtuzZrvXrlNu3bpmquuqeEUxHXMzPKH7Vu+Ut0n+NXb2ytAyP7Pbq8HUsiifxlUf8mJ7o/K756uU8dvCw68u7Fun955Q1M3MoxLU3Kv2jnLUOnvpKub11r6O027VToOFXPzMdnjFfZN2Y7uVMco6+2ZcwBf7Fiixbi3RHVDz3Iv15Fyblc9cgCZCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8wCJKwba83NM9ktfBCQR+2vNzTPZLXwQkCx2dPhBf7SrxkASogAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGz9GmzNS3xuazpGDE27MfXysiY402LfHrme+eURzn9cxhcuU26ZrqnZEM7duq5VFFEbZlsfQT0b3t8a745n266NCwq4nJr7Pnqu2LVM+vnMdkeuYXBx7NnHx7ePj2qLVm1TFFuiiOFNNMRwiIjlEQ8O2ND03bmhYujaTYiziY1Hg0RzqnnVM85meuZ75SShajn1Zl3b/bHCF/03Apw7W7/AHTxkAc90QAH5u3KLVuq7drpot0RNVVVU8IpiO2ZnlCovT90l17z1n6K0u7VToOFXPzfDq8ZuR1fOT6u2KY7uvnwjb/lLdJ/z1d/ZOgZH9XTPg6nkUT5U/8ARie6Pyv2d/Gvq2aLpm5EZF2Ov5R+VR1vU9+Zx7U9UcZ59wAsitAAAAAAAAAAAAAAAAAAAAAAAAAACR23ouo7h1vF0bSseb+Xk1+BRTHZHfMzyiI4zM8oh4bFq7fv27Fi3Xdu3KooooojjVVVM8IiI5yt/wBA3Rta2Tonj+o26K9ezaI+fq7fmKO2LVM/xqmO2fVEOfqOfTh2t7+6eEOhpuBVmXd3+2OMtj6MdladsbbNrSsKIuX6uFeXk8OFV+5w659UR2RHKPXxmdqBQrlyq5VNdc7Zl6Bbt02qIoojZEADBmA0fph3/h7D23Vkz4F7VMmJowceZ8qrnXV92nj19/VHNJatV3q4oojbMo712izRNdc7Ihq/yiOk6NrabVt3RL8fTeXb/rLlE9eJann6q55d0dfdxqjMzMzMzMzPbMvTquoZmq6lkajqGRXkZeTcm5du1z11VS8q/YGFRh2tyOPzl59qGdXmXd+eHyjkAN5ogAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPMAiSsG2vNzTPZLXwQkEftrzc0z2S18EJAsdnT4QX+0q8ZAEqIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB+7Nu5eu0WrVFVy5XVFNFFMcZqmeqIiOcg9m3tH1DX9axdH0rHqyMzKrii3RH8ZmeURHGZnlELqdFuyNP2Ltm3peJ4N3KucK8zJ4cJvXOH8KY7IjlHrmWtdAfRpb2Vov0lqdqmrXs2iPnZ7fF6O2LUT386p7+rlxnqKl6xqXtFXRW592POfRdtG0z2anpbke9PlHqAOG7oAA5H8oXpNjaelzoOjX4+nMy39aumevEtz+V/3zy7u3u47P0vb9wth7aqzK/AvalkcaMHGmfLr+1P3aeMTP6o5qYaxqObq+qZOp6jkV5GXk3JuXblc9dVU/6erk72jaZ09XTXI92OHfPo4Gtan0FPQ2596ePdHq8tUzVVNVUzMzPGZnm/gLkpYAAAAAAAAAAAAAAAAAAAAAAAAAADsXydujGdz6jTuTW8fjouJc/qrdcdWXdjl66KZ7e+ervQZORRjW5uV8IT42NXk3It0cZbj8mrow8Ss2d6a/j/ANpuU+Fp2PXH4umf+bMfamPJ7o6+ccO+P5EREcIjhEP68/y8qvKuzcr/AIeh4mJRi2ot0fzIA1myA8+o5mLp2Bfz86/Rj42Pbm5du1zwpopiOMzL7ETM7IfJmIjbKN3ruXTNpbdydb1a74FizHCmiPKu1z5NFMc5n+cz1RKlG/N1anvHcmRreqV/1lyfBtWon6tm3Hk0U+qP4zxnmn+mjpCyt+bjmu3NdnSMSZpwrE9XGOdyqPtVfwjhHfM6Eu2kab7LRv1/HPl3eqjavqc5Ve5R8Eeff6ADsuMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8wCJKwba83NM9ktfBCQR+2vNzTPZLXwQkCx2dPhBf7SrxkASogAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABY/wCTT0YeLW7O9tfx/wCurjwtNx648imf+dMd8/k90dfOOGn/ACeOjGd1anTuHWrE/QmJc+pbrjqy7sfk+uiOff2d/C18RFMRERERHVEQrOt6nuxOPanr+c/j1WfQ9M3pjIux1fKPz6P6Aqq2AACH3luPTNqbeydb1a983j2KeqmPKuVz5NFMc5mf59kSkc/LxsDCvZuZfosY1iibl25XPCmimI4zMypv019ImTvzcM/MVXLWjYlU04dmerwu+5VH2p/hHV3zPS03T6sy5s/tjjP4c3U9Qpw7W2PinhH5a/v/AHZqe89y5Gt6nXwqr+rZsxPGmxbjyaKf0d/OZmebXwXyiimimKaY2RCgV11XKpqqnbMgDJiAAAAAAAAAAAAAAAAAAAAAAAAAm9kbY1Pd+48bRNKt+FevTxruTH1bVEeVXV3RH8eqO2WNddNFM1VTsiGVFFVdUU0xtmU90N9H+ZvzckWJ8OzpWNMV52REdlPKin71X8I4zy4Tc3S8HD0zTsfT8DHox8XHtxbtWqI4RTTHZCL2NtfTNn7bxtE0q3wtWo43Lkx9a9cnyq6vXP8ACOEdkJ1RNT1CrMudXwxw9V+0vTqcO31/FPH0AHMdMAB/FWPlGdJ39I8+va+hZHHR8W5/aLtE9WVdieU86KZ7O+evlDcflKdJ/wBG493ZugZHDNvUcNQv0T+JomPxcT9qqO3uie+eqs606JpmzZkXY8I/Poqmuant249qfGfx6/YAWdVwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHmARJWDbXm5pnslr4ISCP215uaZ7Ja+CEgWOzp8IL/aVeMgCVEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAN26H9g5u/Ny04seHZ0zGmK87JiPJp5U0/eq7I7uueSC2XtvU92bixtE0m14d+9P1qp8m1RHlV1TyiP5R2zC6+wtq6Zs3bWPoml0fUtx4V27MfWvXJ8qur1z/CIiOTj6tqUYtG5R8c+Xf6OxpGmzl179fwR593qldJ0/C0nTMfTdOx6MfExrcW7VqiOqmmP/e3m9QKRMzM7ZXqIiI2QAPj6A4Z8pLpP+iMW7s/QcjhqF+jhnX6J67FuY8iJ+3VHb3RPfPVsYuLXlXYt0fw1svKoxbU3K/5ad8o7pP+n825tTQsjjpONX/ar1E9WTcieyJ50Uz+2evsiJcUB6Bi41GNbi3Rwh57lZNeTdm5XxkAbDXAAAAAAAAAAAAAAAAAAAAAAAAAI654QD0abhZepahYwMDHryMrIuRbtWqI4zXVM8IiFzOhno+xNh7ci1XFF7VsqIrzciO/lRT92n+M8Z9Uar8nTox/o1p9O5tcx+Gs5Vv+otVx14tqf8q6o7e6OrvdlU7WdT6arobc+7HHvn0XPRdM6Cnprke9PDuj1AHAWAAAc26dekizsbQvFcGuivXc2iYxqO35mnsm7VHdHKOc+qJbF0lby03ZG2b2r58xXdn6mLjxVwqv3OHVTHdHOZ5R+qFKt0a7qW5Ndyta1a/N7Lya/CqnlTHKmmOVMR1RDt6RpvtNfSXI9yPOf+4uHrGp+zUdHbn358o/7g8GTfvZORcyci7XdvXa5ruXK6uNVVUzxmZnnMyxguqkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPMAiSsG2vNzTPZLXwQkEftrzc0z2S18EJAsdnT4QX+0q8ZAEqIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAZ9Pw8rUM6xg4Vi5kZN+uLdq1RHGquqZ4REMC03ycujD+j2DRunXcfhq+Tb/s1muOvFtzHbMcq6o7e6OrnLSzs2jEtb9XH5RzbuBhV5l3cp4fOeUNr6FujzF2Ht2KbsUXdYy4irNvx18J5W6Z+zH8Z6+6I34FBvXq71c3K52zL0GzZos0RbojZEACJKA1vpG3hpuyds39Z1CqK6o+pjWInhVfuTHVTH+czyiJZ27dVyqKaY2zLC5cpt0zXVOyIa705dI9jYugfMYddFzXMymYxLU9fzUdk3ao7o5Rzn1RKneXkX8vKu5WVervX71c13LldXGquqZ4zMzzmZSG69f1Lc+v5Wtatfm7lZFXGfs0RyppjlTEdUQil803Apw7Wz+6eMqBqWoVZl3b/bHCAB0XOAAAAAAAAAAAAAAAAAAAAAAAAAAHefk19GH0hfs7z1/H/slqrwtOsVx+Nrifxsx9mJ7O+evsjr1HoI6Nru+Nc8c1C3XRoWFXE5FfZ8/X2xapn/OY7I9cwuBj2bWPYt49i1Ras2qYot0URwpppiOEREcoiFd1rU+jibFqeuePd3LHommdJMZF2OqOEc+/wZAFRXAAAeDcGr6foOjZWr6pkU4+Hi0TXcrn+ER3zM9URzmXsu3Ldq1Xdu1027dFM1VVVTwimI7ZmeUKi9PvSXc3prP0Xpd2qnQcKufmuHV4zcjqm5Md3bFMd3Xz4Rv6fg1Zl3djhHGXP1HPpw7W9PGeENa6U98ahvvc1zU8rwrWJb40YeNx6rNvj/Gqe2Z/0iGpAv1u3TaoiiiNkQ8/u3Krtc11ztmQBmwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeYBElYNtebmmeyWvghII/bXm5pnslr4ISBY7Onwgv9pV4yAJUQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANp2NsDdO873DRNNrrx4q8GvKuz4Fmj9NU9s+qOM+p2nbPybtOt0U3Nx6/kZFzhxqtYNEW6Ynu8OqJmY/VDRydRxsadldXXy4y3sbTcnJjbbp6ufCFbRcnA6E+jbEpjjoFWTVH5d/Ku1TP6oqiP4JCOifo6iOH9FMH9tf83On+oseOFM+Xq6Uf05kzxqjz9FJhdn8FHR3+amD/AIv5n4KOjv8ANTB/xfzfP1FY+mfL1ff05kfVHn6KTC7P4KOjv81MH/F/M/BR0d/mpg/4v5n6isfTPl6n6cyPqjz9FJhdn8FHR3+amD/i/mfgo6O/zUwf8X8z9RWPpny9T9OZH1R5+ikwuz+Cjo7/ADUwf8X8z8FHR3+amD/i/mfqKx9M+XqfpzI+qPP0UmF2fwUdHf5qYP8Ai/mfgo6O/wA1MH/F/M/UVj6Z8vU/TmR9UefopMLs/go6O/zUwf8AF/M/BR0d/mpg/wCL+Z+orH0z5ep+nMj6o8/RSYXZ/BR0d/mpg/4v5n4KOjv81MH/ABfzP1FY+mfL1P05kfVHn6KTC7P4KOjv81MH/F/M/BR0d/mpg/4v5n6isfTPl6n6cyPqjz9FJhdn8FHR3+amD/i/mfgo6O/zUwf8X8z9RWPpny9T9OZH1R5+ikwuz+Cjo7/NTB/xfzPwUdHf5qYP+L+Z+orH0z5ep+nMj6o8/RSYXZ/BR0d/mpg/4v5n4KOjv81MH/F/M/UVj6Z8vU/TmR9UefopMLs/go6O/wA1MH/F/M/BR0d/mpg/4v5n6isfTPl6n6cyPqjz9FJhdn8FHR3+amD/AIv5v5V0TdHVUcJ2phfqqrj/AP0fqKx9M+XqfpzI+qPP0UnFxs/oP6N8qmfA0S7i1T+VZy7vH9lVUx/Bqet/Ju0K9FVWjbh1DEq7YpybdF6n9HV4M/5prevYlXHbHjHptQ3NAy6OGyfCfXYrKOq7m6Bd96TFV3Cs4msWaevji3eFfD10V8Ov1Rxc01PTtQ0vLqxNSwcnCyKfKtX7VVuqP1THF07OTZvxtt1RLl3sW9YnZcpmHlAToAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHSOgvo3vb517xnNort6HhVxOVcjq+dq7YtUz3zznlHrmEV+9RYtzcrnqhLYsV37kW6I2zLbfk2dGH0pk2t46/j8cGzXxwLFcdV+uJ/GTH2aZ7O+Y7o67NMWLYs4uNaxsa1RZsWqIot26KeFNFMRwiIjlEQyqBm5leXdmurh8o5Q9CwcKjDtRRTx+c85AGm3AH5uV0W7dVy5VTRRTEzVVVPCIiO2ZkHj13VcDQ9IydW1TIpx8PGtzXduVco7o75meqI5zPBS3pX31n783NXqOR4VnCs8beFjTPVat98/entmf1dkQ2b5QHSZXvHV50jSb1UaDhXJ8CY6vGrkdXzk/dj8mP18+EcqXPR9N9np6W5HvT5R6qVrOp+0VdFbn3Y859AB3XBAAAAAAAAAAAAAAAAAAAAAAAAAAG0dGezNR3xua1pODE27MfXysiY402LfHrn1zPZEc59XGYh9u6PqGv61i6PpWPVfzMquKLdEfxmZ5REcZmeUQup0XbJ0/Yu2bel4ng3cmvhXmZPDhN65w7fVTHZEco9czLlapqMYlvZT8U8PV1dK02cy5tq+COPomds6Jpu3NDxdG0mxFjExqPBop5zPOqZ5zM9cz3ykgUWqqapmZ4r7TTFMREcIAHx9Aci+UN0mxtPTJ0DRb8fTmZb+tXTPXiWp/K9Vc8u7t7uM+Nj15FyLdHGUGTkUY1ublc9UNO+Ut0n/P13tk6Bkf1VM+DqeRbnyp/wCjE90flevq7+Nfn9qmaqpqqmZmZ4zM838X/ExKMW1Fuj+Zee5mXXl3ZuV/xAA2mqAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8wCJKwba83NM9ktfBCQR+2vNzTPZLXwQkCx2dPhBf7SrxkASogAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB2zoI6Hf6RW7W5N0Wq6NJmeONi9dNWV96qe2KP41eqO3Tug/ZX9Nt8WMPJpmdNxI8YzZ7PCoieqjj31Twj9HGeS6Nm1bs2aLNm3Tbt26YpoopjhFMR1RERyhX9a1Kqx/wDjan3p4zy/2sOiaZTf/wD2ux7scI5/6fjCxcbCxLWJh49rHx7VMU27VqiKaaIjlER1RDMCnzO1cojZ1QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAI/XNF0jXMOcPWNNxc+xP5F+1FcR6449k+uEgPtNU0zth8qpiqNkuF75+Tvo+bTXk7Tz69Mv9sY2TM3LM+qKvKp/X4Tgu89l7l2hl/Ma9pd3Hpqnhbvx9a1c/7a46p/R298L3MGfh4mfiXMPOxrOVjXY8G5avURXRVHdMT1S7WJrl+z1XPejz+/q4mXoWPe67fuz5fb0fPcWU6S/k/YmVF3UdlXqcS/11Tp96qZtVT9yueumfVPGPXEK8a3pWpaJqV3TtWwr+Fl2p4V2rtPgzHr9cd0x1StOJnWcunbbnr5fNVMvAv4lWy5HVz+TxANxpgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPdoGk6hrusYukaXj1ZGZlXIotUU85757oiOuZ5RD5MxTG2X2ImqdkcUv0b7O1Le+5rOj6fE0W/LyciY402LcT11T6+URzn9q621tC03bWg4ui6TYizi41Hg0xzqnnVVPOqZ65lC9FWx9P2Jtm3puN4N3Mu8Lmbk8Ou9c4fDHZEf6zLblG1XUZy7m7T8EcO/vXvSdNjEt71Xxzx7u4Acl1wABXX5S/Sf4c39kaBkfVj6up5FE9v/AOGJ+L/x74bh8oPpNp2jpU6Jo9+Pp3Mt+VTP/C256vDn70/kx+vlHGpddVVdU111TVVVPGZmeMzKy6Lpm9MZF2Or5R+fRWdc1Pdice1PX85/Hq/gC1qkAAAAAAAAAAAAAAAAAAAAAAAAAAP3Zt3L16izZt1XLldUU0UUxxmqZ6oiI5y/CyHyaejDxW3Z3rr+P/X1x4Wm49ceRTP/ADpjvn8nujr5xw1M3MoxLU3Kv2jnLbwsOvLuxbp/eeUNv6BOjW3srRfpLU7VNWvZtEfPT2+L0dsWonv51Tznq7I4uoAoF+/XfuTcrnrl6Fj2KMe3FuiOqABCmAQ28tx6ZtTbuTrerXfAx7FPVTHlXa58mimOcz/99kSyppmuqKaY2zLGuqmimaqp2RCD6X9/YWw9tVZdfgXtSyImjBxpny6+dU/dp4xM/qjmphq+o5ur6nkanqORXkZeTcm5duVz11VT/wC9nJKb+3Xqe89y5Gt6nXwqrnwbNmJ402bceTRT6o7+czM80AvemafGHb6/inj6KFqmo1Zlzq+GOHqAOm5YAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADzAIkrBtrzc0z2S18EJBH7a83NM9ktfBCQLHZ0+EF/tKvGQBKiAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWu+SfodGn9Hl3WKqOF7VMqqrwuHbbtzNFMf+Xhz+t2FpvQlZox+ifblFEREThU19XfVM1T/ABluTzrPuTcya6p5y9IwLcW8a3THKABqNsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAa7vrZe396aXODrmFTcmmJ+ZyKPq3rM99NX+k8YnnDYhnRXVbqiqmdkwwrt03KZprjbEqX9K3RZruxMiciuJz9Hrq4Ws23RwinupuR+TP8J5TyjQH0Ky8fHy8a5i5Vi3fsXaZouW7lMVU10z2xMT1TCsvTd0K3tFi/uHaVqu/pkca8jCjjVXjRzqp51Ufxj1x2WzTdai9st3+qrn8p/2qOp6JNnbdsddPL5x6w4eAsKugAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP1aoru3KbduiquuuYppppjjNUz2RELddAPRpRszR/pXVbVNWvZtuPnOPX4tbnr+bj19k1T39XLjOn/Jp6MPmqbG9tfx/wCsqjwtMx7keTH/AFpjv+z+3uWDVPWtT35nHtT1fOfwt2iaZuRGRdjr+UfkAVtZQABpnS3vzB2HtqvOu+Be1C/xowcaZ/GV98/dp6pmf0R2zCc3fuHTNrbfytb1a983jY9PHhHlXKuVFMc6pn/3gpR0hbt1Pem5r+talVw8L6tizE8abFuOyiP9Z5zMy6+k6dOXXvV/BHn3erj6tqUYlvdo+OfLv9EVrWp52s6rk6pqWRXkZeTcm5duVdszP+UcojlDxgvERERshRZmZnbIA+vgAAAAAAAAAAAAAAAAAAAAAAAADd+h7YGZvzclOLHh2dMxpivOyIjyaeVFP3quHCO7rnkju3aLNE11zsiElm1XeriiiNsy2j5PHRjO6tSp3DrVifoTEuf1duuOrLux+T66I59/Z38LXxERERERER1REPNpOn4elabj6bp2PRj4mNbi3atUR1U0x/72vUoOfnV5l3fnh8oeg6fg0Ydrcjj85AGi3gAGDPy8bAwr2bm36LGNYom5du1zwpopiOMzMqbdNfSJk783FM2ZuWtGxKppwrE9Xhd9yqPtT/COrvmdr+Ud0n/T+bXtXQsjjpONX/ar1E9WVcieyJ50Uz+2evlEuKrho2mdDT09yPenh3R6qbrWp9NV0Fqfdjj3z6ACwK8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8wCJKwba83NM9ktfBCQR+2vNzTPZLXwQkCx2dPhBf7SrxkASogAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAF1egPMpzeiLb92mePgWKrM+qaK6qf9G9OG/JD1ynJ2tqm37lf9bhZMX7cTP/LuRw6v0VUz/wCTuTzzUbU2squmef8A963o2nXYu4tuqOX/AM6gBpN0cj+UTuLfG0sTB1vbWfTa02qfmMuica3c+buTPGmvjVEzwnrjuiYjvdceHXtKwdc0bL0jUrEX8TKtzbu0Tziecd0xPXE8piGxi3abV2Kq6dsfOGvlWqrtqqiirZPymFSfw59JP99WP3Kz/tPw59JP99WP3Kz/ALUB0o7I1HYu5rml5fhXcW5xrw8nhwi9b4/wqjsmOU+qYlqa9W8TDu0RXRRTMT3QodzLzLVc0V3KomO+XS/w59JP99WP3Kz/ALT8OfST/fVj9ys/7XNBn7Bi/wCOn7Qj/wDQyv8AJV95dL/Dn0k/31Y/crP+0/Dn0k/31Y/crP8Atc0D2DF/x0/aD/0Mr/JV95dL/Dn0k/31Y/crP+0/Dn0k/wB9WP3Kz/tc0D2DF/x0/aD/ANDK/wAlX3l0v8OfST/fVj9ys/7T8OfST/fVj9ys/wC1zQPYMX/HT9oP/Qyv8lX3l0v8OfST/fVj9ys/7T8OfST/AH1Y/crP+1zQPYMX/HT9oP8A0Mr/ACVfeXS/w59JP99WP3Kz/tPw59JP99WP3Kz/ALXNA9gxf8dP2g/9DK/yVfeXS/w59JP99WP3Kz/tPw59JP8AfVj9ys/7XNA9gxf8dP2g/wDQyv8AJV95dL/Dn0k/31Y/crP+0/Dn0k/31Y/crP8Atc0D2DF/x0/aD/0Mr/JV95dL/Dn0k/31Y/crP+0/Dn0k/wB9WP3Kz/tc0D2DF/x0/aD/ANDK/wAlX3l0v8OfST/fVj9ys/7T8OfST/fVj9ys/wC1zQPYMX/HT9oP/Qyv8lX3l0v8OfST/fVj9ys/7T8OfST/AH1Y/crP+1zQPYMX/HT9oP8A0Mr/ACVfeXS/w59JP99WP3Kz/tfq1069JFFcVVatjXI+zVhWuH8IhzIPYMX/ABx9oP8A0Mr/ACVfeXcND+UfuSxVTTrGh6bnW47ZsVV2K5/XM1R/B03afTrsbW5os5uRf0XIq6vBzKf6uZ9VynjER66vBVCGpe0XEux1U7s9zcsa5l2p66t6O/8A7a+hWLkY+Xj0ZOLftX7NyONFy3XFVNUd8THVLKoftDeO5dp5Pz+g6tkYkTPGu1x8K1X/AN1E/Vn9PDisD0c/KA0jVKrWBu3Ho0nKnhEZdvjOPXPrjto/jHfMK/l6Hfse9R70ef2WHD12xf8Adue7Pl9/V28Y8a/ZybFGRj3rd6zcpiqi5bqiqmqJ7JiY6phkcV2wAAAFden/AKHabdGRuvaWLwpjjczsC3T1RHbNy3Hdzmn9cdyvT6Hqx/KP6LadHvXd37exvB067Vxzse3HVj1zPl0xyome2OU+qeq1aPqs1TFi9PhP49FU1nSYpib9mOr5x+Y/LhgCzKuAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOufJ66Mp3bqka9rNifoPDudVFUdWVcj8j/tj8rv7O/hq/RFsLO35uWnDo8Ozp2PwrzsmI8ij7Mfeq64j9c8l0NH03C0jS8bTNNx6MfExrcW7VuiOqmI/wA59fOXB1nU+gp6G3PvT5R6u/oume0VdNcj3Y4d8+j1U0xTTFNMRFMRwiIjqh/QU1dAABhzcrHwsO9mZd6ixj2aJuXblc8KaKYjjMzPdwZlXvlIdJ/03mXNpaDkcdLx6+GZeonqybkT5MTzopn9s+qImdzBwq8u7FFPD5zyhpZ+bRh2prq4/KOctT6bukXI33uDwcaqu1ouHVNOHZnq8OeybtUfanlHKOrv489Bf7NmizRFuiNkQ8+v3q79yblc7ZkASogAAAAAAAAAAAAAAAAAAAAAAAAGfT8PK1DOsYODYryMnIuRbtWqI41V1TPCIh8mdnXJETM7ISeyttanu3cWNomk2vDv3p+tXPk2qI8quqeUR/KI65hdfYe1dM2dtvH0TS6PqW48K7dmPrXrk+VXV65/hHCOTX+hbo8xdh7dii7FF3WMuIqzb8dfCeVumfs0/wAZ4z3RG/KTq+pe1V7lHwR59/ovOkaZGLRv1x78+Xd6gDjO0AAOF/KT6T/onGu7O0HI4ahfo4Z9+ieuxbmPxcT9qqO3uie+erbenPpHsbF0H5jDroua5m0TGLbnr+ap7Ju1R3RyjnPqiVPMrIv5eVdysm7Xev3q5ruXK6uNVdUzxmZnnMysOi6Z0sxfuR7scO//AErmt6n0UTYtT708e7/bEAt6ngAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPMAiSsG2vNzTPZLXwQkEftrzc0z2S18EJAsdnT4QX+0q8ZAEqIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABvHQfuuNo9IeDnX7ngYOR/ZcyZnqi3XMfWn/tqimr9ESutExMcY64fPFbf5Nu+qdz7Sp0XOvcdV0miLdXhT13bPZRX65jyZ/RE81Z/qDDmqIyKfl1T+JWf+ns2KZnHq+fXH5h1gBVVsAAax0lbM03fG2b2kZ8Rbux9fFyIp41WLnDqqjvjlMc4/VKlW6NC1Lbeu5Wi6tYmzl41fg1RyqjlVTPOmY64lfxzfp06N7G+dC8ZwqKLeu4VEzi3J6vnae2bVU908p5T6pl29I1L2avo7k+5PlP/AHFw9Y0z2mjpLce/HnH/AHBTgZcrHv4uTdxsm1XZv2q5ouW66eFVFUTwmJjlMSxLrxUjgAAAAAAAAAAAAAAAAAAAAAAAAAA3bo16TNybGyaaMG/41ps1cbuBfqmbdXfNP2KvXH64la3o43/t/fWnTkaVfm3lW6YnIw7sxF21Pfw50/ejq/RPUo49ui6pqOi6nZ1PSsy7iZdirwrd23VwmP5x3xPVLk6hpNrKjejqq5+rrafq93EmKauunly8H0CHLOhXpbwd62aNK1T5rC163T10RPCjJiO2qjunvp/XHGOPDqal38e5j1zRcjZK74+RbyKIuW52wAIUwxZVizlY13GybVF6zdomi5brp4010zHCYmOcTDKBxU36dOji9sbXvGMKiu5oebXM4tyev5qrtm1VPfHKeceuJc4X73VoOm7m0HK0XVrEXcXJo8GftUTyqpnlVE9cSpR0jbP1LZO5r+jahTNdMfXxr8Rwpv25nqqj/KY5TErtpGpe00dHcn3484/7io+saZ7NX0luPcnyn/uDWwHacQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAATGzduanuvcONomk2fnMi/V11T5NuiPKrqnlEf/XbMI7AxMnPzbOFh2K7+Tfri3atURxqrqmeERELkdCnR3jbD29Hz9NF3WcumKsy9HX4Pdbpn7Mfxnr7ojm6lqFOHb2/3Twj8ulpmn1Zl3Z/bHGfw2DYG09M2ZtrH0XTKONNEeFevTHCq/cnyq6v093KIiOTYAUOuuquqaqp2zK/0UU26YppjZEADFkA55039I2PsTb/AM3i1UXNbzKZjEtT1/Nx2TdqjujlHOerv4S2bNd+uLdEbZlFfvUWLc3K52RDUvlI9J/0LiXNo6DkcNTyKOGbfonrx7cx5ETyrqj9keuYmKwM2Zk5GZl3svLvV38i9XNy7crnjVXVM8ZmZ7+LCv8Ag4dGJaiinj855y89zs2vMuzXVw+UcoAG40wAAAAAAAAAAAAAAAAAAAAAAAAABaf5OXRj/R3Bo3TruPw1fKo/s1muOvFtTHbMcq6o7e6OrnLTvk2dGH0nkWt5a/j8cGzXxwLFcdV6uJ/GTH2aZ7O+Y7o67Mqtrep7duPanxn8eq1aHpmzZkXY8I/Pp9wBWFpAAGtdI+8NN2Ttm9rGoVRXX5GNjxPCq/cmOqmPVzmeUcUvr2q4Gh6Pk6tqmRTj4eLbmu7cq5R3R3zM9URzmVLelbfOfvvc1eo5HhWcK1xowsbj1Wrfr+9PbM/q7Ih1NL06cu5tq+GOPo5Wq6jGHb2U/FPD1Qm6te1Lc2vZWtatfm7lZNfhT9miOVNMcqYjqiEWC900xTEU0x1QoVVU1TNVU9cgD6+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPMAiSsG2vNzTPZLXwQkEftrzc0z2S18EJAsdnT4QX+0q8ZAEqIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAATWytyajtPcuJrumV8L2PV9aiZ+rdonyqKvVMfz7YQoxroprpmmqNsSyorqoqiqmdkwvrsrcumbt25i65pV3wrF+n61Ez9a1XHlUVd0x/KeyYTSl3Qt0h5Ww9wxVdmu9o+XMU5tiOvhHK5TH2o/jHV3TFydOzMXUcCxnYN+jIxsi3Fy1donjTXTMcYmFD1LT6sO5sj4Z4T+F+0zUKcy1tn4o4x+XoAc10wAHDPlJdGH0vjXd4aBj8dQsUcc6xRHXkW4jy4j7dMdvfEd8ddY30PVd+Uf0YfQWZc3ZoOPw0rIr45diiOrGuTPlRHKiqf2T1dkxEWjRNT4Y92fCfx6fZVdc0vjkWo8Y/Pr93EgFoVYAAAAAAAAAAAAAAAAAAAAAAAAABlxb9/FybWTjXrlm/ariu3coqmmqiqJ4xMTHZK2vQL0o296af9EavXRb17Fo41dkRlUR+XTH2o/Kj9cdXVFRXs0XU87RtVxtU03Irx8vGuRctXKe2mY/zjlMc4aGoYFGZb3Z4xwlv6fn14dzejhPGP8Avm+gY03ok33g782zRnWvAs59jhbzsaJ/F198fdq65if0x2xLclCu2qrVc0VxsmHoFq7RdoiuidsSAI0g0/pY2Lgb82zXp9/wLWdZ43MLJmOu1c7p+7PZMfr7YhuAktXarVcV0TsmEd21TdomiuNsS+fuuaXn6Jq+TpWp49ePmY1ybd23VymP84ntiecTxeJbf5QXRnTvDSJ1rSLMRruFb6qaY/4q3HX4E/ej8mf1c44VJrpqormiumaaqZ4TExwmJX3T86nMtb0cY4w8/wBRwa8O7uzwnhL+AN9oAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAO5/Jt6MPpbKtbw17H46fYr44NiuOq/cifLmPsUz2d8x3R16+VlUYtqblf8tnExa8q7Fuj+G4/Jx6MPoDCt7r13H4atk0f2WzXHXjW5jtmOVdUfsjq7ZmHawef5WTXk3JuV8ZehYuNRjWot0cIAGu2AHi1vVMHRdJydV1PIox8PGtzcu3KuyIj/OZ7IjnM8H2ImZ2Q+TMRG2UV0h7u0zZW2b+s6lV4U0/Ux7ETwqv3Jjqoj/WeURMqUbu3Bqe6NwZWt6te+dycirjwjyaKeVFMcqYjqj+ab6Wd95+/Ny1597w7OBZ40YWNM9Vqjj2z96eqZn9EdkQ05eNK06MSjer+OePd3eqiatqU5dzdo+COHf3+gA67kAAAAAAAAAAAAAAAAAAAAAAAAAADpHQX0b3t8674znUV29Cwq4nJuR1fPVdsWqZ755zyj1zDXejbZupb33NZ0fAiaLfl5ORNPGmxb49dU988ojnP65XW2voWm7a0LF0XSbEWcTGo8GmOdU86qp51TPXMuJq+pezUdHbn358o/wC4O5o+me019Jcj3I85/wC4vfjWLONjWsbHtUWbNqiKLduinhTRTEcIiI5REMgKUu/AAAfm5XRbt1XLldNFFMTVVVVPCIiO2Zl+ldPlL9J/h1X9k6BkfVifB1PItz2z/wBGJ+L9nfDaw8SvLuxbo/fuhqZuZRiWpuV/tHOWodP/AEmV7y1j6I0m9VGg4VyfAmOrxm5HV85P3e2KY/Xz4RyoHoGPj0Y9uLdEdUPPcjIryLk3K565AEyEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB5gESVg215uaZ7Ja+CEgj9tebmmeyWvghIFjs6fCC/2lXjIAlRAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADs3ydOk/wDo3nUbY13I4aNlXP7PdrnqxLkz38qKp7e6evnLjI18nGoybc26+EtjFya8a5FyjjD6HR1xxh/XBfk19J/j9mzszcGR/a7VPg6dkXJ/G0RH4qZ+1EdnfHV2xHHvSgZeLXi3Zt1/y9CxMujKtRco/gAazZGHNxcfNw72Hl2aL+Peom3dt1xxprpmOExMd3BmCJ2Ext6pUz6b+jnI2Jr/AM5i013dEzKpnEvT1+BPbNqqe+OU846+/hzxfndu39M3RoGVomrWfncbIp4TMeVRVyrpnlVE9cKU9Iu0NT2Tua/o2o0+FTH18e/EcKb9ueyqP8pjlMTC7aRqXtNHR1z78eff6qPrGmey19Jbj3J8u70a4A7TiAAAAAAAAAAAAAAAAAAAAAAAAAANi6PN3ansrc1jWtNq8KKfqZFiZ4U37c9tE/5xPKYiV19pbg0zdG38XW9JvfO42RTxiJ8qirnRVHKqJ6pUGdF6Duka/sXcHzWXVXc0TMqiMu1HX83PZF2mO+Occ49cRw4ur6b7TR0lEe/Hn3ejt6PqfstfR3J9yfKefquUMWJkWMvFtZWLeovWL1EXLdyirjTXTMcYmJ5xMMqkz1LxE7QABXX5S/Rj4M3t76Bj/Vn62p2Lcdn/AOaI+L/y75WKfm5RRct1W7lFNdFUTTVTVHGJie2JhtYeXXiXYuUfv3w1M3Doy7U26/2nlL55DqnygOjSvZusfS2lWap0HNuT4ER1+LXJ6/m59XbNM93Vy4zyt6Bj36Mi3FyieqXnuRj149ybdcdcACZCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA2To52fqW9tzWNG0+maKZ+vk35jjTYtxPXVP8AlEc5mGFy5TbpmqqdkQzt26rlUUUxtmWxdBvRxf31r/z+ZRXb0PDricq5HV87PbFqme+ec8o9cwuJiY9jExbWLi2aLNizRFFu3RTwpopiOEREcoiEftTQNN2zoGLouk2ItYuPRwj7Vc86qp51TPXMpVQ9Sz6sy7t/tjhC/wCm6fTh2tn908ZAHOdEAB+a6qaKKq66opppjjVVM8IiO9Un5QXSZVvDVp0bSL0xoWHc6qqZ/wCKuR1fOT92PyY/Xz6tw+Uv0n/j9kaBkfd1PItz/wDpifi/8e+FeFs0TTNyIyLsdfyj8qlrmp78zj2p6vnP49QBZFZAAAAAAAAAAAAAAAAAAAAAAAAAAHv0DSNQ13WcXSNLx6sjMyq4ot0U9/fPdER1zPKIeK1bru3abVqiqu5XMU000xxmqZ7IiOcrddAPRpRszRvpTVLVNWvZtEfOcevxa3PXFuPX2TVPf1cuM6GoZ1OHa3p4zwh0NOwKsy7uxwjjLZeivY+n7E2zb0zG8G7l3OFzNyeHXeucPhjsiP8AWZbcCg3LlV2ua652zL0C1bptURRRGyIAGDMBpnS5vzB2HtqrNueBe1C/xowcaZ/GV/an7tPVMz+iO2YSWrVd2uKKI2zKO7dotUTXXOyIax8oTpNp2jpU6Ho1+Pp3Mt+XTPXi25/Ln70/kx+vu41LqqqrqmqqqaqpnjMzPGZl69Z1LO1jVcnVNSyK8jLybk3Ltyrtqmf8o5RHKHjX7T8GnDtbscZ4y8/1DOrzLu9PCOEADeaAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADzAIkrBtrzc0z2S18EJBH7a83NM9ktfBCQLHZ0+EF/tKvGQBKiAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfuxdu2L9u/YuV2rtuqK6K6J4VU1RPGJieUwt90DdJVre2i/R+pXKKNewqI+fp7PGKOyLtMfwqjlPqmFPkht3WdR2/rWLrGlZFWPmY1cV264/jExziY6pjnEufqOBTmWt3+6OEuhp2fVh3d7+2eML/jU+i7e+nb62zb1TE8G1k2+FGZjceM2bnD+NM9sTzj1xMNsUK5bqtVzRXGyYegW7lN2iK6J2xIAwZjT+lfYuBvzbNenZHg2c21xrwsnh12rnDsn7s9kx+vtiG4CS1dqtVxXROyYR3bVF2iaK42xL5/a9pOfoesZOk6pj1Y+ZjVzRdt1cp7474mOuJ5xLwredP3Rnb3no/0rpVqmnXsKifm+HV4zbjr+bn1/Znv6ufGKi3bddq7Vau0VUXKKppqpqjhNMx2xMcpX3T86nMtb0cY4w8/1HArw7u7PCeEvyA32gAAAAAAAAAAAAAAAAAAAAAAAAAA7n8mzpO+icq1s7Xsjhp9+vhg3656rFyZ8iZ+zVPZ3TPdPVZx88Fpvk49J39IcGjauu5HHVsW3/Zr1c9eVaiOyZ510x+2OvlMqtrem7NuRajxj8+v3WrQ9T27Me7PhP49Ps7SArC0gAPDr+k6fruj5Wkapj05GHlW5ou0Vd3fHdMT1xPKYUr6VNj6hsTc9zTMnwruJc43MLJ4dV63x+KOyY/0mF4msdJWzdN3xti9pGfEUXY+vi5ERxqsXOHVVHfHKY5x+qXV0vUZxLmyr4Z4+rlarp0ZlvbT8ccPRRcSW59D1Lbeu5WjatYmzl41fg1xyqjlVTPOJjrifWjV6pqiqImOEqFVTNMzE8YAH18AAAAAAAAAAAAAAAAAAAAAAAAAAAfq3RXcuU27dNVddUxFNNMcZmZ7IiAevQtKz9c1fG0nS8erIzMm5Fu1bp5z3z3REdczyiJldLoo2LgbD2zRp2P4N7Nu8K83JiOu7c4dkfdjsiP19sy1r5P8A0Z0bO0iNX1azTOvZtv68T1+K256/m4+9P5U/q5cZ6qpmsal7RV0Vufdjzn0XXRtM9np6W5HvT5R6gDhO8AAOUfKC6TKdn6TOjaReiddzLfVVTP8Awtuer5yfvT+TH6+XXs3SzvvA2HtmvPveBezr3GjCxpnru198/djtmf0R2zCl2uapn61q2Tqup5FeRmZNybl25Vzmf8ojsiOURwd3R9N9oq6W5Hux5z6ODrOp+z09Dbn3p8o9XkrqqrrqrrqmqqqeNVUzxmZ735Bc1KAAAAAAAAAAAAAAAAAAAAAAAAAAAdc+T10ZTuzVI17WbE/QeHc+rRVHVl3I/J/7I/K7+zv4QZORRj25uV8IT42PXk3It0R1y3H5NPRh8zRY3tr+P/WVR4WmY9yPJj/rTHfP5P7e7hYJ/KYimmKaYiIiOERHJ/VAy8uvKuzcr/iHoWHiUYlqLdH8yANVtAMOblY+Fh3szLvUWMexRNy7crnhTRTEcZmZ7iI29UEzs65R28NxaZtXb+VrerXvm8axTx4R5VyrlRTHOqZ/94KUdIO7dT3puW/rWpVcJq+rYsxPGmxbjyaI/wBZ5zMy2Hpt6Rcjfe4fBx6q7Wi4dU04dmerw+U3ao+1PLujq7+PPV20jTfZaOkrj358u71UbWNT9qr6Oifcjz7/AEAHacUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB5gESVg215uaZ7Ja+CEgj9tebmmeyWvghIFjs6fCC/2lXjIAlRAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANn6Nd56lsfc1nV8CZuWp+plY8zwpv2+PXTPdPOJ5T+uJurtfXdN3LoWLrWk34vYmTR4VM86Z501RyqieqYUDdI6DOki/sbXfFs2uu5oeZXEZVuOv5qrsi7THfHOOceuIcTV9N9po6S3Hvx5/98nc0fU/Zq+juT7k+U/9xXHGLFyLGVjWsrGu0XrF6iK7dyirjTXTMcYmJ5xMMqlcF34gACv3ylejDxii/vbb+P8A11EeFqePbjy4j/nRHfH5XfHXynjYF/JiJiYmImJ6piW1iZdeLdi5R/LVzMSjLtTbr/iXzxHYPlD9GM7W1GrcWiWJ+hMu5/WW6I6sS5P5Pqonl3T1d3Hj6/42RRkW4uUcJee5ONXjXJt1x1wAJ0AAAAAAAAAAAAAAAAAAAAAAAAAz6fmZWn51jOwr9ePk2LkXLV2ieFVFUTxiYYB8mNvVJEzE7YXS6F+kLF35tyK7s0WtXxIijNsR1cZ5XKY+zV/CeMd0zvqhWydzantHceNrmlXfBvWZ4V0TP1btE+VRV3xP8p7YhdjYu6NM3htvG1vS7nG3djhctzP1rNyPKoq9cfxjhPZKk6vpvste/R8E+Xd6LzpGpe1Ublfxx59/qnQHGdoABzTp36N7W+NC8cwLdFGu4VEzj19nz9PbNqqf8pnsn1TKn+RZu49+5Yv267V23VNFdFccKqaonhMTHKYl9C3BPlK9GPj1m9vTQMf+1WqfC1GxRH42iI/GxH2ojt746+U8bFoupdHPQXJ6p4d3cret6Z0kTkWo6449/erWAtyoAAAAAAAAAAAAAAAAAAAAAAAAAACxXyaOjDwIsb31/H+tP1tMx7kdkf8AWmPh/wDLulp3yfOjKrd2qxresWJ+gsO55NUf8Vcjr8CPux+VP6uc8La0U00UxRRTFNNMcIiI4REK1rep7sTj2p6/nP49Vm0PTN6YyLsdXyj8+j+gKotoAAid27g0za+gZWt6te+axsenjMR5VdXKimOdUz1QkMzJx8PEu5eVeos2LNE3LlyueFNFMRxmZnlEQp104dI2RvvX/msWqu3omHVMYlqer5yeybtUd88o5R65nj0dNwKsy7s/tjjLm6lqFOHa2/3Twhr3SJu/U967mv6zqNXgxV9THsRPGmxbieqiP85nnMzLXAXyiim3TFNMbIhQLlyq5VNVU7ZkAZsQAAAAAAAAAAAAAAAAAAAAAAAAExs3bmp7r3DjaJpNn5zIv1ddU+Tbojyq6p5REfy7ZhjVVFFM1VTsiGVNM11RTTG2ZTvRDsLN35uWnDo8Ozp2PwrzsmI8ij7Mfeq4TEfrnkufo+nYWkaXjaZp2PRjYmNbi3at0R1UxH+vr5orYG09M2ZtrH0XTKONNH1r16Y4VX7k+VXV+nu5RERybAomp6hOZc6vhjh6r7penU4dvr+KePoAOY6gAAq78pDpP+nMy5tLQcjjpePXwzL1E9WTcifJiedFM/tnr7IiZ3L5SPSf9DYlzaGg5HDUsijhm36J68e3MeRE8q6o/ZHrmOFYFo0TTOGRdjwj8+n3VXXNT449qfGfx6/YAWhVgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHmARJWDbXm5pnslr4ISCP215uaZ7Ja+CEgWOzp8IL/aVeMgCVEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA7l8m7pP+iMm1s/X8jhp1+vhg3656se5M+RM/Yqns7pnunqs6+eC0PycOk/6cxLe0teyOOqY9HDDv1z15NuI8mZ510x+2PXEzNX1vTOORajxj8+v3WrQ9U4Y92fCfx6fZ24BV1pAAeXVcDD1TTsjTtQx6MjEyLc27tquOMVUz2wpn0x9H+ZsLcc2I8O9pWTM14ORMdtPOir71PPvjhPPhF1kHvna+mbv25k6Jqtvjauxxt3Ij61m5Hk10+uP4xxjsl09M1CrDudfwzx9XM1TTqcy31fFHD0UME5vna+p7P3HkaJqtvhdtTxt3Ij6l63Pk10+qf4TxjthBr3RXTXTFVM7YlQa6KqKppqjZMADJiAAAAAAAAAAAAAAAAAAAAAAAAN56G+kDL2HuSL8zXe0rKmKM7Hie2nlXT96n+McY58Y0YR3rVF6iaK42xKSzers1xconZMPoNpmdianp+PqGBkUZGLkW4uWrtE8Yqpnsl6VVPk6dJ39GtQp2zrmRw0bLuf1F2uerFuzPfyoqnt7p6+9aqOuOMKBn4VeHd3J4fKeb0HAzqMy1vxx+ccn9AaTeH8mImOExxh/QFUvlFdGU7Y1GrcmiY/DRcu5/W26I6sS7PL1UVcu6eru48dfQXVcDD1TTsjTtQx6MjEyLc27tquOMVUz2wpl0xbAzNh7lqxvr3tLyZmvByJjyqedFX3qePX39U81x0bUunp6G5PvRw749VM1rTOgq6a3Huzx7p9GjgO+r4AAAAAAAAAAAAAAAAAAAAAA3Pok2Hnb83NRg2vDs6fY4V52TEfi6O6PvVdcRH6Z7IlB7Q29qe6dwYuiaTZ+cycirhxnybdPOuqeVMR/wC8V1uj3aWmbL2zY0XTaePg/Wv3pjhVfuT21z/pHKIiHI1bUYxKN2j458u/0djSdNnLub1fwRx7+71S2i6Zg6NpWNpem49GPiY1uLdq3T2UxH+c85nnPW9gKPMzM7ZXqIiI2QAPj6A4l8pDpP8AoPDubS0HI4apkUcMu9RPXjW5jyYnlXVH7I6+2YmNjFxq8m5Fuhr5WVRi2puV/Lzab8pHpP8ApnLubQ0HI46bj18M2/RPVkXInyInnRTP7ZjuiOPDwegYuNRjWot0fy88y8qvKuzcr/gAbDXAAAAAAAAAAAAAAAAAAAAAAAAAAZ8DEyc/Ns4WHYrv5N+uLdq3RHGquqZ4REQuR0KdHeNsPb0fP00XdZy6YqzL0dfg91umfsx/GevuiNU+Tj0YfQGFb3XruPw1bJo/stmuOvGtzHbMcq6o/ZHV2zMO1qfrOp9NV0Fufdjj3/6XLRNM6Gnp7se9PDuj1AFfWEAAc76cOkbH2Jt/5vFqoua3mUzGJanr+bjsm7VHdHKOc+qJ4bD0ibv0zZW2b+s6jV4U0/Ux7ETwqv3Jjqoj/OZ5REypTu3cGp7o3Bla3q1753JyKuMxHk0U8qKY5UxHVDtaRpvtNfSVx7kef/fNxNY1P2Wjo7c+/PlHP0R2Zk5GZl3cvKvV38i9XNy7crnjVXVM8ZmZ5zMsQLtEbFHmdoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADzAIkrBtrzc0z2S18EJBH7a83NM9ktfBCQLHZ0+EF/tKvGQBKiAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGbCycjCy7OXiXq7GRZri5auUTwqoqieMTE9/FhCY2kTsXL6EOkbH33oHzeVVRa1vDpiMu1HV85HZF2mO6eccp6ucceiKC7T1/U9sa/i61pN+bWVj1cY4+TXTzpqjnTMdUwut0c7w0ze22bOs6dVFFU/UyLEzxqsXIjrpn/OJ5xMKTq+m+zV9Jbj3J8v++S8aPqftVHR3J9+PP8A75tkAcV2wAGjdMfR/h7923OP9SzquNE14ORMdlXOir7tXPu6p5cJplquBmaXqWRp2oY9ePl49ybd21XHCaao7YfQZyD5Q/RjG6tOq3DoliPpvEt/1lumOvLtx+T6645d/Z3cO/o2p9BV0Nyfdnh3T6K/rWl9PT01qPejj3x6qnj+1RNMzExMTHVMTyfxcVMAAAAAAAAAAAAAAAAAAAAAAAAAAFl/k1dJ30jj2tma9kccyzTw0+/XP46iI/FTP2ojs746u2OutDJjX72NkW8jHu12r1quK7dyieFVNUTxiYnlMS1M3Doy7U0VftPKW5g5leJdi5T+8c4fQsc26CukizvnQfFc6uijXcKiIyaOz56nsi7THdPOI7J9Uw6S8/v2K7FybdcdcPQbF+i/bi5RPVIAiTCB35tXTN47ayNE1Sj6lyPCtXYj61m5Hk10+uP4xMxzTwyorqoqiqmdkwxroprpmmqNsSoTvTbep7T3Fk6Jq1rwL9ir6tUeTdonya6Z5xP/ANdsShl0Omvo8xt+bdmLMUWtZxKZqwr89Xhd9uqfsz/CevviabZ+Jk4GbewsyxXYybFc27tquOFVFUTwmJhfNN1CnMt7Z+KOMflQNT0+rDu7I+GeE/hgAdJzQAAAAAAAAAAAAAAAAABmwsXIzcyzh4lmu/kXq4t2rdEcaq6pnhERHewrQ/Jv6MPoPDt7t17H4apkUccOzXHXjW5jypjlXVH7I9czEaedm0Ylqa6uPyjm3cDCrzLsUU8PnPKG2dCPR1j7E2/4WTTRd1rMpirMvR1+BHbFqmfsxznnPX3cOhAoF69Xerm5XO2Zeg2LNFi3FuiNkQAIkoDXukHdumbL21f1rUquMUfVsWYnhVfuT5NEf6zyiJllRRVcqimmNsywrrpt0zVVOyIa9029IuPsTb3g49VF3WsymacOzPX4HKbtUfZjl3z1d/CnGblZGdmXszMvV38i/XNy7crnjVXVM8ZmZ70jvDcWp7q3Dla3q175zJv1dkeTbpjsopjlTEf+8UQvum4FOHb2f3Txn8KDqeoVZl3b/bHCPyAOi5oAAAAAAAAAAAAAAAAAAAAAAAAAA7n8m3ow+l8q1vDXsfjp9ivjg2K46r9yJ8uY+xTPZ3zHdHXqXQb0cX99a/8AP5lFdvQ8OqJyrsdXzs9sWqZ755zyj1zC4mJj2MTFtYuLZos2LNEUW7dFPCmimI4RERyiIV7WtT6KOgtz708e7/axaJpnSz092Pdjh3/6ZQFQXEAAeLW9UwdF0nJ1XU8ijHw8a3Ny7cq7IiP85nsiOczweuuqmiiquuqKaaY41VTPCIjvVJ+UF0mVbw1adG0i9MaFh3Oqqmf+KuR1eHP3Y/Jj9fPq39Pwasy7uxwjjLQ1HPow7W9PGeENZ6Wd95+/NzV597w7ODZ428LGmeq1R3z96e2Z/RHZENOBfbVqm1RFFEbIh5/du13a5rrnbMgCRGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8wCJKwba83NM9ktfBCQR+2vNzTPZLXwQkCx2dPhBf7SrxkASogAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABt/RTvnUNibmo1HH8K9h3eFGbjceq7b48vvR2xP6uyZagMLtum7RNFcbYlnau1Wq4ronZMPoDoGrafruj42raXkU5GHk0RXbrp5x3T3TE9UxymHuVC6Auky5svWPovVLtVWg5tcfOcevxa5PV85Ed3KqO7r5cJt1auW71qi7arpuW66YqorpnjFUT2TE84UHUMGrDu7s8J4S9A07PpzLW9HGOMP2A0HQAAVx+Ur0YfMV397bfx/6qqfC1PHtx5E/9aI7p/K9fX38K/Pobdt0XbdVq7RTXbriaaqao4xVE9sTHOFRun7ozr2Zq/wBLaVaqq0HMuT83w6/Frk9fzc+r7M93Vy4zbdF1PfiLF2ev5Tz7lR1vS9yZyLUdXzjl3uVgLGrQAAAAAAAAAAAAAAAAAAAAAAAAACU2trupba17F1rSb82crGr8KmeVUc6ao50zHVMLrdG+8dN3vtmzrGnzFFfkZOPM8arFyI66Z9XOJ5xMfoUVbf0U75z9ibmt6jj+FdwrvC3m40T1XbfHl96O2J/V2TLk6rp0Zdvep+OOHf3OvpOpTiXN2r4J493evAPDoWq4Gt6RjatpmRTkYeVbi5auU847p7pjsmOUxMPco0xNM7JXuJiqNsAD4+jifyj+jH6ewrm7NCx+Oq41H9rs0R15NuI8qI510x+2OrtiIdsGxi5NeNci5Rxhr5WNRlWpt18J8nzwHcPlJdGP0Nl3N36Dj8NNyK+ObYojqx7kz5cRyoqn9k+qY4cPegYuTRk2ouUfw88y8WvFuzbr/kAbDXAAAAAAAAAAAAAAAdD6EOjnI33uD5zKprtaJh1ROXdjq+cnti1TPfPOeUdfOOMV69RYom5XOyIS2LNd+5FuiNsy235N3Rh9NZdvd2vY/HTcevjhWK46si5E+XMc6KZ/bPqiYmz7Dh42Ph4lnExLNFjHs0RbtW6I4U0UxHCIiO7gzKBnZleXdmurh8o5PQcHCow7UUU8fnPOQBpt0B/KqqaaZqqqimmI4zMzwiIB5NZ1LB0fSsnVNSyKMfExrc3LtyrspiP855RHOVL+lzfmdvzctWbc8Ozp9jjRg40z+Lo+1P3quqZ/VHZDZ/lCdJtW7tVnQ9Hvz9BYdzy6Z/4q5H5c/dj8mP193Dkq5aNpnQU9Ncj3p8o9VL1rU/aKuhtz7sec+gA7zgAAAAAAAAAAAAAAAAAAAAAAAAAADZOjnZ+pb23NY0bTqZopn6+TfmONNi3E9dU/5RHOZhEaFpWfrmr42k6Zj1ZGZlXIt2rdPOe+e6I7ZnlEcV0uijYuBsPbNGnY/g3s29wrzcmI67tzuj7sdkR+vtmXL1TUYw7eyn4p4erq6Vp05lzbV8McfRN7U0DTdsaBi6LpNiLWLj0cI+1XPOqqedUz1zKVBRaqpqmaqp65XymmKYimmOqABiyAco+UF0mU7P0mdG0i9E67mW+qqmf+Ftz1fOT96fyY/Xy65sfHryLkW6I65QZGRRj25uVz1Q0/5S/Sf+P2RoGR93U8i3P/AOmJ+L/x74V3fquqquuquuqaqqp41VTPGZnvfl6Bh4lGLai3R+/fLz3My68u7Nyv9u6ABtNUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB5gESVg215uaZ7Ja+CEgj9tebmmeyWvghIFjs6fCC/wBpV4yAJUQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA7/wDJq6T/ABa5Z2VuDI/qK58HTci5PkVT/wAmZ7p/J7p6uccOAP7EzExMTMTHZMNbLxaMq1Nuv+G1h5deLdi5R/MPocOPfJ36T43Rp1O3NbyI+m8S3/VXK568u3HP11xHb3x19/DsLz/Jx68a5NuvjD0LGyaMm3FyjhIAgTjw69pWBrmj5Ok6pj05GHk0TRdt1c4747pieuJ5TD3D7EzTO2HyYiqNkqQdK+xc/Ye5q9PyPCvYV7jXhZPDqu2+6fvR2TH6+yYaevZ0i7Q0ze22b+jajT4Mz9fHvxHGqxcjsqj/ACmOcTMKU7t2/qe19fytE1az81k49XDjHk108q6Z50zHXC8aVqMZdG7V8cce/vUTVtNnEub1HwTw7u70RIDruQAAAAAAAAAAAAAAAAAAAAAAAAAA6t8n7pMq2dq/0Pq16qdCzbkeFMz/AMLcnq+cj7s9UVR+vlwm29FdNyimuiqKqao401RPGJjvh88liPk0dJ3H5nZGv5H3dMyLk/8A6Zn4f/HuhW9b0zfici1HX84/Ky6Hqe5MY92er5T+PRYcBU1uAAYczGx8zEvYmXZov496ibd23XHGmumY4TEx3cFOem/o6yNibg8PGpruaJmVTVh3Z6/Antm1VPfHKecdffwuYiN37e0zdO3srRNWs/OY2RTw4x5VurlXTPKqJ/8AeDo6bn1Yd3b/AGzxhzdT0+nMtbP7o4T+FBxsPSDtLU9l7myNF1KnjNH1rF6I4U37c+TXH+scpiYa8vtFdNymKqZ2xKgV0VW6ppqjZMADJiAAAAAAAAAAA9miaZna1q2NpWmY9eRmZNyLdq3T2zM/5RHbM8oji+TMRG2X2ImZ2QlujzaOp713NY0bTafBir6+RfmONNi3E9dc/wCURzmYhdfaO39M2vt/F0TSbPzWNj08OM+VXVzrqnnVM9coPol2Jg7D2zRgWfAvZ9/hXm5MR13K+6Pu09cRH6Z7ZluSj6rqM5de7R8EcO/vXrSdNjEt71fxzx7u71AHIdgAAV7+Uv0n/N039kaBkfXmPB1PIonsj/oxPxfs74bf0/8ASZRs3R/onSb1M69m258CY6/Frc9Xzk+vlTH6+XCaj3K67lyq5crqrrqmaqqqp4zMz2zMrJoumb8xkXY6vlH5VrW9T3InHtT1/Ofw/IC2KiAAAAAAAAAAAAAAAAAAAAAAAAAAP1boruXKbdumquuqYimmmOMzM9kRD8rFfJo6MPAixvfX8f60/W0zHuR2f/mmPh/8u6WrmZdGJam5X+3fLawsOvLuxbo/eeUNw+T/ANGdGztIjV9Ws0zr2bbjw4nr8Vtz1/Nx96fyp/Vy4z1UHn+RkV5Fyblc9cvQsfHox7cW6I6oAEKcBE7t3Bpm19Aytb1a981jY9PGYjyq6uVFMc6pnqhlTTNUxTTHXLGqqKImqqdkQhOlnfeBsPbNefe8C9nXuNGFjTPXdr75+7HbM/ojtmFLtc1TP1rVsnVdTyK8jMybk3LtyrnM/wCUR2RHKI4JbpE3fqe9dzX9Z1GrwYn6mPYieNNi3E9VEf5zPOZmWuL1penxh29s/FPH0ULVdRnMubKfhjh6gDqOWAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8wCJKwba83NM9ktfBCQR+2vNzTPZLXwQkCx2dPhBf7SrxkASogAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHp0zOzNM1HH1DAyK8fKx7kXLV2ieE01R2SuZ0NdIOJvzbkXqvAs6tixFGbjxPZPKun7tX8J4x65pUm9kbn1PaO48bW9Ku+Deszwromfq3aJ8qiqOcT/DqnthzdT0+nMt9XxRw9HT0zUasO51/DPGPyvoILYu6dM3htvH1vSrnG3djhctzP1rNyPKoq9cfxjhPNOqHXRVRVNNUbJhfqK6a6YqpnbEgDFkOedN3Rzj770Dw8am3a1vDpmcS9PV4cds2qp+zPKeU9ffx6GJbN6uxXFyidkwiv2aL9ubdcbYl89s3FyMLMvYeXZrsZFiubd23XHCqiqJ4TEx3sK0fyjujD6dw7m7NBx+Oq49HHLsUR15NuI8qI510x+2OrtiIVcX/BzaMu1v08fnHJ59n4VeHd3KuHynnAA3GkAAAAAAAAAAAAAAAAAAAAAAAAP1brrt1010VVU10zE01UzwmJ74fkBbn5P3SXRvHR/ojVr1Ma7hW48OZnh41bjq+cj70dUVR+vnwjqz5/aDqufoesYuraXkVY+Zi3IrtXKeU9098THVMc4mV0+infOBvvbFvUsfwbWZa4W83G49dq5w5fdntif1dsSpmsab7PV0tuPdnyn0XXRtT9op6K5PvR5x6tuAcJ3gAGl9LuwsLfm2asKvwLOo4/GvByZjyK/sz92rqif1TyUv1jTs3SNUydM1HHrx8vGuTbu26466ao/wA49fN9BHIvlDdGUbr0udf0axH05h2/rUUx15VqPyfXXHLv7O7h3tG1LoKuhuT7s+U+jga1pnT09Nbj3o498eqpo/tUTTVNNUTExPCYnk/i5KWAAAAAAAAAA/tFNVddNFFM1VVTwiIjjMz3LbfJ96M6doaTGtavZiddzLfXTVH/AAtuevwI+9P5U/q5Tx0/5NHRhx+Y3vr+P1eVpmPcj/8AdMfD/wCXdKxCp61qe/M49qer5z+PVbdD0zciMi7HX8o/PoAK2swAA1DpW3zgbE2zXqOR4N7Mu8beFjceu7c4c/ux2zP6u2YTe6te03bOg5Wtatfi1i41HhT9queVNMc6pnqiFKekfeGpb23Nf1jUKpoo8jGx4njTYtxPVTHr5zPOZl1tK06cu5vVfBHHv7nI1bUoxLe7T8c8O7vRGvatn65rGTq2qZFWRmZNya7tyrnPdHdER1RHKIeEF5iIpjZCiTM1TtniAPr4AAAAAAAAAAAAAAAAAAAAAAAAA3Lok2Hnb83NRg2vDs6fY4V52TEfi6O6PvVdcRH6Z7IlHdu02qJrrnZEJLVqu7XFFEbZls/yfOjKrd2qxresWJ+gsO55NUf8Vcjr8CPux+VP6uc8LaUU00UxRRTFNNMcIiI4REPLoumYOjaVjaXpuPRj4mNbi3at09kRH+c85nnPW9ig6hnVZl3enhHCHoGn4NGHa3Y4zxkAaLfAAYczJx8PEu5eVeos2LNE3LlyueFNFMRxmZnlEQp104dI1/fev/NYlVdvRMOqYxLU9Xzk9k3ao755Ryj1zPHbPlI9J/0zl3NoaDkcdNx6+GbfonqyLkT5ETzopn9s+qI48PW/RdM6KOnuR708O7/ana3qfSz0Fqfdjj3/AOgBYVdAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeYBElYNtebmmeyWvghII/bXm5pnslr4ISBY7Onwgv9pV4yAJUQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADd+h7f8Am7C3JTkx4d7S8mYozsaJ8qnlXT96nj1d/XHNc7SdQwtW03H1LTsijJxMm3Fy1donqqpn/wB7OT59Ou/J66Tp2pqdOga1fn6Dy7n1a6p6sS5P5X/ZPPu7e/jwdZ0zp6emtx70ce+PV39F1PoKuhuT7s8O6fRbIfymYqpiqmYmJjjExzf1TV0AAFY/lJdGH0Tk3d4aBj8NPv18c6xRHVYrmfxkR9iqe3ume6eqzjFlWLGVjXcbJtUXrF2iaLluunjTXTMcJiY5xMNzBzK8S7FdPD5xzhp52FRmWpoq4/KeUvnqOkdOnRve2NrvjOFRXc0LNrmca5PX8zV2zaqnvjlPOPXEubr/AGL9F+3FyieqXnt+xXYuTbrjZMACVEAAAAAAAAAAAAAAAAAAAAAAAANm6N946lsjc1nWMCZrt+Rk48zwpv25nrpn184nlP7GsjC5bpuUzRVG2JZ27lVuqK6Z2TC/m19d03cuhYutaTfi9iZNHhUzzpnnTVHKqJ6phJqc9BPSRe2PrvimdXXXoWbXEZNHb8zV2Rdpj1c4jtj1xC4WPes5OPbyMe7Rds3aIrt10TxpqpmOMTE84mFC1HAqw7uz+2eEr/pufTmWtv8AdHGGQBz3RAAVv+Uv0Y+LXL29tAx/6mufC1KxRHkVT/zojun8runr5zw4A+hl63bvWa7N63Tct10zTXRVHGKonqmJjnCoXT30a3Nla39I6baqq0HNrn5me3xevtm1M93OmeceuJW3RdT6SIsXJ644d/cqGt6Z0czkWo6p4xy73MAFjVsAAAAAAdX+T90Z1bw1eNZ1ezVGhYVz60THDxq5HX83H3Y/Kn9XPq1jon2Ln783NRp9jw7ODZ4V5uTEdVqjuj709kR+meyJXS0PS8DRNIxtK0zHox8PGtxbtW6eUf6zPbM85ni4Wsan7PT0Vufenyj1d7RtM9oq6a5Hux5z6PXRRTbopoopimimOFNMRwiI7ofoFMXUAAYsrIsYuNdysm7RZsWaJruXK6uFNFMRxmZnlEQyqyfKT6T/AKWybuztByOOn2K+Gffonqv3In8XE/Zpnt75jujr3MHDry7sUU8PnPKGnnZtGHamurj8o5y1Lpz6R7++te+Yw667eh4Vcxi256vnauybtUd88o5R65lzgF/sWaLFuLdEdUPPb9+u/cm5XO2ZAEqIAAAAAAAAAAAAAAAAAAAAAAAABmwsXIzcyzh4lmu/kXq4t2rdEcaq6pnhERHeTOwiNqR2ht7U907gxdE0mz85k5FXDjPk26eddU8qYj/3iut0e7S0zZe2rGi6bTx8H69+9McKr9ye2uf9I5REQ1/oR6OsfYm3/DyaaLutZlMVZl6OvwI7YtUz9mOc856+7h0JSdX1L2qvo6J9yPPv9F40fTPZaOkuR78+UcvUAcV2wABxL5SHSf8AQWHc2loORw1TIo4Zd6ievGtzHkxPKuqP2R19sxMbX029IuPsTb3g49VF3WsymacOzPX4HKbtUfZjl3z1d/CnGblZGdmXszMvV38i/XNy7crnjVXVM8ZmZ71g0XTOlnp7ke7HDv8A9K7rep9DT0Fqfenj3R6sIC4KcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8wCJKwba83NM9ktfBCQR+2vNzTPZLXwQkCx2dPhBf7SrxkASogAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFjPk09J/ztNjZO4Mj69MeDpmRcnyo/6Mz3/Z/Z3LBvnlbrrt3KbluuqiumYqpqpnhMTHZMStv8n/pMo3jpMaPq16mNew7f1pnq8atx1fOR96Pyo/Xz4RU9a0zcmci1HV84/K3aJqm/EY92ev5T+HVgFbWUABGbo0LTdyaFlaLq1iL2Jk0eDVHOmeVVM8qonriVKukvZmpbH3Ne0jPiblqfr4uRFPCm/b49VUd08pjlP6pm9DVOlHZOnb62zc0vL8G1k0ca8PJ4cZs3OHb66Z7JjnHriJdbStRnEubtXwTx7u9yNW02My3vU/HHDv7lGxIbj0bUdv61laPquPVYzMavwLlE9nqmJ5xMcJiecSj15pqiqNscFEqpmmdk8QB9fAAAAAAAAAAAAAAAAAAAAAAAAB3n5NXSd9H37Wy9eyP7Jdq4adfrn8VXM/ipn7Mz2d09XZPVwYjqnjDWy8WjKtTbr/hs4mVXi3YuUfy+h4458nTpO/pNp1O2tbyOOs4lv+pu1z15VqOfrrpjt746+92N5/k41eNcm3Xxh6Fi5NGTbi5RwkAQNgR249G07cOiZWj6rjxfxMmjwLlM9sd0xPKYnhMTymEiPtNU0ztji+VUxVExPBRrpP2VqOxtz3dKzONzHq414mTw4U3rfHqn1THZMcp9UxM6qvL0obK07fO2LulZng2sijjXiZPDjNm5w6p9dM9kxzj1xExSrcWjajt/WsrR9Vx6rGZi1zRcons9UxPOJjhMTziV60rUYy7eyr4o4+qh6rps4dzbT8E8PRHgOq5IAAldp7f1Pc+v4ui6TYm7lZFXCOPk0U86qp5UxHXKPxMa/mZVrExbNd6/eri3bt0U8aq6pnhERHOZlcXoO6ObGxdA+dy6aLmt5lMTl3Y6/m47YtUz3RznnPqiOHO1LPpw7W3+6eEOjpun1Zl3Z/bHGWxdHW0NM2Vtmxo2nU+FMfXyL8xwqv3Jjrqn/KI5REQ2MFDuV1XKpqqnbMr/AG7dNumKKY2RAAwZgNA6a+kTG2Ht2ZszRd1nLpmnCsT1+D33Ko+zH8Z6u+Yls2a71cW6I2zKK9eosUTcrnZENU+Ud0n/ANH8KvauhZHDVsmj+1XqJ68W3MdkTyrqj9kdfOJVaZ8/Lyc/NvZubfrv5N+ubl27XPGquqZ4zMywL9g4VGJa3KePznm8+z82vMuzXVw+UcoAG60gAAAAAAAAAAAAAAAAAAAAAAAAABaH5N/Rh9CYdvduvY/DVMijjh2K468a3MeVMcq6o/ZHrmYjTfk3dGH01l293a9j8dMx6+OFYrjqyLkT5cxzopn9s+qJ42gVfW9T449qfGfx6/ZadD0zhkXY8I/Pp9wBV1qAAGvdIO7dM2Xtq/rWp1cYo+rYsxPCq/cnyaI/1nlETKV1nUsHR9KydU1LIox8TGtzcu3KuymI/wA55RHOVL+lzfmdvzctWbc8Ozp9jjRg40z+Lo+1P3quqZ/VHZDqaXp85lzr+GOPo5eqajGHb6vinh6oPeG4tT3VuHK1vVr3zmTfq7I8m3THZRTHKmI/94ogF6ppiiIppjZEKFVVNdU1VTtmQBkxAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeYBElYNtebmmeyWvghII/bXm5pnslr4ISBY7Onwgv9pV4yAJUQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA9uh6pn6Lq2NqumZFePmY1yLlq5TymP84nsmOcTweIfJiJjZL7EzTO2F3eibfeBvzbVGfZ8Czn2eFGbjRPXbr74+7PXMT+mO2Jbkol0e7u1PZe5bGtabVx8H6l+xM8Kb9ue2if9J5TESuts/cWmbq2/ja3pN75zGv09k+VbqjtoqjlVE/8AvBR9V02cSveo+CfLu9F60nUoy6N2v448+/1S4DkOwAA5j089Gtre2i+P6dboo17Con5irs8Yo7ZtVT/GmeU+qZVBv2rti/csX7ddq7bqmiuiuOFVNUTwmJjlMPoY4L8pTow8fs3t56Bj/wBrtU+FqOPRH42iI/GxH2ojt746+2J42PRdT6OYsXZ6p4Ty7lb1vS+kici1HXHGOferUAtqoAAAAAAAAAAAAAAAAAAAAAAAAAAPTpedmaZqOPqGBkV4+Vj3IuWrtE8Jpqjslc3oc6QMPfm24yJ8CzquNEUZ2PE9lXKun7tXDq7uuOXGaUp3Ym6dT2duTH1vS6+Fy1Pg3bUz9W9bnyqKvVP8J4TyczU9PpzLfV8UcPR09L1GrDudfwzx9V8hC7K3Lpm7duY2t6Vd8KxejhVRPlWq48qiqOUx/KeyYTSiV0VUVTTVGyYX6iumumKqZ2xIAxZDl/T50a2966J9I6Zapp17Con5mezxijtm1M9/OmeU9XPi6gJrF+uxci5RPXCHIsUZFubdcdUvnnet3LN2u1doqt3KKpproqjhNMx1TExyl+FjvlL9GPjFu9vbQMf+tojwtTsUR5dMf86I74/K9XXynjXFf8LLoy7UXKf3jlLz3Nw68S7Nur9p5wA7Z8nDow+ncy3uzXsfjpWNX/ZLNcdWTcifKmOdFM/tnq7ImGeVk0Y1ublfyYYuLXlXYt0cZ8m5fJt6MPofFtbv17H4ajfo44NiuOvHtzHlzHKuqP2R65nh3EHn+Vk15N2blf8AD0LExaMW1Fuj+QBrtkB5NX1HC0nTMjU9RyKMfExrc3Lt2ueqmmP/AHs5vsRMzsh8mYiNsovf269M2btrI1vVK/q0R4NmzE8Kr1yfJop9c/wiJnkpRvLcmp7s3Fk63q13w8i/V1Ux5NqiPJopjlEf/fbMpzpf39m783LVl1eHZ03HmaMHGmfIo51Vfeq4RM/qjk0peNJ02MWjfr+OfLu9VF1fUpy69yj4I8+/0AHXccAAAAAAAAAAAAAAAAAAAAAAAAAAdD6EOjnI33uD5zKprtaJh1ROXdjq+cnti1TPfPOeUdfdx17o82jqe9dzWNG02nwYq+vkX5jjTYtx21z/AJRHOZiF19o7f0za+38XRNJs/NY2PTw4z5VdXOuqedUz1z/JxdX1L2ajo6J9+fLv9Hb0fTPaq+kuR7kec8vVIYeNj4eJZxMSzRYx7NEW7VuiOFNFMRwiIju4MwKTM7V4iNgAA/lVVNNM1VVRTTEcZmZ4REP6r38pfpP+bpv7I0DI+vMeDqeRbnsj/oxPxfs74bWHiV5V2LdH8Q1czLoxLU3K/wBu+WnfKE6Tat3arOh6Nfn6Cw7nl0z/AMVcj8v/ALY/Jj9fdw5KC/4+PRj24t0cIee5ORXkXJuVz1yAJ0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADzAIkrBtrzc0z2S18EJBH7a83NM9ktfBCQLHZ0+EF/tKvGQBKiAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHQOhPpFydh7g4X6rl3RcuqKcyzHX4Pdcpj7Ufxjq7pjn4ivWaL1E2642xKWzersVxconZMPoRgZeNn4VnNw79F/Gv0RctXaJ4010zHGJiWdVn5OXSf8A0fzaNq69kcNIya/7Nernqxbkz2TPKiqf2T185WmUHOwq8S7uVcPlPN6DgZtGZa36ePzjlIA0m6P5PXHCX9AVW+UX0Yf0bz69z6Fj8NHyrn9otUR1YtyZ7uVFU9ndPVzhxl9B9Rw8XUcC/gZ1i3kY2Rbm3dtVxxprpmOExKm3TT0eZWw9xTTai5e0fLmasK/PXwjnbqn7Ufxjr74i46NqfTU9Dcn3o4d/+1N1rS+hq6e1Huzx7p9GggO+rwAAAAAAAAAAAAAAAAAAAAAAAAADfuhbpCyth7jiu7Nd3R8uYpzbEdfCOVymPtU/xjjHdMXK0/MxdQwbGdhX6MjGv0RctXaJ4010zHGJh893avk4dJ39H86jauu5HDScmv8Ast6uerFuzPZM8qKp/ZPXzmVf1rTOmp6e3HvRx749Vh0TU+hq6C5Puzw7p9FpQFPXIAB/KoiqmaaoiYmOExPNU35Q3RlO09UnXtGsT9B5lz61FMdWLdn8n/sn8nu7O7jbN5NY03C1jS8nTNSx6MjEybc27tuuOqqJ/wAp7p5S3tPzqsO7vRwnjDQ1DBozLW5PGOEqedCXR3k773DxyKa7Wi4dUVZl6Orwu61TP2p/hHX3cbkYOLjYOHZw8OxRYx7FEW7VuiOFNFMRwiIhH7R27pe1tBx9F0ex81i2I7Z66q6p7aqp51T3/wCiWZ6lqFWZc2/2xwhhpmn04drZ/dPGfwAOc6QAD+VTFNM1VTEREcZmeSp3yhuk2d16nOgaLfn6Dw7n1q6Z6su7H5X/AGRy7+3u4bj8pbpP+YovbJ0DI/ra48HU8i3Pkx/0Ynvn8r1dXOeFcVr0TTN2IyLsdfyj8+ip65qe9M49qer5z+PUAWVWAAAAAAAAAAAAAAAAAAAAAAAAAAB7NE0zO1rVsbStMx68jMybkW7VuntmZ/yiO2Z5RHF5KKaq66aKKZqqqnhERHGZnuW2+T70Z07Q0mNa1ezE67mW+umqP+Ftz1+BH3p/Kn9XKeOjqGdTh2t6eM8Ib+nYFeZd3Y4Rxls3RLsTB2HtmjAs+Bez7/CvNyYjruV90fdp64iP0z2zLcgUG7dqu1zXXO2ZegWrVFqiKKI2RAAjSANQ6Vt84GxNs16jkeDdzLvG3hY3Hru3OHP7sdsz+rtmGdq3VdriiiNsyju3abVE11zsiGs9P/SZRs3R/onSr1M69m258CY6/Frc9Xzk+vtimO/r5cJqPcrruXKrlyuquuqZqqqqnjMzPbMy9mvatn65rGTq2qZFWRmZNya7tyrnPdHdER1RHKIeFftPwacO1uxxnjLz/Uc+rMu708I4QAN9oAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPMAiSsG2vNzTPZLXwQkEftrzc0z2S18EJAsdnT4QX+0q8ZAEqIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWY+TZ0n/SePa2br+RxzbNPg6fkVz+OoiPxcz9qI7O+PXHXWdkx717GyLeRj3a7V61XFduuieFVNUTxiYnlMS083Doy7U0VftPKW5g5leJdi5T+8c4fQsc06COkmzvjQ/E8+5RRruFREZFHZ8/T2Rdpj/OOU+qYdLUG/YrsXJt1x1w9BsX6L9uLlE9UgCFMIbee29M3Zt3J0TVrXh2L8fVqjyrVceTXTPKY/8ArsmUyMqapoqiqmdkwxroprpmmqNsSofv7amp7M3LkaLqdHGqj61m9EcKb1ufJrp/T3cpiY5IBdvpd2Fg7821Vh3PAs6jj8a8HJmPIr+zP3auERP6p5KX6zpudo+q5Ol6lj142XjXJt3bdcddMx/nHOJ5wvemahGZb6/ijj6qFqmnVYdzq+GeHo8gDpuWAAAAAAAAAAAAAAAAAAAAAAAAAAs78mzpO+l8W1s/XsjjqNijhg36568i3EeRM866Y7O+I746+5Pnrh5N/Dy7WXi3q7N+zXFy3conhVRVE8YmJ5TErjdB/SNY31t/5vKqot63h0xTl2o6vnI7Iu0x3TzjlPqmONQ1rTOinp7ce7PHu/0uOian0sdBdn3o4d8erogCvLEAAAAAAOW9PvSXb2Xo30Xpd2mrXs2ifmuHX4tbnqm5Pr5Ux39fLhOy9Ke+NP2Jtm5qeV4N3LucaMPG48JvXOHwx2zP+swpZuDV9Q17WcrV9UyKsjMyq5ruVz/CIjlERwiI5RDuaPpvtFXS3I92POfRwtZ1P2enorc+9PlHq8V25cu3a7t2uq5crqmqqqqeM1TPbMzzl+QXRSQAAAAAAAAAAAAAAAAAAAAAAAAAAHV/k/dGdW8NXjWdXs1RoWFc+tExw8auR1/Nx92Pyp/Vz6ocjIox7c3K56oTY+PXkXIt0R1y3D5NHRhx+Y3vr+P1eVpmPcj/APdMfD/5d0rEPzRRTbopoopimimOFNMRwiI7ofp5/mZdeVdm5X+3dD0LCxKMS1Fuj9++QBqtsBiysixi413KybtFmxZomu5crq4U0UxHGZmeURBxJ6ng3Vr2m7Z0HK1rVr8WsXGo8KftVzyppjnVM9UQpT0j7w1Le25r2sahM0UeRjY8TxpsW4nqpj185nnPFsXTn0j399a94vh1129Dwq5jFtz1fO1dk3ao755Ryj1zLnC7aRpvs1HSXI9+fKP+4qPrGp+019Hbn3I85/7gAO04gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADzAIkrBtrzc0z2S18EJBH7a83NM9ktfBCQLHZ0+EF/tKvGQBKiAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASO2tb1HbuuYus6TkTYy8avwqKuU99MxziY6pjuldXox3rp2+ds2tVwpi3fp4UZeNM8arFzh1x64ntieceuJiKMtp6Mt66jsbc1rVsKZuWKuFGXjTVwpv2+PXHqmO2J5T6uMTytV06Mu3tp+KOHo62lalOHc2VfBPHu715hG7a1vTdxaHi6zpORF/EyaPCoq5x30zHKYnqmO+EkotVM0zMTxXymqKoiY4SAPj6OS/KD6Mqd3aVOt6PYiNdw7fk0x/xVuPyJ+9H5M/q7uHWhPj5FePci5RPXCDJx6Mi3NuuOqXzxrpqormiumaaqZ4TExwmJfxYf5S3Rh+P3tt/H+9qePbj/APdEfF/5d8q8L/h5dGVai5R+/dLz3MxK8S7Nuv8AbvgAbTVAAAAAAAAAAAAAAAAAAAAAAAAEttHcOp7W3Bi63pN75vJx6uPCfJrp50VRzpmOqf5okY1UxVE01R1S+01TRMVUzsmF7ej3dumb02zY1rTavB8L6l+zM8arFyO2if8ASecTEticD+Sls/XNOsZO6c3IvYmBnWoosYnpERPGLtUT2RHX4POeMz2dvfHnufZt2b9VFudsR/2z9no2BeuX8emu5GyZ/wC2/uANNuAACM3Rrum7b0LK1rVr8WcTGo8KqedU8qaY51TPVEPfk37ONj3MjIu0WrNqia7lyurhTTTEcZmZ5REKe9OvSRe3xrviuDXXRoWFXMY1HZ89V2Tdqj18onsj1zLoadgVZl3Z/bHGXO1LUKcO1t/unhDXOkreWpb43Ne1fPmbdqPqYuPFXGmxb49VMd885nnP6oayC+27dNumKKY2RCgXLlVyqa652zIAzYAAAAAAAAAAAAAAAAAAAAAAAAAJXae39T3Pr+Lomk2PncrIq4Rx8minnVVPKmI65Y1VRTE1VT1Q+00zXMU0xtmU30T7Fz9+bmo0+x4dnBs8K83JiOq1Rx7I+9PZEfpnsiV0tD0vA0TSMbStMx6MfDxrcW7VunlH+sz2zPOZ4ono62hpmyds2NG06nwqo+vkX5jhVfuT21T/AJRHKIiGxqLqmozmXNlPwxw9V90rTow7e2r4p4+gA5bqgACsnyk+k/6VybuztByOOn2K+Gffonqv3In8XE/Zpnt75jujr3H5R3Sf/R/Cr2roWRw1bJo/tV6ievFtzHZE8q6o/ZHXziVWln0TTNuzIux4R+fT7qtrmp7NuPanxn8ev2AFpVUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB5gESVg215uaZ7Ja+CEgj9tebmmeyWvghIFjs6fCC/2lXjIAlRAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOldBPSTe2PrniefXXXoWbXEZFHb8zV2Rdpj/ADjnHriFwca9Zyce3kY92i7Zu0RXbuUVcaaqZjjExPOJh89Hdvk2dKH0ZkWtm6/kcMG9VwwMiueqxXM/i5n7Mz2d0z3T1V3WtM6SJv2o6449/f4rHomqdFMWLs9U8J5d3gsyAqK4AAPzXTTXRVRXTFVNUcJiY4xMdytHTp0MXNLm/uTaGNVcwOuvKwaI41Y/fVRHOjvjtp/R2WZG3h5tzEub9H7xzaebhWsy3uV/tPJ88BZfpu6E7epTf3Fs7HotZs8a8nT6eqm931W+UVd9PZPLhPbWu9au2L1dm9brtXbdU010V0zFVMx1TExPZK9Yebay6N6ifGOSiZuFdxK92uPCflL8ANtpgAAAAAAAAAAAAAAAAAAAAADr/wAn7osr3Xm0bg1yxVToWPX/AFduqOHjlcT5P/ZE9s8+zv4RPQf0ZZW+tW8bzabljQcWuPGLsdU3qu35qie/vnlHrmFv8DExcDCs4WFYt4+NYoi3atW6eFNFMRwiIhX9Y1ToYmzan3vnPL/aw6NpXTTF67Hu/KOf+mWiim3RTRRTTTRTHCmmI4REd0P0CnrkAAA4V8onpX+ibd/aO2sn/wDkK48DOyrc/wDD0z226Z+3POfyf09mzi4tzKuRbo/hrZeVbxbc3K/5a58pTpP+ksi7s3QMjjhWauGoX6J6r1cT+LifsxPb3z6o6+EAv2Ji0YtqLdH8vPsvKryrs3K/4AGy1gAAAAAAAAAAAAAAAAAAAAAAAAAGXEx7+ZlWsXFs13r96uLdu3RHGquqZ4RERzmZXF6DujmxsXQPncuii5reZTE5d2Ov5uO2LVM90c55z6ojhqfybejD6HxbW79ex+Go36OODYrjrx7cx5cxyrqj9keuZ4dxVDWtT6Wegtz7sce//S46JpnRR092Penh3f7AFeWIAAaB019IeNsPbszZmi7rOXTNOFYnr8HvuVR9mP4z1d8xsG/t16Zs3bWRreqV/Vo+rZtRPCq9cnyaKfXP8IiZ5KUbz3Jqe7NxZOt6td8PIv1dVMeTaojyaKY5RH/32zLs6RpvtVe/XHuR593q4usan7LR0dE+/Pl3+iNz8vJz82/m5t+u/k365uXbtc8aq6pnjMzLAC7xGzqhRpnbO2QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHmARJWDbXm5pnslr4ISCP215uaZ7Ja+CEgWOzp8IL/AGlXjIAlRAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALS/Jy6T/wCkGFRtXXsjjq2NR/Zb1c9eVbiOyZ510x+2OvtiZdqfPfBy8nAzbObh367GTYri5auUTwqoqieMTErkdCfSJjb829/X1UWtZxKYpzLMdXhd1ymPsz/Ceru40/WdM6Gentx7s8e7/S5aLqnTU9Bdn3o4d8eroACvrCAAOYdMXRHpe9rVepafNvT9dpp6r3DhbyOHZTciOfLwo649ccIdPE1i/csVxXbnZKG/j28iiaLkbYUB3Homq7d1e9pWs4V3Ey7M/WorjtjlMT2TE8pjqRy9PSBsjQd76TODrONxuURPzGTb4RdsT30z3d8T1SqZ0n9Gu4NiZs+O2vGtNrq4WM61TPgVd0VR+RV6p/VMrpp+rW8qN2rqq5c/BSdR0i5iTvU9dHPl4+rSQHWcgAAAAAAAAAAAAAAAAAAb70O9G+ob91nr+cxtHx6o8byuH6/m6O+uf4R1zyif70P9Gmp791Xwp8PE0axXEZWXw7fuUce2qf2R2zyibg7e0bTdA0fH0nScWjFw8enwbdFP8Zmecz2zM9suHquqxjR0dr4//n+3d0nSZyZi7dj3P/v+n70TS8DRNKx9K0vFoxsPGoii1bojqiP9ZntmZ65nre0FMmZmdsrrERTGyAB8fQHPOmvpIxNh6J81jzbv63l0TGJYnriiOz52uPsxyjnPV3zEtmzXfri3RG2ZRX71Fiiblc7IhDfKA6UqNpYFWg6Jepq17Jo+tXT1+KUT+VP355Ry7Z5canXa67tyq5crqrrrmaqqqp4zVM9szLNqObl6jn38/OyLmRlZFc3Lt25PGquqe2ZedfcDBow7e7HH5y8/1DPrzLu9VwjhHIAbzRAAAAAAAAAAAAAAAAAAAAAAAAAAHbPk4dGH07mW92a9j8dKxq/7JZrjqybkT5Uxzopn9s9XZEw1ToS6O8nfe4eORTXa0XDqirMvR1eF3WqZ+1P8I6+7jcjBxcbBw7OHh2KLGPYoi3at0RwpopiOEREK/rWp9DT0Fufenj3f7WHRNM6arp7se7HDvn0ZgFPXIAAeTV9RwtJ0zI1PUcijHxMa3Ny7drnqppj/AN7Ob1VTFNM1VTEREcZmeSp3yhuk2d16nOgaLfn6Dw7n1q6Z6su7H5X/AGRy7+3u4b2Bg15l3djh85aGoZ1GHa354zwhq/S/v7N35uWrLq8OzpuPM0YONM+RRzqq+9VwiZ/VHJpQL9atUWqIoojZEPP7t2u9XNdc7ZkASIwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHmARJWDbXm5pnslr4ISCP215uaZ7Ja+CEgWOzp8IL/AGlXjIAlRAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACY2buPU9qbixtb0m74GRYq66Z8m5RPlUVRziY/n2xCHGNVMV0zTVG2JZU1TRVFVM7JhfDYO69M3ltrH1vTK/qXI8G9ameNVm5HlUVeuP4xMTzT6k3Q9v7M2HuWnKjw72mZMxRnY8T5VPKqn71PXMd/XHNc/StQw9V03H1LT8ijIxMm3Fy1donqqplRNT0+cO51fDPD0X3S9RpzLfX8UcfV6gHMdQAAYM/Exc/Du4edj2snGvUzRctXaIqprjumJ7WcfYnZ1w+TG3qlXDpX6A71iburbHiq9a66rmm11ca6f/wCqqfKj7s9fdM9jgeTYvY2Rcx8mzcs3rdU0127lM01UzHbExPXEvoW0rpI6M9s74sVV5+N4tqMU8LedYiIuR3RVyrj1T+qYWHA12q3sov8AXHP5/vz/APquZ+g03NteP1Ty+X7cv/iko3vpH6K907Krrv5ON49pkT9XOxqZmiI+/HbRP6erumWiLVavUXqd+3O2FUu2blmrcuRskASIwAAAAAAAAAAH6t0V3LlNu3RVXXVMU000xxmZnsiIB+XUOhjom1HeuTRqepRdwtAoq+td4cK8mY7abfHlymrsjlxns2/od6CruRNnW972arVnqrs6ZM8K6+6bvdH3e3v4dk2Mx7NrHsUWLFqi1at0xTRRRTFNNNMdURER2Qrmpa1FG23jztnny8Fk0zRJr2XciNkcufi8+jaZp+jaZY0zS8S1iYePT4Nq1bjhFMf6zzmZ65l7AVOZmZ2yt0RERsgAfH0BrnSHvHSdk7euatqlzjPk4+PTP179zlTT/rPKGdFFVyqKaY2zLC5cpt0zVVOyIePpU35pmw9vVZ+V4N7NvcaMPFirhVer757qY6uM/wCswpjuXW9S3FreTrGrZNWRl5FfhV1T2R3UxHKIjqiHq3xunVt4bhv61q97wrtz6tu3T5FmiOyimOUR/GeMz1yg150zTqcOjbPXVPH0UPVNSqzK9kdVMcI/MgDqOWAAAAAAAAAAAAAAAAAAAAAAAAAANg6P9p6nvPcuPoumU8Jr+tevTHGmxbjyq6v9I5zMQitG03O1jVMbS9Nx68jLybkW7Vujtqmf8o5zPKF0OiLYWDsPbVOFb8C9qN/hXnZMR+Mr+zH3aeuI/XPNzNT1CMO31fFPD1dTS9OnMudfwxx9E5s/bumbV29i6JpNn5vHsU9dU+Vcqnyq6p51TP8ALshMAolVU11TVVO2ZX2mmKKYppjZEADFkA5b0+9JdvZejfRel3aatezaJ+a4dfi1ueqbkx38qY7+vlwmbHsV5FyLdEdcocjIox7c3K56oah8pbpP+YovbJ0DI/ra48HU8i3Pkx/0Ynvn8r1dXOeFcX6u3Ll27Xdu11XLldU1VVVTxmqZ7Zmecvyv+HiUYlqLdP7zzl57m5leXdm5X+0coAG21AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHmARJWDbXm5pnslr4ISCP215uaZ7Ja+CEgWOzp8IL/aVeMgCVEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOw/J26TZ2vqVO3NbyOGi5dz+quVz1Yt2efqonn3T19/HjwgycejJtzbr4SnxsmvGuRco4w+h0TExxieMS/rgnyaek7x6zZ2Xr+R/arVPg6dfrn8bREfipn7UR5PfHVyjj3t5/l4teLdm3X/L0PEy6Mq1Fyj+JAGs2QAAAH5rppromiumKqao4TExxiYcn6Q+grbG4ZuZmi8NC1CrjM/M0cbFc+u3+T+mnh+iXWhPYybuPVvW6tkoMjGtZFO7dp2wpDvno13fs6uuvVNMruYdM9WZjcblmY75mOun/AOUQ059DqoiqmaaoiYmOExPNzrefQzsfck13o0+dKzKuv5/A4W4mfXRw8Gf2RPrWPF/qGJ6r9P7x6K3lf07Mddir9p9VNh2bdfyet16dNd3QsvE1mzHk0cfmL37Kp8H/ABfqcv1/bW4NAuTb1rRs/Anjwiq9Yqppn9FXZP6pd2xmWL/Z1RP/AN+zgX8K/Y7SiY/+fdEgNlrAAAP3Zt3L12m1Zt13LlU8KaaY4zM+qAfgdB2l0Ob83DVRXTpNWmY1X/Pz5m1HD1U8PDn9nB23YvQFtfRareVr12vXcunr8C5T4GPTP/ZE8av/AJTMT3Obk6rjY/GrbPKOt0sXScrI4U7I5z1K+7A6PNz71yYp0jBmnEirhczL/GizR3/W/Kn1U8ZWg6LuiXbuyKaMvwfpLV+H1sy9RH1J7rdP5H6eufXyb/jWLONYox8ezbs2bdMU0W7dMU00xHKIjqiGRV87V72V7se7Ty9ZWrB0ezi+9PvVc/SAByXXAAAa10h700bZGhV6nq17jXVxjHxqJ/rL9fdTHd3z2R+xnbt1XKoppjbMsLlym3TNdc7Ihl37u3SNmbfu6vq97hTH1bNmmfr36+VFMd/r5R1ypp0h7y1fe24Lmrarc4Uxxpx8emfqWKPs0/6zzl/OkHeWs7216vVdWvdUcacfHpn+rsUfZpj/ADntlri7aXpdOJTvVddc+XdCj6pqlWZVuUdVEeffIA67jgAAAAAAAAAAAAAAAAAAAAAAAAAD+001VVRTTE1VTPCIiOuZfxYP5NPRh85VY3tr+P8AUpnwtMx7keVP/WmO77P7e6WrmZdGLam5X/MtrDxK8u7Fuj+Ibj8nvoyp2lpca7rNiPp3Mt9VFUdeLbn8j/un8qeXZ38etgoGRkV5Fyblc9cvQsbHox7cW6I6oAECcBGbo13Tdt6Fla1q1+LOJjUeFVPOqeVNMc6pnqiH2mmapiI4y+VVRTE1TwhC9Ke+NP2Jtm5qeV4N3LucaMPG48JvXOH8KY7Zn/WYUs3Bq+oa9rOVq+qZFWRmZVc13K5/hERyiI4REcohMdJW8tS3xua9q+fM27UfUxceJ402LfHqpjvnnM85/VDWF60vToxLe2r4p4+iharqM5lzZT8EcPUAdVygAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHmARJWDbXm5pnslr4ISCP215uaZ7Ja+CEgWOzp8IL/aVeMgCVEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/ePeu49+3fsXK7V23VFdFdE8KqaonjExPKYlcHoI6SLW99C8T1C5RRruFREZFHZ8/R2Rdpj+ExHZPqmFO0ltjXNS23ruLrOk35s5eNX4VE8qo501RziY6pj1ufqOBTmWt3+6OEuhpufVh3d7+2eML+jWOjXeWm742xZ1fAmKLsfUyseZ41WLnDrpnvjnE84/XDZ1CuW6rdU0VRsmHoFu5TcpiumdsSAMGYAAAAAA/Nyii5RNFdNNdNUcJpqjjEw/QDVdY6OtjavM1Z21tLqrq7a7VmLVU/pqo4S1XP6A+jzJmZs4moYfHlZy6p4f+fhOqDZt5uRb+GuY/dq3MLHufFRE/s4xc+TlsqZ40aruCn1fP2Z/wD+bJY+Tpse3VE3NQ1676qsi1Efwtw7GJv/AFMv/JKL/wAvD/xw5xpfQl0cYNUVzodeXXHZVk5Nyr/DExTP7G6aLoGh6JR4Gj6PgYEcOE+L49NEz+mYjjKTGvcyb1346pnxlsWsaza+CiI8IAECcAAAABxrph6bdP25F7R9sV2dQ1eONFy/5VnGnn/31x3dkc+zgnx8a7k17luNstfJyrWNRv3J2Q27pV6SNF2FpvhZNUZWqXaZnGwqKvrVfeqn8mn18+XFUDeW59Y3brl3V9aypv36+qmmOqi1TyoojlEf/c8Z63g1bUc7VtRvajqWVdy8u/V4V27dq41VT/7y5PKu2n6Zbw6dvGqeM+ij6jqdzMq2cKY4R6gDpuYAAAAAAAAAAAAAAAAAAAAAAAAAAA27oq2NqG+9zW9OxvCtYdrhXm5PDqtW+PL709kR+vsiWF25TaomuudkQztWqrtcUURtmWzdAHRpXvLWPpbVbNUaDhXI8Pj1eM3I6/m49XZNU93Vz4xbm3RRat027dFNFFERTTTTHCIiOyIh49B0nA0LR8XSdLx6cfDxbcUWrdPKO+e+Znrmecy9yg6hnVZl3enhHCHoGnYFOHa3Y4zxkAaDoAAMeTfs42PcyMi7Ras2qJruXK6uFNNMRxmZnlEQp7069JF7fGu+K4NddGhYVcxjUdnz1XZN2qPXyjlHrmW3fKU6T/pLIu7N0DI44VmrhqF+ifx1cT+Lifs0z298x3R18IW7RdM6OOnuR1zw7u/xU/W9T6WZsWp6o4zz7vAAWJXAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHmARJWDbXm5pnslr4ISCP215uaZ7Ja+CEgWOzp8IL/aVeMgCVEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA23or3xn7E3Pb1PG8K7iXOFvNxuPVet8fijtif8ASZXU0HVsDXdHxdW0vIpyMPKtxXarp5x3T3TE9UxymHz+dV+T/wBJdezdY+idVvVToObcjw5mePi1yer5yPV2RVHd18uE8LWNN9op6W3HvR5x6u7o2p+z1dFcn3Z8p9Fuh+bddFy3Tct1U10VRE01UzxiYnsmJfpTF2AAAAAAAAAAAAAAAAAePWNU03R8GvO1XOx8LGo8q7fuRRT+jjPP1PsRMzsh8mYiNsvYiN1bl0Ta+mVajruoWcOxHVT4c8ark91NMddU+qHGukP5Q2Hjxcwtl4njd3rjx7Jomm3Hroo7av01cP0Sr9uLXdY3FqVeo63qF/Oya/y7tXHwY7qY7KY9UcId3C0K7d9697sef+nBzdetWfds+9Pl/v8A7rdL6V+m7WNzxe0vQIu6TpFXGmqqKuF/Ij70x5MT9mP1zPY5EC14+Nax6Ny3GyFSyMm7k179ydsgCdAAAAAAAAAAAAAAAAAAAAAAAAAAAAy4uPfysm1i41qu9fvVxRbt0U8aq6pnhERHOZk4HF79q6DqW5texdF0mxN7Kya/Bp+zTHOqqeVMR1zK63Rxs7TdkbZs6Pp8RXX5eTkTHCq/cmOuqfVyiOUcGu9BnRxY2LoPjGZRRc1zNoicq5HX81T2xapnujnPOfVEOjqTq+pe019Hbn3I85/7gu+j6Z7NR0lyPfnyj/uIA4ruAADjHyjOk7+jmBXtfQsjhrGVb/tF2ievFtTHKeVdUdndHXzhtXTR0hYuw9uTctzRe1fKiacKxPX187lUfZp/jPCO+YprqOZlajn38/Ov15GTkXJuXbtc8aq6pnjMysGjaZ01XTXI92OHfPor2tan0NPQWp96ePdHq84C4KaAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8wCJKwba83NM9ktfBCQR+2vNzTPZLXwQkCx2dPhBf7SrxkASogAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFhvk0dJ3CbOyNfyOrydMv1z/APpmfh/8e6FiXzyoqqorproqmmqmeNNUTwmJ71tvk/dJlO8NIjR9XvRGu4Vv60zP/FW46vnI+9HVFUfr59VT1vTdyZyLcdXz9Vt0PU9+Ix7s9fyn8ejq4CtrMAAOe630saFtvcl3Qd14edpF6n61rI+b+esXrc+TXTVT9b9MeD1TEw6E0vpd2Hhb82zVhXPAs6jY43MHJmPxdf2Z+7V1RP6p5NnF6Gbmy98M/OPl3tbK6aLe2x8UfKfn3JvQd1bb16mJ0bXdPzqpjj4Fq/TNcfpp48Y/XCZfPzV9PztG1XI03ULFzGzMW5NF23V1TTVH/vGJ59qY0bfm89HiKdO3PqlqinstzkVV0R/8auMfwd25/Tu2Ntq51d/rHo4Fv+o9k7Ltvr7vSfVesVB03p56RMSIi9nYWdw9IxKY+DwU9ifKR3RTEeNaDo93v+b+co/zqlp1aDl08Nk/v6t2jX8Srjtj9vRaAVso+UrqUR9famJM+rLqj/8Ay/N35SurTH9VtbBpn72TVV/pCP8A8TN+nzhJ/wC5hfV5T6LKiq+b8ozeV2JjF0vRMeJ5zauV1R+2vh/BrWrdM/SNqETRO4KsWifycaxbt8P/AJRHhfxTUaBlVcdkfuhr/qHFp4bZ/Zcm/etWLVV6/dotW6Y41V11RERHrmWi7n6X9gaDFVN3XLWdfp/5OBHz8z6vCj6sfrqhT3V9a1jWLvzurarnZ9fHj4WTfquTH/lMvA6Fn+naI67te3w6nPvf1JXPVao2ePW7tvD5Rmr5UV2Nr6TZ0+ieqMjKn527+mKfJpn9PhOObi1/Wtw5s5mt6nlZ9/lVeuTMU+qmOymPVEQjB2sfCsY3Z07P/v3cPIzr+T2lW3/59gBtNUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWb+TZ0YfRWNa3jr2Pwz79HHAsVx12Lcx+MmPtVR2d0T3z1ad8nHow/pBm0bq13H46TjV/wBls1x1ZVyJ7ZjnRTP7Z6uUwtKrGt6ns249qfGfx6/ZadD0zbsyLseEfn0+4Aqy1AACB33unTNnbbyNb1Sv+rtx4Nq1E/WvXJ8min1z/COM8kpquoYelabkalqGRRj4mNbm5du1z1U0wpj0w7/zN+bkqyZ8OzpeNM0YOPM+TTzrq+9Vz7uqOTp6Zp9WZc6/hjj6OXqmo04dvq+KeHqgt67l1Pdu48nW9Vu+FfvTwpojybVEeTRTHKI/nPbMoUF7oopopimmNkQoVddVdU1VTtmQBkxAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeYBElYNtebmmeyWvghII/bXm5pnslr4ISBY7Onwgv9pV4yAJUQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA9uharn6Hq+Nq2mZFWPmYtyLlq5TynunviY6pjnE8HiHyYiqNkvsTNM7YXg6Kd84G+9s29Rx/BtZtrhbzcaJ67Vzhy+7PbE/q7Ylt6ivRvvHUtkbns6xgTNdHkZOPM8Kb9uZ66Z9fOJ5T+xdfa2u6buXQcXWtJvxexcmjwqZ50zzpqjlVE9Uwo2q6dOJc3qfgnh3dy96TqUZdvdq+OOPf3pMByXXAAci+UP0ZRuvS51/RrEfTmHb+tRTHXlWo/J9dccu/s7uFTqommZpqiYmOqYnk+hyt/yl+jHxa5e3toGP/UVz4WpWKI8iqf8AnRHdP5XdPXznhZdE1LdmMe7PV8p/HorGuaZvRORajr+cfn1cAAWtUwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABv/Qr0eZO/NxRF6K7WjYlUVZt+Orwu63TP2p/hHX3ROv7B2pqe8ty4+iaZR9a5PhXrsxxps248qur1R/GZiOa6+zNt6ZtPbuNomk2vAx7FPXVPlXa58quqecz/wDXZEONq+pey0blHxz5d/o7Wj6ZOVX0lce5Hn3eqSwMTFwMGxg4ViixjWKIt2rVEcKaKYjhEQzgpMzt65XiI2dUAD4+j+TMREzMxER2zL+uA/KW6T/Fbd7ZWgZH9fXT4OpZFE+RTP8AyYnvn8rujq5zw2cTFryrsW6P4auZl0Ytqblf8y075RHSdO6dSq27ol+foTEuf1lyierLux+V66I5d89fdw4+D0DGx6Me3FujhDz3Jya8m5NyueuQBOgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeYBElYNtebmmeyWvghII/bXm5pnslr4ISBY7Onwgv8AaVeMgCVEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOk9BPSRe2Pr3iudXXXoWbXEZNHb8zV2Rdpj1c45x64hzYRX7FF+3NuuOqUti/XYuRconrh9C8e9Zyce3kY92i7Zu0RXbronjTVTMcYmJ5xMMitPyauk76Pv2tl69kf2S7Vw06/XP4quZ/FTP2Zns7p6uyeqyzz/Nw68S7NFX7Tzh6Fg5lGXai5T+8cpAGo3B+L1q3es12b1um5buUzTXRVHGKonqmJjnD9gKfdPXRtc2Trf0hptuqrQs2ufmJ7fF6+2bUz/GmeceuJcxX+3Jounbh0TK0bVceL+Jk0eBXTPbHdMTymJ4TE8phSrpO2XqOxtz3dJzYm5Yq414mTw4U37fHqn1THZMcp9XCZumj6l7TR0Vyfejzj1UjWdM9mr6W3HuT5T6cmrAO44YAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA9Wkadm6tqePpunY9eRl5NyLdq1RHXVVP/vbyeamJqqimmJmZnhERzWw+Tz0ZRtTTI1/WrEfTmZb+rRVHXiWp/J9Vc8+7s7+Ojn51GHa354/KG9p+DXmXdyOEcZbR0QbBwth7apxKfAvalkRFedkxHl18qafu08eEfrnm3YFBu3a7tc11ztmXoNq1RZoiiiNkQAI0gDVOlHe2n7F2xd1TL8G7k18aMPG48JvXOHZ6qY7ZnlHrmIZ27dV2uKKI2zLC5cptUTXXOyIa1099JVvZWi/R2m3aatezaJ+Zjt8Xo7JuzHfypjnPX2RwVDvXLl69XevXKrlyuqaq66p4zVM9czM85e3cWs6juDWsrWNVyKr+ZlVzXcrn+ERHKIjhERyiEev2nYFOHa3f7p4y8/1HPqzLu9/bHCABvueAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8wCJKwba83NM9ktfBCQR+2vNzTPZLXwQkCx2dPhBf7SrxkASogAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACOqeMLWfJ16Tf6TadTtrW8jjrWJb/qbtc9eVajn666Y7e+OvvVTenS8/M0vUcfUdPyK8fKx7kXLV2ieE01R2S0s/CozLW5PH5Tyb2n51eHd344fOOb6DDR+h3f8Ah7821Tk/Us6pjRFGdjxPk1cq6fu1cOru645N4UC7ars1zRXGyYeg2btF6iK6J2xIAjSDVOlHZOn762xd0vL8G1k0ca8PJ4cZs3OHb66Z7JjnHriJbWM7dyq1XFdE7Jhhct03aJorjbEqAbh0fUNA1rK0fVceqxmYtc0XKJ/hMTziY4TE84lHrfdPvRrRvTRfpPS7VNOvYVE/NcOrxi32zame/nTPf1c+MVDu267V2q1doqouUVTTVTVHCaZjtiY5Sv2nZ1OZa3o4xxh5/qOBVh3d2fhnhL8gN9zwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHUegLo0ub01n6T1S1VToOFXHzvHq8ZuR1xbie7nVPd1c+MQ5F+jHtzcrnqhNj49eRci3RHXLcPk09GHz9dne2v4/8AVUT4WmY9ceXP/WmO6PyfX18o42Ofi1bt2rVFq1RTbt0UxTTTTHCKYjsiI5Q/agZmXXl3ZuVftHKHoWFh0YlqLdH7zzkAajbAY8i9ax7Fy/fuUWrVuma66654U00xHGZmeURAPDubW9O25oeVrOrZEWMTGo8KurnPdTEc5meqI75Uq6TN6ajvjc13Vs6Zt2afqYuPE8abFvj1R65ntmec+rhEbH079JN3e+ueJafcro0LCrmMejs+fr7Ju1R/CInsj1zLmi66Ppvs1HSXI96fKPVSNZ1P2mvorc+5HnPpyAHbcMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB5gESVg215uaZ7Ja+CEgj9tebmmeyWvghIFjs6fCC/wBpV4yAJUQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACe2HurU9nblx9b0uv69ufBu2pn6t63PlUVeqf4Twnkuxsvcmmbs27ja3pV3w7F+n61E+VarjyqKo5TH8p7JhQlv/AEKdIeTsPcUTemu7o+XMU5tiOvwe65TH2o/jHV3THG1fTfaqN+j448+70drR9T9lr3K59yfLv9V0BgwMvGz8Kzm4d+i/jX6IuWrtE8aa6ZjjExLOpExs6pXiJ29cAA+ivnyl+jH52m9vfQMf+spjwtTsUR5Uf9aI74/K/b3ysG/lVNNVM01RFVMxwmJjjEw2sPLrxbsXKP5hq5mJRl2pt1/xL54jrXyhOjOraOrTrmj2J+gsy55NMdWLcnr8D/tn8n9nKOPJV/x8ijItxco4S89ycevHuTbrjrgAToAAAAAAAAAAAAAAAAAAAAAAAAAAAEntfQ9S3JruLouk2JvZeTX4NMcqY51VTypiOuZfKqopiZnhD7TTNUxTHGU10WbI1Dfe5remYvhWsW3wrzMnhxizb4/xqnsiO/1RK6e39I0/QdGxdI0vHpx8PFoii3RH8ZmeczPGZnnMofo12bpux9s2dIwIi5dn6+VkTHCq/c4ddU90cojlH65bOouqajOXc2U/DHD1XzStOjDt7avjnj6ADlOsAAK0/KV6T/H797ZegZH9ktVeDqN+ifxtcT+KifsxPb3z1dkde5fKL6Tv6NafXtnQ8jhrOVb/AK+7RPXiWpj+FdUdndHX3KqT1zxlZtE0zbsyLseEfn0VfXNT2bce1PjP49fsALUqgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADzAIkrBtrzc0z2S18EJBH7a83NM9ktfBCQLHZ0+EF/tKvGQBKiAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAds+Tf0nfQObb2nruRw0rJr/sl6uerGuTPkzPKiqf2T19kzK0b54LP/ACbek76ZxLe0NeyOOpY9HDCvVz15FuI8iZ510x+2PXEzNX1vTeORajxj8+v3WnQ9T4Y92fCfx6fZ3ABV1qAAePWtMwdZ0nJ0rUsejIw8m3Nu7bq7Jif8p5xPKY4qW9LWxM7Ye5q8C94d7AvcbmFkzHVco7p+9T2TH6J7Jhd5rnSLtDTd67Zv6NqNPgzP18e/EcarFyI6qo/ymOcTMOppeoTh3Nk/DPH1crVdOjMt7afijh6KJiV3ZoGpbY1/K0XVrPzWVj18J4eTXTyqpnnTMdcIpeqaoqiKqZ6pUKqmaZmmqNkwAMnwAAAAAAAAAAAAAAAAAAAAAAABkxrF7JyLePj2q7t67XFFu3RHGqqqZ4RERzmZXB6CejezsfQvG86iivXc2iJya+35mnti1TPq5zHbPqiGpfJr6MPo3Htbz1/H4Zt6njp9iuPxNEx+MmPtTHZ3RPHtnq7uqOtan0kzYtz1Rx7+5cNE0zooi/djrnh3d/iAK6sYAA0Tpl6QcTYe3JvUzRe1bKiaMLHnv511fdp/jPCPXE/vndGmbP23k63qtzhatRwt24n6165Pk0U+uf4RxnshSffG59T3fuPJ1vVbnhXrs8KLcT9WzRHk0U+qP4zxntl2NJ02cqvfr+CPPu9XG1fUoxaNyj458u/0RmpZ2XqWoX9Qz8ivIysi5Ny7drnjNdUzxmZecF3iIiNkKLMzM7ZAH0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeYBElYNtebmmeyWvghII/bXm5pnslr4ISBY7Onwgv9pV4yAJUQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAzYWTkYWXZy8S9XYyLNcXLVyieFVFUTxiYnv4sITG0idi5vQj0i4++9veDk1UWtaw6YpzLMdXh8ou0x9mefdPV3cehKD7P3Fqe1dw4ut6Te+byLFXXTPk3KZ8qiqOdMx/7xXY6P8Admmbz21j63plXCmv6t6zM8arFyPKoq/R384mJ5qRq+m+y19JRHuT5d3ovGj6n7VR0dc+/HnHP1bAA4ztgAOc9OfRzY31oHz+HRRb1zCpmcW5PV87T2zaqnunlPKfVMqd5Vi/i5N3GybVdm/armi5brp4VUVRPCYmOUxL6FOFfKU6MfpTGu7y0HH451ijjn2KI679uI/GRH2qY7e+I7467FoupdFPQXJ6p4d3+lc1vTOlib9qPejj3/7VlAW5TwAAAAAAAAAAAAAAAAAAAAAB2b5OfRj/AEjz6N0a5j8dHxbn9ntVx1ZV2J7udFM9vfPVylqvQv0e5W/NxxbuRXZ0jFmK82/HV1crdM/aq/hHGe6JuXp2Fi6dgWMDBsUY+Lj24t2rVEcKaKYjhEQ4Gs6n0NPQ2596ePdHqsGi6Z01XT3Y92OHfPozv6CnLmAAPNqediaZp2RqGfkUY+Lj25uXbtc8Ippjtl6JmIjjM8IVU+UV0nTufUatt6HkcdFxLn9ddonqy7sc/XRTPZ3z19zdwMKvMu7kcPnPJo6hnUYdrfnj8o5tW6ZOkDL35uSb8eHZ0rFmaMHHmeynnXV96r+EcI5cZ0UF/s2qLNEUURsiHn169XermuudsyAJEYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADzAIkrBtrzc0z2S18EJBH7a83NM9ktfBCQLHZ0+EF/tKvGQBKiAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAG69EG/c3Ye5acynw72m5HCjOxony6OVUfep4zMfrjm0oR3bVF2iaK42xKS1drs1xXROyYfQTSNRwtW0zH1LTsijIxMm3Fy1donqqpn/3s5PWqf8nfpNnaup07e1q/P0JmXPqXK56sS7P5Xqonn3dvfxtfExMRMTExPZMKDn4NeHd3J4fKXoOn51GZa344/OH9AaLeH8f0BVb5RvRj/RzUK90aHj8NHyrn9otUR1Yt2Z7uVFU9ndPVzhxl9B9SwsTUsC/gZ2PRkYuRbm3dtVxxprpmOExKmfTN0fZew9yTZoiu9pOVM14WRPdzoqn7VP8AGOE+qLjo2pdNT0Nyfejh3x6qZrWmdBV09uPdnj3T6NEAd9XwAAAAAAAAAAAAAAAAABO7E2tqe8dyY+iaXR/WXZ8K5dmPq2bceVXV6o/jPCOaL0rAzNU1LH07T8evIy8i5Fu1aojjNVU9kLndDuwMPYe26cb6l7VMmIrzsiI8qrlRT92nj1d/XPNzNT1CnDt9XxTw9XT0vTqsy51/DHH0T2yttaZtLbmNomlWvBs2Y41Vz5V2ufKrqnnM/wAo7IhNAolddVdU1VTtmV+oopopimmNkQAMWQDmXTz0k2tkaJ4jp1yivXc2ifmKe35ijsm7VH8Iie2fVEprFiu/ci3RHXKHIv0Y9ublc9UNR+Ur0n+I2b2y9AyP7Vdp8HUciifxVEx+KiftTHld0dXbM8K1v3fu3b9+5fv3K7t25VNdddc8aqqpnjMzPOZfhf8ACw6MS1FFP7zzl57m5leXdm5V+0coAG21AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHmARJWDbXm5pnslr4ISCP215uaZ7Ja+CEgWOzp8IL/aVeMgCVEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALJfJp6TvG7VnZWv5H9ot0+Dpt+ufxlMf8AJme+I8nvjq5Rxra/di7dsXqL9m5Xbu26ororonhVTVE8YmJ5S1M3Doy7U26v2nlLbwsyvEuxcp/eOcPoYOZdA3STa3vofiOo3KKddwqIjIp7Pn6OyLtMfwqiOyfVMOmqBfsV2Lk26464ehY9+jItxconqkAQphB752xpm79t5Oiarb42rscbdyI+tZuR5NdPrj+McY7JTgyorqoqiqmdkwxroprpmmqNsSoXvfbOp7R3Hk6Hqtvwb1meNFyI+rdonya6fVP8OuO2EIun0z9HuLvzbk2rcUWtXxYmvCvz1dfO3VP2av4Twnviaaajh5WnZ9/AzrFePk49ybd21XHCqiqJ4TEr5pmoU5lvr+KOPqoOp6fVh3er4Z4ejzgOk5gAAAAAAAAAAAAAA/sRMzEREzM9kQ/jvvyaejDxu7Z3rr+P/Z7dXhabj1x+Mqj/AJ0x3R+T3z18o462XlUYtqblf8trDxK8q7Fuj+Ibj8nfoxja2m07i1uxH03l2/6u3XHXiWp5equefdHV38ewg8/ycivJuTcr4y9CxsajGtxbo4QAIE4CO3HrOnbe0TK1jVciLGJjUeHcqntnuiI5zM8IiOcy+00zVOyOL5VVFMTM8EP0nb007Y22burZsxcv1caMTGieFV+5w6o9UR2zPKPXwiaVbl1rUdxa3lazquRN/Lya/DrqnsjupiOURHCIjuhM9J+9dR31ua7quZNVrHo40YmNx402bfHqj11T2zPOfVERGqr1pWnRiW9tXxTx9FD1XUpzLmyn4I4d/eAOq5IAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADzAIkrBtrzc0z2S18EJBH7a83NM9ktfBCQLHZ0+EF/tKvGQBKiAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASW2tb1HbuuYus6Vfmxl41fhUVcp76ZjnExxiY7pXV6M956dvjbFnV8GYt3o+plY8zxqsXOHXHrie2J5x6+MRRhtnRZvfUNi7nt6pi+FdxbnC3mY3HhF63x/hVHbE9/qmXJ1XToy7e9T8ccO/udbSdSnDubtXwTx7u9eMeDb+r6fr2jYur6XkU5GHlURXbrj+MTHKYnjExymHvUaqJpnZPFfKaoqjbHAAfH0cX+Ud0Y/0hwK906Hj8dXxbf8AabNEdeVaiO2I510x2d8dXKHaBsYuTXjXIuUcYa+VjUZNqbdfCXzwHc/lJ9GP0VlXd46Dj8NPv18c+xRHVYuTP4yI+zVPb3TPdPVwxf8AFyqMq1Fyj+HnuXi14t2bdf8AIA2WsAAAAAAAAAAA2vov2TqO+tzWtKw4qtY1HCvMyeHGmzb49vrqnsiOc+qJmMLlym1TNdc7Ihnbt1Xa4oojbMtk6BejW5vXWvpHUrddOg4VcfPT2eMV9sWonu51Tyj1zC3tm1bs2aLNm3RbtW6YpoopjhFMR1RERyh4tuaNp239FxdH0rHpsYeNR4FuiO31zM85meMzPOZSChajn1Zl3e/tjhD0DTsCnDtbv908ZAHPdAAB+L921Ys13r1yi3at0zVXXXPCmmmI4zMzyhUHp66Sru9tb+j9NuV06DhVz8xT2eMV9k3ao/hTHKPXMtv+Ut0n+OXb2ytAyP7Pbq8HUsiifxlUf8qJ7o/K756uU8eBLboumdHEX7sdc8O7vVDW9T6SZx7U9UcZ59wAsatgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPMAiSsG2vNzTPZLXwQkEftrzc0z2S18EJAsdnT4QX+0q8ZAEqIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB1PoB6S69maz9FareqnQc2uPnOPX4tcnqi5Hq7Iqju6+XCbdW66Ltum5brproriKqaqZ4xMT2TEvnksJ8mjpO8CqzsjX8j6sz4OmX7k9k/8ARmfh/Z3Qret6bvxORbjr+fqsuh6nuTGPdnqnhP4WLAVNbgAGLLx7GXi3cXKs0XrF6iaLluunjTXTMcJiY5xMKddOPRzf2LuD53EoruaJmVTOJdnr+bntm1VPfHKeceuJ4XKRO7dv6Zujb+VomrWfncbIp4TMeVRVyrpnlVE9cOjpufVh3dv9s8Yc3UtPpzLWz+6OEqDDYukPaOp7K3Nf0XUqfC8H69i/EcKb9ueyuP8AWOUxMNdXyium5TFVM7YlQLlFVuqaao2TAAzYgAAAAAAP3Ys3ci/bsWLdd27cqiiiiiONVVUzwiIjnMyD3ba0TUdxa5i6NpWPN/Lya/Bop5R31TPKIjjMz3Qur0ZbL07Y22LWk4URcv1cK8vJmOFV+5w659UR2RHKPXxmdc6B+ja1sjQ/HdQt0V67m0R4xV2/MUdsWqZ/jMx2z6oh0xStY1L2mrorc+7HnPou+jaZ7NR0tyPfnyj15gDiO4AAOPfKJ6To2vp1W3NEyI+msu3/AFtyievEtTz9Vc8u6Ovu47R0x9IGHsPbc5H1L2qZMTRg48z5VXOur7tPHr7+qOfFTLVM/M1TUcjUdQyK8jKyLk3Lt2ueM1VT2y7+jaZ09XTXI92OHfPor+tan0FPQ2596ePdHq88zMzMzPGZfwFxUwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB5gESVg215uaZ7Ja+CEgj9tebmmeyWvghIFjs6fCC/wBpV4yAJUQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/tFVVFcV0VTTVTPGJieExL+ALb/J86TKd36TGi6vfj6dwrfXVVPXlW46vDj70flR+vnPDrD5+6HqmfourY2q6ZkV4+ZjXIuWrlPKY/wA4nsmOcTwXS6J99YG/Ns0ahY8CznWeFvNxonrtXOHbH3Z7Yn9MdsSpms6b7PV0tuPdnyn0XXRdT9op6G5PvR5x6twAcJ3gAGl9LuwsLfu2qsG5NFjULHG5hZMx+Lr4ddM8/Bq7J/VPJTDW9Lz9F1bJ0rU8avGzMa5Nu7bq7Yn/AFie2J5xPF9A3L+nbows720z6S0yi3a1/Fo4Wqp6oyaI/wCXVPf9meXZPVPV3dH1P2erork+7Pl/pwdZ0v2inpbce9Hn/tUAZczGyMPLu4mXZuWMizXNFy3cp8GqiqJ4TExPZLEucTtUqY2AAAAAACyvya+i+cCzZ3nuDH4Zd2nwtOx64/FUTH42Y+1MdndHX2zHDW/k89E9Ws3rG7NyY3DTLc+Hh41yP+Jqjsrqj7Eco/Kn1dtnVY1rVOOPanxn8eq06JpXDIux4R+fT7v6Aqy1AACE3tubTNo7cydb1W74NmzHCiiJ+tdrnyaKY5zP857ISepZuJp2Bfz86/Rj4uPbm5du1zwpopiOMzKmnTP0hZe/NxzctzXZ0jFmaMLHnu53Ko+1V/COEd8z0tM0+rMudfwxx9HM1PUKcO31fFPCPygN9bp1PeG5MjW9Vucbl2eFu3E/Vs248min1R/GeM9soIF8oopopimmNkQoNddVdU1VTtmQBkxAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeYBElYNtebmmeyWvghII/bXm5pnslr4ISBY7Onwgv8AaVeMgCVEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANk6Od4alsnc1jWdPqmumPqZNiZ4U37cz10z/nE8piGtjC5bpuUzTVG2JZ27lVuqK6Z2TC/e1de03c2g4utaTfi7i5NHhR9qiedNUcqonqmEopt0G9JGRsXXfF8uqu7oebXEZVvt+ansi7THfHOOceuIXExb9jKxrWTjXaL1i7RFdu5RVxprpmOMTE84mFD1LAqw7uz+2eEr/puoU5lrb/dHGGUBznRAAcr6buibE3pj16vpMW8XX7VHlT1UZURHVTX3Vd1X6p6uHCp2radnaTqN/TtSxbuLl2KvAu2rtPCqmf/AHnzfQVpvSX0dbe33gxRqNmbGdbp4WM6zEfOW/VP2qfVP6uHa7umaxVj7Ld3rp84/wBODqmjU5G25a6qvKf9qRDfOkLop3bs65cu5GFVn6dTxmM3FpmqiI+/HbR+vq7ploa32r1u9TvW52wp12zcs1btyNkgJram1dwbpzYxNB0rIza+PCquinhbt/8AdXP1af1yyqrpojeqnZDGiiqud2mNsoV3PoM6GL2rV2Nx7txqrWnRwrxsKuOFWT3VVxyo9XbV+jt3joo6DdL25cs6tuWqzquqU8KrdmI449ie+Iny6o756o7ubsisalre2Jt48/v6eq06Zoe7MXciPCPX0fm3RRbt027dFNFFMRTTTTHCIiOyIh+gVhaAAB/H9cH+Up0n/R2Pe2ZoGR/bL1Pg6hfon8TRMfion7Ux290dXbPVs4mLXlXYt0fw1svKoxbU3K/5ad8ozpO/pJn17Y0PI46Pi3P7RdonqyrsT/Gimezvnr5Q4yD0DGxqMa3FujhDz3Kya8m7NyvjIAna4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADzAIkrBtrzc0z2S18EJBH7a83NM9ktfBCQLHZ0+EF/tKvGQBKiAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHbvk69KkaFft7T3DkcNLvV8MPIrnqxq5nyap5UTPPlPqmeHERr5WNRk25t1tjFyrmLdi5Rx/8Ar6HP6rl8n3pfpx6cfaW68rha6reBnXKvI5RauT3d1XLsnq4cLGqDmYdzEublf7TzegYeZby7e/R+8cgBqtsAAarrvR3sfW7tV7Udsadcu1TxquW7fzVdU981UcJn9bahnRcrtztomY8GFdui5GyuInxaPgdEnRzhXYu2dq4dVUTx4Xq670fsrqmG5YeLi4WNRjYeNZxrFEcKLdqiKKaf0RHVDMMrl65c+OqZ8Z2sbdi3a+CmI8I2ACJKAAA530z9JuBsTS5x7E28rXMiifFsbjxi3H/Uud1PdHbM/rmJbNmu/XFFEbZlFfv0WKJuXJ2RDxdPHSfZ2VpU6Zplyi5r+Xb/AKuO2Maier5yqO/7Mc56+yOuouReu5F+5fv3K7t25VNddddXGqqqZ4zMzzmZZ9X1HO1fU8jUtSybmTl5Fc13btc8Zqmf/ezk8i+afgUYdvdjrmeMqBqOfXm3N6eqI4QAN9oAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPMAiSsG2vNzTPZLXwQkEftrzc0z2S18EJAsdnT4QX+0q8ZAEqIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAd16DummvSKbG3N3367unxwoxs6rjVVjxypr5zR3T2x647OFDWysW3lW9y5H+mzi5d3Fub9uf9voXYvWsixRfsXaLtq5TFVFdFUVU1Uz1xMTHbDIpr0T9LGubGu04dzwtR0Wqr6+Jcr67fHtm3V+TPq7J9U9a1OyN57e3lp0ZmhZ9F6YiJu2Kvq3rM91VPbH6eyeUypWdpl7EnbPXTz9eS8YGqWcyNkdVXL05thAc10gAAAAAAebUs7D03Cu52oZVnFxbNPhXLt6uKaaY9cyrx0tdPVzJpvaPsiquzanjTc1OqPBrqj/APFE9dP/AHT190R2tvEwr2XVu24/f5Q08zOs4lO9cn9vnLfOmfpd07Ztm7pOk1Ws3X6qeHgceNvF4/lV9891P7eEcONT9X1HO1fUr+pallXcrLyK/Du3bk8aqp/95cnmu113blVy5XVXXXM1VVVTxmqZ7ZmX5XbB0+3h0bKeuZ4yo+fqN3Mr21dURwgAb7QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeYBElYNtebmmeyWvghII/bXm5pnslr4ISBY7Onwgv9pV4yAJUQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA9ekanqGkZ9vP0vNv4eVanjRds1zTVH645ep5B8mImNkvsTMTth3zYXyiczGpt4e8dP8cojq8dxIim5+mqjqpn9MTT+iXbtqb82juiin6G13Ev3av+RXV83dj/4VcKv2RwUVHGydCx7s7aPdnu4fZ2sXXsizGyv3o7+P3fQ8UW0Tf29NFimnTtz6nat0+Tbqvzcoj9FNXGP4NnxOnXpIsUxTc1bGyPXdw7fH/DEOTX/Tt+J92qJ+8OvR/UePMe9TMfaVwhUK9099IldPCnNwLU99OHT/AK8UFq3Sv0h6nRNGTurOt0zyxvBsfxtxTLGn+nsmZ96qI+/oyr/qLGj4aZn7eq5Wt63o+iY05Osanh4Frhx8LIvU0cf0ce2fVDkW9/lC6Bp9NePtfDuavkdkX7sTasUz39f1qv0cI/SrHl5WTmZFWRl5F7IvVeVcu1zVVP6ZnrYXTx/6fs0TtuzveUOXk/1DfuRstRu+ctk3vvfcu8sv5/XdSuXrdNXG3j0fUs2/+2iOrj654z62tg7lFum3Tu0Rshwq7lVyrernbIAzYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPMAiSsG2vNzTPZLXwQkEftrzc0z2S18EJAsdnT4QX+0q8ZAEqIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB5gESVg215uaZ7Ja+CEgj9tebmmeyWvghIFjs6fCC/2lXjIAlRAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPMAiSsG2vNzTPZLXwQkEftrzc0z2S18EJAsdnT4QX+0q8ZAEqIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB5gESVg215uaZ7Ja+CEgj9tebmmeyWvghIFjs6fCC/wBpV4yAJUQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADzAIkrBtrzc0z2S18EJBH7a83NM9ktfBCQLHZ0+EF/tKvGQBKiAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeYBElYNtebmmeyWvghII/bXm5pnslr4ISBY7Onwgv9pV4yAJUQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADzAIkrBtrzc0z2S18EJBH7a83NM9ktfBCQLHZ0+EF/tKvGQBKiAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeYBElYNtebmmeyWvghII/bXm5pnslr4ISBY7Onwgv9pV4yAJUQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADzAIkrBtrzc0z2S18EJBH7a83NM9ktfBCQLHZ0+EF/tKvGQBKiAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeYBElYNtebmmeyWvghII/bXm5pnslr4ISBY7Onwgv9pV4yAJUQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADzAIkrBtrzc0z2S18EJBH7a83NM9ktfBCQLHZ0+EF/tKvGQBKiAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeYBElYNtebmmeyWvghII/bXm5pnslr4ISBY7Onwgv8AaVeMgCVEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8wCJKwba83NM9ktfBCQR+2vNzTPZLXwQkCx2dPhBf7SrxkASogAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHmARJWDbXm5pnslr4ISCP215uaZ7Ja+CEgWOzp8IL/aVeMgCVEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8wCJKwba83NM9ktfBCQR+2vNzTPZLXwQkCx2dPhBf7SrxkASogAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHmARJWDbXm5pnslr4ISCP215uaZ7Ja+CEgWOzp8IL/aVeMgCVEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8wCJKwba83NM9ktfBCQR+2vNzTPZLXwQkCx2dPhBf7SrxkASogAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHmARJWDbXm5pnslr4ISCP215uaZ7Ja+CEgWOzp8IL/aVeMgCVEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8wCJKwba83NM9ktfBCQR+2vNzTPZLXwQkCx2dPhBf7SrxkASogAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHmARJWDbXm5pnslr4ISCP215uaZ7Ja+CEgWOzp8IL/AGlXjIAlRAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPMAiSsG2vNzTPZLXwQkEftrzc0z2S18EJAsdnT4QX+0q8ZAEqIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB5gESVg215uaZ7Ja+CEgj9tebmmeyWvghIFjs6fCC/2lXjIAlRAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPMAiSsG2vNzTPZLXwQkEftrzc0z2S18EJAsdnT4QX+0q8ZAEqIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB5gESVg215uaZ7Ja+CEgj9tebmmeyWvghIFjs6fCC/2lXjIAlRAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPMAiSsG2vNzTPZLXwQkEftrzc0z2S18EJAsdnT4QX+0q8ZAEqIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB5gESVg215uaZ7Ja+CEgj9tebmmeyWvghIFjs6fCC/2lXjIAlRAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPMAiSsG2vNzTPZLXwQkEftrzc0z2S18EJAsdnT4QX+0q8ZAEqIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB5gESVg215uaZ7Ja+CEgj9tebmmeyWvghIFjs6fCC/wBpV4yAJUQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADzAIkrBtrzc0z2S18EJBH7a83NM9ktfBCQLHZ0+EF/tKvGQBKiAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeYBElYNtebmmeyWvghII/bXm5pnslr4ISBY7Onwgv9pV4yAJUQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADzAIkrBtrzc0z2S18EJBH7a83NM9ktfBCQLHZ0+EF/tKvGQBKiAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeYBElYNtebmmeyWvghII/bXm5pnslr4ISBY7Onwgv9pV4yAJUQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADzAIkrBtrzc0z2S18EJBH7a83NM9ktfBCQLHZ0+EF/tKvGQBKiAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeYBElctwf+Csf/ANdP+TMCn0fDC4V/FIAyYgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPwAM3//2Q==";
const VantariLogo = () => (
  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
    <img src={LOGO_SRC} alt="Vantari" style={{ width:38, height:38, borderRadius:8, flexShrink:0 }}/>
    <span style={{ fontFamily:"'Montserrat', sans-serif", fontWeight:300, fontSize:17,
      letterSpacing:"0.06em", color:"rgba(255,255,255,0.95)" }}>vantari</span>
  </div>
);

/* ═══════════════════════════════════════════════════════════
   ROOT
═══════════════════════════════════════════════════════════ */
export default function VantariAnalyticsDashboard() {
  const [activeNav, setActiveNav] = useState("analytics");
  const [activeTab, setActiveTab] = useState("overview");
  const [dateRange, setDateRange] = useState("30d");

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:T.bg, fontFamily:T.body }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Nunito+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#d1d9e0; border-radius:99px; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
      `}</style>

      {/* ── SIDEBAR ── */}
      <aside style={{ width:224, background:T.sidebar, display:"flex", flexDirection:"column",
        position:"sticky", top:0, height:"100vh", flexShrink:0, overflowY:"auto",
        borderRight:"1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ padding:"20px 18px 18px", borderBottom:`1px solid ${T.sidebarBorder}` }}>
          <VantariLogo/>
        </div>

        <nav style={{ flex:1, padding:"8px 0" }}>
          {NAV.map(group=>(
            <div key={group.section}>
              <div style={{ padding:"12px 18px 5px", fontSize:10, fontWeight:600,
                letterSpacing:"0.09em", color:"rgba(255,255,255,0.28)",
                textTransform:"uppercase", fontFamily:T.body }}>
                {group.section}
              </div>
              {group.items.map(item=>{
                const isActive = activeNav===item.id;
                return (
                  <button key={item.id} onClick={()=>setActiveNav(item.id)}
                    style={{ display:"flex", alignItems:"center", gap:9, width:"100%",
                      padding:"8px 18px", background: isActive?T.sidebarActive:"transparent",
                      border:"none", borderRight: isActive?`2px solid ${T.blue}`:"2px solid transparent",
                      cursor:"pointer", color: isActive?"rgba(255,255,255,0.95)":T.sidebarText,
                      fontSize:13, fontFamily:T.body, fontWeight: isActive?500:400,
                      transition:"all .15s", textAlign:"left" }}
                    onMouseEnter={e=>{ if(!isActive){ e.currentTarget.style.background=T.sidebarHov; e.currentTarget.style.color="rgba(255,255,255,0.85)"; }}}
                    onMouseLeave={e=>{ if(!isActive){ e.currentTarget.style.background="transparent"; e.currentTarget.style.color=T.sidebarText; }}}>
                    <item.Icon size={15}/>
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div style={{ padding:"12px 14px", borderTop:`1px solid ${T.sidebarBorder}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px",
            borderRadius:9, background:"rgba(255,255,255,0.05)" }}>
            <div style={{ width:30, height:30, borderRadius:"50%", background:`${T.blue}50`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:12, fontWeight:600, color:"#fff", flexShrink:0 }}>AC</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:500, color:"rgba(255,255,255,0.9)",
                fontFamily:T.body, lineHeight:1.2 }}>Ana Costa</div>
              <div style={{ fontSize:10, color:T.sidebarText, fontFamily:T.body }}>Administradora</div>
            </div>
            <Settings size={13} color={T.sidebarText} style={{ flexShrink:0, cursor:"pointer" }}/>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>

        {/* Topbar */}
        <header style={{ background:T.surface, borderBottom:`1px solid ${T.border}`,
          padding:"0 28px", display:"flex", alignItems:"center",
          justifyContent:"space-between", height:52, position:"sticky", top:0, zIndex:50,
          flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <h1 style={{ fontSize:15, fontWeight:600, color:T.text, fontFamily:T.heading,
              letterSpacing:"-0.01em", margin:0 }}>Analytics</h1>
            <span style={{ fontSize:12, color:T.textTer, fontFamily:T.body }}>—</span>
            <span style={{ fontSize:12, color:T.textSec, fontFamily:T.body }}>Dashboard executivo</span>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <select value={dateRange} onChange={e=>setDateRange(e.target.value)}
              style={{ border:`1px solid ${T.border}`, borderRadius:8, padding:"6px 12px",
                fontSize:12, fontFamily:T.body, color:T.text, background:"#fff", cursor:"pointer" }}>
              {["7d","30d","90d","12m"].map(o=><option key={o}>{o}</option>)}
            </select>
            <Btn variant="ghost" icon={RefreshCw} size="sm">Atualizar</Btn>
            <Btn icon={Download} size="sm">Exportar</Btn>
            <div style={{ width:32, height:32, borderRadius:"50%", background:T.blueLight,
              display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
              <Bell size={15} color={T.blue}/>
            </div>
          </div>
        </header>

        {/* Secondary nav (analytics tabs) */}
        <div style={{ background:T.surface, borderBottom:`1px solid ${T.border}`,
          padding:"0 28px", display:"flex", gap:0, flexShrink:0 }}>
          {ANALYTICS_TABS.map(tab=>(
            <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
              style={{ padding:"10px 16px", background:"none", border:"none",
                borderBottom:`2px solid ${activeTab===tab.id?T.blue:"transparent"}`,
                cursor:"pointer", fontSize:12, fontWeight: activeTab===tab.id?600:400,
                color: activeTab===tab.id?T.blue:T.textSec, fontFamily:T.body,
                transition:"all .15s", letterSpacing:"0.01em" }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <main style={{ flex:1, padding:"24px 28px", overflowY:"auto", maxWidth:1360 }}>
          {activeTab==="overview"  && <OverviewSection/>}
          {activeTab==="funnel"    && <FunnelSection/>}
          {activeTab==="reports"   && <ReportBuilder/>}
          {activeTab==="channels"  && <ChannelSection/>}
          {activeTab==="realtime"  && <RealtimeSection/>}
          {activeTab==="export"    && <ExportSection/>}
        </main>
      </div>
    </div>
  );
}
