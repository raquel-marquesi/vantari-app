import { lazy, Suspense, useState, useEffect, Component } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "./supabase";

// ────────────────────────────────────────────────────────────────
// Depois de cada deploy no Vercel, os arquivos JS de cada página ganham um
// hash novo no nome (ex: vantari-crm-abc123.js vira vantari-crm-def456.js).
// Um usuário que já estava com o site aberto ANTES do deploy ainda tem o
// index.html antigo referenciando o hash antigo — se ele clicar num menu
// pra uma página que ele ainda não tinha carregado, o navegador tenta
// buscar o arquivo antigo, que não existe mais → o import() falha → sem
// tratamento, isso derruba a árvore de componentes inteira e vira tela
// branca (o sintoma que outros usuários relataram, e a Catarina não vê
// porque costuma dar refresh com mais frequência ao testar).
//
// Fix em duas camadas:
//  1. lazyWithReload: se o import() de uma página falhar, recarrega a
//     página automaticamente UMA vez (o novo index.html já vem com os
//     hashes certos) — resolve sozinho, sem o usuário perceber.
//  2. ErrorBoundary: se mesmo assim algo quebrar (ex: um erro de verdade,
//     não relacionado a deploy), mostra uma tela de erro com botão de
//     recarregar em vez de ficar tudo branco sem explicação nenhuma.
// Guarda TIMESTAMP da última tentativa (não um boolean fixo). Um boolean
// travado em "1" na sessionStorage ficaria preso pra sempre na mesma aba —
// nem um Ctrl+Shift+R limpa sessionStorage, só fechar a aba/janela — então
// se a 1ª tentativa de reload não resolvesse (ex: instabilidade momentânea
// de rede), o usuário ficava preso na tela de erro mesmo dando refresh
// manualmente depois. Com um cooldown curto, uma nova tentativa automática
// volta a ser permitida passado esse tempo.
const CHUNK_RELOAD_KEY = "vantari_chunk_reload_attempted_at";
const CHUNK_RELOAD_COOLDOWN_MS = 8000;

function lazyWithReload(factory) {
  return lazy(async () => {
    try {
      const mod = await factory();
      // import deu certo — libera a tentativa de reload pro próximo deploy
      try { sessionStorage.removeItem(CHUNK_RELOAD_KEY); } catch {}
      return mod;
    } catch (err) {
      let lastAttempt = 0;
      try { lastAttempt = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY)) || 0; } catch {}
      const triedRecently = Date.now() - lastAttempt < CHUNK_RELOAD_COOLDOWN_MS;
      if (!triedRecently) {
        try { sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now())); } catch {}
        // reload "normal" confia no Cache-Control do index.html (agora
        // no-cache, ver vercel.json) — mas alguns proxies corporativos
        // ignoram esse header. Um querystring novo garante URL diferente
        // pra qualquer cache no meio do caminho, sem depender só do header.
        const url = new URL(window.location.href);
        url.searchParams.set("_r", String(Date.now()));
        window.location.replace(url.toString());
        // trava o carregamento suspenso até o reload acontecer, em vez de
        // deixar o React tentar renderizar um módulo quebrado
        return new Promise(() => {});
      }
      throw err;
    }
  });
}

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error("Erro na aplicação:", error, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          height: "100vh", gap: 14, background: "#F5F8FB", color: "#2E3D4B",
          fontFamily: "'Inter', system-ui, sans-serif", padding: 24, textAlign: "center",
        }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: "#0E1A24" }}>Algo deu errado ao carregar a página</span>
          <span style={{ fontSize: 13.5, color: "#5A6B7A", maxWidth: 420 }}>
            Isso costuma acontecer logo depois de uma atualização do sistema. Clique no botão abaixo pra recarregar.
          </span>
          <button
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.set("_r", String(Date.now()));
              window.location.replace(url.toString());
            }}
            style={{
              padding: "10px 20px", background: "linear-gradient(135deg, #0D7491 0%, #14A273 100%)",
              border: "none", borderRadius: 9, color: "#fff", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
            }}
          >
            Recarregar página
          </button>
          {/* detalhe técnico visível na tela — sem isso, diagnosticar um erro
              relatado por outro usuário depende de pedir pra ele abrir o
              console do navegador, o que trava a investigação */}
          <details style={{ marginTop: 10, maxWidth: 560, textAlign: "left" }}>
            <summary style={{ cursor: "pointer", fontSize: 12, color: "#8696A5", fontWeight: 600 }}>Detalhes técnicos</summary>
            <pre style={{
              marginTop: 8, padding: 10, background: "#fff", border: "1px solid #E8EEF3", borderRadius: 8,
              fontSize: 11, color: "#5A6B7A", whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 200, overflowY: "auto",
            }}>
              {String(this.state.error?.message || this.state.error)}
              {"\n"}URL: {window.location.href}
              {"\n"}Navegador: {navigator.userAgent}
            </pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

