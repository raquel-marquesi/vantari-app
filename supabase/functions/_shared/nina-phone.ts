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

export async function ninaCallWithPhoneRetry(
  url: string, secret: string, payload: Record<string, unknown>, phone: string | null
): Promise<NinaCallResult> {
  const first = await attemptNinaCall(url, secret, payload, phone);
  if (first.ok || first.status !== 404) return first;

  const alt = altWhatsAppPhone(phone);
  if (!alt) return first;
  const second = await attemptNinaCall(url, secret, payload, alt);
  return second.ok ? second : first; // se o alternativo também falhar, reporta o erro do formato "oficial"
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
