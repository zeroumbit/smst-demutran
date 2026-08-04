-- Restrição estrita: SOMENTE o perfil 'professor' da Jovem Guarda pode fazer/editar chamada (frequência).
-- Perfis administrativos (gestor, administrativo, multiprofissional) podem visualizar os diários e frequências, mas NÃO podem fazer chamada.

CREATE OR REPLACE FUNCTION public.jgc_tem_permissao(_permissao text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN _permissao IN ('jovem_guarda.frequencia.registrar', 'jovem_guarda.frequencia.editar') THEN
        public.jgc_perfil_atual() = 'professor'
      ELSE
        (
          public.is_super_admin()
          OR public.jgc_perfil_atual() = 'gestor'
          OR (
            public.jgc_perfil_atual() = 'multiprofissional'
            AND _permissao = ANY (ARRAY[
              'jovem_guarda.acompanhamento.visualizar',
              'jovem_guarda.acompanhamento.criar',
              'jovem_guarda.acompanhamento.editar'
            ])
          )
          OR EXISTS (
            SELECT 1
            FROM auth.users au
            JOIN public.perfis_usuarios pu ON pu.user_id=au.id AND pu.ativo
            JOIN public.setores s ON s.id=pu.setor_id AND s.slug='jovem-guarda'
            WHERE au.id=auth.uid()
              AND (
                coalesce(au.raw_app_meta_data->'modulos','[]'::jsonb) ? _permissao
                OR (
                  _permissao LIKE 'jovem_guarda.acompanhamento.%'
                  AND coalesce(au.raw_app_meta_data->'modulos','[]'::jsonb)
                      ? replace(_permissao, 'jovem_guarda.acompanhamento.', 'jovem_guarda.acompanhamentos.')
                )
              )
          )
        )
    END;
$$;

GRANT EXECUTE ON FUNCTION public.jgc_tem_permissao(text) TO authenticated;
