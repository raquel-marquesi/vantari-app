import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart2, Users, Mail, LayoutTemplate, Bot, Plug, Star,
  Settings, User, Calendar, Search, SlidersHorizontal,
  Upload, Plus, X, Eye, Trash2, Pencil, Link2, Code2,
  GripVertical, CheckCircle2, XCircle, MessageSquare,
  FileText, ClipboardList, Phone, ChevronDown, CheckSquare,
  AlignLeft, Type, AtSign, Lock, Zap, Paperclip, Wrench,
  Building2, Smartphone, StickyNote, Download, Activity,
  ChevronUp, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   MOCK DATABASE — Supabase schema-compatible
   Tables: leads, lead_interactions, forms
═══════════════════════════════════════════════════════════ */
const STAGES  = ["Novo","Nutrindo","MQL","SQL","Cliente","Inativo"];
const SOURCES = ["Email","WhatsApp","Instagram","Google Ads","Meta Ads","Landing Page","Orgânico"];
const ALL_TAGS = ["VIP","Retargeting","Alto Valor","Frio","Recorrente","B2B","E-commerce","SaaS","Demo Solicitada","Newsletter"];

const seedLeads = () => Array.from({ length: 47 }, (_, i) => {
  const names = ["Ana Costa","Carlos Mendes","Fernanda Lima","Roberto Alves","Patrícia Santos","Diego Rocha","Juliana Ferreira","Marcos Oliveira","Beatriz Nunes","Lucas Pereira","Camila Souza","André Machado","Vanessa Cruz","Felipe Gomes","Larissa Martins","Bruno Carvalho","Priscila Rodrigues","Thiago Almeida","Natalia Vieira","Rafael Barbosa","Isabela Rocha","Eduardo Lopes","Simone Freitas","Gabriel Silva","Monique Nascimento","Vitor Ribeiro","Amanda Torres","Leandro Costa","Carolina Moura","Renato Lima","Daniela Campos","Jonathan Dias","Helena Monteiro","Alexandre Faria","Bianca Cunha","Mauricio Pires","Tatiana Borges","Pedro Henrique","Aline Cardoso","Wilson Teixeira","Cristiane Araújo","Rodrigo Melo","Fabiana Correia","Caio Siqueira","Leticia Brito","Mauricio Pires","Elaine Santos"];
  const companies = ["TechNova","Agência Pixel","StartupHub","Comércio Brasil","Indústria Forte","Digital Minds","Vendas Pro","Consultoria Elite","E-shop Max","Logística Express"];
  const score = Math.floor(Math.random() * 100);
  const stage = score > 85 ? "SQL" : score > 65 ? "MQL" : score > 40 ? "Nutrindo" : score > 20 ? "Novo" : "Inativo";
  const tags  = ALL_TAGS.sort(() => Math.random() - 0.5).slice(0, Math.floor(Math.random() * 3));
  const name  = names[i % names.length];
  const company = companies[i % companies.length];
  return {
    id: `lead_${i+1}`, name,
    email: `${name.split(" ")[0].toLowerCase()}${i}@${company.toLowerCase().replace(/\s/g,"")}.com.br`,
    phone: `(${10+(i%80)}) 9${String(Math.floor(Math.random()*90000000+10000000))}`,
    company, score, stage, tags,
    source: SOURCES[i % SOURCES.length],
    created_at: new Date(Date.now() - Math.random()*90*24*3600000).toISOString(),
    last_interaction: new Date(Date.now() - Math.random()*7*24*3600000).toISOString(),
    notes: i % 5 === 0 ? "Lead demonstrou interesse em integração com CRM. Follow-up agendado." : "",
  };
});

const INTERACTION_TYPES = [
  { type:"email_open",  label:"Abriu email",           color:"#0079a9" },
  { type:"email_click", label:"Clicou em link",         color:"#0079a9" },
  { type:"page_visit",  label:"Visitou página",         color:"#6d45d9" },
  { type:"form_submit", label:"Preencheu formulário",   color:"#05b27b" },
  { type:"whatsapp",    label:"Mensagem WhatsApp",      color:"#25D366" },
  { type:"note",        label:"Nota adicionada",        color:"#e07b00" },
];
const INTERACTION_ICONS = {
  email_open:  Mail,
  email_click: Link2,
  page_visit:  Eye,
  form_submit: ClipboardList,
  whatsapp:    MessageSquare,
  note:        StickyNote,
};

const seedInteractions = (leadId) =>
  Array.from({ length: Math.floor(Math.random()*12+4) }, (_, i) => {
    const t = INTERACTION_TYPES[Math.floor(Math.random()*INTERACTION_TYPES.length)];
    return {
      id: `int_${leadId}_${i}`, lead_id: leadId, ...t,
      data: { campaign:["Black Friday","Nurturing Q4","Demo Request","Newsletter"][i%4], page:["/pricing","/features","/blog/roi","/demo"][i%4] },
      score_delta: t.type==="form_submit"?+10:t.type==="email_click"?+5:t.type==="email_open"?+2:+1,
      timestamp: new Date(Date.now()-(12-i)*3600000*(1+Math.random()*48)).toISOString(),
    };
  }).sort((a,b) => new Date(b.timestamp)-new Date(a.timestamp));

const seedForms = () => [
  { id:"form_1", name:"Lead Magnet — eBook Gratuito",
    fields:[{id:"f1",type:"text",label:"Nome completo",required:true},{id:"f2",type:"email",label:"Email profissional",required:true},{id:"f3",type:"tel",label:"WhatsApp",required:false}],
    settings:{redirect:"https://vantari.com.br/obrigado",tags:["Newsletter","eBook"],webhook:""},
    workspace_id:"ws_1", submissions:284, created_at:new Date(Date.now()-30*86400000).toISOString() },
  { id:"form_2", name:"Solicitação de Demo",
    fields:[{id:"f1",type:"text",label:"Nome",required:true},{id:"f2",type:"email",label:"Email",required:true},{id:"f3",type:"text",label:"Empresa",required:true},{id:"f4",type:"select",label:"Tamanho da empresa",options:["1-10","11-50","51-200","200+"],required:true}],
    settings:{redirect:"",tags:["Demo Solicitada","Alto Valor"],webhook:"https://hooks.zapier.com/xxx"},
    workspace_id:"ws_1", submissions:91, created_at:new Date(Date.now()-15*86400000).toISOString() },
];

const DB = { leads:seedLeads(), forms:seedForms() };

/* ═══════════════════════════════════════════════════════════
   DESIGN TOKENS
═══════════════════════════════════════════════════════════ */
const T = {
  blue:    "#0079a9",
  teal:    "#0079a9",
  green:   "#05b27b",
  purple:  "#6d45d9",
  orange:  "#e07b00",
  red:     "#ef4444",
  bg:      "#f2f5f8",
  surface: "#ffffff",
  border:  "#e2e8f0",
  border2: "#edf0f4",
  text:    "#5f5f64",
  muted:   "#888891",
  faint:   "#f8fafc",
  font:    "'Aptos', 'Nunito Sans', sans-serif",
  head:    "'Montserrat', sans-serif",
};

const stageColors = {
  Novo:     { bg:"#f1f5f9", text:"#475569", border:"#cbd5e1" },
  Nutrindo: { bg:"#eff6ff", text:"#1d4ed8", border:"#bfdbfe" },
  MQL:      { bg:"#fef3c7", text:"#92400e", border:"#fde68a" },
  SQL:      { bg:"#f0fdf7", text:"#065f46", border:"#6ee7b7" },
  Cliente:  { bg:"#f0fdf4", text:"#14532d", border:"#86efac" },
  Inativo:  { bg:"#fef2f2", text:"#991b1b", border:"#fecaca" },
};

const scoreColor = s => s>=80?T.green:s>=50?T.orange:s>=25?"#f97316":T.red;

