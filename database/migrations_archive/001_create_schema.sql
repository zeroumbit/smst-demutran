-- =====================================================
-- SCRIPT DE CRIAÇÃO DO BANCO DE DADOS - SISTE SMST
-- =====================================================
-- Projeto: dtuojkipijsmrmsynqjw
-- URL: https://dtuojkipijsmrmsynqjw.supabase.co
-- =====================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

-- =====================================================
-- TIPO ENUM PARA PAPÉIS DE USUÁRIO
-- =====================================================
DO $$ BEGIN
    CREATE TYPE "public"."app_role" AS ENUM ('admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- FUNÇÕES
-- =====================================================
CREATE OR REPLACE FUNCTION "public"."atualizar_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role)
$$;

-- =====================================================
-- TABELAS
-- =====================================================

-- Tabela: contatos
CREATE TABLE IF NOT EXISTS "public"."contatos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "titulo" "text" NOT NULL,
    "descricao" "text",
    "telefone" "text",
    "email" "text",
    "endereco" "text",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "contatos_pkey" PRIMARY KEY ("id")
);

-- Tabela: equipe
CREATE TABLE IF NOT EXISTS "public"."equipe" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "cargo" "text" NOT NULL,
    "setor" "text",
    "email" "text",
    "telefone" "text",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "equipe_pkey" PRIMARY KEY ("id")
);

-- Tabela: eventos
CREATE TABLE IF NOT EXISTS "public"."eventos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "titulo" "text" NOT NULL,
    "descricao" "text",
    "local" "text",
    "data" "date" NOT NULL,
    "horario" time without time zone,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- Tabela: paginas
CREATE TABLE IF NOT EXISTS "public"."paginas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL UNIQUE,
    "titulo" "text" NOT NULL,
    "descricao" "text",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "paginas_pkey" PRIMARY KEY ("id")
);

-- Tabela: galeria_fotos
CREATE TABLE IF NOT EXISTS "public"."galeria_fotos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "url" "text" NOT NULL,
    "titulo" "text" NOT NULL,
    "descricao" "text",
    "possui_link" boolean DEFAULT false,
    "link_destino" "text",
    "categoria" "text",
    "pagina_exibicao" "text",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "galeria_fotos_pkey" PRIMARY KEY ("id")
);

-- Tabela: noticias
CREATE TABLE IF NOT EXISTS "public"."noticias" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "titulo" "text" NOT NULL,
    "resumo" "text" NOT NULL,
    "conteudo" "text" NOT NULL,
    "imagem" "text",
    "ativo" boolean DEFAULT true,
    "data" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "noticias_pkey" PRIMARY KEY ("id")
);

-- Tabela: projetos
CREATE TABLE IF NOT EXISTS "public"."projetos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "descricao" "text",
    "objetivo" "text",
    "imagem" "text",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "projetos_pkey" PRIMARY KEY ("id")
);

-- Tabela: user_roles
CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role")
);

-- Tabela: users
CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "password_hash" "text" NOT NULL,
    "name" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "users_email_key" UNIQUE ("email")
);

-- Tabela: documentos
CREATE TABLE IF NOT EXISTS "public"."documentos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "descricao" "text",
    "arquivo_url" "text" NOT NULL,
    "local_exibicao" "text" DEFAULT 'secretaria',
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- =====================================================
-- TRIGGERS (updated_at)
-- =====================================================
DROP TRIGGER IF EXISTS "trigger_atualizar_contatos_updated_at" ON "public"."contatos";
CREATE TRIGGER "trigger_atualizar_contatos_updated_at" BEFORE UPDATE ON "public"."contatos" FOR EACH ROW EXECUTE FUNCTION "public"."atualizar_updated_at"();

DROP TRIGGER IF EXISTS "trigger_atualizar_equipe_updated_at" ON "public"."equipe";
CREATE TRIGGER "trigger_atualizar_equipe_updated_at" BEFORE UPDATE ON "public"."equipe" FOR EACH ROW EXECUTE FUNCTION "public"."atualizar_updated_at"();

DROP TRIGGER IF EXISTS "trigger_atualizar_eventos_updated_at" ON "public"."eventos";
CREATE TRIGGER "trigger_atualizar_eventos_updated_at" BEFORE UPDATE ON "public"."eventos" FOR EACH ROW EXECUTE FUNCTION "public"."atualizar_updated_at"();

DROP TRIGGER IF EXISTS "trigger_atualizar_galeria_fotos_updated_at" ON "public"."galeria_fotos";
CREATE TRIGGER "trigger_atualizar_galeria_fotos_updated_at" BEFORE UPDATE ON "public"."galeria_fotos" FOR EACH ROW EXECUTE FUNCTION "public"."atualizar_updated_at"();

