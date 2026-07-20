-- Centraliza as operacoes de IRO na Guarda Municipal e preserva aos chefes
-- de outros setores somente o acesso as suas proprias candidaturas.

DROP POLICY IF EXISTS "Super admin and gestor can manage iro_operacoes" ON public.iro_operacoes;
CREATE POLICY "Super admin and gestor can manage iro_operacoes"
ON public.iro_operacoes
FOR ALL
TO authenticated
USING (
  setor_id = public.get_guarda_municipal_setor_id()
  AND public.can_lancar_iro_manual(public.get_guarda_municipal_setor_id())
)
WITH CHECK (
  setor_id = public.get_guarda_municipal_setor_id()
  AND public.can_lancar_iro_manual(public.get_guarda_municipal_setor_id())
);

-- A regra anterior dependia de operacao_id e, por isso, escondia da
-- administracao da Guarda as IROs extras criadas sem operacao vinculada.
DROP POLICY IF EXISTS "Gestor can manage iro_candidaturas" ON public.iro_candidaturas;
CREATE POLICY "Gestor can manage iro_candidaturas"
ON public.iro_candidaturas
FOR ALL
TO authenticated
USING (
  public.can_lancar_iro_manual(public.get_guarda_municipal_setor_id())
)
WITH CHECK (
  public.can_lancar_iro_manual(public.get_guarda_municipal_setor_id())
);

-- Toda candidatura comum passa pelo RPC candidatar_se_iro, que valida o
-- usuario autenticado, elegibilidade, vagas e limite mensal. Sem esta
-- politica, nao e possivel forjar horas/status por INSERT direto no REST.
DROP POLICY IF EXISTS "Users can insert own iro_candidaturas" ON public.iro_candidaturas;

REVOKE ALL ON FUNCTION public.candidatar_se_iro(uuid, uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.candidatar_se_iro(uuid, uuid, date) TO authenticated;
