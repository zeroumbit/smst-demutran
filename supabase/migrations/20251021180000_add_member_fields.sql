-- Adiciona campos para página de destino e foto na tabela de equipe
ALTER TABLE public.equipe 
ADD COLUMN IF NOT EXISTS pagina_destino TEXT,
ADD COLUMN IF NOT EXISTS foto TEXT;