# Handoff · Vantari Next — Fase 1: Atualização do Design System

## Overview

Esta entrega aplica a **Fase 1** da proposta de redesign do Vantari Next: substituir
os tokens visuais do produto (cores, tipografia, sidebar, backgrounds por contexto)
**sem alterar o layout dos módulos**. O objetivo é eliminar a monotonia cromática
relatada na Overview atual e amarrar a interface ao gradiente da marca
(teal `#0D7491` → verde `#14A273`).

A direção visual já foi aprovada com base na proposta navegável
(`Vantari Next - Proposta de Redesign.html`) e no mockup interativo do dashboard
(`dashboard-new.html`).

---

## About the Design Files

Os arquivos `.html` neste pacote são **referências de design criadas em HTML puro**,
não código de produção. Eles existem para que você possa **ver** o resultado-alvo
(`dashboard-new.html`) e **inspecionar** os tokens exatos.

**Sua tarefa é portar esses tokens para o codebase real** (`Next-Vantari/` — Vite +
React 19 + react-router-dom v7 + Supabase + recharts + lucide-react) seguindo os
padrões já estabelecidos:

- Estilos **inline** nos componentes (sem CSS por página) — o projeto inteiro segue isso
- Tokens centralizados em um objeto `T` por arquivo
- Fontes do Google carregadas via `<link>` no `index.html`
- Nada de CSS-in-JS libraries, nada de Tailwind, nada de styled-components

---

## Fidelity

**High-fidelity (hifi).** Cores, tipografia, gradientes e espaçamentos estão
finalizados. Reproduza pixel-perfect usando os valores documentados aqui.

---

## Escopo da Fase 1 (o que muda, o que NÃO muda)

### ✅ MUDA

| Aspecto                     | De                                       | Para                                              |
|-----------------------------|------------------------------------------|---------------------------------------------------|
| Cor primária                | `#0079a9` (azul flat)                    | Gradiente `#0D7491 → #14A273` (teal → verde)      |
| Sidebar bg                  | `#0079a9` sólido                         | Gradiente vertical `#0D7491 → #0A5165 → #0A3D4D`  |
| Verde accent                | `#05b27b`                                | `#14A273` (verde da marca)                        |
| Fonte títulos               | `Montserrat`                             | `Sora` (mais técnica, números melhores)           |
| Fonte corpo                 | `Aptos, Nunito Sans`                     | `Inter` (mais consistente)                        |
| Fonte mono                  | (não existia)                            | `JetBrains Mono` (códigos, IDs, condições)        |
| Background página           | `#f2f5f8` (cinza neutro)                 | **Tonal por contexto** — ver tabela abaixo        |
| Escala de cinzas            | `#5f5f64 / #888891 / #adadb5`            | Ink scale azulada (8 passos)                      |
| Cores de dados              | `blue/teal/green/purple/orange` ad-hoc   | 8 acentos fixos por métrica                       |
| Logo no sidebar             | wordmark texto                           | `logo-horizontal.png` ou `icone.png` (oficial)    |

### ❌ NÃO MUDA NA FASE 1

- Estrutura de rotas (`App.jsx`)
- Layout dos módulos (grid, posições de cards, ordem das seções)
- Lógica de Supabase, hooks, estado
- Componentes recharts (gráficos continuam onde estão — Fase 2 mexe neles)
- Anel de campanhas, atividade ao vivo, alertas estilizados — Fases 3 e 4

---

## Design Tokens — substituição completa

### Cores

