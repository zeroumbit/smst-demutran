-- Migration: Limpeza de duplicatas de LUIDE MENDES OLIVEIRA e proteção contra duplo cadastro em jgc_criar_aluno

-- 1. Eliminar duplicatas mantendo apenas o primeiro registro de LUIDE MENDES OLIVEIRA
DO $$
DECLARE
  _keep_id uuid;
  _dup_ids uuid[];
BEGIN
  SELECT id INTO _keep_id
  FROM public.jgc_alunos
  WHERE upper(trim(nome_completo)) LIKE '%LUIDE MENDES OLIVEIRA%'
    AND deleted_at IS NULL
  ORDER BY created_at ASC, id ASC
  LIMIT 1;

  IF _keep_id IS NOT NULL THEN
    SELECT array_agg(id) INTO _dup_ids
    FROM public.jgc_alunos
    WHERE upper(trim(nome_completo)) LIKE '%LUIDE MENDES OLIVEIRA%'
      AND deleted_at IS NULL
      AND id <> _keep_id;

    IF _dup_ids IS NOT NULL AND array_length(_dup_ids, 1) > 0 THEN
      IF to_regclass('public.jgc_aluno_saude') IS NOT NULL THEN DELETE FROM public.jgc_aluno_saude WHERE aluno_id = ANY(_dup_ids); END IF;
      IF to_regclass('public.jgc_aluno_turmas') IS NOT NULL THEN DELETE FROM public.jgc_aluno_turmas WHERE aluno_id = ANY(_dup_ids); END IF;
      IF to_regclass('public.jgc_responsaveis') IS NOT NULL THEN DELETE FROM public.jgc_responsaveis WHERE aluno_id = ANY(_dup_ids); END IF;
      IF to_regclass('public.jgc_frequencias') IS NOT NULL THEN DELETE FROM public.jgc_frequencias WHERE aluno_id = ANY(_dup_ids); END IF;
      IF to_regclass('public.jgc_chamada_geral_alunos') IS NOT NULL THEN DELETE FROM public.jgc_chamada_geral_alunos WHERE aluno_id = ANY(_dup_ids); END IF;
      IF to_regclass('public.jgc_atendimentos') IS NOT NULL THEN DELETE FROM public.jgc_atendimentos WHERE aluno_id = ANY(_dup_ids); END IF;
      IF to_regclass('public.jgc_atividade_participantes') IS NOT NULL THEN DELETE FROM public.jgc_atividade_participantes WHERE aluno_id = ANY(_dup_ids); END IF;
      IF to_regclass('public.jgc_aluno_documentos') IS NOT NULL THEN DELETE FROM public.jgc_aluno_documentos WHERE aluno_id = ANY(_dup_ids); END IF;
      IF to_regclass('public.jgc_acoes') IS NOT NULL THEN DELETE FROM public.jgc_acoes WHERE aluno_id = ANY(_dup_ids); END IF;
      IF to_regclass('public.jgc_encaminhamentos') IS NOT NULL THEN DELETE FROM public.jgc_encaminhamentos WHERE aluno_id = ANY(_dup_ids); END IF;
      IF to_regclass('public.jgc_alertas_encerrados') IS NOT NULL THEN DELETE FROM public.jgc_alertas_encerrados WHERE aluno_id = ANY(_dup_ids); END IF;
      
      DELETE FROM public.jgc_alunos WHERE id = ANY(_dup_ids);
    END IF;
  END IF;
END;
$$;

-- 2. Limpeza geral de quaisquer outros alunos duplicados por (nome_completo, data_nascimento)
DO $$
DECLARE
  _r RECORD;
  _keep_id uuid;
  _dup_ids uuid[];
