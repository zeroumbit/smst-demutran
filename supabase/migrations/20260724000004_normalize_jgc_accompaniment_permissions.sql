-- Compatibilidade durante a transicao da chave plural para a chave canonica singular.
CREATE OR REPLACE FUNCTION public.jgc_tem_permissao(_permissao text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_super_admin()
    OR public.jgc_perfil_atual() = 'gestor'
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

CREATE OR REPLACE FUNCTION public.jgc_tem_alguma_permissao(_modulo text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_super_admin()
    OR public.jgc_perfil_atual() = 'gestor'
    OR EXISTS (
      SELECT 1
      FROM auth.users au,
           jsonb_array_elements_text(coalesce(au.raw_app_meta_data->'modulos','[]'::jsonb)) item
      WHERE au.id=auth.uid()
        AND (
          item LIKE 'jovem_guarda.' || _modulo || '.%'
          OR (_modulo='acompanhamento' AND item LIKE 'jovem_guarda.acompanhamentos.%')
        )
    );
$$;

UPDATE auth.users au
SET raw_app_meta_data = au.raw_app_meta_data || jsonb_build_object(
  'modulos', (
    SELECT coalesce(jsonb_agg(DISTINCT normalized.value), '[]'::jsonb)
    FROM jsonb_array_elements_text(coalesce(au.raw_app_meta_data->'modulos','[]'::jsonb)) original(value)
    CROSS JOIN LATERAL (
      SELECT CASE
        WHEN original.value='jgc_acompanhamentos' THEN 'jgc_acompanhamento'
        WHEN original.value LIKE 'jovem_guarda.acompanhamentos.%'
          THEN replace(original.value, 'jovem_guarda.acompanhamentos.', 'jovem_guarda.acompanhamento.')
        ELSE original.value
      END AS value
      UNION ALL
      SELECT 'jovem_guarda.acompanhamento.visualizar'
      WHERE original.value='jgc_acompanhamentos'
      UNION ALL
      SELECT 'jovem_guarda.acompanhamento.criar'
      WHERE original.value='jgc_acompanhamentos'
      UNION ALL
      SELECT 'jovem_guarda.acompanhamento.editar'
      WHERE original.value='jgc_acompanhamentos'
    ) normalized
  )
)
WHERE EXISTS (
  SELECT 1
  FROM jsonb_array_elements_text(coalesce(au.raw_app_meta_data->'modulos','[]'::jsonb)) item(value)
  WHERE item.value='jgc_acompanhamentos'
     OR item.value LIKE 'jovem_guarda.acompanhamentos.%'
);

GRANT EXECUTE ON FUNCTION public.jgc_tem_permissao(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.jgc_tem_alguma_permissao(text) TO authenticated;
