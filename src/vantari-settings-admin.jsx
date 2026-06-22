import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabase";
import {
  BarChart2, Users, Mail, Star, LayoutTemplate, Bot, Plug, Settings,
  Building2, Save, Send, RefreshCw, Plus, HelpCircle,
  Loader2, AlertTriangle, Database, Edit3, Trash2, Search, X,
  Copy as CopyIcon, Activity, FileText, User, Lock,
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

const TABS = [
  { id:"account",      Icon:User,      label:"Minha Conta"           },
  { id:"geral",        Icon:Building2, label:"Geral"                 },
  { id:"team",         Icon:Users,     label:"Equipe"                },
  { id:"customfields", Icon:Database,  label:"Campos Personalizados" },
  { id:"tracking",     Icon:Activity,  label:"Lead Tracking"         },
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

/* ───── UTILS ───── */
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

/* ═══════════════════════════════════════════════════════════
   TAB SECTIONS
═══════════════════════════════════════════════════════════ */
const ACCOUNT_PW_MIN = 8;

const AccountTab = ({toast}) => {
  const [loading,setLoading]   = useState(true);
  const [email,setEmail]       = useState("");
  const [name,setName]         = useState("");
  const [savingProfile,setSavingProfile] = useState(false);
  const [pw,setPw]             = useState({ next:"", confirm:"" });
  const [savingPw,setSavingPw] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!alive) return;
      if (!error && data?.user) {
        setEmail(data.user.email || "");
        const m = data.user.user_metadata || {};
        setName(m.name || m.full_name || "");
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const saveProfile = async () => {
    setSavingProfile(true);
    const { error } = await supabase.auth.updateUser({ data: { name: name.trim() } });
    setSavingProfile(false);
    if (error) toast(`Erro: ${error.message}`, "error");
    else toast("Perfil atualizado!", "success");
  };

  const changePassword = async () => {
    if (pw.next.length < ACCOUNT_PW_MIN) return toast(`Senha precisa de ao menos ${ACCOUNT_PW_MIN} caracteres`, "error");
    if (pw.next !== pw.confirm) return toast("As senhas não coincidem", "error");
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: pw.next });
    setSavingPw(false);
    if (error) return toast(`Erro: ${error.message}`, "error");
    setPw({ next:"", confirm:"" });
    toast("Senha alterada com sucesso!", "success");
  };

  if (loading) {
    return (
      <Card style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:30}}>
        <Loader2 size={18} color={T.teal} style={{animation:"spin 1s linear infinite"}}/>
        <span style={{fontSize:13,color:T.muted,fontFamily:T.font}}>Carregando sua conta...</span>
      </Card>
    );
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <Card>
        <SectionTitle sub="Seus dados de acesso à plataforma">Dados Pessoais</SectionTitle>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
          <div style={{width:52,height:52,borderRadius:"50%",background:avatarBg(name||email||"?"),display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:18,fontWeight:700,fontFamily:T.head,flexShrink:0}}>
            {(name||email||"?").split(" ").map(w=>w[0]).join("").substring(0,2).toUpperCase()}
          </div>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:T.ink,fontFamily:T.head}}>{name || "—"}</div>
            <div style={{fontSize:12,color:T.muted,fontFamily:T.font}}>{email}</div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <Input label="Nome" value={name} onChange={e=>setName(e.target.value)} placeholder="Seu nome"/>
          <Input label="Email" value={email} disabled hint="O email de login não pode ser alterado por aqui."/>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}>
          <Btn onClick={saveProfile} disabled={savingProfile} size="md" icon={savingProfile?<Loader2 size={12}/>:<Save size={12}/>}>{savingProfile?"Salvando...":"Salvar Perfil"}</Btn>
        </div>
      </Card>

      <Card>
        <SectionTitle sub={`Mínimo de ${ACCOUNT_PW_MIN} caracteres`}>Trocar Senha</SectionTitle>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <Input label="Nova Senha"     type="password" value={pw.next}    onChange={e=>setPw(p=>({...p,next:e.target.value}))}    placeholder="••••••••"/>
          <Input label="Confirmar Senha" type="password" value={pw.confirm} onChange={e=>setPw(p=>({...p,confirm:e.target.value}))} placeholder="••••••••"/>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}>
          <Btn onClick={changePassword} disabled={savingPw} size="md" icon={savingPw?<Loader2 size={12}/>:<Lock size={12}/>}>{savingPw?"Alterando...":"Alterar Senha"}</Btn>
        </div>
      </Card>
    </div>
  );
};

const GERAL_KEY = "vantari_geral";
const GERAL_DEFAULTS = {
  companyName: "Vantari",
  timezone:    "America/Sao_Paulo",
  dateFormat:  "DD/MM/YYYY",
  senderName:  "Vantari",
  senderEmail: "contato@vantari.com.br",
};

