-- Script de atualização para corrigir dados existentes e implementar validação de páginas

-- 1. Remove o valor padrão da coluna pagina_exibicao
ALTER TABLE galeria_fotos ALTER COLUMN pagina_exibicao DROP DEFAULT;

-- 2. Atualiza registros existentes que têm 'todas' para NULL
UPDATE galeria_fotos SET pagina_exibicao = NULL WHERE pagina_exibicao = 'todas';

-- 3. Criação da tabela de páginas (se ainda não existir)
CREATE TABLE IF NOT EXISTS "public"."paginas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL UNIQUE,
    "titulo" "text" NOT NULL,
    "descricao" "text",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

-- 4. Adiciona chave primária
ALTER TABLE "public"."paginas" 
ADD CONSTRAINT "paginas_pkey" PRIMARY KEY ("id");

-- 5. Adiciona trigger para atualizar o campo updated_at
CREATE OR REPLACE TRIGGER "trigger_atualizar_paginas_updated_at" 
BEFORE UPDATE ON "public"."paginas" 
FOR EACH ROW EXECUTE FUNCTION "public"."atualizar_updated_at"();

-- 6. Adiciona política de segurança
CREATE POLICY "Admin full access paginas" ON "public"."paginas" 
USING (("auth"."role"() = 'authenticated'::"text")) 
WITH CHECK (("auth"."role"() = 'authenticated'::"text"));

CREATE POLICY "Admins can manage paginas" ON "public"."paginas" 
TO "authenticated" USING ("public"."is_admin"()) 
WITH CHECK ("public"."is_admin"());

CREATE POLICY "Public read active paginas" ON "public"."paginas" 
FOR SELECT USING (("ativo" = true));

ALTER TABLE "public"."paginas" 
ENABLE ROW LEVEL SECURITY;

-- 7. Cria a função de validação
CREATE OR REPLACE FUNCTION validate_pagina_exibicao()
RETURNS TRIGGER AS $$
BEGIN
  -- Verifica se a pagina_exibicao é NULL (fotos antigas) ou está na tabela paginas
  IF NEW.pagina_exibicao IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM paginas WHERE nome = NEW.pagina_exibicao AND ativo = true) THEN
      RAISE EXCEPTION 'Página de exibição não existe: %', NEW.pagina_exibicao;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Adiciona o trigger à tabela galeria_fotos
CREATE TRIGGER trigger_validate_pagina_exibicao
  BEFORE INSERT OR UPDATE ON galeria_fotos
  FOR EACH ROW
  EXECUTE FUNCTION validate_pagina_exibicao();

-- 9. Insere as páginas existentes no sistema
INSERT INTO paginas (nome, titulo, descricao, ativo) VALUES
('inicio', 'Início', 'Página inicial', true),
('secretaria', 'Secretaria', 'Página da Secretaria', true),
('demutran', 'Demutran', 'Página da Demutran', true),
('guarda-municipal', 'Guarda Municipal', 'Página da Guarda Municipal', true),
('jovem-guarda', 'Jovem Guarda', 'Página da Jovem Guarda', true),
('guarda-cidada', 'Guarda Cidadã', 'Página da Guarda Cidadã', true),
('rope', 'ROPE', 'Página do ROPE', true),
('gmam', 'GMAM', 'Página do GMAM', true),
('gsu', 'GSU', 'Página do GSU', true),
('defesa-civil', 'Defesa Civil', 'Página da Defesa Civil', true)
ON CONFLICT (nome) DO NOTHING;

-- 10. Atualiza a política de segurança para galeria_fotos
DROP POLICY IF EXISTS "Admins can manage galeria_fotos" ON "public"."galeria_fotos";
CREATE POLICY "Admins can manage galeria_fotos" ON "public"."galeria_fotos" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());

-- Pronto! A validação e a tabela de páginas foram configuradas.