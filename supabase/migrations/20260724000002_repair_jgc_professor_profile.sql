-- Repara o perfil funcional da professora cuja conta Auth foi provisionada,
-- mas ficou sem o vinculo correspondente em jgc_perfis.
DO $$
DECLARE
  v_user_id constant uuid := '72930023-ad4b-407f-a0a1-8c6316f78f43';
  v_perfil_usuario_id uuid;
BEGIN
  SELECT pu.id
    INTO v_perfil_usuario_id
  FROM public.perfis_usuarios pu
  JOIN public.setores s ON s.id = pu.setor_id
  WHERE pu.user_id = v_user_id
    AND pu.ativo = true
    AND s.slug = 'jovem-guarda'
  ORDER BY pu.created_at ASC
  LIMIT 1;

  IF v_perfil_usuario_id IS NULL THEN
    RAISE EXCEPTION
      'Perfil administrativo ativo do Jovem Guarda não encontrado para o usuário %.',
      v_user_id;
  END IF;

  INSERT INTO public.jgc_perfis (
    perfil_usuario_id,
    perfil,
    area_atuacao,
    ativo
  ) VALUES (
    v_perfil_usuario_id,
    'professor'::public.jgc_perfil,
    NULL,
    true
  )
  ON CONFLICT (perfil_usuario_id) DO UPDATE
  SET perfil = 'professor'::public.jgc_perfil,
      area_atuacao = NULL,
      ativo = true,
      updated_at = now();
END;
$$;
