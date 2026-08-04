-- Adicionar permissão, política RLS de exclusão e função RPC jgc_excluir_turma

GRANT DELETE ON public.jgc_turmas TO authenticated;

DROP POLICY IF EXISTS "jgc_turmas_delete" ON public.jgc_turmas;
CREATE POLICY "jgc_turmas_delete" ON public.jgc_turmas FOR DELETE TO authenticated
  USING (public.jgc_tem_permissao('jovem_guarda.turmas.excluir'));

-- Função segura para excluir turma e desvincular relacionamentos automaticamente
CREATE OR REPLACE FUNCTION public.jgc_excluir_turma(_turma_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.jgc_tem_permissao('jovem_guarda.turmas.excluir') THEN
    RAISE EXCEPTION 'Sem permissao para excluir turmas.';
  END IF;

  -- 1. Desvincular alunos da turma
  UPDATE public.jgc_alunos SET turma_id = NULL WHERE turma_id = _turma_id;
  DELETE FROM public.jgc_aluno_turmas WHERE turma_id = _turma_id;

  -- 2. Remover vínculo com professores
  DELETE FROM public.jgc_turma_professores WHERE turma_id = _turma_id;

  -- 3. Remover diários de turma e desvincular atividades
  DELETE FROM public.jgc_diarios WHERE turma_id = _turma_id;
  UPDATE public.jgc_atividades SET turma_id = NULL WHERE turma_id = _turma_id;

  -- 4. Excluir a turma
  DELETE FROM public.jgc_turmas WHERE id = _turma_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.jgc_excluir_turma(uuid) TO authenticated;
