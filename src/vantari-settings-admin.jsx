import { useState, useEffect, useRef, useCallback } from "react";
import { useSidebarCollapsed } from "./sidebar-collapsed";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabase";
import {
  BarChart2, Users, Mail, Star, LayoutTemplate, Bot, Plug, Settings,
  Building2, CreditCard, ClipboardList, Headphones, Zap, Sparkles,
  Save, Send, Key, Package, RefreshCw, Download, FileText, Plus,
  FolderOpen, HelpCircle, CheckCircle, BookOpen, Play, MessageSquare,
  Loader2, AlertTriangle, ArrowUp, ArrowDown, Kanban,
  Database, Edit3, Trash2, Search, X, Copy as CopyIcon,
  Activity, Globe, Filter,
  ChevronLeft, ChevronRight, LogOut,
} from "lucide-react";

import { IdCard } from "lucide-react";
import { Briefcase } from "lucide-react";
import { ListChecks } from "lucide-react";
import { Inbox } from "lucide-react";
import { FileBarChart } from "lucide-react";
/* ═══════════════════════════════════════════════════════════
   DATABASE SCHEMA (Supabase-compatible)
   ─────────────────────────────────────────────────────────
   TABLE: workspace_settings
     id            uuid primary key default gen_random_uuid()
     workspace_id  uuid references workspaces(id) on delete cascade
     key           text not null
     value         jsonb not null
     updated_at    timestamptz default now()
     updated_by    uuid references users(id)
     UNIQUE(workspace_id, key)

   TABLE: user_permissions
     id            uuid primary key default gen_random_uuid()
     user_id       uuid references users(id) on delete cascade
     workspace_id  uuid references workspaces(id) on delete cascade
     resource      text not null   -- 'campaigns','leads','integrations','billing','settings'
     actions       text[]          -- ['view','create','edit','delete','manage']
     granted_by    uuid references users(id)
     created_at    timestamptz default now()
     UNIQUE(user_id, workspace_id, resource)

   TABLE: billing_usage
     id            uuid primary key default gen_random_uuid()
     workspace_id  uuid references workspaces(id) on delete cascade
     metric        text not null   -- 'leads_stored','emails_sent','api_calls','contacts_enriched'
     count         bigint default 0
     period        text not null   -- '2025-05'
     updated_at    timestamptz default now()
     UNIQUE(workspace_id, metric, period)

   TABLE: audit_logs
     id            uuid primary key default gen_random_uuid()
     workspace_id  uuid references workspaces(id) on delete cascade
     user_id       uuid references users(id)
     action        text not null
     resource      text not null
     resource_id   text
     details       jsonb
     ip_address    inet
     timestamp     timestamptz default now()

   TABLE: team_members
     id            uuid primary key default gen_random_uuid()
     workspace_id  uuid references workspaces(id) on delete cascade
     user_id       uuid references users(id)
     email         text not null
     name          text
     role          text not null default 'user'
     status        text default 'active'
     invited_by    uuid references users(id)
     joined_at     timestamptz
     last_active   timestamptz
     UNIQUE(workspace_id, email)

   TABLE: api_keys
     id            uuid primary key default gen_random_uuid()
     workspace_id  uuid references workspaces(id) on delete cascade
     name          text not null
     key_hash      text not null unique
     key_prefix    text not null
     scopes        text[]
     last_used_at  timestamptz
     expires_at    timestamptz
     created_by    uuid references users(id)
     created_at    timestamptz default now()
     revoked_at    timestamptz

   TABLE: webhook_endpoints
     id            uuid primary key default gen_random_uuid()
     workspace_id  uuid references workspaces(id) on delete cascade
     name          text not null
     url           text not null
     secret        text not null
     events        text[]
     enabled       bool default true
     last_triggered timestamptz
     fail_count    int default 0
     created_at    timestamptz default now()
═══════════════════════════════════════════════════════════ */

/* ───── DESIGN TOKENS — mirrors vantari-analytics-dashboard ───── */
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
  purple:  "#7C5CFF",

  // Surfaces & ink
  bg:      "#F5F8FB",
  surface: "#FFFFFF",
  border:  "#E8EEF3",

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
};

/* ───── MOCK DATA ───── */
const MOCK_MEMBERS = [
  { id:"u1", name:"Ana Costa",      email:"ana@empresa.com.br",   role:"admin",   status:"active",    lastActive:"agora", avatar:"AC", joined:"Jan 2024" },
  { id:"u2", name:"Bruno Lima",     email:"bruno@empresa.com.br", role:"manager", status:"active",    lastActive:"2h",    avatar:"BL", joined:"Mar 2024" },
  { id:"u3", name:"Carla Mendes",   email:"carla@empresa.com.br", role:"user",    status:"active",    lastActive:"1d",    avatar:"CM", joined:"Mai 2024" },
  { id:"u4", name:"Diego Ferreira", email:"diego@empresa.com.br", role:"user",    status:"invited",   lastActive:"—",     avatar:"DF", joined:"—" },
  { id:"u5", name:"Elena Souza",    email:"elena@empresa.com.br", role:"manager", status:"suspended", lastActive:"7d",    avatar:"ES", joined:"Fev 2024" },
];

const MOCK_AUDIT = [];

const MOCK_USAGE = {
  leads_stored:      { used:0, limit:5000,   label:"Leads Armazenados",     Icon:Users,    color:T.teal   },
  emails_sent:       { used:0, limit:25000,  label:"Emails Enviados",       Icon:Mail,     color:T.teal   },
  api_calls:         { used:0, limit:100000, label:"Chamadas de API",       Icon:Zap,      color:T.violet },
  contacts_enriched: { used:0, limit:1000,   label:"Contatos Enriquecidos", Icon:Sparkles, color:T.green  },
};

const MOCK_KEYS = [];

const MOCK_WEBHOOKS = [];

const MOCK_INVOICES = [];

const TABS = [
  { id:"workspace",    Icon:Building2,     label:"Workspace"             },
  { id:"team",         Icon:Users,         label:"Equipe"                },
  { id:"pipelines",    Icon:Kanban,        label:"Pipelines"             },
  { id:"customfields", Icon:Database,      label:"Campos Personalizados" },
  { id:"tracking",     Icon:Activity,      label:"Lead Tracking"         },
  { id:"email",        Icon:Mail,          label:"Email"                 },
  { id:"billing",      Icon:CreditCard,    label:"Billing"               },
  { id:"advanced",     Icon:Settings,      label:"Avançado"              },
  { id:"audit",        Icon:ClipboardList, label:"Audit Log"             },
  { id:"support",      Icon:Headphones,    label:"Suporte"               },
];

const FUNNEL_OPTIONS = [
  { value:"topo",          label:"Topo de Funil",   color:"#06B6D4" },
  { value:"meio",          label:"Meio de Funil",   color:"#F59E0B" },
  { value:"fundo",         label:"Fundo de Funil",  color:"#14A273" },
  { value:"institucional", label:"Institucional",   color:"#7C5CFF" },
  { value:"outro",         label:"Outro",           color:"#8696A5" },
];

/* ═══════════════════════════════════════════════════════════
   CONSTANTES — Campos Personalizados
═══════════════════════════════════════════════════════════ */
const FIELD_TYPES = [
  { value:"text",        label:"Texto"          },
  { value:"textarea",    label:"Texto longo"    },
  { value:"email",       label:"Email"          },
  { value:"phone",       label:"Telefone"       },
  { value:"url",         label:"URL"            },
  { value:"number",      label:"Número"         },
  { value:"date",        label:"Data"           },
  { value:"datetime",    label:"Data e hora"    },
  { value:"select",      label:"Lista (1 opção)"},
  { value:"multiselect", label:"Lista múltipla" },
  { value:"radio",       label:"Radio"          },
  { value:"checkbox",    label:"Checkbox"       },
];

const FIELD_SOURCES = [
  { value:"manual",     label:"Manual",          color:"#0D7491" },
  { value:"crm_sync",   label:"Sync CRM",        color:"#7C5CFF" },
  { value:"fb_forms",   label:"Meta Lead Ads",   color:"#1F76BC" },
  { value:"google_ads", label:"Google Ads",      color:"#F59E0B" },
  { value:"imported",   label:"Importação",      color:"#06B6D4" },
  { value:"system",     label:"Sistema",         color:"#8696A5" },
];

const slugifyApiId = (label) =>
  "cf_" + (label||"")
    .normalize("NFD").replace(/[̀-ͯ]/g,"")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,"_")
    .replace(/^_+|_+$/g,"")
    .slice(0, 60);

const PERMISSIONS = { campaigns:"Campanhas", leads:"Leads", integrations:"Integrações", analytics:"Analytics", billing:"Billing", settings:"Configurações" };
const ROLE_DEFAULTS = {
  admin:   { campaigns:["view","create","edit","delete","manage"], leads:["view","create","edit","delete","manage"], integrations:["view","create","edit","delete","manage"], analytics:["view","manage"], billing:["view","manage"], settings:["view","manage"] },
  manager: { campaigns:["view","create","edit"], leads:["view","create","edit","delete"], integrations:["view","create"], analytics:["view"], billing:["view"], settings:["view"] },
  user:    { campaigns:["view"], leads:["view","create","edit"], integrations:["view"], analytics:["view"], billing:[], settings:[] },
};
const SCOPE_OPTIONS = ["read:leads","write:leads","read:campaigns","write:campaigns","read:analytics","webhooks","manage:settings"];

/* ───── UTILS ───── */
const pct = (u,l) => Math.min(Math.round((u/l)*100),100);
const fmt = n => n>=1000?(n/1000).toFixed(1)+"k":String(n);
const avatarBg = s => { const p=[T.blue,T.teal,T.green,T.purple,"#E91E8C",T.orange]; let h=0; for(const c of s)h=(h*31+c.charCodeAt(0))%p.length; return p[h]; };

const WORKSPACE_VANTARI = "53092199-7b75-4342-a897-f589d6f34922";

/* log de auditoria real — nunca lança erro pro chamador, só registra em console se falhar */
async function logAudit({ action, resource, resource_id, details }) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from("audit_logs").insert({
      workspace_id: WORKSPACE_VANTARI,
      user_email: userData?.user?.email || null,
      action, resource, resource_id: resource_id != null ? String(resource_id) : null,
      details: details || null,
    });
  } catch (e) { console.error("logAudit failed", e); }
}

/* banner de aviso — usado em abas que ainda dependem de sistema externo (Stripe, helpdesk) */
const PreviewBanner = ({ children }) => (
  <div style={{display:"flex",gap:8,alignItems:"flex-start",padding:"10px 14px",marginBottom:16,background:"#fef3c7",border:`0.5px solid ${T.amber}50`,borderRadius:10,fontSize:12.5,fontWeight:600,color:"#92400e",fontFamily:T.font}}>
    <AlertTriangle size={14} color={T.amber} style={{flexShrink:0,marginTop:1}} aria-hidden="true"/>
    <span>{children}</span>
  </div>
);

/* ───── TOAST ───── */
const useToast = () => {
  const [toasts,setToasts] = useState([]);
  const push = useCallback((msg,type="success") => { const id=Date.now(); setToasts(t=>[...t,{id,msg,type}]); setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),3500); },[]);
  return { toasts, push };
};
const Toasts = ({toasts}) => (
  <div style={{position:"fixed",bottom:24,right:24,zIndex:9999,display:"flex",flexDirection:"column",gap:8}}>
    {toasts.map(t=>(
      <div key={t.id} style={{padding:"11px 18px",borderRadius:10,fontSize:13,fontWeight:600,color:"#fff",background:t.type==="success"?T.green:t.type==="error"?T.coral:T.teal,boxShadow:"0 4px 20px rgba(0,0,0,0.14)",fontFamily:T.font,animation:"toastIn 0.25s ease"}}>{t.msg}</div>
    ))}
  </div>
);

/* ───── BASE COMPONENTS — same spec as analytics-dashboard ───── */
const Btn = ({children,onClick,variant="primary",size="sm",icon,disabled,style:sx={},...rest}) => {
  const [hov,setHov] = useState(false);
  const v = {
    primary:  {bg:hov?"linear-gradient(135deg, #0A5F7A 0%, #108A60 100%)":"linear-gradient(135deg, #0D7491 0%, #14A273 100%)",color:"#fff",border:"none",shadow:hov?"0 8px 22px -6px rgba(13,116,145,.5)":"0 4px 14px -4px rgba(13,116,145,.4)"},
    secondary:{bg:hov?`${T.teal}14`:"#fff",color:T.teal,border:`1.5px solid ${T.teal}`,shadow:"none"},
    ghost:    {bg:hov?"#EEF2F6":"transparent",color:T.text,border:"none",shadow:"none"},
    danger:   {bg:hov?"#e04d42":T.coral,color:"#fff",border:"none",shadow:"none"},
    success:  {bg:hov?"#108A60":T.green,color:"#fff",border:"none",shadow:"none"},
    outline:  {bg:"transparent",color:T.muted,border:`1.5px solid ${T.border}`,shadow:"none"},
  }[variant]||{};
  const pad={xs:"4px 8px",sm:"7px 14px",md:"9px 18px",lg:"11px 22px"}[size];
  const fs={xs:10,sm:12,md:13,lg:14}[size];
  return <button onClick={onClick} disabled={disabled} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{display:"inline-flex",alignItems:"center",gap:6,background:v.bg,color:v.color,border:v.border||"none",borderRadius:10,padding:pad,fontSize:fs,fontWeight:700,fontFamily:T.font,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.5:1,boxShadow:v.shadow,transition:"all 0.15s",whiteSpace:"nowrap",...sx}} {...rest}>{icon&&<span style={{fontSize:fs+1}}>{icon}</span>}{children}</button>;
};