```js
// ───── BRAND ─────
const BRAND = {
  teal:        "#0D7491",  // primário sólido + início do gradiente
  green:       "#14A273",  // accent + fim do gradiente
  blue:        "#1F76BC",  // brand · secundário sólido
  deep:        "#0A3D4D",  // sidebar bottom
  gradient:    "linear-gradient(135deg, #0D7491 0%, #14A273 100%)",
  gradientV:   "linear-gradient(180deg, #0D7491 0%, #0A5165 60%, #0A3D4D 100%)", // sidebar
};

// ───── INK SCALE (8 passos, azulada) ─────
const INK = {
  900: "#0E1A24",  // títulos grandes, números KPI
  700: "#2E3D4B",  // texto corrido principal
  500: "#5A6B7A",  // texto secundário, labels
  400: "#8696A5",  // texto terciário, captions
  300: "#B3BFCA",  // bordas fortes, mês anterior em gráficos
  200: "#D8DFE6",  // bordas
  100: "#EEF2F6",  // grid lines, dividers
  50:  "#F5F8FB",  // background page neutro
};

// ───── ACENTOS DE DADOS (cor fixa por métrica) ─────
const ACCENT = {
  teal:   "#0D7491",  // Leads (brand · cold)
  green:  "#14A273",  // Receita, growth, sucesso
  violet: "#7C5CFF",  // SQL, qualified
  amber:  "#F59E0B",  // MQL, warm, atenção
  coral:  "#FF6B5E",  // Alertas críticos, erro
  cyan:   "#06B6D4",  // Realtime, atividade ao vivo
  rose:   "#EC4899",  // Engagement, social
  blue:   "#1F76BC",  // Paid traffic, secundário
};

// ───── ALPHA HELPERS (10% backgrounds dos accents) ─────
// Concatenar "14" como hex → ~8% alpha (0x14/0xFF)
// Concatenar "20" como hex → ~12% alpha
// ex: backgroundColor: ACCENT.teal + "14"
```

### Backgrounds tonais por contexto

Aplicar como `background` do container principal (não da página inteira).
Subtil — saturação baixa, mas o suficiente pro usuário sentir que mudou de área.

| Rota              | Módulo            | Gradient                                                        |
|-------------------|-------------------|-----------------------------------------------------------------|
| `/dashboard`      | Analytics         | `linear-gradient(180deg, #F0F9FC 0%, #EBF7F3 100%)` (teal)      |
| `/leads`          | Leads             | `linear-gradient(180deg, #FEF9EF 0%, #FFF4E8 100%)` (amber)     |
| `/scoring`        | Scoring           | `linear-gradient(180deg, #F7F4FF 0%, #F0EAFF 100%)` (violet)    |
| `/email`          | Email Marketing   | `linear-gradient(180deg, #FFF4F2 0%, #FFECE8 100%)` (coral)     |
| `/landing`        | Landing Pages     | `linear-gradient(180deg, #EEFCF7 0%, #E6FAF0 100%)` (green)     |
| `/ai-marketing`   | IA & Automação    | `linear-gradient(180deg, #EEF9FC 0%, #E6F5FB 100%)` (cyan)      |
| `/integrations`   | Integrações       | `#F5F8FB` (neutro `INK.50`)                                     |
| `/settings`       | Configurações     | `#F5F8FB` (neutro `INK.50`)                                     |
| `/segments`       | Segments          | `linear-gradient(180deg, #F7F4FF 0%, #F0EAFF 100%)` (violet)    |
| `/workflow`       | Workflow Builder  | `linear-gradient(180deg, #EEF9FC 0%, #E6F5FB 100%)` (cyan)      |

### Tipografia

**Adicionar ao `index.html`** (substituir o link de fontes atual):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap">
```

```js
const FONT = {
  head: "'Sora', system-ui, sans-serif",   // títulos, números KPI, headings
  body: "'Inter', system-ui, sans-serif",  // texto corrido, labels, botões
  mono: "'JetBrains Mono', monospace",     // códigos, IDs, tickers, valores tabulares
};
```

**Escala de pesos (mapear nas tipografias):**

| Uso                          | Family | Weight | Size  | Letter-spacing | Tabular |
|------------------------------|--------|--------|-------|----------------|---------|
| Página H1 (Overview, etc.)   | Sora   | 700    | 28px  | -0.025em       | —       |
| Card title                   | Sora   | 700    | 16px  | -0.01em        | —       |
| KPI value (número grande)    | Sora   | 700    | 36px  | -0.035em       | ✓ sim   |
| Sub-KPI / pequenos números   | Sora   | 700    | 24px  | -0.02em        | ✓ sim   |
| Body                         | Inter  | 500    | 14px  | normal         | —       |
| Label / caption              | Inter  | 600    | 12px  | normal         | —       |
| Eyebrow / nav section        | Sora   | 600    | 10px  | 0.18em UPPER   | —       |
| Crumb / metadata             | JBMono | 500    | 11px  | normal         | ✓ sim   |
| Código / condição            | JBMono | 500    | 11px  | normal         | ✓ sim   |

Para números monetários, percentuais e contadores, sempre usar
`fontVariantNumeric: "tabular-nums"`.

### Bordas e raios

```js
const RADIUS = {
  sm: 8,    // pills, pequenos badges
  md: 10,   // botões
  lg: 12,   // chips
  xl: 14,   // cards pequenos (KPI individuais)
  xxl: 16,  // cards grandes (hero chart, painel principal)
};

