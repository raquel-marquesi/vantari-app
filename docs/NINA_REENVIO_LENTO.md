# Nina — reenvio lento para quem ficou sem resposta (28/09 → 02/10/2026)

> Spec pra colar na sessão do Claude Code **na VPS da Nina**. Tudo aqui roda do
> lado da Nina, porque as mensagens que ficaram sem resposta **nunca chegaram
> no Vantari**: a Evolution ficou com a sessão zumbi e a Nina nem chegou a
> chamar `/ingest-message`. O Vantari não sabe quem escreveu nesse período.
> Quem sabe é a Evolution (Cloudfy, instância `vantari-nina`) e o próprio
> celular.

## Contexto

- **Janela do apagão:** de `2026-09-28T14:14:00Z` (último ingest OK no Vantari)
  até `2026-10-02T14:26:00Z` (primeira mensagem depois da reconexão: Igor, às
  11h26 BRT).
- A Nina já está respondendo normalmente as mensagens novas. Este spec trata
  **só** de quem escreveu durante o apagão e não recebeu resposta.
- **Risco principal:** a conta é Evolution/Baileys (WhatsApp não oficial). Uma
  rajada de envios logo depois de reconectar é exatamente o padrão que o
  WhatsApp marca como spam. Por isso o envio precisa ser lento, em horário
  comercial, com pausa aleatória e parada automática se der erro.

## Passo 1 — Levantar a lista (só leitura, sem enviar nada)

1. Pela API da Evolution na Cloudfy, listar as conversas com mensagem
   **recebida** (`key.fromMe = false`) dentro da janela:
   - `POST {EVOLUTION_URL}/chat/findChats/vantari-nina`
   - para cada chat: `POST {EVOLUTION_URL}/chat/findMessages/vantari-nina`
     com `{"where": {"key": {"remoteJid": "<jid>"}}}`
2. Manter só quem atende a **todas** estas condições:
   - última mensagem do cliente está dentro da janela;
   - **nenhuma** mensagem nossa (`fromMe = true`) depois dela. Isso inclui
     resposta manual pelo celular e a Nina hoje depois da reconexão;
   - é contato individual (`@s.whatsapp.net`), não grupo (`@g.us`) e não
     status/broadcast.
3. Se a Evolution **não tiver** essas mensagens guardadas, porque a sessão
   zumbi não salvou nada ou porque elas chegaram como `messages.set` e foram
   descartadas, **parar aqui e avisar**. Aí a fonte vira o celular: a Catarina
   abre o WhatsApp e lista à mão as conversas não lidas desse período.
4. Salvar a lista numa tabela de fila no banco da Nina (sugestão abaixo) e
   **mostrar um resumo pra Catarina antes de enviar qualquer coisa**: total de
   pessoas e uma amostra de 10 com nome, telefone, horário e trecho da última
   mensagem.

```sql
create table if not exists public.reengagement_queue (
  id            bigserial primary key,
  phone         text not null unique,      -- jid normalizado, ex: 5511999998888
  contact_name  text,
  last_inbound_at timestamptz not null,
  last_inbound_text text,
  status        text not null default 'pending'  -- pending | sent | skipped | failed
                 check (status in ('pending','sent','skipped','failed')),
  sent_at       timestamptz,
  error         text,
  created_at    timestamptz not null default now()
);
```

## Passo 2 — A mensagem

**Não** passar a mensagem antiga pela IA da Nina como se tivesse acabado de
chegar. A resposta sairia fora de contexto ("Oi! Recebi seu número de
processo..." três dias depois) e a IA ainda poderia disparar várias mensagens
seguidas pra mesma pessoa. Mandar **uma** mensagem fixa de retomada, em 3
variações sorteadas (texto idêntico pra todo mundo também é sinal de spam):

1. `Oi, {primeiro_nome}! Aqui é a Nina, da Vantari 😊 Tivemos uma instabilidade nos últimos dias e sua mensagem acabou ficando sem resposta, me desculpe! Ainda posso te ajudar com a análise do seu processo?`
2. `Olá, {primeiro_nome}! Sou a Nina, assistente da Vantari. Passamos por uma instabilidade técnica e não consegui te responder antes, desculpa pela demora! Quer seguir com a análise gratuita do seu processo?`
3. `Oi, {primeiro_nome}, tudo bem? Aqui é a Nina, da Vantari. Sua mensagem ficou sem resposta por uma falha no nosso sistema, peço desculpas! Se ainda tiver interesse, me conta: posso continuar sua análise?`

- Sem nome conhecido: trocar `Oi, {primeiro_nome}!` por `Oi!`.
- Quando a pessoa responder, a conversa segue **pelo fluxo normal da Nina**. A
  mensagem precisa ser registrada como da **Nina** (não como humano), pra
  conversa **não** ficar em modo "humano assumiu".
- A mensagem tem que ir pro Vantari do mesmo jeito que as outras da Nina
  (`/ingest-message`, `sender = "nina"`), pra aparecer no `/inbox`.

## Passo 3 — Envio lento (o worker)

Um processo (cron ou loop) que manda **uma mensagem por vez**:

| Regra | Valor |
|---|---|
| Horário | Seg–sex, 9h–18h BRT (sábado 9h–13h, se quiser). Nunca à noite. |
| Pausa entre envios | Aleatória entre **3 e 6 minutos** |
| Teto por hora | 12 |
| Teto por dia | **40** no 1º dia; se correr tudo bem, 60 nos dias seguintes |
| Antes de enviar | Presença "digitando" (`/chat/sendPresence`, `composing`) por 3–6 s |
| Ordem | Do mais antigo (`last_inbound_at` asc) pro mais novo |
| Antes de cada envio | Conferir de novo se não entrou mensagem nossa nesse meio-tempo (alguém respondeu pelo celular?). Se entrou, marcar `skipped`. |
| Parada automática | Qualquer erro 401/403/429, `connectionStatus` diferente de `open`, ou **3 falhas seguidas**: **parar o worker inteiro** e avisar. Não tentar de novo sozinho. |
| Idempotência | Só envia `status = 'pending'`; marca `sent` + `sent_at` logo depois do OK. Nunca enviar duas vezes pro mesmo telefone. |

Fora do horário o worker não envia nada e espera o próximo dia útil.

## Passo 4 — Checklist de teste antes de ligar

- [ ] Rodar o Passo 1 e a Catarina aprovar a lista.
- [ ] Mandar **1** mensagem manual pelo worker pro telefone da própria
      Catarina (inserir ela na fila). Conferir: chegou no WhatsApp, aparece no
      `/inbox` do Vantari como Nina, e a conversa **não** ficou em modo humano.
- [ ] Responder essa mensagem de teste e confirmar que a Nina continua o
      atendimento normal.
- [ ] Ligar o worker com o teto de 40/dia.
- [ ] No fim do 1º dia: quantos `sent`, `skipped`, `failed`, e se a conta
      recebeu algum aviso do WhatsApp.

## Fora do escopo (decidir depois)

- **Leads de formulário/anúncio sem conversa:** no Vantari, 48 pessoas
  (32 Google, 9 Instagram, 7 Facebook) entraram nesse período e não têm
  nenhuma mensagem. Parte delas pode ter clicado no botão de WhatsApp e escrito
  durante o apagão. Essas já entram no Passo 1. As que **nunca escreveram**
  seriam contato frio, que tem risco maior de bloqueio. Não incluir nesta
  rodada.
