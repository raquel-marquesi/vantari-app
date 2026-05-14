import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabase";

/* ───── DESIGN TOKENS ───── */
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
  rose:    "#EC4899",
  purple:  "#7C5CFF",

  // Surfaces & ink
  bg:      "#F5F8FB",
  surface: "#FFFFFF",
  border:  "#E8EEF3",

  // Ink scale
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

// Legacy aliases used throughout this file
const C = {
  blue:    T.teal,
  green:   T.green,
  amber:   T.amber,
  red:     T.coral,
  purple:  T.violet,
  bg:      T.bg,
  surface: T.surface,
  border:  T.border,
  text:    T.text,
  muted:   T.muted,
  subtle:  T.faint3,
  faint:   T.faint,
};
const FONT = T.font;
const HEAD = T.head;

// ─── CONTEXTS ──────────────────────────────────────────────────────────────────
const AuthContext  = createContext(null);
const ToastContext = createContext(null);

// ─── TOAST SYSTEM ──────────────────────────────────────────────────────────────
const useToastSystem = () => {
  const [toasts,setToasts] = useState([]);
  const add    = useCallback((msg,type="info")=>{ const id=Date.now(); setToasts(t=>[...t,{id,msg,type}]); setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),4000); },[]);
  const remove = useCallback((id)=>setToasts(t=>t.filter(x=>x.id!==id)),[]);
  return { toasts, add, remove };
};

// ─── SVG ICON SYSTEM (custom paths, no emoji) ──────────────────────────────────
const Icon = ({ name, size=20, color="currentColor" }) => {
  const paths = {
    dashboard:    "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
    leads:        "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
    campaigns:    "M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z",
    automations:  "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z",
    landing:      "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    integrations: "M17 7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h10c2.76 0 5-2.24 5-5s-2.24-5-5-5zM7 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z",
    settings:     "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
    bell:         "M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z",
    logout:       "M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z",
    eye:          "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z",
    eyeoff:       "M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z",
    check:        "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
    close:        "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
    menu:         "M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",
    chevron:      "M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z",
    user:         "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
    mail:         "M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z",
    lock:         "M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z",
    warning:      "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
    success:      "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z",
    info:         "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      {name==="landing"
        ?<path d={paths.landing} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        :<path d={paths[name]||paths.info}/>}
    </svg>
  );
};

// ─── TOAST COMPONENT ──────────────────────────────────────────────────────────
const ToastContainer = ({ toasts, remove }) => (
  <div style={{position:"fixed",top:20,right:20,zIndex:9999,display:"flex",flexDirection:"column",gap:10}}>
    {toasts.map(t=>{
      const styles = {
        success: {bg:"#f0fdf7",border:C.green,   icon:"success",iconColor:C.green},
        error:   {bg:"#fef2f2",border:C.red,     icon:"warning",iconColor:C.red  },
        info:    {bg:"#e8f5fb",border:C.blue,    icon:"info",   iconColor:C.blue },
        warning: {bg:"#fff4e6",border:C.amber,   icon:"warning",iconColor:C.amber},
      };
      const s=styles[t.type]||styles.info;
      return (
        <div key={t.id} style={{display:"flex",alignItems:"center",gap:12,background:s.bg,border:`1px solid ${s.border}`,borderLeft:`4px solid ${s.border}`,borderRadius:10,padding:"12px 16px",minWidth:300,maxWidth:400,boxShadow:"0 4px 20px rgba(0,0,0,0.1)",animation:"slideIn 0.3s ease",fontFamily:FONT}}>
          <Icon name={s.icon} size={18} color={s.iconColor}/>
          <span style={{flex:1,fontSize:14,fontWeight:600,color:C.text}}>{t.msg}</span>
          <button onClick={()=>remove(t.id)} style={{background:"none",border:"none",cursor:"pointer",color:C.muted,padding:0,display:"flex",alignItems:"center"}}>
            <Icon name="close" size={16}/>
          </button>
        </div>
      );
    })}
  </div>
);

// ─── INPUT COMPONENT ──────────────────────────────────────────────────────────
const Input = ({ label, type="text", value, onChange, error, placeholder, icon, rightIcon, onRightClick, disabled }) => {
  const [focused,setFocused] = useState(false);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      {label&&<label style={{fontFamily:HEAD,fontSize:12,fontWeight:600,color:C.muted,letterSpacing:"0.03em"}}>{label}</label>}
      <div style={{position:"relative"}}>
        {icon&&<div style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:focused?C.blue:T.faint3,transition:"color 0.2s"}}><Icon name={icon} size={18}/></div>}
        <input type={type} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
          onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
          style={{width:"100%",boxSizing:"border-box",padding:`12px ${rightIcon?"44px":"14px"} 12px ${icon?"44px":"14px"}`,fontFamily:FONT,fontSize:14,fontWeight:600,border:`1.5px solid ${error?C.red:focused?C.blue:C.border}`,borderRadius:10,outline:"none",background:disabled?"#F5F8FB":"#fff",color:C.text,transition:"border-color 0.2s, box-shadow 0.2s",boxShadow:focused?`0 0 0 3px ${C.blue}18`:"none"}}/>
        {rightIcon&&<button onClick={onRightClick} style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:C.muted,padding:0,display:"flex",alignItems:"center"}}><Icon name={rightIcon} size={18}/></button>}
      </div>
      {error&&<span style={{fontFamily:FONT,fontSize:12,fontWeight:600,color:C.red}}>{error}</span>}
    </div>
  );
};

