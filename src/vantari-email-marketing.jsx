import { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart2, Users, Mail, LayoutTemplate, Bot, Plug, Star,
  Settings, Layout, AlignLeft, Image, MousePointerClick,
  Columns2, Minus, ArrowUpDown, PanelBottom, GripVertical,
  Pencil, Save, Send, Calendar, RefreshCw, Zap, FlaskConical,
  Search, Plus, Copy, Trash2, Download, ChevronLeft,
  Monitor, Tablet, Smartphone, Tag, Newspaper, FileText,
  CornerDownRight, Lightbulb, TrendingUp, MailOpen, Link2,
  AlertTriangle, XCircle, ArrowUp, ArrowDown, X,
  Loader2, AlertCircle, Upload
} from "lucide-react";
import { IdCard } from "lucide-react";
import { Briefcase } from "lucide-react";
import { supabase } from "./supabase";

/* ═══════════════════════════════════════════════════
   DESIGN TOKENS
═══════════════════════════════════════════════════ */
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
  white:   "#FFFFFF",
  border:  "#E8EEF3",
  border2: "#E8EEF3",

  // Ink scale (text)
  ink:     "#0E1A24",
  text:    "#2E3D4B",
  muted:   "#5A6B7A",
  faint3:  "#8696A5",
  faint:   "#F5F8FB",

  // Legacy compat aliases
  blueL:   "#E0F2F8",

  // Fonts
  font:    "'Inter', system-ui, sans-serif",
  head:    "'Sora', system-ui, sans-serif",
  sans:    "'Inter', system-ui, sans-serif",
  mono:    "'JetBrains Mono', monospace",
};

/* ═══════════════════════════════════════════════════
   SEED DATA
═══════════════════════════════════════════════════ */
const STATUS_META = {
  draft:     { label:"Rascunho", color:"#5A6B7A", bg:"#EEF2F6" },
  scheduled: { label:"Agendada", color:"#F59E0B", bg:"#FEF3C7" },
  sending:   { label:"Enviando", color:"#0D7491", bg:"#E0F2F8" },
  sent:      { label:"Enviada",  color:"#14A273", bg:"#ECFDF5" },
  failed:    { label:"Falhou",   color:"#FF6B5E", bg:"#FEF2F2" },
};


const TEMPLATES = [
  { id:"editorial",    name:"Newsletter Editorial",     category:"newsletter",    desc:"Hero, TL;DR, artigo com 1 CTA primário + depoimento.", blocks:[
    {id:"b1",type:"header", content:{logo:true,headline:"Vantari Insights",subline:""}},
    {id:"b2",type:"text",   content:{text:"*|PRIMEIRO_NOME|*, você sabia que antecipar seu crédito trabalhista não gera dívida?\n\nNo empréstimo, você contrai um passivo e paga juros. Na antecipação, você vende um ativo que já existe.",align:"left"}},
    {id:"b3",type:"divider",content:{}},
    {id:"b4",type:"button", content:{text:"Ler artigo completo",url:"#",align:"left",color:"#0D7491"}},
    {id:"b5",type:"footer", content:{text:"© Vantari · Descadastrar"}},
  ]},
  { id:"compare",      name:"Comparativo lado a lado",  category:"conversion",    desc:"Grid 2 colunas: Antecipação vs Empréstimo + KPIs.", blocks:[
    {id:"b1",type:"header", content:{logo:true,headline:"",subline:""}},
    {id:"b2",type:"text",   content:{text:"*|PRIMEIRO_NOME|*, sua dívida pode ter outra saída.\n\nSe você tem um processo trabalhista correndo, já existe um valor seu esperando.",align:"left"}},
    {id:"b3",type:"button", content:{text:"Simular antecipação",url:"#",align:"left",color:"#14A273"}},
    {id:"b4",type:"footer", content:{text:"© Vantari · Descadastrar"}},
  ]},
  { id:"offer",        name:"Oferta qualificada",       category:"segmented",     desc:"Card escuro premium com bullets e CTA de agendamento.", blocks:[
    {id:"b1",type:"header", content:{logo:true,headline:"",subline:""}},
    {id:"b2",type:"text",   content:{text:"*|PRIMEIRO_NOME|*, seu processo se qualifica para uma condição especial.\n\nApós análise, identificamos que seu processo atende aos critérios da nossa linha premium.",align:"left"}},
    {id:"b3",type:"button", content:{text:"Agendar análise com especialista →",url:"#",align:"left",color:"#14A273"}},
    {id:"b4",type:"footer", content:{text:"© Vantari · Descadastrar destas ofertas"}},
  ]},
  { id:"welcome",      name:"Boas-vindas / Onboarding", category:"onboarding",    desc:"Stepper 3 passos + TL;DR 'o que você nunca terá'.", blocks:[
    {id:"b1",type:"header", content:{logo:true,headline:"",subline:""}},
    {id:"b2",type:"text",   content:{text:"Oi, *|PRIMEIRO_NOME|*. Que bom ter você aqui.\n\nVocê acabou de entrar para a base de mais de 12 mil pessoas que descobriram que dá pra transformar um processo trabalhista em dinheiro.",align:"left"}},
    {id:"b3",type:"button", content:{text:"Simular meu processo agora",url:"#",align:"left",color:"#0D7491"}},
    {id:"b4",type:"footer", content:{text:"© Vantari · Descadastrar"}},
  ]},
  { id:"transactional",name:"Atualização de status",    category:"transactional", desc:"Payout box + Timeline 5 etapas. Disparo via API.", blocks:[
    {id:"b1",type:"header", content:{logo:true,headline:"",subline:""}},
    {id:"b2",type:"text",   content:{text:"*|PRIMEIRO_NOME|*, sua proposta foi aprovada.\n\nA análise jurídica e financeira do seu processo terminou. Você pode revisar a proposta e assinar pelo nosso portal.",align:"left"}},
    {id:"b3",type:"button", content:{text:"Ver proposta completa",url:"#",align:"left",color:"#0D7491"}},
    {id:"b4",type:"footer", content:{text:"© Vantari · E-mail transacional"}},
  ]},
];

const mkTimelineData = () => Array.from({length:24},(_,i)=>({
  hour:i, opens:Math.floor(Math.random()*180+(i>=8&&i<=20?80:10)), clicks:Math.floor(Math.random()*60+(i>=8&&i<=20?30:5)),
}));

/* ═══════════════════════════════════════════════════
   CAMPAIGN TYPE ICONS
═══════════════════════════════════════════════════ */
const TYPE_ICONS = { newsletter:Newspaper, promotional:Tag, "follow-up":CornerDownRight, event:Calendar, reactivation:RefreshCw };
const TypeIcon = ({ type, size=16, color="#fff" }) => {
  const TI = TYPE_ICONS[type] || Mail;
  return <TI size={size} color={color} aria-hidden="true"/>;
};

/* ═══════════════════════════════════════════════════
   SHARED UI PRIMITIVES
═══════════════════════════════════════════════════ */
const Btn = ({ children, onClick, variant="primary", size="md", icon:Icon, disabled, full, style:sx={} }) => {
  const [hov,setHov] = useState(false);
  const v = {
    primary:   {
      bg: hov
        ? "linear-gradient(135deg, #0A5F7A 0%, #108A60 100%)"
        : "linear-gradient(135deg, #0D7491 0%, #14A273 100%)",
      color: "#fff", border: "none",
      shadow: hov ? "0 8px 22px -6px rgba(13,116,145,.5)" : "0 4px 14px -4px rgba(13,116,145,.4)",
    },
    secondary: { bg:hov?`${T.teal}14`:T.white, color:T.teal, border:`1.5px solid ${hov?T.teal:T.border}`, shadow:"none" },
    ghost:     { bg:hov?"#EEF2F6":"transparent", color:T.text, border:"none", shadow:"none" },
    danger:    { bg:hov?"#e04d42":T.coral, color:"#fff", border:"none", shadow:"none" },
    ink:       { bg:hov?"#1A2D3B":T.ink, color:"#fff", border:"none", shadow:"none" },
    success:   { bg:hov?"#108A60":T.green, color:"#fff", border:"none", shadow:"none" },
  }[variant]||{};
  const pad = {xs:"4px 9px",sm:"6px 13px",md:"9px 18px",lg:"12px 26px"}[size]||"9px 18px";
  const fs  = {xs:10,sm:12,md:13,lg:14}[size]||13;
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{display:"inline-flex",alignItems:"center",gap:7,padding:pad,fontSize:fs,fontFamily:T.font,fontWeight:700,borderRadius:10,border:v.border||"none",background:v.bg,color:v.color,boxShadow:v.shadow,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.5:1,transition:"all 0.15s",width:full?"100%":"auto",justifyContent:full?"center":"flex-start",transform:hov&&variant==="primary"?"translateY(-1px)":"none",...sx}}>
      {Icon&&<Icon size={fs} aria-hidden="true"/>}{children}
    </button>
  );
};

const Field = ({ label, value, onChange, placeholder, type="text", small, mono, children, style:sx={} }) => {
  const [foc,setFoc] = useState(false);
  return (
    <div style={sx}>
      {label&&<label style={{display:"block",fontFamily:T.font,fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:5}}>{label}</label>}
      {children||<input type={type} value={value} onChange={onChange} placeholder={placeholder}
        onFocus={()=>setFoc(true)} onBlur={()=>setFoc(false)}
        style={{width:"100%",boxSizing:"border-box",padding:small?"6px 10px":"10px 13px",fontFamily:mono?T.mono:T.font,fontSize:small?12:13,fontWeight:600,border:`1px solid ${foc?T.blue:T.border}`,borderRadius:8,outline:"none",background:T.white,color:T.ink,transition:"border-color 0.15s",boxShadow:foc?`0 0 0 3px ${T.blue}18`:"none"}}/>}
    </div>
  );
};

const Badge = ({ label, color="#5A6B7A", bg="#EEF2F6", dot }) => (
  <span style={{display:"inline-flex",alignItems:"center",gap:5,fontFamily:T.font,fontSize:11,fontWeight:700,color,background:bg,padding:"3px 9px",borderRadius:20}}>
    {dot&&<span style={{width:6,height:6,borderRadius:"50%",background:color,display:"inline-block"}}/>}{label}
  </span>
);

const MetricPill = ({ label, value, sub, color=T.blue, icon:Icon }) => (
  <div style={{background:T.surface,border:`1px solid ${T.border}`,borderLeft:`3px solid ${color}`,borderRadius:14,padding:"12px 14px",boxShadow:"0 1px 0 rgba(14,26,36,.03), 0 8px 24px -16px rgba(14,26,36,.08)"}}>
    <div style={{fontFamily:T.font,fontSize:10,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6,display:"flex",alignItems:"center",gap:5}}>
      {Icon&&<Icon size={11} color={color} aria-hidden="true"/>}{label}
    </div>
    <div style={{fontFamily:T.head,fontSize:22,fontWeight:700,color,lineHeight:1}}>{value}</div>
    {sub&&<div style={{fontFamily:T.font,fontSize:11,color:T.muted,marginTop:4,fontWeight:600}}>{sub}</div>}
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

/* ═══════════════════════════════════════════════════
   EMAIL BUILDER BLOCKS RENDERER
═══════════════════════════════════════════════════ */
const renderBlock = (block, leadName="{{lead.name}}") => {
  const b = block.content||{};
  switch(block.type) {
    case "header": return (
      <div style={{background:`linear-gradient(135deg,${T.blue},${T.teal})`,padding:"32px 40px",textAlign:"center"}}>
        {b.logo&&<div style={{fontFamily:T.head,fontSize:18,fontWeight:700,color:"#fff",letterSpacing:"0.1em",marginBottom:b.headline?12:0}}>VANTARI</div>}
        {b.headline&&<div style={{fontFamily:T.head,fontSize:24,fontWeight:700,color:"#fff",letterSpacing:"-0.01em"}}>{b.headline}</div>}
        {b.subline&&<div style={{fontFamily:T.font,fontSize:13,fontWeight:600,color:"rgba(255,255,255,0.75)",marginTop:6}}>{b.subline}</div>}
      </div>
    );
    case "text": return (
      <div style={{padding:"24px 40px",textAlign:b.align||"left"}}>
        {b.text?.split("\n").map((line,i)=>(
          <p key={i} style={{margin:"0 0 10px",fontFamily:T.font,fontSize:14,fontWeight:600,lineHeight:1.7,color:T.ink}}>
            {line.replace("{{lead.name}}",leadName)||"\u00a0"}
          </p>
        ))}
      </div>
    );
    case "image": return (
      <div style={{padding:"0 40px"}}>
        <div style={{background:T.border2,borderRadius:8,height:180,display:"flex",alignItems:"center",justifyContent:"center",color:T.muted,fontFamily:T.font,fontSize:13,fontWeight:600,gap:8}}>
          {b.src?<img src={b.src} style={{width:"100%",borderRadius:8}} alt=""/>:<><Image size={20} color={T.muted} aria-hidden="true"/> Imagem</>}
        </div>
        {b.caption&&<p style={{fontFamily:T.font,fontSize:11,fontWeight:600,color:T.muted,textAlign:"center",marginTop:6}}>{b.caption}</p>}
      </div>
    );
    case "button": return (
      <div style={{padding:"20px 40px",textAlign:b.align||"center"}}>
        <a href={b.url||"#"} style={{display:"inline-block",padding:"13px 30px",background:b.color||T.blue,color:"#fff",borderRadius:8,fontFamily:T.font,fontWeight:700,fontSize:14,textDecoration:"none",letterSpacing:"0.02em"}}>
          {b.text||"Clique aqui"}
        </a>
      </div>
    );
    case "divider": return <div style={{padding:"8px 40px"}}><div style={{height:1,background:T.border}}/></div>;
    case "spacer":  return <div style={{height:b.height||24}}/>;
    case "columns": return (
      <div style={{padding:"16px 40px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        {[b.col1||"Coluna 1",b.col2||"Coluna 2"].map((col,i)=>(
          <div key={i} style={{fontFamily:T.font,fontSize:13,fontWeight:600,color:T.ink,lineHeight:1.6,padding:"12px",background:T.bg,borderRadius:8}}>{col}</div>
        ))}
      </div>
    );
    case "footer": return (
      <div style={{background:T.faint,padding:"20px 40px",textAlign:"center",borderTop:`0.5px solid ${T.border}`}}>
        <p style={{fontFamily:T.font,fontSize:11,fontWeight:600,color:T.muted,margin:0}}>{b.text||"© 2024 Vantari · Todos os direitos reservados"}</p>
        <p style={{fontFamily:T.font,fontSize:11,color:T.muted,margin:"4px 0 0",fontWeight:600}}>
          <a href="#" style={{color:T.blue,textDecoration:"none"}}>Descadastrar</a> · <a href="#" style={{color:T.blue,textDecoration:"none"}}>Política de Privacidade</a>
        </p>
      </div>
    );
    default: return null;
  }
};