const Card = ({children,style:s={}}) => <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,padding:20,boxShadow:"0 1px 0 rgba(14,26,36,.03), 0 8px 24px -16px rgba(14,26,36,.08)",...s}}>{children}</div>;

const SectionTitle = ({children,sub}) => <div style={{marginBottom:16}}><h2 style={{fontSize:15,fontWeight:700,color:T.ink,fontFamily:T.head,margin:0,letterSpacing:"-0.01em"}}>{children}</h2>{sub&&<p style={{fontSize:12,color:T.muted,margin:"4px 0 0",fontFamily:T.font,fontWeight:500}}>{sub}</p>}</div>;

const Badge = ({children,color=T.blue,bg}) => <span style={{display:"inline-block",background:bg||`${color}18`,color,border:`1px solid ${color}30`,borderRadius:20,padding:"2px 9px",fontSize:11,fontWeight:600,fontFamily:T.font}}>{children}</span>;

const FL = ({children}) => <div style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6,fontFamily:T.head}}>{children}</div>;

const Input = ({label,value,onChange,type="text",placeholder,hint,disabled}) => (
  <div style={{display:"flex",flexDirection:"column",gap:6}}>
    {label&&<FL>{label}</FL>}
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
      style={{padding:"9px 12px",borderRadius:8,border:`1.5px solid ${T.border}`,fontSize:13,color:T.text,background:disabled?T.faint:"#fff",outline:"none",fontFamily:T.font,transition:"border 0.15s",width:"100%",boxSizing:"border-box"}}
      onFocus={e=>e.target.style.borderColor=T.teal} onBlur={e=>e.target.style.borderColor=T.border}/>
    {hint&&<span style={{fontSize:11,color:T.muted,fontFamily:T.font}}>{hint}</span>}
  </div>
);

