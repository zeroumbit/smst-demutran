ALTER TABLE public.demutran_concessionarios
ADD COLUMN IF NOT EXISTS taxi_grupo text,
ADD COLUMN IF NOT EXISTS estacionamento text;

UPDATE public.demutran_concessionarios
SET taxi_grupo = CASE
    WHEN categoria <> 'taxi' THEN taxi_grupo
    WHEN lower(coalesce(origem_planilha, '')) LIKE '%astac%' THEN 'ASTAC'
    WHEN lower(coalesce(origem_planilha, '')) LIKE '%cootac%' THEN 'COOTAC'
    WHEN lower(coalesce(origem_planilha, '')) LIKE '%cotac%' THEN 'COOTAC'
    WHEN lower(coalesce(origem_planilha, '')) LIKE '%distrito%' THEN 'DISTRITO'
    ELSE taxi_grupo
  END,
  estacionamento = CASE
    WHEN categoria = 'taxi' AND lower(coalesce(origem_planilha, '')) LIKE '%distrito%'
      THEN coalesce(estacionamento, ponto_referencia)
    ELSE estacionamento
  END
WHERE categoria = 'taxi';

COMMENT ON COLUMN public.demutran_concessionarios.taxi_grupo IS 'Grupo do taxista: ASTAC, COOTAC ou DISTRITO.';
COMMENT ON COLUMN public.demutran_concessionarios.estacionamento IS 'Nome do estacionamento/ponto principal do taxista.';
