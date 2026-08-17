-- Fix (2026-08-17): URLs limpas das 3 LPs reais no domínio novo
-- credito.vantari.com.br (pedido da Catarina — a URL antiga não
-- passava confiança pro público: next.vantari.com.br/landing-pages/
-- 01-nome.html). Mantém as URLs antigas cadastradas (não fazem mal,
-- só não vão mais receber tráfego novo depois da troca de domínio).
insert into tracked_pages (url, active, score_delta)
values
  ('credito.vantari.com.br/escritorios-juridicos', true, 25),
  ('credito.vantari.com.br/antecipar-agora', true, 25),
  ('credito.vantari.com.br/antecipar-acao', true, 25)
on conflict do nothing;