/* ═══════════════════════════════════════════════════
   WYSIWYG EMAIL EDITOR
═══════════════════════════════════════════════════ */
const BLOCK_PALETTE = [
  { type:"header",  Icon:Layout,             label:"Header"  },
  { type:"text",    Icon:AlignLeft,          label:"Texto"   },
  { type:"image",   Icon:Image,              label:"Imagem"  },
  { type:"button",  Icon:MousePointerClick,  label:"Botão"   },
  { type:"columns", Icon:Columns2,           label:"Colunas" },
  { type:"divider", Icon:Minus,              label:"Divisor" },
  { type:"spacer",  Icon:ArrowUpDown,        label:"Espaço"  },
  { type:"footer",  Icon:PanelBottom,        label:"Rodapé"  },
];

const DEFAULT_BLOCK_CONTENT = {
  header:  { logo:true, headline:"Seu Título Aqui", subline:"Subtítulo opcional" },
  text:    { text:"Escreva seu texto aqui. Use {{lead.name}} para personalizar.", align:"left" },
  image:   { src:"", caption:"" },
  button:  { text:"Clique Aqui", url:"#", align:"center", color:T.blue },
  divider: {},
  spacer:  { height:24 },
  columns: { col1:"Texto da coluna esquerda", col2:"Texto da coluna direita" },
  footer:  { text:"© 2024 Vantari · Todos os direitos reservados" },
};

const BlockEditor = ({ block, onChange }) => {
  const b = block.content||{};
  const upd = (key,val) => onChange({...block,content:{...b,[key]:val}});
  const labelStyle = { fontFamily:T.font,fontSize:10,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:4,display:"block" };
  const inputStyle = { width:"100%",boxSizing:"border-box",fontFamily:T.font,fontSize:12,fontWeight:600,padding:"7px 10px",border:`1px solid ${T.border}`,borderRadius:7,outline:"none",background:T.white,color:T.ink,marginBottom:10 };

  switch(block.type) {
    case "header": return (
      <div>
        <label style={labelStyle}>Headline</label>
        <input style={inputStyle} value={b.headline||""} onChange={e=>upd("headline",e.target.value)} placeholder="Título principal"/>
        <label style={labelStyle}>Subtítulo</label>
        <input style={inputStyle} value={b.subline||""} onChange={e=>upd("subline",e.target.value)} placeholder="Texto menor"/>
        <label style={{...labelStyle,display:"flex",alignItems:"center",gap:7,cursor:"pointer"}}>
          <input type="checkbox" checked={!!b.logo} onChange={e=>upd("logo",e.target.checked)} style={{accentColor:T.blue}}/> Mostrar logo
        </label>
      </div>
    );
    case "text": return (
      <div>
        <label style={labelStyle}>Texto</label>
        <textarea value={b.text||""} onChange={e=>upd("text",e.target.value)} rows={5} style={{...inputStyle,resize:"vertical",lineHeight:1.5}}/>
        <label style={labelStyle}>Alinhamento</label>
        <div style={{display:"flex",gap:4,marginBottom:10}}>
          {["left","center","right"].map(a=>(
            <button key={a} onClick={()=>upd("align",a)}
              style={{flex:1,padding:"5px",fontFamily:T.font,fontSize:11,fontWeight:700,border:`1px solid ${b.align===a?T.blue:T.border}`,borderRadius:6,background:b.align===a?T.blueL:T.white,color:b.align===a?T.blue:T.muted,cursor:"pointer"}}>
              {a==="left"?"Esq":a==="center"?"Centro":"Dir"}
            </button>
          ))}
        </div>
        <div style={{fontFamily:T.font,fontSize:10,fontWeight:600,color:T.blue,background:T.blueL,borderRadius:7,padding:"7px 10px",display:"flex",gap:5,alignItems:"flex-start"}}>
          <Lightbulb size={11} color={T.blue} style={{flexShrink:0,marginTop:1}} aria-hidden="true"/>
          Variáveis: <code style={{fontFamily:T.mono}}>{"{{lead.name}}"}</code> <code style={{fontFamily:T.mono}}>{"{{lead.company}}"}</code>
        </div>
      </div>
    );
    case "button": return (
      <div>
        <label style={labelStyle}>Texto do Botão</label>
        <input style={inputStyle} value={b.text||""} onChange={e=>upd("text",e.target.value)}/>
        <label style={labelStyle}>URL</label>
        <input style={inputStyle} value={b.url||""} onChange={e=>upd("url",e.target.value)} placeholder="https://"/>
        <label style={labelStyle}>Cor</label>
        <div style={{display:"flex",gap:6,marginBottom:10}}>
          {[T.blue,T.green,T.amber,T.red,T.purple,"#111827"].map(c=>(
            <div key={c} onClick={()=>upd("color",c)}
              style={{width:24,height:24,borderRadius:"50%",background:c,cursor:"pointer",border:`2px solid ${b.color===c?"#fff":"transparent"}`,boxShadow:b.color===c?`0 0 0 2px ${c}`:"none",transition:"all 0.15s"}}/>
          ))}
        </div>
      </div>
    );
    case "image": return (
      <div>
        <label style={labelStyle}>URL da Imagem</label>
        <input style={inputStyle} value={b.src||""} onChange={e=>upd("src",e.target.value)} placeholder="https://..."/>
        <label style={labelStyle}>Legenda</label>
        <input style={inputStyle} value={b.caption||""} onChange={e=>upd("caption",e.target.value)} placeholder="Opcional"/>
      </div>
    );
    case "spacer": return (
      <div>
        <label style={labelStyle}>Altura: {b.height||24}px</label>
        <input type="range" min="8" max="80" value={b.height||24} onChange={e=>upd("height",Number(e.target.value))} style={{width:"100%",accentColor:T.blue}}/>
      </div>
    );
    case "footer": return (
      <div>
        <label style={labelStyle}>Texto do rodapé</label>
        <textarea value={b.text||""} onChange={e=>upd("text",e.target.value)} rows={3} style={{...inputStyle,resize:"vertical"}}/>
      </div>
    );
    case "columns": return (
      <div>
        <label style={labelStyle}>Coluna Esquerda</label>
        <textarea value={b.col1||""} onChange={e=>upd("col1",e.target.value)} rows={3} style={{...inputStyle,resize:"vertical"}}/>
        <label style={labelStyle}>Coluna Direita</label>
        <textarea value={b.col2||""} onChange={e=>upd("col2",e.target.value)} rows={3} style={{...inputStyle,resize:"vertical"}}/>
      </div>
    );
    default: return <div style={{fontFamily:T.font,fontSize:12,fontWeight:600,color:T.muted}}>Selecione um bloco para editar.</div>;
  }
};

