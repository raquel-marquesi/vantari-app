import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabase";
import {
  Users, Plus, Search, Filter, ChevronDown, X, Edit2, Trash2,
  Mail, Phone, Building2, Tag, TrendingUp, Star, AlertCircle,
  CheckCircle, Clock, BarChart2, Home, Settings, Zap, Globe,
  Layout, MessageSquare, LogOut, Loader2
} from "lucide-react";

// ─── Design tokens ───────────────────────────────────────────────
const T = {
  bg: "#f2f5f8",
  surface: "#fff",
  primary: "#0079a9",
  accent: "#05b27b",
  text: "#5f5f64",
  muted: "#888891",
  danger: "#e53935",
  border: "#e8edf2",
};

// ─── Score badge ─────────────────────────────────────────────────
const scoreBadge = (score) => {
  if (score >= 100) return { label: "Sales Ready", color: "#7c3aed", bg: "#f3e8ff" };
  if (score >= 51)  return { label: "Hot",         color: "#e53935", bg: "#ffeaea" };
  if (score >= 21)  return { label: "Warm",        color: "#f59e0b", bg: "#fff8e1" };
  return               { label: "Cold",        color: "#888891", bg: "#f2f5f8" };
};

const stageBadge = (stage) => {
  const map = {
    Visitor:     { color: T.muted,    bg: "#f2f5f8"  },
    Lead:        { color: "#0079a9",  bg: "#e0f4ff"  },
    MQL:         { color: "#7c3aed",  bg: "#f3e8ff"  },
    SQL:         { color: "#f59e0b",  bg: "#fff8e1"  },
    Opportunity: { color: "#05b27b",  bg: "#e6faf3"  },
    Customer:    { color: "#059669",  bg: "#d1fae5"  },
  };
  return map[stage] || { color: T.muted, bg: T.bg };
};

// ─── Sidebar ──────────────────────────────────────────────────────
const navItems = [
  { icon: Home,         label: "Dashboard",      path: "/dashboard"    },
  { icon: Users,        label: "Leads",          path: "/leads"        },
  { icon: TrendingUp,   label: "Scoring",        path: "/scoring"      },
  { icon: Mail,         label: "E-mail",         path: "/email"        },
  { icon: Layout,       label: "Landing Pages",  path: "/landing"      },
  { icon: Zap,          label: "IA Marketing",   path: "/ai-marketing" },
  { icon: Globe,        label: "Integrações",    path: "/integrations" },
  { icon: BarChart2,    label: "Relatórios",     path: "/reports"      },
  { icon: Settings,     label: "Configurações",  path: "/settings"     },
];

function Sidebar({ active }) {
  const navigate = useNavigate();
  return (
    <aside style={{
      width: 220, minHeight: "100vh", background: T.surface,
      borderRight: `1px solid ${T.border}`, display: "flex",
      flexDirection: "column", padding: "24px 0", position: "fixed",
      top: 0, left: 0, zIndex: 10,
    }}>
      <div style={{ padding: "0 24px 28px", fontFamily: "Montserrat, sans-serif" }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: T.primary, letterSpacing: -0.5 }}>
          van<span style={{ color: T.accent }}>tari</span>
        </span>
      </div>
      <nav style={{ flex: 1 }}>
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = active === path;
          return (
            <button key={path} onClick={() => navigate(path)} style={{
              display: "flex", alignItems: "center", gap: 10,
              width: "100%", padding: "10px 24px", border: "none",
              background: isActive ? "#e8f4fb" : "transparent",
              borderLeft: isActive ? `3px solid ${T.primary}` : "3px solid transparent",
              color: isActive ? T.primary : T.text,
              fontFamily: "Montserrat, sans-serif", fontWeight: isActive ? 600 : 400,
              fontSize: 13, cursor: "pointer", textAlign: "left", transition: "all .15s",
            }}>
              <Icon size={16} />
              {label}
            </button>
          );
        })}
      </nav>
      <button onClick={() => navigate("/login")} style={{
        display: "flex", alignItems: "center", gap: 10, margin: "0 16px",
        padding: "10px 12px", border: "none", background: "transparent",
        color: T.muted, fontSize: 13, cursor: "pointer", borderRadius: 8,
        fontFamily: "Montserrat, sans-serif",
      }}>
        <LogOut size={15} /> Sair
      </button>
    </aside>
  );
}

// ─── Modal de lead ────────────────────────────────────────────────
const STAGES = ["Visitor", "Lead", "MQL", "SQL", "Opportunity", "Customer"];
const EMPTY = { name: "", email: "", phone: "", company: "", source: "", stage: "Lead", tags: "" };

