-- =====================================================
-- Permissions V2 - Multi-perfil funcional (multi funcoes)
-- Fase 5.1. Um usuario pode ter N perfis funcionais.
-- Catalogo ganha fala_cidadao e ordens_servico (controlados
-- por perfil, conforme definicao dos setores). Perfis iniciais
-- concedem o modulo INTEIRO (todas as acoes do modulo).
-- Nao altera comportamento (flag ainda off). Reversivel.
-- =====================================================

-- -----------------------------------------------------
-- 0. Tabela de ligacao usuario <-> perfis funcionais
--    Substitui a coluna perfis_usuarios.perfil_funcional_id
--    (mantida apenas para compatibilidade/auditoria).
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.usuario_perfil_funcionais (
  perfil_usuario_id uuid NOT NULL REFERENCES public.perfis_usuarios(id) ON DELETE CASCADE,
  perfil_funcional_id uuid NOT NULL REFERENCES public.perfis_funcionais(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (perfil_usuario_id, perfil_funcional_id)
);

CREATE INDEX IF NOT EXISTS usuario_perfil_funcionais_pf_idx
  ON public.usuario_perfil_funcionais (perfil_funcional_id);

-- Backfill: usuários que já tinham perfil único na coluna legada
INSERT INTO public.usuario_perfil_funcionais (perfil_usuario_id, perfil_funcional_id)
SELECT id, perfil_funcional_id
FROM public.perfis_usuarios
WHERE perfil_funcional_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------
-- 1. Modulos novos no catalogo: fala_cidadao e ordens_servico
--    (controlaveis por perfil, conforme lista dos setores)
-- -----------------------------------------------------
INSERT INTO public.setor_modulos (setor_id, slug, prefixo, nome, ativo)
SELECT s.id, m.slug, m.slug, m.nome, true
FROM public.setores s
JOIN (
  VALUES
    ('demutran', 'fala_cidadao', 'Fala Cidadao'),
    ('demutran', 'ordens_servico', 'Ordens de Servico'),
    ('guarda-municipal', 'fala_cidadao', 'Fala Cidadao'),
    ('guarda-municipal', 'ordens_servico', 'Ordens de Servico')
) AS m(setor_slug, slug, nome) ON m.setor_slug = s.slug
ON CONFLICT (setor_id, slug) DO NOTHING;

INSERT INTO public.permissoes_sistema (modulo_id, codigo, nome, descricao, acao, sensivel, ativo)
SELECT sm.id, m.codigo, m.nome, m.descricao, m.acao, m.sensivel, true
FROM public.setor_modulos sm
JOIN public.setores s ON s.id = sm.setor_id
JOIN (
  VALUES
    ('demutran', 'fala_cidadao', 'demutran.fala_cidadao.visualizar', 'Visualizar demandas do Fala Cidadao', 'Acessar a central e visualizar demandas do setor', 'visualizar', false),
    ('demutran', 'fala_cidadao', 'demutran.fala_cidadao.editar', 'Editar demandas do Fala Cidadao', 'Atualizar status, responder e transferir demandas', 'editar', false),
    ('demutran', 'ordens_servico', 'demutran.ordens_servico.visualizar', 'Visualizar ordens de servico', 'Acessar a lista e detalhes das ordens de servico', 'visualizar', false),
    ('demutran', 'ordens_servico', 'demutran.ordens_servico.criar', 'Criar ordens de servico', 'Criar e publicar ordens de servico', 'criar', false),
    ('demutran', 'ordens_servico', 'demutran.ordens_servico.editar', 'Editar ordens de servico', 'Editar e substituir ordens de servico', 'editar', false),
    ('demutran', 'ordens_servico', 'demutran.ordens_servico.excluir', 'Excluir ordens de servico', 'Excluir rascunhos, cancelar e arquivar', 'excluir', true),
    ('guarda-municipal', 'fala_cidadao', 'guarda_municipal.fala_cidadao.visualizar', 'Visualizar demandas do Fala Cidadao', 'Acessar a central e visualizar demandas do setor', 'visualizar', false),
    ('guarda-municipal', 'fala_cidadao', 'guarda_municipal.fala_cidadao.editar', 'Editar demandas do Fala Cidadao', 'Atualizar status, responder e transferir demandas', 'editar', false),
    ('guarda-municipal', 'ordens_servico', 'guarda_municipal.ordens_servico.visualizar', 'Visualizar ordens de servico', 'Acessar a lista e detalhes das ordens de servico', 'visualizar', false),
    ('guarda-municipal', 'ordens_servico', 'guarda_municipal.ordens_servico.criar', 'Criar ordens de servico', 'Criar e publicar ordens de servico', 'criar', false),
    ('guarda-municipal', 'ordens_servico', 'guarda_municipal.ordens_servico.editar', 'Editar ordens de servico', 'Editar e substituir ordens de servico', 'editar', false),
    ('guarda-municipal', 'ordens_servico', 'guarda_municipal.ordens_servico.excluir', 'Excluir ordens de servico', 'Excluir rascunhos, cancelar e arquivar', 'excluir', true)
) AS m(setor_slug, modulo_slug, codigo, nome, descricao, acao, sensivel)
  ON m.setor_slug = s.slug AND m.modulo_slug = sm.slug
ON CONFLICT (codigo) DO NOTHING;

-- -----------------------------------------------------
-- 2. RLS da tabela de ligacao
--    Leitura: dono do perfil, super admin e gestor do setor.
--    Escrita: somente via RPC SECURITY DEFINER (super/gestor).
-- -----------------------------------------------------
ALTER TABLE public.usuario_perfil_funcionais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own usuario_perfil_funcionais" ON public.usuario_perfil_funcionais;
CREATE POLICY "Users view own usuario_perfil_funcionais" ON public.usuario_perfil_funcionais
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfis_usuarios pu
      WHERE pu.id = usuario_perfil_funcionais.perfil_usuario_id
        AND pu.user_id = auth.uid()
    )
    OR public.is_super_admin()
    OR public.is_gestor_setor(
        (SELECT setor_id FROM public.perfis_usuarios WHERE id = usuario_perfil_funcionais.perfil_usuario_id)
    )
  );

