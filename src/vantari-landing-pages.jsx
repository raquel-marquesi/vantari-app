import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  blue:    "#0079a9",
  teal:    "#0079a9",
  green:   "#05b27b",
  amber:   "#e07b00",
  red:     "#ef4444",
  purple:  "#6d45d9",
  bg:      "#f2f5f8",
  surface: "#ffffff",
  border:  "#e2e8f0",
  border2: "#edf0f4",
  text:    "#5f5f64",
  muted:   "#888891",
  faint:   "#f8fafc",
  font:    "'Aptos', 'Nunito Sans', sans-serif",
  head:    "'Montserrat', sans-serif",
  shadow:   "0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)",
  shadowMd: "0 4px 16px rgba(0,0,0,.07), 0 2px 6px rgba(0,0,0,.04)",
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

const seedPages = () => [
  { id:"pg_1",name:"Webinar: Marketing com IA",   url_slug:"webinar-marketing-ia",    status:"published",template:"webinar",   sections:TEMPLATES.webinar.sections.map((s,i)=>({...s,id:`s${i}`})),   seo:{title:"Webinar Gratuito — Marketing com IA | Vantari",   description:"Aprenda a escalar seu marketing com inteligência artificial.",keywords:"marketing digital, IA, webinar"},og:{title:"Webinar: Marketing com IA",   description:"Inscreva-se gratuitamente",image:""},pixels:{fbPixel:"1234567890",ga4:"G-XXXXXXX",gtm:""},abTest:{enabled:true, variantName:"B — Headline Alternativa",variantSections:null,variantTraffic:50},metrics:{visitors:3840,leads:892, convRate:23.2,avgTime:"2m 14s"},created_at:new Date(Date.now()-25*864e5).toISOString() },
  { id:"pg_2",name:"eBook: Guia de Lead Generation",url_slug:"ebook-lead-generation",  status:"published",template:"ebook",    sections:TEMPLATES.ebook.sections.map((s,i)=>({...s,id:`s${i}`})),    seo:{title:"eBook Grátis: Lead Generation 2025 | Vantari", description:"Guia completo com 15 estratégias.",keywords:"lead generation, ebook"},og:{title:"eBook Grátis: Lead Generation",description:"Baixe agora",             image:""},pixels:{fbPixel:"",        ga4:"G-XXXXXXX",gtm:"GTM-XXXXX"},abTest:{enabled:false,variantName:"",              variantSections:null,variantTraffic:50},metrics:{visitors:6120,leads:2143,convRate:35.0,avgTime:"3m 42s"},created_at:new Date(Date.now()-45*864e5).toISOString() },
  { id:"pg_3",name:"Trial Gratuito 14 Dias",       url_slug:"trial-14-dias",           status:"published",template:"trial",    sections:TEMPLATES.trial.sections.map((s,i)=>({...s,id:`s${i}`})),    seo:{title:"Teste Grátis 14 Dias — Plataforma de Marketing | Vantari",description:"Automatize seu marketing.",keywords:"plataforma marketing, automação"},og:{title:"Teste Grátis: Vantari",   description:"14 dias sem cartão",      image:""},pixels:{fbPixel:"9876543210",ga4:"G-XXXXXXX",gtm:"GTM-XXXXX"},abTest:{enabled:false,variantName:"",              variantSections:null,variantTraffic:50},metrics:{visitors:9810,leads:1547,convRate:15.8,avgTime:"4m 20s"},created_at:new Date(Date.now()-60*864e5).toISOString() },
  { id:"pg_4",name:"Newsletter Semanal",            url_slug:"newsletter",              status:"draft",    template:"newsletter",sections:TEMPLATES.newsletter.sections.map((s,i)=>({...s,id:`s${i}`})),seo:{title:"Newsletter de Marketing Digital | Vantari",      description:"Receba dicas semanais.",    keywords:"newsletter, marketing"},  og:{title:"Newsletter Vantari",     description:"Insights toda semana",    image:""},pixels:{fbPixel:"",        ga4:"",           gtm:""},      abTest:{enabled:false,variantName:"",              variantSections:null,variantTraffic:50},metrics:{visitors:0,    leads:0,   convRate:0,   avgTime:"—"},    created_at:new Date(Date.now()-2*864e5).toISOString()  },
];

