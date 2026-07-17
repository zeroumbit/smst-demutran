-- =====================================================
-- Migration: Complementos Escalas - Recorrencia, Expiracao e Push
-- =====================================================

ALTER TABLE public.guarda_escala_trocas
  ADD COLUMN IF NOT EXISTS expira_em timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS guarda_escalas_recorrencia_origem_data_unq
  ON public.guarda_escalas (recorrencia_origem_id, data_inicio)
  WHERE recorrencia_origem_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS guarda_escala_trocas_expiracao_idx
  ON public.guarda_escala_trocas (status, expira_em)
  WHERE status IN ('AGUARDANDO_ACEITE', 'AGUARDANDO_APROVACAO');

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  plataforma text,
  ativo boolean NOT NULL DEFAULT true,
  ultimo_uso_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_subscriptions_endpoint_unq UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx
  ON public.push_subscriptions (user_id, ativo);

CREATE TABLE IF NOT EXISTS public.push_notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_notification_id uuid REFERENCES public.admin_notifications(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  mensagem text NOT NULL,
  tipo text NOT NULL DEFAULT 'info',
  link text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'PENDENTE',
  tentativas integer NOT NULL DEFAULT 0,
  ultimo_erro text,
  processado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_notification_queue_status_check CHECK (status IN ('PENDENTE', 'PROCESSANDO', 'ENVIADO', 'ERRO', 'IGNORADO'))
);

CREATE INDEX IF NOT EXISTS push_notification_queue_status_idx
  ON public.push_notification_queue (status, created_at)
  WHERE status IN ('PENDENTE', 'ERRO');

DROP TRIGGER IF EXISTS trigger_atualizar_push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER trigger_atualizar_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

DROP TRIGGER IF EXISTS trigger_atualizar_push_notification_queue_updated_at ON public.push_notification_queue;
CREATE TRIGGER trigger_atualizar_push_notification_queue_updated_at
BEFORE UPDATE ON public.push_notification_queue
FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

CREATE OR REPLACE FUNCTION public.registrar_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text DEFAULT NULL,
  p_plataforma text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Usuario nao autenticado.');
  END IF;

  INSERT INTO public.push_subscriptions (
    user_id,
    endpoint,
    p256dh,
    auth,
    user_agent,
    plataforma,
    ativo,
    ultimo_uso_em
  )
  VALUES (
    auth.uid(),
    trim(p_endpoint),
    p_p256dh,
    p_auth,
    nullif(p_user_agent, ''),
    nullif(p_plataforma, ''),
    true,
    now()
  )
  ON CONFLICT (endpoint) DO UPDATE
  SET user_id = excluded.user_id,
      p256dh = excluded.p256dh,
      auth = excluded.auth,
      user_agent = excluded.user_agent,
      plataforma = excluded.plataforma,
      ativo = true,
      ultimo_uso_em = now();

  RETURN jsonb_build_object('sucesso', true, 'mensagem', 'Inscricao push registrada.');
END;
$$;

