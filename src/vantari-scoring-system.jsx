import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart2, Scale, Filter, Zap, Settings, Users, Mail,
  LayoutTemplate, Bot, Plug, Star, TrendingUp, TrendingDown,
  Pencil, X, Plus, Save, CheckCircle2, AlertTriangle,
  AlertCircle, Info, Radio, ClipboardList, Monitor,
  MessageSquare, Calendar, Thermometer, Flame, ChevronRight,
  Activity, Clock, Webhook, Loader2
} from "lucide-react";
import { supabase } from "./supabase";

/* ═══════════════════════════════════════════════════════════════════════
   DATABASE SCHEMA (Supabase-compatible)
   ─────────────────────────────────────────────────────────────────────
   TABLE: scoring_rules
     id uuid primary key default gen_random_uuid()
     action      text not null
     label       text not null
     points      int not null
     category    text not null
     active      bool default true
     workspace_id uuid references workspaces(id)

   TABLE: segments
     id uuid primary key default gen_random_uuid()
     name        text not null
     conditions  jsonb not null
     logic       text not null default 'AND'
     color       text
     workspace_id uuid references workspaces(id)

   TABLE: lead_score_history
     id uuid primary key default gen_random_uuid()
     lead_id     uuid references leads(id)
     old_score   int
     new_score   int
     reason      text
     webhook_sent bool default false
     timestamp   timestamptz default now()
     workspace_id uuid references workspaces(id)
════════════════════════════════════════════════════════════════════════ */

/* ───── DESIGN TOKENS ───── */
const C = {
  bg:      "#f2f5f8",
  surface: "#ffffff",
  card:    "#ffffff",
  border:  "#e2e8f0",
  border2: "#edf0f4",
  blue:    "#0079a9",
  teal:    "#0079a9",
  green:   "#05b27b",
  orange:  "#e07b00",
  red:     "#ef4444",
  purple:  "#6d45d9",
  text:    "#5f5f64",
  muted:   "#888891",
  faint3:  "#adadb5",
  faint:   "#f8fafc",
  font:    "'Aptos', 'Nunito Sans', sans-serif",
  head:    "'Montserrat', sans-serif",
  mono:    "'Courier New', monospace",
};

const bandColors = {
  cold: { accent: "#0079a9", label: "Cold", bg: "#e8f5fb", border: "#b3d9ea" },
  warm: { accent: "#e07b00", label: "Warm", bg: "#fff4e6", border: "#f5c78a" },
  hot:  { accent: "#05b27b", label: "Hot",  bg: "#f0fdf7", border: "#6ee7b7" },
  sql:  { accent: "#6d45d9", label: "SQL",  bg: "#f3f0ff", border: "#c4b5fd" },
};

const scoreBand = (s, t) => {
  if (s >= t.sql)  return "sql";
  if (s >= t.hot)  return "hot";
  if (s >= t.warm) return "warm";
  return "cold";
};
const bandOf = (score, t) => bandColors[scoreBand(score, t)];

const CATEGORY_ICONS = {
  email:    Mail,
  form:     ClipboardList,
  page:     Monitor,
  whatsapp: MessageSquare,
  event:    Calendar,
  decay:    TrendingDown,
};

const DEFAULT_RULES = [
  { id:"r1", action:"email_open",    label:"Email aberto",            points:  2, category:"email",    active:true  },
  { id:"r2", action:"email_click",   label:"Clique em link de email", points:  5, category:"email",    active:true  },
  { id:"r3", action:"form_submit",   label:"Formulário preenchido",   points: 10, category:"form",     active:true  },
  { id:"r4", action:"page_pricing",  label:"Visitou /pricing",        points: 15, category:"page",     active:true  },
  { id:"r5", action:"page_visit",    label:"Visitou página genérica", points:  1, category:"page",     active:true  },
  { id:"r6", action:"whatsapp_msg",  label:"Mensagem WhatsApp",       points:  8, category:"whatsapp", active:true  },
  { id:"r7", action:"demo_request",  label:"Solicitou demo",          points: 20, category:"form",     active:true  },
  { id:"r8", action:"webinar",       label:"Participou de webinar",   points: 12, category:"event",    active:false },
  { id:"d1", action:"inactivity_30", label:"Inatividade 30 dias",     points: -5, category:"decay",    active:true  },
  { id:"d2", action:"email_bounce",  label:"Email bounce",            points:-10, category:"decay",    active:true  },
  { id:"d3", action:"unsub",         label:"Descadastrou de email",   points:-15, category:"decay",    active:true  },
];

const DEFAULT_SEGMENTS = [
  { id:"seg1", name:"Leads Quentes",  color:C.green,  conditions:[{field:"score",  op:"gte", value:"60"}],                                                    logic:"AND", count:0, saved:true },
  { id:"seg2", name:"Alto Valor B2B", color:C.purple, conditions:[{field:"score",  op:"gte", value:"50"},{field:"tags", op:"contains",value:"B2B"}],           logic:"AND", count:0, saved:true },
  { id:"seg3", name:"Reengajamento",  color:C.orange, conditions:[{field:"score",  op:"lte", value:"20"},{field:"lastActive",op:"days_ago",value:"30"}],       logic:"AND", count:0, saved:true },
];

/* ═══════════════════════════════════════════════════════════════════════
   SHARED UI COMPONENTS
════════════════════════════════════════════════════════════════════════ */
const Btn = ({ children, onClick, variant="primary", size="sm", icon:Icon, disabled, style:sx={} }) => {
  const [hov, setHov] = useState(false);
  const vs = {
    primary: { bg:hov?"#006a93":C.blue,   color:"#fff", border:"none",                              shadow:hov?"0 4px 12px rgba(0,121,169,0.3)":"0 1px 3px rgba(0,121,169,0.15)" },
    ghost:   { bg:hov?C.border2:"transparent", color:C.text, border:`0.5px solid ${C.border}`,      shadow:"none" },
    danger:  { bg:hov?"#dc2626":"#fef2f2",  color:hov?"#fff":C.red,   border:`0.5px solid ${C.red}55`, shadow:"none" },
    success: { bg:hov?"#04996a":C.green,    color:"#fff", border:"none",                             shadow:"none" },
    teal:    { bg:hov?"#006a93":C.blue,     color:"#fff", border:"none",                             shadow:"none" },
    amber:   { bg:hov?"#c46d00":C.orange,   color:"#fff", border:"none",                             shadow:"none" },
  }[variant] || {};
  const pad = { xs:"4px 9px", sm:"6px 14px", md:"9px 18px", lg:"11px 22px" }[size] || "6px 14px";
  const fs  = { xs:10, sm:12, md:13, lg:14 }[size] || 12;
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display:"inline-flex", alignItems:"center", gap:6, padding:pad, fontSize:fs, fontFamily:C.font, fontWeight:700, borderRadius:8, border:vs.border||"none", background:vs.bg, color:vs.color, boxShadow:vs.shadow, cursor:disabled?"not-allowed":"pointer", opacity:disabled?.5:1, transition:"all 0.15s", whiteSpace:"nowrap", ...sx }}>
      {Icon && <Icon size={fs} aria-hidden="true" />}
      {children}
    </button>
  );
};

