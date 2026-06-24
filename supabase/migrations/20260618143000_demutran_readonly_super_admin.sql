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
      AND public.is_admin_of_setor(_setor_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_demutran_content(_setor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _setor_id IS NOT NULL
    AND _setor_id = public.get_demutran_setor_id()
    AND public.is_admin_of_setor(_setor_id);
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_setor_content(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_demutran_content(uuid) TO authenticated;

DROP POLICY IF EXISTS "Sector admins can manage noticias" ON public.noticias;
DROP POLICY IF EXISTS "Sector members can view noticias" ON public.noticias;
CREATE POLICY "Sector members can view noticias"
ON public.noticias
FOR SELECT
TO authenticated
USING (public.can_view_setor_content(setor_id));
CREATE POLICY "Sector admins can insert noticias"
ON public.noticias
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_setor_content(setor_id));
CREATE POLICY "Sector admins can update noticias"
ON public.noticias
FOR UPDATE
TO authenticated
USING (public.can_manage_setor_content(setor_id))
WITH CHECK (public.can_manage_setor_content(setor_id));
CREATE POLICY "Sector admins can delete noticias"
ON public.noticias
FOR DELETE
TO authenticated
USING (public.can_manage_setor_content(setor_id));

DROP POLICY IF EXISTS "Sector admins can manage eventos" ON public.eventos;
DROP POLICY IF EXISTS "Sector members can view eventos" ON public.eventos;
CREATE POLICY "Sector members can view eventos"
ON public.eventos
FOR SELECT
TO authenticated
USING (public.can_view_setor_content(setor_id));
CREATE POLICY "Sector admins can insert eventos"
ON public.eventos
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_setor_content(setor_id));
CREATE POLICY "Sector admins can update eventos"
ON public.eventos
FOR UPDATE
TO authenticated
USING (public.can_manage_setor_content(setor_id))
WITH CHECK (public.can_manage_setor_content(setor_id));
CREATE POLICY "Sector admins can delete eventos"
ON public.eventos
FOR DELETE
TO authenticated
USING (public.can_manage_setor_content(setor_id));

DROP POLICY IF EXISTS "Sector admins can manage galeria_fotos" ON public.galeria_fotos;
DROP POLICY IF EXISTS "Sector members can view galeria_fotos" ON public.galeria_fotos;
CREATE POLICY "Sector members can view galeria_fotos"
ON public.galeria_fotos
FOR SELECT
TO authenticated
USING (public.can_view_setor_content(setor_id));
CREATE POLICY "Sector admins can insert galeria_fotos"
ON public.galeria_fotos
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_setor_content(setor_id));
CREATE POLICY "Sector admins can update galeria_fotos"
ON public.galeria_fotos
FOR UPDATE
TO authenticated
USING (public.can_manage_setor_content(setor_id))
WITH CHECK (public.can_manage_setor_content(setor_id));
CREATE POLICY "Sector admins can delete galeria_fotos"
ON public.galeria_fotos
FOR DELETE
TO authenticated
USING (public.can_manage_setor_content(setor_id));

DROP POLICY IF EXISTS "Sector admins can manage documentos" ON public.documentos;
DROP POLICY IF EXISTS "Sector members can view documentos" ON public.documentos;
CREATE POLICY "Sector members can view documentos"
ON public.documentos
FOR SELECT
TO authenticated
USING (public.can_view_setor_content(setor_id));
CREATE POLICY "Sector admins can insert documentos"
ON public.documentos
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_setor_content(setor_id));
CREATE POLICY "Sector admins can update documentos"
ON public.documentos
FOR UPDATE
TO authenticated
USING (public.can_manage_setor_content(setor_id))
WITH CHECK (public.can_manage_setor_content(setor_id));
CREATE POLICY "Sector admins can delete documentos"
ON public.documentos
FOR DELETE
TO authenticated
USING (public.can_manage_setor_content(setor_id));

DROP POLICY IF EXISTS "Sector admins can manage equipe" ON public.equipe;
DROP POLICY IF EXISTS "Sector members can view equipe" ON public.equipe;
CREATE POLICY "Sector members can view equipe"
ON public.equipe
FOR SELECT
TO authenticated
USING (public.can_view_setor_content(setor_id));
CREATE POLICY "Sector admins can insert equipe"
ON public.equipe
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_setor_content(setor_id));
CREATE POLICY "Sector admins can update equipe"
ON public.equipe
FOR UPDATE
TO authenticated
USING (public.can_manage_setor_content(setor_id))
WITH CHECK (public.can_manage_setor_content(setor_id));
CREATE POLICY "Sector admins can delete equipe"
ON public.equipe
FOR DELETE
TO authenticated
USING (public.can_manage_setor_content(setor_id));

