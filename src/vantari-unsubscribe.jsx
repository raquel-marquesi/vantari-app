import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "./supabase";

// ════════════════════════════════════════════════════════════════
// /unsubscribe — página pública (sem auth) de descadastro de email.
// Antes desta rota existir, o link "Descadastrar" nos templates e no HTML
// gerado pela edge function send-campaign apontava pra href="#" — não tinha
// pra onde ir. Esta página recebe ?p=<person_id>&w=<workspace_id> (gerados
// pelo próprio send-campaign no link do email) e chama a RPC pública
// core.set_email_consent, que grava core.consents (channel='email',
// status='revoked'). Essa é a mesma tabela já lida por segment-resolver.js
// e mkt.can_email() — então a partir daqui a pessoa some de fato dos envios.
// ════════════════════════════════════════════════════════════════

const T = {
  teal:    "#0D7491",
  green:   "#14A273",
  coral:   "#FF6B5E",
  bg:      "#F5F8FB",
  surface: "#FFFFFF",
  border:  "#E8EEF3",
  ink:     "#0E1A24",
  text:    "#2E3D4B",
  muted:   "#5A6B7A",
  font:    "'Inter', system-ui, sans-serif",
  head:    "'Sora', system-ui, sans-serif",
};

export default function VantariUnsubscribe() {
  const [searchParams] = useSearchParams();
  const personId    = searchParams.get("p");
  const workspaceId = searchParams.get("w");

  const [status, setStatus] = useState("loading"); // loading | done | invalid | error

  const run = useCallback(async () => {
    if (!personId || !workspaceId) { setStatus("invalid"); return; }
    try {
      // a RPC vive no schema core — supabase-js precisa do .schema()
      const { data, error } = await supabase.schema("core").rpc("set_email_consent", {
        p_workspace: workspaceId,
        p_person: personId,
      });
      if (error) throw error;
      setStatus(data ? "done" : "invalid");
    } catch {
      setStatus("error");
    }
  }, [personId, workspaceId]);

  useEffect(() => { run(); }, [run]);

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: T.font }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');`}</style>
      <div style={{
        background: T.surface, borderRadius: 14, padding: "32px 32px 28px", width: "100%", maxWidth: 440,
        textAlign: "center", boxShadow: "0 1px 0 rgba(14,26,36,.04), 0 16px 36px -16px rgba(14,26,36,.15)",
        border: `1px solid ${T.border}`,
      }}>
        {status === "loading" && (
          <>
            <div style={{ fontFamily: T.head, fontSize: 18, fontWeight: 700, color: T.ink, marginBottom: 8 }}>Processando…</div>
            <div style={{ fontSize: 13, color: T.muted }}>Um instante enquanto atualizamos sua preferência.</div>
          </>
        )}
        {status === "done" && (
          <>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#e6f9f2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 24 }}>✓</div>
            <div style={{ fontFamily: T.head, fontSize: 19, fontWeight: 700, color: T.green, marginBottom: 8 }}>Você foi descadastrado</div>
            <div style={{ fontSize: 13.5, color: T.text, lineHeight: 1.5 }}>
              Não vamos mais enviar emails de marketing para este endereço.
            </div>
          </>
        )}
        {(status === "invalid" || status === "error") && (
          <>
            <div style={{ fontFamily: T.head, fontSize: 18, fontWeight: 700, color: T.coral, marginBottom: 8 }}>Não foi possível processar</div>
            <div style={{ fontSize: 13.5, color: T.text, lineHeight: 1.5 }}>
              Este link de descadastro é inválido ou expirou. Se quiser parar de receber nossos emails, responda diretamente a um deles.
            </div>
          </>
        )}
        <div style={{ marginTop: 20, fontSize: 10, color: T.muted, fontWeight: 600 }}>
          powered by <strong style={{ color: T.teal }}>Vantari</strong>
        </div>
      </div>
    </div>
  );
}
