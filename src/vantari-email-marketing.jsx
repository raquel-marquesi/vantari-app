import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart2, Users, Mail, LayoutTemplate, Bot, Plug, Star,
  Settings, Layout, AlignLeft, Image, MousePointerClick,
  Columns2, Minus, ArrowUpDown, PanelBottom, GripVertical,
  Pencil, Save, Send, Calendar, RefreshCw, Zap, FlaskConical,
  Search, Plus, Copy, Trash2, Download, ChevronLeft,
  Monitor, Tablet, Smartphone, Tag, Newspaper, FileText,
  CornerDownRight, Lightbulb, TrendingUp, MailOpen, Link2,
  AlertTriangle, XCircle, ArrowUp, ArrowDown, X
} from "lucide-react";

/* ═══════════════════════════════════════════════════
   DESIGN TOKENS
═══════════════════════════════════════════════════ */
const T = {
  bg:      "#f2f5f8",
  white:   "#ffffff",
  ink:     "#5f5f64",
  ink2:    "#5f5f64",
  muted:   "#888891",
  border:  "#e2e8f0",
  border2: "#edf0f4",
  blue:    "#0079a9",
  blueL:   "#e8f5fb",
  teal:    "#0079a9",
  green:   "#05b27b",
  amber:   "#e07b00",
  red:     "#ef4444",
  purple:  "#6d45d9",
  font:    "'Aptos', 'Nunito Sans', sans-serif",
  head:    "'Montserrat', sans-serif",
  sans:    "'Aptos', 'Nunito Sans', sans-serif",
  mono:    "'Courier New', monospace",
};

/* ═══════════════════════════════════════════════════
   SEED DATA
═══════════════════════════════════════════════════ */
const STATUS_META = {
  draft:     { label:"Rascunho", color:"#888891", bg:"#f3f4f6" },
  scheduled: { label:"Agendada", color:"#e07b00", bg:"#fff4e6" },
  sending:   { label:"Enviando", color:"#0079a9", bg:"#e8f5fb" },
  sent:      { label:"Enviada",  color:"#05b27b", bg:"#f0fdf7" },
  failed:    { label:"Falhou",   color:"#ef4444", bg:"#fef2f2" },
};

const mkCampaigns = () => [
  { id:"c1", name:"Black Friday 2024",   subject:"50% OFF só hoje — Oferta exclusiva para você",             sender:"marketing@vantari.com.br", status:"sent",      type:"promotional",  audience:"Todos os leads",    audienceCount:6284, scheduledAt:"2024-11-29T09:00:00Z", metrics:{sent:6284,delivered:6102,opened:2840,clicked:892,bounced:182,unsubscribed:24,openRate:46.5,clickRate:14.6}, thumbnail:"promo"       },
  { id:"c2", name:"Newsletter Novembro", subject:"As tendências de marketing digital que você precisa saber", sender:"conteudo@vantari.com.br",  status:"sent",      type:"newsletter",   audience:"Newsletter",         audienceCount:3820, scheduledAt:"2024-11-15T08:00:00Z", metrics:{sent:3820,delivered:3741,opened:1642,clicked:318, bounced:79, unsubscribed:11,openRate:43.9,clickRate:8.5 }, thumbnail:"newsletter"  },
  { id:"c3", name:"Follow-up Demo Q4",   subject:"{{lead.name}}, sua demo está esperando",                   sender:"vendas@vantari.com.br",    status:"scheduled",type:"follow-up",  audience:"Demo Solicitada",    audienceCount:91,   scheduledAt:"2024-12-05T10:00:00Z", metrics:{sent:0,delivered:0,opened:0,clicked:0,bounced:0,unsubscribed:0,openRate:0,clickRate:0},              thumbnail:"followup"    },
  { id:"c4", name:"Reativação Dezembro", subject:"Sentimos sua falta, {{lead.name}}",                        sender:"marketing@vantari.com.br", status:"draft",     type:"reactivation", audience:"Inativos 30d",       audienceCount:840,  scheduledAt:null,                   metrics:{sent:0,delivered:0,opened:0,clicked:0,bounced:0,unsubscribed:0,openRate:0,clickRate:0},              thumbnail:"reactivation"},
  { id:"c5", name:"Webinar Conversão",   subject:"[Hoje às 15h] Webinar exclusivo: Como escalar leads",      sender:"eventos@vantari.com.br",   status:"sent",      type:"event",        audience:"MQL + SQL",          audienceCount:2460, scheduledAt:"2024-11-20T14:00:00Z", metrics:{sent:2460,delivered:2398,opened:1198,clicked:641,bounced:62, unsubscribed:8, openRate:49.9,clickRate:26.7}, thumbnail:"event"       },
];

