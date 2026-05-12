import { useState, useCallback, useMemo } from "react";

/* ═══════════════════════════════════════════════════
   DESIGN TOKENS
═══════════════════════════════════════════════════ */
const T = {
  bg:"#f7f6f3",white:"#ffffff",ink:"#0f0f0f",ink2:"#3d3d3d",muted:"#8a8a8a",
  border:"#e8e4df",border2:"#d4cfc9",blue:"#0C59AD",blueL:"#e8f0fc",
  teal:"#0E7CA3",green:"#10b981",amber:"#f59e0b",red:"#ef4444",
  font:"'Fraunces', Georgia, serif",sans:"'DM Sans', sans-serif",mono:"'DM Mono', monospace",
};

/* ═══════════════════════════════════════════════════
   [GAP 6] DB SCHEMA — Tabelas explícitas
═══════════════════════════════════════════════════ */
const DB_SCHEMA = {
  campaigns: {
    desc:"Armazena cada campanha de email",
    columns:[
      {name:"id",type:"uuid",note:"PK"},
      {name:"name",type:"text",note:"Nome interno"},
      {name:"subject",type:"text",note:"Assunto Variante A"},
      {name:"subject_b",type:"text",note:"Assunto Variante B (A/B)"},
      {name:"sender_a",type:"text",note:"Remetente A"},
      {name:"sender_b",type:"text",note:"Remetente B (A/B)"},
      {name:"content",type:"jsonb",note:"Blocos do editor (array)"},
      {name:"content_b",type:"jsonb",note:"Conteúdo variante B (A/B)"},
      {name:"status",type:"text",note:"draft|scheduled|sending|sent|failed|paused"},
      {name:"scheduled_at",type:"timestamptz",note:"Data/hora de envio"},
      {name:"metrics",type:"jsonb",note:"sent/delivered/opened/clicked/bounced/unsub"},
      {name:"created_at",type:"timestamptz",note:"auto"},
    ],
  },
  email_sends: {
    desc:"Registro individual de cada envio por lead",
    columns:[
      {name:"id",type:"uuid",note:"PK"},
      {name:"campaign_id",type:"uuid",note:"FK → campaigns.id"},
      {name:"lead_id",type:"uuid",note:"FK → leads.id"},
      {name:"variant",type:"text",note:"'a' ou 'b'"},
      {name:"status",type:"text",note:"pending|sent|delivered|bounced|failed"},
      {name:"sent_at",type:"timestamptz",note:""},
      {name:"opened_at",type:"timestamptz",note:"nullable"},
      {name:"clicked_at",type:"timestamptz",note:"nullable"},
    ],
  },
  email_templates: {
    desc:"Templates reutilizáveis de email",
    columns:[
      {name:"id",type:"uuid",note:"PK"},
      {name:"name",type:"text",note:""},
      {name:"content",type:"jsonb",note:"Blocos do editor"},
      {name:"thumbnail",type:"text",note:"slug da miniatura"},
      {name:"category",type:"text",note:"newsletter|promotional|follow-up|event|reactivation"},
    ],
  },
};

/* ═══════════════════════════════════════════════════
   SEED DATA
═══════════════════════════════════════════════════ */
const STATUS_META = {
  draft:     {label:"Rascunho", color:"#6b7280",bg:"#f3f4f6"},
  scheduled: {label:"Agendada", color:"#d97706",bg:"#fef3c7"},
  sending:   {label:"Enviando", color:"#2563eb",bg:"#dbeafe"},
  sent:      {label:"Enviada",  color:"#059669",bg:"#d1fae5"},
  failed:    {label:"Falhou",   color:"#dc2626",bg:"#fee2e2"},
  paused:    {label:"Pausada",  color:"#7c3aed",bg:"#ede9fe"},
};

const mkCampaigns = () => [
  {id:"c1",name:"Black Friday 2024",subject:"50% OFF só hoje",sender:"marketing@vantari.com.br",status:"sent",type:"promotional",audience:"Todos os leads",audienceCount:6284,scheduledAt:"2024-11-29T09:00:00Z",metrics:{sent:6284,delivered:6102,opened:2840,clicked:892,bounced:182,unsubscribed:24,openRate:46.5,clickRate:14.6},thumbnail:"promo"},
  {id:"c2",name:"Newsletter Novembro",subject:"Tendências de marketing digital",sender:"conteudo@vantari.com.br",status:"sent",type:"newsletter",audience:"Newsletter",audienceCount:3820,scheduledAt:"2024-11-15T08:00:00Z",metrics:{sent:3820,delivered:3741,opened:1642,clicked:318,bounced:79,unsubscribed:11,openRate:43.9,clickRate:8.5},thumbnail:"newsletter"},
  {id:"c3",name:"Follow-up Demo Q4",subject:"{{lead.name}}, sua demo está esperando",sender:"vendas@vantari.com.br",status:"scheduled",type:"follow-up",audience:"Demo Solicitada",audienceCount:91,scheduledAt:"2024-12-05T10:00:00Z",metrics:{sent:0,delivered:0,opened:0,clicked:0,bounced:0,unsubscribed:0,openRate:0,clickRate:0},thumbnail:"followup"},
  {id:"c4",name:"Reativação Dezembro",subject:"Sentimos sua falta, {{lead.name}}",sender:"marketing@vantari.com.br",status:"draft",type:"reactivation",audience:"Inativos 30d",audienceCount:840,scheduledAt:null,metrics:{sent:0,delivered:0,opened:0,clicked:0,bounced:0,unsubscribed:0,openRate:0,clickRate:0},thumbnail:"reactivation"},
  {id:"c5",name:"Webinar Conversão",subject:"[Hoje às 15h] Webinar: 0 a 1000 leads",sender:"eventos@vantari.com.br",status:"sending",type:"event",audience:"MQL + SQL",audienceCount:2460,scheduledAt:"2024-11-20T14:00:00Z",metrics:{sent:2460,delivered:2398,opened:1198,clicked:641,bounced:62,unsubscribed:8,openRate:49.9,clickRate:26.7},thumbnail:"event"},
];

const TEMPLATES = [
  {id:"t1",name:"Newsletter Mensal",category:"newsletter",desc:"Layout editorial com destaque para artigos",thumbnail:"newsletter",blocks:[
    {id:"b1",type:"header",content:{logo:true,headline:"Vantari Insights",subline:"Novembro 2024"}},
    {id:"b2",type:"text",content:{text:"Olá, {{lead.name}}!\n\nBem-vindo à nossa newsletter mensal.",align:"left"}},
    {id:"b3",type:"divider",content:{}},
    {id:"b4",type:"button",content:{text:"Ler Artigo Completo",url:"#",align:"center",color:"#0C59AD"}},
    {id:"b5",type:"footer",content:{text:"© 2024 Vantari · Descadastrar"}},
  ]},
  {id:"t2",name:"Oferta Promocional",category:"promotional",desc:"Alta conversão com CTA em destaque",thumbnail:"promo",blocks:[
    {id:"b1",type:"header",content:{logo:true,headline:"Oferta Especial",subline:"Por tempo limitado"}},
    {id:"b2",type:"text",content:{text:"{{lead.name}}, oferta exclusiva para você.",align:"center"}},
    {id:"b3",type:"button",content:{text:"Aproveitar Agora",url:"#",align:"center",color:"#ef4444"}},
    {id:"b4",type:"footer",content:{text:"© 2024 Vantari · Descadastrar"}},
  ]},
  {id:"t3",name:"Follow-up de Vendas",category:"follow-up",desc:"Nurturing focado em conversão",thumbnail:"followup",blocks:[
    {id:"b1",type:"header",content:{logo:true,headline:"",subline:""}},
    {id:"b2",type:"text",content:{text:"Oi {{lead.name}},\n\nQue tal explorarmos como automatizar seus resultados?\n\nAbraços,\nTime Vantari",align:"left"}},
    {id:"b3",type:"button",content:{text:"Agendar uma Conversa",url:"#",align:"left",color:"#0C59AD"}},
    {id:"b4",type:"footer",content:{text:"© 2024 Vantari · Descadastrar"}},
  ]},
];

const mkTimelineData = () => Array.from({length:24},(_,i)=>({
  hour:i,
  opens:Math.floor(Math.random()*180+(i>=8&&i<=20?80:10)),
  clicks:Math.floor(Math.random()*60+(i>=8&&i<=20?30:5)),
}));