BEGIN
  FOR _r IN 
    SELECT upper(trim(nome_completo)) AS nome, data_nascimento, count(*)
    FROM public.jgc_alunos
    WHERE deleted_at IS NULL
    GROUP BY upper(trim(nome_completo)), data_nascimento
    HAVING count(*) > 1
  LOOP
    SELECT id INTO _keep_id
    FROM public.jgc_alunos
    WHERE upper(trim(nome_completo)) = _r.nome
      AND data_nascimento = _r.data_nascimento
      AND deleted_at IS NULL
    ORDER BY created_at ASC, id ASC
    LIMIT 1;

    SELECT array_agg(id) INTO _dup_ids
    FROM public.jgc_alunos
    WHERE upper(trim(nome_completo)) = _r.nome
      AND data_nascimento = _r.data_nascimento
      AND deleted_at IS NULL
      AND id <> _keep_id;

    IF _dup_ids IS NOT NULL AND array_length(_dup_ids, 1) > 0 THEN
      IF to_regclass('public.jgc_aluno_saude') IS NOT NULL THEN DELETE FROM public.jgc_aluno_saude WHERE aluno_id = ANY(_dup_ids); END IF;
      IF to_regclass('public.jgc_aluno_turmas') IS NOT NULL THEN DELETE FROM public.jgc_aluno_turmas WHERE aluno_id = ANY(_dup_ids); END IF;
      IF to_regclass('public.jgc_responsaveis') IS NOT NULL THEN DELETE FROM public.jgc_responsaveis WHERE aluno_id = ANY(_dup_ids); END IF;
      IF to_regclass('public.jgc_frequencias') IS NOT NULL THEN DELETE FROM public.jgc_frequencias WHERE aluno_id = ANY(_dup_ids); END IF;
      IF to_regclass('public.jgc_chamada_geral_alunos') IS NOT NULL THEN DELETE FROM public.jgc_chamada_geral_alunos WHERE aluno_id = ANY(_dup_ids); END IF;
      IF to_regclass('public.jgc_atendimentos') IS NOT NULL THEN DELETE FROM public.jgc_atendimentos WHERE aluno_id = ANY(_dup_ids); END IF;
      IF to_regclass('public.jgc_atividade_participantes') IS NOT NULL THEN DELETE FROM public.jgc_atividade_participantes WHERE aluno_id = ANY(_dup_ids); END IF;
      IF to_regclass('public.jgc_aluno_documentos') IS NOT NULL THEN DELETE FROM public.jgc_aluno_documentos WHERE aluno_id = ANY(_dup_ids); END IF;
      IF to_regclass('public.jgc_acoes') IS NOT NULL THEN DELETE FROM public.jgc_acoes WHERE aluno_id = ANY(_dup_ids); END IF;
      IF to_regclass('public.jgc_encaminhamentos') IS NOT NULL THEN DELETE FROM public.jgc_encaminhamentos WHERE aluno_id = ANY(_dup_ids); END IF;
      IF to_regclass('public.jgc_alertas_encerrados') IS NOT NULL THEN DELETE FROM public.jgc_alertas_encerrados WHERE aluno_id = ANY(_dup_ids); END IF;

      DELETE FROM public.jgc_alunos WHERE id = ANY(_dup_ids);
    END IF;
  END LOOP;
END;
$$;

-- 3. Atualizar a função jgc_criar_aluno para evitar cadastros duplicados acidentais
CREATE OR REPLACE FUNCTION public.jgc_criar_aluno(_dados jsonb)
RETURNS public.jgc_alunos
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _numero bigint;
  _cfg public.jgc_configuracoes%ROWTYPE;
  _aluno public.jgc_alunos%ROWTYPE;
  _turma_id uuid;
  _dias_arr text[];
