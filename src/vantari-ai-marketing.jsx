import { useState, useRef, useEffect } from "react";
import {
  PenLine, TrendingUp, FileText, Target, Settings, Clock,
  BarChart2, Users, Mail, LayoutTemplate, Bot, Plug, Star,
  RefreshCw, Sliders, CheckCircle2, Search, Save, Download,
  Brain, Zap, AtSign, Hash, Lightbulb, User, Link2,
  ClipboardList, Monitor, Video, BookOpen, ArrowUp,
  MessageSquare, Sparkles, Send, ChevronRight, Copy
} from "lucide-react";

/* ═══════════════════════════════════════════════════
   DESIGN TOKENS — Vantari light system
═══════════════════════════════════════════════════ */
const T = {
  bg:      "#f2f5f8",
  white:   "#ffffff",
  ink:     "#5f5f64",
  ink2:    "#5f5f64",
  muted:   "#888891",
  faint3:  "#adadb5",
  border:  "#e2e8f0",
  border2: "#edf0f4",
  blue:    "#0079a9",
  blueL:   "#e8f5fb",
  teal:    "#0079a9",
  green:   "#05b27b",
  amber:   "#e07b00",
  red:     "#ef4444",
  purple:  "#6d45d9",
  purpleL: "#f3f0ff",
  font:    "'Aptos', 'Nunito Sans', sans-serif",
  head:    "'Montserrat', sans-serif",
  sans:    "'Aptos', 'Nunito Sans', sans-serif",
  mono:    "'Courier New', monospace",
};

/* ═══════════════════════════════════════════════════
   MOCK DATABASE
═══════════════════════════════════════════════════ */
const MOCK_SETTINGS = {
  workspace_id: "ws_1",
  model_preference: "claude-sonnet-4-20250514",
  temperature: 0.7,
  custom_prompts: {
    email:   "Você é um copywriter especialista em marketing B2B brasileiro. Escreva emails persuasivos, claros e com boa entregabilidade.",
    subject: "Gere assuntos de email com alta taxa de abertura para público B2B brasileiro.",
    summary: "Analise as interações de um lead e gere um resumo estratégico em português.",
  },
};

const MOCK_LEADS = [
  { id:"l1", name:"João Silva",    email:"joao@technova.com.br",      company:"TechNova",      score:87,
    interactions:[{ type:"email_open", label:"Abriu email",          count:5, detail:"Newsletter Nov, Black Friday x3, Follow-up" },
                  { type:"email_click",label:"Clicou em link",        count:3, detail:"Links sobre precificação (2x), link trial (1x)" },
                  { type:"page_visit", label:"Visitou página",         count:4, detail:"/pricing (3x), /trial (1x)" },
                  { type:"form_submit",label:"Preencheu formulário",   count:1, detail:"Solicitou demo" }] },
  { id:"l2", name:"Ana Costa",     email:"ana@agenciapixel.com.br",   company:"Agência Pixel", score:62,
    interactions:[{ type:"email_open", label:"Abriu email",           count:2, detail:"Newsletter Nov, Webinar" },
                  { type:"email_click",label:"Clicou em link",        count:1, detail:"Link blog sobre automação" },
                  { type:"page_visit", label:"Visitou página",         count:2, detail:"/features, /blog/roi" }] },
  { id:"l3", name:"Carlos Mendes", email:"carlos@startuplhub.com.br", company:"StartupHub",    score:41,
    interactions:[{ type:"email_open", label:"Abriu email",           count:1, detail:"Black Friday" }] },
];

const MOCK_GENERATIONS = [
  { id:"g1", type:"email",   prompt:"Email de follow-up para lead que solicitou demo de CRM",          result:"Assunto: Sua demo está pronta, João!\n\nOlá João,\n\nObrigado pelo seu interesse...", model:"claude-sonnet-4-20250514", rating:5, used:true,  created_at:new Date(Date.now()-2*86400000).toISOString(), tokens:320 },
  { id:"g2", type:"subject", prompt:"Assunto para newsletter mensal de marketing digital",              result:"5 tendências que vão definir seu marketing em 2025\nSeus concorrentes já estão fazendo isso\nInsights exclusivos: marketing digital hoje", model:"claude-sonnet-4-20250514", rating:4, used:true,  created_at:new Date(Date.now()-3*86400000).toISOString(), tokens:180 },
  { id:"g3", type:"email",   prompt:"Email promocional Black Friday com desconto 50%",                  result:"Assunto: 50% OFF só hoje — Oferta exclusiva para você\n\nOlá {{lead.name}},\n\nHoje é o dia...", model:"claude-sonnet-4-20250514", rating:5, used:true,  created_at:new Date(Date.now()-5*86400000).toISOString(), tokens:410 },
  { id:"g4", type:"summary", prompt:"Resumo de engajamento do lead Ana Costa",                          result:"Ana demonstra interesse moderado em automação de marketing. Abriu 2 emails e clicou em conteúdo de blog...", model:"claude-sonnet-4-20250514", rating:3, used:false, created_at:new Date(Date.now()-1*86400000).toISOString(), tokens:220 },
  { id:"g5", type:"email",   prompt:"Email de reativação para leads inativos 30 dias",                  result:"Assunto: Sentimos sua falta!\n\nOlá {{lead.name}},\n\nFaz um tempo que não nos falamos...", model:"claude-sonnet-4-20250514", rating:4, used:false, created_at:new Date(Date.now()-7*86400000).toISOString(), tokens:280 },
];