/* ═══════════════════════════════════════════════════
   PRIMITIVES
═══════════════════════════════════════════════════ */
const Btn = ({children,onClick,variant="primary",size="md",icon,full,sx={}}) => {
  const [hov,setHov] = useState(false);
  const s = {
    primary:  {bg:hov?"#0a4d99":T.blue,  color:"#fff",border:"none",   shadow:`0 2px 8px ${T.blue}33`},
    secondary:{bg:hov?T.blueL:T.white,   color:T.blue,border:`1.5px solid ${T.blue}`,shadow:"none"},
    ink:      {bg:hov?"#222":T.ink,       color:"#fff",border:"none",   shadow:"0 2px 8px #0003"},
    ghost:    {bg:hov?"#f1f5f9":"transparent",color:T.ink2,border:`1.5px solid ${T.border}`,shadow:"none"},
    danger:   {bg:hov?"#dc2626":T.red,    color:"#fff",border:"none",   shadow:"none"},
    amber:    {bg:hov?"#d97706":T.amber,  color:"#fff",border:"none",   shadow:"none"},
  }[variant]||{};
  const pad={xs:"4px 8px",sm:"6px 12px",md:"8px 16px",lg:"10px 22px"}[size]||"8px 16px";
  const fs={xs:11,sm:12,md:13,lg:14}[size]||13;
  return (
    <button onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{display:"inline-flex",alignItems:"center",gap:6,padding:pad,fontSize:fs,fontFamily:T.sans,fontWeight:600,
        borderRadius:9,cursor:"pointer",transition:"all 0.15s",width:full?"100%":undefined,
        justifyContent:full?"center":undefined,...s,...sx}}>
      {icon&&<span style={{fontSize:fs+1}}>{icon}</span>}{children}
    </button>
  );
};

const Field = ({label,value,onChange,placeholder,type="text",mono}) => (
  <div>
    <label style={{display:"block",fontFamily:T.sans,fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:5}}>{label}</label>
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      style={{width:"100%",boxSizing:"border-box",fontFamily:mono?T.mono:T.sans,fontSize:13,padding:"9px 12px",
        border:`1.5px solid ${T.border}`,borderRadius:9,outline:"none",background:T.white,color:T.ink}} />
  </div>
);

const Badge = ({label,color="#6b7280",bg="#f3f4f6"}) => (
  <span style={{display:"inline-flex",alignItems:"center",gap:5,fontFamily:T.sans,fontSize:11,fontWeight:600,color,background:bg,padding:"3px 9px",borderRadius:20}}>
    <span style={{width:5,height:5,borderRadius:"50%",background:color}}/>{label}
  </span>
);

const MetricPill = ({label,value,sub,color=T.blue,icon}) => (
  <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 16px",position:"relative",overflow:"hidden"}}>
    <div style={{position:"absolute",top:0,left:0,right:0,height:2.5,background:`linear-gradient(90deg,${color}00,${color},${color}00)`}}/>
    <div style={{fontFamily:T.sans,fontSize:10,color:T.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6,display:"flex",alignItems:"center",gap:5}}>
      {icon&&<span>{icon}</span>}{label}
    </div>
    <div style={{fontFamily:T.mono,fontSize:24,fontWeight:700,color,lineHeight:1}}>{value}</div>
    {sub&&<div style={{fontFamily:T.sans,fontSize:11,color:T.muted,marginTop:4}}>{sub}</div>}
  </div>
);

/* ═══════════════════════════════════════════════════
   BLOCK RENDERER
═══════════════════════════════════════════════════ */
const renderBlock = (block,leadName="{{lead.name}}") => {
  const b = block.content||{};
  switch(block.type) {
    case "header": return (
      <div style={{background:`linear-gradient(135deg,${T.blue} 0%,${T.teal} 100%)`,padding:"32px 40px",textAlign:"center"}}>
        {b.logo&&<div style={{fontFamily:"Georgia,serif",fontSize:18,fontWeight:700,color:"#fff",letterSpacing:"0.1em",marginBottom:b.headline?12:0}}>VANTARI</div>}
        {b.headline&&<div style={{fontFamily:"Georgia,serif",fontSize:26,fontWeight:700,color:"#fff"}}>{b.headline}</div>}
        {b.subline&&<div style={{fontFamily:T.sans,fontSize:13,color:"rgba(255,255,255,0.75)",marginTop:6}}>{b.subline}</div>}
      </div>
    );
    case "text": return (
      <div style={{padding:"24px 40px",textAlign:b.align||"left"}}>
        {(b.text||"").split("\n").map((line,i)=>(
          <p key={i} style={{margin:"0 0 10px",fontFamily:T.sans,fontSize:14,lineHeight:1.7,color:T.ink2}}>
            {line.replace(/\{\{lead\.name\}\}/g,leadName).replace(/\{\{lead\.company\}\}/g,"Empresa Ltda").replace(/\{\{custom_field\}\}/g,"Valor Personalizado")||"\u00a0"}
          </p>
        ))}
      </div>
    );
    case "image": return (
      <div style={{padding:"0 40px"}}>
        {b.src
          ? <img src={b.src} alt={b.alt||""} style={{width:b.width||"100%",borderRadius:8,display:"block",margin:"0 auto"}}/>
          : <div style={{background:"#e5e7eb",borderRadius:8,height:180,display:"flex",alignItems:"center",justifyContent:"center",color:T.muted,fontFamily:T.sans,fontSize:13}}>Imagem</div>
        }
        {b.caption&&<p style={{fontFamily:T.sans,fontSize:11,color:T.muted,textAlign:"center",margin:"6px 0 0"}}>{b.caption}</p>}
      </div>
    );
    case "button": return (
      <div style={{padding:"20px 40px",textAlign:b.align||"center"}}>
        <a href={b.url||"#"} style={{display:"inline-block",padding:"13px 30px",background:b.color||T.blue,color:"#fff",borderRadius:8,fontFamily:T.sans,fontWeight:700,fontSize:14,textDecoration:"none"}}>
          {b.text||"Clique aqui"}
        </a>
      </div>
    );
    case "divider": return (<div style={{padding:"8px 40px"}}><div style={{height:1,background:T.border}}/></div>);
    case "spacer":  return <div style={{height:b.height||24}}/>;
    case "columns": return (
      <div style={{padding:"16px 40px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        {[b.col1||"Coluna 1",b.col2||"Coluna 2"].map((col,i)=>(
          <div key={i} style={{fontFamily:T.sans,fontSize:13,color:T.ink2,lineHeight:1.6,padding:"12px",background:T.bg,borderRadius:8}}>{col}</div>
        ))}
      </div>
    );
    case "footer": return (
      <div style={{background:"#f9f9f7",padding:"20px 40px",textAlign:"center",borderTop:`1px solid ${T.border}`}}>
        <p style={{fontFamily:T.sans,fontSize:11,color:T.muted,margin:0}}>{b.text||"© 2024 Vantari"}</p>
        <p style={{fontFamily:T.sans,fontSize:11,color:T.muted,margin:"4px 0 0"}}>
          <a href="#" style={{color:T.blue,textDecoration:"none"}}>Descadastrar</a>
        </p>
      </div>
    );
    default: return null;
  }
};

/* ═══════════════════════════════════════════════════
   BLOCK EDITOR (GAP 1 — image; GAP 2 — {{custom_field}})
═══════════════════════════════════════════════════ */
const BLOCK_PALETTE = [
  {type:"header",  icon:"T",  label:"Header"},
  {type:"text",    icon:"P",  label:"Texto"},
  {type:"image",   icon:"Img",label:"Imagem"},
  {type:"button",  icon:"Btn",label:"Botão"},
  {type:"columns", icon:"||", label:"Colunas"},
  {type:"divider", icon:"—",  label:"Divisor"},
  {type:"spacer",  icon:"↕",  label:"Espaço"},
  {type:"footer",  icon:"F",  label:"Rodapé"},
];

const DEFAULT_BLOCK_CONTENT = {
  header:  {logo:true,headline:"Seu Título",subline:"Subtítulo opcional"},
  text:    {text:"Escreva seu texto aqui. Use {{lead.name}} para personalizar.",align:"left"},
  image:   {src:"",alt:"",width:"100%",caption:""},
  button:  {text:"Clique Aqui",url:"#",align:"center",color:T.blue},
  divider: {},
  spacer:  {height:24},
  columns: {col1:"Coluna esquerda",col2:"Coluna direita"},
  footer:  {text:"© 2024 Vantari · Todos os direitos reservados"},
};

