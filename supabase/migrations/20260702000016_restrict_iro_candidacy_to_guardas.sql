-- =====================================================
-- MIGRATION: Restrict IRO candidacy to active guardas only
-- Re-defines candidatar_se_iro RPC function with a guard check
-- =====================================================

CREATE OR REPLACE FUNCTION public.candidatar_se_iro(
  p_operacao_id uuid,
  p_usuario_id uuid,
  p_data date
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_disponivel integer;
  v_vagas_por_dia integer;
  v_horas_por_dia numeric;
  v_mes date;
  v_total_mes numeric;
  v_limite_mes numeric := 72;
  v_ja_candidatou boolean;
  v_operacao_existe boolean;
begin
  -- 1. Garantir que o usuario seja um guarda municipal ativo
  if not exists (
    select 1 from public.guardas_usuarios gu
    join public.guardas_municipais gm on gm.id = gu.guarda_id
    where gu.usuario_id = p_usuario_id and gm.ativo = true
  ) then
    return jsonb_build_object(
      'sucesso', false,
      'mensagem', 'Apenas guardas municipais ativos com graduacao podem se candidatar as operacoes.'
    );
  end if;

  -- 2. Restante das verificações originais
  select exists (
    select 1 from iro_operacoes
    where id = p_operacao_id and ativo = true
      and p_data between data_inicio and data_fim
  ) into v_operacao_existe;

  if not v_operacao_existe then
    return jsonb_build_object(
      'sucesso', false,
      'mensagem', 'Operacao nao encontrada, inativa ou data fora do periodo'
    );
  end if;

  select exists (
    select 1 from iro_candidaturas
    where operacao_id = p_operacao_id
      and usuario_id = p_usuario_id
      and data_operacao = p_data
      and status in ('confirmado', 'realizado')
  ) into v_ja_candidatou;

  if v_ja_candidatou then
    return jsonb_build_object(
      'sucesso', false,
      'mensagem', 'Voce ja esta cadastrado nesta operacao para esta data'
    );
  end if;

  select vagas_por_dia, horas_por_dia into v_vagas_por_dia, v_horas_por_dia
  from iro_operacoes
  where id = p_operacao_id;

  v_disponivel := public.verificar_disponibilidade_iro(p_operacao_id, p_data);

  if v_disponivel <= 0 then
    return jsonb_build_object(
      'sucesso', false,
      'mensagem', 'Nao ha vagas disponiveis para esta data'
    );
  end if;

  v_mes := date_trunc('month', p_data);
  select coalesce(sum(horas_trabalhadas), 0) into v_total_mes
  from iro_candidaturas
  where usuario_id = p_usuario_id
    and date_trunc('month', data_operacao) = v_mes
    and status in ('confirmado', 'realizado');

  if (v_total_mes + v_horas_por_dia) > v_limite_mes then
    return jsonb_build_object(
      'sucesso', false,
      'mensagem', 'Limite mensal de 72h excedido. Voce ja possui ' || v_total_mes || 'h no mes'
    );
  end if;

  insert into iro_candidaturas (operacao_id, usuario_id, data_operacao, horas_trabalhadas, status)
  values (p_operacao_id, p_usuario_id, p_data, v_horas_por_dia, 'confirmado');

  if (v_total_mes + v_horas_por_dia) >= (v_limite_mes * 0.8) then
    insert into iro_notificacoes (usuario_id, titulo, mensagem, tipo)
    values (
      p_usuario_id,
      'Atencao: Limite de IRO',
      'Voce esta proximo de atingir o limite mensal de 72h. Total atual: ' ||
      round((v_total_mes + v_horas_por_dia)::numeric, 2) || 'h',
      'alerta'
    );
  end if;

  return jsonb_build_object(
    'sucesso', true,
    'mensagem', 'Candidatura realizada com sucesso!',
    'total_mes', round((v_total_mes + v_horas_por_dia)::numeric, 2)
  );
end;
$$;