CREATE OR REPLACE FUNCTION public.remover_push_subscription(p_endpoint text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.push_subscriptions
  SET ativo = false
  WHERE endpoint = trim(p_endpoint)
    AND user_id = auth.uid();

  RETURN jsonb_build_object('sucesso', true, 'mensagem', 'Inscricao push removida.');
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_push_notification(
  p_user_id uuid,
  p_titulo text,
  p_mensagem text,
  p_tipo text DEFAULT 'info',
  p_link text DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_admin_notification_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.push_notification_queue (
    user_id,
    admin_notification_id,
    titulo,
    mensagem,
    tipo,
    link,
    payload
  )
  VALUES (
    p_user_id,
    p_admin_notification_id,
    p_titulo,
    p_mensagem,
    coalesce(nullif(p_tipo, ''), 'info'),
    p_link,
    coalesce(p_payload, '{}'::jsonb)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.queue_push_from_admin_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.push_subscriptions ps
    WHERE ps.user_id = NEW.user_id
      AND ps.ativo = true
  ) THEN
    PERFORM public.enqueue_push_notification(
      NEW.user_id,
      NEW.titulo,
      NEW.mensagem,
      NEW.tipo,
      NEW.link,
      jsonb_build_object(
        'notificationId', NEW.id,
        'titulo', NEW.titulo,
        'mensagem', NEW.mensagem
      ),
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_queue_push_from_admin_notification ON public.admin_notifications;
CREATE TRIGGER trigger_queue_push_from_admin_notification
AFTER INSERT ON public.admin_notifications
FOR EACH ROW EXECUTE FUNCTION public.queue_push_from_admin_notification();

DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron indisponivel para esta instancia: %', SQLERRM;
  END;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'cron'
      AND p.proname = 'schedule'
  ) THEN
    PERFORM cron.schedule(
      'expirar-trocas-guarda-escalas',
      '*/5 * * * *',
      'SELECT public.expirar_trocas_guarda_escalas();'
    )
    WHERE NOT EXISTS (
      SELECT 1
      FROM cron.job
      WHERE jobname = 'expirar-trocas-guarda-escalas'
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.expirar_trocas_guarda_escalas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer := 0;
  v_troca record;
BEGIN
  FOR v_troca IN
    UPDATE public.guarda_escala_trocas
    SET status = 'EXPIRADA',
        updated_at = now()
    WHERE status IN ('AGUARDANDO_ACEITE', 'AGUARDANDO_APROVACAO')
      AND expira_em IS NOT NULL
      AND expira_em <= now()
    RETURNING id, escala_origem_id, solicitante_guarda_id, destinatario_guarda_id
  LOOP
    v_count := v_count + 1;

    PERFORM public.registrar_guarda_escala_historico(
      v_troca.escala_origem_id,
      v_troca.id,
      NULL,
      'TROCA_EXPIRADA',
      'Solicitacao de troca expirada automaticamente'
    );

    PERFORM public.guarda_escala_notify_guarda(
      v_troca.solicitante_guarda_id,
      'Troca expirada',
      'Uma solicitacao de troca de servico expirou.',
      'warning',
      '/admin/perfil-guardas/guarda-municipal/escalas'
    );

    PERFORM public.guarda_escala_notify_guarda(
      v_troca.destinatario_guarda_id,
      'Troca expirada',
      'Uma solicitacao de troca de servico expirou.',
      'warning',
      '/admin/perfil-guardas/guarda-municipal/escalas'
    );
  END LOOP;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_guarda_escala_troca_expira_em()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_config jsonb;
  v_horas integer := 24;
BEGIN
  SELECT valor INTO v_config
  FROM public.guarda_escala_configuracoes
  WHERE chave = 'trocas';

  v_horas := greatest(1, coalesce((v_config->>'validade_horas')::integer, 24));
  NEW.expira_em := coalesce(NEW.expira_em, NEW.solicitado_em + make_interval(hours => v_horas));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_guarda_escala_troca_expira_em ON public.guarda_escala_trocas;
CREATE TRIGGER trigger_set_guarda_escala_troca_expira_em
BEFORE INSERT ON public.guarda_escala_trocas
FOR EACH ROW EXECUTE FUNCTION public.set_guarda_escala_troca_expira_em();

CREATE OR REPLACE FUNCTION public.gerar_recorrencias_guarda_escala(
  p_escala_id uuid,
  p_limite integer DEFAULT 180
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_base public.guarda_escalas%ROWTYPE;
  v_count integer := 0;
  v_max integer := least(greatest(coalesce(p_limite, 180), 1), 180);
  v_config jsonb;
  v_intervalo integer;
  v_ate date;
  v_quantidade integer;
  v_dias integer[];
  v_horas integer;
  v_next_inicio timestamptz;
  v_next_fim timestamptz;
  v_new_id uuid;
BEGIN
  IF NOT public.can_manage_guarda_escalas() THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Sem permissao.');
  END IF;

  SELECT * INTO v_base
  FROM public.guarda_escalas
  WHERE id = p_escala_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('sucesso', false, 'mensagem', 'Escala base nao encontrada.');
  END IF;

  IF v_base.recorrencia_tipo = 'NAO_REPETIR' THEN
    RETURN jsonb_build_object('sucesso', true, 'mensagem', 'Escala sem recorrencia.', 'geradas', 0);
  END IF;

  v_config := coalesce(v_base.recorrencia_config, '{}'::jsonb);
  v_intervalo := greatest(1, coalesce((v_config->>'intervalo')::integer, 1));
  v_ate := coalesce((v_config->>'ate')::date, (v_base.data_inicio::date + 90));
  v_quantidade := least(v_max, greatest(1, coalesce((v_config->>'quantidade')::integer, v_max)));
  v_horas := greatest(1, coalesce((v_config->>'horas')::integer, 24));

  SELECT array_agg(value::integer)
  INTO v_dias
  FROM jsonb_array_elements_text(coalesce(v_config->'dias_semana', '[]'::jsonb)) AS value;

  IF v_base.recorrencia_tipo = 'DIARIA' THEN
    v_next_inicio := v_base.data_inicio + make_interval(days => v_intervalo);
  ELSIF v_base.recorrencia_tipo = 'SEMANAL' THEN
    v_next_inicio := v_base.data_inicio + make_interval(days => 7 * v_intervalo);
  ELSIF v_base.recorrencia_tipo = 'CICLO_HORAS' THEN
    v_next_inicio := v_base.data_inicio + make_interval(hours => v_horas);
  ELSE
    v_next_inicio := v_base.data_inicio + interval '1 day';
  END IF;

  WHILE v_count < v_quantidade
    AND v_next_inicio::date <= v_ate
  LOOP
    IF v_base.recorrencia_tipo = 'DIAS_SEMANA'
      AND coalesce(array_length(v_dias, 1), 0) > 0
      AND NOT (extract(isodow from v_next_inicio)::integer = ANY(v_dias)) THEN
      v_next_inicio := v_next_inicio + interval '1 day';
      CONTINUE;
    END IF;

    v_next_fim := v_next_inicio + (v_base.data_fim - v_base.data_inicio);

    INSERT INTO public.guarda_escalas (
      setor_id,
      titulo,
      tipo_servico_id,
      descricao,
      observacoes,
      data_inicio,
      data_fim,
      posto_id,
      local_texto,
      ponto_apresentacao,
      area_atuacao,
      equipe_id,
      grupamento,
      status,
      recorrencia_tipo,
      recorrencia_config,
      recorrencia_origem_id,
      criado_por
    )
    VALUES (
      v_base.setor_id,
      v_base.titulo,
      v_base.tipo_servico_id,
      v_base.descricao,
      v_base.observacoes,
      v_next_inicio,
      v_next_fim,
      v_base.posto_id,
      v_base.local_texto,
      v_base.ponto_apresentacao,
      v_base.area_atuacao,
      v_base.equipe_id,
      v_base.grupamento,
      'RASCUNHO',
      'NAO_REPETIR',
      '{}'::jsonb,
      v_base.id,
      auth.uid()
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_new_id;

    IF v_new_id IS NOT NULL THEN
      INSERT INTO public.guarda_escala_agentes (
        escala_id,
        guarda_id,
        funcao,
        observacao,
        conflito_autorizado,
        motivo_conflito,
        created_by
      )
      SELECT
        v_new_id,
        guarda_id,
        funcao,
        observacao,
        conflito_autorizado,
        motivo_conflito,
        auth.uid()
      FROM public.guarda_escala_agentes
      WHERE escala_id = v_base.id
      ON CONFLICT DO NOTHING;

      IF NOT EXISTS (SELECT 1 FROM public.guarda_escala_agentes WHERE escala_id = v_new_id)
        AND v_base.equipe_id IS NOT NULL THEN
        INSERT INTO public.guarda_escala_agentes (
          escala_id,
          guarda_id,
          funcao,
          created_by
        )
        SELECT
          v_new_id,
          mem.guarda_id,
          'Patrulheiro',
          auth.uid()
        FROM public.guarda_equipe_membros mem
        JOIN public.guardas_municipais gm ON gm.id = mem.guarda_id
        WHERE mem.equipe_id = v_base.equipe_id
          AND mem.ativo = true
          AND gm.ativo = true
        ON CONFLICT DO NOTHING;
      END IF;

      INSERT INTO public.guarda_escala_viaturas (
        escala_id,
        veiculo_id,
        observacao,
        created_by
      )
      SELECT
        v_new_id,
        veiculo_id,
        observacao,
        auth.uid()
      FROM public.guarda_escala_viaturas
      WHERE escala_id = v_base.id
      ON CONFLICT DO NOTHING;

      PERFORM public.registrar_guarda_escala_historico(
        v_new_id,
        NULL,
        NULL,
        'ESCALA_RECORRENTE_GERADA',
        'Escala gerada automaticamente por recorrencia',
        jsonb_build_object('origem_id', v_base.id)
      );

      v_count := v_count + 1;
    END IF;

    v_new_id := NULL;

    IF v_base.recorrencia_tipo = 'DIARIA' THEN
      v_next_inicio := v_next_inicio + make_interval(days => v_intervalo);
    ELSIF v_base.recorrencia_tipo = 'SEMANAL' THEN
      v_next_inicio := v_next_inicio + make_interval(days => 7 * v_intervalo);
    ELSIF v_base.recorrencia_tipo = 'CICLO_HORAS' THEN
      v_next_inicio := v_next_inicio + make_interval(hours => v_horas);
    ELSE
      v_next_inicio := v_next_inicio + interval '1 day';
    END IF;
  END LOOP;

  PERFORM public.registrar_guarda_escala_historico(
    v_base.id,
    NULL,
    NULL,
    'RECORRENCIAS_GERADAS',
    'Recorrencias geradas automaticamente',
    jsonb_build_object('geradas', v_count)
  );

  RETURN jsonb_build_object('sucesso', true, 'mensagem', 'Recorrencias geradas.', 'geradas', v_count);
END;
$$;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_notification_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can manage own push subscriptions"
ON public.push_subscriptions
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view push notification queue" ON public.push_notification_queue;
CREATE POLICY "Admins can view push notification queue"
ON public.push_notification_queue
FOR SELECT TO authenticated
USING (public.is_super_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT SELECT ON public.push_notification_queue TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_push_subscription(text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remover_push_subscription(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.expirar_trocas_guarda_escalas() TO authenticated;
GRANT EXECUTE ON FUNCTION public.gerar_recorrencias_guarda_escala(uuid, integer) TO authenticated;

INSERT INTO public.guarda_escala_configuracoes (chave, valor)
VALUES
  ('recorrencias', jsonb_build_object('limite_maximo_ocorrencias', 180, 'horizonte_padrao_dias', 90))
ON CONFLICT (chave) DO UPDATE
SET valor = public.guarda_escala_configuracoes.valor || excluded.valor;

UPDATE public.guarda_escala_configuracoes
SET valor = valor || jsonb_build_object('validade_horas', coalesce((valor->>'validade_horas')::integer, 24))
WHERE chave = 'trocas';

UPDATE public.guarda_escala_trocas
SET expira_em = solicitado_em + make_interval(hours => coalesce((
    SELECT (valor->>'validade_horas')::integer
    FROM public.guarda_escala_configuracoes
    WHERE chave = 'trocas'
  ), 24))
WHERE expira_em IS NULL
  AND status IN ('AGUARDANDO_ACEITE', 'AGUARDANDO_APROVACAO');
