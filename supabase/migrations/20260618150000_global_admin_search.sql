CREATE OR REPLACE FUNCTION public.buscar_global_admin(
  _termo text,
  _limite_por_modulo int DEFAULT 5
)
RETURNS TABLE(
  modulo text,
  tabela text,
  registro_id uuid,
  titulo text,
  subtitulo text,
  rota text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_super_admin boolean;
  v_setor_id uuid;
  v_pattern text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  v_is_super_admin := public.is_super_admin();

  IF NOT v_is_super_admin THEN
    SELECT pu.setor_id INTO v_setor_id
    FROM perfis_usuarios pu
    WHERE pu.user_id = auth.uid()
      AND pu.ativo = true
    ORDER BY pu.created_at ASC
    LIMIT 1;
  END IF;

  v_pattern := '%' || _termo || '%';

  RETURN QUERY
  SELECT 'veiculos'::text, 'veiculos_recolhidos'::text, vr.id,
         COALESCE(vr.placa, 'SEM PLACA'),
         COALESCE(vr.descricao_veiculo, '') || ' - ' || COALESCE(vr.proprietario_nome, ''),
         '/admin/demutran/veiculos'::text
  FROM veiculos_recolhidos vr
  WHERE (vr.placa ILIKE v_pattern OR vr.chassi ILIKE v_pattern
         OR vr.proprietario_nome ILIKE v_pattern OR vr.descricao_veiculo ILIKE v_pattern
         OR vr.motivo ILIKE v_pattern OR vr.situacao ILIKE v_pattern
         OR vr.numero_liberacao ILIKE v_pattern)
    AND (v_is_super_admin OR vr.setor_id = v_setor_id)
  LIMIT _limite_por_modulo;

  RETURN QUERY
  SELECT 'concessionarios'::text, 'demutran_concessionarios'::text, dc.id,
         COALESCE(dc.titular_nome, 'SEM NOME'),
         COALESCE(dc.placa, 'SEM PLACA') || ' | Vaga ' || COALESCE(dc.numero_vaga, 'N/I'),
         '/admin/demutran/concessionarios'::text
  FROM demutran_concessionarios dc
  WHERE (dc.titular_nome ILIKE v_pattern OR dc.placa ILIKE v_pattern
         OR dc.cpf ILIKE v_pattern OR dc.numero_vaga ILIKE v_pattern
         OR dc.rota ILIKE v_pattern OR dc.veiculo ILIKE v_pattern
         OR dc.motorista_auxiliar ILIKE v_pattern)
    AND (v_is_super_admin OR dc.setor_id = v_setor_id)
  LIMIT _limite_por_modulo;

  RETURN QUERY
  SELECT 'credenciais'::text, 'demutran_credenciais_solicitacoes'::text, dcs.id,
         COALESCE(dcs.protocolo, 'SEM PROTOCOLO'),
         COALESCE(dcs.nome_completo, '') || ' - CPF: ' || COALESCE(dcs.cpf, 'N/I'),
         '/admin/demutran/credenciais'::text
  FROM demutran_credenciais_solicitacoes dcs
  WHERE (dcs.protocolo ILIKE v_pattern OR dcs.nome_completo ILIKE v_pattern
         OR dcs.cpf ILIKE v_pattern OR dcs.rg ILIKE v_pattern
         OR dcs.email ILIKE v_pattern OR dcs.telefone ILIKE v_pattern)
    AND (v_is_super_admin OR dcs.setor_id = v_setor_id)
  LIMIT _limite_por_modulo;

  RETURN QUERY
  SELECT 'recursos'::text, 'demutran_recursos'::text, dr.id,
         COALESCE(dr.protocolo, 'SEM PROTOCOLO'),
         COALESCE(dr.nome_completo, '') || ' - Auto: ' || COALESCE(dr.auto_infracao, 'N/I'),
         '/admin/demutran/recursos'::text
  FROM demutran_recursos dr
  WHERE (dr.protocolo ILIKE v_pattern OR dr.nome_completo ILIKE v_pattern
         OR dr.cpf ILIKE v_pattern OR dr.placa ILIKE v_pattern
         OR dr.auto_infracao ILIKE v_pattern)
    AND (v_is_super_admin OR dr.setor_id = v_setor_id)
  LIMIT _limite_por_modulo;

  RETURN QUERY
  SELECT 'frota'::text, 'demutran_veiculos_municipais'::text, dvm.id,
         COALESCE(dvm.placa, 'SEM PLACA'),
         COALESCE(dvm.secretaria_responsavel, '') || ' | ' || COALESCE(dvm.motorista_responsavel, ''),
         '/admin/demutran/frota'::text
  FROM demutran_veiculos_municipais dvm
  WHERE (dvm.placa ILIKE v_pattern OR dvm.chassi ILIKE v_pattern
         OR dvm.secretaria_responsavel ILIKE v_pattern
         OR dvm.motorista_responsavel ILIKE v_pattern)
    AND (v_is_super_admin OR dvm.setor_id = v_setor_id)
  LIMIT _limite_por_modulo;

  RETURN QUERY
  SELECT 'midias'::text, 'demutran_midias'::text, dm.id,
         COALESCE(dm.titulo, 'SEM TITULO'),
         COALESCE(dm.descricao, ''),
         '/admin/demutran/midias'::text
  FROM demutran_midias dm
  WHERE (dm.titulo ILIKE v_pattern OR dm.descricao ILIKE v_pattern)
    AND (v_is_super_admin OR dm.setor_id = v_setor_id)
  LIMIT _limite_por_modulo;

  RETURN QUERY
  SELECT 'noticias'::text, 'noticias'::text, n.id,
         COALESCE(n.titulo, 'SEM TITULO'),
         COALESCE(n.resumo, ''),
         '/admin/noticias'::text
  FROM noticias n
  WHERE (n.titulo ILIKE v_pattern OR n.resumo ILIKE v_pattern)
    AND (v_is_super_admin OR n.setor_id = v_setor_id)
  LIMIT _limite_por_modulo;

  RETURN QUERY
  SELECT 'eventos'::text, 'eventos'::text, e.id,
         COALESCE(e.titulo, 'SEM TITULO'),
         COALESCE(e.local, '') || ' - ' || COALESCE(e.descricao, ''),
         '/admin/eventos'::text
  FROM eventos e
  WHERE (e.titulo ILIKE v_pattern OR e.descricao ILIKE v_pattern
         OR e.local ILIKE v_pattern)
    AND (v_is_super_admin OR e.setor_id = v_setor_id)
  LIMIT _limite_por_modulo;

  RETURN QUERY
  SELECT 'documentos'::text, 'documentos'::text, d.id,
         COALESCE(d.nome, 'SEM NOME'),
         COALESCE(d.descricao, ''),
         '/admin/documentos'::text
  FROM documentos d
  WHERE (d.nome ILIKE v_pattern OR d.descricao ILIKE v_pattern)
    AND (v_is_super_admin OR d.setor_id = v_setor_id)
  LIMIT _limite_por_modulo;

  RETURN;
END;
$$;
