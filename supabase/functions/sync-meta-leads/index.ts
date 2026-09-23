// ════════════════════════════════════════════════════════════════
// Edge Function: /sync-meta-leads
// ────────────────────────────────────────────────────────────────
// Chamada pelo botão "Sincronizar Agora" em /integrations → Meta →
// Leads de Formulário. Busca leads novos dos formulários de Lead Ads
// configurados (integration_credentials.config.form_ids) via Graph
// API, e resolve cada um como pessoa canônica (core.persons), do
// mesmo jeito que a função /ingest faz — só que aqui é ESTE servidor
// quem busca o dado no Meta (pull), em vez do Meta empurrar via
// webhook (que exigiria App Review pra leadgen webhooks). Reaproveita
// as mesmas RPCs que /ingest usa (core.resolve_person, core.events),
// direto (sem round-trip HTTP), já que ambas rodam com service_role.
//
// Auth: JWT do usuário logado no Next (verify_jwt = true, padrão) — chamada
// manual do botão "Sincronizar Agora" — OU header X-Cron-Secret — chamada
// automática do pg_cron a cada 10 min
// (20260910000002_schedule_sync_meta_leads_cron.sql), pra não depender de
// alguém lembrar de clicar no botão.
//
// Body: { "provider": "meta" }  (form_ids vêm de integration_credentials.config)
// Resposta: { synced, skipped, forms: [{id,label,found,synced,error?}] }
// ════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// segredo dedicado a chamadas internas do pg_cron (mesmo padrão do
// X-Ingest-Secret que /ingest, /ingest-message e /lookup-person usam pra
// chamadas externas) — permite o cron chamar esta function sem uma sessão
// de usuário logado (só o clique manual em "Sincronizar Agora" tinha isso
// até agora). Reutilizável por qualquer outra function agendada no futuro.
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

// Token de usuário do SISTEMA do Meta Business Manager (não expira),
// vinculado à Página "Vantari Crédito" com os escopos leads_retrieval +
// pages_read_engagement + pages_show_list — configurado em 14/09/2026
// pra substituir o OAuth pessoal como forma de obter o Page Access Token.
// Motivo: o OAuth pessoal depende de qual(is) Página(s) o usuário concede
// no picker do Facebook a cada reconexão, e isso mudava a cada vez (ver
// histórico em integration_sync_logs) — nunca incluindo de forma confiável
// a Página dona do formulário. Quando este secret está setado, ele substitui
// o creds.access_token do OAuth pessoal como entrada do /me/accounts (o
// endpoint também funciona pra system users, devolvendo o Page Access Token
// de cada Página atribuída ao system user); se REMOVIDO (unset), a função
// volta a usar o OAuth pessoal (creds.access_token) como antes.
const META_SYSTEM_USER_TOKEN = Deno.env.get("META_SYSTEM_USER_TOKEN") ?? "";

// App single-tenant hoje (só a sala "Vantari") — mesmo uuid usado em
// workspace_settings e nos seeds de tracked_pages/team_members.
const WORKSPACE_ID = "53092199-7b75-4342-a897-f589d6f34922";

const GRAPH_VERSION = "v19.0";
const MAX_PAGES_PER_FORM = 10; // trava de segurança (até 1000 leads/formulário por sync)

// mesmo mapeamento campanha → pipeline que o /ingest já usa (fonte da verdade),
// duplicado aqui de propósito — mesmo padrão que o resto do arquivo já segue
// (reaproveita RPCs direto, sem round-trip HTTP pro /ingest)
const CAMPAIGN_PIPELINE_MAP: Record<string, string> = {
  recuperacao_judicial_varejo: "Recuperação Judicial — Varejo",
};

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// Uma linha por execução (sucesso ou erro) em public.integration_sync_logs —
// alimenta a tela /integrations → Logs de Sincronização, que até 11/09 lia de
// um mock hardcoded no frontend e por isso nunca mostrava nada de verdade.
async function writeSyncLog(
  admin: ReturnType<typeof createClient>,
  entry: { status: "success" | "error" | "warning"; details: string; records_affected?: number; payload?: unknown }
) {
  const { error } = await admin.from("integration_sync_logs").insert({
    provider: "meta",
    action: "sync_meta_leads",
    status: entry.status,
    details: entry.details,
    records_affected: entry.records_affected ?? 0,
    payload: entry.payload ?? null,
  });
  if (error) console.error("sync-meta-leads: falha ao gravar integration_sync_logs", error.message);
}

