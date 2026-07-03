# Vantari — Next (App de Marketing)

Aplicação web da Vantari para gestão de leads, scoring, email marketing, formulários,
landing pages e CRM. É uma SPA em **React 19 + Vite**, com backend no **Supabase**
(PostgreSQL + RLS + Edge Functions) e deploy automático na **Vercel**.

> **Domínio real:** cessão/antecipação de crédito trabalhista. Este repo (`Next`) é a
> camada de marketing/aquisição. Faz parte de uma reestruturação maior para um **core
> canônico** único no Supabase — leia [`REESTRUTURACAO.md`](REESTRUTURACAO.md) para o
> quadro completo antes de mexer no banco.

- **Produção:** https://vantari-app.vercel.app
- **Repositório:** https://github.com/raquel-marquesi/vantari-app

---

## Como rodar localmente (setup do zero)

Pré-requisitos: **Node.js 20+** e **npm**. Acessos que você precisa pedir à Raquel
estão listados em [`ONBOARDING.md`](ONBOARDING.md).

```bash
# 1. Clonar
git clone https://github.com/raquel-marquesi/vantari-app.git
cd vantari-app

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env
#   → abra o .env e preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
#     (a Raquel te passa esses valores por canal seguro — não estão no git)

# 4. Rodar em modo dev (http://localhost:5173)
npm run dev
```

Sem as variáveis do passo 3, o app abre mas **não conecta no banco** — telas vazias
ou erro de Supabase são o sintoma disso.

---

## Comandos

```bash
npm run dev        # servidor de desenvolvimento (porta 5173, com HMR)
npm run build      # build de produção (gera dist/)
npm run preview    # serve o build local para conferência
npm run lint       # ESLint
```

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | React 19 + Vite |
| Roteamento | react-router-dom v7 (`useNavigate`; sem `<a href>` interno) |
| Backend | Supabase (PostgreSQL + RLS + Edge Functions em Deno) |
| Gráficos | recharts |
| Ícones | lucide-react + @tabler/icons-webfont |
| Deploy | Vercel (automático via push no `main`) |

## Estrutura (resumo)

Cada página é um componente self-contained em `src/vantari-*.jsx` que gerencia o
próprio layout (sidebar + conteúdo). O mapa completo de arquivos, rotas, tabelas do
Supabase e convenções de código está em [`CLAUDE.md`](CLAUDE.md) — **é o documento de
referência principal para desenvolvimento** (e o que o Claude Code lê para se orientar).

```
src/            componentes de página (vantari-*.jsx) + App.jsx + supabase.js
supabase/       migrations/ (baseline) · proposals/ (core canônico) · functions/ (Edge)
public/         tracker.js, forms-embed.js, landing-pages/
docs/           documentos de planejamento e histórico
```

## Deploy

Push no `main` dispara deploy automático na Vercel. Alternativa manual: `vercel --prod --yes`.
Nunca dê push direto no `main` — trabalhe em branch e abra PR.

## Documentação

- [`CLAUDE.md`](CLAUDE.md) — referência técnica principal (arquivos, rotas, banco, regras)
- [`ONBOARDING.md`](ONBOARDING.md) — checklist de acessos e primeiros passos
- [`REESTRUTURACAO.md`](REESTRUTURACAO.md) — arquitetura do core canônico (direção atual)
- [`docs/`](docs/) — planos e histórico
