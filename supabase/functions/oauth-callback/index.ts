// ╔══════════════════════════════════════════════════════════════════╗
// ║  oauth-callback — stub p/ Meta Ads + Google Ads                  ║
// ║                                                                  ║
// ║  GET  /functions/v1/oauth-callback?provider=meta&code=...        ║
// ║  GET  /functions/v1/oauth-callback?provider=google&code=...      ║
// ║                                                                  ║
// ║  Troca o `code` por access_token + refresh_token via provider    ║
// ║  e persiste em integration_credentials. Redireciona para         ║
// ║  /integrations no app.                                           ║
// ╚══════════════════════════════════════════════════════════════════╝

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = Deno.env.get("APP_URL") || "https://vantari-app.vercel.app";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const url = new URL(req.url);
    const provider = url.searchParams.get("provider"); // meta | google
    const code     = url.searchParams.get("code");
    const error    = url.searchParams.get("error");

    if (error) {
      return redirect(`${APP_URL}/integrations?error=${encodeURIComponent(error)}`);
    }
    if (!provider || !code) {
      return new Response(JSON.stringify({ error: "provider e code obrigatórios" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Busca credenciais do app (client_id + client_secret) já configurados
    const { data: creds, error: credsErr } = await supabase
      .from("integration_credentials")
      .select("client_id, client_secret")
      .eq("provider", provider)
      .single();

    if (credsErr || !creds?.client_id || !creds?.client_secret) {
      return redirect(`${APP_URL}/integrations?error=client_credentials_missing`);
    }

    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/oauth-callback?provider=${provider}`;
    let tokenRes: TokenResponse;

    if (provider === "meta") {
      tokenRes = await exchangeMeta(code, creds.client_id, creds.client_secret, redirectUri);
    } else if (provider === "google") {
      tokenRes = await exchangeGoogle(code, creds.client_id, creds.client_secret, redirectUri);
    } else {
      return new Response(JSON.stringify({ error: "provider inválido" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const expiresAt = tokenRes.expires_in
      ? new Date(Date.now() + tokenRes.expires_in * 1000).toISOString()
      : null;

    await supabase
      .from("integration_credentials")
      .update({
        status:        "connected",
        access_token:  tokenRes.access_token,
        refresh_token: tokenRes.refresh_token || null,
        expires_at:    expiresAt,
        scope:         tokenRes.scope || null,
        last_sync:     new Date().toISOString(),
        error_message: null,
      })
      .eq("provider", provider);

    return redirect(`${APP_URL}/integrations?connected=${provider}`);

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("oauth-callback error:", msg);
    return redirect(`${APP_URL}/integrations?error=${encodeURIComponent(msg)}`);
  }
});

type TokenResponse = {
  access_token:  string;
  refresh_token?: string;
  expires_in?:   number;
  scope?:        string;
};

async function exchangeMeta(
  code: string, clientId: string, clientSecret: string, redirectUri: string
): Promise<TokenResponse> {
  // Meta: https://developers.facebook.com/docs/facebook-login/guides/access-tokens#exchange-code
  const res = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?` +
    `client_id=${encodeURIComponent(clientId)}` +
    `&client_secret=${encodeURIComponent(clientSecret)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&code=${encodeURIComponent(code)}`
  );
  if (!res.ok) throw new Error(`meta token exchange: ${await res.text()}`);
  return res.json();
}

async function exchangeGoogle(
  code: string, clientId: string, clientSecret: string, redirectUri: string
): Promise<TokenResponse> {
  // Google: https://developers.google.com/identity/protocols/oauth2/web-server#exchange-authorization-code
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri:  redirectUri,
      grant_type:    "authorization_code",
    }).toString(),
  });
  if (!res.ok) throw new Error(`google token exchange: ${await res.text()}`);
  return res.json();
}

function redirect(location: string): Response {
  return new Response(null, { status: 302, headers: { ...CORS, Location: location } });
}
