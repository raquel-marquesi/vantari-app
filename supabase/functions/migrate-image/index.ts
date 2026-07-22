import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "URL não informada" }), { status: 400 });
    }

    // Baixa a imagem direto do servidor (sem a trava de CORS do navegador)
    const imgRes = await fetch(url);
    if (!imgRes.ok) {
      return new Response(JSON.stringify({ error: `Falha ao baixar imagem (status ${imgRes.status})` }), { status: 400 });
    }
    const blob = await imgRes.blob();
    const contentType = imgRes.headers.get("content-type") || "image/png";
    const ext = (url.split(".").pop()?.split("?")[0]) || "png";
    const fileName = `migrated-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: upErr } = await supabase.storage.from("email-images").upload(fileName, blob, { contentType });
    if (upErr) throw upErr;

    const { data } = supabase.storage.from("email-images").getPublicUrl(fileName);
    // Em ambiente local, o Supabase às vezes devolve o endereço interno do Docker (kong:8000),
    // que só funciona dentro da própria rede local — trocamos pelo endereço acessível de fora.
    const publicUrl = data.publicUrl.replace("http://kong:8000", "http://127.0.0.1:55321");
    return new Response(JSON.stringify({ publicUrl }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});