// Mesma heurística da função /ingest — casa por substring no nome do
// campo, já que o Meta devolve a "key" da pergunta, não um schema fixo.
function fromMetaFieldData(fd: Array<{ name: string; values: string[] }>) {
  const get = (...keys: string[]) => {
    for (const f of fd) {
      const n = (f.name || "").toLowerCase();
      if (keys.some((k) => n.includes(k))) return f.values?.[0] ?? null;
    }
    return null;
  };
  return {
    email: get("email"),
    phone: get("phone", "telefone", "whatsapp"),
    name:  get("full_name", "name", "nome"),
    cpf:   get("cpf"),
    processo: get("processo", "cnj"),
  };
}

type MetaLead = {
  id: string;
  created_time: string;
  field_data: Array<{ name: string; values: string[] }>;
  ad_id?: string; ad_name?: string;
  adset_id?: string; adset_name?: string;
  campaign_id?: string; campaign_name?: string;
  platform?: string;
};

type MetaPage = { id: string; name: string; access_token: string };

// A Leads Retrieval API exige um Page Access Token da Página DONA do
// formulário — o token de usuário salvo em integration_credentials (obtido
// no oauth-callback via /oauth/access_token) não é aceito nela, mesmo com o
// escopo leads_retrieval concedido. O Graph API não avisa isso claramente:
// ele responde "Object with ID '...' does not exist, cannot be loaded due
// to missing permissions" (erro que apareceu em produção em 11/09), que
// parece "form errado" mas na verdade é "token errado". Por isso é preciso
// trocar: listar as Páginas administradas pelo usuário (/me/accounts, que
// já devolve o access_token de cada Página) e achar qual delas consegue
// enxergar o formulário.
async function listUserPages(userAccessToken: string): Promise<MetaPage[]> {
  const pages: MetaPage[] = [];
  let url = `https://graph.facebook.com/${GRAPH_VERSION}/me/accounts?fields=id,name,access_token&limit=100&access_token=${encodeURIComponent(userAccessToken)}`;
  while (url) {
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok) {
      throw new Error(
        json?.error?.message
          ? `Falha ao listar Páginas do usuário (/me/accounts): ${json.error.message}`
          : `Falha ao listar Páginas do usuário (/me/accounts), status ${res.status}`
      );
    }
    pages.push(...(json.data || []));
    url = json.paging?.next || "";
  }
  return pages;
}

// Testa cada Página listando os formulários de Lead Ads que ELA enxerga
// (GET /{page_id}/leadgen_forms) e checando se o form_id procurado está na
// lista — GET /{form_id}?fields=id direto retornava "sem acesso" mesmo com
// Página/token corretos (permissão leads_retrieval confirmada ativa no app),
// então a checagem de posse passou a ser feita pela lista da Página, não
// pelo objeto do formulário isolado.
async function resolvePageTokenForForm(pages: MetaPage[], formId: string): Promise<MetaPage> {
  for (const page of pages) {
    let url = `https://graph.facebook.com/${GRAPH_VERSION}/${page.id}/leadgen_forms?fields=id,name&limit=100&access_token=${encodeURIComponent(page.access_token)}`;
    let found = false;
    for (let guard = 0; guard < MAX_PAGES_PER_FORM && url; guard++) {
      const res = await fetch(url);
      const json = await res.json().catch((e) => ({ __parse_error: String(e) }));
      if (!res.ok) break; // essa Página falhou por completo, tenta a próxima
      const forms: Array<{ id: string; name?: string }> = json.data || [];
      if (forms.some((f) => String(f.id) === String(formId))) { found = true; break; }
      url = json.paging?.next || "";
    }
    if (found) return page;
  }
  throw new Error(
    pages.length
      ? `Nenhuma das ${pages.length} Página(s) administrada(s) pelo usuário conectado (${pages.map(p => `"${p.name}"`).join(", ")}) tem acesso ao formulário ${formId}. Confira se a Página dona do anúncio está entre elas no Meta Business Suite.`
      : `O usuário conectado não administra nenhuma Página no Meta (0 resultados em /me/accounts) — verifique o escopo "pages_show_list" na conexão OAuth.`
  );
}