// ─── BUTTON COMPONENT ─────────────────────────────────────────────────────────
const Button = ({ children, onClick, variant="primary", loading, disabled, fullWidth, size="md", icon }) => {
  const [hov,setHov] = useState(false);
  const variants = {
    primary:   {
      bg: hov
        ? "linear-gradient(135deg, #0A5F7A 0%, #108A60 100%)"
        : "linear-gradient(135deg, #0D7491 0%, #14A273 100%)",
      color:"#fff", border:"none",
      shadow: hov ? "0 8px 22px -6px rgba(13,116,145,.5)" : "0 4px 14px -4px rgba(13,116,145,.4)",
    },
    secondary: {bg:hov?`${T.teal}14`:"#fff",  color:T.teal, border:`1.5px solid ${T.teal}`, shadow:"none"},
    ghost:     {bg:hov?"#EEF2F6":"transparent",color:T.text, border:"none",                  shadow:"none"},
    danger:    {bg:hov?"#e04d42":T.coral,      color:"#fff", border:"none",                  shadow:"none"},
    success:   {bg:hov?"#108A60":T.green,      color:"#fff", border:"none",                  shadow:"none"},
  };
  const sizes = {sm:{padding:"7px 14px",fontSize:13},md:{padding:"11px 22px",fontSize:14},lg:{padding:"14px 28px",fontSize:15}};
  const v=variants[variant]||variants.primary;
  const s=sizes[size]||sizes.md;
  return (
    <button onClick={onClick} disabled={disabled||loading} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,width:fullWidth?"100%":"auto",background:v.bg,color:v.color,border:v.border||"none",boxShadow:v.shadow,borderRadius:10,...s,fontFamily:HEAD,fontWeight:700,letterSpacing:"0.01em",cursor:disabled||loading?"not-allowed":"pointer",opacity:disabled?.6:1,transition:"all 0.2s ease",transform:hov&&variant==="primary"?"translateY(-1px)":"none"}}>
      {loading
        ?<div style={{width:16,height:16,border:"2px solid rgba(255,255,255,0.3)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>
        :icon?<Icon name={icon} size={16}/>:null}
      {children}
    </button>
  );
};

// ─── MODAL COMPONENT ──────────────────────────────────────────────────────────
const Modal = ({ open, onClose, title, children, width=500 }) => {
  if(!open) return null;
  return (
    <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.45)",backdropFilter:"blur(4px)"}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#fff",borderRadius:16,width:"90%",maxWidth:width,maxHeight:"90vh",overflow:"auto",boxShadow:"0 25px 60px rgba(0,0,0,0.18)",animation:"fadeUp 0.25s ease"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"20px 24px",borderBottom:`1px solid ${C.border}`}}>
          <h3 style={{margin:0,fontFamily:HEAD,fontSize:16,fontWeight:700,color:C.text}}>{title}</h3>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.muted,padding:4,display:"flex",alignItems:"center"}}><Icon name="close" size={20}/></button>
        </div>
        <div style={{padding:"24px"}}>{children}</div>
      </div>
    </div>
  );
};

// ─── CARD COMPONENT ───────────────────────────────────────────────────────────
const Card = ({ children, style:sx={}, onClick, hoverable }) => {
  const [hov,setHov] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={()=>hoverable&&setHov(true)} onMouseLeave={()=>hoverable&&setHov(false)}
      style={{background:"#fff",borderRadius:12,border:`1px solid ${T.border}`,
        boxShadow: hov
          ? "0 1px 0 rgba(14,26,36,.04), 0 16px 36px -16px rgba(14,26,36,.15)"
          : "0 1px 0 rgba(14,26,36,.03), 0 8px 24px -16px rgba(14,26,36,.08)",
        transition:"all 0.2s",cursor:onClick?"pointer":"default",transform:hov?"translateY(-2px)":"none",...sx}}>
      {children}
    </div>
  );
};

