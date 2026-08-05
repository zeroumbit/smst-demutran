-- =====================================================
-- Migration: Permissions V2 - Núcleo granular de permissões
-- Fase: Entrega 1 (tabelas + motor tem_permissao com fallback legado)
-- Descricao: Cria o catalogo granular (Setor > Modulos > Permissoes >
--            Perfis Funcionais > Usuarios > Ajustes individuais) em
--            paralelo com o modelo legado (papel + raw_app_meta_data.modulos).
--            Nada muda de comportamento enquanto permissions_v2_enabled = false.
-- Reversivel: DROP das tabelas/coluna novas (nenhuma altera tabelas existentes).
-- =====================================================

-- -----------------------------------------------------
-- 1. Catalogo de modulos por setor
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.setor_modulos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id uuid NOT NULL REFERENCES public.setores(id) ON DELETE CASCADE,
  slug text NOT NULL,
  prefixo text NOT NULL,
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT setor_modulos_setor_slug_unq UNIQUE (setor_id, slug),
  CONSTRAINT setor_modulos_setor_prefixo_unq UNIQUE (setor_id, prefixo)
);

-- -----------------------------------------------------
-- 2. Catalogo de permissoes (codigo no formato <modulo>.<acao>)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.permissoes_sistema (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo_id uuid NOT NULL REFERENCES public.setor_modulos(id) ON DELETE CASCADE,
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  acao text NOT NULL,
  sensivel boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------
-- 3. Perfis funcionais (ex: "Professor JGC", "Agente de frota")
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.perfis_funcionais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id uuid REFERENCES public.setores(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT perfis_funcionais_setor_nome_unq UNIQUE (setor_id, nome)
);

-- -----------------------------------------------------
-- 4. Permissoes concedidas a cada perfil funcional
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.perfil_funcional_permissoes (
  perfil_funcional_id uuid NOT NULL REFERENCES public.perfis_funcionais(id) ON DELETE CASCADE,
  permissao_id uuid NOT NULL REFERENCES public.permissoes_sistema(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (perfil_funcional_id, permissao_id)
);

-- -----------------------------------------------------
-- 5. Ajustes individuais por usuario (PERMITIR / NEGAR)
--    Ordem de decisao: Super Admin > NEGAR > PERMITIR >
--    perfil funcional > compatibilidade legada > negado
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.usuario_permissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_usuario_id uuid NOT NULL REFERENCES public.perfis_usuarios(id) ON DELETE CASCADE,
  permissao_id uuid NOT NULL REFERENCES public.permissoes_sistema(id) ON DELETE CASCADE,
  efeito text NOT NULL CHECK (efeito IN ('PERMITIR', 'NEGAR')),
  motivo text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT usuario_permissoes_unq UNIQUE (perfil_usuario_id, permissao_id)
);

-- -----------------------------------------------------
-- 6. Coluna de migracao em perfis_usuarios (nullable = nao migrado)
-- -----------------------------------------------------
ALTER TABLE public.perfis_usuarios
  ADD COLUMN IF NOT EXISTS perfil_funcional_id uuid
  REFERENCES public.perfis_funcionais(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS perfis_usuarios_perfil_funcional_idx
  ON public.perfis_usuarios (perfil_funcional_id)
  WHERE perfil_funcional_id IS NOT NULL;

-- -----------------------------------------------------
-- 7. Log de divergencias (modo sombra - desligado por padrao)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.permissoes_divergencia_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  resultado_novo boolean NOT NULL,
  resultado_legado boolean NOT NULL,
  divergiu boolean NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS permissoes_divergencia_log_user_idx
  ON public.permissoes_divergencia_log (user_id, criado_em DESC);

-- -----------------------------------------------------
-- 8. Triggers de updated_at
-- -----------------------------------------------------
DROP TRIGGER IF EXISTS trigger_atualizar_setor_modulos_updated_at ON public.setor_modulos;
CREATE TRIGGER trigger_atualizar_setor_modulos_updated_at
BEFORE UPDATE ON public.setor_modulos
FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

DROP TRIGGER IF EXISTS trigger_atualizar_perfis_funcionais_updated_at ON public.perfis_funcionais;
CREATE TRIGGER trigger_atualizar_perfis_funcionais_updated_at
BEFORE UPDATE ON public.perfis_funcionais
FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

-- -----------------------------------------------------
-- 9. Flag unica de ativacao (desligada por padrao)
-- -----------------------------------------------------
INSERT INTO public.configuracoes (grupo, tipo, config, ativo, ordem)
VALUES (
  'permissions_v2',
  'enabled',
  '{"enabled": false}'::jsonb,
  true,
  1
)
ON CONFLICT (grupo, tipo) DO NOTHING;

-- -----------------------------------------------------
-- 10. RLS
-- -----------------------------------------------------
ALTER TABLE public.setor_modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissoes_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis_funcionais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfil_funcional_permissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario_permissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissoes_divergencia_log ENABLE ROW LEVEL SECURITY;

-- setor_modulos: leitura para todos autenticados, escrita so super admin
DROP POLICY IF EXISTS "Read setor_modulos" ON public.setor_modulos;
CREATE POLICY "Read setor_modulos" ON public.setor_modulos
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Super admin manage setor_modulos" ON public.setor_modulos;
CREATE POLICY "Super admin manage setor_modulos" ON public.setor_modulos
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- permissoes_sistema: idem
DROP POLICY IF EXISTS "Read permissoes_sistema" ON public.permissoes_sistema;
CREATE POLICY "Read permissoes_sistema" ON public.permissoes_sistema
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Super admin manage permissoes_sistema" ON public.permissoes_sistema;
CREATE POLICY "Super admin manage permissoes_sistema" ON public.permissoes_sistema
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- perfis_funcionais: leitura para todos autenticados, escrita so super admin
DROP POLICY IF EXISTS "Read perfis_funcionais" ON public.perfis_funcionais;
CREATE POLICY "Read perfis_funcionais" ON public.perfis_funcionais
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Super admin manage perfis_funcionais" ON public.perfis_funcionais;
CREATE POLICY "Super admin manage perfis_funcionais" ON public.perfis_funcionais
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- perfil_funcional_permissoes: idem
DROP POLICY IF EXISTS "Read perfil_funcional_permissoes" ON public.perfil_funcional_permissoes;
CREATE POLICY "Read perfil_funcional_permissoes" ON public.perfil_funcional_permissoes
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Super admin manage perfil_funcional_permissoes" ON public.perfil_funcional_permissoes;
CREATE POLICY "Super admin manage perfil_funcional_permissoes" ON public.perfil_funcional_permissoes
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- usuario_permissoes: usuario ve as proprias; super admin e gestores do setor gerem
DROP POLICY IF EXISTS "Users view own usuario_permissoes" ON public.usuario_permissoes;
CREATE POLICY "Users view own usuario_permissoes" ON public.usuario_permissoes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfis_usuarios pu
      WHERE pu.id = usuario_permissoes.perfil_usuario_id
        AND pu.user_id = auth.uid()
    )
    OR public.is_super_admin()
    OR public.is_gestor_setor(
        (SELECT setor_id FROM public.perfis_usuarios WHERE id = usuario_permissoes.perfil_usuario_id)
    )
  );
