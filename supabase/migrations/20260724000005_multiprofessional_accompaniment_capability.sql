-- Acompanhamento e uma atribuicao funcional obrigatoria do multiprofissional.
-- A regra fica no backend para nao depender somente da exibicao do botao.
CREATE OR REPLACE FUNCTION public.jgc_tem_permissao(_permissao text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_super_admin()
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
    );
$$;

UPDATE auth.users au
SET raw_app_meta_data = au.raw_app_meta_data || jsonb_build_object(
  'modulos', (
    SELECT jsonb_agg(DISTINCT item.value)
    FROM jsonb_array_elements_text(
      coalesce(au.raw_app_meta_data->'modulos','[]'::jsonb)
      || jsonb_build_array(
        'jgc_acompanhamento',
        'jovem_guarda.acompanhamento.visualizar',
        'jovem_guarda.acompanhamento.criar',
        'jovem_guarda.acompanhamento.editar'
      )
    ) item(value)
  )
), updated_at=now()
FROM public.perfis_usuarios pu
JOIN public.setores s ON s.id=pu.setor_id AND s.slug='jovem-guarda'
JOIN public.jgc_perfis jp ON jp.perfil_usuario_id=pu.id
WHERE au.id=pu.user_id
  AND pu.ativo
  AND jp.ativo
  AND jp.perfil='multiprofissional';

GRANT EXECUTE ON FUNCTION public.jgc_tem_permissao(text) TO authenticated;
