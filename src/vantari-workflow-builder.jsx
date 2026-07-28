import { useState, useRef, useEffect, useCallback, createElement, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabase";
import { Loader2, AlertCircle, BarChart2, Users, Mail, Star, LayoutTemplate, Bot, Plug, Settings, Zap, Filter, ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { IdCard } from "lucide-react";
import { Briefcase } from "lucide-react";
import { Building2 } from "lucide-react";
import { Activity, ListChecks } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import "@tabler/icons-webfont/dist/tabler-icons.min.css";

/* ─── design tokens ─── */
const T = {
  // Brand
  teal:    "#0D7491",
  blue:    "#0D7491",
  green:   "#14A273",
  accent:  "#14A273",
  brand2:  "#1F76BC",
  deep:    "#0A3D4D",
  gradient: "linear-gradient(135deg, #0D7491 0%, #14A273 100%)",
  sidebarBg: "linear-gradient(180deg, #0D7491 0%, #0A5165 60%, #0A3D4D 100%)",

  // Data accents
  violet:  "#7C5CFF",
  amber:   "#F59E0B",
  orange:  "#F59E0B",
  coral:   "#FF6B5E",
  danger:  "#FF6B5E",
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

/* ─── keyframes ─── */
const SPIN_CSS = `@keyframes spin{to{transform:rotate(360deg)}}`;

/* ─── sidebar ─── */
const NavItem = ({ icon: Icon, label, active = false, path, collapsed = false }) => {
  const [hov, setHov] = useState(false);
  const navigate = useNavigate();
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => path && navigate(path)}
      title={collapsed ? label : undefined}
      style={{
        position: "relative", display: "flex", alignItems: "center", gap: 9,
        padding: collapsed ? "8px 0" : "8px 20px",
        justifyContent: collapsed ? "center" : "flex-start",
        fontSize: 13.5, fontWeight: active ? 700 : 600, fontFamily: T.font,
        color: active ? "#fff" : hov ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.6)",
        background: active ? "rgba(255,255,255,0.10)" : hov ? "rgba(255,255,255,0.06)" : "transparent",
        cursor: "pointer", transition: "all 0.15s", userSelect: "none",
      }}
    >
      {active && (
        <span style={{
          position: "absolute", left: 0, top: 6, bottom: 6, width: 3,
          background: "linear-gradient(180deg, #14A273 0%, #5EEAD4 100%)",
          borderRadius: "0 3px 3px 0",
        }} />
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

const NavSection = ({ label, collapsed = false }) => (
  collapsed ? <div style={{ height: 10 }} /> : (
    <div style={{
      fontSize: 10, fontWeight: 600, letterSpacing: "0.18em",
      color: "rgba(255,255,255,0.4)", padding: "10px 20px 4px",
      textTransform: "uppercase", fontFamily: T.head,
    }}>{label}</div>
  )
);

/* ════════════════════════════════════════════
   WORKFLOW BUILDER CANVAS
════════════════════════════════════════════ */
const NW = 200, NH = 68, CVW = 3000, CVH = 2000;
const NC = {
  trigger:   { label: "Gatilho",   icon: "ti-bolt",        clr: "#185FA5", bg: "#E6F1FB", bdr: "#378ADD", tx: "#0C447C" },
  condition: { label: "Condição",  icon: "ti-git-branch",  clr: "#854F0B", bg: "#FAEEDA", bdr: "#EF9F27", tx: "#633806" },
  action:    { label: "Ação",      icon: "ti-player-play", clr: "#0F6E56", bg: "#E1F5EE", bdr: "#1D9E75", tx: "#085041" },
  delay:     { label: "Espera",    icon: "ti-clock",       clr: "#993C1D", bg: "#FAECE7", bdr: "#D85A30", tx: "#4A1B0C" },
};
const TRIG = ["Envio de Formulário","Tag Adicionada","Tag Removida","Score Atingido","Email Aberto","Email Clicado","Visita à Página","Aniversário","Dias Após Cadastro","Pertence à Segmentação","Manual"];
const WORKSPACE_VANTARI = "53092199-7b75-4342-a897-f589d6f34922";
const ACTS = ["Enviar Email","Adicionar Tag","Remover Tag","Mudar Etapa","Webhook POST"];
const UNIT_LABELS  = { minutes: "minutos", hours: "horas", days: "dias", weeks: "semanas" };
const FIELD_LABELS = { score: "Score", tag: "Tag", stage: "Etapa", email: "Email", source: "Origem", country: "País" };
const STAGE_LABELS = { lead: "Lead", mql: "Lead Qualificado (MQL)", sql: "Pronto para Vendas (SQL)", opportunity: "Oportunidade", customer: "Cliente" };
const OP_LABELS = { "=": "Igual a", "≠": "Diferente de", ">": "Maior que", "<": "Menor que", "≥": "Maior ou igual a", "≤": "Menor ou igual a", "contains": "Contém", "starts_with": "Começa com" };

/* deriva o texto do card a partir da configuração escolhida — o nó não precisa
   de um nome manual, o que foi selecionado já identifica a etapa */
function computeLabel(type, cfg = {}) {
  if (type === "trigger") {
    if (cfg.trigger === "Pertence à Segmentação") return cfg.segment_name ? `${cfg.trigger} · ${cfg.segment_name}` : cfg.trigger;
    return cfg.trigger || "Selecione o gatilho";
  }
  if (type === "condition") {
    if (cfg.field && cfg.op && cfg.value) return `${FIELD_LABELS[cfg.field] || cfg.field} ${(OP_LABELS[cfg.op] || cfg.op).toLowerCase()} ${cfg.value}`;
    return "Configure a condição";
  }
  if (type === "action") {
    if (!cfg.action) return "Selecione a ação";
    if (cfg.action === "Enviar Email" && cfg.template) return `${cfg.action} · ${cfg.template}`;
    if ((cfg.action === "Adicionar Tag" || cfg.action === "Remover Tag") && cfg.tag) return `${cfg.action} · ${cfg.tag}`;
    if (cfg.action === "Mudar Etapa" && cfg.stage) return `${cfg.action} · ${STAGE_LABELS[cfg.stage] || cfg.stage}`;
    if (cfg.action === "Webhook POST" && cfg.url) return `${cfg.action} · ${cfg.url}`;
    return cfg.action;
  }
  if (type === "delay") {
    if (cfg.amount && cfg.unit) return `${cfg.amount} ${UNIT_LABELS[cfg.unit] || cfg.unit}`;
    return "Configure o tempo";
  }
  return "";
}

let _ni = 20;
const uid = () => `n${++_ni}`;
const eid = () => `e${++_ni}`;
const outP = n => ({ x: n.x + NW, y: n.y + NH / 2 });
const inP  = n => ({ x: n.x,      y: n.y + NH / 2 });
function bez(s, t) {
  const dx = Math.max(60, Math.abs(t.x - s.x) * 0.45);
  return `M${s.x},${s.y} C${s.x+dx},${s.y} ${t.x-dx},${t.y} ${t.x},${t.y}`;
}

const BLANK_NODES = [
  { id: "n1", type: "trigger", x: 60, y: 200, label: "Envio de Formulário", cfg: { trigger: "Envio de Formulário" } },
];
const BLANK_EDGES = [];

/* ── canvas node ── */
function CNode({ node, selected, isConn, isSource, onDragStart, onPortClick, onNodeClick }) {
  const [hov, setHov] = useState(false);
  const [outHov, setOutHov] = useState(false);
  const [inHov, setInHov] = useState(false);
  const c = NC[node.type];
  const e = createElement;
  const dropTarget = isConn && !isSource; // this node is a valid target while a connection is being drawn
  const borderColor = dropTarget && hov ? T.green : (selected || hov ? c.bdr : T.border);
  return e("div", {
    style: { position: "absolute", left: node.x, top: node.y, width: NW, height: NH, zIndex: selected ? 10 : 1, userSelect: "none" },
    onMouseEnter: () => setHov(true), onMouseLeave: () => setHov(false),
    onMouseDown: onDragStart, onClick: onNodeClick,
  },
    e("div", {
      style: {
        width: "100%", height: "100%",
        background: dropTarget && hov ? `${T.green}12` : selected ? c.bg : "#fff",
        border: `1.5px solid ${borderColor}`,
        borderLeft: `3px solid ${c.bdr}`,
        borderRadius: 8,
        display: "flex", alignItems: "center", gap: 10, padding: "0 12px",
        cursor: isConn ? (isSource ? "not-allowed" : "pointer") : "grab",
        opacity: isConn && isSource ? 0.55 : 1,
        transition: "border-color .12s,background .12s,opacity .12s,box-shadow .12s",
        boxShadow: dropTarget && hov ? `0 0 0 3px ${T.green}30` : selected ? `0 0 0 3px ${c.bdr}28` : "0 1px 4px rgba(0,0,0,.05)",
      }
    },
      e("i", { className: `ti ${c.icon}`, "aria-hidden": "true", style: { fontSize: 17, color: c.clr, flexShrink: 0 } }),
      e("div", { style: { overflow: "hidden", flex: 1 } },
        e("div", { style: { fontSize: 9, fontWeight: 700, color: c.tx, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 2, fontFamily: T.head } }, c.label),
        e("div", { title: computeLabel(node.type, node.cfg), style: { fontSize: 12, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: T.font } }, computeLabel(node.type, node.cfg))
      )
    ),
    e("div", {
      className: "nport", onClick: onPortClick,
      onMouseEnter: () => setOutHov(true), onMouseLeave: () => setOutHov(false),
      title: "Arraste para conectar a outro nó",
      style: {
        position: "absolute", right: outHov ? -9 : -7, top: "50%", transform: "translateY(-50%)",
        width: outHov ? 18 : 14, height: outHov ? 18 : 14, borderRadius: "50%",
        background: c.bdr, border: "2.5px solid #fff", cursor: "crosshair", zIndex: 5,
        boxShadow: outHov ? `0 0 0 5px ${c.bdr}30` : "none", transition: "all .12s",
      }
    }),
    e("div", {
      onClick: dropTarget ? onNodeClick : undefined,
      onMouseEnter: () => setInHov(true), onMouseLeave: () => setInHov(false),
      title: dropTarget ? "Soltar conexão aqui" : undefined,
      style: {
        position: "absolute", left: dropTarget && inHov ? -8 : -6, top: "50%", transform: "translateY(-50%)",
        width: dropTarget && inHov ? 16 : 12, height: dropTarget && inHov ? 16 : 12, borderRadius: "50%",
        background: dropTarget && inHov ? T.green : T.border,
        border: "2px solid #fff", zIndex: 5, cursor: dropTarget ? "pointer" : "default",
        boxShadow: dropTarget && inHov ? `0 0 0 5px ${T.green}30` : "none", transition: "all .12s",
      }
    })
  );
}

/* ── minimap ── */
function Minimap({ nodes, edges, sel, pan, zoom, containerRef }) {
  const MW = 168, MH = 105, sc = 0.062;
  const [sz, setSz] = useState([640, 520]);
  useEffect(() => {
    if (containerRef.current) {
      const r = containerRef.current.getBoundingClientRect();
      setSz([r.width, r.height]);
    }
  }, [containerRef]);
  const e = createElement;
  return e("div", {
    style: { position: "absolute", bottom: 12, right: 12, width: MW, height: MH, background: "#fff", border: `0.5px solid ${T.border}`, borderRadius: 8, overflow: "hidden", zIndex: 10 }
  },
    e("svg", { width: MW, height: MH },
      ...edges.map(ed => {
        const sn = nodes.find(n => n.id === ed.src), tn = nodes.find(n => n.id === ed.tgt);
        if (!sn || !tn) return null;
        return e("line", { key: ed.id, x1: (sn.x + NW) * sc + 6, y1: (sn.y + NH / 2) * sc + 6, x2: tn.x * sc + 6, y2: (tn.y + NH / 2) * sc + 6, stroke: T.border, strokeWidth: 0.5 });
      }),
      ...nodes.map(n => {
        const c = NC[n.type];
        return e("rect", { key: n.id, x: n.x * sc + 6, y: n.y * sc + 6, width: NW * sc, height: NH * sc, rx: 1.5, fill: c.bg, stroke: c.bdr, strokeWidth: sel === n.id ? 1.5 : 0.5 });
      }),
      e("rect", { x: (-pan.x / zoom) * sc + 6, y: (-pan.y / zoom) * sc + 6, width: (sz[0] / zoom) * sc, height: (sz[1] / zoom) * sc, fill: "none", stroke: T.teal, strokeWidth: 1, opacity: 0.7 })
    ),
    e("span", { style: { position: "absolute", top: 3, left: 6, fontSize: 8, color: T.muted, letterSpacing: ".05em", fontFamily: T.font } }, "MAP")
  );
}

/* ── palette row (hoverable, click-to-add + drag-to-add) ── */
function PaletteRow({ icon, iconColor, title, subtitle, onClick, onDragStart, compact }) {
  const [hov, setHov] = useState(false);
  const e = createElement;
  return e("div", {
    draggable: true,
    onDragStart,
    onClick,
    onMouseEnter: () => setHov(true), onMouseLeave: () => setHov(false),
    style: {
      display: "flex", alignItems: "center", gap: 8,
      padding: compact ? "6px 8px" : "7px 10px",
      marginBottom: 4, borderRadius: 8,
      border: `0.5px solid ${hov ? `${T.teal}70` : T.border}`,
      background: hov ? T.bg : (compact ? "transparent" : T.bg),
      cursor: "pointer", transition: "border-color .12s, background .12s",
    },
  },
    e("i", { className: `ti ${icon}`, "aria-hidden": "true", style: { fontSize: compact ? 12 : 15, color: iconColor, flexShrink: 0 } }),
    subtitle
      ? e("div", { style: { overflow: "hidden" } },
          e("div", { style: { fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.font } }, title),
          e("div", { style: { fontSize: 10, color: T.muted, fontFamily: T.font } }, subtitle)
        )
      : e("div", { style: { fontSize: 11.5, color: T.text, fontFamily: T.font, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, title)
  );
}

/* ── palette ── */
function Palette({ onAdd }) {
  const e = createElement;
  const [q, setQ] = useState("");
  const ql = q.trim().toLowerCase();
  const filteredTrig = ql ? TRIG.filter(t => t.toLowerCase().includes(ql)) : TRIG;
  const filteredActs = ql ? ACTS.filter(a => a.toLowerCase().includes(ql)) : ACTS;
  const noResults = !!ql && filteredTrig.length === 0 && filteredActs.length === 0;

  return e("div", { style: { padding: 10 } },
    e("div", { style: { position: "relative", marginBottom: 12 } },
      e("i", { className: "ti ti-search", "aria-hidden": "true", style: { position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: T.muted, pointerEvents: "none" } }),
      e("input", {
        value: q, onChange: ev => setQ(ev.target.value),
        placeholder: "Buscar gatilhos e ações...",
        style: { width: "100%", boxSizing: "border-box", padding: "6px 8px 6px 26px", fontSize: 11.5, border: `1px solid ${T.border}`, borderRadius: 7, outline: "none", fontFamily: T.font, color: T.text },
      })
    ),

    !ql && e(Fragment, null,
      e("div", { style: { fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8, padding: "0 2px", fontFamily: T.head } }, "Elementos"),
      ...Object.entries(NC).map(([type, c]) =>
        e(PaletteRow, {
          key: type,
          icon: c.icon, iconColor: c.clr,
          title: c.label,
          subtitle: { trigger: "Evento inicial", condition: "Se/senão", action: "Executar", delay: "Aguardar" }[type],
          onDragStart: ev => ev.dataTransfer.setData("type", type),
          onClick: () => onAdd?.(type),
        })
      )
    ),

    filteredTrig.length > 0 && e(Fragment, null,
      e("div", { style: { fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".08em", margin: "12px 2px 7px", fontFamily: T.head } }, `Gatilhos${ql ? ` (${filteredTrig.length})` : ""}`),
      ...filteredTrig.map(t =>
        e(PaletteRow, {
          key: t, compact: true,
          icon: "ti-bolt", iconColor: NC.trigger.clr,
          title: t,
          onDragStart: ev => {
            ev.dataTransfer.setData("type", "trigger");
            ev.dataTransfer.setData("label", t);
            ev.dataTransfer.setData("cfg", JSON.stringify({ trigger: t }));
          },
          onClick: () => onAdd?.("trigger", { trigger: t }),
        })
      )
    ),

    filteredActs.length > 0 && e(Fragment, null,
      e("div", { style: { fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".08em", margin: "12px 2px 7px", fontFamily: T.head } }, `Ações${ql ? ` (${filteredActs.length})` : ""}`),
      ...filteredActs.map(a =>
        e(PaletteRow, {
          key: a, compact: true,
          icon: "ti-player-play", iconColor: NC.action.clr,
          title: a,
          onDragStart: ev => {
            ev.dataTransfer.setData("type", "action");
            ev.dataTransfer.setData("label", a);
            ev.dataTransfer.setData("cfg", JSON.stringify({ action: a }));
          },
          onClick: () => onAdd?.("action", { action: a }),
        })
      )
    ),

    noResults && e("div", { style: { textAlign: "center", padding: "20px 8px", color: T.muted, fontSize: 11.5, fontFamily: T.font } }, "Nenhum resultado encontrado.")
  );
}

/* ── node config panel ── */
function NodeConfig({ node, onChange, onClose, onDelete, segments = [] }) {
  const c = NC[node.type];
  const e = createElement;
  const fld = (lbl, child) => e("div", { style: { marginBottom: 9 } },
    e("label", { style: { fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 4, fontFamily: T.head } }, lbl),
    child
  );
  const inpStyle = { width: "100%", boxSizing: "border-box", padding: "6px 8px", fontSize: 12, border: `1px solid ${T.border}`, borderRadius: 6, outline: "none", fontFamily: T.font, color: T.text };
  const applyCfg = (newCfg) => onChange({ cfg: newCfg, label: computeLabel(node.type, newCfg) });
  const inp = (k, ph) => e("input", { value: node.cfg?.[k] || "", placeholder: ph || "", style: inpStyle, onChange: ev => applyCfg({ ...node.cfg, [k]: ev.target.value }) });
  const sel = (k, opts) => e("select", { value: node.cfg?.[k] || "", style: inpStyle, onChange: ev => applyCfg({ ...node.cfg, [k]: ev.target.value }) },
    e("option", { value: "" }, "— selecionar —"),
    ...opts.map(o => {
      const v = typeof o === "object" ? o.value : o;
      const l = typeof o === "object" ? o.label : o;
      return e("option", { key: v, value: v }, l);
    })
  );
  const segSel = () => segments.length === 0
    ? e("div", { style: { fontSize: 11, color: T.muted, fontFamily: T.font } }, "Nenhuma segmentação criada ainda — crie uma em Segmentações.")
    : e("select", {
        value: node.cfg?.segment_id || "", style: inpStyle,
        onChange: ev => {
          const opt = segments.find(s => s.id === ev.target.value);
          applyCfg({ ...node.cfg, segment_id: ev.target.value, segment_name: opt?.name || "" });
        },
      },
        e("option", { value: "" }, "— selecionar —"),
        ...segments.map(s => e("option", { key: s.id, value: s.id }, s.name))
      );
  return e("div", { style: { padding: 12 } },
    e("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 } },
      e("div", { style: { display: "flex", alignItems: "center", gap: 6 } },
        e("i", { className: `ti ${c.icon}`, "aria-hidden": "true", style: { fontSize: 14, color: c.clr } }),
        e("span", { style: { fontSize: 12, fontWeight: 700, color: c.tx, fontFamily: T.head } }, c.label)
      ),
      e("button", { onClick: onClose, style: { background: "none", border: "none", color: T.muted, padding: 2, cursor: "pointer" } },
        e("i", { className: "ti ti-x", "aria-hidden": "true", style: { fontSize: 13 } })
      )
    ),
    e("div", { style: { fontSize: 11, color: T.muted, fontFamily: T.font, marginBottom: 12 } }, "O card no canvas mostra a opção selecionada abaixo automaticamente."),
    node.type === "trigger" && e(Fragment, null,
      fld("Tipo", sel("trigger", TRIG)),
      node.cfg?.trigger === "Envio de Formulário" && fld("Formulário", inp("form", "Formulário de Contato")),
      node.cfg?.trigger === "Score Atingido" && fld("Score ≥", inp("score", "50")),
      node.cfg?.trigger === "Visita à Página"       && fld("URL contém", inp("url", "/pricing")),
      node.cfg?.trigger === "Dias Após Cadastro"&& fld("Dias", inp("days", "7")),
      node.cfg?.trigger === "Tag Adicionada"        && fld("Tag", inp("tag", "hot-lead")),
      node.cfg?.trigger === "Pertence à Segmentação" && fld("Segmentação", segSel()),
    ),
    node.type === "condition" && e(Fragment, null,
      fld("Campo",    sel("field", Object.entries(FIELD_LABELS).map(([value, label]) => ({ value, label })))),
      fld("Operador", sel("op",    Object.entries(OP_LABELS).map(([value, label]) => ({ value, label })))),
      fld("Valor",    inp("value", "50")),
    ),
    node.type === "action" && e(Fragment, null,
      fld("Ação", sel("action", ACTS)),
      node.cfg?.action === "Enviar Email"  && fld("Template", inp("template", "welcome_v2")),
      (node.cfg?.action === "Adicionar Tag" || node.cfg?.action === "Remover Tag") && fld("Tag", inp("tag", "nurture")),
      node.cfg?.action === "Mudar Etapa"  && fld("Etapa", sel("stage", ["lead","mql","sql","opportunity","customer"].map(v => ({ value: v, label: STAGE_LABELS[v] })))),
      node.cfg?.action === "Webhook POST"  && fld("URL", inp("url", "https://")),
    ),
    node.type === "delay" && e(Fragment, null,
      fld("Quantidade", inp("amount", "3")),
      fld("Unidade",    sel("unit",   Object.entries(UNIT_LABELS).map(([value, label]) => ({ value, label })))),
    ),
    e("div", { style: { marginTop: 14, paddingTop: 12, borderTop: `0.5px solid ${T.border}` } },
      e("div", { style: { fontSize: 9, color: T.muted, marginBottom: 8, fontFamily: T.font } }, `ID: ${node.id}`),
      e("button", {
        onClick: onDelete,
        style: { width: "100%", background: "#fef2f2", color: T.danger, border: `0.5px solid ${T.danger}40`, borderRadius: 8, padding: "5px 10px", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, cursor: "pointer", fontFamily: T.font },
      },
        e("i", { className: "ti ti-trash", "aria-hidden": "true", style: { fontSize: 12 } }), "Remover nó"
      )
    )
  );
}

/* ── workflows list (Supabase) ── */
function WFView({ onEdit }) {
  const [flows, setFlows]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [creating, setCreating] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true); setError(null);
    const { data, error: err } = await supabase
      .from("automation_flows")
      .select("id, name, status, created_at, updated_at")
      .order("created_at", { ascending: false });
    if (err) { setError(err.message); } else { setFlows(data || []); }
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleNew = async () => {
    setCreating(true);
    const { data, error: err } = await supabase
      .from("automation_flows")
      .insert({ name: "Novo Fluxo", status: "draft", definition: { nodes: BLANK_NODES, edges: BLANK_EDGES } })
      .select()
      .single();
    setCreating(false);
    if (!err && data) { onEdit(data.id); }
    else { setError(err?.message); }
  };

  const handleToggle = async (flow) => {
    const next = flow.status === "active" ? "paused" : "active";
    await supabase.from("automation_flows").update({ status: next }).eq("id", flow.id);
    setFlows(fs => fs.map(f => f.id === flow.id ? { ...f, status: next } : f));
  };

  const handleDelete = async (id) => {
    if (!confirm("Remover este workflow?")) return;
    await supabase.from("automation_flows").delete().eq("id", id);
    setFlows(fs => fs.filter(f => f.id !== id));
  };

  const statusStyle = (s) => ({
    active: { bg: `${T.green}14`, cl: T.green },
    paused: { bg: `${T.amber}18`, cl: T.amber },
    draft:  { bg: T.faint,        cl: T.muted },
  }[s] || { bg: T.faint, cl: T.muted });

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24, background: "#fff" }}>
      <style>{SPIN_CSS}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px", fontFamily: T.head, color: T.text }}>Fluxos</h2>
          <p style={{ fontSize: 13, color: T.muted, margin: 0, fontFamily: T.font }}>
            {loading ? "Carregando..." : `${flows.length} fluxo${flows.length !== 1 ? "s" : ""} · ${flows.filter(f => f.status === "active").length} ativo${flows.filter(f => f.status === "active").length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button onClick={handleNew} disabled={creating} style={{ display: "flex", alignItems: "center", gap: 6, background: T.gradient, color: "#fff", border: "none", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: creating ? "not-allowed" : "pointer", opacity: creating ? 0.7 : 1, fontFamily: T.font, boxShadow: "0 4px 14px -4px rgba(13,116,145,.4)" }}>
          {creating
            ? <Loader2 size={14} style={{ animation: "spin 0.7s linear infinite" }} />
            : <i className="ti ti-plus" style={{ fontSize: 13 }} />
          }
          Novo Fluxo
        </button>
      </div>

      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fef2f2", border: `1px solid ${T.danger}`, borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
          <AlertCircle size={16} color={T.danger} />
          <span style={{ fontSize: 13, color: T.danger, fontFamily: T.font }}>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, gap: 10, color: T.muted }}>
          <Loader2 size={20} style={{ animation: "spin 0.7s linear infinite" }} />
          <span style={{ fontFamily: T.font, fontSize: 14 }}>Carregando fluxos...</span>
        </div>
      ) : flows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: T.muted }}>
          <i className="ti ti-webhook" style={{ fontSize: 48, display: "block", marginBottom: 16, opacity: 0.4 }} />
          <p style={{ fontFamily: T.font, fontSize: 14, margin: "0 0 16px" }}>Nenhum fluxo criado ainda.</p>
          <button onClick={handleNew} style={{ background: T.gradient, color: "#fff", border: "none", borderRadius: 10, padding: "8px 20px", fontSize: 13, cursor: "pointer", fontFamily: T.font, fontWeight: 700 }}>Criar primeiro fluxo</button>
        </div>
      ) : (
        <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 110px 120px", padding: "9px 16px", background: T.bg, fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".06em", fontFamily: T.head }}>
            {["Nome","Status","Atualizado",""].map((h, i) => <span key={i}>{h}</span>)}
          </div>
          {flows.map((wf, i) => {
            const s = statusStyle(wf.status);
            const updatedAt = wf.updated_at ? new Date(wf.updated_at).toLocaleDateString("pt-BR") : "—";
            return (
              <div key={wf.id} style={{ display: "grid", gridTemplateColumns: "1fr 90px 110px 120px", padding: "14px 16px", borderTop: `1px solid ${T.border}`, alignItems: "center", fontSize: 13, background: i % 2 ? T.bg : "#fff" }}>
                <div>
                  <div style={{ fontWeight: 700, color: T.text, fontFamily: T.font, marginBottom: 2 }}>{wf.name}</div>
                  <div style={{ fontSize: 10, color: T.muted, fontFamily: T.font }}>{wf.id.slice(0, 8)}...</div>
                </div>
                <div>
                  <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, background: s.bg, color: s.cl, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4, fontFamily: T.font }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.cl, display: "inline-block" }} />
                    {{ active: "ativo", paused: "pausado", draft: "rascunho" }[wf.status] || wf.status}
                  </span>
                </div>
                <div style={{ fontFamily: T.font, fontSize: 12, color: T.muted }}>{updatedAt}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => onEdit(wf.id)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: "none", border: `1px solid ${T.border}`, color: T.text, cursor: "pointer", fontFamily: T.font }}>Editar</button>
                  <button onClick={() => handleToggle(wf)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: wf.status === "active" ? `${T.amber}18` : `${T.green}14`, border: "none", color: wf.status === "active" ? T.amber : T.green, cursor: "pointer", fontFamily: T.font, fontWeight: 700 }}>
                    {wf.status === "active" ? "Pausar" : "Ativar"}
                  </button>
                  <button onClick={() => handleDelete(wf.id)} style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, background: "none", border: "none", color: T.muted, cursor: "pointer" }}>
                    <i className="ti ti-trash" style={{ fontSize: 13 }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── logs (Supabase) ── */
function LogView() {
  const [runs, setRuns]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [filter, setFilter]   = useState("all");

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError(null);
      const { data, error: err } = await supabase
        .from("flow_runs")
        .select("id, status, started_at, log, flow_id, person_id")
        .order("started_at", { ascending: false })
        .limit(100);
      if (err) { setError(err.message); setLoading(false); return; }
      const list = data || [];

      const flowIds   = [...new Set(list.map(r => r.flow_id).filter(Boolean))];
      const personIds = [...new Set(list.map(r => r.person_id).filter(Boolean))];
      const [flowsRes, personsRes] = await Promise.all([
        flowIds.length ? supabase.from("automation_flows").select("id,name").in("id", flowIds) : Promise.resolve({ data: [] }),
        personIds.length ? supabase.schema("core").from("persons").select("id,full_name,primary_email").in("id", personIds) : Promise.resolve({ data: [] }),
      ]);
      const flowMap   = Object.fromEntries((flowsRes.data || []).map(f => [f.id, f.name]));
      const personMap = Object.fromEntries((personsRes.data || []).map(p => [p.id, p.full_name || p.primary_email || "—"]));

      setRuns(list.map(r => ({
        ...r,
        flowName:    flowMap[r.flow_id] || "—",
        personLabel: personMap[r.person_id] || "—",
        lastLog:     Array.isArray(r.log) && r.log.length ? r.log[r.log.length - 1].msg : "—",
      })));
      setLoading(false);
    };
    load();
  }, []);

  const filtered = filter === "all" ? runs : runs.filter(r => r.status === filter);
  const statusStyle = (s) => ({
    completed: { bg: `${T.green}14`, cl: T.green },
    failed:    { bg: `${T.coral}14`, cl: T.coral },
    waiting:   { bg: `${T.amber}18`, cl: T.amber },
    running:   { bg: `${T.teal}14`, cl: T.teal },
  }[s] || { bg: T.faint, cl: T.muted });

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24, background: "#fff" }}>
      <style>{SPIN_CSS}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px", fontFamily: T.head, color: T.text }}>Logs de Execução</h2>
          <p style={{ fontSize: 13, color: T.muted, margin: 0, fontFamily: T.font }}>Últimas 100 execuções</p>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["all","running","waiting","completed","failed"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: "5px 12px", fontSize: 11, borderRadius: 20, fontWeight: filter === f ? 700 : 600, background: filter === f ? T.teal : "none", color: filter === f ? "#fff" : T.muted, border: filter === f ? "none" : `1px solid ${T.border}`, cursor: "pointer", fontFamily: T.font }}>
              {{ all: "Todos", running: "em execução", waiting: "aguardando", completed: "concluído", failed: "falhou" }[f]}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fef2f2", border: `1px solid ${T.danger}`, borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
          <AlertCircle size={16} color={T.danger} />
          <span style={{ fontSize: 13, color: T.danger, fontFamily: T.font }}>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, gap: 10, color: T.muted }}>
          <Loader2 size={20} style={{ animation: "spin 0.7s linear infinite" }} />
          <span style={{ fontFamily: T.font, fontSize: 14 }}>Carregando logs...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: T.muted }}>
          <i className="ti ti-terminal-2" style={{ fontSize: 48, display: "block", marginBottom: 16, opacity: 0.4 }} />
          <p style={{ fontFamily: T.font, fontSize: 14, margin: 0 }}>
            {runs.length === 0 ? "Nenhuma execução registrada ainda. Ative um fluxo com gatilho de Segmentação para começar." : `Nenhum log com status "${{ running: "em execução", waiting: "aguardando", completed: "concluído", failed: "falhou" }[filter] || filter}".`}
          </p>
        </div>
      ) : (
        <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "130px 1fr 1fr 1.4fr 90px", padding: "9px 16px", background: T.bg, fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".06em", fontFamily: T.head }}>
            {["Hora","Pessoa","Fluxo","Última atividade","Status"].map((h, i) => <span key={i}>{h}</span>)}
          </div>
          {filtered.map((run, i) => {
            const s = statusStyle(run.status);
            const time = new Date(run.started_at).toLocaleTimeString("pt-BR");
            return (
              <div key={run.id} style={{ display: "grid", gridTemplateColumns: "130px 1fr 1fr 1.4fr 90px", padding: "11px 16px", borderTop: `1px solid ${T.border}`, alignItems: "center", fontSize: 12, background: i % 2 ? T.bg : "#fff", fontFamily: T.font }}>
                <div style={{ color: T.muted, fontSize: 11 }}>{time}</div>
                <div style={{ color: T.teal, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{run.personLabel}</div>
                <div style={{ color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{run.flowName}</div>
                <div style={{ color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={run.lastLog}>{run.lastLog}</div>
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: s.bg, color: s.cl, fontWeight: 700 }}>{{ running: "em execução", waiting: "aguardando", completed: "concluído", failed: "falhou" }[run.status] || run.status}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── analytics (Supabase) ── */
function AnaView() {
  const [kpis, setKpis]       = useState(null);
  const [flows, setFlows]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [runsRes, flowsRes] = await Promise.all([
        supabase.from("flow_runs").select("status"),
        supabase.from("automation_flows").select("id, name, status"),
      ]);
      const runs = runsRes.data || [];
      const allFlows = flowsRes.data || [];
      setKpis({
        total:    runs.length,
        success:  runs.filter(r => r.status === "completed").length,
        errors:   runs.filter(r => r.status === "failed").length,
        waiting:  runs.filter(r => r.status === "waiting").length,
        active:   allFlows.filter(f => f.status === "active").length,
        paused:   allFlows.filter(f => f.status === "inactive").length,
        draft:    allFlows.filter(f => f.status === "draft").length,
      });
      setFlows(allFlows);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: T.muted }}>
      <style>{SPIN_CSS}</style>
      <Loader2 size={20} style={{ animation: "spin 0.7s linear infinite" }} />
      <span style={{ fontFamily: T.font, fontSize: 14 }}>Carregando analytics...</span>
    </div>
  );

  const cards = [
    { lbl: "Total Execuções",  val: kpis.total,   sub: `${kpis.success} sucesso · ${kpis.errors} erro`, icon: "ti-chart-bar", cl: T.teal  },
    { lbl: "Fluxos Ativos",    val: kpis.active,  sub: `${kpis.paused} pausado · ${kpis.draft} rascunho`, icon: "ti-webhook", cl: T.green },
    { lbl: "Erros",            val: kpis.errors,  sub: kpis.total > 0 ? `${((kpis.errors/kpis.total)*100).toFixed(1)}% error rate` : "—", icon: "ti-alert-circle", cl: T.coral },
    { lbl: "Em Espera",        val: kpis.waiting, sub: "aguardando condição", icon: "ti-clock",  cl: T.amber },
  ];

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24, background: "#fff" }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 20px", fontFamily: T.head, color: T.text }}>Analytics</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        {cards.map(k => (
          <div key={k.lbl} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <i className={`ti ${k.icon}`} style={{ fontSize: 16, color: k.cl }} />
              <span style={{ fontSize: 11, color: T.muted, fontFamily: T.font, fontWeight: 700 }}>{k.lbl}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: k.cl, fontFamily: T.head, marginBottom: 4 }}>{k.val}</div>
            <div style={{ fontSize: 11, color: T.muted, fontFamily: T.font }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {flows.length > 0 && (
        <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 16px", fontFamily: T.head, color: T.text }}>Fluxos</h3>
          {flows.map(f => {
            const statusCl = { active: T.green, paused: T.amber, draft: T.muted }[f.status] || T.muted;
            const statusLbl = { active: "ativo", paused: "pausado", draft: "rascunho" }[f.status] || f.status;
            return (
              <div key={f.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: T.text, fontFamily: T.font }}>{f.name}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: statusCl, fontFamily: T.font }}>{statusLbl}</span>
              </div>
            );
          })}
        </div>
      )}

      {flows.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: T.muted }}>
          <i className="ti ti-chart-bar" style={{ fontSize: 40, display: "block", marginBottom: 12, opacity: 0.3 }} />
          <p style={{ fontFamily: T.font, fontSize: 13 }}>Crie e ative fluxos para ver analytics aqui.</p>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   BUILDER CANVAS (with Supabase save/load)
════════════════════════════════════════════ */
function BuilderCanvas({ flowId, onFlowIdChange }) {
  const [nodes, setNodes]     = useState(BLANK_NODES);
  const [edges, setEdges]     = useState(BLANK_EDGES);
  const [wfName, setWfName]   = useState("Novo Fluxo");
  const [wfStatus, setWfStatus] = useState("draft");
  const [sel, setSel]         = useState(null);
  const [zoom, setZoom]       = useState(0.82);
  const [pan, setPan]         = useState({ x: 20, y: 16 });
  const [drag, setDrag]       = useState(null);
  const [panning, setPanning] = useState(null);
  const [conn, setConn]       = useState(null);
  const [mouse, setMouse]     = useState({ x: 0, y: 0 });
  const [saved, setSaved]     = useState(true);
  const [saving, setSaving]   = useState(false);
  const [loadingFlow, setLoadingFlow] = useState(false);
  const [segments, setSegments] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    supabase.from("segments").select("id,name").eq("workspace_id", WORKSPACE_VANTARI).order("name")
      .then(({ data }) => setSegments(data || []));
  }, []);

  /* auto-save */
  const saveFlow = useCallback(async (currentNodes, currentEdges, currentName, currentFlowId) => {
    setSaving(true);
    const def = { nodes: currentNodes, edges: currentEdges };
    if (currentFlowId) {
      await supabase.from("automation_flows").update({
        name: currentName, definition: def, updated_at: new Date().toISOString(),
      }).eq("id", currentFlowId);
    } else {
      const { data } = await supabase.from("automation_flows")
        .insert({ name: currentName, status: "draft", definition: def })
        .select().single();
      if (data) onFlowIdChange(data.id);
    }
    setSaving(false);
    setSaved(true);
  }, [onFlowIdChange]);

  const nodesRef  = useRef(nodes);
  const edgesRef  = useRef(edges);
  const nameRef   = useRef(wfName);
  const flowIdRef = useRef(flowId);
  const savedRef  = useRef(saved);
  nodesRef.current  = nodes;
  edgesRef.current  = edges;
  nameRef.current   = wfName;
  flowIdRef.current = flowId;
  savedRef.current  = saved;

  /* load flow when flowId changes — and flush any unsaved edits from the flow we're leaving
     (fixes losing the last edit when switching flows or leaving the Builder before the
     1.5s auto-save debounce has a chance to fire) */
  useEffect(() => {
    if (!flowId) {
      setNodes(BLANK_NODES); setEdges(BLANK_EDGES);
      setWfName("Novo Fluxo"); setWfStatus("draft"); setSaved(true);
      return () => {
        if (!savedRef.current) {
          saveFlow(nodesRef.current, edgesRef.current, nameRef.current, null);
        }
      };
    }
    setLoadingFlow(true);
    supabase.from("automation_flows").select("*").eq("id", flowId).single()
      .then(({ data, error }) => {
        if (!error && data) {
          setWfName(data.name);
          setWfStatus(data.status);
          if (data.definition?.nodes?.length) setNodes(data.definition.nodes);
          if (data.definition?.edges)         setEdges(data.definition.edges);
        }
        setLoadingFlow(false);
        setSaved(true);
      });
    return () => {
      if (!savedRef.current) {
        saveFlow(nodesRef.current, edgesRef.current, nameRef.current, flowId);
      }
    };
  }, [flowId, saveFlow]);

  useEffect(() => {
    if (saved) return;
    const t = setTimeout(() => {
      saveFlow(nodesRef.current, edgesRef.current, nameRef.current, flowIdRef.current);
    }, 1500);
    return () => clearTimeout(t);
  }, [saved, saveFlow, flowId]);

  /* also flush on tab close / hard refresh so a change made seconds before leaving isn't lost */
  useEffect(() => {
    const onBeforeUnload = (ev) => {
      if (!savedRef.current) {
        saveFlow(nodesRef.current, edgesRef.current, nameRef.current, flowIdRef.current);
        ev.preventDefault();
        ev.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [saveFlow]);

  const handleStatusToggle = async () => {
    if (!flowId) return;
    const next = wfStatus === "active" ? "paused" : "active";
    await supabase.from("automation_flows").update({ status: next }).eq("id", flowId);
    setWfStatus(next);
  };

  const toC = useCallback((cx, cy) => {
    const r = ref.current?.getBoundingClientRect() || { left: 0, top: 0 };
    return { x: (cx - r.left - pan.x) / zoom, y: (cy - r.top - pan.y) / zoom };
  }, [pan, zoom]);

  const onWheel = useCallback(e => {
    e.preventDefault();
    setZoom(z => Math.min(2.5, Math.max(0.2, z * (e.deltaY < 0 ? 1.1 : 0.9))));
  }, []);

  const onCMD = useCallback(e => {
    if (e.button === 1 || e.altKey) { e.preventDefault(); setPanning({ mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y }); }
    else if (e.target.dataset.cv) { setSel(null); setConn(null); }
  }, [pan]);

  const onMM = useCallback(e => {
    const cp = toC(e.clientX, e.clientY);
    setMouse(cp);
    if (panning) setPan({ x: panning.px + (e.clientX - panning.mx), y: panning.py + (e.clientY - panning.my) });
    if (drag) { setNodes(ns => ns.map(n => n.id === drag.id ? { ...n, x: cp.x - drag.ox, y: cp.y - drag.oy } : n)); setSaved(false); }
  }, [panning, drag, toC]);

  const onMU = useCallback(() => { setPanning(null); setDrag(null); }, []);

  const startDrag = useCallback((e, id) => {
    e.stopPropagation();
    const n = nodes.find(x => x.id === id);
    const cp = toC(e.clientX, e.clientY);
    setDrag({ id, ox: cp.x - n.x, oy: cp.y - n.y }); setSel(id);
  }, [nodes, toC]);

  const startConn = useCallback((e, src) => { e.stopPropagation(); setConn({ src }); }, []);

  const finishConn = useCallback((e, tgt) => {
    e.stopPropagation();
    if (conn && conn.src !== tgt && !edges.some(x => x.src === conn.src && x.tgt === tgt)) {
      setEdges(es => [...es, { id: eid(), src: conn.src, tgt, lbl: "" }]); setSaved(false);
    }
    setConn(null);
  }, [conn, edges]);

  const onDrop = useCallback(e => {
    e.preventDefault();
    const type = e.dataTransfer.getData("type");
    if (!type) return;
    const cfgRaw = e.dataTransfer.getData("cfg");
    const cfg = cfgRaw ? JSON.parse(cfgRaw) : {};
    const cp = toC(e.clientX, e.clientY);
    const id = uid();
    setNodes(ns => [...ns, { id, type, x: cp.x - NW / 2, y: cp.y - NH / 2, label: computeLabel(type, cfg), cfg }]);
    setSaved(false);
    setSel(id);
  }, [toC]);

  /* click-to-add from the palette — places the node just right of the current rightmost node */
  const onAdd = useCallback((type, cfg = {}) => {
    const id = uid();
    setNodes(ns => {
      const x = ns.length ? Math.max(...ns.map(n => n.x)) + NW + 40 : 60;
      const y = ns.length ? ns[ns.length - 1].y : 200;
      return [...ns, { id, type, x, y, label: computeLabel(type, cfg), cfg }];
    });
    setSaved(false);
    setSel(id);
  }, []);

  useEffect(() => {
    const h = e => {
      if ((e.key === "Delete" || e.key === "Backspace") && sel && !["INPUT","SELECT"].includes(e.target.tagName)) {
        setNodes(ns => ns.filter(n => n.id !== sel));
        setEdges(es => es.filter(x => x.src !== sel && x.tgt !== sel));
        setSel(null); setSaved(false);
      }
      if (e.key === "Escape") setConn(null);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [sel]);

  const selNode = nodes.find(n => n.id === sel);
  const e = createElement;

  if (loadingFlow) return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: T.muted }}>
      <style>{SPIN_CSS}</style>
      <Loader2 size={20} style={{ animation: "spin 0.7s linear infinite" }} />
      <span style={{ fontFamily: T.font, fontSize: 14 }}>Carregando fluxo...</span>
    </div>
  );

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      {/* header strip */}
      <div style={{ position: "absolute", top: 0, right: 0, display: "flex", alignItems: "center", gap: 10, padding: "0 16px", height: 46, zIndex: 20 }}>
        <input
          value={wfName}
          onChange={ev => { setWfName(ev.target.value); setSaved(false); }}
          style={{ background: "none", border: "none", outline: "none", fontSize: 13, fontWeight: 700, color: T.text, textAlign: "right", width: 200, fontFamily: T.head }}
        />
        <span style={{ fontSize: 11, color: saving ? T.amber : saved ? T.green : T.amber, fontFamily: T.font, minWidth: 64 }}>
          {saving ? "Salvando…" : saved ? "Salvo" : "Não salvo"}
        </span>
        <button
          onClick={() => saveFlow(nodes, edges, wfName, flowId)}
          disabled={saving || saved}
          title="Salvar agora"
          style={{ background: "none", border: `1px solid ${T.border}`, color: T.text, borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: (saving || saved) ? "default" : "pointer", opacity: (saving || saved) ? 0.5 : 1, fontFamily: T.font }}
        >
          Salvar
        </button>
        <button
          onClick={handleStatusToggle}
          disabled={!flowId}
          style={{ background: wfStatus === "active" ? `${T.amber}18` : T.gradient, color: wfStatus === "active" ? T.amber : "#fff", border: "none", borderRadius: 8, padding: "5px 14px", fontSize: 12, fontWeight: 700, cursor: flowId ? "pointer" : "not-allowed", opacity: flowId ? 1 : 0.5, fontFamily: T.font }}
        >
          {wfStatus === "active" ? "⏸ Pausar" : "▶ Ativar"}
        </button>
      </div>

      {/* sidebar panel */}
      {e("div", { style: { width: 196, borderRight: `0.5px solid ${T.border}`, background: "#fff", overflow: "auto", flexShrink: 0 } },
        !selNode
          ? e(Palette, { onAdd })
          : e(NodeConfig, {
              node: selNode,
              segments,
              onClose: () => setSel(null),
              onChange: u => { setNodes(ns => ns.map(n => n.id === selNode.id ? { ...n, ...u } : n)); setSaved(false); },
              onDelete: () => { setNodes(ns => ns.filter(n => n.id !== selNode.id)); setEdges(es => es.filter(x => x.src !== selNode.id && x.tgt !== selNode.id)); setSel(null); setSaved(false); },
            })
      )}

      {/* canvas */}
      {e("div", {
        ref, "data-cv": "1",
        style: { flex: 1, position: "relative", overflow: "hidden", cursor: panning ? "grabbing" : conn ? "crosshair" : "default", backgroundColor: T.bg, backgroundImage: `radial-gradient(${T.border} 1px,transparent 1px)`, backgroundSize: "22px 22px" },
        onWheel, onMouseDown: onCMD, onMouseMove: onMM, onMouseUp: onMU,
        onDragOver: ev => ev.preventDefault(), onDrop,
      },
        e("div", { style: { position: "absolute", transformOrigin: "0 0", transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`, width: CVW, height: CVH } },
          e("svg", { style: { position: "absolute", top: 0, left: 0, width: CVW, height: CVH, pointerEvents: "none", overflow: "visible" } },
            e("defs", null,
              ...Object.entries(NC).map(([t, c]) =>
                e("marker", { key: t, id: `arr2-${t}`, markerWidth: 8, markerHeight: 8, refX: 7, refY: 3, orient: "auto" },
                  e("path", { d: "M0,0 L0,6 L8,3 z", fill: c.bdr })
                )
              )
            ),
            ...edges.map(ed => {
              const sn = nodes.find(n => n.id === ed.src), tn = nodes.find(n => n.id === ed.tgt);
              if (!sn || !tn) return null;
              const s = outP(sn), t2 = inP(tn), mx = (s.x + t2.x) / 2, my = (s.y + t2.y) / 2;
              return e("g", { key: ed.id },
                e("path", { d: bez(s, t2), stroke: NC[sn.type].bdr, strokeWidth: 1.5, strokeOpacity: 0.6, fill: "none", markerEnd: `url(#arr2-${sn.type})` }),
                ed.lbl && e("g", null,
                  e("rect", { x: mx - 18, y: my - 9, width: 36, height: 18, rx: 4, fill: "#fff", stroke: T.border, strokeWidth: 0.5 }),
                  e("text", { x: mx, y: my + 4, textAnchor: "middle", fontSize: 10, fontFamily: T.font, fill: T.muted }, ed.lbl)
                )
              );
            }),
            conn && (() => {
              const sn = nodes.find(n => n.id === conn.src); if (!sn) return null;
              const s = outP(sn), dx = Math.max(60, Math.abs(mouse.x - s.x) * 0.4);
              return e("path", { d: `M${s.x},${s.y} C${s.x+dx},${s.y} ${mouse.x-dx},${mouse.y} ${mouse.x},${mouse.y}`, stroke: T.teal, strokeWidth: 1.5, strokeDasharray: "6,3", fill: "none" });
            })()
          ),
          ...nodes.map(node =>
            e(CNode, {
              key: node.id, node, selected: sel === node.id, isConn: !!conn, isSource: conn?.src === node.id,
              onDragStart: ev => startDrag(ev, node.id),
              onPortClick: ev => startConn(ev, node.id),
              onNodeClick: ev => {
                if (conn) {
                  if (conn.src === node.id) { ev.stopPropagation(); setConn(null); }
                  else finishConn(ev, node.id);
                } else { ev.stopPropagation(); setSel(node.id); }
              },
            })
          )
        ),
        /* connecting hint */
        conn && e("div", {
          style: {
            position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)",
            background: T.ink, color: "#fff", padding: "7px 16px", borderRadius: 20,
            fontSize: 12, fontWeight: 600, fontFamily: T.font, zIndex: 15,
            display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
            boxShadow: "0 8px 20px -8px rgba(0,0,0,.4)",
          }
        },
          e("i", { className: "ti ti-arrow-guide", "aria-hidden": "true", style: { fontSize: 14 } }),
          "Clique em outro nó para conectar",
          e("span", { style: { opacity: 0.55, fontWeight: 500 } }, "· Esc ou clique fora para cancelar")
        ),
        /* zoom controls */
        e("div", { style: { position: "absolute", bottom: 12, left: 12, display: "flex", flexDirection: "column", gap: 3, zIndex: 10 } },
          ...["ti-plus","ti-minus","ti-maximize"].map((icon, i) =>
            e("button", {
              key: icon,
              onClick: [
                () => setZoom(z => Math.min(2.5, z * 1.2)),
                () => setZoom(z => Math.max(0.2, z / 1.2)),
                () => { setZoom(0.82); setPan({ x: 20, y: 16 }); },
              ][i],
              style: { width: 28, height: 28, background: "#fff", border: `0.5px solid ${T.border}`, borderRadius: 6, color: T.muted, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" },
            },
              e("i", { className: `ti ${icon}`, "aria-hidden": "true", style: { fontSize: 13 } })
            )
          ),
          e("div", { style: { textAlign: "center", fontSize: 9, color: T.muted, fontFamily: T.font } }, `${Math.round(zoom * 100)}%`)
        ),
        e(Minimap, { nodes, edges, sel, pan, zoom, containerRef: ref }),
        conn && e("div", { style: { position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", background: `${T.teal}14`, color: T.teal, padding: "4px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700, zIndex: 20, border: `0.5px solid ${T.teal}40`, whiteSpace: "nowrap", fontFamily: T.font } },
          e("i", { className: "ti ti-arrows-join", "aria-hidden": "true", style: { fontSize: 11, marginRight: 6 } }),
          "Clique em um nó para conectar · ESC cancela"
        )
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   TAB MANAGER
════════════════════════════════════════════ */
const WORKFLOW_TABS = [
  { id: "builder",   icon: "ti-layout-kanban", lbl: "Builder"   },
  { id: "workflows", icon: "ti-list",           lbl: "Fluxos" },
  { id: "logs",      icon: "ti-terminal-2",     lbl: "Logs"      },
  { id: "analytics", icon: "ti-chart-bar",      lbl: "Analytics" },
];

function WorkflowWidget({ tab, setTab, editFlowId, setEditFlowId }) {
  const handleEdit = (id) => {
    setEditFlowId(id);
    setTab("builder");
  };

  return (
    <div style={{ flex: 1, width: "100%", height: "100%", display: "flex", overflow: "hidden", position: "relative", background: "#fff", borderRadius: 10, border: `0.5px solid ${T.border}` }}>
      {tab === "builder"   && <BuilderCanvas flowId={editFlowId} onFlowIdChange={setEditFlowId} />}
      {tab === "workflows" && <WFView onEdit={handleEdit} />}
      {tab === "logs"      && <LogView />}
      {tab === "analytics" && <AnaView />}
    </div>
  );
}

/* ════════════════════════════════════════════
   PAGE WRAPPER (sidebar + content)
════════════════════════════════════════════ */
export default function WorkflowBuilderPage() {
  const [collapsed, setCollapsed]   = useState(false);
  const [tab, setTab]               = useState("workflows");
  const [editFlowId, setEditFlowId] = useState(null);
  const sidebarW = collapsed ? 64 : 240;

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: T.font, background: T.bg }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');*{box-sizing:border-box;}::-webkit-scrollbar{width:6px;height:6px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:#B3BFCA;border-radius:99px;}`}</style>

      {/* sidebar — colapsável para dar mais espaço ao canvas do builder */}
      <div style={{ width: sidebarW, flexShrink: 0, background: T.sidebarBg, display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0, transition: "width 0.15s", overflow: "visible" }}>

        {/* Brand */}
        <div style={{ padding: collapsed ? "20px 8px 0" : "20px 20px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 20, borderBottom: "1px solid rgba(255,255,255,.08)", marginBottom: 16, justifyContent: collapsed ? "center" : "flex-start" }}>
            <div style={{ width: 32, height: 32, background: "white", borderRadius: 8, display: "grid", placeItems: "center", flexShrink: 0 }}>
              <img src="/icone.png" alt="" style={{ width: 22, height: 22 }} />
            </div>
            {!collapsed && <>
              <span style={{ fontFamily: T.head, fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "white" }}>vantari</span>
              <span style={{ marginLeft: "auto", fontSize: 10, background: "rgba(255,255,255,.12)", padding: "3px 8px", borderRadius: 6, letterSpacing: "0.08em", fontWeight: 600, color: "rgba(255,255,255,.85)" }}>PRO</span>
            </>}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0 0 8px" }}>
          <NavSection label="Principal" collapsed={collapsed} />
          <NavItem icon={BarChart2}      label="Analytics"       path="/dashboard"    collapsed={collapsed} />
          <NavItem icon={Users}          label="Leads"           path="/leads"        collapsed={collapsed} />
          <NavItem icon={Mail}           label="Email Marketing" path="/email"        collapsed={collapsed} />
          <NavSection label="CRM" collapsed={collapsed} />
          <NavItem icon={Briefcase} label="Negócios" path="/crm" collapsed={collapsed} />
          <NavItem icon={Building2} label="Empresas" path="/empresas" collapsed={collapsed} />
          <NavItem icon={Activity} label="Atividades" path="/activities" collapsed={collapsed} />
          <NavItem icon={ListChecks} label="Tarefas" path="/tasks" collapsed={collapsed} />
          <NavItem icon={AlertTriangle} label="Em Risco" path="/risco" collapsed={collapsed} />
          <NavSection label="Ferramentas" collapsed={collapsed} />
          <NavItem icon={Star}           label="Scoring"         path="/scoring"      collapsed={collapsed} />
          <NavItem icon={LayoutTemplate} label="Landing Pages"   path="/landing"      collapsed={collapsed} />
          <NavItem icon={Filter}         label="Segmentações"    path="/segments"     collapsed={collapsed} />
          <NavItem icon={Bot}            label="IA & Automação"  path="/ai-marketing" collapsed={collapsed} />
          <NavItem icon={Zap}            label="Automação de Marketing" path="/workflow" active collapsed={collapsed} />
          <NavSection label="Sistema" collapsed={collapsed} />
          <NavItem icon={Plug}           label="Integrações"     path="/integrations" collapsed={collapsed} />
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "8px 0" }}>
          <AccountMenu collapsed={collapsed} />
          <NavItem icon={Settings}       label="Configurações"   path="/settings"     collapsed={collapsed} />
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "8px 0" }}>
          <div
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
            style={{ display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-end", gap: 6, padding: collapsed ? "8px 0" : "8px 20px", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", cursor: "pointer", fontFamily: T.font }}
          >
            {collapsed ? <ChevronRight size={16} aria-hidden="true" /> : <><span>Recolher</span><ChevronLeft size={16} aria-hidden="true" /></>}
          </div>
        </div>
      </div>

      {/* main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "16px 24px", borderBottom: `1px solid ${T.border}`, background: T.surface, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontFamily: T.head, fontSize: 20, fontWeight: 700, color: T.ink, margin: 0, letterSpacing: "-0.02em" }}>Automação de Marketing</h1>
            <p style={{ fontSize: 12.5, color: T.muted, margin: "3px 0 0", fontFamily: T.font }}>Crie e gerencie fluxos de automação de marketing</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 2, background: T.bg, padding: 4, borderRadius: 10, border: `0.5px solid ${T.border}` }}>
            {WORKFLOW_TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ background: tab === t.id ? "#fff" : "none", boxShadow: tab === t.id ? "0 1px 0 rgba(14,26,36,.03), 0 4px 12px -6px rgba(14,26,36,.15)" : "none", border: "none", borderRadius: 7, padding: "7px 14px", fontSize: 12.5, fontWeight: tab === t.id ? 700 : 600, fontFamily: T.font, color: tab === t.id ? T.teal : T.muted, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", transition: "all 0.15s" }}>
                <i className={`ti ${t.icon}`} aria-hidden="true" style={{ fontSize: 14 }} /> {t.lbl}
              </button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, padding: 16, overflow: "hidden", display: "flex", background: T.bg }}>
          <WorkflowWidget tab={tab} setTab={setTab} editFlowId={editFlowId} setEditFlowId={setEditFlowId} />
        </div>
      </div>
    </div>
  );
}
