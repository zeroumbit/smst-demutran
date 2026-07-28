-- ============================================
-- Vincular professores às turmas e filtrar por vínculo
-- ============================================

-- Lista todos os perfis de professor com nome/sobrenome
CREATE OR REPLACE FUNCTION public.jgc_listar_professores()
RETURNS TABLE (id uuid, nome text, sobrenome text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jp.perfil_usuario_id, pu.nome, pu.sobrenome
  FROM public.jgc_perfis jp
  JOIN public.perfis_usuarios pu ON pu.id = jp.perfil_usuario_id
  WHERE jp.perfil = 'professor' AND jp.ativo AND pu.ativo
  ORDER BY pu.nome;
$$;

-- Retorna o perfil_usuario_id do usuário logado no JGC
CREATE OR REPLACE FUNCTION public.jgc_meu_perfil_usuario_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jp.perfil_usuario_id
  FROM public.perfis_usuarios pu
  JOIN public.jgc_perfis jp ON jp.perfil_usuario_id = pu.id AND jp.ativo
  WHERE pu.user_id = auth.uid() AND pu.ativo
  LIMIT 1;
$$;

-- Sincroniza professores vinculados a uma turma (gestor/administrativo)
CREATE OR REPLACE FUNCTION public.jgc_vincular_professores_turma(
  _turma_id uuid,
  _professor_ids uuid[]
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.jgc_tem_acesso(ARRAY['gestor','administrativo']::public.jgc_perfil[]) THEN
    RAISE EXCEPTION 'Sem permissao para vincular professores.';
  END IF;
  DELETE FROM public.jgc_turma_professores WHERE turma_id = _turma_id;
  IF array_length(_professor_ids, 1) > 0 THEN
    INSERT INTO public.jgc_turma_professores (turma_id, perfil_usuario_id)
    SELECT _turma_id, unnest(_professor_ids);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.jgc_listar_professores() TO authenticated;
GRANT EXECUTE ON FUNCTION public.jgc_meu_perfil_usuario_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.jgc_vincular_professores_turma(uuid,uuid[]) TO authenticated;

-- Atualiza policy da tabela de vínculo: write apenas para gestor/administrativo
DROP POLICY IF EXISTS "jgc_turma_professores_manage" ON public.jgc_turma_professores;
CREATE POLICY "jgc_turma_professores_manage" ON public.jgc_turma_professores FOR ALL TO authenticated
  USING (public.jgc_tem_acesso(ARRAY['gestor','administrativo']::public.jgc_perfil[]))
  WITH CHECK (public.jgc_tem_acesso(ARRAY['gestor','administrativo']::public.jgc_perfil[]));
