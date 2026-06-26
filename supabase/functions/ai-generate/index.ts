// Edge Function: ai-generate
// Proxy seguro para o Google Gemini. A chave (GEMINI_API_KEY) vive como secret
// no Supabase e NUNCA chega ao navegador. O front chama via supabase.functions.invoke.
// Retorno: { text, tokens } — mesma forma que o callAI antigo esperava.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { system, prompt, model, temperature } = await req.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: "prompt obrigatório" }), { status: 400, headers: CORS });
    }

    const KEY = Deno.env.get("GEMINI_API_KEY");
    if (!KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY não configurada no Supabase" }), { status: 500, headers: CORS });
    }

    // só aceita modelos Gemini; fallback para o padrão (ou GEMINI_MODEL)
    const m = (model && String(model).startsWith("gemini"))
      ? model
      : (Deno.env.get("GEMINI_MODEL") || "gemini-2.0-flash");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${KEY}`;
    const body: Record<string, unknown> = {
      contents: [{ role: "user", parts: [{ text: String(prompt) }] }],
      generationConfig: {
        temperature: typeof temperature === "number" ? temperature : 0.7,
        maxOutputTokens: 1024,
      },
    };
    if (system) body.systemInstruction = { parts: [{ text: String(system) }] };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) {
      const msg = data?.error?.message || `Gemini HTTP ${res.status}`;
      return new Response(JSON.stringify({ error: msg }), { status: 502, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const text = (data?.candidates?.[0]?.content?.parts || [])
      .map((p: { text?: string }) => p.text || "").join("");
    const tokens = data?.usageMetadata?.totalTokenCount || 0;

    return new Response(JSON.stringify({ text, tokens }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
