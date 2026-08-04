-- RPC para o usuário alterar o próprio nome de perfil (nome/sobrenome)
-- Atualiza perfis_usuarios (quando houver) e os metadados de auth.users
-- para manter o nome consistente em toda a aplicação.

CREATE OR REPLACE FUNCTION public.atualizar_nome_perfil(
  p_nome text,
  p_sobrenome text DEFAULT ''
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_perfil_id uuid;
  v_nome_completo text;
BEGIN
  IF p_nome IS NULL OR trim(p_nome) = '' THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Informe um nome válido.');
  END IF;

  SELECT pu.id INTO v_perfil_id
  FROM public.perfis_usuarios pu
  WHERE pu.user_id = auth.uid()
  ORDER BY CASE pu.papel
    WHEN 'super_admin' THEN 1
    WHEN 'gestor' THEN 2
    WHEN 'admin_setor' THEN 3
    ELSE 4
  END
  LIMIT 1;

  IF v_perfil_id IS NOT NULL THEN
    UPDATE public.perfis_usuarios
    SET nome = trim(p_nome),
        sobrenome = trim(COALESCE(p_sobrenome, ''))
    WHERE id = v_perfil_id;
  END IF;

  v_nome_completo := trim(p_nome || ' ' || COALESCE(p_sobrenome, ''));

  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{name}',
    to_jsonb(v_nome_completo)
  )
  WHERE id = auth.uid();

  RETURN jsonb_build_object('sucesso', true, 'mensagem', 'Nome atualizado com sucesso.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.atualizar_nome_perfil(text, text) TO authenticated;
