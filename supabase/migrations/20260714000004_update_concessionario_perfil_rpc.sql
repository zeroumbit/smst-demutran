CREATE OR REPLACE FUNCTION public.atualizar_perfil_concessionario_publico(
  _session_token uuid,
  _titular_nome text DEFAULT NULL,
  _cpf text DEFAULT NULL,
  _endereco text DEFAULT NULL,
  _cnh_numero text DEFAULT NULL,
  _validade_cnh date DEFAULT NULL,
  _atividade_remunerada text DEFAULT NULL,
  _categoria_cnh text DEFAULT NULL,
  _curso text DEFAULT NULL,
  _inicio_atividade date DEFAULT NULL,
  _motorista_auxiliar text DEFAULT NULL,
  _cnh_auxiliar text DEFAULT NULL,
  _validade_cnh_auxiliar date DEFAULT NULL,
  _observacoes text DEFAULT NULL,
  _email_notificacao text DEFAULT NULL,
  _telefone_notificacao text DEFAULT NULL,
  _aceita_notificacoes boolean DEFAULT true,
  _nova_senha text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_session public.demutran_concessionario_sessoes%ROWTYPE;
  v_row public.demutran_concessionarios%ROWTYPE;
BEGIN
  SELECT *
  INTO v_session
  FROM public.demutran_concessionario_sessoes
  WHERE token = _session_token
    AND expires_at > now()
  LIMIT 1;

  IF v_session.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Sessao invalida.');
  END IF;

  UPDATE public.demutran_concessionarios
  SET
    titular_nome = NULLIF(trim(coalesce(_titular_nome, '')), ''),
    cpf = NULLIF(regexp_replace(trim(coalesce(_cpf, '')), '\D', '', 'g'), ''),
    endereco = NULLIF(trim(coalesce(_endereco, '')), ''),
    cnh_numero = NULLIF(trim(coalesce(_cnh_numero, '')), ''),
    validade_cnh = _validade_cnh,
    atividade_remunerada = NULLIF(trim(coalesce(_atividade_remunerada, '')), ''),
    categoria_cnh = NULLIF(trim(coalesce(_categoria_cnh, '')), ''),
    curso = NULLIF(trim(coalesce(_curso, '')), ''),
    inicio_atividade = _inicio_atividade,
    motorista_auxiliar = NULLIF(trim(coalesce(_motorista_auxiliar, '')), ''),
    cnh_auxiliar = NULLIF(trim(coalesce(_cnh_auxiliar, '')), ''),
    validade_cnh_auxiliar = _validade_cnh_auxiliar,
    observacoes = NULLIF(trim(coalesce(_observacoes, '')), ''),
    email_notificacao = NULLIF(trim(coalesce(_email_notificacao, '')), ''),
    telefone_notificacao = NULLIF(trim(coalesce(_telefone_notificacao, '')), ''),
    aceita_notificacoes = coalesce(_aceita_notificacoes, true),
    updated_at = now()
  WHERE id = v_session.concessionario_id
  RETURNING * INTO v_row;

  IF coalesce(_nova_senha, '') <> '' THEN
    IF length(_nova_senha) < 6 THEN
      RETURN jsonb_build_object('error', 'A nova senha precisa ter pelo menos 6 caracteres.');
    END IF;

    UPDATE public.demutran_concessionario_acessos
    SET senha_hash = extensions.crypt(_nova_senha, extensions.gen_salt('bf')),
        updated_at = now()
    WHERE concessionario_id = v_row.id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;