const MODELS = [
  { id:"claude-sonnet-4-20250514",  name:"Claude Sonnet 4",  provider:"Anthropic", cost:"$0.003/1k tokens", badge:"Recomendado",  color:T.blue   },
  { id:"claude-haiku-4-5-20251001", name:"Claude Haiku 4.5", provider:"Anthropic", cost:"$0.00025/1k tokens",badge:"Econômico",   color:T.teal   },
  { id:"gpt-4o",                    name:"GPT-4o",           provider:"OpenAI",    cost:"$0.005/1k tokens", badge:"OpenAI",       color:"#10a37f" },
];

const AUDIENCE_OPTS  = ["Todos os Leads","MQL","SQL","Newsletter","Demo Solicitada","Inativos 30d","Alto Valor","B2B"];
const TONE_OPTS      = ["Formal","Semi-formal","Casual","Urgente","Empático","Persuasivo"];
const OBJECTIVE_OPTS = ["Conversão","Nutrição","Reativação","Evento/Webinar","Follow-up","Onboarding"];

const INTERACTION_ICONS = { email_open:Mail, email_click:Link2, page_visit:Monitor, form_submit:ClipboardList };
const TYPE_ICONS = { email:Mail, subject:AtSign, summary:Brain };
const CONTENT_ICONS = { email:Mail, blog:BookOpen, case_study:BarChart2, webinar:Video };

/* ═══════════════════════════════════════════════════
   AI API CALL
═══════════════════════════════════════════════════ */
const callAI = async (systemPrompt, userPrompt, model="claude-sonnet-4-20250514", temperature=0.7) => {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ model, max_tokens:1000, system:systemPrompt, messages:[{role:"user",content:userPrompt}] }),
  });
  const data = await res.json();
  if(data.error) throw new Error(data.error.message);
  return { text:data.content?.[0]?.text||"", tokens:(data.usage?.input_tokens||0)+(data.usage?.output_tokens||0) };
};

/* ═══════════════════════════════════════════════════
   SHARED UI PRIMITIVES
═══════════════════════════════════════════════════ */
const Btn = ({ children, onClick, variant="primary", size="md", icon:Icon, disabled, full, style:sx={} }) => {
  const [hov,setHov] = useState(false);
  const v = {
    primary:   { bg:hov?"#006a93":T.blue,   color:"#fff",  border:"none",                              shadow:hov?`0 4px 16px ${T.blue}44`:`0 1px 4px ${T.blue}22` },
    secondary: { bg:hov?T.blueL:T.white,     color:T.blue,  border:`1px solid ${hov?T.blue:T.border2}`, shadow:"none" },
    ghost:     { bg:hov?T.border2:"transparent",color:T.ink,border:`0.5px solid ${T.border}`,           shadow:"none" },
    danger:    { bg:hov?"#dc2626":"#fef2f2",  color:hov?"#fff":T.red, border:`0.5px solid ${T.red}55`,  shadow:"none" },
    success:   { bg:hov?"#04996a":T.green,    color:"#fff",  border:"none",                              shadow:"none" },
    purple:    { bg:hov?"#5b35c7":T.purple,   color:"#fff",  border:"none",                              shadow:`0 2px 8px ${T.purple}33` },
  }[variant]||{};
  const pad = {xs:"4px 9px",sm:"6px 13px",md:"9px 18px",lg:"12px 26px"}[size]||"9px 18px";
  const fs  = {xs:10,sm:12,md:13,lg:14}[size]||13;
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ display:"inline-flex",alignItems:"center",gap:6,padding:pad,fontSize:fs,fontFamily:T.font,fontWeight:700,borderRadius:8,border:v.border||"none",background:v.bg,color:v.color,boxShadow:v.shadow,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.5:1,transition:"all 0.15s",width:full?"100%":"auto",justifyContent:full?"center":"flex-start",...sx }}>
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
        style={{width:"100%",padding:small?"6px 10px":"10px 13px",fontFamily:T.font,fontSize:small?12:13,fontWeight:600,border:`1px solid ${foc?T.blue:T.border}`,borderRadius:8,outline:"none",background:T.white,color:T.ink,cursor:"pointer",transition:"border-color 0.15s",boxShadow:foc?`0 0 0 3px ${T.blue}18`:"none"}}>
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
        style={{width:"100%",boxSizing:"border-box",padding:"10px 13px",fontFamily:mono?T.mono:T.font,fontSize:13,fontWeight:600,border:`1px solid ${foc?T.blue:T.border}`,borderRadius:8,outline:"none",background:T.white,color:T.ink,resize:"vertical",transition:"border-color 0.15s",boxShadow:foc?`0 0 0 3px ${T.blue}18`:"none",lineHeight:1.6}}/>
    </div>
  );
};

