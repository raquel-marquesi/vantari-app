import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabase";
import {
  BarChart2, Users, Mail, LayoutTemplate, Bot, Plug, Star,
  Settings, Zap, BookOpen, Calendar, Trophy, Lightbulb,
  CheckCircle2, X, Search, Plus, ChevronLeft, Globe,
  Smartphone, Monitor, Tablet
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════
   DESIGN TOKENS
════════════════════════════════════════════════════════════════════════ */
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
  border2: "#E8EEF3",

  // Ink scale (text)
  ink:     "#0E1A24",
  text:    "#2E3D4B",
  muted:   "#5A6B7A",
  faint3:  "#8696A5",
  faint:   "#F5F8FB",

  // Fonts
  font:    "'Inter', system-ui, sans-serif",
  head:    "'Sora', system-ui, sans-serif",
  mono:    "'JetBrains Mono', monospace",

  shadow:   "0 1px 0 rgba(14,26,36,.03), 0 8px 24px -16px rgba(14,26,36,.08)",
  shadowMd: "0 1px 0 rgba(14,26,36,.04), 0 16px 36px -16px rgba(14,26,36,.15)",
};

/* ═══════════════════════════════════════════════════════════════════════
   MOCK DATABASE
════════════════════════════════════════════════════════════════════════ */
const SECTION_TYPES = ["header","hero","features","testimonials","cta","footer","form","video","stats"];

const TEMPLATES = {
  webinar: { name:"Webinar", sections:[
    { type:"header",  content:{ logo:"Vantari", links:["Sobre","Blog"], ctaText:"Inscreva-se" }},
    { type:"hero",    content:{ headline:"Webinar Gratuito: Escale seu Marketing com IA", subtitle:"Aprenda as estratégias que empresas top estão usando para 10x seus resultados.", ctaText:"Garantir minha vaga", image:"webinar" }},
    { type:"stats",   content:{ items:[{ label:"Inscritos",value:"2.841"},{ label:"Ao vivo",value:"12/06"},{ label:"Duração",value:"90 min"},{ label:"Vagas",value:"500"}]}},
    { type:"form",    content:{ title:"Reserve sua vaga agora", fields:[{ id:"f1",type:"text",label:"Nome",required:true},{ id:"f2",type:"email",label:"Email",required:true},{ id:"f3",type:"tel",label:"WhatsApp",required:false}], submitText:"Quero participar!" }},
    { type:"footer",  content:{ text:"© 2025 Vantari. Todos os direitos reservados." }},
  ]},
  ebook: { name:"eBook", sections:[
    { type:"header",       content:{ logo:"Vantari", links:[], ctaText:"Download grátis" }},
    { type:"hero",         content:{ headline:"O Guia Definitivo de Lead Generation em 2025", subtitle:"Baixe gratuitamente e descubra as 15 estratégias que dobraram nossas conversões.", ctaText:"Baixar eBook grátis", image:"ebook" }},
    { type:"features",     content:{ title:"O que você vai aprender", items:[{ icon:"→",title:"Growth Hacking",desc:"Táticas comprovadas de crescimento"},{ icon:"◆",title:"Segmentação",desc:"Como alcançar o público certo"},{ icon:"▶",title:"Automação",desc:"Processos que trabalham 24/7"}]}},
    { type:"testimonials", content:{ title:"Quem já leu aprovou", items:[{ name:"Carlos M.",company:"TechNova",text:"Transformou nossa estratégia de leads completamente."},{ name:"Ana L.",company:"StartupHub",text:"Em 30 dias dobramos nossas conversões."}]}},
    { type:"form",         content:{ title:"Baixar eBook gratuito", fields:[{ id:"f1",type:"text",label:"Nome",required:true},{ id:"f2",type:"email",label:"Email",required:true}], submitText:"Baixar agora →" }},
    { type:"footer",       content:{ text:"© 2025 Vantari · Privacidade · Termos" }},
  ]},
  trial: { name:"Trial / Demo", sections:[
    { type:"header",       content:{ logo:"Vantari", links:["Recursos","Preços","Blog"], ctaText:"Login" }},
    { type:"hero",         content:{ headline:"Automatize seu Marketing e Escale Vendas", subtitle:"A plataforma all-in-one usada por +1.200 empresas para capturar, nutrir e converter leads.", ctaText:"Teste grátis por 14 dias", image:"trial" }},
    { type:"stats",        content:{ items:[{ label:"Empresas",value:"1.200+"},{ label:"Leads gerados",value:"480k"},{ label:"Conversão média",value:"+34%"},{ label:"Uptime",value:"99.9%"}]}},
    { type:"features",     content:{ title:"Tudo que você precisa em um lugar só", items:[{ icon:"▲",title:"Landing Pages",desc:"Crie páginas de alta conversão em minutos"},{ icon:"◉",title:"Automação",desc:"Fluxos inteligentes que nutrem sozinhos"},{ icon:"◈",title:"Analytics",desc:"Métricas em tempo real de cada campanha"}]}},
    { type:"testimonials", content:{ title:"Empresas que confiam na Vantari", items:[{ name:"Fernanda S.",company:"Agência Pixel",text:"ROI de 8x em 3 meses de uso."},{ name:"Diego R.",company:"E-shop Max",text:"Reduzimos 60% do tempo em tarefas manuais."}]}},
    { type:"form",         content:{ title:"Comece seu teste gratuito", fields:[{ id:"f1",type:"text",label:"Nome",required:true},{ id:"f2",type:"email",label:"Email corporativo",required:true},{ id:"f3",type:"text",label:"Empresa",required:true},{ id:"f4",type:"select",label:"Tamanho da empresa",options:["1–10","11–50","51–200","200+"],required:true}], submitText:"Criar conta grátis" }},
    { type:"footer",       content:{ text:"© 2025 Vantari · Sem cartão de crédito necessário" }},
  ]},
  newsletter: { name:"Newsletter", sections:[
    { type:"hero",   content:{ headline:"Insights de Marketing direto na sua caixa", subtitle:"Mais de 8.000 profissionais já recebem nossas dicas toda semana. Sem spam.", ctaText:"Assinar grátis", image:"newsletter" }},
    { type:"form",   content:{ title:"Assinar newsletter", fields:[{ id:"f1",type:"email",label:"Seu melhor email",required:true}], submitText:"Quero receber →" }},
    { type:"footer", content:{ text:"© 2025 Vantari · Cancele quando quiser" }},
  ]},
};

const rand = (min,max) => Math.floor(Math.random()*(max-min+1))+min;
const uid  = () => Math.random().toString(36).slice(2,8);

const seedVisits  = () => [];
const seedSources = () => [];
const seedDevices = () => [];

const DB = { pages:[], visits:{}, sources:seedSources(), devices:seedDevices() };

/* ═══════════════════════════════════════════════════════════════════════
   ICON SYSTEM (custom SVG paths — no emoji)
════════════════════════════════════════════════════════════════════════ */
const IC = {
  plus:       "M12 5v14M5 12h14",
  trash:      "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  edit:       "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  copy:       "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z",
  eye:        "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z",
  settings:   "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
  chart:      "M18 20V10M12 20V4M6 20v-6",
  globe:      "M12 2a10 10 0 100 20A10 10 0 0012 2zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z",
  arrow_up:   "M18 15l-6-6-6 6",
  arrow_down: "M6 9l6 6 6-6",
  check:      "M20 6L9 17l-5-5",
  close:      "M18 6L6 18M6 6l12 12",
  external:   "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3",
  layout:     "M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z",
  type:       "M4 7V4h16v3M9 20h6M12 4v16",
  image:      "M21 15l-5-5L5 20M21 3H3a2 2 0 00-2 2v14a2 2 0 002 2h18a2 2 0 002-2V5a2 2 0 00-2-2zM8.5 8.5a1 1 0 100-2 1 1 0 000 2",
  video:      "M22.54 6.42a2.78 2.78 0 00-1.95-1.97C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 00-1.95 1.97A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.97A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z",
  form:       "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  back:       "M19 12H5M12 19l-7-7 7-7",
  mobile:     "M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z",
  monitor:    "M2 3h20a2 2 0 012 2v14a2 2 0 01-2 2H2a2 2 0 01-2-2V5a2 2 0 012-2zM8 21h8m-4-4v4",
  tablet:     "M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zM12 17h.01",
  abtest:     "M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18",
  fire:       "M12 2c0 0-4 4-4 8a4 4 0 008 0c0-4-4-8-4-8zM7 13.5C7 16 9 18 12 18s5-2 5-4.5",
  drag:       "M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01",
  trophy:     "M8.21 13.89L7 23l5-3 5 3-1.21-9.12M15 7a3 3 0 11-6 0 3 3 0 016 0zM17 2H7L3 7h18l-4-5z",
};

const Ico = ({ d, size=16, color="currentColor", stroke=1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    <path d={d}/>
  </svg>
);

/* ═══════════════════════════════════════════════════════════════════════
   UTILITIES
════════════════════════════════════════════════════════════════════════ */
const fmtDate = (iso) => new Date(iso).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"2-digit"});
const fmtNum  = (n) => n>=1000?(n/1000).toFixed(1)+"k":String(n);

const statusColors = {
  published:{ bg:"#ECFDF5",text:"#065f46",border:"#6ee7b7",label:"Publicada" },
  draft:    { bg:"#FEF3C7",text:"#92400e",border:"#f5c78a",label:"Rascunho"  },
  paused:   { bg:"#EEF2F6",text:"#475569",border:"#cbd5e1",label:"Pausada"   },
};

/* ═══════════════════════════════════════════════════════════════════════
   MINI COMPONENTS
════════════════════════════════════════════════════════════════════════ */
const Btn = ({ children, onClick, variant="primary", size="md", icon, disabled, style:extra={} }) => {
  const [hov,setHov] = useState(false);
  const pad = size==="sm"?"5px 10px":size==="lg"?"10px 22px":"7px 15px";
  const fs  = size==="sm"?12:size==="lg"?15:13;
  const styles = {
    primary:   {
      bg: hov ? "linear-gradient(135deg, #0A5F7A 0%, #108A60 100%)" : "linear-gradient(135deg, #0D7491 0%, #14A273 100%)",
      fg: "#fff", border: "none",
      shadow: hov ? "0 8px 22px -6px rgba(13,116,145,.5)" : "0 4px 14px -4px rgba(13,116,145,.4)",
    },
    secondary: {bg:hov?`${T.teal}14`:T.surface, fg:T.teal, border:`1.5px solid ${hov?T.teal:T.border}`, shadow:"none"},
    ghost:     {bg:hov?"#EEF2F6":"transparent", fg:T.text,  border:"none", shadow:"none"},
    danger:    {bg:hov?"#fef2f2":"#FFF0EF",     fg:T.red,   border:`0.5px solid ${T.red}55`, shadow:"none"},
    success:   {bg:hov?"#ECFDF5":"#ECFDF5",     fg:"#065f46",border:"0.5px solid #6ee7b7", shadow:"none"},
    teal:      {
      bg: hov ? "linear-gradient(135deg, #0A5F7A 0%, #108A60 100%)" : "linear-gradient(135deg, #0D7491 0%, #14A273 100%)",
      fg: "#fff", border: "none",
      shadow: hov ? "0 8px 22px -6px rgba(13,116,145,.5)" : "0 4px 14px -4px rgba(13,116,145,.4)",
    },
  };
  const s = styles[variant]||styles.primary;
  return (
    <button disabled={disabled} onClick={onClick}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{display:"inline-flex",alignItems:"center",gap:6,padding:pad,fontSize:fs,fontWeight:700,fontFamily:T.font,borderRadius:10,border:s.border||"none",cursor:disabled?"not-allowed":"pointer",background:s.bg,color:s.fg,boxShadow:s.shadow||"none",transition:"all .15s",opacity:disabled?.5:1,transform:hov&&variant==="primary"?"translateY(-1px)":"none",...extra}}>
      {icon&&<Ico d={icon} size={fs+2} color={s.fg}/>}{children}
    </button>
  );
};

const Badge = ({ label, color=T.blue, bg, style:extra={} }) => (
  <span style={{padding:"2px 8px",borderRadius:99,fontSize:11,fontWeight:700,fontFamily:T.font,background:bg||`${color}18`,color,border:`0.5px solid ${color}30`,...extra}}>{label}</span>
);

