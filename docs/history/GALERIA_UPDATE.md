# Atualização da Galeria de Fotos

Esta atualização adiciona a funcionalidade de seleção de página de exibição para as fotos da galeria.

## O que foi implementado

1. Novo campo "Página de Exibição" no formulário de adição de fotos no painel administrativo
2. Opções de páginas: "Todas as páginas", "Secretaria", "Demutran", "Guarda Municipal", "Jovem Guarda", "Guarda Cidadã", "ROPE", "GMAM", "GSU", "Defesa Civil"
3. Atualização da lógica de exibição: fotos são mostradas apenas na página correspondente ou em "Todas as páginas"
4. Atualização do banco de dados para incluir a coluna `pagina_exibicao`
5. Atualização das tipagens TypeScript

## Como implementar

### 1. Atualizar o banco de dados

Execute o script SQL `add_pagina_exibicao_galeria.sql` no Supabase Studio para adicionar a coluna `pagina_exibicao` à tabela `galeria_fotos`:

```sql
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
```

### 2. Atualizar registros existentes (opcional)

Se desejar definir valores específicos para fotos já existentes com base na categoria, execute o script `update_pagina_exibicao_existing.sql`:

```sql
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
```

### 3. Atualizar o código

Certifique-se de que os arquivos do sistema foram atualizados com as alterações implementadas:
- `src/pages/admin/Galeria.tsx` - Adicionado campo de seleção de página
- `src/components/shared/PhotoGallery.tsx` - Lógica de filtragem por página
- `src/types/supabase.ts` - Tipagem atualizada
- Outros arquivos de páginas que utilizam PhotoGallery

## Funcionalidades

### Painel Administrativo
- No formulário de adição/editar foto, há um novo campo de seleção para escolher em qual página a foto será exibida
- Opções: "Todas as páginas", "Secretaria", "Demutran", "Guarda Municipal", etc.

### Páginas Públicas
- As fotos são exibidas de acordo com a página selecionada
- Uma foto com "Página de Exibição" definida como "Defesa Civil" só aparecerá na página de defesa civil
- Fotos com "Todas as páginas" aparecem em todas as páginas

## Notas Técnicas

- A funcionalidade mantém retrocompatibilidade com registros existentes
- A URL das páginas é convertida para o formato esperado (ex: "defesa civil" vira "defesa-civil")
- A lógica de filtragem considera tanto a categoria quanto a página de exibição