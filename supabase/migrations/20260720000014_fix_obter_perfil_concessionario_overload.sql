-- Remove a assinatura antiga que causa ambiguidade no PostgREST quando o token parece uuid.
DROP FUNCTION IF EXISTS public.obter_perfil_concessionario(uuid);

CREATE OR REPLACE FUNCTION public.obter_perfil_concessionario(_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_concessionario public.demutran_concessionarios%ROWTYPE;
  v_session_token uuid;
BEGIN
  BEGIN
    v_session_token := _session_token::uuid;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RETURN NULL;
  END;

  SELECT dc.*
  INTO v_concessionario
  FROM public.demutran_concessionario_sessoes sc
  JOIN public.demutran_concessionarios dc ON dc.id = sc.concessionario_id
  WHERE sc.token = v_session_token
    AND sc.expires_at > now()
    AND dc.ativo = true
  LIMIT 1;

  IF v_concessionario.id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.demutran_concessionario_sessoes
  SET last_seen_at = now()
  WHERE token = v_session_token;

  RETURN jsonb_build_object(
    'id', v_concessionario.id,
    'categoria', v_concessionario.categoria,
    'origem_planilha', v_concessionario.origem_planilha,
    'taxi_grupo', v_concessionario.taxi_grupo,
    'estacionamento', v_concessionario.estacionamento,
    'ponto_referencia', v_concessionario.ponto_referencia,
    'numero_vaga', v_concessionario.numero_vaga,
    'titular_nome', v_concessionario.titular_nome,
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
    'email', v_concessionario.email,
    'data_autocadastro', v_concessionario.data_autocadastro,
    'created_at', v_concessionario.created_at,
    'updated_at', v_concessionario.updated_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.obter_perfil_concessionario(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.obter_perfil_concessionario(text) TO anon, authenticated;
