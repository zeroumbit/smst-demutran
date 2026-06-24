-- Script para atualizar a coluna pagina_exibicao em registros existentes
-- Este script define pagina_exibicao com base na categoria existente

UPDATE galeria_fotos 
SET pagina_exibicao = CASE 
    WHEN categoria = 'secretaria' THEN 'secretaria'
    WHEN categoria = 'demutran' THEN 'demutran'
    WHEN categoria = 'guarda municipal' THEN 'guarda-municipal'
    WHEN categoria = 'guarda cidadã' THEN 'guarda-cidada'
    WHEN categoria = 'jovem guarda' THEN 'jovem-guarda'
    WHEN categoria = 'rope' THEN 'rope'
    WHEN categoria = 'gmam' THEN 'gmam'
    WHEN categoria = 'gsu' THEN 'gsu'
    WHEN categoria = 'defesa civil' THEN 'defesa-civil'
    ELSE 'todas'
END
WHERE pagina_exibicao IS NULL OR pagina_exibicao = '';

-- Atualiza registros onde categoria não se encaixa nos casos acima
UPDATE galeria_fotos 
SET pagina_exibicao = 'todas'
WHERE pagina_exibicao IS NULL OR pagina_exibicao = '';