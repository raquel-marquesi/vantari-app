-- Agenda a sincronização automática de leads do Meta Lead Ads a cada
-- 10 minutos, mesmo padrão do run-automations-every-5-min já em produção
-- (pg_cron + pg_net chamando a Edge Function).
--
-- Antes disso, a única forma de puxar leads novos do Meta era clicar em
-- "Sincronizar Agora" em /integrations → Meta — sem ninguém clicando, os
-- dados que a pessoa digitou no Lead Ads Form nunca chegavam no Vantari,
-- e a Nina ficava sem nenhum contexto quando o lead mandava mensagem no
-- WhatsApp (mesma causa raiz do gap que corrigimos hoje no form da LP,
-- só que do lado do Meta).
--
-- Autorização: a Edge Function sync-meta-leads normalmente exige um
-- usuário logado (JWT). Ela foi atualizada pra também aceitar o header
-- X-Cron-Secret == secrets.CRON_SECRET (novo, dedicado a chamadas
-- internas do pg_cron — não é o mesmo INGEST_SECRET usado por /ingest,
-- cujo valor não temos acesso de leitura). A Authorization: Bearer com a
-- anon key só satisfaz o verify_jwt=true da plataforma (é pública, já vai
-- embutida no bundle do app) — não concede nenhum privilégio extra.
--
-- Se o Meta ainda não estiver conectado (status <> 'connected'), a
-- function simplesmente responde 400 e não faz nada — rodar a cada 10 min
-- antes da conexão terminar é inofensivo.
--
-- ⚠️ O valor de <<CRON_SECRET>> abaixo é um placeholder de propósito —
-- diferente da anon key (pública, sem problema estar em git), esse
-- segredo autentica a chamada do cron e não deve ficar em texto puro no
-- histórico do repositório. A versão realmente aplicada em produção
-- (via `supabase db query --linked`) usa o valor real, gerado e setado
-- direto como Supabase secret (`CRON_SECRET`) — nunca commitado.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'sync-meta-leads-every-10-min',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://ejhrlrasepowdcdnggmv.supabase.co/functions/v1/sync-meta-leads',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqaHJscmFzZXBvd2RjZG5nZ212Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5ODkxMTUsImV4cCI6MjA5MzU2NTExNX0.xt3kpxb6AOFSN-2b30EB9pk3q5oJCuXk7GERGz6llL8',
      'X-Cron-Secret', '<<CRON_SECRET>>'
    ),
    body := jsonb_build_object('provider', 'meta')
  );
  $$
);
