import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSidebarCollapsed } from "./sidebar-collapsed";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabase";
import {
  BarChart2, Users, Mail, Star, LayoutTemplate, Bot, Plug, Settings, Briefcase,
  Loader2, AlertCircle, Building2, Zap, Filter, ChevronLeft, ChevronRight, LogOut,
  Activity, ListChecks, AlertTriangle, Inbox, Send, UserCheck, UserX, Search,
  Phone, IdCard, FileText, MessageCircle, Mic,
} from "lucide-react";

/* ───── DESIGN TOKENS (padrão Vantari) ───── */
const T = {
  teal: "#0D7491", blue: "#0D7491", green: "#14A273", brand2: "#1F76BC", deep: "#0A3D4D",
  gradient: "linear-gradient(135deg, #0D7491 0%, #14A273 100%)",
  sidebarBg: "linear-gradient(180deg, #0D7491 0%, #0A5165 60%, #0A3D4D 100%)",
  violet: "#7C5CFF", amber: "#F59E0B", coral: "#FF6B5E", red: "#FF6B5E", cyan: "#06B6D4",
  bg: "#F5F8FB", surface: "#FFFFFF", border: "#E8EEF3",
  ink: "#0E1A24", text: "#2E3D4B", muted: "#5A6B7A", faint3: "#8696A5", faint: "#F5F8FB",
  font: "'Inter', system-ui, sans-serif", head: "'Sora', system-ui, sans-serif", mono: "'JetBrains Mono', monospace",
};
const WORKSPACE_VANTARI = "53092199-7b75-4342-a897-f589d6f34922";