const BORDER = "1px solid #E8EEF3";  // borda padrão card (era #e2e8f0)

const SHADOW = {
  card: "0 1px 0 rgba(14,26,36,.03), 0 8px 24px -16px rgba(14,26,36,.08)",
  lift: "0 1px 0 rgba(14,26,36,.04), 0 16px 36px -16px rgba(14,26,36,.15)", // hover
  primary: "0 4px 14px -4px rgba(13,116,145,.4)",  // botão CTA
};
```

---

## Substituição direta no objeto `T` (todos os arquivos)

Cada arquivo `vantari-*.jsx` tem um objeto `T` no topo. Substitua por:

```js
const T = {
  // Brand
  teal:    "#0D7491",
  blue:    "#0D7491",   // mantém compat com refs antigas
  green:   "#14A273",
  brand2:  "#1F76BC",
  deep:    "#0A3D4D",
  gradient: "linear-gradient(135deg, #0D7491 0%, #14A273 100%)",
  sidebarBg: "linear-gradient(180deg, #0D7491 0%, #0A5165 60%, #0A3D4D 100%)",

  // Data accents
  violet:  "#7C5CFF",
  amber:   "#F59E0B",
  orange:  "#F59E0B",   // alias retrocompat
  coral:   "#FF6B5E",
  red:     "#FF6B5E",   // alias retrocompat
  cyan:    "#06B6D4",
  rose:    "#EC4899",
  purple:  "#7C5CFF",   // alias retrocompat

  // Surfaces & ink
  bg:      "#F5F8FB",       // fallback; usar gradient por rota quando possível
  surface: "#FFFFFF",
  border:  "#E8EEF3",

  // Ink scale (text)
  text:    "#2E3D4B",   // body principal (antes #5f5f64)
  ink:     "#0E1A24",   // títulos grandes
  muted:   "#5A6B7A",   // antes #888891
  faint3:  "#8696A5",   // antes #adadb5
  faint:   "#F5F8FB",

  // Fonts
  font:    "'Inter', system-ui, sans-serif",
  head:    "'Sora', system-ui, sans-serif",
  mono:    "'JetBrains Mono', monospace",
};
```

**Mapeamento das cores antigas:**

```
#0079a9 → #0D7491   (todos os usos da blue antiga)
#05b27b → #14A273   (todos os usos do green antigo)
#6d45d9 → #7C5CFF   (purple/violet)
#e07b00 → #F59E0B   (orange/amber)
#EF4444 → #FF6B5E   (red/coral)
#5f5f64 → #2E3D4B   (text body)
#888891 → #5A6B7A   (muted)
#adadb5 → #8696A5   (faint)
#e2e8f0 → #E8EEF3   (border)
#f2f5f8 → #F5F8FB   (bg neutro)
#f8fafc → #F5F8FB   (faint bg)
'Montserrat'           → 'Sora'
'Aptos', 'Nunito Sans' → 'Inter'
```

---

## Sidebar redesign (mantendo estrutura)

A função `NavItem` e `NavSection` existem em todos os arquivos. Os ajustes são
apenas nos estilos inline:

### Container `.side` (atual nas linhas ~220–250 de `vantari-analytics-dashboard.jsx`)

```js
// ANTES
style={{ background: "#0079a9", width: 220, /* ... */ }}

// DEPOIS
style={{
  background: "linear-gradient(180deg, #0D7491 0%, #0A5165 60%, #0A3D4D 100%)",
  width: 240,                                  // +20px
  position: "relative",
  overflow: "hidden",
  /* mantém o resto: minHeight 100vh, flex column, etc. */
}}
```

Adicionar um pseudo-glow no topo direito do sidebar (usa `::before` se possível
com `<style>` injetado, ou um div absoluto):

```jsx
<div style={{
  position: "absolute", inset: 0, pointerEvents: "none",
  background: "radial-gradient(circle at 90% 0%, rgba(20,162,115,.25) 0%, transparent 50%)",
}} />
```

### Brand (topo do sidebar)

Substituir o wordmark de texto pelo logo oficial:

```jsx
<div style={{
  display: "flex", alignItems: "center", gap: 10,
  padding: "0 20px 28px",
  borderBottom: "1px solid rgba(255,255,255,.08)",
  marginBottom: 16,
}}>
  <div style={{
    width: 32, height: 32, background: "white",
    borderRadius: 8, display: "grid", placeItems: "center", flexShrink: 0,
  }}>
    <img src="/icone.png" alt="" style={{ width: 22, height: 22 }} />
  </div>
  <span style={{
    fontFamily: T.head, fontSize: 18, fontWeight: 700,
    letterSpacing: "-0.02em", color: "white",
  }}>vantari</span>
  <span style={{
    marginLeft: "auto", fontSize: 10, background: "rgba(255,255,255,.12)",
    padding: "3px 8px", borderRadius: 6, letterSpacing: "0.08em",
    fontWeight: 600, color: "rgba(255,255,255,.85)",
  }}>PRO</span>
