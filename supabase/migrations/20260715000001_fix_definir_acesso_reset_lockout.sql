-- Fix definir_acesso_concessionario: reset failed_attempts and locked_until
-- when admin resets the password, so locked-out concessionários can log in again.

CREATE OR REPLACE FUNCTION public.definir_acesso_concessionario(
  _concessionario_id uuid,
  _senha text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.demutran_concessionarios%ROWTYPE;
  v_cpf text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'Nao autenticado.');
  END IF;

  SELECT *
  INTO v_row
  FROM public.demutran_concessionarios
  WHERE id = _concessionario_id;

  IF v_row.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Concessionario nao encontrado.');
  END IF;

  IF NOT public.can_manage_demutran_content(v_row.setor_id) THEN
    RETURN jsonb_build_object('error', 'Sem permissao para este cadastro.');
  END IF;

  v_cpf := regexp_replace(coalesce(v_row.cpf, ''), '\D', '', 'g');
  IF char_length(v_cpf) <> 11 THEN
    RETURN jsonb_build_object('error', 'O concessionario precisa ter CPF valido para receber acesso.');
  END IF;

  IF length(coalesce(_senha, '')) < 6 THEN
    RETURN jsonb_build_object('error', 'A senha precisa ter pelo menos 6 caracteres.');
  END IF;

  INSERT INTO public.demutran_concessionario_acessos (
    concessionario_id,
    cpf_normalizado,
    senha_hash
  )
  VALUES (
    _concessionario_id,
    v_cpf,
    extensions.crypt(_senha, extensions.gen_salt('bf'))
  )
  ON CONFLICT (concessionario_id)
  DO UPDATE SET
    cpf_normalizado = EXCLUDED.cpf_normalizado,
    senha_hash = EXCLUDED.senha_hash,
    failed_attempts = 0,
    locked_until = NULL,
    updated_at = now();

  INSERT INTO public.auditoria_logs (user_id, setor_id, entidade, entidade_id, acao, payload_resumido)
  VALUES (
    auth.uid(),
    v_row.setor_id,
    'demutran_concessionario_acessos',
    _concessionario_id,
    'definir_acesso_concessionario',
    jsonb_build_object('cpf', v_cpf)
  );

  RETURN jsonb_build_object('success', true);
END;
$$;