const Sel = ({label,value,onChange,options}) => (
  <div style={{display:"flex",flexDirection:"column",gap:6}}>
    {label&&<FL>{label}</FL>}
    <select value={value} onChange={onChange} style={{padding:"9px 12px",borderRadius:8,border:`1.5px solid ${T.border}`,fontSize:13,color:T.text,background:"#fff",outline:"none",fontFamily:T.font,cursor:"pointer"}}>
      {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const Toggle = ({checked,onChange,label}) => (
  <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
    <div onClick={()=>onChange(!checked)} style={{width:38,height:21,borderRadius:11,background:checked?T.green:"#d1d5db",position:"relative",transition:"background 0.2s",flexShrink:0}}>
      <div style={{width:15,height:15,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:checked?20:3,transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
    </div>
    {label&&<span style={{fontSize:13,color:T.text,fontFamily:T.font}}>{label}</span>}
  </label>
);

const UsageBar = ({data}) => {
  const p=pct(data.used,data.limit);
  const barColor=p>=95?T.red:p>=80?T.orange:data.color;
  const IconComp = data.Icon;
  return (
    <div style={{padding:"14px 0",borderBottom:`1px solid ${T.border}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <IconComp size={18} color={data.color}/>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:T.text,fontFamily:T.font}}>{data.label}</div>
            <div style={{fontSize:11,color:T.muted,fontFamily:T.font}}>{fmt(data.used)} / {fmt(data.limit)}</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {p>=80&&<Badge color={p>=95?T.red:T.orange} bg={p>=95?"#fee2e2":"#fef3c7"}>{p>=95?"Crítico":"Atenção"}</Badge>}
          <span style={{fontSize:13,fontWeight:700,color:barColor,fontFamily:T.font}}>{p}%</span>
        </div>
      </div>
      <div style={{height:5,background:T.border,borderRadius:3}}>
        <div style={{height:"100%",width:`${p}%`,background:barColor,borderRadius:3,transition:"width 0.5s ease"}}/>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   TAB SECTIONS
═══════════════════════════════════════════════════════════ */
const OnboardingCard = () => {
  const navigate = useNavigate();
  const saved = (() => { try { return JSON.parse(localStorage.getItem("vantari_onboarding") || "{}"); } catch { return {}; } })();
  const phases = [
    { key:"empresa",     label:"Conta e Identidade",    fields:["companyName","cnpj","segment","teamSize","timezone","currency","respName","respRole","respEmail"] },
    { key:"equipe",      label:"Equipe e Acessos",       fields:["inviteEmail","inviteRole"] },
    { key:"tecnico",     label:"Configuração Técnica",   fields:["sendDomain","senderEmail"] },
    { key:"negocios",    label:"Regras de Negócio",      fields:["stage0","stage1","stage2","stage3","stage4"] },
  ];
  const total = phases.reduce((acc, p) => acc + p.fields.length, 0);
  const done  = phases.reduce((acc, p) => acc + p.fields.filter(f => saved[f] && String(saved[f]).trim()).length, 0);
  const pct = Math.round((done / total) * 100);
  const isComplete = pct === 100;

  return (
    <Card style={{borderLeft:`4px solid ${isComplete ? T.green : T.teal}`,background: isComplete ? "#f0fdf8" : "#EEF9FC"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
            {isComplete
              ? <CheckCircle size={20} color={T.green}/>
              : <Settings size={20} color={T.teal}/>
            }
            <span style={{fontFamily:T.head,fontWeight:700,fontSize:15,color:T.ink}}>
              {isComplete ? "Onboarding concluído!" : "Configure sua conta"}
            </span>
            <span style={{background: isComplete ? T.green : T.teal,color:"#fff",borderRadius:20,padding:"2px 10px",fontSize:12,fontWeight:700}}>
              {pct}%
            </span>
          </div>
          <div style={{fontSize:13,color:T.muted,fontFamily:T.font,marginBottom:10}}>
            {isComplete
              ? "Todos os passos do onboarding foram concluídos."
              : "Complete os passos iniciais para ativar todos os recursos da plataforma."}
          </div>
          <div style={{background:T.border,borderRadius:99,height:6,width:"100%",maxWidth:360}}>
            <div style={{background: isComplete ? T.green : T.teal,borderRadius:99,height:6,width:`${pct}%`,transition:"width 0.4s"}}/>
          </div>
          <div style={{display:"flex",gap:16,marginTop:8}}>
            {phases.map(p => {
              const phaseDone = p.fields.filter(f => saved[f] && String(saved[f]).trim()).length;
              const ok = phaseDone === p.fields.length;
              return (
                <span key={p.key} style={{fontSize:12,color: ok ? T.green : T.muted,fontFamily:T.font}}>
                  {ok ? "+" : "·"} {p.label}
                </span>
              );
            })}
          </div>
        </div>
        <button
          onClick={() => navigate("/onboarding")}
          style={{background:T.gradient,color:"#fff",border:"none",borderRadius:10,padding:"10px 20px",fontFamily:T.head,fontWeight:700,fontSize:13,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}
        >
          {isComplete ? "Ver resumo" : pct > 0 ? "Continuar configuração" : "Iniciar configuração"}
        </button>
      </div>
    </Card>
  );
};

const WorkspaceTab = ({toast}) => {
  const [f,setF] = useState({companyName:"Vantari",domain:"vantari.com.br",timezone:"America/Sao_Paulo",dateFormat:"DD/MM/YYYY",language:"pt-BR",primaryColor:"#0D7491"});
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const fileRef = useRef();
  const u=(k,v)=>setF(x=>({...x,[k]:v}));

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("workspace_settings").select("*").eq("workspace_id", WORKSPACE_VANTARI).maybeSingle();
      if (data) setF({
        companyName: data.company_name || "Vantari",
        domain: data.domain || "",
        timezone: data.timezone || "America/Sao_Paulo",
        dateFormat: data.date_format || "DD/MM/YYYY",
        language: data.language || "pt-BR",
        primaryColor: data.primary_color || "#0D7491",
      });
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("workspace_settings").upsert({
      workspace_id: WORKSPACE_VANTARI,
      company_name: f.companyName,
      domain: f.domain,
      timezone: f.timezone,
      date_format: f.dateFormat,
      language: f.language,
      primary_color: f.primaryColor,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) { toast("Erro: " + error.message, "error"); return; }
    logAudit({ action:"updated", resource:"workspace_settings", resource_id: WORKSPACE_VANTARI, details:{ company_name:f.companyName, domain:f.domain } });
    toast("Configurações salvas!","success");
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <OnboardingCard />
      <Card>
        <SectionTitle sub="Nome, logo e domínio customizado">Identidade da Empresa</SectionTitle>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
          <Input label="Nome da Empresa"    value={f.companyName} onChange={e=>u("companyName",e.target.value)}/>
          <Input label="Domínio Customizado" value={f.domain}     onChange={e=>u("domain",e.target.value)} hint="Ex: crm.suaempresa.com.br"/>
        </div>
        <FL>Logotipo</FL>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:56,height:56,borderRadius:12,background:T.faint,border:`2px dashed ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center"}}><Building2 size={22} color={T.muted}/></div>
          <div>
            <Btn variant="outline" size="sm" disabled title="Em breve — upload de logo ainda não foi construído (falta bucket de storage)" icon={<FolderOpen size={12}/>}>Escolher arquivo</Btn>
            <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}}/>
            <div style={{fontSize:11,color:T.muted,marginTop:4,fontFamily:T.font}}>PNG, SVG ou JPG — máx. 2 MB</div>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle sub="Cor primária da plataforma">Branding</SectionTitle>
        <div style={{display:"grid",gridTemplateColumns:"200px 1fr",gap:16,alignItems:"end"}}>
          <div>
            <FL>Cor Primária</FL>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <input type="color" value={f.primaryColor} onChange={e=>u("primaryColor",e.target.value)} style={{width:38,height:38,borderRadius:8,border:`1.5px solid ${T.border}`,cursor:"pointer",padding:2}}/>
              <Input value={f.primaryColor} onChange={e=>u("primaryColor",e.target.value)}/>
            </div>
          </div>
          <div>
            <FL>Predefinidos</FL>
            <div style={{display:"flex",gap:6}}>
              {["#0D7491","#14A273","#7C5CFF","#E91E8C","#F59E0B","#FF6B5E"].map(c=>(
                <div key={c} onClick={()=>u("primaryColor",c)} style={{width:30,height:30,borderRadius:8,background:c,cursor:"pointer",border:`3px solid ${f.primaryColor===c?T.text:"transparent"}`,transition:"border 0.15s"}}/>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle sub="Fuso horário e formatação regional">Região e Idioma</SectionTitle>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
          <Sel label="Idioma"          value={f.language}   onChange={e=>u("language",e.target.value)}   options={[{value:"pt-BR",label:"Português (Brasil)"},{value:"en-US",label:"English (US)"},{value:"es-ES",label:"Español"}]}/>
          <Sel label="Fuso Horário"    value={f.timezone}   onChange={e=>u("timezone",e.target.value)}   options={[{value:"America/Sao_Paulo",label:"Brasília (UTC-3)"},{value:"America/Manaus",label:"Manaus (UTC-4)"},{value:"America/Recife",label:"Recife (UTC-3)"}]}/>
          <Sel label="Formato de Data" value={f.dateFormat} onChange={e=>u("dateFormat",e.target.value)} options={[{value:"DD/MM/YYYY",label:"DD/MM/AAAA"},{value:"MM/DD/YYYY",label:"MM/DD/AAAA"},{value:"YYYY-MM-DD",label:"AAAA-MM-DD"}]}/>
        </div>
      </Card>

      <div style={{display:"flex",justifyContent:"flex-end"}}>
        <Btn onClick={save} disabled={saving||loading} size="md" icon={saving?<Loader2 size={12}/>:<Save size={12}/>}>{saving?"Salvando...":"Salvar Configurações"}</Btn>
      </div>
    </div>
  );
};

const TeamTab = ({toast}) => {
  const [members,setMembers] = useState([]);
  const [loading,setLoading] = useState(true);
  const [invEmail,setInvEmail] = useState(""); const [invRole,setInvRole] = useState("user"); const [inviting,setInviting] = useState(false);
  const [permTarget,setPermTarget] = useState(null); const [perms,setPerms] = useState({});

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .order("joined_at", { ascending: true });
    if (!error && data) setMembers(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const invite=async()=>{
    if(!invEmail.includes("@"))return toast("Email inválido","error");
    setInviting(true);
    const { error } = await supabase.from("team_members").insert({
      email: invEmail,
      name: invEmail.split("@")[0],
      role: invRole,
      status: "invited",
    });
    if (error) toast("Erro: " + error.message, "error");
    else {
      logAudit({ action:"invited", resource:"team_members", resource_id: invEmail, details:{ role: invRole } });
      toast(`Convite registado para ${invEmail}`,"success"); fetchMembers();
    }
    setInvEmail(""); setInviting(false);
  };

  const removeMember = async (id, email) => {
    const { error } = await supabase.from("team_members").delete().eq("id", id);
    if (error) toast("Erro ao remover", "error");
    else {
      logAudit({ action:"deleted", resource:"team_members", resource_id: id, details:{ email } });
      toast("Membro removido","success"); fetchMembers();
    }
  };

  const openPerms=m=>{setPerms(ROLE_DEFAULTS[m.role]||{});setPermTarget(m);};
  const toggleAction=(res,action)=>setPerms(p=>{const cur=p[res]||[];return{...p,[res]:cur.includes(action)?cur.filter(a=>a!==action):[...cur,action]};});

  const statusS={active:{color:T.green,bg:`${T.green}14`},invited:{color:T.amber,bg:`${T.amber}18`},suspended:{color:T.coral,bg:`${T.coral}14`}};
  const roleC={admin:T.violet,manager:T.teal,user:T.muted};
  const roleL={admin:"Admin",manager:"Gerente",user:"Usuário"};
  const statusL={active:"Ativo",invited:"Convidado",suspended:"Suspenso"};

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <Card>
        <SectionTitle sub="O novo usuário receberá email de onboarding automático">Convidar Membro</SectionTitle>
        <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
          <div style={{flex:1}}><Input label="Email" value={invEmail} onChange={e=>setInvEmail(e.target.value)} placeholder="usuario@empresa.com.br"/></div>
          <Sel label="Papel" value={invRole} onChange={e=>setInvRole(e.target.value)} options={[{value:"admin",label:"Admin"},{value:"manager",label:"Gerente"},{value:"user",label:"Usuário"}]}/>
          <Btn onClick={invite} disabled={inviting} icon={inviting?<Loader2 size={12}/>:<Send size={12}/>} size="md">{inviting?"Enviando...":"Convidar"}</Btn>
        </div>
      </Card>

      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:T.text,fontFamily:T.font}}>Membros da Equipe</div>
            <div style={{fontSize:12,color:T.muted,fontFamily:T.font}}>{members.length} membros</div>
          </div>
        </div>
        {loading ? (
          <div style={{padding:32,textAlign:"center",color:T.muted,fontSize:13,fontFamily:T.font}}>Carregando...</div>
        ) : (
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:T.faint}}>
            {["Usuário","Papel","Status","Ações"].map(h=>(
              <th key={h} style={{padding:"9px 18px",textAlign:"left",fontSize:11,fontWeight:700,color:T.muted,letterSpacing:"0.06em",textTransform:"uppercase",fontFamily:T.font}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {members.map(m=>{
              const initials = (m.name||m.email).split(" ").map(w=>w[0]).join("").substring(0,2).toUpperCase();
              return (
              <tr key={m.id} style={{borderTop:`1px solid ${T.border}`}}>
                <td style={{padding:"13px 18px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:34,height:34,borderRadius:"50%",background:avatarBg(m.name||m.email),display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,fontWeight:700}}>{initials}</div>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:T.text,fontFamily:T.font}}>{m.name||"—"}</div>
                      <div style={{fontSize:11,color:T.muted,fontFamily:T.font}}>{m.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{padding:"13px 18px"}}><Badge color={roleC[m.role]||T.muted}>{roleL[m.role]||m.role}</Badge></td>
                <td style={{padding:"13px 18px"}}><Badge color={(statusS[m.status]||statusS.active).color} bg={(statusS[m.status]||statusS.active).bg}>{statusL[m.status]||m.status}</Badge></td>
                <td style={{padding:"13px 18px"}}>
                  <div style={{display:"flex",gap:6}}>
                    <Btn variant="outline" size="xs" onClick={()=>openPerms(m)}>Permissões</Btn>
                    {m.role!=="admin"&&<Btn variant="danger" size="xs" onClick={()=>removeMember(m.id, m.email)}>Remover</Btn>}
                  </div>
                </td>
              </tr>
            );})}
          </tbody>
        </table>
        )}
      </Card>

      {permTarget&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
          <div style={{background:"#fff",borderRadius:16,width:540,maxHeight:"78vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
            <div style={{padding:"18px 22px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:T.text,fontFamily:T.font}}>Permissões — {permTarget.name}</div>
                <div style={{fontSize:12,color:T.muted,fontFamily:T.font}}>Controle granular por recurso</div>
              </div>
              <button onClick={()=>setPermTarget(null)} style={{background:"none",border:"none",cursor:"pointer",color:T.muted,display:"flex",alignItems:"center"}}><Plus size={16} style={{transform:"rotate(45deg)"}}/></button>
            </div>
            <div style={{padding:22}}>
              <div style={{fontSize:11.5,color:T.muted,fontFamily:T.font,marginBottom:14,padding:"8px 10px",background:T.faint,borderRadius:8}}>
                Prévia — o controle abaixo ainda não bloqueia acesso de verdade em nenhuma página; hoje o app só diferencia Admin de não-Admin.
              </div>
              {Object.entries(PERMISSIONS).map(([res,label])=>(
                <div key={res} style={{marginBottom:12,padding:12,background:T.faint,borderRadius:10}}>
                  <div style={{fontSize:12,fontWeight:700,color:T.text,fontFamily:T.font,marginBottom:8}}>{label}</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {["view","create","edit","delete","manage"].map(action=>{
                      const has=(perms[res]||[]).includes(action);
                      return <button key={action} onClick={()=>toggleAction(res,action)} style={{padding:"3px 12px",borderRadius:20,fontSize:11,fontWeight:600,cursor:"pointer",border:`1.5px solid ${has?T.teal:T.border}`,background:has?T.teal+"15":"#fff",color:has?T.teal:T.muted,fontFamily:T.font,transition:"all 0.15s"}}>{action}</button>;
                    })}
                  </div>
                </div>
              ))}
              <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
                <Btn variant="outline" onClick={()=>setPermTarget(null)}>Cancelar</Btn>
                <Btn onClick={()=>{setPermTarget(null);toast("Permissões atualizadas!","success");}}>Salvar</Btn>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const EmailTab = ({toast}) => {
  const [useSmtp,setUseSmtp]=useState(false);
  const [smtp,setSmtp]=useState({host:"",port:"587",user:"",pass:"",fromName:"Empresa LTDA",fromEmail:"noreply@empresa.com.br"});
  const [bounce,setBounce]=useState(true);
  const [unsub,setUnsub]=useState("https://empresa.com.br/unsubscribe");
  const [testing,setTesting]=useState(false);
  const [saving,setSaving]=useState(false);
  const su=(k,v)=>setSmtp(s=>({...s,[k]:v}));

  const dnsRecords=[
    {label:"SPF Record",  value:"v=spf1 include:_spf.vantari.com.br ~all",               status:"verified"},
    {label:"DKIM Record", value:"vantari._domainkey.empresa.com.br",                     status:"verified"},
    {label:"DMARC Record",value:"v=DMARC1; p=quarantine; rua=mailto:dmarc@empresa.com.br",status:"pending"},
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <PreviewBanner>Prévia — envio de campanhas já usa o Supabase (Resend/SMTP interno via Edge Function). SMTP próprio e verificação de domínio (SPF/DKIM/DMARC) ainda não estão conectados a um provedor real; os dados abaixo são de exemplo.</PreviewBanner>
      <Card>
        <SectionTitle sub="SMTP customizado ou padrão Supabase">Servidor de Email</SectionTitle>
        <Toggle checked={useSmtp} onChange={setUseSmtp} label="Usar SMTP próprio"/>
        {useSmtp&&(
          <div style={{marginTop:16,display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Input label="Host SMTP" value={smtp.host} onChange={e=>su("host",e.target.value)} placeholder="smtp.gmail.com"/>
            <Input label="Porta"     value={smtp.port} onChange={e=>su("port",e.target.value)}/>
            <Input label="Usuário"   value={smtp.user} onChange={e=>su("user",e.target.value)} placeholder="usuario@empresa.com.br"/>
            <Input label="Senha"     value={smtp.pass} onChange={e=>su("pass",e.target.value)} type="password"/>
            <Btn variant="outline" disabled title="Em breve — teste de conexão SMTP real ainda não foi construído" icon={<Plug size={12}/>}>Testar Conexão</Btn>
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle sub="Configuração SPF, DKIM e DMARC (exemplo)">Domínio de Envio Verificado</SectionTitle>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
          <Input label="Nome do Remetente" value={smtp.fromName}  onChange={e=>su("fromName",e.target.value)}/>
          <Input label="Email Remetente"   value={smtp.fromEmail} onChange={e=>su("fromEmail",e.target.value)}/>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {dnsRecords.map(r=>(
            <div key={r.label} style={{padding:12,background:T.faint,borderRadius:8,border:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
              <div style={{flex:1}}>
                <div style={{fontSize:11,fontWeight:700,color:T.muted,fontFamily:T.font,marginBottom:2}}>{r.label}</div>
                <code style={{fontSize:11,color:T.text,fontFamily:"monospace",wordBreak:"break-all"}}>{r.value}</code>
              </div>
              <Badge color={r.status==="verified"?T.green:T.amber} bg={r.status==="verified"?`${T.green}14`:`${T.amber}18`}>{r.status==="verified"?"Verificado":"Pendente"}</Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>Configurações Avançadas</SectionTitle>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Toggle checked={bounce} onChange={setBounce} label="Bounce handling automático — remove endereços inválidos"/>
          <Input label="URL de Descadastro" value={unsub} onChange={e=>setUnsub(e.target.value)} hint="Página de unsubscribe personalizada exibida nos emails"/>
        </div>
      </Card>

      <div style={{display:"flex",justifyContent:"flex-end"}}>
        <Btn disabled title="Em breve — configuração de email ainda não persiste (depende de provedor SMTP real)" size="md" icon={<Save size={12}/>}>Salvar Email Config</Btn>
      </div>
    </div>
  );
};

const BillingTab = ({toast}) => {
  const plan={name:"Growth",price:"R$ 497/mês",nextBilling:"—",card:"**** **** **** 4242"};
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <PreviewBanner>Prévia — não há integração de cobrança real (Stripe ou similar) conectada ainda. Plano, uso e faturas abaixo são dados de exemplo para referência de layout.</PreviewBanner>
      <Card>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",fontFamily:T.font,marginBottom:4}}>Plano Atual (exemplo)</div>
            <div style={{fontSize:26,fontWeight:800,color:T.text,fontFamily:T.font,letterSpacing:"-0.03em"}}>{plan.name}</div>
            <div style={{fontSize:15,color:T.muted,fontFamily:T.font}}>{plan.price}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:11,color:T.muted,fontFamily:T.font}}>Próxima cobrança</div>
            <div style={{fontSize:15,fontWeight:700,color:T.text,fontFamily:T.font}}>{plan.nextBilling}</div>
            <div style={{fontSize:11,color:T.muted,fontFamily:T.font,marginTop:2}}>{plan.card}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <Btn variant="secondary" size="md" disabled title="Em breve — sem integração de cobrança conectada" icon={<ArrowUp size={12}/>}>Fazer Upgrade</Btn>
          <Btn variant="outline"   size="md" disabled title="Em breve — sem integração de cobrança conectada" icon={<CreditCard size={12}/>}>Atualizar Cartão</Btn>
          <Btn variant="danger"    size="sm" disabled title="Em breve — sem integração de cobrança conectada">Cancelar Plano</Btn>
        </div>
      </Card>

      <Card>
        <SectionTitle sub="Exemplo de layout — sem métricas de uso reais ainda">Uso do Período</SectionTitle>
        {Object.values(MOCK_USAGE).map((d,i)=><UsageBar key={i} data={d}/>)}
      </Card>

      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:15,fontWeight:700,color:T.text,fontFamily:T.font}}>Histórico de Faturas</div>
          <Btn variant="outline" size="sm" disabled title="Em breve — sem faturas reais ainda" icon={<Download size={12}/>}>Exportar Todas</Btn>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:T.faint}}>
            {["Período","Valor","Status","Data",""].map((h,i)=>(
              <th key={i} style={{padding:"9px 18px",textAlign:"left",fontSize:11,fontWeight:700,color:T.muted,letterSpacing:"0.06em",textTransform:"uppercase",fontFamily:T.font}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {MOCK_INVOICES.length===0 && (
              <tr><td colSpan={5} style={{padding:30,textAlign:"center",fontSize:13,color:T.muted,fontFamily:T.font}}>Nenhuma fatura ainda — aparecem aqui quando a cobrança real estiver conectada.</td></tr>
            )}
            {MOCK_INVOICES.map(inv=>(
              <tr key={inv.id} style={{borderTop:`1px solid ${T.border}`}}>
                <td style={{padding:"13px 18px",fontSize:13,fontWeight:600,color:T.text,fontFamily:T.font}}>{inv.period}</td>
                <td style={{padding:"13px 18px",fontSize:13,color:T.text,fontFamily:T.font}}>{inv.amount}</td>
                <td style={{padding:"13px 18px"}}><Badge color={T.green} bg="#ecfdf5">Pago</Badge></td>
                <td style={{padding:"13px 18px",fontSize:13,color:T.muted,fontFamily:T.font}}>{inv.date}</td>
                <td style={{padding:"13px 18px"}}><Btn variant="outline" size="xs" disabled icon={<FileText size={10}/>}>PDF</Btn></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

/* hash simples via Web Crypto — nunca guardamos a chave em texto puro depois de criada */
async function sha256Hex(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

const AdvancedTab = ({toast}) => {
  const [keys,setKeys]=useState([]);
  const [hooks,setHooks]=useState([]);
  const [loading,setLoading]=useState(true);
  const [nk,setNk]=useState({name:"",scopes:[]});
  const [createdKey,setCreatedKey]=useState(null);
  const [creating,setCreating]=useState(false);
  const [retention,setRetention]=useState("365");
  const [lgpd,setLgpd]=useState(true);
  const [flags,setFlags]=useState({ai_assistant:true,beta_scoring:false,dark_mode:false,bulk_import:true});
  const [addingHook,setAddingHook]=useState(false);
  const [nh,setNh]=useState({name:"",url:"",events:[]});
  const [savingHook,setSavingHook]=useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{data:ks},{data:hs},{data:ws}] = await Promise.all([
      supabase.from("api_keys").select("*").eq("workspace_id",WORKSPACE_VANTARI).is("revoked_at",null).order("created_at",{ascending:false}),
      supabase.from("webhook_endpoints").select("*").eq("workspace_id",WORKSPACE_VANTARI).order("created_at",{ascending:false}),
      supabase.from("workspace_settings").select("*").eq("workspace_id",WORKSPACE_VANTARI).maybeSingle(),
    ]);
    setKeys(ks||[]); setHooks(hs||[]);
    if (ws) { setRetention(ws.retention_days||"365"); setLgpd(ws.lgpd_enabled??true); setFlags(ws.feature_flags||flags); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const createKey=async()=>{
    if(!nk.name)return toast("Nome obrigatório","error");
    setCreating(true);
    const full="vnt_live_"+Math.random().toString(36).substring(2,34)+Math.random().toString(36).substring(2,10);
    const hash = await sha256Hex(full);
    const { error } = await supabase.from("api_keys").insert({
      workspace_id: WORKSPACE_VANTARI, name: nk.name, key_hash: hash, key_prefix:"vnt_live", scopes: nk.scopes,
    });
    setCreating(false);
    if (error) return toast("Erro: "+error.message,"error");
    setCreatedKey(full);
    logAudit({ action:"created", resource:"api_keys", details:{ name:nk.name, scopes:nk.scopes } });
    setNk({name:"",scopes:[]});
    fetchAll();
  };

  const revokeKey = async (k) => {
    const { error } = await supabase.from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id",k.id);
    if (error) return toast("Erro: "+error.message,"error");
    logAudit({ action:"deleted", resource:"api_keys", resource_id:k.id, details:{ name:k.name } });
    toast("Chave revogada","success"); fetchAll();
  };

  const tScope=s=>setNk(k=>({...k,scopes:k.scopes.includes(s)?k.scopes.filter(x=>x!==s):[...k.scopes,s]}));
  const flagLabels={ai_assistant:"Assistente IA (beta)",beta_scoring:"Novo Scoring Engine",dark_mode:"Dark Mode",bulk_import:"Importação em Massa"};

  const HOOK_EVENTS = ["lead.created","lead.updated","deal.stage_changed","form.submitted"];
  const tHookEvent = e => setNh(h=>({...h,events:h.events.includes(e)?h.events.filter(x=>x!==e):[...h.events,e]}));

  const saveHook = async () => {
    if (!nh.name || !nh.url) return toast("Nome e URL são obrigatórios","error");
    setSavingHook(true);
    const { error } = await supabase.from("webhook_endpoints").insert({
      workspace_id: WORKSPACE_VANTARI, name: nh.name, url: nh.url, events: nh.events,
    });
    setSavingHook(false);
    if (error) return toast("Erro: "+error.message,"error");
    logAudit({ action:"created", resource:"webhook_endpoints", details:{ name:nh.name, url:nh.url } });
    toast("Webhook adicionado!","success"); setNh({name:"",url:"",events:[]}); setAddingHook(false); fetchAll();
  };

  const toggleHook = async (w) => {
    const { error } = await supabase.from("webhook_endpoints").update({ enabled: !w.enabled }).eq("id",w.id);
    if (error) return toast("Erro: "+error.message,"error");
    fetchAll();
  };

  const persistWorkspaceExtra = async (patch) => {
    await supabase.from("workspace_settings").upsert({ workspace_id: WORKSPACE_VANTARI, ...patch, updated_at:new Date().toISOString() });
  };

  const onLgpdChange = (v) => { setLgpd(v); persistWorkspaceExtra({ lgpd_enabled:v }); };
  const onRetentionChange = (v) => { setRetention(v); persistWorkspaceExtra({ retention_days:v }); };
  const onFlagChange = (k,v) => { const next={...flags,[k]:v}; setFlags(next); persistWorkspaceExtra({ feature_flags:next }); };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {/* API Keys */}
      <Card>
        <SectionTitle sub="Autorize integrações externas com escopos granulares — nenhum endpoint da API valida essas chaves ainda, mas a lista persiste">Chaves de API</SectionTitle>
        <div style={{display:"flex",gap:10,marginBottom:12,alignItems:"flex-end"}}>
          <div style={{flex:1}}><Input label="Nome da Chave" value={nk.name} onChange={e=>setNk(k=>({...k,name:e.target.value}))} placeholder="Ex: Integração HubSpot"/></div>
          <Btn onClick={createKey} disabled={creating} size="md" icon={creating?<Loader2 size={12}/>:<Key size={12}/>}>{creating?"Gerando...":"Nova Chave"}</Btn>
        </div>
        <FL>Escopos</FL>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
          {SCOPE_OPTIONS.map(s=>{const has=nk.scopes.includes(s);return <button key={s} onClick={()=>tScope(s)} style={{padding:"3px 12px",borderRadius:20,fontSize:11,fontWeight:600,cursor:"pointer",border:`1.5px solid ${has?T.teal:T.border}`,background:has?T.teal+"15":"#fff",color:has?T.teal:T.muted,fontFamily:T.font}}>{s}</button>;})}
        </div>
        {createdKey&&(
          <div style={{padding:14,background:"#ecfdf5",border:`1px solid #6ee7b7`,borderRadius:10,marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,color:T.green,marginBottom:6,fontFamily:T.font,display:"flex",alignItems:"center",gap:6}}><Key size={12}/>Copie agora — não será exibida novamente</div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <code style={{fontSize:11,fontFamily:"monospace",color:T.text,flex:1,wordBreak:"break-all"}}>{createdKey}</code>
              <Btn variant="success" size="xs" onClick={()=>{navigator.clipboard?.writeText(createdKey);toast("Copiado!","success");setCreatedKey(null);}}>Copiar</Btn>
            </div>
          </div>
        )}
        {loading ? (
          <div style={{fontSize:12,color:T.muted,fontFamily:T.font}}>Carregando...</div>
        ) : keys.length===0 ? (
          <div style={{fontSize:12,color:T.muted,fontFamily:T.font}}>Nenhuma chave criada ainda.</div>
        ) : (
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {keys.map(k=>(
            <div key={k.id} style={{padding:14,background:T.faint,borderRadius:10,border:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:T.text,fontFamily:T.font}}>{k.name}</div>
                <code style={{fontSize:11,color:T.muted,fontFamily:"monospace"}}>{k.key_prefix}_••••••••••••••••</code>
                <div style={{display:"flex",gap:4,marginTop:4}}>{(k.scopes||[]).map(s=><Badge key={s} color={T.muted}>{s}</Badge>)}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
                <div style={{fontSize:11,color:T.muted,fontFamily:T.font}}>Usado: {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString("pt-BR") : "Nunca"}</div>
                <Btn variant="danger" size="xs" onClick={()=>revokeKey(k)}>Revogar</Btn>
              </div>
            </div>
          ))}
        </div>
        )}
      </Card>

      {/* Webhooks */}
      <Card>
        <SectionTitle sub="Endpoints para eventos em tempo real — cadastro persiste; disparo automático ainda não foi construído">Webhooks</SectionTitle>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {!loading && hooks.length===0 && !addingHook && (
            <div style={{fontSize:12,color:T.muted,fontFamily:T.font}}>Nenhum webhook cadastrado ainda.</div>
          )}
          {hooks.map(w=>(
            <div key={w.id} style={{padding:14,background:T.faint,borderRadius:10,border:`1px solid ${T.border}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:T.text,fontFamily:T.font,display:"flex",alignItems:"center",gap:8}}>
                    {w.name}{w.fail_count>0&&<Badge color={T.red} bg="#fee2e2">{w.fail_count} falhas</Badge>}
                  </div>
                  <code style={{fontSize:11,color:T.muted,fontFamily:"monospace"}}>{w.url}</code>
                  <div style={{display:"flex",gap:4,marginTop:6}}>{(w.events||[]).map(e=><Badge key={e} color={T.teal}>{e}</Badge>)}</div>
                </div>
                <Toggle checked={w.enabled} onChange={()=>toggleHook(w)}/>
              </div>
              <div style={{fontSize:11,color:T.muted,marginTop:6,fontFamily:T.font}}>Último disparo: {w.last_triggered ? new Date(w.last_triggered).toLocaleDateString("pt-BR") : "Nunca"}</div>
            </div>
          ))}
          {addingHook ? (
            <div style={{padding:14,background:T.faint,borderRadius:10,border:`1px solid ${T.border}`,display:"flex",flexDirection:"column",gap:10}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <Input label="Nome" value={nh.name} onChange={e=>setNh(h=>({...h,name:e.target.value}))} placeholder="Ex: CRM externo"/>
                <Input label="URL" value={nh.url} onChange={e=>setNh(h=>({...h,url:e.target.value}))} placeholder="https://exemplo.com/webhook"/>
              </div>
              <div>
                <FL>Eventos</FL>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {HOOK_EVENTS.map(e=>{const has=nh.events.includes(e);return <button key={e} onClick={()=>tHookEvent(e)} style={{padding:"3px 12px",borderRadius:20,fontSize:11,fontWeight:600,cursor:"pointer",border:`1.5px solid ${has?T.teal:T.border}`,background:has?T.teal+"15":"#fff",color:has?T.teal:T.muted,fontFamily:T.font}}>{e}</button>;})}
                </div>
              </div>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
                <Btn variant="outline" size="sm" onClick={()=>{setAddingHook(false);setNh({name:"",url:"",events:[]});}}>Cancelar</Btn>
                <Btn size="sm" onClick={saveHook} disabled={savingHook} icon={savingHook?<Loader2 size={12}/>:<Save size={12}/>}>{savingHook?"Salvando...":"Salvar Webhook"}</Btn>
              </div>
            </div>
          ) : (
            <Btn variant="outline" size="sm" icon={<Plus size={12}/>} onClick={()=>setAddingHook(true)}>Adicionar Webhook</Btn>
          )}
        </div>
      </Card>

      {/* LGPD */}
      <Card>
        <SectionTitle sub="Conformidade com a Lei Geral de Proteção de Dados">LGPD & Retenção de Dados</SectionTitle>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Toggle checked={lgpd} onChange={onLgpdChange} label="Modo LGPD ativo — anonimiza dados ao excluir"/>
          <Sel label="Retenção de Dados" value={retention} onChange={e=>onRetentionChange(e.target.value)} options={[{value:"90",label:"90 dias"},{value:"180",label:"180 dias"},{value:"365",label:"1 ano"},{value:"730",label:"2 anos"},{value:"never",label:"Indefinido"}]}/>
          <div style={{display:"flex",gap:8}}>
            <Btn variant="outline" size="sm" icon={<Package size={12}/>} disabled title="Em breve — exportação/restauração de backup ainda não foi construída">Exportar Backup</Btn>
            <Btn variant="outline" size="sm" icon={<RefreshCw size={12}/>} disabled title="Em breve — exportação/restauração de backup ainda não foi construída">Restaurar Config</Btn>
          </div>
        </div>
      </Card>

      {/* Feature Flags */}
      <Card>
        <SectionTitle sub="Funcionalidades em beta">Feature Flags</SectionTitle>
        <div style={{display:"flex",flexDirection:"column",gap:13}}>
          {Object.entries(flags).map(([k,v])=><Toggle key={k} checked={v} onChange={val=>onFlagChange(k,val)} label={flagLabels[k]}/>)}
        </div>
      </Card>
    </div>
  );
};

const ACTION_LABEL = { created:"criou", updated:"atualizou", deleted:"removeu", invited:"convidou" };
const RESOURCE_LABEL = { team_members:"membro da equipe", custom_fields:"campo personalizado", tracked_pages:"página rastreada", workspace_settings:"configurações do workspace", api_keys:"chave de API", webhook_endpoints:"webhook" };

const timeAgo = (iso) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs/60000);
  if (min<1) return "agora";
  if (min<60) return `${min}min`;
  const h = Math.floor(min/60);
  if (h<24) return `${h}h`;
  return `${Math.floor(h/24)}d`;
};

const AuditTab = () => {
  const [filter,setFilter]=useState("all");
  const [logs,setLogs]=useState([]);
  const [loading,setLoading]=useState(true);
  const actionColor={updated:T.teal,created:T.green,deleted:T.coral,invited:T.amber};
  const filterOptions=[{id:"all",label:"Todos"},{id:"created",label:"Criou"},{id:"updated",label:"Atualizou"},{id:"deleted",label:"Deletou"},{id:"invited",label:"Convidou"}];

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("audit_logs").select("*").eq("workspace_id",WORKSPACE_VANTARI).order("created_at",{ascending:false}).limit(200);
    setLogs(data||[]);
    setLoading(false);
  }, []);
  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = filter==="all" ? logs : logs.filter(a=>a.action===filter);

  const exportCsv = () => {
    const header = "data,usuario,acao,recurso,recurso_id,detalhes";
    const rows = filtered.map(l => [
      new Date(l.created_at).toISOString(), l.user_email||"", l.action, l.resource, l.resource_id||"",
      JSON.stringify(l.details||{}).replace(/"/g,'""'),
    ].map(v=>`"${v}"`).join(","));
    const csv = [header,...rows].join("\n");
    const blob = new Blob([csv], { type:"text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `audit-log-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <Card>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <SectionTitle sub="Registro real de ações no workspace (Equipe, Campos, Tracking, Avançado, Workspace)">Activity Log</SectionTitle>
          <div style={{display:"flex",gap:5}}>
            {filterOptions.map(fo=>(
              <button key={fo.id} onClick={()=>setFilter(fo.id)} style={{padding:"5px 12px",borderRadius:20,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:T.font,border:`1.5px solid ${filter===fo.id?T.teal:T.border}`,background:filter===fo.id?T.teal:"#fff",color:filter===fo.id?"#fff":T.muted,transition:"all 0.15s"}}>{fo.label}</button>
            ))}
          </div>
        </div>
        {loading ? (
          <div style={{padding:30,textAlign:"center",fontSize:13,color:T.muted,fontFamily:T.font}}>Carregando...</div>
        ) : filtered.length===0 ? (
          <div style={{padding:30,textAlign:"center",fontSize:13,color:T.muted,fontFamily:T.font}}>Nenhuma atividade ainda — ações em Equipe, Campos Personalizados, Lead Tracking, Workspace e Avançado aparecem aqui.</div>
        ) : filtered.map((log,i)=>(
          <div key={log.id} style={{display:"flex",gap:12,padding:"14px 0",borderBottom:i<filtered.length-1?`1px solid ${T.border}`:"none",alignItems:"flex-start"}}>
            <div style={{width:34,height:34,borderRadius:10,background:T.faint,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><ClipboardList size={15} color={actionColor[log.action]||T.muted}/></div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,color:T.text,fontFamily:T.font}}>
                <strong>{log.user_email||"—"}</strong>{" "}<span style={{color:actionColor[log.action]||T.muted,fontWeight:600}}>{ACTION_LABEL[log.action]||log.action}</span>{" "}{RESOURCE_LABEL[log.resource]||log.resource}
              </div>
              <div style={{fontSize:11,color:T.muted,fontFamily:T.font,marginTop:3}}>{log.resource_id ? `${log.resource_id} · ` : ""}{timeAgo(log.created_at)} atrás</div>
            </div>
          </div>
        ))}
        <div style={{marginTop:14,textAlign:"center"}}>
          <Btn variant="outline" size="sm" icon={<Download size={12}/>} onClick={exportCsv} disabled={filtered.length===0}>Exportar Logs CSV</Btn>
        </div>
      </Card>
    </div>
  );
};

const SupportTab = ({toast}) => {
  const [ticket,setTicket]=useState({subject:"",body:"",priority:"normal"});
  const [submitting,setSubmitting]=useState(false);
  const changelog=[
    {version:"v2.4.0",date:"Mai 2025",desc:"AI Marketing Assistant com geração automática de copy"},
    {version:"v2.3.0",date:"Abr 2025",desc:"Lead Scoring com modelo preditivo de machine learning"},
    {version:"v2.2.0",date:"Mar 2025",desc:"Integrations Hub com 40+ conectores nativos"},
    {version:"v2.1.0",date:"Fev 2025",desc:"Analytics Dashboard com relatórios customizados"},
    {version:"v2.0.0",date:"Jan 2025",desc:"Redesign completo da plataforma — Vantari 2.0"},
  ];
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <PreviewBanner>Prévia — ainda não há central de documentação, canal de vídeos ou sistema de tickets conectados. Para suporte agora, fale direto com a equipe em suporte@vantari.com.br.</PreviewBanner>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
        {[{Icon:BookOpen,title:"Documentação",desc:"Guides e tutoriais completos",action:"Acessar Docs"},{Icon:Play,title:"Vídeo Tutoriais",desc:"Aprenda no YouTube",action:"Ver Vídeos"},{Icon:MessageSquare,title:"Comunidade",desc:"Tire dúvidas com outros usuários",action:"Acessar"}].map(r=>(
          <Card key={r.title} style={{textAlign:"center"}}>
            <div style={{display:"flex",justifyContent:"center",marginBottom:8}}><r.Icon size={28} color={T.teal}/></div>
            <div style={{fontSize:14,fontWeight:700,color:T.text,fontFamily:T.font}}>{r.title}</div>
            <div style={{fontSize:12,color:T.muted,fontFamily:T.font,margin:"4px 0 12px"}}>{r.desc}</div>
            <Btn variant="outline" size="sm" disabled title="Em breve — ainda não existe">{r.action}</Btn>
          </Card>
        ))}
      </div>

      <Card>
        <SectionTitle sub="Envio ainda não está conectado a um sistema de suporte real — use o email acima por enquanto">Abrir Ticket de Suporte (prévia)</SectionTitle>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:12}}>
            <Input label="Assunto" value={ticket.subject} onChange={e=>setTicket(t=>({...t,subject:e.target.value}))} placeholder="Descreva o problema brevemente"/>
            <Sel label="Prioridade" value={ticket.priority} onChange={e=>setTicket(t=>({...t,priority:e.target.value}))} options={[{value:"low",label:"Baixa"},{value:"normal",label:"Normal"},{value:"high",label:"Alta"}]}/>
          </div>
          <div>
            <FL>Descrição</FL>
            <textarea value={ticket.body} onChange={e=>setTicket(t=>({...t,body:e.target.value}))} rows={4} placeholder="Descreva em detalhes — inclua passos para reproduzir o problema..."
              style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1.5px solid ${T.border}`,fontSize:13,color:T.text,fontFamily:T.font,resize:"vertical",outline:"none",boxSizing:"border-box"}}
              onFocus={e=>e.target.style.borderColor=T.teal} onBlur={e=>e.target.style.borderColor=T.border}/>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end"}}>
            <Btn disabled title="Em breve — sem sistema de suporte conectado ainda" size="md" icon={<Send size={12}/>}>Enviar Ticket</Btn>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle sub="Últimas atualizações da plataforma (exemplo)">Changelog</SectionTitle>
        {changelog.map((c,i)=>(
          <div key={c.version} style={{display:"flex",gap:12,padding:"12px 0",borderBottom:i<changelog.length-1?`1px solid ${T.border}`:"none",alignItems:"center"}}>
            <span style={{fontSize:11,fontWeight:700,color:"#fff",background:T.teal,padding:"3px 8px",borderRadius:6,whiteSpace:"nowrap",fontFamily:T.font}}>{c.version}</span>
            <span style={{fontSize:13,color:T.text,fontFamily:T.font,flex:1}}>{c.desc}</span>
            <span style={{fontSize:11,color:T.muted,fontFamily:T.font,whiteSpace:"nowrap"}}>{c.date}</span>
          </div>
        ))}
      </Card>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   PIPELINES TAB — editor do funil de negócios (crm.pipelines/crm.stages)
   Substitui o array hardcoded STAGE_ACCENTS de vantari-crm.jsx: agora
   cor, probabilidade % e ordem dos estágios são reais e configuráveis.
═══════════════════════════════════════════════════════════ */
const STAGE_KIND_LABEL = { open: "Em aberto", won: "Ganho", lost: "Perdido" };
const STAGE_COLOR_PRESETS = ["#0D7491", "#7C5CFF", "#F59E0B", "#FF6B5E", "#14A273", "#1F76BC", "#06B6D4", "#EC4899"];

const PipelinesTab = ({ toast }) => {
  const [pipeline, setPipeline] = useState(null);
  const [nameDraft, setNameDraft] = useState("");
  const [stages, setStages] = useState([]);
  const [dealCounts, setDealCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingName, setSavingName] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newStage, setNewStage] = useState({ name: "", color: STAGE_COLOR_PRESETS[0], probability: "0", kind: "open" });
  const [savingNew, setSavingNew] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [rowDraft, setRowDraft] = useState({});
  const [savingRow, setSavingRow] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const crm = supabase.schema("crm");
    const { data: pipes, error: e1 } = await crm.from("pipelines").select("id,name").eq("is_default", true).limit(1);
    if (e1) { setError(e1.message); setLoading(false); return; }
    const pipe = pipes?.[0] || null;
    setPipeline(pipe);
    setNameDraft(pipe?.name || "");
    if (!pipe) { setStages([]); setLoading(false); return; }
    const { data: st, error: e2 } = await crm.from("stages").select("id,name,position,kind,color,probability").eq("pipeline_id", pipe.id).order("position");
    if (e2) { setError(e2.message); setLoading(false); return; }
    setStages(st || []);
    const stageIds = (st || []).map((s) => s.id);
    if (stageIds.length) {
      const { data: dl } = await crm.from("deals").select("stage_id").in("stage_id", stageIds);
      const counts = {};
      (dl || []).forEach((d) => { counts[d.stage_id] = (counts[d.stage_id] || 0) + 1; });
      setDealCounts(counts);
    } else setDealCounts({});
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveName = async () => {
    if (!nameDraft.trim()) return toast("Informe um nome para o pipeline", "error");
    setSavingName(true);
    const { error } = await supabase.schema("crm").from("pipelines").update({ name: nameDraft.trim() }).eq("id", pipeline.id);
    setSavingName(false);
    if (error) return toast(`Erro: ${error.message}`, "error");
    logAudit({ action: "updated", resource: "crm.pipelines", resource_id: pipeline.id, details: { name: nameDraft.trim() } });
    toast("Nome do pipeline atualizado!", "success");
    load();
  };

  const startEdit = (s) => { setEditingId(s.id); setRowDraft({ name: s.name, color: s.color || STAGE_COLOR_PRESETS[0], probability: String(s.probability ?? 0), kind: s.kind }); };
  const cancelEdit = () => { setEditingId(null); setRowDraft({}); };

  const saveRow = async (id) => {
    if (!rowDraft.name?.trim()) return toast("Informe um nome para o estágio", "error");
    const prob = Math.max(0, Math.min(100, parseInt(rowDraft.probability, 10) || 0));
    setSavingRow(true);
    const { error } = await supabase.schema("crm").from("stages").update({
      name: rowDraft.name.trim(), color: rowDraft.color, probability: prob, kind: rowDraft.kind,
    }).eq("id", id);
    setSavingRow(false);
    if (error) return toast(`Erro: ${error.message}`, "error");
    logAudit({ action: "updated", resource: "crm.stages", resource_id: id, details: { name: rowDraft.name, probability: prob, kind: rowDraft.kind } });
    toast("Estágio atualizado!", "success");
    cancelEdit();
    load();
  };

  const move = async (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= stages.length) return;
    const a = stages[idx], b = stages[target];
    const crm = supabase.schema("crm");
    const [r1, r2] = await Promise.all([
      crm.from("stages").update({ position: b.position }).eq("id", a.id),
      crm.from("stages").update({ position: a.position }).eq("id", b.id),
    ]);
    if (r1.error || r2.error) return toast(`Erro: ${(r1.error || r2.error).message}`, "error");
    load();
  };

  const addStage = async () => {
    if (!newStage.name.trim()) return toast("Informe um nome para o estágio", "error");
    setSavingNew(true);
    const prob = Math.max(0, Math.min(100, parseInt(newStage.probability, 10) || 0));
    const nextPos = stages.length ? Math.max(...stages.map((s) => s.position)) + 1 : 1;
    const { error } = await supabase.schema("crm").from("stages").insert({
      workspace_id: WORKSPACE_VANTARI, pipeline_id: pipeline.id, name: newStage.name.trim(),
      color: newStage.color, probability: prob, kind: newStage.kind, position: nextPos,
    });
    setSavingNew(false);
    if (error) return toast(`Erro: ${error.message}`, "error");
    logAudit({ action: "created", resource: "crm.stages", details: { name: newStage.name } });
    toast("Estágio criado!", "success");
    setShowNew(false);
    setNewStage({ name: "", color: STAGE_COLOR_PRESETS[0], probability: "0", kind: "open" });
    load();
  };

  const removeStage = async (s) => {
    const inUse = dealCounts[s.id] || 0;
    if (inUse > 0) return toast(`${inUse} negócio(s) estão neste estágio — mova-os antes de excluir.`, "error");
    const sameKind = stages.filter((x) => x.kind === s.kind && x.kind !== "open");
    if (s.kind !== "open" && sameKind.length <= 1) {
      return toast(`É preciso manter ao menos um estágio do tipo "${STAGE_KIND_LABEL[s.kind]}".`, "error");
    }
    if (!confirm(`Excluir o estágio "${s.name}"?`)) return;
    const { error } = await supabase.schema("crm").from("stages").delete().eq("id", s.id);
    if (error) return toast(`Erro: ${error.message}`, "error");
    logAudit({ action: "deleted", resource: "crm.stages", resource_id: s.id, details: { name: s.name } });
    toast("Estágio removido", "success");
    load();
  };

  const inputSt = { padding: "7px 9px", border: `1.5px solid ${T.border}`, borderRadius: 8, fontSize: 12.5, color: T.text, outline: "none", fontFamily: T.font, background: "#fff" };

  if (loading) {
    return (
      <Card style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: 30 }}>
        <Loader2 size={18} color={T.teal} style={{ animation: "spin 1s linear infinite" }} />
        <span style={{ fontSize: 13, color: T.muted, fontFamily: T.font }}>Carregando pipeline...</span>
      </Card>
    );
  }

  if (error) {
    return (
      <Card style={{ borderLeft: `4px solid ${T.coral}`, background: "#fff5f4" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <AlertTriangle size={18} color={T.coral} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.coral, fontFamily: T.head }}>Erro ao carregar pipeline</div>
            <div style={{ fontSize: 12, color: T.muted, fontFamily: T.mono, marginTop: 4 }}>{error}</div>
          </div>
        </div>
      </Card>
    );
  }

  if (!pipeline) {
    return <Card><div style={{ fontSize: 13, color: T.muted, fontFamily: T.font }}>Nenhum pipeline configurado para este workspace.</div></Card>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <SectionTitle sub="Nome do funil usado em Negócios (/crm)">Pipeline</SectionTitle>
        <div style={{ display: "flex", gap: 10, maxWidth: 420 }}>
          <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} style={{ ...inputSt, flex: 1 }} />
          <Btn onClick={saveName} disabled={savingName || nameDraft === pipeline.name}>
            {savingName && <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />} Salvar
          </Btn>
        </div>
      </Card>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <SectionTitle sub="Cor, probabilidade e ordem usadas no Kanban e na Previsão de /crm">Estágios</SectionTitle>
          <Btn size="sm" icon={<Plus size={12} />} onClick={() => setShowNew((v) => !v)}>Novo estágio</Btn>
        </div>

        {showNew && (
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", padding: "12px 14px", background: T.faint, borderRadius: 10, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: T.muted, marginBottom: 3 }}>Nome</div>
              <input value={newStage.name} onChange={(e) => setNewStage((s) => ({ ...s, name: e.target.value }))} style={inputSt} placeholder="Ex: Qualificação" />
            </div>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: T.muted, marginBottom: 3 }}>Cor</div>
              <input type="color" value={newStage.color} onChange={(e) => setNewStage((s) => ({ ...s, color: e.target.value }))} style={{ width: 40, height: 30, padding: 0, border: `1.5px solid ${T.border}`, borderRadius: 8, cursor: "pointer" }} />
            </div>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: T.muted, marginBottom: 3 }}>Probabilidade %</div>
              <input inputMode="numeric" value={newStage.probability} onChange={(e) => setNewStage((s) => ({ ...s, probability: e.target.value.replace(/\D/g, "") }))} style={{ ...inputSt, width: 70 }} />
            </div>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: T.muted, marginBottom: 3 }}>Tipo</div>
              <select value={newStage.kind} onChange={(e) => setNewStage((s) => ({ ...s, kind: e.target.value }))} style={inputSt}>
                <option value="open">Em aberto</option>
                <option value="won">Ganho</option>
                <option value="lost">Perdido</option>
              </select>
            </div>
            <Btn onClick={addStage} disabled={savingNew}>{savingNew && <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />} Criar</Btn>
            <Btn variant="ghost" onClick={() => setShowNew(false)}>Cancelar</Btn>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {stages.map((s, idx) => {
            const isEditing = editingId === s.id;
            const n = dealCounts[s.id] || 0;
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: `1px solid ${T.border}`, borderRadius: 10, background: "#fff" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <button onClick={() => move(idx, -1)} disabled={idx === 0} style={{ border: "none", background: "none", cursor: idx === 0 ? "default" : "pointer", color: idx === 0 ? T.faint3 : T.muted, padding: 0 }}><ArrowUp size={14} /></button>
                  <button onClick={() => move(idx, 1)} disabled={idx === stages.length - 1} style={{ border: "none", background: "none", cursor: idx === stages.length - 1 ? "default" : "pointer", color: idx === stages.length - 1 ? T.faint3 : T.muted, padding: 0 }}><ArrowDown size={14} /></button>
                </div>

                {isEditing ? (
                  <>
                    <input type="color" value={rowDraft.color} onChange={(e) => setRowDraft((r) => ({ ...r, color: e.target.value }))} style={{ width: 34, height: 30, padding: 0, border: `1.5px solid ${T.border}`, borderRadius: 8, cursor: "pointer", flexShrink: 0 }} />
                    <input value={rowDraft.name} onChange={(e) => setRowDraft((r) => ({ ...r, name: e.target.value }))} style={{ ...inputSt, flex: 1, minWidth: 120 }} />
                    <input inputMode="numeric" value={rowDraft.probability} onChange={(e) => setRowDraft((r) => ({ ...r, probability: e.target.value.replace(/\D/g, "") }))} style={{ ...inputSt, width: 56 }} />
                    <span style={{ fontSize: 12, color: T.muted }}>%</span>
                    <select value={rowDraft.kind} onChange={(e) => setRowDraft((r) => ({ ...r, kind: e.target.value }))} style={inputSt}>
                      <option value="open">Em aberto</option>
                      <option value="won">Ganho</option>
                      <option value="lost">Perdido</option>
                    </select>
                    <Btn size="xs" onClick={() => saveRow(s.id)} disabled={savingRow}>Salvar</Btn>
                    <Btn size="xs" variant="ghost" onClick={cancelEdit}>Cancelar</Btn>
                  </>
                ) : (
                  <>
                    <span style={{ width: 14, height: 14, borderRadius: "50%", background: s.color || T.faint3, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.ink, fontFamily: T.font, flex: 1 }}>{s.name}</span>
                    <Badge color={T.muted} bg={T.faint}>{STAGE_KIND_LABEL[s.kind]}</Badge>
                    <span style={{ fontSize: 12, fontFamily: T.mono, color: T.muted, width: 42, textAlign: "right" }}>{s.probability ?? 0}%</span>
                    <span style={{ fontSize: 11.5, color: T.faint3, width: 70, textAlign: "right" }}>{n} negócio{n === 1 ? "" : "s"}</span>
                    <button onClick={() => startEdit(s)} title="Editar" style={{ border: "none", background: "none", cursor: "pointer", color: T.teal, padding: 4 }}><Edit3 size={14} /></button>
                    <button onClick={() => removeStage(s)} title="Excluir" style={{ border: "none", background: "none", cursor: "pointer", color: T.coral, padding: 4 }}><Trash2 size={14} /></button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   CUSTOM FIELDS TAB — gerenciador de campos personalizados
   Substitui o módulo "Campos Personalizados" do RD Station.
   Dados em Supabase: custom_fields + lead_custom_values
═══════════════════════════════════════════════════════════ */
const CustomFieldsTab = ({ toast }) => {
  const [fields, setFields]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [search, setSearch]   = useState("");
  const [filterSource, setFilterSource] = useState("all");
  const [editing, setEditing] = useState(null); // null | "new" | {field}
  const [draft, setDraft]     = useState({ label:"", api_id:"", type:"text", source:"manual", options:"", description:"", required:false });
  const [saving, setSaving]   = useState(false);

  const fetchFields = useCallback(async () => {
    setLoading(true); setError(null);
    const { data, error } = await supabase
      .from("custom_fields")
      .select("*")
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) { setError(error.message); setLoading(false); return; }
    setFields(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchFields(); }, [fetchFields]);

  const filtered = fields.filter(f => {
    const matchesSearch = !search ||
      f.label?.toLowerCase().includes(search.toLowerCase()) ||
      f.api_id?.toLowerCase().includes(search.toLowerCase());
    const matchesSource = filterSource === "all" || f.source === filterSource;
    return matchesSearch && matchesSource;
  });

  const countBy = (src) => fields.filter(f => f.source === src).length;

  const openNew = () => {
    setDraft({ label:"", api_id:"", type:"text", source:"manual", options:"", description:"", required:false });
    setEditing("new");
  };

  const openEdit = (f) => {
    setDraft({
      label: f.label || "",
      api_id: f.api_id || "",
      type: f.type || "text",
      source: f.source || "manual",
      options: Array.isArray(f.options) ? f.options.join("\n") : "",
      description: f.description || "",
      required: !!f.required,
    });
    setEditing(f);
  };

  const closeEditor = () => { setEditing(null); };

  const save = async () => {
    if (!draft.label.trim()) return toast("Informe um nome para o campo", "error");
    setSaving(true);
    const apiId = draft.api_id?.trim() || slugifyApiId(draft.label);
    const optionsArr = ["select","multiselect","radio","checkbox"].includes(draft.type)
      ? draft.options.split("\n").map(s=>s.trim()).filter(Boolean)
      : [];
    const payload = {
      label: draft.label.trim(),
      api_id: apiId,
      type: draft.type,
      source: draft.source,
      options: optionsArr,
      description: draft.description?.trim() || null,
      required: !!draft.required,
    };
    let res;
    if (editing === "new") {
      res = await supabase.from("custom_fields").insert(payload).select().single();
    } else {
      res = await supabase.from("custom_fields").update(payload).eq("id", editing.id).select().single();
    }
    setSaving(false);
    if (res.error) { toast(`Erro: ${res.error.message}`, "error"); return; }
    logAudit({ action: editing==="new"?"created":"updated", resource:"custom_fields", resource_id: res.data?.api_id, details:{ label: payload.label } });
    toast(editing === "new" ? "Campo criado!" : "Campo atualizado!", "success");
    closeEditor();
    fetchFields();
  };

  const remove = async (f) => {
    if (!confirm(`Excluir o campo "${f.label}"?\nIsso vai remover os valores associados em todos os leads.`)) return;
    const { error } = await supabase.from("custom_fields").delete().eq("id", f.id);
    if (error) return toast(`Erro: ${error.message}`, "error");
    logAudit({ action:"deleted", resource:"custom_fields", resource_id: f.api_id, details:{ label:f.label } });
    toast("Campo removido", "success");
    fetchFields();
  };

  const copyApiId = (apiId) => {
    navigator.clipboard?.writeText(apiId);
    toast(`${apiId} copiado`, "success");
  };

  const srcMeta = (src) => FIELD_SOURCES.find(s => s.value === src) || FIELD_SOURCES[0];
  const typeLabel = (t) => FIELD_TYPES.find(x => x.value === t)?.label || t;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {/* Resumo */}
      <Card>
        <SectionTitle sub={`${fields.length} campos cadastrados — replicam os campos cf_* do RD Station`}>Campos Personalizados</SectionTitle>
        <div style={{display:"grid",gridTemplateColumns:"repeat(6, 1fr)",gap:10,marginBottom:8}}>
          {FIELD_SOURCES.map(s => (
            <div key={s.value} style={{padding:"10px 12px",borderRadius:10,border:`1px solid ${T.border}`,background:T.faint}}>
              <div style={{fontSize:11,fontWeight:700,color:s.color,textTransform:"uppercase",letterSpacing:"0.06em",fontFamily:T.head}}>{s.label}</div>
              <div style={{fontSize:20,fontWeight:800,color:T.ink,fontFamily:T.head,marginTop:2}}>{countBy(s.value)}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Toolbar */}
      <Card>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <div style={{position:"relative",flex:"1 1 240px",minWidth:200}}>
            <Search size={14} color={T.muted} style={{position:"absolute",left:10,top:11}}/>
            <input
              type="text" value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Buscar por nome ou api_id..."
              style={{width:"100%",padding:"9px 12px 9px 32px",borderRadius:8,border:`1.5px solid ${T.border}`,fontSize:13,color:T.text,outline:"none",fontFamily:T.font,boxSizing:"border-box"}}
              onFocus={e=>e.target.style.borderColor=T.teal} onBlur={e=>e.target.style.borderColor=T.border}/>
          </div>
          <select value={filterSource} onChange={e=>setFilterSource(e.target.value)}
            style={{padding:"9px 12px",borderRadius:8,border:`1.5px solid ${T.border}`,fontSize:13,color:T.text,background:"#fff",outline:"none",fontFamily:T.font,cursor:"pointer"}}>
            <option value="all">Todas as origens</option>
            {FIELD_SOURCES.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <div style={{flex:1}}/>
          <Btn variant="outline" size="sm" icon={<RefreshCw size={12}/>} onClick={fetchFields}>Recarregar</Btn>
          <Btn size="sm" icon={<Plus size={12}/>} onClick={openNew}>Novo campo</Btn>
        </div>
      </Card>

      {/* Estados */}
      {loading && (
        <Card style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:30}}>
          <Loader2 size={18} color={T.teal} style={{animation:"spin 1s linear infinite"}}/>
          <span style={{fontSize:13,color:T.muted,fontFamily:T.font}}>Carregando campos...</span>
        </Card>
      )}

      {error && (
        <Card style={{borderLeft:`4px solid ${T.coral}`,background:"#fff5f4"}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
            <AlertTriangle size={18} color={T.coral} style={{flexShrink:0,marginTop:2}}/>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:T.coral,fontFamily:T.head}}>Erro ao carregar custom_fields</div>
              <div style={{fontSize:12,color:T.muted,fontFamily:T.mono,marginTop:4}}>{error}</div>
              <div style={{fontSize:12,color:T.muted,fontFamily:T.font,marginTop:6}}>Verifique se a migration 001_custom_fields.sql foi executada no Supabase.</div>
            </div>
          </div>
        </Card>
      )}

      {/* Tabela */}
      {!loading && !error && (
        <Card style={{padding:0,overflow:"hidden"}}>
          <div style={{overflow:"auto",maxHeight:560}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontFamily:T.font}}>
              <thead style={{position:"sticky",top:0,background:T.faint,zIndex:1}}>
                <tr>
                  <th style={{padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",fontFamily:T.head,borderBottom:`1px solid ${T.border}`}}>Nome</th>
                  <th style={{padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",fontFamily:T.head,borderBottom:`1px solid ${T.border}`}}>API ID</th>
                  <th style={{padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",fontFamily:T.head,borderBottom:`1px solid ${T.border}`}}>Tipo</th>
                  <th style={{padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",fontFamily:T.head,borderBottom:`1px solid ${T.border}`}}>Origem</th>
                  <th style={{padding:"10px 14px",textAlign:"right",fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",fontFamily:T.head,borderBottom:`1px solid ${T.border}`}}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={5} style={{padding:30,textAlign:"center",fontSize:13,color:T.muted,fontFamily:T.font}}>Nenhum campo encontrado.</td></tr>
                )}
                {filtered.map(f => {
                  const sm = srcMeta(f.source);
                  return (
                    <tr key={f.id} style={{borderBottom:`1px solid ${T.border}`}}>
                      <td style={{padding:"10px 14px",fontSize:13,color:T.ink,fontFamily:T.font}}>
                        <div style={{fontWeight:600}}>{f.label}</div>
                        {f.description && <div style={{fontSize:11,color:T.muted,marginTop:2}}>{f.description}</div>}
                      </td>
                      <td style={{padding:"10px 14px",fontSize:12,color:T.text,fontFamily:T.mono}}>
                        <span style={{display:"inline-flex",alignItems:"center",gap:6,background:T.faint,padding:"3px 8px",borderRadius:6,cursor:"pointer"}} onClick={()=>copyApiId(f.api_id)} title="Copiar">
                          {f.api_id}<CopyIcon size={11} color={T.muted}/>
                        </span>
                      </td>
                      <td style={{padding:"10px 14px",fontSize:12,color:T.text,fontFamily:T.font}}>{typeLabel(f.type)}{f.required && <span style={{color:T.coral,marginLeft:4}}>*</span>}</td>
                      <td style={{padding:"10px 14px"}}>
                        <Badge color={sm.color}>{sm.label}</Badge>
                      </td>
                      <td style={{padding:"10px 14px",textAlign:"right",whiteSpace:"nowrap"}}>
                        <Btn variant="ghost" size="xs" icon={<Edit3 size={11}/>} onClick={()=>openEdit(f)}>Editar</Btn>
                        <Btn variant="ghost" size="xs" icon={<Trash2 size={11}/>} onClick={()=>remove(f)} style={{color:T.coral}}>Excluir</Btn>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal de edição */}
      {editing && (
        <div onClick={closeEditor}
          style={{position:"fixed",inset:0,background:"rgba(14,26,36,0.5)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9000,padding:20}}>
          <div onClick={e=>e.stopPropagation()}
            style={{background:T.surface,borderRadius:16,width:"100%",maxWidth:600,maxHeight:"90vh",overflow:"auto",boxShadow:"0 25px 80px -20px rgba(14,26,36,0.4)"}}>
            <div style={{padding:"18px 22px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <Database size={18} color={T.teal}/>
                <span style={{fontSize:15,fontWeight:700,color:T.ink,fontFamily:T.head}}>{editing==="new" ? "Novo campo personalizado" : "Editar campo"}</span>
              </div>
              <button onClick={closeEditor} style={{background:"none",border:"none",cursor:"pointer",padding:4,color:T.muted}}><X size={18}/></button>
            </div>
            <div style={{padding:"20px 22px",display:"flex",flexDirection:"column",gap:14}}>
              <Input label="Nome do Campo *" value={draft.label}
                onChange={e=>setDraft(d=>({...d,label:e.target.value,api_id: d.api_id || slugifyApiId(e.target.value)}))}
                placeholder="Ex: Urgência e Necessidade"/>
              <Input label="API ID (identificador único)" value={draft.api_id}
                onChange={e=>setDraft(d=>({...d,api_id:e.target.value}))}
                disabled={editing!=="new"}
                hint={editing==="new" ? "Gerado automático do nome. Use prefixo cf_." : "API ID não pode ser alterado depois de criado."}
                placeholder="cf_meu_campo"/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <Sel label="Tipo" value={draft.type}
                  onChange={e=>setDraft(d=>({...d,type:e.target.value}))}
                  options={FIELD_TYPES}/>
                <Sel label="Origem" value={draft.source}
                  onChange={e=>setDraft(d=>({...d,source:e.target.value}))}
                  options={FIELD_SOURCES.map(s=>({value:s.value,label:s.label}))}/>
              </div>
              {["select","multiselect","radio","checkbox"].includes(draft.type) && (
                <div>
                  <FL>Opções (uma por linha)</FL>
                  <textarea value={draft.options}
                    onChange={e=>setDraft(d=>({...d,options:e.target.value}))}
                    rows={4} placeholder={"Privada\nPública"}
                    style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1.5px solid ${T.border}`,fontSize:13,color:T.text,fontFamily:T.font,resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
                </div>
              )}
              <div>
                <FL>Descrição (opcional)</FL>
                <textarea value={draft.description}
                  onChange={e=>setDraft(d=>({...d,description:e.target.value}))}
                  rows={2} placeholder="Como esse campo é usado..."
                  style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1.5px solid ${T.border}`,fontSize:13,color:T.text,fontFamily:T.font,resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
              </div>
              <Toggle checked={draft.required} onChange={v=>setDraft(d=>({...d,required:v}))} label="Campo obrigatório em formulários"/>
            </div>
            <div style={{padding:"14px 22px",borderTop:`1px solid ${T.border}`,display:"flex",justifyContent:"flex-end",gap:8,background:T.faint}}>
              <Btn variant="outline" size="sm" onClick={closeEditor}>Cancelar</Btn>
              <Btn size="sm" onClick={save} disabled={saving} icon={saving?<Loader2 size={12}/>:<Save size={12}/>}>{saving?"Salvando...":"Salvar"}</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   LEAD TRACKING TAB — gerenciador de páginas rastreadas
   Substitui o módulo Lead Tracking do RD Station.
═══════════════════════════════════════════════════════════ */
const TrackingTab = ({ toast }) => {
  const [pages, setPages]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [search, setSearch]   = useState("");
  const [filterFunnel, setFilterFunnel] = useState("all");
  const [editing, setEditing] = useState(null);
  const [draft, setDraft]     = useState({ url:"", title:"", funnel:"outro", score_delta:5, category:"", active:true });
  const [saving, setSaving]   = useState(false);
  const [showSnippet, setShowSnippet] = useState(false);

  const fetchPages = useCallback(async () => {
    setLoading(true); setError(null);
    const { data, error } = await supabase
      .from("tracked_pages")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { setError(error.message); setLoading(false); return; }
    setPages(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  const filtered = pages.filter(p => {
    const m1 = !search || p.url?.toLowerCase().includes(search.toLowerCase()) || p.title?.toLowerCase().includes(search.toLowerCase());
    const m2 = filterFunnel === "all" || p.funnel === filterFunnel;
    return m1 && m2;
  });

  const countBy = (f) => pages.filter(p => p.funnel === f).length;

  const openNew = () => {
    setDraft({ url:"", title:"", funnel:"outro", score_delta:5, category:"", active:true });
    setEditing("new");
  };
  const openEdit = (p) => {
    setDraft({ url:p.url, title:p.title||"", funnel:p.funnel||"outro", score_delta:p.score_delta??5, category:p.category||"", active:!!p.active });
    setEditing(p);
  };
  const closeEditor = () => setEditing(null);

  const save = async () => {
    if (!draft.url.trim()) return toast("URL é obrigatória", "error");
    setSaving(true);
    const payload = {
      url: draft.url.trim().replace(/^https?:\/\//,"").replace(/\?.*$/,""),
      title: draft.title?.trim() || null,
      funnel: draft.funnel,
      score_delta: Number(draft.score_delta) || 0,
      category: draft.category?.trim() || null,
      active: !!draft.active,
    };
    let res;
    if (editing === "new") {
      res = await supabase.from("tracked_pages").insert(payload).select().single();
    } else {
      res = await supabase.from("tracked_pages").update(payload).eq("id", editing.id).select().single();
    }
    setSaving(false);
    if (res.error) { toast(`Erro: ${res.error.message}`, "error"); return; }
    logAudit({ action: editing==="new"?"created":"updated", resource:"tracked_pages", resource_id: payload.url, details:{ funnel:payload.funnel } });
    toast(editing === "new" ? "Página adicionada!" : "Página atualizada!", "success");
    closeEditor();
    fetchPages();
  };

  const remove = async (p) => {
    if (!confirm(`Remover rastreamento de "${p.url}"?`)) return;
    const { error } = await supabase.from("tracked_pages").delete().eq("id", p.id);
    if (error) return toast(`Erro: ${error.message}`, "error");
    logAudit({ action:"deleted", resource:"tracked_pages", resource_id: p.url });
    toast("Página removida", "success");
    fetchPages();
  };

  const toggleActive = async (p) => {
    const { error } = await supabase.from("tracked_pages").update({ active: !p.active }).eq("id", p.id);
    if (error) return toast(`Erro: ${error.message}`, "error");
    fetchPages();
  };

  const funnelMeta = (f) => FUNNEL_OPTIONS.find(x => x.value === f) || FUNNEL_OPTIONS[4];

  const supabaseUrl = (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) || "https://[PROJECT].supabase.co";
  const snippet = `<!-- Vantari Lead Tracker — colar antes do </body> -->
<script async
  src="https://app.vantari.com.br/tracker.js"
  data-endpoint="${supabaseUrl}/functions/v1/track"></script>`;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {/* Header + Snippet */}
      <Card style={{borderLeft:`4px solid ${T.teal}`}}>
        <SectionTitle sub={`${pages.length} páginas rastreadas — substitui o Lead Tracking do RD Station`}>Lead Tracking</SectionTitle>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5, 1fr)",gap:10,marginBottom:16}}>
          {FUNNEL_OPTIONS.map(f => (
            <div key={f.value} style={{padding:"10px 12px",borderRadius:10,border:`1px solid ${T.border}`,background:T.faint}}>
              <div style={{fontSize:11,fontWeight:700,color:f.color,textTransform:"uppercase",letterSpacing:"0.06em",fontFamily:T.head}}>{f.label}</div>
              <div style={{fontSize:20,fontWeight:800,color:T.ink,fontFamily:T.head,marginTop:2}}>{countBy(f.value)}</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <Btn variant="secondary" size="sm" icon={<FileText size={12}/>} onClick={()=>setShowSnippet(s=>!s)}>{showSnippet?"Ocultar":"Ver"} snippet de instalação</Btn>
          <span style={{fontSize:12,color:T.muted,fontFamily:T.font}}>Cole esse script no &lt;/body&gt; de vantari.com.br pra começar a rastrear.</span>
        </div>
        {showSnippet && (
          <div style={{marginTop:12,padding:14,background:"#0E1A24",borderRadius:10,position:"relative"}}>
            <pre style={{margin:0,fontFamily:T.mono,fontSize:12,color:"#E2EAF0",whiteSpace:"pre-wrap",wordBreak:"break-all"}}>{snippet}</pre>
            <button onClick={()=>{navigator.clipboard?.writeText(snippet);toast("Snippet copiado!","success");}}
              style={{position:"absolute",top:10,right:10,background:"rgba(255,255,255,0.1)",color:"#fff",border:"none",borderRadius:6,padding:"5px 10px",fontSize:11,fontFamily:T.font,fontWeight:600,cursor:"pointer"}}>Copiar</button>
          </div>
        )}
      </Card>

      {/* Toolbar */}
      <Card>
        <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <div style={{position:"relative",flex:"1 1 240px",minWidth:200}}>
            <Search size={14} color={T.muted} style={{position:"absolute",left:10,top:11}}/>
            <input type="text" value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Buscar por URL ou título..."
              style={{width:"100%",padding:"9px 12px 9px 32px",borderRadius:8,border:`1.5px solid ${T.border}`,fontSize:13,color:T.text,outline:"none",fontFamily:T.font,boxSizing:"border-box"}}
              onFocus={e=>e.target.style.borderColor=T.teal} onBlur={e=>e.target.style.borderColor=T.border}/>
          </div>
          <select value={filterFunnel} onChange={e=>setFilterFunnel(e.target.value)}
            style={{padding:"9px 12px",borderRadius:8,border:`1.5px solid ${T.border}`,fontSize:13,color:T.text,background:"#fff",outline:"none",fontFamily:T.font,cursor:"pointer"}}>
            <option value="all">Todos os funis</option>
            {FUNNEL_OPTIONS.map(f=><option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <div style={{flex:1}}/>
          <Btn variant="outline" size="sm" icon={<RefreshCw size={12}/>} onClick={fetchPages}>Recarregar</Btn>
          <Btn size="sm" icon={<Plus size={12}/>} onClick={openNew}>Nova página</Btn>
        </div>
      </Card>

      {loading && (
        <Card style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:30}}>
          <Loader2 size={18} color={T.teal} style={{animation:"spin 1s linear infinite"}}/>
          <span style={{fontSize:13,color:T.muted,fontFamily:T.font}}>Carregando páginas...</span>
        </Card>
      )}

      {error && (
        <Card style={{borderLeft:`4px solid ${T.coral}`,background:"#fff5f4"}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
            <AlertTriangle size={18} color={T.coral} style={{flexShrink:0,marginTop:2}}/>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:T.coral,fontFamily:T.head}}>Erro ao carregar tracked_pages</div>
              <div style={{fontSize:12,color:T.muted,fontFamily:T.mono,marginTop:4}}>{error}</div>
              <div style={{fontSize:12,color:T.muted,fontFamily:T.font,marginTop:6}}>Verifique se a migration 003_lead_tracking.sql foi executada no Supabase.</div>
            </div>
          </div>
        </Card>
      )}

      {!loading && !error && (
        <Card style={{padding:0,overflow:"hidden"}}>
          <div style={{overflow:"auto",maxHeight:560}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontFamily:T.font}}>
              <thead style={{position:"sticky",top:0,background:T.faint,zIndex:1}}>
                <tr>
                  <th style={{padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",fontFamily:T.head,borderBottom:`1px solid ${T.border}`}}>Página</th>
                  <th style={{padding:"10px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",fontFamily:T.head,borderBottom:`1px solid ${T.border}`}}>Funil</th>
                  <th style={{padding:"10px 14px",textAlign:"right",fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",fontFamily:T.head,borderBottom:`1px solid ${T.border}`}}>Pts</th>
                  <th style={{padding:"10px 14px",textAlign:"center",fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",fontFamily:T.head,borderBottom:`1px solid ${T.border}`}}>Ativo</th>
                  <th style={{padding:"10px 14px",textAlign:"right",fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",fontFamily:T.head,borderBottom:`1px solid ${T.border}`}}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={5} style={{padding:30,textAlign:"center",fontSize:13,color:T.muted,fontFamily:T.font}}>Nenhuma página encontrada.</td></tr>
                )}
                {filtered.map(p => {
                  const fm = funnelMeta(p.funnel);
                  return (
                    <tr key={p.id} style={{borderBottom:`1px solid ${T.border}`,opacity:p.active?1:0.5}}>
                      <td style={{padding:"10px 14px",fontSize:13,color:T.ink,fontFamily:T.font}}>
                        <div style={{fontWeight:600}}>{p.title || "(sem título)"}</div>
                        <div style={{fontSize:11,color:T.muted,fontFamily:T.mono,marginTop:2}}>{p.url}</div>
                      </td>
                      <td style={{padding:"10px 14px"}}><Badge color={fm.color}>{fm.label}</Badge></td>
                      <td style={{padding:"10px 14px",textAlign:"right",fontSize:13,fontFamily:T.mono,color:T.text,fontWeight:600}}>+{p.score_delta}</td>
                      <td style={{padding:"10px 14px",textAlign:"center"}}>
                        <div style={{display:"flex",justifyContent:"center"}}>
                          <Toggle checked={p.active} onChange={()=>toggleActive(p)}/>
                        </div>
                      </td>
                      <td style={{padding:"10px 14px",textAlign:"right",whiteSpace:"nowrap"}}>
                        <Btn variant="ghost" size="xs" icon={<Edit3 size={11}/>} onClick={()=>openEdit(p)}>Editar</Btn>
                        <Btn variant="ghost" size="xs" icon={<Trash2 size={11}/>} onClick={()=>remove(p)} style={{color:T.coral}}>Excluir</Btn>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {editing && (
        <div onClick={closeEditor}
          style={{position:"fixed",inset:0,background:"rgba(14,26,36,0.5)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9000,padding:20}}>
          <div onClick={e=>e.stopPropagation()}
            style={{background:T.surface,borderRadius:16,width:"100%",maxWidth:560,maxHeight:"90vh",overflow:"auto",boxShadow:"0 25px 80px -20px rgba(14,26,36,0.4)"}}>
            <div style={{padding:"18px 22px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <Activity size={18} color={T.teal}/>
                <span style={{fontSize:15,fontWeight:700,color:T.ink,fontFamily:T.head}}>{editing==="new" ? "Nova página rastreada" : "Editar página"}</span>
              </div>
              <button onClick={closeEditor} style={{background:"none",border:"none",cursor:"pointer",padding:4,color:T.muted}}><X size={18}/></button>
            </div>
            <div style={{padding:"20px 22px",display:"flex",flexDirection:"column",gap:14}}>
              <Input label="URL *" value={draft.url}
                onChange={e=>setDraft(d=>({...d,url:e.target.value}))}
                placeholder="vantari.com.br/blog/meu-post"
                hint="Sem https:// — domínio + path"/>
              <Input label="Título" value={draft.title}
                onChange={e=>setDraft(d=>({...d,title:e.target.value}))}
                placeholder="Ex: Como calcular verbas rescisórias"/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                <Sel label="Funil" value={draft.funnel}
                  onChange={e=>setDraft(d=>({...d,funnel:e.target.value}))}
                  options={FUNNEL_OPTIONS.map(f=>({value:f.value,label:f.label}))}/>
                <Input label="Pontos no Scoring" type="number" value={draft.score_delta}
                  onChange={e=>setDraft(d=>({...d,score_delta:e.target.value}))}
                  hint="Quantos pts somar quando lead visita"/>
              </div>
              <Input label="Categoria" value={draft.category}
                onChange={e=>setDraft(d=>({...d,category:e.target.value}))}
                placeholder="blog, lp, produto"/>
              <Toggle checked={draft.active} onChange={v=>setDraft(d=>({...d,active:v}))} label="Ativo (rastreando visitas)"/>
            </div>
            <div style={{padding:"14px 22px",borderTop:`1px solid ${T.border}`,display:"flex",justifyContent:"flex-end",gap:8,background:T.faint}}>
              <Btn variant="outline" size="sm" onClick={closeEditor}>Cancelar</Btn>
              <Btn size="sm" onClick={save} disabled={saving} icon={saving?<Loader2 size={12}/>:<Save size={12}/>}>{saving?"Salvando...":"Salvar"}</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   ROOT — topbar idêntico ao vantari-analytics-dashboard
═══════════════════════════════════════════════════════════ */
const NavSection = ({ label, collapsed=false }) => (
  collapsed ? <div style={{height:10}}/> : (
    <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.18em",color:"rgba(255,255,255,0.4)",padding:"10px 20px 4px",textTransform:"uppercase",fontFamily:T.head}}>{label}</div>
  )
);

const NavItem = ({ icon: Icon, label, active = false, path, collapsed = false }) => {
  const [hov, setHov] = useState(false);
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
        fontWeight:active?700:600,fontFamily:T.font,
        color:active?"#fff":hov?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.6)",
        background:active?"rgba(255,255,255,0.10)":hov?"rgba(255,255,255,0.06)":"transparent",
        cursor:"pointer",transition:"all 0.15s",userSelect:"none",
      }}>
      {active && (
        <span style={{position:"absolute",left:0,top:6,bottom:6,width:3,background:"linear-gradient(180deg, #14A273 0%, #5EEAD4 100%)",borderRadius:"0 3px 3px 0"}} />
      )}
      {Icon && <Icon size={16} aria-hidden="true" />}{!collapsed && label}
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

export default function VantariSettingsAdmin() {
  const [activeTab,setActiveTab] = useState("workspace");
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const {toasts,push:toast} = useToast();

  return (
    <div style={{display:"flex",height:"100vh",background:T.bg,fontFamily:T.font,overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:6px;height:6px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:#B3BFCA;border-radius:99px;}
        @keyframes toastIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
      `}</style>

      {/* ── SIDEBAR ── */}
      <div style={{width: collapsed ? 64 : 240, transition:"width 0.15s", background:T.sidebarBg,display:"flex",flexDirection:"column",flexShrink:0,position:"relative",overflow:"visible"}}>
        {/* glow topo-direito */}
        <div style={{position:"absolute",inset:0,pointerEvents:"none",background:"radial-gradient(circle at 90% 0%, rgba(20,162,115,.25) 0%, transparent 50%)"}} />

        {/* Brand */}
        <div style={{padding: collapsed ? "20px 0 0" : "20px 20px 0",position:"relative"}}>
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
          <NavItem icon={BarChart2}      label="Analytics"      path="/dashboard"     collapsed={collapsed}/>
          <NavItem icon={Users}          label="Leads"          path="/leads"         collapsed={collapsed}/>
          <NavItem icon={Inbox}          label="Atendimento"    path="/inbox"         collapsed={collapsed}/>
          <NavSection label="CRM" collapsed={collapsed}/>
          <NavItem icon={Briefcase} label="Negócios" path="/crm" collapsed={collapsed}/>
          <NavItem icon={Building2} label="Empresas" path="/empresas" collapsed={collapsed}/>
          <NavItem icon={Activity} label="Atividades" path="/activities" collapsed={collapsed}/>
          <NavItem icon={ListChecks} label="Tarefas" path="/tasks" collapsed={collapsed}/>
          <NavItem icon={AlertTriangle} label="Em Risco" path="/risco" collapsed={collapsed}/>
          <NavItem icon={FileBarChart} label="Relatórios" path="/reports" collapsed={collapsed} />
          <NavSection label="Ferramentas" collapsed={collapsed}/>
          <NavItem icon={Mail}           label="Email Marketing" path="/email"        collapsed={collapsed}/>
          <NavItem icon={Star}           label="Scoring"        path="/scoring"       collapsed={collapsed}/>
          <NavItem icon={LayoutTemplate} label="Landing Pages"  path="/landing"       collapsed={collapsed}/>
          <NavItem icon={Filter}         label="Segmentações"   path="/segments"      collapsed={collapsed}/>
          <NavItem icon={Bot}            label="IA & Automação" path="/ai-marketing"  collapsed={collapsed}/>
          <NavItem icon={Zap}            label="Automação de Marketing" path="/workflow" collapsed={collapsed}/>
          <NavSection label="Sistema" collapsed={collapsed}/>
          <NavItem icon={Plug}           label="Integrações"    path="/integrations"  collapsed={collapsed}/>
        </div>
        <div style={{borderTop:"1px solid rgba(255,255,255,0.08)",padding:"8px 0",position:"relative"}}>
          <AccountMenu collapsed={collapsed} />
          <NavItem icon={Settings} label="Configurações" path="/settings" active collapsed={collapsed}/>
        </div>
        <div style={{borderTop:"1px solid rgba(255,255,255,0.08)",padding:"8px 0",position:"relative"}}>
          <div onClick={() => setCollapsed(c => !c)} title={collapsed ? "Expandir menu" : "Recolher menu"}
            style={{ display:"flex", alignItems:"center", justifyContent: collapsed ? "center" : "flex-end", gap:6, padding: collapsed ? "8px 0" : "8px 20px", fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.6)", cursor:"pointer", fontFamily:T.font }}>
            {collapsed ? <ChevronRight size={16} aria-hidden="true"/> : <><span>Recolher</span><ChevronLeft size={16} aria-hidden="true"/></>}
          </div>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

      {/* Topbar */}
      <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"0 28px",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",height:60}}>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:32,height:32,borderRadius:8,background:T.gradient,display:"flex",alignItems:"center",justifyContent:"center"}}><Settings size={16} color="#fff"/></div>
              <div>
                <div style={{fontSize:14,fontWeight:800,color:T.ink,letterSpacing:"-0.02em",fontFamily:T.head}}>Configurações</div>
                <div style={{fontSize:10,color:T.muted,fontWeight:500,fontFamily:T.font}}>Vantari Platform</div>
              </div>
            </div>
            <div style={{width:1,height:28,background:T.border}}/>
            <div style={{display:"flex",gap:2}}>
              {TABS.map(t=>(
                <button key={t.id} onClick={()=>setActiveTab(t.id)}
                  style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",background:"none",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:activeTab===t.id?700:500,color:activeTab===t.id?T.teal:T.muted,fontFamily:T.font,borderBottom:activeTab===t.id?`2px solid ${T.teal}`:"2px solid transparent",transition:"all 0.15s"}}>
                  <t.Icon size={14}/>{t.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <Badge color={T.green} bg="#ecfdf5">● Online</Badge>
            <Btn variant="secondary" size="sm" icon={<HelpCircle size={12}/>}>Ajuda</Btn>
          </div>
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",background:T.bg}}><div style={{padding:"24px 28px",maxWidth:1100,margin:"0 auto"}}>
        {activeTab==="workspace"   &&<WorkspaceTab    toast={toast}/>}
        {activeTab==="team"        &&<TeamTab         toast={toast}/>}
        {activeTab==="pipelines"   &&<PipelinesTab    toast={toast}/>}
        {activeTab==="customfields"&&<CustomFieldsTab toast={toast}/>}
        {activeTab==="tracking"    &&<TrackingTab     toast={toast}/>}
        {activeTab==="email"       &&<EmailTab        toast={toast}/>}
        {activeTab==="billing"     &&<BillingTab      toast={toast}/>}
        {activeTab==="advanced"    &&<AdvancedTab     toast={toast}/>}
        {activeTab==="audit"       &&<AuditTab/>}
        {activeTab==="support"     &&<SupportTab      toast={toast}/>}
      </div></div>

      <Toasts toasts={toasts}/>
      </div>{/* ── end MAIN ── */}
    </div>
  );
}
