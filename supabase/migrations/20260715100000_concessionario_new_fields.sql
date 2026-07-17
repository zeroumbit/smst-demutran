-- New fields for concessionários: vehicle details + address split
ALTER TABLE public.demutran_concessionarios
  ADD COLUMN IF NOT EXISTS marca text,
  ADD COLUMN IF NOT EXISTS cor text,
  ADD COLUMN IF NOT EXISTS modelo text,
  ADD COLUMN IF NOT EXISTS ano_fabricacao text,
  ADD COLUMN IF NOT EXISTS ano_modelo text,
  ADD COLUMN IF NOT EXISTS chassi text,
  ADD COLUMN IF NOT EXISTS logradouro text,
  ADD COLUMN IF NOT EXISTS numero text,
  ADD COLUMN IF NOT EXISTS bairro_distrito text;

-- Migrate existing endereco data into logradouro if the column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'demutran_concessionarios' 
      AND column_name = 'endereco'
  ) THEN
    EXECUTE 'UPDATE public.demutran_concessionarios SET logradouro = endereco WHERE endereco IS NOT NULL AND logradouro IS NULL';
  END IF;
END $$;

-- Drop old endereco column
ALTER TABLE public.demutran_concessionarios
  DROP COLUMN IF EXISTS endereco;

-- Update RPC: obter_perfil_concessionario with new fields
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

GRANT EXECUTE ON FUNCTION public.obter_perfil_concessionario(text) TO authenticated;

-- Update RPC: atualizar_perfil_concessionario_publico with new fields
CREATE OR REPLACE FUNCTION public.atualizar_perfil_concessionario_publico(
  _session_token text,
  _titular_nome text DEFAULT NULL,
  _cpf text DEFAULT NULL,
  _logradouro text DEFAULT NULL,
  _numero text DEFAULT NULL,
  _bairro_distrito text DEFAULT NULL,
  _cnh_numero text DEFAULT NULL,
  _validade_cnh text DEFAULT NULL,
  _atividade_remunerada text DEFAULT NULL,
  _categoria_cnh text DEFAULT NULL,
  _curso text DEFAULT NULL,
  _inicio_atividade text DEFAULT NULL,
  _motorista_auxiliar text DEFAULT NULL,
  _cnh_auxiliar text DEFAULT NULL,
  _validade_cnh_auxiliar text DEFAULT NULL,
  _observacoes text DEFAULT NULL,
  _email_notificacao text DEFAULT NULL,
  _telefone_notificacao text DEFAULT NULL,
  _aceita_notificacoes boolean DEFAULT NULL,
  _nova_senha text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_concessionario_id uuid;
  v_cpf_limpo text;
BEGIN
  SELECT dc.id INTO v_concessionario_id
  FROM public.demutran_concessionario_sessoes sc
  JOIN public.demutran_concessionarios dc ON dc.id = sc.concessionario_id
  WHERE sc.token = _session_token::uuid
    AND sc.expires_at > now()
    AND dc.ativo = true
  LIMIT 1;

  IF v_concessionario_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Sessão inválida ou expirada.');
  END IF;

  UPDATE public.demutran_concessionarios
  SET
    titular_nome = COALESCE(NULLIF(trim(_titular_nome), ''), titular_nome),
    cpf = COALESCE(NULLIF(trim(_cpf), ''), cpf),
    logradouro = COALESCE(NULLIF(trim(_logradouro), ''), logradouro),
    numero = COALESCE(NULLIF(trim(_numero), ''), numero),
    bairro_distrito = COALESCE(NULLIF(trim(_bairro_distrito), ''), bairro_distrito),
    cnh_numero = COALESCE(NULLIF(trim(_cnh_numero), ''), cnh_numero),
    validade_cnh = COALESCE(NULLIF(trim(_validade_cnh), ''), validade_cnh),
    atividade_remunerada = COALESCE(NULLIF(trim(_atividade_remunerada), ''), atividade_remunerada),
    categoria_cnh = COALESCE(NULLIF(trim(_categoria_cnh), ''), categoria_cnh),
    curso = COALESCE(NULLIF(trim(_curso), ''), curso),
    inicio_atividade = COALESCE(NULLIF(trim(_inicio_atividade), ''), inicio_atividade),
    motorista_auxiliar = COALESCE(NULLIF(trim(_motorista_auxiliar), ''), motorista_auxiliar),
    cnh_auxiliar = COALESCE(NULLIF(trim(_cnh_auxiliar), ''), cnh_auxiliar),
    validade_cnh_auxiliar = COALESCE(NULLIF(trim(_validade_cnh_auxiliar), ''), validade_cnh_auxiliar),
    observacoes = COALESCE(NULLIF(trim(_observacoes), ''), observacoes),
    email_notificacao = COALESCE(NULLIF(trim(_email_notificacao), ''), email_notificacao),
    telefone_notificacao = COALESCE(NULLIF(trim(_telefone_notificacao), ''), telefone_notificacao),
    aceita_notificacoes = COALESCE(_aceita_notificacoes, aceita_notificacoes),
    updated_at = now()
  WHERE id = v_concessionario_id;

  IF _nova_senha IS NOT NULL AND length(_nova_senha) >= 6 THEN
    UPDATE public.demutran_concessionario_acessos
    SET
      senha_hash = extensions.crypt(_nova_senha, extensions.gen_salt('bf')),
      failed_attempts = 0,
      locked_until = NULL,
      updated_at = now()
    WHERE concessionario_id = v_concessionario_id;

    UPDATE auth.users u
    SET encrypted_password = extensions.crypt(_nova_senha, extensions.gen_salt('bf')),
        updated_at = now()
    FROM public.demutran_concessionario_usuarios dcu
    WHERE dcu.concessionario_id = v_concessionario_id
      AND dcu.usuario_id = u.id;
  END IF;

  RETURN jsonb_build_object('sucesso', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.atualizar_perfil_concessionario_publico(
  text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, boolean, text
) TO authenticated;
