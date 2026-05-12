# Vantari — Plano de Implementação do Design System

**Versão:** 2.0  
**Base de referência:** `vantari-analytics-dashboard.jsx` (shell canônica)  
**Auditoria:** `vantari_design_system_audit.html`

---

## Tokens globais (aplicar em todos os módulos)

```
Sidebar bg:       #0079a9
Page bg:          #f2f5f8
Card bg:          #ffffff
Card border:      0.5px solid #e2e8f0
Border-radius:    12px

Texto primário:   #5f5f64
Texto secundário: #888891
Texto terciário:  #adadb5

Accent green:     #05b27b  (substitui #11AA7C em todo o sistema)
Primary blue:     #0079a9

Heading font:     Montserrat (Google Fonts)
Body font:        Aptos, Nunito Sans, sans-serif

Google Fonts import:
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700&family=Nunito+Sans:wght@500;600;700&display=swap')
```

### Escala tipográfica unificada

| Elemento         | Antes     | Depois    |
|------------------|-----------|-----------|
| Textos leves     | fw 300    | fw 500    |
| Body             | fw 400    | fw 600    |
| Labels           | fw 500    | fw 600    |
| Seções           | fw 600    | fw 700    |
| Títulos          | fw 700+   | fw 700+ (mantido) |

### Accent #05b27b — mapa de uso

| Componente            | Aplicação                            |
|-----------------------|--------------------------------------|
| TrendBadge positivo   | bg `#05b27b14`, text `#05b27b`       |
| Borda KPI principal   | `border-left: 3px solid #05b27b`     |
| Indicador AO VIVO     | Ponto pulsante `#05b27b`             |
| Status Ativo          | Pill verde                           |
| Barra ROI > 500%      | Progress bar verde                   |
| Botão CTA secundário  | Alternativa ao azul em confirmações  |
| Score > 80            | Badge lead qualificado               |
| Meta ≥ 75% do target  | Indicador de performance no export   |

### Cores de banda (Scoring)

| Banda  | Cor                |
|--------|--------------------|
| Cold   | `#0079a9` (azul marca) |
| Warm   | `#e07b00` (laranja)    |
| Hot    | `#05b27b` (verde accent) |
| SQL    | `#6d45d9` (roxo)       |

---

## Regras de shell — aplicar em todos os módulos

1. **Logo:** `<img src="iconrs.png" />` embutido no topo de todas as sidebars (exceto dashboard principal)
2. **Sidebar:** `background: #0079a9`, largura fixa 220px, extensão total da altura
3. **Navegação:** Tabler Icons outline + label — zero emoji em qualquer ponto
4. **Topbar:** 52px, título da seção ativa + ações contextuais
5. **Tabs secundárias:** ícones Lucide, zero emoji

---

## Status por módulo

### 1. `vantari-analytics-dashboard.jsx` — Shell de referência

| Problema | Prioridade |
|----------|-----------|
| 20 ocorrências de emoji nas tabs | CRÍTICO |
| Plus Jakarta Sans → Montserrat + Nunito Sans | CRÍTICO |
| Sidebar `#0a1628` → `#0079a9` | CRÍTICO |
| Accent `#11AA7C` → `#05b27b` (25 refs) | ALTO |
| Peso tipográfico: aplicar escala nova | ALTO |
| Topbar: adicionar threshold badges contextuais | MÉDIO |

**Escopo:** Substituição de fonte, remoção de emoji, recoloração sidebar e accent. Esta é a shell canônica — todas as outras devem espelhar.

---

### 2. `vantari-leads-module.jsx`

| Problema | Prioridade |
|----------|-----------|
| 9 ocorrências de emoji | CRÍTICO |
| Plus Jakarta Sans → Montserrat + Nunito Sans | CRÍTICO |
| Sem sidebar `#0079a9` unificada | CRÍTICO |
| Logo iconrs.png ausente | CRÍTICO |
| Accent `#11AA7C` → `#05b27b` (13 refs) | ALTO |
| Escala tipográfica | ALTO |
| Topbar com badges WARM/HOT/SQL | MÉDIO |
| Tabs com ícones Lucide, sem emoji | MÉDIO |

**Escopo:** Shell + fonte + emoji + logo + accent. Adicionar topbar com threshold badges contextuais.

---

### 3. `vantari-email-marketing.jsx`

| Problema | Prioridade |
|----------|-----------|
| Fraunces (serif) + DM Sans + DM Mono — 3 famílias incompatíveis | CRÍTICO |
| 5 ocorrências de emoji | CRÍTICO |
| Background bege `#f7f6f3` → `#f2f5f8` | CRÍTICO |
| Logo iconrs.png ausente | CRÍTICO |
| Sidebar ausente ou incorreta | CRÍTICO |
| Accent `#11AA7C` → `#05b27b` (7 refs) | ALTO |
| Escala tipográfica | ALTO |

**Escopo:** Reescrita tipográfica completa, correção de background, shell unificada.