const AuthSystem     = lazyWithReload(() => import("./vantari-auth-system"));
const Analytics      = lazyWithReload(() => import("./vantari-analytics-dashboard"));
const Scoring        = lazyWithReload(() => import("./vantari-scoring-system"));
const EmailMarketing = lazyWithReload(() => import("./vantari-email-marketing"));
const LandingPages   = lazyWithReload(() => import("./vantari-landing-pages"));
const AIMarketing    = lazyWithReload(() => import("./vantari-ai-marketing"));
const Integrations   = lazyWithReload(() => import("./vantari-integrations-hub"));
const Settings         = lazyWithReload(() => import("./vantari-settings-admin"));
const Onboarding       = lazyWithReload(() => import("./vantari-onboarding-wizard"));
const WorkflowBuilder  = lazyWithReload(() => import("./vantari-workflow-builder"));
const Segments         = lazyWithReload(() => import("./vantari-segments"));
const CRM              = lazyWithReload(() => import("./vantari-crm"));
const DealDetail       = lazyWithReload(() => import("./vantari-crm-deal"));
const Contatos         = lazyWithReload(() => import("./vantari-crm-contatos"));
const Empresas         = lazyWithReload(() => import("./vantari-crm-empresas"));
const Atividades       = lazyWithReload(() => import("./vantari-crm-atividades"));
const Tarefas          = lazyWithReload(() => import("./vantari-crm-tarefas"));
const EmRisco          = lazyWithReload(() => import("./vantari-crm-em-risco"));
const InboxAtendimento = lazyWithReload(() => import("./vantari-inbox"));
const Reports          = lazyWithReload(() => import("./vantari-reports"));
const PublicForm       = lazyWithReload(() => import("./vantari-public-form"));
const Unsubscribe      = lazyWithReload(() => import("./vantari-unsubscribe"));

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
      <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/"               element={<Navigate to="/dashboard" replace />} />
          <Route path="/login"          element={<AuthSystem />} />
          {/* Rota pública: form embedável /f/:slug */}
          <Route path="/f/:slug"        element={<PublicForm />} />
          {/* Rota pública: descadastro de email (link "Descadastrar" nas campanhas) */}
          <Route path="/unsubscribe"    element={<Unsubscribe />} />
          <Route path="/dashboard"      element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          {/* /leads abre a tela do core (antes era public.leads, agora core.persons) */}
          <Route path="/leads"          element={<ProtectedRoute><Contatos /></ProtectedRoute>} />
          <Route path="/scoring"        element={<ProtectedRoute><Scoring /></ProtectedRoute>} />
          <Route path="/email"          element={<ProtectedRoute><EmailMarketing /></ProtectedRoute>} />
          <Route path="/landing"        element={<ProtectedRoute><LandingPages /></ProtectedRoute>} />
          <Route path="/ai-marketing"   element={<ProtectedRoute><AIMarketing /></ProtectedRoute>} />
          <Route path="/integrations"   element={<ProtectedRoute><Integrations /></ProtectedRoute>} />
          <Route path="/settings"       element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/onboarding"     element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          <Route path="/workflow"       element={<ProtectedRoute><WorkflowBuilder /></ProtectedRoute>} />
          <Route path="/segments"      element={<ProtectedRoute><Segments /></ProtectedRoute>} />
          <Route path="/crm"           element={<ProtectedRoute><CRM /></ProtectedRoute>} />
          <Route path="/crm/:dealId"   element={<ProtectedRoute><DealDetail /></ProtectedRoute>} />
          <Route path="/empresas"      element={<ProtectedRoute><Empresas /></ProtectedRoute>} />
          <Route path="/activities"    element={<ProtectedRoute><Atividades /></ProtectedRoute>} />
          <Route path="/tasks"         element={<ProtectedRoute><Tarefas /></ProtectedRoute>} />
          <Route path="/risco"         element={<ProtectedRoute><EmRisco /></ProtectedRoute>} />
          <Route path="/inbox"        element={<ProtectedRoute><InboxAtendimento /></ProtectedRoute>} />
          <Route path="/reports"      element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          {/* /contatos → redireciona pra /leads (termo adotado pela equipe) */}
          <Route path="/contatos"      element={<Navigate to="/leads" replace />} />
          <Route path="*"               element={<NotFound />} />
        </Routes>
      </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
