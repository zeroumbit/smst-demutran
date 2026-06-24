
CREATE TABLE IF NOT EXISTS documentos (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  arquivo_url TEXT NOT NULL,
  local_exibicao TEXT DEFAULT 'secretaria',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adiciona chave primária
ALTER TABLE "public"."documentos" 
ADD CONSTRAINT "documentos_pkey" PRIMARY KEY ("id");

-- Adiciona trigger para atualizar o campo updated_at
CREATE OR REPLACE TRIGGER "trigger_atualizar_documentos_updated_at" 
BEFORE UPDATE ON "public"."documentos" 
FOR EACH ROW EXECUTE FUNCTION "public"."atualizar_updated_at"();

-- Adiciona política de segurança
CREATE POLICY "Admin full access documentos" ON "public"."documentos" 
USING (("auth.role"() = 'authenticated'::"text")) 
WITH CHECK (("auth.role"() = 'authenticated'::"text"));

CREATE POLICY "Admins can manage documentos" ON "public"."documentos" 
TO "authenticated" USING ("public"."is_admin"()) 
WITH CHECK ("public"."is_admin"());

CREATE POLICY "Public read active documentos" ON "public"."documentos" 
FOR SELECT USING (("ativo" = true));

ALTER TABLE "public"."documentos" 
ENABLE ROW LEVEL SECURITY;

-- Adiciona a tabela ao schema público
GRANT ALL ON TABLE "public"."documentos" TO "anon";
GRANT ALL ON TABLE "public"."documentos" TO "authenticated";
GRANT ALL ON TABLE "public"."documentos" TO "service_role";

-- Cria índices para melhorar performance
CREATE INDEX IF NOT EXISTS "idx_documentos_created_at" ON "public"."documentos" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_documentos_ativo" ON "public"."documentos" ("ativo");
CREATE INDEX IF NOT EXISTS "idx_documentos_local_exibicao" ON "public"."documentos" ("local_exibicao");
  