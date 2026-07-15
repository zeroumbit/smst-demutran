-- Fix obter_perfil_concessionario: was broken in 20260625160000 migration
-- using wrong table name (sessoes_concessionario) and wrong column names
-- (session_token, expira_em). Correct table is demutran_concessionario_sessoes,
-- columns are token (uuid) and expires_at.

CREATE OR REPLACE FUNCTION public.obter_perfil_concessionario(_session_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_concessionario public.demutran_concessionarios;
BEGIN
  SELECT dc.* INTO v_concessionario
  FROM public.demutran_concessionario_sessoes sc
  JOIN public.demutran_concessionarios dc ON dc.id = sc.concessionario_id
  WHERE sc.token = _session_token::uuid
    AND sc.expires_at > now()
    AND dc.ativo = true
  LIMIT 1;

  IF v_concessionario.id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_concessionario.id,
    'categoria', v_concessionario.categoria,
    'origem_planilha', v_concessionario.origem_planilha,
    'taxi_grupo', v_concessionario.taxi_grupo,
    'estacionamento', v_concessionario.estacionamento,
    'ponto_referencia', v_concessionario.ponto_referencia,
    'numero_vaga', v_concessionario.numero_vaga,
    'titular_nome', v_concessionario.titular_nome,
    'endereco', v_concessionario.endereco,
    'veiculo', v_concessionario.veiculo,
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
    'created_at', v_concessionario.created_at,
    'updated_at', v_concessionario.updated_at
  );
END;
$$;
