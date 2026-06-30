import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart2, Scale, Layers, Target, Settings, Users, Mail,
  LayoutTemplate, Bot, Plug, Star, X, Plus, CheckCircle2, AlertCircle,
  Activity, Loader2, Briefcase, RefreshCw, Trash2, Award, Zap,
} from "lucide-react";
import { supabase } from "./supabase";

/* ═══════════════════════════════════════════════════════════════════════
   LEAD SCORING — VANTARI CRÉDITO · ETAPA 1 (Scoring Inicial 0-50)
   ─────────────────────────────────────────────────────────────────────
   Modelo de score cumulativo ponderado (substitui a matriz 2D do RD).
   Lê do core/mkt:
     core.persons            → leads
     mkt.lead_scores         → score_inicial + segment_inicial
     mkt.score_rules         → regras (field_key, match_value → points)
     mkt.score_bands         → segmentos (Prioritário/Interessado/Educativo/Descartado)
     core.person_attributes  → atributos que alimentam o score
   Recalcula via mkt.recompute_all_scores_inicial(workspace).
   Backend: supabase/proposals/0007_scoring_vantari_etapa1.sql
════════════════════════════════════════════════════════════════════════ */

const WORKSPACE_VANTARI = "53092199-7b75-4342-a897-f589d6f34922";
const STAGE1_MAX = 50;

/* ───── DESIGN TOKENS ───── */
const T = {
  teal:    "#0D7491",
  green:   "#14A273",
  brand2:  "#1F76BC",
  deep:    "#0A3D4D",
  gradient: "linear-gradient(135deg, #0D7491 0%, #14A273 100%)",
  sidebarBg: "linear-gradient(180deg, #0D7491 0%, #0A5165 60%, #0A3D4D 100%)",
  violet:  "#7C5CFF",
  amber:   "#F59E0B",
  coral:   "#FF6B5E",
  cyan:    "#06B6D4",
  rose:    "#EC4899",
  bg:      "#F5F8FB",
  surface: "#FFFFFF",
  border:  "#E8EEF3",
  ink:     "#0E1A24",
  text:    "#2E3D4B",
  muted:   "#5A6B7A",
  faint3:  "#8696A5",
  faint:   "#F5F8FB",
  font:    "'Inter', system-ui, sans-serif",
  head:    "'Sora', system-ui, sans-serif",
  mono:    "'JetBrains Mono', monospace",
};

/* ───── Segmentos da Etapa 1 ───── */
const SEGMENT_META = {
  "Prioritário": { color: T.green,  bg: "#F0FDF7", border: "#6EE7B7", sort: 3 },
  "Interessado": { color: T.teal,   bg: "#E8F5FB", border: "#B3D9EA", sort: 2 },
  "Educativo":   { color: T.amber,  bg: "#FFF4E6", border: "#F5C78A", sort: 1 },
  "Descartado":  { color: T.muted,  bg: "#F1F4F8", border: "#D1DAE3", sort: 0 },
};
const SEM_SCORE = { color: T.faint3, bg: "#F1F4F8", border: "#D1DAE3" };
const segMeta = (label) => SEGMENT_META[label] || SEM_SCORE;

/* ───── Categorias das regras ───── */
const CATEGORY_META = {
  demografico:  { label: "Perfil Demográfico", Icon: Users,    color: T.teal   },
  comportamento:{ label: "Comportamento Digital", Icon: Activity, color: T.violet },
  urgencia:     { label: "Urgência e Necessidade", Icon: Zap,    color: T.amber  },
  qualidade:    { label: "Indicadores de Qualidade", Icon: Award, color: T.green },
};
const CATEGORY_ORDER = ["demografico", "comportamento", "urgencia", "qualidade"];

/* ═══════════════════════════════════════════════════════════════════════
   SHARED UI
════════════════════════════════════════════════════════════════════════ */
const cardShadow = "0 1px 0 rgba(14,26,36,.03), 0 8px 24px -16px rgba(14,26,36,.08)";