function LeadModal({ lead, onClose, onSave }) {
  const [form, setForm] = useState(
    lead
      ? { ...lead, tags: (lead.tags || []).join(", ") }
      : EMPTY
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.email) { setError("E-mail obrigatório."); return; }
    setSaving(true); setError(null);

    const payload = {
      name:    form.name    || null,
      email:   form.email.trim().toLowerCase(),
      phone:   form.phone   || null,
      company: form.company || null,
      source:  form.source  || null,
      stage:   form.stage,
      tags:    form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
    };

    let err;
    if (lead?.id) {
      ({ error: err } = await supabase.from("leads").update(payload).eq("id", lead.id));
    } else {
      ({ error: err } = await supabase.from("leads").insert(payload));
    }

    setSaving(false);
    if (err) { setError(err.message); return; }
    onSave();
  };

  const field = (label, key, type = "text", placeholder = "") => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: T.text, display: "block", marginBottom: 4 }}>
        {label}
      </label>
      <input
        type={type}
        value={form[key] || ""}
        onChange={e => set(key, e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", padding: "8px 12px", border: `1px solid ${T.border}`,
          borderRadius: 8, fontSize: 13, color: T.text, outline: "none",
          fontFamily: "'Aptos', 'Nunito Sans', sans-serif", boxSizing: "border-box",
          background: T.surface,
        }}
      />
    </div>
  );

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.35)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100,
    }}>
      <div style={{
        background: T.surface, borderRadius: 16, width: 480, maxWidth: "90vw",
        boxShadow: "0 20px 60px rgba(0,0,0,.15)", overflow: "hidden",
      }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 15, color: T.text }}>
            {lead ? "Editar Lead" : "Novo Lead"}
          </span>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: T.muted }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          {field("Nome", "name", "text", "Nome completo")}
          {field("E-mail *", "email", "email", "email@empresa.com")}
          {field("Telefone", "phone", "text", "(11) 99999-9999")}
          {field("Empresa", "company", "text", "Nome da empresa")}
          {field("Fonte", "source", "text", "landing_page, google_ads...")}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: T.text, display: "block", marginBottom: 4 }}>
              Estágio
            </label>
            <select
              value={form.stage}
              onChange={e => set("stage", e.target.value)}
              style={{
                width: "100%", padding: "8px 12px", border: `1px solid ${T.border}`,
                borderRadius: 8, fontSize: 13, color: T.text, background: T.surface,
                fontFamily: "'Aptos', 'Nunito Sans', sans-serif",
              }}
            >
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {field("Tags", "tags", "text", "tag1, tag2, tag3")}

          {error && (
            <div style={{ display: "flex", gap: 6, alignItems: "center", color: T.danger, fontSize: 12, marginBottom: 8 }}>
              <AlertCircle size={13} /> {error}
            </div>
          )}
        </div>
        <div style={{ padding: "12px 24px 20px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            padding: "9px 18px", border: `1px solid ${T.border}`, borderRadius: 8,
            background: "transparent", color: T.text, fontSize: 13, cursor: "pointer",
          }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} style={{
            padding: "9px 20px", border: "none", borderRadius: 8,
            background: T.primary, color: "#fff", fontSize: 13, fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6,
            opacity: saving ? .7 : 1,
          }}>
            {saving ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Salvando…</> : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Painel lateral de detalhes ───────────────────────────────────
function LeadPanel({ lead, onClose, onEdit, onDelete }) {
  const score = scoreBadge(lead.score || 0);
  const stage = stageBadge(lead.stage);

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, width: 340, height: "100vh",
      background: T.surface, borderLeft: `1px solid ${T.border}`,
      boxShadow: "-8px 0 32px rgba(0,0,0,.08)", zIndex: 20,
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "Montserrat,sans-serif", fontWeight: 700, fontSize: 14, color: T.text }}>Detalhes</span>
        <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: T.muted }}><X size={17} /></button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {/* Avatar + nome */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%", background: T.primary,
            color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "Montserrat,sans-serif", fontWeight: 700, fontSize: 18,
          }}>
            {(lead.name || lead.email || "?")[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: T.text, fontSize: 15, fontFamily: "Montserrat,sans-serif" }}>{lead.name || "—"}</div>
            <div style={{ fontSize: 12, color: T.muted }}>{lead.email}</div>
          </div>
        </div>

        {/* Score + Stage */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: score.bg, color: score.color }}>
            ★ {lead.score || 0} — {score.label}
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, padding: "4px 10px", borderRadius: 20, background: stage.bg, color: stage.color }}>
            {lead.stage || "Visitor"}
          </span>
        </div>

        {/* Campos */}
        {[
          { icon: Phone,    label: "Telefone",  val: lead.phone    },
          { icon: Building2,label: "Empresa",   val: lead.company  },
          { icon: Star,     label: "Fonte",     val: lead.source   },
        ].map(({ icon: Icon, label, val }) => val && (
          <div key={label} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
            <Icon size={14} color={T.muted} />
            <div>
              <div style={{ fontSize: 11, color: T.muted }}>{label}</div>
              <div style={{ fontSize: 13, color: T.text }}>{val}</div>
            </div>
          </div>
        ))}

        {/* Tags */}
        {lead.tags?.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
              <Tag size={11} /> Tags
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {lead.tags.map(t => (
                <span key={t} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, background: "#e0f4ff", color: T.primary, fontWeight: 600 }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div style={{ marginTop: 20, padding: 12, background: T.bg, borderRadius: 10 }}>
          <div style={{ fontSize: 11, color: T.muted, marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
            <Clock size={11} /> Histórico
          </div>
          <div style={{ fontSize: 12, color: T.text }}>
            Criado: {new Date(lead.created_at).toLocaleDateString("pt-BR")}<br />
            Atualizado: {new Date(lead.updated_at).toLocaleDateString("pt-BR")}
          </div>
        </div>

        {/* Custom fields */}
        {lead.custom_fields && Object.keys(lead.custom_fields).length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 8 }}>Campos customizados</div>
            {Object.entries(lead.custom_fields).map(([k, v]) => (
              <div key={k} style={{ fontSize: 12, color: T.text, marginBottom: 4 }}>
                <strong>{k}:</strong> {String(v)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ações */}
      <div style={{ padding: 16, borderTop: `1px solid ${T.border}`, display: "flex", gap: 8 }}>
        <button onClick={onEdit} style={{
          flex: 1, padding: "9px 0", border: `1px solid ${T.primary}`, borderRadius: 8,
          background: "transparent", color: T.primary, fontSize: 13, fontWeight: 600,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <Edit2 size={13} /> Editar
        </button>
        <button onClick={onDelete} style={{
          flex: 1, padding: "9px 0", border: `1px solid #fca5a5`, borderRadius: 8,
          background: "#fff5f5", color: T.danger, fontSize: 13, fontWeight: 600,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}>
          <Trash2 size={13} /> Excluir
        </button>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────
export default function LeadsModule() {
  const [leads, setLeads]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [stageFilter, setStageFilter] = useState("Todos");
  const [showModal, setShowModal] = useState(false);
  const [editLead, setEditLead]   = useState(null);
  const [selected, setSelected]   = useState(null);
  const [error, setError]         = useState(null);

  // Estatísticas rápidas
  const stats = {
    total:    leads.length,
    hot:      leads.filter(l => l.score >= 51).length,
    mql:      leads.filter(l => l.stage === "MQL").length,
    customer: leads.filter(l => l.stage === "Customer").length,
  };

  const fetchLeads = useCallback(async () => {
    setLoading(true); setError(null);
    let query = supabase.from("leads").select("*").order("created_at", { ascending: false });
    if (stageFilter !== "Todos") query = query.eq("stage", stageFilter);
    if (search.trim()) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
    const { data, error: err } = await query;
    setLoading(false);
    if (err) { setError(err.message); return; }
    setLeads(data || []);
  }, [search, stageFilter]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleDelete = async (id) => {
    if (!confirm("Excluir este lead?")) return;
    await supabase.from("leads").delete().eq("id", id);
    setSelected(null);
    fetchLeads();
  };

  const handleSaved = () => {
    setShowModal(false);
    setEditLead(null);
    fetchLeads();
  };

  const filtered = leads; // filtro já aplicado no Supabase

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, fontFamily: "'Aptos','Nunito Sans',sans-serif" }}>
      <Sidebar active="/leads" />

      {/* Main */}
      <main style={{ marginLeft: 220, flex: 1, padding: 32, paddingRight: selected ? 360 : 32 }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: "Montserrat,sans-serif", fontWeight: 800, fontSize: 22, color: T.text, margin: 0 }}>
              Leads
            </h1>
            <p style={{ fontSize: 13, color: T.muted, margin: "4px 0 0" }}>
              Gerencie e acompanhe sua base de contatos
            </p>
          </div>
          <button onClick={() => { setEditLead(null); setShowModal(true); }} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 18px",
            background: T.primary, color: "#fff", border: "none", borderRadius: 10,
            fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "Montserrat,sans-serif",
          }}>
            <Plus size={15} /> Novo Lead
          </button>
        </div>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Total de Leads", value: stats.total, icon: Users,        color: T.primary, bg: "#e0f4ff" },
            { label: "Leads Quentes",  value: stats.hot,   icon: TrendingUp,   color: "#e53935", bg: "#ffeaea" },
            { label: "MQLs",           value: stats.mql,   icon: Star,         color: "#7c3aed", bg: "#f3e8ff" },
            { label: "Clientes",       value: stats.customer, icon: CheckCircle, color: T.accent, bg: "#e6faf3" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} style={{ background: T.surface, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 1px 4px rgba(0,0,0,.05)" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={18} color={color} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: T.text, fontFamily: "Montserrat,sans-serif" }}>{value}</div>
                <div style={{ fontSize: 12, color: T.muted }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Busca + filtro */}
        <div style={{ display: "flex", gap: 12, marginBottom: 18, alignItems: "center" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: T.muted }} />
            <input
              placeholder="Buscar por nome, e-mail ou empresa…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%", padding: "9px 12px 9px 36px", border: `1px solid ${T.border}`,
                borderRadius: 10, fontSize: 13, color: T.text, background: T.surface,
                outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ position: "relative" }}>
            <select
              value={stageFilter}
              onChange={e => setStageFilter(e.target.value)}
              style={{
                padding: "9px 36px 9px 14px", border: `1px solid ${T.border}`, borderRadius: 10,
                fontSize: 13, color: T.text, background: T.surface, cursor: "pointer", appearance: "none",
              }}
            >
              <option value="Todos">Todos os estágios</option>
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown size={14} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: T.muted, pointerEvents: "none" }} />
          </div>
        </div>

        {/* Erro */}
        {error && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", color: T.danger, background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13 }}>
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {/* Tabela */}
        <div style={{ background: T.surface, borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.05)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: T.bg }}>
                {["Lead", "Empresa", "Estágio", "Score", "Tags", "Fonte", ""].map(h => (
                  <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: T.muted, fontFamily: "Montserrat,sans-serif", textTransform: "uppercase", letterSpacing: .5 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 48, color: T.muted }}>
                    <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 48, color: T.muted, fontSize: 14 }}>
                    Nenhum lead encontrado.
                  </td>
                </tr>
              ) : (
                filtered.map(lead => {
                  const sc = scoreBadge(lead.score || 0);
                  const st = stageBadge(lead.stage);
                  const isSelected = selected?.id === lead.id;
                  return (
                    <tr key={lead.id}
                      onClick={() => setSelected(isSelected ? null : lead)}
                      style={{
                        borderTop: `1px solid ${T.border}`,
                        background: isSelected ? "#f0f8ff" : "transparent",
                        cursor: "pointer", transition: "background .1s",
                      }}
                      onMouseEnter={e => !isSelected && (e.currentTarget.style.background = T.bg)}
                      onMouseLeave={e => !isSelected && (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: "50%", background: T.primary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                            {(lead.name || lead.email || "?")[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13, color: T.text }}>{lead.name || "—"}</div>
                            <div style={{ fontSize: 11, color: T.muted }}>{lead.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: T.text }}>{lead.company || "—"}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, background: st.bg, color: st.color }}>
                          {lead.stage || "Visitor"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: sc.bg, color: sc.color }}>
                          {lead.score || 0}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {(lead.tags || []).slice(0, 2).map(t => (
                            <span key={t} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "#e0f4ff", color: T.primary, fontWeight: 600 }}>{t}</span>
                          ))}
                          {(lead.tags || []).length > 2 && (
                            <span style={{ fontSize: 10, color: T.muted }}>+{lead.tags.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 12, color: T.muted }}>{lead.source || "—"}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <button
                          onClick={e => { e.stopPropagation(); setEditLead(lead); setShowModal(true); }}
                          style={{ border: "none", background: "transparent", cursor: "pointer", color: T.muted, padding: 4 }}
                        >
                          <Edit2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Contagem */}
        {!loading && (
          <div style={{ fontSize: 12, color: T.muted, marginTop: 12, textAlign: "right" }}>
            {filtered.length} lead{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
          </div>
        )}
      </main>

      {/* Painel lateral */}
      {selected && (
        <LeadPanel
          lead={selected}
          onClose={() => setSelected(null)}
          onEdit={() => { setEditLead(selected); setShowModal(true); }}
          onDelete={() => handleDelete(selected.id)}
        />
      )}

      {/* Modal */}
      {showModal && (
        <LeadModal
          lead={editLead}
          onClose={() => { setShowModal(false); setEditLead(null); }}
          onSave={handleSaved}
        />
      )}

      {/* CSS spinner */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
