-- Criação da tabela de páginas para validação

CREATE TABLE IF NOT EXISTS "public"."paginas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL UNIQUE,
    "titulo" "text" NOT NULL,
    "descricao" "text",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

-- Adiciona chave primária (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'paginas_pkey' AND conrelid = 'public.paginas'::regclass
  ) THEN
    ALTER TABLE "public"."paginas" ADD CONSTRAINT "paginas_pkey" PRIMARY KEY ("id");
  END IF;
END;
$$;

-- Adiciona trigger para atualizar o campo updated_at
DROP TRIGGER IF EXISTS "trigger_atualizar_paginas_updated_at" ON "public"."paginas";
CREATE TRIGGER "trigger_atualizar_paginas_updated_at" 
BEFORE UPDATE ON "public"."paginas" 
FOR EACH ROW EXECUTE FUNCTION "public"."atualizar_updated_at"();

-- Adiciona política de segurança
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin full access paginas' AND tablename = 'paginas') THEN
    CREATE POLICY "Admin full access paginas" ON "public"."paginas" 
    USING (("auth"."role"() = 'authenticated'::"text")) 
    WITH CHECK (("auth"."role"() = 'authenticated'::"text"));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage paginas' AND tablename = 'paginas') THEN
    CREATE POLICY "Admins can manage paginas" ON "public"."paginas" 
    TO "authenticated" USING ("public"."is_admin"()) 
    WITH CHECK ("public"."is_admin"());
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read active paginas' AND tablename = 'paginas') THEN
    CREATE POLICY "Public read active paginas" ON "public"."paginas" 
    FOR SELECT USING (("ativo" = true));
  END IF;
END;
$$;

ALTER TABLE "public"."paginas" 
ENABLE ROW LEVEL SECURITY;

-- Adiciona restrição para garantir que a pagina_exibicao em galeria_fotos exista na tabela paginas
-- Isso criará uma função de validação
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

-- Adiciona o trigger à tabela galeria_fotos (se não existir)
DROP TRIGGER IF EXISTS trigger_validate_pagina_exibicao ON galeria_fotos;
CREATE TRIGGER trigger_validate_pagina_exibicao
  BEFORE INSERT OR UPDATE ON galeria_fotos
  FOR EACH ROW
  EXECUTE FUNCTION validate_pagina_exibicao();

-- Insere as páginas existentes com base nas rotas do sistema
INSERT INTO paginas (nome, titulo, descricao) VALUES
('secretaria', 'Secretaria', 'Página da Secretaria'),
('demutran', 'Demutran', 'Página da Demutran'),
('guarda-municipal', 'Guarda Municipal', 'Página da Guarda Municipal'),
('jovem-guarda', 'Jovem Guarda', 'Página da Jovem Guarda'),
('guarda-cidada', 'Guarda Cidadã', 'Página da Guarda Cidadã'),
('rope', 'ROPE', 'Página do ROPE'),
('gmam', 'GMAM', 'Página do GMAM'),
('gsu', 'GSU', 'Página do GSU'),
('defesa-civil', 'Defesa Civil', 'Página da Defesa Civil')
ON CONFLICT (nome) DO NOTHING;