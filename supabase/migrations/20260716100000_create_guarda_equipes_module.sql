-- =====================================================
-- Migration: Modulo Equipes da Guarda Municipal
-- =====================================================

CREATE OR REPLACE FUNCTION public.can_manage_guarda_equipes()
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
      SELECT 1
      FROM public.perfis_usuarios pu
      WHERE pu.user_id = auth.uid()
        AND pu.ativo = true
        AND pu.setor_id = public.get_guarda_municipal_setor_id()
        AND pu.papel = 'tecnico'::public.papel_usuario
        AND (
          coalesce(auth.jwt()->'app_metadata'->'modulos', '[]'::jsonb) ? 'guarda_equipes'
          OR coalesce(auth.jwt()->'app_metadata'->'modulos', '[]'::jsonb) ? 'guardas'
        )
    );
$$;

CREATE TABLE IF NOT EXISTS public.guarda_equipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id uuid NOT NULL DEFAULT public.get_guarda_municipal_setor_id() REFERENCES public.setores(id) ON DELETE RESTRICT,
  nome text NOT NULL,
  descricao text,
  responsavel_guarda_id uuid REFERENCES public.guardas_municipais(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guarda_equipes_setor_check CHECK (setor_id = public.get_guarda_municipal_setor_id())
);

CREATE UNIQUE INDEX IF NOT EXISTS guarda_equipes_nome_ativo_unq
  ON public.guarda_equipes (lower(trim(nome)))
  WHERE ativo = true;

CREATE INDEX IF NOT EXISTS guarda_equipes_setor_status_idx
  ON public.guarda_equipes (setor_id, ativo, nome);

CREATE INDEX IF NOT EXISTS guarda_equipes_responsavel_idx
  ON public.guarda_equipes (responsavel_guarda_id);

CREATE TABLE IF NOT EXISTS public.guarda_equipe_membros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipe_id uuid NOT NULL REFERENCES public.guarda_equipes(id) ON DELETE CASCADE,
  guarda_id uuid NOT NULL REFERENCES public.guardas_municipais(id) ON DELETE RESTRICT,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  removed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  removed_at timestamptz,
  motivo_remocao text
);

CREATE UNIQUE INDEX IF NOT EXISTS guarda_equipe_membros_guarda_ativo_unq
  ON public.guarda_equipe_membros (guarda_id)
  WHERE ativo = true;

CREATE UNIQUE INDEX IF NOT EXISTS guarda_equipe_membros_equipe_guarda_ativo_unq
  ON public.guarda_equipe_membros (equipe_id, guarda_id)
  WHERE ativo = true;

CREATE INDEX IF NOT EXISTS guarda_equipe_membros_equipe_idx
  ON public.guarda_equipe_membros (equipe_id, ativo);

CREATE INDEX IF NOT EXISTS guarda_equipe_membros_guarda_idx
  ON public.guarda_equipe_membros (guarda_id, ativo);