BEGIN
  IF NOT public.jgc_tem_acesso(ARRAY['gestor','administrativo']::public.jgc_perfil[]) THEN
    RAISE EXCEPTION 'Sem permissao para cadastrar alunos.';
  END IF;

  -- 1. Se já existir aluno ativo com mesmo nome e data de nascimento, retorna o existente sem duplicar
  SELECT * INTO _aluno
  FROM public.jgc_alunos
  WHERE upper(trim(nome_completo)) = upper(trim(_dados->>'nome_completo'))
    AND data_nascimento = (_dados->>'data_nascimento')::date
    AND deleted_at IS NULL
  ORDER BY created_at ASC
  LIMIT 1;

  IF _aluno.id IS NOT NULL THEN
    RETURN _aluno;
  END IF;

  SELECT * INTO _cfg FROM public.jgc_configuracoes LIMIT 1;
  _numero := nextval('public.jgc_matricula_seq');

  IF _dados ? 'dias_projeto' AND jsonb_typeof(_dados->'dias_projeto') = 'array' THEN
    SELECT array_agg(value) INTO _dias_arr
    FROM jsonb_array_elements_text(_dados->'dias_projeto') AS value;
  END IF;

  INSERT INTO public.jgc_alunos (
    matricula,nome_completo,data_nascimento,sexo,cpf,rg,nis,foto_url,
    naturalidade_cidade,naturalidade_uf,data_entrada,serie_ano,escola_nome,
    turno_escola,horario_escola,turma_id,projeto_hora_inicio,projeto_hora_fim,
    dias_projeto,situacao
  ) VALUES (
    _cfg.prefixo_matricula || lpad(_numero::text, _cfg.digitos_matricula, '0'),
    trim(_dados->>'nome_completo'),(_dados->>'data_nascimento')::date,_dados->>'sexo',
    nullif(regexp_replace(coalesce(_dados->>'cpf',''),'\D','','g'),''),
    nullif(_dados->>'rg',''),nullif(_dados->>'nis',''),nullif(_dados->>'foto_url',''),
    nullif(_dados->>'naturalidade_cidade',''),nullif(upper(_dados->>'naturalidade_uf'),''),
    coalesce((_dados->>'data_entrada')::date,current_date),nullif(_dados->>'serie_ano',''),
    nullif(trim(_dados->>'escola_nome'),''),nullif(_dados->>'turno_escola',''),
    nullif(_dados->>'horario_escola',''),nullif(_dados->>'turma_id','')::uuid,
    nullif(_dados->>'projeto_hora_inicio','')::time,nullif(_dados->>'projeto_hora_fim','')::time,
    coalesce(_dias_arr, '{}'::text[]),
    coalesce((_dados->>'situacao')::public.jgc_situacao_aluno,'ativo')
  ) RETURNING * INTO _aluno;

  -- Inserir na tabela de junção (array turmas_ids ou turma_id direto)
  IF _dados ? 'turmas_ids' AND jsonb_typeof(_dados->'turmas_ids') = 'array' AND jsonb_array_length(_dados->'turmas_ids') > 0 THEN
    FOR _turma_id IN SELECT jsonb_array_elements_text(_dados->'turmas_ids')::uuid LOOP
      INSERT INTO public.jgc_aluno_turmas (aluno_id, turma_id)
      VALUES (_aluno.id, _turma_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  ELSIF _aluno.turma_id IS NOT NULL THEN
    INSERT INTO public.jgc_aluno_turmas (aluno_id, turma_id)
    VALUES (_aluno.id, _aluno.turma_id)
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.jgc_aluno_saude (
    aluno_id,tipo_sanguineo,possui_condicao,condicao_saude,observacao_saude,
    usa_medicamento,medicamentos,orientacao_medicamento
  ) VALUES (
    _aluno.id,
    coalesce(nullif(_dados->>'tipo_sanguineo',''),'nao_informado'),
    coalesce(nullif(_dados->>'possui_condicao',''),'nao_informado'),
    nullif(_dados->>'condicao_saude',''),nullif(_dados->>'observacao_saude',''),
    coalesce(nullif(_dados->>'usa_medicamento',''),'nao_informado'),
    nullif(_dados->>'medicamentos',''),nullif(_dados->>'orientacao_medicamento','')
  );
  RETURN _aluno;
END;
$$;

GRANT EXECUTE ON FUNCTION public.jgc_criar_aluno(jsonb) TO authenticated;
