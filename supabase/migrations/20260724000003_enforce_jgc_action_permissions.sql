-- Garante que cada acao granular seja aplicada pelo banco, mesmo em chamadas
-- REST diretas. Politicas permissivas antigas sao removidas explicitamente.

DROP POLICY IF EXISTS "jgc_select" ON public.jgc_acoes;
DROP POLICY IF EXISTS "jgc_select" ON public.jgc_encaminhamentos;
DROP POLICY IF EXISTS "jgc_acoes_manage" ON public.jgc_acoes;
DROP POLICY IF EXISTS "jgc_encaminhamentos_manage" ON public.jgc_encaminhamentos;

DROP POLICY IF EXISTS "jgc_acoes_select" ON public.jgc_acoes;
DROP POLICY IF EXISTS "jgc_acoes_insert" ON public.jgc_acoes;
DROP POLICY IF EXISTS "jgc_acoes_update" ON public.jgc_acoes;
CREATE POLICY "jgc_acoes_select" ON public.jgc_acoes FOR SELECT TO authenticated
  USING (
    public.jgc_tem_permissao('jovem_guarda.acompanhamento.visualizar')
    AND public.jgc_pode_ver_aluno(aluno_id)
  );
CREATE POLICY "jgc_acoes_insert" ON public.jgc_acoes FOR INSERT TO authenticated
  WITH CHECK (
    public.jgc_tem_permissao('jovem_guarda.acompanhamento.criar')
    AND public.jgc_pode_ver_aluno(aluno_id)
  );
CREATE POLICY "jgc_acoes_update" ON public.jgc_acoes FOR UPDATE TO authenticated
  USING (
    public.jgc_tem_permissao('jovem_guarda.acompanhamento.editar')
    AND public.jgc_pode_ver_aluno(aluno_id)
  )
  WITH CHECK (
    public.jgc_tem_permissao('jovem_guarda.acompanhamento.editar')
    AND public.jgc_pode_ver_aluno(aluno_id)
  );

DROP POLICY IF EXISTS "jgc_encaminhamentos_select" ON public.jgc_encaminhamentos;
DROP POLICY IF EXISTS "jgc_encaminhamentos_insert" ON public.jgc_encaminhamentos;
DROP POLICY IF EXISTS "jgc_encaminhamentos_update" ON public.jgc_encaminhamentos;
CREATE POLICY "jgc_encaminhamentos_select" ON public.jgc_encaminhamentos FOR SELECT TO authenticated
  USING (
    public.jgc_tem_permissao('jovem_guarda.acompanhamento.visualizar')
    AND public.jgc_pode_ver_aluno(aluno_id)
  );
CREATE POLICY "jgc_encaminhamentos_insert" ON public.jgc_encaminhamentos FOR INSERT TO authenticated
  WITH CHECK (
    public.jgc_tem_permissao('jovem_guarda.acompanhamento.criar')
    AND public.jgc_pode_ver_aluno(aluno_id)
  );
CREATE POLICY "jgc_encaminhamentos_update" ON public.jgc_encaminhamentos FOR UPDATE TO authenticated
  USING (
    public.jgc_tem_permissao('jovem_guarda.acompanhamento.editar')
    AND public.jgc_pode_ver_aluno(aluno_id)
  )
  WITH CHECK (
    public.jgc_tem_permissao('jovem_guarda.acompanhamento.editar')
    AND public.jgc_pode_ver_aluno(aluno_id)
  );

DROP POLICY IF EXISTS "jgc_atendimentos_insert" ON public.jgc_atendimentos;
CREATE POLICY "jgc_atendimentos_insert" ON public.jgc_atendimentos FOR INSERT TO authenticated
  WITH CHECK (
    public.jgc_tem_permissao('jovem_guarda.acompanhamento.criar')
    AND profissional_id = auth.uid()
    AND public.jgc_pode_ver_aluno(aluno_id)
  );

-- Quem possui somente "inativar" pode alterar apenas a situacao do aluno.
CREATE OR REPLACE FUNCTION public.jgc_validar_escrita_aluno()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT'
     AND NOT public.jgc_tem_permissao('jovem_guarda.alunos.criar') THEN
    RAISE EXCEPTION 'Sem permissao para cadastrar alunos.';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF public.jgc_tem_permissao('jovem_guarda.alunos.editar') THEN
      RETURN NEW;
    END IF;

    IF NOT public.jgc_tem_permissao('jovem_guarda.alunos.inativar') THEN
      RAISE EXCEPTION 'Sem permissao para editar alunos.';
    END IF;

    IF (to_jsonb(NEW) - 'situacao' - 'updated_at')
       IS DISTINCT FROM
       (to_jsonb(OLD) - 'situacao' - 'updated_at') THEN
      RAISE EXCEPTION 'A permissao inativar permite alterar somente a situacao do aluno.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE DELETE ON public.jgc_acoes, public.jgc_encaminhamentos FROM authenticated;
