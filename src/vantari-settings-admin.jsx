import { useState, useRef, useCallback } from "react";

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
  blue:    "#0C59AD",
  teal:    "#0E7CA3",
  green:   "#11AA7C",
  purple:  "#7C3AED",
  orange:  "#F59E0B",
  red:     "#EF4444",
  bg:      "#f0f4f8",
  surface: "#ffffff",
  border:  "#e2e8f0",
  text:    "#0f172a",
  muted:   "#64748b",
  faint:   "#f8fafc",
  font:    "'Plus Jakarta Sans', sans-serif",
};

/* ───── MOCK DATA ───── */
const MOCK_MEMBERS = [
  { id:"u1", name:"Ana Costa",      email:"ana@empresa.com.br",   role:"admin",   status:"active",    lastActive:"agora", avatar:"AC", joined:"Jan 2024" },
  { id:"u2", name:"Bruno Lima",     email:"bruno@empresa.com.br", role:"manager", status:"active",    lastActive:"2h",    avatar:"BL", joined:"Mar 2024" },
  { id:"u3", name:"Carla Mendes",   email:"carla@empresa.com.br", role:"user",    status:"active",    lastActive:"1d",    avatar:"CM", joined:"Mai 2024" },
  { id:"u4", name:"Diego Ferreira", email:"diego@empresa.com.br", role:"user",    status:"invited",   lastActive:"—",     avatar:"DF", joined:"—" },
  { id:"u5", name:"Elena Souza",    email:"elena@empresa.com.br", role:"manager", status:"suspended", lastActive:"7d",    avatar:"ES", joined:"Fev 2024" },
];

const MOCK_AUDIT = [
  { id:"a1", user:"Ana Costa",    action:"updated", resource:"workspace_settings", detail:"Alterou nome da empresa",         time:"5min",  icon:"⚙️" },
  { id:"a2", user:"Bruno Lima",   action:"invited", resource:"user",               detail:"Convidou diego@empresa.com.br",   time:"2h",    icon:"✉️" },
  { id:"a3", user:"Ana Costa",    action:"created", resource:"api_key",            detail:"Criou chave 'Integração HubSpot'",time:"1d",    icon:"🔑" },
  { id:"a4", user:"Carla Mendes", action:"deleted", resource:"campaign",           detail:"Removeu campanha 'Black Friday'", time:"2d",    icon:"🗑️" },
  { id:"a5", user:"Ana Costa",    action:"revoked", resource:"api_key",            detail:"Revogou chave 'Antiga API v1'",   time:"3d",    icon:"🚫" },
  { id:"a6", user:"Bruno Lima",   action:"updated", resource:"billing",            detail:"Atualizou cartão de crédito",     time:"5d",    icon:"💳" },
];

const MOCK_USAGE = {
  leads_stored:      { used:3840,  limit:5000,   label:"Leads Armazenados",     icon:"👥", color:T.blue   },
  emails_sent:       { used:18200, limit:25000,  label:"Emails Enviados",       icon:"📧", color:T.teal   },
  api_calls:         { used:42100, limit:100000, label:"Chamadas de API",       icon:"⚡", color:T.purple },
  contacts_enriched: { used:890,   limit:1000,   label:"Contatos Enriquecidos", icon:"✨", color:T.green  },
};

const MOCK_KEYS = [
  { id:"k1", name:"Integração HubSpot", prefix:"vnt_live", scopes:["read:leads","write:leads"],    lastUsed:"2h", created:"12/01/2025" },
  { id:"k2", name:"Webhook Zapier",     prefix:"vnt_live", scopes:["read:campaigns","webhooks"],   lastUsed:"1d", created:"20/02/2025" },
  { id:"k3", name:"Analytics Export",  prefix:"vnt_live", scopes:["read:analytics"],              lastUsed:"5d", created:"05/03/2025" },
];

const MOCK_WEBHOOKS = [
  { id:"w1", name:"Notificação Slack", url:"https://hooks.slack.com/services/T0...",  events:["lead.created","lead.scored"],    enabled:true,  lastTriggered:"1h", failCount:0 },
  { id:"w2", name:"CRM Salesforce",   url:"https://api.salesforce.com/webhook/...",  events:["lead.converted","campaign.sent"],enabled:true,  lastTriggered:"3h", failCount:0 },
  { id:"w3", name:"Backup Externo",   url:"https://backup.empresa.com/vantari/...", events:["lead.created","lead.deleted"],   enabled:false, lastTriggered:"2d", failCount:3 },
];