/* Toggle — verde #05b27b quando ativo */
const Toggle = ({ checked, onChange }) => (
  <div onClick={() => onChange(!checked)} style={{ width:36, height:20, borderRadius:99, background:checked ? C.green : C.border, cursor:"pointer", position:"relative", transition:"background 0.2s", flexShrink:0 }}>
    <div style={{ position:"absolute", top:3, left:checked?19:3, width:14, height:14, borderRadius:"50%", background:"#fff", transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.15)" }} />
  </div>
);

const Field = ({ value, onChange, placeholder, type="text", small, mono, style:sx={} }) => {
  const [foc, setFoc] = useState(false);
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
      style={{ fontFamily:mono?C.mono:C.font, fontSize:small?12:13, fontWeight:600, padding:small?"5px 9px":"8px 12px", background:C.faint, border:`1px solid ${foc?C.blue:C.border}`, borderRadius:8, color:C.text, outline:"none", width:"100%", boxSizing:"border-box", transition:"border-color 0.15s", boxShadow:foc?`0 0 0 3px rgba(0,121,169,0.1)`:"none", ...sx }} />
  );
};

/* ScoreBar — sutil, sem gradiente neon */
const ScoreBar = ({ value, max=100, color=C.blue, height=6 }) => (
  <div style={{ width:"100%", height, background:C.border2, borderRadius:99, overflow:"hidden", border:`0.5px solid ${C.border}` }}>
    <div style={{ height:"100%", width:`${(value/max)*100}%`, background:color, borderRadius:99, transition:"width 0.6s ease" }} />
  </div>
);

/* BandPill — pill semântica com fundo tonal */
const BandPill = ({ band }) => {
  const b = bandColors[band] || bandColors.cold;
  return (
    <span style={{ fontSize:9, fontWeight:700, background:b.bg, color:b.accent, border:`0.5px solid ${b.border}`, padding:"2px 7px", borderRadius:4, fontFamily:C.font, letterSpacing:"0.05em" }}>
      {b.label.toUpperCase()}
    </span>
  );
};

