import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, Users, Settings2, Target, CheckCircle2,
  ChevronLeft, ChevronRight, Save, Plus, X,
  BarChart2, Mail, Star, LayoutTemplate, Bot, Plug, Settings
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   DESIGN TOKENS
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

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════ */
const INITIAL_DATA = {
  empresa:     { nome:"", cnpj:"", segmento:"", tamanho:"", site:"", timezone:"America/Sao_Paulo", moeda:"BRL" },
  responsavel: { nome:"", cargo:"", email:"", whatsapp:"" },
  faturamento: { pagamento:"cartao", cnpjNF:"", emailFaturas:"" },
  membros:     [],
  dominio:     { dominio:"", remetente:"", replyTo:"", rodape:"", spf:"pending", dkim:"pending", dmarc:"pending" },
  integracoes: { meta:false, google:false, whatsapp:false, webhook:false },
  mapeamento:  [
    { id:1, externo:"full_name", interno:"nome",     obrigatorio:true },
    { id:2, externo:"email",     interno:"email",    obrigatorio:true },
    { id:3, externo:"phone",     interno:"telefone", obrigatorio:true },
  ],
  pipeline: [
    { id:1, nome:"Novo",     cor:"#64748b" },
    { id:2, nome:"Nutrindo", cor:"#1d4ed8" },
    { id:3, nome:"MQL",      cor:"#92400e" },
    { id:4, nome:"SQL",      cor:"#5b21b6" },
    { id:5, nome:"Cliente",  cor:"#14A273" },
  ],
  scoring: [
    { acao:"Abriu email",     pontos:2   },
    { acao:"Clicou em link",  pontos:5   },
    { acao:"Visitou pricing", pontos:15  },
    { acao:"Preencheu form",  pontos:20  },
    { acao:"Solicitou demo",  pontos:30  },
    { acao:"Inativo 30 dias", pontos:-10 },
  ],
  bandas: { cold:[0,39], warm:[40,69], hot:[70,84], sql:[85,100] },
  alertas: [],
  metas: { leadsGerados:"", txLeadMQL:"", txMQLSQL:"", cpl:"", txEmail:"", roi:"" },
};

const PHASES = [
  { label:"Conta e Identidade",    Icon:Building2,  subSteps:["Dados da empresa","Perfil do responsável","Plano e faturamento"] },
  { label:"Equipe e Acessos",      Icon:Users,      subSteps:["Membros e permissões"] },
  { label:"Configuração Técnica",  Icon:Settings2,  subSteps:["Domínio de email","Integrações","Mapeamento de campos"] },
  { label:"Regras de Negócio",     Icon:Target,     subSteps:["Pipeline de leads","Modelo de scoring","Alertas","Metas de KPI"] },
];

