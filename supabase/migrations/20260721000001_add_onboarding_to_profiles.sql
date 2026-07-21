-- ============================================
-- Adiciona coluna onboarding_etapa para
-- controle do onboarding interativo
-- ============================================

ALTER TABLE public.guardas_municipais
ADD COLUMN IF NOT EXISTS onboarding_etapa smallint DEFAULT NULL;

ALTER TABLE public.perfis_usuarios
ADD COLUMN IF NOT EXISTS onboarding_etapa smallint DEFAULT NULL;

ALTER TABLE public.demutran_concessionarios
ADD COLUMN IF NOT EXISTS onboarding_etapa smallint DEFAULT NULL;

-- ============================================
-- RPC: obter a etapa de onboarding do usuário logado
-- Retorna { tipo, etapa } ou null
-- ============================================
CREATE OR REPLACE FUNCTION public.get_minha_onboarding_etapa()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_etapa int;
  v_tipo text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- 1. perfis_usuarios (admin / gestor / tecnico)
  SELECT pu.onboarding_etapa, 'admin'::text
  INTO v_etapa, v_tipo
  FROM public.perfis_usuarios pu
  WHERE pu.user_id = v_user_id
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object('tipo', v_tipo, 'etapa', v_etapa);
  END IF;

  -- 2. guardas_municipais (guarda comum)
  SELECT gm.onboarding_etapa, 'guarda'::text
  INTO v_etapa, v_tipo
  FROM public.guardas_municipais gm
  JOIN public.guardas_usuarios gu ON gu.guarda_id = gm.id
  WHERE gu.usuario_id = v_user_id
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object('tipo', v_tipo, 'etapa', v_etapa);
  END IF;

  -- 3. demutran_concessionarios (concessionario / usuario externo)
  SELECT dc.onboarding_etapa, 'concessionario'::text
  INTO v_etapa, v_tipo
  FROM public.demutran_concessionarios dc
  JOIN public.demutran_concessionarios_usuarios dcu ON dcu.concessionario_id = dc.id
  WHERE dcu.usuario_id = v_user_id
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object('tipo', v_tipo, 'etapa', v_etapa);
  END IF;

  RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_minha_onboarding_etapa() TO authenticated;

-- ============================================
-- RPC: atualizar a etapa de onboarding do usuário logado
-- ============================================
CREATE OR REPLACE FUNCTION public.set_minha_onboarding_etapa(p_etapa int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  -- 1. perfis_usuarios
  UPDATE public.perfis_usuarios
  SET onboarding_etapa = p_etapa
  WHERE user_id = v_user_id;

  IF FOUND THEN RETURN; END IF;

  -- 2. guardas_municipais
  UPDATE public.guardas_municipais gm
  SET onboarding_etapa = p_etapa
  FROM public.guardas_usuarios gu
  WHERE gu.guarda_id = gm.id
    AND gu.usuario_id = v_user_id;

  IF FOUND THEN RETURN; END IF;

  -- 3. demutran_concessionarios
  UPDATE public.demutran_concessionarios dc
  SET onboarding_etapa = p_etapa
  FROM public.demutran_concessionarios_usuarios dcu
  WHERE dcu.concessionario_id = dc.id
    AND dcu.usuario_id = v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_minha_onboarding_etapa(int) TO authenticated;
