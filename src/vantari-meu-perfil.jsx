import { useState, useEffect } from "react";
import { useSidebarCollapsed } from "./sidebar-collapsed";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabase";
import {
  BarChart2, Users, Inbox, Briefcase, Building2, Activity, ListChecks,
  AlertTriangle, FileBarChart, Settings, ChevronLeft, ChevronRight, LogOut,
  Loader2, AlertCircle, CheckCircle2, KeyRound, User as UserIcon,
} from "lucide-react";

const T = {
  teal: "#0D7491", green: "#14A273",
  gradient: "linear-gradient(135deg, #0D7491 0%, #14A273 100%)",
  sidebarBg: "linear-gradient(180deg, #0D7491 0%, #0A5165 60%, #0A3D4D 100%)",
  coral: "#FF6B5E",
  bg: "#F5F8FB", surface: "#FFFFFF", border: "#E8EEF3",
  ink: "#0E1A24", text: "#2E3D4B", muted: "#5A6B7A", faint3: "#8696A5",
  font: "'Inter', system-ui, sans-serif", head: "'Sora', system-ui, sans-serif",
};

// Menu reduzido — papel "captador" só enxerga Principal + CRM (sem Ferramentas/Sistema).
// Mantido em arquivo próprio (não o sidebar completo de cada página) porque esta tela
// só é alcançada por esse papel restrito.
const NavSection = ({ label, collapsed }) => (
  collapsed ? <div style={{ height: 10 }} /> : (
    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.18em", color: "rgba(255,255,255,0.4)", padding: "10px 20px 4px", textTransform: "uppercase", fontFamily: T.head }}>
      {label}
    </div>
  )
);

const NavItem = ({ icon: Icon, label, active = false, path, collapsed }) => {
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
        <span style={{ position: "absolute", left: 0, top: 6, bottom: 6, width: 3, background: "linear-gradient(180deg, #14A273 0%, #5EEAD4 100%)", borderRadius: "0 3px 3px 0" }} />
      )}
      {Icon && <Icon size={16} aria-hidden="true" />}
      {!collapsed && label}
    </div>
  );
};

function AccountMenu({ collapsed, email }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/login", { replace: true }); };
  const initial = (email || "?").charAt(0).toUpperCase();
  return (
    <div style={{ position: "relative" }}>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 25 }} />
          <div style={{ position: "absolute", bottom: "100%", left: collapsed ? 8 : 12, right: collapsed ? undefined : 12, marginBottom: 8, background: "#fff", borderRadius: 10, boxShadow: "0 8px 24px -8px rgba(0,0,0,.35)", border: `1px solid ${T.border}`, overflow: "hidden", minWidth: collapsed ? 176 : undefined, zIndex: 30 }}>
            <div onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", fontSize: 13, fontWeight: 600, color: T.coral, cursor: "pointer", fontFamily: T.font }}>
              <LogOut size={15} aria-hidden="true" /> Sair
            </div>
          </div>
        </>
      )}
      <div onClick={() => setOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 9, padding: collapsed ? "8px 0" : "8px 20px", justifyContent: collapsed ? "center" : "flex-start", cursor: "pointer" }}>
        <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(255,255,255,.15)", color: "#fff", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, fontFamily: T.head, flexShrink: 0 }}>
          {initial}
        </div>
        {!collapsed && <span style={{ fontSize: 12.5, color: "rgba(255,255,255,.85)", fontFamily: T.font, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email}</span>}
      </div>
    </div>
  );
}