/* ═══════════════════════════════════════════════════════════
   SHARED UI COMPONENTS
═══════════════════════════════════════════════════════════ */
const FL = ({ label, required, error }) => (
  <label style={{display:"block",fontSize:11,fontWeight:700,color:error?T.coral:T.muted,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.05em",fontFamily:T.head}}>
    {label}{required && <span style={{color:T.coral,marginLeft:2}}>*</span>}
  </label>
);

const Inp = ({ value, onChange, placeholder, type="text", error, disabled }) => (
  <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
    style={{width:"100%",padding:"9px 12px",border:`1px solid ${error?T.coral:T.border}`,borderRadius:8,fontSize:13,fontWeight:600,fontFamily:T.font,background:disabled?T.faint:T.surface,color:T.text,outline:"none",boxSizing:"border-box"}}/>
);

const Sel = ({ value, onChange, options, error }) => (
  <select value={value} onChange={e=>onChange(e.target.value)}
    style={{width:"100%",padding:"9px 12px",border:`1px solid ${error?T.coral:T.border}`,borderRadius:8,fontSize:13,fontWeight:600,fontFamily:T.font,background:T.surface,color:T.text,outline:"none"}}>
    <option value="">Selecione...</option>
    {options.map(o => <option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}
  </select>
);

const FW = ({ label, required, error, children, style:sx={} }) => (
  <div style={{marginBottom:16,...sx}}>
    <FL label={label} required={required} error={!!error}/>
    {children}
    {error && <p style={{margin:"4px 0 0",fontSize:11,color:T.coral,fontFamily:T.font}}>{error}</p>}
  </div>
);

const Btn = ({ children, onClick, variant="primary", size="md", icon:Icon, disabled, style:sx={} }) => {
  const base = {display:"inline-flex",alignItems:"center",gap:6,border:"none",borderRadius:10,cursor:disabled?"not-allowed":"pointer",fontFamily:T.font,fontWeight:700,transition:"all .15s",opacity:disabled?.5:1};
  const sizes = { sm:{fontSize:12,padding:"5px 12px"}, md:{fontSize:13,padding:"8px 16px"} };
  const variants = {
    primary:   {background:T.gradient, color:"#fff", boxShadow:"0 4px 14px -4px rgba(13,116,145,.4)"},
    success:   {background:T.green,    color:"#fff"},
    secondary: {background:T.border,   color:T.text},
    ghost:     {background:"transparent",color:T.muted,border:`1px solid ${T.border}`},
    danger:    {background:`${T.coral}14`,color:T.coral,border:`1px solid ${T.coral}20`},
  };
  const v = variants[variant]||variants.primary;
  return (
    <button onClick={disabled?undefined:onClick} style={{...base,...sizes[size],...v,...sx}}>
      {Icon && <Icon size={parseInt(sizes[size].fontSize)}/>}{children}
    </button>
  );
};

const Card = ({ children, style:sx={} }) => (
  <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,padding:"20px 24px",boxShadow:"0 1px 0 rgba(14,26,36,.03), 0 8px 24px -16px rgba(14,26,36,.08)",...sx}}>{children}</div>
);

/* ═══════════════════════════════════════════════════════════
   SIDEBAR COMPONENTS
═══════════════════════════════════════════════════════════ */
const NavSection = ({ label }) => (
  <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.18em",color:"rgba(255,255,255,0.4)",padding:"10px 20px 4px",textTransform:"uppercase",fontFamily:T.head}}>{label}</div>
);

const NavItem = ({ icon:Icon, label, active=false, path }) => {
  const [hov, setHov] = useState(false);
  const navigate = useNavigate();
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
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
      {Icon && <Icon size={16}/>}{label}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   WIZARD HEADER
═══════════════════════════════════════════════════════════ */
const WizardHeader = ({ phase, subStep, completedPhases, progress }) => (
  <div style={{background:T.surface,borderBottom:`0.5px solid ${T.border}`,padding:"16px 40px",flexShrink:0}}>
    {/* Stepper das 4 fases */}
    <div style={{display:"flex",alignItems:"center",marginBottom:14}}>
      {PHASES.map((p, i) => {
        const done = completedPhases.includes(i);
        const active = i === phase;
        const color = done ? T.green : active ? T.teal : T.muted;
        const PhaseIcon = p.Icon;
        return (
          <span key={i} style={{display:"contents"}}>
            {i > 0 && (
              <div style={{flex:1,height:2,background:completedPhases.includes(i-1)?T.green:T.border,transition:"background 0.4s",margin:"0 8px"}}/>
            )}
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,minWidth:120}}>
              <div style={{
                width:40,height:40,borderRadius:"50%",
                background: done ? `${T.green}14` : active ? `${T.teal}14` : T.faint,
                border:`2px solid ${color}`,
                display:"flex",alignItems:"center",justifyContent:"center",
                boxShadow: active ? `0 0 0 4px ${T.teal}20` : "none",
                transition:"all 0.3s",
              }}>
                {done ? <CheckCircle2 size={20} color={T.green}/> : <PhaseIcon size={18} color={color}/>}
              </div>
              <span style={{fontSize:11,fontWeight:active?700:600,color,fontFamily:T.head,textAlign:"center",lineHeight:1.3}}>{p.label}</span>
            </div>
          </span>
        );
      })}
    </div>
    {/* Sub-dots para fase ativa */}
    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10,justifyContent:"center"}}>
      {PHASES[phase].subSteps.map((_,i) => (
        <div key={i} style={{width:i===subStep?20:6,height:6,borderRadius:3,background:i===subStep?T.teal:i<subStep?T.green:T.border,transition:"all 0.3s"}}/>
      ))}
      <span style={{fontSize:11,color:T.muted,marginLeft:8,fontFamily:T.font}}>{PHASES[phase].subSteps[subStep]}</span>
    </div>
    {/* Progress bar */}
    <div style={{display:"flex",alignItems:"center",gap:12}}>
      <div style={{flex:1,height:4,background:T.border,borderRadius:2,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${progress}%`,background:T.green,borderRadius:2,transition:"width 0.4s ease"}}/>
      </div>
      <span style={{fontSize:12,fontWeight:700,color:T.green,fontFamily:T.font,whiteSpace:"nowrap"}}>{progress}% concluído</span>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════
   FOOTER NAV
═══════════════════════════════════════════════════════════ */
const FooterNav = ({ isFirst, isLast, phase, subStep, onPrev, onNext, onSave }) => {
  const totalSubs = PHASES[phase].subSteps.length;
  return (
    <div style={{background:T.surface,borderTop:`0.5px solid ${T.border}`,padding:"12px 40px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
      <Btn variant="ghost" icon={Save} onClick={onSave} size="sm">Salvar para depois</Btn>
      <span style={{fontSize:12,fontWeight:600,color:T.muted,fontFamily:T.font}}>
        Passo {subStep+1} de {totalSubs} · Fase {phase+1} de {PHASES.length}
      </span>
      <div style={{display:"flex",gap:8}}>
        {!isFirst && <Btn variant="ghost" icon={ChevronLeft} onClick={onPrev} size="sm">Anterior</Btn>}
        {isLast
          ? <Btn variant="success" onClick={onNext} size="sm">Concluir Onboarding ✓</Btn>
          : <Btn variant="primary" icon={ChevronRight} onClick={onNext} size="sm">Próximo</Btn>
        }
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   STEPS
═══════════════════════════════════════════════════════════ */

/* Phase 0 · Sub 0 — Dados da empresa */
const Step_Empresa = ({ data, setField, errors }) => (
  <Card>
    <h2 style={{margin:"0 0 20px",fontSize:18,fontWeight:700,color:T.text,fontFamily:T.head}}>Dados da empresa</h2>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 24px"}}>
      <FW label="Nome da empresa" required error={errors["empresa.nome"]}>
        <Inp value={data.empresa.nome} onChange={v=>setField("empresa.nome",v)} placeholder="Ex: Acme Tecnologia Ltda" error={errors["empresa.nome"]}/>
      </FW>
      <FW label="CNPJ" required error={errors["empresa.cnpj"]}>
        <Inp value={data.empresa.cnpj} onChange={v=>setField("empresa.cnpj",v)} placeholder="00.000.000/0000-00" error={errors["empresa.cnpj"]}/>
      </FW>
      <FW label="Segmento" required error={errors["empresa.segmento"]}>
        <Sel value={data.empresa.segmento} onChange={v=>setField("empresa.segmento",v)} error={errors["empresa.segmento"]}
          options={["SaaS","E-commerce","Agência","Indústria","Varejo","Serviços","Outro"]}/>
      </FW>
      <FW label="Tamanho da equipe" required error={errors["empresa.tamanho"]}>
        <Sel value={data.empresa.tamanho} onChange={v=>setField("empresa.tamanho",v)} error={errors["empresa.tamanho"]}
          options={["1–10","11–50","51–200","200+"]}/>
      </FW>
      <FW label="Site">
        <Inp value={data.empresa.site} onChange={v=>setField("empresa.site",v)} placeholder="https://empresa.com.br" type="url"/>
      </FW>
      <FW label="Fuso horário" required error={errors["empresa.timezone"]}>
        <Sel value={data.empresa.timezone} onChange={v=>setField("empresa.timezone",v)} error={errors["empresa.timezone"]}
          options={[
            {value:"America/Sao_Paulo",  label:"São Paulo (GMT-3)"},
            {value:"America/Manaus",     label:"Manaus (GMT-4)"},
            {value:"America/Belem",      label:"Belém (GMT-3)"},
            {value:"America/Fortaleza",  label:"Fortaleza (GMT-3)"},
          ]}/>
      </FW>
      <FW label="Moeda" required error={errors["empresa.moeda"]}>
        <Sel value={data.empresa.moeda} onChange={v=>setField("empresa.moeda",v)} error={errors["empresa.moeda"]}
          options={[
            {value:"BRL",label:"BRL — Real Brasileiro"},
            {value:"USD",label:"USD — Dólar"},
            {value:"EUR",label:"EUR — Euro"},
          ]}/>
      </FW>
    </div>
  </Card>
);

/* Phase 0 · Sub 1 — Perfil do responsável */
const Step_Responsavel = ({ data, setField, errors }) => (
  <Card>
    <h2 style={{margin:"0 0 20px",fontSize:18,fontWeight:700,color:T.text,fontFamily:T.head}}>Perfil do responsável</h2>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 24px"}}>
      <FW label="Nome completo" required error={errors["responsavel.nome"]}>
        <Inp value={data.responsavel.nome} onChange={v=>setField("responsavel.nome",v)} placeholder="Ana Costa" error={errors["responsavel.nome"]}/>
      </FW>
      <FW label="Cargo" required error={errors["responsavel.cargo"]}>
        <Inp value={data.responsavel.cargo} onChange={v=>setField("responsavel.cargo",v)} placeholder="Head de Marketing" error={errors["responsavel.cargo"]}/>
      </FW>
      <FW label="Email profissional" required error={errors["responsavel.email"]}>
        <Inp value={data.responsavel.email} onChange={v=>setField("responsavel.email",v)} type="email" placeholder="ana@empresa.com.br" error={errors["responsavel.email"]}/>
      </FW>
      <FW label="WhatsApp">
        <Inp value={data.responsavel.whatsapp} onChange={v=>setField("responsavel.whatsapp",v)} placeholder="(11) 99999-9999"/>
      </FW>
    </div>
  </Card>
);

/* Phase 0 · Sub 2 — Plano e faturamento */
const Step_Faturamento = ({ data, setField, errors }) => (
  <Card>
    <h2 style={{margin:"0 0 20px",fontSize:18,fontWeight:700,color:T.text,fontFamily:T.head}}>Plano e faturamento</h2>
    {/* Plano atual readonly */}
    <div style={{background:`${T.teal}10`,border:`1px solid ${T.teal}30`,borderRadius:10,padding:"14px 18px",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div>
        <div style={{fontSize:15,fontWeight:700,color:T.teal,fontFamily:T.head}}>Growth</div>
        <div style={{fontSize:12,color:T.muted,fontFamily:T.font}}>R$ 499/mês · 5.000 leads · 25.000 emails</div>
      </div>
      <span style={{background:T.teal,color:"#fff",fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,fontFamily:T.font}}>Ativo</span>
    </div>
    {/* Método de pagamento */}
    <FW label="Método de pagamento" required error={errors["faturamento.pagamento"]}>
      <div style={{display:"flex",gap:12}}>
        {[{value:"cartao",label:"Cartão de Crédito"},{value:"boleto",label:"Boleto Bancário"}].map(op => (
          <label key={op.value} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"10px 16px",border:`1px solid ${data.faturamento.pagamento===op.value?T.teal:T.border}`,borderRadius:8,background:data.faturamento.pagamento===op.value?`${T.teal}10`:T.surface,flex:1}}>
            <input type="radio" value={op.value} checked={data.faturamento.pagamento===op.value} onChange={()=>setField("faturamento.pagamento",op.value)} style={{accentColor:T.teal}}/>
            <span style={{fontSize:13,fontWeight:600,color:data.faturamento.pagamento===op.value?T.teal:T.text,fontFamily:T.font}}>{op.label}</span>
          </label>
        ))}
      </div>
    </FW>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 24px"}}>
      <FW label="CNPJ para nota fiscal" required error={errors["faturamento.cnpjNF"]}>
        <Inp value={data.faturamento.cnpjNF} onChange={v=>setField("faturamento.cnpjNF",v)} placeholder="00.000.000/0000-00" error={errors["faturamento.cnpjNF"]}/>
      </FW>
      <FW label="Email para faturas" required error={errors["faturamento.emailFaturas"]}>
        <Inp value={data.faturamento.emailFaturas} onChange={v=>setField("faturamento.emailFaturas",v)} type="email" placeholder="financeiro@empresa.com.br" error={errors["faturamento.emailFaturas"]}/>
      </FW>
    </div>
  </Card>
);

/* Phase 1 · Sub 0 — Membros e permissões */
const Step_Membros = ({ data, setField, errors, newMembro, setNewMembro }) => {
  const roles = ["admin","gestor","analista","visualizador"];
  const addMembro = () => {
    if (!newMembro.email) return;
    setField("membros", [...data.membros, { id:Date.now(), ...newMembro }]);
    setNewMembro({ email:"", role:"analista" });
  };
  const removeMembro = (id) => setField("membros", data.membros.filter(m=>m.id!==id));

  const PERM_TABLE = [
    { modulo:"Dashboard",       admin:"Total",   gestor:"Total",   analista:"Ver",    visualizador:"Ver" },
    { modulo:"Leads",           admin:"CRUD",    gestor:"CRUD",    analista:"Editar", visualizador:"Ver" },
    { modulo:"Scoring",         admin:"CRUD",    gestor:"Editar",  analista:"Ver",    visualizador:"Ver" },
    { modulo:"Email Marketing", admin:"CRUD",    gestor:"CRUD",    analista:"Editar", visualizador:"Ver" },
    { modulo:"Integrações",     admin:"CRUD",    gestor:"Ver",     analista:"—",      visualizador:"—"   },
    { modulo:"Configurações",   admin:"Total",   gestor:"Parcial", analista:"—",      visualizador:"—"   },
  ];

  return (
    <div>
      <Card style={{marginBottom:20}}>
        <h2 style={{margin:"0 0 16px",fontSize:18,fontWeight:700,color:T.text,fontFamily:T.head}}>Convidar membros</h2>
        {errors.membros && <p style={{color:T.red,fontSize:12,margin:"0 0 12px",fontFamily:T.font}}>{errors.membros}</p>}
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          <div style={{flex:1}}>
            <Inp value={newMembro.email} onChange={v=>setNewMembro(m=>({...m,email:v}))} placeholder="email@empresa.com.br"/>
          </div>
          <div style={{width:160}}>
            <Sel value={newMembro.role} onChange={v=>setNewMembro(m=>({...m,role:v}))} options={roles}/>
          </div>
          <Btn onClick={addMembro} icon={Plus} size="sm">Convidar</Btn>
        </div>
        {data.membros.length > 0 && (
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {data.membros.map(m => (
              <div key={m.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",background:T.bg,borderRadius:8}}>
                <span style={{fontSize:13,fontWeight:600,color:T.text,fontFamily:T.font}}>{m.email}</span>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,background:`${T.teal}14`,color:T.teal,fontFamily:T.font}}>{m.role}</span>
                  <button onClick={()=>removeMembro(m.id)} style={{background:"none",border:"none",cursor:"pointer",color:T.muted,display:"flex"}}><X size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card>
        <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:700,color:T.text,fontFamily:T.head}}>Permissões por role</h3>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:T.font}}>
            <thead>
              <tr style={{background:T.bg}}>
                <th style={{padding:"8px 12px",textAlign:"left",fontWeight:700,color:T.muted,borderBottom:`1px solid ${T.border}`}}>Módulo</th>
                {roles.map(r => (
                  <th key={r} style={{padding:"8px 12px",textAlign:"center",fontWeight:700,color:T.muted,borderBottom:`1px solid ${T.border}`,textTransform:"capitalize"}}>{r}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERM_TABLE.map((row,i) => (
                <tr key={i} style={{borderBottom:`0.5px solid ${T.border}`}}>
                  <td style={{padding:"8px 12px",fontWeight:600,color:T.text}}>{row.modulo}</td>
                  {roles.map(r => (
                    <td key={r} style={{padding:"8px 12px",textAlign:"center",color:row[r]==="—"?T.border:row[r]==="CRUD"||row[r]==="Total"?T.green:T.text,fontWeight:row[r]==="—"?400:600}}>
                      {row[r]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

/* Phase 2 · Sub 0 — Domínio de email */
const Step_Dominio = ({ data, setField, errors, verifyingDns, setVerifyingDns }) => {
  const verify = () => {
    if (!data.dominio.dominio) return;
    setVerifyingDns(true);
    setTimeout(() => {
      setField("dominio.spf",   "verified");
      setField("dominio.dkim",  "verified");
      setField("dominio.dmarc", "verified");
      setVerifyingDns(false);
    }, 1500);
  };

  const StatusBadge = ({ s }) => (
    <span style={{fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20,fontFamily:T.font,
      background:s==="verified"?`${T.green}14`:s==="pending"?T.faint:`${T.coral}14`,
      color:s==="verified"?T.green:s==="pending"?T.muted:T.coral}}>
      {s==="verified"?"✓ Verificado":s==="pending"?"Pendente":"Erro"}
    </span>
  );

  const domRef = data.dominio.dominio || "empresa.com.br";
  const DNS_RECORDS = [
    { tipo:"SPF",   host:"@",               valor:`v=spf1 include:mail.vantari.com.br ~all`,                                   status:data.dominio.spf   },
    { tipo:"DKIM",  host:`vantari._domainkey`, valor:`v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3...`,                                 status:data.dominio.dkim  },
    { tipo:"DMARC", host:`_dmarc`,           valor:`v=DMARC1; p=quarantine; rua=mailto:dmarc@vantari.com.br`,                  status:data.dominio.dmarc },
  ];

  return (
    <div>
      <Card style={{marginBottom:20}}>
        <h2 style={{margin:"0 0 16px",fontSize:18,fontWeight:700,color:T.text,fontFamily:T.head}}>Domínio de email</h2>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 24px"}}>
          <FW label="Domínio de envio" required error={errors["dominio.dominio"]}>
            <Inp value={data.dominio.dominio} onChange={v=>setField("dominio.dominio",v)} placeholder="empresa.com.br" error={errors["dominio.dominio"]}/>
          </FW>
          <FW label="Email remetente padrão" required error={errors["dominio.remetente"]}>
            <Inp value={data.dominio.remetente} onChange={v=>setField("dominio.remetente",v)} type="email" placeholder={`marketing@${domRef}`} error={errors["dominio.remetente"]}/>
          </FW>
          <FW label="Email reply-to">
            <Inp value={data.dominio.replyTo} onChange={v=>setField("dominio.replyTo",v)} type="email" placeholder={`contato@${domRef}`}/>
          </FW>
          <FW label="Rodapé legal">
            <textarea
              value={data.dominio.rodape}
              onChange={e=>setField("dominio.rodape",e.target.value)}
              placeholder="Endereço físico, link de descadastro LGPD..."
              style={{width:"100%",padding:"9px 12px",border:`1px solid ${T.border}`,borderRadius:8,fontSize:13,fontFamily:T.font,color:T.text,background:T.surface,outline:"none",resize:"vertical",minHeight:72,boxSizing:"border-box"}}/>
          </FW>
        </div>
      </Card>
      <Card>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <h3 style={{margin:0,fontSize:15,fontWeight:700,color:T.text,fontFamily:T.head}}>Registros DNS</h3>
          <Btn onClick={verify} disabled={verifyingDns||!data.dominio.dominio} size="sm" variant="secondary">
            {verifyingDns?"Verificando...":"Verificar DNS"}
          </Btn>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {DNS_RECORDS.map(r => (
            <div key={r.tipo} style={{background:T.bg,borderRadius:8,padding:"12px 14px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:12,fontWeight:700,color:T.text,fontFamily:T.head}}>{r.tipo}</span>
                <StatusBadge s={r.status}/>
              </div>
              <div style={{fontSize:11,color:T.muted,fontFamily:T.font,marginBottom:2}}>
                Host: <code style={{background:"#fff",padding:"1px 4px",borderRadius:4}}>{r.host}.{domRef}</code>
              </div>
              <code style={{fontSize:10,color:T.text,display:"block",background:"#fff",padding:"6px 8px",borderRadius:6,wordBreak:"break-all"}}>{r.valor}</code>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

/* Phase 2 · Sub 1 — Integrações */
const Step_Integracoes = ({ data, setField, errors }) => {
  const INTEGS = [
    { key:"meta",     label:"Meta Ads",         desc:"Facebook, Instagram e Lead Ads",    color:"#1877F2", bg:"#e7f0fe" },
    { key:"google",   label:"Google Ads",        desc:"Search, Display e conversões",      color:"#4285F4", bg:"#e8f0fe" },
    { key:"whatsapp", label:"WhatsApp Business", desc:"API oficial e templates aprovados", color:"#25D366", bg:"#e8faf0" },
    { key:"webhook",  label:"Webhook / API",     desc:"Integração customizada via HTTP",   color:"#7C5CFF", bg:"#F3F0FF" },
  ];
  return (
    <div>
      {errors.integracoes && <p style={{color:T.red,fontSize:12,marginBottom:12,fontFamily:T.font}}>{errors.integracoes}</p>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        {INTEGS.map(integ => {
          const connected = data.integracoes[integ.key];
          return (
            <Card key={integ.key} style={{display:"flex",flexDirection:"column",gap:14,border:`1px solid ${connected?integ.color+"40":T.border}`}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:44,height:44,borderRadius:10,background:integ.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:700,color:integ.color}}>
                  {integ.label[0]}
                </div>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:T.text,fontFamily:T.font}}>{integ.label}</div>
                  <div style={{fontSize:12,color:T.muted,fontFamily:T.font}}>{integ.desc}</div>
                </div>
                <div style={{marginLeft:"auto"}}>
                  <span style={{fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:20,background:connected?`${T.green}14`:"#EEF2F6",color:connected?T.green:T.muted,fontFamily:T.font}}>
                    {connected?"Conectado":"Desconectado"}
                  </span>
                </div>
              </div>
              <Btn
                variant={connected?"danger":"primary"}
                size="sm"
                onClick={()=>setField("integracoes",{...data.integracoes,[integ.key]:!connected})}>
                {connected?"Desconectar":"Conectar"}
              </Btn>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

/* Phase 2 · Sub 2 — Mapeamento de campos */
const Step_Mapeamento = ({ data, setField }) => {
  const CAMPOS_INTERNOS = ["nome","email","telefone","empresa","cargo","utm_campaign","utm_medium","utm_source","utm_term"];
  const addRow = () => setField("mapeamento", [...data.mapeamento, { id:Date.now(), externo:"", interno:"", obrigatorio:false }]);
  const removeRow = (id) => setField("mapeamento", data.mapeamento.filter(r=>r.id!==id));
  const updateRow = (id, field, value) => setField("mapeamento", data.mapeamento.map(r=>r.id===id?{...r,[field]:value}:r));
  return (
    <Card>
      <h2 style={{margin:"0 0 16px",fontSize:18,fontWeight:700,color:T.text,fontFamily:T.head}}>Mapeamento de campos</h2>
      <div style={{border:`0.5px solid ${T.border}`,borderRadius:8,overflow:"hidden",marginBottom:12}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 40px",padding:"8px 12px",background:T.bg,fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",fontFamily:T.head}}>
          <span>Campo Externo</span><span>Campo Vantari</span><span/>
        </div>
        {data.mapeamento.map(row => (
          <div key={row.id} style={{display:"grid",gridTemplateColumns:"1fr 1fr 40px",gap:8,padding:"8px 10px",borderTop:`0.5px solid ${T.border}`,alignItems:"center"}}>
            <Inp value={row.externo} onChange={v=>updateRow(row.id,"externo",v)} placeholder="Campo da plataforma" disabled={row.obrigatorio}/>
            <Sel value={row.interno} onChange={v=>updateRow(row.id,"interno",v)} options={CAMPOS_INTERNOS}/>
            <button
              onClick={()=>!row.obrigatorio&&removeRow(row.id)}
              style={{background:"none",border:"none",cursor:row.obrigatorio?"not-allowed":"pointer",color:row.obrigatorio?T.border:T.red,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <X size={14}/>
            </button>
          </div>
        ))}
      </div>
      <Btn variant="secondary" icon={Plus} size="sm" onClick={addRow}>Adicionar campo</Btn>
    </Card>
  );
};

/* Phase 3 · Sub 0 — Pipeline de leads */
const Step_Pipeline = ({ data, setField, errors }) => {
  const add = () => setField("pipeline", [...data.pipeline, { id:Date.now(), nome:"Novo Estágio", cor:"#94a3b8" }]);
  const remove = (id) => setField("pipeline", data.pipeline.filter(p=>p.id!==id));
  const update = (id, field, value) => setField("pipeline", data.pipeline.map(p=>p.id===id?{...p,[field]:value}:p));
  return (
    <Card>
      <h2 style={{margin:"0 0 8px",fontSize:18,fontWeight:700,color:T.text,fontFamily:T.head}}>Pipeline de leads</h2>
      {errors.pipeline && <p style={{color:T.red,fontSize:12,margin:"0 0 12px",fontFamily:T.font}}>{errors.pipeline}</p>}
      {/* Preview */}
      <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>
        {data.pipeline.map(p => (
          <span key={p.id} style={{padding:"4px 12px",borderRadius:20,fontSize:12,fontWeight:700,color:"#fff",background:p.cor,fontFamily:T.font}}>{p.nome}</span>
        ))}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {data.pipeline.map(p => (
          <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:T.bg,borderRadius:8}}>
            <input type="color" value={p.cor} onChange={e=>update(p.id,"cor",e.target.value)}
              style={{width:28,height:28,border:"none",borderRadius:6,cursor:"pointer",padding:0,background:"none"}}/>
            <input value={p.nome} onChange={e=>update(p.id,"nome",e.target.value)}
              style={{flex:1,padding:"6px 10px",border:`1px solid ${T.border}`,borderRadius:6,fontSize:13,fontWeight:600,fontFamily:T.font,background:T.surface,color:T.text,outline:"none"}}/>
            {data.pipeline.length > 3 && (
              <button onClick={()=>remove(p.id)} style={{background:"none",border:"none",cursor:"pointer",color:T.muted,display:"flex"}}><X size={14}/></button>
            )}
          </div>
        ))}
      </div>
      <Btn variant="secondary" icon={Plus} size="sm" onClick={add} style={{marginTop:12}}>Adicionar estágio</Btn>
    </Card>
  );
};

/* Phase 3 · Sub 1 — Modelo de scoring */
const Step_Scoring = ({ data, setField }) => {
  const updatePontos = (i, value) => {
    const s = [...data.scoring];
    s[i] = { ...s[i], pontos:Number(value) };
    setField("scoring", s);
  };
  const BANDAS = [
    { key:"cold", label:"Cold", color:"#0D7491" },
    { key:"warm", label:"Warm", color:"#F59E0B" },
    { key:"hot",  label:"Hot",  color:"#14A273" },
    { key:"sql",  label:"SQL",  color:"#7C5CFF" },
  ];
  return (
    <div>
      <Card style={{marginBottom:20}}>
        <h2 style={{margin:"0 0 16px",fontSize:18,fontWeight:700,color:T.text,fontFamily:T.head}}>Pontuação por ação</h2>
        <div style={{border:`0.5px solid ${T.border}`,borderRadius:8,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 100px",padding:"8px 12px",background:T.bg,fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",fontFamily:T.head}}>
            <span>Ação</span><span style={{textAlign:"center"}}>Pontos</span>
          </div>
          {data.scoring.map((s,i) => (
            <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 100px",padding:"8px 12px",borderTop:`0.5px solid ${T.border}`,alignItems:"center"}}>
              <span style={{fontSize:13,fontWeight:600,color:T.text,fontFamily:T.font}}>{s.acao}</span>
              <input type="number" value={s.pontos} onChange={e=>updatePontos(i,e.target.value)}
                style={{width:"100%",padding:"5px 8px",border:`1px solid ${T.border}`,borderRadius:6,fontSize:13,fontWeight:700,textAlign:"center",fontFamily:T.font,color:s.pontos<0?T.coral:T.green,outline:"none"}}/>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <h3 style={{margin:"0 0 16px",fontSize:15,fontWeight:700,color:T.text,fontFamily:T.head}}>Bandas de qualificação</h3>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {BANDAS.map(b => (
            <div key={b.key} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:T.bg,borderRadius:8}}>
              <span style={{width:8,height:8,borderRadius:"50%",background:b.color,flexShrink:0}}/>
              <span style={{fontSize:13,fontWeight:700,color:b.color,width:50,fontFamily:T.head}}>{b.label}</span>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <input type="number" value={data.bandas[b.key][0]}
                  onChange={e=>{const arr=[...data.bandas[b.key]];arr[0]=Number(e.target.value);setField("bandas",{...data.bandas,[b.key]:arr});}}
                  style={{width:60,padding:"5px 8px",border:`1px solid ${T.border}`,borderRadius:6,fontSize:13,fontFamily:T.font,outline:"none",textAlign:"center"}}/>
                <span style={{color:T.muted,fontSize:12}}>–</span>
                <input type="number" value={data.bandas[b.key][1]}
                  onChange={e=>{const arr=[...data.bandas[b.key]];arr[1]=Number(e.target.value);setField("bandas",{...data.bandas,[b.key]:arr});}}
                  style={{width:60,padding:"5px 8px",border:`1px solid ${T.border}`,borderRadius:6,fontSize:13,fontFamily:T.font,outline:"none",textAlign:"center"}}/>
              </div>
              <div style={{flex:1,height:8,background:b.color+"20",borderRadius:4,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${data.bandas[b.key][1]}%`,background:b.color,borderRadius:4}}/>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

