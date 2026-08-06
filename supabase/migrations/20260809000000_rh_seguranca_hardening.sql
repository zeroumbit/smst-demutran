-- =====================================================
-- HARDENING DE SEGURANCA - Modulo de Administracao/RH
-- Camada extra: RLS granular por permissao V2
--
-- ANTES: todas as 9 tabelas usavam a mesma policy FOR ALL
--        "can_manage_administracao()" (apenas "e do setor").
--        Qualquer usuario do setor (ex.: Almoxarife) podia
--        LER/ALTERAR/EXCLUIR dados de RH (CPF, salario...).
--
-- DEPOIS: cada tabela exige a permissao granular do modulo
--         correspondente e distingue as acoes:
--           SELECT  -> <modulo>.visualizar
--           INSERT  -> <modulo>.criar
--           UPDATE  -> <modulo>.editar
--           DELETE  -> <modulo>.excluir
-- =====================================================

-- -----------------------------------------------------
-- 1. Revoga os grants amplos de escrita (defesa em profundidade)
-- -----------------------------------------------------
REVOKE ALL ON public.rh_servidores FROM authenticated;
REVOKE ALL ON public.rh_afastamentos FROM authenticated;
REVOKE ALL ON public.rh_folhas_ponto FROM authenticated;
REVOKE ALL ON public.folha_folhas FROM authenticated;
REVOKE ALL ON public.folha_lancamentos FROM authenticated;
REVOKE ALL ON public.almox_insumos FROM authenticated;
REVOKE ALL ON public.almox_movimentacoes FROM authenticated;
REVOKE ALL ON public.rancho_refeicoes FROM authenticated;
REVOKE ALL ON public.rancho_compras FROM authenticated;

GRANT SELECT ON public.rh_servidores TO authenticated;
GRANT SELECT ON public.rh_afastamentos TO authenticated;
GRANT SELECT ON public.rh_folhas_ponto TO authenticated;
GRANT SELECT ON public.folha_folhas TO authenticated;
GRANT SELECT ON public.folha_lancamentos TO authenticated;
GRANT SELECT ON public.almox_insumos TO authenticated;
GRANT SELECT ON public.almox_movimentacoes TO authenticated;
GRANT SELECT ON public.rancho_refeicoes TO authenticated;
GRANT SELECT ON public.rancho_compras TO authenticated;

-- -----------------------------------------------------
-- 2. Drops das policies antigas (FOR ALL generic)
-- -----------------------------------------------------
DO $$
DECLARE
  tabela text;