const MOCK_INVOICES = [
  { id:"inv-001", period:"Maio 2025",      amount:"R$ 497,00", date:"01/05/2025" },
  { id:"inv-002", period:"Abril 2025",     amount:"R$ 497,00", date:"01/04/2025" },
  { id:"inv-003", period:"Março 2025",     amount:"R$ 297,00", date:"01/03/2025" },
  { id:"inv-004", period:"Fevereiro 2025", amount:"R$ 297,00", date:"01/02/2025" },
];

const TABS = [
  { id:"workspace", icon:"🏢", label:"Workspace"  },
  { id:"team",      icon:"👥", label:"Equipe"      },
  { id:"email",     icon:"📧", label:"Email"       },
  { id:"billing",   icon:"💳", label:"Billing"     },
  { id:"advanced",  icon:"⚙️", label:"Avançado"   },
  { id:"audit",     icon:"📋", label:"Audit Log"   },
  { id:"support",   icon:"🎧", label:"Suporte"     },
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
      <div key={t.id} style={{padding:"11px 18px",borderRadius:10,fontSize:13,fontWeight:600,color:"#fff",background:t.type==="success"?T.green:t.type==="error"?T.red:T.blue,boxShadow:"0 4px 20px rgba(0,0,0,0.14)",fontFamily:T.font,animation:"toastIn 0.25s ease"}}>{t.msg}</div>
    ))}
  </div>
);

/* ───── BASE COMPONENTS — same spec as analytics-dashboard ───── */
const Btn = ({children,onClick,variant="primary",size="sm",icon,disabled,style:sx={}}) => {
  const [hov,setHov] = useState(false);
  const v = {
    primary:  {bg:hov?"#0a4d99":T.blue,   color:"#fff",  border:"none",                      shadow:hov?"0 4px 12px rgba(12,89,173,0.35)":"0 1px 4px rgba(12,89,173,0.2)"},
    secondary:{bg:hov?"#f0f7ff":"#fff",    color:T.blue,  border:`1.5px solid ${T.blue}`,     shadow:"none"},
    ghost:    {bg:hov?"#f1f5f9":"transparent",color:T.text,border:"none",                     shadow:"none"},
    danger:   {bg:hov?"#dc2626":T.red,    color:"#fff",  border:"none",                      shadow:"none"},
    success:  {bg:hov?"#059669":T.green,  color:"#fff",  border:"none",                      shadow:"none"},
    outline:  {bg:"transparent",          color:T.muted, border:`1.5px solid ${T.border}`,   shadow:"none"},
  }[variant]||{};
  const pad={xs:"4px 8px",sm:"7px 14px",md:"9px 18px",lg:"11px 22px"}[size];
  const fs={xs:10,sm:12,md:13,lg:14}[size];
  return <button onClick={onClick} disabled={disabled} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{display:"inline-flex",alignItems:"center",gap:6,background:v.bg,color:v.color,border:v.border||"none",borderRadius:8,padding:pad,fontSize:fs,fontWeight:600,fontFamily:T.font,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.5:1,boxShadow:v.shadow,transition:"all 0.15s",whiteSpace:"nowrap",...sx}}>{icon&&<span style={{fontSize:fs+1}}>{icon}</span>}{children}</button>;
};

const Card = ({children,style:s={}}) => <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:14,padding:20,boxShadow:"0 1px 4px rgba(0,0,0,0.05)",...s}}>{children}</div>;

const SectionTitle = ({children,sub}) => <div style={{marginBottom:16}}><h2 style={{fontSize:16,fontWeight:700,color:T.text,fontFamily:T.font,margin:0}}>{children}</h2>{sub&&<p style={{fontSize:12,color:T.muted,margin:"4px 0 0",fontFamily:T.font}}>{sub}</p>}</div>;

const Badge = ({children,color=T.blue,bg}) => <span style={{display:"inline-block",background:bg||`${color}18`,color,border:`1px solid ${color}30`,borderRadius:20,padding:"2px 9px",fontSize:11,fontWeight:600,fontFamily:T.font}}>{children}</span>;

