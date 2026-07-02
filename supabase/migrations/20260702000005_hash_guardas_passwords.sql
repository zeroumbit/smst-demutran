-- =====================================================
-- MIGRATION: Hash Guardas Passwords and secure database
-- =====================================================

-- 1. Add senha_provisoria column if it does not exist
ALTER TABLE public.guardas_municipais ADD COLUMN IF NOT EXISTS senha_provisoria text;

-- 2. Create the hash trigger function
CREATE OR REPLACE FUNCTION public.trigger_hash_guarda_senha()
RETURNS trigger AS $$
BEGIN
  -- If password is not null and does not start with bcrypt signature ($2a$ or $2b$)
  IF NEW.senha IS NOT NULL AND NEW.senha <> '' AND NEW.senha NOT LIKE '$2a$%' AND NEW.senha NOT LIKE '$2b$%' THEN
    -- If it's first access, save plaintext to senha_provisoria
    IF NEW.primeira_vez_acesso = true THEN
      NEW.senha_provisoria := NEW.senha;
    ELSE
      NEW.senha_provisoria := NULL;
    END IF;
    -- Hash the password using pgcrypto's bf (blowfish/bcrypt)
    NEW.senha := extensions.crypt(NEW.senha, extensions.gen_salt('bf'));
  END IF;

  -- If primeira_vez_acesso is false, clear the provisoria password
  IF NEW.primeira_vez_acesso = false THEN
    NEW.senha_provisoria := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Bind trigger to guardas_municipais table
DROP TRIGGER IF EXISTS trigger_hash_guarda_senha ON public.guardas_municipais;
CREATE TRIGGER trigger_hash_guarda_senha
  BEFORE INSERT OR UPDATE ON public.guardas_municipais
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_hash_guarda_senha();

-- 4. Hash existing plain text passwords in the database
UPDATE public.guardas_municipais
SET senha = senha -- This triggers the BEFORE UPDATE trigger to hash plain text passwords
WHERE senha IS NOT NULL AND senha <> '' AND senha NOT LIKE '$2a$%' AND senha NOT LIKE '$2b$%';

-- 5. Update authenticating function to use crypt
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
  WHERE cpf = p_cpf AND senha = extensions.crypt(p_senha, senha) AND ativo = true;

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

-- 6. Update change password function to verify using crypt
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
    WHERE id = p_guarda_id AND senha = extensions.crypt(p_senha_atual, senha)
  ) INTO v_valida;

  IF NOT v_valida THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Senha atual incorreta');
  END IF;

  IF length(p_nova_senha) < 1 OR length(p_nova_senha) > 10 THEN
    -- Note: 10 chars is quite short, but keeping consistency with existing constraint
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'A senha deve ter entre 1 e 10 caracteres');
  END IF;

  UPDATE public.guardas_municipais
  SET senha = p_nova_senha, -- The trigger will automatically hash it
      primeira_vez_acesso = false,
      data_criacao_senha = NOW()
  WHERE id = p_guarda_id;

  RETURN jsonb_build_object('sucesso', true, 'mensagem', 'Senha alterada com sucesso');
END;
$$;
