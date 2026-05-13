import { useState, useRef, useEffect, useCallback, createElement, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabase";
import { Loader2, AlertCircle, BarChart2, Users, Mail, Star, LayoutTemplate, Bot, Plug, Settings, Zap } from "lucide-react";
import "@tabler/icons-webfont/dist/tabler-icons.min.css";

/* ─── design tokens ─── */
const T = {
  blue:    "#0079a9",
  accent:  "#05b27b",
  danger:  "#e53935",
  sidebar: "linear-gradient(180deg,#0c2d48 0%,#0079a9 100%)",
  font:    "'Aptos','Nunito Sans',sans-serif",
  head:    "Montserrat,sans-serif",
  border:  "#e8edf2",
  bg:      "#f2f5f8",
  text:    "#5f5f64",
  muted:   "#888891",
};

/* ─── keyframes ─── */
const SPIN_CSS = `@keyframes spin{to{transform:rotate(360deg)}}`;

/* ─── sidebar ─── */
const NavItem = ({ icon: Icon, label, active = false, path }) => {
  const [hov, setHov] = useState(false);
  const navigate = useNavigate();
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => path && navigate(path)}
      style={{
        display: "flex", alignItems: "center", gap: 9,
        padding: "8px 20px", fontSize: 13,
        fontWeight: active ? 700 : 600, fontFamily: T.font,
        color: active ? "#fff" : hov ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.6)",
        background: active ? "rgba(255,255,255,0.18)" : hov ? "rgba(255,255,255,0.08)" : "transparent",
        borderRight: active ? "2px solid #fff" : "2px solid transparent",
        cursor: "pointer", transition: "all 0.15s", userSelect: "none",
      }}
    >
      {Icon && <Icon size={16} aria-hidden="true" />}{label}
    </div>
  );
};
const NavSection = ({ label }) => (
  <div style={{
    fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
    color: "rgba(255,255,255,0.45)", padding: "10px 20px 4px",
    textTransform: "uppercase", fontFamily: T.head,
  }}>{label}</div>
);

/* ════════════════════════════════════════════
   WORKFLOW BUILDER CANVAS
════════════════════════════════════════════ */
const NW = 200, NH = 68, CVW = 3000, CVH = 2000;
const NC = {
  trigger:   { label: "Trigger",   icon: "ti-bolt",        clr: "#185FA5", bg: "#E6F1FB", bdr: "#378ADD", tx: "#0C447C" },
  condition: { label: "Condition", icon: "ti-git-branch",  clr: "#854F0B", bg: "#FAEEDA", bdr: "#EF9F27", tx: "#633806" },
  action:    { label: "Ação",      icon: "ti-player-play", clr: "#0F6E56", bg: "#E1F5EE", bdr: "#1D9E75", tx: "#085041" },
  delay:     { label: "Delay",     icon: "ti-clock",       clr: "#993C1D", bg: "#FAECE7", bdr: "#D85A30", tx: "#4A1B0C" },
};
const TRIG = ["Form Submission","Tag Added","Tag Removed","Score Threshold","Email Opened","Email Clicked","Page Visit","Birthday","Days After Signup","Manual"];
const ACTS = ["Send Email","Add Tag","Remove Tag","Change Stage","Webhook POST"];

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
  { id: "n1", type: "trigger", x: 60, y: 200, label: "Form Submitted", cfg: { trigger: "Form Submission" } },
];
const BLANK_EDGES = [];

