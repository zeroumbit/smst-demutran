-- =====================================================
-- RH Avancado - Ficha completa do servidor
-- Campos extras + validacao de ponto vs afastamento
-- =====================================================

-- 1. Campos adicionais na ficha do servidor
ALTER TABLE public.rh_servidores
  ADD COLUMN IF NOT EXISTS genero text,
  ADD COLUMN IF NOT EXISTS estado_civil text,
  ADD COLUMN IF NOT EXISTS escolaridade text,
  ADD COLUMN IF NOT EXISTS banco text,
  ADD COLUMN IF NOT EXISTS agencia text,
  ADD COLUMN IF NOT EXISTS conta text,
  ADD COLUMN IF NOT EXISTS contato_emergencia_nome text,
  ADD COLUMN IF NOT EXISTS contato_emergencia_telefone text;

-- 2. Valida: servidor esta afastado em uma data (usada por triggers/RPCs)
CREATE OR REPLACE FUNCTION public.rh_servidor_afastado_em(_servidor_id uuid, _data date)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rh_afastamentos
    WHERE servidor_id = _servidor_id
      AND _data BETWEEN data_inicio AND data_fim
  );
$$;

GRANT EXECUTE ON FUNCTION public.rh_servidor_afastado_em(uuid, date) TO authenticated;

-- 3. Bloqueia registro de ponto em dia de afastamento
CREATE OR REPLACE FUNCTION public.rh_bloquear_ponto_em_afastamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.rh_servidor_afastado_em(NEW.servidor_id, NEW.data_ponto) THEN
    RAISE EXCEPTION 'Servidor esta em afastamento (ferias/atestado/licenca) na data informada.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rh_bloquear_ponto_afastamento ON public.rh_folhas_ponto;
CREATE TRIGGER trg_rh_bloquear_ponto_afastamento
  BEFORE INSERT OR UPDATE OF servidor_id, data_ponto ON public.rh_folhas_ponto
  FOR EACH ROW EXECUTE FUNCTION public.rh_bloquear_ponto_em_afastamento();

-- 4. Funcao para listar afastamentos vencendo nos proximos N dias
CREATE OR REPLACE FUNCTION public.rh_afastamentos_a_vencer(_dias integer DEFAULT 7)
RETURNS TABLE (
  id uuid,
  servidor_id uuid,
  servidor_nome text,
  tipo text,
  data_inicio date,
  data_fim date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT a.id, a.servidor_id, s.nome_completo, a.tipo, a.data_inicio, a.data_fim
  FROM public.rh_afastamentos a
  JOIN public.rh_servidores s ON s.id = a.servidor_id
  WHERE a.data_fim >= current_date
    AND a.data_fim <= current_date + _dias
  ORDER BY a.data_fim;
$$;

GRANT EXECUTE ON FUNCTION public.rh_afastamentos_a_vencer(integer) TO authenticated;
