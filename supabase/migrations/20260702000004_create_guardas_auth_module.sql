-- ============================================
-- MÓDULO DE AUTENTICAÇÃO DE GUARDAS MUNICIPAIS
-- Senhas temporárias e área personalizada
-- ============================================

-- 1. Adicionar colunas necessárias à tabela guardas_municipais
ALTER TABLE public.guardas_municipais ADD COLUMN IF NOT EXISTS senha text;
ALTER TABLE public.guardas_municipais ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.guardas_municipais ADD COLUMN IF NOT EXISTS telefone text;
ALTER TABLE public.guardas_municipais ADD COLUMN IF NOT EXISTS primeira_vez_acesso boolean NOT NULL DEFAULT true;
ALTER TABLE public.guardas_municipais ADD COLUMN IF NOT EXISTS data_criacao_senha timestamptz;
ALTER TABLE public.guardas_municipais ADD COLUMN IF NOT EXISTS data_ultimo_acesso timestamptz;

-- Índices para busca por senha e email
CREATE INDEX IF NOT EXISTS idx_guardas_municipais_senha ON public.guardas_municipais (senha);
CREATE INDEX IF NOT EXISTS idx_guardas_municipais_email ON public.guardas_municipais (email);

-- 2. Tabela de relacionamento guardas ↔ auth.users
CREATE TABLE IF NOT EXISTS public.guardas_usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guarda_id uuid NOT NULL REFERENCES public.guardas_municipais(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(guarda_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_guardas_usuarios_guarda ON public.guardas_usuarios (guarda_id);
CREATE INDEX IF NOT EXISTS idx_guardas_usuarios_usuario ON public.guardas_usuarios (usuario_id);

ALTER TABLE public.guardas_usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage guardas_usuarios" ON public.guardas_usuarios;
CREATE POLICY "Super admins can manage guardas_usuarios"
ON public.guardas_usuarios
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Guardas can view own vinculacao" ON public.guardas_usuarios;
CREATE POLICY "Guardas can view own vinculacao"
ON public.guardas_usuarios
FOR SELECT
TO authenticated
USING (usuario_id = auth.uid());

-- 3. Função: Gerar senha aleatória
CREATE OR REPLACE FUNCTION public.gerar_senha_guarda() RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_senha text;
  v_caracteres text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
  v_len integer := 10;
  i integer;
BEGIN
  v_senha := '';
  FOR i IN 1..v_len LOOP
    v_senha := v_senha || substr(v_caracteres, floor(random() * length(v_caracteres) + 1)::integer, 1);
  END LOOP;
  RETURN v_senha;
END;
$$;

-- 4. Função: Gerar senha única (sem conflitos)
CREATE OR REPLACE FUNCTION public.gerar_senha_unica_guarda() RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_senha text;
  v_existe boolean;
  v_tentativas integer := 0;
BEGIN
  LOOP
    v_tentativas := v_tentativas + 1;
    v_senha := public.gerar_senha_guarda();
    SELECT EXISTS (SELECT 1 FROM public.guardas_municipais WHERE senha = v_senha) INTO v_existe;
    IF NOT v_existe OR v_tentativas > 10 THEN
      EXIT;
    END IF;
  END LOOP;
  RETURN v_senha;
END;
$$;

-- 5. Função: Autenticar guarda (valida CPF + senha)
CREATE OR REPLACE FUNCTION public.autenticar_guarda(
  p_cpf text,
  p_senha text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_guarda public.guardas_municipais%ROWTYPE;
  v_usuario_id uuid;
BEGIN
  SELECT * INTO v_guarda
  FROM public.guardas_municipais
  WHERE cpf = p_cpf AND senha = p_senha AND ativo = true;

  IF v_guarda.id IS NULL THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'mensagem', 'CPF ou senha inválidos'
    );
  END IF;

  SELECT usuario_id INTO v_usuario_id
  FROM public.guardas_usuarios
  WHERE guarda_id = v_guarda.id
  LIMIT 1;

  UPDATE public.guardas_municipais
  SET data_ultimo_acesso = NOW()
  WHERE id = v_guarda.id;

  RETURN jsonb_build_object(
    'sucesso', true,
    'primeiro_acesso', v_guarda.primeira_vez_acesso,
    'guarda_id', v_guarda.id,
    'matricula', v_guarda.matricula,
    'nome', v_guarda.nome,
    'cpf', v_guarda.cpf,
    'graduacao_id', v_guarda.graduacao_id,
    'usuario_id', v_usuario_id,
    'email_auth', CASE WHEN v_usuario_id IS NOT NULL THEN 'gcm.' || v_guarda.matricula || '@guardamunicipal.sistema' ELSE NULL END
  );
END;
$$;

-- 6. Função: Buscar guarda por usuário auth
CREATE OR REPLACE FUNCTION public.buscar_guarda_por_usuario(
  p_usuario_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_guarda record;
BEGIN
  SELECT gm.id, gm.matricula, gm.nome, gm.cpf, gm.graduacao_id,
         gm.email, gm.telefone, gm.primeira_vez_acesso,
         gm.data_criacao_senha, gm.data_ultimo_acesso,
         ggn.nome as graduacao_nome
  INTO v_guarda
  FROM public.guardas_municipais gm
  JOIN public.guardas_usuarios gu ON gu.guarda_id = gm.id
  LEFT JOIN public.guarda_municipal_graduacoes ggn ON ggn.id = gm.graduacao_id
  WHERE gu.usuario_id = p_usuario_id;

  IF v_guarda.id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_guarda.id,
    'matricula', v_guarda.matricula,
    'nome', v_guarda.nome,
    'cpf', v_guarda.cpf,
    'graduacao_id', v_guarda.graduacao_id,
    'graduacao_nome', v_guarda.graduacao_nome,
    'email', v_guarda.email,
    'telefone', v_guarda.telefone,
    'primeira_vez_acesso', v_guarda.primeira_vez_acesso,
    'data_criacao_senha', v_guarda.data_criacao_senha,
    'data_ultimo_acesso', v_guarda.data_ultimo_acesso
  );
END;
$$;

-- 7. Função: Alterar senha do próprio guarda
CREATE OR REPLACE FUNCTION public.alterar_senha_guarda(
  p_guarda_id uuid,
  p_senha_atual text,
  p_nova_senha text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_valida boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.guardas_municipais
    WHERE id = p_guarda_id AND senha = p_senha_atual
  ) INTO v_valida;

  IF NOT v_valida THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Senha atual incorreta');
  END IF;

  IF length(p_nova_senha) < 1 OR length(p_nova_senha) > 10 THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'A senha deve ter entre 1 e 10 caracteres');
  END IF;

  UPDATE public.guardas_municipais
  SET senha = p_nova_senha,
      primeira_vez_acesso = false,
      data_criacao_senha = NOW()
  WHERE id = p_guarda_id;

  RETURN jsonb_build_object('sucesso', true, 'mensagem', 'Senha alterada com sucesso');
END;
$$;

-- 8. Função: Verificar se um usuário auth é um guarda
CREATE OR REPLACE FUNCTION public.is_guarda() RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.guardas_usuarios
    WHERE usuario_id = auth.uid()
  );
$$;

-- 9. Gerar senhas para todos os guardas que ainda não têm
UPDATE public.guardas_municipais
SET senha = public.gerar_senha_unica_guarda(),
    data_criacao_senha = NOW(),
    primeira_vez_acesso = true
WHERE senha IS NULL OR senha = '';

-- 10. Conceder permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guardas_usuarios TO authenticated;
GRANT EXECUTE ON FUNCTION public.gerar_senha_guarda() TO authenticated;
GRANT EXECUTE ON FUNCTION public.gerar_senha_unica_guarda() TO authenticated;
GRANT EXECUTE ON FUNCTION public.autenticar_guarda(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.buscar_guarda_por_usuario(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.alterar_senha_guarda(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_guarda() TO authenticated;