const TEMPLATES = [
  { id:"t1", name:"Newsletter Mensal",   category:"newsletter",  desc:"Layout editorial com destaque para artigos e conteúdo", blocks:[
    {id:"b1",type:"header", content:{logo:true,headline:"Vantari Insights",subline:"Novembro 2024"}},
    {id:"b2",type:"text",   content:{text:"Olá, {{lead.name}}!\n\nBem-vindo à nossa newsletter mensal com as principais tendências de marketing digital.",align:"left"}},
    {id:"b3",type:"divider",content:{}},
    {id:"b4",type:"text",   content:{text:"Continue lendo para descobrir insights exclusivos do mercado.",align:"left"}},
    {id:"b5",type:"button", content:{text:"Ler Artigo Completo",url:"#",align:"center",color:"#0079a9"}},
    {id:"b6",type:"footer", content:{text:"© 2024 Vantari · Descadastrar"}},
  ]},
  { id:"t2", name:"Oferta Promocional",  category:"promotional", desc:"Alta conversão com urgência e call-to-action em destaque", blocks:[
    {id:"b1",type:"header", content:{logo:true,headline:"Oferta Especial",subline:"Por tempo limitado"}},
    {id:"b2",type:"text",   content:{text:"{{lead.name}}, temos uma oferta exclusiva para você.\n\nNão perca esta oportunidade única.",align:"center"}},
    {id:"b3",type:"button", content:{text:"Aproveitar Agora",url:"#",align:"center",color:"#ef4444"}},
    {id:"b4",type:"footer", content:{text:"© 2024 Vantari · Descadastrar"}},
  ]},
  { id:"t3", name:"Follow-up de Vendas", category:"follow-up",   desc:"Sequência de nurturing focada em conversão", blocks:[
    {id:"b1",type:"header", content:{logo:true,headline:"",subline:""}},
    {id:"b2",type:"text",   content:{text:"Oi {{lead.name}},\n\nSoftwares e automação podem triplicar seus resultados. Que tal explorarmos isso juntos?\n\nAbraços,\nTime Vantari",align:"left"}},
    {id:"b3",type:"button", content:{text:"Agendar uma Conversa",url:"#",align:"left",color:"#0079a9"}},
    {id:"b4",type:"footer", content:{text:"© 2024 Vantari · Descadastrar"}},
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
    primary:   { bg:hov?"#006a93":T.blue,  color:"#fff", border:"none",                             shadow:hov?`0 4px 16px ${T.blue}44`:`0 1px 4px ${T.blue}22` },
    secondary: { bg:hov?T.blueL:T.white,   color:T.blue, border:`1px solid ${hov?T.blue:T.border2}`, shadow:"none" },
    ghost:     { bg:hov?T.border2:"transparent",color:T.ink, border:`0.5px solid ${T.border}`,      shadow:"none" },
    danger:    { bg:hov?"#dc2626":"#fef2f2",color:hov?"#fff":T.red, border:`0.5px solid ${T.red}55`,shadow:"none" },
    ink:       { bg:hov?"#3d3d3d":T.ink,   color:"#fff", border:"none",                             shadow:"none" },
    success:   { bg:hov?"#04996a":T.green, color:"#fff", border:"none",                             shadow:"none" },
  }[variant]||{};
  const pad = {xs:"4px 9px",sm:"6px 13px",md:"9px 18px",lg:"12px 26px"}[size]||"9px 18px";
  const fs  = {xs:10,sm:12,md:13,lg:14}[size]||13;
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{display:"inline-flex",alignItems:"center",gap:7,padding:pad,fontSize:fs,fontFamily:T.font,fontWeight:700,borderRadius:8,border:v.border||"none",background:v.bg,color:v.color,boxShadow:v.shadow,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.5:1,transition:"all 0.15s",width:full?"100%":"auto",justifyContent:full?"center":"flex-start",...sx}}>
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

const Badge = ({ label, color="#888891", bg="#f3f4f6", dot }) => (
  <span style={{display:"inline-flex",alignItems:"center",gap:5,fontFamily:T.font,fontSize:11,fontWeight:700,color,background:bg,padding:"3px 9px",borderRadius:20}}>
    {dot&&<span style={{width:6,height:6,borderRadius:"50%",background:color,display:"inline-block"}}/>}{label}
  </span>
);

const MetricPill = ({ label, value, sub, color=T.blue, icon:Icon }) => (
  <div style={{background:T.white,border:`0.5px solid ${T.border}`,borderLeft:`3px solid ${color}`,borderRadius:10,padding:"12px 14px"}}>
    <div style={{fontFamily:T.font,fontSize:10,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6,display:"flex",alignItems:"center",gap:5}}>
      {Icon&&<Icon size={11} color={color} aria-hidden="true"/>}{label}
    </div>
    <div style={{fontFamily:T.head,fontSize:22,fontWeight:700,color,lineHeight:1}}>{value}</div>
    {sub&&<div style={{fontFamily:T.font,fontSize:11,color:T.muted,marginTop:4,fontWeight:600}}>{sub}</div>}
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
      <div style={{background:"#f8fafc",padding:"20px 40px",textAlign:"center",borderTop:`0.5px solid ${T.border}`}}>
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
              <div style={{background:"#f8fafc",borderBottom:`0.5px solid ${T.border}`,padding:"10px 16px",display:"flex",gap:6,alignItems:"center"}}>
                {["#ef4444",T.amber,T.green].map(c=><div key={c} style={{width:10,height:10,borderRadius:"50%",background:c}}/>)}
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
const CampaignList = ({ campaigns, onNew, onEdit, onReport, onDuplicate }) => {
  const [filter,setFilter] = useState("all");
  const [search,setSearch] = useState("");

  const filtered = campaigns.filter(c=>{
    if(filter!=="all"&&c.status!==filter) return false;
    if(search&&!c.name.toLowerCase().includes(search.toLowerCase())&&!c.subject.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const ThumbnailBg = ({thumb,type}) => {
    const colors = {promo:["#ef4444","#f97316"],newsletter:["#0079a9","#0079a9"],followup:["#1e293b","#374151"],event:["#6d45d9","#4f46e5"],reactivation:["#05b27b","#0d9488"]};
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
                  <Btn onClick={()=>onDuplicate(camp)} variant="ghost" size="xs" icon={Copy} sx={{flex:1,justifyContent:"center"}}>Duplicar</Btn>
                  {camp.status!=="sent"&&<Btn variant="ghost" size="xs" icon={Trash2} sx={{flex:"0 0 32px",justifyContent:"center",padding:"6px"}}/>}
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
   ROOT APP
═══════════════════════════════════════════════════ */
const MODULE_TABS = [
  { id:"list",      Icon:Mail,       label:"Campanhas"  },
  { id:"templates", Icon:LayoutTemplate, label:"Templates" },
];

export default function VantariEmailMarketing() {
  const [campaigns,    setCampaigns]   = useState(mkCampaigns);
  const [view,         setView]        = useState("list");
  const [editCamp,     setEditCamp]    = useState(null);
  const [reportCamp,   setReportCamp]  = useState(null);

  const handleNew         = ()  => { setEditCamp(null); setView("form"); };
  const handleEdit        = (c) => { setEditCamp(c); setView("form"); };
  const handleReport      = (c) => { setReportCamp(c); setView("report"); };
  const handleOpenEditor  = (c) => { setEditCamp(c); setView("editor"); };
  const handleSaveCampaign= (data) => {
    if(editCamp?.id) setCampaigns(p=>p.map(c=>c.id===editCamp.id?{...c,...data}:c));
    else setCampaigns(p=>[{id:`c${Date.now()}`,...data,audienceCount:1000,metrics:{sent:0,delivered:0,opened:0,clicked:0,bounced:0,unsubscribed:0,openRate:0,clickRate:0},thumbnail:"newsletter"},...p]);
    setView("list"); setEditCamp(null);
  };
  const handleDuplicate = (c) => {
    setCampaigns(p=>[{...c,id:`c${Date.now()}`,name:`${c.name} (cópia)`,status:"draft",scheduledAt:null},...p]);
  };

  const activeTabLabel = view==="list"?"Campanhas":view==="templates"?"Templates":view==="form"?editCamp?.id?"Editar Campanha":"Nova Campanha":view==="report"?reportCamp?.name:"Email Marketing";

  return (
    <div style={{display:"flex",height:"100vh",background:T.bg,fontFamily:T.font,overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700&family=Nunito+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing:border-box; }
        body { margin:0; }
        select { cursor:pointer; }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-thumb { background:${T.border}; border-radius:3px; }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
      `}</style>

      {/* ── SIDEBAR — iconrs.png embutido */}
      <div style={{width:220,background:"#0079a9",display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"16px 20px 14px",borderBottom:"1px solid rgba(255,255,255,0.12)",display:"flex",alignItems:"center"}}>
          <img src="iconrs.png" alt="Vantari" style={{height:28,width:"auto"}}/>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"8px 0"}}>
          <NavSection label="Principal"/>
          <NavItem icon={BarChart2}      label="Analytics" path="/dashboard"       />
          <NavItem icon={Users}          label="Leads" path="/leads"           />
          <NavItem icon={Mail}           label="Email Marketing" path="/email" active/>
          <NavSection label="Ferramentas"/>
          <NavItem icon={Star}           label="Scoring" path="/scoring"         />
          <NavItem icon={LayoutTemplate} label="Landing Pages" path="/landing"   />
          <NavItem icon={Bot}            label="IA & Automação" path="/ai-marketing"  />
          <NavSection label="Sistema"/>
          <NavItem icon={Plug}           label="Integrações" path="/integrations"     />
        </div>
        <div style={{borderTop:"1px solid rgba(255,255,255,0.12)",padding:"8px 0"}}>
          <NavItem icon={Settings} label="Configurações" path="/settings"/>
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
        <div style={{flex:1,overflowY:"auto",padding:"24px 28px"}}>
          {view==="list"      && <CampaignList campaigns={campaigns} onNew={handleNew} onEdit={handleEdit} onReport={handleReport} onDuplicate={handleDuplicate}/>}
          {view==="form"      && <CampaignForm campaign={editCamp} onSave={handleSaveCampaign} onEdit={()=>handleOpenEditor(editCamp)} onBack={()=>setView("list")}/>}
          {view==="report"&&reportCamp&&<ReportView campaign={reportCamp} onBack={()=>setView("list")}/>}
          {view==="templates"&&(
            <div>
              <h2 style={{margin:"0 0 20px",fontFamily:T.head,fontSize:18,fontWeight:700,color:T.ink,letterSpacing:"-0.01em"}}>Templates de Email</h2>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
                {TEMPLATES.map(tpl=>(
                  <div key={tpl.id} style={{background:T.white,border:`0.5px solid ${T.border}`,borderRadius:12,overflow:"hidden",cursor:"pointer",transition:"all 0.2s"}}
                    onMouseEnter={e=>e.currentTarget.style.transform="translateY(-3px)"}
                    onMouseLeave={e=>e.currentTarget.style.transform="none"}>
                    <div style={{height:120,background:`linear-gradient(135deg,${T.blue},${T.teal})`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      <TypeIcon type={tpl.category} size={32}/>
                    </div>
                    <div style={{padding:"16px 18px"}}>
                      <div style={{fontFamily:T.head,fontSize:14,fontWeight:700,color:T.ink,marginBottom:4}}>{tpl.name}</div>
                      <div style={{fontFamily:T.font,fontSize:12,fontWeight:600,color:T.muted,marginBottom:12}}>{tpl.desc}</div>
                      <div style={{display:"flex",gap:6}}>
                        <Btn onClick={()=>{setEditCamp({emailBlocks:tpl.blocks});setView("editor");}} variant="primary" size="xs" sx={{flex:1,justifyContent:"center"}}>Usar Template</Btn>
                        <Btn variant="ghost" size="xs" sx={{flex:1,justifyContent:"center"}}>Preview</Btn>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Email editor overlay */}
      {view==="editor"&&<EmailEditor campaign={editCamp} onSave={(data)=>{setEditCamp(p=>({...p,...data}));setView("form");}} onClose={()=>setView(editCamp?.id?"form":"list")}/>}
    </div>
  );
}
