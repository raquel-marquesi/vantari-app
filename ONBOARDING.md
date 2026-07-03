# Onboarding — nova pessoa no Vantari Next

Checklist para começar a corrigir bugs e construir features neste projeto usando
**Claude Code**. Leva ~30 min se os acessos já estiverem liberados.

---

## 1. Acessos (peça à Raquel — só ela concede)

> Primeira dev a entrar: **Catarina Quartucci** — GitHub [@catarinaquartucci](https://github.com/catarinaquartucci) · `catarina.quartucci@vantari.com.br`

- [ ] **GitHub** — ser adicionada como colaboradora no repo `raquel-marquesi/vantari-app` (Settings → Collaborators → Add `catarinaquartucci`, role Write)
- [ ] **Supabase** — acesso ao projeto (ou receber `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`)
- [ ] **Vercel** — acesso ao projeto de deploy (opcional no início; o deploy é automático)
- [ ] **Chaves de ambiente** — receber os valores do `.env` por canal seguro (nunca por commit / email aberto)

## 2. Ferramentas na sua máquina

- [ ] **Node.js 20+** e **npm** instalados
- [ ] **Git** configurado com seu usuário
- [ ] **Claude Code** instalado e logado **na sua própria conta** — não é migração da conta da Raquel, é instalação nova (`npm i -g @anthropic-ai/claude-code`, depois `claude` na pasta do projeto)

## 3. Rodar o projeto

Siga o passo a passo do [`README.md`](README.md) → "Como rodar localmente".
Confirme que `npm run dev` abre em http://localhost:5173 **com dados** (se as telas
vierem vazias, o `.env` está faltando ou errado).

## 4. Entender antes de codar

Leia, nesta ordem:

1. [`CLAUDE.md`](CLAUDE.md) — mapa de arquivos, rotas, tabelas do Supabase e regras de
   código. **É o que o Claude Code lê para se orientar** — mantenha atualizado quando
   mudar estrutura.
2. [`REESTRUTURACAO.md`](REESTRUTURACAO.md) — a direção arquitetural (core canônico).
   Importante antes de qualquer mudança no banco.
3. [`docs/`](docs/) — planos e histórico, se precisar de contexto.

## 5. Fluxo de trabalho (regras do time)

- **Nunca dar push direto no `main`.** Sempre criar branch → PR → merge.
- Branch por tarefa: `fix/...` para bugs, `feat/...` para features.
- Commits descritivos em português.
- **Banco:** as migrations vivem num baseline único (`supabase/migrations/`). Mudanças
  de schema da reestruturação ficam em `supabase/proposals/` — **não** aplicar SQL no
  banco vivo sem alinhar com a Raquel (leia o REESTRUTURACAO.md para o porquê).
- **Segurança:** nunca commitar `.env`, chaves ou CPF de leads reais.

## 6. Usando o Claude Code neste projeto

- Rode `claude` na raiz do projeto — ele carrega o `CLAUDE.md` automaticamente.
- Peça tarefas concretas ("corrija o bug X na tela /email", "adicione o campo Y no CRM").
- Para bugs, aponte a rota e o arquivo (a tabela de rotas do `CLAUDE.md` mapeia
  cada `/rota` → `vantari-*.jsx`).
- Deixe o Claude rodar `npm run dev` / `npm run lint` para validar antes de commitar.