/* ═══════════════════════════════════════════════════════════
   UTILITY COMPONENTS
═══════════════════════════════════════════════════════════ */
const Avatar = ({ name, size=36, score }) => {
  const initials = name.split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase();
  const hue = name.split("").reduce((a,c)=>a+c.charCodeAt(0),0)%360;
  return (
    <div style={{position:"relative",display:"inline-flex"}}>
      <div style={{width:size,height:size,borderRadius:"50%",background:`hsl(${hue},50%,52%)`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:size*0.36,fontWeight:700,fontFamily:T.head,flexShrink:0,letterSpacing:"-0.03em"}}>
        {initials}
      </div>
      {score!==undefined&&<div style={{position:"absolute",bottom:-3,right:-3,width:14,height:14,borderRadius:"50%",background:scoreColor(score),border:"2px solid #fff"}}/>}
    </div>
  );
};

const ScoreBadge = ({ score }) => (
  <div style={{display:"flex",alignItems:"center",gap:6}}>
    <div style={{width:32,height:32,borderRadius:"50%",background:`${scoreColor(score)}18`,border:`2px solid ${scoreColor(score)}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <span style={{fontSize:10,fontWeight:800,color:scoreColor(score),fontFamily:T.head}}>{score}</span>
    </div>
  </div>
);

const StagePill = ({ stage, onChange, editable }) => {
  const [open,setOpen] = useState(false);
  const c = stageColors[stage]||stageColors.Novo;
  return (
    <div style={{position:"relative"}}>
      <button onClick={()=>editable&&setOpen(!open)} style={{background:c.bg,color:c.text,border:`0.5px solid ${c.border}`,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700,fontFamily:T.font,cursor:editable?"pointer":"default",display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}>
        {stage} {editable&&<ChevronDown size={9} aria-hidden="true"/>}
      </button>
      {open&&(
        <div style={{position:"absolute",top:"110%",left:0,background:"#fff",border:`0.5px solid ${T.border}`,borderRadius:10,boxShadow:"0 8px 24px rgba(0,0,0,0.12)",zIndex:50,overflow:"hidden",minWidth:120}}>
          {STAGES.map(s=>{
            const sc=stageColors[s];
            return <button key={s} onClick={()=>{onChange(s);setOpen(false);}} style={{display:"block",width:"100%",padding:"8px 14px",background:s===stage?sc.bg:"#fff",border:"none",cursor:"pointer",fontFamily:T.font,fontSize:12,fontWeight:s===stage?700:600,color:sc.text,textAlign:"left"}}>{s}</button>;
          })}
        </div>
      )}
    </div>
  );
};

const Tag = ({ label, onRemove }) => (
  <span style={{display:"inline-flex",alignItems:"center",gap:4,background:"#eff6ff",color:T.blue,border:"0.5px solid #bfdbfe",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700,fontFamily:T.font,whiteSpace:"nowrap"}}>
    {label}
    {onRemove&&<button onClick={onRemove} style={{background:"none",border:"none",cursor:"pointer",color:T.muted,padding:0,fontSize:11,lineHeight:1,display:"flex",alignItems:"center"}}><X size={9} aria-hidden="true"/></button>}
  </span>
);

const Btn = ({ children, onClick, variant="primary", size="sm", icon:Icon, disabled, style:sx={} }) => {
  const [hov,setHov] = useState(false);
  const v = {
    primary:   { bg:hov?"#006a93":T.blue,   color:"#fff", border:"none",                          shadow:hov?"0 4px 12px rgba(0,121,169,0.3)":"0 1px 3px rgba(0,121,169,0.15)" },
    secondary: { bg:hov?"#e8f5fb":"#fff",     color:T.blue, border:`1px solid ${T.blue}`,           shadow:"none" },
    ghost:     { bg:hov?T.border2:"transparent",color:T.text,border:"none",                         shadow:"none" },
    danger:    { bg:hov?"#dc2626":"#fef2f2",  color:hov?"#fff":T.red, border:`0.5px solid ${T.red}55`,shadow:"none" },
    success:   { bg:hov?"#04996a":T.green,    color:"#fff", border:"none",                          shadow:"none" },
    teal:      { bg:hov?"#006a93":T.teal,     color:"#fff", border:"none",                          shadow:"none" },
  }[variant]||{};
  const pad = {xs:"5px 10px",sm:"7px 14px",md:"9px 18px",lg:"11px 22px"}[size]||"7px 14px";
  const fs  = {xs:11,sm:12,md:13,lg:14}[size]||12;
  return (
    <button onClick={onClick} disabled={disabled} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{display:"inline-flex",alignItems:"center",gap:6,padding:pad,fontSize:fs,fontFamily:T.font,fontWeight:700,borderRadius:8,border:v.border||"none",background:v.bg,color:v.color,boxShadow:v.shadow,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.5:1,transition:"all 0.15s",...sx}}>
      {Icon&&<Icon size={fs} aria-hidden="true"/>}{children}
    </button>
  );
};

const Input = ({ value, onChange, placeholder, icon:Icon, type="text", style:sx={}, small }) => (
  <div style={{position:"relative",...sx}}>
    {Icon&&<div style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",display:"flex",alignItems:"center"}}><Icon size={14} color={T.muted} aria-hidden="true"/></div>}
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      style={{width:"100%",boxSizing:"border-box",padding:small?`6px ${Icon?"32px":"10px"} 6px ${Icon?"32px":"10px"}`:`9px ${Icon?"36px":"12px"} 9px ${Icon?"36px":"12px"}`,fontFamily:T.font,fontSize:small?12:13,fontWeight:600,border:`1px solid ${T.border}`,borderRadius:8,outline:"none",background:"#fff",color:T.text,transition:"border-color 0.15s"}}
      onFocus={e=>e.target.style.borderColor=T.blue}
      onBlur={e=>e.target.style.borderColor=T.border}/>
  </div>
);

const Checkbox = ({ checked, onChange, indeterminate }) => {
  const ref = useRef(null);
  useEffect(()=>{ if(ref.current) ref.current.indeterminate=indeterminate; },[indeterminate]);
  return <input ref={ref} type="checkbox" checked={checked} onChange={onChange} style={{width:15,height:15,cursor:"pointer",accentColor:T.blue}}/>;
};

const ScoreSparkline = ({ scores }) => {
  const w=260,h=80, pts=scores.map((v,i)=>`${(i/(scores.length-1))*w},${h-((v)/100)*h}`).join(" ");
  return (
    <svg width={w} height={h} style={{overflow:"visible"}}>
      <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.blue} stopOpacity="0.2"/><stop offset="100%" stopColor={T.blue} stopOpacity="0"/></linearGradient></defs>
      <path d={`M${pts.split(" ").join(" L")}`} fill="none" stroke={T.blue} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {scores.map((v,i)=><circle key={i} cx={(i/(scores.length-1))*w} cy={h-(v/100)*h} r="3.5" fill={scoreColor(v)} stroke="#fff" strokeWidth="1.5"/>)}
    </svg>
  );
};

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

/* ═══════════════════════════════════════════════════════════
   LEAD PROFILE MODAL
═══════════════════════════════════════════════════════════ */
const LeadProfileModal = ({ lead, onClose, onUpdate }) => {
  const [tab,setTab]           = useState("dados");
  const [editing,setEditing]   = useState(false);
  const [form,setForm]         = useState({...lead});
  const [noteText,setNoteText] = useState("");
  const [interactions]         = useState(()=>seedInteractions(lead.id));
  const scoreHistory = useMemo(()=>{
    let s=Math.max(10,lead.score-30);
    return Array.from({length:8},()=>{ s=Math.min(100,s+Math.floor(Math.random()*12-2)); return s; });
  },[lead]);

  const profileTabs = [
    { id:"dados",     label:"Dados Pessoais", Icon:User      },
    { id:"historico", label:"Histórico",       Icon:Calendar  },
    { id:"campanhas", label:"Campanhas",       Icon:Mail      },
    { id:"score",     label:"Score",           Icon:BarChart2 },
  ];

  const handleSave = () => { onUpdate({...form}); setEditing(false); };
  const addNote    = () => { if(!noteText.trim()) return; setForm(f=>({...f,notes:noteText})); setNoteText(""); };

  const campaigns = [
    { name:"Black Friday 2024",          status:"Enviado",  open:true,  click:true,  date:"15/11/2024" },
    { name:"Nurturing — Semana 3",        status:"Enviado",  open:true,  click:false, date:"08/11/2024" },
    { name:"Demo Request Follow-up",      status:"Enviado",  open:false, click:false, date:"01/11/2024" },
    { name:"Newsletter Outubro",          status:"Agendado", open:null,  click:null,  date:"30/10/2024" },
  ];

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#fff",borderRadius:16,width:"92%",maxWidth:780,maxHeight:"92vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 30px 80px rgba(0,0,0,0.2)",animation:"slideUp 0.25s ease"}}>

        {/* Header */}
        <div style={{background:`linear-gradient(135deg,${T.blue},${T.teal})`,padding:"24px 28px",flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{display:"flex",gap:16,alignItems:"center"}}>
              <Avatar name={lead.name} size={54}/>
              <div>
                <h2 style={{margin:0,color:"#fff",fontFamily:T.head,fontSize:18,fontWeight:700}}>{lead.name}</h2>
                <div style={{color:"rgba(255,255,255,0.75)",fontSize:13,fontFamily:T.font,marginTop:3,fontWeight:600}}>{lead.company} · {lead.email}</div>
                <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
                  <StagePill stage={form.stage} onChange={s=>{setForm(f=>({...f,stage:s}));onUpdate({...lead,stage:s});}} editable/>
                  {lead.tags.map(t=><Tag key={t} label={t}/>)}
                </div>
              </div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <div style={{textAlign:"center",background:"rgba(255,255,255,0.15)",borderRadius:12,padding:"8px 16px"}}>
                <div style={{color:"#fff",fontSize:24,fontWeight:800,fontFamily:T.head}}>{lead.score}</div>
                <div style={{color:"rgba(255,255,255,0.7)",fontSize:10,fontFamily:T.font,letterSpacing:"0.06em",fontWeight:700}}>SCORE</div>
              </div>
              <button onClick={onClose} style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:8,width:32,height:32,cursor:"pointer",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <X size={16} aria-hidden="true"/>
              </button>
            </div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:16}}>
            <Btn icon={Star} onClick={()=>onUpdate({...lead,stage:"SQL"})} style={{background:"rgba(255,255,255,0.2)",color:"#fff",border:"1px solid rgba(255,255,255,0.3)"}}>Marcar como SQL</Btn>
            <Btn icon={Mail} style={{background:"rgba(255,255,255,0.2)",color:"#fff",border:"1px solid rgba(255,255,255,0.3)"}}>Enviar Email</Btn>
            <Btn icon={MessageSquare} style={{background:"rgba(255,255,255,0.2)",color:"#fff",border:"1px solid rgba(255,255,255,0.3)"}}>WhatsApp</Btn>
          </div>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",borderBottom:`0.5px solid ${T.border}`,background:T.faint,flexShrink:0}}>
          {profileTabs.map(t=>{
            const TIcon=t.Icon;
            return (
              <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"11px 18px",fontFamily:T.font,fontSize:12,fontWeight:tab===t.id?700:600,color:tab===t.id?T.blue:T.muted,background:tab===t.id?"#fff":"transparent",border:"none",borderBottom:tab===t.id?`2px solid ${T.blue}`:"2px solid transparent",cursor:"pointer",display:"flex",alignItems:"center",gap:6,transition:"all 0.15s"}}>
                <TIcon size={13} aria-hidden="true"/> {t.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div style={{flex:1,overflow:"auto",padding:"24px 28px"}}>

          {tab==="dados"&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
                <h3 style={{margin:0,fontFamily:T.head,fontSize:14,fontWeight:700,color:T.text}}>Informações do Lead</h3>
                {!editing
                  ? <Btn onClick={()=>setEditing(true)} variant="secondary" icon={Pencil}>Editar</Btn>
                  : <div style={{display:"flex",gap:8}}><Btn onClick={handleSave} variant="success" icon={CheckCircle2}>Salvar</Btn><Btn onClick={()=>{setForm({...lead});setEditing(false);}} variant="ghost">Cancelar</Btn></div>}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:24}}>
                {[
                  {label:"Nome completo", key:"name",    Icon:User         },
                  {label:"Empresa",       key:"company", Icon:Building2    },
                  {label:"Email",         key:"email",   Icon:Mail         },
                  {label:"Telefone",      key:"phone",   Icon:Smartphone   },
                ].map(f=>(
                  <div key={f.key}>
                    <label style={{display:"block",fontFamily:T.font,fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>{f.label}</label>
                    {editing
                      ? <Input value={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}/>
                      : <div style={{fontFamily:T.font,fontSize:14,fontWeight:600,color:T.text,padding:"9px 12px",background:T.faint,borderRadius:8,border:`0.5px solid ${T.border}`}}>{form[f.key]||"—"}</div>}
                  </div>
                ))}
              </div>

              <div style={{marginBottom:24}}>
                <label style={{display:"block",fontFamily:T.font,fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Tags</label>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                  {form.tags.map(tag=><Tag key={tag} label={tag} onRemove={editing?()=>setForm(p=>({...p,tags:p.tags.filter(t=>t!==tag)})):null}/>)}
                  {editing&&(
                    <select onChange={e=>{if(e.target.value&&!form.tags.includes(e.target.value))setForm(p=>({...p,tags:[...p.tags,e.target.value]}));e.target.value="";}}
                      style={{fontFamily:T.font,fontSize:12,fontWeight:600,border:`1px dashed ${T.blue}`,borderRadius:6,padding:"3px 8px",color:T.blue,background:"#eff6ff",cursor:"pointer",outline:"none"}}>
                      <option value="">+ Adicionar tag</option>
                      {ALL_TAGS.filter(t=>!form.tags.includes(t)).map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                  )}
                </div>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,background:T.faint,borderRadius:12,padding:16}}>
                {[{label:"Origem",value:lead.source},{label:"Criado em",value:new Date(lead.created_at).toLocaleDateString("pt-BR")},{label:"Última interação",value:new Date(lead.last_interaction).toLocaleDateString("pt-BR")}].map(m=>(
                  <div key={m.label} style={{textAlign:"center"}}>
                    <div style={{fontFamily:T.font,fontSize:11,color:T.muted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4,fontWeight:700}}>{m.label}</div>
                    <div style={{fontFamily:T.font,fontSize:13,fontWeight:700,color:T.text}}>{m.value}</div>
                  </div>
                ))}
              </div>

              <div style={{marginTop:20}}>
                <label style={{display:"flex",alignItems:"center",gap:5,fontFamily:T.font,fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>
                  <StickyNote size={12} aria-hidden="true"/> Nota
                </label>
                {form.notes&&<div style={{fontFamily:T.font,fontSize:13,fontWeight:600,color:T.text,background:"#fefce8",border:"0.5px solid #fef08a",borderRadius:8,padding:"10px 14px",marginBottom:10}}>{form.notes}</div>}
                <div style={{display:"flex",gap:8}}>
                  <Input value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder="Adicionar nota..." style={{flex:1}}/>
                  <Btn onClick={addNote} variant="secondary" disabled={!noteText.trim()}>Salvar nota</Btn>
                </div>
              </div>
            </div>
          )}

          {tab==="historico"&&(
            <div>
              <h3 style={{margin:"0 0 20px",fontFamily:T.head,fontSize:14,fontWeight:700,color:T.text}}>Timeline de Interações</h3>
              <div style={{position:"relative"}}>
                <div style={{position:"absolute",left:17,top:0,bottom:0,width:2,background:T.border}}/>
                {interactions.map(int=>{
                  const IIcon = INTERACTION_ICONS[int.type]||Activity;
                  return (
                    <div key={int.id} style={{display:"flex",gap:16,marginBottom:20,position:"relative"}}>
                      <div style={{width:36,height:36,borderRadius:"50%",background:"#fff",border:`2px solid ${int.color}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,zIndex:1}}>
                        <IIcon size={14} color={int.color} aria-hidden="true"/>
                      </div>
                      <div style={{flex:1,background:T.faint,border:`0.5px solid ${T.border}`,borderRadius:10,padding:"10px 14px"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <span style={{fontFamily:T.font,fontSize:13,fontWeight:700,color:T.text}}>{int.label}</span>
                          <span style={{fontFamily:T.font,fontSize:11,color:T.muted,fontWeight:600}}>{new Date(int.timestamp).toLocaleString("pt-BR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}</span>
                        </div>
                        <div style={{fontFamily:T.font,fontSize:12,color:T.muted,marginTop:3,fontWeight:600}}>
                          {int.data.campaign&&`Campanha: ${int.data.campaign}`}{int.data.page&&` · ${int.data.page}`}
                        </div>
                        {int.score_delta>0&&<span style={{display:"inline-block",marginTop:4,fontSize:10,fontWeight:700,color:T.green,background:"#f0fdf7",borderRadius:4,padding:"1px 6px"}}>+{int.score_delta} pts</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab==="campanhas"&&(
            <div>
              <h3 style={{margin:"0 0 20px",fontFamily:T.head,fontSize:14,fontWeight:700,color:T.text}}>Participação em Campanhas</h3>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead>
                  <tr style={{borderBottom:`2px solid ${T.border}`}}>
                    {["Campanha","Data","Status","Abriu","Clicou"].map(h=>(
                      <th key={h} style={{padding:"8px 12px",textAlign:"left",fontFamily:T.font,fontSize:10,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c,i)=>(
                    <tr key={i} style={{borderBottom:`0.5px solid ${T.border}`}}>
                      <td style={{padding:"12px 12px",fontFamily:T.font,fontSize:13,fontWeight:700,color:T.text}}>{c.name}</td>
                      <td style={{padding:"12px 12px",fontFamily:T.font,fontSize:12,color:T.muted,fontWeight:600}}>{c.date}</td>
                      <td style={{padding:"12px 12px"}}>
                        <span style={{fontSize:11,fontWeight:700,color:c.status==="Enviado"?T.green:T.orange,background:c.status==="Enviado"?"#f0fdf7":"#fff4e6",borderRadius:6,padding:"3px 8px",fontFamily:T.font}}>{c.status}</span>
                      </td>
                      <td style={{padding:"12px 12px",textAlign:"center"}}>
                        {c.open===null?"—":c.open
                          ?<CheckCircle2 size={16} color={T.green} aria-hidden="true"/>
                          :<XCircle size={16} color={T.red} aria-hidden="true"/>}
                      </td>
                      <td style={{padding:"12px 12px",textAlign:"center"}}>
                        {c.click===null?"—":c.click
                          ?<CheckCircle2 size={16} color={T.green} aria-hidden="true"/>
                          :<XCircle size={16} color={T.red} aria-hidden="true"/>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab==="score"&&(
            <div>
              <h3 style={{margin:"0 0 20px",fontFamily:T.head,fontSize:14,fontWeight:700,color:T.text}}>Evolução do Score</h3>
              <div style={{display:"flex",gap:16,marginBottom:28}}>
                <div style={{flex:1,background:T.faint,border:`0.5px solid ${T.border}`,borderRadius:12,padding:"16px 20px",textAlign:"center"}}>
                  <div style={{fontFamily:T.head,fontSize:36,fontWeight:800,color:scoreColor(lead.score)}}>{lead.score}</div>
                  <div style={{fontFamily:T.font,fontSize:11,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginTop:4,fontWeight:700}}>Score Atual</div>
                </div>
                {[["Interações",interactions.length],["Emails abertos",interactions.filter(i=>i.type==="email_open").length],["Formulários",interactions.filter(i=>i.type==="form_submit").length]].map(([label,val])=>(
                  <div key={label} style={{flex:1,background:T.faint,border:`0.5px solid ${T.border}`,borderRadius:12,padding:"16px 20px",textAlign:"center"}}>
                    <div style={{fontFamily:T.head,fontSize:28,fontWeight:700,color:T.text}}>{val}</div>
                    <div style={{fontFamily:T.font,fontSize:11,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginTop:4,fontWeight:700}}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={{background:T.faint,borderRadius:12,padding:"20px 24px",border:`0.5px solid ${T.border}`}}>
                <div style={{fontFamily:T.font,fontSize:13,fontWeight:700,color:T.muted,marginBottom:12}}>Últimas 8 semanas</div>
                <ScoreSparkline scores={scoreHistory}/>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:8}}>
                  {["8 sem","7 sem","6 sem","5 sem","4 sem","3 sem","2 sem","Agora"].map(l=><span key={l} style={{fontFamily:T.font,fontSize:10,color:T.muted,fontWeight:600}}>{l}</span>)}
                </div>
              </div>
              <div style={{marginTop:20}}>
                <div style={{fontFamily:T.font,fontSize:13,fontWeight:700,color:T.text,marginBottom:10}}>Regras de Pontuação Ativas</div>
                {[
                  {action:"Abriu email",               pts:"+2",  color:T.blue  },
                  {action:"Clicou em link",             pts:"+5",  color:T.teal  },
                  {action:"Preencheu formulário",       pts:"+10", color:T.green },
                  {action:"Visitou página de preços",   pts:"+15", color:T.purple},
                  {action:"Inativo por 30 dias",        pts:"−5",  color:T.red   },
                ].map(r=>(
                  <div key={r.action} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`0.5px solid ${T.border}`}}>
                    <span style={{fontFamily:T.font,fontSize:13,color:T.text,fontWeight:600}}>{r.action}</span>
                    <span style={{fontFamily:T.head,fontSize:13,fontWeight:700,color:r.color}}>{r.pts} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   FORM BUILDER
═══════════════════════════════════════════════════════════ */
const FIELD_TYPES = [
  { type:"text",     label:"Texto",         Icon:Type         },
  { type:"email",    label:"Email",         Icon:AtSign       },
  { type:"tel",      label:"Telefone",      Icon:Phone        },
  { type:"select",   label:"Seleção",       Icon:ChevronDown  },
  { type:"checkbox", label:"Checkbox",      Icon:CheckSquare  },
  { type:"textarea", label:"Área de texto", Icon:AlignLeft    },
];

const FormBuilder = ({ form, onClose, onSave }) => {
  const [name,        setName]       = useState(form?.name||"Novo Formulário");
  const [fields,      setFields]     = useState(form?.fields||[{id:"f1",type:"text",label:"Nome",required:true},{id:"f2",type:"email",label:"Email",required:true}]);
  const [settings,    setSettings]   = useState(form?.settings||{redirect:"",tags:[],webhook:""});
  const [tab,         setTab]        = useState("builder");
  const [dragging,    setDragging]   = useState(null);
  const [embedCopied, setEmbedCopied]= useState(false);

  const addField   = (type) => setFields(f=>[...f,{id:`f_${Date.now()}`,type,label:FIELD_TYPES.find(t=>t.type===type).label,required:false,options:type==="select"?["Opção 1","Opção 2"]:undefined}]);
  const removeField = (id) => setFields(f=>f.filter(x=>x.id!==id));
  const updateField = (id,key,val) => setFields(f=>f.map(x=>x.id===id?{...x,[key]:val}:x));
  const moveField   = (from,to) => { const a=[...fields]; const [item]=a.splice(from,1); a.splice(to,0,item); setFields(a); };

  const formId   = form?.id||"form_new";
  const formUrl  = `https://forms.vantari.com.br/${formId}`;
  const embedCode= `<script src="https://vantari.com.br/embed.js" data-form="${formId}"></script>`;

  const renderPreviewField = (f) => {
    const base = {width:"100%",boxSizing:"border-box",padding:"8px 12px",fontFamily:T.font,fontSize:13,fontWeight:600,border:`1px solid ${T.border}`,borderRadius:8,outline:"none",color:T.text,background:"#fff"};
    return (
      <div key={f.id} style={{marginBottom:14}}>
        <label style={{display:"block",fontFamily:T.font,fontSize:12,fontWeight:700,color:T.text,marginBottom:5}}>{f.label}{f.required&&<span style={{color:T.red,marginLeft:3}}>*</span>}</label>
        {f.type==="textarea"?<textarea style={{...base,minHeight:70,resize:"vertical"}} placeholder={`Digite ${f.label.toLowerCase()}...`}/>:
         f.type==="select"?<select style={base}>{(f.options||[]).map(o=><option key={o}>{o}</option>)}</select>:
         f.type==="checkbox"?<label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}><input type="checkbox"/><span style={{fontFamily:T.font,fontSize:13,fontWeight:600,color:T.text}}>{f.label}</span></label>:
         <input type={f.type} style={base} placeholder={`Digite ${f.label.toLowerCase()}...`}/>}
      </div>
    );
  };

  const formTabs = [
    {id:"builder",  label:"Builder",        Icon:Wrench  },
    {id:"preview",  label:"Preview",        Icon:Eye     },
    {id:"settings", label:"Configurações",  Icon:Settings},
    {id:"embed",    label:"Embed",          Icon:Code2   },
  ];

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#fff",borderRadius:16,width:"96%",maxWidth:920,height:"92vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 30px 80px rgba(0,0,0,0.2)",animation:"slideUp 0.25s ease"}}>

        <div style={{padding:"16px 24px",borderBottom:`0.5px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <ClipboardList size={18} color={T.blue} aria-hidden="true"/>
            <Input value={name} onChange={e=>setName(e.target.value)} style={{width:280}}/>
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn onClick={()=>onSave({...form,name,fields,settings})} variant="success" icon={CheckCircle2}>Salvar</Btn>
            <Btn onClick={onClose} variant="ghost" icon={X}/>
          </div>
        </div>

        <div style={{display:"flex",borderBottom:`0.5px solid ${T.border}`,background:T.faint,flexShrink:0}}>
          {formTabs.map(t=>{
            const TIcon=t.Icon;
            return (
              <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"10px 18px",fontFamily:T.font,fontSize:12,fontWeight:tab===t.id?700:600,color:tab===t.id?T.blue:T.muted,background:tab===t.id?"#fff":"transparent",border:"none",borderBottom:tab===t.id?`2px solid ${T.blue}`:"2px solid transparent",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                <TIcon size={13} aria-hidden="true"/> {t.label}
              </button>
            );
          })}
        </div>

        <div style={{flex:1,overflow:"hidden",display:"flex"}}>
          {tab==="builder"&&(
            <>
              <div style={{width:200,borderRight:`0.5px solid ${T.border}`,padding:16,background:T.faint,overflow:"auto"}}>
                <div style={{fontFamily:T.font,fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10}}>Campos</div>
                {FIELD_TYPES.map(ft=>{
                  const FIcon=ft.Icon;
                  return (
                    <button key={ft.type} onClick={()=>addField(ft.type)} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"#fff",border:`0.5px solid ${T.border}`,borderRadius:8,cursor:"pointer",fontFamily:T.font,fontSize:12,fontWeight:700,color:T.text,marginBottom:6,transition:"all 0.15s"}}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor=T.blue;e.currentTarget.style.color=T.blue;}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.text;}}>
                      <FIcon size={14} aria-hidden="true"/> {ft.label}
                    </button>
                  );
                })}
              </div>
              <div style={{flex:1,overflow:"auto",padding:20}}>
                <div style={{fontFamily:T.font,fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:14}}>Campos do formulário ({fields.length})</div>
                {fields.length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:T.muted,fontFamily:T.font,fontSize:13,fontWeight:600,border:`2px dashed ${T.border}`,borderRadius:12}}>Clique em um campo à esquerda para adicionar</div>}
                {fields.map((f,i)=>(
                  <div key={f.id} draggable onDragStart={()=>setDragging(i)} onDragOver={e=>e.preventDefault()} onDrop={()=>{if(dragging!==null&&dragging!==i)moveField(dragging,i);setDragging(null);}}
                    style={{background:"#fff",border:`1px solid ${T.border}`,borderRadius:10,padding:14,marginBottom:10,cursor:"grab",transition:"all 0.15s"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                      <GripVertical size={14} color={T.muted} style={{cursor:"grab"}} aria-hidden="true"/>
                      <span style={{fontFamily:T.font,fontSize:11,fontWeight:700,background:"#eff6ff",color:T.blue,padding:"2px 8px",borderRadius:4}}>{FIELD_TYPES.find(t=>t.type===f.type)?.label}</span>
                      <div style={{flex:1}}/>
                      <label style={{display:"flex",alignItems:"center",gap:5,fontFamily:T.font,fontSize:11,fontWeight:600,color:T.muted,cursor:"pointer"}}>
                        <input type="checkbox" checked={f.required} onChange={e=>updateField(f.id,"required",e.target.checked)} style={{accentColor:T.blue}}/>
                        Obrigatório
                      </label>
                      <button onClick={()=>removeField(f.id)} style={{background:"#fef2f2",border:"none",color:T.red,borderRadius:6,padding:"4px 8px",cursor:"pointer",display:"flex",alignItems:"center"}}>
                        <X size={12} aria-hidden="true"/>
                      </button>
                    </div>
                    <Input value={f.label} onChange={e=>updateField(f.id,"label",e.target.value)} placeholder="Label do campo" small/>
                    {f.type==="select"&&<div style={{marginTop:8}}>
                      <div style={{fontFamily:T.font,fontSize:11,color:T.muted,marginBottom:5,fontWeight:600}}>Opções (separadas por vírgula)</div>
                      <Input value={(f.options||[]).join(", ")} onChange={e=>updateField(f.id,"options",e.target.value.split(",").map(s=>s.trim()))} small/>
                    </div>}
                  </div>
                ))}
              </div>
            </>
          )}

          {tab==="preview"&&(
            <div style={{flex:1,overflow:"auto",padding:40,background:T.faint,display:"flex",justifyContent:"center"}}>
              <div style={{background:"#fff",border:`0.5px solid ${T.border}`,borderRadius:14,padding:32,width:"100%",maxWidth:440,boxShadow:"0 4px 24px rgba(0,0,0,0.08)"}}>
                <h3 style={{margin:"0 0 6px",fontFamily:T.head,fontSize:16,fontWeight:700,color:T.text}}>{name}</h3>
                <p style={{margin:"0 0 24px",fontFamily:T.font,fontSize:13,fontWeight:600,color:T.muted}}>Preencha o formulário abaixo.</p>
                {fields.map(f=>renderPreviewField(f))}
                <button style={{width:"100%",padding:"12px",marginTop:8,background:T.blue,color:"#fff",border:"none",borderRadius:10,fontFamily:T.head,fontSize:14,fontWeight:700,cursor:"pointer"}}>Enviar</button>
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:5,margin:"14px 0 0"}}>
                  <Lock size={11} color={T.muted} aria-hidden="true"/>
                  <p style={{margin:0,fontFamily:T.font,fontSize:11,color:T.muted,fontWeight:600}}>Seus dados estão protegidos pela LGPD</p>
                </div>
              </div>
            </div>
          )}

          {tab==="settings"&&(
            <div style={{flex:1,overflow:"auto",padding:28}}>
              <div style={{maxWidth:540}}>
                {[
                  {label:"Redirect pós-envio",    key:"redirect", Icon:Link2,   placeholder:"https://seusite.com.br/obrigado", hint:"Deixe vazio para exibir mensagem de confirmação padrão."},
                  {label:"Webhook URL",            key:"webhook",  Icon:Zap,     placeholder:"https://hooks.zapier.com/...",    hint:"Receba dados de cada envio em tempo real via POST."},
                ].map(f=>(
                  <div key={f.key} style={{marginBottom:22}}>
                    <label style={{display:"flex",alignItems:"center",gap:5,fontFamily:T.font,fontSize:12,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:7}}>
                      <f.Icon size={12} aria-hidden="true"/> {f.label}
                    </label>
                    <Input value={settings[f.key]} onChange={e=>setSettings(s=>({...s,[f.key]:e.target.value}))} placeholder={f.placeholder} icon={f.Icon}/>
                    <p style={{margin:"5px 0 0",fontFamily:T.font,fontSize:11,color:T.muted,fontWeight:600}}>{f.hint}</p>
                  </div>
                ))}
                <div style={{marginBottom:22}}>
                  <label style={{display:"block",fontFamily:T.font,fontSize:12,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:7}}>Tags automáticas</label>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",padding:10,border:`1px solid ${T.border}`,borderRadius:8,minHeight:42}}>
                    {settings.tags.map(t=><Tag key={t} label={t} onRemove={()=>setSettings(s=>({...s,tags:s.tags.filter(x=>x!==t)}))}/>)}
                    <select onChange={e=>{if(e.target.value&&!settings.tags.includes(e.target.value))setSettings(s=>({...s,tags:[...s.tags,e.target.value]}));e.target.value="";}}
                      style={{fontFamily:T.font,fontSize:12,fontWeight:700,border:"none",outline:"none",color:T.blue,background:"transparent",cursor:"pointer"}}>
                      <option value="">+ Tag</option>
                      {ALL_TAGS.filter(t=>!settings.tags.includes(t)).map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab==="embed"&&(
            <div style={{flex:1,overflow:"auto",padding:28}}>
              <div style={{maxWidth:600}}>
                <div style={{marginBottom:24}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,fontFamily:T.font,fontSize:13,fontWeight:700,color:T.text,marginBottom:8}}>
                    <Paperclip size={13} color={T.blue} aria-hidden="true"/> URL única do formulário
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <div style={{flex:1,fontFamily:"monospace",fontSize:12,background:"#0f172a",color:"#a5f3fc",padding:"12px 16px",borderRadius:8}}>{formUrl}</div>
                    <Btn onClick={()=>navigator.clipboard.writeText(formUrl)} variant="secondary">Copiar URL</Btn>
                  </div>
                </div>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:6,fontFamily:T.font,fontSize:13,fontWeight:700,color:T.text,marginBottom:8}}>
                    <Code2 size={13} color={T.blue} aria-hidden="true"/> Código de incorporação
                  </div>
                  <div style={{background:"#0f172a",borderRadius:10,padding:"16px 20px",position:"relative"}}>
                    <pre style={{margin:0,fontFamily:"monospace",fontSize:12,color:"#a5f3fc",whiteSpace:"pre-wrap",lineHeight:1.6}}>{embedCode}</pre>
                    <button onClick={()=>{navigator.clipboard.writeText(embedCode);setEmbedCopied(true);setTimeout(()=>setEmbedCopied(false),2000);}}
                      style={{position:"absolute",top:12,right:12,background:embedCopied?T.green:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:6,color:"#fff",padding:"4px 10px",fontFamily:T.font,fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                      {embedCopied?<><CheckCircle2 size={11} aria-hidden="true"/> Copiado!</>:"Copiar"}
                    </button>
                  </div>
                  <p style={{fontFamily:T.font,fontSize:12,fontWeight:600,color:T.muted,marginTop:10}}>Cole este código no &lt;head&gt; ou &lt;body&gt; de qualquer página HTML.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   LEADS TABLE
═══════════════════════════════════════════════════════════ */
const PAGE_SIZE = 10;

const LeadsTable = ({ onViewLead }) => {
  const [leads,       setLeads]      = useState(DB.leads);
  const [search,      setSearch]     = useState("");
  const [filters,     setFilters]    = useState({stage:"",source:"",scoreMin:0,scoreMax:100,tag:""});
  const [sortBy,      setSortBy]     = useState("created_at");
  const [sortDir,     setSortDir]    = useState("desc");
  const [selected,    setSelected]   = useState(new Set());
  const [page,        setPage]       = useState(1);
  const [showFilters, setShowFilters]= useState(false);
  const [batchAction, setBatchAction]= useState("");

  const filtered = useMemo(()=>{
    let r=[...leads];
    if(search){const q=search.toLowerCase();r=r.filter(l=>l.name.toLowerCase().includes(q)||l.email.toLowerCase().includes(q)||l.company.toLowerCase().includes(q));}
    if(filters.stage)  r=r.filter(l=>l.stage===filters.stage);
    if(filters.source) r=r.filter(l=>l.source===filters.source);
    if(filters.tag)    r=r.filter(l=>l.tags.includes(filters.tag));
    r=r.filter(l=>l.score>=filters.scoreMin&&l.score<=filters.scoreMax);
    r.sort((a,b)=>{let va=a[sortBy],vb=b[sortBy];if(typeof va==="string"){va=va.toLowerCase();vb=vb.toLowerCase();}return sortDir==="asc"?(va>vb?1:-1):(va<vb?1:-1);});
    return r;
  },[leads,search,filters,sortBy,sortDir]);

  const paginated   = filtered.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
  const totalPages  = Math.ceil(filtered.length/PAGE_SIZE);
  const allSelected = paginated.length>0&&paginated.every(l=>selected.has(l.id));
  const someSelected= paginated.some(l=>selected.has(l.id));

  const toggleAll = () => { const s=new Set(selected); if(allSelected)paginated.forEach(l=>s.delete(l.id));else paginated.forEach(l=>s.add(l.id)); setSelected(s); };
  const toggleOne = (id)=>{ const s=new Set(selected);s.has(id)?s.delete(id):s.add(id);setSelected(s); };
  const handleSort= (col)=>{ if(sortBy===col)setSortDir(d=>d==="asc"?"desc":"asc");else{setSortBy(col);setSortDir("asc");} };
  const updateLead= (updated)=>setLeads(prev=>prev.map(l=>l.id===updated.id?updated:l));
  const handleBatch=()=>{ if(!batchAction||selected.size===0)return;setLeads(prev=>prev.map(l=>selected.has(l.id)?{...l,stage:batchAction}:l));setSelected(new Set());setBatchAction(""); };

  const SortIcon = ({ col }) => {
    if(sortBy!==col) return <span style={{color:T.muted,fontSize:10,marginLeft:3}}>↕</span>;
    return sortDir==="asc"?<ChevronUp size={10} color={T.blue} style={{marginLeft:3}} aria-hidden="true"/>:<ChevronDown size={10} color={T.blue} style={{marginLeft:3}} aria-hidden="true"/>;
  };

  const cols = [
    {key:"name",         label:"Lead",       sortable:true  },
    {key:"company",      label:"Empresa",    sortable:true  },
    {key:"phone",        label:"Telefone",   sortable:false },
    {key:"score",        label:"Score",      sortable:true  },
    {key:"stage",        label:"Estágio",    sortable:true  },
    {key:"tags",         label:"Tags",       sortable:false },
    {key:"source",       label:"Origem",     sortable:true  },
    {key:"created_at",   label:"Criado em",  sortable:true  },
    {key:"actions",      label:"",           sortable:false },
  ];

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,gap:12,flexWrap:"wrap"}}>
        <div>
          <h1 style={{margin:"0 0 3px",fontFamily:T.head,fontSize:20,fontWeight:700,color:T.text,letterSpacing:"-0.02em"}}>Gestão de Leads</h1>
          <p style={{margin:0,fontFamily:T.font,fontSize:13,color:T.muted,fontWeight:600}}>{filtered.length} leads encontrados</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <Btn variant="secondary" icon={Upload} size="sm">Importar CSV</Btn>
          <Btn variant="primary"   icon={Plus}   size="sm">Novo Lead</Btn>
        </div>
      </div>

      <div style={{background:"#fff",border:`0.5px solid ${T.border}`,borderRadius:12,padding:16,marginBottom:16}}>
        <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:showFilters?14:0}}>
          <Input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="Buscar por nome, email, empresa..." icon={Search} style={{flex:1}}/>
          <Btn onClick={()=>setShowFilters(!showFilters)} variant={showFilters?"primary":"secondary"} icon={SlidersHorizontal} size="sm">
            Filtros {showFilters?"▲":"▼"}
          </Btn>
          {(search||filters.stage||filters.source||filters.tag)&&(
            <Btn onClick={()=>{setSearch("");setFilters({stage:"",source:"",scoreMin:0,scoreMax:100,tag:""});setPage(1);}} variant="ghost" size="sm" icon={X}>Limpar</Btn>
          )}
        </div>
        {showFilters&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,paddingTop:14,borderTop:`0.5px solid ${T.border}`}}>
            {[{label:"Estágio",key:"stage",options:["", ...STAGES]},{label:"Origem",key:"source",options:["", ...SOURCES]},{label:"Tag",key:"tag",options:["", ...ALL_TAGS]}].map(f=>(
              <div key={f.key}>
                <label style={{display:"block",fontFamily:T.font,fontSize:10,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:5}}>{f.label}</label>
                <select value={filters[f.key]} onChange={e=>{setFilters(p=>({...p,[f.key]:e.target.value}));setPage(1);}}
                  style={{width:"100%",fontFamily:T.font,fontSize:12,fontWeight:600,border:`1px solid ${T.border}`,borderRadius:8,padding:"7px 10px",outline:"none",color:T.text,background:"#fff"}}>
                  {f.options.map(o=><option key={o} value={o}>{o||"Todos"}</option>)}
                </select>
              </div>
            ))}
            <div>
              <label style={{display:"block",fontFamily:T.font,fontSize:10,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:5}}>Score mín.</label>
              <input type="range" min="0" max="100" value={filters.scoreMin} onChange={e=>setFilters(p=>({...p,scoreMin:+e.target.value}))} style={{width:"100%",accentColor:T.blue}}/>
              <div style={{fontFamily:T.font,fontSize:11,color:T.muted,textAlign:"center",fontWeight:600}}>{filters.scoreMin} — {filters.scoreMax}</div>
            </div>
          </div>
        )}
      </div>

      {selected.size>0&&(
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 16px",background:"#eff6ff",border:`0.5px solid #bfdbfe`,borderRadius:10,marginBottom:12}}>
          <span style={{fontFamily:T.font,fontSize:13,fontWeight:700,color:T.blue}}>{selected.size} leads selecionados</span>
          <select value={batchAction} onChange={e=>setBatchAction(e.target.value)}
            style={{fontFamily:T.font,fontSize:12,fontWeight:600,border:`1px solid ${T.blue}`,borderRadius:8,padding:"5px 10px",color:T.blue,background:"#fff",outline:"none"}}>
            <option value="">Ação em lote...</option>
            {STAGES.map(s=><option key={s} value={s}>Mover para: {s}</option>)}
            <option value="_delete">Excluir selecionados</option>
          </select>
          <Btn onClick={handleBatch} variant="primary" size="sm" disabled={!batchAction}>Aplicar</Btn>
          <Btn onClick={()=>setSelected(new Set())} variant="ghost" size="sm">Cancelar</Btn>
        </div>
      )}

      <div style={{background:"#fff",border:`0.5px solid ${T.border}`,borderRadius:12,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:900}}>
            <thead>
              <tr style={{background:T.faint,borderBottom:`2px solid ${T.border}`}}>
                <th style={{padding:"10px 14px",width:40}}><Checkbox checked={allSelected} indeterminate={someSelected&&!allSelected} onChange={toggleAll}/></th>
                {cols.map(c=>(
                  <th key={c.key} onClick={()=>c.sortable&&handleSort(c.key)}
                    style={{padding:"10px 12px",textAlign:"left",fontFamily:T.font,fontSize:10,fontWeight:700,color:sortBy===c.key?T.blue:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",cursor:c.sortable?"pointer":"default",whiteSpace:"nowrap",userSelect:"none"}}>
                    {c.label}{c.sortable&&<SortIcon col={c.key}/>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length===0&&<tr><td colSpan={cols.length+1} style={{padding:40,textAlign:"center",fontFamily:T.font,color:T.muted,fontSize:14,fontWeight:600}}>Nenhum lead encontrado</td></tr>}
              {paginated.map((lead,i)=>(
                <tr key={lead.id} style={{borderBottom:`0.5px solid ${T.border}`,background:selected.has(lead.id)?"#f0f7ff":i%2===0?"#fff":T.faint,transition:"background 0.1s"}}
                  onMouseEnter={e=>e.currentTarget.style.background="#f0f7ff"}
                  onMouseLeave={e=>e.currentTarget.style.background=selected.has(lead.id)?"#f0f7ff":i%2===0?"#fff":T.faint}>
                  <td style={{padding:"10px 14px"}}><Checkbox checked={selected.has(lead.id)} onChange={()=>toggleOne(lead.id)}/></td>
                  <td style={{padding:"10px 12px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <Avatar name={lead.name} size={32} score={lead.score}/>
                      <div>
                        <div style={{fontFamily:T.font,fontSize:13,fontWeight:700,color:T.text,whiteSpace:"nowrap"}}>{lead.name}</div>
                        <div style={{fontFamily:T.font,fontSize:11,color:T.muted,fontWeight:600}}>{lead.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{padding:"10px 12px",fontFamily:T.font,fontSize:13,fontWeight:600,color:T.text}}>{lead.company}</td>
                  <td style={{padding:"10px 12px",fontFamily:T.font,fontSize:12,color:T.muted,fontWeight:600,whiteSpace:"nowrap"}}>{lead.phone}</td>
                  <td style={{padding:"10px 12px"}}><ScoreBadge score={lead.score}/></td>
                  <td style={{padding:"10px 12px"}}><StagePill stage={lead.stage} onChange={s=>updateLead({...lead,stage:s})} editable/></td>
                  <td style={{padding:"10px 12px"}}>
                    <div style={{display:"flex",gap:4,flexWrap:"nowrap"}}>
                      {lead.tags.slice(0,2).map(t=><Tag key={t} label={t}/>)}
                      {lead.tags.length>2&&<Tag label={`+${lead.tags.length-2}`}/>}
                    </div>
                  </td>
                  <td style={{padding:"10px 12px"}}><span style={{fontFamily:T.font,fontSize:11,fontWeight:600,color:T.muted,background:T.faint,border:`0.5px solid ${T.border}`,borderRadius:6,padding:"2px 7px"}}>{lead.source}</span></td>
                  <td style={{padding:"10px 12px",fontFamily:T.font,fontSize:12,color:T.muted,fontWeight:600,whiteSpace:"nowrap"}}>{new Date(lead.created_at).toLocaleDateString("pt-BR",{day:"2-digit",month:"short"})}</td>
                  <td style={{padding:"10px 12px"}}>
                    <div style={{display:"flex",gap:4}}>
                      <button onClick={()=>onViewLead(lead)} title="Ver perfil" style={{background:"#eff6ff",border:"none",borderRadius:6,width:28,height:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <Eye size={13} color={T.blue} aria-hidden="true"/>
                      </button>
                      <button title="Enviar email" style={{background:"#f0fdf7",border:"none",borderRadius:6,width:28,height:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <Mail size={13} color={T.green} aria-hidden="true"/>
                      </button>
                      <button title="Excluir" style={{background:"#fef2f2",border:"none",borderRadius:6,width:28,height:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <Trash2 size={13} color={T.red} aria-hidden="true"/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderTop:`0.5px solid ${T.border}`,background:T.faint}}>
          <span style={{fontFamily:T.font,fontSize:12,color:T.muted,fontWeight:600}}>
            Mostrando {Math.min((page-1)*PAGE_SIZE+1,filtered.length)}–{Math.min(page*PAGE_SIZE,filtered.length)} de {filtered.length}
          </span>
          <div style={{display:"flex",gap:4,alignItems:"center"}}>
            <Btn onClick={()=>setPage(1)}                               disabled={page===1}          variant="ghost" size="xs" icon={ChevronsLeft}/>
            <Btn onClick={()=>setPage(p=>Math.max(1,p-1))}              disabled={page===1}          variant="ghost" size="xs" icon={ChevronLeft}/>
            {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
              let p=page<=3?i+1:page+i-2;
              if(p<1||p>totalPages)return null;
              return <button key={p} onClick={()=>setPage(p)} style={{width:30,height:30,borderRadius:7,border:`1px solid ${p===page?T.blue:T.border}`,background:p===page?T.blue:"#fff",color:p===page?"#fff":T.text,fontFamily:T.font,fontSize:12,fontWeight:p===page?700:600,cursor:"pointer"}}>{p}</button>;
            })}
            <Btn onClick={()=>setPage(p=>Math.min(totalPages,p+1))}     disabled={page===totalPages} variant="ghost" size="xs" icon={ChevronRight}/>
            <Btn onClick={()=>setPage(totalPages)}                       disabled={page===totalPages} variant="ghost" size="xs" icon={ChevronsRight}/>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   FORMS LIST
═══════════════════════════════════════════════════════════ */
const FormsSection = () => {
  const [forms,       setForms]       = useState(DB.forms);
  const [editingForm, setEditingForm] = useState(null);
  const [creating,    setCreating]    = useState(false);

  const saveForm = (form) => {
    if(form.id&&forms.find(f=>f.id===form.id)) setForms(prev=>prev.map(f=>f.id===form.id?form:f));
    else setForms(prev=>[...prev,{...form,id:`form_${Date.now()}`,submissions:0,created_at:new Date().toISOString()}]);
    setEditingForm(null); setCreating(false);
  };

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <h2 style={{margin:"0 0 3px",fontFamily:T.head,fontSize:18,fontWeight:700,color:T.text}}>Formulários de Captura</h2>
          <p style={{margin:0,fontFamily:T.font,fontSize:13,color:T.muted,fontWeight:600}}>{forms.length} formulários criados</p>
        </div>
        <Btn onClick={()=>setCreating(true)} variant="primary" icon={Plus} size="md">Novo Formulário</Btn>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:16}}>
        {forms.map(form=>(
          <div key={form.id} style={{background:"#fff",border:`0.5px solid ${T.border}`,borderRadius:12,overflow:"hidden",transition:"all 0.15s",boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}
            onMouseEnter={e=>e.currentTarget.style.boxShadow="0 6px 20px rgba(0,0,0,0.09)"}
            onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,0.04)"}>
            <div style={{height:4,background:T.blue}}/>
            <div style={{padding:"18px 20px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                <h3 style={{margin:0,fontFamily:T.font,fontSize:14,fontWeight:700,color:T.text,lineHeight:1.3}}>{form.name}</h3>
                <span style={{fontFamily:T.font,fontSize:11,color:T.muted,fontWeight:600,whiteSpace:"nowrap",marginLeft:8}}>{new Date(form.created_at).toLocaleDateString("pt-BR")}</span>
              </div>
              <div style={{display:"flex",gap:16,marginBottom:14}}>
                {[["Campos",form.fields.length,T.blue],["Envios",form.submissions,T.green],["Tags",form.settings.tags.length,T.teal]].map(([label,val,color])=>(
                  <div key={label} style={{textAlign:"center"}}>
                    <div style={{fontFamily:T.head,fontSize:20,fontWeight:700,color}}>{val}</div>
                    <div style={{fontFamily:T.font,fontSize:10,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.05em"}}>{label}</div>
                  </div>
                ))}
              </div>
              {form.settings.tags.length>0&&<div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:14}}>{form.settings.tags.map(t=><Tag key={t} label={t}/>)}</div>}
              <div style={{display:"flex",gap:6}}>
                <Btn onClick={()=>setEditingForm(form)} variant="secondary" size="xs" icon={Pencil}  style={{flex:1,justifyContent:"center"}}>Editar</Btn>
                <Btn variant="ghost" size="xs" icon={BarChart2}             style={{flex:1,justifyContent:"center"}}>Stats</Btn>
                <Btn variant="ghost" size="xs" icon={Link2}                 style={{flex:1,justifyContent:"center"}}>Copiar URL</Btn>
              </div>
            </div>
          </div>
        ))}
      </div>

      {(editingForm||creating)&&<FormBuilder form={editingForm} onClose={()=>{setEditingForm(null);setCreating(false);}} onSave={saveForm}/>}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   ROOT APP
═══════════════════════════════════════════════════════════ */
const MODULE_TABS = [
  { id:"leads",  Icon:Users,         label:"Leads"         },
  { id:"forms",  Icon:ClipboardList, label:"Formulários"   },
];

const THRESHOLDS = { warm:21, hot:51, sql:80 };
const BAND_COLORS = {
  warm:{ color:"#e07b00", bg:"#fff4e6", border:"#f5c78a" },
  hot: { color:"#05b27b", bg:"#f0fdf7", border:"#6ee7b7" },
  sql: { color:"#6d45d9", bg:"#f3f0ff", border:"#c4b5fd" },
};

export default function VantariLeadsModule() {
  const [activeTab,    setActiveTab]    = useState("leads");
  const [selectedLead, setSelectedLead] = useState(null);

  return (
    <div style={{display:"flex",height:"100vh",background:T.bg,fontFamily:T.font,overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700&family=Nunito+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing:border-box; }
        body { margin:0; }
        @keyframes slideUp { from{opacity:0;transform:translateY(24px);}to{opacity:1;transform:translateY(0);} }
        input[type=range] { accent-color:${T.blue}; }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-thumb { background:${T.border}; border-radius:3px; }
        select:focus, input:focus { outline:none; }
      `}</style>

      {/* ── SIDEBAR — iconrs.png embutido */}
      <div style={{width:220,background:"#0079a9",display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"16px 20px 14px",borderBottom:"1px solid rgba(255,255,255,0.12)",display:"flex",alignItems:"center"}}>
          <img src="iconrs.png" alt="Vantari" style={{height:28,width:"auto"}}/>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"8px 0"}}>
          <NavSection label="Principal"/>
          <NavItem icon={BarChart2}      label="Analytics" path="/dashboard"       />
          <NavItem icon={Users}          label="Leads" path="/leads"     active />
          <NavItem icon={Mail}           label="Email Marketing" path="/email" />
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

        {/* Topbar com threshold badges WARM/HOT/SQL */}
        <div style={{height:52,background:T.surface,borderBottom:`0.5px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px",flexShrink:0}}>
          <span style={{fontSize:15,fontWeight:700,color:T.text,fontFamily:T.head,letterSpacing:"-0.01em"}}>
            {MODULE_TABS.find(t=>t.id===activeTab)?.label||"Leads"}
          </span>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {Object.entries(BAND_COLORS).map(([k,{color,bg,border}])=>(
              <div key={k} style={{fontFamily:T.font,fontSize:11,fontWeight:700,color,background:bg,border:`0.5px solid ${border}`,padding:"4px 9px",borderRadius:6}}>
                {k.toUpperCase()} ≥{THRESHOLDS[k]}
              </div>
            ))}
          </div>
        </div>

        {/* Sub-tabs */}
        <div style={{background:T.surface,borderBottom:`0.5px solid ${T.border}`,padding:"0 24px",display:"flex",gap:2,flexShrink:0}}>
          {MODULE_TABS.map(t=>{
            const TIcon=t.Icon;
            const active=activeTab===t.id;
            return (
              <button key={t.id} onClick={()=>setActiveTab(t.id)}
                style={{display:"flex",alignItems:"center",gap:6,padding:"10px 14px",background:"none",border:"none",borderBottom:active?`2px solid ${T.blue}`:"2px solid transparent",cursor:"pointer",fontSize:12,fontWeight:active?700:600,color:active?T.blue:T.muted,fontFamily:T.font,transition:"all 0.15s"}}>
                <TIcon size={14} aria-hidden="true"/> {t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={{flex:1,overflowY:"auto",padding:"24px 28px"}}>
          {activeTab==="leads"&&<LeadsTable onViewLead={setSelectedLead}/>}
          {activeTab==="forms"&&<FormsSection/>}
        </div>
      </div>

      {selectedLead&&(
        <LeadProfileModal
          lead={selectedLead}
          onClose={()=>setSelectedLead(null)}
          onUpdate={updated=>{DB.leads=DB.leads.map(l=>l.id===updated.id?updated:l);setSelectedLead(updated);}}
        />
      )}
    </div>
  );
}
