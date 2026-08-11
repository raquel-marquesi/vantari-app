// ════════════════════════════════════════════════════════════════
// _shared/nina-phone.ts
// ────────────────────────────────────────────────────────────────
// 06/08/2026 — investigação de erro 404 "Contact not found" recorrente ao
// falar com a Nina (conversation-send, conversation-takeover,
// ingest-message reforço de status). Causa raiz: core.normalize_phone_br
// só insere o 9º dígito do celular quando o dígito logo após o DDD está
// entre 6 e 9 (heurística: celulares antigos de 8 dígitos começavam nessa
// faixa; fixos começavam em 2-5). É só uma heurística probabilística —
// sempre vai existir número real que escapa dela (achamos um: "Ws motores
// e bombas" / Wilson Soares de Carvalho, 3131006892 — celular real, mas o
// dígito depois do DDD é "3").
//
// Não dá pra acertar 100% só com regra estática no momento de salvar. Este
// módulo centraliza a defesa em profundidade usada em TODA chamada pro
// backend da Nina que depende de telefone:
//   1. Tenta com o telefone salvo (toWhatsAppPhone).
//   2. Se a Nina responder 404, tenta de novo com o formato ALTERNATIVO
//      (insere ou remove o 9º dígito).
//   3. Se o alternativo funcionar, AUTOCORRIGE core.persons.primary_phone
//      (+ core.person_identifiers) pra esse contato nunca mais cair nessa
//      retry — autocura permanente, não só um band-aid por request.
//
// Usado por: conversation-send, conversation-takeover, ingest-message.
// Qualquer nova função que fale com a Nina usando telefone deve importar
// daqui, não duplicar a lógica.
//
// 11/08/2026 — o 404 voltou a aparecer, mas dessa vez em contatos com
// telefone JÁ formatado corretamente e que já tinham conversa ativa com a
// Nina dias antes — ou seja, não é mais o bug de formatação, é uma
// instabilidade do lado da infraestrutura da Nina (sessão do WhatsApp
// caindo/reconectando, cache de contato sumindo etc.). Duas camadas novas:
//   4. Se os dois formatos de telefone falharem, espera um instante e tenta
//      mais uma vez com o telefone original — cobre blips passageiros sem
//      incomodar ninguém.
//   5. Se mesmo assim falhar, registra em core.events (nina_call_failed)
//      pra ficar um rastro permanente (os logs da Edge Function somem em
//      24h). O /inbox varre esses eventos e avisa a equipe com um banner se
//      houver 3+ falhas nos últimos 10 minutos — em vez de cada atendente
//      só ver um erro avulso e achar que é coisa dele.
// ════════════════════════════════════════════════════════════════

// core.persons.primary_phone é normalizado por core.normalize_phone_br SEM
// o código do país (ex: "11977773870") — mas o WhatsApp/Nina identifica
// contato pelo número completo (ex: "+5511977773870").
export function toWhatsAppPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("55") && digits.length >= 12) return `+${digits}`;
  return `+55${digits}`;
}

// formato alternativo: cobre tanto "faltou o 9" (10 dígitos nacionais)
// quanto "sobrou o 9" (11 dígitos com 9 logo após o DDD, mas era fixo)
export function altWhatsAppPhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits.startsWith("55")) return null;
  const national = digits.slice(2);
  if (national.length === 10) {
    return `+55${national.slice(0, 2)}9${national.slice(2)}`;
  }
  if (national.length === 11 && national[2] === "9") {
    return `+55${national.slice(0, 2)}${national.slice(3)}`;
  }
  return null;
}

type NinaCallResult = { ok: boolean; status: number; detail: string; phoneUsed: string | null };

// dispara POST pro endpoint da Nina informado; se vier 404 e existir
// formato alternativo plausível, tenta mais uma vez antes de desistir.
// NÃO faz autocura sozinho — ver callNinaWithPhoneRetry para isso.
async function attemptNinaCall(
  url: string, secret: string, payload: Record<string, unknown>, phone: string | null
): Promise<NinaCallResult> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Nina-Secret": secret },
    body: JSON.stringify({ ...payload, phone }),
  });
  const detail = res.ok ? "" : await res.text().catch(() => "");
  return { ok: res.ok, status: res.status, detail, phoneUsed: phone };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function ninaCallWithPhoneRetry(
  url: string, secret: string, payload: Record<string, unknown>, phone: string | null
): Promise<NinaCallResult> {
  const first = await attemptNinaCall(url, secret, payload, phone);
  if (first.ok) return first;

  let best = first;
  if (first.status === 404) {
    const alt = altWhatsAppPhone(phone);
    if (alt) {
      const second = await attemptNinaCall(url, secret, payload, alt);
      if (second.ok) return second;
      best = second.status !== 404 ? second : first; // prefere guardar o erro mais informativo
    }
  }

  // última tentativa, com uma pequena pausa — cobre instabilidade passageira
  // da Nina (ex: sessão do WhatsApp reconectando) que não tem nada a ver com
  // formato de telefone e se resolveria sozinha numa tentativa seguinte.
  await sleep(800);
  const retry = await attemptNinaCall(url, secret, payload, phone);
  return retry.ok ? retry : best;
}

// registra em core.events toda falha definitiva (depois de esgotar os
// retries) — cria um rastro permanente que os logs efêmeros da Edge
// Function (24h) não dão. É a partir daqui que o /inbox detecta picos de
// falha e avisa a equipe, em vez de cada atendente ver só um erro isolado.
export async function logNinaFailure(
  core: any, // supabase client já com .schema('core')
  workspaceId: string,
  personId: string | null,
  endpoint: string,
  result: NinaCallResult,
): Promise<void> {
  try {
    await core.from("events").insert({
      workspace_id: workspaceId,
      person_id: personId,
      source: "nina",
      type: "nina_call_failed",
      payload: {
        endpoint,
        status: result.status,
        detail: (result.detail || "").slice(0, 500),
        phone_used: result.phoneUsed,
      },
    });
  } catch {
    // log é best-effort — não deve derrubar a chamada principal por causa disso
  }
}

// autocorrige core.persons.primary_phone (+ person_identifiers) quando o
// formato alternativo funcionou — assim essa mesma pessoa nunca mais cai
// no retry, em NENHUMA das 3 funções que usam este módulo.
export async function healPhoneIfNeeded(
  core: any, // supabase client já com .schema('core')
  workspaceId: string,
  personId: string,
  originalPhone: string | null,
  result: NinaCallResult
): Promise<void> {
  if (!result.ok || !result.phoneUsed || result.phoneUsed === originalPhone) return;
  const healedDigits = result.phoneUsed.replace(/\D/g, "").replace(/^55/, "");
  try {
    await core.from("persons").update({ primary_phone: healedDigits, updated_at: new Date().toISOString() }).eq("id", personId);
    await core.from("person_identifiers")
      .upsert({ workspace_id: workspaceId, person_id: personId, kind: "phone", value: healedDigits }, { onConflict: "workspace_id,kind,value" });
    await core.from("events").insert({
      workspace_id: workspaceId, person_id: personId, source: "nina", type: "phone_autocorrected",
      payload: { old_phone: originalPhone, new_phone: healedDigits, reason: "404 no formato original, sucesso no formato alternativo" },
    });
  } catch {
    // autocura é best-effort — não deve derrubar a chamada principal por causa disso
  }
}
