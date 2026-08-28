// ════════════════════════════════════════════════════════════════
// Edge Function: /ingest
// ────────────────────────────────────────────────────────────────
// PORTA ÚNICA de entrada de leads no core canônico.
// Recebe webhooks de fontes server-to-server (Nina, Meta Lead Ads,
// Google, importadores) → resolve a pessoa por CPF/telefone/email
// via core.resolve_person() → grava um core.events.
//
// Roda com SERVICE_ROLE (bypassa RLS). É por isso que o `anon` NUNCA
// precisa de acesso ao core — nada escreve direto no banco pelo browser.
//
// Segurança: exige header  X-Ingest-Secret == env INGEST_SECRET.
// (Form público de browser NÃO usa esta função — ele tem rota própria
//  com captcha/origem; aqui é só tráfego de servidor confiável.)
//
// Body esperado (JSON):
// {
//   "workspace":  "<uuid ou slug>",                 // obrigatório
//   "source":     "nina|meta|google|form|manual",   // obrigatório
//   "event_type": "whatsapp_in",                     // opcional (default por source)
//   "person": { "cpf":"...", "phone":"+55 11 9...", "email":"...", "name":"..." },
//   "payload": { ...qualquer coisa... },             // opcional → vai pro evento
//   "attributes": {                                  // opcional → scoring Etapa 1
//     "cidade_estado":"sao_paulo", "nivel_urgencia":"alta_dividas", ...
//     "campanha":"recuperacao_judicial_varejo",       // opcional → roteia pro pipeline dedicado (ver PIPELINE_BY_CAMPANHA)
//     "contato_e_titular":"sim"|"nao",                // opcional → ver bloco "titular != contato" abaixo
//     "titular_nome":"..."                            // obrigatório quando contato_e_titular = "nao"
//   }                                                // chaves/valores canônicos: ver 0007
//   "utm": {                                          // opcional → canal de aquisição (primeiro toque)
//     "source":"google", "medium":"cpc", "campaign":"...", "content":"...", "term":"..."
//   }
//   "processo": {                                     // opcional → cria/atualiza negócio no CRM
//     "numero_cnj": "0001085-82.2025.5.07.0015",       // se vier, entra em crm.processos
//     "honorarios_pct": 30                             // opcional, guardado no negócio
//   }                                                 // negócio nasce em "Novos Leads", valor R$0 (placeholder)
//   // Alternativa Meta Lead Ads: enviar "field_data":[{name,values[]}] em vez de person
// }
//
// ── titular != contato (2026-08-27) ──
// É comum a pessoa no WhatsApp não ser o titular do crédito (esposa,
// filho etc. perguntando por outra pessoa). Quando
// attributes.contato_e_titular = "nao", NUNCA resolvemos uma pessoa só
// com o cpf/processo do titular colado no telefone de quem está
// conversando — isso fundiria duas pessoas reais diferentes. Em vez
// disso resolvemos DUAS pessoas separadas: o contato (só phone/name) e
// o titular (só cpf/titular_nome). O negócio, os atributos e o
// numero_cnj vão pro titular; uma nota em crm.activities registra
// quem entrou em contato em nome dele.
//
// Resposta: { "person_id": "<uuid>", "contact_person_id"?: "<uuid>",
//             "source": "...", "event_type": "...", "deal_id"?: "<uuid>" }
//
// Deploy:  supabase functions deploy ingest
// Secret:  supabase secrets set INGEST_SECRET=<aleatório forte>
// ════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INGEST_SECRET = Deno.env.get("INGEST_SECRET") ?? "";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Ingest-Secret",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// default de event_type por fonte, quando o caller não manda
const DEFAULT_EVENT_TYPE: Record<string, string> = {
  nina:   "whatsapp_in",
  meta:   "lead_created",
  google: "lead_created",
  form:   "form_submit",
  manual: "lead_created",
};

// Prioridade 4 do plano de unificação de leads (2026-08-27): mapeia a
// tag de campanha (attributes.campanha, ou payload.campanha como
// fallback pra fontes que não usam o envelope attributes) pro nome do
// pipeline dedicado em crm.pipelines. Só daqui pra frente — sem
// backfill de negócios antigos.
const CAMPAIGN_PIPELINE_MAP: Record<string, string> = {
  recuperacao_judicial_varejo: "Recuperação Judicial — Varejo",
};
function pipelineNameFor(body: any): string | null {
  const campanha = body?.attributes?.campanha ?? body?.payload?.campanha ?? null;
  if (!campanha) return null;
  return CAMPAIGN_PIPELINE_MAP[String(campanha)] ?? null;
}

