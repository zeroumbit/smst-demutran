-- =====================================================
-- Migration: Modulo Frota da Guarda
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'guarda_frota_status'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.guarda_frota_status AS ENUM (
      'DISPONIVEL',
      'EM_SERVICO',
      'EM_MANUTENCAO',
      'INDISPONIVEL',
      'RESERVADO',
      'INATIVO'
    );
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'guarda_frota_manutencao_tipo'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.guarda_frota_manutencao_tipo AS ENUM (
      'PREVENTIVA',
      'CORRETIVA',
      'REVISAO',
      'TROCA_OLEO',
      'PNEUS',
      'ELETRICA',
      'MECANICA',
      'FUNILARIA',
      'OUTRA'
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_guarda_frota()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    public.is_super_admin()
    OR public.is_admin_of_setor(public.get_guarda_municipal_setor_id())
    OR EXISTS (
      SELECT 1
      FROM public.perfis_usuarios pu
      WHERE pu.user_id = auth.uid()
        AND pu.ativo = true
        AND pu.setor_id = public.get_guarda_municipal_setor_id()
        AND pu.papel = 'tecnico'::public.papel_usuario
        AND (
          coalesce(auth.jwt()->'app_metadata'->'modulos', '[]'::jsonb) ? 'guarda_frota'
          OR coalesce(auth.jwt()->'app_metadata'->'modulos', '[]'::jsonb) ? 'frota_guarda'
          OR coalesce(auth.jwt()->'app_metadata'->'modulos', '[]'::jsonb) ? 'guardas'
        )
    );
$$;

CREATE TABLE IF NOT EXISTS public.guarda_frota_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guarda_frota_categorias_nome_unq UNIQUE (nome)
);

CREATE TABLE IF NOT EXISTS public.guarda_frota_veiculos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id uuid NOT NULL DEFAULT public.get_guarda_municipal_setor_id() REFERENCES public.setores(id) ON DELETE RESTRICT,
  demutran_veiculo_id uuid REFERENCES public.demutran_veiculos_municipais(id) ON DELETE SET NULL,
  prefixo text NOT NULL,
  placa text NOT NULL,
  renavam text,
  chassi text,
  patrimonio text,
  identificacao_interna text,
  marca text,
  modelo text,
  versao text,
  ano_fabricacao integer,
  ano_modelo integer,
  cor text,
  combustivel text,
  categoria_id uuid REFERENCES public.guarda_frota_categorias(id) ON DELETE SET NULL,
  tipo_uso text[] NOT NULL DEFAULT ARRAY[]::text[],
  grupamento text,
  status public.guarda_frota_status NOT NULL DEFAULT 'DISPONIVEL',
  quilometragem_atual integer NOT NULL DEFAULT 0 CHECK (quilometragem_atual >= 0),
  foto_principal_url text,
  observacoes text,
  motivo_inativacao text,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guarda_frota_veiculos_setor_check CHECK (setor_id = public.get_guarda_municipal_setor_id())
);

CREATE UNIQUE INDEX IF NOT EXISTS guarda_frota_veiculos_prefixo_unq
  ON public.guarda_frota_veiculos (upper(trim(prefixo)))
  WHERE ativo = true;

CREATE UNIQUE INDEX IF NOT EXISTS guarda_frota_veiculos_placa_unq
  ON public.guarda_frota_veiculos (upper(regexp_replace(placa, '[^A-Z0-9]', '', 'g')))
  WHERE ativo = true;

CREATE INDEX IF NOT EXISTS guarda_frota_veiculos_status_idx
  ON public.guarda_frota_veiculos (status, ativo);

CREATE INDEX IF NOT EXISTS guarda_frota_veiculos_categoria_idx
  ON public.guarda_frota_veiculos (categoria_id);

CREATE INDEX IF NOT EXISTS guarda_frota_veiculos_demutran_idx
  ON public.guarda_frota_veiculos (demutran_veiculo_id);

CREATE TABLE IF NOT EXISTS public.guarda_frota_indisponibilidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id uuid NOT NULL REFERENCES public.guarda_frota_veiculos(id) ON DELETE CASCADE,
  inicio timestamptz NOT NULL,
  fim_previsto timestamptz,
  motivo text NOT NULL,
  descricao text,
  encerrado_em timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guarda_frota_indisponibilidades_periodo_check CHECK (fim_previsto IS NULL OR fim_previsto > inicio)
);

