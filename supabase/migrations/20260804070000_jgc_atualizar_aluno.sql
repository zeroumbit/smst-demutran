-- Migration: Função RPC para atualizar cadastro de aluno no Jovem Guarda Cidadã

CREATE OR REPLACE FUNCTION public.jgc_atualizar_aluno(
  _aluno_id uuid,
  _dados jsonb
) RETURNS public.jgc_alunos
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _aluno public.jgc_alunos%ROWTYPE;
  _turma_id uuid;
  _dias_arr text[];
BEGIN
  IF NOT public.jgc_tem_acesso(ARRAY['gestor','administrativo']::public.jgc_perfil[]) THEN
    RAISE EXCEPTION 'Sem permissao para editar alunos.';
  END IF;

  SELECT * INTO _aluno FROM public.jgc_alunos WHERE id = _aluno_id AND deleted_at IS NULL;
  IF _aluno.id IS NULL THEN
    RAISE EXCEPTION 'Aluno não encontrado.';
  END IF;

  IF _dados ? 'dias_projeto' AND jsonb_typeof(_dados->'dias_projeto') = 'array' THEN
    SELECT array_agg(value) INTO _dias_arr
    FROM jsonb_array_elements_text(_dados->'dias_projeto') AS value;
  ELSE
    _dias_arr := _aluno.dias_projeto;
  END IF;

  UPDATE public.jgc_alunos SET
    nome_completo = coalesce(nullif(trim(_dados->>'nome_completo'),''), nome_completo),
    data_nascimento = coalesce((_dados->>'data_nascimento')::date, data_nascimento),
    sexo = nullif(_dados->>'sexo',''),
    cpf = nullif(regexp_replace(coalesce(_dados->>'cpf',''),'\D','','g'),''),
    rg = nullif(_dados->>'rg',''),
    nis = nullif(_dados->>'nis',''),
    foto_url = nullif(_dados->>'foto_url',''),
    naturalidade_cidade = nullif(_dados->>'naturalidade_cidade',''),
    naturalidade_uf = nullif(upper(_dados->>'naturalidade_uf'),''),
    data_entrada = coalesce((_dados->>'data_entrada')::date, data_entrada),
    serie_ano = nullif(_dados->>'serie_ano',''),
    escola_nome = nullif(trim(_dados->>'escola_nome'),''),
    turno_escola = nullif(_dados->>'turno_escola',''),
    horario_escola = nullif(_dados->>'horario_escola',''),
    turma_id = nullif(_dados->>'turma_id','')::uuid,
    projeto_hora_inicio = nullif(_dados->>'projeto_hora_inicio','')::time,
    projeto_hora_fim = nullif(_dados->>'projeto_hora_fim','')::time,
    dias_projeto = coalesce(_dias_arr, '{}'::text[]),
    situacao = coalesce((_dados->>'situacao')::public.jgc_situacao_aluno, situacao),
    updated_at = now()
  WHERE id = _aluno_id
  RETURNING * INTO _aluno;

  -- Atualizar turmas_ids na tabela de junção jgc_aluno_turmas
  IF _dados ? 'turmas_ids' AND jsonb_typeof(_dados->'turmas_ids') = 'array' THEN
    DELETE FROM public.jgc_aluno_turmas WHERE aluno_id = _aluno_id;
    FOR _turma_id IN SELECT jsonb_array_elements_text(_dados->'turmas_ids')::uuid LOOP
      INSERT INTO public.jgc_aluno_turmas (aluno_id, turma_id)
      VALUES (_aluno_id, _turma_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  -- Atualizar dados de saúde em jgc_aluno_saude
  INSERT INTO public.jgc_aluno_saude (
    aluno_id, tipo_sanguineo, possui_condicao, condicao_saude, observacao_saude,
    usa_medicamento, medicamentos, orientacao_medicamento
  ) VALUES (
    _aluno_id,
    coalesce(nullif(_dados->>'tipo_sanguineo',''),'nao_informado'),
    coalesce(nullif(_dados->>'possui_condicao',''),'nao_informado'),
    nullif(_dados->>'condicao_saude',''),
    nullif(_dados->>'observacao_saude',''),
    coalesce(nullif(_dados->>'usa_medicamento',''),'nao_informado'),
    nullif(_dados->>'medicamentos',''),
    nullif(_dados->>'orientacao_medicamento','')
  )
  ON CONFLICT (aluno_id) DO UPDATE SET
    tipo_sanguineo = excluded.tipo_sanguineo,
    possui_condicao = excluded.possui_condicao,
    condicao_saude = excluded.condicao_saude,
    observacao_saude = excluded.observacao_saude,
    usa_medicamento = excluded.usa_medicamento,
    medicamentos = excluded.medicamentos,
    orientacao_medicamento = excluded.orientacao_medicamento,
    updated_at = now();

  RETURN _aluno;
END;
$$;

GRANT EXECUTE ON FUNCTION public.jgc_atualizar_aluno(uuid, jsonb) TO authenticated;