const Btn = ({ children, onClick, variant = "primary", size = "sm", icon: Icon, disabled, style: sx = {} }) => {
  const [hov, setHov] = useState(false);
  const vs = {
    primary: {
      bg: hov ? "linear-gradient(135deg, #0A5F7A 0%, #108A60 100%)" : "linear-gradient(135deg, #0D7491 0%, #14A273 100%)",
      color: "#fff", border: "none",
      shadow: hov ? "0 8px 22px -6px rgba(13,116,145,.5)" : "0 4px 14px -4px rgba(13,116,145,.4)",
    },
    ghost:   { bg: hov ? "#EEF2F6" : "transparent", color: T.text, border: `0.5px solid ${T.border}`, shadow: "none" },
    danger:  { bg: hov ? "#e04d42" : T.coral, color: "#fff", border: "none", shadow: "none" },
    success: { bg: hov ? "#108A60" : T.green, color: "#fff", border: "none", shadow: "none" },
  }[variant] || {};
  const pad = { xs: "4px 9px", sm: "7px 14px", md: "9px 18px" }[size] || "7px 14px";
  const fs  = { xs: 10, sm: 12, md: 13 }[size] || 12;
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: pad, fontSize: fs, fontFamily: T.font, fontWeight: 700, borderRadius: 10, border: vs.border || "none", background: vs.bg, color: vs.color, boxShadow: vs.shadow, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .5 : 1, transition: "all 0.15s", whiteSpace: "nowrap", transform: hov && variant === "primary" ? "translateY(-1px)" : "none", ...sx }}>
      {Icon && <Icon size={fs} aria-hidden="true" />}
      {children}
    </button>
  );
};

