# Web Push — como ativar (Etapa 5, parte 2)

> Contexto: fecha a Etapa 5 do roadmap junto com Pop-ups (22/09/2026).
> Diferente do tracker.js e do forms-embed.js (que só precisam de uma tag
> `<script>`), Web Push exige um **Service Worker** — um arquivo que
> precisa estar hospedado na raiz do domínio onde os visitantes vão
> receber a notificação. Por isso essa etapa tem passos manuais que as
> outras não tinham.

## O que já está pronto (não precisa mexer)

- Migration `20260922140000_web_push_subscriptions.sql` — tabela
  `public.push_subscriptions`.
- Edge Function `push-subscribe` — recebe as inscrições, já deployada.
- Edge Function `send-web-push` — dispara a notificação pra todo mundo
  inscrito, já deployada.
- `public/vantari-push-sw.js` — o Service Worker em si.
- `public/tracker.js` — ganhou `Vantari.enablePush()` / `Vantari.disablePush()`.
- Chave pública VAPID já embutida no tracker.js (é pública por design,
  sem problema estar no código).
- Aba `/settings → Web Push` — mostra quantos inscritos ativos existem e
  tem o formulário pra disparar uma notificação nova.

## O que falta (passos manuais, nessa ordem)

### 1. Configurar as chaves VAPID (uma vez só)

O protocolo Web Push exige um par de chaves (pública/privada) — a
pública já está no código, a privada **nunca vai pro git**, precisa ser
configurada como segredo do Supabase. Rode (com acesso ao projeto):

```bash
supabase secrets set VAPID_PRIVATE_KEY=<valor gerado na sessão que criou essa etapa — pergunte pro Claude/consulte o histórico da conversa>
supabase secrets set VAPID_SUBJECT=https://vantari.com.br
```

`VAPID_SUBJECT` pode ser uma URL ou um `mailto:` — é o "remetente" que os
provedores de push (Google/Mozilla/etc.) usam se precisarem entrar em
contato sobre abuso. Usamos a URL do site pra não depender de uma caixa
de email específica ser monitorada.

### 2. Subir o Service Worker pra raiz do vantari.com.br

Pegue o arquivo `public/vantari-push-sw.js` deste repositório e publique
ele em **`https://vantari.com.br/vantari-push-sw.js`** — precisa ser
exatamente esse caminho (raiz do domínio, não uma subpasta), porque um
Service Worker só controla páginas da mesma origem de onde foi servido.

Como o site institucional é WordPress, isso normalmente significa: pedir
pra quem administra o WordPress subir esse arquivo por FTP/gerenciador de
arquivos na raiz pública do site (não dá pra fazer só colando um snippet
de script, como fizemos com o tracker.js).

### 3. Colocar um botão de opt-in no site

Em `/settings → Web Push` tem um botão "Ver botão de ativar" que mostra o
snippet pronto pra colar. Resumo do que ele faz: chama
`Vantari.enablePush()` quando alguém clica — **de propósito não dispara
sozinho ao carregar a página**, porque pedir permissão de notificação sem
o visitante ter clicado em nada é o jeito mais rápido dos navegadores
passarem a bloquear esse pedido pro site inteiro.

Sugestão de onde colocar: um botão discreto no rodapé, ou dentro da tela
de "obrigado" depois que alguém preenche um formulário (ali já demonstrou
interesse, é o momento de menor atrito pra pedir mais uma permissão).

### 4. Testar

1. Visite uma página com o botão de opt-in instalado, clique nele e
   aceite a permissão do navegador.
2. Confira em `/settings → Web Push` que "Inscritos ativos" subiu.
3. Preencha título/mensagem e clique em enviar — a notificação deve
   aparecer no navegador (até mesmo com a aba fechada, contanto que o
   navegador esteja aberto).

## Limitações conhecidas (v1)

- Sem editor de segmentação: o envio de hoje é sempre "todo mundo
  inscrito e ativo" — não dá pra mandar só pra quem visitou uma página
  específica ou é de um segmento. Evolução natural seria reaproveitar
  `/segments`, do mesmo jeito que `/email` já faz.
- Sem agendamento — o disparo é sempre imediato.
- iOS Safari só suporta Web Push a partir do iOS 16.4, e só se o site
  tiver sido "adicionado à tela de início" (comportamento do próprio
  Apple/WebKit, fora do nosso controle).
