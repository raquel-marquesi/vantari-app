-- Validador de Email (Etapa 10) — parte 2: checagem de domínio via DNS.
-- A classificação por trigger (migration 20260731000004_email_validator.sql)
-- só olha sintaxe + lista de domínios descartáveis conhecidos — não pega
-- domínio digitado errado ou que não existe de verdade (ex: gmial.com em
-- vez de gmail.com), porque isso precisa de uma consulta de rede (DNS),
-- que uma trigger do Postgres não pode fazer sozinha (por isso o comentário
-- original da migration 0004 já deixava isso como "evolução futura").
--
-- Fecha essa lacuna com um cron (pg_cron + pg_net, mesmo padrão já usado
-- em sync-meta-leads-every-10-min e send-meta-capi-every-5-min) chamando a
-- Edge Function validate-email-domain a cada 10 minutos — ela verifica só
-- quem ainda não foi checado (email_domain_checked_at is null) e tem
-- email_status = 'valid' (sintaxe já passou; 'invalid'/'risky' não
-- precisam de checagem de DNS pra continuar como estão).

alter table core.persons
  add column if not exists email_domain_checked_at timestamptz;

comment on column core.persons.email_domain_checked_at is
  'Quando a Edge Function validate-email-domain checou (via DNS MX/A) se o domínio do email existe de verdade. NULL = ainda não checado (email novo ou cron ainda não passou).';

-- Ajusta a trigger de classificação (0004) pra também resetar essa
-- checagem sempre que o email mudar — senão um lead que trocasse de email
-- ficaria com o resultado da checagem de domínio do email ANTIGO.
create or replace function core.trg_classify_person_email()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'INSERT' or new.primary_email is distinct from old.primary_email then
    new.email_status := core.classify_email(new.primary_email);
    new.email_checked_at := case when new.primary_email is not null then now() else null end;
    new.email_domain_checked_at := null;
  end if;
  return new;
end;
$$;

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ⚠️ Mesmo cuidado das crons anteriores: <<CRON_SECRET>> abaixo é um
-- placeholder — o real já está setado como Supabase secret CRON_SECRET
-- (reaproveitado, mesmo valor usado por sync-meta-leads/send-meta-capi) e
-- nunca vai pro histórico do repositório. A anon key abaixo é pública
-- (embutida no bundle do app), sem problema em git.
select cron.schedule(
  'validate-email-domain-every-10-min',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://ejhrlrasepowdcdnggmv.supabase.co/functions/v1/validate-email-domain',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqaHJscmFzZXBvd2RjZG5nZ212Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5ODkxMTUsImV4cCI6MjA5MzU2NTExNX0.xt3kpxb6AOFSN-2b30EB9pk3q5oJCuXk7GERGz6llL8',
      'X-Cron-Secret', '<<CRON_SECRET>>'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Backfill: quem já está 'valid' hoje nunca foi checado por domínio ainda
-- (a coluna é nova) — email_domain_checked_at já nasce null por padrão,
-- então o cron vai varrer todo mundo naturalmente nas próximas rodadas.
