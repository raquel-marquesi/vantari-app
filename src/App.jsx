import { useState } from "react";
import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";

// Pages (default exports — any name works on import)
import AuthSystem      from "./vantari-auth-system";
import Analytics       from "./vantari-analytics-dashboard";
import Leads           from "./vantari-leads-module";
import Scoring         from "./vantari-scoring-system";
import EmailMarketing  from "./vantari-email-marketing";
import LandingPages    from "./vantari-landing-pages";
import AIMarketing     from "./vantari-ai-marketing";
import Integrations    from "./vantari-integrations-hub";

const NAV = [
  { path: "/dashboard",    label: "Dashboard",      icon: "📊" },
  { path: "/leads",        label: "Leads",          icon: "👥" },
  { path: "/scoring",      label: "Scoring",        icon: "⭐" },
  { path: "/email",        label: "E-mail",         icon: "✉️"  },
  { path: "/landing",      label: "Landing Pages",  icon: "🖥️" },
  { path: "/ai-marketing", label: "IA Marketing",   icon: "🤖" },
  { path: "/integrations", label: "Integrações",    icon: "🔗" },
];

function Sidebar({ collapsed, toggle }) {
  return (
    <aside style={{
      width: collapsed ? 64 : 220,
      minHeight: "100vh",
      background: "#0a0f1e",
      borderRight: "1px solid #1e2a45",
      display: "flex",
      flexDirection: "column",
      transition: "width .25s ease",
      overflow: "hidden",
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: "20px 16px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        borderBottom: "1px solid #1e2a45",
        minHeight: 64,
      }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>🔷</span>
        {!collapsed && (
          <span style={{
            color: "#e2e8f0",
            fontWeight: 700,
            fontSize: 18,
            letterSpacing: "-0.5px",
            whiteSpace: "nowrap",
          }}>Vantari</span>
        )}
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
        {NAV.map(({ path, label, icon }) => (
          <NavLink
            key={path}
            to={path}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 8,
              textDecoration: "none",
              color: isActive ? "#60a5fa" : "#94a3b8",
              background: isActive ? "rgba(96,165,250,0.1)" : "transparent",
              fontWeight: isActive ? 600 : 400,
              fontSize: 14,
              whiteSpace: "nowrap",
              transition: "all .15s",
            })}
          >
            <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
            {!collapsed && label}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={toggle}
        style={{
          margin: "12px 8px",
          padding: "8px 12px",
          background: "#1e2a45",
          border: "none",
          borderRadius: 8,
          color: "#94a3b8",
          cursor: "pointer",
          fontSize: 14,
          textAlign: collapsed ? "center" : "right",
        }}
      >
        {collapsed ? "▶" : "◀ Recolher"}
      </button>
    </aside>
  );
}

export default function App() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <BrowserRouter>
      <div style={{ display: "flex", minHeight: "100vh", background: "#060d1f" }}>
        <Sidebar collapsed={collapsed} toggle={() => setCollapsed(c => !c)} />

        <main style={{ flex: 1, overflow: "auto" }}>
          <Routes>
            <Route path="/"               element={<Navigate to="/dashboard" replace />} />
            <Route path="/login"          element={<AuthSystem />} />
            <Route path="/dashboard"      element={<Analytics />} />
            <Route path="/leads"          element={<Leads />} />
            <Route path="/scoring"        element={<Scoring />} />
            <Route path="/email"          element={<EmailMarketing />} />
            <Route path="/landing"        element={<LandingPages />} />
            <Route path="/ai-marketing"   element={<AIMarketing />} />
            <Route path="/integrations"   element={<Integrations />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
