-- Script atualizado para sincronização final do Supabase

-- Criação da tabela de páginas (faltante)
CREATE TABLE IF NOT EXISTS "public"."paginas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL UNIQUE,
    "titulo" "text" NOT NULL,
    "descricao" "text",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

-- Adiciona chave primária
ALTER TABLE "public"."paginas"
ADD CONSTRAINT "paginas_pkey" PRIMARY KEY ("id");

-- Adiciona trigger para atualizar o campo updated_at
CREATE OR REPLACE TRIGGER "trigger_atualizar_paginas_updated_at"
BEFORE UPDATE ON "public"."paginas"
FOR EACH ROW EXECUTE FUNCTION "public"."atualizar_updated_at"();

-- Adiciona política de segurança
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

-- Criação do bucket de documentos (faltante)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('documentos', 'documentos', false, 10485760, '{application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel}');

-- Configuração de políticas de segurança para o bucket de documentos
CREATE POLICY "Allow read access to authenticated users for documentos bucket" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'documentos');

CREATE POLICY "Allow insert access to authenticated users for documentos bucket" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documentos');

CREATE POLICY "Allow update access to authenticated users for documentos bucket" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'documentos');

CREATE POLICY "Allow delete access to authenticated users for documentos bucket" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'documentos');

-- Adiciona a coluna pagina_exibicao à tabela galeria_fotos se ainda não existir (caso não tenha sido adicionada)
ALTER TABLE galeria_fotos
ADD COLUMN IF NOT EXISTS pagina_exibicao TEXT;

-- Atualiza registros existentes para remover o valor padrão 'todas'
UPDATE galeria_fotos
SET pagina_exibicao = NULL
WHERE pagina_exibicao = 'todas';

-- Adiciona comentário à coluna para documentação
COMMENT ON COLUMN galeria_fotos.pagina_exibicao IS 'Página onde a foto será exibida (todas, secretaria, demutran, guarda-municipal, etc.)';

-- Cria a função de validação
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

-- Remove o trigger existente se já existir
DROP TRIGGER IF EXISTS trigger_validate_pagina_exibicao ON galeria_fotos;

-- Adiciona o trigger à tabela galeria_fotos
CREATE TRIGGER trigger_validate_pagina_exibicao
  BEFORE INSERT OR UPDATE ON galeria_fotos
  FOR EACH ROW
  EXECUTE FUNCTION validate_pagina_exibicao();

-- Atualiza permissões para galeria_fotos - remove e recria a política
DROP POLICY IF EXISTS "Admins can manage galeria_fotos" ON "public"."galeria_fotos";

CREATE POLICY "Admins can manage galeria_fotos" ON "public"."galeria_fotos"
TO "authenticated" USING ("public"."is_admin"())
WITH CHECK ("public"."is_admin"());

-- Insere as páginas existentes no sistema
INSERT INTO paginas (nome, titulo, descricao, ativo) VALUES
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

-- Pronto! A sincronização do banco de dados está completa.