DROP POLICY IF EXISTS "Super admin manage usuario_perfil_funcionais" ON public.usuario_perfil_funcionais;
CREATE POLICY "Super admin manage usuario_perfil_funcionais" ON public.usuario_perfil_funcionais
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

GRANT SELECT ON public.usuario_perfil_funcionais TO authenticated;

-- -----------------------------------------------------
-- 3. Motor: tem_permissao passa a considerar TODOS os perfis
--    do usuario (uniao). Usuario "migrado" = tem >= 1 perfil.
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.tem_permissao(_codigo text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_permissao RECORD;
  v_perfil RECORD;
  v_efeito text;
BEGIN
  -- 1. Super admin sempre passa
  IF public.is_super_admin() THEN
    RETURN true;
  END IF;

  -- Flag unica desligada: mantem comportamento atual (zero regressao)
  IF NOT public.permissions_v2_enabled() THEN
    RETURN public.legacy_tem_permissao(_codigo);
  END IF;

  -- Busca permissao no catalogo
  SELECT ps.id, ps.modulo_id, ps.codigo, ps.sensivel
  INTO v_permissao
  FROM public.permissoes_sistema ps
  WHERE ps.codigo = _codigo AND ps.ativo = true;

  -- Perfil ativo do usuario (papel dominante)
  SELECT pu.*
  INTO v_perfil
  FROM public.perfis_usuarios pu
  WHERE pu.user_id = v_uid AND pu.ativo = true
  ORDER BY CASE pu.papel
    WHEN 'super_admin' THEN 1
    WHEN 'gestor' THEN 2
    WHEN 'admin_setor' THEN 3
    ELSE 4
  END
  LIMIT 1;

  IF v_perfil.id IS NULL THEN
    RETURN public.legacy_tem_permissao(_codigo);
  END IF;

  -- Usuario NAO migrado (sem nenhum perfil funcional): legado decide
  IF NOT EXISTS (
    SELECT 1 FROM public.usuario_perfil_funcionais upf
    WHERE upf.perfil_usuario_id = v_perfil.id
  ) THEN
    RETURN public.legacy_tem_permissao(_codigo);
  END IF;

  -- Usuario migrado: usa o novo motor
  -- Codigo nao catalogado: nega (nada de concessao por suposicao)
  IF v_permissao.id IS NULL THEN
    RETURN false;
  END IF;

  -- 2. negacao individual (tem precedencia sobre tudo)
  SELECT up.efeito
  INTO v_efeito
  FROM public.usuario_permissoes up
  WHERE up.perfil_usuario_id = v_perfil.id AND up.permissao_id = v_permissao.id
  LIMIT 1;
  IF v_efeito = 'NEGAR' THEN
    RETURN false;
  END IF;
  -- 3. concessao individual
  IF v_efeito = 'PERMITIR' THEN
    RETURN true;
  END IF;
  -- 4. qualquer um dos perfis funcionais do usuario concede
  IF EXISTS (
    SELECT 1
    FROM public.usuario_perfil_funcionais upf
    JOIN public.perfil_funcional_permissoes pfp
      ON pfp.perfil_funcional_id = upf.perfil_funcional_id
    WHERE upf.perfil_usuario_id = v_perfil.id
      AND pfp.permissao_id = v_permissao.id
  ) THEN
    RETURN true;
  END IF;
  -- 5. compatibilidade legada (nao remove acesso que o usuario ja tinha)
  RETURN public.legacy_tem_permissao(_codigo);
END;
$$;

GRANT EXECUTE ON FUNCTION public.tem_permissao(text) TO authenticated;

-- -----------------------------------------------------
-- 4. RPC: definir perfis funcionais (multi) de um usuario.
--    Substitui a lista inteira. Sincroniza a coluna legada
--    com o primeiro perfil (para compatibilidade).
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_usuario_perfis_funcionais(
  _perfil_usuario_id uuid,
  _perfil_funcional_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_requester_id uuid;
  v_target_setor uuid;
  v_pf uuid;
  v_nome_perfil text;
  v_count integer;
BEGIN
  v_requester_id := auth.uid();
  IF v_requester_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated.');
  END IF;

  SELECT setor_id INTO v_target_setor
  FROM public.perfis_usuarios
  WHERE id = _perfil_usuario_id;

  IF v_target_setor IS NULL THEN
    RETURN jsonb_build_object('error', 'Perfil de usuario nao encontrado.');
  END IF;

  IF NOT (public.is_super_admin() OR public.is_gestor_setor(v_target_setor)) THEN
    RETURN jsonb_build_object('error', 'Sem permissao para gerenciar este usuario.');
  END IF;

  -- Valida cada perfil: existe, ativo e do mesmo setor
  IF _perfil_funcional_ids IS NOT NULL THEN
    FOREACH v_pf IN ARRAY _perfil_funcional_ids
    LOOP
      SELECT pf.nome INTO v_nome_perfil
      FROM public.perfis_funcionais pf
      WHERE pf.id = v_pf AND pf.ativo;
      IF v_nome_perfil IS NULL THEN
        RETURN jsonb_build_object('error', 'Perfil funcional nao encontrado ou inativo.');
      END IF;
      IF EXISTS (
        SELECT 1 FROM public.perfis_funcionais pf
        WHERE pf.id = v_pf
          AND pf.setor_id IS NOT NULL
          AND pf.setor_id <> v_target_setor
      ) THEN
        RETURN jsonb_build_object('error', 'Perfil funcional pertence a outro setor: ' || v_nome_perfil);
      END IF;
    END LOOP;
  END IF;

  -- Substitui a lista inteira
  DELETE FROM public.usuario_perfil_funcionais
  WHERE perfil_usuario_id = _perfil_usuario_id;

  IF _perfil_funcional_ids IS NOT NULL AND cardinality(_perfil_funcional_ids) > 0 THEN
    INSERT INTO public.usuario_perfil_funcionais (perfil_usuario_id, perfil_funcional_id, created_by)
    SELECT _perfil_usuario_id, unnest, v_requester_id
    FROM unnest(_perfil_funcional_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;

    -- Sincroniza coluna legada com o primeiro perfil
    UPDATE public.perfis_usuarios
    SET perfil_funcional_id = _perfil_funcional_ids[1], updated_at = now()
    WHERE id = _perfil_usuario_id;
  ELSE
    v_count := 0;
    UPDATE public.perfis_usuarios
    SET perfil_funcional_id = NULL, updated_at = now()
    WHERE id = _perfil_usuario_id;
  END IF;

  INSERT INTO public.auditoria_logs (
    user_id, setor_id, entidade, entidade_id, acao, payload_resumido
  ) VALUES (
    v_requester_id, v_target_setor, 'perfis_usuarios', _perfil_usuario_id,
    'definir_perfis_funcionais',
    jsonb_build_object('perfis_funcional_ids', COALESCE(_perfil_funcional_ids, ARRAY[]::uuid[]))
  );

  RETURN jsonb_build_object('success', true, 'perfis', COALESCE(v_count, 0));
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_usuario_perfis_funcionais(uuid, uuid[]) TO authenticated;

-- Mantem compatibilidade com a assinatura antiga (perfil unico)
CREATE OR REPLACE FUNCTION public.set_usuario_perfil_funcional(
  _perfil_usuario_id uuid,
  _perfil_funcional_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN public.set_usuario_perfis_funcionais(
    _perfil_usuario_id,
    CASE WHEN _perfil_funcional_id IS NULL THEN NULL ELSE ARRAY[_perfil_funcional_id] END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_usuario_perfil_funcional(uuid, uuid) TO authenticated;

-- -----------------------------------------------------
-- 5. get_usuario_permissoes: passa a considerar todos os
--    perfis funcionais do usuario (origem = perfil_funcional).
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_usuario_permissoes(
  _perfil_usuario_id uuid
)
RETURNS TABLE (
  permissao_id uuid,
  codigo text,
  nome text,
  descricao text,
  sensivel boolean,
  modulo_slug text,
  efeito text,
  origem text,
  pode bool
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_target_setor uuid;
BEGIN
  SELECT pu.setor_id
  INTO v_target_setor
  FROM public.perfis_usuarios pu
  WHERE pu.id = _perfil_usuario_id;

  IF v_target_setor IS NULL THEN
    RAISE EXCEPTION 'Perfil de usuario nao encontrado.';
  END IF;
  IF NOT (public.is_super_admin() OR public.is_gestor_setor(v_target_setor)
          OR EXISTS (
            SELECT 1 FROM public.perfis_usuarios pu
            WHERE pu.id = _perfil_usuario_id AND pu.user_id = auth.uid()
          )) THEN
    RAISE EXCEPTION 'Sem permissao para consultar este usuario.';
  END IF;

  RETURN QUERY
  SELECT
    ps.id AS permissao_id,
    ps.codigo,
    ps.nome,
    ps.descricao,
    ps.sensivel,
    sm.slug AS modulo_slug,
    up.efeito::text AS efeito,
    CASE
      WHEN up.efeito IS NOT NULL THEN 'excecao'
      WHEN EXISTS (
        SELECT 1
        FROM public.usuario_perfil_funcionais upf
        JOIN public.perfil_funcional_permissoes pfp
          ON pfp.perfil_funcional_id = upf.perfil_funcional_id
        WHERE upf.perfil_usuario_id = _perfil_usuario_id
          AND pfp.permissao_id = ps.id
      ) THEN 'perfil_funcional'
      ELSE 'catalogo'
    END AS origem,
    public.tem_permissao(ps.codigo) AS pode
  FROM public.permissoes_sistema ps
  JOIN public.setor_modulos sm ON sm.id = ps.modulo_id
  LEFT JOIN public.usuario_permissoes up
    ON up.permissao_id = ps.id AND up.perfil_usuario_id = _perfil_usuario_id
  WHERE ps.ativo
    AND sm.ativo
    AND (
      sm.setor_id = v_target_setor
      OR up.permissao_id IS NOT NULL
    )
  ORDER BY sm.slug, ps.acao;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_usuario_permissoes(uuid) TO authenticated;

-- -----------------------------------------------------
-- 6. get_user_profile: expoe a lista de perfis funcionais
--    (perfis_funcionais: array de {id, nome}).
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_profile()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  auth_user auth.users%ROWTYPE;
  profile_row RECORD;
  resolved_name text;
  jgc_perfil_val text;
  jgc_area_val text;
  v_perfis jsonb;
BEGIN
  SELECT * INTO auth_user FROM auth.users WHERE id = auth.uid();
  IF auth_user.id IS NULL THEN RETURN NULL; END IF;

  SELECT
    pu.id AS perfil_id, pu.papel, pu.ativo, pu.nome, pu.sobrenome,
    s.id AS setor_id, s.nome AS setor_nome, s.slug AS setor_slug,
    pu.graduacao_id, ggn.nome AS graduacao_nome,
    pu.perfil_funcional_id
  INTO profile_row
  FROM public.perfis_usuarios pu
  LEFT JOIN public.setores s ON s.id = pu.setor_id
  LEFT JOIN public.guarda_municipal_graduacoes ggn ON ggn.id = pu.graduacao_id
  WHERE pu.user_id = auth.uid() AND pu.ativo = true
  ORDER BY CASE pu.papel WHEN 'super_admin' THEN 1 WHEN 'gestor' THEN 2
           WHEN 'admin_setor' THEN 3 ELSE 4 END
  LIMIT 1;

  SELECT jp.perfil::text, jp.area_atuacao
  INTO jgc_perfil_val, jgc_area_val
  FROM public.jgc_perfis jp
  WHERE jp.perfil_usuario_id = profile_row.perfil_id AND jp.ativo;

  -- Todos os perfis funcionais do usuario (multi-perfil)
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id', pf.id, 'nome', pf.nome) ORDER BY pf.nome), '[]'::jsonb)
  INTO v_perfis
  FROM public.usuario_perfil_funcionais upf
  JOIN public.perfis_funcionais pf ON pf.id = upf.perfil_funcional_id AND pf.ativo
  WHERE upf.perfil_usuario_id = profile_row.perfil_id;

  resolved_name := COALESCE(
    NULLIF(auth_user.raw_user_meta_data ->> 'name', ''),
    NULLIF(trim(COALESCE(profile_row.nome, auth_user.raw_user_meta_data ->> 'first_name','')
      || ' ' || COALESCE(profile_row.sobrenome, auth_user.raw_user_meta_data ->> 'last_name','')), ''),
    auth_user.email
  );

  IF profile_row.perfil_id IS NULL AND public.has_legacy_admin(auth.uid()) THEN
    RETURN jsonb_build_object('user_id', auth_user.id, 'email', auth_user.email, 'name', resolved_name,
      'first_name', auth_user.raw_user_meta_data ->> 'first_name', 'last_name', auth_user.raw_user_meta_data ->> 'last_name',
      'papel', 'super_admin', 'perfil_id', NULL, 'setor_id', NULL, 'setor_nome', NULL, 'setor_slug', NULL,
      'ativo', true, 'legacy_admin', true, 'graduacao_id', NULL, 'graduacao_nome', NULL,
      'jgc_perfil', NULL, 'jgc_area_atuacao', NULL, 'perfil_funcional_id', NULL, 'perfis_funcionais', '[]'::jsonb);
  END IF;

  IF profile_row.perfil_id IS NULL THEN
    RETURN jsonb_build_object('user_id', auth_user.id, 'email', auth_user.email, 'name', resolved_name,
      'first_name', auth_user.raw_user_meta_data ->> 'first_name', 'last_name', auth_user.raw_user_meta_data ->> 'last_name',
      'papel', NULL, 'perfil_id', NULL, 'setor_id', NULL, 'setor_nome', NULL, 'setor_slug', NULL,
      'ativo', false, 'legacy_admin', false, 'graduacao_id', NULL, 'graduacao_nome', NULL,
      'jgc_perfil', NULL, 'jgc_area_atuacao', NULL, 'perfil_funcional_id', NULL, 'perfis_funcionais', '[]'::jsonb);
  END IF;

  RETURN jsonb_build_object(
    'user_id', auth_user.id, 'email', auth_user.email, 'name', resolved_name,
    'first_name', profile_row.nome, 'last_name', profile_row.sobrenome,
    'papel', profile_row.papel, 'perfil_id', profile_row.perfil_id,
    'setor_id', profile_row.setor_id, 'setor_nome', profile_row.setor_nome, 'setor_slug', profile_row.setor_slug,
    'ativo', profile_row.ativo, 'legacy_admin', false,
    'graduacao_id', profile_row.graduacao_id, 'graduacao_nome', profile_row.graduacao_nome,
    'jgc_perfil', jgc_perfil_val, 'jgc_area_atuacao', jgc_area_val,
    'perfil_funcional_id', profile_row.perfil_funcional_id,
    'perfis_funcionais', v_perfis
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_profile() TO authenticated;

-- -----------------------------------------------------
-- 7. Seed: 13 perfis funcionais iniciais.
--    Perfil concede o modulo INTEIRO (todas as acoes).
--    Fiscalizacao (Guarda) entra em todos os perfis porque
--    foi definida como "para todos os perfis".
-- -----------------------------------------------------
WITH perfis AS (
  SELECT s.id AS setor_id, p.nome, p.descricao
  FROM public.setores s
  JOIN (
    VALUES
      ('demutran', 'Atendimento ao Cidadao', 'Fala Cidadao e ordens de servico'),
      ('demutran', 'Operador de Veiculos', 'Cadastro e gestao de veiculos'),
      ('demutran', 'Operador de Recolhimento', 'Veiculos e frota municipal'),
      ('demutran', 'Gestor de Credenciais', 'Credenciais, recursos e concessionarios'),
      ('demutran', 'Editor de Conteudo', 'Midias e documentos'),
      ('demutran', 'Pleno Demutran', 'Todos os modulos do Demutran'),
      ('guarda-municipal', 'Atendimento ao Cidadao', 'Fala Cidadao e ordens de servico'),
      ('guarda-municipal', 'Operador de IROs', 'Cadastro e gestao de IROs'),
      ('guarda-municipal', 'Gestor de Escalas', 'Escalas da guarda'),
      ('guarda-municipal', 'Gestor de Guardas', 'Cadastro e gestao de guardas'),
      ('guarda-municipal', 'Gestor de Frota', 'Frota da guarda'),
      ('guarda-municipal', 'Gestor de Equipes', 'Equipes da guarda'),
      ('guarda-municipal', 'Pleno Guarda', 'Todos os modulos da Guarda')
  ) AS p(setor_slug, nome, descricao) ON p.setor_slug = s.slug
)
INSERT INTO public.perfis_funcionais (setor_id, nome, descricao)
SELECT setor_id, nome, descricao FROM perfis
ON CONFLICT (setor_id, nome) DO NOTHING;

-- Vincula permissoes aos perfis (modulo inteiro)
WITH perfil_modulos AS (
  SELECT s.id AS setor_id, pm.nome AS perfil_nome, pm.modulo_slug
  FROM public.setores s
  JOIN (
    VALUES
      -- Demutran
      ('demutran', 'Atendimento ao Cidadao', 'fala_cidadao'),
      ('demutran', 'Atendimento ao Cidadao', 'ordens_servico'),
      ('demutran', 'Operador de Veiculos', 'veiculos'),
      ('demutran', 'Operador de Recolhimento', 'veiculos'),
      ('demutran', 'Operador de Recolhimento', 'frota'),
      ('demutran', 'Gestor de Credenciais', 'credenciais'),
      ('demutran', 'Gestor de Credenciais', 'recursos'),
      ('demutran', 'Gestor de Credenciais', 'concessionarios'),
      ('demutran', 'Editor de Conteudo', 'midias'),
      ('demutran', 'Editor de Conteudo', 'documentos'),
      ('demutran', 'Pleno Demutran', 'fala_cidadao'),
      ('demutran', 'Pleno Demutran', 'ordens_servico'),
      ('demutran', 'Pleno Demutran', 'veiculos'),
      ('demutran', 'Pleno Demutran', 'concessionarios'),
      ('demutran', 'Pleno Demutran', 'credenciais'),
      ('demutran', 'Pleno Demutran', 'recursos'),
      ('demutran', 'Pleno Demutran', 'frota'),
      ('demutran', 'Pleno Demutran', 'documentos'),
      ('demutran', 'Pleno Demutran', 'midias'),
      -- Guarda (fiscalizacao entra em todos: "para todos os perfis")
      ('guarda-municipal', 'Atendimento ao Cidadao', 'fala_cidadao'),
      ('guarda-municipal', 'Atendimento ao Cidadao', 'ordens_servico'),
      ('guarda-municipal', 'Atendimento ao Cidadao', 'fiscalizacao'),
      ('guarda-municipal', 'Operador de IROs', 'iros'),
      ('guarda-municipal', 'Operador de IROs', 'fiscalizacao'),
      ('guarda-municipal', 'Gestor de Escalas', 'guarda_escalas'),
      ('guarda-municipal', 'Gestor de Escalas', 'fiscalizacao'),
      ('guarda-municipal', 'Gestor de Guardas', 'guardas'),
      ('guarda-municipal', 'Gestor de Guardas', 'fiscalizacao'),
      ('guarda-municipal', 'Gestor de Frota', 'guarda_frota'),
      ('guarda-municipal', 'Gestor de Frota', 'fiscalizacao'),
      ('guarda-municipal', 'Gestor de Equipes', 'guarda_equipes'),
      ('guarda-municipal', 'Gestor de Equipes', 'fiscalizacao'),
      ('guarda-municipal', 'Pleno Guarda', 'fala_cidadao'),
      ('guarda-municipal', 'Pleno Guarda', 'ordens_servico'),
      ('guarda-municipal', 'Pleno Guarda', 'iros'),
      ('guarda-municipal', 'Pleno Guarda', 'guardas'),
      ('guarda-municipal', 'Pleno Guarda', 'guarda_escalas'),
      ('guarda-municipal', 'Pleno Guarda', 'guarda_frota'),
      ('guarda-municipal', 'Pleno Guarda', 'guarda_equipes'),
      ('guarda-municipal', 'Pleno Guarda', 'fiscalizacao'),
      ('guarda-municipal', 'Pleno Guarda', 'midias')
  ) AS pm(setor_slug, nome, modulo_slug) ON pm.setor_slug = s.slug
)
INSERT INTO public.perfil_funcional_permissoes (perfil_funcional_id, permissao_id)
SELECT pf.id, ps.id
FROM perfil_modulos pm
JOIN public.perfis_funcionais pf
  ON pf.setor_id = pm.setor_id AND pf.nome = pm.perfil_nome
JOIN public.setor_modulos sm
  ON sm.setor_id = pm.setor_id AND sm.slug = pm.modulo_slug AND sm.ativo
JOIN public.permissoes_sistema ps
  ON ps.modulo_id = sm.id AND ps.ativo
ON CONFLICT DO NOTHING;
