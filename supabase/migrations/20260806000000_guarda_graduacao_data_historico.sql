-- Data efetiva da graduacao (a partir de quando as novas regras valem) e
-- historico de promocoes para precificar corretamente as horas IRO por operacao.

-- 1. Coluna data_graduacao em guardas_municipais
ALTER TABLE public.guardas_municipais
  ADD COLUMN IF NOT EXISTS data_graduacao date;

UPDATE public.guardas_municipais
SET data_graduacao = COALESCE(data_graduacao, created_at::date)
WHERE data_graduacao IS NULL;

-- 2. Tabela de historico de graduacoes
CREATE TABLE IF NOT EXISTS public.guarda_graduacao_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guarda_id uuid NOT NULL REFERENCES public.guardas_municipais(id) ON DELETE CASCADE,
  graduacao_anterior_id uuid REFERENCES public.guarda_municipal_graduacoes(id) ON DELETE SET NULL,
  graduacao_id uuid NOT NULL REFERENCES public.guarda_municipal_graduacoes(id) ON DELETE RESTRICT,
  data_a_partir date NOT NULL,
  alterado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guarda_graduacao_historico_diferente_check
    CHECK (graduacao_anterior_id IS NULL OR graduacao_anterior_id <> graduacao_id)
);

CREATE INDEX IF NOT EXISTS guarda_graduacao_historico_guarda_data_idx
  ON public.guarda_graduacao_historico (guarda_id, data_a_partir);

-- 3. Funcao auxiliar de permissao (mesmo criterio usado em guardas_municipais)
CREATE OR REPLACE FUNCTION public.pode_gerenciar_guardas()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    public.is_super_admin()
    OR public.is_admin_of_setor(public.get_guarda_municipal_setor_id())
    OR EXISTS (
      SELECT 1 FROM public.perfis_usuarios pu
      WHERE pu.user_id = auth.uid()
        AND pu.ativo = true
        AND pu.papel = 'tecnico'::public.papel_usuario
        AND pu.setor_id = public.get_guarda_municipal_setor_id()
    );
$$;

REVOKE ALL ON FUNCTION public.pode_gerenciar_guardas() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_gerenciar_guardas() TO authenticated;

