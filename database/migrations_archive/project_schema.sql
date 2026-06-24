


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."atualizar_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."atualizar_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."contatos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "titulo" "text" NOT NULL,
    "descricao" "text",
    "telefone" "text",
    "email" "text",
    "endereco" "text",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."contatos" OWNER TO "postgres";


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
    "pagina_destino" "text",
    "foto" "text"
);


ALTER TABLE "public"."equipe" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."eventos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "titulo" "text" NOT NULL,
    "descricao" "text",
    "local" "text",
    "data" "date" NOT NULL,
    "horario" time without time zone,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."eventos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."galeria_fotos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "url" "text" NOT NULL,
    "titulo" "text" NOT NULL,
    "descricao" "text",
    "possui_link" boolean DEFAULT false,
    "link_destino" "text",
    "categoria" "text",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."galeria_fotos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."noticias" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "titulo" "text" NOT NULL,
    "resumo" "text" NOT NULL,
    "conteudo" "text" NOT NULL,
    "imagem" "text",
    "ativo" boolean DEFAULT true,
    "data" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."noticias" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projetos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nome" "text" NOT NULL,
    "descricao" "text",
    "objetivo" "text",
    "imagem" "text",
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."projetos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "password_hash" "text" NOT NULL,
    "name" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."contatos"
    ADD CONSTRAINT "contatos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipe"
    ADD CONSTRAINT "equipe_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."eventos"
    ADD CONSTRAINT "eventos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."galeria_fotos"
    ADD CONSTRAINT "galeria_fotos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."noticias"
    ADD CONSTRAINT "noticias_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projetos"
    ADD CONSTRAINT "projetos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE OR REPLACE TRIGGER "trigger_atualizar_contatos_updated_at" BEFORE UPDATE ON "public"."contatos" FOR EACH ROW EXECUTE FUNCTION "public"."atualizar_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_atualizar_equipe_updated_at" BEFORE UPDATE ON "public"."equipe" FOR EACH ROW EXECUTE FUNCTION "public"."atualizar_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_atualizar_eventos_updated_at" BEFORE UPDATE ON "public"."eventos" FOR EACH ROW EXECUTE FUNCTION "public"."atualizar_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_atualizar_galeria_fotos_updated_at" BEFORE UPDATE ON "public"."galeria_fotos" FOR EACH ROW EXECUTE FUNCTION "public"."atualizar_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_atualizar_noticias_updated_at" BEFORE UPDATE ON "public"."noticias" FOR EACH ROW EXECUTE FUNCTION "public"."atualizar_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_atualizar_projetos_updated_at" BEFORE UPDATE ON "public"."projetos" FOR EACH ROW EXECUTE FUNCTION "public"."atualizar_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_atualizar_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."atualizar_updated_at"();



CREATE POLICY "Admin full access contatos" ON "public"."contatos" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Admin full access equipe" ON "public"."equipe" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Admin full access eventos" ON "public"."eventos" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Admin full access galeria_fotos" ON "public"."galeria_fotos" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Admin full access noticias" ON "public"."noticias" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Admin full access projetos" ON "public"."projetos" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Admin full access users" ON "public"."users" USING (("auth"."role"() = 'authenticated'::"text")) WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Public read active eventos" ON "public"."eventos" FOR SELECT USING (("ativo" = true));



CREATE POLICY "Public read active galeria_fotos" ON "public"."galeria_fotos" FOR SELECT USING (("ativo" = true));



CREATE POLICY "Public read active noticias" ON "public"."noticias" FOR SELECT USING (("ativo" = true));



CREATE POLICY "Public read active projetos" ON "public"."projetos" FOR SELECT USING (("ativo" = true));



ALTER TABLE "public"."contatos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."equipe" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."eventos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."galeria_fotos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."noticias" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projetos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";































































































































































GRANT ALL ON FUNCTION "public"."atualizar_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."atualizar_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."atualizar_updated_at"() TO "service_role";


















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



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































RESET ALL;