const seedVisits  = (pageId) => Array.from({length:14},(_,i)=>{ const d=new Date();d.setDate(d.getDate()-(13-i));return{date:d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"}),visitors:rand(80,600),leads:rand(10,150)};});
const seedSources = () => [{source:"Google Ads",visitors:4820,pct:38},{source:"Orgânico",visitors:2900,pct:23},{source:"Meta Ads",visitors:2560,pct:20},{source:"Email",visitors:1530,pct:12},{source:"Direto",visitors:760,pct:6},{source:"Social",visitors:180,pct:1}];
const seedDevices = () => [{device:"Mobile",pct:62,color:T.blue},{device:"Desktop",pct:30,color:T.teal},{device:"Tablet",pct:8,color:T.green}];

const DB = { pages:seedPages(), visits:{}, sources:seedSources(), devices:seedDevices() };

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
  published:{ bg:"#f0fdf7",text:"#065f46",border:"#6ee7b7",label:"Publicada" },
  draft:    { bg:"#fff4e6",text:"#92400e",border:"#f5c78a",label:"Rascunho"  },
  paused:   { bg:"#f1f5f9",text:"#475569",border:"#cbd5e1",label:"Pausada"   },
};

/* ═══════════════════════════════════════════════════════════════════════
   MINI COMPONENTS
════════════════════════════════════════════════════════════════════════ */
const Btn = ({ children, onClick, variant="primary", size="md", icon, disabled, style:extra={} }) => {
  const [hov,setHov] = useState(false);
  const styles = {
    primary:   {bg:T.blue,    fg:"#fff",    hbg:"#006a93", border:T.blue    },
    secondary: {bg:T.surface, fg:T.text,    hbg:T.border2, border:T.border  },
    ghost:     {bg:"transparent",fg:T.muted,hbg:T.border2, border:"transparent"},
    danger:    {bg:"#fef2f2", fg:T.red,     hbg:"#fee2e2", border:"#fecaca" },
    success:   {bg:"#f0fdf7", fg:"#065f46", hbg:"#d1fae5", border:"#6ee7b7" },
    teal:      {bg:T.teal,    fg:"#fff",    hbg:"#006a93", border:T.teal    },
  };
  const s   = styles[variant]||styles.primary;
  const pad = size==="sm"?"5px 10px":size==="lg"?"10px 22px":"7px 15px";
  const fs  = size==="sm"?12:size==="lg"?15:13;
  return (
    <button disabled={disabled} onClick={onClick}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{display:"inline-flex",alignItems:"center",gap:6,padding:pad,fontSize:fs,fontWeight:700,fontFamily:T.font,borderRadius:8,border:`1px solid ${s.border}`,cursor:disabled?"not-allowed":"pointer",background:hov&&!disabled?s.hbg:s.bg,color:s.fg,transition:"all .15s",opacity:disabled?.5:1,...extra}}>
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

/* Toggle — verde #05b27b quando ativo */
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

/* NavSection / NavItem */
const NavSection = ({ label }) => (
  <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",color:"rgba(255,255,255,0.45)",padding:"10px 20px 4px",textTransform:"uppercase",fontFamily:T.head}}>{label}</div>
);
const NavItem = ({ icon:Icon, label, active=false, path }) => {
  const [hov,setHov] = useState(false);
  const navigate = useNavigate();
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={() => path && navigate(path)}
      style={{display:"flex",alignItems:"center",gap:9,padding:"8px 20px",fontSize:13,fontWeight:active?700:600,fontFamily:T.font,color:active?"#fff":hov?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.6)",background:active?"rgba(255,255,255,0.18)":hov?"rgba(255,255,255,0.08)":"transparent",borderRight:active?"2px solid #fff":"2px solid transparent",cursor:"pointer",transition:"all 0.15s",userSelect:"none"}}>
      {Icon&&<Icon size={16} aria-hidden="true"/>}{label}
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
    <div style={{...base,background:"#fff",padding:"12px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`1px solid #e2e8f0`}}>
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
              const col=heat>.7?"#ef4444":heat>.5?"#f97316":heat>.3?"#fbbf24":heat>.15?"#86efac":"#dbeafe";
              return <div key={i} style={{aspectRatio:"1",borderRadius:3,background:col,opacity:.8+heat*.2}}/>;
            })}
          </div>
          <div style={{display:"flex",gap:6,marginTop:8,alignItems:"center"}}>
            {["#dbeafe","#86efac","#fbbf24","#f97316","#ef4444"].map((c,i)=><div key={i} style={{width:16,height:8,borderRadius:2,background:c}}/>)}
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
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700&family=Nunito+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing:border-box; }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-thumb { background:${T.border}; border-radius:3px; }
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

const NewPageModal = ({ onClose, onCreate }) => {
  const [name,     setName]     = useState("");
  const [template, setTemplate] = useState("trial");

  const handleCreate = () => {
    if(!name.trim()) return;
    const slug = name.toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"");
    const tpl  = TEMPLATES[template];
    onCreate({ id:`pg_${uid()}`, name:name.trim(), url_slug:slug, status:"draft", template, sections:tpl.sections.map((s,i)=>({...s,id:`s${uid()}${i}`})), seo:{title:name,description:"",keywords:""}, og:{title:name,description:"",image:""}, pixels:{fbPixel:"",ga4:"",gtm:""}, abTest:{enabled:false,variantName:"",variantSections:null,variantTraffic:50}, metrics:{visitors:0,leads:0,convRate:0,avgTime:"—"}, created_at:new Date().toISOString() });
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

        <div style={{marginBottom:16}}>
          <Input label="Nome da página" value={name} onChange={setName} placeholder="Ex: Webinar de Marketing Digital"/>
        </div>

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
   MAIN MODULE
════════════════════════════════════════════════════════════════════════ */
export default function VantariLandingPages() {
  const [pages,       setPages]   = useState(DB.pages);
  const [editingPage, setEditing] = useState(null);
  const [showNew,     setShowNew] = useState(false);
  const [search,      setSearch]  = useState("");
  const [filterStatus,setFilter]  = useState("all");
  const [toast,       setToast]   = useState(null);

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
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700&family=Nunito+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing:border-box; }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-thumb { background:${T.border}; border-radius:3px; }
      `}</style>

      {/* ── SIDEBAR — iconrs.png embutido */}
      <div style={{width:220,background:"#0079a9",display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"16px 20px 14px",borderBottom:"1px solid rgba(255,255,255,0.12)",display:"flex",alignItems:"center"}}>
          <img src="iconrs.png" alt="Vantari" style={{height:28,width:"auto"}}/>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"8px 0"}}>
          <NavSection label="Principal"/>
          <NavItem icon={BarChart2}      label="Analytics" path="/dashboard"        />
          <NavItem icon={Users}          label="Leads" path="/leads"            />
          <NavItem icon={Mail}           label="Email Marketing" path="/email"  />
          <NavSection label="Ferramentas"/>
          <NavItem icon={Star}           label="Scoring" path="/scoring"          />
          <NavItem icon={LayoutTemplate} label="Landing Pages" path="/landing" active/>
          <NavItem icon={Bot}            label="IA & Automação" path="/ai-marketing"   />
          <NavSection label="Sistema"/>
          <NavItem icon={Plug}           label="Integrações" path="/integrations"      />
        </div>
        <div style={{borderTop:"1px solid rgba(255,255,255,0.12)",padding:"8px 0"}}>
          <NavItem icon={Settings} label="Configurações" path="/settings"/>
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
          <span style={{fontSize:15,fontWeight:700,color:T.text,fontFamily:T.head,letterSpacing:"-0.01em"}}>Landing Pages</span>
          <Btn variant="primary" icon={IC.plus} size="md" onClick={()=>setShowNew(true)}>Nova página</Btn>
        </div>

        {/* Content */}
        <div style={{flex:1,overflowY:"auto",padding:"24px 28px"}}>
          {/* KPI strip */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
            <MetricCard label="Páginas publicadas" value={publishedCount}        sub={`de ${pages.length} total`}   icon={IC.globe}  color={T.blue}  />
            <MetricCard label="Total visitantes"   value={fmtNum(totalVisitors)} sub="Todas as páginas"              icon={IC.eye}    color={T.teal}  />
            <MetricCard label="Total leads"        value={fmtNum(totalLeads)}    sub="Conversões geradas"            icon={IC.form}   color={T.green} />
            <MetricCard label="Conv. média"        value={`${avgConv}%`}         sub="Média entre publicadas"        icon={IC.chart}  color={T.amber} />
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
                {table:"page_visits",     cols:["id","page_id","visitor_id","session_id","referrer","utm_source","device","country","timestamp"]},
                {table:"page_conversions",cols:["id","page_id","lead_id","form_data{}","variant","converted_at","source"]},
              ].map(({table,cols})=>(
                <div key={table} style={{background:T.faint,borderRadius:8,padding:"10px 12px"}}>
                  <div style={{fontSize:12,fontWeight:700,color:T.blue,marginBottom:6,fontFamily:"monospace"}}>{table}</div>
                  {cols.map(c=><div key={c} style={{fontSize:11,fontWeight:600,color:T.muted,fontFamily:"monospace",marginBottom:2}}>— {c}</div>)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showNew&&<NewPageModal onClose={()=>setShowNew(false)} onCreate={newPage=>{setPages(ps=>[newPage,...ps]);setShowNew(false);setEditing(newPage);showToast(`"${newPage.name}" criada! Edite as seções.`);}}/>}
    </div>
  );
}