/* Phase 3 · Sub 2 — Alertas */
const Step_Alertas = ({ data, setField, errors, newAlerta, setNewAlerta }) => {
  const TIPOS = [
    { value:"sql",        label:"Lead SQL detectado"    },
    { value:"email_low",  label:"Abertura de email baixa" },
    { value:"integ_fail", label:"Falha em integração"   },
  ];
  const CANAIS = ["email","whatsapp","in-app"];
  const add = () => {
    setField("alertas", [...data.alertas, { id:Date.now(), ...newAlerta }]);
    setNewAlerta({ tipo:"sql", canal:"email", threshold:"85" });
  };
  const remove = (id) => setField("alertas", data.alertas.filter(a=>a.id!==id));
  return (
    <Card>
      <h2 style={{margin:"0 0 16px",fontSize:18,fontWeight:700,color:T.text,fontFamily:T.head}}>Alertas</h2>
      {errors.alertas && <p style={{color:T.red,fontSize:12,margin:"0 0 12px",fontFamily:T.font}}>{errors.alertas}</p>}
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:180}}>
          <Sel value={newAlerta.tipo} onChange={v=>setNewAlerta(a=>({...a,tipo:v}))} options={TIPOS}/>
        </div>
        <div style={{width:130}}>
          <Sel value={newAlerta.canal} onChange={v=>setNewAlerta(a=>({...a,canal:v}))} options={CANAIS}/>
        </div>
        <div style={{width:80}}>
          <Inp value={newAlerta.threshold} onChange={v=>setNewAlerta(a=>({...a,threshold:v}))} placeholder="85" type="number"/>
        </div>
        <Btn onClick={add} icon={Plus} size="sm">Adicionar</Btn>
      </div>
      {data.alertas.length > 0 && (
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {data.alertas.map(a => {
            const tipo = TIPOS.find(t=>t.value===a.tipo);
            return (
              <div key={a.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",background:T.bg,borderRadius:8}}>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{fontSize:12,fontWeight:700,color:T.teal,fontFamily:T.font}}>{tipo?.label}</span>
                  <span style={{fontSize:11,color:T.muted,fontFamily:T.font}}>via {a.canal} · threshold: {a.threshold}</span>
                </div>
                <button onClick={()=>remove(a.id)} style={{background:"none",border:"none",cursor:"pointer",color:T.muted,display:"flex"}}><X size={14}/></button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

/* Phase 3 · Sub 3 — Metas de KPI */
const Step_Metas = ({ data, setField, errors }) => {
  const CAMPOS = [
    { key:"leadsGerados", label:"Leads Gerados/mês",        placeholder:"500", prefix:"",   suffix:"leads", required:true  },
    { key:"txLeadMQL",    label:"Taxa Lead → MQL",           placeholder:"20",  prefix:"",   suffix:"%",     required:false },
    { key:"txMQLSQL",     label:"Taxa MQL → SQL",            placeholder:"25",  prefix:"",   suffix:"%",     required:false },
    { key:"cpl",          label:"Custo por Lead (CPL)",      placeholder:"50",  prefix:"R$", suffix:"",      required:false },
    { key:"txEmail",      label:"Taxa de Abertura de Email", placeholder:"30",  prefix:"",   suffix:"%",     required:false },
    { key:"roi",          label:"ROI esperado",              placeholder:"300", prefix:"",   suffix:"%",     required:false },
  ];
  return (
    <Card>
      <h2 style={{margin:"0 0 20px",fontSize:18,fontWeight:700,color:T.text,fontFamily:T.head}}>Metas mensais de KPI</h2>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 24px"}}>
        {CAMPOS.map(c => (
          <FW key={c.key} label={c.label} required={c.required} error={errors[`metas.${c.key}`]}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              {c.prefix && <span style={{fontSize:13,fontWeight:600,color:T.muted,fontFamily:T.font}}>{c.prefix}</span>}
              <Inp value={data.metas[c.key]} onChange={v=>setField(`metas.${c.key}`,v)} placeholder={c.placeholder} type="number" error={errors[`metas.${c.key}`]}/>
              {c.suffix && <span style={{fontSize:13,fontWeight:600,color:T.muted,fontFamily:T.font,whiteSpace:"nowrap"}}>{c.suffix}</span>}
            </div>
          </FW>
        ))}
      </div>
    </Card>
  );
};

/* ═══════════════════════════════════════════════════════════
   STEP CONTENT ROUTER
═══════════════════════════════════════════════════════════ */
const StepContent = (props) => {
  const { phase, subStep } = props;
  if (phase===0 && subStep===0) return <Step_Empresa {...props}/>;
  if (phase===0 && subStep===1) return <Step_Responsavel {...props}/>;
  if (phase===0 && subStep===2) return <Step_Faturamento {...props}/>;
  if (phase===1 && subStep===0) return <Step_Membros {...props}/>;
  if (phase===2 && subStep===0) return <Step_Dominio {...props}/>;
  if (phase===2 && subStep===1) return <Step_Integracoes {...props}/>;
  if (phase===2 && subStep===2) return <Step_Mapeamento {...props}/>;
  if (phase===3 && subStep===0) return <Step_Pipeline {...props}/>;
  if (phase===3 && subStep===1) return <Step_Scoring {...props}/>;
  if (phase===3 && subStep===2) return <Step_Alertas {...props}/>;
  if (phase===3 && subStep===3) return <Step_Metas {...props}/>;
  return null;
};

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
export default function VantariOnboardingWizard() {
  const [phase, setPhase] = useState(0);
  const [subStep, setSubStep] = useState(0);
  const [completedPhases, setCompletedPhases] = useState([]);
  const [data, setData] = useState(() => {
    try {
      const s = localStorage.getItem("vantari_onboarding");
      return s ? JSON.parse(s).data : INITIAL_DATA;
    } catch {
      return INITIAL_DATA;
    }
  });
  const [errors, setErrors] = useState({});
  const [verifyingDns, setVerifyingDns] = useState(false);
  const [newMembro, setNewMembro] = useState({ email:"", role:"analista" });
  const [newAlerta, setNewAlerta] = useState({ tipo:"sql", canal:"email", threshold:"85" });
  const navigate = useNavigate();

  /* helpers */
  const setField = (path, value) => {
    const parts = path.split(".");
    setData(d => {
      const copy = { ...d };
      if (parts.length === 2) copy[parts[0]] = { ...copy[parts[0]], [parts[1]]: value };
      else copy[parts[0]] = value;
      return copy;
    });
    setErrors(e => { const c = {...e}; delete c[path]; return c; });
  };

  /* validation */
  const validate = () => {
    const errs = {};
    const key = `${phase}-${subStep}`;
    const get = (path) => { const [a,b] = path.split("."); return data[a]?.[b]; };

    const REQUIRED_FIELDS = {
      "0-0": ["empresa.nome","empresa.cnpj","empresa.segmento","empresa.tamanho","empresa.timezone","empresa.moeda"],
      "0-1": ["responsavel.nome","responsavel.cargo","responsavel.email"],
      "0-2": ["faturamento.pagamento","faturamento.cnpjNF","faturamento.emailFaturas"],
      "1-0": [],
      "2-0": ["dominio.dominio","dominio.remetente"],
      "2-1": [],
      "2-2": [],
      "3-0": [],
      "3-1": [],
      "3-2": [],
      "3-3": ["metas.leadsGerados"],
    };

    (REQUIRED_FIELDS[key]||[]).forEach(f => {
      if (!get(f)) errs[f] = "Campo obrigatório";
    });

    if (key === "0-1" && data.responsavel.email && !data.responsavel.email.includes("@")) {
      errs["responsavel.email"] = "Email inválido";
    }
    if (key === "1-0" && data.membros.length === 0) {
      errs.membros = "Convide ao menos 1 membro para continuar";
    }
    if (key === "2-1" && !Object.values(data.integracoes).some(v => v)) {
      errs.integracoes = "Conecte ao menos 1 integração para continuar";
    }
    if (key === "3-0" && data.pipeline.length < 3) {
      errs.pipeline = "Defina ao menos 3 estágios no funil";
    }
    if (key === "3-2" && data.alertas.length === 0) {
      errs.alertas = "Configure ao menos 1 alerta para continuar";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /* navigation */
  const goNext = () => {
    if (!validate()) return;
    const totalSubs = PHASES[phase].subSteps.length;
    if (subStep < totalSubs - 1) {
      setSubStep(s => s + 1);
    } else {
      setCompletedPhases(cp => [...cp, phase]);
      if (phase < PHASES.length - 1) {
        setPhase(p => p + 1);
        setSubStep(0);
      } else {
        handleComplete();
      }
    }
  };

  const goPrev = () => {
    setErrors({});
    if (subStep > 0) {
      setSubStep(s => s - 1);
    } else if (phase > 0) {
      setPhase(p => p - 1);
      setSubStep(PHASES[phase - 1].subSteps.length - 1);
    }
  };

  const saveForLater = () => {
    localStorage.setItem("vantari_onboarding", JSON.stringify({ data, phase, subStep, completedPhases }));
    alert("Progresso salvo! Você pode continuar de onde parou a qualquer momento.");
  };

  const handleComplete = () => {
    localStorage.setItem("vantari_onboarding", JSON.stringify({ data, completedPhases:[0,1,2,3], completed:true }));
    navigate("/dashboard");
  };

  /* progress */
  const getProgress = () => {
    let done = 0, total = 0;
    const req = [
      ["empresa.nome","empresa.cnpj","empresa.segmento","empresa.tamanho"],
      ["responsavel.nome","responsavel.cargo","responsavel.email"],
      ["faturamento.cnpjNF","faturamento.emailFaturas"],
      ["dominio.dominio","dominio.remetente"],
      ["metas.leadsGerados"],
    ];
    req.flat().forEach(k => {
      total++;
      const [a,b] = k.split(".");
      if (data[a] && data[a][b]) done++;
    });
    total += 3;
    if (data.membros.length > 0) done++;
    if (Object.values(data.integracoes).some(v => v)) done++;
    if (data.alertas.length > 0) done++;
    return Math.round((done / total) * 100);
  };

  const isFirst = phase === 0 && subStep === 0;
  const isLast  = phase === PHASES.length - 1 && subStep === PHASES[phase].subSteps.length - 1;
  const progress = getProgress();

  return (
    <div style={{display:"flex",height:"100vh",background:T.bg,fontFamily:T.font,overflow:"hidden"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');*{box-sizing:border-box;}::-webkit-scrollbar{width:6px;height:6px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:#B3BFCA;border-radius:99px;}`}</style>

      {/* Sidebar */}
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
          <NavItem icon={BarChart2}      label="Analytics"       path="/dashboard"    />
          <NavItem icon={Users}          label="Leads"           path="/leads"        />
          <NavItem icon={Mail}           label="Email Marketing" path="/email"        />
          <NavSection label="Ferramentas"/>
          <NavItem icon={Star}           label="Scoring"         path="/scoring"      />
          <NavItem icon={LayoutTemplate} label="Landing Pages"   path="/landing"      />
          <NavItem icon={Bot}            label="IA & Automação"  path="/ai-marketing" />
          <NavSection label="Sistema"/>
          <NavItem icon={Plug}           label="Integrações"     path="/integrations" />
        </div>
        <div style={{borderTop:"1px solid rgba(255,255,255,0.08)",padding:"8px 0",position:"relative"}}>
          <NavItem icon={Settings} label="Configurações" path="/settings"/>
        </div>
      </div>

      {/* Main */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <WizardHeader phase={phase} subStep={subStep} completedPhases={completedPhases} progress={progress}/>
        <div style={{flex:1,overflowY:"auto",padding:"32px 40px"}}>
          <StepContent
            phase={phase} subStep={subStep}
            data={data} setField={setField} errors={errors}
            verifyingDns={verifyingDns} setVerifyingDns={setVerifyingDns}
            newMembro={newMembro} setNewMembro={setNewMembro}
            newAlerta={newAlerta} setNewAlerta={setNewAlerta}
          />
        </div>
        <FooterNav
          isFirst={isFirst} isLast={isLast}
          phase={phase} subStep={subStep}
          onPrev={goPrev} onNext={goNext} onSave={saveForLater}
        />
      </div>
    </div>
  );
}
