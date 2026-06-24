-- Fix RLS policies for all tables to allow inserts and updates for authenticated users

DROP POLICY IF EXISTS "Admin full access noticias" ON public.noticias;
CREATE POLICY "Admin full access noticias" ON public.noticias
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin full access eventos" ON public.eventos;
CREATE POLICY "Admin full access eventos" ON public.eventos
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin full access projetos" ON public.projetos;
CREATE POLICY "Admin full access projetos" ON public.projetos
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin full access galeria_fotos" ON public.galeria_fotos;
CREATE POLICY "Admin full access galeria_fotos" ON public.galeria_fotos
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin full access users" ON public.users;
CREATE POLICY "Admin full access users" ON public.users
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin full access equipe" ON public.equipe;
CREATE POLICY "Admin full access equipe" ON public.equipe
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin full access contatos" ON public.contatos;
CREATE POLICY "Admin full access contatos" ON public.contatos
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');