BEGIN
  FOREACH tabela IN ARRAY ARRAY[
    'rh_servidores', 'rh_afastamentos', 'rh_folhas_ponto',
    'folha_folhas', 'folha_lancamentos',
    'almox_insumos', 'almox_movimentacoes',
    'rancho_refeicoes', 'rancho_compras'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Admins can manage %s" ON public.%I', tabela, tabela);
  END LOOP;
END $$;

-- -----------------------------------------------------
-- 3. Funcao auxiliar: o usuario pode executar a acao no modulo?
--    Usa o motor V2 (tem_permissao) que ja considera:
--    super_admin, perfis funcionais acumulados, excecoes.
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_admin_action(_modulo text, _acao text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.tem_permissao('administracao.' || _modulo || '.' || _acao);
$$;

GRANT EXECUTE ON FUNCTION public.can_admin_action(text, text) TO authenticated;

-- -----------------------------------------------------
-- 4. Policies granulares por tabela (acao especifica)
-- -----------------------------------------------------

-- ---- 4.1 Recursos Humanos (dados sensiveis: CPF, banco, salario)
DO $$
DECLARE
  tabela text := 'rh_servidores';
BEGIN
  EXECUTE format('DROP POLICY IF EXISTS "RH view" ON public.%I', tabela);
  EXECUTE format('DROP POLICY IF EXISTS "RH insert" ON public.%I', tabela);
  EXECUTE format('DROP POLICY IF EXISTS "RH update" ON public.%I', tabela);
  EXECUTE format('DROP POLICY IF EXISTS "RH delete" ON public.%I', tabela);
  EXECUTE format('CREATE POLICY "RH view" ON public.%I FOR SELECT TO authenticated USING (public.can_admin_action(''recursos_humanos'', ''visualizar''))', tabela);
  EXECUTE format('CREATE POLICY "RH insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_admin_action(''recursos_humanos'', ''criar'') AND setor_id = public.get_administracao_setor_id())', tabela);
  EXECUTE format('CREATE POLICY "RH update" ON public.%I FOR UPDATE TO authenticated USING (public.can_admin_action(''recursos_humanos'', ''editar'') AND setor_id = public.get_administracao_setor_id()) WITH CHECK (public.can_admin_action(''recursos_humanos'', ''editar'') AND setor_id = public.get_administracao_setor_id())', tabela);
  EXECUTE format('CREATE POLICY "RH delete" ON public.%I FOR DELETE TO authenticated USING (public.can_admin_action(''recursos_humanos'', ''excluir'') AND setor_id = public.get_administracao_setor_id())', tabela);
END $$;

DO $$
DECLARE
  tabela text;
BEGIN
  FOREACH tabela IN ARRAY ARRAY['rh_afastamentos', 'rh_folhas_ponto']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "RH view" ON public.%I', tabela);
    EXECUTE format('DROP POLICY IF EXISTS "RH insert" ON public.%I', tabela);
    EXECUTE format('DROP POLICY IF EXISTS "RH update" ON public.%I', tabela);
    EXECUTE format('DROP POLICY IF EXISTS "RH delete" ON public.%I', tabela);
    EXECUTE format('CREATE POLICY "RH view" ON public.%I FOR SELECT TO authenticated USING (public.can_admin_action(''recursos_humanos'', ''visualizar''))', tabela);
    EXECUTE format('CREATE POLICY "RH insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_admin_action(''recursos_humanos'', ''criar'') AND setor_id = public.get_administracao_setor_id())', tabela);
    EXECUTE format('CREATE POLICY "RH update" ON public.%I FOR UPDATE TO authenticated USING (public.can_admin_action(''recursos_humanos'', ''editar'') AND setor_id = public.get_administracao_setor_id()) WITH CHECK (public.can_admin_action(''recursos_humanos'', ''editar'') AND setor_id = public.get_administracao_setor_id())', tabela);
    EXECUTE format('CREATE POLICY "RH delete" ON public.%I FOR DELETE TO authenticated USING (public.can_admin_action(''recursos_humanos'', ''excluir'') AND setor_id = public.get_administracao_setor_id())', tabela);
  END LOOP;
END $$;

-- ---- 4.2 Folha de Pagamento (dados financeiros)
DO $$
DECLARE
  tabela text;
BEGIN
  FOREACH tabela IN ARRAY ARRAY['folha_folhas', 'folha_lancamentos']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "FP view" ON public.%I', tabela);
    EXECUTE format('DROP POLICY IF EXISTS "FP insert" ON public.%I', tabela);
    EXECUTE format('DROP POLICY IF EXISTS "FP update" ON public.%I', tabela);
    EXECUTE format('DROP POLICY IF EXISTS "FP delete" ON public.%I', tabela);
    EXECUTE format('CREATE POLICY "FP view" ON public.%I FOR SELECT TO authenticated USING (public.can_admin_action(''folha_pagamento'', ''visualizar''))', tabela);
    EXECUTE format('CREATE POLICY "FP insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_admin_action(''folha_pagamento'', ''criar'') AND setor_id = public.get_administracao_setor_id())', tabela);
    EXECUTE format('CREATE POLICY "FP update" ON public.%I FOR UPDATE TO authenticated USING (public.can_admin_action(''folha_pagamento'', ''editar'') AND setor_id = public.get_administracao_setor_id()) WITH CHECK (public.can_admin_action(''folha_pagamento'', ''editar'') AND setor_id = public.get_administracao_setor_id())', tabela);
    EXECUTE format('CREATE POLICY "FP delete" ON public.%I FOR DELETE TO authenticated USING (public.can_admin_action(''folha_pagamento'', ''excluir'') AND setor_id = public.get_administracao_setor_id())', tabela);
  END LOOP;
END $$;

-- ---- 4.3 Almoxarifado
DO $$
DECLARE
  tabela text;
BEGIN
  FOREACH tabela IN ARRAY ARRAY['almox_insumos', 'almox_movimentacoes']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "AL view" ON public.%I', tabela);
    EXECUTE format('DROP POLICY IF EXISTS "AL insert" ON public.%I', tabela);
    EXECUTE format('DROP POLICY IF EXISTS "AL update" ON public.%I', tabela);
    EXECUTE format('DROP POLICY IF EXISTS "AL delete" ON public.%I', tabela);
    EXECUTE format('CREATE POLICY "AL view" ON public.%I FOR SELECT TO authenticated USING (public.can_admin_action(''almoxarifado'', ''visualizar''))', tabela);
    EXECUTE format('CREATE POLICY "AL insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_admin_action(''almoxarifado'', ''criar'') AND setor_id = public.get_administracao_setor_id())', tabela);
    EXECUTE format('CREATE POLICY "AL update" ON public.%I FOR UPDATE TO authenticated USING (public.can_admin_action(''almoxarifado'', ''editar'') AND setor_id = public.get_administracao_setor_id()) WITH CHECK (public.can_admin_action(''almoxarifado'', ''editar'') AND setor_id = public.get_administracao_setor_id())', tabela);
    EXECUTE format('CREATE POLICY "AL delete" ON public.%I FOR DELETE TO authenticated USING (public.can_admin_action(''almoxarifado'', ''excluir'') AND setor_id = public.get_administracao_setor_id())', tabela);
  END LOOP;
END $$;

-- ---- 4.4 Gestao de Rancho
DO $$
DECLARE
  tabela text;
BEGIN
  FOREACH tabela IN ARRAY ARRAY['rancho_refeicoes', 'rancho_compras']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "GR view" ON public.%I', tabela);
    EXECUTE format('DROP POLICY IF EXISTS "GR insert" ON public.%I', tabela);
    EXECUTE format('DROP POLICY IF EXISTS "GR update" ON public.%I', tabela);
    EXECUTE format('DROP POLICY IF EXISTS "GR delete" ON public.%I', tabela);
    EXECUTE format('CREATE POLICY "GR view" ON public.%I FOR SELECT TO authenticated USING (public.can_admin_action(''gestao_rancho'', ''visualizar''))', tabela);
    EXECUTE format('CREATE POLICY "GR insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.can_admin_action(''gestao_rancho'', ''criar'') AND setor_id = public.get_administracao_setor_id())', tabela);
    EXECUTE format('CREATE POLICY "GR update" ON public.%I FOR UPDATE TO authenticated USING (public.can_admin_action(''gestao_rancho'', ''editar'') AND setor_id = public.get_administracao_setor_id()) WITH CHECK (public.can_admin_action(''gestao_rancho'', ''editar'') AND setor_id = public.get_administracao_setor_id())', tabela);
    EXECUTE format('CREATE POLICY "GR delete" ON public.%I FOR DELETE TO authenticated USING (public.can_admin_action(''gestao_rancho'', ''excluir'') AND setor_id = public.get_administracao_setor_id())', tabela);
  END LOOP;
END $$;

-- -----------------------------------------------------
-- 5. Integridade: folha fechada nao pode ser alterada
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.folha_bloquear_alteracao_fechada()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status INTO v_status FROM public.folha_folhas WHERE id = NEW.folha_id;
  IF v_status = 'fechada' THEN
    RAISE EXCEPTION 'A folha ja esta fechada e nao pode ser alterada.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_folha_bloquear_lancamento_fechada ON public.folha_lancamentos;
CREATE TRIGGER trg_folha_bloquear_lancamento_fechada
  BEFORE INSERT OR UPDATE OF folha_id, tipo, descricao, valor, servidor_id ON public.folha_lancamentos
  FOR EACH ROW EXECUTE FUNCTION public.folha_bloquear_alteracao_fechada();

-- -----------------------------------------------------
-- 6. Auditoria de acesso a dados sensiveis
--    RPC para abrir a ficha de um servidor: registra quem
--    acessou (user_id, servidor, data) e so devolve os dados
--    a quem tem permissao de visualizar RH.
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.rh_obter_ficha_servidor(_servidor_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_registro public.rh_servidores%ROWTYPE;
  v_setor_id uuid := public.get_administracao_setor_id();
  v_payload jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated.');
  END IF;

  IF NOT public.can_admin_action('recursos_humanos', 'visualizar') THEN
    RETURN jsonb_build_object('error', 'Sem permissao para acessar dados de recursos humanos.');
  END IF;

  SELECT * INTO v_registro
  FROM public.rh_servidores
  WHERE id = _servidor_id AND setor_id = v_setor_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Servidor nao encontrado.');
  END IF;

  -- Auditoria: registra o acesso (sem dados sensiveis no payload)
  INSERT INTO public.auditoria_logs (user_id, setor_id, entidade, entidade_id, acao, payload_resumido)
  VALUES (
    v_uid,
    v_setor_id,
    'rh_servidores',
    v_registro.id,
    'visualizar_ficha',
    jsonb_build_object(
      'matricula', v_registro.matricula,
      'nome', v_registro.nome_completo,
      'acessado_em', now()
    )
  );

  RETURN to_jsonb(v_registro);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rh_obter_ficha_servidor(uuid) TO authenticated;