const Toggle = ({ checked, onChange }) => (
  <div onClick={() => onChange(!checked)} style={{ width: 36, height: 20, borderRadius: 99, background: checked ? T.green : T.border, cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
    <div style={{ position: "absolute", top: 3, left: checked ? 19 : 3, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
  </div>
);

const NumInput = ({ value, onChange, onCommit, width = 70 }) => (
  <input type="number" value={value}
    onChange={e => onChange(Number(e.target.value))}
    onBlur={onCommit}
    style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 700, padding: "5px 9px", background: T.faint, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, outline: "none", width, boxSizing: "border-box", textAlign: "center" }} />
);

const ScoreBar = ({ value, max = STAGE1_MAX, color = T.teal, height = 6 }) => (
  <div style={{ width: "100%", height, background: "#EEF2F6", borderRadius: 99, overflow: "hidden", border: `0.5px solid ${T.border}` }}>
    <div style={{ height: "100%", width: `${Math.min(100, (value / max) * 100)}%`, background: color, borderRadius: 99, transition: "width 0.6s ease" }} />
  </div>
);

const SegPill = ({ segment }) => {
  const m = segMeta(segment);
  return (
    <span style={{ fontSize: 10, fontWeight: 700, background: m.bg, color: m.color, border: `0.5px solid ${m.border}`, padding: "2px 8px", borderRadius: 5, fontFamily: T.font, letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
      {segment || "Sem score"}
    </span>
  );
};

const StatCard = ({ label, value, sub, color = T.teal, icon: Icon }) => (
  <div style={{ background: T.surface, border: `0.5px solid ${T.border}`, borderLeft: `3px solid ${color}`, borderRadius: 12, padding: "16px 18px", boxShadow: cardShadow }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <div style={{ fontFamily: T.font, fontSize: 11, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{label}</div>
        <div style={{ fontFamily: T.head, fontSize: 28, fontWeight: 700, color, lineHeight: 1, letterSpacing: "-0.035em", fontVariantNumeric: "tabular-nums" }}>{value}</div>
        {sub && <div style={{ fontFamily: T.font, fontSize: 11, color: T.muted, marginTop: 5, fontWeight: 600 }}>{sub}</div>}
      </div>
      {Icon && <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}14`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={18} color={color} aria-hidden="true" />
      </div>}
    </div>
  </div>
);

const DonutChart = ({ slices, size = 150 }) => {
  const r = size * 0.38, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = slices.reduce((a, s) => a + s.value, 0) || 1;
  let offset = 0;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      {slices.map((s, i) => {
        const pct = s.value / total;
        const dash = pct * circ;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color}
            strokeWidth={size * 0.11} strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset * circ} style={{ transition: "all 0.5s ease" }} />
        );
        offset += pct;
        return el;
      })}
      <circle cx={cx} cy={cy} r={r * 0.58} fill="#ffffff" />
    </svg>
  );
};

const SectionHeading = ({ children, sub }) => (
  <div style={{ marginBottom: 16 }}>
    <h2 style={{ fontSize: 14, fontWeight: 700, color: T.ink, fontFamily: T.head, margin: 0, letterSpacing: "-0.01em" }}>{children}</h2>
    {sub && <p style={{ fontSize: 11, color: T.muted, margin: "3px 0 0", fontFamily: T.font, fontWeight: 600 }}>{sub}</p>}
  </div>
);

const NavSection = ({ label }) => (
  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.18em", color: "rgba(255,255,255,0.4)", padding: "10px 20px 4px", textTransform: "uppercase", fontFamily: T.head }}>{label}</div>
);

const NavItem = ({ icon: Icon, label, active = false, path }) => {
  const [hov, setHov] = useState(false);
  const navigate = useNavigate();
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={() => path && navigate(path)}
      style={{ position: "relative", display: "flex", alignItems: "center", gap: 9, padding: "8px 20px", fontSize: 13.5, fontWeight: active ? 700 : 600, fontFamily: T.font, color: active ? "#fff" : hov ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.6)", background: active ? "rgba(255,255,255,0.10)" : hov ? "rgba(255,255,255,0.06)" : "transparent", cursor: "pointer", transition: "all 0.15s", userSelect: "none" }}>
      {active && <span style={{ position: "absolute", left: 0, top: 6, bottom: 6, width: 3, background: "linear-gradient(180deg, #14A273 0%, #5EEAD4 100%)", borderRadius: "0 3px 3px 0" }} />}
      {Icon && <Icon size={16} aria-hidden="true" />}
      {label}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   TAB — VISÃO GERAL
════════════════════════════════════════════════════════════════════════ */
const OverviewTab = ({ leads }) => {
  const stats = useMemo(() => {
    const scored = leads.filter(l => l.segment);
    const avg = scored.length ? Math.round(scored.reduce((a, l) => a + l.score, 0) / scored.length) : 0;
    const bySeg = { "Prioritário": 0, "Interessado": 0, "Educativo": 0, "Descartado": 0, "Sem score": 0 };
    leads.forEach(l => { bySeg[l.segment || "Sem score"]++; });
    return { avg, bySeg, scored: scored.length };
  }, [leads]);

  const slices = ["Prioritário", "Interessado", "Educativo", "Descartado", "Sem score"]
    .map(s => ({ label: s, value: stats.bySeg[s], color: segMeta(s).color }))
    .filter(s => s.value > 0);

  const topLeads = useMemo(() => [...leads].sort((a, b) => b.score - a.score).slice(0, 12), [leads]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
        <StatCard icon={Users}   color={T.teal}   label="Total de leads"  value={leads.length.toLocaleString("pt-BR")} sub={`${stats.scored} com score`} />
        <StatCard icon={BarChart2} color={T.brand2} label="Score médio"    value={`${stats.avg}`} sub={`de ${STAGE1_MAX} pts (Etapa 1)`} />
        <StatCard icon={Star}    color={T.green}  label="Prioritários"    value={stats.bySeg["Prioritário"].toLocaleString("pt-BR")} sub="≥ 35 pts · atender em 4h" />
        <StatCard icon={Target}  color={T.violet} label="Interessados+"   value={(stats.bySeg["Prioritário"] + stats.bySeg["Interessado"]).toLocaleString("pt-BR")} sub="prontos p/ documentação" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16 }}>
        {/* Distribuição por segmento */}
        <div style={{ background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 12, padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", boxShadow: cardShadow }}>
          <SectionHeading sub="Etapa 1 · 0-50 pts">Distribuição por segmento</SectionHeading>
          <DonutChart slices={slices.length ? slices : [{ label: "—", value: 1, color: T.border }]} size={140} />
          <div style={{ width: "100%", marginTop: 16, display: "flex", flexDirection: "column", gap: 7 }}>
            {["Prioritário", "Interessado", "Educativo", "Descartado", "Sem score"].map(s => (
              <div key={s} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: segMeta(s).color }} />
                  <span style={{ fontFamily: T.font, fontSize: 12, color: T.text, fontWeight: 600 }}>{s}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontFamily: T.head, fontSize: 12, fontWeight: 700, color: segMeta(s).color, fontVariantNumeric: "tabular-nums" }}>{stats.bySeg[s]}</span>
                  <span style={{ fontFamily: T.font, fontSize: 10, color: T.muted, fontWeight: 600 }}>{leads.length ? Math.round(stats.bySeg[s] / leads.length * 100) : 0}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lista de leads */}
        <div style={{ background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 12, padding: "20px", boxShadow: cardShadow }}>
          <SectionHeading sub="ordenados por score inicial">Leads por score</SectionHeading>
          {topLeads.length === 0 && (
            <div style={{ textAlign: "center", padding: "30px 0", color: T.muted, fontFamily: T.font, fontSize: 13, fontWeight: 600 }}>
              Nenhum lead ainda. Os scores aparecem quando leads entram com atributos da Etapa 1.
            </div>
          )}
          {topLeads.map((l, i) => (
            <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `0.5px solid ${T.border}` }}>
              <span style={{ fontFamily: T.mono, fontSize: 11, color: T.muted, width: 20, textAlign: "right", fontWeight: 600 }}>#{i + 1}</span>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${segMeta(l.segment).color}18`, border: `1px solid ${segMeta(l.segment).color}50`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontFamily: T.font, fontSize: 9, fontWeight: 700, color: segMeta(l.segment).color }}>{l.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: T.font, fontSize: 12, fontWeight: 700, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.name}</div>
                <div style={{ fontFamily: T.font, fontSize: 10.5, color: T.muted, fontWeight: 600 }}>{l.email || "sem email"}</div>
              </div>
              <div style={{ width: 120 }}><ScoreBar value={l.score} color={segMeta(l.segment).color} height={5} /></div>
              <span style={{ fontFamily: T.head, fontSize: 13, fontWeight: 700, color: segMeta(l.segment).color, width: 42, textAlign: "right" }}>{l.score}<span style={{ fontSize: 9, color: T.faint3 }}>/{STAGE1_MAX}</span></span>
              <SegPill segment={l.segment} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   TAB — REGRAS DE PONTUAÇÃO (mkt.score_rules)
════════════════════════════════════════════════════════════════════════ */
const RulesTab = ({ rules, dirty, onPoints, onToggle, onDelete, onAdd, onRecompute, recomputing }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ category: "demografico", field_key: "", match_value: "", label: "", points: 0 });

  const grouped = useMemo(() => {
    const g = {};
    CATEGORY_ORDER.forEach(c => { g[c] = []; });
    rules.forEach(r => { (g[r.category] = g[r.category] || []).push(r); });
    return g;
  }, [rules]);

  const submitAdd = () => {
    if (!draft.field_key || !draft.match_value) return;
    onAdd({ ...draft, points: Number(draft.points) });
    setDraft({ category: "demografico", field_key: "", match_value: "", label: "", points: 0 });
    setShowAdd(false);
  };

  const inputStyle = { fontFamily: T.font, fontSize: 12, fontWeight: 600, background: "#fff", border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", color: T.text, outline: "none" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* barra de ação */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 12, padding: "12px 16px", boxShadow: cardShadow }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: T.head, fontSize: 13, fontWeight: 700, color: T.ink }}>Regras de pontuação — Etapa 1</div>
          <div style={{ fontFamily: T.font, fontSize: 11, color: T.muted, marginTop: 2, fontWeight: 600 }}>
            {rules.filter(r => r.active).length} ativas de {rules.length} · cada opção concede pontos quando o atributo do lead casa
          </div>
        </div>
        {dirty && <span style={{ fontFamily: T.font, fontSize: 11, color: T.amber, fontWeight: 700 }}>Regras alteradas — recalcule</span>}
        <Btn onClick={onRecompute} variant={dirty ? "primary" : "ghost"} size="sm" icon={RefreshCw} disabled={recomputing}>
          {recomputing ? "Recalculando…" : "Recalcular scores"}
        </Btn>
        <Btn onClick={() => setShowAdd(!showAdd)} variant="ghost" size="sm" icon={Plus}>Nova regra</Btn>
      </div>

      {showAdd && (
        <div style={{ background: T.surface, border: `0.5px solid ${T.teal}55`, borderRadius: 12, padding: "14px 16px", display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", boxShadow: cardShadow }}>
          <div>
            <Lbl>Categoria</Lbl>
            <select value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value }))} style={inputStyle}>
              {CATEGORY_ORDER.map(c => <option key={c} value={c}>{CATEGORY_META[c].label}</option>)}
            </select>
          </div>
          <div><Lbl>Atributo (key)</Lbl><input value={draft.field_key} onChange={e => setDraft(d => ({ ...d, field_key: e.target.value }))} placeholder="ex. cidade_estado" style={{ ...inputStyle, width: 150 }} /></div>
          <div><Lbl>Opção (value)</Lbl><input value={draft.match_value} onChange={e => setDraft(d => ({ ...d, match_value: e.target.value }))} placeholder="ex. sao_paulo" style={{ ...inputStyle, width: 140 }} /></div>
          <div style={{ flex: 1, minWidth: 140 }}><Lbl>Rótulo</Lbl><input value={draft.label} onChange={e => setDraft(d => ({ ...d, label: e.target.value }))} placeholder="texto exibido" style={{ ...inputStyle, width: "100%" }} /></div>
          <div><Lbl>Pontos</Lbl><input type="number" value={draft.points} onChange={e => setDraft(d => ({ ...d, points: e.target.value }))} style={{ ...inputStyle, width: 70, fontFamily: T.mono, textAlign: "center" }} /></div>
          <Btn onClick={submitAdd} variant="success" size="sm">Adicionar</Btn>
          <Btn onClick={() => setShowAdd(false)} variant="ghost" size="sm">Cancelar</Btn>
        </div>
      )}

      {CATEGORY_ORDER.map(cat => {
        const list = grouped[cat] || [];
        if (!list.length) return null;
        const meta = CATEGORY_META[cat];
        const CIcon = meta.Icon;
        const subtotal = list.filter(r => r.active).reduce((a, r) => a + (r.points > 0 ? r.points : 0), 0);
        return (
          <div key={cat} style={{ background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 12, overflow: "hidden", boxShadow: cardShadow }}>
            <div style={{ padding: "12px 18px", borderBottom: `0.5px solid ${T.border}`, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${meta.color}14`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CIcon size={14} color={meta.color} aria-hidden="true" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: T.head, fontSize: 13.5, fontWeight: 700, color: T.ink }}>{meta.label}</div>
                <div style={{ fontFamily: T.font, fontSize: 10.5, color: T.muted, fontWeight: 600 }}>{list.length} opções</div>
              </div>
              <div style={{ fontFamily: T.mono, fontSize: 11, color: T.muted, fontWeight: 700 }}>máx +{subtotal}</div>
            </div>
            <div style={{ padding: "4px 8px" }}>
              {list.map(r => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderBottom: `0.5px solid ${T.border}`, opacity: r.active ? 1 : 0.5 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: T.font, fontSize: 12.5, color: T.text, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.label || r.match_value}</div>
                    <div style={{ fontFamily: T.mono, fontSize: 10, color: T.faint3, marginTop: 1 }}>{r.field_key} = {r.match_value}</div>
                  </div>
                  <NumInput value={r.points} onChange={v => onPoints(r.id, v)} onCommit={() => onPoints(r.id, r.points, true)} width={64} />
                  <Toggle checked={r.active} onChange={v => onToggle(r.id, v)} />
                  <button onClick={() => onDelete(r.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: T.coral, opacity: 0.7, display: "flex" }}>
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Lbl = ({ children }) => (
  <div style={{ fontFamily: T.font, fontSize: 10, color: T.muted, marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{children}</div>
);

/* ═══════════════════════════════════════════════════════════════════════
   TAB — SEGMENTOS (mkt.score_bands)
════════════════════════════════════════════════════════════════════════ */
const BandsTab = ({ bands, onMin, onCommit, onRecompute, recomputing, dirty }) => {
  const sorted = [...bands].sort((a, b) => a.min_points - b.min_points);
  // faixas para a régua visual
  const strip = sorted.map((b, i) => {
    const next = sorted[i + 1];
    const to = next ? next.min_points : STAGE1_MAX;
    return { label: b.label, from: b.min_points, to, pct: ((to - b.min_points) / STAGE1_MAX) * 100 };
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 12, padding: "18px", boxShadow: cardShadow }}>
          <SectionHeading sub="ponto de corte de cada segmento (Etapa 1, 0-50)">Segmentos configuráveis</SectionHeading>
          {[...sorted].reverse().map(b => {
            const m = segMeta(b.label);
            return (
              <div key={b.id || b.label} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: `0.5px solid ${T.border}` }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: m.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: T.head, fontSize: 14, fontWeight: 700, color: m.color }}>{b.label}</div>
                  <div style={{ fontFamily: T.font, fontSize: 11, color: T.muted, fontWeight: 600 }}>a partir de {b.min_points} pts</div>
                </div>
                <input type="range" min={0} max={STAGE1_MAX} value={b.min_points}
                  onChange={e => onMin(b.label, Number(e.target.value))}
                  onMouseUp={onCommit} onTouchEnd={onCommit}
                  style={{ width: 160, accentColor: m.color }} />
                <NumInput value={b.min_points} onChange={v => onMin(b.label, v)} onCommit={onCommit} width={64} />
              </div>
            );
          })}
        </div>

        {/* régua visual */}
        <div style={{ background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 12, padding: "18px", boxShadow: cardShadow }}>
          <SectionHeading>Régua de pontos</SectionHeading>
          <div style={{ height: 34, borderRadius: 8, overflow: "hidden", display: "flex", border: `0.5px solid ${T.border}` }}>
            {strip.filter(s => s.pct > 0).map(s => (
              <div key={s.label} style={{ flex: `0 0 ${s.pct}%`, background: `${segMeta(s.label).color}22`, display: "flex", alignItems: "center", justifyContent: "center", borderRight: `0.5px solid ${T.border}` }}>
                <span style={{ fontFamily: T.font, fontSize: 9.5, fontWeight: 700, color: segMeta(s.label).color, letterSpacing: "0.04em", textAlign: "center" }}>{s.label}<br />{s.from}–{s.to}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* recompute + nota */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ background: T.surface, border: `0.5px solid ${T.border}`, borderRadius: 12, padding: "18px", boxShadow: cardShadow }}>
          <SectionHeading>Aplicar mudanças</SectionHeading>
          <p style={{ fontFamily: T.font, fontSize: 12, color: T.muted, fontWeight: 600, lineHeight: 1.5, margin: "0 0 14px" }}>
            Alterar regras ou cortes não reclassifica os leads automaticamente. Rode o recálculo para atualizar score e segmento de todos.
          </p>
          {dirty && <div style={{ fontFamily: T.font, fontSize: 11, color: T.amber, fontWeight: 700, marginBottom: 10 }}>Há alterações não aplicadas</div>}
          <Btn onClick={onRecompute} variant="primary" size="md" icon={RefreshCw} disabled={recomputing} style={{ width: "100%", justifyContent: "center" }}>
            {recomputing ? "Recalculando…" : "Recalcular todos os scores"}
          </Btn>
        </div>
        <div style={{ background: `${T.teal}08`, border: `0.5px solid ${T.teal}33`, borderRadius: 12, padding: "16px 18px" }}>
          <div style={{ fontFamily: T.head, fontSize: 12.5, fontWeight: 700, color: T.teal, marginBottom: 6 }}>Etapa 1 vs Etapa 2</div>
          <p style={{ fontFamily: T.font, fontSize: 11.5, color: T.muted, fontWeight: 600, lineHeight: 1.5, margin: 0 }}>
            Estes segmentos são do <b>Scoring Inicial (0-50)</b>, calculado no primeiro contato. O Scoring Completo (0-100), após documentação e análise do processo, é a Etapa 2.
          </p>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   TAB — ETAPA 2 (placeholder)
════════════════════════════════════════════════════════════════════════ */
const Stage2Tab = () => (
  <div style={{ background: T.surface, border: `0.5px dashed ${T.border}`, borderRadius: 14, padding: "48px 32px", textAlign: "center", boxShadow: cardShadow }}>
    <div style={{ width: 52, height: 52, borderRadius: 14, background: `${T.violet}14`, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
      <Target size={24} color={T.violet} aria-hidden="true" />
    </div>
    <div style={{ fontFamily: T.head, fontSize: 18, fontWeight: 700, color: T.ink, marginBottom: 8 }}>Scoring Completo (0-100) — Etapa 2</div>
    <p style={{ fontFamily: T.font, fontSize: 13, color: T.muted, fontWeight: 600, lineHeight: 1.6, maxWidth: 520, margin: "0 auto" }}>
      A qualificação completa entra após o lead demonstrar interesse e enviar a documentação: processo/TRT, valor real, empresa executada, verbas, tempo e complexidade — sobre <b>crm.processos</b>. Em construção como frente separada.
    </p>
    <div style={{ display: "inline-flex", gap: 8, marginTop: 18, flexWrap: "wrap", justifyContent: "center" }}>
      {["Premium 80+", "Qualificado 60-79", "Desenvolvimento 40-59", "Descartado 0-39"].map(s => (
        <span key={s} style={{ fontFamily: T.mono, fontSize: 11, background: "#EEF2F6", color: T.muted, padding: "4px 10px", borderRadius: 6, fontWeight: 600 }}>{s}</span>
      ))}
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════
   ROOT
════════════════════════════════════════════════════════════════════════ */
const TABS = [
  { id: "geral",     label: "Visão Geral",    icon: BarChart2 },
  { id: "regras",    label: "Regras de Pontuação", icon: Scale },
  { id: "segmentos", label: "Segmentos",      icon: Layers },
  { id: "etapa2",    label: "Etapa 2 (0-100)", icon: Target },
];

export default function VantariScoringSystem() {
  const [leads, setLeads]   = useState([]);
  const [rules, setRules]   = useState([]);
  const [bands, setBands]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [tab, setTab]       = useState("geral");
  const [dirty, setDirty]   = useState(false);
  const [recomputing, setRecomputing] = useState(false);

  const mkt = () => supabase.schema("mkt");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const core = supabase.schema("core");
      const [
        { data: persons, error: pErr },
        { data: scores },
        { data: rulesData, error: rErr },
        { data: bandsData },
      ] = await Promise.all([
        core.from("persons").select("id, full_name, primary_email, status, created_at").eq("workspace_id", WORKSPACE_VANTARI).order("created_at", { ascending: false }),
        mkt().from("lead_scores").select("person_id, score_inicial, segment_inicial").eq("workspace_id", WORKSPACE_VANTARI),
        mkt().from("score_rules").select("*").eq("workspace_id", WORKSPACE_VANTARI).eq("stage", 1).order("category"),
        mkt().from("score_bands").select("*").eq("workspace_id", WORKSPACE_VANTARI).eq("stage", 1).order("min_points"),
      ]);
      if (pErr) throw pErr;
      if (rErr) throw rErr;

      const scoreMap = {};
      (scores || []).forEach(s => { scoreMap[s.person_id] = s; });

      setLeads((persons || []).map(p => ({
        id: p.id,
        name: p.full_name || p.primary_email?.split("@")[0] || "Sem nome",
        email: p.primary_email,
        status: p.status,
        score: scoreMap[p.id]?.score_inicial ?? 0,
        segment: scoreMap[p.id]?.segment_inicial ?? null,
      })));
      setRules((rulesData || []).map(r => ({
        id: r.id, category: r.category, field_key: r.field_key, match_value: r.match_value,
        label: r.label, points: r.points, active: r.active,
      })));
      setBands(bandsData || []);
      setDirty(false);
    } catch (err) {
      setError(err.message || "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ─── handlers regras ─── */
  const setRulePoints = (id, points, commit = false) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, points } : r));
    if (commit) {
      mkt().from("score_rules").update({ points }).eq("id", id).then(() => setDirty(true));
    }
  };
  const toggleRule = async (id, active) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, active } : r));
    await mkt().from("score_rules").update({ active }).eq("id", id);
    setDirty(true);
  };
  const deleteRule = async (id) => {
    if (!window.confirm("Excluir esta regra?")) return;
    await mkt().from("score_rules").delete().eq("id", id);
    setRules(prev => prev.filter(r => r.id !== id));
    setDirty(true);
  };
  const addRule = async (rule) => {
    const { data, error: e } = await mkt().from("score_rules").insert({
      workspace_id: WORKSPACE_VANTARI, stage: 1,
      category: rule.category, field_key: rule.field_key, match_value: rule.match_value,
      label: rule.label || rule.match_value, points: rule.points, active: true,
    }).select().single();
    if (e) { alert("Erro ao adicionar: " + e.message); return; }
    setRules(prev => [...prev, { id: data.id, category: data.category, field_key: data.field_key, match_value: data.match_value, label: data.label, points: data.points, active: data.active }]);
    setDirty(true);
  };

  /* ─── handlers bands ─── */
  const setBandMin = (label, min_points) => {
    setBands(prev => prev.map(b => b.label === label ? { ...b, min_points } : b));
  };
  const commitBands = async () => {
    await Promise.all(bands.map(b =>
      mkt().from("score_bands").update({ min_points: b.min_points }).eq("workspace_id", WORKSPACE_VANTARI).eq("stage", 1).eq("label", b.label)
    ));
    setDirty(true);
  };

  /* ─── recompute ─── */
  const recomputeAll = async () => {
    setRecomputing(true);
    const { error: e } = await mkt().rpc("recompute_all_scores_inicial", { p_workspace: WORKSPACE_VANTARI });
    setRecomputing(false);
    if (e) { alert("Erro ao recalcular: " + e.message); return; }
    fetchData();
  };

  const bandFor = (label) => bands.find(b => b.label === label)?.min_points;

  return (
    <div style={{ display: "flex", height: "100vh", background: T.bg, fontFamily: T.font, overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');
        *, *::before, *::after { box-sizing:border-box; }
        input[type=range] { -webkit-appearance:none; height:4px; border-radius:99px; cursor:pointer; background:${T.border}; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:14px; height:14px; border-radius:50%; cursor:pointer; border:2px solid #fff; box-shadow:0 1px 3px rgba(0,0,0,0.15); }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:${T.border}; border-radius:3px; }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>

      {/* ── SIDEBAR ── */}
      <div style={{ width: 240, background: T.sidebarBg, display: "flex", flexDirection: "column", flexShrink: 0, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(circle at 90% 0%, rgba(20,162,115,.25) 0%, transparent 50%)" }} />
        <div style={{ padding: "20px 20px 0", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 20, borderBottom: "1px solid rgba(255,255,255,.08)", marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, background: "white", borderRadius: 8, display: "grid", placeItems: "center", flexShrink: 0 }}>
              <img src="/icone.png" alt="" style={{ width: 22, height: 22 }} />
            </div>
            <span style={{ fontFamily: T.head, fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "white" }}>vantari</span>
            <span style={{ marginLeft: "auto", fontSize: 10, background: "rgba(255,255,255,.12)", padding: "3px 8px", borderRadius: 6, letterSpacing: "0.08em", fontWeight: 600, color: "rgba(255,255,255,.85)" }}>PRO</span>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 0 8px", position: "relative" }}>
          <NavSection label="Principal" />
          <NavItem icon={BarChart2}      label="Analytics"       path="/dashboard" />
          <NavItem icon={Users}          label="Leads"           path="/leads" />
          <NavItem icon={Mail}           label="Email Marketing" path="/email" />
          <NavSection label="CRM" />
          <NavItem icon={Briefcase}      label="Negócios"        path="/crm" />
          <NavSection label="Ferramentas" />
          <NavItem icon={Star}           label="Scoring"         path="/scoring" active />
          <NavItem icon={LayoutTemplate} label="Landing Pages"   path="/landing" />
          <NavItem icon={Bot}            label="IA & Automação"  path="/ai-marketing" />
          <NavItem icon={Zap}            label="Workflows"       path="/workflow" />
          <NavSection label="Sistema" />
          <NavItem icon={Plug}           label="Integrações"     path="/integrations" />
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "8px 0", position: "relative" }}>
          <NavItem icon={Settings} label="Configurações" path="/settings" />
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* topbar */}
        <div style={{ height: 56, background: T.surface, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", flexShrink: 0 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: T.ink, fontFamily: T.head, letterSpacing: "-0.02em" }}>
            Lead Scoring · <span style={{ color: T.muted, fontWeight: 600, fontSize: 14 }}>Etapa 1 (0-50)</span>
          </span>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontFamily: T.font, fontSize: 10, fontWeight: 700, color: T.muted, marginRight: 2 }}>SEGMENTOS</span>
            {["Prioritário", "Interessado", "Educativo"].map(s => {
              const m = segMeta(s);
              const min = bandFor(s);
              return (
                <div key={s} style={{ fontFamily: T.font, fontSize: 11, fontWeight: 700, color: m.color, background: m.bg, border: `0.5px solid ${m.border}`, padding: "4px 9px", borderRadius: 6 }}>
                  {s} {min !== undefined ? `≥${min}` : ""}
                </div>
              );
            })}
          </div>
        </div>

        {/* sub-tabs */}
        <div style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: "0 24px", display: "flex", gap: 2, flexShrink: 0 }}>
          {TABS.map(t => {
            const TIcon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", background: "none", border: "none", borderBottom: active ? `2px solid ${T.teal}` : "2px solid transparent", cursor: "pointer", fontSize: 12, fontWeight: active ? 700 : 500, color: active ? T.teal : T.muted, fontFamily: T.font, transition: "all 0.15s" }}>
                <TIcon size={14} aria-hidden="true" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", background: "linear-gradient(180deg, #F7F4FF 0%, #F0EAFF 100%)" }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, gap: 10, color: T.muted }}>
              <Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} aria-hidden="true" />
              <span style={{ fontFamily: T.font, fontSize: 14, fontWeight: 600 }}>Carregando dados…</span>
            </div>
          ) : error ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: `${T.coral}14`, border: `1px solid ${T.coral}`, borderRadius: 10, padding: "14px 18px", color: T.coral }}>
              <AlertCircle size={18} aria-hidden="true" />
              <span style={{ fontFamily: T.font, fontSize: 13, fontWeight: 600 }}>{error}</span>
            </div>
          ) : (
            <>
              {tab === "geral"     && <OverviewTab leads={leads} />}
              {tab === "regras"    && <RulesTab rules={rules} dirty={dirty} recomputing={recomputing}
                                        onPoints={setRulePoints} onToggle={toggleRule} onDelete={deleteRule} onAdd={addRule} onRecompute={recomputeAll} />}
              {tab === "segmentos" && <BandsTab bands={bands} dirty={dirty} recomputing={recomputing}
                                        onMin={setBandMin} onCommit={commitBands} onRecompute={recomputeAll} />}
              {tab === "etapa2"    && <Stage2Tab />}
            </>
          )}
        </div>

        {/* footer schema */}
        <div style={{ borderTop: `1px solid ${T.border}`, padding: "10px 24px", display: "flex", gap: 8, alignItems: "center", background: T.surface, flexShrink: 0 }}>
          <span style={{ fontFamily: T.font, fontSize: 10, color: T.muted, fontWeight: 700 }}>Supabase:</span>
          {["core.persons", "core.person_attributes", "mkt.lead_scores", "mkt.score_rules", "mkt.score_bands"].map(t => (
            <span key={t} style={{ fontFamily: T.mono, fontSize: 10, background: "#EEF2F6", color: T.teal, padding: "2px 8px", borderRadius: 4, border: `0.5px solid ${T.border}` }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
