-- Garante que os valores configurados em /admin/configuracoes-guarda-municipal
-- sejam usados nas telas de IRO dos guardas e dos administradores.

DROP POLICY IF EXISTS "Authenticated can view active iro_valores_graduacao" ON public.iro_valores_graduacao;
CREATE POLICY "Authenticated can view active iro_valores_graduacao"
ON public.iro_valores_graduacao
FOR SELECT
TO authenticated
USING (ativo = true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'iro_valores_graduacao'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.iro_valores_graduacao;
  END IF;
END;
$$;
