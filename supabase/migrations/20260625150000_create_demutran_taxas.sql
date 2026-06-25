-- =====================================================
-- Migration: Criação da tabela de taxas do DEMUTRAN e população inicial
-- Fase: Apos Solicitacao de alteracao de veiculo
-- Descricao: Cria a tabela public.demutran_taxas, RLS, 
--           e faz o backfill com as taxas oficiais do ano 2026.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.demutran_taxas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setor_id UUID NOT NULL DEFAULT public.get_demutran_setor_id() REFERENCES public.setores(id) ON DELETE RESTRICT,
  tipo VARCHAR(50) NOT NULL, -- 'demutran', 'carro_horario', 'mototaxi'
  servico TEXT NOT NULL, -- Nome do serviço
  valor NUMERIC(10, 2), -- Valor numérico da taxa (pode ser nulo/0)
  observacao TEXT, -- Observação opcional (ex: '80 UFIR´s DO CEARÁ')
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.demutran_taxas ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- 1. Leitura pública de taxas (para qualquer pessoa ver o valor)
DROP POLICY IF EXISTS "Public read taxas" ON public.demutran_taxas;
CREATE POLICY "Public read taxas"
  ON public.demutran_taxas FOR SELECT TO anon, authenticated
  USING (true);

-- 2. Gerenciamento administrativo (apenas super_admin ou admin/gestor do respectivo setor)
DROP POLICY IF EXISTS "Admins can manage taxas" ON public.demutran_taxas;
CREATE POLICY "Admins can manage taxas"
  ON public.demutran_taxas FOR ALL TO authenticated
  USING (public.can_manage_demutran_content(setor_id))
  WITH CHECK (public.can_manage_demutran_content(setor_id));

-- Trigger para updated_at
CREATE TRIGGER trigger_atualizar_demutran_taxas_updated_at
  BEFORE UPDATE ON public.demutran_taxas
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

-- Conceder permissões para a API REST
GRANT SELECT ON public.demutran_taxas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demutran_taxas TO authenticated;

-- =====================================================
-- POPULAÇÃO INICIAL DAS TAXAS DO ANO 2026 (PDF)
-- =====================================================

-- 1. Taxas de Serviços Gerais do DEMUTRAN
INSERT INTO public.demutran_taxas (tipo, servico, valor, observacao) VALUES
  ('demutran', 'Vistoria Especial', 111.23, NULL),
  ('demutran', 'Expedição de Dados s/ Veículo', 34.32, NULL),
  ('demutran', 'Declaração de Ocorrência de Acidente', 34.32, NULL),
  ('demutran', 'Vistoria a Domicílio', 222.45, NULL),
  ('demutran', 'Mudança de Placa e/ou Targeta', 74.47, NULL),
  ('demutran', 'Taxa de Expediente', 29.65, NULL),
  ('demutran', 'Diária de Estadia', 13.87, NULL),
  ('demutran', 'Reboque', 125.11, NULL);

-- 2. Taxas de Taxistas / Concessionários Carro de Horário
INSERT INTO public.demutran_taxas (tipo, servico, valor, observacao) VALUES
  ('carro_horario', 'TLE - Taxa de Licenciamento de Emplacamento', 105.64, NULL),
  ('carro_horario', 'TSE - Taxa de Serviço de Expediente', 29.65, NULL),
  ('carro_horario', 'TVVA - Taxa de Vistoria em Veículo Automotor', 52.65, NULL),
  ('carro_horario', 'ISS - Imposto Sobre Serviço', 266.32, NULL),
  ('carro_horario', 'TTV - Taxa de Transferência de Veículo', 150.91, NULL),
  ('carro_horario', 'TTP - Taxa de Transferência de Propriedade', NULL, '80 UFIR´s DO CEARÁ');

-- 3. Taxas de Mototaxistas
INSERT INTO public.demutran_taxas (tipo, servico, valor, observacao) VALUES
  ('mototaxi', 'TLE - Taxa de Licenciamento de Emplacamento', 52.82, NULL),
  ('mototaxi', 'ISS - Imposto Sobre Serviço', 225.60, NULL),
  ('mototaxi', 'TTV - Taxa de Transferência de Veículo', 75.46, NULL),
  ('mototaxi', 'TTP - Taxa de Transferência de Propriedade', NULL, '80 UFIR´s DO CEARÁ');