export default function MeuPerfil() {
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState(null);

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data?.user?.email || "");
      setName(data?.user?.user_metadata?.name || "");
    });
  }, []);

  const saveName = async () => {
    setSavingName(true); setNameMsg(null);
    const { error } = await supabase.auth.updateUser({ data: { name } });
    setSavingName(false);
    setNameMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Nome atualizado." });
  };

  const savePassword = async () => {
    setPwMsg(null);
    if (pw1.length < 6) { setPwMsg({ ok: false, text: "A senha precisa ter pelo menos 6 caracteres." }); return; }
    if (pw1 !== pw2) { setPwMsg({ ok: false, text: "As duas senhas não são iguais." }); return; }
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: pw1 });
    setSavingPw(false);
    if (error) { setPwMsg({ ok: false, text: error.message }); return; }
    setPw1(""); setPw2("");
    setPwMsg({ ok: true, text: "Senha alterada com sucesso." });
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: T.bg, fontFamily: T.font, overflow: "hidden" }}>
      <div style={{ width: collapsed ? 64 : 240, transition: "width 0.15s", background: T.sidebarBg, display: "flex", flexDirection: "column", flexShrink: 0, position: "relative" }}>
        <div style={{ padding: collapsed ? "20px 0 0" : "20px 20px 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", gap: 10, paddingBottom: 20, borderBottom: "1px solid rgba(255,255,255,.08)", marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, background: "white", borderRadius: 8, display: "grid", placeItems: "center", flexShrink: 0 }}>
              <img src="/icone.png" alt="" style={{ width: 22, height: 22 }} />
            </div>
            {!collapsed && <span style={{ fontFamily: T.head, fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "white" }}>vantari</span>}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 0 8px" }}>
          <NavSection label="Principal" collapsed={collapsed} />
          <NavItem icon={BarChart2} label="Analytics" path="/dashboard" collapsed={collapsed} />
          <NavItem icon={Users} label="Leads" path="/leads" collapsed={collapsed} />
          <NavItem icon={Inbox} label="Atendimento" path="/inbox" collapsed={collapsed} />
          <NavSection label="CRM" collapsed={collapsed} />
          <NavItem icon={Briefcase} label="Negócios" path="/crm" collapsed={collapsed} />
          <NavItem icon={Building2} label="Empresas" path="/empresas" collapsed={collapsed} />
          <NavItem icon={Activity} label="Atividades" path="/activities" collapsed={collapsed} />
          <NavItem icon={ListChecks} label="Tarefas" path="/tasks" collapsed={collapsed} />
          <NavItem icon={AlertTriangle} label="Em Risco" path="/risco" collapsed={collapsed} />
          <NavItem icon={FileBarChart} label="Relatórios" path="/reports" collapsed={collapsed} />
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "8px 0" }}>
          <AccountMenu collapsed={collapsed} email={email} />
          <NavItem icon={Settings} label="Configurações" path="/settings" active collapsed={collapsed} />
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "8px 0" }}>
          <div onClick={() => setCollapsed(c => !c)} style={{ display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-end", gap: 6, padding: collapsed ? "8px 0" : "8px 20px", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)", cursor: "pointer", fontFamily: T.font }}>
            {collapsed ? <ChevronRight size={16} aria-hidden="true" /> : <><span>Recolher</span><ChevronLeft size={16} aria-hidden="true" /></>}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ height: 56, background: T.surface, borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", padding: "0 24px", flexShrink: 0 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: T.ink, fontFamily: T.head, letterSpacing: "-0.02em" }}>Meu Perfil</span>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 16, maxWidth: 480 }}>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <UserIcon size={16} color={T.teal} aria-hidden="true" />
              <span style={{ fontSize: 14, fontWeight: 700, color: T.ink, fontFamily: T.head }}>Dados pessoais</span>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 5 }}>E-mail</label>
              <div style={{ fontSize: 13.5, color: T.text, padding: "9px 12px", background: T.bg, borderRadius: 8, border: `1px solid ${T.border}` }}>{email}</div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 5 }}>Nome de exibição</label>
              <input value={name} onChange={(e) => setName(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", fontSize: 13.5, border: `1px solid ${T.border}`, borderRadius: 8, fontFamily: T.font, boxSizing: "border-box" }} />
            </div>
            {nameMsg && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: nameMsg.ok ? T.green : T.coral, marginBottom: 10 }}>
                {nameMsg.ok ? <CheckCircle2 size={14} aria-hidden="true" /> : <AlertCircle size={14} aria-hidden="true" />} {nameMsg.text}
              </div>
            )}
            <button onClick={saveName} disabled={savingName}
              style={{ padding: "9px 16px", background: T.gradient, border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, cursor: savingName ? "default" : "pointer", opacity: savingName ? 0.7 : 1, display: "flex", alignItems: "center", gap: 6 }}>
              {savingName && <Loader2 size={14} className="spin" aria-hidden="true" />} Salvar nome
            </button>
          </div>

          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <KeyRound size={16} color={T.teal} aria-hidden="true" />
              <span style={{ fontSize: 14, fontWeight: 700, color: T.ink, fontFamily: T.head }}>Trocar senha</span>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 5 }}>Nova senha</label>
              <input type="password" value={pw1} onChange={(e) => setPw1(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", fontSize: 13.5, border: `1px solid ${T.border}`, borderRadius: 8, fontFamily: T.font, boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.muted, marginBottom: 5 }}>Confirmar nova senha</label>
              <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", fontSize: 13.5, border: `1px solid ${T.border}`, borderRadius: 8, fontFamily: T.font, boxSizing: "border-box" }} />
            </div>
            {pwMsg && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: pwMsg.ok ? T.green : T.coral, marginBottom: 10 }}>
                {pwMsg.ok ? <CheckCircle2 size={14} aria-hidden="true" /> : <AlertCircle size={14} aria-hidden="true" />} {pwMsg.text}
              </div>
            )}
            <button onClick={savePassword} disabled={savingPw}
              style={{ padding: "9px 16px", background: T.gradient, border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, cursor: savingPw ? "default" : "pointer", opacity: savingPw ? 0.7 : 1, display: "flex", alignItems: "center", gap: 6 }}>
              {savingPw && <Loader2 size={14} className="spin" aria-hidden="true" />} Alterar senha
            </button>
          </div>
        </div>
      </div>
      <style>{`.spin { animation: spin 0.8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
