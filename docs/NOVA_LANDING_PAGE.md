# Como publicar uma nova landing page

> Contexto: landing pages reais no Vantari **não** são criadas pelo builder
> visual em `/landing` (aba "Páginas") — aquele criador é uma prova de
> conceito, não salva nada e não gera página real. Ver
> `CLAUDE.md` e a decisão registrada em `docs/history.md`/conversa de
> ago/2026: optamos por manter páginas sob encomenda (HTML dedicado por
> página) em vez de construir um builder self-service, já que o volume de
> LPs novas é baixo e o capricho de design/copy por público importa mais
> que autoatendimento.
>
> Este checklist existe porque a primeira leva de 3 páginas foi ao ar com
> o endereço de rastreamento apontando pro ambiente local (127.0.0.1) —
> ninguém percebeu até uma auditoria meses depois. Seguir os passos abaixo
> evita repetir isso.

## Passo a passo

1. **Duplicar uma página existente como ponto de partida.**
   Copie o arquivo de `public/landing-pages/` que tiver o público mais
   parecido com o da campanha nova (ex.: `01-escritorios-juridicos.html`
   para B2B, `02-antecipar-agora.html` ou
   `03-antecipar-acao-trabalhista.html` para o público final). Dê um nome
   de arquivo novo e descritivo (ex.: `04-campanha-x.html`).

2. **Ajustar o bloco `CONFIG` no topo do arquivo** (dentro da primeira
   `<script>`, procure por `window.VANTARI_NEXT`):
   - `formSlug`: o slug do formulário que essa página vai usar (ver passo 3).
   - `waMessage`: a mensagem que abre pré-preenchida no WhatsApp — escreva
     uma frase que identifique de qual página/campanha o lead veio (é
     assim que dá pra diferenciar a origem só de ler a mensagem recebida).
   - `whatsapp`: **não precisa mexer.** O número já vem sozinho de
     `/settings` → Workspace → "Atendimento via WhatsApp" (centralizado
     desde ago/2026) — o valor no arquivo é só um fallback de segurança
     caso a busca ao banco falhe.

3. **Confirmar o endpoint do tracker** — logo abaixo do bloco `CONFIG`,
   deve haver:
   ```html
   <script async src="/tracker.js" data-endpoint="https://ejhrlrasepowdcdnggmv.supabase.co/functions/v1/track"></script>
   ```
   Se você copiou de uma das 3 páginas atuais (pós-correção de ago/2026),
   já vem certo. **Nunca deixe apontando para `127.0.0.1` ou qualquer
   endereço local** — isso silenciosamente zera todas as métricas de
   visita em produção.

4. **Criar o formulário correspondente** em `/landing` → aba
   "Formulários" → Novo Formulário, usando o **mesmo slug** configurado
   no passo 2. Sem isso, o iframe do formulário na LP fica quebrado.

5. **Cadastrar a URL publicada em `tracked_pages`**, para que as visitas
   virem métrica no painel e gerem pontuação de Scoring. Rode (ou peça
   para alguém com acesso ao Supabase rodar) algo como:
   ```sql
   insert into public.tracked_pages (url, title, funnel, score_delta, category, active)
   values ('next.vantari.com.br/landing-pages/04-campanha-x.html', 'LP — Campanha X', 'fundo', 25, 'lp', true)
   on conflict (url) do update set active = true;
   ```
   Ajuste a URL para o domínio real onde a página vai ser divulgada.

6. **Deploy**: commit + `git push` (dispara deploy automático na Vercel).

7. **Testar ao vivo**:
   - Abrir a página publicada e clicar no botão/pill de WhatsApp — deve
     abrir com o número e a mensagem certos.
   - Preencher o formulário e conferir que o lead aparece em `/leads`.
   - Depois de algumas visitas reais, conferir em `/landing` → aba
     "Páginas" se o card da LP mostra visitantes > 0 (confirma que o
     tracking está de fato funcionando).

## O que já é automático (não precisa repetir por página)

- **Número de WhatsApp**: uma única fonte em `/settings`, todas as LPs que
  usam o script de config atual buscam sozinhas.
- **Formatação do número exibido em tela** (`data-wa-label` nos elementos
  que mostram o telefone por extenso).