/* ─── helpers ─── */
function relTime(iso) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}
const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
const fmtCpf = (v) => { if (!v) return null; const d = String(v).replace(/\D/g, ""); return d.length === 11 ? `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}` : v; };
const initialOf = (name, phone) => (name ? name.trim().charAt(0) : (phone ? phone.replace(/\D/g, "").slice(-2, -1) : "?")).toUpperCase();
// placeholder que a Nina manda enquanto a transcrição do áudio não chega —
// detecta pra desenhar como "transcrevendo" em vez de texto normal
const isAudioProcessing = (body) => !!body && /\[?\s*áudio\s*-?\s*processando\s*transcri/i.test(body);
function mergeById(list, item) {
  const idx = list.findIndex((m) => m.id === item.id);
  if (idx === -1) return [...list, item];
  const copy = [...list];
  copy[idx] = item;
  return copy;
}

/* ─── Sidebar (padrão self-contained do projeto) ─── */
const NavSection = ({ label, collapsed = false }) => (
  collapsed ? <div style={{ height: 10 }} /> : (
    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.18em", color: "rgba(255,255,255,0.4)", padding: "10px 20px 4px", textTransform: "uppercase", fontFamily: T.head }}>
      {label}
    </div>
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
        position: "relative", display: "flex", alignItems: "center", gap: 9,
        padding: collapsed ? "8px 0" : "8px 20px", justifyContent: collapsed ? "center" : "flex-start",
        fontSize: 13.5, fontWeight: active ? 700 : 600, fontFamily: T.font,
        color: active ? "#fff" : hov ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.6)",
        background: active ? "rgba(255,255,255,0.10)" : hov ? "rgba(255,255,255,0.06)" : "transparent",
        cursor: "pointer", transition: "all 0.15s", userSelect: "none",
      }}>
      {active && (
        <span style={{ position: "absolute", left: 0, top: 6, bottom: 6, width: 3,
          background: "linear-gradient(180deg, #14A273 0%, #5EEAD4 100%)", borderRadius: "0 3px 3px 0" }} />
      )}
      {Icon && <Icon size={16} aria-hidden="true" />}
      {!collapsed && label}
    </div>
  );
};
function AccountMenu({ collapsed }) {
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setEmail(data?.user?.email || "")); }, []);
  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/login", { replace: true }); };
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
            <div onClick={handleLogout}
              onMouseEnter={ev => (ev.currentTarget.style.background = T.faint)}
              onMouseLeave={ev => (ev.currentTarget.style.background = "transparent")}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", fontSize: 13, fontWeight: 600, color: T.coral, cursor: "pointer", fontFamily: T.font }}>
              <LogOut size={15} aria-hidden="true" /> Sair
            </div>
          </div>
        </>
      )}
      <div onClick={() => setOpen(o => !o)} title={collapsed ? (email || "Conta") : undefined}
        style={{ display: "flex", alignItems: "center", gap: 9, padding: collapsed ? "8px 0" : "8px 20px", justifyContent: collapsed ? "center" : "flex-start", cursor: "pointer", userSelect: "none" }}>
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
function Sidebar({ collapsed, onToggle }) {
  return (
    <div style={{ width: collapsed ? 64 : 240, background: T.sidebarBg, display: "flex", flexDirection: "column",
      flexShrink: 0, position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 10, overflow: "visible", transition: "width 0.15s" }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(circle at 90% 0%, rgba(20,162,115,.25) 0%, transparent 50%)" }} />
      <div style={{ padding: collapsed ? "20px 8px 0" : "20px 20px 0", position: "relative" }}>
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
      <div className="vantari-sidebar-nav" style={{ flex: 1, overflowY: "auto", padding: "0 0 8px", position: "relative" }}>
        <NavSection label="Principal" collapsed={collapsed} />
        <NavItem icon={BarChart2} label="Analytics" path="/dashboard" collapsed={collapsed} />
        <NavItem icon={Users} label="Leads" path="/leads" collapsed={collapsed} />
        <NavItem icon={Inbox} label="Atendimento" path="/inbox" active collapsed={collapsed} />
        <NavItem icon={Mail} label="Email Marketing" path="/email" collapsed={collapsed} />
        <NavSection label="CRM" collapsed={collapsed} />
        <NavItem icon={Briefcase} label="Negócios" path="/crm" collapsed={collapsed} />
        <NavItem icon={Building2} label="Empresas" path="/empresas" collapsed={collapsed} />
        <NavItem icon={Activity} label="Atividades" path="/activities" collapsed={collapsed} />
        <NavItem icon={ListChecks} label="Tarefas" path="/tasks" collapsed={collapsed} />
        <NavItem icon={AlertTriangle} label="Em Risco" path="/risco" collapsed={collapsed} />
        <NavSection label="Ferramentas" collapsed={collapsed} />
        <NavItem icon={Star} label="Scoring" path="/scoring" collapsed={collapsed} />
        <NavItem icon={LayoutTemplate} label="Landing Pages" path="/landing" collapsed={collapsed} />
        <NavItem icon={Filter} label="Segmentações" path="/segments" collapsed={collapsed} />
        <NavItem icon={Bot} label="IA & Automação" path="/ai-marketing" collapsed={collapsed} />
        <NavItem icon={Zap} label="Automação de Marketing" path="/workflow" collapsed={collapsed} />
        <NavSection label="Sistema" collapsed={collapsed} />
        <NavItem icon={Plug} label="Integrações" path="/integrations" collapsed={collapsed} />
      </div>
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "8px 0", position: "relative" }}>
        <AccountMenu collapsed={collapsed} />
        <NavItem icon={Settings} label="Configurações" path="/settings" collapsed={collapsed} />
      </div>
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "8px 0", position: "relative" }}>
        <div onClick={onToggle} title={collapsed ? "Expandir menu" : "Recolher menu"}
          style={{ display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-end", gap: 6, padding: collapsed ? "8px 0" : "8px 20px", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", cursor: "pointer", fontFamily: T.font }}>
          {collapsed ? <ChevronRight size={16} aria-hidden="true" /> : <><span>Recolher</span><ChevronLeft size={16} aria-hidden="true" /></>}
        </div>
      </div>
    </div>
  );
}

