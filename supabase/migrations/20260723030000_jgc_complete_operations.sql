-- Complementa os fluxos operacionais e consolidados do Jovem Guarda.
ALTER TABLE public.jgc_responsaveis ADD COLUMN IF NOT EXISTS whatsapp text;
ALTER TABLE public.jgc_atividades ADD COLUMN IF NOT EXISTS local text;
ALTER TABLE public.jgc_atividades ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ativa'
  CHECK (status IN ('ativa','cancelada','concluida'));

CREATE TABLE IF NOT EXISTS public.jgc_atividade_participantes (
  atividade_id uuid NOT NULL REFERENCES public.jgc_atividades(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES public.jgc_alunos(id) ON DELETE CASCADE,
  presente boolean,
  observacao text,
  PRIMARY KEY (atividade_id,aluno_id)
);

CREATE TABLE IF NOT EXISTS public.jgc_aluno_documentos (
  aluno_id uuid NOT NULL REFERENCES public.jgc_alunos(id) ON DELETE CASCADE,
  documento_id uuid NOT NULL REFERENCES public.documentos(id) ON DELETE CASCADE,
  descricao text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (aluno_id,documento_id)
);

CREATE INDEX IF NOT EXISTS jgc_responsaveis_aluno_idx ON public.jgc_responsaveis(aluno_id);
CREATE INDEX IF NOT EXISTS jgc_atividades_turma_data_idx ON public.jgc_atividades(turma_id,data DESC);
CREATE INDEX IF NOT EXISTS jgc_diarios_turma_data_idx ON public.jgc_diarios(turma_id,data DESC);
CREATE INDEX IF NOT EXISTS jgc_frequencias_aluno_idx ON public.jgc_frequencias(aluno_id);
CREATE INDEX IF NOT EXISTS jgc_acoes_aluno_status_prazo_idx ON public.jgc_acoes(aluno_id,status,prazo);
CREATE INDEX IF NOT EXISTS jgc_acoes_responsavel_idx ON public.jgc_acoes(responsavel_id) WHERE status IN ('pendente','em_andamento');
CREATE INDEX IF NOT EXISTS jgc_encaminhamentos_aluno_status_idx ON public.jgc_encaminhamentos(aluno_id,status);
CREATE INDEX IF NOT EXISTS jgc_turma_professores_perfil_idx ON public.jgc_turma_professores(perfil_usuario_id);
CREATE INDEX IF NOT EXISTS jgc_atividade_participantes_aluno_idx ON public.jgc_atividade_participantes(aluno_id);
CREATE INDEX IF NOT EXISTS jgc_aluno_documentos_documento_idx ON public.jgc_aluno_documentos(documento_id);

CREATE OR REPLACE FUNCTION public.jgc_pode_ver_aluno(_aluno_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.is_super_admin()
    OR public.jgc_perfil_atual() IN ('gestor','administrativo','multiprofissional')
    OR (
      public.jgc_perfil_atual()='professor'
      AND EXISTS (
        SELECT 1 FROM public.jgc_alunos a
        JOIN public.jgc_turma_professores tp ON tp.turma_id=a.turma_id
        JOIN public.perfis_usuarios pu ON pu.id=tp.perfil_usuario_id
        WHERE a.id=_aluno_id AND pu.user_id=(SELECT auth.uid()) AND pu.ativo
      )
    );
$$;

-- Escopo do professor: apenas seus alunos/turmas. Os demais papeis seguem as permissoes.
DROP POLICY IF EXISTS "jgc_alunos_select" ON public.jgc_alunos;
CREATE POLICY "jgc_alunos_select" ON public.jgc_alunos FOR SELECT TO authenticated
  USING (public.jgc_tem_permissao('jovem_guarda.alunos.visualizar') AND public.jgc_pode_ver_aluno(id));

DROP POLICY IF EXISTS "jgc_responsaveis_select" ON public.jgc_responsaveis;
CREATE POLICY "jgc_responsaveis_select" ON public.jgc_responsaveis FOR SELECT TO authenticated
  USING (public.jgc_tem_permissao('jovem_guarda.responsaveis.visualizar') AND public.jgc_pode_ver_aluno(aluno_id));

ALTER TABLE public.jgc_atividade_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jgc_aluno_documentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jgc_participantes_select" ON public.jgc_atividade_participantes FOR SELECT TO authenticated
  USING (public.jgc_tem_permissao('jovem_guarda.atividades.visualizar') AND public.jgc_pode_ver_aluno(aluno_id));
CREATE POLICY "jgc_participantes_manage" ON public.jgc_atividade_participantes FOR ALL TO authenticated
  USING (public.jgc_tem_permissao('jovem_guarda.atividades.editar'))
  WITH CHECK (public.jgc_tem_permissao('jovem_guarda.atividades.editar'));
CREATE POLICY "jgc_aluno_documentos_select" ON public.jgc_aluno_documentos FOR SELECT TO authenticated
  USING (public.jgc_tem_permissao('jovem_guarda.alunos.visualizar') AND public.jgc_pode_ver_aluno(aluno_id));
CREATE POLICY "jgc_aluno_documentos_manage" ON public.jgc_aluno_documentos FOR ALL TO authenticated
  USING (public.jgc_tem_permissao('jovem_guarda.alunos.editar'))
  WITH CHECK (public.jgc_tem_permissao('jovem_guarda.alunos.editar'));

DROP POLICY IF EXISTS "jgc_acoes_manage" ON public.jgc_acoes;
DROP POLICY IF EXISTS "jgc_encaminhamentos_manage" ON public.jgc_encaminhamentos;
CREATE POLICY "jgc_acoes_select" ON public.jgc_acoes FOR SELECT TO authenticated
  USING (public.jgc_tem_permissao('jovem_guarda.acompanhamento.visualizar') AND public.jgc_pode_ver_aluno(aluno_id));
CREATE POLICY "jgc_acoes_insert" ON public.jgc_acoes FOR INSERT TO authenticated
  WITH CHECK (public.jgc_tem_permissao('jovem_guarda.acompanhamento.criar'));
CREATE POLICY "jgc_acoes_update" ON public.jgc_acoes FOR UPDATE TO authenticated
  USING (public.jgc_tem_permissao('jovem_guarda.acompanhamento.editar'))
  WITH CHECK (public.jgc_tem_permissao('jovem_guarda.acompanhamento.editar'));
CREATE POLICY "jgc_encaminhamentos_select" ON public.jgc_encaminhamentos FOR SELECT TO authenticated
  USING (public.jgc_tem_permissao('jovem_guarda.acompanhamento.visualizar') AND public.jgc_pode_ver_aluno(aluno_id));
CREATE POLICY "jgc_encaminhamentos_insert" ON public.jgc_encaminhamentos FOR INSERT TO authenticated
  WITH CHECK (public.jgc_tem_permissao('jovem_guarda.acompanhamento.criar'));
CREATE POLICY "jgc_encaminhamentos_update" ON public.jgc_encaminhamentos FOR UPDATE TO authenticated
  USING (public.jgc_tem_permissao('jovem_guarda.acompanhamento.editar'))
  WITH CHECK (public.jgc_tem_permissao('jovem_guarda.acompanhamento.editar'));

GRANT SELECT,INSERT,UPDATE ON public.jgc_atividade_participantes,public.jgc_aluno_documentos TO authenticated;
GRANT EXECUTE ON FUNCTION public.jgc_pode_ver_aluno(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.jgc_historico_aluno(_aluno_id uuid)
RETURNS TABLE(data_hora timestamptz,tipo text,titulo text,descricao text,privacidade public.jgc_privacidade,referencia_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT a.created_at,'entrada','Entrada no programa','Matricula '||a.matricula,'compartilhado'::public.jgc_privacidade,a.id
  FROM public.jgc_alunos a WHERE a.id=_aluno_id AND public.jgc_pode_ver_aluno(a.id)
  UNION ALL
  SELECT d.data::timestamptz,'frequencia','Frequencia: '||f.status::text,coalesce(f.observacao,''),'compartilhado',d.id
  FROM public.jgc_frequencias f JOIN public.jgc_diarios d ON d.id=f.diario_id
  WHERE f.aluno_id=_aluno_id AND public.jgc_tem_permissao('jovem_guarda.frequencia.visualizar')
  UNION ALL
  SELECT at.data::timestamptz,'atividade',at.titulo,coalesce(at.descricao,''),'compartilhado',at.id
  FROM public.jgc_atividades at
  LEFT JOIN public.jgc_atividade_participantes ap ON ap.atividade_id=at.id
  JOIN public.jgc_alunos al ON al.id=_aluno_id
  WHERE (ap.aluno_id=_aluno_id OR (ap.aluno_id IS NULL AND at.turma_id=al.turma_id))
    AND public.jgc_tem_permissao('jovem_guarda.atividades.visualizar')
  UNION ALL
  SELECT (ate.data+ate.hora)::timestamptz,'atendimento',ate.tipo,ate.motivo,ate.privacidade,ate.id
  FROM public.jgc_atendimentos ate WHERE ate.aluno_id=_aluno_id AND ate.deleted_at IS NULL
    AND public.jgc_tem_permissao('jovem_guarda.acompanhamento.visualizar')
    AND public.jgc_pode_ver_privacidade(ate.privacidade,ate.profissional_id)
  ORDER BY 1 DESC;
$$;
GRANT EXECUTE ON FUNCTION public.jgc_historico_aluno(uuid) TO authenticated;
