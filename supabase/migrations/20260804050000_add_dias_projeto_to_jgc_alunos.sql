-- Migration: Adicionar coluna dias_projeto na tabela jgc_alunos e atualizar jgc_criar_aluno

ALTER TABLE public.jgc_alunos 
ADD COLUMN IF NOT EXISTS dias_projeto text[] DEFAULT '{}';

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