DROP TRIGGER IF EXISTS "trigger_atualizar_noticias_updated_at" ON "public"."noticias";
CREATE TRIGGER "trigger_atualizar_noticias_updated_at" BEFORE UPDATE ON "public"."noticias" FOR EACH ROW EXECUTE FUNCTION "public"."atualizar_updated_at"();

DROP TRIGGER IF EXISTS "trigger_atualizar_projetos_updated_at" ON "public"."projetos";
CREATE TRIGGER "trigger_atualizar_projetos_updated_at" BEFORE UPDATE ON "public"."projetos" FOR EACH ROW EXECUTE FUNCTION "public"."atualizar_updated_at"();

DROP TRIGGER IF EXISTS "trigger_atualizar_users_updated_at" ON "public"."users";
CREATE TRIGGER "trigger_atualizar_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."atualizar_updated_at"();

DROP TRIGGER IF EXISTS "trigger_atualizar_documentos_updated_at" ON "public"."documentos";
CREATE TRIGGER "trigger_atualizar_documentos_updated_at" BEFORE UPDATE ON "public"."documentos" FOR EACH ROW EXECUTE FUNCTION "public"."atualizar_updated_at"();

DROP TRIGGER IF EXISTS "trigger_atualizar_paginas_updated_at" ON "public"."paginas";
CREATE TRIGGER "trigger_atualizar_paginas_updated_at" BEFORE UPDATE ON "public"."paginas" FOR EACH ROW EXECUTE FUNCTION "public"."atualizar_updated_at"();

-- =====================================================
-- FUNÇÃO: Validar página de exibição (galeria_fotos)
-- =====================================================
CREATE OR REPLACE FUNCTION "public".validate_pagina_exibicao() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pagina_exibicao IS NOT NULL AND NEW.pagina_exibicao != 'todas' THEN
    IF NOT EXISTS (SELECT 1 FROM public.paginas WHERE nome = NEW.pagina_exibicao AND ativo = true) THEN
      RAISE EXCEPTION 'Página de exibição não existe: %', NEW.pagina_exibicao;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_pagina_exibicao ON "public"."galeria_fotos";
CREATE TRIGGER trigger_validate_pagina_exibicao
  BEFORE INSERT OR UPDATE ON "public"."galeria_fotos"
  FOR EACH ROW
  EXECUTE FUNCTION "public".validate_pagina_exibicao();

-- =====================================================
-- FOREIGN KEYS
-- =====================================================
DO $$ BEGIN
    ALTER TABLE ONLY "public"."user_roles"
        ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
EXCEPTION
    WHEN foreign_key_violation THEN null;
END $$;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) - POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Admin full access contatos" ON "public"."contatos";
DROP POLICY IF EXISTS "Admins can manage contatos" ON "public"."contatos";
DROP POLICY IF EXISTS "Admin full access equipe" ON "public"."equipe";
DROP POLICY IF EXISTS "Admins can manage equipe" ON "public"."equipe";
DROP POLICY IF EXISTS "Admin full access eventos" ON "public"."eventos";
DROP POLICY IF EXISTS "Admins can manage eventos" ON "public"."eventos";
DROP POLICY IF EXISTS "Public read active eventos" ON "public"."eventos";
DROP POLICY IF EXISTS "Admin full access galeria_fotos" ON "public"."galeria_fotos";
DROP POLICY IF EXISTS "Admins can manage galeria_fotos" ON "public"."galeria_fotos";
DROP POLICY IF EXISTS "Public read active galeria_fotos" ON "public"."galeria_fotos";
DROP POLICY IF EXISTS "Admin full access noticias" ON "public"."noticias";
DROP POLICY IF EXISTS "Admins can manage noticias" ON "public"."noticias";
DROP POLICY IF EXISTS "Public read active noticias" ON "public"."noticias";
DROP POLICY IF EXISTS "Admin full access projetos" ON "public"."projetos";
DROP POLICY IF EXISTS "Admins can manage projetos" ON "public"."projetos";
DROP POLICY IF EXISTS "Public read active projetos" ON "public"."projetos";
DROP POLICY IF EXISTS "Admin full access users" ON "public"."users";
DROP POLICY IF EXISTS "Admins can manage users" ON "public"."users";
DROP POLICY IF EXISTS "Admins can manage user_roles" ON "public"."user_roles";
DROP POLICY IF EXISTS "Users can view their own roles" ON "public"."user_roles";
DROP POLICY IF EXISTS "Admin full access paginas" ON "public"."paginas";
DROP POLICY IF EXISTS "Admins can manage paginas" ON "public"."paginas";
DROP POLICY IF EXISTS "Public read active paginas" ON "public"."paginas";
DROP POLICY IF EXISTS "Admin full access documentos" ON "public"."documentos";
DROP POLICY IF EXISTS "Admins can manage documentos" ON "public"."documentos";
DROP POLICY IF EXISTS "Public read active documentos" ON "public"."documentos";

-- Policies: contatos
CREATE POLICY "Admin full access contatos" ON "public"."contatos" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));
CREATE POLICY "Admins can manage contatos" ON "public"."contatos" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());

