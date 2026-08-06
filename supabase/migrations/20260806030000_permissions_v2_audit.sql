-- =====================================================
-- Permissions V2 - Auditoria de divergencia (prova de zero regressao)
-- Fase 4. Nao altera comportamento (flag ainda off).
-- Compara motor novo x legado para cada usuario real x cada
-- codigo do catalogo, impersonando o usuario via
-- set_config('request.jwt.claims', ...).
-- Reversivel: DROP FUNCTION public.auditar_permissoes_v2(uuid);
-- =====================================================
CREATE OR REPLACE FUNCTION public.auditar_permissoes_v2(p_setor_id uuid DEFAULT NULL)
RETURNS TABLE (
  user_id uuid, email text, setor_slug text, papel text,
  codigo text, resultado_legado boolean, resultado_novo boolean, divergiu boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_claims_original text := nullif(current_setting('request.jwt.claims', true), '');
  v_user RECORD;
  v_perm RECORD;
  v_legado boolean;
  v_novo boolean;
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Somente super admin pode executar a auditoria.';
  END IF;

  FOR v_user IN
    SELECT au.id AS user_id, au.email, s.slug AS setor_slug, pu.papel::text AS papel
    FROM public.perfis_usuarios pu
    JOIN auth.users au ON au.id = pu.user_id
    JOIN public.setores s ON s.id = pu.setor_id
    WHERE pu.ativo AND s.ativo
      AND (p_setor_id IS NULL OR s.id = p_setor_id)
    ORDER BY s.slug, au.email
  LOOP
    PERFORM set_config(
      'request.jwt.claims',
      jsonb_build_object('sub', v_user.user_id::text, 'role', 'authenticated')::text,
      true
    );

    FOR v_perm IN
      SELECT codigo FROM public.permissoes_sistema WHERE ativo ORDER BY codigo
    LOOP
      v_legado := public.legacy_tem_permissao(v_perm.codigo);
      v_novo   := public.tem_permissao(v_perm.codigo);
      user_id          := v_user.user_id;
      email            := v_user.email;
      setor_slug       := v_user.setor_slug;
      papel            := v_user.papel;
      codigo           := v_perm.codigo;
      resultado_legado := v_legado;
      resultado_novo   := v_novo;
      divergiu         := (v_legado IS DISTINCT FROM v_novo);
      RETURN NEXT;
    END LOOP;
  END LOOP;

  PERFORM set_config('request.jwt.claims', coalesce(v_claims_original, ''), true);
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('request.jwt.claims', coalesce(v_claims_original, ''), true);
  RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.auditar_permissoes_v2(uuid) TO authenticated;
