-- =====================================================================
-- 0008_seed_form_etapa1.sql
-- Semeia o formulário público da ETAPA 1 (captação inicial) em mkt.forms,
-- com os campos do doc (seção 4.1) já mapeados pro vocabulário canônico do
-- motor de scoring (0007).
--
-- Identidade: nome + email (+ telefone). CPF NÃO entra aqui — é Etapa 2.
--   resolve_person aceita email/telefone como identificador.
-- Scoring: cada select tem `scoring_key` (chave em core.person_attributes) e
--   options {value,label} — o VALUE é canônico (casa com mkt.score_rules),
--   o LABEL é o texto exibido.
--
-- O form público (vantari-public-form.jsx) lê este registro, e na submissão
-- aninha os campos com scoring_key sob payload.attributes → o trigger
-- on_form_submission grava via core.set_person_attributes → score recalcula.
--
-- Idempotente (on conflict no slug por workspace). Aplicar em prod após revisão.
-- =====================================================================

insert into mkt.forms (workspace_id, slug, name, source_label, success_message, active, fields)
values (
  '53092199-7b75-4342-a897-f589d6f34922',
  'credito-trabalhista',
  'Antecipação de Crédito Trabalhista',
  'Form Etapa 1',
  'Recebemos seus dados! Em breve nossa equipe entra em contato.',
  true,
  '[
    {"id":"name","label":"Nome completo","type":"text","required":true},
    {"id":"email","label":"E-mail","type":"email","required":true},
    {"id":"phone","label":"Telefone / WhatsApp","type":"phone","required":false},

    {"id":"f_cidade","label":"Cidade","type":"select","required":true,"scoring_key":"cidade_estado","options":[
      {"value":"sao_paulo","label":"São Paulo (capital e região)"},
      {"value":"rio_janeiro","label":"Rio de Janeiro (capital e região)"},
      {"value":"bh_bsb_salvador","label":"Belo Horizonte, Brasília ou Salvador"},
      {"value":"outra_capital","label":"Outra capital"},
      {"value":"cidade_media","label":"Cidade média (100 mil+ habitantes)"},
      {"value":"cidade_pequena","label":"Cidade pequena"}
    ]},

    {"id":"f_idade","label":"Faixa etária","type":"select","required":true,"scoring_key":"faixa_etaria","options":[
      {"value":"30_50","label":"30 a 50 anos"},
      {"value":"25_30_ou_50_60","label":"25 a 30 ou 50 a 60 anos"},
      {"value":"18_25_ou_60_mais","label":"18 a 25 ou 60+ anos"}
    ]},

    {"id":"f_situacao","label":"Situação profissional atual","type":"select","required":true,"scoring_key":"situacao_profissional","options":[
      {"value":"desempregado_3m_mais","label":"Desempregado há 3 meses ou mais"},
      {"value":"desempregado_menos_3m","label":"Desempregado há menos de 3 meses"},
      {"value":"subempregado_informal","label":"Subempregado / informal"},
      {"value":"empregado","label":"Empregado"},
      {"value":"aposentado","label":"Aposentado"}
    ]},

    {"id":"f_urgencia","label":"Qual sua urgência?","type":"select","required":true,"scoring_key":"nivel_urgencia","options":[
      {"value":"alta_dividas","label":"Alta - tenho dívidas vencendo"},
      {"value":"alta_dinheiro_agora","label":"Alta - preciso do dinheiro agora"},
      {"value":"media_planejar","label":"Média - quero me planejar"},
      {"value":"baixa_curiosidade","label":"Baixa - apenas curiosidade"}
    ]},

    {"id":"f_valor","label":"Valor estimado do processo","type":"select","required":false,"scoring_key":"valor_estimado","options":[
      {"value":"acima_50k","label":"Acima de R$ 50.000"},
      {"value":"de_30k_50k","label":"R$ 30.000 a R$ 50.000"},
      {"value":"de_20k_30k","label":"R$ 20.000 a R$ 30.000"},
      {"value":"de_10k_20k","label":"R$ 10.000 a R$ 20.000"},
      {"value":"abaixo_10k","label":"Abaixo de R$ 10.000"},
      {"value":"nao_sabe","label":"Não sei informar"}
    ]},

    {"id":"f_processo","label":"Você conhece seu processo?","type":"select","required":true,"scoring_key":"conhece_processo","options":[
      {"value":"sabe_numero_trt","label":"Sei o número do processo e o TRT"},
      {"value":"sabe_tem_processo","label":"Sei apenas que tenho um processo"},
      {"value":"nao_tem","label":"Não tenho processo"}
    ]}
  ]'::jsonb
)
on conflict (workspace_id, slug) do update
   set name = excluded.name,
       source_label = excluded.source_label,
       success_message = excluded.success_message,
       active = excluded.active,
       fields = excluded.fields;