const Input = ({ label, value, onChange, placeholder, type="text", style:extra={}, note }) => (
  <div style={{display:"flex",flexDirection:"column",gap:4}}>
    {label&&<label style={{fontSize:12,fontWeight:700,color:T.muted,fontFamily:T.font}}>{label}</label>}
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{padding:"8px 11px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:13,fontWeight:600,fontFamily:T.font,color:T.text,background:T.surface,outline:"none",...extra}}/>
    {note&&<span style={{fontSize:11,color:T.muted,fontFamily:T.font,fontWeight:600}}>{note}</span>}
  </div>
);

const Textarea = ({ label, value, onChange, rows=3, placeholder }) => (
  <div style={{display:"flex",flexDirection:"column",gap:4}}>
    {label&&<label style={{fontSize:12,fontWeight:700,color:T.muted,fontFamily:T.font}}>{label}</label>}
    <textarea value={value} onChange={e=>onChange(e.target.value)} rows={rows} placeholder={placeholder}
      style={{padding:"8px 11px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:13,fontWeight:600,fontFamily:T.font,color:T.text,background:T.surface,outline:"none",resize:"vertical"}}/>
  </div>
);

const Divider = ({ label }) => (
  <div style={{display:"flex",alignItems:"center",gap:8,margin:"8px 0"}}>
    <div style={{flex:1,height:1,background:T.border}}/>
    {label&&<span style={{fontSize:11,fontWeight:700,color:T.muted,fontFamily:T.font,textTransform:"uppercase",letterSpacing:".06em"}}>{label}</span>}
    <div style={{flex:1,height:1,background:T.border}}/>
  </div>
);

/* Toggle — verde #14A273 quando ativo */
const Toggle = ({ checked, onChange, label }) => (
  <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
    <div onClick={()=>onChange(!checked)}
      style={{width:38,height:22,borderRadius:11,background:checked?T.green:T.border,position:"relative",transition:"background .2s",flexShrink:0}}>
      <div style={{position:"absolute",top:3,left:checked?19:3,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.15)"}}/>
    </div>
    {label&&<span style={{fontSize:13,fontWeight:600,color:T.text,fontFamily:T.font}}>{label}</span>}
  </label>
);

const MetricCard = ({ label, value, sub, color=T.blue, icon }) => (
  <div style={{background:T.surface,borderRadius:12,border:`0.5px solid ${T.border}`,borderLeft:`3px solid ${color}`,padding:"14px 16px",display:"flex",flexDirection:"column",gap:6,boxShadow:T.shadow}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <span style={{fontSize:11,fontWeight:700,color:T.muted,fontFamily:T.font,textTransform:"uppercase",letterSpacing:".06em"}}>{label}</span>
      {icon&&<Ico d={icon} size={16} color={color}/>}
    </div>
    <span style={{fontSize:24,fontWeight:700,color:T.text,fontFamily:T.head,letterSpacing:"-.02em"}}>{value}</span>
    {sub&&<span style={{fontSize:12,fontWeight:600,color:T.muted,fontFamily:T.font}}>{sub}</span>}
  </div>
);

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
        {Icon && <Ico d={Icon} size={16} color={color} aria-hidden="true" />}
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

/* NavSection / NavItem */
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

/* ═══════════════════════════════════════════════════════════════════════
   SECTION RENDERER
════════════════════════════════════════════════════════════════════════ */
const SectionPreview = ({ section }) => {
  const { type, content:c } = section;
  const base = { fontFamily:T.font, width:"100%", overflow:"hidden" };
  if(type==="header") return (
    <div style={{...base,background:"#fff",padding:"12px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid ${T.border}`}}>
      <span style={{fontWeight:700,color:T.blue,fontSize:16,fontFamily:T.head}}>{c.logo||"Logo"}</span>
      <div style={{display:"flex",gap:16}}>{(c.links||[]).map(l=><span key={l} style={{fontSize:12,color:T.muted,fontWeight:600}}>{l}</span>)}</div>
      <div style={{background:T.blue,color:"#fff",padding:"5px 12px",borderRadius:6,fontSize:11,fontWeight:700}}>{c.ctaText||"CTA"}</div>
    </div>
  );
  if(type==="hero") return (
    <div style={{...base,background:T.blue,padding:"32px 24px",textAlign:"center",color:"#fff"}}>
      <h2 style={{fontSize:18,fontWeight:700,margin:"0 0 8px",lineHeight:1.25,fontFamily:T.head}}>{c.headline||"Headline"}</h2>
      <p style={{fontSize:12,opacity:.85,margin:"0 0 16px",fontWeight:600}}>{c.subtitle||"Subtítulo"}</p>
      <div style={{background:"#fff",color:T.blue,display:"inline-block",padding:"8px 18px",borderRadius:8,fontSize:12,fontWeight:700}}>{c.ctaText||"CTA"}</div>
    </div>
  );
  if(type==="features") return (
    <div style={{...base,background:T.faint,padding:"24px"}}>
      <h3 style={{fontSize:14,fontWeight:700,textAlign:"center",color:T.text,margin:"0 0 16px",fontFamily:T.head}}>{c.title||"Features"}</h3>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
        {(c.items||[]).map((item,i)=>(
          <div key={i} style={{background:"#fff",borderRadius:10,padding:"12px",border:`0.5px solid ${T.border}`}}>
            <div style={{width:28,height:28,borderRadius:7,background:`${T.blue}14`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:6}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:T.blue}}/>
            </div>
            <div style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:3}}>{item.title}</div>
            <div style={{fontSize:11,fontWeight:600,color:T.muted}}>{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
  if(type==="testimonials") return (
    <div style={{...base,background:"#fff",padding:"24px"}}>
      <h3 style={{fontSize:14,fontWeight:700,textAlign:"center",color:T.text,margin:"0 0 16px",fontFamily:T.head}}>{c.title||"Depoimentos"}</h3>
      <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(c.items?.length||1,2)},1fr)`,gap:12}}>
        {(c.items||[]).map((item,i)=>(
          <div key={i} style={{borderRadius:10,padding:"14px",border:`0.5px solid ${T.border}`,background:T.faint}}>
            <p style={{fontSize:11,fontWeight:600,color:T.muted,margin:"0 0 8px",fontStyle:"italic"}}>"{item.text}"</p>
            <div style={{fontSize:11,fontWeight:700,color:T.text}}>{item.name}</div>
            <div style={{fontSize:10,fontWeight:600,color:T.muted}}>{item.company}</div>
          </div>
        ))}
      </div>
    </div>
  );
  if(type==="cta") return (
    <div style={{...base,background:T.blue,padding:"28px 24px",textAlign:"center"}}>
      <h3 style={{fontSize:16,fontWeight:700,color:"#fff",margin:"0 0 6px",fontFamily:T.head}}>{c.headline||"Call to Action"}</h3>
      <p style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.8)",margin:"0 0 14px"}}>{c.subtitle||""}</p>
      <div style={{background:"#fff",color:T.blue,display:"inline-block",padding:"8px 20px",borderRadius:8,fontSize:12,fontWeight:700}}>{c.ctaText||"Clique aqui"}</div>
    </div>
  );
  if(type==="form") return (
    <div style={{...base,background:T.faint,padding:"24px"}}>
      <h3 style={{fontSize:14,fontWeight:700,color:T.text,margin:"0 0 14px",textAlign:"center",fontFamily:T.head}}>{c.title||"Formulário"}</h3>
      <div style={{maxWidth:320,margin:"0 auto",display:"flex",flexDirection:"column",gap:8}}>
        {(c.fields||[]).map(f=>(
          <div key={f.id} style={{display:"flex",flexDirection:"column",gap:3}}>
            <label style={{fontSize:10,fontWeight:700,color:T.muted}}>{f.label}{f.required&&" *"}</label>
            <div style={{padding:"7px 10px",borderRadius:7,border:`0.5px solid ${T.border}`,fontSize:11,fontWeight:600,color:T.muted,background:"#fff"}}>{f.label}...</div>
          </div>
        ))}
        <div style={{background:T.blue,color:"#fff",padding:"9px",borderRadius:8,textAlign:"center",fontSize:12,fontWeight:700,marginTop:4}}>{c.submitText||"Enviar"}</div>
      </div>
    </div>
  );
  if(type==="stats") return (
    <div style={{...base,background:T.blue,padding:"20px 24px"}}>
      <div style={{display:"grid",gridTemplateColumns:`repeat(${c.items?.length||4},1fr)`,gap:8,textAlign:"center"}}>
        {(c.items||[]).map((item,i)=>(
          <div key={i}>
            <div style={{fontSize:18,fontWeight:700,color:"#fff",fontFamily:T.head}}>{item.value}</div>
            <div style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,.7)",marginTop:2}}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
  if(type==="video") return (
    <div style={{...base,background:"#000",padding:"24px",textAlign:"center"}}>
      <div style={{background:"#111",borderRadius:10,padding:"32px",border:"1px solid #333",display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
        <div style={{width:40,height:40,background:"rgba(255,255,255,.1)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Ico d={IC.video} size={20} color="#fff"/>
        </div>
        <div style={{fontSize:12,color:"#aaa"}}>{c.url||"URL do vídeo"}</div>
      </div>
    </div>
  );
  if(type==="footer") return (
    <div style={{...base,background:"#0f172a",padding:"16px 24px",textAlign:"center"}}>
      <span style={{fontSize:11,fontWeight:600,color:"#64748b"}}>{c.text||"© 2025 Empresa"}</span>
    </div>
  );
  return null;
};

/* ═══════════════════════════════════════════════════════════════════════
   SECTION EDITOR PANEL
════════════════════════════════════════════════════════════════════════ */
const SectionEditor = ({ section, onChange }) => {
  const { type, content:c } = section;
  const upd = (key,val) => onChange({...section,content:{...c,[key]:val}});
  const FieldRow = ({ label, field, type="text", note }) => (
    <Input label={label} type={type} value={c[field]||""} onChange={v=>upd(field,v)} note={note}/>
  );

  if(type==="header") return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <FieldRow label="Logo / Nome" field="logo"/>
      <FieldRow label="Texto do CTA" field="ctaText"/>
      <Input label="Links de navegação (vírgula)" value={(c.links||[]).join(", ")} onChange={v=>upd("links",v.split(",").map(s=>s.trim()).filter(Boolean))}/>
    </div>
  );
  if(type==="hero") return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <FieldRow label="Headline principal" field="headline"/>
      <Textarea label="Subtítulo" value={c.subtitle||""} onChange={v=>upd("subtitle",v)}/>
      <FieldRow label="Texto do botão CTA" field="ctaText"/>
    </div>
  );
  if(type==="features") return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <FieldRow label="Título da seção" field="title"/>
      {(c.items||[]).map((item,i)=>(
        <div key={i} style={{padding:"10px",background:T.faint,borderRadius:8,border:`0.5px solid ${T.border}`,display:"flex",flexDirection:"column",gap:6}}>
          <div style={{fontSize:11,fontWeight:700,color:T.muted,fontFamily:T.font}}>Item {i+1}</div>
          <Input label="Ícone (texto)" value={item.icon} onChange={v=>{const items=[...c.items];items[i]={...items[i],icon:v};upd("items",items);}}/>
          <Input label="Título" value={item.title} onChange={v=>{const items=[...c.items];items[i]={...items[i],title:v};upd("items",items);}}/>
          <Input label="Descrição" value={item.desc} onChange={v=>{const items=[...c.items];items[i]={...items[i],desc:v};upd("items",items);}}/>
        </div>
      ))}
      <Btn variant="secondary" size="sm" icon={IC.plus} onClick={()=>upd("items",[...(c.items||[]),{icon:"◆",title:"Novo recurso",desc:"Descrição"}])}>Adicionar item</Btn>
    </div>
  );
  if(type==="testimonials") return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <FieldRow label="Título da seção" field="title"/>
      {(c.items||[]).map((item,i)=>(
        <div key={i} style={{padding:"10px",background:T.faint,borderRadius:8,border:`0.5px solid ${T.border}`,display:"flex",flexDirection:"column",gap:6}}>
          <div style={{fontSize:11,fontWeight:700,color:T.muted,fontFamily:T.font}}>Depoimento {i+1}</div>
          <Input label="Nome" value={item.name} onChange={v=>{const items=[...c.items];items[i]={...items[i],name:v};upd("items",items);}}/>
          <Input label="Empresa" value={item.company} onChange={v=>{const items=[...c.items];items[i]={...items[i],company:v};upd("items",items);}}/>
          <Textarea label="Depoimento" value={item.text} rows={2} onChange={v=>{const items=[...c.items];items[i]={...items[i],text:v};upd("items",items);}}/>
        </div>
      ))}
      <Btn variant="secondary" size="sm" icon={IC.plus} onClick={()=>upd("items",[...(c.items||[]),{name:"Nome",company:"Empresa",text:"Depoimento aqui."}])}>Adicionar depoimento</Btn>
    </div>
  );
  if(type==="cta") return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <FieldRow label="Headline" field="headline"/>
      <FieldRow label="Subtítulo" field="subtitle"/>
      <FieldRow label="Texto do botão" field="ctaText"/>
    </div>
  );
  if(type==="form") return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <FieldRow label="Título do formulário" field="title"/>
      <FieldRow label="Texto do botão" field="submitText"/>
      <Divider label="Campos"/>
      {(c.fields||[]).map((f,i)=>(
        <div key={f.id} style={{padding:"10px",background:T.faint,borderRadius:8,border:`0.5px solid ${T.border}`,display:"flex",flexDirection:"column",gap:6}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:11,fontWeight:700,color:T.muted,fontFamily:T.font}}>Campo {i+1}</span>
            <button onClick={()=>{const fields=c.fields.filter((_,j)=>j!==i);upd("fields",fields);}} style={{background:"none",border:"none",cursor:"pointer",color:T.red,padding:2,display:"flex",alignItems:"center"}}>
              <Ico d={IC.trash} size={13} color={T.red}/>
            </button>
          </div>
          <Input label="Label" value={f.label} onChange={v=>{const fields=[...c.fields];fields[i]={...fields[i],label:v};upd("fields",fields);}}/>
          <div style={{display:"flex",gap:8,alignItems:"center"}}><Toggle checked={f.required} onChange={v=>{const fields=[...c.fields];fields[i]={...fields[i],required:v};upd("fields",fields);}} label="Obrigatório"/></div>
        </div>
      ))}
      <Btn variant="secondary" size="sm" icon={IC.plus} onClick={()=>upd("fields",[...(c.fields||[]),{id:`f${uid()}`,type:"text",label:"Novo campo",required:false}])}>Adicionar campo</Btn>
      <Divider label="Após envio"/>
      <Input label="URL de redirect (obrigado)" value={c.redirectUrl||""} onChange={v=>upd("redirectUrl",v)} placeholder="https://..."/>
      <Input label="Mensagem de obrigado" value={c.thankYouMsg||""} onChange={v=>upd("thankYouMsg",v)} placeholder="Obrigado! Em breve entraremos em contato."/>
    </div>
  );
  if(type==="stats") return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {(c.items||[]).map((item,i)=>(
        <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Input label={`Valor ${i+1}`} value={item.value} onChange={v=>{const items=[...c.items];items[i]={...items[i],value:v};upd("items",items);}}/>
          <Input label={`Label ${i+1}`} value={item.label} onChange={v=>{const items=[...c.items];items[i]={...items[i],label:v};upd("items",items);}}/>
        </div>
      ))}
    </div>
  );
  if(type==="video") return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <Input label="URL do vídeo (YouTube/Vimeo)" value={c.url||""} onChange={v=>upd("url",v)} placeholder="https://youtube.com/watch?v=..."/>
      <Input label="Título opcional" value={c.title||""} onChange={v=>upd("title",v)}/>
    </div>
  );
  if(type==="footer") return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <Input label="Texto do rodapé" value={c.text||""} onChange={v=>upd("text",v)}/>
    </div>
  );
  return <div style={{fontSize:13,fontWeight:600,color:T.muted,fontFamily:T.font}}>Selecione uma seção para editar.</div>;
};

/* ═══════════════════════════════════════════════════════════════════════
   ANALYTICS VIEW
════════════════════════════════════════════════════════════════════════ */
const AnalyticsView = ({ page }) => {
  const visits  = useMemo(()=>seedVisits(page.id),[page.id]);
  const maxV    = Math.max(...visits.map(v=>v.visitors));
  const sources = seedSources();
  const devices = useMemo(()=>seedDevices(),[]);
  const DEVICE_ICONS = { Mobile:Smartphone, Desktop:Monitor, Tablet };

  const heatmapCells = useMemo(()=>{
    const cells=[];
    for(let r=0;r<6;r++) for(let c=0;c<10;c++) cells.push({r,c,intensity:Math.random()});
    return cells;
  },[]);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
        <MetricCard label="Visitantes"  value={fmtNum(page.metrics.visitors)} sub="Últimos 30 dias"  icon={IC.eye}   color={T.blue}  />
        <MetricCard label="Leads"       value={fmtNum(page.metrics.leads)}    sub="Conversões totais" icon={IC.form}  color={T.green} />
        <MetricCard label="Conv. Rate"  value={`${page.metrics.convRate}%`}   sub="Média da página"   icon={IC.chart} color={T.teal}  />
        <MetricCard label="Tempo médio" value={page.metrics.avgTime}          sub="Na página"         icon={IC.fire}  color={T.amber} />
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div style={{background:T.surface,borderRadius:12,border:`0.5px solid ${T.border}`,padding:"18px 20px",boxShadow:T.shadow}}>
          <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:14,fontFamily:T.head}}>Visitantes e Leads — 14 dias</div>
          <div style={{display:"flex",alignItems:"flex-end",gap:3,height:100}}>
            {visits.map((v,i)=>(
              <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                <div style={{width:"100%",display:"flex",flexDirection:"column",gap:1,alignItems:"center"}}>
                  <div style={{width:"70%",height:Math.max(4,(v.visitors/maxV)*80),background:`${T.blue}30`,borderRadius:"3px 3px 0 0"}}/>
                  <div style={{width:"70%",height:Math.max(2,(v.leads/maxV)*80),background:T.green,borderRadius:"3px 3px 0 0",marginTop:-4}}/>
                </div>
                <span style={{fontSize:9,color:T.muted,fontFamily:T.font,transform:"rotate(-45deg)",marginTop:2}}>{v.date}</span>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:12,marginTop:12}}>
            <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:10,height:10,borderRadius:2,background:`${T.blue}30`}}/><span style={{fontSize:11,fontWeight:600,color:T.muted,fontFamily:T.font}}>Visitantes</span></div>
            <div style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:10,height:10,borderRadius:2,background:T.green}}/><span style={{fontSize:11,fontWeight:600,color:T.muted,fontFamily:T.font}}>Leads</span></div>
          </div>
        </div>

        <div style={{background:T.surface,borderRadius:12,border:`0.5px solid ${T.border}`,padding:"18px 20px",boxShadow:T.shadow}}>
          <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:14,fontFamily:T.head}}>Fontes de tráfego</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {sources.map((s,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:12,fontWeight:600,color:T.text,fontFamily:T.font,width:90,flexShrink:0}}>{s.source}</span>
                <div style={{flex:1,background:T.bg,borderRadius:99,height:8,overflow:"hidden"}}>
                  <div style={{width:`${s.pct}%`,height:"100%",background:T.blue,borderRadius:99}}/>
                </div>
                <span style={{fontSize:11,fontWeight:600,color:T.muted,fontFamily:T.font,width:36,textAlign:"right"}}>{s.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div style={{background:T.surface,borderRadius:12,border:`0.5px solid ${T.border}`,padding:"18px 20px",boxShadow:T.shadow}}>
          <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:4,fontFamily:T.head}}>Heatmap de cliques</div>
          <div style={{fontSize:11,fontWeight:600,color:T.muted,marginBottom:12,fontFamily:T.font}}>Simulação — áreas quentes em laranja/vermelho</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(10,1fr)",gap:2,background:T.bg,borderRadius:8,padding:8}}>
            {heatmapCells.map((cell,i)=>{
              const heat=cell.intensity;
              const col=heat>.7?"#FF6B5E":heat>.5?"#f97316":heat>.3?"#fbbf24":heat>.15?"#86efac":"#dbeafe";
              return <div key={i} style={{aspectRatio:"1",borderRadius:3,background:col,opacity:.8+heat*.2}}/>;
            })}
          </div>
          <div style={{display:"flex",gap:6,marginTop:8,alignItems:"center"}}>
            {["#dbeafe","#86efac","#fbbf24","#f97316","#FF6B5E"].map((c,i)=><div key={i} style={{width:16,height:8,borderRadius:2,background:c}}/>)}
            <span style={{fontSize:10,fontWeight:600,color:T.muted,fontFamily:T.font}}>Baixo → Alto</span>
          </div>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:T.surface,borderRadius:12,border:`0.5px solid ${T.border}`,padding:"14px 18px",boxShadow:T.shadow}}>
            <div style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:10,fontFamily:T.head}}>Dispositivos</div>
            {devices.map((d,i)=>{
              const DIcon = DEVICE_ICONS[d.device]||Monitor;
              return (
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <DIcon size={14} color={d.color} aria-hidden="true"/>
                  <span style={{fontSize:12,fontWeight:600,color:T.text,fontFamily:T.font,flex:1}}>{d.device}</span>
                  <div style={{width:60,background:T.bg,borderRadius:99,height:6,overflow:"hidden"}}>
                    <div style={{width:`${d.pct}%`,height:"100%",background:d.color,borderRadius:99}}/>
                  </div>
                  <span style={{fontSize:11,fontWeight:600,color:T.muted,fontFamily:T.font,width:28,textAlign:"right"}}>{d.pct}%</span>
                </div>
              );
            })}
          </div>
          <div style={{background:T.surface,borderRadius:12,border:`0.5px solid ${T.border}`,padding:"14px 18px",boxShadow:T.shadow}}>
            <div style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:10,fontFamily:T.head}}>Funil de conversão</div>
            {[
              {label:"Visitantes", val:page.metrics.visitors,                         pct:100,                color:T.blue  },
              {label:"Engajados",  val:Math.floor(page.metrics.visitors*.62),         pct:62,                 color:T.teal  },
              {label:"Formulário", val:Math.floor(page.metrics.visitors*.31),         pct:31,                 color:T.amber },
              {label:"Leads",      val:page.metrics.leads,                            pct:page.metrics.convRate,color:T.green},
            ].map((step,i)=>(
              <div key={i} style={{marginBottom:6}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                  <span style={{fontSize:11,fontWeight:600,color:T.muted,fontFamily:T.font}}>{step.label}</span>
                  <span style={{fontSize:11,fontWeight:700,color:T.text,fontFamily:T.font}}>{fmtNum(step.val)} <span style={{color:T.muted,fontWeight:600}}>({step.pct}%)</span></span>
                </div>
                <div style={{background:T.bg,borderRadius:99,height:6,overflow:"hidden"}}>
                  <div style={{width:`${step.pct}%`,height:"100%",background:step.color,borderRadius:99}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   SEO PANEL
════════════════════════════════════════════════════════════════════════ */
const SeoPanel = ({ page, onChange }) => {
  const upd   = (f,v) => onChange({...page,seo:{...page.seo,[f]:v}});
  const updOg = (f,v) => onChange({...page,og:{...page.og,[f]:v}});
  const updPx = (f,v) => onChange({...page,pixels:{...page.pixels,[f]:v}});

  return (
    <div style={{display:"flex",flexDirection:"column",gap:20}}>
      <div style={{background:T.surface,borderRadius:12,border:`0.5px solid ${T.border}`,padding:"18px 20px",boxShadow:T.shadow}}>
        <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:14,fontFamily:T.head,display:"flex",alignItems:"center",gap:8}}>
          <Ico d={IC.globe} size={16} color={T.blue}/> Meta Tags
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Input label="Title (recomendado: 50–60 caracteres)" value={page.seo.title} onChange={v=>upd("title",v)} note={`${page.seo.title.length}/60 caracteres`}/>
          <Textarea label="Description (recomendado: 150–160 caracteres)" value={page.seo.description} onChange={v=>upd("description",v)} rows={2}/>
          <Input label="Keywords (separadas por vírgula)" value={page.seo.keywords} onChange={v=>upd("keywords",v)}/>
        </div>
        <div style={{marginTop:14,padding:"12px 14px",background:T.faint,borderRadius:8,border:`0.5px solid ${T.border}`}}>
          <div style={{fontSize:11,fontWeight:700,color:T.muted,marginBottom:8,fontFamily:T.font,textTransform:"uppercase",letterSpacing:".05em"}}>Preview Google</div>
          <div style={{fontSize:13,color:"#1a0dab",fontFamily:T.font,fontWeight:600}}>{page.seo.title||"Título da página"}</div>
          <div style={{fontSize:11,color:"#006621",fontFamily:T.font,fontWeight:600}}>vantari.com.br/{page.url_slug}</div>
          <div style={{fontSize:12,color:"#545454",fontFamily:T.font,marginTop:2,fontWeight:600}}>{page.seo.description||"Descrição da página..."}</div>
        </div>
      </div>

      <div style={{background:T.surface,borderRadius:12,border:`0.5px solid ${T.border}`,padding:"18px 20px",boxShadow:T.shadow}}>
        <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:14,fontFamily:T.head}}>Open Graph — Compartilhamento Social</div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Input label="OG Title" value={page.og.title} onChange={v=>updOg("title",v)}/>
          <Textarea label="OG Description" value={page.og.description} onChange={v=>updOg("description",v)} rows={2}/>
          <Input label="OG Image URL" value={page.og.image} onChange={v=>updOg("image",v)} placeholder="https://..."/>
        </div>
        <div style={{marginTop:12,borderRadius:10,overflow:"hidden",border:`0.5px solid ${T.border}`}}>
          <div style={{height:80,background:T.blue,display:"flex",alignItems:"center",justifyContent:"center"}}>
            {page.og.image?<img src={page.og.image} style={{maxHeight:80,objectFit:"cover"}} alt=""/>:<Ico d={IC.image} size={28} color="rgba(255,255,255,.4)"/>}
          </div>
          <div style={{padding:"10px 12px",background:T.bg}}>
            <div style={{fontSize:10,fontWeight:700,color:T.muted,fontFamily:T.font,textTransform:"uppercase"}}>vantari.com.br</div>
            <div style={{fontSize:12,fontWeight:700,color:T.text,fontFamily:T.font}}>{page.og.title||"OG Title"}</div>
            <div style={{fontSize:11,fontWeight:600,color:T.muted,fontFamily:T.font}}>{page.og.description||"OG Description"}</div>
          </div>
        </div>
      </div>

      <div style={{background:T.surface,borderRadius:12,border:`0.5px solid ${T.border}`,padding:"18px 20px",boxShadow:T.shadow}}>
        <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:14,fontFamily:T.head}}>Pixels de Rastreamento</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <Input label="Facebook Pixel ID"               value={page.pixels.fbPixel} onChange={v=>updPx("fbPixel",v)} placeholder="1234567890" note="Ativado automaticamente no load da página"/>
          <Input label="Google Analytics 4 (Measurement ID)" value={page.pixels.ga4} onChange={v=>updPx("ga4",v)} placeholder="G-XXXXXXXXXX"/>
          <Input label="Google Tag Manager (Container ID)"    value={page.pixels.gtm} onChange={v=>updPx("gtm",v)} placeholder="GTM-XXXXXXX"/>
        </div>
        <div style={{marginTop:12,padding:"10px 12px",background:"#eff6ff",borderRadius:8,border:"0.5px solid #bfdbfe",display:"flex",gap:8}}>
          <Ico d={IC.check} size={14} color={T.blue}/>
          <span style={{fontSize:12,fontWeight:600,color:"#1d4ed8",fontFamily:T.font}}>Pixels injetados automaticamente no <code style={{background:"rgba(0,0,0,.06)",padding:"1px 4px",borderRadius:4}}>&lt;head&gt;</code> da página publicada.</span>
        </div>
      </div>

      <div style={{background:T.surface,borderRadius:12,border:`0.5px solid ${T.border}`,padding:"18px 20px",boxShadow:T.shadow}}>
        <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:14,fontFamily:T.head}}>URL da Página</div>
        <div style={{display:"flex",alignItems:"center",gap:0,border:`1px solid ${T.border}`,borderRadius:8,overflow:"hidden"}}>
          <div style={{padding:"8px 12px",background:T.faint,fontSize:12,fontWeight:600,color:T.muted,fontFamily:T.font,borderRight:`0.5px solid ${T.border}`,flexShrink:0}}>vantari.com.br/</div>
          <input value={page.url_slug} onChange={e=>onChange({...page,url_slug:e.target.value.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"")})}
            style={{flex:1,border:"none",outline:"none",padding:"8px 10px",fontSize:13,fontWeight:600,fontFamily:T.font,color:T.text,background:T.surface}}/>
        </div>
        <div style={{marginTop:8,display:"flex",alignItems:"center",gap:6}}>
          <Ico d={IC.external} size={13} color={T.blue}/>
          <a href="#" style={{fontSize:12,fontWeight:600,color:T.blue,fontFamily:T.font,textDecoration:"none"}}>vantari.com.br/{page.url_slug}</a>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   AB TEST PANEL
════════════════════════════════════════════════════════════════════════ */
const AbTestPanel = ({ page, onChange }) => {
  const upd = (key,val) => onChange({...page,abTest:{...page.abTest,[key]:val}});
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{background:T.surface,borderRadius:12,border:`0.5px solid ${T.border}`,padding:"18px 20px",boxShadow:T.shadow}}>
        <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:6,fontFamily:T.head,display:"flex",alignItems:"center",gap:8}}>
          <Ico d={IC.abtest} size={16} color={T.blue}/> Teste A/B
        </div>
        <p style={{fontSize:12,fontWeight:600,color:T.muted,fontFamily:T.font,margin:"0 0 14px"}}>Crie duas versões da mesma página e distribua o tráfego para descobrir qual converte melhor.</p>
        <Toggle checked={page.abTest.enabled} onChange={v=>upd("enabled",v)} label="Habilitar teste A/B"/>
      </div>

      {page.abTest.enabled&&(
        <>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {[
              {name:"Versão A (original)",   active:true, visitors:Math.floor(page.metrics.visitors*page.abTest.variantTraffic/100),     leads:Math.floor(page.metrics.leads*.55),conv:18.2},
              {name:`Versão B${page.abTest.variantName?` — ${page.abTest.variantName}`:""}`,active:false,visitors:Math.floor(page.metrics.visitors*(100-page.abTest.variantTraffic)/100),leads:Math.floor(page.metrics.leads*.45),conv:21.7},
            ].map((v,i)=>(
              <div key={i} style={{background:T.surface,borderRadius:12,border:`2px solid ${i===1?T.green:T.border}`,padding:"16px",boxShadow:T.shadow}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <span style={{fontSize:13,fontWeight:700,color:T.text,fontFamily:T.font}}>{v.name}</span>
                  {i===1&&(
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      <Ico d={IC.trophy} size={13} color={T.green}/>
                      <Badge label="Líder" color={T.green}/>
                    </div>
                  )}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,textAlign:"center"}}>
                  {[["Visitantes",fmtNum(v.visitors)],["Leads",fmtNum(v.leads)],["Conv.",`${v.conv}%`]].map(([l,val],j)=>(
                    <div key={j} style={{background:T.faint,borderRadius:8,padding:"8px 4px"}}>
                      <div style={{fontSize:16,fontWeight:700,color:i===1&&j===2?T.green:T.text,fontFamily:T.head}}>{val}</div>
                      <div style={{fontSize:10,fontWeight:600,color:T.muted,fontFamily:T.font}}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{background:T.surface,borderRadius:12,border:`0.5px solid ${T.border}`,padding:"18px 20px",boxShadow:T.shadow}}>
            <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:12,fontFamily:T.head}}>Configurações do teste</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <Input label="Nome da variante B" value={page.abTest.variantName} onChange={v=>upd("variantName",v)} placeholder="Ex: Headline alternativa"/>
              <div>
                <label style={{fontSize:12,fontWeight:700,color:T.muted,fontFamily:T.font}}>Distribuição de tráfego — Versão B: {page.abTest.variantTraffic}%</label>
                <input type="range" min={10} max={90} step={5} value={page.abTest.variantTraffic} onChange={e=>upd("variantTraffic",+e.target.value)} style={{width:"100%",marginTop:6,accentColor:T.green}}/>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,fontWeight:600,color:T.muted,fontFamily:T.font}}>
                  <span>A: {100-page.abTest.variantTraffic}%</span>
                  <span>B: {page.abTest.variantTraffic}%</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{padding:"12px 14px",background:"#fff4e6",borderRadius:10,border:"0.5px solid #f5c78a",display:"flex",gap:8,alignItems:"flex-start"}}>
            <Lightbulb size={14} color={T.amber} style={{flexShrink:0,marginTop:1}} aria-hidden="true"/>
            <span style={{fontSize:12,fontWeight:600,color:"#92400e",fontFamily:T.font}}>Recomendação: aguarde pelo menos <strong>100 conversões</strong> por variante antes de declarar um vencedor para obter significância estatística.</span>
          </div>
        </>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   PAGE BUILDER
════════════════════════════════════════════════════════════════════════ */
const PageBuilder = ({ page:initialPage, onSave, onBack }) => {
  const [page,             setPage]            = useState(initialPage);
  const [selectedSection,  setSelectedSection] = useState(null);
  const [activeTab,        setActiveTab]       = useState("editor");
  const [previewDevice,    setPreviewDevice]   = useState("desktop");
  const [showAddSection,   setShowAddSection]  = useState(false);
  const [saved,            setSaved]           = useState(false);

  const moveSection = (idx,dir) => {
    const secs=[...page.sections];const target=idx+dir;
    if(target<0||target>=secs.length) return;
    [secs[idx],secs[target]]=[secs[target],secs[idx]];
    setPage(p=>({...p,sections:secs}));setSelectedSection(secs[target]);
  };
  const deleteSection = (idx) => { setPage(p=>({...p,sections:p.sections.filter((_,i)=>i!==idx)}));setSelectedSection(null); };
  const addSection = (type) => {
    const defaults = {
      header:{logo:"Logo",links:[],ctaText:"CTA"},
      hero:{headline:"Headline principal",subtitle:"Subtítulo convincente aqui.",ctaText:"Começar agora →",image:""},
      features:{title:"Por que nos escolher",items:[{icon:"◆",title:"Recurso 1",desc:"Descrição"},{icon:"◆",title:"Recurso 2",desc:"Descrição"},{icon:"◆",title:"Recurso 3",desc:"Descrição"}]},
      testimonials:{title:"O que dizem sobre nós",items:[{name:"Fulano Silva",company:"Empresa SA",text:"Excelente!"}]},
      cta:{headline:"Pronto para começar?",subtitle:"Sem cartão de crédito.",ctaText:"Criar conta grátis"},
      form:{title:"Preencha o formulário",fields:[{id:"f1",type:"text",label:"Nome",required:true},{id:"f2",type:"email",label:"Email",required:true}],submitText:"Enviar →"},
      stats:{items:[{label:"Clientes",value:"1k+"},{label:"Conversão",value:"+34%"},{label:"Uptime",value:"99.9%"},{label:"Suporte",value:"24/7"}]},
      video:{url:"",title:""},
      footer:{text:"© 2025 Empresa. Todos os direitos reservados."},
    };
    const newSection={id:`s${uid()}`,type,content:defaults[type]};
    setPage(p=>({...p,sections:[...p.sections,newSection]}));
    setShowAddSection(false);setSelectedSection(newSection);
  };
  const updateSection = (updated) => { setPage(p=>({...p,sections:p.sections.map(s=>s.id===updated.id?updated:s)}));setSelectedSection(updated); };
  const handleSave = () => { onSave(page);setSaved(true);setTimeout(()=>setSaved(false),2200); };
  const previewW = {desktop:"100%",tablet:768,mobile:390}[previewDevice];
  const sectionLabels = {header:"Cabeçalho",hero:"Hero",features:"Recursos",testimonials:"Depoimentos",cta:"CTA",form:"Formulário",stats:"Estatísticas",video:"Vídeo",footer:"Rodapé"};

  const editorTabs = [
    {id:"editor",    label:"Editor",    icon:IC.layout},
    {id:"analytics", label:"Analytics", icon:IC.chart },
    {id:"seo",       label:"SEO",       icon:IC.globe },
    {id:"abtest",    label:"A/B Test",  icon:IC.abtest},
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:T.bg,fontFamily:T.font,overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');
        *, *::before, *::after { box-sizing:border-box; }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-thumb { background:#B3BFCA; border-radius:99px; }
        input[type=range] { accent-color:${T.green}; }
      `}</style>

      <div style={{background:T.surface,borderBottom:`0.5px solid ${T.border}`,padding:"0 20px",display:"flex",alignItems:"center",gap:12,height:52,flexShrink:0}}>
        <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:6,color:T.muted,fontSize:13,fontFamily:T.font,fontWeight:600,padding:"4px 8px",borderRadius:6}}>
          <Ico d={IC.back} size={15} color={T.muted}/> Voltar
        </button>
        <div style={{width:1,height:20,background:T.border}}/>
        <div style={{display:"flex",alignItems:"center",gap:8,flex:1}}>
          <input value={page.name} onChange={e=>setPage(p=>({...p,name:e.target.value}))}
            style={{border:"none",outline:"none",fontSize:14,fontWeight:700,color:T.text,fontFamily:T.head,background:"transparent",minWidth:200}}/>
          <Badge label={statusColors[page.status].label} color={statusColors[page.status].text} bg={statusColors[page.status].bg}/>
        </div>
        <div style={{display:"flex",gap:2,background:T.faint,padding:4,borderRadius:10,border:`0.5px solid ${T.border}`}}>
          {editorTabs.map(tab=>(
            <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
              style={{padding:"5px 12px",borderRadius:7,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:T.font,background:activeTab===tab.id?T.surface:"transparent",color:activeTab===tab.id?T.text:T.muted,boxShadow:activeTab===tab.id?T.shadow:"none",display:"flex",alignItems:"center",gap:5,transition:"all .15s"}}>
              <Ico d={tab.icon} size={13} color={activeTab===tab.id?T.blue:T.muted}/> {tab.label}
            </button>
          ))}
        </div>
        {activeTab==="editor"&&(
          <div style={{display:"flex",gap:2,background:T.faint,padding:3,borderRadius:8,border:`0.5px solid ${T.border}`}}>
            {[["desktop",IC.monitor],["tablet",IC.tablet],["mobile",IC.mobile]].map(([d,ico])=>(
              <button key={d} onClick={()=>setPreviewDevice(d)}
                style={{padding:"4px 8px",borderRadius:6,border:"none",cursor:"pointer",background:previewDevice===d?T.blue:"transparent",transition:"all .15s"}}>
                <Ico d={ico} size={14} color={previewDevice===d?"#fff":T.muted}/>
              </button>
            ))}
          </div>
        )}
        <select value={page.status} onChange={e=>setPage(p=>({...p,status:e.target.value}))}
          style={{padding:"5px 10px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:12,fontWeight:700,fontFamily:T.font,color:T.text,background:T.surface,cursor:"pointer"}}>
          <option value="draft">Rascunho</option>
          <option value="published">Publicada</option>
          <option value="paused">Pausada</option>
        </select>
        <Btn variant={saved?"success":"primary"} icon={saved?IC.check:undefined} onClick={handleSave}>
          {saved?"Salvo!":"Salvar"}
        </Btn>
      </div>

      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        {activeTab==="editor"?(
          <>
            <div style={{width:220,background:T.surface,borderRight:`0.5px solid ${T.border}`,display:"flex",flexDirection:"column",overflow:"hidden",flexShrink:0}}>
              <div style={{padding:"12px 14px",borderBottom:`0.5px solid ${T.border}`}}>
                <div style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>Seções ({page.sections.length})</div>
                <Btn variant="teal" size="sm" icon={IC.plus} onClick={()=>setShowAddSection(s=>!s)} style={{width:"100%"}}>Adicionar seção</Btn>
              </div>
              {showAddSection&&(
                <div style={{padding:"10px",borderBottom:`0.5px solid ${T.border}`,background:"#eff6ff"}}>
                  <div style={{fontSize:10,fontWeight:700,color:T.blue,marginBottom:8,textTransform:"uppercase",letterSpacing:".05em"}}>Escolha o tipo</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
                    {SECTION_TYPES.map(t=>(
                      <button key={t} onClick={()=>addSection(t)}
                        style={{padding:"6px 4px",borderRadius:6,border:`0.5px solid ${T.border}`,background:T.surface,cursor:"pointer",fontSize:11,fontWeight:700,color:T.text,fontFamily:T.font,textAlign:"center",transition:"all .12s"}}>
                        {sectionLabels[t]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div style={{flex:1,overflowY:"auto",padding:"8px"}}>
                {page.sections.map((section,idx)=>(
                  <div key={section.id}
                    onClick={()=>setSelectedSection(section.id===selectedSection?.id?null:section)}
                    style={{borderRadius:8,border:`2px solid ${section.id===selectedSection?.id?T.blue:T.border}`,padding:"8px 10px",marginBottom:4,background:section.id===selectedSection?.id?"#eff6ff":T.surface,cursor:"pointer",transition:"all .15s"}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <Ico d={IC.drag} size={12} color={T.muted}/>
                      <span style={{flex:1,fontSize:12,fontWeight:700,color:section.id===selectedSection?.id?T.blue:T.text,fontFamily:T.font}}>{sectionLabels[section.type]}</span>
                      <div style={{display:"flex",gap:1}}>
                        <button onClick={e=>{e.stopPropagation();moveSection(idx,-1);}} style={{background:"none",border:"none",cursor:"pointer",padding:2,borderRadius:4}} title="Mover para cima"><Ico d={IC.arrow_up} size={11} color={T.muted}/></button>
                        <button onClick={e=>{e.stopPropagation();moveSection(idx,1);}} style={{background:"none",border:"none",cursor:"pointer",padding:2,borderRadius:4}} title="Mover para baixo"><Ico d={IC.arrow_down} size={11} color={T.muted}/></button>
                        <button onClick={e=>{e.stopPropagation();deleteSection(idx);}} style={{background:"none",border:"none",cursor:"pointer",padding:2,borderRadius:4}} title="Remover"><Ico d={IC.trash} size={11} color={T.red}/></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{flex:1,overflowY:"auto",padding:"20px",background:"#e8edf3",display:"flex",justifyContent:"center"}}>
              <div style={{width:typeof previewW==="number"?previewW:"100%",maxWidth:typeof previewW==="number"?previewW:1100,background:"#fff",borderRadius:10,overflow:"hidden",boxShadow:"0 8px 32px rgba(0,0,0,.1)",border:`0.5px solid ${T.border}`}}>
                {previewDevice!=="desktop"&&<div style={{background:"#1e293b",padding:"6px 0",display:"flex",justifyContent:"center"}}><div style={{width:60,height:4,background:"#475569",borderRadius:2}}/></div>}
                {page.sections.map(section=>(
                  <div key={section.id}
                    onClick={()=>setSelectedSection(section.id===selectedSection?.id?null:section)}
                    style={{position:"relative",outline:section.id===selectedSection?.id?`2px solid ${T.blue}`:"none",outlineOffset:-2,cursor:"pointer"}}>
                    <SectionPreview section={section}/>
                    {section.id===selectedSection?.id&&(
                      <div style={{position:"absolute",top:6,right:6,background:T.blue,borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700,color:"#fff",fontFamily:T.font}}>
                        {sectionLabels[section.type]}
                      </div>
                    )}
                  </div>
                ))}
                {page.sections.length===0&&(
                  <div style={{padding:"60px 40px",textAlign:"center",color:T.muted,fontFamily:T.font}}>
                    <Ico d={IC.layout} size={32} color={T.border}/>
                    <p style={{marginTop:12,fontWeight:600}}>Nenhuma seção. Adicione seções na barra lateral.</p>
                  </div>
                )}
              </div>
            </div>

            <div style={{width:280,background:T.surface,borderLeft:`0.5px solid ${T.border}`,display:"flex",flexDirection:"column",overflow:"hidden",flexShrink:0}}>
              <div style={{padding:"12px 14px",borderBottom:`0.5px solid ${T.border}`}}>
                <div style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:".06em"}}>
                  {selectedSection?`Editar: ${sectionLabels[selectedSection.type]}`:"Propriedades"}
                </div>
              </div>
              <div style={{flex:1,overflowY:"auto",padding:"14px"}}>
                {selectedSection
                  ?<SectionEditor section={selectedSection} onChange={updateSection}/>
                  :<div style={{textAlign:"center",padding:"32px 16px",color:T.muted}}><Ico d={IC.edit} size={28} color={T.border}/><p style={{marginTop:10,fontSize:12,fontWeight:600,fontFamily:T.font}}>Clique em uma seção no canvas para editar suas propriedades.</p></div>}
              </div>
            </div>
          </>
        ):(
          <div style={{flex:1,overflowY:"auto",padding:"24px",maxWidth:1100,margin:"0 auto",width:"100%"}}>
            {activeTab==="analytics"&&<AnalyticsView page={page}/>}
            {activeTab==="seo"      &&<SeoPanel page={page} onChange={setPage}/>}
            {activeTab==="abtest"   &&<AbTestPanel page={page} onChange={setPage}/>}
          </div>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   PAGE CARD
════════════════════════════════════════════════════════════════════════ */
const PageCard = ({ page, onEdit, onClone, onDelete }) => {
  const [hov,setHov] = useState(false);
  const sc = statusColors[page.status]||statusColors.draft;
  const previewSections = page.sections.slice(0,4);

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={() => path && navigate(path)}
      style={{background:T.surface,borderRadius:12,border:`1.5px solid ${hov?T.blue:T.border}`,overflow:"hidden",transition:"all .2s",boxShadow:hov?T.shadowMd:T.shadow,cursor:"pointer"}}>
      <div onClick={onEdit} style={{height:180,overflow:"hidden",background:T.bg,position:"relative"}}>
        <div style={{transform:"scale(0.38)",transformOrigin:"top left",width:"263%",pointerEvents:"none"}}>
          {previewSections.map(s=><SectionPreview key={s.id} section={s}/>)}
        </div>
        {hov&&(
          <div style={{position:"absolute",inset:0,background:"rgba(0,121,169,.12)",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(1px)"}}>
            <div style={{background:T.blue,color:"#fff",padding:"8px 16px",borderRadius:8,fontSize:13,fontWeight:700,fontFamily:T.font,display:"flex",alignItems:"center",gap:6}}>
              <Ico d={IC.edit} size={14} color="#fff"/> Editar
            </div>
          </div>
        )}
      </div>

      <div style={{padding:"14px 16px"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8,marginBottom:6}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:T.text,fontFamily:T.font,marginBottom:3}}>{page.name}</div>
            <div style={{fontSize:11,fontWeight:600,color:T.muted,fontFamily:T.font}}>/{page.url_slug}</div>
          </div>
          <Badge label={sc.label} color={sc.text} bg={sc.bg}/>
        </div>

        {page.status==="published"&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,margin:"10px 0"}}>
            {[["Visitantes",fmtNum(page.metrics.visitors),T.blue],["Leads",fmtNum(page.metrics.leads),T.green],["Conv.",`${page.metrics.convRate}%`,T.teal]].map(([l,v,c])=>(
              <div key={l} style={{background:T.faint,borderRadius:8,padding:"6px 8px",textAlign:"center"}}>
                <div style={{fontSize:15,fontWeight:700,color:c,fontFamily:T.head}}>{v}</div>
                <div style={{fontSize:10,fontWeight:700,color:T.muted,fontFamily:T.font}}>{l}</div>
              </div>
            ))}
          </div>
        )}

        {page.abTest.enabled&&(
          <div style={{marginBottom:8,display:"flex",alignItems:"center",gap:5}}>
            <Zap size={11} color={T.purple} aria-hidden="true"/>
            <Badge label="A/B Test ativo" color={T.purple}/>
          </div>
        )}

        <div style={{fontSize:11,fontWeight:600,color:T.muted,fontFamily:T.font,marginBottom:10}}>Criado em {fmtDate(page.created_at)}</div>

        <div style={{display:"flex",gap:6,borderTop:`0.5px solid ${T.border}`,paddingTop:10}}>
          <Btn variant="primary"   size="sm" icon={IC.edit}  onClick={onEdit}   style={{flex:1,justifyContent:"center"}}>Editar</Btn>
          <Btn variant="secondary" size="sm" icon={IC.copy}  onClick={onClone}  title="Clonar página"/>
          <Btn variant="danger"    size="sm" icon={IC.trash} onClick={onDelete} title="Excluir"/>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   NEW PAGE MODAL
════════════════════════════════════════════════════════════════════════ */
const TEMPLATE_ICONS = { webinar:Calendar, ebook:BookOpen, trial:Zap, newsletter:Mail };
const TEMPLATE_DESCS = { webinar:"Para eventos ao vivo e gravados", ebook:"Para materiais ricos e lead magnets", trial:"Para trial e demo requests", newsletter:"Para captura simples de emails" };

const LIBRARY_TO_TEMPLATE = {
  "b2b-escritorios": "trial",
  "b2c-performance": "trial",
  "b2c-educativa":   "ebook",
};

const NewPageModal = ({ onClose, onCreate, libraryTpl }) => {
  const defaultTpl = libraryTpl ? (LIBRARY_TO_TEMPLATE[libraryTpl.id] || "trial") : "trial";
  const [name,     setName]     = useState(libraryTpl ? libraryTpl.name : "");
  const [template, setTemplate] = useState(defaultTpl);

  const handleCreate = () => {
    if(!name.trim()) return;
    const slug = name.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");
    const tpl  = TEMPLATES[template];
    onCreate({ id:`pg_${uid()}`, name:name.trim(), url_slug:slug, status:"draft", template, library_id: libraryTpl?.id || null, sections:tpl.sections.map((s,i)=>({...s,id:`s${uid()}${i}`})), seo:{title:name,description:"",keywords:""}, og:{title:name,description:"",image:""}, pixels:{fbPixel:"",ga4:"",gtm:""}, abTest:{enabled:false,variantName:"",variantSections:null,variantTraffic:50}, metrics:{visitors:0,leads:0,convRate:0,avgTime:"—"}, created_at:new Date().toISOString() });
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,backdropFilter:"blur(3px)"}}>
      <div style={{background:T.surface,borderRadius:14,padding:"28px 30px",width:560,boxShadow:"0 24px 80px rgba(0,0,0,.18)",border:`0.5px solid ${T.border}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontSize:17,fontWeight:700,color:T.text,fontFamily:T.head}}>Nova Landing Page</div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:T.muted,display:"flex",alignItems:"center"}}>
            <Ico d={IC.close} size={18} color={T.muted}/>
          </button>
        </div>

        {libraryTpl && (
          <div style={{marginBottom:16,padding:"12px 14px",borderRadius:10,background:libraryTpl.colorBg,border:`1px solid ${libraryTpl.color}40`,display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:40,height:40,borderRadius:10,background:T.surface,display:"grid",placeItems:"center",flexShrink:0}}>
              <span style={{fontFamily:T.mono,fontSize:13,fontWeight:700,color:libraryTpl.color}}>{libraryTpl.num}</span>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:11,fontWeight:700,color:libraryTpl.color,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:2,fontFamily:T.mono}}>Template da Biblioteca</div>
              <div style={{fontSize:13,fontWeight:700,color:T.text,fontFamily:T.font}}>{libraryTpl.name}</div>
              <div style={{fontSize:11,color:T.muted,fontFamily:T.font,marginTop:2}}>{libraryTpl.sub}</div>
            </div>
          </div>
        )}

        <div style={{marginBottom:16}}>
          <Input label="Nome da página" value={name} onChange={setName} placeholder="Ex: Webinar de Marketing Digital"/>
        </div>

        {!libraryTpl && (<>
          <div style={{marginBottom:6}}>
            <label style={{fontSize:12,fontWeight:700,color:T.muted,fontFamily:T.font}}>Escolha um template</label>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
            {Object.entries(TEMPLATES).map(([key,tpl])=>{
              const TIcon = TEMPLATE_ICONS[key]||LayoutTemplate;
              return (
                <div key={key} onClick={()=>setTemplate(key)}
                  style={{borderRadius:10,border:`2px solid ${template===key?T.blue:T.border}`,padding:"12px 14px",cursor:"pointer",background:template===key?"#eff6ff":T.surface,transition:"all .15s"}}>
                  <div style={{width:36,height:36,borderRadius:8,background:`${T.blue}14`,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:8}}>
                    <TIcon size={18} color={T.blue} aria-hidden="true"/>
                  </div>
                  <div style={{fontSize:13,fontWeight:700,color:template===key?T.blue:T.text,fontFamily:T.font}}>{tpl.name}</div>
                  <div style={{fontSize:11,fontWeight:600,color:T.muted,fontFamily:T.font,marginTop:2}}>{TEMPLATE_DESCS[key]}</div>
                  <div style={{fontSize:10,fontWeight:600,color:T.muted,fontFamily:T.font,marginTop:6}}>{tpl.sections.length} seções incluídas</div>
                </div>
              );
            })}
          </div>
        </>)}

        {template&&(
          <div style={{marginBottom:20,padding:"10px 12px",background:T.faint,borderRadius:8,border:`0.5px solid ${T.border}`}}>
            <div style={{fontSize:11,fontWeight:700,color:T.muted,marginBottom:6,fontFamily:T.font}}>Seções do template:</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {TEMPLATES[template].sections.map((s,i)=><Badge key={i} label={s.type} color={T.blue}/>)}
            </div>
          </div>
        )}

        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn variant="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" icon={IC.plus} onClick={handleCreate} disabled={!name.trim()}>Criar página</Btn>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   LIBRARY — Landing Page Templates Vantari
════════════════════════════════════════════════════════════════════════ */
const LIBRARY_LP_TEMPLATES = [
  {
    id: "b2b-escritorios", num: "01",
    color: "#0D7491", colorBg: "#E0F2F8",
    name: "B2B · Escritórios Jurídicos",
    sub: 'Substitui o fluxo B2B atual. Honorários previsíveis, caixa sem dívida.',
    tag: "Consultivo · B2B",
    audience: "advogados · bancas",
    cta: "agendar diagnóstico",
    traction: "LinkedIn · e-mail B2B",
    convTarget: "3–6%",
    url: "/antecipacao-escritorios",
    blocks: ["nav","trust","hero-light","kpi-row","form","logos","steps-3","testi-3","faq","final-cta","footer"],
  },
  {
    id: "b2c-performance", num: "02",
    color: "#0A5F8A", colorBg: "#DDEFFE",
    name: "B2C · Performance / Urgência",
    sub: "Alta intensidade, tráfego pago. Resposta imediata pelo WhatsApp.",
    tag: "Conversão · Alta Intensidade",
    audience: "pessoa física · urgência",
    cta: "falar pelo WhatsApp agora",
    traction: "Google Ads · Meta Ads",
    convTarget: "10–14%",
    url: "/antecipar",
    blocks: ["nav","trust","hero-dark","live-strip","compare","steps-3","testi-3","final-cta","footer"],
  },
  {
    id: "b2c-educativa", num: "03",
    color: "#14A273", colorBg: "#ECFDF5",
    name: "B2C · Educativa",
    sub: 'Substitui "Antecipe Seu Dinheiro". Tráfego orgânico, SEO, redes sociais.',
    tag: "Calmo · Light",
    audience: "leitor de blog · pesquisa",
    cta: "simular sem cadastro",
    traction: "SEO · Instagram · YouTube",
    convTarget: "3–5%",
    url: "/antecipar-acao-trabalhista",
    blocks: ["nav","trust","hero-split","calc-row","steps-3","faq","testi-3","final-cta-green","footer"],
  },
];

const LP_PREVIEW_BODIES = {
  "b2b-escritorios": `<style>
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=Inter:wght@500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}body{font-family:Inter,sans-serif;background:#fff;color:#0E1A24;width:1280px}
nav{display:flex;align-items:center;gap:28px;padding:0 64px;height:64px;background:#fff;border-bottom:1px solid #E8EEF3}
.logo{font-family:Sora,sans-serif;font-size:20px;font-weight:800;color:#0D7491;margin-right:auto}
.nl{display:flex;gap:4px}.nl a{font-size:14px;color:#5A6B7A;font-weight:600;margin-right:16px;text-decoration:none}
.ph{font-size:13px;color:#2E3D4B;font-weight:600}.wa{background:#14A273;color:#fff;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:700}
.trust{background:#F5F8FB;border-bottom:1px solid #E8EEF3;padding:10px 64px;display:flex;gap:28px}
.trust span{font-size:13px;color:#5A6B7A;font-weight:600}.trust b{color:#0E1A24}
.hero{display:grid;grid-template-columns:1fr 420px;gap:48px;padding:64px 64px;align-items:center}
.ey{font-size:12px;font-weight:700;color:#14A273;text-transform:uppercase;letter-spacing:.1em;margin-bottom:14px;display:flex;align-items:center;gap:6px}
.ey::before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:#14A273}
h1{font-family:Sora,sans-serif;font-size:50px;font-weight:800;color:#0E1A24;line-height:1.08;letter-spacing:-.03em;margin-bottom:18px}
h1 em{color:#0D7491;font-style:normal}
.lead{font-size:17px;color:#2E3D4B;font-weight:500;line-height:1.65;margin-bottom:30px}
.kpis{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid #E8EEF3;border-radius:12px;overflow:hidden}
.kpi{padding:16px 20px;border-right:1px solid #E8EEF3}.kpi:last-child{border-right:none}
.kv{font-family:Sora,sans-serif;font-size:22px;font-weight:700;color:#0D7491;display:block}
.kl{font-size:11px;color:#5A6B7A;font-weight:600;margin-top:2px;display:block}
.fc{background:#fff;border:1.5px solid #E8EEF3;border-radius:16px;padding:30px;box-shadow:0 4px 24px -8px rgba(14,26,36,.1)}
.badge{display:inline-block;background:#14A27318;color:#14A273;font-size:11px;font-weight:700;padding:4px 10px;border-radius:99px;margin-bottom:14px}
.fc h3{font-family:Sora,sans-serif;font-size:19px;font-weight:700;color:#0E1A24;margin-bottom:6px}
.fsub{font-size:12px;color:#5A6B7A;margin-bottom:18px}
.row{margin-bottom:12px}.row label{display:block;font-size:10px;font-weight:700;color:#5A6B7A;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}
.inp{padding:10px 12px;border:1.5px solid #E8EEF3;border-radius:8px;font-size:14px;color:#8696A5;background:#FAFBFC}
.btn{width:100%;background:linear-gradient(135deg,#0D7491 0%,#14A273 100%);color:#fff;border:none;padding:14px;border-radius:10px;font-size:15px;font-weight:700;margin-top:6px;margin-bottom:10px;display:block;text-align:center}
.legal{font-size:11px;color:#8696A5;text-align:center}.tl{font-size:11px;color:#5A6B7A;text-align:center;margin-top:6px}
</style>
<nav>
  <div class="logo">vantari</div>
  <div class="nl"><a>Como funciona</a><a>Para escritórios</a><a>Blog</a><a>FAQ</a></div>
  <span class="ph">(11) 93401-8661</span>
  <div class="wa">● WhatsApp</div>
</nav>
<div class="trust">
  <span><b>+12.000</b> clientes</span>
  <span><b>R$ 280 mi</b> liberados</span>
  <span><b>5 dias uteis</b> media</span>
  <span><b>RA1000</b> Reclame Aqui</span>
</div>
<div class="hero">
  <div>
    <div class="ey">Antecipacao de honorarios</div>
    <h1>Honorarios previsiveis. <em>Caixa sem divida.</em> Escritorio livre para crescer.</h1>
    <p class="lead">Seu escritorio tem processos trabalhistas a receber. Nos adiantamos o valor antes da sentenca — sem emprestimo, sem risco juridico.</p>
    <div class="kpis">
      <div class="kpi"><span class="kv">R$ 280 mi</span><span class="kl">Ja liberados</span></div>
      <div class="kpi"><span class="kv">1.840</span><span class="kl">Escritorios clientes</span></div>
      <div class="kpi"><span class="kv">24h</span><span class="kl">Prazo de resposta</span></div>
    </div>
  </div>
  <div class="fc">
    <span class="badge">Resposta em 24h</span>
    <h3>Simule o adiantamento do seu escritorio</h3>
    <p class="fsub">Informe dados basicos. Um especialista retorna em ate 24h.</p>
    <div class="row"><label>Nome / Escritorio</label><div class="inp">Razao social ou nome</div></div>
    <div class="row"><label>Email corporativo</label><div class="inp">email@escritorio.com.br</div></div>
    <div class="row"><label>WhatsApp</label><div class="inp">(11) 9 0000-0000</div></div>
    <div class="row"><label>Faixa de processos ativos</label><div class="inp">1-10 · 11-50 · 51-200 · 200+</div></div>
    <div class="btn">Agendar diagnostico →</div>
    <div class="legal">Quero receber contato. Sem spam. Politica LGPD.</div>
    <div class="tl">Humanos reais · seg-sex, 9h-18h · resposta em 24h</div>
  </div>
</div>`,

  "b2c-performance": `<style>
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=Inter:wght@400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Inter,sans-serif;background:radial-gradient(ellipse at 20% 0%,#007fb3 0%,#003d56 55%,#001e2b 100%);color:#fff;width:1280px;min-height:800px}
.live{background:#001224;border-bottom:1px solid rgba(255,255,255,.08);padding:7px 64px;display:flex;align-items:center;gap:12px}
.ldot{width:8px;height:8px;border-radius:50%;background:#14A273;box-shadow:0 0 0 3px rgba(20,162,115,.3);flex-shrink:0}
.live span{font-size:13px;color:rgba(255,255,255,.7);font-weight:600}.live b{color:#fff}
nav{display:flex;align-items:center;gap:28px;padding:0 64px;height:64px}
.logo{font-family:Sora,sans-serif;font-size:20px;font-weight:800;color:#fff;margin-right:auto}
.nl a{font-size:14px;color:rgba(255,255,255,.7);font-weight:600;margin-right:16px;text-decoration:none}
.ph{font-size:13px;color:rgba(255,255,255,.8);font-weight:600}
.wa{background:#14A273;color:#fff;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:700}
.hero{display:grid;grid-template-columns:1fr 400px;gap:48px;padding:56px 64px;align-items:start}
.ey{font-size:12px;font-weight:700;color:#14A273;text-transform:uppercase;letter-spacing:.12em;margin-bottom:16px;display:flex;align-items:center;gap:8px}
.edot{width:6px;height:6px;border-radius:50%;background:#14A273;box-shadow:0 0 0 3px rgba(20,162,115,.3)}
h1{font-family:Sora,sans-serif;font-size:50px;font-weight:800;color:#fff;line-height:1.08;letter-spacing:-.03em;margin-bottom:22px}
h1 em{color:#5EE8C8;font-style:normal}
.chk{display:flex;align-items:center;gap:10px;font-size:16px;color:rgba(255,255,255,.9);font-weight:500;margin-bottom:10px}
.chk::before{content:"";display:inline-block;width:20px;height:20px;border-radius:50%;background:rgba(20,162,115,.25);flex-shrink:0}
.fc{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:28px}
.badge{display:inline-block;background:#14A273;color:#fff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:99px;margin-bottom:14px}
.fc h3{font-family:Sora,sans-serif;font-size:19px;font-weight:700;color:#fff;margin-bottom:6px}
.fsub{font-size:12px;color:rgba(255,255,255,.6);margin-bottom:18px}
.row{margin-bottom:12px}.row label{display:block;font-size:10px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px}
.inp{padding:10px 12px;border:1.5px solid rgba(255,255,255,.12);border-radius:8px;font-size:14px;color:rgba(255,255,255,.4);background:rgba(255,255,255,.05)}
.inp.on{border-color:#14A273;color:#fff;background:rgba(20,162,115,.08)}
.btn{width:100%;background:#14A273;color:#fff;border:none;padding:14px;border-radius:10px;font-size:15px;font-weight:700;margin-top:6px;margin-bottom:10px;display:block;text-align:center;box-shadow:0 4px 16px rgba(20,162,115,.4)}
.legal{font-size:11px;color:rgba(255,255,255,.4);text-align:center}
.tl{font-size:11px;color:rgba(255,255,255,.5);text-align:center;margin-top:6px}
</style>
<div class="live">
  <div class="ldot"></div>
  <span>Ultima liberacao: <b>R$ 47.200</b> — Sao Paulo · ha 9 minutos</span>
</div>
<nav>
  <div class="logo">vantari</div>
  <div class="nl"><a>Como funciona</a><a>Para escritorios</a><a>Blog</a></div>
  <span class="ph">(11) 93401-8661</span>
  <div class="wa">● WhatsApp</div>
</nav>
<div class="hero">
  <div>
    <div class="ey"><div class="edot"></div>Atendimento agora · em ate 2 min</div>
    <h1>Voce nao precisa esperar anos. <em>Antecipe hoje.</em></h1>
    <div class="chk">Sem emprestimo · nao e divida</div>
    <div class="chk">Sem analise de Serasa ou CPF</div>
    <div class="chk">PIX na conta em ate 5 dias uteis</div>
    <div class="chk">Se perder o processo, o prejuizo e nosso</div>
  </div>
  <div class="fc">
    <span class="badge">Resposta em 2 min</span>
    <h3>Quanto voce pode receber?</h3>
    <p class="fsub">Nome e WhatsApp sao suficientes pra comecar.</p>
    <div class="row"><label>Seu nome</label><div class="inp">Como podemos te chamar?</div></div>
    <div class="row"><label>WhatsApp</label><div class="inp on">(11) 9 0000-0000</div></div>
    <div class="row"><label>Em que fase esta seu processo?</label><div class="inp">1a instancia · 2a instancia · transito julgado</div></div>
    <div class="btn">Falar pelo WhatsApp agora →</div>
    <div class="legal">Quero receber contato por WhatsApp. Politica LGPD.</div>
    <div class="tl">Atendentes humanos · seg-sab, 8h-22h · resposta em 2 min</div>
  </div>
</div>`,

  "b2c-educativa": `<style>
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=Inter:wght@400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}body{font-family:Inter,sans-serif;background:#fff;color:#0E1A24;width:1280px}
nav{display:flex;align-items:center;gap:28px;padding:0 64px;height:64px;background:#fff;border-bottom:1px solid #E8EEF3}
.logo{font-family:Sora,sans-serif;font-size:20px;font-weight:800;color:#0D7491;margin-right:auto}
.nl a{font-size:14px;color:#5A6B7A;font-weight:600;margin-right:16px;text-decoration:none}
.ph{font-size:13px;color:#2E3D4B;font-weight:600}.wa{background:#14A273;color:#fff;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:700}
.hero{display:grid;grid-template-columns:1fr 400px;gap:64px;padding:64px 64px;align-items:center}
.ey{font-size:12px;font-weight:700;color:#14A273;letter-spacing:.08em;display:flex;align-items:center;gap:6px;margin-bottom:16px}
.ey::before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:#14A273}
h1{font-family:Sora,sans-serif;font-size:50px;font-weight:800;color:#0E1A24;line-height:1.08;letter-spacing:-.03em;margin-bottom:16px}
h1 em{color:#0D7491;font-style:normal}
.lead{font-size:17px;color:#2E3D4B;font-weight:500;line-height:1.65;margin-bottom:26px}
.calc{display:grid;grid-template-columns:1fr 1fr;border:1px solid #E8EEF3;border-radius:12px;overflow:hidden;margin-bottom:26px}
.cb{padding:16px 20px;border-right:1px solid #E8EEF3}.cb:last-child{border:none}
.clab{font-size:11px;color:#5A6B7A;font-weight:600;margin-bottom:4px}
.cval{font-family:Sora,sans-serif;font-size:26px;font-weight:800;color:#0D7491}
.cdet{font-size:11px;color:#8696A5;margin-top:2px}
.btns{display:flex;gap:12px}.btn-p{background:linear-gradient(135deg,#0D7491 0%,#14A273 100%);color:#fff;border:none;padding:14px 26px;border-radius:10px;font-size:15px;font-weight:700}
.btn-g{background:transparent;color:#2E3D4B;border:1.5px solid #E8EEF3;padding:14px 20px;border-radius:10px;font-size:15px;font-weight:600}
.stars{color:#F59E0B;font-size:15px;margin-right:4px}.mt{font-size:12px;color:#5A6B7A;margin-top:14px}
.phone{background:#F5F8FB;border-radius:22px;overflow:hidden;box-shadow:0 8px 32px rgba(14,26,36,.12)}
.ph-head{background:#0E1A24;padding:9px 16px;display:flex;justify-content:space-between}
.ph-head span{font-size:12px;color:#fff;font-weight:600}
.ph-h1{background:#0D7491;padding:14px 16px;font-family:Sora,sans-serif;font-size:15px;color:#fff;font-weight:700;line-height:1.3}
.ph-h1 em{color:#5EE8C8;font-style:normal}
.ph-card{background:#fff;margin:12px;border-radius:10px;padding:14px;border:1px solid #E8EEF3}
.ph-lab{font-size:11px;color:#5A6B7A;margin-bottom:3px}.ph-val{font-family:Sora,sans-serif;font-size:22px;font-weight:800;color:#0D7491}
.ph-det{font-size:11px;color:#8696A5;margin-top:2px}
.ph-prog{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin:0 12px 10px}
.seg{height:4px;border-radius:2px;background:#E8EEF3}.seg.done{background:#14A273}.seg.act{background:#0D7491}
.ph-step{display:flex;align-items:center;gap:10px;padding:8px 12px;border-top:1px solid #F0F4F7}
.ic{width:22px;height:22px;border-radius:50%;background:#14A27318;color:#14A273;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.ic.p{background:#E8EEF3;color:#5A6B7A}.st{font-size:12px;font-weight:700;color:#0E1A24}.ss{font-size:10px;color:#5A6B7A}
.ph-cta{background:#14A273;color:#fff;margin:12px;padding:10px;border-radius:8px;font-size:13px;font-weight:700;text-align:center}
</style>
<nav>
  <div class="logo">vantari</div>
  <div class="nl"><a>Como funciona</a><a>Para escritorios</a><a>Blog</a><a>FAQ</a></div>
  <span class="ph">(11) 93401-8661</span>
  <div class="wa">● WhatsApp</div>
</nav>
<div class="hero">
  <div>
    <div class="ey">Guia rapido · 3 min de leitura</div>
    <h1>Sua acao trabalhista <em>vale dinheiro hoje</em> — nao daqui a 5 anos.</h1>
    <p class="lead">Nao e emprestimo. Nao tem juros. Nao vai pro Serasa. E so voce transformar um direito que ja e seu em dinheiro disponivel agora.</p>
    <div class="calc">
      <div class="cb"><div class="clab">Valor estimado do processo</div><div class="cval">R$ 80.000</div><div class="cdet">2a instancia · 18 meses</div></div>
      <div class="cb"><div class="clab">Voce recebe hoje</div><div class="cval" style="color:#14A273">R$ 52.300</div><div class="cdet">Desagio unico · sem parcela</div></div>
    </div>
    <div class="btns">
      <div class="btn-p">Simular sem cadastro →</div>
      <div class="btn-g">Ver perguntas</div>
    </div>
    <div class="mt"><span class="stars">★★★★★</span><b>4,8</b> em 1.240 avaliacoes no Reclame Aqui</div>
  </div>
  <div class="phone">
    <div class="ph-head"><span>9:41</span><span>● ●</span></div>
    <div class="ph-h1">Ola Marcos, <em>seu processo esta pronto pra antecipar.</em></div>
    <div class="ph-card">
      <div class="ph-lab">Valor liquido estimado</div>
      <div class="ph-val">R$ 52.300</div>
      <div class="ph-det">Pagamento em ate 5 dias uteis · via PIX</div>
    </div>
    <div class="ph-prog">
      <div class="seg done"></div><div class="seg done"></div>
      <div class="seg act"></div><div class="seg"></div>
    </div>
    <div class="ph-step"><div class="ic">v</div><div><div class="st">Documentos validados</div><div class="ss">11/05 · 14:22</div></div></div>
    <div class="ph-step"><div class="ic">v</div><div><div class="st">Calculo do desagio</div><div class="ss">12/05 · 09:08</div></div></div>
    <div class="ph-step"><div class="ic p">3</div><div><div class="st">Proposta enviada</div><div class="ss">Aguardando seu aceite · 7 dias</div></div></div>
    <div class="ph-cta">Aceitar proposta</div>
  </div>
</div>`,
};

function getLPPreviewHtml(id) {
  const body = LP_PREVIEW_BODIES[id] || "";
  return `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;overflow:hidden">${body}</body></html>`;
}

const MODULAR_BLOCKS = [
  { code: "nav",         name: "Top nav",         desc: "Logo + menu + WhatsApp pill + telefone. Variant light/dark." },
  { code: "trust",       name: "Trust strip",      desc: "4–5 itens: clientes, R$, prazo, selos. Marquee opcional." },
  { code: "hero-light",  name: "Hero light",       desc: "2 colunas: copy + form. Para B2B e SEO." },
  { code: "hero-dark",   name: "Hero dark",        desc: "Gradiente azul-preto · alta intensidade. Para Performance." },
  { code: "hero-split",  name: "Hero split",       desc: "Copy + mockup de telefone ou imagem + calc-row." },
  { code: "live-strip",  name: "Live strip",       desc: '"Ultima liberacao" — prova social em tempo real.' },
  { code: "kpi-row",     name: "KPI row",          desc: "3 KPIs no hero · contadores animaveis." },
  { code: "form",        name: "Form card",        desc: "2–5 campos · honeypot + captcha invisivel. Submit via webhook." },
  { code: "logos",       name: "Logos/parceiros",  desc: "Strip de bancas, midia ou selos." },
  { code: "steps-3",     name: "Steps 3",          desc: '"Como funciona" com numeracao + duracao em mono.' },
  { code: "compare",     name: "Comparativo",      desc: "2 colunas semanticas verde / neutro." },
  { code: "testi-3",     name: "Testimonials 3",   desc: "Cards com avatar inicial, nome, contexto e valor." },
  { code: "faq",         name: "FAQ",              desc: "Lista accordion · primeiro item aberto por default." },
  { code: "phone",       name: "Phone mockup",     desc: "Frame de proposta — util em LPs educativas." },
  { code: "final-cta",   name: "Final CTA",        desc: "Faixa azul ou verde com 1 CTA + 1 frase." },
  { code: "footer",      name: "Footer 4 col",     desc: "Nav + atendimento + compliance + empresa." },
];

function LibraryLPCard({ tpl, onUse }) {
  const FRAME_W = 1280;
  const visibleH = 252;
  const containerRef = useRef(null);
  const [scale, setScale] = useState(0.32);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => { const w = el.clientWidth; if (w > 0) setScale(w / FRAME_W); };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const iframeH = Math.ceil(visibleH / scale);

  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden", boxShadow: T.shadow }}>
      <div style={{ padding: "16px 18px 14px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: tpl.colorBg, display: "grid", placeItems: "center", flexShrink: 0 }}>
            <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 700, color: tpl.color }}>{tpl.num}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
              <span style={{ fontFamily: T.head, fontSize: 15, fontWeight: 700, color: T.ink }}>{tpl.name}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: tpl.colorBg, color: tpl.color, fontFamily: T.mono, letterSpacing: "0.04em", flexShrink: 0 }}>{tpl.tag}</span>
            </div>
            <span style={{ fontSize: 12, color: T.muted, fontFamily: T.font, fontWeight: 500, lineHeight: 1.4 }}>{tpl.sub}</span>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, background: T.faint }}>
        {[["Audiencia", tpl.audience], ["CTA", tpl.cta], ["Tracao", tpl.traction], ["Conv. alvo", tpl.convTarget]].map(([k, v]) => (
          <div key={k} style={{ padding: "8px 12px", borderRight: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{k}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.text, fontFamily: T.mono }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#CDD5DE" }}>
        <div style={{ background: "#EAECEF", borderBottom: "1px solid #C5C9CF", padding: "7px 12px", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", gap: 5 }}>
            {["#FF6058","#FFBE29","#2ACB4B"].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />)}
          </div>
          <div style={{ flex: 1, background: "#fff", borderRadius: 5, padding: "3px 10px", fontSize: 10, color: "#666", fontFamily: T.mono, textAlign: "center", border: "1px solid #DDD" }}>
            vantari.com.br{tpl.url}
          </div>
        </div>
        <div ref={containerRef} style={{ height: visibleH, overflow: "hidden", position: "relative" }}>
          <iframe
            srcDoc={getLPPreviewHtml(tpl.id)}
            sandbox="allow-same-origin"
            title={`Preview LP ${tpl.num}`}
            style={{ width: FRAME_W, height: iframeH, border: "none", transform: `scale(${scale})`, transformOrigin: "top left", pointerEvents: "none", display: "block" }}
          />
        </div>
      </div>

      <div style={{ padding: "12px 18px", borderTop: `1px solid ${T.border}`, background: T.faint }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Blocos ativados</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {tpl.blocks.map(b => (
            <span key={b} style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: `${tpl.color}14`, color: tpl.color, fontFamily: T.mono }}>{b}</span>
          ))}
        </div>
      </div>

      <div style={{ padding: "14px 18px", display: "flex", gap: 8, justifyContent: "flex-end", borderTop: `1px solid ${T.border}` }}>
        <Btn variant="secondary" size="sm">Pre-visualizar</Btn>
        <Btn variant="primary" size="sm" onClick={() => onUse && onUse(tpl.id)}>Usar template →</Btn>
      </div>
    </div>
  );
}

function LibraryView({ onUse }) {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: T.head, fontSize: 18, fontWeight: 700, color: T.text, margin: "0 0 4px", letterSpacing: "-0.01em" }}>Biblioteca Vantari</h2>
        <p style={{ fontSize: 12, color: T.muted, margin: 0, fontFamily: T.font, fontWeight: 500 }}>
          3 landing pages otimizadas por canal de tracao. Sistema modular — mesma base de blocos em todas as LPs.
        </p>
      </div>

      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 20px", marginBottom: 24, display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap", boxShadow: T.shadow }}>
        {[[IC.layout, T.blue, "16 blocos modulares"], [IC.globe, T.green, "3 paletas de cor"], [IC.chart, T.amber, "Densidades light / dark"]].map(([icon, color, label]) => (
          <div key={label} style={{ display: "flex", gap: 7, alignItems: "center" }}>
            <Ico d={icon} size={15} color={color} />
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: T.font }}>{label}</span>
          </div>
        ))}
        <div style={{ width: 1, height: 20, background: T.border }} />
        <span style={{ fontSize: 12, color: T.muted, fontFamily: T.font }}>Variacoes de paleta e densidade selecionadas no inicio — depois, basta editar o copy.</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(380px,1fr))", gap: 20, marginBottom: 40 }}>
        {LIBRARY_LP_TEMPLATES.map(tpl => (
          <LibraryLPCard key={tpl.id} tpl={tpl} onUse={onUse} />
        ))}
      </div>

      <div>
        <div style={{ marginBottom: 14 }}>
          <h3 style={{ fontFamily: T.head, fontSize: 15, fontWeight: 700, color: T.text, margin: "0 0 4px" }}>Sistema modular</h3>
          <p style={{ fontSize: 12, color: T.muted, margin: 0, fontFamily: T.font }}>16 blocos · todos opcionais · as 3 LPs sao montadas a partir dos mesmos blocos.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10 }}>
          {MODULAR_BLOCKS.map(b => (
            <div key={b.code} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px", boxShadow: T.shadow }}>
              <div style={{ marginBottom: 5 }}>
                <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: T.teal, background: `${T.teal}12`, padding: "2px 6px", borderRadius: 4 }}>{b.code}</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.text, fontFamily: T.font, marginBottom: 3 }}>{b.name}</div>
              <div style={{ fontSize: 11, color: T.muted, fontFamily: T.font, lineHeight: 1.4 }}>{b.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN MODULE
════════════════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════════════
   FORMS MANAGER — tab Formulários standalone (Etapa 5)
════════════════════════════════════════════════════════════════════════ */
const FIELD_TYPES = [
  { v:"text",     l:"Texto" },
  { v:"email",    l:"Email" },
  { v:"cpf",      l:"CPF" },
  { v:"phone",    l:"Telefone" },
  { v:"number",   l:"Número" },
  { v:"date",     l:"Data" },
  { v:"textarea", l:"Texto longo" },
  { v:"select",   l:"Seleção" },
  { v:"checkbox", l:"Checkbox" },
];

const slugify = (s) => (s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,60);

const FormsManager = () => {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);     // form em edição (modal full)
  const [embedFor, setEmbedFor] = useState(null);   // form pra mostrar embed code

  const fetchForms = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("forms").select("*").order("created_at", { ascending: false });
    setForms(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchForms(); }, [fetchForms]);

  const newForm = () => {
    setEditing({
      name: "Novo formulário",
      slug: "",
      description: "",
      fields: [
        { id: "cpf",   type: "cpf",   label: "CPF",   required: true,  placeholder: "000.000.000-00" },
        { id: "name",  type: "text",  label: "Nome",  required: true,  placeholder: "Seu nome" },
        { id: "email", type: "email", label: "Email", required: false, placeholder: "seu@email.com" },
      ],
      success_msg: "Obrigado! Seus dados foram registrados.",
      source_label: "",
      tags: [],
      active: true,
    });
  };

  const saveForm = async () => {
    const payload = {
      name:         editing.name,
      slug:         editing.slug || slugify(editing.name),
      description:  editing.description,
      fields:       editing.fields,
      success_msg:  editing.success_msg,
      source_label: editing.source_label,
      tags:         editing.tags || [],
      active:       editing.active,
    };
    let err;
    if (editing.id) {
      ({ error: err } = await supabase.from("forms").update(payload).eq("id", editing.id));
    } else {
      ({ error: err } = await supabase.from("forms").insert(payload));
    }
    if (err) { alert("Erro: " + err.message); return; }
    setEditing(null);
    fetchForms();
  };

  const deleteForm = async (id) => {
    if (!window.confirm("Excluir este formulário? Submissões serão preservadas.")) return;
    await supabase.from("forms").delete().eq("id", id);
    fetchForms();
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <h2 style={{ fontFamily:T.head, fontSize:18, fontWeight:700, color:T.text, margin:0, letterSpacing:"-0.01em" }}>Formulários</h2>
          <p style={{ fontSize:12, color:T.muted, margin:"4px 0 0", fontFamily:T.font, fontWeight:500 }}>
            Formulários standalone para embedar em sites externos. Submissões viram leads.
          </p>
        </div>
        <Btn variant="primary" icon={IC.plus} size="md" onClick={newForm}>Novo formulário</Btn>
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:48, color:T.muted }}>Carregando…</div>
      ) : forms.length === 0 ? (
        <div style={{ textAlign:"center", padding:"56px 24px", color:T.muted }}>
          <Ico d={IC.form} size={40} color={T.border}/>
          <div style={{ fontSize:15, fontWeight:700, color:T.text, marginTop:14, fontFamily:T.head }}>Nenhum formulário ainda</div>
          <div style={{ fontSize:12, fontWeight:600, color:T.muted, marginTop:6, fontFamily:T.font }}>Crie um formulário e cole o embed code no teu site.</div>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px,1fr))", gap:14 }}>
          {forms.map(f => (
            <div key={f.id} style={{ background:T.surface, border:`0.5px solid ${T.border}`, borderRadius:12, padding:16, boxShadow:T.shadow }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:T.head, fontWeight:700, fontSize:14, color:T.text, marginBottom:2 }}>{f.name || "—"}</div>
                  <div style={{ fontFamily:T.mono, fontSize:11, color:T.muted, fontWeight:600 }}>/f/{f.slug || "(sem slug)"}</div>
                </div>
                <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:4, background: f.active ? `${T.green}14` : "#EEF2F6", color: f.active ? T.green : T.muted, fontFamily:T.font }}>
                  {f.active ? "ATIVO" : "INATIVO"}
                </span>
              </div>
              {f.description && (
                <p style={{ fontSize:11, color:T.muted, fontFamily:T.font, fontWeight:500, margin:"4px 0 10px", lineHeight:1.4 }}>{f.description}</p>
              )}
              <div style={{ display:"flex", gap:12, marginTop:10, fontSize:11, color:T.muted, fontFamily:T.font, fontWeight:600 }}>
                <span><strong style={{ color:T.text }}>{(f.fields||[]).length}</strong> campos</span>
                <span><strong style={{ color:T.text }}>{f.submission_count || 0}</strong> submissões</span>
              </div>
              <div style={{ display:"flex", gap:6, marginTop:14, borderTop:`0.5px solid ${T.border}`, paddingTop:12 }}>
                <button onClick={() => setEditing(f)} style={{ flex:1, padding:"6px 10px", border:`1px solid ${T.border}`, borderRadius:7, background:"transparent", color:T.text, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:T.font }}>Editar</button>
                <button onClick={() => setEmbedFor(f)} style={{ flex:1, padding:"6px 10px", border:`1px solid ${T.teal}`, borderRadius:7, background:`${T.teal}10`, color:T.teal, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:T.font }}>Embed</button>
                <button onClick={() => deleteForm(f.id)} style={{ padding:"6px 10px", border:`1px solid ${T.red}40`, borderRadius:7, background:"transparent", color:T.red, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:T.font }}>Excluir</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <FormEditor draft={editing} onChange={setEditing} onSave={saveForm} onCancel={() => setEditing(null)} />}
      {embedFor && <EmbedCodeModal form={embedFor} onClose={() => setEmbedFor(null)} />}
    </div>
  );
};

const FormEditor = ({ draft, onChange, onSave, onCancel }) => {
  const updateField = (idx, patch) => {
    const fields = [...draft.fields];
    fields[idx] = { ...fields[idx], ...patch };
    onChange({ ...draft, fields });
  };
  const removeField = (idx) => onChange({ ...draft, fields: draft.fields.filter((_,i) => i !== idx) });
  const addField = () => onChange({
    ...draft,
    fields: [...draft.fields, { id: `f${Date.now()}`, type:"text", label:"Novo campo", required:false, placeholder:"" }]
  });
  const moveField = (idx, dir) => {
    const fields = [...draft.fields];
    const target = idx + dir;
    if (target < 0 || target >= fields.length) return;
    [fields[idx], fields[target]] = [fields[target], fields[idx]];
    onChange({ ...draft, fields });
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:T.surface, borderRadius:14, width:720, maxWidth:"94vw", maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}>
        <div style={{ padding:"18px 22px", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontFamily:T.head, fontWeight:700, fontSize:16, color:T.text }}>{draft.id ? "Editar formulário" : "Novo formulário"}</span>
          <button onClick={onCancel} style={{ background:"none", border:"none", cursor:"pointer", color:T.muted }}><Ico d={IC.close} size={18} color={T.muted}/></button>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"20px 22px" }}>
          {/* Configurações */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:.5, display:"block", marginBottom:5 }}>Nome</label>
              <input value={draft.name||""} onChange={e => onChange({...draft, name:e.target.value, slug: draft.slug || slugify(e.target.value)})}
                style={{ width:"100%", padding:"8px 12px", border:`1px solid ${T.border}`, borderRadius:8, fontSize:13, color:T.text, fontFamily:T.font, outline:"none" }}/>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:.5, display:"block", marginBottom:5 }}>Slug (URL pública)</label>
              <input value={draft.slug||""} onChange={e => onChange({...draft, slug:slugify(e.target.value)})}
                style={{ width:"100%", padding:"8px 12px", border:`1px solid ${T.border}`, borderRadius:8, fontSize:13, color:T.text, fontFamily:T.mono, outline:"none" }}/>
            </div>
          </div>

          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:.5, display:"block", marginBottom:5 }}>Descrição</label>
            <textarea value={draft.description||""} onChange={e => onChange({...draft, description:e.target.value})} rows={2}
              style={{ width:"100%", padding:"8px 12px", border:`1px solid ${T.border}`, borderRadius:8, fontSize:13, color:T.text, fontFamily:T.font, outline:"none", resize:"vertical" }}/>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:.5, display:"block", marginBottom:5 }}>Source label (gravado em leads.source)</label>
              <input value={draft.source_label||""} onChange={e => onChange({...draft, source_label:e.target.value})}
                placeholder="Ex: Newsletter, Landing page X"
                style={{ width:"100%", padding:"8px 12px", border:`1px solid ${T.border}`, borderRadius:8, fontSize:13, color:T.text, fontFamily:T.font, outline:"none" }}/>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:.5, display:"block", marginBottom:5 }}>Tags (separadas por vírgula)</label>
              <input value={(draft.tags||[]).join(", ")} onChange={e => onChange({...draft, tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean)})}
                placeholder="newsletter, lead-novo"
                style={{ width:"100%", padding:"8px 12px", border:`1px solid ${T.border}`, borderRadius:8, fontSize:13, color:T.text, fontFamily:T.font, outline:"none" }}/>
            </div>
          </div>

          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:.5, display:"block", marginBottom:5 }}>Mensagem de sucesso</label>
            <input value={draft.success_msg||""} onChange={e => onChange({...draft, success_msg:e.target.value})}
              style={{ width:"100%", padding:"8px 12px", border:`1px solid ${T.border}`, borderRadius:8, fontSize:13, color:T.text, fontFamily:T.font, outline:"none" }}/>
          </div>

          {/* Campos */}
          <div style={{ marginTop:18 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <span style={{ fontSize:13, fontWeight:700, color:T.text, fontFamily:T.head }}>Campos ({(draft.fields||[]).length})</span>
              <Btn variant="ghost" size="sm" icon={IC.plus} onClick={addField}>Adicionar campo</Btn>
            </div>
            {(draft.fields||[]).map((f, idx) => (
              <div key={idx} style={{ border:`1px solid ${T.border}`, borderRadius:10, padding:"10px 12px", marginBottom:8, background:T.faint }}>
                <div style={{ display:"grid", gridTemplateColumns:"100px 1fr 1fr 60px auto", gap:8, alignItems:"center" }}>
                  <select value={f.type} onChange={e => updateField(idx, { type:e.target.value })}
                    style={{ padding:"6px 8px", border:`1px solid ${T.border}`, borderRadius:6, fontSize:12, fontFamily:T.font, background:"#fff", outline:"none" }}>
                    {FIELD_TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                  </select>
                  <input value={f.label||""} onChange={e => updateField(idx, { label:e.target.value })} placeholder="Label"
                    style={{ padding:"6px 10px", border:`1px solid ${T.border}`, borderRadius:6, fontSize:12, color:T.text, fontFamily:T.font, outline:"none" }}/>
                  <input value={f.placeholder||""} onChange={e => updateField(idx, { placeholder:e.target.value })} placeholder="Placeholder"
                    style={{ padding:"6px 10px", border:`1px solid ${T.border}`, borderRadius:6, fontSize:12, color:T.text, fontFamily:T.font, outline:"none" }}/>
                  <label style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:T.muted, fontFamily:T.font, fontWeight:600 }}>
                    <input type="checkbox" checked={!!f.required} onChange={e => updateField(idx, { required:e.target.checked })}/> Req.
                  </label>
                  <div style={{ display:"flex", gap:4 }}>
                    <button onClick={() => moveField(idx, -1)} title="Subir" style={{ padding:4, background:"transparent", border:"none", cursor:"pointer", color:T.muted, fontSize:14 }}>↑</button>
                    <button onClick={() => moveField(idx, 1)} title="Descer" style={{ padding:4, background:"transparent", border:"none", cursor:"pointer", color:T.muted, fontSize:14 }}>↓</button>
                    <button onClick={() => removeField(idx)} title="Remover" style={{ padding:4, background:"transparent", border:"none", cursor:"pointer", color:T.red, fontSize:14 }}>×</button>
                  </div>
                </div>
                {f.type === "select" && (
                  <input value={(f.options||[]).join(", ")} onChange={e => updateField(idx, { options: e.target.value.split(",").map(o => o.trim()).filter(Boolean) })}
                    placeholder="Opções separadas por vírgula"
                    style={{ marginTop:6, width:"100%", padding:"6px 10px", border:`1px solid ${T.border}`, borderRadius:6, fontSize:12, color:T.text, fontFamily:T.font, outline:"none" }}/>
                )}
              </div>
            ))}
            {(draft.fields||[]).length === 0 && (
              <div style={{ textAlign:"center", padding:"24px 12px", color:T.muted, fontSize:12, fontFamily:T.font }}>Nenhum campo. Clique "Adicionar campo".</div>
            )}
          </div>

          <div style={{ marginTop:14 }}>
            <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:T.text, fontFamily:T.font, fontWeight:600 }}>
              <input type="checkbox" checked={!!draft.active} onChange={e => onChange({...draft, active:e.target.checked})}/> Formulário ativo (visível no /f/:slug)
            </label>
          </div>
        </div>

        <div style={{ padding:"14px 22px", borderTop:`1px solid ${T.border}`, display:"flex", justifyContent:"flex-end", gap:8 }}>
          <Btn variant="ghost" onClick={onCancel}>Cancelar</Btn>
          <Btn variant="primary" onClick={onSave}>Salvar formulário</Btn>
        </div>
      </div>
    </div>
  );
};

const EmbedCodeModal = ({ form, onClose }) => {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://vantari-app.vercel.app";
  const publicUrl = `${baseUrl}/f/${form.slug}`;
  const iframeCode = `<iframe src="${publicUrl}" style="width:100%;max-width:520px;height:520px;border:0" loading="lazy"></iframe>`;
  const linkCode = publicUrl;
  const scriptCode = `<script async src="${baseUrl}/forms-embed.js" data-form="${form.slug}"></script>`;

  const copy = (text) => { navigator.clipboard.writeText(text); };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:T.surface, borderRadius:14, width:600, maxWidth:"94vw", maxHeight:"90vh", display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"18px 22px", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontFamily:T.head, fontWeight:700, fontSize:16, color:T.text }}>Embed: {form.name}</span>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:T.muted }}><Ico d={IC.close} size={18} color={T.muted}/></button>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"18px 22px" }}>
          <p style={{ fontSize:12, color:T.muted, marginTop:0, fontFamily:T.font }}>Cole no teu site externo. Submissões viram leads automaticamente.</p>

          <div style={{ marginBottom:18 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <span style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase" }}>URL pública</span>
              <button onClick={() => copy(linkCode)} style={{ fontSize:11, fontWeight:700, color:T.teal, background:"none", border:"none", cursor:"pointer" }}>Copiar</button>
            </div>
            <pre style={{ background:"#0f172a", color:"#7dd3fc", padding:"10px 14px", borderRadius:8, fontFamily:T.mono, fontSize:11, margin:0, overflow:"auto" }}>{linkCode}</pre>
          </div>

          <div style={{ marginBottom:18 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <span style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase" }}>Iframe (recomendado)</span>
              <button onClick={() => copy(iframeCode)} style={{ fontSize:11, fontWeight:700, color:T.teal, background:"none", border:"none", cursor:"pointer" }}>Copiar</button>
            </div>
            <pre style={{ background:"#0f172a", color:"#7dd3fc", padding:"10px 14px", borderRadius:8, fontFamily:T.mono, fontSize:11, margin:0, overflow:"auto", whiteSpace:"pre-wrap" }}>{iframeCode}</pre>
          </div>

          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <span style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase" }}>Script JS</span>
              <button onClick={() => copy(scriptCode)} style={{ fontSize:11, fontWeight:700, color:T.teal, background:"none", border:"none", cursor:"pointer" }}>Copiar</button>
            </div>
            <pre style={{ background:"#0f172a", color:"#7dd3fc", padding:"10px 14px", borderRadius:8, fontFamily:T.mono, fontSize:11, margin:0, overflow:"auto", whiteSpace:"pre-wrap" }}>{scriptCode}</pre>
          </div>
        </div>

        <div style={{ padding:"14px 22px", borderTop:`1px solid ${T.border}`, display:"flex", justifyContent:"flex-end" }}>
          <Btn variant="primary" onClick={onClose}>Fechar</Btn>
        </div>
      </div>
    </div>
  );
};

export default function VantariLandingPages() {
  const [pages,       setPages]   = useState(DB.pages);
  const [editingPage, setEditing] = useState(null);
  const [showNew,     setShowNew] = useState(false);
  const [libraryTplId, setLibraryTplId] = useState(null);
  const [search,      setSearch]  = useState("");
  const [filterStatus,setFilter]  = useState("all");
  const [toast,       setToast]   = useState(null);
  const [landingSpark, setLandingSpark] = useState({ pages: [], visitors: [], leads: [], conv: [] });
  const [viewMode, setViewMode] = useState("pages");  // "pages" | "forms"

  useEffect(() => {
    const loadSpark = async () => {
      const sevenAgo = new Date();
      sevenAgo.setMonth(sevenAgo.getMonth() - 7);
      const { data } = await supabase.from("form_submissions").select("created_at").gte("created_at", sevenAgo.toISOString());
      const now = new Date();
      const buckets = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1);
        return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, count: 0 };
      });
      (data || []).forEach(r => {
        const d = new Date(r.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const b = buckets.find(m => m.key === key);
        if (b) b.count++;
      });
      const counts = buckets.map(b => b.count);
      setLandingSpark({ pages: counts, visitors: counts, leads: counts, conv: counts });
    };
    loadSpark();
  }, []);

  const showToast = (msg,type="success") => { setToast({msg,type});setTimeout(()=>setToast(null),3200); };

  const filteredPages = useMemo(()=>pages.filter(p=>{
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())||p.url_slug.includes(search.toLowerCase());
    const matchStatus = filterStatus==="all"||p.status===filterStatus;
    return matchSearch&&matchStatus;
  }),[pages,search,filterStatus]);

  const totalVisitors  = pages.reduce((a,p)=>a+p.metrics.visitors,0);
  const totalLeads     = pages.reduce((a,p)=>a+p.metrics.leads,0);
  const avgConv        = pages.filter(p=>p.metrics.visitors>0).reduce((a,p,_,arr)=>a+p.metrics.convRate/arr.length,0).toFixed(1);
  const publishedCount = pages.filter(p=>p.status==="published").length;

  if(editingPage) return (
    <PageBuilder
      page={editingPage}
      onSave={updated=>{ setPages(ps=>ps.map(p=>p.id===updated.id?updated:p));showToast("Página salva com sucesso!"); }}
      onBack={()=>setEditing(null)}
    />
  );

  return (
    <div style={{display:"flex",height:"100vh",background:T.bg,fontFamily:T.font,overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');
        *, *::before, *::after { box-sizing:border-box; }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-thumb { background:#B3BFCA; border-radius:99px; }
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
          <NavItem icon={BarChart2}      label="Analytics"      path="/dashboard"    />
          <NavItem icon={Users}          label="Leads"          path="/leads"        />
          <NavItem icon={Mail}           label="Email Marketing" path="/email"       />
          <NavSection label="Ferramentas" />
          <NavItem icon={Star}           label="Scoring"        path="/scoring"      />
          <NavItem icon={LayoutTemplate} label="Landing Pages"  path="/landing" active />
          <NavItem icon={Bot}            label="IA & Automação" path="/ai-marketing" />
          <NavSection label="Sistema" />
          <NavItem icon={Plug}           label="Integrações"    path="/integrations" />
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "8px 0", position: "relative" }}>
          <NavItem icon={Settings} label="Configurações" path="/settings" />
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* Toast */}
        {toast&&(
          <div style={{position:"fixed",top:20,right:20,zIndex:9999,padding:"12px 18px",borderRadius:10,background:toast.type==="success"?"#f0fdf7":"#fef2f2",border:`0.5px solid ${toast.type==="success"?"#6ee7b7":"#fecaca"}`,color:toast.type==="success"?"#065f46":T.red,fontSize:13,fontWeight:700,fontFamily:T.font,boxShadow:T.shadowMd,display:"flex",alignItems:"center",gap:8}}>
            <Ico d={IC.check} size={14} color={toast.type==="success"?"#065f46":T.red}/>
            {toast.msg}
          </div>
        )}

        {/* Topbar */}
        <div style={{height:52,background:T.surface,borderBottom:`0.5px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px",flexShrink:0}}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <span style={{fontSize:15,fontWeight:700,color:T.text,fontFamily:T.head,letterSpacing:"-0.01em"}}>
              {viewMode === "pages" ? "Landing Pages" : viewMode === "forms" ? "Formulários" : "Biblioteca Vantari"}
            </span>
            <div style={{ display:"flex", gap:2, background:T.faint, padding:3, borderRadius:8, border:`0.5px solid ${T.border}` }}>
              <button onClick={() => setViewMode("pages")}
                style={{ padding:"5px 12px", borderRadius:6, border:"none", cursor:"pointer", fontSize:11, fontWeight:700, fontFamily:T.font,
                         background: viewMode === "pages" ? T.surface : "transparent",
                         color: viewMode === "pages" ? T.text : T.muted,
                         boxShadow: viewMode === "pages" ? T.shadow : "none" }}>
                Páginas
              </button>
              <button onClick={() => setViewMode("forms")}
                style={{ padding:"5px 12px", borderRadius:6, border:"none", cursor:"pointer", fontSize:11, fontWeight:700, fontFamily:T.font,
                         background: viewMode === "forms" ? T.surface : "transparent",
                         color: viewMode === "forms" ? T.text : T.muted,
                         boxShadow: viewMode === "forms" ? T.shadow : "none" }}>
                Formulários
              </button>
              <button onClick={() => setViewMode("biblioteca")}
                style={{ padding:"5px 12px", borderRadius:6, border:"none", cursor:"pointer", fontSize:11, fontWeight:700, fontFamily:T.font,
                         background: viewMode === "biblioteca" ? T.surface : "transparent",
                         color: viewMode === "biblioteca" ? T.text : T.muted,
                         boxShadow: viewMode === "biblioteca" ? T.shadow : "none" }}>
                Biblioteca
              </button>
            </div>
          </div>
          {viewMode === "pages" && (
            <Btn variant="primary" icon={IC.plus} size="md" onClick={()=>setShowNew(true)}>Nova página</Btn>
          )}
        </div>

        {/* Content */}
        <div style={{flex:1,overflowY:"auto",padding:"24px 28px",background:"linear-gradient(180deg, #EEFCF7 0%, #E6FAF0 100%)"}}>
          {viewMode === "forms" && <FormsManager />}
          {viewMode === "biblioteca" && <LibraryView onUse={(tplId) => { setLibraryTplId(tplId); setViewMode("pages"); setShowNew(true); }} />}
          {viewMode === "pages" && (<>
          {/* Hero KPI strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
            <HeroKpiCard
              icon={IC.globe}  color={T.blue}  trend={0}
              label="Páginas Publicadas"
              value={publishedCount}
              sub={`de ${pages.length} total`}
              sparkData={landingSpark.pages}
            />
            <HeroKpiCard
              icon={IC.eye}    color={T.teal}  trend={0}
              label="Total de Visitantes"
              value={fmtNum(totalVisitors)}
              sub="todas as páginas"
              sparkData={landingSpark.visitors}
            />
            <HeroKpiCard
              icon={IC.form}   color={T.green} trend={0}
              label="Total de Leads"
              value={fmtNum(totalLeads)}
              sub="conversões geradas"
              sparkData={landingSpark.leads}
            />
            <HeroKpiCard
              icon={IC.chart}  color={T.amber} trend={0}
              label="Conv. Média"
              value={`${avgConv}%`}
              sub="entre publicadas"
              sparkData={landingSpark.conv}
            />
          </div>

          {/* Filters */}
          <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap",alignItems:"center"}}>
            <div style={{position:"relative",flex:1,minWidth:220}}>
              <Ico d={IC.eye} size={14} color={T.muted} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)"}}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nome ou URL..."
                style={{width:"100%",padding:"8px 10px 8px 32px",borderRadius:8,border:`1px solid ${T.border}`,fontSize:13,fontWeight:600,fontFamily:T.font,color:T.text,background:T.surface,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div style={{display:"flex",gap:4,background:T.surface,padding:4,borderRadius:10,border:`0.5px solid ${T.border}`}}>
              {[["all","Todas"],["published","Publicadas"],["draft","Rascunhos"],["paused","Pausadas"]].map(([v,l])=>(
                <button key={v} onClick={()=>setFilter(v)}
                  style={{padding:"5px 12px",borderRadius:7,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:T.font,background:filterStatus===v?T.blue:"transparent",color:filterStatus===v?"#fff":T.muted,transition:"all .15s"}}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {filteredPages.length===0?(
            <div style={{textAlign:"center",padding:"64px 24px",color:T.muted}}>
              <Ico d={IC.layout} size={40} color={T.border}/>
              <div style={{fontSize:16,fontWeight:700,color:T.text,marginTop:16,fontFamily:T.head}}>{search?"Nenhuma página encontrada":"Nenhuma landing page ainda"}</div>
              <div style={{fontSize:13,fontWeight:600,color:T.muted,marginTop:6,fontFamily:T.font}}>{search?"Tente outro termo de busca.":"Clique em \"Nova página\" para criar sua primeira landing page."}</div>
              {!search&&<div style={{marginTop:16}}><Btn variant="primary" icon={IC.plus} onClick={()=>setShowNew(true)}>Criar primeira página</Btn></div>}
            </div>
          ):(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:18}}>
              {filteredPages.map(page=>(
                <PageCard key={page.id} page={page}
                  onEdit={()=>setEditing(page)}
                  onClone={()=>{const clone={...page,id:`pg_${uid()}`,name:`${page.name} (cópia)`,url_slug:`${page.url_slug}-copia`,status:"draft",sections:page.sections.map(s=>({...s,id:`s${uid()}`})),metrics:{visitors:0,leads:0,convRate:0,avgTime:"—"},created_at:new Date().toISOString()};setPages(ps=>[...ps,clone]);showToast(`"${clone.name}" criada com sucesso!`);}}
                  onDelete={()=>{if(window.confirm(`Excluir "${page.name}"?`)){setPages(ps=>ps.filter(p=>p.id!==page.id));showToast("Página excluída.","error");}}}
                />
              ))}
            </div>
          )}

          {/* DB schema */}
          <div style={{marginTop:36,padding:"16px 20px",background:T.surface,borderRadius:12,border:`0.5px solid ${T.border}`}}>
            <div style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:".06em",marginBottom:10}}>Schema Supabase</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
              {[
                {table:"landing_pages",   cols:["id","name","content[]","url_slug","status","seo{}","og{}","pixels{}","ab_test{}","metrics{}","created_at"]},
                {table:"forms",           cols:["id","name","slug","fields[]","success_msg","tags[]","active","submission_count"]},
                {table:"form_submissions",cols:["id","form_id","lead_id","payload{}","utm_source","created_at"]},
              ].map(({table,cols})=>(
                <div key={table} style={{background:T.faint,borderRadius:8,padding:"10px 12px"}}>
                  <div style={{fontSize:12,fontWeight:700,color:T.blue,marginBottom:6,fontFamily:"monospace"}}>{table}</div>
                  {cols.map(c=><div key={c} style={{fontSize:11,fontWeight:600,color:T.muted,fontFamily:"monospace",marginBottom:2}}>— {c}</div>)}
                </div>
              ))}
            </div>
          </div>
          </>)}
        </div>
      </div>

      {showNew&&<NewPageModal libraryTpl={libraryTplId ? LIBRARY_LP_TEMPLATES.find(t=>t.id===libraryTplId) : null} onClose={()=>{setShowNew(false);setLibraryTplId(null);}} onCreate={newPage=>{setPages(ps=>[newPage,...ps]);setShowNew(false);setLibraryTplId(null);setEditing(newPage);showToast(`"${newPage.name}" criada! Edite as seções.`);}}/>}
    </div>
  );
}
