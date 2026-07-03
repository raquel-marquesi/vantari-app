# Vantari — Plano de Onboarding de Cliente

## Visão geral

O onboarding é dividido em **4 fases** progressivas. O cliente só avança para a próxima fase após concluir os itens obrigatórios da anterior. Um indicador de progresso (% concluído) aparece na tela de Configurações.

---

## Fase 1 — Conta e Identidade (Dia 1)

### 1.1 Dados da empresa
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| Nome da empresa | Texto | Sim |
| CNPJ | Texto + validação | Sim |
| Segmento / setor | Select | Sim |
| Tamanho da equipe | Select (1–10 / 11–50 / 51–200 / 200+) | Sim |
| Site | URL | Não |
| Logo | Upload (PNG/SVG) | Não |
| Fuso horário | Select | Sim |
| Moeda | Select (BRL / USD / EUR) | Sim |

### 1.2 Perfil do responsável
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| Nome completo | Texto | Sim |
| Cargo | Texto | Sim |
| Email profissional | Email | Sim |
| WhatsApp | Telefone | Não |

### 1.3 Plano e faturamento
- Confirmação do plano contratado
- Dados do cartão ou boleto
- CNPJ para nota fiscal
- Email para envio de faturas

---

## Fase 2 — Equipe e Acessos (Dia 1–2)

### 2.1 Convite de membros
- Convidar por email
- Definir cargo: **Admin / Gestor / Analista / Visualizador**

### 2.2 Permissões por módulo

| Módulo | Admin | Gestor | Analista | Visualizador |
|--------|-------|--------|----------|--------------|
| Dashboard | ✓ | ✓ | ✓ | ✓ |
| Leads | CRUD | CRUD | Editar | Ver |
| Scoring | CRUD | Editar | Ver | Ver |
| Email Marketing | CRUD | CRUD | Editar | Ver |
| Landing Pages | CRUD | CRUD | Criar | Ver |
| IA Marketing | CRUD | CRUD | Usar | Ver |
| Integrações | CRUD | Ver | — | — |
| Configurações | Total | Parcial | — | — |
| Financeiro | Total | — | — | — |

### 2.3 Estrutura de equipes (opcional)
- Criar times (ex: "Time de Vendas", "Time de Marketing")
- Associar membros a times
- Definir leads responsáveis por time

---

## Fase 3 — Configuração Técnica (Dia 2–5)

### 3.1 Domínio de email (obrigatório para Email Marketing)
- Domínio de envio (ex: `marketing@empresa.com.br`)
- Verificação DNS: registros SPF, DKIM e DMARC
- Email de remetente padrão
- Email de resposta (reply-to)
- Rodapé legal (endereço físico, link de descadastro — LGPD)

### 3.2 Integrações — prioridade sugerida

#### Meta Ads
- [ ] Conectar conta de Business Manager
- [ ] Selecionar conta de anúncios
- [ ] Instalar Pixel (código ou via API de Conversões)
- [ ] Conectar formulários de lead (Lead Ads)
- [ ] Mapear campos dos formulários → campos Vantari

#### Google Ads
- [ ] Conectar conta Google (OAuth)
- [ ] Selecionar Customer ID
- [ ] Importar ações de conversão
- [ ] Mapear keywords → fonte de lead

#### WhatsApp Business API
- [ ] Phone Number ID
- [ ] WABA ID
- [ ] Templates aprovados pelo Meta
- [ ] Configurar mensagem de boas-vindas automática

#### Webhooks / API própria
- [ ] Gerar chave de API
- [ ] Configurar endpoint de recebimento
- [ ] Testar payload com lead de teste

### 3.3 Mapeamento de campos de lead
Definir quais campos externos correspondem a quais campos internos:
- Nome, email, telefone (obrigatórios)
- Empresa, cargo, segmento
- UTMs: campaign, medium, source, term
- Campos customizados (até 20)

---

## Fase 4 — Regras de Negócio (Dia 3–7)

### 4.1 Pipeline de leads
- Definir estágios do funil (padrão: Novo → Nutrindo → MQL → SQL → Cliente)
- Customizar nomes e cores dos estágios
- Definir critérios de transição entre estágios

### 4.2 Modelo de scoring

#### Ações comportamentais
| Ação | Pontos padrão | Configurável |
|------|---------------|--------------|
| Abriu email | +2 | Sim |
| Clicou em link | +5 | Sim |
| Visitou página de preço | +15 | Sim |
| Preencheu formulário | +20 | Sim |
| Solicitou demo | +30 | Sim |
| Sem atividade 30 dias | −10 | Sim |

#### Bandas de qualificação
| Banda | Intervalo padrão | Cor |
|-------|-----------------|-----|
| Cold | 0–39 | Azul |
| Warm | 40–69 | Laranja |
| Hot | 70–84 | Verde |
| SQL | 85–100 | Roxo |

### 4.3 Alertas e notificações
- Alerta quando lead atinge SQL (score ≥ 85)
- Alerta quando campanha de email tem abertura < 15%
- Alerta de falha em integração
- Canal: email / WhatsApp / in-app

### 4.4 Metas e KPIs
| Métrica | Periodicidade | Exemplo |
|---------|--------------|---------|
| Leads gerados | Mensal | 500 leads/mês |
| Taxa de conversão Lead → MQL | Mensal | 20% |
| Taxa de conversão MQL → SQL | Mensal | 25% |
| Custo por lead (CPL) | Mensal | R$ 50 |
| Taxa de abertura de email | Por campanha | 30% |
| ROI de campanhas | Mensal | 300% |

### 4.5 Automações de IA (opcional)
- Escolher templates de fluxo de nutrição
- Definir cadência de envio (dias entre emails)
- Configurar personalização dinâmica (nome, empresa, segmento)
- Ativar lead scoring automático por IA

---

## Checklist de conclusão do onboarding

```
Fase 1 — Conta
  [x] Dados da empresa preenchidos
  [x] Responsável cadastrado
  [x] Plano e pagamento confirmados

Fase 2 — Equipe
  [ ] Ao menos 1 membro convidado
  [ ] Permissões revisadas

Fase 3 — Técnico
  [ ] Domínio de email verificado (SPF/DKIM/DMARC)
  [ ] Ao menos 1 integração de captação ativa (Meta, Google ou Webhook)
  [ ] Mapeamento de campos concluído

Fase 4 — Negócio
  [ ] Estágios do funil definidos
  [ ] Modelo de scoring configurado
  [ ] Ao menos 1 alerta ativado
  [ ] Metas mensais inseridas
```

---

## Sequência de implementação na plataforma

```
1. Tela de onboarding wizard (stepper com 4 fases)
2. Indicador de progresso persistente em Configurações
3. Checklist na home do Dashboard (% concluído)
4. Email de acompanhamento D+1, D+3, D+7 com próximos passos
5. Notificação in-app para itens bloqueantes não concluídos
```

---

## Módulos do sistema que dependem de onboarding completo

| Módulo | Depende de |
|--------|-----------|
| Email Marketing | Domínio verificado (Fase 3.1) |
| Leads (importação) | Ao menos 1 integração (Fase 3.2) |
| Scoring automático | Modelo configurado (Fase 4.2) |
| Dashboard com dados reais | Integração + mapeamento (Fase 3.2 + 3.3) |
| Automações de IA | Scoring + integração de email (Fases 4.2 + 3.1) |