// ─── AUTH PROVIDER ────────────────────────────────────────────────────────────
const AuthProvider = ({ children }) => {
  const [user,setUser]       = useState(null);
  const [loading,setLoading] = useState(true);
  const toast = useContext(ToastContext);

  useEffect(()=>{
    supabase.auth.getUser().then(({data})=>{ setUser(data.user); setLoading(false); });
    const { data:{ subscription } } = supabase.auth.onAuthStateChange((_,session)=>{ setUser(session?.user||null); });
    return ()=>subscription.unsubscribe();
  },[]);

  const signIn         = async (email,password) => { const {data,error}=await supabase.auth.signInWithPassword({email,password}); if(error) throw error; return data; };
  const signUp         = async (email,password,meta) => { const {data,error}=await supabase.auth.signUp({email,password,options:{data:meta}}); if(error) throw error; return data; };
  const resetPassword  = async (email) => { const {error}=await supabase.auth.resetPasswordForEmail(email); if(error) throw error; };
  const signOut        = async () => { await supabase.auth.signOut(); toast?.add("Você saiu da sua conta.","info"); };

  return (
    <AuthContext.Provider value={{user,loading,signIn,signUp,resetPassword,signOut}}>
      {children}
    </AuthContext.Provider>
  );
};

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
const LoginScreen = () => {
  const { signIn, signUp, resetPassword } = useContext(AuthContext);
  const toast = useContext(ToastContext);
  const navigate = useNavigate();
  const [mode,setMode]         = useState("login");
  const [email,setEmail]       = useState("");
  const [password,setPassword] = useState("");
  const [name,setName]         = useState("");
  const [company,setCompany]   = useState("");
  const [showPass,setShowPass] = useState(false);
  const [loading,setLoading]   = useState(false);
  const [errors,setErrors]     = useState({});

  const validate = () => {
    const e={};
    if(!email) e.email="Email obrigatório";
    else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email="Email inválido";
    if(mode!=="forgot"){
      if(!password) e.password="Senha obrigatória";
      else if(password.length<6) e.password="Mínimo 6 caracteres";
    }
    if(mode==="signup"&&!name) e.name="Nome obrigatório";
    setErrors(e);
    return Object.keys(e).length===0;
  };

  const handleSubmit = async () => {
    if(!validate()) return;
    setLoading(true);
    try {
      if(mode==="login"){ await signIn(email,password); toast.add("Bem-vindo de volta!","success"); navigate("/dashboard"); }
      else if(mode==="signup"){ await signUp(email,password,{name,company}); toast.add("Conta criada com sucesso!","success"); navigate("/dashboard"); }
      else { await resetPassword(email); toast.add("Email de recuperação enviado!","success"); setMode("login"); }
    } catch(err){ toast.add(err.message||"Ocorreu um erro","error"); }
    finally{ setLoading(false); }
  };

  return (
    <div style={{minHeight:"100vh",display:"flex",fontFamily:FONT}}>
      {/* Left panel */}
      <div style={{flex:"0 0 55%",background:`linear-gradient(145deg, ${T.teal} 0%, #0A5165 50%, ${T.green} 100%)`,display:"flex",flexDirection:"column",justifyContent:"space-between",padding:"48px 56px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-80,right:-80,width:320,height:320,borderRadius:"50%",background:"rgba(255,255,255,0.06)"}}/>
        <div style={{position:"absolute",bottom:-60,left:-60,width:240,height:240,borderRadius:"50%",background:"rgba(255,255,255,0.06)"}}/>
        <div style={{position:"absolute",top:"40%",right:"10%",width:160,height:160,borderRadius:"50%",background:`rgba(20,162,115,0.2)`}}/>

        {/* Logo */}
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <img src="/icone.png" alt="Vantari" style={{height:40,width:"auto"}}/>
          <span style={{fontFamily:HEAD,fontWeight:700,fontSize:22,letterSpacing:"0.04em",color:"#fff"}}>vantari</span>
        </div>

        <div style={{position:"relative",zIndex:1}}>
          <div style={{display:"flex",gap:12,marginBottom:32}}>
            {["Email Marketing","Gestão de Leads","Automação IA"].map(tag=>(
              <span key={tag} style={{background:"rgba(255,255,255,0.15)",color:"#fff",borderRadius:20,padding:"6px 14px",fontSize:12,fontWeight:600,backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,0.2)",fontFamily:FONT}}>{tag}</span>
            ))}
          </div>
          <h1 style={{color:"#fff",fontSize:36,fontWeight:700,lineHeight:1.25,margin:"0 0 16px",letterSpacing:"-0.02em",fontFamily:HEAD}}>
            Sua plataforma de<br/>
            <span style={{fontWeight:700}}>marketing digital</span><br/>
            centralizada
          </h1>
          <p style={{color:"rgba(255,255,255,0.8)",fontSize:16,fontWeight:600,lineHeight:1.6,margin:0,maxWidth:400,fontFamily:FONT}}>
            Gerencie leads, campanhas e automações em um único lugar. Integrado com WhatsApp, Meta Ads e Google Ads.
          </p>
          <div style={{display:"flex",gap:32,marginTop:48}}>
            {[["6.000+","Leads ativos"],["6","Canais integrados"],["3-6x","ROI esperado"]].map(([num,label])=>(
              <div key={label}>
                <div style={{color:"#fff",fontSize:24,fontWeight:700,fontFamily:HEAD}}>{num}</div>
                <div style={{color:"rgba(255,255,255,0.65)",fontSize:12,fontWeight:600,marginTop:4,fontFamily:FONT}}>{label}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{color:"rgba(255,255,255,0.5)",fontSize:12,fontWeight:600,fontFamily:FONT}}>© 2025 Vantari · Todos os direitos reservados</div>
      </div>

      {/* Right panel */}
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",background:T.faint,padding:40}}>
        <div style={{width:"100%",maxWidth:400}}>
          <div style={{marginBottom:36}}>
            <h2 style={{margin:"0 0 6px",fontSize:24,fontWeight:700,color:T.ink,letterSpacing:"-0.02em",fontFamily:HEAD}}>
              {mode==="login"?"Entrar na sua conta":mode==="signup"?"Criar nova conta":"Recuperar senha"}
            </h2>
            <p style={{margin:0,color:T.muted,fontSize:14,fontWeight:600,fontFamily:FONT}}>
              {mode==="login"?"Bem-vindo de volta ao Vantari":mode==="signup"?"Comece sua jornada de marketing":"Enviaremos um link para seu email"}
            </p>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:18}} onKeyDown={e=>e.key==="Enter"&&handleSubmit()}>
            {mode==="signup"&&(
              <>
                <Input label="Nome completo"  value={name}    onChange={e=>setName(e.target.value)}    placeholder="Ana Costa"            icon="user"      error={errors.name}/>
                <Input label="Empresa"        value={company} onChange={e=>setCompany(e.target.value)} placeholder="Vantari Marketing"    icon="dashboard"/>
              </>
            )}
            <Input label="Email" type="email" value={email}   onChange={e=>setEmail(e.target.value)}   placeholder="voce@empresa.com.br"  icon="mail"      error={errors.email}/>
            {mode!=="forgot"&&(
              <Input label="Senha" type={showPass?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" icon="lock" error={errors.password} rightIcon={showPass?"eyeoff":"eye"} onRightClick={()=>setShowPass(!showPass)}/>
            )}
            {mode==="login"&&(
              <div style={{textAlign:"right",marginTop:-8}}>
                <button onClick={()=>setMode("forgot")} style={{background:"none",border:"none",color:T.teal,fontSize:13,cursor:"pointer",fontFamily:FONT,fontWeight:700}}>Esqueci minha senha</button>
              </div>
            )}
            <Button onClick={handleSubmit} loading={loading} fullWidth size="lg">
              {mode==="login"?"Entrar":mode==="signup"?"Criar conta":"Enviar link de recuperação"}
            </Button>
            <div style={{textAlign:"center",color:T.muted,fontSize:13,fontWeight:600,paddingTop:4,fontFamily:FONT}}>
              {mode==="login"
                ?<>Não tem conta?{" "}<button onClick={()=>{setMode("signup");setErrors({});}} style={{background:"none",border:"none",color:T.teal,fontWeight:700,cursor:"pointer",fontFamily:FONT,fontSize:13}}>Criar conta grátis</button></>
                :<>Já tem conta?{" "}<button onClick={()=>{setMode("login");setErrors({});}} style={{background:"none",border:"none",color:T.teal,fontWeight:700,cursor:"pointer",fontFamily:FONT,fontSize:13}}>Entrar</button></>}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// ─── SIDEBAR NAV ──────────────────────────────────────────────────────────────
const navItems = [
  { id:"dashboard",    label:"Dashboard",    icon:"dashboard"    },
  { id:"leads",        label:"Leads",        icon:"leads",       badge:12 },
  { id:"campaigns",    label:"Campanhas",    icon:"campaigns"    },
  { id:"automations",  label:"Automações",   icon:"automations"  },
  { id:"landing",      label:"Landing Pages",icon:"landing"      },
  { id:"integrations", label:"Integrações",  icon:"integrations" },
  { id:"settings",     label:"Configurações",icon:"settings"     },
];

const Sidebar = ({ active, setActive, collapsed, setCollapsed, user }) => {
  const { signOut } = useContext(AuthContext);
  return (
    <aside style={{width:collapsed?72:240,minHeight:"100vh",flexShrink:0,background:T.sidebarBg,borderRight:"none",display:"flex",flexDirection:"column",transition:"width 0.25s ease",position:"fixed",top:0,left:0,zIndex:100,overflow:"hidden"}}>
      {/* Glow */}
      <div style={{position:"absolute",inset:0,pointerEvents:"none",background:"radial-gradient(circle at 90% 0%, rgba(20,162,115,.25) 0%, transparent 50%)"}}/>
      {/* Logo */}
      <div style={{padding:collapsed?"18px 0":"14px 16px",display:"flex",alignItems:"center",justifyContent:collapsed?"center":"space-between",borderBottom:"1px solid rgba(255,255,255,0.12)",minHeight:60,position:"relative"}}>
        {collapsed
          ?<img src="/icone.png" alt="Vantari" style={{height:24,width:"auto"}}/>
          :<div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:28,height:28,background:"white",borderRadius:7,display:"grid",placeItems:"center",flexShrink:0}}>
              <img src="/icone.png" alt="" style={{width:20,height:20}}/>
            </div>
            <span style={{fontFamily:HEAD,fontWeight:700,fontSize:17,letterSpacing:"-0.02em",color:"white"}}>vantari</span>
            <span style={{marginLeft:4,fontSize:10,background:"rgba(255,255,255,.12)",padding:"2px 7px",borderRadius:6,letterSpacing:"0.08em",fontWeight:600,color:"rgba(255,255,255,.85)"}}>PRO</span>
          </div>}
        {!collapsed&&(
          <button onClick={()=>setCollapsed(true)} style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.55)",padding:4,borderRadius:6,display:"flex",alignItems:"center",position:"relative"}}>
            <Icon name="menu" size={18} color="rgba(255,255,255,0.55)"/>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{flex:1,padding:"10px 0",display:"flex",flexDirection:"column",gap:2,position:"relative"}}>
        {collapsed&&(
          <button onClick={()=>setCollapsed(false)} style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"10px",background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.55)",borderRadius:8,marginBottom:6}}>
            <Icon name="menu" size={20} color="rgba(255,255,255,0.55)"/>
          </button>
        )}
        {navItems.map(item=>{
          const isActive=active===item.id;
          return (
            <button key={item.id} onClick={()=>setActive(item.id)} title={collapsed?item.label:undefined}
              style={{
                display:"flex",alignItems:"center",gap:9,
                padding:collapsed?"10px 0":"8px 20px",
                justifyContent:collapsed?"center":"flex-start",
                background:isActive?"rgba(255,255,255,0.10)":"transparent",
                border:"none",
                position:"relative",
                borderRadius:0,
                cursor:"pointer",
                color:isActive?"#fff":"rgba(255,255,255,0.6)",
                fontFamily:FONT,fontSize:13.5,fontWeight:isActive?700:600,transition:"all 0.15s",
              }}>
              {isActive&&(
                <span style={{position:"absolute",left:0,top:6,bottom:6,width:3,background:"linear-gradient(180deg, #14A273 0%, #5EEAD4 100%)",borderRadius:"0 3px 3px 0"}}/>
              )}
              <Icon name={item.icon} size={16} color={isActive?"#fff":"rgba(255,255,255,0.55)"}/>
              {!collapsed&&<span style={{flex:1}}>{item.label}</span>}
              {!collapsed&&item.badge&&(
                <span style={{background:"rgba(255,255,255,0.18)",color:"#fff",fontSize:10,fontWeight:700,borderRadius:10,padding:"2px 6px",minWidth:18,textAlign:"center"}}>{item.badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div style={{padding:"10px 0",borderTop:"1px solid rgba(255,255,255,0.12)",position:"relative"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:collapsed?"10px 0":"9px 20px",justifyContent:collapsed?"center":"flex-start",borderRadius:8}}>
          <div style={{width:32,height:32,borderRadius:"50%",background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <span style={{color:"#fff",fontSize:13,fontWeight:700}}>{(user?.user_metadata?.name||user?.email||"U")[0].toUpperCase()}</span>
          </div>
          {!collapsed&&(
            <div style={{flex:1,overflow:"hidden"}}>
              <div style={{fontSize:12,fontWeight:700,color:"#fff",fontFamily:FONT,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user?.user_metadata?.name||"Usuário"}</div>
              <div style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,0.55)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",fontFamily:FONT}}>{user?.email}</div>
            </div>
          )}
          {!collapsed&&(
            <button onClick={signOut} title="Sair" style={{background:"none",border:"none",cursor:"pointer",color:"rgba(255,255,255,0.55)",padding:4,borderRadius:6,display:"flex",alignItems:"center"}}>
              <Icon name="logout" size={16} color="rgba(255,255,255,0.55)"/>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};

// ─── HEADER ───────────────────────────────────────────────────────────────────
const Header = ({ active, collapsed, notifications, setNotifOpen, notifOpen }) => {
  const labels = {dashboard:"Dashboard",leads:"Leads",campaigns:"Campanhas",automations:"Automações",landing:"Landing Pages",integrations:"Integrações",settings:"Configurações"};
  const unread = notifications.filter(n=>!n.read).length;
  return (
    <header style={{position:"fixed",top:0,left:collapsed?72:240,right:0,height:52,background:"#fff",borderBottom:`0.5px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 28px",zIndex:90,transition:"left 0.25s ease"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,fontFamily:FONT}}>
        <span style={{color:T.muted,fontSize:12,fontWeight:600}}>Vantari</span>
        <Icon name="chevron" size={14} color={T.border}/>
        <span style={{color:T.text,fontSize:14,fontWeight:700,fontFamily:HEAD}}>{labels[active]||active}</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:14}}>
        <div style={{position:"relative"}}>
          <button onClick={()=>setNotifOpen(!notifOpen)} style={{background:"none",border:"none",cursor:"pointer",color:T.muted,padding:8,borderRadius:8,position:"relative",display:"flex",alignItems:"center"}}>
            <Icon name="bell" size={20}/>
            {unread>0&&<span style={{position:"absolute",top:6,right:6,width:8,height:8,background:T.coral,borderRadius:"50%",border:"2px solid #fff"}}/>}
          </button>
          {notifOpen&&(
            <div style={{position:"absolute",right:0,top:"100%",marginTop:8,width:340,background:"#fff",border:`0.5px solid ${T.border}`,borderRadius:12,boxShadow:"0 10px 40px rgba(0,0,0,0.1)",zIndex:200}}>
              <div style={{padding:"14px 18px",borderBottom:`0.5px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontFamily:HEAD,fontWeight:700,fontSize:13,color:T.text}}>Notificações</span>
                {unread>0&&<span style={{fontSize:11,fontWeight:600,color:T.muted,fontFamily:FONT}}>{unread} não lidas</span>}
              </div>
              {notifications.map(n=>(
                <div key={n.id} style={{padding:"13px 18px",borderBottom:`0.5px solid ${T.faint}`,background:n.read?"#fff":"#e8f5fb",display:"flex",gap:12,alignItems:"flex-start"}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:n.read?T.border:T.teal,marginTop:5,flexShrink:0}}/>
                  <div>
                    <div style={{fontFamily:FONT,fontSize:13,fontWeight:n.read?600:700,color:T.text}}>{n.title}</div>
                    <div style={{fontFamily:FONT,fontSize:11,fontWeight:600,color:T.muted,marginTop:2}}>{n.time}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

// ─── DASHBOARD CONTENT ────────────────────────────────────────────────────────
const DashboardContent = () => {
  const stats = [
    {label:"Total de Leads",    value:"6.284", delta:"+12%",  color:T.teal,   icon:"leads"      },
    {label:"Campanhas Ativas",  value:"14",    delta:"+3",    color:T.green,  icon:"campaigns"  },
    {label:"Taxa de Abertura",  value:"38.4%", delta:"+2.1%", color:T.teal,   icon:"mail"       },
    {label:"Score Médio",       value:"72",    delta:"+8",    color:T.violet, icon:"automations"},
  ];
  return (
    <div>
      <div style={{marginBottom:28}}>
        <h1 style={{margin:"0 0 6px",fontFamily:HEAD,fontSize:22,fontWeight:700,color:T.ink,letterSpacing:"-0.02em"}}>Bom dia!</h1>
        <p style={{margin:0,color:T.muted,fontSize:14,fontWeight:600,fontFamily:FONT}}>Aqui está o resumo da sua plataforma de marketing</p>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:24}}>
        {stats.map((s,i)=>(
          <Card key={i} style={{padding:"18px 20px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontFamily:FONT,fontSize:11,fontWeight:700,color:T.muted,marginBottom:8,textTransform:"uppercase",letterSpacing:"0.05em"}}>{s.label}</div>
                <div style={{fontFamily:HEAD,fontSize:26,fontWeight:700,color:T.ink,lineHeight:1,letterSpacing:"-0.03em",fontVariantNumeric:"tabular-nums"}}>{s.value}</div>
                <div style={{fontFamily:FONT,fontSize:12,fontWeight:700,color:T.green,marginTop:6}}>{s.delta} este mês</div>
              </div>
              <div style={{width:42,height:42,borderRadius:10,background:`${s.color}14`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Icon name={s.icon} size={20} color={s.color}/>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        <Card style={{padding:"20px"}}>
          <h3 style={{margin:"0 0 18px",fontFamily:HEAD,fontSize:14,fontWeight:700,color:T.text}}>Leads por Canal</h3>
          {[{label:"Email Marketing",pct:38,color:T.teal},{label:"WhatsApp",pct:27,color:T.green},{label:"Instagram",pct:18,color:T.teal},{label:"Google Ads",pct:11,color:T.violet},{label:"Meta Ads",pct:6,color:T.amber}].map(c=>(
            <div key={c.label} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontFamily:FONT,fontSize:12,fontWeight:600,color:T.text}}>{c.label}</span>
                <span style={{fontFamily:FONT,fontSize:12,fontWeight:700,color:c.color}}>{c.pct}%</span>
              </div>
              <div style={{height:7,background:T.border,borderRadius:4,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${c.pct}%`,background:c.color,borderRadius:4,transition:"width 0.8s ease"}}/>
              </div>
            </div>
          ))}
        </Card>

        <Card style={{padding:"20px"}}>
          <h3 style={{margin:"0 0 18px",fontFamily:HEAD,fontSize:14,fontWeight:700,color:T.text}}>Funil de Conversão</h3>
          {[{label:"Topo — Visitantes",value:12400,color:T.teal},{label:"Meio — Leads",value:6284,color:T.teal},{label:"Qualificados (MQL)",value:1840,color:T.green},{label:"Oportunidades (SQL)",value:620,color:T.green},{label:"Clientes",value:148,color:"#04996a"}].map((f,i,arr)=>(
            <div key={f.label} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
              <div style={{width:`${(f.value/arr[0].value)*100}%`,minWidth:40,maxWidth:"60%",height:26,background:`${f.color}18`,border:`0.5px solid ${f.color}44`,borderRadius:6,display:"flex",alignItems:"center",paddingLeft:8,transition:"width 0.8s ease"}}>
                <span style={{fontFamily:HEAD,fontSize:11,fontWeight:700,color:f.color}}>{f.value.toLocaleString("pt-BR")}</span>
              </div>
              <span style={{fontFamily:FONT,fontSize:11,fontWeight:600,color:T.muted,flex:1}}>{f.label}</span>
            </div>
          ))}
        </Card>
      </div>

      <Card style={{padding:"20px"}}>
        <h3 style={{margin:"0 0 16px",fontFamily:HEAD,fontSize:14,fontWeight:700,color:T.text}}>Leads Recentes</h3>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{borderBottom:`2px solid ${T.faint}`}}>
              {["Nome","Email","Canal","Score","Estágio","Última interação"].map(h=>(
                <th key={h} style={{padding:"8px 10px",textAlign:"left",fontFamily:FONT,fontSize:10,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.06em"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              {name:"Carlos Mendes",  email:"carlos@empresa.com",  canal:"Meta Ads",   score:94, stage:"SQL",      last:"Há 2h"  },
              {name:"Fernanda Lima",  email:"fernanda@agencia.com",canal:"Email",       score:78, stage:"MQL",      last:"Há 4h"  },
              {name:"Roberto Alves",  email:"roberto@startup.io",  canal:"WhatsApp",   score:65, stage:"Nutrindo", last:"Ontem"  },
              {name:"Patrícia Santos",email:"patricia@tech.com.br",canal:"Google Ads", score:52, stage:"Novo",     last:"Ontem"  },
              {name:"Diego Rocha",    email:"diego@vendas.com",    canal:"Instagram",  score:41, stage:"Frio",     last:"3 dias" },
            ].map((lead,i)=>(
              <tr key={i} style={{borderBottom:`0.5px solid ${T.faint}`}}>
                <td style={{padding:"11px 10px",fontFamily:FONT,fontSize:13,fontWeight:700,color:T.text}}>{lead.name}</td>
                <td style={{padding:"11px 10px",fontFamily:FONT,fontSize:13,fontWeight:600,color:T.muted}}>{lead.email}</td>
                <td style={{padding:"11px 10px"}}><span style={{background:`${T.teal}14`,color:T.teal,borderRadius:6,padding:"3px 8px",fontSize:11,fontWeight:700,fontFamily:FONT}}>{lead.canal}</span></td>
                <td style={{padding:"11px 10px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:38,height:5,background:T.faint,borderRadius:3,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${lead.score}%`,background:lead.score>80?T.green:lead.score>50?T.amber:T.coral,borderRadius:3}}/>
                    </div>
                    <span style={{fontFamily:HEAD,fontSize:12,fontWeight:700,color:T.text}}>{lead.score}</span>
                  </div>
                </td>
                <td style={{padding:"11px 10px"}}>
                  <span style={{background:lead.stage==="SQL"?"#f0fdf7":lead.stage==="MQL"?"#e8f5fb":"#EEF2F6",color:lead.stage==="SQL"?T.green:lead.stage==="MQL"?T.teal:T.muted,borderRadius:6,padding:"3px 8px",fontSize:11,fontWeight:700,fontFamily:FONT}}>{lead.stage}</span>
                </td>
                <td style={{padding:"11px 10px",fontFamily:FONT,fontSize:12,fontWeight:600,color:T.muted}}>{lead.last}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

// ─── PLACEHOLDER PAGES ────────────────────────────────────────────────────────
const PlaceholderPage = ({ title, icon, description }) => (
  <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:400,gap:16}}>
    <div style={{width:72,height:72,borderRadius:20,background:`${T.teal}14`,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <Icon name={icon} size={36} color={T.teal}/>
    </div>
    <h2 style={{margin:0,fontFamily:HEAD,fontSize:20,fontWeight:700,color:T.text}}>{title}</h2>
    <p style={{margin:0,color:T.muted,fontFamily:FONT,fontSize:14,fontWeight:600,textAlign:"center",maxWidth:380}}>{description}</p>
    <Button>Em breve</Button>
  </div>
);

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
const MainApp = ({ user }) => {
  const [active,setActive]         = useState("dashboard");
  const [collapsed,setCollapsed]   = useState(false);
  const [notifOpen,setNotifOpen]   = useState(false);
  const [notifications] = useState([
    {id:1,title:"Novo lead de alta qualidade (score 94)",   time:"Há 2 horas",read:false},
    {id:2,title:"Campanha 'Black Friday' atingiu 1k aberturas",time:"Há 5 horas",read:false},
    {id:3,title:"Automação de nurturing ativada para 48 leads",time:"Há 1 dia",  read:true },
    {id:4,title:"Integração Meta Ads sincronizada com sucesso", time:"Há 2 dias", read:true },
  ]);

  const pages = {
    dashboard:    <DashboardContent/>,
    leads:        <PlaceholderPage title="Gestão de Leads" icon="leads" description="Visualize, filtre e gerencie todos os seus leads com scoring automático e segmentação inteligente."/>,
    campaigns:    <PlaceholderPage title="Campanhas" icon="campaigns" description="Crie e gerencie campanhas de email marketing, broadcast e drip sequences com IA integrada."/>,
    automations:  <PlaceholderPage title="Automações" icon="automations" description="Configure fluxos de automação multi-canal com condicionais avançadas e score comportamental."/>,
    landing:      <PlaceholderPage title="Landing Pages" icon="landing" description="Crie landing pages otimizadas com formulários progressivos e progressive profiling."/>,
    integrations: <PlaceholderPage title="Integrações" icon="integrations" description="Conecte WhatsApp Business, Meta Ads, Google Ads, Instagram e muito mais."/>,
    settings:     <PlaceholderPage title="Configurações" icon="settings" description="Gerencie sua conta, workspace, usuários, LGPD e preferências da plataforma."/>,
  };

  return (
    <div style={{display:"flex",minHeight:"100vh",background:T.bg}} onClick={()=>notifOpen&&setNotifOpen(false)}>
      <Sidebar active={active} setActive={setActive} collapsed={collapsed} setCollapsed={setCollapsed} user={user}/>
      <div style={{flex:1,marginLeft:collapsed?72:240,transition:"margin-left 0.25s ease",minWidth:0}}>
        <Header active={active} collapsed={collapsed} notifications={notifications} notifOpen={notifOpen} setNotifOpen={v=>{ v&&setNotifOpen(v); }}/>
        <main style={{padding:"80px 28px 28px",maxWidth:1400,margin:"0 auto"}}>
          {pages[active]||pages.dashboard}
        </main>
        <footer style={{borderTop:`0.5px solid ${T.border}`,padding:"18px 28px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontFamily:FONT,fontSize:12,fontWeight:600,color:T.muted}}>© 2025 Vantari · Plataforma de Marketing Digital</span>
          <div style={{display:"flex",gap:20}}>
            {["Documentação","Suporte","Status","LGPD"].map(link=>(
              <a key={link} href="#" style={{fontFamily:FONT,fontSize:12,fontWeight:600,color:T.muted,textDecoration:"none"}}>{link}</a>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
};

// ─── ROOT ──────────────────────────────────────────────────────────────────────
const AppContent = () => {
  const { user, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(()=>{
    if(!loading && user) navigate("/dashboard", { replace:true });
  },[user, loading, navigate]);

  if(loading) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:T.faint,flexDirection:"column",gap:16}}>
      <img src="/icone.png" alt="Vantari" style={{height:44,width:"auto",animation:"pulse 1.5s ease infinite"}}/>
      <span style={{fontFamily:FONT,fontWeight:600,color:T.muted,fontSize:14}}>Carregando...</span>
    </div>
  );
  return user ? null : <LoginScreen/>;
};

export default function VantariAuthSystem() {
  const toastSystem = useToastSystem();
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');
        *, *::before, *::after { box-sizing:border-box; }
        body { margin:0; padding:0; }
        @keyframes spin    { to { transform:rotate(360deg); } }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes pulse-live {
          0%, 100% { box-shadow: 0 0 0 0 rgba(6,182,212,0.6); }
          50%       { box-shadow: 0 0 0 8px rgba(6,182,212,0); }
        }
        input::placeholder { color:#B3BFCA; }
        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-thumb { background:${T.border}; border-radius:3px; }
      `}</style>
      <ToastContext.Provider value={toastSystem}>
        <ToastContainer toasts={toastSystem.toasts} remove={toastSystem.remove}/>
        <AuthProvider>
          <AppContent/>
        </AuthProvider>
      </ToastContext.Provider>
    </>
  );
}