/* ─── bolha de mensagem ─── */
function MessageBubble({ m, grouped }) {
  const isCustomer = m.sender === "customer";
  const isNina = m.sender === "nina";
  const align = isCustomer ? "flex-start" : "flex-end";
  const bg = isCustomer ? T.surface : isNina ? "#E6F3F6" : "#E8F7F1";
  const label = isCustomer ? null : isNina ? "Nina" : "Você";
  const processing = isAudioProcessing(m.body);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: align, marginBottom: grouped ? 3 : 12 }}>
      {label && !grouped && <span style={{ fontSize: 10.5, fontWeight: 700, color: isNina ? T.teal : T.green, marginBottom: 2, fontFamily: T.font }}>{label}</span>}
      {processing ? (
        <div style={{
          maxWidth: "72%", display: "flex", alignItems: "center", gap: 8, background: T.surface,
          border: `1px dashed ${T.faint3}`, borderRadius: 14, padding: "9px 13px", fontFamily: T.font,
        }}>
          <Mic size={14} color={T.faint3} style={{ animation: "pulseAudio 1.4s ease-in-out infinite" }} />
          <span style={{ fontSize: 13, color: T.muted, fontStyle: "italic" }}>Transcrevendo áudio...</span>
        </div>
      ) : (
        <div style={{
          maxWidth: "72%", background: bg, border: `1px solid ${isCustomer ? T.border : "transparent"}`,
          borderRadius: 14, padding: "9px 13px", fontSize: 13.5, color: T.text, lineHeight: 1.45,
          fontFamily: T.font, whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}>
          {m.body || <span style={{ color: T.faint3, fontStyle: "italic" }}>(sem texto)</span>}
        </div>
      )}
      <span style={{ fontSize: 10, color: T.faint3, marginTop: 3, fontFamily: T.mono }}>{fmtTime(m.created_at)}</span>
    </div>
  );
}