async function fetchFormLeads(formId: string, accessToken: string, sinceUnix: number | null): Promise<MetaLead[]> {
  const leads: MetaLead[] = [];
  const fields = "id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,platform";
  const filtering = sinceUnix
    ? `&filtering=${encodeURIComponent(JSON.stringify([{ field: "time_created", operator: "GREATER_THAN", value: sinceUnix }]))}`
    : "";
  let url = `https://graph.facebook.com/${GRAPH_VERSION}/${formId}/leads?fields=${fields}&limit=100${filtering}&access_token=${encodeURIComponent(accessToken)}`;

  for (let page = 0; page < MAX_PAGES_PER_FORM && url; page++) {
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error?.message || `Graph API error (${res.status})`);
    leads.push(...(json.data || []));
    url = json.paging?.next || "";
  }
  return leads;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST")    return jsonResp({ error: "Method not allowed" }, 405);

  const isCronCall = !!CRON_SECRET && req.headers.get("X-Cron-Secret") === CRON_SECRET;
  if (!isCronCall) {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResp({ error: "unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return jsonResp({ error: "unauthorized" }, 401);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const core  = admin.schema("core");

  const { data: creds, error: credsErr } = await admin
    .from("integration_credentials")
    .select("status, access_token, config")
    .eq("provider", "meta")
    .maybeSingle();
  if (credsErr) {
    await writeSyncLog(admin, { status: "error", details: credsErr.message });
    return jsonResp({ error: credsErr.message }, 500);
  }
  if (!creds) {
    const msg = "Nenhuma credencial Meta cadastrada (linha \"meta\" ausente em integration_credentials). Configure em /integrations.";
    await writeSyncLog(admin, { status: "error", details: msg });
    return jsonResp({ error: msg }, 400);
  }
  // Com META_SYSTEM_USER_TOKEN configurado, o OAuth pessoal (access_token/status)
  // deixa de ser exigido — só usamos essa linha pra ler config.form_ids.
  if (!META_SYSTEM_USER_TOKEN && (!creds.access_token || creds.status !== "connected")) {
    const msg = "Meta não está conectado. Salve as credenciais e clique em \"Conectar via OAuth\" primeiro.";
    await writeSyncLog(admin, { status: "error", details: msg });
    return jsonResp({ error: msg }, 400);
  }

  const formIds: Array<{ id: string; label?: string; campanha?: string; last_sync_ts?: number }> = creds.config?.form_ids || [];
  if (!formIds.length) {
    const msg = "Nenhum formulário configurado. Adicione o ID de um Lead Ads Form em Configuração.";
    await writeSyncLog(admin, { status: "error", details: msg });
    return jsonResp({ error: msg }, 400);
  }

  // Resolve os Page Access Tokens UMA vez (reaproveitado por todos os
  // formulários do loop abaixo).
  let userPages: MetaPage[] = [];
  let pagesError: string | undefined;
  if (META_SYSTEM_USER_TOKEN) {
    // Um token de usuário do sistema (Business Manager) NÃO é, por si só, o
    // Page Access Token — ele autentica como o system user, que só "empresta"
    // acesso à Página quando trocado. Por isso chamamos /me/accounts com ESSE
    // token: system users com a Página atribuída como asset também recebem de
    // volta {id, name, access_token} de cada Página (mesmo endpoint que já
    // usamos pro OAuth pessoal, o Graph API não diferencia). Só se isso falhar
    // (ex.: variante de token já pré-vinculada a uma única Página, que às
    // vezes vem pronta como Page Access Token) caímos pro uso direto do
    // próprio token como se already fosse o da Página.
    try {
      const systemPages = await listUserPages(META_SYSTEM_USER_TOKEN);
      userPages = systemPages.length
        ? systemPages
        : [{ id: "system-user", name: "token de sistema (uso direto, /me/accounts vazio)", access_token: META_SYSTEM_USER_TOKEN }];
    } catch (err) {
      console.error("sync-meta-leads: /me/accounts falhou pro token de sistema, usando o token direto como Page Access Token", err instanceof Error ? err.message : String(err));
      userPages = [{ id: "system-user", name: "token de sistema (uso direto, fallback)", access_token: META_SYSTEM_USER_TOKEN }];
    }
  } else {
    try {
      userPages = await listUserPages(creds.access_token);
    } catch (err) {
      pagesError = err instanceof Error ? err.message : String(err);
    }
  }

  const results: Array<{ id: string; label?: string; found: number; synced: number; skipped: number; error?: string }> = [];
  let totalSynced = 0, totalSkipped = 0;
  const nextFormIds = [...formIds];

  for (let i = 0; i < formIds.length; i++) {
    const form = formIds[i];
    const stat = { id: form.id, label: form.label, found: 0, synced: 0, skipped: 0, error: undefined as string | undefined };
    if (pagesError) { stat.error = pagesError; results.push(stat); continue; }
    try {
      const page = await resolvePageTokenForForm(userPages, form.id);
      const metaLeads = await fetchFormLeads(form.id, page.access_token, form.last_sync_ts || null);
      stat.found = metaLeads.length;

      // watermark do "since": usa o created_time mais recente entre os leads
      // ENCONTRADOS nesta rodada, nunca o relógio de agora. Achado 17/09/2026
      // investigando um lead de teste que nunca sincronizava: a versão antiga
      // gravava last_sync_ts = Date.now() incondicionalmente (abaixo, na l.413
      // original), mesmo quando found=0 — se a API do Graph ainda não tinha
      // indexado um lead recém-criado (delay normal de propagação), a próxima
      // rodada filtrava "time_created > sinceUnix" com o relógio já tendo
      // passado do created_time do lead, perdendo ele PRA SEMPRE (o filtro é
      // "maior que", não "maior ou igual", e o watermark nunca volta atrás).
      // Agora: found=0 não avança nada (mesma janela é reconsultada até o
      // Graph indexar); found>0 avança só até o created_time mais recente
      // realmente recebido.
      let maxFoundCreatedTs: number | null = null;
      for (const lead of metaLeads) {
        const ts = Math.floor(new Date(lead.created_time).getTime() / 1000);
        if (Number.isFinite(ts) && (maxFoundCreatedTs === null || ts > maxFoundCreatedTs)) maxFoundCreatedTs = ts;
      }

      // created_time do lead mais antigo que FALHOU nesta rodada. Achado
      // 23/09/2026: entre 21/09 e 23/09 o resolve_person deu "permission
      // denied" pra todo lead, mas o watermark continuava avançando até
      // maxFoundCreatedTs e os leads que falharam nunca eram reconsultados.
      // Agora, se algum falhar, o watermark para logo antes dele e a próxima
      // rodada tenta de novo (o check de duplicata acima evita regravar os
      // que já tinham dado certo).
      let minFailedCreatedTs: number | null = null;
      const markFailed = (lead: MetaLead) => {
        const ts = Math.floor(new Date(lead.created_time).getTime() / 1000);
        if (Number.isFinite(ts) && (minFailedCreatedTs === null || ts < minFailedCreatedTs)) minFailedCreatedTs = ts;
      };

      for (const lead of metaLeads) {
        // idempotência: não duplica se essa sync já rodou sobre o mesmo lead antes
        // (rede de segurança além do filtro "since" por formulário).
        const { data: dup } = await core
          .from("events")
          .select("id")
          .eq("source", "meta")
          .eq("type", "lead_created")
          .contains("payload", { meta_lead_id: lead.id })
          .maybeSingle();
        if (dup) { stat.skipped++; totalSkipped++; continue; }

        const p = fromMetaFieldData(lead.field_data || []);
        if (!p.cpf && !p.phone && !p.email) { stat.skipped++; totalSkipped++; continue; }

        const { data: personId, error: rpcErr } = await core.rpc("resolve_person", {
          p_workspace: WORKSPACE_ID,
          p_cpf: p.cpf, p_phone: p.phone, p_email: p.email, p_name: p.name,
          p_source: "meta",
          p_utm_source:   lead.platform === "ig" ? "instagram" : "facebook",
          p_utm_medium:   "paid-social",
          p_utm_campaign: lead.campaign_name || null,
          p_utm_content:  lead.ad_name || null,
          p_utm_term:     lead.adset_name || null,
        });
        if (rpcErr) { stat.error = rpcErr.message; markFailed(lead); continue; }

        const { error: eventErr } = await core.from("events").insert({
          workspace_id: WORKSPACE_ID,
          person_id:    personId,
          source:       "meta",
          type:         "lead_created",
          occurred_at:  lead.created_time || undefined, // quando o lead foi enviado no Meta, não quando sincronizamos
          payload: {
            meta_lead_id: lead.id,
            form_id: form.id, form_label: form.label || null,
            field_data: lead.field_data,
            ad_id: lead.ad_id, ad_name: lead.ad_name,
            adset_id: lead.adset_id, adset_name: lead.adset_name,
            campaign_id: lead.campaign_id, campaign_name: lead.campaign_name,
            platform: lead.platform, created_time: lead.created_time,
          },
        });
        // sem o evento, o check de duplicata não reconhece o lead — tenta de novo na próxima rodada
        if (eventErr) { stat.error = eventErr.message; markFailed(lead); continue; }

        // marca a campanha pra scoring/segmentação, mesmo sem processo informado
        // (não-fatal: pessoa e evento já foram gravados acima) — só roda se o
        // formulário tiver campanha configurada em config.form_ids[i].campanha
        if (form.campanha) {
          const { error: attrErr } = await core.rpc("set_person_attributes", {
            p_person: personId,
            p_attrs: { campanha: form.campanha },
            p_source: "meta",
          });
          if (attrErr) {
            console.error("sync-meta-leads: atributos não gravados", { personId, detail: attrErr.message });
          }
        }

        // se a pessoa informou o número do processo, cria o negócio — na pipeline
        // dedicada quando a campanha do formulário bater com o mapeamento, senão
        // cai no fallback padrão (Esteira de Aquisição)
        const pipelineName = form.campanha ? (CAMPAIGN_PIPELINE_MAP[form.campanha] ?? null) : null;
        let dealId: string | null = null;
        if (p.processo) {
          const { data, error: dealErr } = await admin.schema("crm").rpc("ingest_processo_lead", {
            p_workspace: WORKSPACE_ID,
            p_person: personId,
            p_numero_cnj: p.processo,
            p_honorarios_pct: null,
            p_source: "meta",
            p_pipeline_name: pipelineName,
            // recuperação judicial: nunca reprovar sozinho (crm.set_elegibilidade
            // já tem essa exceção) — hoje toda campanha mapeada é de RJ.
            p_reclamada_em_rj: pipelineName !== null,
          });
          if (dealErr) {
            console.error("sync-meta-leads: negócio não criado", { personId, processo: p.processo, detail: dealErr.message });
          } else {
            dealId = data as string;
          }
        } else if (pipelineName) {
          // Lead Ads do Instant Form não pediu (ou a pessoa não preencheu) o
          // número do processo — mesmo fix do form da LP (20260910000001):
          // cria o negócio como rascunho em vez de deixar a pessoa invisível
          // no funil, pra ela já aparecer em "Lead capturado" e a Nina já
          // reconhecer o contato quando ele mandar mensagem no WhatsApp.
          const { data, error: draftErr } = await admin.schema("crm").rpc("create_draft_deal", {
            p_workspace: WORKSPACE_ID,
            p_person: personId,
            p_source: "meta",
            p_pipeline_name: pipelineName,
            p_reclamada_em_rj: true,
          });
          if (draftErr) {
            console.error("sync-meta-leads: negócio-rascunho não criado", { personId, detail: draftErr.message });
          } else {
            dealId = data as string;
          }
        }

        // captador (Alexandra/Vanessa) alternado 50/50 pro negócio recém-criado
        // — só faz sentido pra campanhas mapeadas numa pipeline (hoje só RECJUD).
        // crm.assign_next_captador_round_robin é idempotente (não sobrescreve
        // negócio que já tinha captador de antes) e decide olhando o banco, não
        // um contador em memória — consistente entre execuções da function.
        if (pipelineName && dealId) {
          const { error: captadorErr } = await admin.schema("crm").rpc("assign_next_captador_round_robin", {
            p_workspace: WORKSPACE_ID,
            p_deal_id: dealId,
            p_pipeline_name: pipelineName,
            p_source: "meta",
          });
          if (captadorErr) {
            console.error("sync-meta-leads: captador não atribuído", { personId, dealId, detail: captadorErr.message });
          }
        }

        stat.synced++; totalSynced++;
      }

      // com falha: para 1s antes do lead falho (o filtro é "time_created > since")
      // (cast: o TS não enxerga a atribuição feita dentro do markFailed e estreitaria pra null)
      const failedTs = minFailedCreatedTs as number | null;
      const nextTs = failedTs !== null ? failedTs - 1 : maxFoundCreatedTs;
      if (nextTs !== null && nextTs > (form.last_sync_ts ?? 0)) {
        nextFormIds[i] = { ...form, last_sync_ts: nextTs };
      } // found=0 ou falha no lead mais antigo: mantém form (last_sync_ts intocado) — não perde a janela
    } catch (err: unknown) {
      stat.error = err instanceof Error ? err.message : String(err);
    }
    results.push(stat);
  }

  await admin
    .from("integration_credentials")
    .update({
      last_sync: new Date().toISOString(),
      config: { ...(creds.config || {}), form_ids: nextFormIds },
      error_message: results.find(r => r.error)?.error || null,
    })
    .eq("provider", "meta");

  const errs = results.filter(r => r.error);
  const status: "success" | "error" | "warning" = errs.length === 0 ? "success" : errs.length === results.length ? "error" : "warning";
  const details = `${totalSynced} lead(s) novo(s) · ${totalSkipped} já existia(m)`
    + (errs.length ? ` · ${errs.length} formulário(s) com erro: ${errs.map(e => `${e.label || e.id} (${e.id}): ${e.error}`).join("; ")}` : "");
  await writeSyncLog(admin, { status, details, records_affected: totalSynced, payload: results });

  return jsonResp({ synced: totalSynced, skipped: totalSkipped, forms: results });
});