const FL = ({children}) => <div style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6,fontFamily:T.font}}>{children}</div>;

const Input = ({label,value,onChange,type="text",placeholder,hint,disabled}) => (
  <div style={{display:"flex",flexDirection:"column",gap:6}}>
    {label&&<FL>{label}</FL>}
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
      style={{padding:"9px 12px",borderRadius:8,border:`1.5px solid ${T.border}`,fontSize:13,color:T.text,background:disabled?T.faint:"#fff",outline:"none",fontFamily:T.font,transition:"border 0.15s",width:"100%",boxSizing:"border-box"}}
      onFocus={e=>e.target.style.borderColor=T.blue} onBlur={e=>e.target.style.borderColor=T.border}/>
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
  return (
    <div style={{padding:"14px 0",borderBottom:`1px solid ${T.border}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:18}}>{data.icon}</span>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:T.text,fontFamily:T.font}}>{data.label}</div>
            <div style={{fontSize:11,color:T.muted,fontFamily:T.font}}>{fmt(data.used)} / {fmt(data.limit)}</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {p>=80&&<Badge color={p>=95?T.red:T.orange} bg={p>=95?"#fee2e2":"#fef3c7"}>{p>=95?"⚠️ Crítico":"⚠️ Atenção"}</Badge>}
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
const WorkspaceTab = ({toast}) => {
  const [f,setF] = useState({companyName:"Empresa LTDA",domain:"empresa.com.br",timezone:"America/Sao_Paulo",dateFormat:"DD/MM/YYYY",language:"pt-BR",primaryColor:"#0C59AD"});
  const [saving,setSaving] = useState(false);
  const fileRef = useRef();
  const u=(k,v)=>setF(x=>({...x,[k]:v}));
  const save=async()=>{setSaving(true);await new Promise(r=>setTimeout(r,900));setSaving(false);toast("Configurações salvas!","success");};

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <Card>
        <SectionTitle sub="Nome, logo e domínio customizado">Identidade da Empresa</SectionTitle>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
          <Input label="Nome da Empresa"    value={f.companyName} onChange={e=>u("companyName",e.target.value)}/>
          <Input label="Domínio Customizado" value={f.domain}     onChange={e=>u("domain",e.target.value)} hint="Ex: crm.suaempresa.com.br"/>
        </div>
        <FL>Logotipo</FL>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:56,height:56,borderRadius:12,background:T.faint,border:`2px dashed ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🏢</div>
          <div>
            <Btn variant="outline" size="sm" onClick={()=>fileRef.current?.click()} icon="📁">Escolher arquivo</Btn>
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
              {["#0C59AD","#11AA7C","#7C3AED","#E91E8C","#F59E0B","#EF4444"].map(c=>(
                <div key={c} onClick={()=>u("primaryColor",c)} style={{width:30,height:30,borderRadius:8,background:c,cursor:"pointer",border:`3px solid ${f.primaryColor===c?T.text:"transparent"}`,transition:"border 0.15s"}}/>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle sub="Fuso horário e formatação regional">Região e Idioma</SectionTitle>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
          <Sel label="Idioma"          value={f.language}   onChange={e=>u("language",e.target.value)}   options={[{value:"pt-BR",label:"🇧🇷 Português (Brasil)"},{value:"en-US",label:"🇺🇸 English (US)"},{value:"es-ES",label:"🇪🇸 Español"}]}/>
          <Sel label="Fuso Horário"    value={f.timezone}   onChange={e=>u("timezone",e.target.value)}   options={[{value:"America/Sao_Paulo",label:"Brasília (UTC-3)"},{value:"America/Manaus",label:"Manaus (UTC-4)"},{value:"America/Recife",label:"Recife (UTC-3)"}]}/>
          <Sel label="Formato de Data" value={f.dateFormat} onChange={e=>u("dateFormat",e.target.value)} options={[{value:"DD/MM/YYYY",label:"DD/MM/AAAA"},{value:"MM/DD/YYYY",label:"MM/DD/AAAA"},{value:"YYYY-MM-DD",label:"AAAA-MM-DD"}]}/>
        </div>
      </Card>

      <div style={{display:"flex",justifyContent:"flex-end"}}>
        <Btn onClick={save} disabled={saving} size="md" icon={saving?"⏳":"💾"}>{saving?"Salvando...":"Salvar Configurações"}</Btn>
      </div>
    </div>
  );
};

const TeamTab = ({toast}) => {
  const [members,setMembers] = useState(MOCK_MEMBERS);
  const [invEmail,setInvEmail] = useState(""); const [invRole,setInvRole] = useState("user"); const [inviting,setInviting] = useState(false);
  const [permTarget,setPermTarget] = useState(null); const [perms,setPerms] = useState({});

  const invite=async()=>{
    if(!invEmail.includes("@"))return toast("Email inválido","error");
    setInviting(true);await new Promise(r=>setTimeout(r,800));
    setMembers(m=>[...m,{id:"u"+Date.now(),name:invEmail.split("@")[0],email:invEmail,role:invRole,status:"invited",lastActive:"—",avatar:invEmail[0].toUpperCase()+invEmail[1].toUpperCase(),joined:"—"}]);
    setInvEmail("");setInviting(false);toast(`Convite enviado para ${invEmail}`,"success");
  };
  const openPerms=m=>{setPerms(ROLE_DEFAULTS[m.role]||{});setPermTarget(m);};
  const toggleAction=(res,action)=>setPerms(p=>{const cur=p[res]||[];return{...p,[res]:cur.includes(action)?cur.filter(a=>a!==action):[...cur,action]};});

  const statusS={active:{color:T.green,bg:"#ecfdf5"},invited:{color:T.orange,bg:"#fef3c7"},suspended:{color:T.red,bg:"#fee2e2"}};
  const roleC={admin:T.purple,manager:T.blue,user:T.muted};
  const roleL={admin:"Admin",manager:"Gerente",user:"Usuário"};
  const statusL={active:"Ativo",invited:"Convidado",suspended:"Suspenso"};

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <Card>
        <SectionTitle sub="O novo usuário receberá email de onboarding automático">Convidar Membro</SectionTitle>
        <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
          <div style={{flex:1}}><Input label="Email" value={invEmail} onChange={e=>setInvEmail(e.target.value)} placeholder="usuario@empresa.com.br"/></div>
          <Sel label="Papel" value={invRole} onChange={e=>setInvRole(e.target.value)} options={[{value:"admin",label:"Admin"},{value:"manager",label:"Gerente"},{value:"user",label:"Usuário"}]}/>
          <Btn onClick={invite} disabled={inviting} icon={inviting?"⏳":"✉️"} size="md">{inviting?"Enviando...":"Convidar"}</Btn>
        </div>
      </Card>

      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:T.text,fontFamily:T.font}}>Membros da Equipe</div>
            <div style={{fontSize:12,color:T.muted,fontFamily:T.font}}>{members.length} membros</div>
          </div>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{background:T.faint}}>
            {["Usuário","Papel","Status","Último Acesso","Ações"].map(h=>(
              <th key={h} style={{padding:"9px 18px",textAlign:"left",fontSize:11,fontWeight:700,color:T.muted,letterSpacing:"0.06em",textTransform:"uppercase",fontFamily:T.font}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {members.map(m=>(
              <tr key={m.id} style={{borderTop:`1px solid ${T.border}`}}>
                <td style={{padding:"13px 18px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:34,height:34,borderRadius:"50%",background:avatarBg(m.name),display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,fontWeight:700}}>{m.avatar}</div>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:T.text,fontFamily:T.font}}>{m.name}</div>
                      <div style={{fontSize:11,color:T.muted,fontFamily:T.font}}>{m.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{padding:"13px 18px"}}><Badge color={roleC[m.role]}>{roleL[m.role]}</Badge></td>
                <td style={{padding:"13px 18px"}}><Badge color={statusS[m.status].color} bg={statusS[m.status].bg}>{statusL[m.status]}</Badge></td>
                <td style={{padding:"13px 18px",fontSize:13,color:T.muted,fontFamily:T.font}}>{m.lastActive}</td>
                <td style={{padding:"13px 18px"}}>
                  <div style={{display:"flex",gap:6}}>
                    <Btn variant="outline" size="xs" onClick={()=>openPerms(m)}>Permissões</Btn>
                    {m.role!=="admin"&&<Btn variant="danger" size="xs" onClick={()=>{setMembers(ms=>ms.filter(x=>x.id!==m.id));toast("Membro removido","success");}}>Remover</Btn>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {permTarget&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
          <div style={{background:"#fff",borderRadius:16,width:540,maxHeight:"78vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
            <div style={{padding:"18px 22px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:T.text,fontFamily:T.font}}>Permissões — {permTarget.name}</div>
                <div style={{fontSize:12,color:T.muted,fontFamily:T.font}}>Controle granular por recurso</div>
              </div>
              <button onClick={()=>setPermTarget(null)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:T.muted}}>✕</button>
            </div>
            <div style={{padding:22}}>
              {Object.entries(PERMISSIONS).map(([res,label])=>(
                <div key={res} style={{marginBottom:12,padding:12,background:T.faint,borderRadius:10}}>
                  <div style={{fontSize:12,fontWeight:700,color:T.text,fontFamily:T.font,marginBottom:8}}>{label}</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {["view","create","edit","delete","manage"].map(action=>{
                      const has=(perms[res]||[]).includes(action);
                      return <button key={action} onClick={()=>toggleAction(res,action)} style={{padding:"3px 12px",borderRadius:20,fontSize:11,fontWeight:600,cursor:"pointer",border:`1.5px solid ${has?T.blue:T.border}`,background:has?T.blue+"15":"#fff",color:has?T.blue:T.muted,fontFamily:T.font,transition:"all 0.15s"}}>{action}</button>;
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
            <Btn variant="outline" onClick={async()=>{setTesting(true);await new Promise(r=>setTimeout(r,1100));setTesting(false);toast("✅ SMTP conectado!","success");}} disabled={testing} icon={testing?"⏳":"🔌"}>{testing?"Testando...":"Testar Conexão"}</Btn>
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
              <Badge color={r.status==="verified"?T.green:T.orange} bg={r.status==="verified"?"#ecfdf5":"#fef3c7"}>{r.status==="verified"?"✓ Verificado":"⏳ Pendente"}</Badge>
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
        <Btn onClick={async()=>{setSaving(true);await new Promise(r=>setTimeout(r,800));setSaving(false);toast("Email Config salvo!","success");}} disabled={saving} size="md" icon={saving?"⏳":"💾"}>{saving?"Salvando...":"Salvar Email Config"}</Btn>
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
          <Btn variant="secondary" size="md" icon="⬆️">Fazer Upgrade</Btn>
          <Btn variant="outline"   size="md" icon="💳">Atualizar Cartão</Btn>
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
          <Btn variant="outline" size="sm" icon="📥">Exportar Todas</Btn>
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
                <td style={{padding:"13px 18px"}}><Badge color={T.green} bg="#ecfdf5">✓ Pago</Badge></td>
                <td style={{padding:"13px 18px",fontSize:13,color:T.muted,fontFamily:T.font}}>{inv.date}</td>
                <td style={{padding:"13px 18px"}}><Btn variant="outline" size="xs" onClick={()=>toast("Fatura baixada!","success")} icon="📄">PDF</Btn></td>
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
  const flagLabels={ai_assistant:"🤖 Assistente IA (beta)",beta_scoring:"⭐ Novo Scoring Engine",dark_mode:"🌙 Dark Mode",bulk_import:"📥 Importação em Massa"};

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      {/* API Keys */}
      <Card>
        <SectionTitle sub="Autorize integrações externas com escopos granulares">Chaves de API</SectionTitle>
        <div style={{display:"flex",gap:10,marginBottom:12,alignItems:"flex-end"}}>
          <div style={{flex:1}}><Input label="Nome da Chave" value={nk.name} onChange={e=>setNk(k=>({...k,name:e.target.value}))} placeholder="Ex: Integração HubSpot"/></div>
          <Btn onClick={createKey} disabled={creating} size="md" icon={creating?"⏳":"🔑"}>{creating?"Gerando...":"Nova Chave"}</Btn>
        </div>
        <FL>Escopos</FL>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
          {SCOPE_OPTIONS.map(s=>{const has=nk.scopes.includes(s);return <button key={s} onClick={()=>tScope(s)} style={{padding:"3px 12px",borderRadius:20,fontSize:11,fontWeight:600,cursor:"pointer",border:`1.5px solid ${has?T.blue:T.border}`,background:has?T.blue+"15":"#fff",color:has?T.blue:T.muted,fontFamily:T.font}}>{s}</button>;})}
        </div>
        {createdKey&&(
          <div style={{padding:14,background:"#ecfdf5",border:`1px solid #6ee7b7`,borderRadius:10,marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,color:T.green,marginBottom:6,fontFamily:T.font}}>🔑 Copie agora — não será exibida novamente</div>
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
                    {w.name}{w.failCount>0&&<Badge color={T.red} bg="#fee2e2">⚠️ {w.failCount} falhas</Badge>}
                  </div>
                  <code style={{fontSize:11,color:T.muted,fontFamily:"monospace"}}>{w.url}</code>
                  <div style={{display:"flex",gap:4,marginTop:6}}>{w.events.map(e=><Badge key={e} color={T.teal}>{e}</Badge>)}</div>
                </div>
                <Toggle checked={w.enabled} onChange={()=>setHooks(h=>h.map(x=>x.id===w.id?{...x,enabled:!x.enabled}:x))}/>
              </div>
              <div style={{fontSize:11,color:T.muted,marginTop:6,fontFamily:T.font}}>Último disparo: {w.lastTriggered}</div>
            </div>
          ))}
          <Btn variant="outline" size="sm" icon="➕">Adicionar Webhook</Btn>
        </div>
      </Card>

      {/* LGPD */}
      <Card>
        <SectionTitle sub="Conformidade com a Lei Geral de Proteção de Dados">LGPD & Retenção de Dados</SectionTitle>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Toggle checked={lgpd} onChange={setLgpd} label="Modo LGPD ativo — anonimiza dados ao excluir"/>
          <Sel label="Retenção de Dados" value={retention} onChange={e=>setRetention(e.target.value)} options={[{value:"90",label:"90 dias"},{value:"180",label:"180 dias"},{value:"365",label:"1 ano"},{value:"730",label:"2 anos"},{value:"never",label:"Indefinido"}]}/>
          <div style={{display:"flex",gap:8}}>
            <Btn variant="outline" size="sm" icon="📦" onClick={()=>toast("Backup iniciado!","success")}>Exportar Backup</Btn>
            <Btn variant="outline" size="sm" icon="🔄" onClick={()=>toast("Restauração iniciada","success")}>Restaurar Config</Btn>
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
  const actionColor={updated:T.blue,created:T.green,deleted:T.red,invited:T.orange,revoked:T.red};
  const filterOptions=[{id:"all",label:"Todos"},{id:"created",label:"Criou"},{id:"updated",label:"Atualizou"},{id:"deleted",label:"Deletou"},{id:"invited",label:"Convidou"}];
  const filtered=filter==="all"?MOCK_AUDIT:MOCK_AUDIT.filter(a=>a.action===filter);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <Card>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <SectionTitle sub="Registro completo de ações no workspace">Activity Log</SectionTitle>
          <div style={{display:"flex",gap:5}}>
            {filterOptions.map(fo=>(
              <button key={fo.id} onClick={()=>setFilter(fo.id)} style={{padding:"5px 12px",borderRadius:20,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:T.font,border:`1.5px solid ${filter===fo.id?T.blue:T.border}`,background:filter===fo.id?T.blue:"#fff",color:filter===fo.id?"#fff":T.muted,transition:"all 0.15s"}}>{fo.label}</button>
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
          <Btn variant="outline" size="sm" icon="📥">Exportar Logs CSV</Btn>
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
        {[{icon:"📚",title:"Documentação",desc:"Guides e tutoriais completos",action:"Acessar Docs"},{icon:"🎥",title:"Vídeo Tutoriais",desc:"Aprenda no YouTube",action:"Ver Vídeos"},{icon:"💬",title:"Comunidade",desc:"Tire dúvidas com outros usuários",action:"Acessar"}].map(r=>(
          <Card key={r.title} style={{textAlign:"center",cursor:"pointer"}}>
            <div style={{fontSize:28,marginBottom:8}}>{r.icon}</div>
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
            <Sel label="Prioridade" value={ticket.priority} onChange={e=>setTicket(t=>({...t,priority:e.target.value}))} options={[{value:"low",label:"🟢 Baixa"},{value:"normal",label:"🟡 Normal"},{value:"high",label:"🔴 Alta"}]}/>
          </div>
          <div>
            <FL>Descrição</FL>
            <textarea value={ticket.body} onChange={e=>setTicket(t=>({...t,body:e.target.value}))} rows={4} placeholder="Descreva em detalhes — inclua passos para reproduzir o problema..."
              style={{width:"100%",padding:"9px 12px",borderRadius:8,border:`1.5px solid ${T.border}`,fontSize:13,color:T.text,fontFamily:T.font,resize:"vertical",outline:"none",boxSizing:"border-box"}}
              onFocus={e=>e.target.style.borderColor=T.blue} onBlur={e=>e.target.style.borderColor=T.border}/>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end"}}>
            <Btn onClick={async()=>{if(!ticket.subject||!ticket.body)return toast("Preencha assunto e descrição","error");setSubmitting(true);await new Promise(r=>setTimeout(r,900));setTicket({subject:"",body:"",priority:"normal"});setSubmitting(false);toast("Ticket enviado! Resposta em até 24h.","success");}} disabled={submitting} size="md" icon={submitting?"⏳":"📨"}>{submitting?"Enviando...":"Enviar Ticket"}</Btn>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle sub="Últimas atualizações da plataforma">Changelog</SectionTitle>
        {changelog.map((c,i)=>(
          <div key={c.version} style={{display:"flex",gap:12,padding:"12px 0",borderBottom:i<changelog.length-1?`1px solid ${T.border}`:"none",alignItems:"center"}}>
            <span style={{fontSize:11,fontWeight:700,color:"#fff",background:T.blue,padding:"3px 8px",borderRadius:6,whiteSpace:"nowrap",fontFamily:T.font}}>{c.version}</span>
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
export default function VantariSettingsAdmin() {
  const [activeTab,setActiveTab] = useState("workspace");
  const {toasts,push:toast} = useToast();

  return (
    <div style={{minHeight:"100vh",background:T.bg,fontFamily:T.font}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:6px;height:6px;}
        ::-webkit-scrollbar-track{background:transparent;}
        ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:99px;}
        @keyframes toastIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
      `}</style>

      {/* Topbar — same structure as analytics-dashboard */}
      <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"0 28px",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",height:60}}>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:32,height:32,borderRadius:8,background:`linear-gradient(135deg,${T.blue},${T.teal})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>⚙️</div>
              <div>
                <div style={{fontSize:14,fontWeight:800,color:T.text,letterSpacing:"-0.02em"}}>Configurações</div>
                <div style={{fontSize:10,color:T.muted,fontWeight:500}}>Vantari Platform</div>
              </div>
            </div>
            <div style={{width:1,height:28,background:T.border}}/>
            <div style={{display:"flex",gap:2}}>
              {TABS.map(t=>(
                <button key={t.id} onClick={()=>setActiveTab(t.id)}
                  style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",background:"none",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:activeTab===t.id?700:500,color:activeTab===t.id?T.blue:T.muted,fontFamily:T.font,borderBottom:activeTab===t.id?`2px solid ${T.blue}`:"2px solid transparent",transition:"all 0.15s"}}>
                  <span>{t.icon}</span>{t.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <Badge color={T.green} bg="#ecfdf5">● Online</Badge>
            <Btn variant="secondary" size="sm" icon="❓">Ajuda</Btn>
          </div>
        </div>
      </div>

      <div style={{padding:"24px 28px",maxWidth:1100,margin:"0 auto"}}>
        {activeTab==="workspace"&&<WorkspaceTab toast={toast}/>}
        {activeTab==="team"     &&<TeamTab      toast={toast}/>}
        {activeTab==="email"    &&<EmailTab     toast={toast}/>}
        {activeTab==="billing"  &&<BillingTab   toast={toast}/>}
        {activeTab==="advanced" &&<AdvancedTab  toast={toast}/>}
        {activeTab==="audit"    &&<AuditTab/>}
        {activeTab==="support"  &&<SupportTab   toast={toast}/>}
      </div>

      <Toasts toasts={toasts}/>
    </div>
  );
}
