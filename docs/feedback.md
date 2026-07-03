# feedback.md — Diário de auditor (Claude → Raquel)

> Canal honesto: a cada sessão eu registro aqui o que me preocupa, riscos e dúvidas
> sobre o projeto — mesmo que ninguém tenha perguntado. Não é log de tarefas (isso é
> [history.md](history.md)); é onde eu falo o que acho que pode dar errado.

---

## 2026-06-25 — Primeira entrada (sessão: auditoria → core + domínio)

**Riscos que mais me preocupam (ordenados):**

1. **RLS Fase 1 é só "exige login", não isola por workspace.** Hoje qualquer usuário logado vê todos os leads. Pra 2 pessoas, ok. No instante em que entrar uma 3ª pessoa que não deveria ver tudo, ou multi-tenant de verdade, isso vira vazamento interno. Não é "resolvido", é "adiado de propósito". A solução já está no `core` (escopo por workspace) — falta migrar os dados e ligar.

2. **O FlowCRM é Lovable, igual ao Next — provavelmente tem o MESMO buraco de RLS.** O Next tinha o banco escancarado pra anon. Aposto que o Flow também. Antes de qualquer coisa do Flow ir a público ou receber dado real, rodar o mesmo teste de vazamento que fiz no Next. Não confie que "está isolado no Lovable" = seguro.

3. **Os schemas novos foram validados em Postgres local, NÃO no banco vivo.** O banco de produção é multi-tenant e tem tabelas legadas com constraints próprias. Aplicar `core/crm/mkt/fin` direto pode colidir com o que já existe. **Testar numa branch do Supabase antes de tocar produção** — não pular essa etapa por pressa.

4. **Construir ERP fiscal in-house é a armadilha clássica.** Gestão de recebíveis: ok, construímos. Emissão de NF-e/boleto/CNAB/SPED: NÃO. É buraco sem fundo com risco regulatório. Se em algum momento alguém disser "vamos só emitir uns boletos", é o sinal pra parar e integrar terceiro.

5. **Escopo do domínio pode crescer sem fim.** Teses jurídicas, documentos (procuração RTD), aprovação, risco de fraude, cenários de reversão — tudo isso é real e tentador de modelar. Mantém em camadas. A fundação está pronta; resista a "só mais um campo" virar mais 3 meses.

6. **plan.md (fase RD) e a nova direção estão em tensão não resolvida.** O plano antigo assume o Next crescendo como clone do RD Station. A reestruturação reenquadra tudo no core + crédito trabalhista. Alguém precisa decidir explicitamente se a fase RD ainda é meta ou morreu — senão o time trabalha em duas direções.

**O que funcionou bem nesta sessão (manter):**
- Dry-run em Postgres descartável antes de qualquer "está pronto". Pegou 2 bugs reais (normalização de telefone, view `leads_pending` no hardening) que teriam ido pra produção.
- Propor o shape e pedir aval antes de reescrever schema.
- Fechar o vazamento de PII primeiro, mesmo a Raquel querendo seguir a reestruturação — risco ativo não espera.

**Dúvida em aberto que me incomoda:**
- Não vi o código do FlowCRM, só a UI. Minha recomendação de "recriar, não migrar" assume que ele é CRM padrão. Vale um inventário tela a tela antes de cravar isso.
