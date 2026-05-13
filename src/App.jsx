import { lazy, Suspense, useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./supabase";

const AuthSystem     = lazy(() => import("./vantari-auth-system"));
const Analytics      = lazy(() => import("./vantari-analytics-dashboard"));
const Leads          = lazy(() => import("./vantari-leads-module"));
const Scoring        = lazy(() => import("./vantari-scoring-system"));
const EmailMarketing = lazy(() => import("./vantari-email-marketing"));
const LandingPages   = lazy(() => import("./vantari-landing-pages"));
const AIMarketing    = lazy(() => import("./vantari-ai-marketing"));
const Integrations   = lazy(() => import("./vantari-integrations-hub"));
const Settings         = lazy(() => import("./vantari-settings-admin"));
const Onboarding       = lazy(() => import("./vantari-onboarding-wizard"));
const WorkflowBuilder  = lazy(() => import("./vantari-workflow-builder"));
const Segments         = lazy(() => import("./vantari-segments"));

function PageLoader() {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      background: "#F5F8FB",
      color: "#5A6B7A",
      fontSize: 14,
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      Carregando...
    </div>
  );
}

function NotFound() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      background: "#F5F8FB",
      gap: 12,
      color: "#5A6B7A",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <span style={{ fontSize: 48, color: "#0E1A24" }}>404</span>
      <span style={{ fontSize: 16 }}>Página não encontrada</span>
      <a href="/dashboard" style={{ color: "#0D7491", fontSize: 14 }}>Voltar ao Dashboard</a>
    </div>
  );
}

function useSession() {
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);
  return session;
}

function ProtectedRoute({ children }) {
  const session = useSession();
  if (session === undefined) return <PageLoader />;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/"               element={<Navigate to="/dashboard" replace />} />
          <Route path="/login"          element={<AuthSystem />} />
          <Route path="/dashboard"      element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/leads"          element={<ProtectedRoute><Leads /></ProtectedRoute>} />
          <Route path="/scoring"        element={<ProtectedRoute><Scoring /></ProtectedRoute>} />
          <Route path="/email"          element={<ProtectedRoute><EmailMarketing /></ProtectedRoute>} />
          <Route path="/landing"        element={<ProtectedRoute><LandingPages /></ProtectedRoute>} />
          <Route path="/ai-marketing"   element={<ProtectedRoute><AIMarketing /></ProtectedRoute>} />
          <Route path="/integrations"   element={<ProtectedRoute><Integrations /></ProtectedRoute>} />
          <Route path="/settings"       element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/onboarding"     element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          <Route path="/workflow"       element={<ProtectedRoute><WorkflowBuilder /></ProtectedRoute>} />
          <Route path="/segments"      element={<ProtectedRoute><Segments /></ProtectedRoute>} />
          <Route path="*"               element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
