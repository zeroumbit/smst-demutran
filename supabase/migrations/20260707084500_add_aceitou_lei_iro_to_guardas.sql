-- Alterar a tabela guardas_municipais para adicionar a coluna aceitou_lei_iro_at
ALTER TABLE public.guardas_municipais
ADD COLUMN IF NOT EXISTS aceitou_lei_iro_at timestamptz DEFAULT null;

-- Atualizar a função buscar_guarda_por_usuario para retornar o campo aceitou_lei_iro_at
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
         gm.email, gm.telefone, gm.aceitou_lei_iro_at,
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
    'aceitou_lei_iro_at', v_guarda.aceitou_lei_iro_at
  );
END;
$$;

-- Criar a função aceitar_lei_iro para registrar o aceite do guarda
CREATE OR REPLACE FUNCTION public.aceitar_lei_iro(
  p_usuario_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_guarda_id uuid;
BEGIN
  SELECT guarda_id INTO v_guarda_id
  FROM public.guardas_usuarios
  WHERE usuario_id = p_usuario_id;

  IF v_guarda_id IS NULL THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Guarda não vinculado a este usuário.');
  END IF;

  UPDATE public.guardas_municipais
  SET aceitou_lei_iro_at = now()
  WHERE id = v_guarda_id;

  RETURN jsonb_build_object('sucesso', true, 'mensagem', 'Termo aceito com sucesso.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.aceitar_lei_iro(uuid) TO authenticated;
