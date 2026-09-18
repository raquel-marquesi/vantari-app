-- Achado 18/09/2026: bucket email-assets (usado pelo editor de email em
-- /email) nunca teve limite de tamanho nem de tipo de arquivo configurado
-- — a dica na UI já dizia "até 2MB" mas nada impedia um arquivo maior
-- (risco real: o Gmail trunca emails grandes, cortando o conteúdo com
-- "[Mensagem truncada]"). Validação client-side já foi adicionada em
-- vantari-email-marketing.jsx; isso aqui é defesa em profundidade —
-- trava no servidor mesmo que alguém baixe a validação do front.
update storage.buckets
set file_size_limit = 2097152, -- 2MB, mesmo limite já anunciado na UI
    allowed_mime_types = array['image/jpeg','image/png','image/gif','image/webp']
where id = 'email-assets';
