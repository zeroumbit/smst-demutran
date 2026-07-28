-- =====================================================
-- 1. Junction table: aluno <-> turma (many-to-many)
-- 2. Update jgc_criar_aluno to accept turmas_ids
-- 3. RPC to update aluno turmas
-- 4. Storage bucket for student photos
-- =====================================================

-- 1. Junction table
CREATE TABLE IF NOT EXISTS public.jgc_aluno_turmas (
  aluno_id uuid NOT NULL REFERENCES public.jgc_alunos(id) ON DELETE CASCADE,
  turma_id uuid NOT NULL REFERENCES public.jgc_turmas(id) ON DELETE CASCADE,
  PRIMARY KEY (aluno_id, turma_id)
);

-- Migrate existing turma_id data to junction table
INSERT INTO public.jgc_aluno_turmas (aluno_id, turma_id)
SELECT id, turma_id FROM public.jgc_alunos
WHERE turma_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE public.jgc_aluno_turmas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jgc_aluno_turmas_select" ON public.jgc_aluno_turmas
  FOR SELECT TO authenticated USING (public.jgc_tem_acesso());

CREATE POLICY "jgc_aluno_turmas_insert" ON public.jgc_aluno_turmas
  FOR INSERT TO authenticated WITH CHECK (public.jgc_tem_acesso(ARRAY['gestor','administrativo']::public.jgc_perfil[]));

CREATE POLICY "jgc_aluno_turmas_delete" ON public.jgc_aluno_turmas
  FOR DELETE TO authenticated USING (public.jgc_tem_acesso(ARRAY['gestor','administrativo']::public.jgc_perfil[]));

GRANT SELECT, INSERT, DELETE ON public.jgc_aluno_turmas TO authenticated;

-- 2. Update jgc_criar_aluno to handle turmas_ids array + foto_url
CREATE OR REPLACE FUNCTION public.jgc_criar_aluno(
  _dados jsonb
) RETURNS public.jgc_alunos
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _numero bigint;
  _cfg public.jgc_configuracoes%ROWTYPE;
  _aluno public.jgc_alunos%ROWTYPE;
  _turma_id uuid;
BEGIN
  IF NOT public.jgc_tem_acesso(ARRAY['gestor','administrativo']::public.jgc_perfil[]) THEN
    RAISE EXCEPTION 'Sem permissao para cadastrar alunos.';
  END IF;
  SELECT * INTO _cfg FROM public.jgc_configuracoes WHERE id;
  _numero := nextval('public.jgc_matricula_seq');
  INSERT INTO public.jgc_alunos (
    matricula,nome_completo,data_nascimento,sexo,cpf,rg,nis,foto_url,
    naturalidade_cidade,naturalidade_uf,data_entrada,serie_ano,escola_nome,
    turno_escola,horario_escola,turma_id,projeto_hora_inicio,projeto_hora_fim,situacao
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
    coalesce((_dados->>'situacao')::public.jgc_situacao_aluno,'ativo')
  ) RETURNING * INTO _aluno;

  -- Insert into junction table (turmas_ids array)
  IF _dados ? 'turmas_ids' AND jsonb_typeof(_dados->'turmas_ids') = 'array' THEN
    FOR _turma_id IN SELECT jsonb_array_elements_text(_dados->'turmas_ids')::uuid LOOP
      INSERT INTO public.jgc_aluno_turmas (aluno_id, turma_id)
      VALUES (_aluno.id, _turma_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
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

-- 3. RPC to update aluno turmas
CREATE OR REPLACE FUNCTION public.jgc_atualizar_turmas_aluno(
  _aluno_id uuid,
  _turmas_ids uuid[]
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.jgc_tem_acesso(ARRAY['gestor','administrativo']::public.jgc_perfil[]) THEN
    RAISE EXCEPTION 'Sem permissao para alterar vinculo de turmas.';
  END IF;
  DELETE FROM public.jgc_aluno_turmas WHERE aluno_id = _aluno_id;
  INSERT INTO public.jgc_aluno_turmas (aluno_id, turma_id)
  SELECT _aluno_id, unnest(_turmas_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION public.jgc_atualizar_turmas_aluno(uuid,uuid[]) TO authenticated;

-- 4. Storage bucket for student photos
INSERT INTO storage.buckets (id, name, public, avif_autodetection)
VALUES ('jgc-fotos', 'jgc-fotos', true, false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for the bucket
CREATE POLICY "jgc_fotos_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'jgc-fotos');

CREATE POLICY "jgc_fotos_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'jgc-fotos');

CREATE POLICY "jgc_fotos_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'jgc-fotos');

CREATE POLICY "jgc_fotos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'jgc-fotos');
