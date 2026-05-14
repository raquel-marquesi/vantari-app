import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabase";
import {
  BarChart2, Users, Mail, Star, LayoutTemplate, Bot, Plug, Settings,
  Building2, CreditCard, ClipboardList, Headphones, Zap, Sparkles,
  Save, Send, Key, Package, RefreshCw, Download, FileText, Plus,
  FolderOpen, HelpCircle, CheckCircle, BookOpen, Play, MessageSquare,
  Loader2, AlertTriangle, ArrowUp,
} from "lucide-react";

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
  { id:"workspace", Icon:Building2,     label:"Workspace"  },
  { id:"team",      Icon:Users,         label:"Equipe"      },
  { id:"email",     Icon:Mail,          label:"Email"       },
  { id:"billing",   Icon:CreditCard,    label:"Billing"     },
  { id:"advanced",  Icon:Settings,      label:"Avançado"   },
  { id:"audit",     Icon:ClipboardList, label:"Audit Log"   },
  { id:"support",   Icon:Headphones,    label:"Suporte"     },
];

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
const Btn = ({children,onClick,variant="primary",size="sm",icon,disabled,style:sx={}}) => {
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
  return <button onClick={onClick} disabled={disabled} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{display:"inline-flex",alignItems:"center",gap:6,background:v.bg,color:v.color,border:v.border||"none",borderRadius:10,padding:pad,fontSize:fs,fontWeight:700,fontFamily:T.font,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.5:1,boxShadow:v.shadow,transition:"all 0.15s",whiteSpace:"nowrap",...sx}}>{icon&&<span style={{fontSize:fs+1}}>{icon}</span>}{children}</button>;
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
  const [f,setF] = useState({companyName:"Empresa LTDA",domain:"empresa.com.br",timezone:"America/Sao_Paulo",dateFormat:"DD/MM/YYYY",language:"pt-BR",primaryColor:"#0D7491"});
  const [saving,setSaving] = useState(false);
  const fileRef = useRef();
  const u=(k,v)=>setF(x=>({...x,[k]:v}));
  const save=async()=>{setSaving(true);await new Promise(r=>setTimeout(r,900));setSaving(false);toast("Configurações salvas!","success");};

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
            <Btn variant="outline" size="sm" onClick={()=>fileRef.current?.click()} icon={<FolderOpen size={12}/>}>Escolher arquivo</Btn>
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
        <Btn onClick={save} disabled={saving} size="md" icon={saving?<Loader2 size={12}/>:<Save size={12}/>}>{saving?"Salvando...":"Salvar Configurações"}</Btn>
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
    else { toast(`Convite registado para ${invEmail}`,"success"); fetchMembers(); }
    setInvEmail(""); setInviting(false);
  };

  const removeMember = async (id) => {
    const { error } = await supabase.from("team_members").delete().eq("id", id);
    if (error) toast("Erro ao remover", "error");
    else { toast("Membro removido","success"); fetchMembers(); }
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
                    {m.role!=="admin"&&<Btn variant="danger" size="xs" onClick={()=>removeMember(m.id)}>Remover</Btn>}
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
      <Card>
        <SectionTitle sub="SMTP customizado ou padrão Supabase">Servidor de Email</SectionTitle>
        <Toggle checked={useSmtp} onChange={setUseSmtp} label="Usar SMTP próprio"/>
        {useSmtp&&(
          <div style={{marginTop:16,display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Input label="Host SMTP" value={smtp.host} onChange={e=>su("host",e.target.value)} placeholder="smtp.gmail.com"/>
            <Input label="Porta"     value={smtp.port} onChange={e=>su("port",e.target.value)}/>
            <Input label="Usuário"   value={smtp.user} onChange={e=>su("user",e.target.value)} placeholder="usuario@empresa.com.br"/>
            <Input label="Senha"     value={smtp.pass} onChange={e=>su("pass",e.target.value)} type="password"/>
            <Btn variant="outline" onClick={async()=>{setTesting(true);await new Promise(r=>setTimeout(r,1100));setTesting(false);toast("SMTP conectado!","success");}} disabled={testing} icon={testing?<Loader2 size={12}/>:<Plug size={12}/>}>{testing?"Testando...":"Testar Conexão"}</Btn>
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle sub="Configuração SPF, DKIM e DMARC">Domínio de Envio Verificado</SectionTitle>
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
        <Btn onClick={async()=>{setSaving(true);await new Promise(r=>setTimeout(r,800));setSaving(false);toast("Email Config salvo!","success");}} disabled={saving} size="md" icon={saving?<Loader2 size={12}/>:<Save size={12}/>}>{saving?"Salvando...":"Salvar Email Config"}</Btn>
      </div>
    </div>
  );
};

const BillingTab = ({toast}) => {
  const plan={name:"Growth",price:"R$ 497/mês",nextBilling:"01/06/2025",card:"**** **** **** 4242"};
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <Card>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",fontFamily:T.font,marginBottom:4}}>Plano Atual</div>
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
          <Btn variant="secondary" size="md" icon={<ArrowUp size={12}/>}>Fazer Upgrade</Btn>
          <Btn variant="outline"   size="md" icon={<CreditCard size={12}/>}>Atualizar Cartão</Btn>
          <Btn variant="danger"    size="sm">Cancelar Plano</Btn>
        </div>
      </Card>

      <Card>
        <SectionTitle sub="Maio 2025 · Atualizado em tempo real">Uso do Período</SectionTitle>
        {Object.values(MOCK_USAGE).map((d,i)=><UsageBar key={i} data={d}/>)}
      </Card>

      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:15,fontWeight:700,color:T.text,fontFamily:T.font}}>Histórico de Faturas</div>
          <Btn variant="outline" size="sm" icon={<Download size={12}/>}>Exportar Todas</Btn>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:T.faint}}>
            {["Período","Valor","Status","Data",""].map((h,i)=>(
              <th key={i} style={{padding:"9px 18px",textAlign:"left",fontSize:11,fontWeight:700,color:T.muted,letterSpacing:"0.06em",textTransform:"uppercase",fontFamily:T.font}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {MOCK_INVOICES.map(inv=>(
              <tr key={inv.id} style={{borderTop:`1px solid ${T.border}`}}>
                <td style={{padding:"13px 18px",fontSize:13,fontWeight:600,color:T.text,fontFamily:T.font}}>{inv.period}</td>
                <td style={{padding:"13px 18px",fontSize:13,color:T.text,fontFamily:T.font}}>{inv.amount}</td>
                <td style={{padding:"13px 18px"}}><Badge color={T.green} bg="#ecfdf5">Pago</Badge></td>
                <td style={{padding:"13px 18px",fontSize:13,color:T.muted,fontFamily:T.font}}>{inv.date}</td>
                <td style={{padding:"13px 18px"}}><Btn variant="outline" size="xs" onClick={()=>toast("Fatura baixada!","success")} icon={<FileText size={10}/>}>PDF</Btn></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

const AdvancedTab = ({toast}) => {
  const [keys,setKeys]=useState(MOCK_KEYS);
  const [hooks,setHooks]=useState(MOCK_WEBHOOKS);
  const [nk,setNk]=useState({name:"",scopes:[]});
  const [createdKey,setCreatedKey]=useState(null);
  const [creating,setCreating]=useState(false);
  const [retention,setRetention]=useState("365");
  const [lgpd,setLgpd]=useState(true);
  const [flags,setFlags]=useState({ai_assistant:true,beta_scoring:false,dark_mode:false,bulk_import:true});

  const createKey=async()=>{
    if(!nk.name)return toast("Nome obrigatório","error");
    setCreating(true);await new Promise(r=>setTimeout(r,700));
    const full="vnt_live_"+Math.random().toString(36).substring(2,34);
    setCreatedKey(full);
    setKeys(k=>[...k,{id:"k"+Date.now(),name:nk.name,prefix:"vnt_live",scopes:nk.scopes,lastUsed:"Nunca",created:new Date().toLocaleDateString("pt-BR")}]);
    setNk({name:"",scopes:[]});setCreating(false);
  };

  const tScope=s=>setNk(k=>({...k,scopes:k.scopes.includes(s)?k.scopes.filter(x=>x!==s):[...k.scopes,s]}));
  const flagLabels={ai_assistant:"Assistente IA (beta)",beta_scoring:"Novo Scoring Engine",dark_mode:"Dark Mode",bulk_import:"Importação em Massa"};

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {/* API Keys */}
      <Card>
        <SectionTitle sub="Autorize integrações externas com escopos granulares">Chaves de API</SectionTitle>
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
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {keys.map(k=>(
            <div key={k.id} style={{padding:14,background:T.faint,borderRadius:10,border:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:T.text,fontFamily:T.font}}>{k.name}</div>
                <code style={{fontSize:11,color:T.muted,fontFamily:"monospace"}}>{k.prefix}_••••••••••••••••</code>
                <div style={{display:"flex",gap:4,marginTop:4}}>{k.scopes.map(s=><Badge key={s} color={T.muted}>{s}</Badge>)}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
                <div style={{fontSize:11,color:T.muted,fontFamily:T.font}}>Usado: {k.lastUsed}</div>
                <Btn variant="danger" size="xs" onClick={()=>{setKeys(ks=>ks.filter(x=>x.id!==k.id));toast("Chave revogada","success");}}>Revogar</Btn>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Webhooks */}
      <Card>
        <SectionTitle sub="Endpoints para eventos em tempo real">Webhooks</SectionTitle>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {hooks.map(w=>(
            <div key={w.id} style={{padding:14,background:T.faint,borderRadius:10,border:`1px solid ${T.border}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:T.text,fontFamily:T.font,display:"flex",alignItems:"center",gap:8}}>
                    {w.name}{w.failCount>0&&<Badge color={T.red} bg="#fee2e2">{w.failCount} falhas</Badge>}
                  </div>
                  <code style={{fontSize:11,color:T.muted,fontFamily:"monospace"}}>{w.url}</code>
                  <div style={{display:"flex",gap:4,marginTop:6}}>{w.events.map(e=><Badge key={e} color={T.teal}>{e}</Badge>)}</div>
                </div>
                <Toggle checked={w.enabled} onChange={()=>setHooks(h=>h.map(x=>x.id===w.id?{...x,enabled:!x.enabled}:x))}/>
              </div>
              <div style={{fontSize:11,color:T.muted,marginTop:6,fontFamily:T.font}}>Último disparo: {w.lastTriggered}</div>
            </div>
          ))}
          <Btn variant="outline" size="sm" icon={<Plus size={12}/>}>Adicionar Webhook</Btn>
        </div>
      </Card>

      {/* LGPD */}
      <Card>
        <SectionTitle sub="Conformidade com a Lei Geral de Proteção de Dados">LGPD & Retenção de Dados</SectionTitle>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Toggle checked={lgpd} onChange={setLgpd} label="Modo LGPD ativo — anonimiza dados ao excluir"/>
          <Sel label="Retenção de Dados" value={retention} onChange={e=>setRetention(e.target.value)} options={[{value:"90",label:"90 dias"},{value:"180",label:"180 dias"},{value:"365",label:"1 ano"},{value:"730",label:"2 anos"},{value:"never",label:"Indefinido"}]}/>
          <div style={{display:"flex",gap:8}}>
            <Btn variant="outline" size="sm" icon={<Package size={12}/>} onClick={()=>toast("Backup iniciado!","success")}>Exportar Backup</Btn>
            <Btn variant="outline" size="sm" icon={<RefreshCw size={12}/>} onClick={()=>toast("Restauração iniciada","success")}>Restaurar Config</Btn>
          </div>
        </div>
      </Card>

      {/* Feature Flags */}
      <Card>
        <SectionTitle sub="Funcionalidades em beta">Feature Flags</SectionTitle>
        <div style={{display:"flex",flexDirection:"column",gap:13}}>
          {Object.entries(flags).map(([k,v])=><Toggle key={k} checked={v} onChange={val=>setFlags(f=>({...f,[k]:val}))} label={flagLabels[k]}/>)}
        </div>
      </Card>
    </div>
  );
};

const AuditTab = () => {
  const [filter,setFilter]=useState("all");
  const actionColor={updated:T.teal,created:T.green,deleted:T.coral,invited:T.amber,revoked:T.coral};
  const filterOptions=[{id:"all",label:"Todos"},{id:"created",label:"Criou"},{id:"updated",label:"Atualizou"},{id:"deleted",label:"Deletou"},{id:"invited",label:"Convidou"}];
  const filtered=filter==="all"?MOCK_AUDIT:MOCK_AUDIT.filter(a=>a.action===filter);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <Card>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <SectionTitle sub="Registro completo de ações no workspace">Activity Log</SectionTitle>
          <div style={{display:"flex",gap:5}}>
            {filterOptions.map(fo=>(
              <button key={fo.id} onClick={()=>setFilter(fo.id)} style={{padding:"5px 12px",borderRadius:20,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:T.font,border:`1.5px solid ${filter===fo.id?T.teal:T.border}`,background:filter===fo.id?T.teal:"#fff",color:filter===fo.id?"#fff":T.muted,transition:"all 0.15s"}}>{fo.label}</button>
            ))}
          </div>
        </div>
        {filtered.map((log,i)=>(
          <div key={log.id} style={{display:"flex",gap:12,padding:"14px 0",borderBottom:i<filtered.length-1?`1px solid ${T.border}`:"none",alignItems:"flex-start"}}>
            <div style={{width:34,height:34,borderRadius:10,background:T.faint,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{log.icon}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,color:T.text,fontFamily:T.font}}>
                <strong>{log.user}</strong>{" "}<span style={{color:actionColor[log.action]||T.muted,fontWeight:600}}>{log.action}</span>{" "}{log.detail}
              </div>
              <div style={{fontSize:11,color:T.muted,fontFamily:T.font,marginTop:3}}>{log.resource} · {log.time} atrás</div>
            </div>
          </div>
        ))}
        <div style={{marginTop:14,textAlign:"center"}}>
          <Btn variant="outline" size="sm" icon={<Download size={12}/>}>Exportar Logs CSV</Btn>
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
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
        {[{Icon:BookOpen,title:"Documentação",desc:"Guides e tutoriais completos",action:"Acessar Docs"},{Icon:Play,title:"Vídeo Tutoriais",desc:"Aprenda no YouTube",action:"Ver Vídeos"},{Icon:MessageSquare,title:"Comunidade",desc:"Tire dúvidas com outros usuários",action:"Acessar"}].map(r=>(
          <Card key={r.title} style={{textAlign:"center",cursor:"pointer"}}>
            <div style={{display:"flex",justifyContent:"center",marginBottom:8}}><r.Icon size={28} color={T.teal}/></div>
            <div style={{fontSize:14,fontWeight:700,color:T.text,fontFamily:T.font}}>{r.title}</div>
            <div style={{fontSize:12,color:T.muted,fontFamily:T.font,margin:"4px 0 12px"}}>{r.desc}</div>
            <Btn variant="outline" size="sm">{r.action}</Btn>
          </Card>
        ))}
      </div>

      <Card>
        <SectionTitle sub="Nossa equipe responde em até 24 horas úteis">Abrir Ticket de Suporte</SectionTitle>
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
            <Btn onClick={async()=>{if(!ticket.subject||!ticket.body)return toast("Preencha assunto e descrição","error");setSubmitting(true);await new Promise(r=>setTimeout(r,900));setTicket({subject:"",body:"",priority:"normal"});setSubmitting(false);toast("Ticket enviado! Resposta em até 24h.","success");}} disabled={submitting} size="md" icon={submitting?<Loader2 size={12}/>:<Send size={12}/>}>{submitting?"Enviando...":"Enviar Ticket"}</Btn>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle sub="Últimas atualizações da plataforma">Changelog</SectionTitle>
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
   ROOT — topbar idêntico ao vantari-analytics-dashboard
═══════════════════════════════════════════════════════════ */
const NavSection = ({ label }) => (
  <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.18em",color:"rgba(255,255,255,0.4)",padding:"10px 20px 4px",textTransform:"uppercase",fontFamily:T.head}}>{label}</div>
);

const NavItem = ({ icon: Icon, label, active = false, path }) => {
  const [hov, setHov] = useState(false);
  const navigate = useNavigate();
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={() => path && navigate(path)}
      style={{
        position:"relative",
        display:"flex",alignItems:"center",gap:9,
        padding:"8px 20px",fontSize:13.5,
        fontWeight:active?700:600,fontFamily:T.font,
        color:active?"#fff":hov?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.6)",
        background:active?"rgba(255,255,255,0.10)":hov?"rgba(255,255,255,0.06)":"transparent",
        cursor:"pointer",transition:"all 0.15s",userSelect:"none",
      }}>
      {active && (
        <span style={{position:"absolute",left:0,top:6,bottom:6,width:3,background:"linear-gradient(180deg, #14A273 0%, #5EEAD4 100%)",borderRadius:"0 3px 3px 0"}} />
      )}
      {Icon && <Icon size={16} aria-hidden="true" />}{label}
    </div>
  );
};

export default function VantariSettingsAdmin() {
  const [activeTab,setActiveTab] = useState("workspace");
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
      <div style={{width:240,background:T.sidebarBg,display:"flex",flexDirection:"column",flexShrink:0,position:"relative",overflow:"hidden"}}>
        {/* glow topo-direito */}
        <div style={{position:"absolute",inset:0,pointerEvents:"none",background:"radial-gradient(circle at 90% 0%, rgba(20,162,115,.25) 0%, transparent 50%)"}} />

        {/* Brand */}
        <div style={{padding:"20px 20px 0",position:"relative"}}>
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
          <NavItem icon={BarChart2}      label="Analytics"      path="/dashboard"     />
          <NavItem icon={Users}          label="Leads"          path="/leads"         />
          <NavItem icon={Mail}           label="Email Marketing" path="/email"        />
          <NavSection label="Ferramentas"/>
          <NavItem icon={Star}           label="Scoring"        path="/scoring"       />
          <NavItem icon={LayoutTemplate} label="Landing Pages"  path="/landing"       />
          <NavItem icon={Bot}            label="IA & Automação" path="/ai-marketing"  />
          <NavSection label="Sistema"/>
          <NavItem icon={Plug}           label="Integrações"    path="/integrations"  />
        </div>
        <div style={{borderTop:"1px solid rgba(255,255,255,0.08)",padding:"8px 0",position:"relative"}}>
          <NavItem icon={Settings} label="Configurações" path="/settings" active />
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
        {activeTab==="workspace"&&<WorkspaceTab toast={toast}/>}
        {activeTab==="team"     &&<TeamTab      toast={toast}/>}
        {activeTab==="email"    &&<EmailTab     toast={toast}/>}
        {activeTab==="billing"  &&<BillingTab   toast={toast}/>}
        {activeTab==="advanced" &&<AdvancedTab  toast={toast}/>}
        {activeTab==="audit"    &&<AuditTab/>}
        {activeTab==="support"  &&<SupportTab   toast={toast}/>}
      </div></div>

      <Toasts toasts={toasts}/>
      </div>{/* ── end MAIN ── */}
    </div>
  );
}
