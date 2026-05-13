import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart2, Users, Mail, LayoutTemplate, Bot, Plug, Star,
  Settings, Link2, Unplug, ClipboardList, RefreshCw, Key,
  AlertTriangle, Pencil, CheckCircle2, XCircle, Download,
  ArrowLeftRight, Plus, Play, Pause, X, Settings2
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   DESIGN TOKENS — Vantari redesign
═══════════════════════════════════════════════════════════ */
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
  border2: "#EEF2F6",

  // Ink scale
  ink:     "#0E1A24",
  text:    "#2E3D4B",
  muted:   "#5A6B7A",
  faint3:  "#8696A5",
  faint:   "#F5F8FB",

  // Compat aliases
  blueL:   "#DCF0F7",
  blueM:   "#0D7491",
  tealL:   "#DCF0F7",
  greenL:  "#DCFCE7",
  amberL:  "#FEF3C7",
  redL:    "#FFE8E6",
  purpleL: "#EDE9FF",

  // Fonts
  font:    "'Inter', system-ui, sans-serif",
  head:    "'Sora', system-ui, sans-serif",
  mono:    "'JetBrains Mono', monospace",
};

/* ═══════════════════════════════════════════════════════════
   MOCK DATABASE
═══════════════════════════════════════════════════════════ */
const now  = () => new Date().toISOString();
const ago  = (h) => new Date(Date.now()-h*3600000).toISOString();
const fmtDate = (iso) => {
  if(!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
};

const DB = {
  integrations: [
    { id:"int_meta",   provider:"meta",    name:"Meta Ads / Facebook",    status:"connected",    last_sync:ago(1.2),config:{account_id:"act_123456789",pixel_id:"8734521098",business_id:"987654321",form_ids:["form_abc","form_xyz"]}},
    { id:"int_google", provider:"google",  name:"Google Ads",             status:"connected",    last_sync:ago(0.5),config:{customer_id:"123-456-7890",conversion_actions:["purchase","lead_form"]}},
    { id:"int_wa",     provider:"whatsapp",name:"WhatsApp Business API",  status:"disconnected", last_sync:null,    config:{phone_id:"",waba_id:"",templates:[]}},
    { id:"int_wh",     provider:"webhook", name:"Webhooks Personalizados",status:"partial",      last_sync:ago(3.1),config:{endpoints:[{id:"wh_1",name:"CRM Interno",url:"https://api.empresa.com/leads",active:true,events:["new_lead","score_change"]}]}},
  ],
  integration_logs: Array.from({length:35},(_,i)=>{
    const providers=["meta","google","webhook"];
    const actions={meta:["lead_sync","audience_push","pixel_fire","form_pull"],google:["conversion_import","audience_sync","keyword_track"],webhook:["lead_dispatch","score_dispatch","retry_attempt"]};
    const p=providers[i%3];const acts=actions[p];
    const statuses=i%7===0?"error":i%5===0?"warning":"success";
    const details={success:["3 leads importados com sucesso","Audiência atualizada: 1.240 contatos","Evento de conversão registrado","Pixel disparado na landing page /demo"],warning:["Timeout na requisição — retentando","1 lead com email duplicado ignorado","Rate limit atingido, aguardando"],error:["Credencial expirada — reautorização necessária","Payload inválido rejeitado pela API","Falha de rede após 3 tentativas"]};
    return{id:`log_${i}`,integration_id:`int_${p}`,provider:p,action:acts[i%acts.length],status:statuses,details:details[statuses][i%details[statuses].length],records_affected:statuses==="error"?0:Math.floor(Math.random()*15+1),timestamp:ago(i*0.7+Math.random()*0.5)};
  }),
  external_leads: Array.from({length:18},(_,i)=>{
    const sources=["meta_form","meta_form","google_ads","google_ads","webhook"];
    const names=["Carlos Mendes","Ana Beatriz","Roberto Lima","Fernanda Costa","Diego Alves","Patrícia Rocha","Juliana Ferreira","Marcos Oliveira","Beatriz Nunes","Lucas Pereira","Camila Souza","André Machado","Vanessa Cruz","Felipe Gomes","Larissa Martins","Bruno Carvalho","Priscila Rodrigues","Thiago Almeida"];
    const src=sources[i%5];
    return{id:`ext_${i}`,source:src,external_id:`ext_id_${Math.floor(Math.random()*9999999)}`,raw_data:{full_name:names[i],email:`${names[i].split(" ")[0].toLowerCase()}${i}@test.com`,phone:`(11) 9${8000000+i}`,campaign:["Black Friday","Demo Q4","eBook Grátis"][i%3],keyword:src==="google_ads"?["crm marketing","automação leads","software crm"][i%3]:null},mapped_data:{name:names[i],email:`${names[i].split(" ")[0].toLowerCase()}${i}@test.com`,phone:`(11) 9${8000000+i}`},processed:i<14,imported_at:ago(i*2.1)};
  }),
  wa_templates: [
    {id:"tpl_1",name:"boas_vindas",     status:"approved",category:"UTILITY",   language:"pt_BR",body:"Olá {{1}}! Obrigado pelo seu interesse. Nossa equipe entrará em contato em breve."},
    {id:"tpl_2",name:"follow_up_24h",   status:"approved",category:"MARKETING", language:"pt_BR",body:"Oi {{1}}, aqui é da {{2}}! Vimos que você se cadastrou ontem. Posso te ajudar com alguma dúvida?"},
    {id:"tpl_3",name:"proposta_comercial",status:"pending",category:"MARKETING", language:"pt_BR",body:"Olá {{1}}! Sua proposta personalizada está pronta. Acesse aqui: {{2}}"},
  ],
  field_mappings: {
    meta:  [{id:"fm_1",external_field:"full_name",   internal_field:"name",   transform:"none",         required:true},{id:"fm_2",external_field:"email",       internal_field:"email",  transform:"lowercase",    required:true},{id:"fm_3",external_field:"phone_number",internal_field:"phone",  transform:"format_phone",required:false},{id:"fm_4",external_field:"campaign_name",internal_field:"source", transform:"none",         required:false}],
    google:[{id:"fm_5",external_field:"gclid",       internal_field:"utm_gclid",transform:"none",        required:true},{id:"fm_6",external_field:"keyword",     internal_field:"utm_term", transform:"lowercase",   required:false},{id:"fm_7",external_field:"campaign_id",internal_field:"utm_campaign",transform:"none",  required:false}],
  },
};

/* ═══════════════════════════════════════════════════════════
   PROVIDER METADATA
═══════════════════════════════════════════════════════════ */
const PROVIDERS = {
  meta: {
    label:"Meta Ads", color:"#1877F2", colorL:"#e7f0fe",
    icon:()=>(<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" fill="#1877F2"/></svg>),
  },
  google: {
    label:"Google Ads", color:"#4285F4", colorL:"#e8f0fe",
    icon:()=>(<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z" fill="#4285F4"/></svg>),
  },
  whatsapp: {
    label:"WhatsApp", color:"#25D366", colorL:"#e8faf0",
    icon:()=>(<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" fill="#25D366"/></svg>),
  },
  webhook: {
    label:"Webhooks", color:"#7C5CFF", colorL:"#EDE9FF",
    icon:()=>(<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7C5CFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>),
  },
};

/* ═══════════════════════════════════════════════════════════
   UTILITY COMPONENTS
═══════════════════════════════════════════════════════════ */
const StatusBadge = ({ status }) => {
  const map = {
    connected:    {bg:T.greenL,  color:"#065f46", label:"Conectado"    },
    disconnected: {bg:"#EEF2F6", color:"#475569", label:"Desconectado" },
    partial:      {bg:T.amberL,  color:"#92400e", label:"Parcial"      },
    success:      {bg:T.greenL,  color:"#065f46", label:"Sucesso"      },
    error:        {bg:T.redL,    color:"#991b1b", label:"Erro"         },
    warning:      {bg:T.amberL,  color:"#92400e", label:"Aviso"        },
    approved:     {bg:T.greenL,  color:"#065f46", label:"Aprovado"     },
    pending:      {bg:T.amberL,  color:"#92400e", label:"Pendente"     },
    rejected:     {bg:T.redL,    color:"#991b1b", label:"Rejeitado"    },
    syncing:      {bg:T.blueL,   color:T.teal,    label:"Sincronizando"},
    active:       {bg:T.greenL,  color:"#065f46", label:"Ativo"        },
  };
  const s=map[status]||map.disconnected;
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:4,background:s.bg,color:s.color,fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,letterSpacing:"0.02em",fontFamily:T.font}}>
      <span style={{width:5,height:5,borderRadius:"50%",background:s.color,display:"inline-block"}}/>
      {s.label}
    </span>
  );
};

/* Btn — accepts icon as string (safe unicode) OR Lucide component */
const Btn = ({ children, onClick, variant="default", size="md", disabled=false, icon, style:sx={} }) => {
  const base = {display:"inline-flex",alignItems:"center",gap:6,border:"none",borderRadius:10,cursor:disabled?"not-allowed":"pointer",fontFamily:T.font,fontWeight:700,transition:"all .15s",opacity:disabled?.5:1,outline:"none"};
  const sizes = {sm:{fontSize:12,padding:"5px 12px"},md:{fontSize:13,padding:"7px 16px"},lg:{fontSize:14,padding:"10px 20px"}};
  const variants = {
    default:   {background:T.teal,    color:"#fff"              },
    secondary: {background:T.border2, color:T.text,border:`0.5px solid ${T.border}`},
    ghost:     {background:"transparent",color:T.muted,border:"none"},
    danger:    {background:T.redL,    color:T.red,  border:`0.5px solid ${T.red}20`},
    success:   {background:T.greenL,  color:"#065f46",border:`0.5px solid ${T.green}30`},
  };
  const v = variants[variant]||variants.default;
  const fs = sizes[size]?.fontSize||13;
  const IconEl = icon && typeof icon !== "string" ? icon : null;
  return (
    <button onClick={disabled?undefined:onClick} style={{...base,...sizes[size],...v,...sx}}>
      {IconEl ? <IconEl size={fs} aria-hidden="true"/> : icon ? <span style={{fontSize:fs+1}}>{icon}</span> : null}
      {children}
    </button>
  );
};

const Input = ({ label, value, onChange, placeholder, type="text", mono, hint, required }) => (
  <div style={{marginBottom:14}}>
    {label&&<label style={{display:"block",fontSize:12,fontWeight:700,color:T.muted,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.05em",fontFamily:T.font}}>
      {label}{required&&<span style={{color:T.red,marginLeft:2}}>*</span>}
    </label>}
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{width:"100%",boxSizing:"border-box",padding:"8px 12px",border:`1px solid ${T.border}`,borderRadius:8,fontSize:13,fontWeight:600,fontFamily:mono?T.mono:T.font,background:T.surface,color:T.text,outline:"none"}}/>
    {hint&&<p style={{margin:"4px 0 0",fontSize:11,fontWeight:600,color:T.muted,fontFamily:T.font}}>{hint}</p>}
  </div>
);

const Select = ({ label, value, onChange, options }) => (
  <div style={{marginBottom:14}}>
    {label&&<label style={{display:"block",fontSize:12,fontWeight:700,color:T.muted,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.05em",fontFamily:T.font}}>{label}</label>}
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{width:"100%",padding:"8px 12px",border:`1px solid ${T.border}`,borderRadius:8,fontSize:13,fontWeight:600,fontFamily:T.font,background:T.surface,color:T.text,outline:"none"}}>
      {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const Card = ({ children, style:sx={}, onClick, hover }) => (
  <div onClick={onClick} style={{background:T.surface,border:`0.5px solid ${T.border}`,borderRadius:14,padding:"18px 20px",cursor:onClick?"pointer":"default",transition:"box-shadow .15s, border-color .15s",boxShadow:"0 1px 0 rgba(14,26,36,.03), 0 8px 24px -16px rgba(14,26,36,.08)",...sx}}
    onMouseEnter={hover?e=>{e.currentTarget.style.borderColor=T.teal;e.currentTarget.style.boxShadow="0 4px 16px rgba(13,116,145,0.10)";}:undefined}
    onMouseLeave={hover?e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.boxShadow="0 1px 0 rgba(14,26,36,.03), 0 8px 24px -16px rgba(14,26,36,.08)";}:undefined}>
    {children}
  </div>
);

const SectionHeader = ({ title, subtitle, action }) => (
  <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:20}}>
    <div>
      <h2 style={{margin:0,fontSize:16,fontWeight:700,color:T.ink,fontFamily:T.head}}>{title}</h2>
      {subtitle&&<p style={{margin:"3px 0 0",fontSize:13,fontWeight:600,color:T.muted,fontFamily:T.font}}>{subtitle}</p>}
    </div>
    {action}
  </div>
);

const Divider = () => <div style={{height:1,background:T.border,margin:"14px 0"}}/>;

/* StatusIcon — replaces legacy string status chars */
const StatusIcon = ({ status }) => {
  if(status==="success") return <CheckCircle2 size={13} color={T.green} aria-hidden="true"/>;
  if(status==="error")   return <XCircle size={13} color={T.red} aria-hidden="true"/>;
  return <AlertTriangle size={13} color={T.amber} aria-hidden="true"/>;
};

const LogRow = ({ log }) => {
  const color = log.status==="success"?T.green:log.status==="error"?T.red:T.amber;
  const bg    = log.status==="success"?T.greenL:log.status==="error"?T.redL:T.amberL;
  const providerMeta = PROVIDERS[log.provider];
  return (
    <div style={{display:"flex",alignItems:"flex-start",gap:12,padding:"10px 0",borderBottom:`0.5px solid ${T.border}`}}>
      <div style={{width:22,height:22,borderRadius:"50%",background:bg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
        <StatusIcon status={log.status}/>
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <span style={{fontSize:13,fontWeight:700,color:T.text,fontFamily:T.font}}>{log.action.replace(/_/g," ")}</span>
          <span style={{fontSize:11,color:providerMeta?.color||T.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.03em"}}>{log.provider}</span>
          {log.records_affected>0&&<span style={{fontSize:11,fontWeight:600,color:T.muted,fontFamily:T.font}}>· {log.records_affected} registros</span>}
        </div>
        <div style={{fontSize:12,fontWeight:600,color:T.muted,marginTop:2,fontFamily:T.font}}>{log.details}</div>
      </div>
      <span style={{fontSize:11,fontWeight:600,color:T.muted,flexShrink:0,fontFamily:T.font}}>{fmtDate(log.timestamp)}</span>
    </div>
  );
};

/* ─── SIDEBAR NAV HELPERS ─── */
const NavSection = ({ label }) => (
  <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.18em",color:"rgba(255,255,255,0.4)",padding:"10px 20px 4px",textTransform:"uppercase",fontFamily:T.head}}>
    {label}
  </div>
);
const NavItem = ({ icon:Icon, label, active=false, path }) => {
  const [hov,setHov] = useState(false);
  const navigate = useNavigate();
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={() => path && navigate(path)}
      style={{
        position:"relative",
        display:"flex",alignItems:"center",gap:9,
        padding:"8px 20px",fontSize:13.5,
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
      {Icon&&<Icon size={16} aria-hidden="true"/>}{label}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   INTEGRATION CARD
═══════════════════════════════════════════════════════════ */
const IntegrationCard = ({ integration, onOpen }) => {
  const meta = PROVIDERS[integration.provider];
  const Icon = meta.icon;
  return (
    <Card hover onClick={()=>onOpen(integration)} style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:44,height:44,borderRadius:10,background:meta.colorL,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Icon/>
          </div>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:T.text,fontFamily:T.font}}>{integration.name}</div>
            <StatusBadge status={integration.status}/>
          </div>
        </div>
        <div style={{fontSize:11,fontWeight:600,color:T.muted,textAlign:"right",fontFamily:T.font}}>
          {integration.last_sync?<>Último sync<br/><span style={{fontWeight:700,color:T.text}}>{fmtDate(integration.last_sync)}</span></>:<span style={{color:T.muted}}>Nunca sincronizado</span>}
        </div>
      </div>
      <div style={{display:"flex",gap:8}}>
        {integration.status==="connected"?(
          <>
            <Btn size="sm" variant="secondary" icon={Settings2} onClick={e=>{e.stopPropagation();onOpen(integration);}}>Configurar</Btn>
            <Btn size="sm" variant="success" icon="↻">Sincronizar</Btn>
          </>
        ):(
          <Btn size="sm" icon={Link2} onClick={e=>{e.stopPropagation();onOpen(integration);}}>Conectar</Btn>
        )}
        <Btn size="sm" variant="ghost">Ver logs</Btn>
      </div>
      <StatsBar provider={integration.provider}/>
    </Card>
  );
};

const StatsBar = ({ provider }) => {
  const logs = DB.integration_logs.filter(l=>l.provider===provider).slice(0,10);
  const ok  = logs.filter(l=>l.status==="success").length;
  const err = logs.filter(l=>l.status==="error").length;
  return (
    <div style={{display:"flex",gap:16,paddingTop:8,borderTop:`0.5px solid ${T.border}`}}>
      <div style={{fontSize:11,fontWeight:600,color:T.muted,fontFamily:T.font}}>Últimas 10 ops: <span style={{color:T.green,fontWeight:700}}>{ok} ok</span> · <span style={{color:T.red,fontWeight:700}}>{err} falhas</span></div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   VIEW: META / FACEBOOK
═══════════════════════════════════════════════════════════ */
const MetaView = ({ integration, onBack }) => {
  const [tab,setTab] = useState("leads");
  const [cfg,setCfg] = useState({...integration.config});
  const [audiences]  = useState([{id:"aud_1",name:"Site Visitors 30d",size:"14.2K",status:"active"},{id:"aud_2",name:"Leads Qualificados",size:"3.8K",status:"active"},{id:"aud_3",name:"Clientes Ativos",size:"892",status:"syncing"}]);
  const leads = DB.external_leads.filter(l=>l.source==="meta_form");
  const tabs  = [{id:"leads",label:"Leads de Formulário"},{id:"pixel",label:"Pixels"},{id:"audiences",label:"Audiências"},{id:"config",label:"Configuração"}];

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
        <Btn size="sm" variant="ghost" icon="←" onClick={onBack}>Voltar</Btn>
        <div style={{width:36,height:36,borderRadius:8,background:"#e7f0fe",display:"flex",alignItems:"center",justifyContent:"center"}}>{PROVIDERS.meta.icon()}</div>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:T.text,fontFamily:T.head}}>Meta Ads / Facebook</h2>
          <div style={{display:"flex",gap:8,alignItems:"center",marginTop:2}}>
            <StatusBadge status={integration.status}/>
            <span style={{fontSize:12,fontWeight:600,color:T.muted,fontFamily:T.font}}>Account ID: {cfg.account_id}</span>
          </div>
        </div>
        <div style={{marginLeft:"auto"}}>
          <Btn size="sm" variant="danger" icon={Unplug}>Desconectar</Btn>
        </div>
      </div>
      <div style={{display:"flex",gap:4,background:T.border2,borderRadius:10,padding:4,marginBottom:24}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"8px 12px",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:T.font,background:tab===t.id?T.surface:"transparent",color:tab===t.id?T.text:T.muted,boxShadow:tab===t.id?"0 1px 4px rgba(0,0,0,0.07)":"none",transition:"all .15s"}}>
            {t.label}
          </button>
        ))}
      </div>

      {tab==="leads"&&(
        <div>
          <SectionHeader title="Leads de Formulários" subtitle={`${leads.length} leads importados`} action={<Btn size="sm" icon="↻">Sincronizar Agora</Btn>}/>
          <div style={{display:"flex",flexDirection:"column",gap:0,border:`0.5px solid ${T.border}`,borderRadius:10,overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"2fr 2fr 1.5fr 1.5fr 1fr",padding:"10px 16px",background:T.faint,fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.05em",fontFamily:T.font}}>
              <span>Nome</span><span>Email</span><span>Campanha</span><span>Data</span><span>Status</span>
            </div>
            {leads.map((l,i)=>(
              <div key={l.id} style={{display:"grid",gridTemplateColumns:"2fr 2fr 1.5fr 1.5fr 1fr",padding:"12px 16px",borderTop:`0.5px solid ${T.border}`,background:i%2===0?T.surface:T.faint,fontSize:13,fontFamily:T.font}}>
                <span style={{fontWeight:700,color:T.text}}>{l.raw_data.full_name}</span>
                <span style={{fontWeight:600,color:T.muted}}>{l.raw_data.email}</span>
                <span style={{fontWeight:600,color:T.text}}>{l.raw_data.campaign}</span>
                <span style={{fontWeight:600,color:T.muted}}>{fmtDate(l.imported_at)}</span>
                <StatusBadge status={l.processed?"success":"warning"}/>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==="pixel"&&(
        <div>
          <SectionHeader title="Configuração de Pixels" subtitle="Rastreie eventos nas suas landing pages"/>
          <Card>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
              <Input label="Pixel ID" value={cfg.pixel_id} onChange={v=>setCfg({...cfg,pixel_id:v})} mono/>
              <Input label="Business ID" value={cfg.business_id} onChange={v=>setCfg({...cfg,business_id:v})} mono/>
            </div>
            <div style={{background:"#0f172a",borderRadius:8,padding:16,fontFamily:T.mono,fontSize:12,color:"#E8EEF3",lineHeight:1.7}}>
              <div style={{color:"#64748b",marginBottom:8}}>{"<!-- Meta Pixel Code -->"}</div>
              <div><span style={{color:"#f59e0b"}}>{"!function"}</span><span style={{color:"#94a3b8"}}>({"f,b,e,v,n,t,s"})</span></div>
              <div><span style={{color:"#94a3b8"}}>{"// Pixel ID: "}</span><span style={{color:"#34d399"}}>{cfg.pixel_id||"SEU_PIXEL_ID"}</span></div>
              <div style={{marginTop:4,color:"#64748b"}}>{"<!-- End Meta Pixel Code -->"}</div>
            </div>
            <div style={{marginTop:12}}>
              <Btn icon={ClipboardList}>Copiar Código</Btn>
            </div>
          </Card>
          <Card style={{marginTop:16}}>
            <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:12,fontFamily:T.font}}>Eventos de Conversão</div>
            {[{event:"PageView",trigger:"Todas as páginas",active:true},{event:"Lead",trigger:"Formulário enviado",active:true},{event:"Purchase",trigger:"Checkout concluído",active:false}].map(ev=>(
              <div key={ev.event} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 0",borderBottom:`0.5px solid ${T.border}`}}>
                <div>
                  <span style={{fontSize:13,fontWeight:700,color:T.text,fontFamily:T.mono}}>{ev.event}</span>
                  <span style={{fontSize:12,fontWeight:600,color:T.muted,marginLeft:10,fontFamily:T.font}}>{ev.trigger}</span>
                </div>
                <StatusBadge status={ev.active?"connected":"disconnected"}/>
              </div>
            ))}
          </Card>
        </div>
      )}

      {tab==="audiences"&&(
        <div>
          <SectionHeader title="Audiências Customizadas" subtitle="Sincronize leads para remarketing" action={<Btn size="sm" icon={Plus}>Nova Audiência</Btn>}/>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {audiences.map(a=>(
              <Card key={a.id}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:T.text,fontFamily:T.font}}>{a.name}</div>
                    <div style={{fontSize:12,fontWeight:600,color:T.muted,marginTop:2,fontFamily:T.font}}>{a.size} contatos · Atualizado hoje</div>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <StatusBadge status={a.status==="active"?"connected":"warning"}/>
                    <Btn size="sm" variant="secondary" icon="↻">Sync</Btn>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab==="config"&&(
        <Card>
          <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:16,fontFamily:T.font}}>OAuth e Credenciais</div>
          <Input label="Account ID" value={cfg.account_id} onChange={v=>setCfg({...cfg,account_id:v})} mono/>
          <Input label="Formulários Conectados (IDs separados por vírgula)" value={cfg.form_ids?.join(", ")} onChange={v=>setCfg({...cfg,form_ids:v.split(",").map(s=>s.trim())})} mono hint="Encontre os IDs no Meta Business Suite → Lead Ads"/>
          <div style={{display:"flex",gap:8}}>
            <Btn>Salvar Configuração</Btn>
            <Btn variant="secondary" icon={RefreshCw}>Re-autenticar via OAuth</Btn>
          </div>
        </Card>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   VIEW: GOOGLE ADS
═══════════════════════════════════════════════════════════ */
const GoogleView = ({ integration, onBack }) => {
  const [tab,setTab] = useState("conversions");
  const leads = DB.external_leads.filter(l=>l.source==="google_ads");
  const tabs  = [{id:"conversions",label:"Conversões"},{id:"audiences",label:"Audiências"},{id:"keywords",label:"Keywords"},{id:"config",label:"Configuração"}];
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
        <Btn size="sm" variant="ghost" icon="←" onClick={onBack}>Voltar</Btn>
        <div style={{width:36,height:36,borderRadius:8,background:"#e8f0fe",display:"flex",alignItems:"center",justifyContent:"center"}}>{PROVIDERS.google.icon()}</div>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:T.text,fontFamily:T.head}}>Google Ads</h2>
          <div style={{display:"flex",gap:8,alignItems:"center",marginTop:2}}>
            <StatusBadge status={integration.status}/>
            <span style={{fontSize:12,fontWeight:600,color:T.muted,fontFamily:T.font}}>Customer ID: {integration.config.customer_id}</span>
          </div>
        </div>
      </div>
      <div style={{display:"flex",gap:4,background:T.border2,borderRadius:10,padding:4,marginBottom:24}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"8px 12px",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:T.font,background:tab===t.id?T.surface:"transparent",color:tab===t.id?T.text:T.muted,transition:"all .15s"}}>
            {t.label}
          </button>
        ))}
      </div>

      {tab==="conversions"&&(
        <div>
          <SectionHeader title="Ações de Conversão" subtitle="Importadas do Google Ads" action={<Btn size="sm" icon="↻">Importar</Btn>}/>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {[{name:"Lead Form Submit",conversions:284,value:"R$ 0",bidding:"Target CPA"},{name:"Purchase",conversions:47,value:"R$ 2.850",bidding:"Target ROAS"},{name:"Demo Agendada",conversions:21,value:"R$ 0",bidding:"Maximize Conversions"}].map(c=>(
              <Card key={c.name}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:T.text,fontFamily:T.font}}>{c.name}</div>
                    <div style={{fontSize:12,fontWeight:600,color:T.muted,fontFamily:T.font}}>Estratégia: {c.bidding}</div>
                  </div>
                  <div style={{display:"flex",gap:24,textAlign:"right"}}>
                    <div><div style={{fontSize:18,fontWeight:700,color:T.teal,fontFamily:T.head}}>{c.conversions}</div><div style={{fontSize:11,fontWeight:600,color:T.muted}}>Conversões</div></div>
                    <div><div style={{fontSize:18,fontWeight:700,color:T.green,fontFamily:T.head}}>{c.value}</div><div style={{fontSize:11,fontWeight:600,color:T.muted}}>Valor</div></div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab==="keywords"&&(
        <div>
          <SectionHeader title="Keywords → Leads" subtitle="Origem por palavra-chave"/>
          <div style={{border:`0.5px solid ${T.border}`,borderRadius:10,overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",padding:"10px 16px",background:T.faint,fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",fontFamily:T.font}}>
              <span>Keyword</span><span>Leads</span><span>Score Médio</span><span>Conversão</span>
            </div>
            {[{kw:"crm marketing",leads:34,score:72,conv:"18%"},{kw:"automação leads",leads:28,score:68,conv:"15%"},{kw:"software crm",leads:19,score:61,conv:"11%"},{kw:"gestão de leads",leads:15,score:58,conv:"9%"}].map((r,i)=>(
              <div key={r.kw} style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",padding:"12px 16px",borderTop:`0.5px solid ${T.border}`,background:i%2===0?T.surface:T.faint,fontSize:13,fontFamily:T.font}}>
                <span style={{fontFamily:T.mono,color:T.teal,fontWeight:600}}>"{r.kw}"</span>
                <span style={{fontWeight:700,color:T.text}}>{r.leads}</span>
                <span><span style={{background:T.blueL,color:T.teal,fontWeight:700,fontSize:12,padding:"2px 8px",borderRadius:20}}>{r.score}</span></span>
                <span style={{color:T.green,fontWeight:700}}>{r.conv}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==="audiences"&&(
        <div>
          <SectionHeader title="Audiências para Remarketing" subtitle="Sincronize segmentos para Google Ads" action={<Btn size="sm" icon="↑">Fazer Push</Btn>}/>
          {[{name:"Leads MQL+",size:"1.840",match:"78%",status:"syncing"},{name:"Clientes Recentes 90d",size:"412",match:"85%",status:"connected"},{name:"Visitantes Sem Conversão",size:"6.240",match:"62%",status:"connected"}].map(a=>(
            <Card key={a.name} style={{marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:T.text,fontFamily:T.font}}>{a.name}</div>
                  <div style={{fontSize:12,fontWeight:600,color:T.muted,fontFamily:T.font}}>{a.size} contatos · Match rate: <span style={{color:T.green,fontWeight:700}}>{a.match}</span></div>
                </div>
                <StatusBadge status={a.status}/>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab==="config"&&(
        <Card>
          <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:16,fontFamily:T.font}}>Configuração Google Ads API</div>
          <Input label="Customer ID" value={integration.config.customer_id} onChange={()=>{}} mono/>
          <Input label="OAuth Client ID" value="●●●●●●●●.apps.googleusercontent.com" onChange={()=>{}} mono hint="OAuth 2.0 via Google Cloud Console"/>
          <div style={{display:"flex",gap:8}}>
            <Btn>Salvar</Btn>
            <Btn variant="secondary" icon={Key}>Renovar Token OAuth</Btn>
          </div>
        </Card>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   VIEW: WHATSAPP BUSINESS API
═══════════════════════════════════════════════════════════ */
const WhatsAppView = ({ integration, onBack }) => {
  const [tab,setTab]     = useState("setup");
  const [phoneId,setPhoneId] = useState(integration.config.phone_id||"");
  const [wabaId,setWabaId]   = useState(integration.config.waba_id||"");
  const templates = DB.wa_templates;
  const tabs = [{id:"setup",label:"Configuração"},{id:"templates",label:"Templates"},{id:"history",label:"Histórico"}];

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
        <Btn size="sm" variant="ghost" icon="←" onClick={onBack}>Voltar</Btn>
        <div style={{width:36,height:36,borderRadius:8,background:"#e8faf0",display:"flex",alignItems:"center",justifyContent:"center"}}>{PROVIDERS.whatsapp.icon()}</div>
        <div>
          <h2 style={{margin:0,fontSize:17,fontWeight:700,color:T.text,fontFamily:T.head}}>WhatsApp Business API</h2>
          <StatusBadge status={integration.status}/>
        </div>
      </div>
      <div style={{display:"flex",gap:4,background:T.border2,borderRadius:10,padding:4,marginBottom:24}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"8px 12px",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:T.font,background:tab===t.id?T.surface:"transparent",color:tab===t.id?T.text:T.muted,transition:"all .15s"}}>
            {t.label}
          </button>
        ))}
      </div>

      {tab==="setup"&&(
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <div style={{padding:"12px 16px",background:T.amberL,border:`0.5px solid ${T.amber}60`,borderRadius:10,fontSize:13,fontWeight:600,color:"#92400e",fontFamily:T.font,display:"flex",gap:8,alignItems:"flex-start"}}>
            <AlertTriangle size={15} color={T.amber} style={{flexShrink:0,marginTop:1}} aria-hidden="true"/>
            Conexão não configurada. Insira suas credenciais Meta Cloud API para ativar o WhatsApp Business.
          </div>
          <Card>
            <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:16,fontFamily:T.font}}>Credenciais Meta Cloud API</div>
            <Input label="Phone Number ID" value={phoneId} onChange={setPhoneId} mono placeholder="Ex: 102938475647382"/>
            <Input label="WABA ID (WhatsApp Business Account)" value={wabaId} onChange={setWabaId} mono placeholder="Ex: 287634812756348"/>
            <Input label="Access Token (permanente)" value="" onChange={()=>{}} mono placeholder="EAABs..." hint="Gere em Meta for Developers → WhatsApp → Configuração"/>
            <Btn icon={Link2}>Conectar Número</Btn>
          </Card>
          <Card>
            <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:12,fontFamily:T.font}}>Webhook Incoming</div>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:T.faint,borderRadius:8,fontFamily:T.mono,fontSize:12,color:T.muted}}>
              <span style={{color:T.green,fontWeight:700}}>POST</span>
              <span>https://api.vantari.com.br/webhooks/whatsapp</span>
            </div>
            <p style={{fontSize:12,fontWeight:600,color:T.muted,margin:"8px 0 0",fontFamily:T.font}}>Configure este URL em Meta for Developers como Webhook URL. Verify token: <code style={{fontFamily:T.mono,background:T.faint,padding:"1px 5px",borderRadius:4}}>vantari_wh_token</code></p>
            <div style={{marginTop:8,fontSize:12,fontWeight:600,color:T.muted,fontFamily:T.font}}>Campos subscritos: <span style={{fontFamily:T.mono,color:T.teal}}>messages, message_status_updates, messaging_handovers</span></div>
          </Card>
        </div>
      )}

      {tab==="templates"&&(
        <div>
          <SectionHeader title="Templates Aprovados" subtitle="Mensagens pré-aprovadas pelo Meta" action={<Btn size="sm" icon={Plus}>Novo Template</Btn>}/>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {templates.map(tpl=>(
              <Card key={tpl.id}>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}>
                  <div>
                    <span style={{fontFamily:T.mono,fontSize:13,fontWeight:700,color:T.text}}>{tpl.name}</span>
                    <span style={{marginLeft:10,fontSize:11,fontWeight:600,color:T.muted,fontFamily:T.font}}>{tpl.category} · {tpl.language}</span>
                  </div>
                  <StatusBadge status={tpl.status}/>
                </div>
                <div style={{background:"#e8faf0",borderRadius:8,padding:"10px 14px",fontSize:13,fontWeight:600,color:"#065f46",borderLeft:`3px solid ${T.green}`,fontFamily:T.font}}>
                  {tpl.body}
                </div>
                <div style={{display:"flex",gap:8,marginTop:10}}>
                  <Btn size="sm" variant="secondary" icon={Pencil}>Editar</Btn>
                  <Btn size="sm" variant="ghost">Testar</Btn>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab==="history"&&(
        <div>
          <SectionHeader title="Histórico de Conversas" subtitle="Todas as mensagens por lead"/>
          <div style={{border:`0.5px solid ${T.border}`,borderRadius:10,overflow:"hidden"}}>
            {[{name:"Carlos Mendes",phone:"(11) 98001-2345",lastMsg:"Olá, gostaria de saber mais sobre os planos",time:ago(0.5),unread:2},{name:"Ana Costa",phone:"(21) 99876-5432",lastMsg:"Perfeito! Pode me enviar a proposta?",time:ago(2.1),unread:0},{name:"Roberto Lima",phone:"(31) 97654-3210",lastMsg:"Já recebi o eBook, muito obrigado!",time:ago(5.3),unread:0}].map((c,i)=>(
              <div key={c.phone} style={{display:"flex",alignItems:"center",gap:12,padding:"14px 16px",borderTop:i>0?`0.5px solid ${T.border}`:"none",cursor:"pointer",background:T.surface,transition:"background 0.1s"}}
                onMouseEnter={e=>e.currentTarget.style.background=T.faint}
                onMouseLeave={e=>e.currentTarget.style.background=T.surface}>
                <div style={{width:38,height:38,borderRadius:"50%",background:T.blueL,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:T.teal,fontFamily:T.head}}>
                  {c.name.split(" ").map(n=>n[0]).join("").slice(0,2)}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontSize:14,fontWeight:700,color:T.text,fontFamily:T.font}}>{c.name}</span>
                    <span style={{fontSize:11,fontWeight:600,color:T.muted,fontFamily:T.font}}>{fmtDate(c.time)}</span>
                  </div>
                  <div style={{fontSize:12,fontWeight:600,color:T.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:T.font}}>{c.lastMsg}</div>
                </div>
                {c.unread>0&&<span style={{width:20,height:20,borderRadius:"50%",background:T.green,color:"#fff",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{c.unread}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   VIEW: WEBHOOKS PERSONALIZADOS
═══════════════════════════════════════════════════════════ */
const WebhooksView = ({ integration, onBack }) => {
  const [endpoints,  setEndpoints]  = useState([
    {id:"wh_1",name:"CRM Interno",         url:"https://api.empresa.com/leads",                 active:true, events:["new_lead","score_change"],auth_type:"bearer",auth_value:"tok_●●●●●●●●",last_success:ago(0.8), last_status:200,retries:0,total_sent:284},
    {id:"wh_2",name:"Slack Notificações",  url:"https://hooks.slack.com/services/XXX/YYY/ZZZ", active:false,events:["new_lead"],                auth_type:"none",  auth_value:"",            last_success:ago(12),  last_status:404,retries:3,total_sent:47 },
  ]);
  const [showNew,    setShowNew]    = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [newEp,      setNewEp]      = useState({name:"",url:"",events:[],auth_type:"none",auth_value:""});

  const EVENTS = [
    {id:"new_lead",      label:"Novo Lead",         desc:"Quando um lead é criado"          },
    {id:"score_change",  label:"Score Alterado",     desc:"Quando o score muda >=10 pts"     },
    {id:"stage_change",  label:"Stage Mudou",        desc:"Quando o funil avança"            },
    {id:"lead_qualified",label:"Lead Qualificado",   desc:"Quando atinge MQL/SQL"            },
  ];
  const EXAMPLE_PAYLOAD = JSON.stringify({event:"new_lead",timestamp:new Date().toISOString(),data:{id:"lead_001",name:"Carlos Mendes",email:"carlos@empresa.com",score:74,stage:"MQL",source:"Meta Ads"}},null,2);

  const handleTest = (ep) => {
    setTestResult({loading:true});
    setTimeout(()=>setTestResult({success:true,status:200,time:143,ep:ep.id}),1500);
  };

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
        <Btn size="sm" variant="ghost" icon="←" onClick={onBack}>Voltar</Btn>
        <div style={{width:36,height:36,borderRadius:8,background:T.purpleL,display:"flex",alignItems:"center",justifyContent:"center"}}>{PROVIDERS.webhook.icon()}</div>
        <h2 style={{margin:0,fontSize:17,fontWeight:700,color:T.text,fontFamily:T.head}}>Webhooks Personalizados</h2>
        <div style={{marginLeft:"auto"}}>
          <Btn icon={Plus} onClick={()=>setShowNew(!showNew)}>Novo Endpoint</Btn>
        </div>
      </div>

      {showNew&&(
        <Card style={{marginBottom:20,border:`0.5px solid ${T.teal}40`,background:T.blueL}}>
          <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:14,fontFamily:T.font}}>Novo Endpoint</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:12}}>
            <Input label="Nome" value={newEp.name} onChange={v=>setNewEp({...newEp,name:v})} placeholder="Ex: Meu CRM"/>
            <Input label="URL" value={newEp.url} onChange={v=>setNewEp({...newEp,url:v})} mono placeholder="https://..."/>
          </div>
          <div style={{marginBottom:14}}>
            <label style={{display:"block",fontSize:12,fontWeight:700,color:T.muted,marginBottom:6,textTransform:"uppercase",fontFamily:T.font}}>Eventos</label>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {EVENTS.map(ev=>(
                <label key={ev.id} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",border:`0.5px solid ${newEp.events.includes(ev.id)?T.teal:T.border}`,borderRadius:20,cursor:"pointer",fontSize:12,fontWeight:700,background:newEp.events.includes(ev.id)?T.blueL:T.surface,color:newEp.events.includes(ev.id)?T.teal:T.text,fontFamily:T.font}}>
                  <input type="checkbox" checked={newEp.events.includes(ev.id)} onChange={e=>setNewEp({...newEp,events:e.target.checked?[...newEp.events,ev.id]:newEp.events.filter(i=>i!==ev.id)})} style={{display:"none"}}/>
                  {ev.label}
                </label>
              ))}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 2fr",gap:12,alignItems:"end"}}>
            <Select label="Autenticação" value={newEp.auth_type} onChange={v=>setNewEp({...newEp,auth_type:v})} options={[{value:"none",label:"Sem autenticação"},{value:"bearer",label:"Bearer Token"},{value:"api_key",label:"API Key Header"},{value:"basic",label:"Basic Auth"}]}/>
            {newEp.auth_type!=="none"&&<Input label="Valor" value={newEp.auth_value} onChange={v=>setNewEp({...newEp,auth_value:v})} mono/>}
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn>Salvar Endpoint</Btn>
            <Btn variant="secondary" onClick={()=>setShowNew(false)}>Cancelar</Btn>
          </div>
        </Card>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:24}}>
        {endpoints.map(ep=>(
          <Card key={ep.id}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                  <span style={{fontSize:14,fontWeight:700,color:T.text,fontFamily:T.font}}>{ep.name}</span>
                  <StatusBadge status={ep.active?"connected":"disconnected"}/>
                  {ep.last_status!==200&&<span style={{fontSize:11,fontWeight:700,color:T.red,background:T.redL,padding:"1px 6px",borderRadius:4}}>HTTP {ep.last_status}</span>}
                </div>
                <div style={{fontFamily:T.mono,fontSize:12,fontWeight:600,color:T.muted,marginBottom:6}}>{ep.url}</div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {ep.events.map(ev=><span key={ev} style={{fontSize:11,fontWeight:700,color:T.purple,background:T.purpleL,padding:"2px 8px",borderRadius:10,fontFamily:T.font}}>{ev}</span>)}
                </div>
              </div>
              <div style={{textAlign:"right",fontSize:11,fontWeight:600,color:T.muted,fontFamily:T.font}}>
                <div>{ep.total_sent} enviados</div>
                {ep.retries>0&&<div style={{color:T.amber,fontWeight:700}}>{ep.retries} retentativas</div>}
                <div style={{marginTop:4}}>Último: {fmtDate(ep.last_success)}</div>
              </div>
            </div>
            <Divider/>
            <div style={{display:"flex",gap:8}}>
              <Btn size="sm" variant="secondary" onClick={()=>handleTest(ep)} icon="▷">Testar</Btn>
              <Btn size="sm" variant="ghost" icon={ClipboardList}>Ver Logs</Btn>
              <Btn size="sm" variant="ghost" icon={Pencil}>Editar</Btn>
              <Btn size="sm" variant="danger" icon={ep.active?Pause:Play}>{ep.active?"Pausar":"Ativar"}</Btn>
            </div>
            {testResult&&testResult.ep===ep.id&&(
              <div style={{marginTop:10,padding:"10px 14px",background:testResult.loading?T.faint:(testResult.success?T.greenL:T.redL),borderRadius:8,fontSize:12,fontWeight:700,color:testResult.loading?T.muted:(testResult.success?"#065f46":T.red),fontFamily:T.font,display:"flex",alignItems:"center",gap:6}}>
                {testResult.loading?"Enviando payload de teste...":<><CheckCircle2 size={13} color="#065f46" aria-hidden="true"/> Sucesso — HTTP 200 em {testResult.time}ms</>}
              </div>
            )}
          </Card>
        ))}
      </div>

      <Card>
        <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:10,fontFamily:T.font}}>Exemplo de Payload</div>
        <pre style={{margin:0,fontFamily:T.mono,fontSize:11,color:"#1e293b",background:T.faint,padding:14,borderRadius:8,border:`0.5px solid ${T.border}`,overflow:"auto",lineHeight:1.6}}>{EXAMPLE_PAYLOAD}</pre>
        <p style={{fontSize:12,fontWeight:600,color:T.muted,marginTop:8,fontFamily:T.font}}>Este payload é enviado via POST com Content-Type: application/json. O header X-Vantari-Signature contém o HMAC-SHA256 para verificação.</p>
      </Card>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   VIEW: MAPEAMENTO DE CAMPOS
═══════════════════════════════════════════════════════════ */
const FieldMappingView = ({ onBack }) => {
  const [provider,  setProvider]  = useState("meta");
  const [mappings,  setMappings]  = useState({...DB.field_mappings});

  const TRANSFORMS     = [{value:"none",label:"Nenhuma"},{value:"lowercase",label:"Minúsculas"},{value:"uppercase",label:"Maiúsculas"},{value:"format_phone",label:"Formatar Telefone"},{value:"clean_email",label:"Limpar Email"},{value:"trim",label:"Remover Espaços"},{value:"capitalize",label:"Capitalizar"}];
  const INTERNAL_FIELDS= ["name","email","phone","company","source","utm_campaign","utm_medium","utm_source","utm_term","utm_gclid","notes"];
  const sample = DB.external_leads.find(l=>l.source===(provider==="meta"?"meta_form":"google_ads"));

  const preview = useMemo(()=>{
    if(!sample) return {};
    const m=mappings[provider]||[];const result={};
    m.forEach(mp=>{
      let val=sample.raw_data[mp.external_field]||"";
      if(mp.transform==="lowercase") val=val.toLowerCase?.()||val;
      if(mp.transform==="uppercase") val=val.toUpperCase?.()||val;
      if(mp.transform==="capitalize") val=val.split?.(" ").map(w=>w[0]?.toUpperCase()+w.slice(1)).join(" ")||val;
      result[mp.internal_field]=val;
    });
    return result;
  },[mappings,provider,sample]);

  const updateMap  = (idx,field,val)=>{const u=[...mappings[provider]];u[idx]={...u[idx],[field]:val};setMappings({...mappings,[provider]:u});};
  const addMap     = ()=>setMappings({...mappings,[provider]:[...(mappings[provider]||[]),{id:`fm_${Date.now()}`,external_field:"",internal_field:"",transform:"none",required:false}]});
  const removeMap  = (idx)=>setMappings({...mappings,[provider]:mappings[provider].filter((_,i)=>i!==idx)});

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
        <Btn size="sm" variant="ghost" icon="←" onClick={onBack}>Voltar</Btn>
        <h2 style={{margin:0,fontSize:17,fontWeight:700,color:T.text,fontFamily:T.head}}>Mapeamento de Campos</h2>
      </div>
      <div style={{display:"flex",gap:8,marginBottom:20}}>
        {["meta","google"].map(p=>(
          <button key={p} onClick={()=>setProvider(p)} style={{padding:"7px 18px",border:`0.5px solid ${provider===p?T.teal:T.border}`,borderRadius:20,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:T.font,background:provider===p?T.blueL:T.surface,color:provider===p?T.teal:T.muted}}>
            {p==="meta"?"Meta Ads":"Google Ads"}
          </button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:12,fontFamily:T.font}}>Mapeamentos</div>
          <div style={{border:`0.5px solid ${T.border}`,borderRadius:10,overflow:"hidden",marginBottom:12}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto",padding:"8px 12px",background:T.faint,fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",gap:8,fontFamily:T.font}}>
              <span>Campo Externo</span><span>Campo Interno</span><span>Transformação</span><span>Req</span>
            </div>
            {(mappings[provider]||[]).map((m,i)=>(
              <div key={m.id} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto",gap:6,padding:"8px 10px",borderTop:`0.5px solid ${T.border}`,alignItems:"center"}}>
                <input value={m.external_field} onChange={e=>updateMap(i,"external_field",e.target.value)} style={{padding:"5px 8px",border:`0.5px solid ${T.border}`,borderRadius:6,fontSize:12,fontFamily:T.mono,background:T.surface,color:T.text,outline:"none"}}/>
                <select value={m.internal_field} onChange={e=>updateMap(i,"internal_field",e.target.value)} style={{padding:"5px 8px",border:`0.5px solid ${T.border}`,borderRadius:6,fontSize:12,fontFamily:T.font,background:T.surface,color:T.text,outline:"none"}}>
                  {INTERNAL_FIELDS.map(f=><option key={f} value={f}>{f}</option>)}
                </select>
                <select value={m.transform} onChange={e=>updateMap(i,"transform",e.target.value)} style={{padding:"5px 8px",border:`0.5px solid ${T.border}`,borderRadius:6,fontSize:11,background:T.surface,color:T.text,outline:"none"}}>
                  {TRANSFORMS.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <div style={{display:"flex",alignItems:"center",gap:4}}>
                  <input type="checkbox" checked={m.required} onChange={e=>updateMap(i,"required",e.target.checked)} style={{accentColor:T.teal}}/>
                  <button onClick={()=>removeMap(i)} style={{background:"none",border:"none",cursor:"pointer",color:T.red,padding:"2px 4px",display:"flex",alignItems:"center"}}>
                    <X size={13} color={T.red} aria-hidden="true"/>
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn size="sm" variant="secondary" icon="+" onClick={addMap}>Adicionar Campo</Btn>
            <Btn size="sm">Salvar Mapeamento</Btn>
          </div>
        </div>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:12,fontFamily:T.font}}>Preview — Dados Mapeados</div>
          {sample&&(
            <>
              <Card style={{marginBottom:10,background:T.faint}}>
                <div style={{fontSize:11,fontWeight:700,color:T.muted,marginBottom:8,textTransform:"uppercase",fontFamily:T.font}}>Dados Brutos (Entrada)</div>
                <pre style={{margin:0,fontFamily:T.mono,fontSize:11,color:T.text,lineHeight:1.5,whiteSpace:"pre-wrap"}}>{JSON.stringify(sample.raw_data,null,2)}</pre>
              </Card>
              <Card style={{background:T.greenL,border:`0.5px solid ${T.green}30`}}>
                <div style={{fontSize:11,fontWeight:700,color:"#065f46",marginBottom:8,textTransform:"uppercase",fontFamily:T.font}}>Dados Mapeados (Saída)</div>
                <pre style={{margin:0,fontFamily:T.mono,fontSize:11,color:"#065f46",lineHeight:1.5,whiteSpace:"pre-wrap"}}>{JSON.stringify(preview,null,2)}</pre>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   VIEW: LOGS GLOBAIS
═══════════════════════════════════════════════════════════ */
const LogsView = ({ onBack }) => {
  const [filter,         setFilter]         = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const logs   = DB.integration_logs.filter(l=>filter==="all"||l.status===filter).filter(l=>providerFilter==="all"||l.provider===providerFilter).sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
  const counts = {total:DB.integration_logs.length,success:DB.integration_logs.filter(l=>l.status==="success").length,error:DB.integration_logs.filter(l=>l.status==="error").length,warning:DB.integration_logs.filter(l=>l.status==="warning").length};

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <Btn size="sm" variant="ghost" icon="←" onClick={onBack}>Voltar</Btn>
        <h2 style={{margin:0,fontSize:17,fontWeight:700,color:T.text,fontFamily:T.head}}>Logs de Sincronização</h2>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20}}>
        {[{label:"Total",v:counts.total,color:T.teal},{label:"Sucesso",v:counts.success,color:T.green},{label:"Erros",v:counts.error,color:T.red},{label:"Avisos",v:counts.warning,color:T.amber}].map(s=>(
          <div key={s.label} style={{background:T.surface,border:`0.5px solid ${T.border}`,borderLeft:`3px solid ${s.color}`,borderRadius:10,padding:"12px 16px",textAlign:"center"}}>
            <div style={{fontSize:22,fontWeight:700,color:s.color,fontFamily:T.head}}>{s.v}</div>
            <div style={{fontSize:12,fontWeight:600,color:T.muted,fontFamily:T.font}}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        <select value={filter} onChange={e=>setFilter(e.target.value)} style={{padding:"7px 12px",border:`0.5px solid ${T.border}`,borderRadius:8,fontSize:13,fontWeight:600,background:T.surface,fontFamily:T.font,color:T.text,outline:"none"}}>
          <option value="all">Todos os status</option>
          <option value="success">Sucesso</option>
          <option value="error">Erro</option>
          <option value="warning">Aviso</option>
        </select>
        <select value={providerFilter} onChange={e=>setProviderFilter(e.target.value)} style={{padding:"7px 12px",border:`0.5px solid ${T.border}`,borderRadius:8,fontSize:13,fontWeight:600,background:T.surface,fontFamily:T.font,color:T.text,outline:"none"}}>
          <option value="all">Todos os providers</option>
          <option value="meta">Meta</option>
          <option value="google">Google</option>
          <option value="webhook">Webhook</option>
        </select>
        <Btn size="sm" variant="secondary" icon="↻">Atualizar</Btn>
        <Btn size="sm" variant="ghost" icon={Download} style={{marginLeft:"auto"}}>Exportar CSV</Btn>
      </div>
      <div style={{background:T.surface,border:`0.5px solid ${T.border}`,borderRadius:10,padding:"0 16px"}}>
        {logs.map(log=><LogRow key={log.id} log={log}/>)}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function VantariIntegrationsHub() {
  const [view,                setView]               = useState("hub");
  const [selectedIntegration, setSelectedIntegration]= useState(null);
  const integrations = DB.integrations;
  const extLeads     = DB.external_leads;
  const pendingLeads = extLeads.filter(l=>!l.processed).length;

  const openIntegration = (integration) => {
    setSelectedIntegration(integration);
    setView(integration.provider==="webhook"?"webhook":integration.provider);
  };
  const goBack = () => { setView("hub");setSelectedIntegration(null); };

  return (
    <div style={{display:"flex",height:"100vh",background:T.bg,fontFamily:T.font,overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');
        *, *::before, *::after { box-sizing:border-box; }
        body { margin:0; }
        ::-webkit-scrollbar { width:6px; height:6px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:#B3BFCA; border-radius:99px; }
        select, input { font-family:${T.font}; }
      `}</style>

      {/* ── SIDEBAR ── */}
      <div style={{
        width: 240,
        background: T.sidebarBg,
        display:"flex", flexDirection:"column", flexShrink:0,
        position:"relative", overflow:"hidden",
      }}>
        {/* glow topo-direito */}
        <div style={{
          position:"absolute", inset:0, pointerEvents:"none",
          background:"radial-gradient(circle at 90% 0%, rgba(20,162,115,.25) 0%, transparent 50%)",
        }}/>

        {/* Brand */}
        <div style={{padding:"20px 20px 0", position:"relative"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,paddingBottom:20,borderBottom:"1px solid rgba(255,255,255,.08)",marginBottom:16}}>
            <div style={{width:32,height:32,background:"white",borderRadius:8,display:"grid",placeItems:"center",flexShrink:0}}>
              <img src="/icone.png" alt="" style={{width:22,height:22}}/>
            </div>
            <span style={{fontFamily:T.head,fontSize:18,fontWeight:700,letterSpacing:"-0.02em",color:"white"}}>vantari</span>
            <span style={{marginLeft:"auto",fontSize:10,background:"rgba(255,255,255,.12)",padding:"3px 8px",borderRadius:6,letterSpacing:"0.08em",fontWeight:600,color:"rgba(255,255,255,.85)"}}>PRO</span>
          </div>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"0 0 8px",position:"relative"}}>
          <NavSection label="Principal"/>
          <NavItem icon={BarChart2}      label="Analytics"      path="/dashboard"    />
          <NavItem icon={Users}          label="Leads"          path="/leads"        />
          <NavItem icon={Mail}           label="Email Marketing" path="/email"       />
          <NavSection label="Ferramentas"/>
          <NavItem icon={Star}           label="Scoring"        path="/scoring"      />
          <NavItem icon={LayoutTemplate} label="Landing Pages"  path="/landing"      />
          <NavItem icon={Bot}            label="IA & Automação" path="/ai-marketing" />
          <NavSection label="Sistema"/>
          <NavItem icon={Plug}           label="Integrações"    path="/integrations" active/>
        </div>
        <div style={{borderTop:"1px solid rgba(255,255,255,0.08)",padding:"8px 0",position:"relative"}}>
          <NavItem icon={Settings} label="Configurações" path="/settings"/>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

        {/* Topbar */}
        <div style={{height:56,background:T.surface,borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px",flexShrink:0,zIndex:10}}>
          <span style={{fontSize:18,fontWeight:700,color:T.ink,fontFamily:T.head,letterSpacing:"-0.02em"}}>Integrações</span>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {pendingLeads>0&&(
              <div style={{padding:"4px 10px",background:T.amberL,border:`0.5px solid ${T.amber}40`,borderRadius:20,fontSize:12,fontWeight:700,color:"#92400e",fontFamily:T.font}}>
                {pendingLeads} leads pendentes
              </div>
            )}
            <Btn size="sm" variant="secondary" icon={ArrowLeftRight} onClick={()=>setView("mapping")}>Mapeamento</Btn>
            <Btn size="sm" variant="secondary" icon={ClipboardList}  onClick={()=>setView("logs")}>Logs</Btn>
          </div>
        </div>

        {/* Content */}
        <div style={{flex:1,overflowY:"auto",padding:"28px",maxWidth:1100,margin:"0 auto",width:"100%",background:"#F5F8FB"}}>

          {view==="hub"&&(
            <div>
              <SectionHeader title="Central de Integrações" subtitle="Conecte e gerencie suas plataformas de aquisição e comunicação" action={<Btn icon="↻">Sync Geral</Btn>}/>

              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:28}}>
                {[
                  {label:"Plataformas Conectadas", value:`${integrations.filter(i=>i.status==="connected").length}/${integrations.length}`, color:T.teal },
                  {label:"Leads Importados Hoje",   value:extLeads.length,                                                                   color:T.green},
                  {label:"Pendentes de Processar",  value:pendingLeads,                                                                      color:T.amber},
                  {label:"Falhas nas Últimas 24h",  value:DB.integration_logs.filter(l=>l.status==="error").length,                         color:T.red  },
                ].map(s=>(
                  <div key={s.label} style={{background:T.surface,border:`0.5px solid ${T.border}`,borderLeft:`3px solid ${s.color}`,borderRadius:10,padding:"14px 18px"}}>
                    <div style={{fontSize:24,fontWeight:700,color:s.color,lineHeight:1,fontFamily:T.head}}>{s.value}</div>
                    <div style={{fontSize:12,fontWeight:600,color:T.muted,marginTop:4,fontFamily:T.font}}>{s.label}</div>
                  </div>
                ))}
              </div>

              <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:16,marginBottom:28}}>
                {integrations.map(i=><IntegrationCard key={i.id} integration={i} onOpen={openIntegration}/>)}
              </div>

              <div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                  <h3 style={{margin:0,fontSize:14,fontWeight:700,color:T.text,fontFamily:T.head}}>Atividade Recente</h3>
                  <Btn size="sm" variant="ghost" onClick={()=>setView("logs")}>Ver todos →</Btn>
                </div>
                <div style={{background:T.surface,border:`0.5px solid ${T.border}`,borderRadius:10,padding:"0 16px"}}>
                  {DB.integration_logs.slice(0,8).map(log=><LogRow key={log.id} log={log}/>)}
                </div>
              </div>
            </div>
          )}

          {view==="meta"      &&<MetaView       integration={selectedIntegration} onBack={goBack}/>}
          {view==="google"    &&<GoogleView     integration={selectedIntegration} onBack={goBack}/>}
          {view==="whatsapp"  &&<WhatsAppView   integration={selectedIntegration} onBack={goBack}/>}
          {view==="webhook"   &&<WebhooksView   integration={selectedIntegration} onBack={goBack}/>}
          {view==="mapping"   &&<FieldMappingView onBack={goBack}/>}
          {view==="logs"      &&<LogsView       onBack={goBack}/>}
        </div>
      </div>
    </div>
  );
}
