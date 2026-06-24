-- Script de atualização para criar a tabela documentos no Supabase (se não existir)

-- Criação da tabela de documentos
CREATE TABLE IF NOT EXISTS "public"."documentos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "descricao" "text",
    "arquivo_url" "text" NOT NULL,
    "local_exibicao" "text" DEFAULT 'secretaria',
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
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
USING (("auth"."role"() = 'authenticated'::"text")) 
WITH CHECK (("auth"."role"() = 'authenticated'::"text"));

CREATE POLICY "Admins can manage documentos" ON "public"."documentos" 
TO "authenticated" USING ("public"."is_admin"()) 
WITH CHECK ("public"."is_admin"());

CREATE POLICY "Public read active documentos" ON "public"."documentos" 
FOR SELECT USING (("ativo" = true));

ALTER TABLE "public"."documentos" 
ENABLE ROW LEVEL SECURITY;

-- Adiciona a tabela ao schema público se ainda não estiver lá
GRANT ALL ON TABLE "public"."documentos" TO "anon";
GRANT ALL ON TABLE "public"."documentos" TO "authenticated";
GRANT ALL ON TABLE "public"."documentos" TO "service_role";

-- Cria índices para melhorar performance
CREATE INDEX IF NOT EXISTS "idx_documentos_created_at" ON "public"."documentos" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_documentos_ativo" ON "public"."documentos" ("ativo");
CREATE INDEX IF NOT EXISTS "idx_documentos_local_exibicao" ON "public"."documentos" ("local_exibicao");

-- Pronto! A tabela documentos foi criada/atualizada.