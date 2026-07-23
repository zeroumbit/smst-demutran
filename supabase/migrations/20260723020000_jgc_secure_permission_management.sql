-- Escrita segura e auditada das permissoes do Jovem Guarda.
CREATE OR REPLACE FUNCTION public.update_profile_jgc_permissions(
  _user_id uuid,
  _permissoes jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE
  _target_setor uuid;
  _requester_setor uuid;
  _old jsonb;
  _normalized jsonb := '[]'::jsonb;
  _modules jsonb := '[]'::jsonb;
  _item text;
  _module text;
  _view_permission text;
  _allowed constant text[] := ARRAY[
    'jovem_guarda.dashboard.visualizar',
    'jovem_guarda.alunos.visualizar','jovem_guarda.alunos.criar','jovem_guarda.alunos.editar','jovem_guarda.alunos.inativar',
    'jovem_guarda.responsaveis.visualizar','jovem_guarda.responsaveis.criar','jovem_guarda.responsaveis.editar',
    'jovem_guarda.turmas.visualizar','jovem_guarda.turmas.criar','jovem_guarda.turmas.editar','jovem_guarda.turmas.gerenciar_alunos',
    'jovem_guarda.frequencia.visualizar','jovem_guarda.frequencia.registrar','jovem_guarda.frequencia.editar',
    'jovem_guarda.atividades.visualizar','jovem_guarda.atividades.criar','jovem_guarda.atividades.editar','jovem_guarda.atividades.excluir',
    'jovem_guarda.acompanhamento.visualizar','jovem_guarda.acompanhamento.criar','jovem_guarda.acompanhamento.editar',
    'jovem_guarda.relatorios.visualizar','jovem_guarda.relatorios.gerar','jovem_guarda.relatorios.exportar'
  ];
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Usuario nao autenticado.'; END IF;
  SELECT pu.setor_id INTO _target_setor
  FROM public.perfis_usuarios pu JOIN public.setores s ON s.id=pu.setor_id
  WHERE pu.user_id=_user_id AND s.slug='jovem-guarda' LIMIT 1;
  IF _target_setor IS NULL THEN RAISE EXCEPTION 'Usuario do Jovem Guarda nao encontrado.'; END IF;

  IF NOT public.is_super_admin() THEN
    SELECT setor_id INTO _requester_setor FROM public.perfis_usuarios
    WHERE user_id=auth.uid() AND ativo AND papel='gestor' LIMIT 1;
    IF _requester_setor IS DISTINCT FROM _target_setor THEN
      RAISE EXCEPTION 'Sem permissao para alterar este usuario.';
    END IF;
  END IF;

  FOR _item IN SELECT jsonb_array_elements_text(coalesce(_permissoes,'[]'::jsonb))
  LOOP
    IF NOT (_item=ANY(_allowed)) THEN RAISE EXCEPTION 'Permissao invalida: %',_item; END IF;
    _normalized := _normalized || jsonb_build_array(_item);
    _module := split_part(_item,'.',2);
    IF split_part(_item,'.',3)<>'visualizar' THEN
      _view_permission := 'jovem_guarda.'||_module||'.visualizar';
      IF NOT _normalized ? _view_permission THEN _normalized := _normalized || jsonb_build_array(_view_permission); END IF;
    END IF;
  END LOOP;
  SELECT coalesce(jsonb_agg(DISTINCT value),'[]'::jsonb) INTO _normalized FROM jsonb_array_elements_text(_normalized);
  IF jsonb_array_length(_normalized)=0 THEN RAISE EXCEPTION 'Selecione pelo menos um modulo de acesso.'; END IF;

  SELECT coalesce(raw_app_meta_data->'modulos','[]'::jsonb) INTO _old FROM auth.users WHERE id=_user_id;
  FOR _module IN SELECT DISTINCT split_part(value,'.',2) FROM jsonb_array_elements_text(_normalized)
  LOOP
    _modules := _modules || jsonb_build_array(CASE _module
      WHEN 'dashboard' THEN 'jgc_dashboard' WHEN 'alunos' THEN 'jgc_alunos'
      WHEN 'responsaveis' THEN 'jgc_responsaveis' WHEN 'turmas' THEN 'jgc_turmas'
      WHEN 'frequencia' THEN 'jgc_frequencia' WHEN 'atividades' THEN 'jgc_atividades'
      WHEN 'acompanhamento' THEN 'jgc_acompanhamentos' WHEN 'relatorios' THEN 'jgc_relatorios' END);
  END LOOP;
  UPDATE auth.users SET raw_app_meta_data=raw_app_meta_data||jsonb_build_object('modulos',_modules||_normalized),updated_at=now()
  WHERE id=_user_id;

  INSERT INTO public.auditoria_logs(user_id,setor_id,entidade,acao,payload_resumido)
  VALUES(auth.uid(),_target_setor,'jgc_permissoes','update',jsonb_build_object(
    'usuario_alterado',_user_id,'antes',_old,'depois',_modules||_normalized
  ));
  RETURN jsonb_build_object('success',true,'permissoes',_normalized);
END;
$$;
GRANT EXECUTE ON FUNCTION public.update_profile_jgc_permissions(uuid,jsonb) TO authenticated;