</div>
```

**Salvar o ícone** em `public/icone.png` (arquivo `assets/icone.png` deste pacote).

### NavItem ativo

```js
// item ativo ganha pílula translúcida + barra lateral com gradient teal→cyan
background: active ? "rgba(255,255,255,0.10)" : "transparent",
// borda à esquerda quando ativo (substitui o borderRight branco atual)
// implementar via pseudo ou span:
{active && <span style={{
  position: "absolute", left: 0, top: 6, bottom: 6, width: 3,
  background: "linear-gradient(180deg, #14A273 0%, #5EEAD4 100%)",
  borderRadius: "0 3px 3px 0",
}}/>}
```

### Tipografia da nav

Trocar `fontFamily` de Aptos/Nunito Sans → `T.font` (Inter), e peso `600` para
itens normais, `700` para item ativo. Tamanho 13.5px.

---

## Topbar — adicionar live dot

Adicionar um indicador pulsante cyan ao lado do título da página (apenas
`/dashboard` por ora — Fase 1 não toca nas outras topbars):

```jsx
<h1 style={{ fontFamily: T.head, fontSize: 28, fontWeight: 700, /*...*/ }}>
  Overview
  <span style={{
    display: "inline-block",
    width: 8, height: 8, marginLeft: 12,
    borderRadius: "50%",
    background: T.cyan,
    animation: "pulse-live 2s infinite",
  }} />
</h1>
```

Adicionar a keyframe ao `index.css` ou via `<style>` global no `App.jsx`:

```css
@keyframes pulse-live {
  0%, 100% { box-shadow: 0 0 0 0 rgba(6, 182, 212, 0.6); }
  50%      { box-shadow: 0 0 0 8px rgba(6, 182, 212, 0); }
}
```

---

## Botão primário — gradient + sombra

O componente `Btn` em `vantari-analytics-dashboard.jsx` (linha ~290). A variante
`primary` muda para:

```js
primary: {
  bg: hov
    ? "linear-gradient(135deg, #0A5F7A 0%, #108A60 100%)"
    : "linear-gradient(135deg, #0D7491 0%, #14A273 100%)",
  color: "#fff",
  border: "none",
  shadow: hov
    ? "0 8px 22px -6px rgba(13,116,145,.5)"
    : "0 4px 14px -4px rgba(13,116,145,.4)",
},
```

E ajustar o `transition` no `<button>` para incluir `transform: translateY(...)`
no hover (move o botão 1px pra cima).

---

## Lista de arquivos a editar

Aplicar o novo objeto `T` (com aliases retrocompat) em **todos** estes arquivos
do `Next-Vantari/src/`:

1. `vantari-analytics-dashboard.jsx`  ← shell canônica, começar aqui
2. `vantari-leads-module.jsx`
3. `vantari-scoring-system.jsx`
4. `vantari-email-marketing.jsx`
5. `vantari-landing-pages.jsx`
6. `vantari-ai-marketing.jsx`
7. `vantari-integrations-hub.jsx`
8. `vantari-settings-admin.jsx`
9. `vantari-onboarding-wizard.jsx`
10. `vantari-workflow-builder.jsx`
11. `vantari-segments.jsx`
12. `vantari-auth-system.jsx`

Em **cada arquivo**:

- [ ] Substituir objeto `T` pelo novo (com aliases retrocompat — não precisa
      renomear `T.blue` → `T.teal` por toda parte; o alias resolve)
- [ ] Trocar o background do sidebar pelo `T.sidebarBg`
- [ ] Aumentar largura do sidebar de 220 → 240
- [ ] Adicionar o glow radial no sidebar
- [ ] Substituir o wordmark "vantari" texto por `<img src="/icone.png" />` + texto
- [ ] Aplicar `background` tonal por contexto no container principal (tabela acima)
- [ ] Adicionar o `<link>` das novas fontes no `index.html` (uma vez só)
- [ ] Adicionar a keyframe `pulse-live` no `index.css`

Em **`index.html`**:
- [ ] Substituir os `<link>` de Montserrat/Nunito Sans pelos de Sora/Inter/JBMono

Em **`public/`**:
- [ ] Adicionar `icone.png` e `logo-horizontal.png` (vindos de `assets/` deste pacote)

---

## Validação visual

Depois da implementação, comparar lado a lado:

- **Antes:** `shot-next-overview.png` (incluído neste pacote)
- **Depois:** rodar `npm run dev` e abrir `/dashboard`
- **Alvo:** `dashboard-new.html` (mockup interativo) — abrir num browser

Critérios de "Fase 1 pronta":

1. ✅ Sidebar tem gradiente vertical teal→navy (não mais azul flat)
2. ✅ Logo oficial aparece no topo do sidebar (não wordmark texto)
3. ✅ Cabeçalho usa Sora, corpo usa Inter
4. ✅ Background do `/dashboard` tem tonal teal-frio (não cinza neutro)
5. ✅ Botão primário tem gradiente + sombra colorida
6. ✅ Bolinha pulsante cyan ao lado do "Overview"
7. ✅ Cards têm border `#E8EEF3` e shadow suave nova
8. ✅ Texto body é `#2E3D4B` (mais escuro que antes, melhor contraste)
9. ✅ Nenhuma cor antiga (`#0079a9`, `#05b27b`, `#5f5f64`, etc.) sobrou — buscar com grep