/* StatCard — fundo branco, bordas leves */
const StatCard = ({ label, value, sub, color=C.blue, icon:Icon }) => (
  <div style={{ background:C.surface, border:`0.5px solid ${C.border}`, borderLeft:`3px solid ${color}`, borderRadius:12, padding:"16px 18px" }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
      <div>
        <div style={{ fontFamily:C.font, fontSize:11, color:C.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>{label}</div>
        <div style={{ fontFamily:C.head, fontSize:28, fontWeight:700, color, lineHeight:1 }}>{value}</div>
        {sub && <div style={{ fontFamily:C.font, fontSize:11, color:C.muted, marginTop:5, fontWeight:600 }}>{sub}</div>}
      </div>
      {Icon && <div style={{ width:38, height:38, borderRadius:10, background:`${color}14`, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <Icon size={18} color={color} aria-hidden="true" />
      </div>}
    </div>
  </div>
);

/* DonutChart — fundo branco, sem glow */
const DonutChart = ({ slices, size=160 }) => {
  const r = size * 0.38; const cx = size/2; const cy = size/2;
  const circumference = 2 * Math.PI * r;
  const total = slices.reduce((a,s) => a+s.value, 0);
  let offset = 0;
  return (
    <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
      {slices.map((s, i) => {
        const pct  = s.value / total;
        const dash = pct * circumference;
        const gap  = circumference - dash;
        const el   = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color}
            strokeWidth={size * 0.11} strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset * circumference}
            style={{ transition:"all 0.5s ease" }} />
        );
        offset += pct;
        return el;
      })}
      <circle cx={cx} cy={cy} r={r*0.58} fill="#ffffff" />
    </svg>
  );
};

/* Spark — sparkline, cor ajustada */
const Spark = ({ data, color=C.blue, w=80, h=28 }) => {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v,i) => `${(i/(data.length-1))*w},${h-((v-min)/range)*h}`).join(" ");
  return (
    <svg width={w} height={h} style={{ overflow:"visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={(data.length-1)/(data.length-1)*w} cy={h-((data[data.length-1]-min)/range)*h} r="2.5" fill={color} />
    </svg>
  );
};

/* NavSection / NavItem */
const NavSection = ({ label }) => (
  <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.1em", color:"rgba(255,255,255,0.45)", padding:"10px 20px 4px", textTransform:"uppercase", fontFamily:C.head }}>
    {label}
  </div>
);

const NavItem = ({ icon:Icon, label, active=false, path }) => {
  const [hov, setHov] = useState(false);
  const navigate = useNavigate();
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={() => path && navigate(path)}
      style={{ display:"flex", alignItems:"center", gap:9, padding:"8px 20px", fontSize:13, fontWeight:active?700:600, fontFamily:C.font, color:active?"#fff":hov?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.6)", background:active?"rgba(255,255,255,0.18)":hov?"rgba(255,255,255,0.08)":"transparent", borderRight:active?"2px solid #fff":"2px solid transparent", cursor:"pointer", transition:"all 0.15s", userSelect:"none" }}>
      {Icon && <Icon size={16} aria-hidden="true" />}
      {label}
    </div>
  );
};

const SectionHeading = ({ children, sub }) => (
  <div style={{ marginBottom:16 }}>
    <h2 style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:C.head, margin:0, letterSpacing:"-0.01em" }}>{children}</h2>
    {sub && <p style={{ fontSize:11, color:C.muted, margin:"3px 0 0", fontFamily:C.font, fontWeight:600 }}>{sub}</p>}
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════
   TAB 1 — SCORING RULES
════════════════════════════════════════════════════════════════════════ */
const ScoringRules = ({ rules, setRules, thresholds, setThresholds, leads }) => {
  const [editId,       setEditId]       = useState(null);
  const [newRule,      setNewRule]      = useState({ label:"", points:0, category:"email" });
  const [previewLeads, setPreviewLeads] = useState(leads.slice(0,5));
  const [showAddForm,  setShowAddForm]  = useState(false);

  const positiveRules = rules.filter(r => r.points >= 0);
  const decayRules    = rules.filter(r => r.points < 0);

  const updateRule = (id, key, val) => setRules(prev => prev.map(r => r.id===id ? {...r,[key]:val} : r));
  const deleteRule = (id) => setRules(prev => prev.filter(r => r.id!==id));
  const addRule = () => {
    if (!newRule.label) return;
    setRules(prev => [...prev, { ...newRule, id:`r${Date.now()}`, action:newRule.label.toLowerCase().replace(/\s/g,"_"), active:true, points:Number(newRule.points) }]);
    setNewRule({ label:"", points:0, category:"email" });
    setShowAddForm(false);
  };

  const RuleRow = ({ rule }) => {
    const [hovRow, setHovRow] = useState(false);
    const isEdit = editId === rule.id;
    const CatIcon = CATEGORY_ICONS[rule.category] || Activity;
    return (
      <div onMouseEnter={() => setHovRow(true)} onMouseLeave={() => setHovRow(false)}
      style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", background:hovRow?C.faint:"transparent", borderRadius:8, transition:"background 0.15s", borderBottom:`0.5px solid ${C.border}` }}>
        <div style={{ width:28, height:28, borderRadius:8, background:`${rule.points >= 0 ? C.blue : C.red}12`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <CatIcon size={13} color={rule.points >= 0 ? C.blue : C.red} aria-hidden="true" />
        </div>
        {isEdit ? (
          <>
            <Field value={rule.label} onChange={e => updateRule(rule.id,"label",e.target.value)} small style={{ flex:1 }} />
            <Field value={rule.points} onChange={e => updateRule(rule.id,"points",Number(e.target.value))} type="number" small mono style={{ width:70 }} />
            <Btn onClick={() => setEditId(null)} variant="success" size="xs" icon={CheckCircle2} />
          </>
        ) : (
          <>
            <span style={{ flex:1, fontFamily:C.font, fontSize:13, color:C.text, fontWeight:600 }}>{rule.label}</span>
            <div style={{ fontFamily:C.mono, fontSize:13, fontWeight:700, color:rule.points>=0?C.green:C.red, minWidth:50, textAlign:"right" }}>
              {rule.points>=0?"+":""}{rule.points}
            </div>
            <span style={{ fontFamily:C.font, fontSize:10, fontWeight:700, color:C.muted, background:C.border2, padding:"2px 7px", borderRadius:4 }}>{rule.category}</span>
            <Toggle checked={rule.active} onChange={v => updateRule(rule.id,"active",v)} />
            {hovRow && (
              <div style={{ display:"flex", gap:4 }}>
                <Btn onClick={() => setEditId(rule.id)} variant="ghost" size="xs" icon={Pencil} />
                <Btn onClick={() => deleteRule(rule.id)} variant="danger" size="xs" icon={X} />
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 360px", gap:20 }}>
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        {/* Positive rules */}
        <div style={{ background:C.surface, border:`0.5px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
          <div style={{ padding:"14px 18px", borderBottom:`0.5px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontFamily:C.head, fontSize:14, fontWeight:700, color:C.text }}>Ações de Pontuação</div>
              <div style={{ fontFamily:C.font, fontSize:11, color:C.muted, marginTop:2, fontWeight:600 }}>{positiveRules.filter(r=>r.active).length} regras ativas</div>
            </div>
            <Btn onClick={() => setShowAddForm(!showAddForm)} variant="primary" size="sm" icon={Plus}>Nova Regra</Btn>
          </div>
          {showAddForm && (
            <div style={{ padding:"14px 18px", background:C.faint, borderBottom:`0.5px solid ${C.border}`, display:"flex", gap:8, alignItems:"flex-end", flexWrap:"wrap" }}>
              <div style={{ flex:2 }}>
                <div style={{ fontFamily:C.font, fontSize:10, color:C.muted, marginBottom:4, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>Label</div>
                <Field value={newRule.label} onChange={e => setNewRule(p=>({...p,label:e.target.value}))} placeholder="Nome da ação" small />
              </div>
              <div style={{ width:90 }}>
                <div style={{ fontFamily:C.font, fontSize:10, color:C.muted, marginBottom:4, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>Pontos</div>
                <Field value={newRule.points} onChange={e => setNewRule(p=>({...p,points:e.target.value}))} type="number" small mono />
              </div>
              <div style={{ width:120 }}>
                <div style={{ fontFamily:C.font, fontSize:10, color:C.muted, marginBottom:4, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>Categoria</div>
                <select value={newRule.category} onChange={e => setNewRule(p=>({...p,category:e.target.value}))}
                  style={{ fontFamily:C.font, fontSize:12, fontWeight:600, background:"#fff", border:`1px solid ${C.border}`, borderRadius:8, padding:"5px 8px", color:C.text, width:"100%", outline:"none" }}>
                  {["email","form","page","whatsapp","event","decay"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <Btn onClick={addRule} variant="success" size="sm">Adicionar</Btn>
              <Btn onClick={() => setShowAddForm(false)} variant="ghost" size="sm">Cancelar</Btn>
            </div>
          )}
          <div style={{ padding:"8px 4px" }}>
            {positiveRules.map(r => <RuleRow key={r.id} rule={r} />)}
          </div>
        </div>

        {/* Decay rules */}
        <div style={{ background:C.surface, border:`0.5px solid ${C.red}44`, borderRadius:12, overflow:"hidden" }}>
          <div style={{ padding:"14px 18px", borderBottom:`0.5px solid ${C.border}`, display:"flex", alignItems:"center", gap:8 }}>
            <AlertTriangle size={15} color={C.red} aria-hidden="true" />
            <div>
              <div style={{ fontFamily:C.head, fontSize:14, fontWeight:700, color:C.red }}>Regras de Decaimento</div>
              <div style={{ fontFamily:C.font, fontSize:11, color:C.muted, marginTop:2, fontWeight:600 }}>Penalizações automáticas por comportamento negativo</div>
            </div>
          </div>
          <div style={{ padding:"8px 4px" }}>
            {decayRules.map(r => <RuleRow key={r.id} rule={r} />)}
          </div>
        </div>
      </div>

      {/* Right: Thresholds + Preview */}
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        <div style={{ background:C.surface, border:`0.5px solid ${C.border}`, borderRadius:12, padding:"18px" }}>
          <div style={{ fontFamily:C.head, fontSize:14, fontWeight:700, color:C.text, marginBottom:4 }}>Thresholds de Faixa</div>
          <div style={{ fontFamily:C.font, fontSize:11, color:C.muted, marginBottom:16, fontWeight:600 }}>Defina os limites de score para cada faixa</div>
          {[
            { key:"warm", label:"Warm", color:C.orange, Icon:Thermometer, desc:"Cold → Warm" },
            { key:"hot",  label:"Hot",  color:C.green,  Icon:Flame,       desc:"Warm → Hot"  },
            { key:"sql",  label:"SQL",  color:C.purple, Icon:Star,        desc:"Hot → SQL"   },
          ].map(t => (
            <div key={t.key} style={{ marginBottom:18 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <t.Icon size={14} color={t.color} aria-hidden="true" />
                  <span style={{ fontFamily:C.font, fontSize:12, fontWeight:700, color:t.color }}>{t.desc}</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <span style={{ fontFamily:C.head, fontSize:14, color:t.color, fontWeight:700 }}>{thresholds[t.key]}</span>
                  <span style={{ fontFamily:C.font, fontSize:10, color:C.muted, fontWeight:600 }}>pts</span>
                </div>
              </div>
              <input type="range" min="0" max="100" value={thresholds[t.key]}
                onChange={e => setThresholds(p => ({...p,[t.key]:Number(e.target.value)}))}
                style={{ width:"100%", marginBottom:6, accentColor:t.color }} />
              <ScoreBar value={thresholds[t.key]} color={t.color} height={5} />
            </div>
          ))}

          {/* Band visualization strip */}
          <div style={{ marginTop:16, height:28, borderRadius:8, overflow:"hidden", display:"flex", border:`0.5px solid ${C.border}` }}>
            {[
              { label:"Cold", color:bandColors.cold.accent, pct:thresholds.warm },
              { label:"Warm", color:bandColors.warm.accent, pct:thresholds.hot - thresholds.warm },
              { label:"Hot",  color:bandColors.hot.accent,  pct:thresholds.sql - thresholds.hot  },
              { label:"SQL",  color:bandColors.sql.accent,  pct:100 - thresholds.sql             },
            ].filter(b => b.pct > 0).map(b => (
              <div key={b.label} style={{ flex:`0 0 ${b.pct}%`, background:`${b.color}22`, display:"flex", alignItems:"center", justifyContent:"center", borderRight:`0.5px solid ${C.border}` }}>
                <span style={{ fontFamily:C.font, fontSize:9, fontWeight:700, color:b.color, letterSpacing:"0.06em" }}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live score preview */}
        <div style={{ background:C.surface, border:`0.5px solid ${C.border}`, borderRadius:12, padding:"18px" }}>
          <div style={{ fontFamily:C.head, fontSize:14, fontWeight:700, color:C.text, marginBottom:14 }}>Preview de Leads</div>
          {previewLeads.map(l => {
            const band = bandOf(l.score, thresholds);
            return (
              <div key={l.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:`0.5px solid ${C.border}` }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:band.accent, flexShrink:0 }} />
                <span style={{ fontFamily:C.font, fontSize:12, color:C.text, flex:1, fontWeight:600 }}>{l.name.split(" ")[0]}</span>
                <div style={{ flex:2 }}><ScoreBar value={l.score} color={band.accent} height={4} /></div>
                <span style={{ fontFamily:C.head, fontSize:12, fontWeight:700, color:band.accent, width:28, textAlign:"right" }}>{l.score}</span>
                <BandPill band={scoreBand(l.score, thresholds)} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   TAB 2 — SEGMENT BUILDER
════════════════════════════════════════════════════════════════════════ */
const CONDITION_FIELDS = [
  { value:"score",       label:"Score",            ops:["gte","lte","eq","between"] },
  { value:"tags",        label:"Tags",              ops:["contains","not_contains"]  },
  { value:"source",      label:"Canal de origem",   ops:["eq","neq"]                 },
  { value:"company",     label:"Empresa",           ops:["contains","eq"]            },
  { value:"lastActive",  label:"Última atividade",  ops:["days_ago","days_within"]   },
  { value:"interactions",label:"Interações",        ops:["gte","lte"]                },
];
const OP_LABELS = { gte:"≥", lte:"≤", eq:"=", neq:"≠", between:"entre", contains:"contém", not_contains:"não contém", days_ago:"há mais de X dias", days_within:"dentro de X dias" };
const FIELD_VALUES = {
  source: ["Email","WhatsApp","Instagram","Google Ads","Meta Ads","Landing Page"],
  tags:   ["VIP","B2B","SaaS","E-commerce","Alto Valor","Newsletter","Demo Solicitada","Retargeting"],
};

const SegmentBuilder = ({ leads, thresholds }) => {
  const [segments, setSegments] = useState(DEFAULT_SEGMENTS);
  const [active,   setActive]   = useState(null);
  const [draft,    setDraft]    = useState({ name:"", conditions:[], logic:"AND", color:C.blue });
  const [saved,    setSaved]    = useState(false);

  const evaluateLead = (lead, conditions, logic) => {
    const results = conditions.map(c => {
      const val  = String(lead[c.field] || "").toLowerCase();
      const cval = String(c.value || "").toLowerCase();
      switch(c.op) {
        case "gte": return Number(lead[c.field]) >= Number(c.value);
        case "lte": return Number(lead[c.field]) <= Number(c.value);
        case "eq":  return val === cval;
        case "neq": return val !== cval;
        case "contains": return c.field==="tags" ? (lead.tags||[]).some(t=>t.toLowerCase().includes(cval)) : val.includes(cval);
        case "not_contains": return c.field==="tags" ? !(lead.tags||[]).some(t=>t.toLowerCase().includes(cval)) : !val.includes(cval);
        case "days_ago":    return (Date.now()-new Date(lead.lastActive).getTime()) > Number(c.value)*864e5;
        case "days_within": return (Date.now()-new Date(lead.lastActive).getTime()) < Number(c.value)*864e5;
        default: return false;
      }
    });
    return logic==="AND" ? results.every(Boolean) : logic==="OR" ? results.some(Boolean) : !results.every(Boolean);
  };

  const matchCount = useMemo(() => {
    if (!draft.conditions.length) return 0;
    return leads.filter(l => evaluateLead(l, draft.conditions, draft.logic)).length;
  }, [draft, leads]);

  const matchLeads = useMemo(() => {
    if (!draft.conditions.length) return [];
    return leads.filter(l => evaluateLead(l, draft.conditions, draft.logic)).slice(0,6);
  }, [draft, leads]);

  const addCondition = () => setDraft(d => ({...d, conditions:[...d.conditions, {id:`c${Date.now()}`, field:"score", op:"gte", value:"60"}]}));
  const updateCond   = (id,key,val) => setDraft(d => ({...d, conditions:d.conditions.map(c=>c.id===id?{...c,[key]:val}:c)}));
  const removeCond   = (id) => setDraft(d => ({...d, conditions:d.conditions.filter(c=>c.id!==id)}));

  const saveSegment = () => {
    if (!draft.name || !draft.conditions.length) return;
    const seg = {...draft, id:`seg${Date.now()}`, count:matchCount, saved:true};
    if (active) setSegments(prev => prev.map(s=>s.id===active?seg:s));
    else setSegments(prev => [...prev, seg]);
    setDraft({ name:"", conditions:[], logic:"AND", color:C.blue });
    setActive(null); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const loadSegment = (seg) => { setDraft({name:seg.name, conditions:[...seg.conditions], logic:seg.logic, color:seg.color}); setActive(seg.id); };
  const savedCount  = useMemo(() => segments.map(s => ({...s, liveCount:leads.filter(l=>evaluateLead(l,s.conditions,s.logic)).length})), [segments, leads]);
  const COLORS = [C.blue, C.green, C.orange, C.red, C.purple, "#0A66C2"];

  return (
    <div style={{ display:"grid", gridTemplateColumns:"280px 1fr", gap:20 }}>
      {/* Saved segments */}
      <div>
        <div style={{ fontFamily:C.font, fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Segmentos Salvos</div>
        <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:12 }}>
          {savedCount.map(seg => (
            <div key={seg.id} onClick={() => loadSegment(seg)}
              style={{ background:active===seg.id?C.faint:C.surface, border:`0.5px solid ${active===seg.id?seg.color:C.border}`, borderRadius:10, padding:"12px 14px", cursor:"pointer", transition:"all 0.15s" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:seg.color }} />
                  <span style={{ fontFamily:C.font, fontSize:13, fontWeight:700, color:C.text }}>{seg.name}</span>
                </div>
                <span style={{ fontFamily:C.head, fontSize:14, fontWeight:700, color:seg.color }}>{seg.liveCount}</span>
              </div>
              <div style={{ fontFamily:C.font, fontSize:10, color:C.muted, marginTop:4, display:"flex", gap:4, flexWrap:"wrap", fontWeight:600 }}>
                {seg.conditions.slice(0,2).map((c,i) => (
                  <span key={i} style={{ background:C.border2, padding:"1px 6px", borderRadius:3 }}>{c.field} {OP_LABELS[c.op]} {c.value}</span>
                ))}
                {seg.conditions.length>2 && <span style={{ color:C.muted }}>+{seg.conditions.length-2}</span>}
              </div>
            </div>
          ))}
        </div>
        <Btn onClick={() => { setDraft({name:"",conditions:[],logic:"AND",color:C.blue}); setActive(null); }} variant="ghost" size="sm" icon={Plus} sx={{ width:"100%" }}>Novo Segmento</Btn>
      </div>

      {/* Builder */}
      <div>
        <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:16, flexWrap:"wrap" }}>
          <div style={{ flex:1 }}>
            <Field value={draft.name} onChange={e => setDraft(d=>({...d,name:e.target.value}))} placeholder="Nome do segmento..." />
          </div>
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            <span style={{ fontFamily:C.font, fontSize:11, color:C.muted, fontWeight:700 }}>Lógica:</span>
            {["AND","OR","NOT"].map(l => (
              <button key={l} onClick={() => setDraft(d=>({...d,logic:l}))}
                style={{ padding:"5px 10px", fontFamily:C.font, fontSize:11, fontWeight:700, borderRadius:6, border:`1px solid ${draft.logic===l?C.blue:C.border}`, background:draft.logic===l?`${C.blue}12`:"transparent", color:draft.logic===l?C.blue:C.muted, cursor:"pointer" }}>
                {l}
              </button>
            ))}
          </div>
          <div style={{ display:"flex", gap:5 }}>
            {COLORS.map(col => (
              <div key={col} onClick={() => setDraft(d=>({...d,color:col}))}
                style={{ width:18, height:18, borderRadius:"50%", background:col, cursor:"pointer", border:`2px solid ${draft.color===col?"#fff":"transparent"}`, boxShadow:draft.color===col?`0 0 0 2px ${col}`:"-" }} />
            ))}
          </div>
        </div>

        <div style={{ background:C.surface, border:`0.5px solid ${C.border}`, borderRadius:12, padding:"14px", marginBottom:14 }}>
          {draft.conditions.length===0 && (
            <div style={{ textAlign:"center", padding:"24px 0", color:C.muted, fontFamily:C.font, fontSize:13, fontWeight:600 }}>
              Nenhuma condição ainda. Adicione condições para filtrar leads.
            </div>
          )}
          {draft.conditions.map((cond, i) => {
            const fieldMeta = CONDITION_FIELDS.find(f => f.value===cond.field);
            const ops = fieldMeta?.ops || ["eq"];
            const hasOptions = !!FIELD_VALUES[cond.field];
            const selStyle = { fontFamily:C.font, fontSize:12, fontWeight:600, background:"#fff", border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 10px", color:C.text, outline:"none" };
            return (
              <div key={cond.id} style={{ display:"flex", gap:8, alignItems:"center", padding:"8px 0", borderBottom:i<draft.conditions.length-1?`0.5px solid ${C.border}`:"none" }}>
                {i>0 && <div style={{ fontFamily:C.font, fontSize:11, fontWeight:700, color:C.blue, background:`${C.blue}12`, padding:"3px 7px", borderRadius:4, minWidth:36, textAlign:"center" }}>{draft.logic}</div>}
                {i===0 && <div style={{ width:44 }} />}
                <select value={cond.field} onChange={e => updateCond(cond.id,"field",e.target.value)} style={selStyle}>
                  {CONDITION_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                <select value={cond.op} onChange={e => updateCond(cond.id,"op",e.target.value)} style={{...selStyle, color:C.blue}}>
                  {ops.map(op => <option key={op} value={op}>{OP_LABELS[op]}</option>)}
                </select>
                {hasOptions ? (
                  <select value={cond.value} onChange={e => updateCond(cond.id,"value",e.target.value)} style={{...selStyle, flex:1}}>
                    {(FIELD_VALUES[cond.field]||[]).map(v => <option key={v}>{v}</option>)}
                  </select>
                ) : (
                  <Field value={cond.value} onChange={e => updateCond(cond.id,"value",e.target.value)} placeholder="Valor..." small mono style={{ flex:1 }} />
                )}
                <button onClick={() => removeCond(cond.id)} style={{ background:"transparent", border:"none", cursor:"pointer", display:"flex", alignItems:"center", color:C.red, opacity:0.7 }}>
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
            );
          })}
          <div style={{ marginTop:10 }}>
            <Btn onClick={addCondition} variant="ghost" size="xs" icon={Plus}>Adicionar condição</Btn>
          </div>
        </div>

        {draft.conditions.length>0 && (
          <div style={{ background:C.faint, border:`0.5px solid ${draft.color}44`, borderRadius:12, padding:"14px 16px", marginBottom:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <span style={{ fontFamily:C.font, fontSize:13, color:C.muted, fontWeight:600 }}>Preview em tempo real</span>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontFamily:C.head, fontSize:22, fontWeight:700, color:draft.color }}>{matchCount}</span>
                <span style={{ fontFamily:C.font, fontSize:12, color:C.muted, fontWeight:600 }}>leads correspondem</span>
              </div>
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {matchLeads.map(l => {
                const band = bandOf(l.score, {warm:21,hot:51,sql:80});
                return (
                  <div key={l.id} style={{ display:"flex", alignItems:"center", gap:6, background:C.surface, border:`0.5px solid ${C.border}`, borderRadius:7, padding:"4px 10px" }}>
                    <div style={{ width:6, height:6, borderRadius:"50%", background:band.accent }} />
                    <span style={{ fontFamily:C.font, fontSize:11, color:C.text, fontWeight:600 }}>{l.name.split(" ")[0]}</span>
                    <span style={{ fontFamily:C.head, fontSize:10, fontWeight:700, color:band.accent }}>{l.score}</span>
                  </div>
                );
              })}
              {matchCount>6 && <div style={{ fontFamily:C.font, fontSize:11, color:C.muted, padding:"4px 8px", fontWeight:600 }}>+{matchCount-6} mais</div>}
            </div>
          </div>
        )}

        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          {active && <Btn onClick={() => { setSegments(p=>p.filter(s=>s.id!==active)); setActive(null); setDraft({name:"",conditions:[],logic:"AND",color:C.blue}); }} variant="danger" size="sm">Excluir</Btn>}
          <Btn onClick={saveSegment} variant="success" size="sm" icon={saved?CheckCircle2:Save} disabled={!draft.name||!draft.conditions.length}>
            {saved?"Salvo!":active?"Atualizar Segmento":"Salvar Segmento"}
          </Btn>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   TAB 3 — DASHBOARD
════════════════════════════════════════════════════════════════════════ */
const ScoringDashboard = ({ leads, thresholds, history }) => {
  const bands = useMemo(() => {
    const counts = {cold:0,warm:0,hot:0,sql:0};
    leads.forEach(l => counts[scoreBand(l.score,thresholds)]++);
    return counts;
  }, [leads, thresholds]);

  const topLeads  = useMemo(() => [...leads].sort((a,b)=>b.score-a.score).slice(0,10), [leads]);
  const movements = useMemo(() => leads.map(l=>({...l,delta:l.score-l.prevScore})).filter(l=>l.delta!==0).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)), [leads]);

  const donutSlices = [
    { label:"Cold", value:bands.cold, color:bandColors.cold.accent },
    { label:"Warm", value:bands.warm, color:bandColors.warm.accent },
    { label:"Hot",  value:bands.hot,  color:bandColors.hot.accent  },
    { label:"SQL",  value:bands.sql,  color:bandColors.sql.accent  },
  ].filter(s => s.value > 0);

  const alerts = [
    { msg:`${bands.sql} leads atingiram threshold SQL`,                              color:bandColors.sql.accent,  Icon:Star          },
    { msg:`${bands.hot} leads na faixa Hot — prontos para abordagem`,                color:bandColors.hot.accent,  Icon:Flame         },
    { msg:`${movements.filter(m=>m.delta<0).length} leads perderam pontos esta semana`, color:C.orange,            Icon:AlertCircle   },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {/* Alert strip */}
      <div style={{ display:"flex", gap:10 }}>
        {alerts.map((a,i) => (
          <div key={i} style={{ flex:1, background:C.surface, border:`0.5px solid ${a.color}40`, borderLeft:`3px solid ${a.color}`, borderRadius:10, padding:"12px 14px", display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:30, height:30, borderRadius:8, background:`${a.color}14`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <a.Icon size={14} color={a.color} aria-hidden="true" />
            </div>
            <span style={{ fontFamily:C.font, fontSize:12, color:a.color, fontWeight:700 }}>{a.msg}</span>
          </div>
        ))}
      </div>

      {/* Stats row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
        <StatCard label="Total de Leads"  value={leads.length}                                                                  icon={Users}      color={C.blue}   />
        <StatCard label="Média de Score"  value={leads.length ? Math.round(leads.reduce((a,l)=>a+l.score,0)/leads.length) : 0} icon={BarChart2}  color={C.teal}   />
        <StatCard label="Leads SQL"        value={bands.sql}                                                                    icon={Star}       color={C.purple} />
        <StatCard label="Mudanças hoje"    value={history.filter(h=>new Date(h.timestamp)>new Date(Date.now()-864e5)).length}   icon={Activity}   color={C.orange} />
      </div>

      {/* Main content */}
      <div style={{ display:"grid", gridTemplateColumns:"240px 1fr 280px", gap:16 }}>
        {/* Donut */}
        <div style={{ background:C.surface, border:`0.5px solid ${C.border}`, borderRadius:12, padding:"20px", display:"flex", flexDirection:"column", alignItems:"center" }}>
          <SectionHeading>Distribuição por Faixa</SectionHeading>
          <DonutChart slices={donutSlices.length ? donutSlices : [{ label:"—", value:1, color:C.border }]} size={140} />
          <div style={{ width:"100%", marginTop:16, display:"flex", flexDirection:"column", gap:6 }}>
            {donutSlices.map(s => (
              <div key={s.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:s.color }} />
                  <span style={{ fontFamily:C.font, fontSize:12, color:C.text, fontWeight:600 }}>{s.label}</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ fontFamily:C.head, fontSize:12, fontWeight:700, color:s.color }}>{s.value}</span>
                  <span style={{ fontFamily:C.font, fontSize:10, color:C.muted, fontWeight:600 }}>{leads.length ? Math.round(s.value/leads.length*100) : 0}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top 10 */}
        <div style={{ background:C.surface, border:`0.5px solid ${C.border}`, borderRadius:12, padding:"20px" }}>
          <SectionHeading>Top 10 Leads — Esta Semana</SectionHeading>
          <div>
            {topLeads.map((l,i) => {
              const band = bandOf(l.score, thresholds);
              const sparkData = Array.from({length:7},(_,j)=>Math.max(0, l.score-(6-j)*3+Math.floor(Math.random()*6-3)));
              return (
                <div key={l.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0", borderBottom:`0.5px solid ${C.border}` }}>
                  <span style={{ fontFamily:C.mono, fontSize:11, color:C.muted, width:18, textAlign:"right", fontWeight:600 }}>#{i+1}</span>
                  <div style={{ width:28, height:28, borderRadius:"50%", background:`${band.accent}18`, border:`1px solid ${band.accent}50`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                    <span style={{ fontFamily:C.font, fontSize:9, fontWeight:700, color:band.accent }}>{l.name.split(" ").map(w=>w[0]).join("").slice(0,2)}</span>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontFamily:C.font, fontSize:12, fontWeight:700, color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{l.name}</div>
                    <div style={{ fontFamily:C.font, fontSize:10, color:C.muted, fontWeight:600 }}>{l.company}</div>
                  </div>
                  <Spark data={sparkData} color={band.accent} />
                  <div style={{ fontFamily:C.head, fontSize:16, fontWeight:700, color:band.accent, minWidth:34, textAlign:"right" }}>{l.score}</div>
                  <BandPill band={scoreBand(l.score, thresholds)} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Movements */}
        <div style={{ background:C.surface, border:`0.5px solid ${C.border}`, borderRadius:12, padding:"20px" }}>
          <SectionHeading>Maiores Mudanças</SectionHeading>
          {movements.slice(0,8).map(l => {
            const up = l.delta > 0;
            const MvIcon = up ? TrendingUp : TrendingDown;
            return (
              <div key={l.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 0", borderBottom:`0.5px solid ${C.border}` }}>
                <MvIcon size={14} color={up?C.green:C.red} aria-hidden="true" />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontFamily:C.font, fontSize:12, color:C.text, fontWeight:700, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{l.name.split(" ")[0]}</div>
                  <div style={{ display:"flex", gap:4, alignItems:"center" }}>
                    <span style={{ fontFamily:C.mono, fontSize:10, color:C.muted, fontWeight:600 }}>{l.prevScore}</span>
                    <span style={{ fontFamily:C.font, fontSize:10, color:C.muted }}>→</span>
                    <span style={{ fontFamily:C.mono, fontSize:10, color:up?C.green:C.red, fontWeight:700 }}>{l.score}</span>
                  </div>
                </div>
                <span style={{ fontFamily:C.head, fontSize:13, fontWeight:700, color:up?C.green:C.red }}>
                  {up?"+":""}{l.delta}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   TAB 4 — AUTOMATION + LOG
════════════════════════════════════════════════════════════════════════ */
const AutomationLog = ({ leads, history, thresholds }) => {
  const [webhookUrl,    setWebhookUrl]    = useState("https://hooks.zapier.com/hooks/catch/xxxxx/");
  const [webhookActive, setWebhookActive] = useState(true);
  const [triggers,      setTriggers]      = useState([
    { id:"t1", event:"band_change_sql", label:"Lead entra na faixa SQL",    actions:["send_webhook","notify_slack","assign_sdR"], active:true,  color:bandColors.sql.accent  },
    { id:"t2", event:"band_change_hot", label:"Lead entra na faixa Hot",    actions:["send_webhook","start_sequence"],            active:true,  color:bandColors.hot.accent  },
    { id:"t3", event:"score_drop_20",   label:"Score cai mais de 20 pts",   actions:["send_webhook","flag_review"],               active:false, color:C.red                  },
    { id:"t4", event:"inactivity_30",   label:"Inativo por 30+ dias",       actions:["start_reactivation","send_webhook"],        active:true,  color:bandColors.warm.accent },
  ]);
  const [filter,   setFilter]   = useState("all");
  const [logPage,  setLogPage]  = useState(1);
  const LOG_PAGE = 12;

  const ACTION_LABELS = {
    send_webhook:       "Webhook",
    notify_slack:       "Slack",
    assign_sdR:         "Atribuir SDR",
    start_sequence:     "Sequência",
    start_reactivation: "Reativação",
    flag_review:        "Revisar",
  };

  const filteredLog = useMemo(() => {
    if (filter==="up")      return history.filter(h=>h.new_score>h.old_score);
    if (filter==="down")    return history.filter(h=>h.new_score<h.old_score);
    if (filter==="webhook") return history.filter(h=>h.webhook_sent);
    return history;
  }, [history, filter]);

  const pageLog        = filteredLog.slice((logPage-1)*LOG_PAGE, logPage*LOG_PAGE);
  const totalLogPages  = Math.ceil(filteredLog.length / LOG_PAGE);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
        {/* Triggers */}
        <div style={{ background:C.surface, border:`0.5px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
          <div style={{ padding:"14px 18px", borderBottom:`0.5px solid ${C.border}` }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <Zap size={15} color={C.blue} aria-hidden="true" />
              <div style={{ fontFamily:C.head, fontSize:14, fontWeight:700, color:C.text }}>Triggers Automáticos</div>
            </div>
            <div style={{ fontFamily:C.font, fontSize:11, color:C.muted, marginTop:2, fontWeight:600 }}>Ações executadas quando leads mudam de faixa</div>
          </div>
          <div style={{ padding:"10px 8px" }}>
            {triggers.map(t => (
              /* Cards de trigger com borderLeft accent por cor de banda */
              <div key={t.id} style={{ padding:"12px 12px", margin:"4px 4px", background:t.active?`${t.color}08`:C.faint, border:`0.5px solid ${t.active?t.color+"33":C.border}`, borderLeft:`3px solid ${t.active?t.color:C.border}`, borderRadius:9 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:7, height:7, borderRadius:"50%", background:t.active?t.color:C.border }} />
                    <span style={{ fontFamily:C.font, fontSize:13, fontWeight:700, color:t.active?C.text:C.muted }}>{t.label}</span>
                  </div>
                  <Toggle checked={t.active} onChange={v => setTriggers(p=>p.map(x=>x.id===t.id?{...x,active:v}:x))} />
                </div>
                <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                  {t.actions.map(a => (
                    <span key={a} style={{ fontFamily:C.font, fontSize:10, fontWeight:700, background:t.active?`${t.color}14`:C.border2, color:t.active?t.color:C.muted, padding:"2px 7px", borderRadius:4 }}>
                      {ACTION_LABELS[a] || a}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Webhook config */}
        <div style={{ background:C.surface, border:`0.5px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
          <div style={{ padding:"14px 18px", borderBottom:`0.5px solid ${C.border}` }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <Radio size={15} color={C.blue} aria-hidden="true" />
              <div style={{ fontFamily:C.head, fontSize:14, fontWeight:700, color:C.text }}>Webhook Config</div>
            </div>
            <div style={{ fontFamily:C.font, fontSize:11, color:C.muted, marginTop:2, fontWeight:600 }}>Endpoint para receber notificações de scoring</div>
          </div>
          <div style={{ padding:"18px" }}>
            <div style={{ marginBottom:14 }}>
              <div style={{ fontFamily:C.font, fontSize:11, color:C.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>URL do Endpoint</div>
              <Field value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} mono />
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, padding:"10px 14px", background:C.faint, borderRadius:8 }}>
              <span style={{ fontFamily:C.font, fontSize:13, color:C.text, fontWeight:600 }}>Webhook ativo</span>
              <Toggle checked={webhookActive} onChange={setWebhookActive} />
            </div>
            <div style={{ fontFamily:C.font, fontSize:11, color:C.muted, marginBottom:8, fontWeight:600 }}>Payload enviado (exemplo):</div>
            <pre style={{ fontFamily:C.mono, fontSize:10, color:"#7dd3fc", background:"#0f172a", borderRadius:8, padding:"12px 14px", margin:0, overflow:"auto", lineHeight:1.7 }}>{`{
  "event": "band_change",
  "lead_id": "l14",
  "lead_name": "Carlos Mendes",
  "old_score": 48,
  "new_score": 61,
  "old_band": "warm",
  "new_band": "hot",
  "timestamp": "${new Date().toISOString()}"
}`}</pre>
            <div style={{ marginTop:12, display:"flex", gap:8 }}>
              <Btn variant="teal" size="sm" icon={Radio}>Testar Webhook</Btn>
              <Btn variant="ghost" size="sm">Ver Histórico</Btn>
            </div>
          </div>
        </div>
      </div>

      {/* Score change log */}
      <div style={{ background:C.surface, border:`0.5px solid ${C.border}`, borderRadius:12, overflow:"hidden" }}>
        <div style={{ padding:"14px 18px", borderBottom:`0.5px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <ClipboardList size={14} color={C.blue} aria-hidden="true" />
              <div style={{ fontFamily:C.head, fontSize:14, fontWeight:700, color:C.text }}>Log de Mudanças de Score</div>
            </div>
            <div style={{ fontFamily:C.font, fontSize:11, color:C.muted, marginTop:2, fontWeight:600 }}>{history.length} eventos registrados</div>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            {[["all","Todos"],["up","Subida"],["down","Queda"],["webhook","Webhook"]].map(([val,label]) => (
              <button key={val} onClick={() => { setFilter(val); setLogPage(1); }}
                style={{ padding:"5px 11px", fontFamily:C.font, fontSize:11, fontWeight:filter===val?700:600, borderRadius:6, border:`0.5px solid ${filter===val?C.blue:C.border}`, background:filter===val?`${C.blue}12`:"transparent", color:filter===val?C.blue:C.muted, cursor:"pointer" }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:700 }}>
            <thead>
              <tr style={{ borderBottom:`0.5px solid ${C.border}`, background:C.faint }}>
                {["Timestamp","Lead","Score Anterior","Novo Score","Delta","Motivo","Webhook"].map(h => (
                  <th key={h} style={{ padding:"8px 14px", textAlign:"left", fontFamily:C.font, fontSize:10, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:"0.06em", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageLog.map(h => {
                const delta = h.new_score - h.old_score;
                const up = delta > 0;
                const band = bandOf(h.new_score, {warm:21,hot:51,sql:80});
                return (
                  <tr key={h.id} style={{ borderBottom:`0.5px solid ${C.border}` }}
                    onMouseEnter={e => e.currentTarget.style.background=C.faint}
                    onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                    <td style={{ padding:"9px 14px", fontFamily:C.mono, fontSize:11, color:C.muted, whiteSpace:"nowrap", fontWeight:600 }}>
                      {new Date(h.timestamp).toLocaleString("pt-BR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}
                    </td>
                    <td style={{ padding:"9px 14px", fontFamily:C.font, fontSize:12, fontWeight:700, color:C.text }}>{h.lead_name}</td>
                    <td style={{ padding:"9px 14px", fontFamily:C.mono, fontSize:12, color:C.muted, fontWeight:600 }}>{h.old_score}</td>
                    <td style={{ padding:"9px 14px", fontFamily:C.head, fontSize:12, fontWeight:700, color:band.accent }}>{h.new_score}</td>
                    <td style={{ padding:"9px 14px", fontFamily:C.head, fontSize:12, fontWeight:700, color:up?C.green:C.red }}>
                      {up?"+":""}{delta}
                    </td>
                    <td style={{ padding:"9px 14px", fontFamily:C.font, fontSize:11, color:C.muted, fontWeight:600 }}>{h.reason}</td>
                    <td style={{ padding:"9px 14px" }}>
                      <span style={{ fontFamily:C.font, fontSize:10, fontWeight:700, color:h.webhook_sent?C.green:C.muted, background:h.webhook_sent?`${C.green}14`:"transparent", padding:"2px 7px", borderRadius:4 }}>
                        {h.webhook_sent ? "Enviado" : "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 16px", borderTop:`0.5px solid ${C.border}`, background:C.faint }}>
          <span style={{ fontFamily:C.font, fontSize:11, color:C.muted, fontWeight:600 }}>
            {(logPage-1)*LOG_PAGE+1}–{Math.min(logPage*LOG_PAGE,filteredLog.length)} de {filteredLog.length}
          </span>
          <div style={{ display:"flex", gap:4 }}>
            <Btn onClick={() => setLogPage(p=>Math.max(1,p-1))}          disabled={logPage===1}           variant="ghost" size="xs">Anterior</Btn>
            <Btn onClick={() => setLogPage(p=>Math.min(totalLogPages,p+1))} disabled={logPage===totalLogPages} variant="ghost" size="xs">Próximo</Btn>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   ROOT
════════════════════════════════════════════════════════════════════════ */
const TABS = [
  { id:"dashboard",  label:"Dashboard",      icon:BarChart2 },
  { id:"rules",      label:"Regras de Score", icon:Scale     },
  { id:"segments",   label:"Segmentação",     icon:Filter    },
  { id:"automation", label:"Automação & Log", icon:Zap       },
];

export default function VantariScoringSystem() {
  const [leads, setLeads]               = useState([]);
  const [history, setHistory]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [rules, setRules]               = useState(DEFAULT_RULES);
  const [thresholds, setThresholds]     = useState({warm:21, hot:51, sql:80});
  const [tab, setTab]                   = useState("dashboard");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: leadsData, error: leadsErr }, { data: eventsData, error: eventsErr }] = await Promise.all([
        supabase
          .from("leads")
          .select("id, name, email, company, score, tags, source, updated_at")
          .order("score", { ascending: false }),
        supabase
          .from("lead_events")
          .select("id, lead_id, event_type, score_delta, created_at, leads(name, score)")
          .order("created_at", { ascending: false })
          .limit(200),
      ]);
      if (leadsErr) throw leadsErr;
      if (eventsErr) throw eventsErr;

      setLeads((leadsData || []).map(l => ({
        id:           l.id,
        name:         l.name || l.email?.split("@")[0] || "—",
        email:        l.email,
        company:      l.company || "—",
        score:        l.score ?? 0,
        prevScore:    Math.max(0, (l.score ?? 0) - 5),
        source:       l.source || "—",
        tags:         Array.isArray(l.tags) ? l.tags : [],
        lastActive:   l.updated_at,
        interactions: 0,
      })));

      setHistory((eventsData || []).map(ev => {
        const delta    = ev.score_delta ?? 0;
        const newScore = ev.leads?.score ?? 0;
        const oldScore = Math.max(0, newScore - delta);
        return {
          id:           ev.id,
          lead_id:      ev.lead_id,
          lead_name:    ev.leads?.name || "—",
          old_score:    oldScore,
          new_score:    newScore,
          reason:       ev.event_type || "—",
          timestamp:    ev.created_at,
          webhook_sent: false,
        };
      }));
    } catch (err) {
      setError(err.message || "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div style={{ display:"flex", height:"100vh", background:C.bg, fontFamily:C.font, overflow:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700&family=Nunito+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing:border-box; }
        input[type=range] { -webkit-appearance:none; height:4px; border-radius:99px; cursor:pointer; background:${C.border}; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:14px; height:14px; border-radius:50%; cursor:pointer; border:2px solid #fff; box-shadow:0 1px 3px rgba(0,0,0,0.15); }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:${C.border}; border-radius:3px; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>

      {/* ── SIDEBAR — iconrs.png embutido (scoring ≠ dashboard principal) */}
      <div style={{ width:220, background:"#0079a9", display:"flex", flexDirection:"column", flexShrink:0 }}>
        <div style={{ padding:"16px 20px 14px", borderBottom:"1px solid rgba(255,255,255,0.12)", display:"flex", alignItems:"center" }}>
          <img src="iconrs.png" alt="Vantari" style={{ height:28, width:"auto" }} />
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"8px 0" }}>
          <NavSection label="Principal" />
          <NavItem icon={BarChart2}      label="Analytics" path="/dashboard"       />
          <NavItem icon={Users}          label="Leads" path="/leads"           />
          <NavItem icon={Mail}           label="Email Marketing" path="/email" />
          <NavSection label="Ferramentas" />
          <NavItem icon={Star}           label="Scoring" path="/scoring"   active />
          <NavItem icon={LayoutTemplate} label="Landing Pages" path="/landing"   />
          <NavItem icon={Bot}            label="IA & Automação" path="/ai-marketing"  />
          <NavItem icon={Zap}            label="Workflows" path="/workflow" />
          <NavSection label="Sistema" />
          <NavItem icon={Plug}           label="Integrações" path="/integrations"     />
        </div>

        <div style={{ borderTop:"1px solid rgba(255,255,255,0.12)", padding:"8px 0" }}>
          <NavItem icon={Settings} label="Configurações" path="/settings" />
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

        {/* Topbar com threshold badges WARM/HOT/SQL */}
        <div style={{ height:52, background:C.surface, borderBottom:`0.5px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 24px", flexShrink:0 }}>
          <span style={{ fontSize:15, fontWeight:700, color:C.text, fontFamily:C.head, letterSpacing:"-0.01em" }}>
            {TABS.find(t=>t.id===tab)?.label || "Scoring"}
          </span>
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            {[
              { k:"warm", color:bandColors.warm.accent, bg:bandColors.warm.bg, border:bandColors.warm.border },
              { k:"hot",  color:bandColors.hot.accent,  bg:bandColors.hot.bg,  border:bandColors.hot.border  },
              { k:"sql",  color:bandColors.sql.accent,  bg:bandColors.sql.bg,  border:bandColors.sql.border  },
            ].map(({k,color,bg,border}) => (
              <div key={k} style={{ fontFamily:C.font, fontSize:11, fontWeight:700, color, background:bg, border:`0.5px solid ${border}`, padding:"4px 9px", borderRadius:6 }}>
                {k.toUpperCase()} ≥{thresholds[k]}
              </div>
            ))}
          </div>
        </div>

        {/* Sub-tabs */}
        <div style={{ background:C.surface, borderBottom:`0.5px solid ${C.border}`, padding:"0 24px", display:"flex", gap:2, flexShrink:0 }}>
          {TABS.map(t => {
            const TIcon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"10px 14px", background:"none", border:"none", borderBottom:active?`2px solid ${C.blue}`:"2px solid transparent", cursor:"pointer", fontSize:12, fontWeight:active?700:600, color:active?C.blue:C.muted, fontFamily:C.font, transition:"all 0.15s" }}>
                <TIcon size={14} aria-hidden="true" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ flex:1, overflowY:"auto", padding:"24px 28px" }}>
          {loading ? (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:300, gap:10, color:C.muted }}>
              <Loader2 size={22} style={{ animation:"spin 1s linear infinite" }} aria-hidden="true" />
              <span style={{ fontFamily:C.font, fontSize:14, fontWeight:600 }}>Carregando dados...</span>
            </div>
          ) : error ? (
            <div style={{ display:"flex", alignItems:"center", gap:10, background:"#fef2f2", border:"1px solid #fecaca", borderRadius:10, padding:"14px 18px", color:C.red }}>
              <AlertCircle size={18} aria-hidden="true" />
              <span style={{ fontFamily:C.font, fontSize:13, fontWeight:600 }}>{error}</span>
            </div>
          ) : (
            <>
              {tab==="dashboard"  && <ScoringDashboard leads={leads} thresholds={thresholds} history={history} />}
              {tab==="rules"      && <ScoringRules rules={rules} setRules={setRules} thresholds={thresholds} setThresholds={setThresholds} leads={leads} />}
              {tab==="segments"   && <SegmentBuilder leads={leads} thresholds={thresholds} />}
              {tab==="automation" && <AutomationLog leads={leads} history={history} thresholds={thresholds} />}
            </>
          )}
        </div>

        {/* DB schema footer */}
        <div style={{ borderTop:`0.5px solid ${C.border}`, padding:"10px 24px", display:"flex", gap:8, alignItems:"center", background:C.surface, flexShrink:0 }}>
          <span style={{ fontFamily:C.font, fontSize:10, color:C.muted, fontWeight:700 }}>Supabase tables:</span>
          {["scoring_rules","segments","lead_score_history"].map(t => (
            <span key={t} style={{ fontFamily:C.mono, fontSize:10, background:C.border2, color:C.blue, padding:"2px 8px", borderRadius:4, border:`0.5px solid ${C.border}` }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
