DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'demutran_credencial_tipo'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.demutran_credencial_tipo AS ENUM ('idoso', 'pcd');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'demutran_solicitacao_status'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.demutran_solicitacao_status AS ENUM (
      'pendente',
      'em_analise',
      'aprovado',
      'rejeitado',
      'concluido'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'demutran_recurso_tipo'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE public.demutran_recurso_tipo AS ENUM ('defesa_previa', 'jari');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_demutran_setor_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id
  FROM public.setores
  WHERE slug = 'demutran'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.generate_demutran_protocol(_prefix text)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN upper(_prefix) || '-'
    || to_char(now(), 'YYYYMMDDHH24MISS')
    || '-'
    || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
END;
$$;

CREATE TABLE IF NOT EXISTS public.demutran_veiculos_municipais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id uuid NOT NULL DEFAULT public.get_demutran_setor_id() REFERENCES public.setores(id) ON DELETE RESTRICT,
  placa text NOT NULL,
  chassi text NOT NULL,
  secretaria_responsavel text NOT NULL,
  observacao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.demutran_credenciais_solicitacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id uuid NOT NULL DEFAULT public.get_demutran_setor_id() REFERENCES public.setores(id) ON DELETE RESTRICT,
  protocolo text NOT NULL DEFAULT public.generate_demutran_protocol('CRD'),
  tipo public.demutran_credencial_tipo NOT NULL,
  nome_completo text NOT NULL,
  cpf text NOT NULL,
  email text,
  telefone text,
  endereco text NOT NULL,
  observacao text,
  documento_identidade_url text,
  comprovante_residencia_url text,
  laudo_medico_url text,
  status public.demutran_solicitacao_status NOT NULL DEFAULT 'pendente',
  analisado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  analisado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.demutran_recursos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id uuid NOT NULL DEFAULT public.get_demutran_setor_id() REFERENCES public.setores(id) ON DELETE RESTRICT,
  protocolo text NOT NULL DEFAULT public.generate_demutran_protocol('RCR'),
  tipo public.demutran_recurso_tipo NOT NULL,
  nome_completo text NOT NULL,
  cpf text NOT NULL,
  email text,
  telefone text,
  placa text,
  auto_infracao text NOT NULL,
  defesa_documento_url text NOT NULL,
  observacao text,
  status public.demutran_solicitacao_status NOT NULL DEFAULT 'pendente',
  analisado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  analisado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS demutran_veiculos_municipais_placa_unq
  ON public.demutran_veiculos_municipais (upper(regexp_replace(placa, '[^A-Z0-9]', '', 'g')));
CREATE UNIQUE INDEX IF NOT EXISTS demutran_veiculos_municipais_chassi_unq
  ON public.demutran_veiculos_municipais (upper(chassi));
CREATE UNIQUE INDEX IF NOT EXISTS demutran_credenciais_solicitacoes_protocolo_unq
  ON public.demutran_credenciais_solicitacoes (protocolo);
CREATE UNIQUE INDEX IF NOT EXISTS demutran_recursos_protocolo_unq
  ON public.demutran_recursos (protocolo);

CREATE INDEX IF NOT EXISTS demutran_credenciais_solicitacoes_status_idx
  ON public.demutran_credenciais_solicitacoes (status, created_at DESC);
CREATE INDEX IF NOT EXISTS demutran_recursos_status_idx
  ON public.demutran_recursos (status, created_at DESC);

DROP TRIGGER IF EXISTS trigger_atualizar_demutran_veiculos_municipais_updated_at ON public.demutran_veiculos_municipais;
CREATE TRIGGER trigger_atualizar_demutran_veiculos_municipais_updated_at
BEFORE UPDATE ON public.demutran_veiculos_municipais
FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

DROP TRIGGER IF EXISTS trigger_atualizar_demutran_credenciais_solicitacoes_updated_at ON public.demutran_credenciais_solicitacoes;
CREATE TRIGGER trigger_atualizar_demutran_credenciais_solicitacoes_updated_at
BEFORE UPDATE ON public.demutran_credenciais_solicitacoes
FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

DROP TRIGGER IF EXISTS trigger_atualizar_demutran_recursos_updated_at ON public.demutran_recursos;
CREATE TRIGGER trigger_atualizar_demutran_recursos_updated_at
BEFORE UPDATE ON public.demutran_recursos
FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

ALTER TABLE public.demutran_veiculos_municipais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demutran_credenciais_solicitacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demutran_recursos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage demutran veiculos municipais" ON public.demutran_veiculos_municipais;
CREATE POLICY "Admins can manage demutran veiculos municipais"
ON public.demutran_veiculos_municipais
FOR ALL
TO authenticated
USING (public.can_manage_setor_content(setor_id))
WITH CHECK (public.can_manage_setor_content(setor_id));

DROP POLICY IF EXISTS "Admins can manage demutran credenciais" ON public.demutran_credenciais_solicitacoes;
CREATE POLICY "Admins can manage demutran credenciais"
ON public.demutran_credenciais_solicitacoes
FOR ALL
TO authenticated
USING (public.can_manage_setor_content(setor_id))
WITH CHECK (public.can_manage_setor_content(setor_id));

DROP POLICY IF EXISTS "Admins can manage demutran recursos" ON public.demutran_recursos;
CREATE POLICY "Admins can manage demutran recursos"
ON public.demutran_recursos
FOR ALL
TO authenticated
USING (public.can_manage_setor_content(setor_id))
WITH CHECK (public.can_manage_setor_content(setor_id));

CREATE OR REPLACE FUNCTION public.criar_solicitacao_credencial(
  _tipo public.demutran_credencial_tipo,
  _nome_completo text,
  _cpf text,
  _email text DEFAULT NULL,
  _telefone text DEFAULT NULL,
  _endereco text DEFAULT NULL,
  _observacao text DEFAULT NULL,
  _documento_identidade_url text DEFAULT NULL,
  _comprovante_residencia_url text DEFAULT NULL,
  _laudo_medico_url text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  protocolo text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.demutran_credenciais_solicitacoes%ROWTYPE;
BEGIN
  INSERT INTO public.demutran_credenciais_solicitacoes (
    setor_id,
    tipo,
    nome_completo,
    cpf,
    email,
    telefone,
    endereco,
    observacao,
    documento_identidade_url,
    comprovante_residencia_url,
    laudo_medico_url
  )
  VALUES (
    public.get_demutran_setor_id(),
    _tipo,
    trim(_nome_completo),
    trim(_cpf),
    NULLIF(trim(_email), ''),
    NULLIF(trim(_telefone), ''),
    trim(_endereco),
    NULLIF(trim(_observacao), ''),
    NULLIF(trim(_documento_identidade_url), ''),
    NULLIF(trim(_comprovante_residencia_url), ''),
    NULLIF(trim(_laudo_medico_url), '')
  )
  RETURNING * INTO v_row;

  RETURN QUERY SELECT v_row.id, v_row.protocolo;
END;
$$;

CREATE OR REPLACE FUNCTION public.criar_recurso_demutran(
  _tipo public.demutran_recurso_tipo,
  _nome_completo text,
  _cpf text,
  _email text DEFAULT NULL,
  _telefone text DEFAULT NULL,
  _placa text DEFAULT NULL,
  _auto_infracao text DEFAULT NULL,
  _defesa_documento_url text DEFAULT NULL,
  _observacao text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  protocolo text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.demutran_recursos%ROWTYPE;
BEGIN
  INSERT INTO public.demutran_recursos (
    setor_id,
    tipo,
    nome_completo,
    cpf,
    email,
    telefone,
    placa,
    auto_infracao,
    defesa_documento_url,
    observacao
  )
  VALUES (
    public.get_demutran_setor_id(),
    _tipo,
    trim(_nome_completo),
    trim(_cpf),
    NULLIF(trim(_email), ''),
    NULLIF(trim(_telefone), ''),
    NULLIF(upper(regexp_replace(trim(coalesce(_placa, '')), '[^A-Z0-9]', '', 'g')), ''),
    trim(_auto_infracao),
    trim(_defesa_documento_url),
    NULLIF(trim(_observacao), '')
  )
  RETURNING * INTO v_row;

  RETURN QUERY SELECT v_row.id, v_row.protocolo;
END;
$$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('demutran-anexos', 'demutran-anexos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can upload demutran anexos" ON storage.objects;
CREATE POLICY "Public can upload demutran anexos"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'demutran-anexos');

DROP POLICY IF EXISTS "Authenticated can manage demutran anexos" ON storage.objects;
CREATE POLICY "Authenticated can manage demutran anexos"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'demutran-anexos')
WITH CHECK (bucket_id = 'demutran-anexos');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.demutran_veiculos_municipais TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demutran_credenciais_solicitacoes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demutran_recursos TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_demutran_setor_id() TO anon;
GRANT EXECUTE ON FUNCTION public.get_demutran_setor_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_demutran_protocol(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.criar_solicitacao_credencial(
  public.demutran_credencial_tipo,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) TO anon;
GRANT EXECUTE ON FUNCTION public.criar_solicitacao_credencial(
  public.demutran_credencial_tipo,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.criar_recurso_demutran(
  public.demutran_recurso_tipo,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) TO anon;
GRANT EXECUTE ON FUNCTION public.criar_recurso_demutran(
  public.demutran_recurso_tipo,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) TO authenticated;
