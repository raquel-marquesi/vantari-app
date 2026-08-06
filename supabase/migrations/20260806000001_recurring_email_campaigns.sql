-- Pedido da Catarina (06/08/2026): no RD Station dava pra deixar uma campanha
-- de email programada pra disparar toda semana, num dia e horário fixos, sem
-- precisar clicar "Enviar" de novo. Hoje o /email tem um campo "Agendar" na
-- tela, mas ele é cosmético — grava scheduled_at em mkt.campaigns, porém não
-- existe nenhum cron lendo essa coluna. O único disparo real é manual, via
-- modal "Enviar Campanha" (supabase.functions.invoke("send-campaign")).
--
-- Este migration cria a base pra recorrência semanal de verdade:
--   1. mkt.campaigns ganha: segment_id (segmento alvo persistido — hoje só
--      existia como estado efêmero no modal de envio), recurrence_enabled,
--      recurrence_day_of_week (0=domingo..6=sábado), recurrence_hour,
--      recurrence_minute, next_run_at (quando deve disparar de novo) e
--      last_run_at (última vez que disparou).
--   2. mkt.campaign_sends ganha run_at (marca a qual "rodada" semanal aquele
--      envio pertence) — necessário porque a constraint antiga
--      UNIQUE(campaign_id, person_id) impediria mandar a MESMA campanha pra
--      MESMA pessoa numa segunda semana (2ª tentativa de insert bateria em
--      conflito e falharia silenciosamente pro dono do fluxo). A nova
--      constraint inclui run_at, permitindo 1 registro de tracking por
--      pessoa POR RODADA semanal (abertura/clique de cada semana rastreados
--      separadamente).
--
-- Fuso: Brasil não observa mais horário de verão desde 2019 — America/
-- Sao_Paulo é UTC-3 fixo o ano inteiro. A Edge Function
-- run-scheduled-campaigns faz a conta na mão (sem lib de timezone).

alter table mkt.campaigns
  add column if not exists segment_id uuid references public.segments(id) on delete set null,
  add column if not exists recurrence_enabled boolean not null default false,
  add column if not exists recurrence_day_of_week smallint,
  add column if not exists recurrence_hour smallint,
  add column if not exists recurrence_minute smallint not null default 0,
  add column if not exists next_run_at timestamptz,
  add column if not exists last_run_at timestamptz;

alter table mkt.campaigns
  add constraint campaigns_recurrence_day_check
    check (recurrence_day_of_week is null or recurrence_day_of_week between 0 and 6),
  add constraint campaigns_recurrence_hour_check
    check (recurrence_hour is null or recurrence_hour between 0 and 23),
  add constraint campaigns_recurrence_minute_check
    check (recurrence_minute between 0 and 59);

create index if not exists idx_campaigns_next_run
  on mkt.campaigns using btree (next_run_at)
  where recurrence_enabled = true;

-- campaign_sends: destrava reenvio semanal pra mesma pessoa
alter table mkt.campaign_sends
  add column if not exists run_at timestamptz not null default now();

alter table mkt.campaign_sends drop constraint if exists send_unico;
alter table mkt.campaign_sends
  add constraint send_unico unique (campaign_id, person_id, run_at);