---

### 4. `vantari-scoring-system.jsx`

| Problema | Prioridade |
|----------|-----------|
| IBM Plex Sans/Mono → Montserrat + Nunito Sans | CRÍTICO |
| 15 ocorrências de emoji | CRÍTICO |
| Tema dark industrial → Vantari light `#f2f5f8` | CRÍTICO |
| Logo iconrs.png ausente | CRÍTICO |
| Sidebar incorreta (sem `#0079a9`) | CRÍTICO |
| 33 refs de accent → substituir por `#05b27b` | ALTO |
| DonutChart: fundo branco, bordas leves, sem glow | ALTO |
| ScoreBar: borda sutil, sem gradiente neon | ALTO |
| BandPill: pill com cor semântica e fundo tonal | ALTO |
| Toggle: verde `#05b27b` quando ativo | MÉDIO |
| Cards de trigger: `borderLeft` accent por cor de banda | MÉDIO |
| Sparklines: manter, só ajustar cor | BAIXO |

**Escopo:** Maior reescrita do sistema — tema completo, tipografia, todos os componentes. Prioridade máxima após analytics.

---

### 5. `vantari-ai-marketing.jsx`

| Problema | Prioridade |
|----------|-----------|
| Fraunces (serif) — fonte incompatível | CRÍTICO |
| 16 ocorrências de emoji | CRÍTICO |
| Logo iconrs.png ausente | CRÍTICO |
| Sidebar ausente ou incorreta | CRÍTICO |
| Accent (16 refs) → `#05b27b` | ALTO |
| Escala tipográfica | ALTO |

**Escopo:** Fonte, shell, emoji, accent.

---

### 6. `vantari-integrations-hub.jsx`

| Problema | Prioridade |
|----------|-----------|
| 3 ocorrências de emoji | ALTO |
| Plus Jakarta Sans → Montserrat + Nunito Sans | ALTO |
| Logo iconrs.png ausente | CRÍTICO |
| Sidebar incorreta | CRÍTICO |
| Accent (18 refs) → `#05b27b` | ALTO |
| 1 ref dark theme → remoção | MÉDIO |
| Escala tipográfica | MÉDIO |

**Escopo:** Shell, fonte, emoji, accent. Menor reescrita do grupo.

---

### 7. `vantari-landing-pages.jsx`

| Problema | Prioridade |
|----------|-----------|
| 6 ocorrências de emoji | ALTO |
| Plus Jakarta Sans → Montserrat + Nunito Sans | ALTO |
| Logo iconrs.png ausente | CRÍTICO |
| Sidebar incorreta | CRÍTICO |
| Accent (12 refs) → `#05b27b` | ALTO |
| 2 refs dark theme → remoção | MÉDIO |
| Escala tipográfica | MÉDIO |

**Escopo:** Shell, fonte, emoji, accent.

---

### 8. `vantari-auth-system.jsx`

| Problema | Prioridade |
|----------|-----------|
| DM Sans → Montserrat + Nunito Sans | ALTO |
| SVG logo inline → substituir por `<img src="iconrs.png" />` | CRÍTICO |
| Accent (9 refs) → `#05b27b` | ALTO |
| Escala tipográfica | MÉDIO |

**Escopo:** Menor módulo, sem emoji detectado. Fonte + logo + accent.

---

## Sequência de implementação recomendada

```
Fase 1 — Shell canônica
  1. vantari-analytics-dashboard.jsx   ← base para todos
     (emoji, fonte, sidebar #0079a9, accent, topbar)

Fase 2 — Módulos com emoji crítico
  2. vantari-scoring-system.jsx        ← dark→light + reescrita total
  3. vantari-ai-marketing.jsx          ← Fraunces + 16 emoji
  4. vantari-leads-module.jsx          ← shell + badges WARM/HOT/SQL

Fase 3 — Módulos moderados
  5. vantari-email-marketing.jsx       ← bg bege + 3 fontes incompatíveis
  6. vantari-landing-pages.jsx         ← shell + dark refs
  7. vantari-integrations-hub.jsx      ← menor esforço

Fase 4 — Auth e polish
  8. vantari-auth-system.jsx           ← logo + fonte + accent
```

---

## Checklist por módulo (validação pós-implementação)

```
[ ] Logo iconrs.png presente no topo da sidebar
[ ] Sidebar background: #0079a9 em toda extensão
[ ] Zero emoji em toda a UI
[ ] Font-family: Montserrat (headings) / Aptos, Nunito Sans (body)
[ ] Accent #11AA7C substituído por #05b27b em 100% das refs
[ ] Escala de peso aplicada (300→500, 400→600, 500→600, 600→700)
[ ] Background de página: #f2f5f8
[ ] Texto primário: #5f5f64 | Secundário: #888891 | Terciário: #adadb5
[ ] Nenhum tema dark residual
[ ] Tabs secundárias com ícones Lucide (sem emoji)
```