export default function InboxAtendimento() {
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [processos, setProcessos] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [banner, setBanner] = useState(null);
  const scrollRef = useRef(null);
  const convReqId = useRef(0);
  const msgReqId = useRef(0);

  // silent=true é usado no realtime/polling em segundo plano — nunca deve
  // fazer a lista inteira piscar pra "Carregando...", só o primeiro load
  // (quando a tela ainda está vazia) mostra o spinner
  const load = useCallback(async (opts = {}) => {
    const { silent = false } = opts;
    const reqId = ++convReqId.current;
    if (!silent) { setLoading(true); setError(null); }
    try {
      const core = supabase.schema("core");
      const { data: convs, error: e1 } = await core.from("conversations").select("*")
        .eq("workspace_id", WORKSPACE_VANTARI)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(300);
      if (e1) throw e1;

      const personIds = [...new Set((convs || []).map((c) => c.person_id).filter(Boolean))];
      let personById = {};
      if (personIds.length) {
        const { data: persons } = await core.from("persons")
          .select("id, full_name, primary_phone, primary_email, cpf, status").in("id", personIds);
        (persons || []).forEach((p) => personById[p.id] = p);
      }
      if (reqId !== convReqId.current) return; // resposta antiga, ignora (evita "piscar" com dado desatualizado)
      setConversations((convs || []).map((c) => ({ ...c, person: personById[c.person_id] || null })));
    } catch (err) {
      if (reqId !== convReqId.current) return;
      if (!silent) setError(err.message || String(err));
    } finally {
      if (reqId === convReqId.current && !silent) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // realtime: qualquer criação/atualização de conversa reordena/atualiza a
  // lista — silencioso, nunca mostra spinner (senão a lista pisca a cada
  // mensagem nova, já que toda mensagem atualiza last_message_at)
  useEffect(() => {
    const channel = supabase
      .channel("inbox-conversations")
      .on("postgres_changes", { event: "*", schema: "core", table: "conversations" }, () => load({ silent: true }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  // rede/websocket às vezes falha silenciosamente — um polling leve de
  // segurança garante que a lista nunca fique "presa" esperando o realtime,
  // sempre silencioso (sem spinner) pra não deixar a tela instável
  useEffect(() => {
    const id = setInterval(() => load({ silent: true }), 15000);
    return () => clearInterval(id);
  }, [load]);

  const loadMessages = useCallback(async (conversationId, opts = {}) => {
    const { silent = false } = opts;
    const reqId = ++msgReqId.current;
    if (!silent) setMsgLoading(true);
    const core = supabase.schema("core");
    const { data, error: e } = await core.from("messages").select("*")
      .eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(500);
    if (reqId !== msgReqId.current) return; // resposta antiga (conversa trocou ou outro poll passou na frente)
    if (!e) setMessages(data || []);
    if (!silent) setMsgLoading(false);
  }, []);

  const selected = useMemo(() => conversations.find((c) => c.id === selectedId) || null, [conversations, selectedId]);

  useEffect(() => {
    if (!selectedId) { setMessages([]); setProcessos([]); return; }
    loadMessages(selectedId);
    const person = conversations.find((c) => c.id === selectedId)?.person_id;
    if (person) {
      supabase.schema("crm").from("processos").select("id, numero_cnj, status, elegivel")
        .eq("reclamante_person_id", person).order("created_at", { ascending: false })
        .then(({ data }) => setProcessos(data || []));
    } else {
      setProcessos([]);
    }
  }, [selectedId, loadMessages]);

  // realtime: mensagens novas OU atualizadas da conversa aberta (UPDATE
  // cobre o caso de um áudio que chega como placeholder e é atualizado
  // depois com o texto transcrito, mesmo id de mensagem)
  useEffect(() => {
    if (!selectedId) return;
    const channel = supabase
      .channel(`inbox-messages-${selectedId}`)
      .on("postgres_changes", { event: "*", schema: "core", table: "messages", filter: `conversation_id=eq.${selectedId}` },
        (payload) => setMessages((prev) => mergeById(prev, payload.new)))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedId]);

  // polling de segurança: se o websocket cair silenciosamente, a conversa
  // aberta ainda se atualiza sozinha em poucos segundos
  useEffect(() => {
    if (!selectedId) return;
    const id = setInterval(() => loadMessages(selectedId, { silent: true }), 8000);
    return () => clearInterval(id);
  }, [selectedId, loadMessages]);

  // só rola pro fim sozinho se o usuário já estava perto do fim — assim o
  // polling de segurança não puxa a tela pra baixo enquanto alguém lê o
  // histórico mais antigo
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // ao trocar de conversa, sempre começa no fim
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [selectedId]);

  const filteredConvs = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter((c) => {
      const p = c.person;
      return (p?.full_name || "").toLowerCase().includes(term) ||
        (p?.primary_phone || "").includes(term) ||
        (p?.cpf || "").includes(term.replace(/\D/g, ""));
    });
  }, [conversations, search]);

  const callFn = async (fn, body) => {
    const { data: { session } } = await supabase.auth.getSession();
    const supaUrl = import.meta.env.VITE_SUPABASE_URL || "";
    const res = await fetch(`${supaUrl}/functions/v1/${fn}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, json };
  };

  const takeover = async (action) => {
    if (!selected) return;
    setActionBusy(true); setBanner(null);
    const { ok, json } = await callFn("conversation-takeover", { conversation_id: selected.id, action });
    setActionBusy(false);
    if (!ok && !json?.status) { setBanner({ type: "error", text: json?.error || "Falha ao atualizar conversa." }); return; }
    if (json?.warning) setBanner({ type: "warning", text: json.warning });
    load();
  };

  const send = async () => {
    if (!draft.trim() || !selected) return;
    setSending(true); setBanner(null);
    const { ok, json } = await callFn("conversation-send", { conversation_id: selected.id, body: draft.trim() });
    setSending(false);
    if (!ok) { setBanner({ type: "error", text: json?.error || "Falha ao enviar mensagem." }); return; }
    setDraft("");
    loadMessages(selected.id);
  };

  const statusBadge = (status) => (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700,
      padding: "3px 9px", borderRadius: 20, fontFamily: T.font,
      background: status === "human" ? "#E8F7F1" : "#E6F3F6",
      color: status === "human" ? T.green : T.teal,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: status === "human" ? T.green : T.teal }} />
      {status === "human" ? "Com humano" : "Nina respondendo"}
    </span>
  );

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.font }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulseAudio { 0%, 100% { opacity: 0.35; } 50% { opacity: 1; } }
      `}</style>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div style={{ marginLeft: collapsed ? 64 : 240, transition: "margin-left 0.15s", height: "100vh", display: "flex" }}>

        {/* ─── lista de conversas ─── */}
        <div style={{ width: 320, flexShrink: 0, borderRight: `1px solid ${T.border}`, background: T.surface, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "20px 18px 12px" }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: T.ink, fontFamily: T.head, letterSpacing: "-0.02em", margin: 0 }}>Atendimento</h1>
            <div style={{ fontSize: 12.5, color: T.muted, marginTop: 2 }}>{conversations.length} conversa{conversations.length === 1 ? "" : "s"}</div>
            <div style={{ position: "relative", marginTop: 12 }}>
              <Search size={14} color={T.faint3} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, telefone ou CPF..."
                style={{ width: "100%", padding: "8px 10px 8px 30px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12.5, fontFamily: T.font, outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, color: T.muted, gap: 8, fontSize: 13 }}>
                <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Carregando...
              </div>
            ) : filteredConvs.length === 0 ? (
              <div style={{ textAlign: "center", color: T.muted, padding: "50px 20px", fontSize: 13 }}>
                <Inbox size={26} color={T.faint3} style={{ marginBottom: 8 }} />
                <div>Nenhuma conversa ainda.</div>
                <div style={{ fontSize: 11.5, marginTop: 4 }}>Assim que a Nina começar a atender alguém no WhatsApp, a conversa aparece aqui.</div>
              </div>
            ) : filteredConvs.map((c) => {
              const p = c.person;
              const active = c.id === selectedId;
              return (
                <div key={c.id} onClick={() => setSelectedId(c.id)}
                  style={{
                    display: "flex", gap: 10, padding: "12px 16px", cursor: "pointer",
                    background: active ? T.bg : "transparent", borderLeft: active ? `3px solid ${T.teal}` : "3px solid transparent",
                    borderBottom: `1px solid ${T.bg}`,
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = T.bg; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: T.gradient, color: "#fff", display: "grid", placeItems: "center", fontSize: 14, fontWeight: 700, fontFamily: T.head, flexShrink: 0 }}>
                    {initialOf(p?.full_name, p?.primary_phone)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p?.full_name || p?.primary_phone || "Contato sem nome"}
                      </span>
                      <span style={{ fontSize: 10.5, color: T.faint3, fontFamily: T.mono, flexShrink: 0 }}>{relTime(c.last_message_at)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                      {c.last_message_sender === "human" ? "Você: " : c.last_message_sender === "nina" ? "Nina: " : ""}
                      {isAudioProcessing(c.last_message_body) ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontStyle: "italic" }}>
                          <Mic size={11} /> Transcrevendo áudio...
                        </span>
                      ) : (c.last_message_body || "—")}
                    </div>
                    <div style={{ marginTop: 5 }}>{statusBadge(c.status)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── janela de chat ─── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {!selected ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: T.muted, flexDirection: "column", gap: 10 }}>
              <MessageCircle size={32} color={T.faint3} />
              <span style={{ fontSize: 14 }}>Selecione uma conversa pra ver o histórico.</span>
            </div>
          ) : (
            <>
              <div style={{ padding: "14px 22px", borderBottom: `1px solid ${T.border}`, background: T.surface, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, fontFamily: T.head }}>{selected.person?.full_name || selected.person?.primary_phone || "Contato sem nome"}</div>
                  <div style={{ marginTop: 4 }}>{statusBadge(selected.status)}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {selected.status === "nina" ? (
                    <button onClick={() => takeover("take")} disabled={actionBusy}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: T.gradient, border: "none", borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 700, cursor: actionBusy ? "default" : "pointer", opacity: actionBusy ? 0.7 : 1, fontFamily: T.font }}>
                      <UserCheck size={15} /> Assumir conversa
                    </button>
                  ) : (
                    <button onClick={() => takeover("release")} disabled={actionBusy}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 9, color: T.text, fontSize: 13, fontWeight: 700, cursor: actionBusy ? "default" : "pointer", opacity: actionBusy ? 0.7 : 1, fontFamily: T.font }}>
                      <UserX size={15} /> Devolver pra Nina
                    </button>
                  )}
                </div>
              </div>

              {banner && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "9px 22px", fontSize: 12.5,
                  background: banner.type === "error" ? "#FFF1F0" : "#FFF8E6",
                  color: banner.type === "error" ? "#9B2C2C" : "#8A6100", borderBottom: `1px solid ${T.border}`,
                }}>
                  <AlertCircle size={14} /> {banner.text}
                </div>
              )}

              <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "18px 22px", display: "flex", flexDirection: "column" }}>
                {msgLoading ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, color: T.muted, gap: 8, fontSize: 13 }}>
                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Carregando mensagens...
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: "center", color: T.muted, margin: "auto", fontSize: 13 }}>Nenhuma mensagem ainda nesta conversa.</div>
                ) : messages.map((m, i) => (
                  <MessageBubble key={m.id} m={m} grouped={i > 0 && messages[i - 1].sender === m.sender} />
                ))}
              </div>

              <div style={{ padding: "14px 22px", borderTop: `1px solid ${T.border}`, background: T.surface }}>
                {selected.status !== "human" ? (
                  <div style={{ fontSize: 12.5, color: T.muted, textAlign: "center", padding: "8px 0" }}>
                    Assuma a conversa pra poder responder ao cliente.
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 10 }}>
                    <textarea value={draft} onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                      rows={1} placeholder="Digite sua mensagem..."
                      style={{ flex: 1, resize: "none", padding: "10px 12px", border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13.5, fontFamily: T.font, outline: "none" }} />
                    <button onClick={send} disabled={sending || !draft.trim()}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 18px", background: T.gradient, border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 700, cursor: (sending || !draft.trim()) ? "default" : "pointer", opacity: (sending || !draft.trim()) ? 0.6 : 1, fontFamily: T.font }}>
                      {sending ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={15} />}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ─── painel do lead ─── */}
        {selected && (
          <div style={{ width: 280, flexShrink: 0, borderLeft: `1px solid ${T.border}`, background: T.surface, padding: "20px 18px", overflowY: "auto" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Dados do lead</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ fontSize: 10.5, color: T.faint3, marginBottom: 2 }}>Nome</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: T.ink }}>{selected.person?.full_name || "—"}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <Phone size={13} color={T.faint3} />
                <span style={{ fontSize: 13, color: T.text, fontFamily: T.mono }}>{selected.person?.primary_phone || "—"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <IdCard size={13} color={T.faint3} />
                <span style={{ fontSize: 13, color: T.text, fontFamily: T.mono }}>{fmtCpf(selected.person?.cpf) || "—"}</span>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: T.faint3, marginBottom: 4 }}>Status</div>
                <span style={{
                  display: "inline-block", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, fontFamily: T.font,
                  background: selected.person?.status === "identificado" ? "#E8F7F1" : "#FFF8E6",
                  color: selected.person?.status === "identificado" ? T.green : "#8A6100",
                }}>
                  {selected.person?.status === "identificado" ? "Identificado" : "Pendente"}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: T.faint3, marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                  <FileText size={12} /> Processos
                </div>
                {processos.length === 0 ? (
                  <div style={{ fontSize: 12, color: T.faint3 }}>Nenhum processo capturado ainda.</div>
                ) : processos.map((p) => (
                  <div key={p.id} style={{ padding: "8px 10px", background: T.bg, borderRadius: 8, marginBottom: 6 }}>
                    <div style={{ fontSize: 12, fontFamily: T.mono, color: T.ink, wordBreak: "break-all" }}>{p.numero_cnj}</div>
                    <div style={{ fontSize: 10.5, color: T.muted, marginTop: 2, textTransform: "capitalize" }}>{p.status?.replace(/_/g, " ")}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
