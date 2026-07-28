import { useState, useRef, useEffect } from "react";
import { useSidebarCollapsed } from "./sidebar-collapsed";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabase";
import {
  PenLine, TrendingUp, FileText, Target, Settings, Clock,
  BarChart2, Users, Mail, LayoutTemplate, Bot, Plug, Star,
  RefreshCw, Sliders, CheckCircle2, Search, Save, Download,
  Brain, Zap, AtSign, Hash, Lightbulb, User, Link2,
  ClipboardList, Monitor, Video, BookOpen, ArrowUp,
  MessageSquare, Sparkles, Send, ChevronRight, ChevronLeft, Copy, Filter, LogOut
} from "lucide-react";

import { IdCard } from "lucide-react";
import { Briefcase } from "lucide-react";
import { Building2 } from "lucide-react";
import { Activity, ListChecks } from "lucide-react";
import { AlertTriangle } from "lucide-react";
/* ═══════════════════════════════════════════════════
   DESIGN TOKENS — Vantari redesign
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
  border2: "#EEF2F6",

  // Ink scale
  ink:     "#0E1A24",
  text:    "#2E3D4B",
  muted:   "#5A6B7A",
  faint3:  "#8696A5",
  faint:   "#F5F8FB",

  // Compat aliases used in this file
  blueL:   "#DCF0F7",
  purpleL: "#EDE9FF",
  greenL:  "#DCFCE7",

  // Fonts
  font:    "'Inter', system-ui, sans-serif",
  head:    "'Sora', system-ui, sans-serif",
  sans:    "'Inter', system-ui, sans-serif",
  mono:    "'JetBrains Mono', monospace",
};

/* ═══════════════════════════════════════════════════
   WORKSPACE + DEFAULTS (persistidos em public.ai_settings)
═══════════════════════════════════════════════════ */
const WORKSPACE_VANTARI = "53092199-7b75-4342-a897-f589d6f34922";

const DEFAULT_SETTINGS = {
  workspace_id: WORKSPACE_VANTARI,
  model_preference: "gemini-flash-latest",
  temperature: 0.7,
  custom_prompts: {
    email:   "Você é um copywriter especialista em marketing B2B brasileiro. Escreva emails persuasivos, claros e com boa entregabilidade.",
    subject: "Gere assuntos de email com alta taxa de abertura para público B2B brasileiro.",
    summary: "Analise as interações de um lead e gere um resumo estratégico em português.",
  },
};

// grava cada geração de IA em public.ai_generations (histórico real, lido pela
// aba "Histórico & Analytics" — antes disso nada era persistido)
const logGeneration = async ({ type, prompt, result, model, temperature, tokens }) => {
  try {
    await supabase.from("ai_generations").insert({
      workspace_id: WORKSPACE_VANTARI,
      type, prompt: String(prompt).slice(0, 2000), result: String(result).slice(0, 8000),
      model, temperature, tokens: tokens || 0,
    });
  } catch (e) {
    console.error("Falha ao registrar geração de IA no histórico:", e);
  }
};


const MODELS = [
  // gemini-2.5-flash foi aposentado pelo Google para novos usuários (jul/2026) — usar sempre
  // o alias "-latest" evita quebrar de novo quando a versão numerada mudar.
  { id:"gemini-flash-latest", name:"Gemini Flash (latest)", provider:"Google", cost:"sempre o flash atual", badge:"Recomendado", color:T.blue },
  { id:"gemini-pro-latest",   name:"Gemini Pro (latest)",   provider:"Google", cost:"mais capaz (requer billing)", badge:"Avançado", color:T.purple },
];
const modelLabel = (id) => (MODELS.find(m => m.id === id) || {}).name || id;

const AUDIENCE_OPTS  = ["Todos os Leads","MQL","SQL","Newsletter","Demo Solicitada","Inativos 30d","Alto Valor","B2B"];
const TONE_OPTS      = ["Formal","Semi-formal","Casual","Urgente","Empático","Persuasivo"];
const OBJECTIVE_OPTS = ["Conversão","Nutrição","Reativação","Evento/Webinar","Follow-up","Onboarding"];

const INTERACTION_ICONS = { email_open:Mail, email_click:Link2, page_visit:Monitor, form_submit:ClipboardList };
const TYPE_ICONS = { email:Mail, subject:AtSign, summary:Brain };
const CONTENT_ICONS = { email:Mail, blog:BookOpen, case_study:BarChart2, webinar:Video };

/* ═══════════════════════════════════════════════════
   AI API CALL
═══════════════════════════════════════════════════ */
const callAI = async (systemPrompt, userPrompt, model="gemini-flash-latest", temperature=0.7) => {
  // chama a Edge Function ai-generate (Gemini server-side; chave nunca vai ao navegador)
  const { data, error } = await supabase.functions.invoke("ai-generate", {
    body: { system: systemPrompt, prompt: userPrompt, model, temperature },
  });
  if (error) {
    // Quando a function responde com status != 2xx, o supabase-js só preenche
    // `error.message` com o texto genérico "Edge Function returned a non-2xx
    // status code" — o motivo real (ex.: "GEMINI_API_KEY não configurada")
    // vem no corpo JSON da resposta, acessível via error.context (Response).
    let detail = error.message || "Falha ao chamar a IA";
    try {
      const body = await error.context?.json?.();
      if (body?.error) detail = body.error;
    } catch { /* corpo não era JSON — mantém a mensagem genérica */ }
    throw new Error(detail);
  }
  if (data?.error) throw new Error(data.error);
  return { text: data?.text || "", tokens: data?.tokens || 0 };
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
      color:"#fff", border:"none",
      shadow: hov ? "0 8px 22px -6px rgba(13,116,145,.5)" : "0 4px 14px -4px rgba(13,116,145,.4)",
    },
    secondary: { bg:hov?T.blueL:T.white,     color:T.teal,  border:`1.5px solid ${hov?T.teal:T.border}`, shadow:"none" },
    ghost:     { bg:hov?"#EEF2F6":"transparent",color:T.text,border:`0.5px solid ${T.border}`,            shadow:"none" },
    danger:    { bg:hov?"#e04d42":"#FFE8E6",  color:hov?"#fff":T.red, border:`0.5px solid ${T.red}55`,   shadow:"none" },
    success:   { bg:hov?"#108A60":T.green,    color:"#fff",  border:"none",                               shadow:"none" },
    purple:    { bg:hov?"#6347E0":T.purple,   color:"#fff",  border:"none",                               shadow:`0 2px 8px ${T.purple}33` },
  }[variant]||{};
  const pad = {xs:"4px 9px",sm:"6px 13px",md:"9px 18px",lg:"12px 26px"}[size]||"9px 18px";
  const fs  = {xs:10,sm:12,md:13,lg:14}[size]||13;
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ display:"inline-flex",alignItems:"center",gap:6,padding:pad,fontSize:fs,fontFamily:T.font,fontWeight:700,borderRadius:10,border:v.border||"none",background:v.bg,color:v.color,boxShadow:v.shadow,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.5:1,transition:"all 0.15s",width:full?"100%":"auto",justifyContent:full?"center":"flex-start",...sx }}>
      {Icon&&<Icon size={fs} aria-hidden="true"/>}{children}
    </button>
  );
};