const GeralTab = ({toast}) => {
  const [f,setF] = useState(GERAL_DEFAULTS);
  const [saving,setSaving] = useState(false);
  const u=(k,v)=>setF(x=>({...x,[k]:v}));

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(GERAL_KEY) || "{}");
      setF({ ...GERAL_DEFAULTS, ...saved });
    } catch { /* mantém defaults */ }
  }, []);

  const save = async () => {
    setSaving(true);
    try { localStorage.setItem(GERAL_KEY, JSON.stringify(f)); } catch { /* ignore */ }
    setSaving(false);
    toast("Configurações salvas!", "success");
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <Card>
        <SectionTitle sub="Identificação usada nos relatórios e comunicações">Empresa</SectionTitle>
        <Input label="Nome da Empresa" value={f.companyName} onChange={e=>u("companyName",e.target.value)}/>
      </Card>

      <Card>
        <SectionTitle sub="Fuso horário e formato de data usados na interface">Região</SectionTitle>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <Sel label="Fuso Horário"    value={f.timezone}   onChange={e=>u("timezone",e.target.value)}   options={[{value:"America/Sao_Paulo",label:"Brasília (UTC-3)"},{value:"America/Manaus",label:"Manaus (UTC-4)"},{value:"America/Recife",label:"Recife (UTC-3)"}]}/>
          <Sel label="Formato de Data" value={f.dateFormat} onChange={e=>u("dateFormat",e.target.value)} options={[{value:"DD/MM/YYYY",label:"DD/MM/AAAA"},{value:"YYYY-MM-DD",label:"AAAA-MM-DD"}]}/>
        </div>
      </Card>

      <Card>
        <SectionTitle sub="Quem aparece como remetente nos emails enviados">Remetente de Email</SectionTitle>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <Input label="Nome do Remetente" value={f.senderName}  onChange={e=>u("senderName",e.target.value)}/>
          <Input label="Email Remetente"   value={f.senderEmail} onChange={e=>u("senderEmail",e.target.value)}/>
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
  const [invEmail,setInvEmail] = useState(""); const [invRole,setInvRole] = useState("member"); const [inviting,setInviting] = useState(false);

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

  const statusS={active:{color:T.green,bg:`${T.green}14`},invited:{color:T.amber,bg:`${T.amber}18`},suspended:{color:T.coral,bg:`${T.coral}14`}};
  const roleC={admin:T.violet,manager:T.teal,member:T.muted,user:T.muted};
  const roleL={admin:"Admin",manager:"Gerente",member:"Membro",user:"Membro"};
  const statusL={active:"Ativo",invited:"Convidado",suspended:"Suspenso"};

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <Card>
        <SectionTitle sub="Admin tem acesso total; Membro acessa os módulos do dia a dia">Convidar Membro</SectionTitle>
        <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
          <div style={{flex:1}}><Input label="Email" value={invEmail} onChange={e=>setInvEmail(e.target.value)} placeholder="usuario@vantari.com.br"/></div>
          <Sel label="Papel" value={invRole} onChange={e=>setInvRole(e.target.value)} options={[{value:"admin",label:"Admin"},{value:"member",label:"Membro"}]}/>
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
                    {m.role!=="admin"&&<Btn variant="danger" size="xs" onClick={()=>removeMember(m.id)}>Remover</Btn>}
                  </div>
                </td>
              </tr>
            );})}
          </tbody>
        </table>
        )}
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
    toast(editing === "new" ? "Campo criado!" : "Campo atualizado!", "success");
    closeEditor();
    fetchFields();
  };

  const remove = async (f) => {
    if (!confirm(`Excluir o campo "${f.label}"?\nIsso vai remover os valores associados em todos os leads.`)) return;
    const { error } = await supabase.from("custom_fields").delete().eq("id", f.id);
    if (error) return toast(`Erro: ${error.message}`, "error");
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
    toast(editing === "new" ? "Página adicionada!" : "Página atualizada!", "success");
    closeEditor();
    fetchPages();
  };

  const remove = async (p) => {
    if (!confirm(`Remover rastreamento de "${p.url}"?`)) return;
    const { error } = await supabase.from("tracked_pages").delete().eq("id", p.id);
    if (error) return toast(`Erro: ${error.message}`, "error");
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
  const [activeTab,setActiveTab] = useState("account");
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
        {activeTab==="account"     &&<AccountTab      toast={toast}/>}
        {activeTab==="geral"       &&<GeralTab        toast={toast}/>}
        {activeTab==="team"        &&<TeamTab         toast={toast}/>}
        {activeTab==="customfields"&&<CustomFieldsTab toast={toast}/>}
        {activeTab==="tracking"    &&<TrackingTab     toast={toast}/>}
      </div></div>

      <Toasts toasts={toasts}/>
      </div>{/* ── end MAIN ── */}
    </div>
  );
}
