-- Adicionando a coluna pagina_exibicao à tabela galeria_fotos

-- Adiciona a coluna com valor padrão 'todas' para registros existentes
ALTER TABLE galeria_fotos 
ADD COLUMN IF NOT EXISTS pagina_exibicao VARCHAR(50) DEFAULT 'todas';

-- Atualiza registros existentes para ter o valor padrão
UPDATE galeria_fotos 
SET pagina_exibicao = 'todas' 
WHERE pagina_exibicao IS NULL;

-- Adiciona comentário à coluna para documentação
COMMENT ON COLUMN galeria_fotos.pagina_exibicao IS 'Página onde a foto será exibida (todas, secretaria, demutran, guarda-municipal, etc.)';