DROP POLICY IF EXISTS "Super admin manage usuario_permissoes" ON public.usuario_permissoes;
CREATE POLICY "Super admin manage usuario_permissoes" ON public.usuario_permissoes
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- permissoes_divergencia_log: somente super admin le/escreve
DROP POLICY IF EXISTS "Super admin access permissoes_divergencia_log" ON public.permissoes_divergencia_log;
CREATE POLICY "Super admin access permissoes_divergencia_log" ON public.permissoes_divergencia_log
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- -----------------------------------------------------
-- 11. Funcao da flag
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.permissions_v2_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE((config->>'enabled')::boolean, false)
  FROM public.configuracoes
  WHERE grupo = 'permissions_v2' AND tipo = 'enabled'
  LIMIT 1;
$$;

-- -----------------------------------------------------
-- 12. Motor legado (fallback): papel + modulos + JGC
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.legacy_tem_permissao(_codigo text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_papel text;
  v_modulos jsonb;
  v_modulo_slug text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  -- JGC ja possui motor granular: delega
  IF _codigo LIKE 'jovem_guarda.%' THEN
    RETURN public.jgc_tem_permissao(_codigo);
  END IF;

  SELECT pu.papel::text
  INTO v_papel
  FROM public.perfis_usuarios pu
  WHERE pu.user_id = v_uid AND pu.ativo = true
  ORDER BY CASE pu.papel
    WHEN 'super_admin' THEN 1
    WHEN 'gestor' THEN 2
    WHEN 'admin_setor' THEN 3
    ELSE 4
  END
  LIMIT 1;

  IF v_papel IS NULL THEN
    RETURN public.has_legacy_admin(v_uid);
  END IF;
  IF v_papel = 'super_admin' THEN
    RETURN true;
  END IF;
  -- gestor/admin_setor: acesso amplo no proprio setor (modelo legado)
  IF v_papel IN ('gestor', 'admin_setor') THEN
    RETURN true;
  END IF;
  -- tecnico: precisa ter o modulo correspondente no app_metadata
  IF v_papel = 'tecnico' THEN
    SELECT sm.slug
    INTO v_modulo_slug
    FROM public.permissoes_sistema ps
    JOIN public.setor_modulos sm ON sm.id = ps.modulo_id
    WHERE ps.codigo = _codigo
    LIMIT 1;
    IF v_modulo_slug IS NULL THEN
      v_modulo_slug := split_part(_codigo, '.', 2);
    END IF;
    SELECT raw_app_meta_data -> 'modulos'
    INTO v_modulos
    FROM auth.users WHERE id = v_uid;
    RETURN COALESCE(v_modulos, '[]'::jsonb) ? v_modulo_slug
        OR COALESCE(v_modulos, '[]'::jsonb) ? _codigo;
  END IF;
  RETURN false;
END;
$$;

-- -----------------------------------------------------
-- 13. Motor novo: tem_permissao(codigo)
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.tem_permissao(_codigo text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_permissao RECORD;
  v_perfil RECORD;
  v_efeito text;
BEGIN
  -- 1. Super admin sempre passa
  IF public.is_super_admin() THEN
    RETURN true;
  END IF;

  -- Flag unica desligada: mantem comportamento atual (zero regressao)
  IF NOT public.permissions_v2_enabled() THEN
    RETURN public.legacy_tem_permissao(_codigo);
  END IF;

  -- Busca permissao no catalogo
  SELECT ps.id, ps.modulo_id, ps.codigo, ps.sensivel
  INTO v_permissao
  FROM public.permissoes_sistema ps
  WHERE ps.codigo = _codigo AND ps.ativo = true;

  -- Perfil ativo do usuario
  SELECT pu.*
  INTO v_perfil
  FROM public.perfis_usuarios pu
  WHERE pu.user_id = v_uid AND pu.ativo = true
  ORDER BY CASE pu.papel
    WHEN 'super_admin' THEN 1
    WHEN 'gestor' THEN 2
    WHEN 'admin_setor' THEN 3
    ELSE 4
  END
  LIMIT 1;

  IF v_perfil.id IS NULL THEN
    RETURN public.legacy_tem_permissao(_codigo);
  END IF;

  -- Usuario NAO migrado (sem perfil funcional): legado decide
  IF v_perfil.perfil_funcional_id IS NULL THEN
    RETURN public.legacy_tem_permissao(_codigo);
  END IF;

  -- Usuario migrado: usa o novo motor
  -- Codigo nao catalogado: nega (nada de concessao por suposicao)
  IF v_permissao.id IS NULL THEN
    RETURN false;
  END IF;

  -- 2. negacao individual
  SELECT up.efeito
  INTO v_efeito
  FROM public.usuario_permissoes up
  WHERE up.perfil_usuario_id = v_perfil.id AND up.permissao_id = v_permissao.id
  LIMIT 1;
  IF v_efeito = 'NEGAR' THEN
    RETURN false;
  END IF;
  -- 3. concessao individual
  IF v_efeito = 'PERMITIR' THEN
    RETURN true;
  END IF;
  -- 4. perfil funcional
  IF EXISTS (
    SELECT 1 FROM public.perfil_funcional_permissoes pfp
    WHERE pfp.perfil_funcional_id = v_perfil.perfil_funcional_id
      AND pfp.permissao_id = v_permissao.id
  ) THEN
    RETURN true;
  END IF;
  -- 5. compatibilidade legada (nao remove acesso que o usuario ja tinha)
  RETURN public.legacy_tem_permissao(_codigo);
END;
$$;

-- -----------------------------------------------------
-- 14. GRANTs
-- -----------------------------------------------------
GRANT SELECT ON public.setor_modulos TO authenticated;
GRANT SELECT ON public.permissoes_sistema TO authenticated;
GRANT SELECT ON public.perfis_funcionais TO authenticated;
GRANT SELECT ON public.perfil_funcional_permissoes TO authenticated;
GRANT SELECT ON public.usuario_permissoes TO authenticated;
GRANT SELECT ON public.permissoes_divergencia_log TO authenticated;

GRANT EXECUTE ON FUNCTION public.permissions_v2_enabled() TO authenticated;
GRANT EXECUTE ON FUNCTION public.legacy_tem_permissao(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tem_permissao(text) TO authenticated;