const BlockEditor = ({block,onChange}) => {
  const b = block.content||{};
  const upd = (k,v) => onChange({...block,content:{...b,[k]:v}});
  const lbl = {fontFamily:T.sans,fontSize:10,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:4,display:"block"};
  const inp = {width:"100%",boxSizing:"border-box",fontFamily:T.sans,fontSize:12,padding:"7px 10px",border:`1.5px solid ${T.border}`,borderRadius:7,outline:"none",background:T.white,color:T.ink,marginBottom:10};
  switch(block.type) {
    case "header": return (
      <div>
        <label style={lbl}>Headline</label>
        <input style={inp} value={b.headline||""} onChange={e=>upd("headline",e.target.value)} placeholder="Título principal"/>
        <label style={lbl}>Subtítulo</label>
        <input style={inp} value={b.subline||""} onChange={e=>upd("subline",e.target.value)} placeholder="Texto menor"/>
        <label style={{...lbl,display:"flex",alignItems:"center",gap:7,cursor:"pointer"}}>
          <input type="checkbox" checked={!!b.logo} onChange={e=>upd("logo",e.target.checked)} style={{accentColor:T.blue}}/>
          Mostrar logo
        </label>
      </div>
    );
    case "text": return (
      <div>
        <label style={lbl}>Texto</label>
        <textarea value={b.text||""} onChange={e=>upd("text",e.target.value)} rows={5}
          style={{...inp,resize:"vertical",lineHeight:1.5}}/>
        <label style={lbl}>Alinhamento</label>
        <div style={{display:"flex",gap:4,marginBottom:10}}>
          {["left","center","right"].map(a=>(
            <button key={a} onClick={()=>upd("align",a)}
              style={{flex:1,padding:"5px",fontFamily:T.sans,fontSize:11,border:`1.5px solid ${b.align===a?T.blue:T.border}`,borderRadius:6,background:b.align===a?T.blueL:T.white,color:b.align===a?T.blue:T.muted,cursor:"pointer"}}>
              {a==="left"?"◀":a==="center"?"◆":"▶"}
            </button>
          ))}
        </div>
        {/* GAP 2 — tokens incluindo custom_field */}
        <div style={{fontFamily:T.sans,fontSize:10,color:T.blue,background:T.blueL,borderRadius:7,padding:"8px 10px",lineHeight:1.9}}>
          <div style={{fontWeight:700,marginBottom:4}}>Variáveis disponíveis (clique para inserir):</div>
          {["{{lead.name}}","{{lead.company}}","{{lead.email}}","{{custom_field}}"].map(tok=>(
            <code key={tok} onClick={()=>upd("text",(b.text||"")+" "+tok)}
              style={{fontFamily:T.mono,fontSize:10,background:"#fff",border:`1px solid ${T.blue}44`,borderRadius:4,padding:"1px 5px",marginRight:4,cursor:"pointer",display:"inline-block"}}>
              {tok}
            </code>
          ))}
        </div>
      </div>
    );
    /* GAP 1 — image block com URL, alt, width, caption, preview */
    case "image": return (
      <div>
        <label style={lbl}>URL da Imagem</label>
        <input style={inp} value={b.src||""} onChange={e=>upd("src",e.target.value)} placeholder="https://..."/>
        <label style={lbl}>Texto alternativo (alt)</label>
        <input style={inp} value={b.alt||""} onChange={e=>upd("alt",e.target.value)} placeholder="Descrição"/>
        <label style={lbl}>Largura</label>
        <div style={{display:"flex",gap:4,marginBottom:10}}>
          {["100%","75%","50%"].map(w=>(
            <button key={w} onClick={()=>upd("width",w)}
              style={{flex:1,padding:"5px",fontFamily:T.sans,fontSize:11,border:`1.5px solid ${b.width===w?T.blue:T.border}`,borderRadius:6,background:b.width===w?T.blueL:T.white,color:b.width===w?T.blue:T.muted,cursor:"pointer"}}>
              {w}
            </button>
          ))}
        </div>
        <label style={lbl}>Legenda (opcional)</label>
        <input style={inp} value={b.caption||""} onChange={e=>upd("caption",e.target.value)} placeholder="Ex: Figura 1"/>
        {b.src&&(
          <div style={{borderRadius:8,overflow:"hidden",border:`1px solid ${T.border}`,marginTop:4}}>
            <img src={b.src} alt="" style={{width:"100%",display:"block"}} onError={e=>e.target.style.display="none"}/>
          </div>
        )}
      </div>
    );
    case "button": return (
      <div>
        <label style={lbl}>Texto do Botão</label>
        <input style={inp} value={b.text||""} onChange={e=>upd("text",e.target.value)}/>
        <label style={lbl}>URL</label>
        <input style={inp} value={b.url||""} onChange={e=>upd("url",e.target.value)} placeholder="https://"/>
        <label style={lbl}>Cor</label>
        <div style={{display:"flex",gap:6,marginBottom:10}}>
          {[T.blue,T.teal,T.green,T.amber,T.red,"#111827"].map(c=>(
            <div key={c} onClick={()=>upd("color",c)}
              style={{width:24,height:24,borderRadius:"50%",background:c,cursor:"pointer",
                border:`2px solid ${b.color===c?"#fff":"transparent"}`,
                boxShadow:b.color===c?`0 0 0 2px ${c}`:"none",transition:"all 0.15s"}}/>
          ))}
        </div>
        <label style={lbl}>Alinhamento</label>
        <div style={{display:"flex",gap:4}}>
          {["left","center","right"].map(a=>(
            <button key={a} onClick={()=>upd("align",a)}
              style={{flex:1,padding:"5px",fontFamily:T.sans,fontSize:11,border:`1.5px solid ${b.align===a?T.blue:T.border}`,borderRadius:6,background:b.align===a?T.blueL:T.white,color:b.align===a?T.blue:T.muted,cursor:"pointer"}}>
              {a}
            </button>
          ))}
        </div>
      </div>
    );
    case "spacer": return (
      <div>
        <label style={lbl}>Altura: {b.height||24}px</label>
        <input type="range" min="8" max="80" value={b.height||24} onChange={e=>upd("height",Number(e.target.value))} style={{width:"100%",accentColor:T.blue}}/>
      </div>
    );
    case "footer": return (
      <div>
        <label style={lbl}>Texto do rodapé</label>
        <textarea value={b.text||""} onChange={e=>upd("text",e.target.value)} rows={3} style={{...inp,resize:"vertical"}}/>
      </div>
    );
    case "columns": return (
      <div>
        <label style={lbl}>Coluna Esquerda</label>
        <textarea value={b.col1||""} onChange={e=>upd("col1",e.target.value)} rows={3} style={{...inp,resize:"vertical"}}/>
        <label style={lbl}>Coluna Direita</label>
        <textarea value={b.col2||""} onChange={e=>upd("col2",e.target.value)} rows={3} style={{...inp,resize:"vertical"}}/>
      </div>
    );
    default: return <div style={{fontFamily:T.sans,fontSize:12,color:T.muted}}>Selecione um bloco para editar.</div>;
  }
};