const Select = ({ label, value, onChange, options, small, style:sx={} }) => {
  const [foc,setFoc] = useState(false);
  return (
    <div style={sx}>
      {label&&<label style={{display:"block",fontFamily:T.font,fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:5}}>{label}</label>}
      <select value={value} onChange={e=>onChange(e.target.value)} onFocus={()=>setFoc(true)} onBlur={()=>setFoc(false)}
        style={{width:"100%",padding:small?"6px 10px":"10px 13px",fontFamily:T.font,fontSize:small?12:13,fontWeight:600,border:`1px solid ${foc?T.teal:T.border}`,borderRadius:8,outline:"none",background:T.white,color:T.text,cursor:"pointer",transition:"border-color 0.15s",boxShadow:foc?`0 0 0 3px ${T.teal}18`:"none"}}>
        {options.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
};

const Textarea = ({ label, value, onChange, placeholder, rows=4, mono, style:sx={} }) => {
  const [foc,setFoc] = useState(false);
  return (
    <div style={sx}>
      {label&&<label style={{display:"block",fontFamily:T.font,fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:5}}>{label}</label>}
      <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows}
        onFocus={()=>setFoc(true)} onBlur={()=>setFoc(false)}
        style={{width:"100%",boxSizing:"border-box",padding:"10px 13px",fontFamily:mono?T.mono:T.font,fontSize:13,fontWeight:600,border:`1px solid ${foc?T.teal:T.border}`,borderRadius:8,outline:"none",background:T.white,color:T.text,resize:"vertical",transition:"border-color 0.15s",boxShadow:foc?`0 0 0 3px ${T.teal}18`:"none",lineHeight:1.6}}/>
    </div>
  );
};

const Badge = ({ label, color="#5A6B7A", bg="#EEF2F6", small }) => (
  <span style={{display:"inline-flex",alignItems:"center",gap:4,fontFamily:T.font,fontSize:small?10:11,fontWeight:700,color,background:bg,padding:small?"2px 7px":"3px 9px",borderRadius:20,whiteSpace:"nowrap"}}>
    {label}
  </span>
);

const Card = ({ children, style:sx={}, onClick }) => (
  <div onClick={onClick} style={{background:T.white,border:`0.5px solid ${T.border}`,borderRadius:14,overflow:"hidden",cursor:onClick?"pointer":"default",boxShadow:"0 1px 0 rgba(14,26,36,.03), 0 8px 24px -16px rgba(14,26,36,.08)",...sx}}>
    {children}
  </div>
);

const Stars = ({ value, onChange }) => (
  <div style={{display:"flex",gap:2}}>
    {[1,2,3,4,5].map(s=>(
      <Star key={s} size={13} onClick={()=>onChange&&onChange(s)}
        fill={s<=value?T.amber:"none"}
        color={s<=value?T.amber:"#d1d5db"}
        style={{cursor:onChange?"pointer":"default",transition:"color 0.1s"}} aria-hidden="true"/>
    ))}
  </div>
);

const Spinner = () => (
  <span style={{display:"inline-block",width:16,height:16,border:`2px solid ${T.blueL}`,borderTopColor:T.teal,borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>
);

/* ─── SIDEBAR NAV HELPERS ─── */
const NavSection = ({ label, collapsed = false }) => (
  collapsed ? <div style={{ height: 10 }} /> : (
    <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.18em",color:"rgba(255,255,255,0.4)",padding:"10px 20px 4px",textTransform:"uppercase",fontFamily:T.head}}>
      {label}
    </div>
  )
);
const NavItem = ({ icon:Icon, label, active=false, path, collapsed=false }) => {
  const [hov,setHov] = useState(false);
  const navigate = useNavigate();
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={() => path && navigate(path)}
      title={collapsed ? label : undefined}
      style={{
        position:"relative",
        display:"flex",alignItems:"center",gap:9,
        padding: collapsed ? "8px 0" : "8px 20px", justifyContent: collapsed ? "center" : "flex-start",
        fontSize:13.5,
        fontWeight:active?700:600,
        fontFamily:T.font,
        color:active?"#fff":hov?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.6)",
        background:active?"rgba(255,255,255,0.10)":hov?"rgba(255,255,255,0.06)":"transparent",
        cursor:"pointer",transition:"all 0.15s",userSelect:"none",
      }}>
      {active && (
        <span style={{
          position:"absolute",left:0,top:6,bottom:6,width:3,
          background:"linear-gradient(180deg, #14A273 0%, #5EEAD4 100%)",
          borderRadius:"0 3px 3px 0",
        }}/>
      )}
      {Icon&&<Icon size={16} aria-hidden="true"/>}{!collapsed && label}
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

/* ═══════════════════════════════════════════════════
   TAB 1: GERAÇÃO DE EMAIL
═══════════════════════════════════════════════════ */
const EmailGenTab = ({ settings, onSave }) => {
  const [chat,      setChat]    = useState([{ role:"assistant", content:"Olá! Descreva o email que você quer criar — audiência, objetivo e qualquer detalhe relevante." }]);
  const [input,     setInput]   = useState("");
  const [audience,  setAudience]= useState("MQL");
  const [tone,      setTone]    = useState("Semi-formal");
  const [objective, setObj]     = useState("Nutrição");
  const [loading,   setLoad]    = useState(false);
  const [generated, setGen]     = useState(null);
  const [genMeta,   setMeta]    = useState(null);
  const [previewTab,setPTab]    = useState("result");
  const chatRef = useRef(null);

  useEffect(()=>{ if(chatRef.current) chatRef.current.scrollTop=chatRef.current.scrollHeight; },[chat]);

  const send = async () => {
    if(!input.trim()||loading) return;
    const userMsg = input.trim(); setInput("");
    setChat(c=>[...c,{role:"user",content:userMsg}]);
    setLoad(true); setGen(null);
    const sys = `${settings.custom_prompts.email}\n\nContexto:\n- Audiência: ${audience}\n- Tom: ${tone}\n- Objetivo: ${objective}\n\nEstruture com:\n1. Assunto (prefixe "Assunto:")\n2. Corpo completo\n3. CTA claro\n\nUse {{lead.name}} para personalização. Português brasileiro.`;
    try {
      const r = await callAI(sys, userMsg, settings.model_preference, settings.temperature);
      setGen(r.text);
      setMeta({ model:settings.model_preference, tokens:r.tokens, timestamp:new Date().toISOString() });
      setChat(c=>[...c,{role:"assistant",content:"Email gerado com sucesso! Veja o preview ao lado. Quer ajustar algum elemento?"}]);
      logGeneration({ type:"email", prompt:userMsg, result:r.text, model:settings.model_preference, temperature:settings.temperature, tokens:r.tokens });
    } catch(e) {
      setChat(c=>[...c,{role:"assistant",content:`Erro ao gerar: ${e.message}`}]);
    }
    setLoad(false);
  };

  const regen = async () => {
    const lastUser = [...chat].reverse().find(m=>m.role==="user");
    if(!lastUser) return;
    setLoad(true); setGen(null);
    const sys = `${settings.custom_prompts.email}\nAudiência: ${audience}\nTom: ${tone}\nObjetivo: ${objective}\nPortuguês brasileiro.`;
    try {
      const r = await callAI(sys, lastUser.content+"\n\n[Gere uma NOVA versão diferente da anterior]", settings.model_preference, Math.min(settings.temperature+0.1,1));
      setGen(r.text);
      setMeta({ model:settings.model_preference, tokens:r.tokens, timestamp:new Date().toISOString() });
    } catch(e) { console.error(e); }
    setLoad(false);
  };

  const adjustTone = async (newTone) => {
    if(!generated||loading) return;
    setLoad(true);
    const sys = "Você é um editor de copywriting. Reescreva o email mantendo a estrutura mas alterando o tom. Mantenha o assunto. Português brasileiro.";
    try {
      const r = await callAI(sys, `Tom desejado: ${newTone}\n\nEmail original:\n${generated}`, settings.model_preference, 0.5);
      setGen(r.text);
      setMeta({ model:settings.model_preference, tokens:r.tokens, timestamp:new Date().toISOString() });
    } catch(e) { console.error(e); }
    setLoad(false);
  };

  return (
    <div style={{display:"grid",gridTemplateColumns:"400px 1fr",gap:0,height:"100%",overflow:"hidden"}}>
      <div style={{borderRight:`0.5px solid ${T.border}`,display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
        <div style={{padding:"16px 20px",borderBottom:`0.5px solid ${T.border}`,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
          <Select label="Audiência" value={audience} onChange={setAudience} options={AUDIENCE_OPTS} small/>
          <Select label="Tom"       value={tone}     onChange={setTone}     options={TONE_OPTS}     small/>
          <Select label="Objetivo"  value={objective} onChange={setObj}     options={OBJECTIVE_OPTS} small/>
        </div>
        <div ref={chatRef} style={{flex:1,overflowY:"auto",padding:"18px 20px",display:"flex",flexDirection:"column",gap:12}}>
          {chat.map((m,i)=>(
            <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",flexDirection:m.role==="user"?"row-reverse":"row"}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:m.role==="user"?T.teal:`linear-gradient(135deg,${T.purple},${T.teal})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {m.role==="user"
                  ? <User size={13} color="#fff" aria-hidden="true"/>
                  : <Sparkles size={13} color="#fff" aria-hidden="true"/>}
              </div>
              <div style={{maxWidth:"80%",padding:"10px 14px",borderRadius:m.role==="user"?"14px 4px 14px 14px":"4px 14px 14px 14px",background:m.role==="user"?T.teal:T.bg,color:m.role==="user"?"#fff":T.text,fontFamily:T.font,fontSize:13,lineHeight:1.6,fontWeight:600}}>
                {m.content}
              </div>
            </div>
          ))}
          {loading&&(
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:`linear-gradient(135deg,${T.purple},${T.teal})`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Sparkles size={13} color="#fff" aria-hidden="true"/>
              </div>
              <div style={{padding:"10px 14px",background:T.bg,borderRadius:"4px 14px 14px 14px",display:"flex",gap:8,alignItems:"center"}}>
                <Spinner/><span style={{fontFamily:T.font,fontSize:12,color:T.muted,fontWeight:600}}>Gerando com IA…</span>
              </div>
            </div>
          )}
        </div>
        <div style={{padding:"14px 20px",borderTop:`0.5px solid ${T.border}`}}>
          <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
            <textarea value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
              placeholder="Descreva o email que precisa… (Enter para enviar)"
              rows={2} style={{flex:1,padding:"10px 13px",fontFamily:T.font,fontSize:13,fontWeight:600,border:`1px solid ${T.border}`,borderRadius:8,outline:"none",resize:"none",background:T.white,color:T.text,lineHeight:1.5}}/>
            <button onClick={send} disabled={loading||!input.trim()}
              style={{width:40,height:40,borderRadius:8,background:T.teal,border:"none",color:"#fff",cursor:loading||!input.trim()?"not-allowed":"pointer",opacity:loading||!input.trim()?0.5:1,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <Send size={16} aria-hidden="true"/>
            </button>
          </div>
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"12px 20px",borderBottom:`0.5px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",background:T.white}}>
          <div style={{display:"flex",gap:6}}>
            {["result","raw"].map(t=>(
              <button key={t} onClick={()=>setPTab(t)}
                style={{padding:"5px 12px",fontFamily:T.font,fontSize:12,fontWeight:700,border:`0.5px solid ${previewTab===t?T.teal:T.border}`,borderRadius:7,background:previewTab===t?T.blueL:T.white,color:previewTab===t?T.teal:T.muted,cursor:"pointer"}}>
                {t==="result"?"Preview":"Texto bruto"}
              </button>
            ))}
          </div>
          {generated&&(
            <div style={{display:"flex",gap:8}}>
              <Btn size="sm" variant="ghost" icon={RefreshCw} onClick={regen} disabled={loading}>Regenerar</Btn>
              <Btn size="sm" variant="ghost" icon={Sliders} onClick={()=>adjustTone("mais urgente")} disabled={loading}>Ajustar Tom</Btn>
              <Btn size="sm" variant="success" icon={CheckCircle2} onClick={()=>onSave&&onSave(generated)}>Usar no Editor</Btn>
            </div>
          )}
        </div>

        <div style={{flex:1,overflowY:"auto",padding:24}}>
          {!generated&&!loading&&(
            <div style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,color:T.muted}}>
              <div style={{width:72,height:72,borderRadius:20,background:`linear-gradient(135deg,${T.purpleL},${T.blueL})`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <PenLine size={32} color={T.teal} aria-hidden="true"/>
              </div>
              <div style={{textAlign:"center"}}>
                <p style={{fontFamily:T.head,fontSize:16,color:T.ink,margin:"0 0 6px",fontWeight:700}}>Preview do Email</p>
                <p style={{fontFamily:T.font,fontSize:13,fontWeight:600,color:T.muted}}>Envie uma mensagem para gerar o email com IA</p>
              </div>
            </div>
          )}
          {loading&&!generated&&(
            <div style={{height:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:12,color:T.muted}}>
              <Spinner/><span style={{fontFamily:T.font,fontSize:14,fontWeight:600}}>A IA está escrevendo seu email…</span>
            </div>
          )}
          {generated&&previewTab==="result"&&(
            <Card style={{maxWidth:600,margin:"0 auto",boxShadow:"0 4px 24px rgba(0,0,0,0.07)"}}>
              <div style={{background:`linear-gradient(135deg,${T.teal},${T.green})`,padding:"28px 36px",textAlign:"center"}}>
                <div style={{fontFamily:T.head,fontSize:16,fontWeight:700,color:"#fff",letterSpacing:"0.08em"}}>VANTARI</div>
              </div>
              <div style={{padding:"28px 36px"}}>
                {generated.split("\n").map((line,i)=>{
                  if(line.startsWith("Assunto:")) return (
                    <div key={i} style={{marginBottom:20,padding:"12px 16px",background:T.blueL,borderRadius:8,borderLeft:`3px solid ${T.teal}`}}>
                      <span style={{fontFamily:T.font,fontSize:11,fontWeight:700,color:T.teal,textTransform:"uppercase",letterSpacing:"0.06em"}}>Assunto: </span>
                      <span style={{fontFamily:T.font,fontSize:13,color:T.ink,fontWeight:700}}>{line.replace("Assunto:","").trim()}</span>
                    </div>
                  );
                  if(!line.trim()) return <div key={i} style={{height:10}}/>;
                  return <p key={i} style={{fontFamily:T.font,fontSize:14,color:T.text,margin:"0 0 10px",lineHeight:1.7,fontWeight:600}}>{line}</p>;
                })}
              </div>
              <div style={{padding:"16px 36px",borderTop:`0.5px solid ${T.border}`,background:T.bg,textAlign:"center"}}>
                <p style={{fontFamily:T.font,fontSize:11,color:T.muted,margin:0,fontWeight:600}}>© 2025 Vantari · <a href="#" style={{color:T.teal,textDecoration:"none"}}>Descadastrar</a></p>
              </div>
            </Card>
          )}
          {generated&&previewTab==="raw"&&(
            <div style={{background:T.bg,borderRadius:12,padding:20,fontFamily:T.mono,fontSize:13,lineHeight:1.7,color:T.text,whiteSpace:"pre-wrap",maxWidth:700,margin:"0 auto"}}>{generated}</div>
          )}
          {generated&&genMeta&&(
            <div style={{maxWidth:600,margin:"16px auto 0",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
              <Badge label={modelLabel(genMeta.model)} color={T.teal} bg={T.blueL}/>
              <Badge label={`${genMeta.tokens} tokens`} color={T.muted} bg={T.bg}/>
              <Badge label={`~$${(genMeta.tokens*0.003/1000).toFixed(4)}`} color={T.green} bg="#DCFCE7"/>
              <Badge label={new Date(genMeta.timestamp).toLocaleTimeString("pt-BR")} color={T.muted} bg={T.bg}/>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   TAB 2: OTIMIZAÇÃO DE ASSUNTOS
═══════════════════════════════════════════════════ */
const SubjectOptTab = ({ settings }) => {
  const [subject,setSubject] = useState("");
  const [loading,setLoad]    = useState(false);
  const [results,setResults] = useState(null);
  const [error,  setError]   = useState(null);

  const analyzeAndSuggest = async () => {
    if(!subject.trim()||loading) return;
    setLoad(true); setResults(null); setError(null);
    const sys = settings.custom_prompts.subject + `\n\nResponda APENAS com JSON válido:\n{"score":0-100,"analysis":{"length":"obs","emojis":"obs","urgency":"obs","personalization":"obs","clarity":"obs"},"suggestions":[{"subject":"texto","score":0-100,"tags":["tag1"]},...] }\n\nGere 4 sugestões. Português brasileiro.`;
    try {
      const r = await callAI(sys, `Analise e melhore este assunto:\n"${subject}"`, settings.model_preference, 0.8);
      const clean = r.text.replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean);
      setResults(parsed);
      logGeneration({ type:"subject", prompt:subject, result:JSON.stringify(parsed.suggestions||[]), model:settings.model_preference, temperature:0.8, tokens:r.tokens });
    } catch(e) {
      // não inventa uma análise falsa — mostra o erro real (chave da IA ausente,
      // falha de rede, resposta que não veio em JSON válido, etc.)
      setError(e.message || "Falha ao analisar o assunto com IA.");
    }
    setLoad(false);
  };

  const scoreColor = s => s>=80?T.green:s>=60?T.amber:T.red;
  const scoreLabel = s => s>=80?"Excelente":s>=60?"Bom":"Melhorar";

  const ANALYSIS_META = {
    length:{ Icon:Hash,        label:"Tamanho"        },
    emojis:{ Icon:MessageSquare,label:"Emojis"        },
    urgency:{ Icon:Clock,      label:"Urgência"       },
    personalization:{ Icon:User,label:"Personalização"},
    clarity:{ Icon:Lightbulb,  label:"Clareza"        },
  };

  return (
    <div style={{padding:28,maxWidth:860,margin:"0 auto"}}>
      <Card style={{padding:24,marginBottom:24}}>
        <label style={{display:"block",fontFamily:T.font,fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>
          Assunto para analisar
        </label>
        <div style={{display:"flex",gap:12,marginTop:4}}>
          <input value={subject} onChange={e=>setSubject(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter")analyzeAndSuggest();}}
            placeholder="Cole seu assunto de email aqui…"
            style={{flex:1,padding:"12px 16px",fontFamily:T.font,fontSize:14,fontWeight:600,border:`1px solid ${T.border}`,borderRadius:8,outline:"none",color:T.text,background:T.white}}/>
          <Btn onClick={analyzeAndSuggest} disabled={loading||!subject.trim()} icon={loading?undefined:Search} size="lg">
            {loading?<><Spinner/> Analisando…</>:"Analisar"}
          </Btn>
        </div>
        <div style={{marginTop:10,display:"flex",gap:6,flexWrap:"wrap"}}>
          {["Oferta relâmpago — só hoje","{{lead.name}}, sua demo está pronta","5 dicas para dobrar suas vendas"].map(s=>(
            <button key={s} onClick={()=>setSubject(s)}
              style={{fontFamily:T.font,fontSize:11,fontWeight:600,padding:"4px 10px",border:`0.5px solid ${T.border}`,borderRadius:6,background:T.bg,color:T.muted,cursor:"pointer"}}>
              {s}
            </button>
          ))}
        </div>
      </Card>

      {loading&&(
        <div style={{textAlign:"center",padding:48,color:T.muted,display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
          <Spinner/><span style={{fontFamily:T.font,fontSize:14,fontWeight:600}}>Analisando assunto com IA…</span>
        </div>
      )}

      {error&&!loading&&(
        <Card style={{padding:20,border:`1px solid ${T.red}40`,borderLeft:`3px solid ${T.red}`,background:"#FFF5F4"}}>
          <p style={{fontFamily:T.font,fontSize:13,fontWeight:700,color:T.red,margin:"0 0 4px"}}>Não foi possível analisar com IA</p>
          <p style={{fontFamily:T.font,fontSize:12,color:T.muted,margin:0,fontWeight:600}}>{error}</p>
        </Card>
      )}

      {results&&(
        <>
          <Card style={{padding:24,marginBottom:20}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
              <div>
                <p style={{fontFamily:T.head,fontSize:15,fontWeight:700,color:T.ink,margin:"0 0 4px"}}>Análise do Assunto Original</p>
                <p style={{fontFamily:T.mono,fontSize:13,color:T.text,margin:0,padding:"6px 10px",background:T.bg,borderRadius:7,display:"inline-block"}}>"{subject}"</p>
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{width:72,height:72,borderRadius:"50%",border:`4px solid ${scoreColor(results.score)}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontFamily:T.head,fontSize:20,fontWeight:700,color:scoreColor(results.score)}}>{results.score}</span>
                </div>
                <p style={{fontFamily:T.font,fontSize:11,color:scoreColor(results.score),fontWeight:700,margin:"6px 0 0"}}>{scoreLabel(results.score)}</p>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {Object.entries(results.analysis).map(([k,v])=>{
                const meta = ANALYSIS_META[k]||{Icon:Hash,label:k};
                const AIcon = meta.Icon;
                return (
                  <div key={k} style={{padding:"10px 14px",background:T.bg,borderRadius:8}}>
                    <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>
                      <AIcon size={11} color={T.muted} aria-hidden="true"/>
                      <span style={{fontFamily:T.font,fontSize:10,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em"}}>{meta.label}</span>
                    </div>
                    <span style={{fontFamily:T.font,fontSize:12,color:T.text,fontWeight:600}}>{v}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <div style={{marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <p style={{fontFamily:T.head,fontSize:14,fontWeight:700,color:T.ink,margin:0}}>Sugestões A/B com IA</p>
            <Badge label={`${results.suggestions.length} variações`} color={T.teal} bg={T.blueL}/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {results.suggestions.map((s,i)=>(
              <Card key={i} style={{padding:16}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                      <span style={{fontFamily:T.font,fontSize:11,fontWeight:700,color:T.muted}}>Versão {String.fromCharCode(65+i)}</span>
                      {s.tags.map(tg=><Badge key={tg} label={tg} color={T.purple} bg={T.purpleL} small/>)}
                    </div>
                    <p style={{fontFamily:T.font,fontSize:14,color:T.ink,margin:0,fontWeight:700}}>{s.subject}</p>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontFamily:T.head,fontSize:18,fontWeight:700,color:scoreColor(s.score)}}>{s.score}</div>
                      <div style={{fontFamily:T.font,fontSize:10,color:T.muted,fontWeight:600}}>score</div>
                    </div>
                    <Btn size="sm" variant="secondary" icon={Copy} onClick={()=>navigator.clipboard?.writeText(s.subject)}>Copiar</Btn>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   TAB 3: RESUMOS INTELIGENTES
═══════════════════════════════════════════════════ */
const SummaryTab = ({ settings, leads }) => {
  const [selected,   setSelected]   = useState(null);
  const [loading,    setLoad]       = useState(false);
  const [summaries,  setSummaries]  = useState({});
  const [errors,     setErrors]     = useState({});

  const generateSummary = async (lead) => {
    setSelected(lead);
    if(summaries[lead.id]) return;
    setLoad(true); setErrors(p=>{ const n={...p}; delete n[lead.id]; return n; });
    const interactionDesc = lead.interactions.map(i=>`- ${i.label}: ${i.count}x (${i.detail})`).join("\n");
    const sys = settings.custom_prompts.summary + `\nResponda APENAS com JSON válido:\n{"summary":"texto 2-3 frases","insights":["insight1","insight2","insight3"],"intent_score":0-100,"next_action":"recomendação","stage":"Lead Frio|Nutrindo|MQL|SQL|Pronto para Venda"}\nPortuguês brasileiro.`;
    const prompt = `Lead: ${lead.name} (${lead.company})\nScore atual: ${lead.score}/100\n\nInterações:\n${interactionDesc}`;
    try {
      const r = await callAI(sys, prompt, settings.model_preference, 0.4);
      const clean = r.text.replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean); // parse FORA do updater — se der erro de sintaxe,
      // precisa estourar aqui dentro do try/catch, não dentro de um callback de setState
      // (o React pode reinvocar esse callback depois, fora do try/catch, e derrubar a tela)
      setSummaries(p=>({...p,[lead.id]:parsed}));
      logGeneration({ type:"summary", prompt:`${lead.name} (${lead.company})`, result:parsed.summary||"", model:settings.model_preference, temperature:0.4, tokens:r.tokens });
    } catch(e) {
      // não inventa resumo/insights — mostra que a IA falhou de verdade
      setErrors(p=>({...p,[lead.id]: e.message || "Falha ao gerar resumo com IA."}));
    }
    setLoad(false);
  };

  const stageColor = s => ({"Lead Frio":T.muted,"Nutrindo":T.amber,"MQL":T.teal,"SQL":T.teal,"Pronto para Venda":T.green})[s]||T.muted;
  const sum = selected ? summaries[selected.id] : null;
  const err = selected ? errors[selected.id] : null;

  return (
    <div style={{display:"grid",gridTemplateColumns:"280px 1fr",height:"100%",overflow:"hidden"}}>
      <div style={{borderRight:`0.5px solid ${T.border}`,overflowY:"auto",padding:16}}>
        <p style={{fontFamily:T.font,fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em",margin:"0 0 12px 4px"}}>Leads</p>
        {leads.length === 0 ? (
          <div style={{padding:24,textAlign:"center",color:T.muted,fontFamily:T.font,fontSize:13,fontWeight:600}}>
            Nenhum lead encontrado. Importe leads para começar.
          </div>
        ) : leads.map(lead=>(
          <div key={lead.id} onClick={()=>generateSummary(lead)}
            style={{padding:"12px 14px",borderRadius:10,marginBottom:6,cursor:"pointer",background:selected?.id===lead.id?T.blueL:T.white,border:`0.5px solid ${selected?.id===lead.id?T.teal:T.border}`,transition:"all 0.15s"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <p style={{fontFamily:T.font,fontSize:13,fontWeight:700,color:T.ink,margin:"0 0 2px"}}>{lead.name}</p>
                <p style={{fontFamily:T.font,fontSize:11,color:T.muted,margin:0,fontWeight:600}}>{lead.company}</p>
              </div>
              <span style={{fontFamily:T.head,fontSize:13,fontWeight:700,color:lead.score>80?T.green:lead.score>60?T.amber:T.muted}}>{lead.score}</span>
            </div>
            <div style={{marginTop:8,display:"flex",gap:6,flexWrap:"wrap"}}>
              {lead.interactions.map(i=>{
                const IIcon = INTERACTION_ICONS[i.type]||ClipboardList;
                return (
                  <span key={i.type} style={{display:"inline-flex",alignItems:"center",gap:3,fontFamily:T.font,fontSize:10,color:T.muted,fontWeight:600}}>
                    <IIcon size={10} color={T.muted} aria-hidden="true"/> {i.count}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={{overflowY:"auto",padding:28}}>
        {!selected&&(
          <div style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,color:T.muted}}>
            <div style={{width:60,height:60,borderRadius:16,background:T.border2,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <Brain size={28} color={T.muted} aria-hidden="true"/>
            </div>
            <p style={{fontFamily:T.head,fontSize:16,fontWeight:700,color:T.ink,margin:0}}>Selecione um lead</p>
            <p style={{fontFamily:T.font,fontSize:13,fontWeight:600,color:T.muted,margin:0}}>A IA gerará um resumo inteligente automaticamente</p>
          </div>
        )}
        {selected&&(loading&&!sum)&&(
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,padding:60,color:T.muted}}>
            <Spinner/><span style={{fontFamily:T.font,fontSize:14,fontWeight:600}}>Gerando resumo inteligente…</span>
          </div>
        )}
        {selected&&!loading&&err&&!sum&&(
          <Card style={{padding:24,border:`1px solid ${T.red}40`,borderLeft:`3px solid ${T.red}`,background:"#FFF5F4"}}>
            <p style={{fontFamily:T.font,fontSize:13,fontWeight:700,color:T.red,margin:"0 0 4px"}}>Não foi possível gerar o resumo com IA</p>
            <p style={{fontFamily:T.font,fontSize:12,color:T.muted,margin:"0 0 14px",fontWeight:600}}>{err}</p>
            <Btn size="sm" variant="secondary" icon={RefreshCw} onClick={()=>generateSummary(selected)}>Tentar de novo</Btn>
          </Card>
        )}
        {selected&&sum&&(
          <>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:24}}>
              <div>
                <h2 style={{fontFamily:T.head,fontSize:20,fontWeight:700,color:T.ink,margin:"0 0 4px"}}>{selected.name}</h2>
                <p style={{fontFamily:T.font,fontSize:13,color:T.muted,margin:0,fontWeight:600}}>{selected.company} · {selected.email}</p>
              </div>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <Badge label={sum.stage} color={stageColor(sum.stage)} bg={stageColor(sum.stage)+"18"}/>
                <Btn size="sm" variant="ghost" icon={RefreshCw} onClick={()=>{setSummaries(p=>{const n={...p};delete n[selected.id];return n;});generateSummary(selected);}}>Regerar</Btn>
              </div>
            </div>

            <Card style={{padding:20,marginBottom:18,background:`linear-gradient(135deg,${T.blueL},${T.purpleL})`}}>
              <div style={{display:"flex",alignItems:"center",gap:20}}>
                <div style={{textAlign:"center"}}>
                  <div style={{fontFamily:T.head,fontSize:40,fontWeight:700,color:sum.intent_score>80?T.green:sum.intent_score>60?T.teal:T.amber}}>{sum.intent_score}</div>
                  <div style={{fontFamily:T.font,fontSize:10,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em"}}>Score IA</div>
                </div>
                <div style={{flex:1}}>
                  <div style={{fontFamily:T.font,fontSize:13,fontWeight:700,color:T.ink,marginBottom:6}}>Resumo de Engajamento</div>
                  <p style={{fontFamily:T.font,fontSize:13,color:T.ink,margin:0,lineHeight:1.6,fontWeight:600}}>{sum.summary}</p>
                </div>
              </div>
            </Card>

            <Card style={{padding:20,marginBottom:18}}>
              <p style={{fontFamily:T.font,fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em",margin:"0 0 14px"}}>Interações Registradas</p>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {selected.interactions.map((interaction,i)=>{
                  const IIcon = INTERACTION_ICONS[interaction.type]||ClipboardList;
                  return (
                    <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                      <div style={{width:32,height:32,borderRadius:8,background:T.blueL,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <IIcon size={14} color={T.teal} aria-hidden="true"/>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <span style={{fontFamily:T.font,fontSize:13,fontWeight:700,color:T.ink}}>{interaction.label}</span>
                          <Badge label={`${interaction.count}x`} color={T.teal} bg={T.blueL} small/>
                        </div>
                        <p style={{fontFamily:T.font,fontSize:12,color:T.muted,margin:"2px 0 0",fontWeight:600}}>{interaction.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card style={{padding:20,marginBottom:18}}>
              <p style={{fontFamily:T.font,fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em",margin:"0 0 14px"}}>Insights Acionáveis</p>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {sum.insights.map((ins,i)=>(
                  <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"10px 14px",background:T.bg,borderRadius:8}}>
                    <ChevronRight size={14} color={T.green} style={{flexShrink:0,marginTop:2}} aria-hidden="true"/>
                    <span style={{fontFamily:T.font,fontSize:13,color:T.text,lineHeight:1.5,fontWeight:600}}>{ins}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card style={{padding:20,border:`1px solid ${T.green}40`,borderLeft:`3px solid ${T.green}`,background:"#EFFCF6"}}>
              <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                <div style={{width:36,height:36,borderRadius:8,background:`${T.green}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <Target size={16} color={T.green} aria-hidden="true"/>
                </div>
                <div>
                  <p style={{fontFamily:T.font,fontSize:11,fontWeight:700,color:T.green,textTransform:"uppercase",letterSpacing:"0.07em",margin:"0 0 4px"}}>Próxima Ação Recomendada</p>
                  <p style={{fontFamily:T.font,fontSize:14,color:T.ink,margin:"0 0 12px",fontWeight:700}}>{sum.next_action}</p>
                  <div style={{display:"flex",gap:8}}>
                    <Btn size="sm" variant="success" icon={Mail}>Criar Email</Btn>
                    <Btn size="sm" variant="ghost"   icon={ClipboardList}>Adicionar Tarefa</Btn>
                  </div>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   TAB 4: PERSONALIZAÇÃO DINÂMICA
═══════════════════════════════════════════════════ */
const PersonalizationTab = ({ settings, leads }) => {
  const [lead,   setLead]   = useState(leads[0] || null);
  const [loading,setLoad]   = useState(false);
  const [result, setResult] = useState(null);
  const [error,  setError]  = useState(null);

  const urgencyColor = u => ({alta:T.red,media:T.amber,baixa:T.green})[u]||T.muted;

  const generate = async () => {
    setLoad(true); setResult(null); setError(null);
    const sys = `Você é um especialista em personalização de marketing. Baseado no perfil e comportamento do lead, gere recomendações altamente personalizadas.\n\nResponda APENAS com JSON válido:\n{"segments":["seg1","seg2"],"content_recommendations":[{"type":"email|blog|case_study|webinar","title":"título","reason":"por que enviar","urgency":"alta|media|baixa"}],"next_best_action":{"action":"texto","channel":"email|whatsapp|ligação","timing":"texto","script":"texto"}}\nPortuguês brasileiro.`;
    const prompt = `Lead: ${lead.name} (${lead.company})\nScore: ${lead.score}/100\nInterações: ${lead.interactions.map(i=>`${i.label}(${i.count}x)`).join(", ")}`;
    try {
      const r = await callAI(sys, prompt, settings.model_preference, 0.6);
      const clean = r.text.replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
      logGeneration({ type:"personalization", prompt:`${lead.name} (${lead.company})`, result:parsed.next_best_action?.action||"", model:settings.model_preference, temperature:0.6, tokens:r.tokens });
    } catch(e) {
      // não inventa recomendações — mostra que a IA falhou de verdade
      setError(e.message || "Falha ao gerar recomendações com IA.");
    }
    setLoad(false);
  };

  useEffect(()=>{ if(lead) generate(); },[]);

  if (leads.length === 0) return (
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:T.muted,fontFamily:T.font,fontSize:13,fontWeight:600}}>
      Nenhum lead encontrado. Importe leads para começar.
    </div>
  );

  return (
    <div style={{display:"grid",gridTemplateColumns:"240px 1fr",height:"100%",overflow:"hidden"}}>
      <div style={{borderRight:`0.5px solid ${T.border}`,overflowY:"auto",padding:16}}>
        <p style={{fontFamily:T.font,fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em",margin:"0 0 12px 4px"}}>Selecionar Lead</p>
        {leads.map(l=>(
          <div key={l.id} onClick={()=>{setLead(l);setResult(null);}}
            style={{padding:"12px 14px",borderRadius:10,marginBottom:6,cursor:"pointer",background:lead.id===l.id?T.blueL:T.white,border:`0.5px solid ${lead.id===l.id?T.teal:T.border}`,transition:"all 0.15s"}}>
            <p style={{fontFamily:T.font,fontSize:13,fontWeight:700,color:T.ink,margin:"0 0 2px"}}>{l.name}</p>
            <p style={{fontFamily:T.font,fontSize:11,color:T.muted,margin:"0 0 6px",fontWeight:600}}>{l.company}</p>
            <div style={{height:4,borderRadius:2,background:T.border2,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${l.score}%`,background:l.score>80?T.green:l.score>60?T.teal:T.amber,borderRadius:2}}/>
            </div>
          </div>
        ))}
        <Btn full variant="primary" icon={RefreshCw} onClick={generate} disabled={loading} style={{marginTop:16}}>
          {loading?"Gerando…":"Gerar Recomendações"}
        </Btn>
      </div>

      <div style={{overflowY:"auto",padding:28}}>
        {loading&&(
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,padding:60,color:T.muted}}>
            <Spinner/><span style={{fontFamily:T.font,fontSize:14,fontWeight:600}}>Analisando perfil do lead…</span>
          </div>
        )}
        {error&&!loading&&(
          <Card style={{padding:24,border:`1px solid ${T.red}40`,borderLeft:`3px solid ${T.red}`,background:"#FFF5F4"}}>
            <p style={{fontFamily:T.font,fontSize:13,fontWeight:700,color:T.red,margin:"0 0 4px"}}>Não foi possível gerar recomendações com IA</p>
            <p style={{fontFamily:T.font,fontSize:12,color:T.muted,margin:"0 0 14px",fontWeight:600}}>{error}</p>
            <Btn size="sm" variant="secondary" icon={RefreshCw} onClick={generate}>Tentar de novo</Btn>
          </Card>
        )}
        {result&&(
          <>
            <div style={{marginBottom:24}}>
              <h2 style={{fontFamily:T.head,fontSize:18,fontWeight:700,color:T.ink,margin:"0 0 8px"}}>Personalização para {lead.name}</h2>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {result.segments.map(s=><Badge key={s} label={s} color={T.purple} bg={T.purpleL}/>)}
              </div>
            </div>

            <Card style={{padding:22,marginBottom:20,border:`1px solid ${T.teal}40`,borderLeft:`3px solid ${T.teal}`,background:T.blueL}}>
              <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
                <div style={{width:40,height:40,borderRadius:10,background:`${T.teal}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <Target size={18} color={T.teal} aria-hidden="true"/>
                </div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                    <p style={{fontFamily:T.font,fontSize:11,fontWeight:700,color:T.teal,textTransform:"uppercase",letterSpacing:"0.07em",margin:0}}>Próxima Melhor Ação</p>
                    <Badge label={result.next_best_action.channel} color={T.teal} bg="#dbeafe"/>
                  </div>
                  <p style={{fontFamily:T.font,fontSize:14,fontWeight:700,color:T.ink,margin:"0 0 4px"}}>{result.next_best_action.action}</p>
                  <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:10}}>
                    <Clock size={11} color={T.muted} aria-hidden="true"/>
                    <p style={{fontFamily:T.font,fontSize:12,color:T.muted,margin:0,fontWeight:600}}>{result.next_best_action.timing}</p>
                  </div>
                  <div style={{padding:"12px 14px",background:T.white,borderRadius:8,fontFamily:T.mono,fontSize:12,color:T.text,lineHeight:1.6,borderLeft:`3px solid ${T.teal}`}}>
                    {result.next_best_action.script}
                  </div>
                </div>
              </div>
            </Card>

            <p style={{fontFamily:T.head,fontSize:14,fontWeight:700,color:T.ink,margin:"0 0 14px"}}>Conteúdo Recomendado</p>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {result.content_recommendations.map((rec,i)=>{
                const CIcon = CONTENT_ICONS[rec.type]||FileText;
                return (
                  <Card key={i} style={{padding:18}}>
                    <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
                      <div style={{width:40,height:40,borderRadius:10,background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        <CIcon size={18} color={T.teal} aria-hidden="true"/>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                          <div>
                            <Badge label={rec.type.replace("_"," ")} color={T.teal} bg="#DCF0F7" small/>
                            <p style={{fontFamily:T.font,fontSize:13,fontWeight:700,color:T.ink,margin:"6px 0 4px"}}>{rec.title}</p>
                          </div>
                          <Badge label={`Urgência: ${rec.urgency}`} color={urgencyColor(rec.urgency)} bg={urgencyColor(rec.urgency)+"18"} small/>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:5}}>
                          <Lightbulb size={11} color={T.muted} aria-hidden="true"/>
                          <p style={{fontFamily:T.font,fontSize:12,color:T.muted,margin:0,fontWeight:600}}>{rec.reason}</p>
                        </div>
                      </div>
                      <Btn size="sm" variant="secondary">Usar</Btn>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   TAB 5: CONFIGURAÇÕES DE IA
═══════════════════════════════════════════════════ */
const SettingsTab = ({ settings, onChange }) => {
  const [local,setSaved_] = useState({...settings});
  const [saved,setSaved]  = useState(false);
  const save = () => { onChange(local); setSaved(true); setTimeout(()=>setSaved(false),2000); };
  const upd  = (key,val) => setSaved_(p=>({...p,[key]:val}));
  const updPrompt = (key,val) => setSaved_(p=>({...p,custom_prompts:{...p.custom_prompts,[key]:val}}));

  const PROMPT_META = [
    { key:"email",   Icon:Mail,    label:"Geração de Email"         },
    { key:"subject", Icon:AtSign,  label:"Otimização de Assunto"    },
    { key:"summary", Icon:Brain,   label:"Resumo de Lead"           },
  ];

  return (
    <div style={{padding:32,maxWidth:760,margin:"0 auto",overflowY:"auto"}}>
      <div style={{marginBottom:28}}>
        <h2 style={{fontFamily:T.head,fontSize:20,fontWeight:700,color:T.ink,margin:"0 0 6px"}}>Configurações de IA</h2>
        <p style={{fontFamily:T.font,fontSize:13,color:T.muted,margin:0,fontWeight:600}}>Personalize como a IA trabalha no seu workspace</p>
      </div>

      <Card style={{padding:24,marginBottom:20}}>
        <p style={{fontFamily:T.font,fontSize:12,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em",margin:"0 0 16px"}}>Modelo Preferido</p>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {MODELS.map(m=>(
            <div key={m.id} onClick={()=>upd("model_preference",m.id)}
              style={{padding:"14px 18px",borderRadius:10,border:`1px solid ${local.model_preference===m.id?m.color:T.border}`,background:local.model_preference===m.id?m.color+"10":T.white,cursor:"pointer",transition:"all 0.15s",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                  <span style={{fontFamily:T.font,fontSize:14,fontWeight:700,color:T.ink}}>{m.name}</span>
                  <Badge label={m.badge} color={m.color} bg={m.color+"18"} small/>
                </div>
                <span style={{fontFamily:T.font,fontSize:12,color:T.muted,fontWeight:600}}>{m.provider} · {m.cost}</span>
              </div>
              <div style={{width:20,height:20,borderRadius:"50%",border:`2px solid ${local.model_preference===m.id?m.color:T.border}`,background:local.model_preference===m.id?m.color:"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                {local.model_preference===m.id&&<div style={{width:8,height:8,borderRadius:"50%",background:"#fff"}}/>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card style={{padding:24,marginBottom:20}}>
        <p style={{fontFamily:T.font,fontSize:12,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em",margin:"0 0 16px"}}>Temperatura / Criatividade</p>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <input type="range" min="0" max="1" step="0.1" value={local.temperature} onChange={e=>upd("temperature",parseFloat(e.target.value))} style={{flex:1,accentColor:T.teal}}/>
          <div style={{fontFamily:T.head,fontSize:18,fontWeight:700,color:T.teal,width:40,textAlign:"center"}}>{local.temperature}</div>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:8}}>
          <span style={{fontFamily:T.font,fontSize:11,color:T.muted,fontWeight:600}}>0 = Preciso / Determinístico</span>
          <span style={{fontFamily:T.font,fontSize:11,color:T.muted,fontWeight:600}}>1 = Criativo / Variado</span>
        </div>
      </Card>

      <Card style={{padding:24,marginBottom:20}}>
        <p style={{fontFamily:T.font,fontSize:12,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em",margin:"0 0 16px"}}>Prompts Base Customizados</p>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {PROMPT_META.map(({key,Icon:PIcon,label})=>(
            <div key={key}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                <PIcon size={13} color={T.muted} aria-hidden="true"/>
                <label style={{fontFamily:T.font,fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>{label}</label>
              </div>
              <Textarea value={local.custom_prompts[key]} onChange={v=>updPrompt(key,v)} rows={3}/>
            </div>
          ))}
        </div>
      </Card>

      <Card style={{padding:20,marginBottom:24,background:`linear-gradient(135deg,${T.blueL},${T.purpleL})`}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:14}}>
          <Zap size={13} color={T.teal} aria-hidden="true"/>
          <p style={{fontFamily:T.font,fontSize:12,fontWeight:700,color:T.ink,textTransform:"uppercase",letterSpacing:"0.07em",margin:0}}>Custo Estimado por Operação</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          {[["Gerar Email","~350 tokens","$0.0011"],["Otimizar Assunto","~180 tokens","$0.0005"],["Resumo Lead","~250 tokens","$0.0008"]].map(([op,tk,c])=>(
            <div key={op} style={{padding:"12px 14px",background:"rgba(255,255,255,0.75)",borderRadius:10,textAlign:"center"}}>
              <p style={{fontFamily:T.font,fontSize:12,color:T.ink,fontWeight:700,margin:"0 0 4px"}}>{op}</p>
              <p style={{fontFamily:T.mono,fontSize:11,color:T.muted,margin:"0 0 4px"}}>{tk}</p>
              <p style={{fontFamily:T.head,fontSize:14,color:T.green,fontWeight:700,margin:0}}>{c}</p>
            </div>
          ))}
        </div>
      </Card>

      <div style={{display:"flex",gap:12}}>
        <Btn variant="primary" icon={saved?CheckCircle2:Save} onClick={save}>{saved?"Salvo!":"Salvar Configurações"}</Btn>
        <Btn variant="ghost" onClick={()=>setSaved_({...settings})}>Restaurar</Btn>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   TAB 6: HISTÓRICO & ANALYTICS
═══════════════════════════════════════════════════ */
const HistoryTab = () => {
  const [gens,    setGens]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("all");

  useEffect(() => {
    supabase.from("ai_generations").select("*")
      .eq("workspace_id", WORKSPACE_VANTARI)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => { setGens(data || []); setLoading(false); });
  }, []);

  const rate = async (id, rating) => {
    setGens(prev => prev.map(x => x.id === id ? { ...x, rating } : x));
    const { error } = await supabase.from("ai_generations").update({ rating }).eq("id", id);
    if (error) console.error("Falha ao salvar avaliação:", error);
  };

  const filtered    = filter==="all" ? gens : gens.filter(g=>g.type===filter);
  const totalTokens = gens.reduce((a,g)=>a+(g.tokens||0),0);
  const avgRating   = gens.length ? (gens.reduce((a,g)=>a+(g.rating||0),0)/gens.length).toFixed(1) : "0.0";
  const usedCount   = gens.filter(g=>g.used).length;

  const typeInfo = t => ({
    email:          { Icon:Mail,     label:"Email",          color:T.teal   },
    subject:        { Icon:AtSign,   label:"Assunto",        color:T.teal   },
    summary:        { Icon:Brain,    label:"Resumo",         color:T.purple },
    personalization:{ Icon:Target,   label:"Personalização", color:T.violet },
  })[t]||{ Icon:FileText, label:t, color:T.muted };

  const METRICS = [
    { label:"Gerações Total",    value:gens.length,                  Icon:Sparkles,     color:T.teal   },
    { label:"Usados em Emails",  value:usedCount,                    Icon:CheckCircle2, color:T.green  },
    { label:"Avaliação Média",   value:`${avgRating}/5`,              Icon:Star,         color:T.amber  },
    { label:"Tokens Consumidos", value:totalTokens.toLocaleString(), Icon:Zap,          color:T.purple },
  ];

  const FILTER_LABELS = { all:"Todos", email:"Email", subject:"Assunto", summary:"Resumo", personalization:"Personalização" };

  return (
    <div style={{padding:28,overflowY:"auto"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
        {METRICS.map(m=>(
          <Card key={m.label} style={{padding:"16px 20px",borderLeft:`3px solid ${m.color}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <p style={{fontFamily:T.font,fontSize:10,color:T.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",margin:"0 0 6px"}}>{m.label}</p>
                <p style={{fontFamily:T.head,fontSize:24,fontWeight:700,color:m.color,margin:0,lineHeight:1}}>{m.value}</p>
              </div>
              <div style={{width:34,height:34,borderRadius:8,background:`${m.color}14`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <m.Icon size={16} color={m.color} aria-hidden="true"/>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div style={{display:"flex",gap:8,marginBottom:18}}>
        {["all","email","subject","summary","personalization"].map(f=>{
          const FIcon = f==="all" ? Clock : (typeInfo(f).Icon);
          return (
            <button key={f} onClick={()=>setFilter(f)}
              style={{display:"flex",alignItems:"center",gap:5,padding:"6px 14px",fontFamily:T.font,fontSize:12,fontWeight:700,border:`0.5px solid ${filter===f?T.teal:T.border}`,borderRadius:8,background:filter===f?T.blueL:T.white,color:filter===f?T.teal:T.muted,cursor:"pointer",transition:"all 0.15s"}}>
              <FIcon size={12} aria-hidden="true"/> {FILTER_LABELS[f]}
            </button>
          );
        })}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map(g=>{
          const ti = typeInfo(g.type);
          const TIcon = ti.Icon;
          return (
            <Card key={g.id} style={{padding:18}}>
              <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
                <div style={{width:38,height:38,borderRadius:9,background:ti.color+"14",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <TIcon size={18} color={ti.color} aria-hidden="true"/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                      <Badge label={ti.label} color={ti.color} bg={ti.color+"14"} small/>
                      {g.used&&<Badge label="Usado" color={T.green} bg="#DCFCE7" small/>}
                      <span style={{fontFamily:T.font,fontSize:11,color:T.muted,fontWeight:600}}>{new Date(g.created_at).toLocaleDateString("pt-BR")}</span>
                    </div>
                    <div style={{display:"flex",gap:10,alignItems:"center"}}>
                      <Stars value={g.rating} onChange={r=>rate(g.id, r)}/>
                      <Badge label={`${g.tokens} tok`} color={T.muted} bg={T.bg} small/>
                    </div>
                  </div>
                  <p style={{fontFamily:T.font,fontSize:12,color:T.muted,margin:"0 0 6px",fontWeight:600}}>Prompt: {g.prompt}</p>
                  <p style={{fontFamily:T.mono,fontSize:12,color:T.text,margin:0,background:T.bg,padding:"8px 12px",borderRadius:7,lineHeight:1.6,overflow:"hidden",maxHeight:60}}>
                    {g.result.slice(0,200)}{g.result.length>200?"…":""}
                  </p>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  <Btn size="xs" variant="ghost" icon={Copy} onClick={()=>navigator.clipboard?.writeText(g.result)}>Copiar</Btn>
                </div>
              </div>
            </Card>
          );
        })}
        {loading&&(
          <div style={{textAlign:"center",padding:48,color:T.muted,display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
            <Spinner/><span style={{fontFamily:T.font,fontSize:13,fontWeight:600}}>Carregando histórico…</span>
          </div>
        )}
        {!loading&&filtered.length===0&&(
          <div style={{textAlign:"center",padding:48,color:T.muted,fontFamily:T.font,fontSize:13,fontWeight:600}}>
            Nenhuma geração ainda. Use as outras abas de IA e o histórico aparece aqui.
          </div>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════
   ROOT COMPONENT
═══════════════════════════════════════════════════ */
const TABS = [
  { id:"email",    Icon:PenLine,    label:"Geração de Email"         },
  { id:"subject",  Icon:TrendingUp, label:"Otimização de Assuntos"   },
  { id:"summary",  Icon:Brain,      label:"Resumos Inteligentes"     },
  { id:"personal", Icon:Target,     label:"Personalização Dinâmica"  },
  { id:"settings", Icon:Settings,   label:"Configurações de IA"      },
  { id:"history",  Icon:Clock,      label:"Histórico & Analytics" },
];

export default function VantariAIMarketing() {
  const [tab,      setTab]      = useState("email");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [leads,    setLeads]    = useState([]);
  const [collapsed, setCollapsed] = useSidebarCollapsed();

  useEffect(() => {
    supabase.from("leads")
      .select("id, name, email, company, score")
      .order("score", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setLeads((data || []).map(l => ({
          id: l.id,
          name: l.name || l.email?.split("@")[0] || "—",
          email: l.email,
          company: l.company || "—",
          score: l.score || 0,
          interactions: [],
        })));
      });

    // carrega config real de public.ai_settings (antes ficava só em memória)
    supabase.from("ai_settings").select("*").eq("workspace_id", WORKSPACE_VANTARI).maybeSingle()
      .then(({ data }) => {
        if (data) setSettings({
          workspace_id: data.workspace_id,
          model_preference: data.model_preference,
          temperature: Number(data.temperature),
          custom_prompts: data.custom_prompts,
        });
      });
  }, []);

  // persiste de verdade em public.ai_settings (upsert) — antes só atualizava
  // o estado do React e sumia ao recarregar a página
  const saveSettings = async (next) => {
    setSettings(next);
    const { error } = await supabase.from("ai_settings").upsert({
      workspace_id: WORKSPACE_VANTARI,
      model_preference: next.model_preference,
      temperature: next.temperature,
      custom_prompts: next.custom_prompts,
      updated_at: new Date().toISOString(),
    });
    if (error) console.error("Falha ao salvar configurações de IA:", error);
  };

  return (
    <div style={{display:"flex",height:"100vh",background:T.bg,fontFamily:T.font,overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');
        *, *::before, *::after { box-sizing:border-box; }
        input[type=range] { -webkit-appearance:none; height:4px; border-radius:99px; cursor:pointer; background:${T.border}; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:14px; height:14px; border-radius:50%; cursor:pointer; border:2px solid #fff; box-shadow:0 1px 3px rgba(0,0,0,0.15); }
        ::-webkit-scrollbar { width:6px; height:6px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#B3BFCA; border-radius:99px; }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>

      {/* ── SIDEBAR ── */}
      <div style={{
        width: collapsed ? 64 : 240,
        transition: "width 0.15s",
        background: T.sidebarBg,
        display:"flex", flexDirection:"column", flexShrink:0,
        position:"relative", overflow:"visible",
      }}>
        {/* glow topo-direito */}
        <div style={{
          position:"absolute", inset:0, pointerEvents:"none",
          background:"radial-gradient(circle at 90% 0%, rgba(20,162,115,.25) 0%, transparent 50%)",
        }}/>

        {/* Brand */}
        <div style={{padding: collapsed ? "20px 0 0" : "20px 20px 0", position:"relative"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent: collapsed ? "center" : "flex-start",gap:10,paddingBottom:20,borderBottom:"1px solid rgba(255,255,255,.08)",marginBottom:16}}>
            <div style={{width:32,height:32,background:"white",borderRadius:8,display:"grid",placeItems:"center",flexShrink:0}}>
              <img src="/icone.png" alt="" style={{width:22,height:22}}/>
            </div>
            {!collapsed && <span style={{fontFamily:T.head,fontSize:18,fontWeight:700,letterSpacing:"-0.02em",color:"white"}}>vantari</span>}
            {!collapsed && <span style={{marginLeft:"auto",fontSize:10,background:"rgba(255,255,255,.12)",padding:"3px 8px",borderRadius:6,letterSpacing:"0.08em",fontWeight:600,color:"rgba(255,255,255,.85)"}}>PRO</span>}
          </div>
        </div>

        <div className="vantari-sidebar-nav" style={{flex:1,overflowY:"auto",padding:"0 0 8px",position:"relative"}}>
          <NavSection label="Principal" collapsed={collapsed}/>
          <NavItem icon={BarChart2}      label="Analytics"      path="/dashboard"    collapsed={collapsed} />
          <NavItem icon={Users}          label="Leads"          path="/leads"        collapsed={collapsed} />
          <NavItem icon={Mail}           label="Email Marketing" path="/email"       collapsed={collapsed} />
          <NavSection label="CRM" collapsed={collapsed}/>
          <NavItem icon={Briefcase} label="Negócios" path="/crm" collapsed={collapsed} />
          <NavItem icon={Building2} label="Empresas" path="/empresas" collapsed={collapsed} />
          <NavItem icon={Activity} label="Atividades" path="/activities" collapsed={collapsed} />
          <NavItem icon={ListChecks} label="Tarefas" path="/tasks" collapsed={collapsed} />
          <NavItem icon={AlertTriangle} label="Em Risco" path="/risco" collapsed={collapsed} />
          <NavSection label="Ferramentas" collapsed={collapsed}/>
          <NavItem icon={Star}           label="Scoring"        path="/scoring"      collapsed={collapsed} />
          <NavItem icon={LayoutTemplate} label="Landing Pages"  path="/landing"      collapsed={collapsed} />
          <NavItem icon={Filter}         label="Segmentações"   path="/segments"     collapsed={collapsed} />
          <NavItem icon={Bot}            label="IA & Automação" path="/ai-marketing" active collapsed={collapsed} />
          <NavItem icon={Zap}            label="Automação de Marketing" path="/workflow" collapsed={collapsed} />
          <NavSection label="Sistema" collapsed={collapsed}/>
          <NavItem icon={Plug}           label="Integrações"    path="/integrations" collapsed={collapsed} />
        </div>
        <div style={{borderTop:"1px solid rgba(255,255,255,0.08)",padding:"8px 0",position:"relative"}}>
          <AccountMenu collapsed={collapsed} />
          <NavItem icon={Settings} label="Configurações" path="/settings" collapsed={collapsed}/>
        </div>
        <div style={{borderTop:"1px solid rgba(255,255,255,0.08)",padding:"8px 0",position:"relative"}}>
          <div onClick={() => setCollapsed(c => !c)} title={collapsed ? "Expandir menu" : "Recolher menu"}
            style={{ display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-end", gap: 6, padding: collapsed ? "8px 0" : "8px 20px", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", cursor: "pointer", fontFamily: T.font }}>
            {collapsed ? <ChevronRight size={16} aria-hidden="true" /> : <><span>Recolher</span><ChevronLeft size={16} aria-hidden="true" /></>}
          </div>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* Topbar */}
        <div style={{height:56,background:T.white,borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px",flexShrink:0,zIndex:10}}>
          <span style={{fontSize:18,fontWeight:700,color:T.ink,fontFamily:T.head,letterSpacing:"-0.02em"}}>IA & Automação</span>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <Badge label={modelLabel(settings.model_preference)} color={T.teal} bg={T.blueL}/>
            <Badge label={`Temp ${settings.temperature}`} color={T.muted} bg={T.bg}/>
            <Btn size="sm" variant="secondary" icon={Settings} onClick={()=>setTab("settings")}>Config</Btn>
          </div>
        </div>

        {/* Sub-tabs */}
        <div style={{background:T.white,borderBottom:`1px solid ${T.border}`,overflowX:"auto",flexShrink:0}}>
          <div style={{display:"flex",gap:2,padding:"0 24px"}}>
            {TABS.map(t=>{
              const TIcon = t.Icon;
              const active = tab===t.id;
              return (
                <button key={t.id} onClick={()=>setTab(t.id)}
                  style={{display:"flex",alignItems:"center",gap:6,padding:"10px 14px",fontFamily:T.font,fontSize:12,fontWeight:active?700:500,color:active?T.teal:T.muted,background:"none",border:"none",borderBottom:active?`2px solid ${T.teal}`:"2px solid transparent",cursor:"pointer",transition:"all 0.15s",whiteSpace:"nowrap"}}>
                  <TIcon size={13} aria-hidden="true"/>
                  {t.label}
                  {t.badge&&<Badge label={t.badge} color={T.teal} bg={T.blueL} small/>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column",background:"linear-gradient(180deg, #EEF9FC 0%, #E6F5FB 100%)"}}>
          {tab==="email"    && <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}><EmailGenTab    settings={settings}/></div>}
          {tab==="subject"  && <div style={{flex:1,overflowY:"auto"}}><SubjectOptTab  settings={settings}/></div>}
          {tab==="summary"  && <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}><SummaryTab     settings={settings} leads={leads}/></div>}
          {tab==="personal" && <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}><PersonalizationTab settings={settings} leads={leads}/></div>}
          {tab==="settings" && <div style={{flex:1,overflowY:"auto"}}><SettingsTab    settings={settings} onChange={saveSettings}/></div>}
          {tab==="history"  && <div style={{flex:1,overflowY:"auto"}}><HistoryTab/></div>}
        </div>
      </div>
    </div>
  );
}
