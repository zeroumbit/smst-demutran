ALTER TABLE public.noticias
  ADD COLUMN IF NOT EXISTS setor_id uuid REFERENCES public.setores(id) ON DELETE SET NULL;

ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS setor_id uuid REFERENCES public.setores(id) ON DELETE SET NULL;

ALTER TABLE public.galeria_fotos
  ADD COLUMN IF NOT EXISTS setor_id uuid REFERENCES public.setores(id) ON DELETE SET NULL;

ALTER TABLE public.documentos
  ADD COLUMN IF NOT EXISTS setor_id uuid REFERENCES public.setores(id) ON DELETE SET NULL;

ALTER TABLE public.equipe
  ADD COLUMN IF NOT EXISTS setor_id uuid REFERENCES public.setores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS noticias_setor_idx ON public.noticias (setor_id);
CREATE INDEX IF NOT EXISTS eventos_setor_idx ON public.eventos (setor_id);
CREATE INDEX IF NOT EXISTS galeria_fotos_setor_idx ON public.galeria_fotos (setor_id);
CREATE INDEX IF NOT EXISTS documentos_setor_idx ON public.documentos (setor_id);
CREATE INDEX IF NOT EXISTS equipe_setor_id_idx ON public.equipe (setor_id);

UPDATE public.noticias n
SET setor_id = s.id
FROM public.setores s
WHERE n.setor_id IS NULL
  AND s.slug = 'demutran'
  AND (
    lower(n.titulo) LIKE '%demutran%'
    OR lower(n.resumo) LIKE '%demutran%'
  );

UPDATE public.eventos e
SET setor_id = s.id
FROM public.setores s
WHERE e.setor_id IS NULL
  AND s.slug = 'demutran'
  AND lower(coalesce(e.local, '')) LIKE '%demutran%';

UPDATE public.galeria_fotos g
SET setor_id = s.id
FROM public.setores s
WHERE g.setor_id IS NULL
  AND (
    g.categoria = s.slug
    OR g.pagina_exibicao = s.slug
  );

UPDATE public.documentos d
SET setor_id = s.id
FROM public.setores s
WHERE d.setor_id IS NULL
  AND d.local_exibicao = s.slug;

UPDATE public.equipe eq
SET setor_id = s.id
FROM public.setores s
WHERE eq.setor_id IS NULL
  AND (
    eq.pagina_destino = s.slug
    OR lower(coalesce(eq.setor, '')) = lower(s.nome)
    OR lower(coalesce(eq.setor, '')) = replace(lower(s.slug), '-', ' ')
    OR lower(coalesce(eq.setor, '')) = lower(s.slug)
  );

CREATE OR REPLACE FUNCTION public.can_manage_setor_content(_setor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_super_admin()
    OR (
      _setor_id IS NOT NULL
      AND public.is_admin_of_setor(_setor_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.can_view_setor_content(_setor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _setor_id IS NULL
    OR public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.perfis_usuarios pu
      WHERE pu.user_id = auth.uid()
        AND pu.setor_id = _setor_id
        AND pu.ativo = true
    );
$$;

DROP POLICY IF EXISTS "Sector admins can manage noticias" ON public.noticias;
CREATE POLICY "Sector admins can manage noticias"
ON public.noticias
FOR ALL
TO authenticated
USING (public.can_manage_setor_content(setor_id))
WITH CHECK (public.can_manage_setor_content(setor_id));

DROP POLICY IF EXISTS "Sector admins can manage eventos" ON public.eventos;
CREATE POLICY "Sector admins can manage eventos"
ON public.eventos
FOR ALL
TO authenticated
USING (public.can_manage_setor_content(setor_id))
WITH CHECK (public.can_manage_setor_content(setor_id));

DROP POLICY IF EXISTS "Sector admins can manage galeria_fotos" ON public.galeria_fotos;
CREATE POLICY "Sector admins can manage galeria_fotos"
ON public.galeria_fotos
FOR ALL
TO authenticated
USING (public.can_manage_setor_content(setor_id))
WITH CHECK (public.can_manage_setor_content(setor_id));

DROP POLICY IF EXISTS "Sector admins can manage documentos" ON public.documentos;
CREATE POLICY "Sector admins can manage documentos"
ON public.documentos
FOR ALL
TO authenticated
USING (public.can_manage_setor_content(setor_id))
WITH CHECK (public.can_manage_setor_content(setor_id));

DROP POLICY IF EXISTS "Sector admins can manage equipe" ON public.equipe;
CREATE POLICY "Sector admins can manage equipe"
ON public.equipe
FOR ALL
TO authenticated
USING (public.can_manage_setor_content(setor_id))
WITH CHECK (public.can_manage_setor_content(setor_id));

GRANT EXECUTE ON FUNCTION public.can_manage_setor_content(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_setor_content(uuid) TO authenticated;