// Mapeia o field_data nativo do Meta Lead Ads para identificadores
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
  };
}

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST")    return jsonResp({ error: "Method not allowed" }, 405);

  // —— autenticação do servidor chamador ——
  if (!INGEST_SECRET || req.headers.get("X-Ingest-Secret") !== INGEST_SECRET) {
    return jsonResp({ error: "unauthorized" }, 401);
  }

  let body: any;
  try { body = await req.json(); }
  catch { return jsonResp({ error: "Invalid JSON" }, 400); }

  const source = String(body.source ?? "").toLowerCase();
  if (!source)       return jsonResp({ error: "source obrigatório" }, 400);
  if (!body.workspace) return jsonResp({ error: "workspace obrigatório" }, 400);

  // identificadores: ou body.person, ou field_data do Meta
  const p = body.person ?? (Array.isArray(body.field_data)
    ? fromMetaFieldData(body.field_data)
    : {});
  const cpf   = p.cpf   ?? null;
  const phone = p.phone ?? null;
  const email = p.email ?? null;
  const name  = p.name  ?? null;

  if (!cpf && !phone && !email) {
    return jsonResp({ error: "pelo menos um identificador (cpf, phone ou email) é obrigatório" }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const core = supabase.schema("core");

  // —— resolver workspace_id (aceita uuid direto ou slug) ——
  let workspaceId = String(body.workspace);
  if (!UUID_RE.test(workspaceId)) {
    const { data: ws, error: wsErr } = await core
      .from("workspaces").select("id").eq("slug", workspaceId).maybeSingle();
    if (wsErr)  return jsonResp({ error: "erro ao resolver workspace", detail: wsErr.message }, 500);
    if (!ws)    return jsonResp({ error: `workspace não encontrado: ${workspaceId}` }, 404);
    workspaceId = ws.id;
  }

  // —— UTM (opcional) — canal de aquisição, gravado como primeiro toque ——
  const utm = body.utm && typeof body.utm === "object" ? body.utm : {};

  // —— titular != contato: quem manda a mensagem pode não ser o titular
  // do crédito (ex: esposa/filho perguntando). Resolve DUAS pessoas
  // separadas em vez de colar cpf/processo do titular na identidade de
  // quem está no telefone. ——
  const contatoNaoTitular = String(body?.attributes?.contato_e_titular ?? "").toLowerCase() === "nao";
  const titularNome = body?.attributes?.titular_nome ?? null;

  let personId: string;
  let contactPersonId: string | null = null;
  let subjectAttrs = body.attributes; // atributos vão pro "dono" do caso (titular, quando existir)

  if (contatoNaoTitular) {
    if (!cpf) {
      return jsonResp({ error: "attributes.contato_e_titular='nao' exige person.cpf (do titular)" }, 400);
    }
    // pessoa 1: o contato — só telefone/nome, NUNCA o cpf do titular
    const { data: contactId, error: contactErr } = await core.rpc("resolve_person", {
      p_workspace: workspaceId,
      p_phone: phone,
      p_name:  name,
      p_source: source,
    });
    if (contactErr) {
      return jsonResp({ error: "falha ao resolver contato", detail: contactErr.message }, 500);
    }
    contactPersonId = contactId;

    // pessoa 2: o titular do crédito — só cpf/titular_nome, NUNCA o
    // telefone de quem está mandando a mensagem
    const { data: titularId, error: titularErr } = await core.rpc("resolve_person", {
      p_workspace: workspaceId,
      p_cpf:   cpf,
      p_name:  titularNome,
      p_source: source,
      p_utm_source:   utm.source   ?? null,
      p_utm_medium:   utm.medium   ?? null,
      p_utm_campaign: utm.campaign ?? null,
      p_utm_content:  utm.content  ?? null,
      p_utm_term:     utm.term     ?? null,
    });
    if (titularErr) {
      const invalid = /CPF inválido/i.test(titularErr.message);
      return jsonResp({ error: "falha ao resolver titular", detail: titularErr.message },
        invalid ? 422 : 500);
    }
    personId = titularId;
  } else {
    // caso normal: quem manda a mensagem é o próprio titular
    const { data: resolvedId, error: rpcErr } = await core.rpc("resolve_person", {
      p_workspace: workspaceId,
      p_cpf:   cpf,
      p_phone: phone,
      p_email: email,
      p_name:  name,
      p_source: source,
      p_utm_source:   utm.source   ?? null,
      p_utm_medium:   utm.medium   ?? null,
      p_utm_campaign: utm.campaign ?? null,
      p_utm_content:  utm.content  ?? null,
      p_utm_term:     utm.term     ?? null,
    });
    if (rpcErr) {
      // CPF inválido cai aqui (raise exception no banco) → 422
      const invalid = /CPF inválido/i.test(rpcErr.message);
      return jsonResp({ error: "falha ao resolver pessoa", detail: rpcErr.message },
        invalid ? 422 : 500);
    }
    personId = resolvedId;
  }

  // —— registrar o evento (sempre no titular/pessoa principal; o payload
  // preserva quem de fato mandou a mensagem quando são pessoas diferentes) ——
  const eventType = String(body.event_type ?? DEFAULT_EVENT_TYPE[source] ?? "lead_created");
  const eventPayload = contatoNaoTitular
    ? { ...(body.payload ?? {}), contato_phone: phone, contato_nome: name, contato_person_id: contactPersonId }
    : (body.payload ?? {});
  const { error: evErr } = await core.from("events").insert({
    workspace_id: workspaceId,
    person_id:    personId,
    source,
    type:         eventType,
    payload:      eventPayload,
  });
  if (evErr) {
    // pessoa já resolvida; falha só no log → reporta mas não perde o lead
    console.error("ingest: evento não registrado", { personId, source, eventType, detail: evErr.message });
    return jsonResp({ person_id: personId, contact_person_id: contactPersonId,
      warning: "evento não registrado", detail: evErr.message }, 207);
  }

  // —— atributos de scoring (Etapa 1) — envelope canônico body.attributes ——
  // grava via core.set_person_attributes; o trigger trg_attr_score recalcula o score.
  if (subjectAttrs && typeof subjectAttrs === "object" && !Array.isArray(subjectAttrs)) {
    const { error: attrErr } = await core.rpc("set_person_attributes", {
      p_person: personId,
      p_attrs:  subjectAttrs,
      p_source: source,
    });
    if (attrErr) {
      // não-fatal: pessoa e evento já gravados
      console.error("ingest: atributos não gravados", { personId, source, attributes: subjectAttrs, detail: attrErr.message });
      return jsonResp({ person_id: personId, contact_person_id: contactPersonId, source, event_type: eventType,
        warning: "atributos não gravados", detail: attrErr.message }, 207);
    }
  }

  // —— processo → negócio no CRM (Esteira de Aquisição · Novos Leads, ou o
  // pipeline dedicado quando attributes.campanha bater com um mapeado) ——
  // se vier numero_cnj, cria/reaproveita o processo e o negócio (idempotente:
  // não duplica se a Nina mandar o mesmo processo de novo numa mensagem futura).
  let dealId: string | null = null;
  if (body.processo && typeof body.processo === "object" && body.processo.numero_cnj) {
    const crm = supabase.schema("crm");
    const { data: deal, error: dealErr } = await crm.rpc("ingest_processo_lead", {
      p_workspace: workspaceId,
      p_person: personId,
      p_numero_cnj: String(body.processo.numero_cnj),
      p_honorarios_pct: body.processo.honorarios_pct ?? null,
      p_source: source,
      p_pipeline_name: pipelineNameFor(body),
    });
    if (dealErr) {
      // não-fatal: pessoa e evento já gravados, só o negócio que falhou
      console.error("ingest: negócio não criado", { personId, source, processo: body.processo, detail: dealErr.message });
      return jsonResp({ person_id: personId, contact_person_id: contactPersonId, source, event_type: eventType,
        warning: "negócio não criado", detail: dealErr.message }, 207);
    }
    dealId = deal;

    // titular != contato: deixa registrado no negócio quem de fato mandou a
    // mensagem em nome do titular (nota simples — caso de borda, baixo
    // volume; formaliza como relacionamento próprio se isso crescer).
    if (contatoNaoTitular && dealId) {
      await crm.from("activities").insert({
        workspace_id: workspaceId,
        deal_id: dealId,
        person_id: personId,
        type: "whatsapp",
        content: `Contato via WhatsApp em nome do titular: ${name ?? "(nome não informado)"} - ${phone ?? "(telefone não informado)"}.`,
      });
    }
  }

  return jsonResp({ person_id: personId, contact_person_id: contactPersonId, source, event_type: eventType, deal_id: dealId });
});
