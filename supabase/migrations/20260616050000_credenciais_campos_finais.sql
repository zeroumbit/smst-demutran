-- Unifica todas as alteracoes de campos das solicitacoes de credenciais
-- logradouro, numero, bairro, complemento + rg

ALTER TABLE public.demutran_credenciais_solicitacoes
  ADD COLUMN IF NOT EXISTS logradouro text,
  ADD COLUMN IF NOT EXISTS numero text,
  ADD COLUMN IF NOT EXISTS bairro text,
  ADD COLUMN IF NOT EXISTS complemento text,
  ADD COLUMN IF NOT EXISTS rg text;

UPDATE public.demutran_credenciais_solicitacoes
SET logradouro = CASE WHEN endereco IS NOT NULL AND endereco <> '' THEN endereco ELSE NULL END
WHERE logradouro IS NULL;

ALTER TABLE public.demutran_credenciais_solicitacoes
  ALTER COLUMN endereco DROP NOT NULL;

DROP FUNCTION IF EXISTS public.criar_solicitacao_credencial(
  public.demutran_credencial_tipo,
  text, text, text, text, text, text, text, text, text
);

CREATE OR REPLACE FUNCTION public.criar_solicitacao_credencial(
  _tipo public.demutran_credencial_tipo,
  _nome_completo text,
  _cpf text,
  _rg text DEFAULT NULL,
  _email text DEFAULT NULL,
  _telefone text DEFAULT NULL,
  _logradouro text DEFAULT NULL,
  _numero text DEFAULT NULL,
  _bairro text DEFAULT NULL,
  _complemento text DEFAULT NULL,
  _observacao text DEFAULT NULL,
  _documento_identidade_url text DEFAULT NULL,
  _comprovante_residencia_url text DEFAULT NULL,
  _laudo_medico_url text DEFAULT NULL
)
RETURNS TABLE (id uuid, protocolo text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.demutran_credenciais_solicitacoes%ROWTYPE;
BEGIN
  INSERT INTO public.demutran_credenciais_solicitacoes (
    setor_id, tipo, nome_completo, cpf, rg, email, telefone,
    logradouro, numero, bairro, complemento, observacao,
    documento_identidade_url, comprovante_residencia_url, laudo_medico_url
  )
  VALUES (
    public.get_demutran_setor_id(),
    _tipo,
    trim(_nome_completo),
    trim(_cpf),
    NULLIF(trim(_rg), ''),
    NULLIF(trim(_email), ''),
    NULLIF(trim(_telefone), ''),
    trim(_logradouro),
    trim(_numero),
    trim(_bairro),
    NULLIF(trim(_complemento), ''),
    NULLIF(trim(_observacao), ''),
    NULLIF(trim(_documento_identidade_url), ''),
    NULLIF(trim(_comprovante_residencia_url), ''),
    NULLIF(trim(_laudo_medico_url), '')
  )
  RETURNING * INTO v_row;

  RETURN QUERY SELECT v_row.id, v_row.protocolo;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.criar_solicitacao_credencial(
  public.demutran_credencial_tipo,
  text, text, text, text, text, text, text, text, text, text, text, text, text
) FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.criar_solicitacao_credencial(
  public.demutran_credencial_tipo,
  text, text, text, text, text, text, text, text, text, text, text, text, text
) TO anon, authenticated;
