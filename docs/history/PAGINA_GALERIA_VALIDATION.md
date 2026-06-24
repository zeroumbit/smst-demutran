# Validação de Exibição de Fotos na Galeria

## Descrição
Este sistema agora inclui uma validação para garantir que fotos da galeria sejam associadas apenas a páginas que realmente existem no sistema. Isso evita que fotos sejam configuradas para exibição em páginas que não foram criadas.

## Estrutura do Banco de Dados

### Tabela `paginas`
A tabela `paginas` foi criada para armazenar as páginas existentes no sistema:

```sql
CREATE TABLE IF NOT EXISTS "public"."paginas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL UNIQUE,
    "titulo" "text" NOT NULL,
    "descricao" "text",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);
```

### Validação na Tabela `galeria_fotos`
Uma função de validação foi adicionada para garantir que `pagina_exibicao` seja válida:

```sql
CREATE OR REPLACE FUNCTION validate_pagina_exibicao()
RETURNS TRIGGER AS $$
BEGIN
  -- Verifica se a pagina_exibicao é 'todas' ou está na tabela paginas
  IF NEW.pagina_exibicao IS NOT NULL AND NEW.pagina_exibicao != 'todas' THEN
    IF NOT EXISTS (SELECT 1 FROM paginas WHERE nome = NEW.pagina_exibicao AND ativo = true) THEN
      RAISE EXCEPTION 'Página de exibição não existe: %', NEW.pagina_exibicao;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Adiciona o trigger à tabela galeria_fotos
CREATE TRIGGER trigger_validate_pagina_exibicao
  BEFORE INSERT OR UPDATE ON galeria_fotos
  FOR EACH ROW
  EXECUTE FUNCTION validate_pagina_exibicao();
```

## Funcionalidades

### 1. Interface Administrativa
- A página de galeria no painel admin (`/admin/galeria`) agora carrega dinamicamente as páginas disponíveis
- Apenas páginas ativas são exibidas na lista de seleção
- Validação frontend impede envio de formulários com páginas inexistentes
- Mensagem de erro clara quando página não existe

### 2. Exibição Pública
- Componente `PhotoGallery` filtra fotos com base na página atual
- Apenas fotos com páginas válidas são exibidas nas páginas públicas
- Compatibilidade mantida com fotos antigas que não tinham página definida

## Páginas Existentes
As seguintes páginas estão pré-configuradas no sistema:
- secretaria
- demutran
- guarda-municipal
- jovem-guarda
- guarda-cidada
- rope
- gmam
- gsu
- defesa-civil

## Como Adicionar Novas Páginas
Para adicionar novas páginas ao sistema, basta inseri-las na tabela `paginas`:

```sql
INSERT INTO paginas (nome, titulo, descricao, ativo)
VALUES ('nova-pagina', 'Nova Página', 'Descrição da nova página', true);
```

Após adicionar uma nova página, ela ficará automaticamente disponível para seleção na interface administrativa.

## Validação
1. No backend: Trigger impede inserção de fotos com páginas inexistentes
2. No frontend: Validação previne envio de formulários inválidos
3. Interface clara sobre as páginas disponíveis

## Compatibilidade
- Fotos antigas sem página definida aparecem em todas as páginas (pagina_exibicao nula)
- Compatibilidade retroativa com fotos antigas
- Integração suave com o sistema existente de galeria