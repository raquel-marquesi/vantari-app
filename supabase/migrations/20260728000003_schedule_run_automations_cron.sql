-- Agenda a execução periódica do motor de automação (run-automations).
-- pg_cron chama a Edge Function via pg_net a cada 5 minutos.
-- A chave usada no header é a anon key (pública, já embutida no bundle do
-- app) — a Edge Function usa SUPABASE_SERVICE_ROLE_KEY internamente pra
-- gravar no banco, então o papel da anon key aqui é só satisfazer o
-- verify_jwt da function (não concede nenhum privilégio extra).

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'run-automations-every-5-min',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://ejhrlrasepowdcdnggmv.supabase.co/functions/v1/run-automations',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqaHJscmFzZXBvd2RjZG5nZ212Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5ODkxMTUsImV4cCI6MjA5MzU2NTExNX0.xt3kpxb6AOFSN-2b30EB9pk3q5oJCuXk7GERGz6llL8'
    ),
    body := '{}'::jsonb
  );
  $$
);