-- 4. RLS do historico
ALTER TABLE public.guarda_graduacao_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Historico de graduacao - leitura" ON public.guarda_graduacao_historico;
CREATE POLICY "Historico de graduacao - leitura"
ON public.guarda_graduacao_historico
FOR SELECT
TO authenticated
USING (
  public.pode_gerenciar_guardas()
  OR EXISTS (
    SELECT 1 FROM public.guardas_usuarios gu
    WHERE gu.guarda_id = guarda_graduacao_historico.guarda_id
      AND gu.usuario_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Historico de graduacao - insercao" ON public.guarda_graduacao_historico;
CREATE POLICY "Historico de graduacao - insercao"
ON public.guarda_graduacao_historico
FOR INSERT
TO authenticated
WITH CHECK (public.pode_gerenciar_guardas());

DROP POLICY IF EXISTS "Historico de graduacao - super admin" ON public.guarda_graduacao_historico;
CREATE POLICY "Historico de graduacao - super admin"
ON public.guarda_graduacao_historico
FOR UPDATE
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Historico de graduacao - exclusao super admin" ON public.guarda_graduacao_historico;
CREATE POLICY "Historico de graduacao - exclusao super admin"
ON public.guarda_graduacao_historico
FOR DELETE
TO authenticated
USING (public.is_super_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.guarda_graduacao_historico TO authenticated;

-- 5. RPC: alterar graduacao de um guarda (atomico: guarda + historico)
CREATE OR REPLACE FUNCTION public.alterar_graduacao_guarda(
  p_guarda_id uuid,
  p_graduacao_anterior_id uuid,
  p_graduacao_id uuid,
  p_data_a_partir date
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.pode_gerenciar_guardas() THEN
    RAISE EXCEPTION 'Apenas super admin, gestor ou administrativo da Guarda pode alterar graduação.';
  END IF;

  IF p_guarda_id IS NULL OR p_graduacao_anterior_id IS NULL
     OR p_graduacao_id IS NULL OR p_data_a_partir IS NULL THEN
    RAISE EXCEPTION 'Graduação de origem, nova graduação e data a partir de quando são obrigatórias.';
  END IF;

  IF p_graduacao_anterior_id = p_graduacao_id THEN
    RAISE EXCEPTION 'A nova graduação deve ser diferente da graduação atual.';
  END IF;

  UPDATE public.guardas_municipais
  SET graduacao_id = p_graduacao_id,
      data_graduacao = p_data_a_partir
  WHERE id = p_guarda_id
    AND graduacao_id = p_graduacao_anterior_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Guarda não encontrado ou a graduação atual não confere com a informada.';
  END IF;

  INSERT INTO public.guarda_graduacao_historico (
    guarda_id, graduacao_anterior_id, graduacao_id, data_a_partir, alterado_por
  )
  VALUES (
    p_guarda_id, p_graduacao_anterior_id, p_graduacao_id, p_data_a_partir, auth.uid()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.alterar_graduacao_guarda(uuid, uuid, uuid, date)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.alterar_graduacao_guarda(uuid, uuid, uuid, date)
  TO authenticated;

-- 6. RPC: alterar graduacao em massa (atomico para todos os guardas da origem)
CREATE OR REPLACE FUNCTION public.alterar_graduacao_em_massa(
  p_graduacao_anterior_id uuid,
  p_graduacao_id uuid,
  p_data_a_partir date
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_guardas uuid[];
  v_afetados integer;
BEGIN
  IF NOT public.pode_gerenciar_guardas() THEN
    RAISE EXCEPTION 'Apenas super admin, gestor ou administrativo da Guarda pode alterar graduação em massa.';
  END IF;

  IF p_graduacao_anterior_id IS NULL OR p_graduacao_id IS NULL OR p_data_a_partir IS NULL THEN
    RAISE EXCEPTION 'Graduação de origem, nova graduação e data a partir de quando são obrigatórias.';
  END IF;

  IF p_graduacao_anterior_id = p_graduacao_id THEN
    RAISE EXCEPTION 'A nova graduação deve ser diferente da graduação de origem.';
  END IF;

  SELECT array_agg(id) INTO v_guardas
  FROM public.guardas_municipais
  WHERE graduacao_id = p_graduacao_anterior_id;

  IF v_guardas IS NULL OR cardinality(v_guardas) = 0 THEN
    RAISE EXCEPTION 'Nenhum guarda encontrado na graduação de origem.';
  END IF;

  INSERT INTO public.guarda_graduacao_historico (
    guarda_id, graduacao_anterior_id, graduacao_id, data_a_partir, alterado_por
  )
  SELECT unnest(v_guardas), p_graduacao_anterior_id, p_graduacao_id, p_data_a_partir, auth.uid();

  UPDATE public.guardas_municipais
  SET graduacao_id = p_graduacao_id,
      data_graduacao = p_data_a_partir
  WHERE graduacao_id = p_graduacao_anterior_id;

  GET DIAGNOSTICS v_afetados = ROW_COUNT;
  RETURN v_afetados;
END;
$$;

REVOKE ALL ON FUNCTION public.alterar_graduacao_em_massa(uuid, uuid, date)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.alterar_graduacao_em_massa(uuid, uuid, date)
  TO authenticated;

-- 7. buscar_guarda_por_usuario passa a retornar data_graduacao (precificacao por operacao)
CREATE OR REPLACE FUNCTION public.buscar_guarda_por_usuario(
  p_usuario_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_guarda record;
BEGIN
  SELECT gm.id, gm.matricula, gm.nome, gm.cpf, gm.graduacao_id,
         gm.data_graduacao,
         gm.email, gm.telefone, gm.whatsapp,
         gm.estado, gm.cidade, gm.logradouro, gm.numero, gm.bairro, gm.complemento, gm.cep,
         ggn.nome as graduacao_nome
  INTO v_guarda
  FROM public.guardas_municipais gm
  JOIN public.guardas_usuarios gu ON gu.guarda_id = gm.id
  LEFT JOIN public.guarda_municipal_graduacoes ggn ON ggn.id = gm.graduacao_id
  WHERE gu.usuario_id = p_usuario_id;

  IF v_guarda.id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_guarda.id,
    'matricula', v_guarda.matricula,
    'nome', v_guarda.nome,
    'cpf', v_guarda.cpf,
    'graduacao_id', v_guarda.graduacao_id,
    'data_graduacao', v_guarda.data_graduacao,
    'graduacao_nome', v_guarda.graduacao_nome,
    'email', v_guarda.email,
    'telefone', v_guarda.telefone,
    'whatsapp', v_guarda.whatsapp,
    'estado', v_guarda.estado,
    'cidade', v_guarda.cidade,
    'logradouro', v_guarda.logradouro,
    'numero', v_guarda.numero,
    'bairro', v_guarda.bairro,
    'complemento', v_guarda.complemento,
    'cep', v_guarda.cep
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.buscar_guarda_por_usuario(uuid) TO authenticated;