const EmailEditor = ({ campaign, onSave, onClose }) => {
  const [blocks,       setBlocks]      = useState(campaign?.emailBlocks||TEMPLATES[0].blocks.map(b=>({...b,id:`b${Date.now()}_${Math.random()}`})));
  const [selectedId,   setSelectedId]  = useState(null);
  const [preview,      setPreview]     = useState("desktop");
  const [subjectLine,  setSubjectLine] = useState(campaign?.subject||"");
  const [abEnabled,    setAbEnabled]   = useState(false);
  const [abSubjectB,   setAbSubjectB]  = useState("");
  const [dragOver,     setDragOver]    = useState(null);
  const [draggingBlock,setDraggingBlock]=useState(null);
  const [showTemplates,setShowTemplates]=useState(false);

  const selected = blocks.find(b=>b.id===selectedId);
  const addBlock = useCallback((type,atIdx)=>{
    const nb={id:`b${Date.now()}`,type,content:{...DEFAULT_BLOCK_CONTENT[type]}};
    setBlocks(prev=>{const a=[...prev];if(atIdx!=null)a.splice(atIdx+1,0,nb);else a.push(nb);return a;});
    setSelectedId(nb.id);
  },[]);
  const removeBlock = (id)=>{setBlocks(p=>p.filter(b=>b.id!==id));if(selectedId===id)setSelectedId(null);};
  const moveBlock   = (id,dir)=>{setBlocks(prev=>{const a=[...prev];const i=a.findIndex(b=>b.id===id);const j=dir==="up"?i-1:i+1;if(j<0||j>=a.length)return a;[a[i],a[j]]=[a[j],a[i]];return a;});};
  const updateBlock = (updated)=>setBlocks(p=>p.map(b=>b.id===updated.id?updated:b));
  const loadTemplate= (tpl)=>{setBlocks(tpl.blocks.map(b=>({...b,id:`b${Date.now()}_${Math.random()}`})));setShowTemplates(false);};
  const previewWidths = {desktop:"100%",tablet:"600px",mobile:"375px"};
  const VARS = ["{{lead.name}}","{{lead.email}}","{{lead.company}}","{{lead.score}}","{{lead.stage}}","{{empresa.nome}}"];
  const PREVIEW_ICONS = {desktop:Monitor,tablet:Tablet,mobile:Smartphone};

  return (
    <div style={{position:"fixed",inset:0,background:T.bg,zIndex:200,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
      <div style={{background:T.white,borderBottom:`0.5px solid ${T.border}`,padding:"0 20px",display:"flex",alignItems:"center",gap:12,height:52,flexShrink:0}}>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:T.muted,padding:"4px 8px",borderRadius:6,display:"flex",alignItems:"center"}}>
          <ChevronLeft size={18} aria-hidden="true"/>
        </button>
        <div style={{flex:1}}>
          <input value={subjectLine} onChange={e=>setSubjectLine(e.target.value)} placeholder="Assunto do email..."
            style={{width:"100%",fontFamily:T.head,fontSize:14,fontWeight:700,border:"none",outline:"none",background:"transparent",color:T.ink,letterSpacing:"-0.01em"}}/>
        </div>
        {abEnabled&&(
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontFamily:T.font,fontSize:11,fontWeight:700,background:"#fff4e6",color:T.amber,padding:"3px 8px",borderRadius:5}}>A/B</span>
            <input value={abSubjectB} onChange={e=>setAbSubjectB(e.target.value)} placeholder="Variante B do assunto..."
              style={{fontFamily:T.font,fontSize:12,fontWeight:600,border:`1px solid ${T.border}`,borderRadius:8,padding:"5px 10px",outline:"none",width:220}}/>
          </div>
        )}
        <div style={{display:"flex",gap:4}}>
          <button onClick={()=>setAbEnabled(!abEnabled)}
            style={{fontFamily:T.font,fontSize:11,fontWeight:700,padding:"5px 11px",border:`1px solid ${abEnabled?T.amber:T.border}`,borderRadius:7,background:abEnabled?"#fff4e6":T.white,color:abEnabled?T.amber:T.muted,cursor:"pointer"}}>
            A/B
          </button>
          {["desktop","tablet","mobile"].map(p=>{
            const PI=PREVIEW_ICONS[p];
            return (
              <button key={p} onClick={()=>setPreview(p)}
                style={{padding:"5px 8px",border:`1px solid ${preview===p?T.blue:T.border}`,borderRadius:7,background:preview===p?T.blueL:T.white,color:preview===p?T.blue:T.muted,cursor:"pointer",display:"flex",alignItems:"center"}}>
                <PI size={14} aria-hidden="true"/>
              </button>
            );
          })}
        </div>
        <Btn onClick={()=>onSave({...campaign,subject:subjectLine,emailBlocks:blocks})} variant="ink" size="md" icon={Save}>Salvar</Btn>
      </div>

      <div style={{flex:1,overflow:"hidden",display:"flex"}}>
        {/* Block palette */}
        <div style={{width:200,background:T.white,borderRight:`0.5px solid ${T.border}`,display:"flex",flexDirection:"column",flexShrink:0}}>
          <div style={{padding:"12px 14px",borderBottom:`0.5px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontFamily:T.font,fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>Blocos</span>
            <button onClick={()=>setShowTemplates(!showTemplates)}
              style={{fontFamily:T.font,fontSize:10,fontWeight:700,color:T.blue,background:T.blueL,border:"none",borderRadius:5,padding:"3px 7px",cursor:"pointer"}}>
              Templates
            </button>
          </div>
          {showTemplates ? (
            <div style={{padding:10,overflow:"auto",flex:1}}>
              <div style={{fontFamily:T.font,fontSize:10,fontWeight:600,color:T.muted,marginBottom:8}}>Selecionar template:</div>
              {TEMPLATES.map(tpl=>(
                <div key={tpl.id} onClick={()=>loadTemplate(tpl)}
                  style={{padding:"10px",border:`0.5px solid ${T.border}`,borderRadius:8,cursor:"pointer",marginBottom:6,background:T.bg}}>
                  <div style={{fontFamily:T.font,fontSize:12,fontWeight:700,color:T.ink}}>{tpl.name}</div>
                  <div style={{fontFamily:T.font,fontSize:10,fontWeight:600,color:T.muted,marginTop:2}}>{tpl.desc}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{padding:10,overflow:"auto",flex:1}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                {BLOCK_PALETTE.map(bp=>{
                  const BIcon=bp.Icon;
                  return (
                    <button key={bp.type} onClick={()=>addBlock(bp.type)}
                      style={{padding:"10px 6px",background:T.bg,border:`0.5px solid ${T.border}`,borderRadius:8,cursor:"pointer",textAlign:"center",fontFamily:T.font,fontSize:10,fontWeight:700,color:T.ink,transition:"all 0.15s",display:"flex",flexDirection:"column",alignItems:"center",gap:5}}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor=T.blue;e.currentTarget.style.color=T.blue;e.currentTarget.style.background=T.blueL;}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.ink;e.currentTarget.style.background=T.bg;}}>
                      <BIcon size={16} aria-hidden="true"/> {bp.label}
                    </button>
                  );
                })}
              </div>
              <div style={{marginTop:14,padding:"10px",background:"#fff4e6",border:`0.5px solid #f5c78a`,borderRadius:8}}>
                <div style={{fontFamily:T.font,fontSize:10,fontWeight:700,color:T.amber,marginBottom:6}}>Variáveis disponíveis:</div>
                {VARS.map(v=>(
                  <code key={v} onClick={()=>navigator.clipboard.writeText(v)} title="Copiar"
                    style={{display:"block",fontFamily:T.mono,fontSize:10,color:T.blue,marginBottom:2,cursor:"pointer",padding:"1px 0"}}>
                    {v}
                  </code>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Canvas */}
        <div style={{flex:1,overflow:"auto",padding:"24px 20px",background:T.bg,display:"flex",justifyContent:"center"}}>
          <div style={{width:previewWidths[preview],maxWidth:"100%",transition:"width 0.3s ease"}}>
            <div style={{background:T.white,boxShadow:"0 2px 20px rgba(0,0,0,0.07)",borderRadius:12,overflow:"hidden",minHeight:400}}>
              <div style={{background:T.faint,borderBottom:`0.5px solid ${T.border}`,padding:"10px 16px",display:"flex",gap:6,alignItems:"center"}}>
                {["#FF6B5E",T.amber,T.green].map(c=><div key={c} style={{width:10,height:10,borderRadius:"50%",background:c}}/>)}
                <div style={{fontFamily:T.font,fontSize:11,fontWeight:600,color:T.muted,marginLeft:8,flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                  <strong>De:</strong> {campaign?.sender||"email@vantari.com.br"} &nbsp;·&nbsp; <strong>Assunto:</strong> {subjectLine||"(sem assunto)"}
                </div>
              </div>
              {blocks.map((block,idx)=>(
                <div key={block.id}
                  onDragOver={e=>{e.preventDefault();setDragOver(idx);}}
                  onDrop={e=>{e.preventDefault();if(draggingBlock!=null&&draggingBlock!==idx){setBlocks(prev=>{const a=[...prev];const[item]=a.splice(draggingBlock,1);a.splice(idx,0,item);return a;});}setDraggingBlock(null);setDragOver(null);}}
                  style={{position:"relative",outline:selectedId===block.id?`2px solid ${T.blue}`:"2px solid transparent",transition:"outline 0.1s",cursor:"pointer",background:dragOver===idx?"#e8f5fb":"transparent"}}
                  onClick={e=>{e.stopPropagation();setSelectedId(block.id);}}>
                  {renderBlock(block,"Ana")}
                  {selectedId===block.id&&(
                    <div style={{position:"absolute",top:6,right:8,display:"flex",gap:3,zIndex:10}} onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>moveBlock(block.id,"up")} title="Mover para cima" style={{width:24,height:24,borderRadius:5,border:"none",background:T.blue,color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><ArrowUp size={11} aria-hidden="true"/></button>
                      <button onClick={()=>moveBlock(block.id,"down")} title="Mover para baixo" style={{width:24,height:24,borderRadius:5,border:"none",background:T.blue,color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><ArrowDown size={11} aria-hidden="true"/></button>
                      <button onClick={()=>removeBlock(block.id)} title="Remover" style={{width:24,height:24,borderRadius:5,border:"none",background:T.red,color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><X size={11} aria-hidden="true"/></button>
                    </div>
                  )}
                  <div draggable onDragStart={()=>setDraggingBlock(idx)}
                    style={{position:"absolute",left:4,top:"50%",transform:"translateY(-50%)",color:T.border2,cursor:"grab",opacity:selectedId===block.id?1:0,transition:"opacity 0.1s",display:"flex",alignItems:"center"}}>
                    <GripVertical size={14} aria-hidden="true"/>
                  </div>
                </div>
              ))}
              {blocks.length===0&&(
                <div style={{textAlign:"center",padding:"60px 40px",color:T.muted,fontFamily:T.font,fontSize:14,fontWeight:600}}>
                  Clique em um bloco à esquerda para começar a construir seu email
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Properties */}
        <div style={{width:240,background:T.white,borderLeft:`0.5px solid ${T.border}`,overflow:"auto",flexShrink:0}}>
          <div style={{padding:"12px 16px",borderBottom:`0.5px solid ${T.border}`}}>
            <div style={{fontFamily:T.font,fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>
              {selected?`Editar: ${selected.type}`:"Propriedades"}
            </div>
          </div>
          <div style={{padding:"14px 16px"}}>
            {selected
              ?<BlockEditor block={selected} onChange={updateBlock}/>
              :<div style={{fontFamily:T.font,fontSize:12,fontWeight:600,color:T.muted,textAlign:"center",padding:"20px 0"}}>Clique em um bloco no canvas para editar suas propriedades</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   CAMPAIGN FORM
═══════════════════════════════════════════════════ */
const SEGMENTS = ["Todos os leads","Newsletter","Demo Solicitada","Inativos 30d","MQL + SQL","Alto Valor B2B","Leads Quentes"];

const CAMPAIGN_TYPES = [
  { val:"newsletter",  Icon:Newspaper,       label:"Newsletter"  },
  { val:"promotional", Icon:Tag,             label:"Promocional" },
  { val:"follow-up",   Icon:CornerDownRight, label:"Follow-up"   },
  { val:"event",       Icon:Calendar,        label:"Evento"      },
  { val:"reactivation",Icon:RefreshCw,       label:"Reativação"  },
];

const CampaignForm = ({ campaign, onSave, onEdit, onBack }) => {
  const [form,setForm] = useState({
    name:       campaign?.name       ||"",
    subject:    campaign?.subject    ||"",
    sender:     campaign?.sender     ||"marketing@vantari.com.br",
    replyTo:    campaign?.replyTo    ||"",
    audience:   campaign?.audience   ||"Todos os leads",
    schedule:   campaign?.scheduledAt?"scheduled":"immediate",
    scheduledAt:campaign?.scheduledAt?new Date(campaign.scheduledAt).toISOString().slice(0,16):"",
    timezone:   "America/Sao_Paulo",
    throttle:   "1000",
    type:       campaign?.type       ||"newsletter",
  });
  const upd = (k,v)=>setForm(p=>({...p,[k]:v}));
  const audienceCount = {"Todos os leads":6284,"Newsletter":3820,"Demo Solicitada":91,"Inativos 30d":840,"MQL + SQL":2460,"Alto Valor B2B":420,"Leads Quentes":1200}[form.audience]||0;

  const SectionTitle = ({children}) => (
    <div style={{fontFamily:T.head,fontSize:14,fontWeight:700,color:T.ink,letterSpacing:"-0.01em",marginBottom:16,paddingBottom:8,borderBottom:`0.5px solid ${T.border}`}}>{children}</div>
  );

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div>
          <h2 style={{margin:"0 0 4px",fontFamily:T.head,fontSize:20,fontWeight:700,color:T.ink,letterSpacing:"-0.02em"}}>{campaign?.id?"Editar Campanha":"Nova Campanha"}</h2>
          <p style={{margin:0,fontFamily:T.font,fontSize:13,fontWeight:600,color:T.muted}}>Configure todos os detalhes antes de enviar</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <Btn onClick={onBack} variant="ghost" size="md">Cancelar</Btn>
          <Btn onClick={onEdit} variant="secondary" size="md" icon={Pencil}>Editor de Email</Btn>
          <Btn onClick={()=>onSave(form)} variant="ink" size="md" icon={Save}>Salvar Rascunho</Btn>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:20}}>
        <div style={{display:"flex",flexDirection:"column",gap:20}}>
          <div style={{background:T.white,border:`0.5px solid ${T.border}`,borderRadius:12,padding:"22px"}}>
            <SectionTitle>Informações Básicas</SectionTitle>
            <div style={{display:"grid",gap:14}}>
              <Field label="Nome interno da campanha" value={form.name} onChange={e=>upd("name",e.target.value)} placeholder="Ex: Newsletter Dezembro 2024"/>
              <Field label="Linha de assunto" value={form.subject} onChange={e=>upd("subject",e.target.value)} placeholder="Use {{lead.name}} para personalizar"/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <Field label="Remetente (email)" value={form.sender} onChange={e=>upd("sender",e.target.value)}/>
                <Field label="Reply-to" value={form.replyTo} onChange={e=>upd("replyTo",e.target.value)} placeholder="mesmo que remetente"/>
              </div>
              <div>
                <label style={{display:"block",fontFamily:T.font,fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>Tipo de Campanha</label>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {CAMPAIGN_TYPES.map(({val,Icon:TI,label})=>(
                    <button key={val} onClick={()=>upd("type",val)}
                      style={{padding:"7px 13px",fontFamily:T.font,fontSize:12,fontWeight:700,border:`1px solid ${form.type===val?T.blue:T.border}`,borderRadius:8,background:form.type===val?T.blueL:T.white,color:form.type===val?T.blue:T.ink,cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
                      <TI size={13} aria-hidden="true"/>{label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={{background:T.white,border:`0.5px solid ${T.border}`,borderRadius:12,padding:"22px"}}>
            <SectionTitle>Audiência</SectionTitle>
            <div style={{marginBottom:12}}>
              <label style={{display:"block",fontFamily:T.font,fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:5}}>Segmento</label>
              <select value={form.audience} onChange={e=>upd("audience",e.target.value)}
                style={{width:"100%",fontFamily:T.font,fontSize:13,fontWeight:600,padding:"10px 13px",border:`1px solid ${T.border}`,borderRadius:8,outline:"none",background:T.white,color:T.ink,cursor:"pointer"}}>
                {SEGMENTS.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",background:T.bg,borderRadius:8,border:`0.5px solid ${T.border}`}}>
              <div style={{width:34,height:34,borderRadius:8,background:`${T.blue}14`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <Users size={16} color={T.blue} aria-hidden="true"/>
              </div>
              <div>
                <div style={{fontFamily:T.font,fontSize:13,fontWeight:700,color:T.ink}}>{audienceCount.toLocaleString("pt-BR")} leads</div>
                <div style={{fontFamily:T.font,fontSize:11,fontWeight:600,color:T.muted}}>receberão este email</div>
              </div>
            </div>
          </div>

          <div style={{background:T.white,border:`0.5px solid ${T.border}`,borderRadius:12,padding:"22px"}}>
            <SectionTitle>Agendamento</SectionTitle>
            <div style={{display:"flex",gap:10,marginBottom:14}}>
              {[{val:"immediate",Icon:Zap,lbl:"Enviar agora"},{val:"scheduled",Icon:Calendar,lbl:"Agendar envio"}].map(({val,Icon:SI,lbl})=>(
                <button key={val} onClick={()=>upd("schedule",val)}
                  style={{flex:1,padding:"12px",fontFamily:T.font,fontSize:13,fontWeight:700,border:`1px solid ${form.schedule===val?T.blue:T.border}`,borderRadius:10,background:form.schedule===val?T.blueL:T.white,color:form.schedule===val?T.blue:T.ink,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:7}}>
                  <SI size={14} aria-hidden="true"/> {lbl}
                </button>
              ))}
            </div>
            {form.schedule==="scheduled"&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <Field label="Data e hora" value={form.scheduledAt} onChange={e=>upd("scheduledAt",e.target.value)} type="datetime-local"/>
                <div>
                  <label style={{display:"block",fontFamily:T.font,fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:5}}>Fuso Horário</label>
                  <select value={form.timezone} onChange={e=>upd("timezone",e.target.value)}
                    style={{width:"100%",fontFamily:T.font,fontSize:13,fontWeight:600,padding:"10px 13px",border:`1px solid ${T.border}`,borderRadius:8,outline:"none",background:T.white,color:T.ink}}>
                    {["America/Sao_Paulo","America/New_York","Europe/London","America/Chicago"].map(tz=><option key={tz}>{tz}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{background:T.white,border:`0.5px solid ${T.amber}44`,borderLeft:`3px solid ${T.amber}`,borderRadius:12,padding:"18px"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
              <FlaskConical size={15} color={T.amber} aria-hidden="true"/>
              <div style={{fontFamily:T.head,fontSize:14,fontWeight:700,color:T.ink}}>Teste A/B</div>
            </div>
            <p style={{fontFamily:T.font,fontSize:12,fontWeight:600,color:T.muted,margin:"0 0 12px"}}>Compare dois assuntos e descubra qual converte melhor.</p>
            <div style={{display:"flex",gap:8,marginBottom:10}}>
              {["Assunto","Remetente","Conteúdo"].map(opt=>(
                <span key={opt} style={{fontFamily:T.font,fontSize:11,fontWeight:700,background:opt==="Assunto"?T.blueL:T.bg,color:opt==="Assunto"?T.blue:T.muted,padding:"3px 9px",borderRadius:5}}>{opt}</span>
              ))}
            </div>
            <div style={{marginBottom:8}}>
              <label style={{fontFamily:T.font,fontSize:10,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em",display:"block",marginBottom:4}}>Variante A — 50%</label>
              <div style={{fontFamily:T.font,fontSize:12,fontWeight:600,padding:"7px 10px",background:T.bg,borderRadius:7,color:T.ink,border:`0.5px solid ${T.border}`}}>{form.subject||"(Assunto principal)"}</div>
            </div>
            <div>
              <label style={{fontFamily:T.font,fontSize:10,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em",display:"block",marginBottom:4}}>Variante B — 50%</label>
              <Field value={form.subjectB||""} onChange={e=>upd("subjectB",e.target.value)} placeholder="Assunto alternativo..."/>
            </div>
          </div>

          <div style={{background:T.white,border:`0.5px solid ${T.border}`,borderRadius:12,padding:"18px"}}>
            <div style={{display:"flex",alignItems:"center",gap:7,fontFamily:T.head,fontSize:14,fontWeight:700,color:T.ink,marginBottom:12}}>
              <Settings size={15} color={T.muted} aria-hidden="true"/> Avançado
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div>
                <label style={{display:"block",fontFamily:T.font,fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:4}}>Throttling (emails/hora)</label>
                <select value={form.throttle} onChange={e=>upd("throttle",e.target.value)}
                  style={{width:"100%",fontFamily:T.font,fontSize:12,fontWeight:600,padding:"8px 10px",border:`1px solid ${T.border}`,borderRadius:8,outline:"none",background:T.white,color:T.ink}}>
                  {["500","1000","2000","Sem limite"].map(v=><option key={v}>{v}</option>)}
                </select>
              </div>
              {[["Rastrear abertura","trackOpen",true],["Rastrear cliques","trackClick",true],["Link de descadastro","unsub",true],["Google Analytics UTM","utm",false]].map(([lbl,key,def])=>(
                <div key={key} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:`0.5px solid ${T.border}`}}>
                  <span style={{fontFamily:T.font,fontSize:12,fontWeight:600,color:T.ink}}>{lbl}</span>
                  <div onClick={()=>upd(key,!(form[key]??def))}
                    style={{width:32,height:18,borderRadius:99,background:(form[key]??def)?T.green:T.border,cursor:"pointer",position:"relative",transition:"background 0.2s"}}>
                    <div style={{position:"absolute",top:2,left:(form[key]??def)?15:2,width:14,height:14,borderRadius:"50%",background:"#fff",transition:"left 0.2s"}}/>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Btn onClick={()=>onSave({...form,status:form.schedule==="immediate"?"sending":"scheduled"})} variant="ink" size="lg" full icon={Send}>
            {form.schedule==="immediate"?"Enviar Agora":"Agendar Envio"}
          </Btn>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   CAMPAIGN LIST
═══════════════════════════════════════════════════ */
const CampaignList = ({ campaigns, onNew, onEdit, onReport, onDuplicate, onDelete, onSend }) => {
  const [filter,setFilter] = useState("all");
  const [search,setSearch] = useState("");
  const [emailKpis, setEmailKpis] = useState({ total: 0, sent: 0, avgOpen: 0, active: 0 });
  const [emailSpark, setEmailSpark] = useState({ total: [], sent: [], open: [], active: [] });

  useEffect(() => {
    const loadKpis = async () => {
      const [{ data: allCamps }, { data: sends }] = await Promise.all([
        supabase.from("campaigns").select("id, status, sent_at, created_at"),
        supabase.from("campaign_sends").select("opened, created_at"),
      ]);
      const camps = allCamps || [];
      const s = sends || [];
      const total  = camps.length;
      const sent   = camps.filter(c => c.status === "sent").length;
      const active = camps.filter(c => c.status === "active" || c.status === "sending").length;
      const avgOpen = s.length ? parseFloat(((s.filter(x => x.opened).length / s.length) * 100).toFixed(1)) : 0;
      setEmailKpis({ total, sent, avgOpen, active });

      // sparklines bucketed by month
      const now = new Date();
      const buckets = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1);
        return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, total: 0, sent: 0, open: 0, openTotal: 0 };
      });
      camps.forEach(c => {
        const d = new Date(c.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const b = buckets.find(m => m.key === key);
        if (b) { b.total++; if (c.status === "sent") b.sent++; }
      });
      s.forEach(x => {
        const d = new Date(x.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const b = buckets.find(m => m.key === key);
        if (b) { b.openTotal++; if (x.opened) b.open++; }
      });
      setEmailSpark({
        total:  buckets.map(b => b.total),
        sent:   buckets.map(b => b.sent),
        open:   buckets.map(b => b.openTotal > 0 ? parseFloat((b.open / b.openTotal * 100).toFixed(1)) : 0),
        active: buckets.map(b => b.total),
      });
    };
    loadKpis();
  }, []);

  const filtered = campaigns.filter(c=>{
    if(filter!=="all"&&c.status!==filter) return false;
    if(search&&!c.name.toLowerCase().includes(search.toLowerCase())&&!c.subject.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const ThumbnailBg = ({thumb,type}) => {
    const colors = {promo:["#FF6B5E","#f97316"],newsletter:["#0D7491","#0D7491"],followup:["#1e293b","#374151"],event:["#7C5CFF","#4f46e5"],reactivation:["#14A273","#0d9488"]};
    const [c1,c2] = colors[thumb]||colors.newsletter;
    return (
      <div style={{width:"100%",height:"100%",background:`linear-gradient(135deg,${c1},${c2})`,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <TypeIcon type={type} size={24}/>
      </div>
    );
  };

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div>
          <h1 style={{margin:"0 0 4px",fontFamily:T.head,fontSize:22,fontWeight:700,color:T.ink,letterSpacing:"-0.02em"}}>Campanhas</h1>
          <p style={{margin:0,fontFamily:T.font,fontSize:13,fontWeight:600,color:T.muted}}>{campaigns.length} campanhas no total</p>
        </div>
        <Btn onClick={onNew} variant="ink" size="lg" icon={Plus}>Nova Campanha</Btn>
      </div>

      {/* Hero KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        <HeroKpiCard icon={Mail}        color={T.teal}   trend={0}
          label="Total de Campanhas"
          value={emailKpis.total.toLocaleString("pt-BR")}
          sub="criadas"
          sparkData={emailSpark.total}
        />
        <HeroKpiCard icon={TrendingUp}  color={T.green}  trend={0}
          label="Campanhas Enviadas"
          value={emailKpis.sent.toLocaleString("pt-BR")}
          sub="status sent"
          sparkData={emailSpark.sent}
        />
        <HeroKpiCard icon={Star}        color={T.amber}  trend={0}
          label="Taxa Média de Abertura"
          value={`${emailKpis.avgOpen}%`}
          sub="avg open rate"
          sparkData={emailSpark.open}
        />
        <HeroKpiCard icon={Zap}         color={T.violet} trend={0}
          label="Campanhas Ativas"
          value={emailKpis.active.toLocaleString("pt-BR")}
          sub="ativas agora"
          sparkData={emailSpark.active}
        />
      </div>

      <div style={{background:T.white,border:`0.5px solid ${T.border}`,borderRadius:10,padding:"12px 16px",marginBottom:20,display:"flex",gap:12,alignItems:"center"}}>
        <div style={{position:"relative",flex:1}}>
          <Search size={14} color={T.muted} style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}} aria-hidden="true"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar campanhas..."
            style={{width:"100%",boxSizing:"border-box",fontFamily:T.font,fontSize:13,fontWeight:600,padding:"8px 12px 8px 32px",border:`1px solid ${T.border}`,borderRadius:8,outline:"none",background:T.bg,color:T.ink}}/>
        </div>
        <div style={{display:"flex",gap:4}}>
          {[["all","Todas"],["draft","Rascunho"],["scheduled","Agendadas"],["sent","Enviadas"],["failed","Falhou"]].map(([val,lbl])=>(
            <button key={val} onClick={()=>setFilter(val)}
              style={{padding:"6px 12px",fontFamily:T.font,fontSize:12,fontWeight:filter===val?700:600,border:`0.5px solid ${filter===val?T.blue:T.border}`,borderRadius:8,background:filter===val?T.blueL:T.white,color:filter===val?T.blue:T.ink,cursor:"pointer"}}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:16}}>
        {filtered.map(camp=>{
          const sm=STATUS_META[camp.status]||STATUS_META.draft;
          return (
            <div key={camp.id} style={{background:T.white,border:`0.5px solid ${T.border}`,borderRadius:12,overflow:"hidden",transition:"all 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}
              onMouseEnter={e=>e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,0.08)"}
              onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,0.04)"}>
              <div style={{height:100,overflow:"hidden",position:"relative"}}>
                <ThumbnailBg thumb={camp.thumbnail} type={camp.type}/>
                <div style={{position:"absolute",top:10,left:10}}><Badge label={sm.label} color={sm.color} bg={sm.bg} dot/></div>
                {camp.status==="sending"&&<div style={{position:"absolute",bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${T.blue} 0%,${T.teal} 60%,transparent 100%)`,animation:"shimmer 2s linear infinite",backgroundSize:"200% 100%"}}/>}
              </div>
              <div style={{padding:"16px 18px"}}>
                <div style={{marginBottom:10}}>
                  <div style={{fontFamily:T.head,fontSize:14,fontWeight:700,color:T.ink,letterSpacing:"-0.01em",marginBottom:3}}>{camp.name}</div>
                  <div style={{fontFamily:T.font,fontSize:12,fontWeight:600,color:T.muted,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{camp.subject}</div>
                </div>
                {camp.status==="sent"?(
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:12}}>
                    {[{label:"Enviados",val:camp.metrics.sent.toLocaleString("pt-BR"),color:T.muted},{label:"Abertura",val:`${camp.metrics.openRate}%`,color:T.blue},{label:"Cliques",val:`${camp.metrics.clickRate}%`,color:T.teal},{label:"Bounces",val:camp.metrics.bounced,color:camp.metrics.bounced>200?T.red:T.muted}].map(m=>(
                      <div key={m.label} style={{textAlign:"center",padding:"6px 0",background:T.bg,borderRadius:7}}>
                        <div style={{fontFamily:T.head,fontSize:12,fontWeight:700,color:m.color}}>{m.val}</div>
                        <div style={{fontFamily:T.font,fontSize:9,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.05em"}}>{m.label}</div>
                      </div>
                    ))}
                  </div>
                ):(
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,padding:"8px 10px",background:T.bg,borderRadius:8}}>
                    <Users size={13} color={T.blue} aria-hidden="true"/>
                    <span style={{fontFamily:T.font,fontSize:12,fontWeight:600,color:T.ink}}><strong>{camp.audienceCount.toLocaleString("pt-BR")}</strong> leads · {camp.audience}</span>
                    {camp.scheduledAt&&<span style={{fontFamily:T.font,fontSize:11,fontWeight:600,color:T.muted,marginLeft:"auto"}}>{new Date(camp.scheduledAt).toLocaleDateString("pt-BR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</span>}
                  </div>
                )}
                <div style={{display:"flex",gap:6}}>
                  {camp.status==="sent"
                    ?<Btn onClick={()=>onReport(camp)} variant="primary" size="xs" icon={BarChart2} sx={{flex:1,justifyContent:"center"}}>Relatório</Btn>
                    :<Btn onClick={()=>onEdit(camp)} variant="secondary" size="xs" icon={Pencil} sx={{flex:1,justifyContent:"center"}}>Editar</Btn>}
                  {["draft","scheduled"].includes(camp.status) && (
                    <Btn onClick={e=>{e.stopPropagation();onSend(camp);}} variant="success" size="xs" icon={Send} sx={{flex:1,justifyContent:"center"}}>Enviar</Btn>
                  )}
                  <Btn onClick={()=>onDuplicate(camp)} variant="ghost" size="xs" icon={Copy} sx={{flex:"0 0 32px",justifyContent:"center",padding:"6px"}}/>
                  {camp.status!=="sent"&&<Btn onClick={()=>onDelete(camp.id)} variant="ghost" size="xs" icon={Trash2} sx={{flex:"0 0 32px",justifyContent:"center",padding:"6px"}}/>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   REPORT VIEW
═══════════════════════════════════════════════════ */
const ReportView = ({ campaign, onBack }) => {
  const m = campaign.metrics;
  const timeline = useMemo(()=>mkTimelineData(),[]);
  const maxVal = Math.max(...timeline.map(t=>t.opens));
  const links = [
    {url:"https://vantari.com.br/demo",     clicks:312,pct:35.0},
    {url:"https://vantari.com.br/pricing",  clicks:228,pct:25.6},
    {url:"https://vantari.com.br/blog/roi", clicks:180,pct:20.2},
    {url:"https://vantari.com.br/features", clicks:108,pct:12.1},
    {url:"https://vantari.com.br/contact",  clicks:64, pct:7.2 },
  ];

  const downloadCSV = () => {
    const rows=[["Lead","Email","Status","Enviado","Abriu","Clicou"],["Ana Costa","ana@techno.com","delivered","sim","sim","sim"],["Carlos M.","carlos@pixel.com","delivered","sim","não","não"]];
    const csv=rows.map(r=>r.join(",")).join("\n");
    const a=document.createElement("a");a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv);a.download=`${campaign.name}.csv`;a.click();
  };

  const REPORT_METRICS = [
    {label:"Enviados",    value:m.sent.toLocaleString("pt-BR"),         Icon:Send,          color:T.ink,    sub:undefined},
    {label:"Entregues",   value:m.delivered.toLocaleString("pt-BR"),    Icon:MailOpen,      color:T.green,  sub:`${((m.delivered/m.sent)*100).toFixed(1)}%`},
    {label:"Abertos",     value:m.opened.toLocaleString("pt-BR"),       Icon:Mail,          color:T.blue,   sub:`${m.openRate}%`},
    {label:"Clicaram",    value:m.clicked.toLocaleString("pt-BR"),      Icon:Link2,         color:T.teal,   sub:`${m.clickRate}%`},
    {label:"Bounces",     value:m.bounced.toLocaleString("pt-BR"),      Icon:AlertTriangle, color:m.bounced>200?T.red:T.amber,sub:`${((m.bounced/m.sent)*100).toFixed(1)}%`},
    {label:"Descadastr.", value:m.unsubscribed.toLocaleString("pt-BR"), Icon:XCircle,       color:T.muted,  sub:undefined},
  ];

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",color:T.muted,display:"flex",alignItems:"center"}}>
            <ChevronLeft size={18} aria-hidden="true"/>
          </button>
          <div>
            <h2 style={{margin:"0 0 3px",fontFamily:T.head,fontSize:20,fontWeight:700,color:T.ink,letterSpacing:"-0.02em"}}>{campaign.name}</h2>
            <p style={{margin:0,fontFamily:T.font,fontSize:12,fontWeight:600,color:T.muted}}>Enviada em {new Date(campaign.scheduledAt).toLocaleString("pt-BR")} · {campaign.audienceCount.toLocaleString("pt-BR")} destinatários</p>
          </div>
        </div>
        <Btn onClick={downloadCSV} variant="ghost" size="md" icon={Download}>Exportar CSV</Btn>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:12,marginBottom:20}}>
        {REPORT_METRICS.map(mt=><MetricPill key={mt.label} {...mt}/>)}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:16}}>
        <div style={{background:T.white,border:`0.5px solid ${T.border}`,borderRadius:12,padding:"22px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
            <div style={{fontFamily:T.head,fontSize:15,fontWeight:700,color:T.ink}}>Abertura ao Longo do Tempo</div>
            <div style={{display:"flex",gap:14}}>
              <span style={{display:"flex",alignItems:"center",gap:5,fontFamily:T.font,fontSize:11,fontWeight:600,color:T.blue}}><span style={{width:12,height:3,background:T.blue,display:"inline-block",borderRadius:2}}/>Aberturas</span>
              <span style={{display:"flex",alignItems:"center",gap:5,fontFamily:T.font,fontSize:11,fontWeight:600,color:T.teal}}><span style={{width:12,height:3,background:T.teal,display:"inline-block",borderRadius:2}}/>Cliques</span>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"flex-end",gap:4,height:160,padding:"0 0 20px"}}>
            {timeline.map((t,i)=>(
              <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,height:"100%",justifyContent:"flex-end",position:"relative"}}>
                <div style={{width:"100%",display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
                  <div style={{width:"70%",height:`${(t.opens/maxVal)*120}px`,background:T.blue,borderRadius:"3px 3px 0 0",opacity:0.85,minHeight:2}}/>
                  <div style={{width:"70%",height:`${(t.clicks/maxVal)*120*0.4}px`,background:T.teal,borderRadius:"3px 3px 0 0",opacity:0.7,minHeight:1}}/>
                </div>
                {i%4===0&&<span style={{position:"absolute",bottom:-16,fontFamily:T.mono,fontSize:8,color:T.muted}}>{t.hour}h</span>}
              </div>
            ))}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontFamily:T.font,fontSize:11,fontWeight:600,color:T.muted,marginTop:8}}>
            <span>Pico: 9h–11h da manhã</span>
            <span>Taxa de clique-por-abertura: {((m.clicked/m.opened)*100).toFixed(1)}%</span>
          </div>
        </div>

        <div style={{background:T.white,border:`0.5px solid ${T.border}`,borderRadius:12,padding:"22px"}}>
          <div style={{fontFamily:T.head,fontSize:15,fontWeight:700,color:T.ink,marginBottom:16}}>Cliques por Link</div>
          {links.map((l,i)=>(
            <div key={i} style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <span style={{fontFamily:T.mono,fontSize:10,color:T.muted,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:190}}>{l.url.replace("https://","")}</span>
                <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0,marginLeft:8}}>
                  <span style={{fontFamily:T.head,fontSize:12,fontWeight:700,color:T.ink}}>{l.clicks}</span>
                  <span style={{fontFamily:T.font,fontSize:10,fontWeight:700,color:T.green,background:"#f0fdf7",padding:"1px 5px",borderRadius:4}}>{l.pct}%</span>
                </div>
              </div>
              <div style={{height:6,background:T.bg,borderRadius:99,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${l.pct}%`,background:T.blue,borderRadius:99,transition:"width 0.6s ease"}}/>
              </div>
            </div>
          ))}
          <div style={{marginTop:16,background:T.bg,borderRadius:8,padding:"12px",textAlign:"center"}}>
            <div style={{fontFamily:T.font,fontSize:11,fontWeight:600,color:T.muted,marginBottom:8}}>Heatmap de cliques</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
              {Array.from({length:28},(_,i)=>{
                const intensity=Math.random();
                return <div key={i} style={{height:14,borderRadius:3,background:`rgba(0,121,169,${intensity*0.8+0.05})`,transition:"all 0.3s"}} title={`${Math.floor(intensity*100)} cliques`}/>;
              })}
            </div>
            <div style={{fontFamily:T.font,fontSize:9,fontWeight:600,color:T.muted,marginTop:4}}>4 semanas · 7 dias</div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   SEND MODAL
═══════════════════════════════════════════════════ */
const SendModal = ({ campaign, onClose, onDone }) => {
  const [testEmail, setTestEmail]   = useState("");
  const [sending,   setSending]     = useState(false);
  const [result,    setResult]      = useState(null); // {sent, total, test, error}
  const [mode,      setMode]        = useState("confirm"); // confirm | test | done

  const invoke = async (isTest) => {
    setSending(true); setResult(null);
    try {
      const body = isTest ? { campaign_id: campaign.id, test_email: testEmail } : { campaign_id: campaign.id };
      const { data, error: fnErr } = await supabase.functions.invoke("send-campaign", { body });
      if (fnErr) throw new Error(fnErr.message);
      if (data?.error) throw new Error(data.error);
      setResult({ ...data, test: isTest });
      setMode("done");
      if (!isTest) onDone();
    } catch (e) {
      setResult({ error: e.message });
    }
    setSending(false);
  };

  return (
    <div style={{position:"fixed",inset:0,zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.45)",backdropFilter:"blur(4px)"}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:T.white,borderRadius:14,width:"90%",maxWidth:480,boxShadow:"0 25px 60px rgba(0,0,0,0.18)",overflow:"hidden"}}>

        {/* header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 24px",borderBottom:`1px solid ${T.border}`}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,borderRadius:10,background:"#e6f9f2",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Send size={17} color={T.green} aria-hidden="true"/>
            </div>
            <div>
              <div style={{fontFamily:T.head,fontSize:15,fontWeight:700,color:T.ink}}>Enviar Campanha</div>
              <div style={{fontFamily:T.font,fontSize:12,color:T.muted}}>{campaign.name}</div>
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:T.muted,padding:4}}><X size={18}/></button>
        </div>

        <div style={{padding:"20px 24px"}}>
          {/* result banner */}
          {result?.error && (
            <div style={{display:"flex",alignItems:"center",gap:8,background:"#fef2f2",border:`1px solid ${T.red}`,borderRadius:8,padding:"10px 14px",marginBottom:16}}>
              <AlertCircle size={15} color={T.red} aria-hidden="true"/>
              <span style={{fontFamily:T.font,fontSize:13,color:T.red}}>{result.error}</span>
            </div>
          )}
          {mode==="done" && !result?.error && (
            <div style={{textAlign:"center",padding:"20px 0"}}>
              <div style={{width:56,height:56,borderRadius:"50%",background:"#e6f9f2",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
                <Send size={24} color={T.green}/>
              </div>
              <h3 style={{fontFamily:T.head,fontSize:16,fontWeight:700,color:T.ink,margin:"0 0 8px"}}>
                {result?.test ? "Email de teste enviado!" : "Campanha enviada!"}
              </h3>
              <p style={{fontFamily:T.font,fontSize:13,color:T.muted,margin:"0 0 20px"}}>
                {result?.test
                  ? `Email enviado para ${testEmail}`
                  : `${result?.sent ?? 0} de ${result?.total ?? 0} emails enviados com sucesso`}
              </p>
              <Btn onClick={onClose} variant="primary" size="md" full>Fechar</Btn>
            </div>
          )}

          {mode!=="done" && (
            <>
              {/* campaign summary */}
              <div style={{background:T.bg,borderRadius:10,padding:"14px 16px",marginBottom:20}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {[
                    ["Assunto",   campaign.subject || "—"],
                    ["Remetente", campaign.fromEmail || campaign.sender || "—"],
                    ["Conteúdo",  campaign.htmlContent ? "HTML salvo" : "! Nenhum HTML"],
                  ].map(([k,v])=>(
                    <div key={k}>
                      <div style={{fontFamily:T.head,fontSize:10,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:2}}>{k}</div>
                      <div style={{fontFamily:T.font,fontSize:13,fontWeight:600,color:v.startsWith("!")?T.amber:T.ink}}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* mode tabs */}
              <div style={{display:"flex",gap:6,marginBottom:18}}>
                {[["confirm","Envio Real"],["test","Envio de Teste"]].map(([m,lbl])=>(
                  <button key={m} onClick={()=>setMode(m)}
                    style={{flex:1,padding:"8px",fontFamily:T.font,fontSize:13,fontWeight:700,border:`1px solid ${mode===m?T.blue:T.border}`,borderRadius:8,background:mode===m?T.blueL:T.white,color:mode===m?T.blue:T.ink,cursor:"pointer"}}>
                    {lbl}
                  </button>
                ))}
              </div>

              {mode==="confirm" && (
                <div>
                  <div style={{background:"#fff4e6",border:`0.5px solid ${T.amber}`,borderRadius:8,padding:"12px 14px",marginBottom:18,fontFamily:T.font,fontSize:13,fontWeight:600,color:"#92400e"}}>
                    Isso enviará o email para <strong>todos os leads ativos</strong> (não descadastrados). Esta ação não pode ser desfeita.
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <Btn onClick={onClose} variant="ghost" size="md" sx={{flex:1,justifyContent:"center"}}>Cancelar</Btn>
                    <Btn onClick={()=>invoke(false)} variant="success" size="md" icon={sending?undefined:Send} disabled={sending} sx={{flex:1,justifyContent:"center"}}>
                      {sending
                        ? <><Loader2 size={14} style={{animation:"spin 0.7s linear infinite",marginRight:6}}/>Enviando...</>
                        : "Confirmar Envio"}
                    </Btn>
                  </div>
                </div>
              )}

              {mode==="test" && (
                <div>
                  <div style={{marginBottom:14}}>
                    <label style={{display:"block",fontFamily:T.head,fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:5}}>Email para teste</label>
                    <input value={testEmail} onChange={e=>setTestEmail(e.target.value)} placeholder="voce@exemplo.com"
                      type="email"
                      style={{width:"100%",boxSizing:"border-box",padding:"10px 13px",fontFamily:T.font,fontSize:13,fontWeight:600,border:`1px solid ${T.border}`,borderRadius:8,outline:"none",color:T.ink}}/>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <Btn onClick={onClose} variant="ghost" size="md" sx={{flex:1,justifyContent:"center"}}>Cancelar</Btn>
                    <Btn onClick={()=>invoke(true)} variant="primary" size="md" icon={sending?undefined:Send} disabled={sending||!testEmail} sx={{flex:1,justifyContent:"center"}}>
                      {sending
                        ? <><Loader2 size={14} style={{animation:"spin 0.7s linear infinite",marginRight:6}}/>Enviando...</>
                        : "Enviar Teste"}
                    </Btn>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   ROOT APP
═══════════════════════════════════════════════════ */
const MODULE_TABS = [
  { id:"list",      Icon:Mail,       label:"Campanhas"  },
  { id:"templates", Icon:LayoutTemplate, label:"Templates" },
];

/* ═══════════════════════════════════════════════════════════════════════
   LIBRARY TEMPLATES — 5 curated design templates (Vantari Email Templates)
════════════════════════════════════════════════════════════════════════ */
const LIBRARY_TEMPLATES = [
  {
    id:"editorial", num:"01", color:T.teal,   colorBg:"#E0F2F8",
    name:"Newsletter Editorial",
    sub:'Substitui o atual "Newsletter Blog". Educar a base com um artigo por vez.',
    tag:"Quinzenal", audience:"base ativa", ctaLabel:"ler artigo", readTime:"45s",
    category:"newsletter",
    slots:["hero_image — imagem 600×220","edition_label — ex: 'Edição 14 · Educativo'","headline + tldr + body","primary_cta + secondary_cta","testimonial (opcional, on/off)"],
    vars:["*|PRIMEIRO_NOME|* — vantari.leads.name","*|WEB_PREVIEW|* — render externo","*|UNSUBSCRIBE|* — LGPD obrigatório"],
  },
  {
    id:"compare", num:"02", color:T.green,  colorBg:"#ECFDF5",
    name:"Comparativo lado a lado",
    sub:"Para a mensagem mais forte da marca: antecipação vs empréstimo.",
    tag:"Conversão", audience:"leads MQL", ctaLabel:"simular", readTime:"30s",
    category:"conversion",
    slots:["compare_win[] — até 6 bullets","compare_lose[] — até 6 bullets","stats[3] — KPI strip opcional"],
    vars:["Lead chegou via blog/Ads de 'empréstimo'","Segmento 'consultou alternativas de crédito'","Reativação de lead que abandonou simulação"],
    varsLabel:"Quando usar",
  },
  {
    id:"offer", num:"03", color:T.amber,   colorBg:"#FEF3C7",
    name:"Oferta qualificada",
    sub:"Disparado por segmento: processo em 2ª instância + ticket ≥ R$ 50k.",
    tag:"Segmentada", audience:"lead SQL", ctaLabel:"agendar", readTime:"25s",
    category:"segmented",
    slots:["specialist_name + specialist_phone","offer_pill + offer_bullets","kpi_strip (3 itens)"],
    vars:["segment = 'Premium · 2a-inst · 50k+'","lead_score ≥ 80","expires_in = 7d (countdown opcional)"],
    varsLabel:"Trigger automático",
  },
  {
    id:"welcome", num:"04", color:"#7C5CFF", colorBg:"#F0ECFC",
    name:"Boas-vindas / Onboarding",
    sub:"Primeiro contato após cadastro. Explica a Vantari em 3 passos.",
    tag:"Automático", audience:"novo lead", ctaLabel:"simular", readTime:"40s",
    category:"onboarding",
    slots:["social_proof — número de clientes ativo","steps[3] — copy editável","tldr — 'o que você nunca terá'"],
    vars:["Workflow onboarding · trigger: novo cadastro","Delay: 5 min após confirmação de e-mail"],
    varsLabel:"Disparo automático",
  },
  {
    id:"transactional", num:"05", color:T.coral,  colorBg:"#FEF2F2",
    name:"Atualização de status",
    sub:"Notifica o cliente quando sua proposta avança de etapa. Disparo via API.",
    tag:"Transacional", audience:"cliente em proposta", ctaLabel:"ver proposta", readTime:"20s",
    category:"transactional",
    slots:["proposal_id, net_amount, est_date","stage: analise · avaliacao · proposta · assinatura · pagamento","specialist — nome e contato"],
    vars:["POST /v1/email/transactional","Domínio dedicado · sem footer de marketing","LGPD: legítimo interesse, sem opt-out"],
    varsLabel:"Disparo via API",
  },
];

/* Shared CSS injected into all email preview iframes */
const EMAIL_PREVIEW_CSS = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@500;600;700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}body{margin:0;padding:0;font-family:'Inter',Arial,sans-serif;color:#2E3D4B;background:#fff}
.pre{background:#F7F8FA;padding:8px 22px;font-size:11px;color:#A8B0B8;text-align:center;border-bottom:1px solid #EEF0F3;font-family:'JetBrains Mono',monospace}
.hdr{padding:20px 30px 16px;background:#fff;border-bottom:1px solid #EEF0F3;display:flex;justify-content:space-between;align-items:center}
.logo{height:22px;width:72px;background:linear-gradient(135deg,#0D7491,#14A273);border-radius:4px}
.wa{display:inline-flex;align-items:center;gap:6px;font-size:9px;color:#14A273;padding:5px 9px;border:1px solid rgba(20,162,115,.3);border-radius:999px;font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:.06em}
.dot{width:5px;height:5px;border-radius:50%;background:#14A273}
.hero{width:100%;height:160px;background:linear-gradient(135deg,rgba(13,116,145,.1),rgba(20,162,115,.1)),repeating-linear-gradient(45deg,#e7eef3 0 8px,#f1f5f8 8px 16px);border-bottom:1px solid #EEF0F3;display:flex;align-items:center;justify-content:center;color:#A8B0B8;font-size:10px;text-transform:uppercase;letter-spacing:.1em;font-family:'JetBrains Mono',monospace}
.body{padding:28px 34px 18px}
.ey{font-family:'JetBrains Mono',monospace;font-size:10px;color:#0D7491;text-transform:uppercase;letter-spacing:.12em;margin-bottom:11px}
.h1{font-family:'Sora',Arial,sans-serif;font-weight:700;color:#181A1F;font-size:24px;line-height:1.2;letter-spacing:-.01em;margin:0 0 12px}
.lead{font-size:14px;line-height:1.55;color:#2E3D4B;margin:0 0 14px;font-weight:500}
.p{font-size:13px;line-height:1.6;color:#2E3D4B;margin:0 0 12px;font-weight:500}
.tldr{border:1px solid rgba(13,116,145,.25);background:#E0F2F8;border-radius:8px;padding:13px 15px;margin:0 0 18px}
.tldr-l{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#0D7491;margin-bottom:6px}
.tldr p{font-size:13px;line-height:1.5;margin:0;color:#0E1A24;font-weight:600}
.cta{display:inline-block;background:#0D7491;color:#fff;text-decoration:none;font-family:'Sora',Arial,sans-serif;font-weight:700;font-size:12px;padding:12px 20px;border-radius:8px}
.cta.green{background:#14A273}
.cta.ghost{background:transparent;color:#0D7491;border:1.5px solid #0D7491}
.cta-row{display:flex;gap:9px;align-items:center;margin:4px 0 20px}
.note{font-size:11px;color:#8696A5;font-family:'JetBrains Mono',monospace}
.quote{border-left:3px solid #14A273;padding:3px 0 3px 15px;margin:20px 0}
.quote p{font-size:13px;line-height:1.5;color:#0E1A24;font-weight:500;margin:0 0 6px}
.quote cite{font-size:10px;color:#5A6B7A;font-family:'JetBrains Mono',monospace}
.sig{margin:20px 0 0;padding-top:16px;border-top:1px solid #EEF0F3;font-size:12.5px;line-height:1.5;color:#2E3D4B}
.ps{font-size:11.5px;color:#5A6B7A;margin-top:9px;padding:9px 11px;background:#FAFBFC;border-radius:7px;border-left:2px solid #A8B0B8}
.compare{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0 18px}
.col{border:1px solid #E8EEF3;border-radius:8px;padding:13px}
.col.win{border-color:rgba(20,162,115,.35);background:#ECFDF5}
.col h4{font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#5A6B7A;margin:0 0 3px}
.col.win h4{color:#14A273}
.col .name{font-family:'Sora',Arial,sans-serif;font-weight:700;font-size:13.5px;color:#0E1A24;margin-bottom:9px}
.col.lose .name{color:#888}
.col ul{list-style:none;margin:0;padding:0}
.col li{display:grid;grid-template-columns:17px 1fr;gap:6px;font-size:11.5px;color:#2E3D4B;padding:5px 0;border-top:1px solid rgba(0,0,0,.05)}
.col li:first-child{border-top:0}
.mk{font-family:'Sora',Arial,sans-serif;font-weight:700;text-align:center}
.win .mk{color:#14A273}
.lose .mk{color:#B8BABC}
.stats{display:grid;grid-template-columns:1fr 1fr 1fr;border:1px solid #E8EEF3;border-radius:8px;overflow:hidden;margin:10px 0 16px}
.stat{padding:12px 10px;text-align:center;border-right:1px solid #E8EEF3;background:#FAFBFC}
.stat:last-child{border-right:0}
.stat .v{font-family:'Sora',Arial,sans-serif;font-weight:700;font-size:19px;color:#0D7491;line-height:1}
.stat .l{font-family:'JetBrains Mono',monospace;font-size:9px;color:#5A6B7A;text-transform:uppercase;letter-spacing:.06em;margin-top:4px}
.offer{background:linear-gradient(135deg,#0D7491,#14A273);border-radius:10px;padding:20px;color:#fff;margin:10px 0 16px;position:relative;overflow:hidden}
.offer::after{content:'';position:absolute;top:-40%;right:-20%;width:280px;height:280px;background:radial-gradient(circle,rgba(20,162,115,.4) 0%,transparent 60%);pointer-events:none}
.offer .pill{font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.12em;text-transform:uppercase;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);padding:4px 9px;border-radius:999px;margin-bottom:11px;display:inline-block;position:relative;z-index:1}
.offer h3{color:#fff;font-family:'Sora',Arial,sans-serif;font-size:17px;line-height:1.25;font-weight:700;margin:0 0 9px;max-width:90%;position:relative;z-index:1}
.offer ul{list-style:none;margin:0 0 13px;padding:0;position:relative;z-index:1}
.offer li{font-size:12px;color:rgba(255,255,255,.92);padding:4px 0;display:grid;grid-template-columns:19px 1fr;gap:4px;align-items:start}
.offer li::before{content:'';width:11px;height:11px;border-radius:50%;background:#14A273;box-shadow:inset 0 0 0 3px #fff,inset 0 0 0 4px #14A273;margin-top:3px}
.offer .cta{background:#14A273;position:relative;z-index:1}
.steps{display:grid;grid-template-columns:1fr 1fr 1fr;gap:9px;margin:10px 0 16px}
.step{border:1px solid #E8EEF3;border-radius:8px;padding:13px 10px 11px;background:#FAFBFC}
.step .n{font-family:'Sora',Arial,sans-serif;font-weight:800;font-size:19px;color:#0D7491;line-height:1;margin-bottom:7px}
.step .t{font-size:11.5px;font-weight:700;color:#0E1A24;margin-bottom:3px;line-height:1.3}
.step .d{font-size:10.5px;color:#5A6B7A;line-height:1.4}
.payout{background:#ECFDF5;border:1px solid rgba(20,162,115,.3);border-radius:8px;padding:15px 17px;margin:10px 0 16px;display:grid;grid-template-columns:1fr auto;gap:11px;align-items:end}
.payout .l{font-family:'JetBrains Mono',monospace;font-size:9px;color:#14A273;text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px}
.payout .v{font-family:'Sora',Arial,sans-serif;font-weight:700;font-size:22px;color:#064E36;line-height:1}
.payout .date{text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;color:#5A6B7A}
.payout .date b{display:block;color:#0E1A24;font-size:11px;font-weight:700;margin-top:2px}
.timeline{border:1px solid #E8EEF3;border-radius:8px;overflow:hidden;margin:10px 0 16px}
.trow{display:grid;grid-template-columns:95px 1fr auto;gap:11px;padding:10px 15px;align-items:center;border-top:1px solid #E8EEF3;font-size:11.5px}
.trow:first-child{border-top:0}
.trow.done{background:#ECFDF5}
.trow.active{background:#E0F2F8}
.trow .stage{font-family:'JetBrains Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#5A6B7A}
.trow.done .stage{color:#14A273}
.trow.active .stage{color:#0D7491}
.trow .title{color:#0E1A24;font-weight:600}
.trow .date{font-family:'JetBrains Mono',monospace;font-size:9px;color:#A8B0B8}
.trow.done .date{color:#14A273}
.banner{background:linear-gradient(90deg,#ECFDF5,#fff);padding:10px 26px;font-size:11px;color:#2E3D4B;border-bottom:1px solid rgba(20,162,115,.2);display:flex;justify-content:space-between;align-items:center;font-family:'JetBrains Mono',monospace}
.banner b{color:#14A273}
.ftr{background:#F7F8FA;padding:20px 34px 16px;border-top:1px solid #EEF0F3}
.ftr-nav{display:flex;gap:16px;justify-content:center;padding-bottom:13px;border-bottom:1px solid #EEF0F3;flex-wrap:wrap}
.ftr-nav a{color:#0D7491;text-decoration:none;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.03em;font-family:'Sora',Arial,sans-serif}
.ftr-soc{display:flex;gap:7px;justify-content:center;padding:12px 0}
.ftr-soc a{width:26px;height:26px;border-radius:50%;background:#0D7491;color:#fff;display:grid;place-items:center;font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;text-decoration:none}
.ftr-info{text-align:center;font-size:10px;color:#A8B0B8;line-height:1.6}
.ftr-brand{font-family:'Sora',Arial,sans-serif;font-weight:700;color:#0E1A24;text-transform:uppercase;letter-spacing:.03em;font-size:10px;display:block;margin-bottom:5px}
.ftr-info a{color:#5A6B7A}
.slot{background:rgba(20,162,115,.1);border-radius:3px;padding:0 3px}
</style>`;

const EMAIL_BODIES = {
  editorial: `
<div class="pre">Não está vendo este e-mail? <a href="#" style="color:#5A6B7A">Abrir como página</a></div>
<div class="hdr"><div class="logo"></div><span class="wa"><span class="dot"></span>WhatsApp</span></div>
<div class="hero">[ hero · imagem do artigo · 600×220 ]</div>
<div class="body">
  <div class="ey">Edição 14 · Educativo</div>
  <h1 class="h1">Vender o processo ou pedir empréstimo? A diferença é crucial.</h1>
  <div style="display:flex;gap:14px;font-family:'JetBrains Mono',monospace;font-size:10px;color:#A8B0B8;text-transform:uppercase;letter-spacing:.08em;margin-bottom:18px">
    <span>5 min de leitura</span><span>·</span><span>Por Equipe Vantari</span>
  </div>
  <div class="tldr"><div class="tldr-l">— Em 30 segundos</div><p>Antecipar seu crédito trabalhista não é empréstimo. Você vende um direito que já é seu — sem juros, sem parcelas, sem análise de Serasa.</p></div>
  <p class="lead"><span class="slot">*|PRIMEIRO_NOME|*</span>, você sabia que <strong style="color:#0E1A24">antecipar seu crédito trabalhista não gera dívida?</strong></p>
  <p class="p">No empréstimo, você contrai um passivo, paga juros compostos e compromete sua renda futura. Na antecipação, você vende um ativo que já existe — o valor do seu processo — e recebe à vista.</p>
  <div class="cta-row"><a class="cta" href="#">Ler artigo completo</a><a class="cta ghost" href="#">Falar com um especialista</a></div>
  <div class="quote"><p>"Pensei que antecipação fosse empréstimo. A Vantari me explicou que era uma venda. Sem dívida, sem parcela."</p><cite>Deise S. — aprovada em 04/2026</cite></div>
  <div class="sig">Um abraço,<br><strong style="color:#0E1A24">Equipe Vantari</strong><div class="ps"><b style="color:#0E1A24">P.S.</b> Quer entender ainda mais? Nosso blog tem um <a href="#" style="color:#0D7491">guia completo de antecipação</a> com casos reais.</div></div>
</div>
<div class="ftr">
  <nav class="ftr-nav"><a href="#">Como funciona</a><a href="#">Perguntas frequentes</a><a href="#">Blog</a><a href="#">Simular</a></nav>
  <div class="ftr-soc"><a href="#">IG</a><a href="#">FB</a><a href="#">IN</a></div>
  <div class="ftr-info"><span class="ftr-brand">Vantari Soluções Financeiras</span>Alameda Santos, 1165 · cj 11 · São Paulo · SP<br><a href="#">Atualizar preferências</a> · <a href="#">Descadastrar</a> · <a href="#">Política de privacidade</a></div>
</div>`,

  compare: `
<div class="pre">Não é empréstimo. Não tem juros. Não vai pro Serasa.</div>
<div class="hdr"><div class="logo"></div><span class="wa"><span class="dot"></span>WhatsApp</span></div>
<div class="body" style="padding-top:22px">
  <div class="ey">Antes de pedir empréstimo, leia isto</div>
  <h1 class="h1"><span class="slot">*|PRIMEIRO_NOME|*</span>, sua dívida pode ter <span style="color:#14A273">outra saída.</span></h1>
  <p class="lead">Se você tem um processo trabalhista correndo, já existe um valor seu esperando. Você não precisa contrair mais dívida — você pode antecipar.</p>
  <div class="compare">
    <div class="col win"><h4>Recomendado</h4><div class="name">Antecipação</div><ul>
      <li><span class="mk">✓</span>Você vende um ativo seu</li>
      <li><span class="mk">✓</span>Sem análise de Serasa ou CPF</li>
      <li><span class="mk">✓</span>Pagamento único, à vista</li>
      <li><span class="mk">✓</span>Deságio único, não juros</li>
      <li><span class="mk">✓</span>Risco do processo é da Vantari</li>
    </ul></div>
    <div class="col lose"><h4>Atenção</h4><div class="name">Empréstimo pessoal</div><ul>
      <li><span class="mk">—</span>Cria uma dívida nova</li>
      <li><span class="mk">—</span>Juros compostos (até 3,5% a.m.)</li>
      <li><span class="mk">—</span>Parcelas comprometem orçamento</li>
      <li><span class="mk">—</span>Atraso = negativação</li>
      <li><span class="mk">—</span>Risco é todo seu</li>
    </ul></div>
  </div>
  <div class="cta-row"><a class="cta green" href="#">Simular antecipação</a><span class="note">leva 2 minutos · sem cadastro</span></div>
  <div class="stats">
    <div class="stat"><div class="v">5 dias</div><div class="l">pagamento</div></div>
    <div class="stat"><div class="v">100%</div><div class="l">online</div></div>
    <div class="stat"><div class="v">0</div><div class="l">parcelas</div></div>
  </div>
  <div class="ps" style="border-left-color:#14A273;background:#ECFDF5"><b style="color:#0E1A24">P.S.</b> Ainda em dúvida? Nosso especialista responde em até 2h pelo <a href="#" style="color:#14A273">WhatsApp</a>.</div>
</div>
<div class="ftr">
  <nav class="ftr-nav"><a href="#">Como funciona</a><a href="#">Perguntas frequentes</a><a href="#">Blog</a></nav>
  <div class="ftr-soc"><a href="#">IG</a><a href="#">FB</a><a href="#">IN</a></div>
  <div class="ftr-info"><span class="ftr-brand">Vantari Soluções Financeiras</span>Alameda Santos, 1165 · cj 11 · São Paulo · SP<br><a href="#">Descadastrar</a> · <a href="#">Política de privacidade</a></div>
</div>`,

  offer: `
<div class="pre">Condição especial para o seu perfil — válida por 7 dias.</div>
<div class="hdr"><div class="logo"></div><span class="wa"><span class="dot"></span>WhatsApp</span></div>
<div class="banner"><span>Identificamos uma <b>oportunidade no seu processo</b></span><span style="color:#5A6B7A">Análise · 13/05/2026</span></div>
<div class="body">
  <div class="ey">Análise personalizada</div>
  <h1 class="h1"><span class="slot">*|PRIMEIRO_NOME|*</span>, seu processo se qualifica para uma condição especial.</h1>
  <p class="lead">Após análise do seu cadastro, identificamos que seu processo atende aos critérios da nossa <strong style="color:#0E1A24">linha premium de antecipação</strong> — deságio reduzido e pagamento em 3 dias úteis.</p>
  <div class="offer">
    <span class="pill">Linha Premium · 7 dias</span>
    <h3>Antecipação com deságio reduzido e pagamento em até 3 dias úteis.</h3>
    <ul>
      <li>Processo em 2ª instância confirmado</li>
      <li>Valor estimado acima de R$ 50.000</li>
      <li>Análise gratuita e sem compromisso</li>
    </ul>
    <a class="cta" href="#" style="background:#14A273">Agendar análise com especialista →</a>
  </div>
  <div class="stats">
    <div class="stat"><div class="v" style="color:#14A273">3 dias</div><div class="l">pagamento</div></div>
    <div class="stat"><div class="v" style="color:#14A273">−1.5pp</div><div class="l">deságio</div></div>
    <div class="stat"><div class="v" style="color:#14A273">Premium</div><div class="l">atendimento</div></div>
  </div>
  <p class="p" style="color:#8696A5;font-size:12px">Esta análise expira em 7 dias e foi enviada apenas para a base qualificada.</p>
  <div class="cta-row"><a class="cta ghost" href="#">Falar pelo WhatsApp</a></div>
  <div class="sig"><strong style="color:#0E1A24">Raquel · Especialista Vantari</strong><br><span style="color:#5A6B7A;font-size:11px">raquel@vantari.com.br · (11) 93401-8661</span></div>
</div>
<div class="ftr">
  <div class="ftr-info"><span class="ftr-brand">Vantari Soluções Financeiras</span>Você recebeu este e-mail porque consultou uma antecipação conosco.<br><a href="#">Descadastrar destas ofertas</a> · <a href="#">Atualizar preferências</a></div>
</div>`,

  welcome: `
<div class="pre">Bem-vindo à Vantari — veja como funciona em 3 passos.</div>
<div class="hdr"><div class="logo"></div><span class="wa"><span class="dot"></span>WhatsApp</span></div>
<div class="body">
  <div class="ey">Boas-vindas</div>
  <h1 class="h1">Oi, <span class="slot">*|PRIMEIRO_NOME|*</span>. Que bom ter você aqui.</h1>
  <p class="lead">Você acabou de entrar para a base de mais de <strong style="color:#0E1A24">12 mil pessoas</strong> que descobriram que dá pra transformar um processo trabalhista em dinheiro — sem dívida, sem juros, sem complicação.</p>
  <p class="p" style="font-weight:700;color:#0E1A24;margin-top:16px">Como funciona, em 3 passos:</p>
  <div class="steps">
    <div class="step"><div class="n">01</div><div class="t">Você envia o processo</div><div class="d">Pelo WhatsApp ou pelo nosso portal. Em minutos.</div></div>
    <div class="step"><div class="n">02</div><div class="t">A gente analisa e propõe</div><div class="d">Análise gratuita. Você recebe uma proposta em até 48h.</div></div>
    <div class="step"><div class="n">03</div><div class="t">Aceitou? Recebe à vista</div><div class="d">Pagamento em até 5 dias úteis, direto na sua conta.</div></div>
  </div>
  <div class="cta-row"><a class="cta" href="#">Simular meu processo agora</a><a class="cta ghost" href="#">Ver FAQ</a></div>
  <div class="tldr" style="margin-top:20px;border-color:rgba(20,162,115,.25);background:#ECFDF5">
    <div class="tldr-l" style="color:#14A273">— O que você nunca terá com a gente</div>
    <p style="font-weight:500">Análise de Serasa · CPF na praça · juros · parcela · risco do processo. Nada disso. Se algo der errado no processo, o prejuízo é nosso, não seu.</p>
  </div>
  <div class="sig">Tem qualquer dúvida? É só responder este e-mail.<br><strong style="color:#0E1A24">— Equipe Vantari</strong></div>
</div>
<div class="ftr">
  <nav class="ftr-nav"><a href="#">Como funciona</a><a href="#">FAQ</a><a href="#">Blog</a><a href="#">Contato</a></nav>
  <div class="ftr-soc"><a href="#">IG</a><a href="#">FB</a><a href="#">IN</a></div>
  <div class="ftr-info"><span class="ftr-brand">Vantari Soluções Financeiras</span>Alameda Santos, 1165 · cj 11 · São Paulo · SP<br><a href="#">Descadastrar</a> · <a href="#">Política de privacidade</a></div>
</div>`,

  transactional: `
<div class="pre">Atualização da sua proposta · Vantari · #VTR-2026-04823</div>
<div class="hdr"><div class="logo"></div><span class="wa"><span class="dot"></span>WhatsApp</span></div>
<div class="body">
  <div class="ey" style="color:#14A273">✓ Proposta aprovada</div>
  <h1 class="h1"><span class="slot">*|PRIMEIRO_NOME|*</span>, sua proposta foi aprovada.</h1>
  <p class="lead">A análise jurídica e financeira do seu processo terminou. Você pode revisar a proposta, tirar dúvidas e, se concordar, assinar pelo nosso portal.</p>
  <div class="payout">
    <div><div class="l">Valor líquido a receber</div><div class="v">R$ <span class="slot">68.420</span>,00</div></div>
    <div class="date">Pagamento estimado em<br><b><span class="slot">22 de maio · 2026</span></b></div>
  </div>
  <div class="timeline">
    <div class="trow done"><div class="stage">01 · Análise</div><div class="title">Documentos validados</div><div class="date">11/05</div></div>
    <div class="trow done"><div class="stage">02 · Avaliação</div><div class="title">Cálculo do deságio concluído</div><div class="date">12/05</div></div>
    <div class="trow active"><div class="stage">03 · Proposta</div><div class="title">Aguardando sua aprovação</div><div class="date">hoje</div></div>
    <div class="trow"><div class="stage">04 · Assinatura</div><div class="title">Contrato digital</div><div class="date">—</div></div>
    <div class="trow"><div class="stage">05 · Pagamento</div><div class="title">Transferência via PIX</div><div class="date">—</div></div>
  </div>
  <div class="cta-row"><a class="cta" href="#">Ver proposta completa</a><a class="cta ghost" href="#">Falar com Raquel</a></div>
  <p class="p" style="font-size:12px;color:#8696A5;margin-top:16px">A proposta fica válida por 7 dias corridos. Se precisar de mais tempo ou tiver qualquer dúvida sobre o cálculo, sua especialista responde no WhatsApp.</p>
  <div class="sig"><strong style="color:#0E1A24">Raquel Andrade</strong><br><span style="color:#5A6B7A;font-size:11px">Especialista responsável · raquel@vantari.com.br</span></div>
</div>
<div class="ftr">
  <div class="ftr-info"><span class="ftr-brand">Vantari Soluções Financeiras</span>E-mail transacional · enviado em 13/05/2026 às 16:12<br>Identificador da proposta: <a href="#">#VTR-2026-04823</a></div>
</div>`,
};

function getEmailPreviewHtml(tplId) {
  return `<!doctype html><html><head><meta charset="utf-8">${EMAIL_PREVIEW_CSS}</head><body>${EMAIL_BODIES[tplId] || ""}</body></html>`;
}

/* Template card for the Biblioteca Vantari section */
function LibraryTemplateCard({ tpl, onUse, onPreview }) {
  const [hov, setHov] = useState(false);
  const scale = 0.46;
  const emailW = 600;
  const containerH = 300;

  return (
    <article
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: T.white, border:`1px solid ${hov ? tpl.color+"55" : T.border}`,
        borderRadius:14, overflow:"hidden",
        boxShadow: hov ? `0 8px 24px -8px ${tpl.color}30` : "0 1px 3px rgba(14,26,36,.04)",
        transition:"all .2s",
      }}>

      {/* Card header */}
      <header style={{ padding:"18px 20px 14px", borderBottom:`1px solid ${T.border}`, display:"grid", gridTemplateColumns:"40px 1fr auto", gap:14, alignItems:"center" }}>
        <div style={{
          width:40, height:40, borderRadius:9, background:tpl.colorBg,
          color:tpl.color, fontFamily:T.head, fontWeight:800, fontSize:15,
          display:"grid", placeItems:"center", letterSpacing:"-0.02em",
        }}>{tpl.num}</div>
        <div>
          <div style={{ fontFamily:T.head, fontSize:14.5, fontWeight:700, color:T.ink }}>{tpl.name}</div>
          <div style={{ fontFamily:T.font, fontSize:11.5, color:T.muted, marginTop:2, fontWeight:500, lineHeight:1.4 }}>{tpl.sub}</div>
        </div>
        <span style={{
          fontFamily:T.mono, fontSize:9.5, textTransform:"uppercase", letterSpacing:"0.08em",
          color:T.muted, padding:"4px 9px", border:`1px solid ${T.border}`, borderRadius:999, whiteSpace:"nowrap",
        }}>{tpl.tag}</span>
      </header>

      {/* Meta bar */}
      <div style={{ display:"flex", gap:20, padding:"10px 20px", background:"#FAFBFC", borderBottom:`1px solid ${T.border}`, fontSize:11.5, color:T.muted, fontFamily:T.font }}>
        <span>📨 <b style={{ color:T.ink }}>Audiência</b> · {tpl.audience}</span>
        <span>🎯 <b style={{ color:T.ink }}>CTA</b> · {tpl.ctaLabel}</span>
        <span>⏱ <b style={{ color:T.ink }}>Leitura</b> · {tpl.readTime}</span>
      </div>

      {/* Email preview */}
      <div style={{ background:"#EBEEF2", padding:"18px 20px", display:"grid", placeItems:"start center" }}>
        <div style={{ width: emailW * scale, height: containerH, overflow:"hidden", borderRadius:6, boxShadow:"0 2px 8px rgba(14,26,36,.08)" }}>
          <iframe
            srcDoc={getEmailPreviewHtml(tpl.id)}
            style={{ width:emailW, height:Math.ceil(containerH / scale), border:"none", transform:`scale(${scale})`, transformOrigin:"top left", pointerEvents:"none" }}
            title={`Preview: ${tpl.name}`}
            sandbox="allow-same-origin"
          />
        </div>
      </div>

      {/* Footer: slots + vars */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, padding:"14px 20px 16px", background:"#FAFBFC", borderTop:`1px solid ${T.border}` }}>
        <div>
          <div style={{ fontFamily:T.mono, fontSize:9.5, color:T.faint3, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:7 }}>Slots editáveis</div>
          <ul style={{ margin:0, padding:0, listStyle:"none" }}>
            {tpl.slots.map((s,i) => (
              <li key={i} style={{ padding:"2px 0", fontSize:11.5, color:T.muted, fontFamily:T.font }}>
                <code style={{ fontFamily:T.mono, fontSize:10.5, background:"#EEF1F4", padding:"1px 4px", borderRadius:3, color:T.teal }}>{s.split(" — ")[0]}</code>
                {s.includes(" — ") && <span style={{ color:T.faint3 }}> — {s.split(" — ")[1]}</span>}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div style={{ fontFamily:T.mono, fontSize:9.5, color:T.faint3, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:7 }}>{tpl.varsLabel || "Variáveis dinâmicas"}</div>
          <ul style={{ margin:0, padding:0, listStyle:"none" }}>
            {tpl.vars.map((v,i) => (
              <li key={i} style={{ padding:"2px 0", fontSize:11.5, color:T.muted, fontFamily:T.font }}>
                {v.startsWith("*|")
                  ? <><code style={{ fontFamily:T.mono, fontSize:10.5, background:"#EEF1F4", padding:"1px 4px", borderRadius:3, color:T.teal }}>{v.split(" — ")[0]}</code>{v.includes(" — ") && <span style={{ color:T.faint3 }}> — {v.split(" — ")[1]}</span>}</>
                  : v}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding:"12px 20px", borderTop:`1px solid ${T.border}`, display:"flex", gap:8 }}>
        <Btn onClick={() => onUse(tpl)} variant="primary" size="sm" style={{ flex:1, justifyContent:"center" }}>Usar template</Btn>
        <Btn onClick={() => onPreview(tpl)} variant="ghost" size="sm">Preview</Btn>
      </div>
    </article>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   TEMPLATES VIEW — Biblioteca Vantari (5) + Importados do RD
════════════════════════════════════════════════════════════════════════ */
function TemplatesView({ onUseTemplate }) {
  const [tab,        setTab]        = useState("library");   // "library" | "imported"
  const [templates,  setTemplates]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [previewTpl, setPreviewTpl] = useState(null);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("email_templates")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false });
    setTemplates(data || []);
    setLoading(false);
  };
  useEffect(() => { fetchTemplates(); }, []);

  const useLibraryTemplate = (tpl) => {
    const match = TEMPLATES.find(t => t.id === tpl.id);
    onUseTemplate(match ? match.blocks : []);
  };

  const useDbTemplate = async (tpl) => {
    await supabase.from("email_templates").update({ use_count: (tpl.use_count || 0) + 1 }).eq("id", tpl.id);
    onUseTemplate(tpl.blocks || []);
  };

  const deleteTpl = async (id) => {
    if (!window.confirm("Excluir template?")) return;
    await supabase.from("email_templates").delete().eq("id", id);
    fetchTemplates();
  };

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div style={{ display:"flex", gap:4, background:"#EEF2F6", borderRadius:10, padding:3 }}>
          {[
            { id:"library",  label:`Biblioteca Vantari`, count:5 },
            { id:"imported", label:`Importados do RD`,   count:templates.length },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding:"7px 16px", fontSize:12.5, fontWeight:700, fontFamily:T.font, borderRadius:8,
              border:"none", background: tab===t.id ? T.white : "transparent",
              color: tab===t.id ? T.ink : T.muted, cursor:"pointer",
              boxShadow: tab===t.id ? "0 1px 3px rgba(14,26,36,.08)" : "none", transition:"all .15s",
            }}>
              {t.label} <span style={{ fontFamily:T.mono, fontSize:10, color: tab===t.id ? T.teal : T.faint3, marginLeft:4 }}>({t.count})</span>
            </button>
          ))}
        </div>
        {tab === "imported" && (
          <Btn onClick={() => setImportOpen(true)} variant="primary" size="sm" icon={Upload}>Importar do RD</Btn>
        )}
      </div>

      {/* Library tab */}
      {tab === "library" && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(560px,1fr))", gap:28 }}>
          {LIBRARY_TEMPLATES.map(tpl => (
            <LibraryTemplateCard
              key={tpl.id}
              tpl={tpl}
              onUse={useLibraryTemplate}
              onPreview={(t) => setPreviewTpl({ name:t.name, html: getEmailPreviewHtml(t.id) })}
            />
          ))}
        </div>
      )}

      {/* Imported tab */}
      {tab === "imported" && (
        loading ? (
          <div style={{ textAlign:"center", padding:48, color:T.muted }}>Carregando…</div>
        ) : templates.length === 0 ? (
          <div style={{ textAlign:"center", padding:56, color:T.muted, fontFamily:T.font }}>
            <LayoutTemplate size={36} color={T.border} style={{ marginBottom:12 }}/>
            <div style={{ fontFamily:T.head, fontWeight:700, fontSize:15, color:T.ink, marginBottom:6 }}>Nenhum template importado ainda</div>
            <div style={{ fontSize:13, marginBottom:18 }}>Importe templates HTML ou BeeFree JSON do RD Station para começar.</div>
            <Btn onClick={() => setImportOpen(true)} variant="primary" size="md" icon={Upload}>Importar do RD</Btn>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:16 }}>
            {templates.map(tpl => (
              <div key={tpl.id} style={{ background:T.white, border:`0.5px solid ${T.border}`, borderRadius:12, overflow:"hidden" }}>
                <div style={{ height:110, background:`linear-gradient(135deg,${T.blue},${T.teal})`, display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
                  <TypeIcon type={tpl.category} size={30}/>
                  {tpl.source === "rd_station" && (
                    <span style={{ position:"absolute", top:8, right:8, fontSize:9, fontWeight:700, background:"rgba(255,255,255,.25)", color:"#fff", padding:"2px 7px", borderRadius:4, fontFamily:T.font, letterSpacing:.4 }}>DO RD</span>
                  )}
                </div>
                <div style={{ padding:"13px 15px" }}>
                  <div style={{ fontFamily:T.head, fontSize:13.5, fontWeight:700, color:T.ink, marginBottom:3 }}>{tpl.name || "—"}</div>
                  <div style={{ fontFamily:T.font, fontSize:10.5, color:T.muted, marginBottom:3, fontWeight:600, textTransform:"uppercase", letterSpacing:.4 }}>
                    {tpl.category || "general"} · usado {tpl.use_count || 0}x
                  </div>
                  <div style={{ fontFamily:T.font, fontSize:11.5, fontWeight:500, color:T.muted, marginBottom:11, minHeight:28 }}>{tpl.description || "Sem descrição"}</div>
                  <div style={{ display:"flex", gap:6 }}>
                    <Btn onClick={() => useDbTemplate(tpl)} variant="primary" size="xs" style={{ flex:1, justifyContent:"center" }}>Usar</Btn>
                    <Btn onClick={() => setPreviewTpl(tpl)} variant="ghost" size="xs" style={{ flex:1, justifyContent:"center" }}>Preview</Btn>
                    <button onClick={() => deleteTpl(tpl.id)} title="Excluir" style={{ padding:"4px 7px", border:`1px solid ${T.coral}40`, borderRadius:6, background:"transparent", color:T.coral, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:T.font }}>×</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {importOpen && <RdImportModal onClose={() => setImportOpen(false)} onDone={() => { setImportOpen(false); fetchTemplates(); }} />}
      {previewTpl && <TemplatePreviewModal template={previewTpl} onClose={() => setPreviewTpl(null)} />}
    </div>
  );
}

function RdImportModal({ onClose, onDone }) {
  const [mode, setMode] = useState("file"); // "paste" | "file"
  const [name, setName] = useState("");
  const [category, setCategory] = useState("general");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [beeJson, setBeeJson] = useState(null);   // BeeFree JSON (estrutura do RD)
  const [format, setFormat] = useState(null);     // "html" | "bee_json"
  const [saving, setSaving] = useState(false);

  // Extrai HTML básico de um BeeFree JSON (text modules + image)
  const extractHtmlFromBee = (json) => {
    try {
      const rows = json?.page?.body?.rows || [];
      let html = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">';
      const walk = (modules) => {
        (modules || []).forEach(m => {
          if (m.type?.includes("text") && m.descriptor?.text?.html) {
            html += m.descriptor.text.html;
          } else if (m.type?.includes("image") && m.descriptor?.image?.src) {
            html += `<img src="${m.descriptor.image.src}" style="max-width:100%;height:auto" alt="${m.descriptor.image.alt||""}"/>`;
          } else if (m.type?.includes("button") && m.descriptor?.button) {
            const b = m.descriptor.button;
            html += `<div style="text-align:center;padding:12px 0"><a href="${b.href||"#"}" style="display:inline-block;padding:10px 24px;background:${b.style?.["background-color"]||"#0D7491"};color:#fff;text-decoration:none;border-radius:6px;font-weight:700">${b.label||"Clique aqui"}</a></div>`;
          } else if (m.type?.includes("divider")) {
            html += '<hr style="border:none;border-top:1px solid #ddd;margin:16px 0"/>';
          } else if (m.type?.includes("html") && m.descriptor?.html?.html) {
            html += m.descriptor.html.html;
          }
        });
      };
      rows.forEach(row => {
        (row.columns || []).forEach(col => walk(col.modules));
      });
      html += '</div>';
      return html;
    } catch (e) {
      return null;
    }
  };

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    if (!name) setName(f.name.replace(/\.[^.]+$/, ""));

    // Detecta formato
    const trimmed = text.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const json = JSON.parse(trimmed);
        const extracted = extractHtmlFromBee(json);
        setBeeJson(json);
        setHtml(extracted || JSON.stringify(json));
        setFormat("bee_json");
        return;
      } catch (e) {
        // fallback: trata como HTML
      }
    }
    setHtml(text);
    setBeeJson(null);
    setFormat("html");
  };

  const onPasteChange = (val) => {
    setHtml(val);
    const trimmed = val.trim();
    if (trimmed.startsWith("{")) {
      try {
        const json = JSON.parse(trimmed);
        setBeeJson(json);
        setFormat("bee_json");
        const extracted = extractHtmlFromBee(json);
        if (extracted) setHtml(extracted);
        return;
      } catch (e) {}
    }
    setBeeJson(null);
    setFormat("html");
  };

  const save = async () => {
    if (!name.trim() || !html.trim()) { alert("Preencha nome e conteúdo."); return; }
    setSaving(true);
    const slug = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
    const { error } = await supabase.from("email_templates").insert({
      name: name.trim(),
      slug: slug + "-" + Date.now().toString(36),
      category, subject, html,
      bee_json: beeJson,
      source: "rd_station",
      active: true,
    });
    setSaving(false);
    if (error) { alert("Erro: " + error.message); return; }
    onDone();
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#fff", borderRadius:14, width:640, maxWidth:"94vw", maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}>
        <div style={{ padding:"18px 22px", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontFamily:T.head, fontWeight:700, fontSize:16, color:T.ink }}>Importar Template do RD Station</span>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:T.muted, fontSize:18 }}>×</button>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"18px 22px" }}>
          <p style={{ fontSize:12, color:T.muted, marginTop:0, fontFamily:T.font }}>
            No RD Station: <strong>Relacionamento → Email → Template → Exportar HTML</strong>. Cole o conteúdo ou faça upload do arquivo .html.
          </p>

          <div style={{ display:"flex", gap:6, marginBottom:14 }}>
            <button onClick={() => setMode("paste")} style={{ padding:"6px 12px", fontSize:12, fontWeight:700, borderRadius:7, border:`1px solid ${mode==="paste"?T.blue:T.border}`, background: mode==="paste"?`${T.blue}12`:"transparent", color: mode==="paste"?T.blue:T.muted, cursor:"pointer", fontFamily:T.font }}>Colar HTML</button>
            <button onClick={() => setMode("file")} style={{ padding:"6px 12px", fontSize:12, fontWeight:700, borderRadius:7, border:`1px solid ${mode==="file"?T.blue:T.border}`, background: mode==="file"?`${T.blue}12`:"transparent", color: mode==="file"?T.blue:T.muted, cursor:"pointer", fontFamily:T.font }}>Upload arquivo</button>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:.5, display:"block", marginBottom:5 }}>Nome do template</label>
              <input value={name} onChange={e => setName(e.target.value)} style={{ width:"100%", padding:"8px 12px", border:`1px solid ${T.border}`, borderRadius:8, fontSize:13, color:T.text, fontFamily:T.font, outline:"none" }}/>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:.5, display:"block", marginBottom:5 }}>Categoria</label>
              <select value={category} onChange={e => setCategory(e.target.value)} style={{ width:"100%", padding:"8px 12px", border:`1px solid ${T.border}`, borderRadius:8, fontSize:13, color:T.text, fontFamily:T.font, outline:"none", background:"#fff" }}>
                <option value="general">Geral</option>
                <option value="newsletter">Newsletter</option>
                <option value="promotional">Promocional</option>
                <option value="follow-up">Follow-up</option>
                <option value="event">Evento</option>
                <option value="reactivation">Reativação</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:.5, display:"block", marginBottom:5 }}>Assunto sugerido</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Ex: Newsletter mensal — {{lead.name}}" style={{ width:"100%", padding:"8px 12px", border:`1px solid ${T.border}`, borderRadius:8, fontSize:13, color:T.text, fontFamily:T.font, outline:"none" }}/>
          </div>

          {mode === "paste" ? (
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:.5, display:"block", marginBottom:5 }}>HTML ou JSON BeeFree do template</label>
              <textarea value={html} onChange={e => onPasteChange(e.target.value)} rows={10} placeholder="Cole o HTML ou JSON exportado do RD aqui..."
                style={{ width:"100%", padding:"10px 12px", border:`1px solid ${T.border}`, borderRadius:8, fontSize:11, color:T.text, fontFamily:T.mono, outline:"none", resize:"vertical" }}/>
            </div>
          ) : (
            <div>
              <input type="file" accept=".html,.htm,.json,text/html,application/json" onChange={onFile}
                style={{ padding:14, border:`2px dashed ${T.border}`, borderRadius:10, width:"100%", fontSize:12, fontFamily:T.font, cursor:"pointer" }}/>
              {html && (
                <div style={{ marginTop:8, fontSize:11, color:T.green, fontFamily:T.mono, display:"flex", gap:8, alignItems:"center" }}>
                  ✓ {html.length.toLocaleString()} caracteres carregados
                  {format && <span style={{ background:`${T.blue}14`, color:T.blue, padding:"1px 7px", borderRadius:4, fontSize:10, fontWeight:700 }}>{format === "bee_json" ? "BeeFree JSON" : "HTML"}</span>}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ padding:"14px 22px", borderTop:`1px solid ${T.border}`, display:"flex", justifyContent:"flex-end", gap:8 }}>
          <Btn onClick={onClose} variant="ghost">Cancelar</Btn>
          <Btn onClick={save} variant="primary" disabled={saving || !name || !html}>{saving ? "Salvando…" : "Importar template"}</Btn>
        </div>
      </div>
    </div>
  );
}

function TemplatePreviewModal({ template, onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#fff", borderRadius:14, width:760, maxWidth:"94vw", maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 20px 60px rgba(0,0,0,.2)" }}>
        <div style={{ padding:"18px 22px", borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontFamily:T.head, fontWeight:700, fontSize:16, color:T.ink }}>{template.name}</div>
            <div style={{ fontFamily:T.font, fontSize:11, color:T.muted, marginTop:2, fontWeight:600 }}>{template.category} · {template.source}</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color:T.muted, fontSize:18 }}>×</button>
        </div>
        <div style={{ flex:1, overflowY:"auto", background:"#F5F8FB", padding:20 }}>
          {template.html ? (
            <iframe srcDoc={template.html} sandbox="" style={{ width:"100%", minHeight:480, border:`1px solid ${T.border}`, borderRadius:8, background:"#fff" }} title={template.name} />
          ) : (
            <pre style={{ fontFamily:T.mono, fontSize:11, color:T.text, whiteSpace:"pre-wrap", background:"#fff", padding:16, borderRadius:8, border:`1px solid ${T.border}` }}>
              {JSON.stringify(template.blocks, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VantariEmailMarketing() {
  const [campaigns,  setCampaigns]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [view,       setView]       = useState("list");
  const [editCamp,   setEditCamp]   = useState(null);
  const [reportCamp, setReportCamp] = useState(null);
  const [sendModal,  setSendModal]  = useState(null);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("campaigns")
        .select(`id, name, subject, sender, html_content, from_name, from_email, status, type, audience, audience_count, scheduled_at,
                 campaign_sends(delivered, opened, clicked, bounced, unsubscribed)`)
        .order("created_at", { ascending: false });
      if (err) throw err;
      setCampaigns((data || []).map(c => {
        const sends        = c.campaign_sends || [];
        const sent         = sends.length;
        const delivered    = sends.filter(s => s.delivered).length;
        const opened       = sends.filter(s => s.opened).length;
        const clicked      = sends.filter(s => s.clicked).length;
        const bounced      = sends.filter(s => s.bounced).length;
        const unsubscribed = sends.filter(s => s.unsubscribed).length;
        return {
          id:            c.id,
          name:          c.name || "—",
          subject:       c.subject || "",
          sender:        c.sender || "marketing@vantari.com.br",
          htmlContent:   c.html_content || "",
          fromName:      c.from_name  || "Vantari",
          fromEmail:     c.from_email || "onboarding@resend.dev",
          status:        c.status || "draft",
          type:          c.type || "newsletter",
          audience:      c.audience || "Todos os leads",
          audienceCount: c.audience_count || 0,
          scheduledAt:   c.scheduled_at,
          thumbnail:     c.type || "newsletter",
          metrics: {
            sent, delivered, opened, clicked, bounced, unsubscribed,
            openRate:  sent > 0 ? +((opened  / sent) * 100).toFixed(1) : 0,
            clickRate: sent > 0 ? +((clicked / sent) * 100).toFixed(1) : 0,
          },
        };
      }));
    } catch (e) {
      setError(e.message || "Erro ao carregar campanhas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const handleNew        = ()  => { setEditCamp(null); setView("form"); };
  const handleEdit       = (c) => { setEditCamp(c);    setView("form"); };
  const handleReport     = (c) => { setReportCamp(c);  setView("report"); };
  const handleOpenEditor = (c) => { setEditCamp(c);    setView("editor"); };
  const handleSend       = (c) => setSendModal(c);

  const handleSaveCampaign = useCallback(async (data) => {
    const payload = {
      name:           data.name,
      subject:        data.subject,
      sender:         data.sender,
      html_content:   data.htmlContent || null,
      from_name:      data.fromName  || "Vantari",
      from_email:     data.fromEmail || null,
      status:         data.status || "draft",
      type:           data.type   || "newsletter",
      audience:       data.audience || "Todos os leads",
      audience_count: data.audienceCount || 0,
      scheduled_at:   data.schedule === "scheduled" && data.scheduledAt
                        ? new Date(data.scheduledAt).toISOString()
                        : null,
    };
    const { error: err } = editCamp?.id
      ? await supabase.from("campaigns").update(payload).eq("id", editCamp.id)
      : await supabase.from("campaigns").insert(payload);
    if (err) { setError(err.message); return; }
    await fetchCampaigns();
    setView("list"); setEditCamp(null);
  }, [editCamp, fetchCampaigns]);

  const handleDuplicate = useCallback(async (c) => {
    const { error: err } = await supabase.from("campaigns").insert({
      name: `${c.name} (cópia)`, subject: c.subject, sender: c.sender,
      status: "draft", type: c.type, audience: c.audience, audience_count: c.audienceCount,
      scheduled_at: null,
    });
    if (!err) fetchCampaigns();
  }, [fetchCampaigns]);

  const handleDelete = useCallback(async (id) => {
    const { error: err } = await supabase.from("campaigns").delete().eq("id", id);
    if (!err) fetchCampaigns();
  }, [fetchCampaigns]);

  const activeTabLabel = view==="list"?"Campanhas":view==="templates"?"Templates":view==="form"?editCamp?.id?"Editar Campanha":"Nova Campanha":view==="report"?reportCamp?.name:"Email Marketing";

  return (
    <div style={{display:"flex",height:"100vh",background:T.bg,fontFamily:T.font,overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');
        *, *::before, *::after { box-sizing:border-box; }
        body { margin:0; }
        select { cursor:pointer; }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-thumb { background:#B3BFCA; border-radius:99px; }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
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
          <NavItem icon={Mail}           label="Email Marketing" path="/email" active />
          <NavSection label="CRM" />
          <NavItem icon={Briefcase} label="Negócios" path="/crm" />
          <NavSection label="Ferramentas" />
          <NavItem icon={Star}           label="Scoring"        path="/scoring"      />
          <NavItem icon={LayoutTemplate} label="Landing Pages"  path="/landing"      />
          <NavItem icon={Bot}            label="IA & Automação" path="/ai-marketing" />
          <NavItem icon={Zap}            label="Workflows"      path="/workflow"     />
          <NavSection label="Sistema" />
          <NavItem icon={Plug}           label="Integrações"    path="/integrations" />
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "8px 0", position: "relative" }}>
          <NavItem icon={Settings} label="Configurações" path="/settings" />
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* Topbar */}
        <div style={{height:52,background:T.white,borderBottom:`0.5px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px",flexShrink:0}}>
          <span style={{fontSize:15,fontWeight:700,color:T.ink,fontFamily:T.head,letterSpacing:"-0.01em"}}>{activeTabLabel}</span>
          <div style={{display:"flex",gap:8}}>
            {(view==="list"||view==="templates")&&<Btn onClick={handleNew} variant="primary" icon={Plus} size="sm">Nova Campanha</Btn>}
          </div>
        </div>

        {/* Sub-tabs (only on list/templates) */}
        {(view==="list"||view==="templates")&&(
          <div style={{background:T.white,borderBottom:`0.5px solid ${T.border}`,padding:"0 24px",display:"flex",gap:2,flexShrink:0}}>
            {MODULE_TABS.map(t=>{
              const TIcon=t.Icon;
              const active=(t.id==="list"&&view==="list")||(t.id==="templates"&&view==="templates");
              return (
                <button key={t.id} onClick={()=>setView(t.id)}
                  style={{display:"flex",alignItems:"center",gap:6,padding:"10px 14px",background:"none",border:"none",borderBottom:active?`2px solid ${T.blue}`:"2px solid transparent",cursor:"pointer",fontSize:12,fontWeight:active?700:600,color:active?T.blue:T.muted,fontFamily:T.font,transition:"all 0.15s"}}>
                  <TIcon size={14} aria-hidden="true"/> {t.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Content */}
        <div style={{flex:1,overflowY:"auto",padding:"24px 28px",background:"linear-gradient(180deg, #FFF4F2 0%, #FFECE8 100%)"}}>
          {loading && view==="list" ? (
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:300,gap:10,color:T.muted}}>
              <Loader2 size={22} style={{animation:"spin 1s linear infinite"}} aria-hidden="true"/>
              <span style={{fontFamily:T.font,fontSize:14,fontWeight:600}}>Carregando campanhas...</span>
            </div>
          ) : error ? (
            <div style={{display:"flex",alignItems:"center",gap:10,background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:"14px 18px",color:T.red}}>
              <AlertCircle size={18} aria-hidden="true"/>
              <span style={{fontFamily:T.font,fontSize:13,fontWeight:600}}>{error}</span>
            </div>
          ) : (
            <>
              {view==="list"      && <CampaignList campaigns={campaigns} onNew={handleNew} onEdit={handleEdit} onReport={handleReport} onDuplicate={handleDuplicate} onDelete={handleDelete} onSend={handleSend}/>}
              {view==="form"      && <CampaignForm campaign={editCamp} onSave={handleSaveCampaign} onEdit={()=>handleOpenEditor(editCamp)} onBack={()=>setView("list")}/>}
              {view==="report"&&reportCamp&&<ReportView campaign={reportCamp} onBack={()=>setView("list")}/>}
              {view==="templates"&&<TemplatesView onUseTemplate={(blocks)=>{setEditCamp({emailBlocks:blocks});setView("editor");}}/>}
            </>
          )}
        </div>
      </div>

      {/* Email editor overlay */}
      {view==="editor"&&<EmailEditor campaign={editCamp} onSave={(data)=>{setEditCamp(p=>({...p,...data}));setView("form");}} onClose={()=>setView(editCamp?.id?"form":"list")}/>}

      {/* Send modal */}
      {sendModal && (
        <SendModal
          campaign={sendModal}
          onClose={() => setSendModal(null)}
          onDone={() => { setSendModal(null); fetchCampaigns(); }}
        />
      )}
    </div>
  );
}
