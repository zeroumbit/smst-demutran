-- Security review: views must honor the caller's RLS instead of the view owner.
ALTER VIEW public.jgc_escolas SET (security_invoker = true);
ALTER VIEW public.jgc_frequencia_resumo SET (security_invoker = true);

-- Avoid direct physical deletion of students and sensitive professional records.
REVOKE DELETE ON public.jgc_alunos,public.jgc_atendimentos,public.jgc_acoes,
  public.jgc_encaminhamentos,public.jgc_responsaveis FROM authenticated;

-- Extra indexes used by authorization and dashboard queries.
CREATE INDEX IF NOT EXISTS perfis_usuarios_user_ativo_idx
  ON public.perfis_usuarios(user_id,setor_id) WHERE ativo;
CREATE INDEX IF NOT EXISTS jgc_atendimentos_profissional_data_idx
  ON public.jgc_atendimentos(profissional_id,data DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS jgc_atendimentos_retorno_idx
  ON public.jgc_atendimentos(retorno_data) WHERE necessita_retorno AND deleted_at IS NULL;
