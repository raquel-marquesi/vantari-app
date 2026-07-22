select id, name, subject, length(template_html) as tamanho_html, created_at
from mkt.campaigns
order by created_at desc
limit 20;