-- Policies: equipe
CREATE POLICY "Admin full access equipe" ON "public"."equipe" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));
CREATE POLICY "Admins can manage equipe" ON "public"."equipe" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());

-- Policies: eventos
CREATE POLICY "Admin full access eventos" ON "public"."eventos" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));
CREATE POLICY "Admins can manage eventos" ON "public"."eventos" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());
CREATE POLICY "Public read active eventos" ON "public"."eventos" FOR SELECT USING (("ativo" = true));

-- Policies: galeria_fotos
CREATE POLICY "Admin full access galeria_fotos" ON "public"."galeria_fotos" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));
CREATE POLICY "Admins can manage galeria_fotos" ON "public"."galeria_fotos" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());
CREATE POLICY "Public read active galeria_fotos" ON "public"."galeria_fotos" FOR SELECT USING (("ativo" = true));

-- Policies: noticias
CREATE POLICY "Admin full access noticias" ON "public"."noticias" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));
CREATE POLICY "Admins can manage noticias" ON "public"."noticias" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());
CREATE POLICY "Public read active noticias" ON "public"."noticias" FOR SELECT USING (("ativo" = true));

-- Policies: projetos
CREATE POLICY "Admin full access projetos" ON "public"."projetos" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));
CREATE POLICY "Admins can manage projetos" ON "public"."projetos" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());
CREATE POLICY "Public read active projetos" ON "public"."projetos" FOR SELECT USING (("ativo" = true));

-- Policies: users
CREATE POLICY "Admin full access users" ON "public"."users" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));
CREATE POLICY "Admins can manage users" ON "public"."users" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());

-- Policies: user_roles
CREATE POLICY "Admins can manage user_roles" ON "public"."user_roles" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());
CREATE POLICY "Users can view their own roles" ON "public"."user_roles" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));

-- Policies: paginas
CREATE POLICY "Admin full access paginas" ON "public"."paginas" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));
CREATE POLICY "Admins can manage paginas" ON "public"."paginas" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());
CREATE POLICY "Public read active paginas" ON "public"."paginas" FOR SELECT USING (("ativo" = true));

-- Policies: documentos
CREATE POLICY "Admin full access documentos" ON "public"."documentos" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));
CREATE POLICY "Admins can manage documentos" ON "public"."documentos" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());
CREATE POLICY "Public read active documentos" ON "public"."documentos" FOR SELECT USING (("ativo" = true));

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE "public"."contatos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."equipe" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."eventos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."galeria_fotos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."noticias" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."projetos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."paginas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."documentos" ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- INSERT: Páginas do sistema
-- =====================================================
INSERT INTO "public"."paginas" (nome, titulo, descricao, ativo) VALUES
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

-- =====================================================
-- GRANTS: Permissões
-- =====================================================
GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

GRANT ALL ON FUNCTION "public"."atualizar_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."atualizar_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."atualizar_updated_at"() TO "service_role";

GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "service_role";

GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";

GRANT ALL ON TABLE "public"."contatos" TO "anon";
GRANT ALL ON TABLE "public"."contatos" TO "authenticated";
GRANT ALL ON TABLE "public"."contatos" TO "service_role";

GRANT ALL ON TABLE "public"."equipe" TO "anon";
GRANT ALL ON TABLE "public"."equipe" TO "authenticated";
GRANT ALL ON TABLE "public"."equipe" TO "service_role";

GRANT ALL ON TABLE "public"."eventos" TO "anon";
GRANT ALL ON TABLE "public"."eventos" TO "authenticated";
GRANT ALL ON TABLE "public"."eventos" TO "service_role";

GRANT ALL ON TABLE "public"."galeria_fotos" TO "anon";
GRANT ALL ON TABLE "public"."galeria_fotos" TO "authenticated";
GRANT ALL ON TABLE "public"."galeria_fotos" TO "service_role";

GRANT ALL ON TABLE "public"."noticias" TO "anon";
GRANT ALL ON TABLE "public"."noticias" TO "authenticated";
GRANT ALL ON TABLE "public"."noticias" TO "service_role";

GRANT ALL ON TABLE "public"."projetos" TO "anon";
GRANT ALL ON TABLE "public"."projetos" TO "authenticated";
GRANT ALL ON TABLE "public"."projetos" TO "service_role";

GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";

GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";

GRANT ALL ON TABLE "public"."paginas" TO "anon";
GRANT ALL ON TABLE "public"."paginas" TO "authenticated";
GRANT ALL ON TABLE "public"."paginas" TO "service_role";

GRANT ALL ON TABLE "public"."documentos" TO "anon";
GRANT ALL ON TABLE "public"."documentos" TO "authenticated";
GRANT ALL ON TABLE "public"."documentos" TO "service_role";

-- =====================================================
-- FIM DO SCRIPT
-- =====================================================
