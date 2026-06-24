CREATE OR REPLACE FUNCTION public.consultar_status_credencial_demutran(
  _protocolo text,
  _cpf text
)
RETURNS TABLE (
  protocolo text,
  status public.demutran_solicitacao_status,
  tipo public.demutran_credencial_tipo,
  nome_completo text,
  created_at timestamptz,
  analisado_em timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    s.protocolo,
    s.status,
    s.tipo,
    s.nome_completo,
    s.created_at,
    s.analisado_em
  FROM public.demutran_credenciais_solicitacoes s
  WHERE upper(s.protocolo) = upper(trim(_protocolo))
    AND regexp_replace(s.cpf, '[^0-9]', '', 'g') = regexp_replace(trim(_cpf), '[^0-9]', '', 'g')
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.consultar_status_recurso_demutran(
  _protocolo text,
  _cpf text
)
RETURNS TABLE (
  protocolo text,
  status public.demutran_solicitacao_status,
  tipo public.demutran_recurso_tipo,
  auto_infracao text,
  placa text,
  created_at timestamptz,
  analisado_em timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    r.protocolo,
    r.status,
    r.tipo,
    r.auto_infracao,
    r.placa,
    r.created_at,
    r.analisado_em
  FROM public.demutran_recursos r
  WHERE upper(r.protocolo) = upper(trim(_protocolo))
    AND regexp_replace(r.cpf, '[^0-9]', '', 'g') = regexp_replace(trim(_cpf), '[^0-9]', '', 'g')
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.consultar_status_credencial_demutran(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.consultar_status_recurso_demutran(text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.consultar_status_credencial_demutran(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consultar_status_recurso_demutran(text, text) TO anon, authenticated;
