-- Agenda o envio de eventos pra Meta Conversions API a cada 5 minutos,
-- mesmo padrão do sync-meta-leads-every-10-min já em produção (pg_cron +
-- pg_net chamando a Edge Function). 5 min (não 10, como o sync) porque
-- durante o teste inicial (aba "Eventos de Teste" do Gerenciador de
-- Eventos) a Catarina vai querer ver o evento aparecer rápido depois de
-- mover um negócio de estágio.
--
-- Inofensivo antes do token existir: send-meta-capi responde
-- { skipped: true } e não toca no banco enquanto o Supabase secret
-- META_CAPI_ACCESS_TOKEN não estiver setado.
--
-- ⚠️ Mesmo cuidado do sync-meta-leads-every-10-min: o valor de
-- <<CRON_SECRET>> abaixo é um placeholder — o real (já setado como
-- Supabase secret CRON_SECRET) nunca vai pro histórico do repositório.
-- A anon key abaixo é pública (embutida no bundle do app), sem problema
-- em git.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'send-meta-capi-every-5-min',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://ejhrlrasepowdcdnggmv.supabase.co/functions/v1/send-meta-capi',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqaHJscmFzZXBvd2RjZG5nZ212Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5ODkxMTUsImV4cCI6MjA5MzU2NTExNX0.xt3kpxb6AOFSN-2b30EB9pk3q5oJCuXk7GERGz6llL8',
      'X-Cron-Secret', '<<CRON_SECRET>>'
    ),
    body := '{}'::jsonb
  );
  $$
);
