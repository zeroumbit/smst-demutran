-- Permite exclusao definitiva de IRO extra por gestor/administrativo da Guarda,
-- preservando auditoria mesmo apos remover a candidatura manual.

ALTER TABLE public.iro_auditoria_manual
  DROP CONSTRAINT IF EXISTS iro_auditoria_manual_candidatura_id_fkey;

ALTER TABLE public.iro_auditoria_manual
  ALTER COLUMN candidatura_id DROP NOT NULL;

ALTER TABLE public.iro_auditoria_manual
  ADD CONSTRAINT iro_auditoria_manual_candidatura_id_fkey
  FOREIGN KEY (candidatura_id)
  REFERENCES public.iro_candidaturas(id)
  ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.excluir_iro_extra(
  p_candidatura_id uuid,
  p_motivo text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_candidatura public.iro_candidaturas%ROWTYPE;
  v_perfil_id uuid;
  v_motivo text;
  v_banco_resultado jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado.';
  END IF;

  IF NOT public.can_manage_iro_extra_guarda() THEN
    RAISE EXCEPTION 'Sem permissao para excluir IRO extra.';
  END IF;

  SELECT *
  INTO v_candidatura
  FROM public.iro_candidaturas
  WHERE id = p_candidatura_id
    AND adicionado_manual = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'IRO extra nao encontrada.';
  END IF;

  SELECT pu.id
  INTO v_perfil_id
  FROM public.perfis_usuarios pu
  WHERE pu.user_id = auth.uid()
    AND pu.ativo = true
  ORDER BY pu.created_at DESC
  LIMIT 1;

  IF v_perfil_id IS NULL THEN
    RAISE EXCEPTION 'Perfil administrativo nao encontrado para registrar a auditoria.';
  END IF;

  v_motivo := COALESCE(NULLIF(trim(p_motivo), ''), 'Exclusao de IRO extra pela gestao da Guarda.');

  INSERT INTO public.iro_auditoria_manual (
    candidatura_id,
    gestor_id,
    guarda_id,
    operacao_id,
    motivo,
    horas_adicionadas,
    data_referencia,
    operacao_nome
  )
  VALUES (
    v_candidatura.id,
    v_perfil_id,
    v_candidatura.usuario_id,
    v_candidatura.operacao_id,
    v_motivo,
    -v_candidatura.horas_trabalhadas,
    v_candidatura.data_operacao,
    v_candidatura.operacao_nome
  );

  INSERT INTO public.iro_notificacoes (
    usuario_id,
    titulo,
    mensagem,
    tipo,
    link
  )
  VALUES (
    v_candidatura.usuario_id,
    'IRO Extra Excluida',
    'Sua IRO extra de ' || to_char(v_candidatura.data_operacao, 'DD/MM/YYYY') ||
      ' foi excluida pela gestao da Guarda. Motivo: ' || v_motivo,
    'manual',
    '/admin/perfil-guardas/guarda-municipal/iros/historico'
  );

  PERFORM set_config('app.iro_manual_rpc', 'on', true);

  DELETE FROM public.iro_candidaturas
  WHERE id = v_candidatura.id;

  v_banco_resultado := public.recalcular_banco_horas_iro_total(v_candidatura.usuario_id);

  RETURN jsonb_build_object(
    'sucesso', true,
    'candidatura_id', v_candidatura.id,
    'banco_horas', v_banco_resultado->>'banco_horas',
    'mensagem', 'IRO extra excluida com sucesso.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.excluir_iro_extra(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.excluir_iro_extra(uuid, text) TO authenticated;
