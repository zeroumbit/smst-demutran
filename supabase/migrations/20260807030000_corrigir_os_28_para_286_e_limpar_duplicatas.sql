-- Migration: Excluir O.S. 28 cancelada/substituída e renomear O.S. 28 ativa para 286 (Guarda Municipal)
-- Date: 2026-08-07 03:00:00

DO $$
DECLARE
  v_guarda_setor_id uuid;
BEGIN
  v_guarda_setor_id := public.get_guarda_municipal_setor_id();

  -- 1. Deletar O.S. com numero = 28 (ou numero_formatado contendo '28/2026' ou '028/2026') que estejam com status CANCELADA ou SUBSTITUIDA
  DELETE FROM public.guarda_ordens_servico
  WHERE setor_id = v_guarda_setor_id
    AND ano = 2026
    AND status IN ('CANCELADA', 'SUBSTITUIDA')
    AND (numero = 28 OR numero_formatado LIKE '%028/%' OR numero_formatado LIKE '% 28/%');

  -- 2. Atualizar a O.S. restante com número 28 para 286
  UPDATE public.guarda_ordens_servico
  SET
    numero = 286,
    numero_formatado = 'O.S. Nº 286/2026',
    updated_at = now()
  WHERE setor_id = v_guarda_setor_id
    AND ano = 2026
    AND (numero = 28 OR numero_formatado LIKE '%028/%' OR numero_formatado LIKE '% 28/%');

  -- 3. Atualizar histórico e notificações associados à O.S. 286
  UPDATE public.guarda_ordens_servico_historico h
  SET descricao = replace(replace(h.descricao, '028/2026', '286/2026'), '28/2026', '286/2026')
  FROM public.guarda_ordens_servico os
  WHERE h.ordem_servico_id = os.id
    AND os.setor_id = v_guarda_setor_id
    AND os.numero = 286;

  UPDATE public.admin_notifications
  SET
    titulo = replace(replace(titulo, '028/2026', '286/2026'), '28/2026', '286/2026'),
    mensagem = replace(replace(mensagem, '028/2026', '286/2026'), '28/2026', '286/2026')
  WHERE titulo LIKE '%028/2026%' OR titulo LIKE '%28/2026%'
     OR mensagem LIKE '%028/2026%' OR mensagem LIKE '%28/2026%';
END;
$$;