DROP POLICY IF EXISTS "Admins can manage demutran veiculos municipais" ON public.demutran_veiculos_municipais;
DROP POLICY IF EXISTS "Admins can view demutran veiculos municipais" ON public.demutran_veiculos_municipais;
CREATE POLICY "Admins can view demutran veiculos municipais"
ON public.demutran_veiculos_municipais
FOR SELECT
TO authenticated
USING (public.can_view_setor_content(setor_id));
CREATE POLICY "Admins can insert demutran veiculos municipais"
ON public.demutran_veiculos_municipais
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_demutran_content(setor_id));
CREATE POLICY "Admins can update demutran veiculos municipais"
ON public.demutran_veiculos_municipais
FOR UPDATE
TO authenticated
USING (public.can_manage_demutran_content(setor_id))
WITH CHECK (public.can_manage_demutran_content(setor_id));
CREATE POLICY "Admins can delete demutran veiculos municipais"
ON public.demutran_veiculos_municipais
FOR DELETE
TO authenticated
USING (public.can_manage_demutran_content(setor_id));

DROP POLICY IF EXISTS "Admins can manage demutran credenciais" ON public.demutran_credenciais_solicitacoes;
DROP POLICY IF EXISTS "Admins can view demutran credenciais" ON public.demutran_credenciais_solicitacoes;
CREATE POLICY "Admins can view demutran credenciais"
ON public.demutran_credenciais_solicitacoes
FOR SELECT
TO authenticated
USING (public.can_view_setor_content(setor_id));
CREATE POLICY "Admins can insert demutran credenciais"
ON public.demutran_credenciais_solicitacoes
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_demutran_content(setor_id));
CREATE POLICY "Admins can update demutran credenciais"
ON public.demutran_credenciais_solicitacoes
FOR UPDATE
TO authenticated
USING (public.can_manage_demutran_content(setor_id))
WITH CHECK (public.can_manage_demutran_content(setor_id));
CREATE POLICY "Admins can delete demutran credenciais"
ON public.demutran_credenciais_solicitacoes
FOR DELETE
TO authenticated
USING (public.can_manage_demutran_content(setor_id));

DROP POLICY IF EXISTS "Admins can manage demutran recursos" ON public.demutran_recursos;
DROP POLICY IF EXISTS "Admins can view demutran recursos" ON public.demutran_recursos;
CREATE POLICY "Admins can view demutran recursos"
ON public.demutran_recursos
FOR SELECT
TO authenticated
USING (public.can_view_setor_content(setor_id));
CREATE POLICY "Admins can insert demutran recursos"
ON public.demutran_recursos
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_demutran_content(setor_id));
CREATE POLICY "Admins can update demutran recursos"
ON public.demutran_recursos
FOR UPDATE
TO authenticated
USING (public.can_manage_demutran_content(setor_id))
WITH CHECK (public.can_manage_demutran_content(setor_id));
CREATE POLICY "Admins can delete demutran recursos"
ON public.demutran_recursos
FOR DELETE
TO authenticated
USING (public.can_manage_demutran_content(setor_id));

DROP POLICY IF EXISTS "Admins can manage veiculos recolhidos" ON public.veiculos_recolhidos;
DROP POLICY IF EXISTS "Admins can view veiculos recolhidos" ON public.veiculos_recolhidos;
CREATE POLICY "Admins can view veiculos recolhidos"
ON public.veiculos_recolhidos
FOR SELECT
TO authenticated
USING (public.can_view_setor_content(setor_id));
CREATE POLICY "Admins can insert veiculos recolhidos"
ON public.veiculos_recolhidos
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_demutran_content(setor_id));
CREATE POLICY "Admins can update veiculos recolhidos"
ON public.veiculos_recolhidos
FOR UPDATE
TO authenticated
USING (public.can_manage_demutran_content(setor_id))
WITH CHECK (public.can_manage_demutran_content(setor_id));
CREATE POLICY "Admins can delete veiculos recolhidos"
ON public.veiculos_recolhidos
FOR DELETE
TO authenticated
USING (public.can_manage_demutran_content(setor_id));