const Badge = ({ label, color="#888891", bg="#f3f4f6", small }) => (
  <span style={{display:"inline-flex",alignItems:"center",gap:4,fontFamily:T.font,fontSize:small?10:11,fontWeight:700,color,background:bg,padding:small?"2px 7px":"3px 9px",borderRadius:20,whiteSpace:"nowrap"}}>
    {label}
  </span>
);

const Card = ({ children, style:sx={}, onClick }) => (
  <div onClick={onClick} style={{background:T.white,border:`0.5px solid ${T.border}`,borderRadius:12,overflow:"hidden",cursor:onClick?"pointer":"default",...sx}}>
    {children}
  </div>
);

const Stars = ({ value, onChange }) => (
  <div style={{display:"flex",gap:2}}>
    {[1,2,3,4,5].map(s=>(
      <Star key={s} size={13} onClick={()=>onChange&&onChange(s)}
        fill={s<=value?"#e07b00":"none"}
        color={s<=value?"#e07b00":"#d1d5db"}
        style={{cursor:onChange?"pointer":"default",transition:"color 0.1s"}} aria-hidden="true"/>
    ))}
  </div>
);

const Spinner = () => (
  <span style={{display:"inline-block",width:16,height:16,border:`2px solid ${T.blueL}`,borderTopColor:T.blue,borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>
);

/* NavSection / NavItem */
const NavSection = ({ label }) => (
  <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",color:"rgba(255,255,255,0.45)",padding:"10px 20px 4px",textTransform:"uppercase",fontFamily:T.head}}>
    {label}
  </div>
);
const NavItem = ({ icon:Icon, label, active=false }) => {
  const [hov,setHov] = useState(false);
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{display:"flex",alignItems:"center",gap:9,padding:"8px 20px",fontSize:13,fontWeight:active?700:600,fontFamily:T.font,color:active?"#fff":hov?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.6)",background:active?"rgba(255,255,255,0.18)":hov?"rgba(255,255,255,0.08)":"transparent",borderRight:active?"2px solid #fff":"2px solid transparent",cursor:"pointer",transition:"all 0.15s",userSelect:"none"}}>
      {Icon&&<Icon size={16} aria-hidden="true"/>}{label}
    </div>
  );
};

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
              <div style={{width:28,height:28,borderRadius:"50%",background:m.role==="user"?T.blue:`linear-gradient(135deg,${T.purple},${T.blue})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {m.role==="user"
                  ? <User size={13} color="#fff" aria-hidden="true"/>
                  : <Sparkles size={13} color="#fff" aria-hidden="true"/>}
              </div>
              <div style={{maxWidth:"80%",padding:"10px 14px",borderRadius:m.role==="user"?"14px 4px 14px 14px":"4px 14px 14px 14px",background:m.role==="user"?T.blue:T.bg,color:m.role==="user"?"#fff":T.ink,fontFamily:T.font,fontSize:13,lineHeight:1.6,fontWeight:600}}>
                {m.content}
              </div>
            </div>
          ))}
          {loading&&(
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:`linear-gradient(135deg,${T.purple},${T.blue})`,display:"flex",alignItems:"center",justifyContent:"center"}}>
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
              rows={2} style={{flex:1,padding:"10px 13px",fontFamily:T.font,fontSize:13,fontWeight:600,border:`1px solid ${T.border}`,borderRadius:8,outline:"none",resize:"none",background:T.white,color:T.ink,lineHeight:1.5}}/>
            <button onClick={send} disabled={loading||!input.trim()}
              style={{width:40,height:40,borderRadius:8,background:T.blue,border:"none",color:"#fff",cursor:loading||!input.trim()?"not-allowed":"pointer",opacity:loading||!input.trim()?0.5:1,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
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
                style={{padding:"5px 12px",fontFamily:T.font,fontSize:12,fontWeight:700,border:`0.5px solid ${previewTab===t?T.blue:T.border}`,borderRadius:7,background:previewTab===t?T.blueL:T.white,color:previewTab===t?T.blue:T.muted,cursor:"pointer"}}>
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
                <PenLine size={32} color={T.blue} aria-hidden="true"/>
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
              <div style={{background:`linear-gradient(135deg,${T.blue},${T.teal})`,padding:"28px 36px",textAlign:"center"}}>
                <div style={{fontFamily:T.head,fontSize:16,fontWeight:700,color:"#fff",letterSpacing:"0.08em"}}>VANTARI</div>
              </div>
              <div style={{padding:"28px 36px"}}>
                {generated.split("\n").map((line,i)=>{
                  if(line.startsWith("Assunto:")) return (
                    <div key={i} style={{marginBottom:20,padding:"12px 16px",background:T.blueL,borderRadius:8,borderLeft:`3px solid ${T.blue}`}}>
                      <span style={{fontFamily:T.font,fontSize:11,fontWeight:700,color:T.blue,textTransform:"uppercase",letterSpacing:"0.06em"}}>Assunto: </span>
                      <span style={{fontFamily:T.font,fontSize:13,color:T.ink,fontWeight:700}}>{line.replace("Assunto:","").trim()}</span>
                    </div>
                  );
                  if(!line.trim()) return <div key={i} style={{height:10}}/>;
                  return <p key={i} style={{fontFamily:T.font,fontSize:14,color:T.ink,margin:"0 0 10px",lineHeight:1.7,fontWeight:600}}>{line}</p>;
                })}
              </div>
              <div style={{padding:"16px 36px",borderTop:`0.5px solid ${T.border}`,background:T.bg,textAlign:"center"}}>
                <p style={{fontFamily:T.font,fontSize:11,color:T.muted,margin:0,fontWeight:600}}>© 2025 Vantari · <a href="#" style={{color:T.blue,textDecoration:"none"}}>Descadastrar</a></p>
              </div>
            </Card>
          )}
          {generated&&previewTab==="raw"&&(
            <div style={{background:T.bg,borderRadius:12,padding:20,fontFamily:T.mono,fontSize:13,lineHeight:1.7,color:T.ink,whiteSpace:"pre-wrap",maxWidth:700,margin:"0 auto"}}>{generated}</div>
          )}
          {generated&&genMeta&&(
            <div style={{maxWidth:600,margin:"16px auto 0",display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
              <Badge label={genMeta.model.includes("claude")?"Claude Sonnet":"GPT-4o"} color={T.blue} bg={T.blueL}/>
              <Badge label={`${genMeta.tokens} tokens`} color={T.muted} bg={T.bg}/>
              <Badge label={`~$${(genMeta.tokens*0.003/1000).toFixed(4)}`} color={T.green} bg="#f0fdf4"/>
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

  const analyzeAndSuggest = async () => {
    if(!subject.trim()||loading) return;
    setLoad(true); setResults(null);
    const sys = settings.custom_prompts.subject + `\n\nResponda APENAS com JSON válido:\n{"score":0-100,"analysis":{"length":"obs","emojis":"obs","urgency":"obs","personalization":"obs","clarity":"obs"},"suggestions":[{"subject":"texto","score":0-100,"tags":["tag1"]},...] }\n\nGere 4 sugestões. Português brasileiro.`;
    try {
      const r = await callAI(sys, `Analise e melhore este assunto:\n"${subject}"`, settings.model_preference, 0.8);
      const clean = r.text.replace(/```json|```/g,"").trim();
      setResults(JSON.parse(clean));
    } catch(e) {
      setResults({
        score:68,
        analysis:{ length:"Adequado (45 chars)", emojis:"Nenhum — considere adicionar 1 emoji relevante", urgency:"Baixa — adicione gatilho temporal", personalization:"Sem personalização — use {{lead.name}}", clarity:"Clara e direta" },
        suggestions:[
          { subject:`Oferta relâmpago — ${subject} só hoje!`, score:82, tags:["urgência"]        },
          { subject:`{{lead.name}}, ${subject.toLowerCase()}`, score:79, tags:["personalização"] },
          { subject:`[Exclusivo] ${subject}`,                  score:76, tags:["exclusividade"]  },
          { subject:`${subject} (+ bônus surpresa)`,           score:73, tags:["curiosidade"]    },
        ]
      });
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
            style={{flex:1,padding:"12px 16px",fontFamily:T.font,fontSize:14,fontWeight:600,border:`1px solid ${T.border}`,borderRadius:8,outline:"none",color:T.ink,background:T.white}}/>
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

      {results&&(
        <>
          <Card style={{padding:24,marginBottom:20}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
              <div>
                <p style={{fontFamily:T.head,fontSize:15,fontWeight:700,color:T.ink,margin:"0 0 4px"}}>Análise do Assunto Original</p>
                <p style={{fontFamily:T.mono,fontSize:13,color:T.ink,margin:0,padding:"6px 10px",background:T.bg,borderRadius:7,display:"inline-block"}}>"{subject}"</p>
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
                    <span style={{fontFamily:T.font,fontSize:12,color:T.ink,fontWeight:600}}>{v}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <div style={{marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <p style={{fontFamily:T.head,fontSize:14,fontWeight:700,color:T.ink,margin:0}}>Sugestões A/B com IA</p>
            <Badge label={`${results.suggestions.length} variações`} color={T.blue} bg={T.blueL}/>
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
const SummaryTab = ({ settings }) => {
  const [selected,   setSelected]   = useState(null);
  const [loading,    setLoad]       = useState(false);
  const [summaries,  setSummaries]  = useState({});

  const generateSummary = async (lead) => {
    setSelected(lead);
    if(summaries[lead.id]) return;
    setLoad(true);
    const interactionDesc = lead.interactions.map(i=>`- ${i.label}: ${i.count}x (${i.detail})`).join("\n");
    const sys = settings.custom_prompts.summary + `\nResponda APENAS com JSON válido:\n{"summary":"texto 2-3 frases","insights":["insight1","insight2","insight3"],"intent_score":0-100,"next_action":"recomendação","stage":"Lead Frio|Nutrindo|MQL|SQL|Pronto para Venda"}\nPortuguês brasileiro.`;
    const prompt = `Lead: ${lead.name} (${lead.company})\nScore atual: ${lead.score}/100\n\nInterações:\n${interactionDesc}`;
    try {
      const r = await callAI(sys, prompt, settings.model_preference, 0.4);
      const clean = r.text.replace(/```json|```/g,"").trim();
      setSummaries(p=>({...p,[lead.id]:JSON.parse(clean)}));
    } catch(e) {
      setSummaries(p=>({...p,[lead.id]:{
        summary:`${lead.name} demonstra interesse em nossa plataforma com ${lead.interactions.reduce((a,b)=>a+b.count,0)} interações registradas.`,
        insights:["Engajamento com conteúdo de precificação","Visitou página de trial","Solicitou demonstração"],
        intent_score:lead.score,
        next_action:"Agendar call de discovery com foco em ROI",
        stage:lead.score>80?"SQL":lead.score>60?"MQL":"Nutrindo"
      }}));
    }
    setLoad(false);
  };

  const stageColor = s => ({"Lead Frio":"#888891","Nutrindo":T.amber,"MQL":T.blue,"SQL":T.teal,"Pronto para Venda":T.green})[s]||T.muted;
  const sum = selected ? summaries[selected.id] : null;

  return (
    <div style={{display:"grid",gridTemplateColumns:"280px 1fr",height:"100%",overflow:"hidden"}}>
      <div style={{borderRight:`0.5px solid ${T.border}`,overflowY:"auto",padding:16}}>
        <p style={{fontFamily:T.font,fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em",margin:"0 0 12px 4px"}}>Leads</p>
        {MOCK_LEADS.map(lead=>(
          <div key={lead.id} onClick={()=>generateSummary(lead)}
            style={{padding:"12px 14px",borderRadius:10,marginBottom:6,cursor:"pointer",background:selected?.id===lead.id?T.blueL:T.white,border:`0.5px solid ${selected?.id===lead.id?T.blue:T.border}`,transition:"all 0.15s"}}>
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
                  <div style={{fontFamily:T.head,fontSize:40,fontWeight:700,color:sum.intent_score>80?T.green:sum.intent_score>60?T.blue:T.amber}}>{sum.intent_score}</div>
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
                        <IIcon size={14} color={T.blue} aria-hidden="true"/>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <span style={{fontFamily:T.font,fontSize:13,fontWeight:700,color:T.ink}}>{interaction.label}</span>
                          <Badge label={`${interaction.count}x`} color={T.blue} bg={T.blueL} small/>
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
                    <span style={{fontFamily:T.font,fontSize:13,color:T.ink,lineHeight:1.5,fontWeight:600}}>{ins}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card style={{padding:20,border:`1px solid ${T.green}40`,borderLeft:`3px solid ${T.green}`,background:"#f0fdf7"}}>
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
const PersonalizationTab = ({ settings }) => {
  const [lead,   setLead]   = useState(MOCK_LEADS[0]);
  const [loading,setLoad]   = useState(false);
  const [result, setResult] = useState(null);

  const urgencyColor = u => ({alta:T.red,media:T.amber,baixa:T.green})[u]||T.muted;

  const generate = async () => {
    setLoad(true); setResult(null);
    const sys = `Você é um especialista em personalização de marketing. Baseado no perfil e comportamento do lead, gere recomendações altamente personalizadas.\n\nResponda APENAS com JSON válido:\n{"segments":["seg1","seg2"],"content_recommendations":[{"type":"email|blog|case_study|webinar","title":"título","reason":"por que enviar","urgency":"alta|media|baixa"}],"next_best_action":{"action":"texto","channel":"email|whatsapp|ligação","timing":"texto","script":"texto"}}\nPortuguês brasileiro.`;
    const prompt = `Lead: ${lead.name} (${lead.company})\nScore: ${lead.score}/100\nInterações: ${lead.interactions.map(i=>`${i.label}(${i.count}x)`).join(", ")}`;
    try {
      const r = await callAI(sys, prompt, settings.model_preference, 0.6);
      const clean = r.text.replace(/```json|```/g,"").trim();
      setResult(JSON.parse(clean));
    } catch(e) {
      setResult({
        segments:["Alto Interesse em Precificação","Avaliando Trial","B2B SaaS"],
        content_recommendations:[
          { type:"case_study", title:"Como a TechCorp aumentou 40% de receita com Vantari", reason:"Lead visitou página de pricing 3x",         urgency:"alta"  },
          { type:"email",      title:"ROI Calculator: descubra seu potencial de retorno",    reason:"Interesse demonstrado em trial",               urgency:"alta"  },
          { type:"webinar",    title:"Webinar: Automação de vendas na prática",               reason:"Perfil B2B com potencial de escala",           urgency:"media" },
          { type:"blog",       title:"5 formas de reduzir o ciclo de vendas",                 reason:"Conteúdo educativo para nutrição",             urgency:"baixa" },
        ],
        next_best_action:{ action:"Enviar email personalizado com calculadora de ROI", channel:"email", timing:"Próximas 24h (maior engajamento terças 9-11h)", script:"Olá {{lead.name}}, vi que você explorou nossa página de preços — preparei algo especial para te mostrar o ROI exato para a {{lead.company}}." }
      });
    }
    setLoad(false);
  };

  useEffect(()=>{ generate(); },[]);

  return (
    <div style={{display:"grid",gridTemplateColumns:"240px 1fr",height:"100%",overflow:"hidden"}}>
      <div style={{borderRight:`0.5px solid ${T.border}`,overflowY:"auto",padding:16}}>
        <p style={{fontFamily:T.font,fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em",margin:"0 0 12px 4px"}}>Selecionar Lead</p>
        {MOCK_LEADS.map(l=>(
          <div key={l.id} onClick={()=>{setLead(l);setResult(null);}}
            style={{padding:"12px 14px",borderRadius:10,marginBottom:6,cursor:"pointer",background:lead.id===l.id?T.blueL:T.white,border:`0.5px solid ${lead.id===l.id?T.blue:T.border}`,transition:"all 0.15s"}}>
            <p style={{fontFamily:T.font,fontSize:13,fontWeight:700,color:T.ink,margin:"0 0 2px"}}>{l.name}</p>
            <p style={{fontFamily:T.font,fontSize:11,color:T.muted,margin:"0 0 6px",fontWeight:600}}>{l.company}</p>
            <div style={{height:4,borderRadius:2,background:T.border2,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${l.score}%`,background:l.score>80?T.green:l.score>60?T.blue:T.amber,borderRadius:2}}/>
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
        {result&&(
          <>
            <div style={{marginBottom:24}}>
              <h2 style={{fontFamily:T.head,fontSize:18,fontWeight:700,color:T.ink,margin:"0 0 8px"}}>Personalização para {lead.name}</h2>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {result.segments.map(s=><Badge key={s} label={s} color={T.purple} bg={T.purpleL}/>)}
              </div>
            </div>

            <Card style={{padding:22,marginBottom:20,border:`1px solid ${T.blue}40`,borderLeft:`3px solid ${T.blue}`,background:T.blueL}}>
              <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
                <div style={{width:40,height:40,borderRadius:10,background:`${T.blue}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <Target size={18} color={T.blue} aria-hidden="true"/>
                </div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                    <p style={{fontFamily:T.font,fontSize:11,fontWeight:700,color:T.blue,textTransform:"uppercase",letterSpacing:"0.07em",margin:0}}>Próxima Melhor Ação</p>
                    <Badge label={result.next_best_action.channel} color={T.blue} bg="#dbeafe"/>
                  </div>
                  <p style={{fontFamily:T.font,fontSize:14,fontWeight:700,color:T.ink,margin:"0 0 4px"}}>{result.next_best_action.action}</p>
                  <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:10}}>
                    <Clock size={11} color={T.muted} aria-hidden="true"/>
                    <p style={{fontFamily:T.font,fontSize:12,color:T.muted,margin:0,fontWeight:600}}>{result.next_best_action.timing}</p>
                  </div>
                  <div style={{padding:"12px 14px",background:T.white,borderRadius:8,fontFamily:T.mono,fontSize:12,color:T.ink,lineHeight:1.6,borderLeft:`3px solid ${T.blue}`}}>
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
                            <Badge label={rec.type.replace("_"," ")} color={T.teal} bg="#e0f2fe" small/>
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
          <input type="range" min="0" max="1" step="0.1" value={local.temperature} onChange={e=>upd("temperature",parseFloat(e.target.value))} style={{flex:1,accentColor:T.blue}}/>
          <div style={{fontFamily:T.head,fontSize:18,fontWeight:700,color:T.blue,width:40,textAlign:"center"}}>{local.temperature}</div>
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
          <Zap size={13} color={T.blue} aria-hidden="true"/>
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
  const [gens,   setGens]   = useState(MOCK_GENERATIONS);
  const [filter, setFilter] = useState("all");

  const filtered    = filter==="all" ? gens : gens.filter(g=>g.type===filter);
  const totalTokens = gens.reduce((a,g)=>a+(g.tokens||0),0);
  const avgRating   = (gens.reduce((a,g)=>a+(g.rating||0),0)/gens.length).toFixed(1);
  const usedCount   = gens.filter(g=>g.used).length;

  const typeInfo = t => ({
    email:   { Icon:Mail,     label:"Email",   color:T.blue   },
    subject: { Icon:AtSign,   label:"Assunto", color:T.teal   },
    summary: { Icon:Brain,    label:"Resumo",  color:T.purple },
  })[t]||{ Icon:FileText, label:t, color:T.muted };

  const METRICS = [
    { label:"Gerações Total",    value:gens.length,                  Icon:Sparkles,     color:T.blue   },
    { label:"Usados em Emails",  value:usedCount,                    Icon:CheckCircle2, color:T.green  },
    { label:"Avaliação Média",   value:`${avgRating}/5`,              Icon:Star,         color:T.amber  },
    { label:"Tokens Consumidos", value:totalTokens.toLocaleString(), Icon:Zap,          color:T.purple },
  ];

  const FILTER_LABELS = { all:"Todos", email:"Email", subject:"Assunto", summary:"Resumo" };

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
        {["all","email","subject","summary"].map(f=>{
          const FIcon = f==="all" ? Clock : (typeInfo(f).Icon);
          return (
            <button key={f} onClick={()=>setFilter(f)}
              style={{display:"flex",alignItems:"center",gap:5,padding:"6px 14px",fontFamily:T.font,fontSize:12,fontWeight:700,border:`0.5px solid ${filter===f?T.blue:T.border}`,borderRadius:8,background:filter===f?T.blueL:T.white,color:filter===f?T.blue:T.muted,cursor:"pointer",transition:"all 0.15s"}}>
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
                      {g.used&&<Badge label="Usado" color={T.green} bg="#dcfce7" small/>}
                      <span style={{fontFamily:T.font,fontSize:11,color:T.muted,fontWeight:600}}>{new Date(g.created_at).toLocaleDateString("pt-BR")}</span>
                    </div>
                    <div style={{display:"flex",gap:10,alignItems:"center"}}>
                      <Stars value={g.rating} onChange={r=>setGens(prev=>prev.map(x=>x.id===g.id?{...x,rating:r}:x))}/>
                      <Badge label={`${g.tokens} tok`} color={T.muted} bg={T.bg} small/>
                    </div>
                  </div>
                  <p style={{fontFamily:T.font,fontSize:12,color:T.muted,margin:"0 0 6px",fontWeight:600}}>Prompt: {g.prompt}</p>
                  <p style={{fontFamily:T.mono,fontSize:12,color:T.ink,margin:0,background:T.bg,padding:"8px 12px",borderRadius:7,lineHeight:1.6,overflow:"hidden",maxHeight:60}}>
                    {g.result.slice(0,200)}{g.result.length>200?"…":""}
                  </p>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  <Btn size="xs" variant="ghost" icon={Copy} onClick={()=>navigator.clipboard?.writeText(g.result)}>Copiar</Btn>
                  <Btn size="xs" variant="secondary">Template</Btn>
                </div>
              </div>
            </Card>
          );
        })}
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
  { id:"history",  Icon:Clock,      label:"Histórico & Analytics",   badge:MOCK_GENERATIONS.length },
];

export default function VantariAIMarketing() {
  const [tab,      setTab]      = useState("email");
  const [settings, setSettings] = useState(MOCK_SETTINGS);

  return (
    <div style={{display:"flex",height:"100vh",background:T.bg,fontFamily:T.font,overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700&family=Nunito+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing:border-box; }
        input[type=range] { -webkit-appearance:none; height:4px; border-radius:99px; cursor:pointer; background:${T.border}; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:14px; height:14px; border-radius:50%; cursor:pointer; border:2px solid #fff; box-shadow:0 1px 3px rgba(0,0,0,0.15); }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:${T.border}; border-radius:3px; }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>

      {/* ── SIDEBAR — iconrs.png embutido */}
      <div style={{width:220,background:"#0079a9",display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"16px 20px 14px",borderBottom:"1px solid rgba(255,255,255,0.12)",display:"flex",alignItems:"center"}}>
          <img src="iconrs.png" alt="Vantari" style={{height:28,width:"auto"}}/>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"8px 0"}}>
          <NavSection label="Principal"/>
          <NavItem icon={BarChart2}      label="Analytics"       />
          <NavItem icon={Users}          label="Leads"           />
          <NavItem icon={Mail}           label="Email Marketing" />
          <NavSection label="Ferramentas"/>
          <NavItem icon={Star}           label="Scoring"         />
          <NavItem icon={LayoutTemplate} label="Landing Pages"   />
          <NavItem icon={Bot}            label="IA & Automação" active/>
          <NavSection label="Sistema"/>
          <NavItem icon={Plug}           label="Integrações"     />
        </div>
        <div style={{borderTop:"1px solid rgba(255,255,255,0.12)",padding:"8px 0"}}>
          <NavItem icon={Settings} label="Configurações"/>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* Topbar */}
        <div style={{height:52,background:T.white,borderBottom:`0.5px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px",flexShrink:0}}>
          <span style={{fontSize:15,fontWeight:700,color:T.ink,fontFamily:T.head,letterSpacing:"-0.01em"}}>IA & Automação</span>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <Badge label={settings.model_preference.includes("claude")?"Claude Sonnet":"GPT-4o"} color={T.blue} bg={T.blueL}/>
            <Badge label={`Temp ${settings.temperature}`} color={T.muted} bg={T.bg}/>
            <Btn size="sm" variant="secondary" icon={Settings} onClick={()=>setTab("settings")}>Config</Btn>
          </div>
        </div>

        {/* Sub-tabs */}
        <div style={{background:T.white,borderBottom:`0.5px solid ${T.border}`,overflowX:"auto",flexShrink:0}}>
          <div style={{display:"flex",gap:0}}>
            {TABS.map(t=>{
              const TIcon = t.Icon;
              const active = tab===t.id;
              return (
                <button key={t.id} onClick={()=>setTab(t.id)}
                  style={{display:"flex",alignItems:"center",gap:6,padding:"10px 16px",fontFamily:T.font,fontSize:12,fontWeight:active?700:600,color:active?T.blue:T.muted,background:"none",border:"none",borderBottom:active?`2px solid ${T.blue}`:"2px solid transparent",cursor:"pointer",transition:"all 0.15s",whiteSpace:"nowrap"}}>
                  <TIcon size={13} aria-hidden="true"/>
                  {t.label}
                  {t.badge&&<Badge label={t.badge} color={T.blue} bg={T.blueL} small/>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
          {tab==="email"    && <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}><EmailGenTab    settings={settings}/></div>}
          {tab==="subject"  && <div style={{flex:1,overflowY:"auto"}}><SubjectOptTab  settings={settings}/></div>}
          {tab==="summary"  && <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}><SummaryTab     settings={settings}/></div>}
          {tab==="personal" && <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}><PersonalizationTab settings={settings}/></div>}
          {tab==="settings" && <div style={{flex:1,overflowY:"auto"}}><SettingsTab    settings={settings} onChange={setSettings}/></div>}
          {tab==="history"  && <div style={{flex:1,overflowY:"auto"}}><HistoryTab/></div>}
        </div>

        {/* DB Schema Footer */}
        <details style={{background:"#0f172a",color:"#a3e635",fontFamily:T.mono,fontSize:11,flexShrink:0}}>
          <summary style={{padding:"8px 20px",cursor:"pointer",color:"#86efac",letterSpacing:"0.04em",fontWeight:600}}>
            SCHEMA SQL — ai_generations · ai_settings · lead_summaries
          </summary>
          <pre style={{padding:"16px 24px",margin:0,lineHeight:1.8,overflowX:"auto"}}>{`-- TABLE: ai_generations
CREATE TABLE ai_generations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  type         VARCHAR(20) CHECK (type IN ('email','subject','summary','personalization')),
  prompt       TEXT NOT NULL,
  result       TEXT NOT NULL,
  model        VARCHAR(50) NOT NULL,
  temperature  DECIMAL(3,2) DEFAULT 0.7,
  tokens_used  INTEGER,
  rating       SMALLINT CHECK (rating BETWEEN 1 AND 5),
  used         BOOLEAN DEFAULT false,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);`}</pre>
        </details>
      </div>
    </div>
  );
}
