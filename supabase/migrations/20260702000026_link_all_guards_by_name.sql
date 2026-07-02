-- Link user accounts to guard functional profiles by name match
INSERT INTO public.guardas_usuarios (usuario_id, guarda_id)
SELECT u.id, gm.id
FROM auth.users u
JOIN public.guardas_municipais gm ON (
  lower(trim(coalesce(u.raw_user_meta_data->>'full_name', ''))) = lower(trim(gm.nome))
  OR lower(trim(coalesce(u.raw_user_meta_data->>'name', ''))) = lower(trim(gm.nome))
)
WHERE (u.raw_user_meta_data->>'tipo' = 'guarda_municipal' OR u.email LIKE '%guardamunicipal.sistema')
  AND NOT EXISTS (
    SELECT 1 FROM public.guardas_usuarios gu
    WHERE gu.usuario_id = u.id
  );
