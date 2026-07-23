-- Permissoes granulares do Jovem Guarda, armazenadas no mesmo app_metadata.modulos
-- usado pelo RBAC existente. Gestores e super admins mantem acesso administrativo total.

CREATE OR REPLACE FUNCTION public.jgc_tem_permissao(_permissao text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_super_admin()
    OR public.jgc_perfil_atual() = 'gestor'
    OR EXISTS (
      SELECT 1
      FROM auth.users au
      JOIN public.perfis_usuarios pu ON pu.user_id=au.id AND pu.ativo
      JOIN public.setores s ON s.id=pu.setor_id AND s.slug='jovem-guarda'
      WHERE au.id=auth.uid()
        AND coalesce(au.raw_app_meta_data->'modulos','[]'::jsonb) ? _permissao
    );
$$;

CREATE OR REPLACE FUNCTION public.jgc_tem_alguma_permissao(_modulo text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_super_admin()
    OR public.jgc_perfil_atual() = 'gestor'
    OR EXISTS (
      SELECT 1
      FROM auth.users au, jsonb_array_elements_text(coalesce(au.raw_app_meta_data->'modulos','[]'::jsonb)) item
      WHERE au.id=auth.uid() AND item LIKE 'jovem_guarda.' || _modulo || '.%'
    );
$$;

-- Alunos
DROP POLICY IF EXISTS "jgc_select" ON public.jgc_alunos;
DROP POLICY IF EXISTS "jgc_alunos_manage" ON public.jgc_alunos;
CREATE POLICY "jgc_alunos_select" ON public.jgc_alunos FOR SELECT TO authenticated
  USING (public.jgc_tem_permissao('jovem_guarda.alunos.visualizar'));
CREATE POLICY "jgc_alunos_update" ON public.jgc_alunos FOR UPDATE TO authenticated
  USING (public.jgc_tem_permissao('jovem_guarda.alunos.editar') OR public.jgc_tem_permissao('jovem_guarda.alunos.inativar'))
  WITH CHECK (public.jgc_tem_permissao('jovem_guarda.alunos.editar') OR public.jgc_tem_permissao('jovem_guarda.alunos.inativar'));

CREATE OR REPLACE FUNCTION public.jgc_validar_escrita_aluno()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' AND NOT public.jgc_tem_permissao('jovem_guarda.alunos.criar') THEN
    RAISE EXCEPTION 'Sem permissao para cadastrar alunos.';
  END IF;
  IF TG_OP='UPDATE'
    AND NOT public.jgc_tem_permissao('jovem_guarda.alunos.editar')
    AND NOT public.jgc_tem_permissao('jovem_guarda.alunos.inativar') THEN
    RAISE EXCEPTION 'Sem permissao para editar alunos.';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS jgc_validar_escrita_aluno ON public.jgc_alunos;
CREATE TRIGGER jgc_validar_escrita_aluno BEFORE INSERT OR UPDATE ON public.jgc_alunos
FOR EACH ROW EXECUTE FUNCTION public.jgc_validar_escrita_aluno();

DROP POLICY IF EXISTS "jgc_saude_select" ON public.jgc_aluno_saude;
DROP POLICY IF EXISTS "jgc_saude_insert" ON public.jgc_aluno_saude;
DROP POLICY IF EXISTS "jgc_saude_update" ON public.jgc_aluno_saude;
CREATE POLICY "jgc_saude_select" ON public.jgc_aluno_saude FOR SELECT TO authenticated
  USING (public.jgc_tem_permissao('jovem_guarda.alunos.visualizar')
    AND public.jgc_tem_acesso(ARRAY['gestor','multiprofissional']::public.jgc_perfil[]));
CREATE POLICY "jgc_saude_insert" ON public.jgc_aluno_saude FOR INSERT TO authenticated
  WITH CHECK (public.jgc_tem_permissao('jovem_guarda.alunos.criar'));
CREATE POLICY "jgc_saude_update" ON public.jgc_aluno_saude FOR UPDATE TO authenticated
  USING (public.jgc_tem_permissao('jovem_guarda.alunos.editar'))
  WITH CHECK (public.jgc_tem_permissao('jovem_guarda.alunos.editar'));

-- Responsaveis
DROP POLICY IF EXISTS "jgc_select" ON public.jgc_responsaveis;
DROP POLICY IF EXISTS "jgc_responsaveis_manage" ON public.jgc_responsaveis;
CREATE POLICY "jgc_responsaveis_select" ON public.jgc_responsaveis FOR SELECT TO authenticated
  USING (public.jgc_tem_permissao('jovem_guarda.responsaveis.visualizar'));
CREATE POLICY "jgc_responsaveis_insert" ON public.jgc_responsaveis FOR INSERT TO authenticated
  WITH CHECK (public.jgc_tem_permissao('jovem_guarda.responsaveis.criar'));
CREATE POLICY "jgc_responsaveis_update" ON public.jgc_responsaveis FOR UPDATE TO authenticated
  USING (public.jgc_tem_permissao('jovem_guarda.responsaveis.editar'))
  WITH CHECK (public.jgc_tem_permissao('jovem_guarda.responsaveis.editar'));

-- Turmas e vinculos
DROP POLICY IF EXISTS "jgc_select" ON public.jgc_turmas;
DROP POLICY IF EXISTS "jgc_turmas_manage" ON public.jgc_turmas;
CREATE POLICY "jgc_turmas_select" ON public.jgc_turmas FOR SELECT TO authenticated
  USING (public.jgc_tem_permissao('jovem_guarda.turmas.visualizar'));
CREATE POLICY "jgc_turmas_insert" ON public.jgc_turmas FOR INSERT TO authenticated
  WITH CHECK (public.jgc_tem_permissao('jovem_guarda.turmas.criar'));
CREATE POLICY "jgc_turmas_update" ON public.jgc_turmas FOR UPDATE TO authenticated
  USING (public.jgc_tem_permissao('jovem_guarda.turmas.editar'))
  WITH CHECK (public.jgc_tem_permissao('jovem_guarda.turmas.editar'));
CREATE POLICY "jgc_turma_professores_select" ON public.jgc_turma_professores FOR SELECT TO authenticated
  USING (public.jgc_tem_permissao('jovem_guarda.turmas.visualizar'));
CREATE POLICY "jgc_turma_professores_manage" ON public.jgc_turma_professores FOR ALL TO authenticated
  USING (public.jgc_tem_permissao('jovem_guarda.turmas.gerenciar_alunos'))
  WITH CHECK (public.jgc_tem_permissao('jovem_guarda.turmas.gerenciar_alunos'));

-- Frequencia
DROP POLICY IF EXISTS "jgc_select" ON public.jgc_diarios;
DROP POLICY IF EXISTS "jgc_diarios_manage" ON public.jgc_diarios;
DROP POLICY IF EXISTS "jgc_select" ON public.jgc_frequencias;
DROP POLICY IF EXISTS "jgc_frequencias_manage" ON public.jgc_frequencias;
CREATE POLICY "jgc_diarios_select" ON public.jgc_diarios FOR SELECT TO authenticated
  USING (public.jgc_tem_permissao('jovem_guarda.frequencia.visualizar'));
CREATE POLICY "jgc_diarios_insert" ON public.jgc_diarios FOR INSERT TO authenticated
  WITH CHECK (public.jgc_tem_permissao('jovem_guarda.frequencia.registrar'));
CREATE POLICY "jgc_diarios_update" ON public.jgc_diarios FOR UPDATE TO authenticated
  USING (public.jgc_tem_permissao('jovem_guarda.frequencia.editar'))
  WITH CHECK (public.jgc_tem_permissao('jovem_guarda.frequencia.editar'));
CREATE POLICY "jgc_frequencias_select" ON public.jgc_frequencias FOR SELECT TO authenticated
  USING (public.jgc_tem_permissao('jovem_guarda.frequencia.visualizar'));
CREATE POLICY "jgc_frequencias_insert" ON public.jgc_frequencias FOR INSERT TO authenticated
  WITH CHECK (public.jgc_tem_permissao('jovem_guarda.frequencia.registrar'));
CREATE POLICY "jgc_frequencias_update" ON public.jgc_frequencias FOR UPDATE TO authenticated
  USING (public.jgc_tem_permissao('jovem_guarda.frequencia.editar'))
  WITH CHECK (public.jgc_tem_permissao('jovem_guarda.frequencia.editar'));

-- Atividades
DROP POLICY IF EXISTS "jgc_select" ON public.jgc_atividades;
DROP POLICY IF EXISTS "jgc_pedagogico_manage" ON public.jgc_atividades;
CREATE POLICY "jgc_atividades_select" ON public.jgc_atividades FOR SELECT TO authenticated
  USING (public.jgc_tem_permissao('jovem_guarda.atividades.visualizar'));
CREATE POLICY "jgc_atividades_insert" ON public.jgc_atividades FOR INSERT TO authenticated
  WITH CHECK (public.jgc_tem_permissao('jovem_guarda.atividades.criar'));
CREATE POLICY "jgc_atividades_update" ON public.jgc_atividades FOR UPDATE TO authenticated
  USING (public.jgc_tem_permissao('jovem_guarda.atividades.editar'))
  WITH CHECK (public.jgc_tem_permissao('jovem_guarda.atividades.editar'));
CREATE POLICY "jgc_atividades_delete" ON public.jgc_atividades FOR DELETE TO authenticated
  USING (public.jgc_tem_permissao('jovem_guarda.atividades.excluir'));

-- Acompanhamento: privacidade e permissao precisam ser verdadeiros ao mesmo tempo.
DROP POLICY IF EXISTS "jgc_atendimentos_select" ON public.jgc_atendimentos;
DROP POLICY IF EXISTS "jgc_atendimentos_insert" ON public.jgc_atendimentos;
DROP POLICY IF EXISTS "jgc_atendimentos_update" ON public.jgc_atendimentos;
CREATE POLICY "jgc_atendimentos_select" ON public.jgc_atendimentos FOR SELECT TO authenticated
  USING (deleted_at IS NULL
    AND public.jgc_tem_permissao('jovem_guarda.acompanhamento.visualizar')
    AND public.jgc_pode_ver_privacidade(privacidade,profissional_id));
CREATE POLICY "jgc_atendimentos_insert" ON public.jgc_atendimentos FOR INSERT TO authenticated
  WITH CHECK (public.jgc_tem_permissao('jovem_guarda.acompanhamento.criar') AND profissional_id=auth.uid());
CREATE POLICY "jgc_atendimentos_update" ON public.jgc_atendimentos FOR UPDATE TO authenticated
  USING (public.jgc_tem_permissao('jovem_guarda.acompanhamento.editar')
    AND public.jgc_pode_ver_privacidade(privacidade,profissional_id))
  WITH CHECK (public.jgc_tem_permissao('jovem_guarda.acompanhamento.editar'));

GRANT EXECUTE ON FUNCTION public.jgc_tem_permissao(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.jgc_tem_alguma_permissao(text) TO authenticated;