DROP POLICY IF EXISTS "Admins can manage demutran concessionarios" ON public.demutran_concessionarios;
DROP POLICY IF EXISTS "Admins can view demutran concessionarios" ON public.demutran_concessionarios;
CREATE POLICY "Admins can view demutran concessionarios"
ON public.demutran_concessionarios
FOR SELECT
TO authenticated
USING (public.can_view_setor_content(setor_id));
CREATE POLICY "Admins can insert demutran concessionarios"
ON public.demutran_concessionarios
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_demutran_content(setor_id));
CREATE POLICY "Admins can update demutran concessionarios"
ON public.demutran_concessionarios
FOR UPDATE
TO authenticated
USING (public.can_manage_demutran_content(setor_id))
WITH CHECK (public.can_manage_demutran_content(setor_id));
CREATE POLICY "Admins can delete demutran concessionarios"
ON public.demutran_concessionarios
FOR DELETE
TO authenticated
USING (public.can_manage_demutran_content(setor_id));

DROP POLICY IF EXISTS "Admins can manage concessionario acessos" ON public.demutran_concessionario_acessos;
DROP POLICY IF EXISTS "Admins can view concessionario acessos" ON public.demutran_concessionario_acessos;
CREATE POLICY "Admins can view concessionario acessos"
ON public.demutran_concessionario_acessos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.demutran_concessionarios dc
    WHERE dc.id = concessionario_id
      AND public.can_view_setor_content(dc.setor_id)
  )
);
CREATE POLICY "Admins can insert concessionario acessos"
ON public.demutran_concessionario_acessos
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.demutran_concessionarios dc
    WHERE dc.id = concessionario_id
      AND public.can_manage_demutran_content(dc.setor_id)
  )
);
CREATE POLICY "Admins can update concessionario acessos"
ON public.demutran_concessionario_acessos
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.demutran_concessionarios dc
    WHERE dc.id = concessionario_id
      AND public.can_manage_demutran_content(dc.setor_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.demutran_concessionarios dc
    WHERE dc.id = concessionario_id
      AND public.can_manage_demutran_content(dc.setor_id)
  )
);
CREATE POLICY "Admins can delete concessionario acessos"
ON public.demutran_concessionario_acessos
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.demutran_concessionarios dc
    WHERE dc.id = concessionario_id
      AND public.can_manage_demutran_content(dc.setor_id)
  )
);

DROP POLICY IF EXISTS "Admins can manage concessionario sessoes" ON public.demutran_concessionario_sessoes;
DROP POLICY IF EXISTS "Admins can view concessionario sessoes" ON public.demutran_concessionario_sessoes;
CREATE POLICY "Admins can view concessionario sessoes"
ON public.demutran_concessionario_sessoes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.demutran_concessionarios dc
    WHERE dc.id = concessionario_id
      AND public.can_view_setor_content(dc.setor_id)
  )
);
CREATE POLICY "Admins can insert concessionario sessoes"
ON public.demutran_concessionario_sessoes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.demutran_concessionarios dc
    WHERE dc.id = concessionario_id
      AND public.can_manage_demutran_content(dc.setor_id)
  )
);
CREATE POLICY "Admins can update concessionario sessoes"
ON public.demutran_concessionario_sessoes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.demutran_concessionarios dc
    WHERE dc.id = concessionario_id
      AND public.can_manage_demutran_content(dc.setor_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.demutran_concessionarios dc
    WHERE dc.id = concessionario_id
      AND public.can_manage_demutran_content(dc.setor_id)
  )
);
CREATE POLICY "Admins can delete concessionario sessoes"
ON public.demutran_concessionario_sessoes
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.demutran_concessionarios dc
    WHERE dc.id = concessionario_id
      AND public.can_manage_demutran_content(dc.setor_id)
  )
);