/* ── canvas node ── */
function CNode({ node, selected, isConn, onDragStart, onPortClick, onNodeClick }) {
  const [hov, setHov] = useState(false);
  const c = NC[node.type];
  const e = createElement;
  return e("div", {
    style: { position: "absolute", left: node.x, top: node.y, width: NW, height: NH, zIndex: selected ? 10 : 1, userSelect: "none" },
    onMouseEnter: () => setHov(true), onMouseLeave: () => setHov(false),
    onMouseDown: onDragStart, onClick: onNodeClick,
  },
    e("div", {
      style: {
        width: "100%", height: "100%",
        background: selected ? c.bg : "#fff",
        border: `1.5px solid ${selected || hov ? c.bdr : T.border}`,
        borderLeft: `3px solid ${c.bdr}`,
        borderRadius: 8,
        display: "flex", alignItems: "center", gap: 10, padding: "0 12px",
        cursor: isConn ? "pointer" : "grab", transition: "border-color .1s,background .1s",
        boxShadow: selected ? `0 0 0 3px ${c.bdr}28` : "0 1px 4px rgba(0,0,0,.05)",
      }
    },
      e("i", { className: `ti ${c.icon}`, "aria-hidden": "true", style: { fontSize: 17, color: c.clr, flexShrink: 0 } }),
      e("div", { style: { overflow: "hidden", flex: 1 } },
        e("div", { style: { fontSize: 9, fontWeight: 700, color: c.tx, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 2, fontFamily: T.head } }, c.label),
        e("div", { style: { fontSize: 12, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: T.font } }, node.label)
      )
    ),
    e("div", {
      className: "nport", onClick: onPortClick,
      style: { position: "absolute", right: -7, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, borderRadius: "50%", background: c.bdr, border: "2.5px solid #fff", cursor: "crosshair", zIndex: 5 }
    }),
    e("div", {
      style: { position: "absolute", left: -6, top: "50%", transform: "translateY(-50%)", width: 12, height: 12, borderRadius: "50%", background: T.border, border: "2px solid #fff", zIndex: 5 }
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
      e("rect", { x: (-pan.x / zoom) * sc + 6, y: (-pan.y / zoom) * sc + 6, width: (sz[0] / zoom) * sc, height: (sz[1] / zoom) * sc, fill: "none", stroke: T.blue, strokeWidth: 1, opacity: 0.7 })
    ),
    e("span", { style: { position: "absolute", top: 3, left: 6, fontSize: 8, color: T.muted, letterSpacing: ".05em", fontFamily: T.font } }, "MAP")
  );
}

/* ── palette ── */
function Palette() {
  const e = createElement;
  return e("div", { style: { padding: 10 } },
    e("div", { style: { fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8, padding: "0 2px", fontFamily: T.head } }, "Elementos"),
    ...Object.entries(NC).map(([type, c]) =>
      e("div", {
        key: type, draggable: true,
        onDragStart: ev => ev.dataTransfer.setData("type", type),
        style: { display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", marginBottom: 4, borderRadius: 8, border: `0.5px solid ${T.border}`, background: T.bg, cursor: "grab" },
      },
        e("i", { className: `ti ${c.icon}`, "aria-hidden": "true", style: { fontSize: 15, color: c.clr } }),
        e("div", null,
          e("div", { style: { fontSize: 12, fontWeight: 600, color: T.text, fontFamily: T.font } }, c.label),
          e("div", { style: { fontSize: 10, color: T.muted, fontFamily: T.font } }, { trigger: "Evento inicial", condition: "Se/senão", action: "Executar", delay: "Aguardar" }[type])
        )
      )
    ),
    e("div", { style: { fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".08em", margin: "12px 2px 7px", fontFamily: T.head } }, "Triggers"),
    ...TRIG.slice(0, 7).map(t =>
      e("div", {
        key: t, draggable: true,
        onDragStart: ev => ev.dataTransfer.setData("type", "trigger"),
        style: { padding: "5px 8px", fontSize: 11, color: T.muted, cursor: "grab", borderRadius: 4, fontFamily: T.font },
      },
        e("i", { className: "ti ti-bolt", "aria-hidden": "true", style: { fontSize: 10, marginRight: 5, color: NC.trigger.clr } }), t
      )
    )
  );
}

/* ── node config panel ── */
function NodeConfig({ node, onChange, onClose, onDelete }) {
  const c = NC[node.type];
  const e = createElement;
  const fld = (lbl, child) => e("div", { style: { marginBottom: 9 } },
    e("label", { style: { fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 4, fontFamily: T.head } }, lbl),
    child
  );
  const inpStyle = { width: "100%", boxSizing: "border-box", padding: "6px 8px", fontSize: 12, border: `1px solid ${T.border}`, borderRadius: 6, outline: "none", fontFamily: T.font, color: T.text };
  const inp = (k, ph) => e("input", { value: node.cfg?.[k] || "", placeholder: ph || "", style: inpStyle, onChange: ev => onChange({ cfg: { ...node.cfg, [k]: ev.target.value } }) });
  const sel = (k, opts) => e("select", { value: node.cfg?.[k] || "", style: inpStyle, onChange: ev => onChange({ cfg: { ...node.cfg, [k]: ev.target.value } }) },
    e("option", { value: "" }, "— selecionar —"),
    ...opts.map(o => e("option", { key: o, value: o }, o))
  );
  return e("div", { style: { padding: 12 } },
    e("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 } },
      e("div", { style: { display: "flex", alignItems: "center", gap: 6 } },
        e("i", { className: `ti ${c.icon}`, "aria-hidden": "true", style: { fontSize: 14, color: c.clr } }),
        e("span", { style: { fontSize: 12, fontWeight: 700, color: c.tx, fontFamily: T.head } }, c.label)
      ),
      e("button", { onClick: onClose, style: { background: "none", border: "none", color: T.muted, padding: 2, cursor: "pointer" } },
        e("i", { className: "ti ti-x", "aria-hidden": "true", style: { fontSize: 13 } })
      )
    ),
    fld("Label", e("input", { value: node.label, style: inpStyle, onChange: ev => onChange({ label: ev.target.value }) })),
    node.type === "trigger" && e(Fragment, null,
      fld("Tipo", sel("trigger", TRIG)),
      node.cfg?.trigger === "Form Submission" && fld("Formulário", inp("form", "Contact Form")),
      node.cfg?.trigger === "Score Threshold" && fld("Score ≥", inp("score", "50")),
      node.cfg?.trigger === "Page Visit"       && fld("URL contém", inp("url", "/pricing")),
      node.cfg?.trigger === "Days After Signup"&& fld("Dias", inp("days", "7")),
      node.cfg?.trigger === "Tag Added"        && fld("Tag", inp("tag", "hot-lead")),
    ),
    node.type === "condition" && e(Fragment, null,
      fld("Campo",    sel("field", ["score","tag","stage","email","source","country"])),
      fld("Operador", sel("op",    ["=","≠",">","<","≥","≤","contains","starts_with"])),
      fld("Valor",    inp("value", "50")),
    ),
    node.type === "action" && e(Fragment, null,
      fld("Ação", sel("action", ACTS)),
      node.cfg?.action === "Send Email"  && fld("Template", inp("template", "welcome_v2")),
      (node.cfg?.action === "Add Tag" || node.cfg?.action === "Remove Tag") && fld("Tag", inp("tag", "nurture")),
      node.cfg?.action === "Change Stage"  && fld("Stage", sel("stage", ["lead","mql","sql","opportunity","customer"])),
      node.cfg?.action === "Webhook POST"  && fld("URL", inp("url", "https://")),
    ),
    node.type === "delay" && e(Fragment, null,
      fld("Quantidade", inp("amount", "3")),
      fld("Unidade",    sel("unit",   ["minutes","hours","days","weeks"])),
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
      .insert({ name: "Novo Workflow", status: "draft", definition: { nodes: BLANK_NODES, edges: BLANK_EDGES } })
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
    active: { bg: "#e6f9f2", cl: "#05b27b" },
    paused: { bg: "#fff4e6", cl: "#e07b00" },
    draft:  { bg: "#f2f5f8", cl: "#888891" },
  }[s] || { bg: "#f2f5f8", cl: "#888891" });

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24, background: "#fff" }}>
      <style>{SPIN_CSS}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px", fontFamily: T.head, color: T.text }}>Workflows</h2>
          <p style={{ fontSize: 13, color: T.muted, margin: 0, fontFamily: T.font }}>
            {loading ? "Carregando..." : `${flows.length} workflow${flows.length !== 1 ? "s" : ""} · ${flows.filter(f => f.status === "active").length} ativo${flows.filter(f => f.status === "active").length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button onClick={handleNew} disabled={creating} style={{ display: "flex", alignItems: "center", gap: 6, background: T.blue, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: creating ? "not-allowed" : "pointer", opacity: creating ? 0.7 : 1, fontFamily: T.font }}>
          {creating
            ? <Loader2 size={14} style={{ animation: "spin 0.7s linear infinite" }} />
            : <i className="ti ti-plus" style={{ fontSize: 13 }} />
          }
          Novo Workflow
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
          <span style={{ fontFamily: T.font, fontSize: 14 }}>Carregando workflows...</span>
        </div>
      ) : flows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: T.muted }}>
          <i className="ti ti-webhook" style={{ fontSize: 48, display: "block", marginBottom: 16, opacity: 0.4 }} />
          <p style={{ fontFamily: T.font, fontSize: 14, margin: "0 0 16px" }}>Nenhum workflow criado ainda.</p>
          <button onClick={handleNew} style={{ background: T.blue, color: "#fff", border: "none", borderRadius: 8, padding: "8px 20px", fontSize: 13, cursor: "pointer", fontFamily: T.font, fontWeight: 700 }}>Criar primeiro workflow</button>
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
                    {wf.status}
                  </span>
                </div>
                <div style={{ fontFamily: T.font, fontSize: 12, color: T.muted }}>{updatedAt}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => onEdit(wf.id)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: "none", border: `1px solid ${T.border}`, color: T.text, cursor: "pointer", fontFamily: T.font }}>Editar</button>
                  <button onClick={() => handleToggle(wf)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, background: wf.status === "active" ? "#fff4e6" : "#e6f9f2", border: "none", color: wf.status === "active" ? "#e07b00" : T.accent, cursor: "pointer", fontFamily: T.font, fontWeight: 700 }}>
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
        .select("id, step, status, created_at, log, automation_flows(name), leads(email)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (err) setError(err.message);
      else setRuns(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = filter === "all" ? runs : runs.filter(r => r.status === filter);
  const statusStyle = (s) => ({
    success: { bg: "#e6f9f2", cl: "#05b27b" },
    error:   { bg: "#fef2f2", cl: T.danger  },
    waiting: { bg: "#fff4e6", cl: "#e07b00" },
  }[s] || { bg: T.bg, cl: T.muted });

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24, background: "#fff" }}>
      <style>{SPIN_CSS}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px", fontFamily: T.head, color: T.text }}>Logs de Execução</h2>
          <p style={{ fontSize: 13, color: T.muted, margin: 0, fontFamily: T.font }}>Últimas 100 execuções</p>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["all","success","error","waiting"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: "5px 12px", fontSize: 11, borderRadius: 20, fontWeight: filter === f ? 700 : 600, background: filter === f ? T.blue : "none", color: filter === f ? "#fff" : T.muted, border: filter === f ? "none" : `1px solid ${T.border}`, cursor: "pointer", fontFamily: T.font }}>
              {f === "all" ? "Todos" : f}
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
            {runs.length === 0 ? "Nenhuma execução registrada ainda. Ative um workflow para começar." : `Nenhum log com status "${filter}".`}
          </p>
        </div>
      ) : (
        <div style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "130px 1fr 1fr 1fr 80px", padding: "9px 16px", background: T.bg, fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: ".06em", fontFamily: T.head }}>
            {["Hora","Lead","Workflow","Step","Status"].map((h, i) => <span key={i}>{h}</span>)}
          </div>
          {filtered.map((run, i) => {
            const s = statusStyle(run.status);
            const time = new Date(run.created_at).toLocaleTimeString("pt-BR");
            return (
              <div key={run.id} style={{ display: "grid", gridTemplateColumns: "130px 1fr 1fr 1fr 80px", padding: "11px 16px", borderTop: `1px solid ${T.border}`, alignItems: "center", fontSize: 12, background: i % 2 ? T.bg : "#fff", fontFamily: T.font }}>
                <div style={{ color: T.muted, fontSize: 11 }}>{time}</div>
                <div style={{ color: T.blue, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{run.leads?.email || "—"}</div>
                <div style={{ color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{run.automation_flows?.name || "—"}</div>
                <div style={{ color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{run.step || "—"}</div>
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: s.bg, color: s.cl, fontWeight: 700 }}>{run.status}</span>
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
        success:  runs.filter(r => r.status === "success").length,
        errors:   runs.filter(r => r.status === "error").length,
        waiting:  runs.filter(r => r.status === "waiting").length,
        active:   allFlows.filter(f => f.status === "active").length,
        paused:   allFlows.filter(f => f.status === "paused").length,
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
    { lbl: "Total Execuções",  val: kpis.total,   sub: `${kpis.success} sucesso · ${kpis.errors} erro`, icon: "ti-chart-bar", cl: T.blue   },
    { lbl: "Workflows Ativos", val: kpis.active,  sub: `${kpis.paused} pausado · ${kpis.draft} rascunho`, icon: "ti-webhook",   cl: T.accent },
    { lbl: "Erros",            val: kpis.errors,  sub: kpis.total > 0 ? `${((kpis.errors/kpis.total)*100).toFixed(1)}% error rate` : "—", icon: "ti-alert-circle", cl: T.danger },
    { lbl: "Em Espera",        val: kpis.waiting, sub: "aguardando condição",  icon: "ti-clock",  cl: "#e07b00" },
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
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 16px", fontFamily: T.head, color: T.text }}>Workflows</h3>
          {flows.map(f => {
            const statusCl = { active: T.accent, paused: "#e07b00", draft: T.muted }[f.status] || T.muted;
            return (
              <div key={f.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: T.text, fontFamily: T.font }}>{f.name}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: statusCl, fontFamily: T.font }}>{f.status}</span>
              </div>
            );
          })}
        </div>
      )}

      {flows.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: T.muted }}>
          <i className="ti ti-chart-bar" style={{ fontSize: 40, display: "block", marginBottom: 12, opacity: 0.3 }} />
          <p style={{ fontFamily: T.font, fontSize: 13 }}>Crie e ative workflows para ver analytics aqui.</p>
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
  const [wfName, setWfName]   = useState("Novo Workflow");
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
  const ref = useRef(null);

  /* load flow when flowId changes */
  useEffect(() => {
    if (!flowId) {
      setNodes(BLANK_NODES); setEdges(BLANK_EDGES);
      setWfName("Novo Workflow"); setWfStatus("draft"); setSaved(true);
      return;
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
  }, [flowId]);

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
  nodesRef.current  = nodes;
  edgesRef.current  = edges;
  nameRef.current   = wfName;
  flowIdRef.current = flowId;

  useEffect(() => {
    if (saved) return;
    const t = setTimeout(() => {
      saveFlow(nodesRef.current, edgesRef.current, nameRef.current, flowIdRef.current);
    }, 1500);
    return () => clearTimeout(t);
  }, [saved, saveFlow]);

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
    const cp = toC(e.clientX, e.clientY);
    setNodes(ns => [...ns, { id: uid(), type, x: cp.x - NW / 2, y: cp.y - NH / 2, label: NC[type].label, cfg: {} }]);
    setSaved(false);
  }, [toC]);

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
      <span style={{ fontFamily: T.font, fontSize: 14 }}>Carregando workflow...</span>
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
        <span style={{ fontSize: 11, color: saving ? "#e07b00" : saved ? T.accent : "#e07b00", fontFamily: T.font, minWidth: 64 }}>
          {saving ? "Salvando…" : saved ? "✓ Salvo" : "Não salvo"}
        </span>
        <button
          onClick={handleStatusToggle}
          disabled={!flowId}
          style={{ background: wfStatus === "active" ? "#fff4e6" : T.blue, color: wfStatus === "active" ? "#e07b00" : "#fff", border: "none", borderRadius: 8, padding: "5px 14px", fontSize: 12, fontWeight: 700, cursor: flowId ? "pointer" : "not-allowed", opacity: flowId ? 1 : 0.5, fontFamily: T.font }}
        >
          {wfStatus === "active" ? "⏸ Pausar" : "▶ Ativar"}
        </button>
      </div>

      {/* sidebar panel */}
      {e("div", { style: { width: 196, borderRight: `0.5px solid ${T.border}`, background: "#fff", overflow: "auto", flexShrink: 0 } },
        !selNode
          ? e(Palette, null)
          : e(NodeConfig, {
              node: selNode,
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
              return e("path", { d: `M${s.x},${s.y} C${s.x+dx},${s.y} ${mouse.x-dx},${mouse.y} ${mouse.x},${mouse.y}`, stroke: T.blue, strokeWidth: 1.5, strokeDasharray: "6,3", fill: "none" });
            })()
          ),
          ...nodes.map(node =>
            e(CNode, {
              key: node.id, node, selected: sel === node.id, isConn: !!conn,
              onDragStart: ev => startDrag(ev, node.id),
              onPortClick: ev => startConn(ev, node.id),
              onNodeClick: ev => { conn ? finishConn(ev, node.id) : (ev.stopPropagation(), setSel(node.id)); },
            })
          )
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
        conn && e("div", { style: { position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", background: "#e8f5fb", color: T.blue, padding: "4px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700, zIndex: 20, border: `0.5px solid ${T.blue}40`, whiteSpace: "nowrap", fontFamily: T.font } },
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
function WorkflowWidget() {
  const [tab, setTab]           = useState("workflows");
  const [editFlowId, setEditFlowId] = useState(null);

  const handleEdit = (id) => {
    setEditFlowId(id);
    setTab("builder");
  };

  const TABS = [
    { id: "builder",   icon: "ti-layout-kanban", lbl: "Builder"   },
    { id: "workflows", icon: "ti-list",           lbl: "Workflows" },
    { id: "logs",      icon: "ti-terminal-2",     lbl: "Logs"      },
    { id: "analytics", icon: "ti-chart-bar",      lbl: "Analytics" },
  ];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", border: `0.5px solid ${T.border}`, borderRadius: 10, overflow: "hidden", background: "#fff" }}>
      {/* tab bar */}
      <div style={{ display: "flex", alignItems: "center", height: 46, borderBottom: `0.5px solid ${T.border}`, background: "#fff", padding: "0 14px", gap: 0, flexShrink: 0, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginRight: 20 }}>
          <i className="ti ti-webhook" aria-hidden="true" style={{ fontSize: 18, color: T.blue }} />
          <span style={{ fontWeight: 700, fontSize: 13, fontFamily: T.head, color: T.text }}>AutoFlow</span>
        </div>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ background: "none", border: "none", padding: "0 12px", height: "100%", fontSize: 12, fontWeight: tab === t.id ? 700 : 600, fontFamily: T.font, color: tab === t.id ? T.text : T.muted, borderBottom: tab === t.id ? `2px solid ${T.blue}` : "2px solid transparent", display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
            <i className={`ti ${t.icon}`} aria-hidden="true" style={{ fontSize: 14 }} /> {t.lbl}
          </button>
        ))}
      </div>

      {/* content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        {tab === "builder"   && <BuilderCanvas flowId={editFlowId} onFlowIdChange={setEditFlowId} />}
        {tab === "workflows" && <WFView onEdit={handleEdit} />}
        {tab === "logs"      && <LogView />}
        {tab === "analytics" && <AnaView />}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   PAGE WRAPPER (sidebar + content)
════════════════════════════════════════════ */
export default function WorkflowBuilderPage() {
  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: T.font, background: T.bg }}>
      {/* sidebar */}
      <div style={{ width: 220, flexShrink: 0, background: T.sidebar, display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0 }}>
        <div style={{ padding: "22px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontFamily: T.head, fontWeight: 800, fontSize: 20, color: "#fff", letterSpacing: "0.04em" }}>Vantari</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>Marketing Platform</div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", paddingTop: 8 }}>
          <NavSection label="Principal" />
          <NavItem icon={BarChart2}      label="Analytics"       path="/dashboard"    />
          <NavItem icon={Users}          label="Leads"           path="/leads"        />
          <NavItem icon={Mail}           label="Email Marketing" path="/email"        />
          <NavSection label="Ferramentas" />
          <NavItem icon={Star}           label="Scoring"         path="/scoring"      />
          <NavItem icon={LayoutTemplate} label="Landing Pages"   path="/landing"      />
          <NavItem icon={Bot}            label="IA & Automação"  path="/ai-marketing" />
          <NavItem icon={Zap}            label="Workflows"       path="/workflow" active />
          <NavSection label="Sistema" />
          <NavItem icon={Plug}           label="Integrações"     path="/integrations" />
          <NavItem icon={Settings}       label="Configurações"   path="/settings"     />
        </div>
      </div>

      {/* main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "20px 28px 16px", borderBottom: `1px solid ${T.border}`, background: "#fff", flexShrink: 0 }}>
          <h1 style={{ fontFamily: T.head, fontSize: 20, fontWeight: 700, color: T.text, margin: 0 }}>Automação de Workflows</h1>
          <p style={{ fontSize: 13, color: T.muted, margin: "4px 0 0", fontFamily: T.font }}>Crie e gerencie fluxos de automação de marketing</p>
        </div>
        <div style={{ flex: 1, padding: 24, overflow: "hidden", display: "flex" }}>
          <WorkflowWidget />
        </div>
      </div>
    </div>
  );
}