CREATE TABLE IF NOT EXISTS public.guarda_equipes_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipe_id uuid REFERENCES public.guarda_equipes(id) ON DELETE CASCADE,
  guarda_id uuid REFERENCES public.guardas_municipais(id) ON DELETE SET NULL,
  usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  acao text NOT NULL,
  descricao text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS guarda_equipes_historico_equipe_idx
  ON public.guarda_equipes_historico (equipe_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.registrar_guarda_equipe_historico(
  p_equipe_id uuid,
  p_guarda_id uuid,
  p_acao text,
  p_descricao text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.guarda_equipes_historico (equipe_id, guarda_id, usuario_id, acao, descricao, metadata)
  VALUES (p_equipe_id, p_guarda_id, auth.uid(), p_acao, p_descricao, coalesce(p_metadata, '{}'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.guarda_equipes_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.registrar_guarda_equipe_historico(NEW.id, NULL, 'EQUIPE_CRIADA', 'Equipe cadastrada');
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.ativo IS DISTINCT FROM NEW.ativo THEN
      PERFORM public.registrar_guarda_equipe_historico(
        NEW.id,
        NULL,
        CASE WHEN NEW.ativo THEN 'EQUIPE_REATIVADA' ELSE 'EQUIPE_INATIVADA' END,
        CASE WHEN NEW.ativo THEN 'Equipe reativada' ELSE 'Equipe inativada' END
      );
    ELSE
      PERFORM public.registrar_guarda_equipe_historico(NEW.id, NULL, 'EQUIPE_ATUALIZADA', 'Dados da equipe atualizados');
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_atualizar_guarda_equipes_updated_at ON public.guarda_equipes;
CREATE TRIGGER trigger_atualizar_guarda_equipes_updated_at
BEFORE UPDATE ON public.guarda_equipes
FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

DROP TRIGGER IF EXISTS trigger_audit_guarda_equipes ON public.guarda_equipes;
CREATE TRIGGER trigger_audit_guarda_equipes
AFTER INSERT OR UPDATE ON public.guarda_equipes
FOR EACH ROW EXECUTE FUNCTION public.guarda_equipes_audit_trigger();

CREATE OR REPLACE FUNCTION public.adicionar_guarda_equipe(
  p_equipe_id uuid,
  p_guarda_id uuid,
  p_transferir boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_equipe public.guarda_equipes%ROWTYPE;
  v_guarda public.guardas_municipais%ROWTYPE;
  v_vinculo_id uuid;
  v_vinculo_equipe_id uuid;
  v_vinculo_equipe_nome text;
BEGIN
  IF NOT public.can_manage_guarda_equipes() THEN
    RETURN jsonb_build_object('sucesso', false, 'codigo', 'SEM_PERMISSAO', 'mensagem', 'Sem permissao para gerenciar equipes.');
  END IF;

  SELECT * INTO v_equipe FROM public.guarda_equipes WHERE id = p_equipe_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('sucesso', false, 'codigo', 'EQUIPE_NAO_ENCONTRADA', 'mensagem', 'Equipe nao encontrada.');
  END IF;

  IF NOT v_equipe.ativo THEN
    RETURN jsonb_build_object('sucesso', false, 'codigo', 'EQUIPE_INATIVA', 'mensagem', 'Nao e possivel adicionar membros a uma equipe inativa.');
  END IF;

  SELECT * INTO v_guarda FROM public.guardas_municipais WHERE id = p_guarda_id;
  IF NOT FOUND OR NOT v_guarda.ativo THEN
    RETURN jsonb_build_object('sucesso', false, 'codigo', 'GUARDA_INVALIDO', 'mensagem', 'Guarda municipal nao encontrado ou inativo.');
  END IF;

  SELECT mem.id, mem.equipe_id, eq.nome
  INTO v_vinculo_id, v_vinculo_equipe_id, v_vinculo_equipe_nome
  FROM public.guarda_equipe_membros mem
  JOIN public.guarda_equipes eq ON eq.id = mem.equipe_id
  WHERE mem.guarda_id = p_guarda_id
    AND mem.ativo = true
  LIMIT 1;

  IF v_vinculo_id IS NOT NULL THEN
    IF v_vinculo_equipe_id = p_equipe_id THEN
      RETURN jsonb_build_object('sucesso', true, 'codigo', 'JA_INTEGRANTE', 'mensagem', 'Guarda ja pertence a esta equipe.');
    END IF;

    IF NOT p_transferir THEN
      RETURN jsonb_build_object(
        'sucesso', false,
        'codigo', 'JA_PERTENCE_A_EQUIPE',
        'mensagem', 'Este Guarda Municipal ja pertence a outra equipe.',
        'equipe_atual_id', v_vinculo_equipe_id,
        'equipe_atual_nome', v_vinculo_equipe_nome
      );
    END IF;

    UPDATE public.guarda_equipe_membros
    SET ativo = false,
        removed_at = now(),
        removed_by = auth.uid(),
        motivo_remocao = 'Transferido para outra equipe'
    WHERE id = v_vinculo_id;

    PERFORM public.registrar_guarda_equipe_historico(
      v_vinculo_equipe_id,
      p_guarda_id,
      'MEMBRO_TRANSFERIDO_SAIDA',
      'Guarda transferido para outra equipe',
      jsonb_build_object('nova_equipe_id', p_equipe_id)
    );
  END IF;

  INSERT INTO public.guarda_equipe_membros (equipe_id, guarda_id, created_by)
  VALUES (p_equipe_id, p_guarda_id, auth.uid());

  PERFORM public.registrar_guarda_equipe_historico(
    p_equipe_id,
    p_guarda_id,
    CASE WHEN p_transferir AND v_vinculo_id IS NOT NULL THEN 'MEMBRO_TRANSFERIDO_ENTRADA' ELSE 'MEMBRO_ADICIONADO' END,
    CASE WHEN p_transferir AND v_vinculo_id IS NOT NULL THEN 'Guarda transferido para esta equipe' ELSE 'Guarda adicionado a equipe' END,
    CASE WHEN p_transferir AND v_vinculo_id IS NOT NULL THEN jsonb_build_object('equipe_anterior_id', v_vinculo_equipe_id) ELSE '{}'::jsonb END
  );

  RETURN jsonb_build_object('sucesso', true, 'codigo', 'ADICIONADO', 'mensagem', 'Integrante adicionado a equipe.');
END;
$$;

CREATE OR REPLACE FUNCTION public.remover_guarda_equipe(
  p_equipe_id uuid,
  p_guarda_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_vinculo_id uuid;
BEGIN
  IF NOT public.can_manage_guarda_equipes() THEN
    RETURN jsonb_build_object('sucesso', false, 'codigo', 'SEM_PERMISSAO', 'mensagem', 'Sem permissao para gerenciar equipes.');
  END IF;

  SELECT id INTO v_vinculo_id
  FROM public.guarda_equipe_membros
  WHERE equipe_id = p_equipe_id
    AND guarda_id = p_guarda_id
    AND ativo = true
  LIMIT 1;

  IF v_vinculo_id IS NULL THEN
    RETURN jsonb_build_object('sucesso', false, 'codigo', 'VINCULO_NAO_ENCONTRADO', 'mensagem', 'Integrante nao encontrado nesta equipe.');
  END IF;

  UPDATE public.guarda_equipe_membros
  SET ativo = false,
      removed_at = now(),
      removed_by = auth.uid(),
      motivo_remocao = 'Removido manualmente da equipe'
  WHERE id = v_vinculo_id;

  PERFORM public.registrar_guarda_equipe_historico(p_equipe_id, p_guarda_id, 'MEMBRO_REMOVIDO', 'Guarda removido da equipe');

  RETURN jsonb_build_object('sucesso', true, 'codigo', 'REMOVIDO', 'mensagem', 'Integrante removido da equipe.');
END;
$$;

CREATE OR REPLACE FUNCTION public.listar_guarda_equipes_ativas()
RETURNS TABLE (
  equipe_id uuid,
  equipe_nome text,
  responsavel_nome text,
  integrantes jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    eq.id AS equipe_id,
    eq.nome AS equipe_nome,
    resp.nome AS responsavel_nome,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'guarda_id', gm.id,
          'nome', gm.nome,
          'matricula', gm.matricula
        )
        ORDER BY gm.nome
      ) FILTER (WHERE gm.id IS NOT NULL),
      '[]'::jsonb
    ) AS integrantes
  FROM public.guarda_equipes eq
  LEFT JOIN public.guardas_municipais resp ON resp.id = eq.responsavel_guarda_id
  LEFT JOIN public.guarda_equipe_membros mem ON mem.equipe_id = eq.id AND mem.ativo = true
  LEFT JOIN public.guardas_municipais gm ON gm.id = mem.guarda_id AND gm.ativo = true
  WHERE eq.ativo = true
    AND public.can_manage_guarda_equipes()
  GROUP BY eq.id, eq.nome, resp.nome
  ORDER BY eq.nome;
$$;

ALTER TABLE public.guarda_equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guarda_equipe_membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guarda_equipes_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage guarda equipes" ON public.guarda_equipes;
CREATE POLICY "Admins can manage guarda equipes"
ON public.guarda_equipes
FOR ALL TO authenticated
USING (public.can_manage_guarda_equipes())
WITH CHECK (public.can_manage_guarda_equipes() AND setor_id = public.get_guarda_municipal_setor_id());

DROP POLICY IF EXISTS "Admins can manage guarda equipe membros" ON public.guarda_equipe_membros;
CREATE POLICY "Admins can manage guarda equipe membros"
ON public.guarda_equipe_membros
FOR ALL TO authenticated
USING (public.can_manage_guarda_equipes())
WITH CHECK (public.can_manage_guarda_equipes());

DROP POLICY IF EXISTS "Admins can view guarda equipes historico" ON public.guarda_equipes_historico;
CREATE POLICY "Admins can view guarda equipes historico"
ON public.guarda_equipes_historico
FOR SELECT TO authenticated
USING (public.can_manage_guarda_equipes());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.guarda_equipes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guarda_equipe_membros TO authenticated;
GRANT SELECT ON public.guarda_equipes_historico TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_guarda_equipes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.adicionar_guarda_equipe(uuid, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remover_guarda_equipe(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_guarda_equipes_ativas() TO authenticated;

UPDATE auth.users au
SET raw_app_meta_data = jsonb_set(
  coalesce(au.raw_app_meta_data, '{}'::jsonb),
  '{modulos}',
  (
    SELECT jsonb_agg(DISTINCT value)
    FROM jsonb_array_elements_text(
      coalesce(au.raw_app_meta_data->'modulos', '[]'::jsonb) || '["guarda_equipes"]'::jsonb
    ) AS value
  ),
  true
)
FROM public.perfis_usuarios pu
WHERE pu.user_id = au.id
  AND pu.ativo = true
  AND pu.setor_id = public.get_guarda_municipal_setor_id()
  AND pu.papel IN ('gestor'::public.papel_usuario, 'admin_setor'::public.papel_usuario, 'tecnico'::public.papel_usuario)
  AND coalesce(au.raw_app_meta_data->'modulos', '[]'::jsonb) <> '[]'::jsonb
  AND NOT (coalesce(au.raw_app_meta_data->'modulos', '[]'::jsonb) ? 'guarda_equipes');