DROP POLICY IF EXISTS "Admins can manage concessionario notificacoes" ON public.demutran_concessionario_notificacoes;
DROP POLICY IF EXISTS "Admins can view concessionario notificacoes" ON public.demutran_concessionario_notificacoes;
CREATE POLICY "Admins can view concessionario notificacoes"
ON public.demutran_concessionario_notificacoes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.demutran_concessionarios dc
    WHERE dc.id = concessionario_id
      AND public.can_view_setor_content(dc.setor_id)
  )
);
CREATE POLICY "Admins can insert concessionario notificacoes"
ON public.demutran_concessionario_notificacoes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.demutran_concessionarios dc
    WHERE dc.id = concessionario_id
      AND public.can_manage_demutran_content(dc.setor_id)
  )
);
CREATE POLICY "Admins can update concessionario notificacoes"
ON public.demutran_concessionario_notificacoes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.demutran_concessionarios dc
    WHERE dc.id = concessionario_id
      AND public.can_manage_demutran_content(dc.setor_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.demutran_concessionarios dc
    WHERE dc.id = concessionario_id
      AND public.can_manage_demutran_content(dc.setor_id)
  )
);
CREATE POLICY "Admins can delete concessionario notificacoes"
ON public.demutran_concessionario_notificacoes
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.demutran_concessionarios dc
    WHERE dc.id = concessionario_id
      AND public.can_manage_demutran_content(dc.setor_id)
  )
);

