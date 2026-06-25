-- =====================================================
-- Migration: Solicitacao de alteracao de veiculo
-- Descricao: Concessionario solicita troca de veiculo/
--           placa, gerando notificacao para admin.
-- =====================================================

-- 1. Tabela de solicitacoes de alteracao
CREATE TABLE IF NOT EXISTS public.demutran_concessionario_alteracoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  concessionario_id UUID NOT NULL REFERENCES public.demutran_concessionarios(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL DEFAULT 'troca_veiculo',
  dados_anteriores JSONB,
  dados_novos JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente',
  observacao_admin TEXT,
  analisado_por UUID REFERENCES auth.users(id),
  analisado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alteracoes_concessionario
  ON public.demutran_concessionario_alteracoes (concessionario_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alteracoes_status
  ON public.demutran_concessionario_alteracoes (status);

ALTER TABLE public.demutran_concessionario_alteracoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins full access alteracoes" ON public.demutran_concessionario_alteracoes;
CREATE POLICY "Admins full access alteracoes" ON public.demutran_concessionario_alteracoes
  FOR ALL TO authenticated
  USING (public.can_manage_demutran_content(
    (SELECT setor_id FROM public.demutran_concessionarios WHERE id = concessionario_id)
  ))
  WITH CHECK (public.can_manage_demutran_content(
    (SELECT setor_id FROM public.demutran_concessionarios WHERE id = concessionario_id)
  ));

DROP POLICY IF EXISTS "Concessionario view own alteracoes" ON public.demutran_concessionario_alteracoes;
CREATE POLICY "Concessionario view own alteracoes" ON public.demutran_concessionario_alteracoes
  FOR SELECT TO anon, authenticated
  USING (
    concessionario_id IN (
      SELECT s.concessionario_id
      FROM public.demutran_concessionario_sessoes s
      WHERE s.token = current_setting('app.session_token', true)::uuid
        AND s.expires_at > now()
    )
  );

-- 2. RPC: Concessionario solicita troca de veiculo
CREATE OR REPLACE FUNCTION public.solicitar_troca_veiculo(
  _session_token uuid,
  _veiculo text,
  _placa text,
  _fabricacao text DEFAULT NULL,
  _rota text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_session public.demutran_concessionario_sessoes%ROWTYPE;
  v_concessionario public.demutran_concessionarios%ROWTYPE;
  v_dados_anteriores jsonb;
  v_dados_novos jsonb;
  v_alteracao_id uuid;
  v_admin_count int;
BEGIN
  -- Valida sessao
  SELECT *
  INTO v_session
  FROM public.demutran_concessionario_sessoes
  WHERE token = _session_token
    AND expires_at > now()
  LIMIT 1;

  IF v_session.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Sessao invalida.');
  END IF;

  -- Busca dados atuais
  SELECT *
  INTO v_concessionario
  FROM public.demutran_concessionarios
  WHERE id = v_session.concessionario_id;

  IF v_concessionario.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Concessionario nao encontrado.');
  END IF;

  -- Monta JSONs
  v_dados_anteriores := jsonb_build_object(
    'veiculo', v_concessionario.veiculo,
    'placa', v_concessionario.placa,
    'fabricacao', v_concessionario.fabricacao,
    'rota', v_concessionario.rota
  );

  v_dados_novos := jsonb_build_object(
    'veiculo', NULLIF(trim(_veiculo), ''),
    'placa', NULLIF(upper(regexp_replace(trim(coalesce(_placa, '')), '[^A-Z0-9-]', '', 'g')), ''),
    'fabricacao', NULLIF(trim(coalesce(_fabricacao, '')), ''),
    'rota', NULLIF(trim(coalesce(_rota, '')), '')
  );

  -- Insere solicitacao
  INSERT INTO public.demutran_concessionario_alteracoes (concessionario_id, tipo, dados_anteriores, dados_novos, status)
  VALUES (v_concessionario.id, 'troca_veiculo', v_dados_anteriores, v_dados_novos, 'pendente')
  RETURNING id INTO v_alteracao_id;

  -- Notifica o concessionario
  INSERT INTO public.demutran_concessionario_notificacoes (concessionario_id, titulo, mensagem, tipo)
  VALUES (
    v_concessionario.id,
    'Solicitacao de alteracao de veiculo enviada',
    'Sua solicitacao de alteracao de veiculo foi recebida pelo DEMUTRAN. A analise pode gerar uma nova taxa de transferencia. Acompanhe o status pelo portal.',
    'geral'
  );

  -- Notifica os administradores do setor DEMUTRAN
  INSERT INTO public.admin_notifications (user_id, titulo, mensagem, tipo, link)
  SELECT
    pu.user_id,
    'Troca de veiculo solicitada',
    'O concessionario ' || coalesce(v_concessionario.titular_nome, 'desconhecido') || ' (placa atual: ' || coalesce(v_concessionario.placa, '-') || ') solicitou alteracao para ' || coalesce(v_dados_novos->>'placa', '-') || '.',
    'warning',
    '/admin/demutran/concessionarios'
  FROM public.perfis_usuarios pu
  WHERE pu.setor_id = v_concessionario.setor_id
    AND pu.ativo = true;

  GET DIAGNOSTICS v_admin_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'alteracao_id', v_alteracao_id,
    'admin_notificados', v_admin_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.solicitar_troca_veiculo(uuid, text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.solicitar_troca_veiculo(uuid, text, text, text, text) TO authenticated;

-- 3. RPC: Listar solicitacoes pendentes do concessionario
CREATE OR REPLACE FUNCTION public.listar_minhas_alteracoes(
  _session_token uuid
)
RETURNS TABLE (
  id uuid,
  tipo text,
  dados_anteriores jsonb,
  dados_novos jsonb,
  status text,
  observacao_admin text,
  created_at timestamptz,
  analisado_em timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_concessionario_id uuid;
BEGIN
  SELECT concessionario_id
  INTO v_concessionario_id
  FROM public.demutran_concessionario_sessoes
  WHERE token = _session_token
    AND expires_at > now()
  LIMIT 1;

  IF v_concessionario_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT a.id, a.tipo::text, a.dados_anteriores, a.dados_novos, a.status::text, a.observacao_admin, a.created_at, a.analisado_em
  FROM public.demutran_concessionario_alteracoes a
  WHERE a.concessionario_id = v_concessionario_id
  ORDER BY a.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.listar_minhas_alteracoes(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.listar_minhas_alteracoes(uuid) TO authenticated;

-- 4. RPC: Admin aprova/rejeita solicitacao
CREATE OR REPLACE FUNCTION public.aprovar_alteracao_concessionario(
  _alteracao_id uuid,
  _aprovar boolean,
  _observacao text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_alteracao public.demutran_concessionario_alteracoes%ROWTYPE;
  v_concessionario public.demutran_concessionarios%ROWTYPE;
BEGIN
  SELECT *
  INTO v_alteracao
  FROM public.demutran_concessionario_alteracoes
  WHERE id = _alteracao_id;

  IF v_alteracao.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Solicitacao nao encontrada.');
  END IF;

  IF NOT public.can_manage_demutran_content(
    (SELECT setor_id FROM public.demutran_concessionarios WHERE id = v_alteracao.concessionario_id)
  ) THEN
    RETURN jsonb_build_object('error', 'Sem permissao.');
  END IF;

  IF _aprovar THEN
    UPDATE public.demutran_concessionarios
    SET
      veiculo = v_alteracao.dados_novos->>'veiculo',
      placa = v_alteracao.dados_novos->>'placa',
      fabricacao = v_alteracao.dados_novos->>'fabricacao',
      rota = v_alteracao.dados_novos->>'rota',
      updated_at = now()
    WHERE id = v_alteracao.concessionario_id;
  END IF;

  UPDATE public.demutran_concessionario_alteracoes
  SET
    status = CASE WHEN _aprovar THEN 'aprovado' ELSE 'rejeitado' END,
    observacao_admin = _observacao,
    analisado_por = auth.uid(),
    analisado_em = now(),
    updated_at = now()
  WHERE id = _alteracao_id;

  -- Notifica concessionario
  INSERT INTO public.demutran_concessionario_notificacoes (concessionario_id, titulo, mensagem, tipo)
  VALUES (
    v_alteracao.concessionario_id,
    CASE WHEN _aprovar THEN 'Alteracao de veiculo aprovada' ELSE 'Alteracao de veiculo rejeitada' END,
    CASE WHEN _aprovar
      THEN 'Sua solicitacao de troca de veiculo foi aprovada pelo DEMUTRAN. Os dados foram atualizados.'
      ELSE 'Sua solicitacao de troca de veiculo foi rejeitada.' || CASE WHEN _observacao IS NOT NULL THEN ' Motivo: ' || _observacao ELSE '' END
    END,
    CASE WHEN _aprovar THEN 'success' ELSE 'error' END
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.aprovar_alteracao_concessionario(uuid, boolean, text) TO authenticated;
