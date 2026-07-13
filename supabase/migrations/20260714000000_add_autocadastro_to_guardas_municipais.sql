-- =====================================================
-- Migration: Add data_autocadastro column to guardas_municipais
-- 
-- Esta coluna é preenchida APENAS quando o guarda completa
-- o auto-cadastro via link (/guardas/cadastro). Permite
-- distinguir guardas que realmente criaram acesso daqueles
-- que foram apenas provisionados por backfill.
-- =====================================================

ALTER TABLE public.guardas_municipais
ADD COLUMN IF NOT EXISTS data_autocadastro timestamptz DEFAULT NULL;

-- Backfill: marcar guardas que já fizeram auto-cadastro
-- (O RPC criar_acesso_guarda sempre atualiza guardas_municipais.email
--  com o e-mail real do guarda, e updated_at com o momento do cadastro)
UPDATE public.guardas_municipais gm
SET data_autocadastro = gm.updated_at
WHERE gm.id IN (
  SELECT gu.guarda_id
  FROM public.guardas_usuarios gu
)
AND gm.email IS NOT NULL
AND gm.email NOT LIKE '%@smst.caninde.ce.gov.br'
AND gm.email NOT LIKE '%@guardamunicipal.sistema';

-- RPC pública para registrar o auto-cadastro (chamada pelo frontend)
CREATE OR REPLACE FUNCTION public.registrar_autocadastro_guarda(
  p_guarda_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.guardas_municipais
  SET data_autocadastro = now()
  WHERE id = p_guarda_id;

  RETURN jsonb_build_object('sucesso', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_autocadastro_guarda(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.registrar_autocadastro_guarda(uuid) TO authenticated;