/* ═══════════════════════════════════════════════════
   EMAIL EDITOR (GAP 3 — A/B: sender name + content)
═══════════════════════════════════════════════════ */
const EmailEditor = ({campaign,onSave,onClose}) => {
  const [blocks,        setBlocks]       = useState(campaign?.emailBlocks||TEMPLATES[0].blocks.map(b=>({...b,id:`b${Date.now()}_${Math.random()}`})));
  const [blocksB,       setBlocksB]      = useState(campaign?.emailBlocksB||TEMPLATES[0].blocks.map(b=>({...b,id:`bB${Date.now()}_${Math.random()}`})));
  const [selectedId,    setSelectedId]   = useState(null);
  const [preview,       setPreview]      = useState("desktop");
  const [subjectA,      setSubjectA]     = useState(campaign?.subject||"");
  const [abEnabled,     setAbEnabled]    = useState(false);
  const [abTab,         setAbTab]        = useState("subject");
  const [subjectB,      setSubjectB]     = useState(campaign?.subjectB||"");
  const [senderB,       setSenderB]      = useState(campaign?.senderB||"");  // GAP 3
  const [abContentOn,   setAbContentOn]  = useState(false);                  // GAP 3
  const [editingVar,    setEditingVar]   = useState("a");
  const [draggingBlock, setDraggingBlock]= useState(null);
  const [showTemplates, setShowTemplates]= useState(false);

  const activeBlocks = (abContentOn&&editingVar==="b")?blocksB:blocks;
  const setActive    = (abContentOn&&editingVar==="b")?setBlocksB:setBlocks;
  const selected     = activeBlocks.find(b=>b.id===selectedId);

  const addBlock = useCallback((type,atIdx) => {
    const nb = {id:`b${Date.now()}`,type,content:{...DEFAULT_BLOCK_CONTENT[type]}};
    setActive(prev=>{const arr=[...prev];atIdx!=null?arr.splice(atIdx+1,0,nb):arr.push(nb);return arr;});
    setSelectedId(nb.id);
  },[abContentOn,editingVar]);

  const removeBlock = (id) => {setActive(p=>p.filter(b=>b.id!==id));if(selectedId===id)setSelectedId(null);};
  const moveBlock   = (id,dir) => {
    setActive(prev=>{const arr=[...prev],i=arr.findIndex(b=>b.id===id),j=dir==="up"?i-1:i+1;
      if(j<0||j>=arr.length)return prev;[arr[i],arr[j]]=[arr[j],arr[i]];return arr;});
  };
  const updateBlock = (updated) => setActive(p=>p.map(b=>b.id===updated.id?updated:b));
  const previewW = {desktop:"100%",tablet:600,mobile:375}[preview];

  return (
    <div style={{position:"fixed",inset:0,background:T.bg,zIndex:200,display:"flex",flexDirection:"column"}}>
      {/* Top bar */}
      <div style={{background:T.white,borderBottom:`1px solid ${T.border}`,padding:"0 20px",height:52,display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:T.muted,fontSize:18}}>←</button>
        <span style={{fontFamily:T.font,fontSize:15,fontWeight:600,color:T.ink,whiteSpace:"nowrap"}}>Editor de Email</span>
        <input value={subjectA} onChange={e=>setSubjectA(e.target.value)} placeholder="Assunto — Variante A…"
          style={{flex:1,fontFamily:T.sans,fontSize:13,padding:"6px 12px",border:`1.5px solid ${T.border}`,borderRadius:8,outline:"none",background:T.bg,color:T.ink}}/>
        <button onClick={()=>setAbEnabled(!abEnabled)}
          style={{padding:"5px 11px",fontFamily:T.sans,fontSize:12,fontWeight:600,whiteSpace:"nowrap",
            border:`1.5px solid ${abEnabled?"#92400e":T.border}`,borderRadius:7,
            background:abEnabled?"#fef3c7":"transparent",color:abEnabled?"#92400e":T.muted,cursor:"pointer"}}>
          A/B {abEnabled?"▲":"▼"}
        </button>
        {["desktop","tablet","mobile"].map(p=>(
          <button key={p} onClick={()=>setPreview(p)}
            style={{padding:"5px 9px",fontFamily:T.sans,fontSize:12,border:`1.5px solid ${preview===p?T.blue:T.border}`,borderRadius:7,background:preview===p?T.blueL:T.white,color:preview===p?T.blue:T.muted,cursor:"pointer"}}>
            {p==="desktop"?"Desktop":p==="tablet"?"Tablet":"Mobile"}
          </button>
        ))}
        <Btn onClick={()=>onSave({...campaign,subject:subjectA,subjectB,senderB,emailBlocks:blocks,emailBlocksB:abContentOn?blocksB:undefined})} variant="ink" size="md" icon="💾">Salvar</Btn>
      </div>

      {/* GAP 3 — A/B expanded panel */}
      {abEnabled&&(
        <div style={{background:"#fffbeb",borderBottom:`1px solid #fde68a`,padding:"12px 20px",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
            <span style={{fontFamily:T.sans,fontSize:11,fontWeight:700,color:"#92400e",textTransform:"uppercase",letterSpacing:"0.07em"}}>Variante B:</span>
            {["subject","sender","content"].map(tab=>(
              <button key={tab} onClick={()=>setAbTab(tab)}
                style={{padding:"3px 10px",fontFamily:T.sans,fontSize:11,fontWeight:600,borderRadius:6,
                  border:`1.5px solid ${abTab===tab?"#92400e":"#fde68a"}`,
                  background:abTab===tab?"#fef3c7":"transparent",color:abTab===tab?"#92400e":"#b45309",cursor:"pointer"}}>
                {tab==="subject"?"Assunto":tab==="sender"?"Remetente":"Conteúdo"}
              </button>
            ))}
          </div>
          {abTab==="subject"&&(
            <div style={{display:"flex",gap:12}}>
              <div style={{flex:1}}>
                <div style={{fontFamily:T.sans,fontSize:9,fontWeight:700,color:"#b45309",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>Assunto A (atual)</div>
                <input value={subjectA} readOnly style={{width:"100%",boxSizing:"border-box",fontFamily:T.sans,fontSize:13,padding:"7px 10px",border:"1.5px solid #fde68a",borderRadius:8,background:"#fef9ee",color:T.ink2,outline:"none"}}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontFamily:T.sans,fontSize:9,fontWeight:700,color:"#b45309",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>Assunto B</div>
                <input value={subjectB} onChange={e=>setSubjectB(e.target.value)} placeholder="Variante alternativa…"
                  style={{width:"100%",boxSizing:"border-box",fontFamily:T.sans,fontSize:13,padding:"7px 10px",border:"1.5px solid #f59e0b",borderRadius:8,background:T.white,color:T.ink,outline:"none"}}/>
              </div>
            </div>
          )}
          {abTab==="sender"&&(
            <div style={{display:"flex",gap:12}}>
              <div style={{flex:1}}>
                <div style={{fontFamily:T.sans,fontSize:9,fontWeight:700,color:"#b45309",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>Remetente A (atual)</div>
                <input value={campaign?.sender||"marketing@vantari.com.br"} readOnly style={{width:"100%",boxSizing:"border-box",fontFamily:T.mono,fontSize:12,padding:"7px 10px",border:"1.5px solid #fde68a",borderRadius:8,background:"#fef9ee",color:T.ink2,outline:"none"}}/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontFamily:T.sans,fontSize:9,fontWeight:700,color:"#b45309",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>Remetente B</div>
                <input value={senderB} onChange={e=>setSenderB(e.target.value)} placeholder="Ex: time@vantari.com.br"
                  style={{width:"100%",boxSizing:"border-box",fontFamily:T.mono,fontSize:12,padding:"7px 10px",border:"1.5px solid #f59e0b",borderRadius:8,background:T.white,color:T.ink,outline:"none"}}/>
              </div>
            </div>
          )}
          {abTab==="content"&&(
            <div style={{display:"flex",gap:12,alignItems:"center"}}>
              <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontFamily:T.sans,fontSize:13,color:"#92400e"}}>
                <div onClick={()=>setAbContentOn(!abContentOn)}
                  style={{width:36,height:20,borderRadius:10,background:abContentOn?T.amber:T.border2,position:"relative",cursor:"pointer",transition:"background 0.2s"}}>
                  <div style={{position:"absolute",top:3,left:abContentOn?17:3,width:14,height:14,borderRadius:"50%",background:"#fff",transition:"left 0.2s"}}/>
                </div>
                Ativar conteúdo Variante B
              </label>
              {abContentOn&&(
                <div style={{display:"flex",gap:4}}>
                  {["a","b"].map(v=>(
                    <button key={v} onClick={()=>{setEditingVar(v);setSelectedId(null);}}
                      style={{padding:"4px 14px",fontFamily:T.sans,fontSize:12,fontWeight:700,borderRadius:7,
                        border:`1.5px solid ${editingVar===v?"#92400e":"#fde68a"}`,
                        background:editingVar===v?"#fef3c7":"transparent",color:editingVar===v?"#92400e":"#b45309",
                        cursor:"pointer",textTransform:"uppercase"}}>
                      Variante {v.toUpperCase()}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Body */}
      <div style={{flex:1,overflow:"hidden",display:"flex"}}>
        {/* Palette */}
        <div style={{width:190,background:T.white,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",flexShrink:0}}>
          <div style={{padding:"10px 12px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontFamily:T.sans,fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>Blocos</span>
            <button onClick={()=>setShowTemplates(!showTemplates)}
              style={{fontFamily:T.sans,fontSize:10,fontWeight:600,color:T.blue,background:T.blueL,border:"none",borderRadius:5,padding:"2px 7px",cursor:"pointer"}}>
              Templates
            </button>
          </div>
          {showTemplates?(
            <div style={{overflow:"auto",flex:1,padding:10}}>
              {TEMPLATES.map(tpl=>(
                <div key={tpl.id} onClick={()=>{setActive(tpl.blocks.map(b=>({...b,id:`b${Date.now()}_${Math.random()}`})));setShowTemplates(false);}}
                  style={{padding:"9px 10px",borderRadius:8,border:`1px solid ${T.border}`,marginBottom:7,cursor:"pointer",fontFamily:T.sans,fontSize:12,color:T.ink}}>
                  {tpl.name}
                  <div style={{fontSize:10,color:T.muted,marginTop:2}}>{tpl.category}</div>
                </div>
              ))}
            </div>
          ):(
            <div style={{overflow:"auto",flex:1,padding:10}}>
              {BLOCK_PALETTE.map(bp=>(
                <div key={bp.type} draggable onDragStart={()=>setDraggingBlock(bp.type)}
                  onClick={()=>addBlock(bp.type)}
                  style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderRadius:8,border:`1px solid ${T.border}`,marginBottom:6,cursor:"pointer",fontFamily:T.sans,fontSize:12,color:T.ink,background:T.white,transition:"all 0.15s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=T.blue;e.currentTarget.style.color=T.blue;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.ink;}}>
                  <span style={{fontSize:12,width:24,textAlign:"center",fontFamily:T.mono,color:T.muted}}>{bp.icon}</span>
                  {bp.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Canvas */}
        <div style={{flex:1,overflow:"auto",padding:"20px",display:"flex",flexDirection:"column",alignItems:"center",background:T.bg}}>
          {abContentOn&&(
            <div style={{marginBottom:10,padding:"4px 14px",background:"#fef3c7",borderRadius:20,fontFamily:T.sans,fontSize:11,fontWeight:700,color:"#92400e"}}>
              Editando: Variante {editingVar.toUpperCase()}
            </div>
          )}
          <div style={{width:previewW,maxWidth:"100%",background:T.white,borderRadius:12,overflow:"hidden",border:`1px solid ${T.border}`,boxShadow:"0 4px 24px #0001",transition:"width 0.3s"}}
            onClick={()=>setSelectedId(null)}>
            {activeBlocks.map((block,idx)=>(
              <div key={block.id}
                style={{position:"relative",outline:selectedId===block.id?`2px solid ${T.blue}`:"2px solid transparent",background:selectedId===block.id?"#f0f7ff":"transparent"}}
                onDragOver={e=>{e.preventDefault();}}
                onDrop={()=>{
                  if(draggingBlock&&typeof draggingBlock==="string"){addBlock(draggingBlock,idx);}
                  else if(draggingBlock!=null){
                    setActive(prev=>{const arr=[...prev],[item]=arr.splice(draggingBlock,1);arr.splice(idx,0,item);return arr;});
                  }
                  setDraggingBlock(null);
                }}
                onClick={e=>{e.stopPropagation();setSelectedId(block.id);}}>
                {renderBlock(block,"Ana")}
                {selectedId===block.id&&(
                  <div style={{position:"absolute",top:6,right:8,display:"flex",gap:3,zIndex:10}} onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>moveBlock(block.id,"up")} style={{width:24,height:24,borderRadius:5,border:"none",background:T.blue,color:"#fff",cursor:"pointer",fontSize:11}}>↑</button>
                    <button onClick={()=>moveBlock(block.id,"down")} style={{width:24,height:24,borderRadius:5,border:"none",background:T.blue,color:"#fff",cursor:"pointer",fontSize:11}}>↓</button>
                    <button onClick={()=>removeBlock(block.id)} style={{width:24,height:24,borderRadius:5,border:"none",background:T.red,color:"#fff",cursor:"pointer",fontSize:13}}>×</button>
                  </div>
                )}
                <div draggable onDragStart={()=>setDraggingBlock(idx)}
                  style={{position:"absolute",left:4,top:"50%",transform:"translateY(-50%)",color:T.border2,cursor:"grab",fontSize:16,opacity:selectedId===block.id?1:0,transition:"opacity 0.1s"}}>⠿</div>
              </div>
            ))}
            {activeBlocks.length===0&&(
              <div style={{textAlign:"center",padding:"60px 40px",color:T.muted,fontFamily:T.sans,fontSize:14}}>
                Clique em um bloco à esquerda para começar
              </div>
            )}
          </div>
        </div>

        {/* Properties */}
        <div style={{width:236,background:T.white,borderLeft:`1px solid ${T.border}`,overflow:"auto",flexShrink:0}}>
          <div style={{padding:"11px 14px",borderBottom:`1px solid ${T.border}`}}>
            <div style={{fontFamily:T.sans,fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>
              {selected?`Editar: ${selected.type}`:"Propriedades"}
            </div>
          </div>
          <div style={{padding:"12px 14px"}}>
            {selected?<BlockEditor block={selected} onChange={updateBlock}/>
              :<div style={{fontFamily:T.sans,fontSize:12,color:T.muted,textAlign:"center",padding:"20px 0"}}>Clique em um bloco para editar</div>}
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
const AUDIENCE_COUNT = {"Todos os leads":6284,"Newsletter":3820,"Demo Solicitada":91,"Inativos 30d":840,"MQL + SQL":2460,"Alto Valor B2B":420,"Leads Quentes":1200};

const CampaignForm = ({campaign,onSave,onEdit,onBack}) => {
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
  const upd = (k,v) => setForm(p=>({...p,[k]:v}));
  const count = AUDIENCE_COUNT[form.audience]||0;
  const STitle = ({children}) => (
    <div style={{fontFamily:T.font,fontSize:16,fontWeight:600,color:T.ink,letterSpacing:"-0.02em",marginBottom:16,paddingBottom:8,borderBottom:`1px solid ${T.border}`}}>{children}</div>
  );
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div>
          <h2 style={{margin:"0 0 4px",fontFamily:T.font,fontSize:22,fontWeight:600,color:T.ink,letterSpacing:"-0.03em"}}>{campaign?.id?"Editar Campanha":"Nova Campanha"}</h2>
          <p style={{margin:0,fontFamily:T.sans,fontSize:13,color:T.muted}}>Configure todos os detalhes antes de enviar</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <Btn onClick={onBack} variant="ghost" size="md">Cancelar</Btn>
          <Btn onClick={onEdit} variant="secondary" size="md" icon="✏️">Editor de Email</Btn>
          <Btn onClick={()=>onSave(form)} variant="ink" size="md" icon="💾">Salvar Rascunho</Btn>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:20}}>
        <div style={{display:"flex",flexDirection:"column",gap:20}}>
          <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:14,padding:"22px"}}>
            <STitle>Informações Básicas</STitle>
            <div style={{display:"grid",gap:14}}>
              <Field label="Nome interno" value={form.name} onChange={e=>upd("name",e.target.value)} placeholder="Ex: Newsletter Dezembro 2024"/>
              <Field label="Linha de assunto" value={form.subject} onChange={e=>upd("subject",e.target.value)} placeholder="Use {{lead.name}} para personalizar"/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <Field label="Remetente" value={form.sender} onChange={e=>upd("sender",e.target.value)}/>
                <Field label="Reply-to" value={form.replyTo} onChange={e=>upd("replyTo",e.target.value)} placeholder="mesmo que remetente"/>
              </div>
              <div>
                <label style={{display:"block",fontFamily:T.sans,fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:6}}>Tipo de Campanha</label>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {["newsletter","promotional","follow-up","event","reactivation"].map(t=>(
                    <button key={t} onClick={()=>upd("type",t)}
                      style={{padding:"5px 12px",fontFamily:T.sans,fontSize:11,fontWeight:600,border:`1.5px solid ${form.type===t?T.blue:T.border}`,borderRadius:8,background:form.type===t?T.blueL:T.white,color:form.type===t?T.blue:T.muted,cursor:"pointer"}}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:14,padding:"22px"}}>
            <STitle>Agendamento</STitle>
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              {[["immediate","Envio imediato"],["scheduled","Agendar"]].map(([v,l])=>(
                <button key={v} onClick={()=>upd("schedule",v)}
                  style={{flex:1,padding:"9px",fontFamily:T.sans,fontSize:13,fontWeight:600,border:`1.5px solid ${form.schedule===v?T.blue:T.border}`,borderRadius:9,background:form.schedule===v?T.blueL:T.white,color:form.schedule===v?T.blue:T.muted,cursor:"pointer"}}>
                  {l}
                </button>
              ))}
            </div>
            {form.schedule==="scheduled"&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <Field label="Data e Hora" type="datetime-local" value={form.scheduledAt} onChange={e=>upd("scheduledAt",e.target.value)}/>
                <div>
                  <label style={{display:"block",fontFamily:T.sans,fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:6}}>Timezone</label>
                  <select value={form.timezone} onChange={e=>upd("timezone",e.target.value)}
                    style={{width:"100%",fontFamily:T.sans,fontSize:13,padding:"9px 12px",border:`1.5px solid ${T.border}`,borderRadius:9,outline:"none",background:T.white,color:T.ink}}>
                    {["America/Sao_Paulo","America/New_York","Europe/London","UTC"].map(tz=><option key={tz}>{tz}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
          <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:14,padding:"22px"}}>
            <STitle>Configurações Avançadas</STitle>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div>
                <label style={{display:"block",fontFamily:T.sans,fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:6}}>Throttling (emails/hora)</label>
                <select value={form.throttle} onChange={e=>upd("throttle",e.target.value)}
                  style={{width:"100%",fontFamily:T.sans,fontSize:13,padding:"9px 12px",border:`1.5px solid ${T.border}`,borderRadius:9,outline:"none",background:T.white,color:T.ink}}>
                  {["500","1000","2000","5000","Sem limite"].map(v=><option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={{display:"block",fontFamily:T.sans,fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:6}}>Link de descadastro</label>
                <select style={{width:"100%",fontFamily:T.sans,fontSize:13,padding:"9px 12px",border:`1.5px solid ${T.border}`,borderRadius:9,outline:"none",background:T.white,color:T.ink}}>
                  <option>Incluir automaticamente</option>
                  <option>Manual no template</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:14,padding:"18px"}}>
            <STitle>Audiência</STitle>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {SEGMENTS.map(seg=>(
                <button key={seg} onClick={()=>upd("audience",seg)}
                  style={{padding:"8px 12px",fontFamily:T.sans,fontSize:12,fontWeight:form.audience===seg?700:400,border:`1.5px solid ${form.audience===seg?T.blue:T.border}`,borderRadius:8,background:form.audience===seg?T.blueL:T.white,color:form.audience===seg?T.blue:T.ink,cursor:"pointer",textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  {seg}
                  <span style={{fontFamily:T.mono,fontSize:10,color:T.muted}}>{(AUDIENCE_COUNT[seg]||0).toLocaleString("pt-BR")}</span>
                </button>
              ))}
            </div>
            {count>0&&<div style={{marginTop:10,padding:"9px",background:T.bg,borderRadius:8,fontFamily:T.sans,fontSize:12,color:T.muted,textAlign:"center"}}>{count.toLocaleString("pt-BR")} destinatários</div>}
          </div>
          <Btn onClick={()=>onSave({...form,status:form.schedule==="immediate"?"sending":"scheduled"})} variant="ink" size="lg" full icon="🚀">
            {form.schedule==="immediate"?"Enviar Agora":"Agendar Envio"}
          </Btn>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   CAMPAIGN LIST (GAP 4 — date+type filters; GAP 5 — pause)
═══════════════════════════════════════════════════ */
const CampaignList = ({campaigns,onNew,onEdit,onReport,onDuplicate,onPause}) => {
  const [filterStatus,setFilterStatus] = useState("all");
  const [filterType,  setFilterType]   = useState("all");  // GAP 4
  const [filterDate,  setFilterDate]   = useState("");     // GAP 4
  const [search,      setSearch]       = useState("");

  const filtered = campaigns.filter(c=>{
    if(filterStatus!=="all"&&c.status!==filterStatus) return false;
    if(filterType!=="all"&&c.type!==filterType) return false;
    if(filterDate){
      if(!c.scheduledAt) return false;
      const d=new Date(c.scheduledAt).toISOString().slice(0,10);
      if(d!==filterDate) return false;
    }
    if(search&&!c.name.toLowerCase().includes(search.toLowerCase())&&!c.subject.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const ThumbnailBg = ({thumb,type}) => {
    const map={promo:["#ef4444","#f97316"],newsletter:["#0C59AD","#0E7CA3"],followup:["#111827","#374151"],event:["#7c3aed","#4f46e5"],reactivation:["#059669","#0d9488"]};
    const [c1,c2] = map[thumb]||map.newsletter;
    const icon = {newsletter:"📰",promotional:"🔥","follow-up":"💼",event:"🎤",reactivation:"🔄"}[type]||"📧";
    return <div style={{width:"100%",height:"100%",background:`linear-gradient(135deg,${c1},${c2})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>{icon}</div>;
  };

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div>
          <h1 style={{margin:"0 0 4px",fontFamily:T.font,fontSize:28,fontWeight:600,color:T.ink,letterSpacing:"-0.04em"}}>Campanhas</h1>
          <p style={{margin:0,fontFamily:T.sans,fontSize:13,color:T.muted}}>{campaigns.length} campanhas no total</p>
        </div>
        <Btn onClick={onNew} variant="ink" size="lg" icon="✦">Nova Campanha</Btn>
      </div>

      {/* Filters */}
      <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 16px",marginBottom:20}}>
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginBottom:10}}>
          {/* Search */}
          <div style={{position:"relative",flex:1,minWidth:180}}>
            <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:13}}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar campanhas..."
              style={{width:"100%",boxSizing:"border-box",fontFamily:T.sans,fontSize:13,padding:"7px 12px 7px 32px",border:`1.5px solid ${T.border}`,borderRadius:8,outline:"none",background:T.bg,color:T.ink}}/>
          </div>
          {/* GAP 4 — date filter */}
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontFamily:T.sans,fontSize:10,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em"}}>Data</span>
            <input type="date" value={filterDate} onChange={e=>setFilterDate(e.target.value)}
              style={{fontFamily:T.sans,fontSize:12,padding:"6px 10px",border:`1.5px solid ${filterDate?T.blue:T.border}`,borderRadius:8,outline:"none",background:filterDate?T.blueL:T.white,color:filterDate?T.blue:T.ink}}/>
            {filterDate&&<button onClick={()=>setFilterDate("")} style={{background:"none",border:"none",cursor:"pointer",color:T.muted,fontSize:15}}>×</button>}
          </div>
          {/* GAP 4 — type filter */}
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontFamily:T.sans,fontSize:10,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em"}}>Tipo</span>
            <select value={filterType} onChange={e=>setFilterType(e.target.value)}
              style={{fontFamily:T.sans,fontSize:12,padding:"6px 10px",border:`1.5px solid ${filterType!=="all"?T.blue:T.border}`,borderRadius:8,outline:"none",background:filterType!=="all"?T.blueL:T.white,color:filterType!=="all"?T.blue:T.ink}}>
              <option value="all">Todos os tipos</option>
              {["newsletter","promotional","follow-up","event","reactivation"].map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        {/* Status filters */}
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {[["all","Todas"],["draft","Rascunho"],["scheduled","Agendadas"],["sending","Enviando"],["sent","Enviadas"],["paused","Pausadas"],["failed","Falhou"]].map(([val,lbl])=>(
            <button key={val} onClick={()=>setFilterStatus(val)}
              style={{padding:"5px 11px",fontFamily:T.sans,fontSize:12,fontWeight:filterStatus===val?700:400,border:`1.5px solid ${filterStatus===val?T.blue:T.border}`,borderRadius:8,background:filterStatus===val?T.blueL:T.white,color:filterStatus===val?T.blue:T.ink2,cursor:"pointer"}}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:16}}>
        {filtered.map(camp=>{
          const sm = STATUS_META[camp.status]||STATUS_META.draft;
          const canPause = camp.status==="scheduled"||camp.status==="sending"; // GAP 5
          return (
            <div key={camp.id} style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:14,overflow:"hidden",display:"flex",flexDirection:"column"}}>
              <div style={{height:110,position:"relative"}}>
                <ThumbnailBg thumb={camp.thumbnail} type={camp.type}/>
                <div style={{position:"absolute",top:10,right:10}}><Badge label={sm.label} color={sm.color} bg={sm.bg}/></div>
              </div>
              <div style={{padding:"14px 16px",flex:1,display:"flex",flexDirection:"column",gap:8}}>
                <div>
                  <div style={{fontFamily:T.font,fontSize:15,fontWeight:600,color:T.ink,letterSpacing:"-0.01em",marginBottom:3}}>{camp.name}</div>
                  <div style={{fontFamily:T.sans,fontSize:12,color:T.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{camp.subject}</div>
                </div>
                {camp.status==="sent"&&(
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                    {[["Aberto",`${camp.metrics.openRate}%`,T.blue],["Cliques",`${camp.metrics.clickRate}%`,T.teal],["Bounces",`${((camp.metrics.bounced/camp.metrics.sent)*100).toFixed(1)}%`,T.red]].map(([l,v,c])=>(
                      <div key={l} style={{background:T.bg,borderRadius:8,padding:"7px",textAlign:"center"}}>
                        <div style={{fontFamily:T.mono,fontSize:14,fontWeight:700,color:c}}>{v}</div>
                        <div style={{fontFamily:T.sans,fontSize:10,color:T.muted,marginTop:2}}>{l}</div>
                      </div>
                    ))}
                  </div>
                )}
                {camp.scheduledAt&&camp.status!=="sent"&&(
                  <div style={{fontFamily:T.mono,fontSize:11,color:T.muted}}>
                    📅 {new Date(camp.scheduledAt).toLocaleString("pt-BR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}
                  </div>
                )}
                <div style={{display:"flex",gap:5,marginTop:"auto",paddingTop:8}}>
                  {camp.status==="sent"
                    ?<Btn onClick={()=>onReport(camp)} variant="primary" size="xs" icon="📊" sx={{flex:1,justifyContent:"center"}}>Relatório</Btn>
                    :<Btn onClick={()=>onEdit(camp)} variant="secondary" size="xs" icon="✏️" sx={{flex:1,justifyContent:"center"}}>Editar</Btn>
                  }
                  <Btn onClick={()=>onDuplicate(camp)} variant="ghost" size="xs" sx={{flex:1,justifyContent:"center"}}>Duplicar</Btn>
                  {/* GAP 5 — pause/resume button */}
                  {canPause&&(
                    <Btn onClick={()=>onPause(camp)} variant="amber" size="xs" sx={{padding:"6px 10px"}} title="Pausar">⏸</Btn>
                  )}
                  {camp.status==="paused"&&(
                    <Btn onClick={()=>onPause(camp)} variant="primary" size="xs" sx={{padding:"6px 10px"}} title="Retomar">▶</Btn>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length===0&&(
          <div style={{gridColumn:"1/-1",textAlign:"center",padding:"60px 40px",color:T.muted,fontFamily:T.sans,fontSize:14}}>
            Nenhuma campanha encontrada com os filtros aplicados.
          </div>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   REPORT VIEW
═══════════════════════════════════════════════════ */
const ReportView = ({campaign,onBack}) => {
  const m = campaign.metrics;
  const timeline = useMemo(()=>mkTimelineData(),[]);
  const maxVal = Math.max(...timeline.map(t=>t.opens));
  const links = [
    {url:"https://vantari.com.br/demo",    clicks:312,pct:35.0},
    {url:"https://vantari.com.br/pricing", clicks:228,pct:25.6},
    {url:"https://vantari.com.br/blog/roi",clicks:180,pct:20.2},
    {url:"https://vantari.com.br/features",clicks:108,pct:12.1},
    {url:"https://vantari.com.br/contact", clicks:64, pct:7.2},
  ];
  const downloadCSV = () => {
    const rows=[["Lead","Email","Variante","Status","Enviado","Abriu","Clicou"],
      ["Ana Costa","ana@techno.com","a","delivered","sim","sim","sim"],
      ["Carlos M.","carlos@pixel.com","b","delivered","sim","não","não"]];
    const csv=rows.map(r=>r.join(",")).join("\n");
    const a=document.createElement("a");a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv);a.download=`${campaign.name}.csv`;a.click();
  };
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",color:T.muted,fontSize:18}}>←</button>
          <div>
            <h2 style={{margin:"0 0 3px",fontFamily:T.font,fontSize:22,fontWeight:600,color:T.ink,letterSpacing:"-0.03em"}}>{campaign.name}</h2>
            <p style={{margin:0,fontFamily:T.sans,fontSize:12,color:T.muted}}>
              Enviada em {new Date(campaign.scheduledAt).toLocaleString("pt-BR")} · {campaign.audienceCount.toLocaleString("pt-BR")} destinatários
            </p>
          </div>
        </div>
        <Btn onClick={downloadCSV} variant="ghost" size="md" icon="⬇">Exportar CSV</Btn>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:12,marginBottom:20}}>
        {[
          {label:"Enviados",   value:m.sent.toLocaleString("pt-BR"),      icon:"📤",color:T.ink},
          {label:"Entregues",  value:m.delivered.toLocaleString("pt-BR"), icon:"✅",color:T.green,sub:`${((m.delivered/m.sent)*100).toFixed(1)}%`},
          {label:"Abertos",    value:m.opened.toLocaleString("pt-BR"),    icon:"👁",color:T.blue, sub:`${m.openRate}%`},
          {label:"Clicaram",   value:m.clicked.toLocaleString("pt-BR"),   icon:"🔗",color:T.teal, sub:`${m.clickRate}%`},
          {label:"Bounces",    value:m.bounced.toLocaleString("pt-BR"),   icon:"⚠️",color:m.bounced>200?T.red:T.amber,sub:`${((m.bounced/m.sent)*100).toFixed(1)}%`},
          {label:"Descadastr.",value:m.unsubscribed.toLocaleString("pt-BR"),icon:"🚫",color:T.muted},
        ].map(mt=><MetricPill key={mt.label} {...mt}/>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:16}}>
        <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:14,padding:"22px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
            <div style={{fontFamily:T.font,fontSize:16,fontWeight:600,color:T.ink,letterSpacing:"-0.02em"}}>Abertura ao Longo do Tempo</div>
            <div style={{display:"flex",gap:12}}>
              {[[T.blue,"Aberturas"],[T.teal,"Cliques"]].map(([c,l])=>(
                <span key={l} style={{display:"flex",alignItems:"center",gap:5,fontFamily:T.sans,fontSize:11,color:c}}>
                  <span style={{width:12,height:3,background:c,display:"inline-block",borderRadius:2}}/>{l}
                </span>
              ))}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"flex-end",gap:3,height:140,paddingBottom:20}}>
            {timeline.map((t,i)=>(
              <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:1,height:"100%",justifyContent:"flex-end"}}>
                <div style={{width:"70%",display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
                  <div style={{width:"100%",height:`${(t.opens/maxVal)*110}px`,background:T.blue,borderRadius:"3px 3px 0 0",opacity:0.85,minHeight:2}}/>
                  <div style={{width:"100%",height:`${(t.clicks/maxVal)*110}px`,background:T.teal,borderRadius:"3px 3px 0 0",opacity:0.85,minHeight:1}}/>
                </div>
                {i%4===0&&<div style={{fontFamily:T.mono,fontSize:7,color:T.muted,marginTop:2}}>{t.hour}h</div>}
              </div>
            ))}
          </div>
        </div>
        <div style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:14,padding:"20px"}}>
          <div style={{fontFamily:T.font,fontSize:15,fontWeight:600,color:T.ink,letterSpacing:"-0.02em",marginBottom:14}}>Cliques por Link</div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {links.map((lk,i)=>(
              <div key={i}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <div style={{fontFamily:T.mono,fontSize:9,color:T.blue,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"75%"}}>{lk.url}</div>
                  <div style={{fontFamily:T.mono,fontSize:11,fontWeight:700,color:T.ink}}>{lk.clicks}</div>
                </div>
                <div style={{height:4,background:T.bg,borderRadius:99}}>
                  <div style={{height:"100%",width:`${lk.pct}%`,background:`linear-gradient(90deg,${T.blue},${T.teal})`,borderRadius:99}}/>
                </div>
              </div>
            ))}
          </div>
          <div style={{marginTop:14,background:T.bg,borderRadius:9,padding:"10px",textAlign:"center"}}>
            <div style={{fontFamily:T.sans,fontSize:10,color:T.muted,marginBottom:6}}>Heatmap de cliques</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
              {Array.from({length:28},(_,i)=>{
                const intensity=Math.random();
                return <div key={i} style={{height:12,borderRadius:3,background:`rgba(12,89,173,${intensity*0.8+0.05})`}} title={`${Math.floor(intensity*100)} cliques`}/>;
              })}
            </div>
            <div style={{fontFamily:T.sans,fontSize:8,color:T.muted,marginTop:3}}>4 semanas · 7 dias</div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   DB SCHEMA MODAL (GAP 6)
═══════════════════════════════════════════════════ */
const SchemaModal = ({onClose}) => (
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}
    onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={{background:T.white,borderRadius:16,width:"90%",maxWidth:740,maxHeight:"80vh",overflow:"auto",padding:26,boxShadow:"0 24px 80px #0004"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={{margin:0,fontFamily:T.font,fontSize:20,fontWeight:600,color:T.ink,letterSpacing:"-0.03em"}}>Esquema do Banco de Dados</h2>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:T.muted}}>×</button>
      </div>
      {Object.entries(DB_SCHEMA).map(([table,schema])=>(
        <div key={table} style={{marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
            <code style={{fontFamily:T.mono,fontSize:13,fontWeight:700,color:T.blue,background:T.blueL,padding:"3px 10px",borderRadius:7}}>{table}</code>
            <span style={{fontFamily:T.sans,fontSize:12,color:T.muted}}>{schema.desc}</span>
          </div>
          <div style={{border:`1px solid ${T.border}`,borderRadius:10,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{background:T.bg}}>
                  {["Coluna","Tipo","Nota"].map(h=>(
                    <th key={h} style={{padding:"7px 14px",textAlign:"left",fontFamily:T.sans,fontSize:10,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {schema.columns.map((col,i)=>(
                  <tr key={col.name} style={{borderTop:`1px solid ${T.border}`,background:i%2===0?T.white:T.bg}}>
                    <td style={{padding:"7px 14px",fontFamily:T.mono,fontSize:12,fontWeight:600,color:T.ink}}>{col.name}</td>
                    <td style={{padding:"7px 14px",fontFamily:T.mono,fontSize:11,color:T.teal}}>{col.type}</td>
                    <td style={{padding:"7px 14px",fontFamily:T.sans,fontSize:11,color:T.muted}}>{col.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════
   ROOT APP
═══════════════════════════════════════════════════ */
export default function App() {
  const [campaigns, setCampaigns] = useState(mkCampaigns);
  const [view,      setView]      = useState("list");
  const [editCamp,  setEditCamp]  = useState(null);
  const [reportCamp,setReportCamp]= useState(null);
  const [showSchema,setShowSchema]= useState(false); // GAP 6

  const handleNew        = () => {setEditCamp(null);setView("form");};
  const handleEdit       = (c) => {setEditCamp(c);setView("form");};
  const handleReport     = (c) => {setReportCamp(c);setView("report");};
  const handleOpenEditor = (c) => {setEditCamp(c);setView("editor");};

  const handleSaveCampaign = (data) => {
    if(editCamp?.id){
      setCampaigns(p=>p.map(c=>c.id===editCamp.id?{...c,...data}:c));
    } else {
      const nc={id:`c${Date.now()}`, ...data, audienceCount:1000, metrics:{sent:0,delivered:0,opened:0,clicked:0,bounced:0,unsubscribed:0,openRate:0,clickRate:0}, thumbnail:"newsletter"};
      setCampaigns(p=>[nc,...p]);
    }
    setView("list");setEditCamp(null);
  };

  const handleDuplicate = (c) => {
    const nc={...c,id:`c${Date.now()}`,name:`${c.name} (cópia)`,status:"draft",scheduledAt:null};
    setCampaigns(p=>[nc,...p]);
  };

  // GAP 5 — toggle pause/resume
  const handlePause = (c) => {
    setCampaigns(p=>p.map(x=>x.id===c.id?{...x,status:x.status==="paused"?"scheduled":"paused"}:x));
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;0,9..144,700;1,9..144,400&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;}
        body{margin:0;background:${T.bg};}
        ::-webkit-scrollbar{width:5px;height:5px;}
        ::-webkit-scrollbar-thumb{background:${T.border2};border-radius:3px;}
      `}</style>

      <div style={{minHeight:"100vh",background:T.bg,fontFamily:T.sans}}>
        {/* Top bar */}
        <div style={{background:T.white,borderBottom:`1px solid ${T.border}`,padding:"0 24px",display:"flex",alignItems:"center",height:54,position:"sticky",top:0,zIndex:50}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginRight:28}}>
            <svg width={24} height={24} viewBox="0 0 48 48" fill="none">
              <path d="M8 10 L24 38 L40 10" stroke={T.blue} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M18 26 L24 38 L30 26" stroke={T.teal} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{fontFamily:T.font,fontWeight:300,fontSize:15,letterSpacing:"0.04em",color:T.blue}}>vantari</span>
          </div>
          {[["list","Campanhas"],["templates","Templates"]].map(([v,l])=>(
            <button key={v} onClick={()=>setView(v)}
              style={{padding:"0 14px",height:"100%",fontFamily:T.sans,fontSize:13,fontWeight:view===v?700:400,color:view===v?T.blue:T.muted,background:"transparent",border:"none",borderBottom:view===v?`2.5px solid ${T.blue}`:"2.5px solid transparent",cursor:"pointer",display:"flex",alignItems:"center"}}>
              {l}
            </button>
          ))}
          {/* GAP 6 — DB schema tags clicáveis */}
          <div style={{marginLeft:"auto",display:"flex",gap:5,alignItems:"center"}}>
            <span style={{fontFamily:T.mono,fontSize:9,color:T.muted,marginRight:2}}>DB:</span>
            {Object.keys(DB_SCHEMA).map(t=>(
              <button key={t} onClick={()=>setShowSchema(true)}
                style={{fontFamily:T.mono,fontSize:10,background:T.ink,color:"#a5f3fc",padding:"2px 8px",borderRadius:4,border:"none",cursor:"pointer"}}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Main */}
        <div style={{padding:"26px",maxWidth:1400,margin:"0 auto"}}>
          {view==="list"&&(
            <CampaignList
              campaigns={campaigns}
              onNew={handleNew}
              onEdit={handleEdit}
              onReport={handleReport}
              onDuplicate={handleDuplicate}
              onPause={handlePause}
            />
          )}
          {view==="form"&&(
            <CampaignForm
              campaign={editCamp}
              onSave={handleSaveCampaign}
              onEdit={()=>handleOpenEditor(editCamp)}
              onBack={()=>setView("list")}
            />
          )}
          {view==="report"&&reportCamp&&(
            <ReportView campaign={reportCamp} onBack={()=>setView("list")}/>
          )}
          {view==="templates"&&(
            <div>
              <h2 style={{margin:"0 0 20px",fontFamily:T.font,fontSize:24,fontWeight:600,color:T.ink,letterSpacing:"-0.03em"}}>Templates de Email</h2>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:16}}>
                {TEMPLATES.map(tpl=>(
                  <div key={tpl.id} style={{background:T.white,border:`1px solid ${T.border}`,borderRadius:14,overflow:"hidden",cursor:"pointer",transition:"all 0.2s"}}
                    onMouseEnter={e=>e.currentTarget.style.transform="translateY(-3px)"}
                    onMouseLeave={e=>e.currentTarget.style.transform="none"}>
                    <div style={{height:110,background:`linear-gradient(135deg,${T.blue},${T.teal})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32}}>
                      {tpl.category==="newsletter"?"📰":tpl.category==="promotional"?"🔥":"💼"}
                    </div>
                    <div style={{padding:"14px 16px"}}>
                      <div style={{fontFamily:T.font,fontSize:15,fontWeight:600,color:T.ink,marginBottom:3}}>{tpl.name}</div>
                      <div style={{fontFamily:T.sans,fontSize:12,color:T.muted,marginBottom:12}}>{tpl.desc}</div>
                      <Btn onClick={()=>{setEditCamp({emailBlocks:tpl.blocks});setView("editor");}} variant="primary" size="xs" sx={{width:"100%",justifyContent:"center"}}>Usar Template</Btn>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Email editor overlay */}
      {view==="editor"&&(
        <EmailEditor
          campaign={editCamp}
          onSave={(data)=>{setEditCamp(p=>({...p,...data}));setView("form");}}
          onClose={()=>setView(editCamp?.id?"form":"list")}
        />
      )}

      {/* GAP 6 — DB Schema modal */}
      {showSchema&&<SchemaModal onClose={()=>setShowSchema(false)}/>}
    </>
  );
}
