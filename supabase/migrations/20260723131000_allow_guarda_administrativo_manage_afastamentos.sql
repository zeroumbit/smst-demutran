-- Permite ao papel técnico, exibido no sistema como Administrativo,
-- gerenciar afastamentos quando vinculado à Guarda e ao módulo guardas.
-- Migration separada para também corrigir ambientes onde a criação dos
-- afastamentos já tenha sido aplicada.

CREATE OR REPLACE FUNCTION public.can_manage_guarda_afastamentos()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.perfis_usuarios pu
      WHERE pu.user_id = auth.uid()
        AND pu.ativo = true
        AND pu.setor_id = public.get_guarda_municipal_setor_id()
        AND (
          pu.papel IN (
            'gestor'::public.papel_usuario,
            'admin_setor'::public.papel_usuario
          )
          OR (
            pu.papel = 'tecnico'::public.papel_usuario
            AND coalesce(auth.jwt()->'app_metadata'->'modulos', '[]'::jsonb)
                ? 'guardas'
          )
        )
    );
$$;

REVOKE ALL ON FUNCTION public.can_manage_guarda_afastamentos()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_guarda_afastamentos()
  TO authenticated;

DROP POLICY IF EXISTS "Administracao da Guarda pode ver afastamentos"
  ON public.guarda_afastamentos;
CREATE POLICY "Administracao da Guarda pode ver afastamentos"
  ON public.guarda_afastamentos
  FOR SELECT
  TO authenticated
  USING (
    public.can_manage_guarda_afastamentos()
    OR EXISTS (
      SELECT 1
      FROM public.guardas_usuarios gu
      WHERE gu.guarda_id = guarda_afastamentos.guarda_id
        AND gu.usuario_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.criar_guarda_afastamento(
  p_guarda_id uuid,
  p_tipo text,
  p_data_inicio date,
  p_data_fim date,
  p_observacao text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.can_manage_guarda_afastamentos() THEN
    RAISE EXCEPTION 'Apenas o gestor ou administrativo da Guarda pode registrar afastamentos.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.guardas_municipais WHERE id = p_guarda_id
  ) THEN
    RAISE EXCEPTION 'Guarda municipal não encontrado.';
  END IF;

  IF p_tipo NOT IN ('ferias', 'licenca_premio', 'outro') THEN
    RAISE EXCEPTION 'Tipo de afastamento inválido.';
  END IF;

  IF p_data_inicio IS NULL OR p_data_fim IS NULL OR p_data_fim < p_data_inicio THEN
    RAISE EXCEPTION 'O período do afastamento é inválido.';
  END IF;

  IF p_tipo = 'outro' AND length(btrim(coalesce(p_observacao, ''))) < 3 THEN
    RAISE EXCEPTION 'Descreva o outro tipo de afastamento.';
  END IF;

  PERFORM 1
  FROM public.guardas_municipais
  WHERE id = p_guarda_id
  FOR UPDATE;

  IF EXISTS (
    SELECT 1
    FROM public.guarda_afastamentos ga
    WHERE ga.guarda_id = p_guarda_id
      AND ga.cancelado_em IS NULL
      AND daterange(ga.data_inicio, ga.data_fim, '[]')
          && daterange(p_data_inicio, p_data_fim, '[]')
  ) THEN
    RAISE EXCEPTION 'Já existe um afastamento ativo que coincide com esse período.';
  END IF;

  INSERT INTO public.guarda_afastamentos (
    guarda_id, tipo, data_inicio, data_fim, observacao, criado_por
  )
  VALUES (
    p_guarda_id,
    p_tipo,
    p_data_inicio,
    p_data_fim,
    nullif(btrim(coalesce(p_observacao, '')), ''),
    auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancelar_guarda_afastamento(
  p_afastamento_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.can_manage_guarda_afastamentos() THEN
    RAISE EXCEPTION 'Apenas o gestor ou administrativo da Guarda pode cancelar afastamentos.';
  END IF;

  UPDATE public.guarda_afastamentos
  SET cancelado_em = now(),
      cancelado_por = auth.uid()
  WHERE id = p_afastamento_id
    AND cancelado_em IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Afastamento não encontrado ou já cancelado.';
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.criar_guarda_afastamento(uuid, text, date, date, text)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancelar_guarda_afastamento(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.criar_guarda_afastamento(uuid, text, date, date, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancelar_guarda_afastamento(uuid)
  TO authenticated;
