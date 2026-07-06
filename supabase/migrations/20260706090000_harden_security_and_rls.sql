-- 1. Flexibilizar can_manage_setor_content para incluir técnicos ativos do setor correspondente
CREATE OR REPLACE FUNCTION public.can_manage_setor_content(_setor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT (
      public.is_super_admin()
      AND (
        _setor_id IS NULL
        OR _setor_id <> public.get_demutran_setor_id()
      )
    )
    OR (
      _setor_id IS NOT NULL
      AND (
        public.is_admin_of_setor(_setor_id)
        OR EXISTS (
          SELECT 1
          FROM public.perfis_usuarios pu
          WHERE pu.user_id = auth.uid()
            AND pu.setor_id = _setor_id
            AND pu.papel = 'tecnico'::public.papel_usuario
            AND pu.ativo = true
        )
      )
    );
$$;

-- 2. Permitir que o próprio guarda possa visualizar e atualizar seu perfil cadastral
DROP POLICY IF EXISTS "Guardas can manage guardas municipais" ON public.guardas_municipais;

CREATE POLICY "Guardas can manage guardas municipais"
ON public.guardas_municipais
FOR ALL
TO authenticated
USING (
  public.is_super_admin()
  OR public.is_admin_of_setor(public.get_guarda_municipal_setor_id())
  OR EXISTS (
    SELECT 1 FROM public.perfis_usuarios pu
    WHERE pu.user_id = auth.uid()
      AND pu.ativo = true
      AND pu.papel = 'tecnico'::public.papel_usuario
      AND pu.setor_id = public.get_guarda_municipal_setor_id()
  )
  -- Permite que o próprio guarda leia e edite seus dados
  OR EXISTS (
    SELECT 1 FROM public.guardas_usuarios gu
    WHERE gu.guarda_id = guardas_municipais.id
      AND gu.usuario_id = auth.uid()
  )
)
WITH CHECK (
  public.is_super_admin()
  OR public.is_admin_of_setor(public.get_guarda_municipal_setor_id())
  OR EXISTS (
    SELECT 1 FROM public.perfis_usuarios pu
    WHERE pu.user_id = auth.uid()
      AND pu.ativo = true
      AND pu.papel = 'tecnico'::public.papel_usuario
      AND pu.setor_id = public.get_guarda_municipal_setor_id()
  )
  -- Permite que o próprio guarda atualize seus dados
  OR EXISTS (
    SELECT 1 FROM public.guardas_usuarios gu
    WHERE gu.guarda_id = guardas_municipais.id
      AND gu.usuario_id = auth.uid()
  )
);

-- 3. Adicionar coluna setor_id na tabela fala_secretarias se não existir
ALTER TABLE public.fala_secretarias
  ADD COLUMN IF NOT EXISTS setor_id uuid REFERENCES public.setores(id) ON DELETE SET NULL;

-- 4. Backfill das secretarias do Fala Cidadão para seus respectivos setores
UPDATE public.fala_secretarias
SET setor_id = (SELECT id FROM public.setores WHERE slug = 'demutran' LIMIT 1)
WHERE sigla = 'DEMUTRAN';

UPDATE public.fala_secretarias
SET setor_id = (SELECT id FROM public.setores WHERE slug = 'guarda-municipal' LIMIT 1)
WHERE sigla IN ('GM', 'GC', 'JOVEM', 'ROPE', 'GMAM', 'GSU');

UPDATE public.fala_secretarias
SET setor_id = (SELECT id FROM public.setores WHERE slug = 'defesa-civil' LIMIT 1)
WHERE sigla = 'DCIV';

-- 5. Atualizar as políticas de RLS de fala_demandas para filtrar por setor_id do perfil do usuário
DROP POLICY IF EXISTS "Admin can view fala demandas" ON public.fala_demandas;
CREATE POLICY "Admin can view fala demandas"
ON public.fala_demandas
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.perfis_usuarios pu
    JOIN public.fala_secretarias fs ON fs.setor_id = pu.setor_id
    WHERE pu.user_id = auth.uid()
      AND pu.ativo = true
      AND fs.id = fala_demandas.secretaria_atual_id
      AND pu.papel IN ('gestor', 'admin_setor', 'tecnico')
  )
);

DROP POLICY IF EXISTS "Admin can update fala demandas" ON public.fala_demandas;
CREATE POLICY "Admin can update fala demandas"
ON public.fala_demandas
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.perfis_usuarios pu
    JOIN public.fala_secretarias fs ON fs.setor_id = pu.setor_id
    WHERE pu.user_id = auth.uid()
      AND pu.ativo = true
      AND fs.id = fala_demandas.secretaria_atual_id
      AND pu.papel IN ('gestor', 'admin_setor', 'tecnico')
  )
)
WITH CHECK (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.perfis_usuarios pu
    JOIN public.fala_secretarias fs ON fs.setor_id = pu.setor_id
    WHERE pu.user_id = auth.uid()
      AND pu.ativo = true
      AND fs.id = fala_demandas.secretaria_atual_id
      AND pu.papel IN ('gestor', 'admin_setor', 'tecnico')
  )
);

-- 6. Adicionar política de cancelamento próprio de IRO respeitando o prazo de 24 horas
DROP POLICY IF EXISTS "Users can update own iro_candidaturas" ON public.iro_candidaturas;

CREATE POLICY "Users can update own iro_candidaturas"
ON public.iro_candidaturas
FOR UPDATE
TO authenticated
USING (
  usuario_id = auth.uid()
  AND data_operacao > current_date + interval '1 day'
)
WITH CHECK (
  usuario_id = auth.uid()
  AND data_operacao > current_date + interval '1 day'
  AND status = 'cancelado'
);
