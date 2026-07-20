-- Migra o login do portal do concessionario de CPF para e-mail.
-- O CPF continua sendo usado somente para localizar e validar o cadastro inicial.

DROP FUNCTION IF EXISTS public.autenticar_concessionario(text, text);

CREATE FUNCTION public.autenticar_concessionario(
  _email text,
  _senha text
)
RETURNS TABLE (
  session_token uuid,
  concessionario jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email text := lower(trim(coalesce(_email, '')));
  v_usuario_id uuid;
  v_access public.demutran_concessionario_acessos%ROWTYPE;
  v_concessionario public.demutran_concessionarios%ROWTYPE;
  v_session public.demutran_concessionario_sessoes%ROWTYPE;
  v_endereco text;
BEGIN
  IF v_email = ''
    OR char_length(v_email) > 255
    OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    OR coalesce(_senha, '') = '' THEN
    RETURN;
  END IF;

  SELECT u.id
  INTO v_usuario_id
  FROM auth.users u
  WHERE u.email = v_email
  LIMIT 1;

  IF v_usuario_id IS NULL THEN
    -- Mantem um custo de verificacao semelhante ao caminho de senha incorreta.
    PERFORM extensions.crypt(_senha, extensions.crypt('invalid-password', extensions.gen_salt('bf')));
    RETURN;
  END IF;

  SELECT a.*
  INTO v_access
  FROM public.demutran_concessionario_usuarios cu
  JOIN public.demutran_concessionario_acessos a
    ON a.concessionario_id = cu.concessionario_id
  WHERE cu.usuario_id = v_usuario_id
  ORDER BY cu.created_at ASC
  LIMIT 1;

  IF v_access.concessionario_id IS NULL THEN
    RETURN;
  END IF;

  IF v_access.locked_until IS NOT NULL AND v_access.locked_until > now() THEN
    RETURN;
  END IF;

  IF v_access.senha_hash IS NULL
    OR v_access.senha_hash <> extensions.crypt(_senha, v_access.senha_hash) THEN
    UPDATE public.demutran_concessionario_acessos
    SET
      failed_attempts = coalesce(v_access.failed_attempts, 0) + 1,
      locked_until = CASE
        WHEN coalesce(v_access.failed_attempts, 0) + 1 >= 5
          THEN now() + interval '15 minutes'
        ELSE NULL
      END,
      updated_at = now()
    WHERE concessionario_id = v_access.concessionario_id;
    RETURN;
  END IF;

  SELECT *
  INTO v_concessionario
  FROM public.demutran_concessionarios
  WHERE id = v_access.concessionario_id
    AND ativo = true;

  IF v_concessionario.id IS NULL THEN
    RETURN;
  END IF;

  v_endereco := concat_ws(
    ', ',
    nullif(trim(coalesce(v_concessionario.logradouro, '')), ''),
    nullif(trim(coalesce(v_concessionario.numero, '')), ''),
    nullif(trim(coalesce(v_concessionario.bairro_distrito, '')), '')
  );

  INSERT INTO public.demutran_concessionario_sessoes (concessionario_id)
  VALUES (v_concessionario.id)
  RETURNING * INTO v_session;

  UPDATE public.demutran_concessionario_acessos
  SET
    ultimo_login = now(),
    updated_at = now(),
    failed_attempts = 0,
    locked_until = NULL
  WHERE concessionario_id = v_concessionario.id;

  RETURN QUERY
  SELECT
    v_session.token,
    jsonb_build_object(
      'id', v_concessionario.id,
      'categoria', v_concessionario.categoria,
      'origem_planilha', v_concessionario.origem_planilha,
      'taxi_grupo', v_concessionario.taxi_grupo,
      'estacionamento', v_concessionario.estacionamento,
      'ponto_referencia', v_concessionario.ponto_referencia,
      'numero_vaga', v_concessionario.numero_vaga,
      'titular_nome', v_concessionario.titular_nome,
      'endereco', nullif(v_endereco, ''),
      'logradouro', v_concessionario.logradouro,
      'numero', v_concessionario.numero,
      'bairro_distrito', v_concessionario.bairro_distrito,
      'veiculo', v_concessionario.veiculo,
      'marca', v_concessionario.marca,
      'cor', v_concessionario.cor,
      'modelo', v_concessionario.modelo,
      'ano_fabricacao', v_concessionario.ano_fabricacao,
      'ano_modelo', v_concessionario.ano_modelo,
      'chassi', v_concessionario.chassi,
      'placa', v_concessionario.placa,
      'fabricacao', v_concessionario.fabricacao,
      'ultimo_alvara', v_concessionario.ultimo_alvara,
      'exercicio', v_concessionario.exercicio,
      'cpf', v_concessionario.cpf,
      'inicio_atividade', v_concessionario.inicio_atividade,
      'cnh_numero', v_concessionario.cnh_numero,
      'validade_cnh', v_concessionario.validade_cnh,
      'atividade_remunerada', v_concessionario.atividade_remunerada,
      'curso', v_concessionario.curso,
      'motorista_auxiliar', v_concessionario.motorista_auxiliar,
      'cnh_auxiliar', v_concessionario.cnh_auxiliar,
      'validade_cnh_auxiliar', v_concessionario.validade_cnh_auxiliar,
      'categoria_cnh', v_concessionario.categoria_cnh,
      'rota', v_concessionario.rota,
      'observacoes', v_concessionario.observacoes,
      'email_notificacao', v_concessionario.email_notificacao,
      'telefone_notificacao', v_concessionario.telefone_notificacao,
      'aceita_notificacoes', v_concessionario.aceita_notificacoes,
      'ativo', v_concessionario.ativo,
      'concessao_arquivo_url', v_concessionario.concessao_arquivo_url,
      'concessao_arquivo_nome', v_concessionario.concessao_arquivo_nome,
      'email', v_email,
      'data_autocadastro', v_concessionario.data_autocadastro,
      'created_at', v_concessionario.created_at,
      'updated_at', v_concessionario.updated_at
    );
END;
$$;

REVOKE ALL ON FUNCTION public.autenticar_concessionario(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.autenticar_concessionario(text, text) TO anon, authenticated;
