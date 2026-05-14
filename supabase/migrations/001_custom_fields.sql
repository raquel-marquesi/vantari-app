-- ════════════════════════════════════════════════════════════════
-- Migration 001 — Custom Fields (Campos Personalizados)
-- ────────────────────────────────────────────────────────────────
-- Replica a estrutura de Campos Personalizados do RD Station.
-- 49 campos identificados na auditoria (cf_*) — seed incluído.
--
-- Tabelas:
--   • custom_fields       — definição dos campos (label, api_id, type, etc.)
--   • lead_custom_values  — valores por lead (lookup chave-valor)
--
-- Convenção de api_id: prefixo cf_ (RD-compatible)
--   cf_*            campos manuais
--   cf_plug_*       sincronizados com RD CRM (futuro: nosso CRM)
--   cf_fb_forms_*   preenchidos via Meta Lead Ads
-- ════════════════════════════════════════════════════════════════

-- ─── ENUMs ───
do $$ begin
  create type custom_field_type as enum (
    'text', 'email', 'phone', 'url', 'number', 'date', 'datetime',
    'select', 'multiselect', 'radio', 'checkbox', 'textarea'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type custom_field_source as enum (
    'manual', 'crm_sync', 'fb_forms', 'google_ads', 'imported', 'system'
  );
exception when duplicate_object then null; end $$;

-- ─── Tabela: custom_fields ───
create table if not exists custom_fields (
  id            uuid primary key default gen_random_uuid(),
  label         text not null,
  api_id        text not null unique,
  type          custom_field_type not null default 'text',
  source        custom_field_source not null default 'manual',
  options       jsonb default '[]'::jsonb,   -- array de opções para select/radio/checkbox
  description   text,
  required      boolean default false,
  active        boolean default true,
  position      int default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists idx_custom_fields_api_id  on custom_fields(api_id);
create index if not exists idx_custom_fields_source  on custom_fields(source);
create index if not exists idx_custom_fields_active  on custom_fields(active);

-- ─── Tabela: lead_custom_values ───
-- FK para leads(id) é adicionada condicionalmente (caso a tabela leads exista).
create table if not exists lead_custom_values (
  id               uuid primary key default gen_random_uuid(),
  lead_id          uuid not null,
  custom_field_id  uuid not null references custom_fields(id) on delete cascade,
  value            jsonb,
  updated_at       timestamptz default now(),
  unique (lead_id, custom_field_id)
);

create index if not exists idx_lcv_lead   on lead_custom_values(lead_id);
create index if not exists idx_lcv_field  on lead_custom_values(custom_field_id);

-- Adiciona FK leads(id) automaticamente quando a tabela leads existir
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='leads')
     and not exists (select 1 from information_schema.table_constraints
                     where table_name='lead_custom_values' and constraint_name='lcv_lead_fk')
  then
    alter table lead_custom_values
      add constraint lcv_lead_fk
      foreign key (lead_id) references leads(id) on delete cascade;
  end if;
end $$;

-- ─── RLS (dev: aberto, trocar antes de produção) ───
alter table custom_fields enable row level security;
alter table lead_custom_values enable row level security;

drop policy if exists "dev_all_custom_fields" on custom_fields;
create policy "dev_all_custom_fields" on custom_fields for all using (true) with check (true);

drop policy if exists "dev_all_lcv" on lead_custom_values;
create policy "dev_all_lcv" on lead_custom_values for all using (true) with check (true);

-- ─── Trigger updated_at ───
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end $$ language plpgsql;

drop trigger if exists trg_custom_fields_updated on custom_fields;
create trigger trg_custom_fields_updated
  before update on custom_fields
  for each row execute function set_updated_at();

drop trigger if exists trg_lcv_updated on lead_custom_values;
create trigger trg_lcv_updated
  before update on lead_custom_values
  for each row execute function set_updated_at();

-- ════════════════════════════════════════════════════════════════
-- SEED — 49 campos personalizados da Vantari (auditoria RD 14/05/2026)
-- ════════════════════════════════════════════════════════════════

insert into custom_fields (label, api_id, type, source, options, description, position) values
  ('A antecipação de crédito será para:',                              'cf_a_antecipacao_de_credito_sera_para',                          'select',     'manual',    '[]'::jsonb, 'Opções configuradas no formulário', 1),
  ('A empresa ré é privada ou pública?',                                'cf_a_empresa_re_e_privada_ou_publica',                            'select',     'manual',    '["Privada","Pública"]'::jsonb, null, 2),
  ('Advogado',                                                           'cf_advogado',                                                     'text',       'manual',    '[]'::jsonb, 'Nome do advogado', 3),
  ('Celular 2',                                                          'cf_celular_2',                                                    'phone',      'manual',    '[]'::jsonb, 'Segundo número', 4),
  ('Conhecimento sobre o Processo',                                      'cf_conhecimento_sobre_o_processo',                                'radio',      'manual',    '["Sim, sei o número e o TRT","Sei apenas que tenho um processo","Não tenho processo"]'::jsonb, null, 5),
  ('CPF',                                                                'cf_cpf',                                                          'text',       'manual',    '[]'::jsonb, 'Número CPF', 6),
  ('E-mail 2',                                                           'cf_e_mail_2',                                                     'email',      'manual',    '[]'::jsonb, 'Email secundário', 7),
  ('E-mail 3',                                                           'cf_e_mail_3',                                                     'email',      'manual',    '[]'::jsonb, 'Email terciário', 8),
  ('Em que fase (instância) seu processo se encontra atualmente?',      'cf_em_que_fase_instancia_seu_processo_se_encontra_atualme',      'select',     'manual',    '[]'::jsonb, 'Opções de fases processuais', 9),
  ('Email 2 (duplicado)',                                                'cf_email_2',                                                      'email',      'manual',    '[]'::jsonb, null, 10),
  ('Email 3 (duplicado)',                                                'cf_email_3',                                                      'email',      'manual',    '[]'::jsonb, null, 11),
  ('Engajamento com Conteúdo Educativo',                                 'cf_engajamento_com_conteudo_educativo',                           'radio',      'manual',    '["Alta interação","Média interação","Baixa interação"]'::jsonb, null, 12),
  ('Etapa do funil de vendas no CRM (última atualização)',              'cf_plug_funnel_stage',                                            'text',       'crm_sync',  '[]'::jsonb, 'Ex: Pré-Triagem Jurídica (Processo Viável)', 13),
  ('Faixa etária',                                                       'cf_faixa_etaria',                                                 'select',     'manual',    '[]'::jsonb, 'Opções de faixa etária', 14),
  ('FB_FORMS_P1 — a antecipação de crédito será para',                  'cf_fb_forms_p1_a_antecipacao_de_credito_sera_para',               'text',       'fb_forms',  '[]'::jsonb, 'Resposta P1 do Lead Ads Meta', 15),
  ('FB_FORMS_P2 — qual o valor aproximado do seu crédito',              'cf_fb_forms_p2_qual_o_valor_aproximado_do_seu_credito',           'text',       'fb_forms',  '[]'::jsonb, 'Resposta P2 do Lead Ads Meta', 16),
  ('FB_FORMS_P3 — em que fase está seu processo',                       'cf_fb_forms_p3_em_que_fase_instancia_seu_processo_se_encont',    'text',       'fb_forms',  '[]'::jsonb, 'Resposta P3 do Lead Ads Meta', 17),
  ('FB_FORMS_P4 — a empresa ré é privada ou pública',                   'cf_fb_forms_p4_a_empresa_re_e_privada_ou_publica',                'text',       'fb_forms',  '[]'::jsonb, 'Resposta P4 do Lead Ads Meta', 18),
  ('FB_FORMS_utm_campaign',                                              'cf_fb_forms_utm_campaign',                                        'text',       'fb_forms',  '[]'::jsonb, 'UTM campaign Meta Lead Ads', 19),
  ('FB_FORMS_utm_content',                                               'cf_fb_forms_utm_content',                                         'text',       'fb_forms',  '[]'::jsonb, 'UTM content Meta Lead Ads', 20),
  ('FB_FORMS_utm_medium',                                                'cf_fb_forms_utm_medium',                                          'text',       'fb_forms',  '[]'::jsonb, 'UTM medium Meta Lead Ads', 21),
  ('FB_FORMS_utm_source',                                                'cf_fb_forms_utm_source',                                          'text',       'fb_forms',  '[]'::jsonb, 'UTM source Meta Lead Ads', 22),
  ('FB_FORMS_utm_term',                                                  'cf_fb_forms_utm_term',                                            'text',       'fb_forms',  '[]'::jsonb, 'UTM term Meta Lead Ads', 23),
  ('Funil de vendas no CRM (última atualização)',                       'cf_plug_deal_pipeline',                                           'text',       'crm_sync',  '[]'::jsonb, 'Ex: Funil único', 24),
  ('Indicadores de Qualidade',                                           'cf_indicadores_de_qualidade',                                     'radio',      'manual',    '["Completas e coerentes","Parciais mas coerentes","Vagas ou inconsistentes"]'::jsonb, null, 25),
  ('Motivo de Perda no CRM',                                             'cf_plug_lost_reason',                                             'text',       'crm_sync',  '[]'::jsonb, null, 26),
  ('Nome do responsável pela Oportunidade no CRM',                       'cf_plug_contact_owner',                                           'text',       'crm_sync',  '[]'::jsonb, 'Ex: Gustavo', 27),
  ('Origem da Oportunidade no CRM',                                      'cf_plug_opportunity_origin',                                      'text',       'crm_sync',  '[]'::jsonb, 'Ex: Busca Orgânica | Google', 28),
  ('Outros Processos / Antecipações',                                    'cf_outros_processos_antecipacoes',                                'radio',      'manual',    '["Primeiro processo / antecipação","Já tem outros processos"]'::jsonb, null, 29),
  ('Potencial de Indicação',                                             'cf_potencial_de_indicacao',                                       'select',     'manual',    '[]'::jsonb, null, 30),
  ('Processo',                                                           'cf_processo',                                                     'text',       'manual',    '[]'::jsonb, 'Número do processo', 31),
  ('Processo Transitado pelo TRT',                                       'cf_processo_transitado_pelo_trt',                                 'select',     'manual',    '["Sim","Não"]'::jsonb, null, 32),
  ('Profissão Atual',                                                    'cf_profissao_atual',                                              'text',       'manual',    '[]'::jsonb, null, 33),
  ('Qual o valor aproximado do seu crédito?',                            'cf_qual_o_valor_aproximado_do_seu_credito',                       'select',     'manual',    '[]'::jsonb, null, 34),
  ('Qualidade da Documentação Enviada',                                  'cf_qualidade_da_documentacao_enviada',                            'radio',      'manual',    '["Alta","Média","Baixa"]'::jsonb, null, 35),
  ('Qualificação da Oportunidade no CRM',                                'cf_plug_opportunity_score',                                       'text',       'crm_sync',  '[]'::jsonb, 'Score ou qualificação no CRM', 36),
  ('Reclamada',                                                          'cf_reclamada',                                                    'text',       'manual',    '[]'::jsonb, null, 37),
  ('Rede de Indicações',                                                 'cf_rede_de_indicacoes',                                           'text',       'manual',    '[]'::jsonb, null, 38),
  ('Responsividade no Processo',                                         'cf_responsividade_no_processo',                                   'radio',      'manual',    '["Alta","Média","Baixa"]'::jsonb, null, 39),
  ('Situação da Reclamada',                                              'cf_situacao_da_reclamada',                                        'select',     'manual',    '[]'::jsonb, null, 40),
  ('Telefone 2',                                                         'cf_telefone_2',                                                   'phone',      'manual',    '[]'::jsonb, null, 41),
  ('Telefone 4',                                                         'cf_telefone_4',                                                   'phone',      'manual',    '[]'::jsonb, null, 42),
  ('Tempo do Processo',                                                  'cf_tempo_do_processo',                                            'select',     'manual',    '[]'::jsonb, null, 43),
  ('Tipos de Verbas',                                                    'cf_tipos_de_verbas',                                              'multiselect','manual',    '[]'::jsonb, null, 44),
  ('Urgência e Necessidade',                                             'cf_urgencia_e_necessidade',                                       'select',     'manual',    '[]'::jsonb, 'Critério usado no Lead Scoring (peso 20%)', 45),
  ('Valor Estimado Declarado',                                           'cf_valor_estimado_declarado',                                     'number',     'manual',    '[]'::jsonb, 'Critério usado no Lead Scoring (peso 18%)', 46),
  ('Valor Real do Processo',                                             'cf_valor_real_do_processo',                                       'number',     'manual',    '[]'::jsonb, null, 47),
  ('Valor total da Oportunidade no CRM',                                 'cf_plug_opportunity_value',                                       'number',     'crm_sync',  '[]'::jsonb, 'Valor financeiro da oportunidade', 48),
  ('Você tem um processo trabalhista?',                                  'cf_voce_tem_um_processo_trabalhista',                             'radio',      'manual',    '["Sim","Não"]'::jsonb, null, 49)
on conflict (api_id) do nothing;
