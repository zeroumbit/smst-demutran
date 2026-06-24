-- Admin Notifications System
-- Tabela para notificacoes dos administradores

CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  mensagem text NOT NULL,
  tipo text NOT NULL DEFAULT 'info',
  link text,
  created_at timestamptz NOT NULL DEFAULT now(),
  lida_em timestamptz
);

CREATE INDEX IF NOT EXISTS admin_notifications_user_idx
  ON public.admin_notifications (user_id, created_at DESC);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.admin_notifications;
CREATE POLICY "Users can view own notifications"
ON public.admin_notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON public.admin_notifications;
CREATE POLICY "Users can update own notifications"
ON public.admin_notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can insert notifications" ON public.admin_notifications;
CREATE POLICY "Admins can insert notifications"
ON public.admin_notifications
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.perfis_usuarios
    WHERE user_id = auth.uid()
      AND ativo = true
  )
);

-- Funcao para criar notificacao para um usuario especifico
CREATE OR REPLACE FUNCTION public.criar_notificacao_admin(
  _user_id uuid,
  _titulo text,
  _mensagem text,
  _tipo text DEFAULT 'info',
  _link text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_notificacao_id uuid;
BEGIN
  INSERT INTO public.admin_notifications (user_id, titulo, mensagem, tipo, link)
  VALUES (_user_id, _titulo, _mensagem, _tipo, _link)
  RETURNING id INTO v_notificacao_id;

  RETURN v_notificacao_id;
END;
$$;

-- Funcao para criar notificacao para multiplos usuarios (ex: todos admins de um setor)
CREATE OR REPLACE FUNCTION public.criar_notificacao_admins_setor(
  _setor_id uuid,
  _titulo text,
  _mensagem text,
  _tipo text DEFAULT 'info',
  _link text DEFAULT NULL
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count int := 0;
BEGIN
  INSERT INTO public.admin_notifications (user_id, titulo, mensagem, tipo, link)
  SELECT pu.user_id, _titulo, _mensagem, _tipo, _link
  FROM public.perfis_usuarios pu
  WHERE pu.setor_id = _setor_id
    AND pu.ativo = true;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Funcao para marcar notificacao como lida
CREATE OR REPLACE FUNCTION public.marcar_notificacao_admin_lida(
  _notificacao_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.admin_notifications
  SET lida_em = now()
  WHERE id = _notificacao_id
    AND user_id = auth.uid()
    AND lida_em IS NULL;

  RETURN FOUND;
END;
$$;

-- Funcao para marcar todas as notificacoes do usuario como lidas
CREATE OR REPLACE FUNCTION public.marcar_todas_notificacoes_admin_lidas()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count int;
BEGIN
  UPDATE public.admin_notifications
  SET lida_em = now()
  WHERE user_id = auth.uid()
    AND lida_em IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Funcao para contar notificacoes nao lidas
CREATE OR REPLACE FUNCTION public.contar_notificacoes_admin_nao_lidas()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.admin_notifications
  WHERE user_id = auth.uid()
    AND lida_em IS NULL;

  RETURN v_count;
END;
$$;