```bash
cd Next-Vantari
grep -rn "0079a9\|05b27b\|5f5f64\|888891\|adadb5\|Montserrat\|Nunito Sans\|Aptos" src/
# deve retornar zero ocorrências quando a Fase 1 estiver fechada
```

---

## Files (referência neste pacote)

```
design_handoff_phase1_design_system/
├── README.md                                 ← este arquivo
├── Vantari Next - Proposta de Redesign.html  ← documento navegável da proposta
├── proposal.css                              ← CSS da proposta
├── proposal.js                               ← interatividade da proposta
├── dashboard-new.html                        ← mockup do dashboard redesenhado (alvo visual)
├── comp-kpis.html                            ← componente KPIs com sparkline
├── comp-funnel.html                          ← componente funil interativo
├── comp-ring.html                            ← componente anel de campanhas
├── comp-live.html                            ← componente atividade ao vivo
├── comp-alerts.html                          ← componente alertas com severidade
├── comp-chart.html                           ← componente hero chart interativo
├── shot-next-overview.png                    ← estado atual (antes)
└── assets/
    ├── logo-vantari.png                      ← logo completo (vertical)
    ├── logo-horizontal.png                   ← logo horizontal (para sidebar)
    ├── logo-azul.png                         ← variante monocromática
    ├── icone-azul.png                        ← ícone azul (alternativa)
    └── icone.png                             ← ícone principal (V do logo) — usar no sidebar
```

---

## Próximas fases (NÃO fazer agora)

Para referência — estas fases vêm **depois** que a Fase 1 estiver fechada e validada:

- **Fase 2** — Hero KPIs com sparkline + Hero chart interativo (3 dias)
- **Fase 3** — Anel de campanhas + Atividade ao vivo (3 dias)
- **Fase 4** — Alertas com severidade + Funil interativo (2 dias)
- **Fase 5** — Replicação aos outros módulos (1 semana)

Quando precisar, peça outro handoff focado na fase em questão.

---

## Como usar este pacote no Claude Code

1. Descompacte na raiz do projeto `Next-Vantari/`:
   ```
   Next-Vantari/
     design_handoff_phase1_design_system/   ← este pacote
     src/
     index.html
     ...
   ```
2. No Claude Code, abra a pasta `Next-Vantari/` e diga:
   > "Implemente a Fase 1 conforme o `design_handoff_phase1_design_system/README.md`.
   > Começe por `vantari-analytics-dashboard.jsx` e me mostre o resultado antes
   > de propagar para os outros arquivos."
3. Valide visualmente comparando `dashboard-new.html` (alvo) com o que renderizar
   no `npm run dev`.
