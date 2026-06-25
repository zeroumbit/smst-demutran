-- =====================================================
-- Migration: Correção de compatibilidade de tipos RPC
-- Descrição: Converte explicitamente colunas VARCHAR para TEXT
--            na RPC listar_minhas_alteracoes para evitar
--            erro 400 em tempo de execução no Postgres.
-- =====================================================

CREATE OR REPLACE FUNCTION public.listar_minhas_alteracoes(
  _session_token uuid
)
RETURNS TABLE (
  id uuid,
  tipo text,
  dados_anteriores jsonb,
  dados_novos jsonb,
  status text,
  observacao_admin text,
  created_at timestamptz,
  analisado_em timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_concessionario_id uuid;
BEGIN
  SELECT concessionario_id
  INTO v_concessionario_id
  FROM public.demutran_concessionario_sessoes
  WHERE token = _session_token
    AND expires_at > now()
  LIMIT 1;

  IF v_concessionario_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    a.id, 
    a.tipo::text, 
    a.dados_anteriores, 
    a.dados_novos, 
    a.status::text, 
    a.observacao_admin, 
    a.created_at, 
    a.analisado_em
  FROM public.demutran_concessionario_alteracoes a
  WHERE a.concessionario_id = v_concessionario_id
  ORDER BY a.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.listar_minhas_alteracoes(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.listar_minhas_alteracoes(uuid) TO authenticated;
