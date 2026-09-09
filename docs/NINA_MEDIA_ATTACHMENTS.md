# Anexos (arquivo/áudio) no /inbox — contrato com a Nina

> Pedido do time em 09/09/2026: poder mandar/receber arquivo e áudio (gravar +
> ouvir) direto na tela de Atendimento (`/inbox`), sem sair pro WhatsApp. O
> lado do Vantari já está pronto e no ar. Falta só o lado da Nina — este
> documento é o contrato completo do que precisa mudar lá.

## O que já está pronto do lado do Vantari (feito e deployado em 09/09/2026)

- `core.messages` ganhou 3 colunas: `media_url`, `media_type` (mime type),
  `media_filename`.
- Bucket privado `inbox-media` no Storage — só pra anexos que o time sobe
  **pelo /inbox** (saída). Não é pra Nina escrever nele.
- Tela `/inbox`: botão de anexo (📎) e botão de gravar áudio (🎙️) na caixa de
  mensagem. Áudio gravado e arquivos aparecem com preview (player/ícone) antes
  de enviar, e a bolha da mensagem já sabe desenhar imagem (thumbnail),
  áudio (player) ou arquivo genérico (link de download) quando `media_url`
  vem preenchido.
- `/conversation-send` (Next → Nina, mensagem de humano) já manda
  `media_url`/`media_type`/`media_filename` quando o atendente anexa algo.
- `/ingest-message` (Nina → Next) já aceita `media_url`/`media_type`/
  `media_filename` no body e grava tudo certinho.

**O que falta é só do lado da Nina** — os dois pontos abaixo.

## 1. Nina precisa ACEITAR mídia no envio (saída: humano → cliente)

Quando um atendente humano anexa um arquivo/áudio no `/inbox` e manda, o
Vantari chama o endpoint que a Nina já expõe hoje, `POST {NINA_API_URL}/send-message`,
só que agora com 3 campos novos no JSON (além dos que já existem —
`cpf`, `phone`, `external_conversation_id`, `body`, `sender`):

```json
{
  "cpf": "12345678900",
  "phone": "+5511999998888",
  "external_conversation_id": "abc123",
  "body": "Segue o comprovante",
  "sender": "human",
  "media_url": "https://ejhrlrasepowdcdnggmv.supabase.co/storage/v1/object/sign/inbox-media/....",
  "media_type": "application/pdf",
  "media_filename": "comprovante.pdf"
}
```

- `media_url`, `media_type`, `media_filename` só vêm preenchidos quando tem
  anexo — mensagem só-texto continua exatamente igual a hoje (esses 3 campos
  vêm `null`/ausentes).
- `media_url` é uma **signed URL do Supabase Storage, válida por 24h**. A Nina
  precisa **baixar o arquivo dessa URL** (GET simples, sem auth extra — a
  assinatura já está na própria URL) e mandar pro WhatsApp pela Evolution API
  (upload de mídia + envio, do jeito que a Evolution API já pede).
- `media_type` é o mime type (`image/png`, `application/pdf`, `audio/webm`,
  etc.) — usa isso pra saber que tipo de mensagem WhatsApp mandar (imagem,
  documento, áudio).
- Igual já acontece hoje com `body`, se `send-message` retornar erro (não-2xx),
  o Vantari NÃO marca a mensagem como enviada nem grava no histórico — então
  não tem risco de mostrar "enviado" pro atendente sem ter ido de verdade.

## 2. Nina precisa MANDAR mídia no recebimento (entrada: cliente → Nina)

Quando o cliente manda foto/áudio/documento pelo WhatsApp, a Nina já chama
hoje `POST {VANTARI_URL}/functions/v1/ingest-message` a cada mensagem. Precisa
só incluir os mesmos 3 campos novos quando a mensagem trocada for mídia:

```json
{
  "workspace": "53092199-7b75-4342-a897-f589d6f34922",
  "person": { "cpf": "12345678900", "phone": "+5511999998888" },
  "direction": "in",
  "sender": "customer",
  "body": null,
  "external_message_id": "wamid.abc123",
  "media_url": "https://<onde a Nina hospedar o arquivo>/xyz.ogg",
  "media_type": "audio/ogg",
  "media_filename": null
}
```

- **A Nina precisa hospedar o arquivo em algum lugar acessível por HTTPS** e
  mandar essa URL — o Vantari **não baixa nem guarda cópia**, só usa a URL
  direto no `<img>`/`<audio>`/link de download da tela. Pode ser onde já for
  mais fácil pra vocês (VPS da própria Nina, bucket próprio, o storage que a
  Evolution API já usa pra mídia recebida, etc.) — só precisa:
  - ser HTTPS acessível sem autenticação (ou pelo menos por tempo suficiente
    pra alguém do time abrir o link depois);
  - `media_type` bater com o mime type real do arquivo (senão a tela não sabe
    se desenha player de áudio, imagem ou link genérico);
  - se o áudio for tratado por transcrição automática (como já é hoje — ver o
    placeholder "Transcrevendo áudio..." na tela), pode mandar duas chamadas
    pro mesmo `external_message_id`: uma inicial só com `media_url`/
    `media_type` (sem `body`, ou com o placeholder de transcrição) e depois um
    update com o texto transcrito em `body` — o Next já faz upsert por
    `external_message_id` e mantém a mídia.
- Se `media_url` vier preenchido, `media_type` é **obrigatório** (o Next
  rejeita com 400 se faltar).

## Checklist de teste ponta a ponta

1. No `/inbox`, assumir uma conversa de teste e mandar um PDF pequeno (< 5MB)
   — confirmar que chega de verdade no WhatsApp do número de teste.
2. Mandar um áudio gravado na hora (botão 🎙️) — confirmar que chega como
   nota de voz no WhatsApp.
3. Do WhatsApp, mandar uma foto pro número da Nina — confirmar que aparece
   como imagem (thumbnail clicável) na bolha do cliente em `/inbox`.
4. Do WhatsApp, mandar um áudio — confirmar que aparece com player tocável
   (não só o texto transcrito).
5. Do WhatsApp, mandar um PDF/documento — confirmar que aparece como link de
   download com o nome do arquivo.

Qualquer dúvida no formato exato do JSON, os dois endpoints do lado do Vantari
são `supabase/functions/conversation-send/index.ts` e
`supabase/functions/ingest-message/index.ts` no repo — os comentários no topo
de cada arquivo documentam o body esperado igualzinho a este documento.