CREATE OR REPLACE FUNCTION public.definir_acesso_concessionario(
  _concessionario_id uuid,
  _senha text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.demutran_concessionarios%ROWTYPE;
  v_cpf text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'Nao autenticado.');
  END IF;

  SELECT *
  INTO v_row
  FROM public.demutran_concessionarios
  WHERE id = _concessionario_id;

  IF v_row.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Concessionario nao encontrado.');
  END IF;

  IF NOT public.can_manage_demutran_content(v_row.setor_id) THEN
    RETURN jsonb_build_object('error', 'Sem permissao para este cadastro.');
  END IF;

  v_cpf := regexp_replace(coalesce(v_row.cpf, ''), '\D', '', 'g');
  IF char_length(v_cpf) <> 11 THEN
    RETURN jsonb_build_object('error', 'O concessionario precisa ter CPF valido para receber acesso.');
  END IF;

  IF length(coalesce(_senha, '')) < 6 THEN
    RETURN jsonb_build_object('error', 'A senha precisa ter pelo menos 6 caracteres.');
  END IF;

  INSERT INTO public.demutran_concessionario_acessos (
    concessionario_id,
    cpf_normalizado,
    senha_hash
  )
  VALUES (
    _concessionario_id,
    v_cpf,
    extensions.crypt(_senha, extensions.gen_salt('bf'))
  )
  ON CONFLICT (concessionario_id)
  DO UPDATE SET
    cpf_normalizado = EXCLUDED.cpf_normalizado,
    senha_hash = EXCLUDED.senha_hash,
    updated_at = now();

  INSERT INTO public.auditoria_logs (user_id, setor_id, entidade, entidade_id, acao, payload_resumido)
  VALUES (
    auth.uid(),
    v_row.setor_id,
    'demutran_concessionario_acessos',
    _concessionario_id,
    'definir_acesso_concessionario',
    jsonb_build_object('cpf', v_cpf)
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.enviar_notificacao_concessionario(
  _concessionario_id uuid,
  _titulo text,
  _mensagem text,
  _tipo text DEFAULT 'geral'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.demutran_concessionarios%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('error', 'Nao autenticado.');
  END IF;

  SELECT *
  INTO v_row
  FROM public.demutran_concessionarios
  WHERE id = _concessionario_id;

  IF v_row.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Concessionario nao encontrado.');
  END IF;

  IF NOT public.can_manage_demutran_content(v_row.setor_id) THEN
    RETURN jsonb_build_object('error', 'Sem permissao para este cadastro.');
  END IF;

  INSERT INTO public.demutran_concessionario_notificacoes (
    concessionario_id,
    titulo,
    mensagem,
    tipo,
    created_by
  )
  VALUES (
    _concessionario_id,
    trim(_titulo),
    trim(_mensagem),
    coalesce(nullif(trim(_tipo), ''), 'geral'),
    auth.uid()
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.liberar_veiculo_recolhido(
  _veiculo_id uuid,
  _data_liberacao timestamptz DEFAULT now(),
  _numero_liberacao text DEFAULT NULL,
  _situacao text DEFAULT 'Liberado',
  _observacao text DEFAULT NULL
)
RETURNS public.veiculos_recolhidos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.veiculos_recolhidos%ROWTYPE;
BEGIN
  SELECT *
  INTO v_row
  FROM public.veiculos_recolhidos
  WHERE id = _veiculo_id;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Veiculo nao encontrado.';
  END IF;

  IF NOT public.can_manage_demutran_content(v_row.setor_id) THEN
    RAISE EXCEPTION 'Sem permissao para liberar este veiculo.';
  END IF;

  UPDATE public.veiculos_recolhidos
  SET
    status = 'liberado',
    data_liberacao = COALESCE(_data_liberacao, now()),
    numero_liberacao = CASE
      WHEN v_row.local_custodia = 'motos_delegacia'::public.demutran_local_custodia
        THEN COALESCE(NULLIF(trim(_numero_liberacao), ''), numero_liberacao)
      ELSE numero_liberacao
    END,
    situacao = COALESCE(NULLIF(trim(_situacao), ''), 'Liberado'),
    observacao = CASE
      WHEN NULLIF(trim(_observacao), '') IS NULL THEN observacao
      WHEN observacao IS NULL OR observacao = '' THEN trim(_observacao)
      ELSE observacao || E'\n' || trim(_observacao)
    END,
    updated_at = now()
  WHERE id = _veiculo_id
  RETURNING * INTO v_row;

  INSERT INTO public.auditoria_logs (user_id, setor_id, entidade, entidade_id, acao, payload_resumido)
  VALUES (
    auth.uid(),
    v_row.setor_id,
    'veiculos_recolhidos',
    v_row.id,
    'liberar_veiculo_recolhido',
    jsonb_build_object(
      'placa', v_row.placa,
      'data_liberacao', v_row.data_liberacao,
      'numero_liberacao', v_row.numero_liberacao
    )
  );

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.atualizar_taxa_veiculo_recolhido(
  _veiculo_id uuid,
  _taxa_diaria numeric
)
RETURNS public.veiculos_recolhidos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.veiculos_recolhidos%ROWTYPE;
BEGIN
  IF _taxa_diaria IS NULL OR _taxa_diaria < 0 THEN
    RAISE EXCEPTION 'Informe uma taxa diaria valida.';
  END IF;

  SELECT *
  INTO v_row
  FROM public.veiculos_recolhidos
  WHERE id = _veiculo_id;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Veiculo nao encontrado.';
  END IF;

  IF NOT public.can_manage_demutran_content(v_row.setor_id) THEN
    RAISE EXCEPTION 'Sem permissao para atualizar a taxa deste veiculo.';
  END IF;

  UPDATE public.veiculos_recolhidos
  SET
    taxa_diaria = round(_taxa_diaria, 2),
    updated_at = now()
  WHERE id = _veiculo_id
  RETURNING * INTO v_row;

  INSERT INTO public.auditoria_logs (user_id, setor_id, entidade, entidade_id, acao, payload_resumido)
  VALUES (
    auth.uid(),
    v_row.setor_id,
    'veiculos_recolhidos',
    v_row.id,
    'atualizar_taxa_veiculo_recolhido',
    jsonb_build_object(
      'placa', v_row.placa,
      'taxa_diaria', v_row.taxa_diaria
    )
  );

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.atualizar_taxa_diaria_veiculos_recolhidos_setor(
  _setor_id uuid,
  _taxa_diaria numeric
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total integer := 0;
BEGIN
  IF _taxa_diaria IS NULL OR _taxa_diaria < 0 THEN
    RAISE EXCEPTION 'Informe uma taxa diaria valida.';
  END IF;

  IF _setor_id IS NULL THEN
    RAISE EXCEPTION 'Setor nao informado.';
  END IF;

  IF NOT public.can_manage_demutran_content(_setor_id) THEN
    RAISE EXCEPTION 'Sem permissao para atualizar as taxas deste setor.';
  END IF;

  UPDATE public.veiculos_recolhidos
  SET
    taxa_diaria = round(_taxa_diaria, 2),
    updated_at = now()
  WHERE setor_id = _setor_id;

  GET DIAGNOSTICS v_total = ROW_COUNT;

  INSERT INTO public.auditoria_logs (user_id, setor_id, entidade, entidade_id, acao, payload_resumido)
  VALUES (
    auth.uid(),
    _setor_id,
    'veiculos_recolhidos',
    NULL,
    'atualizar_taxa_diaria_veiculos_recolhidos_setor',
    jsonb_build_object(
      'taxa_diaria', round(_taxa_diaria, 2),
      'registros_atualizados', v_total
    )
  );

  RETURN v_total;
END;
$$;
