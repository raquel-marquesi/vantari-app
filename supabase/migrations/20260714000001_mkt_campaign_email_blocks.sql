-- Adiciona coluna pra persistir os blocos do editor visual de email,
-- separada do template_html (HTML já compilado, usado no envio).
-- Sem isso, reabrir uma campanha pra editar perdia o layout montado
-- e voltava pro template padrão.
alter table mkt.campaigns
  add column if not exists email_blocks jsonb;