CREATE INDEX IF NOT EXISTS guarda_frota_indisp_veiculo_idx
  ON public.guarda_frota_indisponibilidades (veiculo_id, inicio DESC);

CREATE TABLE IF NOT EXISTS public.guarda_frota_manutencoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id uuid NOT NULL REFERENCES public.guarda_frota_veiculos(id) ON DELETE CASCADE,
  tipo public.guarda_frota_manutencao_tipo NOT NULL DEFAULT 'CORRETIVA',
  data_entrada timestamptz NOT NULL DEFAULT now(),
  data_prevista_saida timestamptz,
  data_conclusao timestamptz,
  descricao_problema text NOT NULL,
  servico_realizado text,
  oficina text,
  valor numeric(12,2),
  quilometragem integer CHECK (quilometragem IS NULL OR quilometragem >= 0),
  observacoes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS guarda_frota_manutencoes_veiculo_idx
  ON public.guarda_frota_manutencoes (veiculo_id, data_entrada DESC);

CREATE TABLE IF NOT EXISTS public.guarda_frota_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id uuid NOT NULL REFERENCES public.guarda_frota_veiculos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo text NOT NULL,
  arquivo_url text NOT NULL,
  data_emissao date,
  data_validade date,
  observacao text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS guarda_frota_documentos_validade_idx
  ON public.guarda_frota_documentos (data_validade)
  WHERE data_validade IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.guarda_frota_quilometragem_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id uuid NOT NULL REFERENCES public.guarda_frota_veiculos(id) ON DELETE CASCADE,
  quilometragem_anterior integer NOT NULL DEFAULT 0,
  quilometragem_nova integer NOT NULL CHECK (quilometragem_nova >= 0),
  responsavel_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.guarda_frota_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id uuid NOT NULL REFERENCES public.guarda_frota_veiculos(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  acao text NOT NULL,
  descricao text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS guarda_frota_historico_veiculo_idx
  ON public.guarda_frota_historico (veiculo_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.registrar_guarda_frota_historico(
  p_veiculo_id uuid,
  p_acao text,
  p_descricao text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.guarda_frota_historico (veiculo_id, usuario_id, acao, descricao, metadata)
  VALUES (p_veiculo_id, auth.uid(), p_acao, p_descricao, coalesce(p_metadata, '{}'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.guarda_frota_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.registrar_guarda_frota_historico(NEW.id, 'VEICULO_CADASTRADO', 'Veiculo cadastrado na Frota da Guarda');
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      PERFORM public.registrar_guarda_frota_historico(
        NEW.id,
        'STATUS_ALTERADO',
        'Status alterado de ' || OLD.status::text || ' para ' || NEW.status::text,
        jsonb_build_object('status_anterior', OLD.status, 'status_novo', NEW.status)
      );
    END IF;

    IF OLD.quilometragem_atual IS DISTINCT FROM NEW.quilometragem_atual THEN
      INSERT INTO public.guarda_frota_quilometragem_historico (
        veiculo_id,
        quilometragem_anterior,
        quilometragem_nova,
        responsavel_id
      )
      VALUES (NEW.id, OLD.quilometragem_atual, NEW.quilometragem_atual, auth.uid());

      PERFORM public.registrar_guarda_frota_historico(
        NEW.id,
        'QUILOMETRAGEM_ATUALIZADA',
        'Quilometragem atualizada',
        jsonb_build_object('anterior', OLD.quilometragem_atual, 'nova', NEW.quilometragem_atual)
      );
    END IF;

    IF OLD.ativo IS DISTINCT FROM NEW.ativo OR OLD.motivo_inativacao IS DISTINCT FROM NEW.motivo_inativacao THEN
      IF NEW.ativo = false OR NEW.status = 'INATIVO' THEN
        PERFORM public.registrar_guarda_frota_historico(NEW.id, 'VEICULO_INATIVADO', NEW.motivo_inativacao);
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_atualizar_guarda_frota_categorias_updated_at ON public.guarda_frota_categorias;
CREATE TRIGGER trigger_atualizar_guarda_frota_categorias_updated_at
BEFORE UPDATE ON public.guarda_frota_categorias
FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

DROP TRIGGER IF EXISTS trigger_atualizar_guarda_frota_veiculos_updated_at ON public.guarda_frota_veiculos;
CREATE TRIGGER trigger_atualizar_guarda_frota_veiculos_updated_at
BEFORE UPDATE ON public.guarda_frota_veiculos
FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

DROP TRIGGER IF EXISTS trigger_audit_guarda_frota_veiculos ON public.guarda_frota_veiculos;
CREATE TRIGGER trigger_audit_guarda_frota_veiculos
AFTER INSERT OR UPDATE ON public.guarda_frota_veiculos
FOR EACH ROW EXECUTE FUNCTION public.guarda_frota_audit_trigger();

DROP TRIGGER IF EXISTS trigger_atualizar_guarda_frota_indisponibilidades_updated_at ON public.guarda_frota_indisponibilidades;
CREATE TRIGGER trigger_atualizar_guarda_frota_indisponibilidades_updated_at
BEFORE UPDATE ON public.guarda_frota_indisponibilidades
FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

DROP TRIGGER IF EXISTS trigger_atualizar_guarda_frota_manutencoes_updated_at ON public.guarda_frota_manutencoes;
CREATE TRIGGER trigger_atualizar_guarda_frota_manutencoes_updated_at
BEFORE UPDATE ON public.guarda_frota_manutencoes
FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

DROP TRIGGER IF EXISTS trigger_atualizar_guarda_frota_documentos_updated_at ON public.guarda_frota_documentos;
CREATE TRIGGER trigger_atualizar_guarda_frota_documentos_updated_at
BEFORE UPDATE ON public.guarda_frota_documentos
FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

CREATE OR REPLACE FUNCTION public.verificar_disponibilidade_viatura(
  p_veiculo_id uuid,
  p_inicio timestamptz,
  p_fim timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_veiculo public.guarda_frota_veiculos%ROWTYPE;
  v_bloqueio record;
BEGIN
  SELECT * INTO v_veiculo
  FROM public.guarda_frota_veiculos
  WHERE id = p_veiculo_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('disponivel', false, 'motivo', 'Veiculo nao encontrado');
  END IF;

  IF v_veiculo.ativo = false OR v_veiculo.status = 'INATIVO' THEN
    RETURN jsonb_build_object('disponivel', false, 'motivo', 'Veiculo inativo');
  END IF;

  IF v_veiculo.status IN ('EM_MANUTENCAO', 'INDISPONIVEL') THEN
    RETURN jsonb_build_object('disponivel', false, 'motivo', 'Veiculo ' || lower(v_veiculo.status::text));
  END IF;

  SELECT 'indisponibilidade' AS origem, motivo, inicio, fim_previsto
  INTO v_bloqueio
  FROM public.guarda_frota_indisponibilidades
  WHERE veiculo_id = p_veiculo_id
    AND encerrado_em IS NULL
    AND tstzrange(inicio, coalesce(fim_previsto, 'infinity'::timestamptz), '[)') && tstzrange(p_inicio, p_fim, '[)')
  ORDER BY inicio DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'disponivel', false,
      'motivo', v_bloqueio.motivo,
      'origem', v_bloqueio.origem,
      'inicio', v_bloqueio.inicio,
      'fim', v_bloqueio.fim_previsto
    );
  END IF;

  SELECT 'manutencao' AS origem, descricao_problema AS motivo, data_entrada AS inicio, data_prevista_saida AS fim_previsto
  INTO v_bloqueio
  FROM public.guarda_frota_manutencoes
  WHERE veiculo_id = p_veiculo_id
    AND data_conclusao IS NULL
    AND tstzrange(data_entrada, coalesce(data_prevista_saida, 'infinity'::timestamptz), '[)') && tstzrange(p_inicio, p_fim, '[)')
  ORDER BY data_entrada DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'disponivel', false,
      'motivo', v_bloqueio.motivo,
      'origem', v_bloqueio.origem,
      'inicio', v_bloqueio.inicio,
      'fim', v_bloqueio.fim_previsto
    );
  END IF;

  RETURN jsonb_build_object('disponivel', true, 'motivo', 'Disponivel');
END;
$$;

ALTER TABLE public.guarda_frota_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guarda_frota_veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guarda_frota_indisponibilidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guarda_frota_manutencoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guarda_frota_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guarda_frota_quilometragem_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guarda_frota_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage guarda frota categorias" ON public.guarda_frota_categorias;
CREATE POLICY "Admins can manage guarda frota categorias"
ON public.guarda_frota_categorias
FOR ALL TO authenticated
USING (public.can_manage_guarda_frota())
WITH CHECK (public.can_manage_guarda_frota());

DROP POLICY IF EXISTS "Admins can manage guarda frota veiculos" ON public.guarda_frota_veiculos;
CREATE POLICY "Admins can manage guarda frota veiculos"
ON public.guarda_frota_veiculos
FOR ALL TO authenticated
USING (public.can_manage_guarda_frota())
WITH CHECK (public.can_manage_guarda_frota() AND setor_id = public.get_guarda_municipal_setor_id());

DROP POLICY IF EXISTS "Admins can manage guarda frota indisponibilidades" ON public.guarda_frota_indisponibilidades;
CREATE POLICY "Admins can manage guarda frota indisponibilidades"
ON public.guarda_frota_indisponibilidades
FOR ALL TO authenticated
USING (public.can_manage_guarda_frota())
WITH CHECK (public.can_manage_guarda_frota());

DROP POLICY IF EXISTS "Admins can manage guarda frota manutencoes" ON public.guarda_frota_manutencoes;
CREATE POLICY "Admins can manage guarda frota manutencoes"
ON public.guarda_frota_manutencoes
FOR ALL TO authenticated
USING (public.can_manage_guarda_frota())
WITH CHECK (public.can_manage_guarda_frota());

DROP POLICY IF EXISTS "Admins can manage guarda frota documentos" ON public.guarda_frota_documentos;
CREATE POLICY "Admins can manage guarda frota documentos"
ON public.guarda_frota_documentos
FOR ALL TO authenticated
USING (public.can_manage_guarda_frota())
WITH CHECK (public.can_manage_guarda_frota());

DROP POLICY IF EXISTS "Admins can view guarda frota quilometragem" ON public.guarda_frota_quilometragem_historico;
CREATE POLICY "Admins can view guarda frota quilometragem"
ON public.guarda_frota_quilometragem_historico
FOR SELECT TO authenticated
USING (public.can_manage_guarda_frota());

DROP POLICY IF EXISTS "Admins can view guarda frota historico" ON public.guarda_frota_historico;
CREATE POLICY "Admins can view guarda frota historico"
ON public.guarda_frota_historico
FOR SELECT TO authenticated
USING (public.can_manage_guarda_frota());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.guarda_frota_categorias TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guarda_frota_veiculos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guarda_frota_indisponibilidades TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guarda_frota_manutencoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guarda_frota_documentos TO authenticated;
GRANT SELECT ON public.guarda_frota_quilometragem_historico TO authenticated;
GRANT SELECT ON public.guarda_frota_historico TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_guarda_frota() TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_guarda_frota_historico(uuid, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verificar_disponibilidade_viatura(uuid, timestamptz, timestamptz) TO authenticated;

INSERT INTO public.guarda_frota_categorias (nome, descricao, ordem)
VALUES
  ('Viatura Operacional', 'Viatura caracterizada para patrulhamento e emprego operacional.', 10),
  ('Motocicleta', 'Motocicleta utilizada em patrulhamento, apoio e deslocamentos.', 20),
  ('Caminhonete', 'Caminhonete operacional ou administrativa.', 30),
  ('SUV', 'Veiculo utilitario esportivo.', 40),
  ('Automovel', 'Automovel de apoio ou administrativo.', 50),
  ('Van', 'Van para transporte ou apoio operacional.', 60),
  ('Veiculo Administrativo', 'Veiculo de uso administrativo.', 70),
  ('Veiculo Especial', 'Veiculo com finalidade especifica.', 80)
ON CONFLICT (nome) DO NOTHING;

UPDATE auth.users au
SET raw_app_meta_data = jsonb_set(
  coalesce(au.raw_app_meta_data, '{}'::jsonb),
  '{modulos}',
  (
    SELECT jsonb_agg(DISTINCT value)
    FROM jsonb_array_elements_text(
      coalesce(au.raw_app_meta_data->'modulos', '[]'::jsonb) || '["guarda_frota"]'::jsonb
    ) AS value
  ),
  true
)
FROM public.perfis_usuarios pu
WHERE pu.user_id = au.id
  AND pu.ativo = true
  AND pu.setor_id = public.get_guarda_municipal_setor_id()
  AND pu.papel IN ('gestor'::public.papel_usuario, 'admin_setor'::public.papel_usuario, 'tecnico'::public.papel_usuario)
  AND coalesce(au.raw_app_meta_data->'modulos', '[]'::jsonb) <> '[]'::jsonb
  AND NOT (coalesce(au.raw_app_meta_data->'modulos', '[]'::jsonb) ? 'guarda_frota');
