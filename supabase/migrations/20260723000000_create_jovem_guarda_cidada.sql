-- Jovem Guarda Cidada: acompanhamento socioeducativo centralizado no aluno.
-- Os dados sensiveis permanecem protegidos por RLS e funcoes SECURITY DEFINER.

DO $$ BEGIN
  CREATE TYPE public.jgc_perfil AS ENUM ('gestor','administrativo','professor','multiprofissional');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.jgc_privacidade AS ENUM ('compartilhado','restrito','sigiloso');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.jgc_situacao_aluno AS ENUM ('ativo','afastado','desligado','concluido');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.jgc_frequencia_status AS ENUM ('presente','ausente','justificada','atraso');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.jgc_status_acao AS ENUM ('pendente','em_andamento','concluida','cancelada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.jgc_status_encaminhamento AS ENUM ('pendente','encaminhado','em_acompanhamento','concluido','cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.jgc_configuracoes (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  prefixo_matricula text NOT NULL DEFAULT 'JGC',
  digitos_matricula smallint NOT NULL DEFAULT 2 CHECK (digitos_matricula BETWEEN 2 AND 10),
  frequencia_baixa_percentual numeric(5,2) NOT NULL DEFAULT 75 CHECK (frequencia_baixa_percentual BETWEEN 0 AND 100),
  avaliacoes_ativas boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.jgc_configuracoes (id) VALUES (true) ON CONFLICT (id) DO NOTHING;
CREATE SEQUENCE IF NOT EXISTS public.jgc_matricula_seq;

CREATE TABLE IF NOT EXISTS public.jgc_perfis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_usuario_id uuid NOT NULL UNIQUE REFERENCES public.perfis_usuarios(id) ON DELETE CASCADE,
  perfil public.jgc_perfil NOT NULL,
  area_atuacao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (perfil <> 'multiprofissional' OR nullif(trim(area_atuacao), '') IS NOT NULL)
);

CREATE OR REPLACE FUNCTION public.jgc_perfil_atual()
RETURNS public.jgc_perfil
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN public.is_super_admin() THEN 'gestor'::public.jgc_perfil
    WHEN jp.perfil IS NOT NULL THEN jp.perfil
    WHEN pu.papel = 'gestor' THEN 'gestor'::public.jgc_perfil
    WHEN pu.papel = 'admin_setor' THEN 'administrativo'::public.jgc_perfil
    WHEN pu.papel = 'tecnico' THEN 'administrativo'::public.jgc_perfil
    ELSE NULL
  END
  FROM (SELECT 1) x
  LEFT JOIN public.perfis_usuarios pu ON pu.user_id = auth.uid() AND pu.ativo
  LEFT JOIN public.setores s ON s.id = pu.setor_id
  LEFT JOIN public.jgc_perfis jp ON jp.perfil_usuario_id = pu.id AND jp.ativo
  WHERE public.is_super_admin() OR s.slug = 'jovem-guarda'
  ORDER BY (jp.perfil = 'gestor') DESC NULLS LAST
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.jgc_tem_acesso(_perfis public.jgc_perfil[] DEFAULT NULL)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_super_admin()
    OR (public.jgc_perfil_atual() IS NOT NULL AND (_perfis IS NULL OR public.jgc_perfil_atual() = ANY(_perfis)));
$$;

CREATE OR REPLACE FUNCTION public.jgc_definir_perfil(
  _perfil_usuario_id uuid,
  _perfil public.jgc_perfil,
  _area_atuacao text DEFAULT NULL
) RETURNS public.jgc_perfis
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _result public.jgc_perfis%ROWTYPE;
BEGIN
  IF NOT public.jgc_tem_acesso(ARRAY['gestor']::public.jgc_perfil[]) THEN
    RAISE EXCEPTION 'Somente o gestor do Jovem Guarda pode definir perfis.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.perfis_usuarios pu
    JOIN public.setores s ON s.id=pu.setor_id
    WHERE pu.id=_perfil_usuario_id AND pu.ativo AND s.slug='jovem-guarda'
  ) THEN
    RAISE EXCEPTION 'Usuario ativo do Jovem Guarda nao encontrado.';
  END IF;
  INSERT INTO public.jgc_perfis(perfil_usuario_id,perfil,area_atuacao)
  VALUES (_perfil_usuario_id,_perfil,nullif(trim(_area_atuacao),''))
  ON CONFLICT (perfil_usuario_id) DO UPDATE SET
    perfil=excluded.perfil,area_atuacao=excluded.area_atuacao,ativo=true,updated_at=now()
  RETURNING * INTO _result;
  RETURN _result;
END;
$$;

CREATE OR REPLACE FUNCTION public.jgc_pode_ver_privacidade(_privacidade public.jgc_privacidade, _autor uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN public.is_super_admin() OR public.jgc_perfil_atual() = 'gestor' THEN true
    WHEN _privacidade = 'compartilhado' THEN public.jgc_tem_acesso()
    WHEN _privacidade = 'restrito' THEN public.jgc_perfil_atual() = 'multiprofissional'
    WHEN _privacidade = 'sigiloso' THEN public.jgc_perfil_atual() = 'multiprofissional' AND _autor = auth.uid()
    ELSE false END;
$$;

CREATE TABLE IF NOT EXISTS public.jgc_turmas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  periodo text,
  turno text CHECK (turno IS NULL OR turno IN ('manha','tarde','noite','integral')),
  hora_inicio time,
  hora_fim time,
  data_inicio date,
  data_fim date,
  status text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','inativa','concluida')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.jgc_turma_professores (
  turma_id uuid NOT NULL REFERENCES public.jgc_turmas(id) ON DELETE CASCADE,
  perfil_usuario_id uuid NOT NULL REFERENCES public.perfis_usuarios(id) ON DELETE CASCADE,
  PRIMARY KEY (turma_id, perfil_usuario_id)
);

CREATE TABLE IF NOT EXISTS public.jgc_alunos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula text NOT NULL UNIQUE,
  nome_completo text NOT NULL,
  data_nascimento date NOT NULL,
  sexo text,
  cpf text,
  rg text,
  nis text,
  foto_url text,
  naturalidade_cidade text,
  naturalidade_uf char(2),
  data_entrada date NOT NULL DEFAULT current_date,
  serie_ano text,
  escola_nome text,
  turno_escola text CHECK (turno_escola IS NULL OR turno_escola IN ('manha','tarde','noite','integral')),
  horario_escola text,
  turma_id uuid REFERENCES public.jgc_turmas(id) ON DELETE SET NULL,
  projeto_hora_inicio time,
  projeto_hora_fim time,
  situacao public.jgc_situacao_aluno NOT NULL DEFAULT 'ativo',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CHECK (cpf IS NULL OR cpf ~ '^[0-9]{11}$')
);
CREATE INDEX IF NOT EXISTS jgc_alunos_busca_idx ON public.jgc_alunos USING gin (to_tsvector('portuguese', coalesce(nome_completo,'') || ' ' || coalesce(escola_nome,'')));
CREATE INDEX IF NOT EXISTS jgc_alunos_turma_idx ON public.jgc_alunos(turma_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.jgc_aluno_saude (
  aluno_id uuid PRIMARY KEY REFERENCES public.jgc_alunos(id) ON DELETE CASCADE,
  tipo_sanguineo text NOT NULL DEFAULT 'nao_informado',
  possui_condicao text NOT NULL DEFAULT 'nao_informado' CHECK (possui_condicao IN ('sim','nao','nao_informado')),
  condicao_saude text,
  observacao_saude text,
  usa_medicamento text NOT NULL DEFAULT 'nao_informado' CHECK (usa_medicamento IN ('sim','nao','nao_informado')),
  medicamentos text,
  orientacao_medicamento text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.jgc_criar_aluno(
  _dados jsonb
) RETURNS public.jgc_alunos
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _numero bigint;
  _cfg public.jgc_configuracoes%ROWTYPE;
  _aluno public.jgc_alunos%ROWTYPE;
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

CREATE TABLE IF NOT EXISTS public.jgc_responsaveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.jgc_alunos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  vinculo text NOT NULL,
  telefone text NOT NULL,
  email text,
  endereco text,
  principal boolean NOT NULL DEFAULT false,
  autorizado_buscar boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS jgc_responsavel_principal_idx ON public.jgc_responsaveis(aluno_id) WHERE principal;

CREATE TABLE IF NOT EXISTS public.jgc_atividades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  tipo text NOT NULL,
  descricao text,
  data date NOT NULL,
  hora_inicio time,
  hora_fim time,
  responsavel_id uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  turma_id uuid REFERENCES public.jgc_turmas(id) ON DELETE SET NULL,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.jgc_diarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id uuid NOT NULL REFERENCES public.jgc_turmas(id) ON DELETE CASCADE,
  data date NOT NULL,
  professor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT DEFAULT auth.uid(),
  conteudo text,
  atividade_id uuid REFERENCES public.jgc_atividades(id) ON DELETE SET NULL,
  observacoes text,
  avaliacao_titulo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (turma_id, data)
);
CREATE TABLE IF NOT EXISTS public.jgc_frequencias (
  diario_id uuid NOT NULL REFERENCES public.jgc_diarios(id) ON DELETE CASCADE,
  aluno_id uuid NOT NULL REFERENCES public.jgc_alunos(id) ON DELETE CASCADE,
  status public.jgc_frequencia_status NOT NULL,
  observacao text,
  nota numeric(6,2),
  conceito text,
  PRIMARY KEY (diario_id, aluno_id)
);

CREATE TABLE IF NOT EXISTS public.jgc_atendimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.jgc_alunos(id) ON DELETE RESTRICT,
  data date NOT NULL,
  hora time NOT NULL,
  profissional_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT DEFAULT auth.uid(),
  area_profissional text NOT NULL,
  tipo text NOT NULL,
  local text,
  motivo text NOT NULL,
  origem text NOT NULL,
  descricao_inicial text,
  relato text NOT NULL,
  observacoes_profissionais text,
  situacoes_identificadas text,
  marcadores text[] NOT NULL DEFAULT '{}',
  privacidade public.jgc_privacidade NOT NULL DEFAULT 'restrito',
  necessita_retorno boolean NOT NULL DEFAULT false,
  retorno_data date,
  retorno_profissional_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  retorno_motivo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CHECK (NOT necessita_retorno OR retorno_data IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS jgc_atendimentos_aluno_idx ON public.jgc_atendimentos(aluno_id,data DESC);
CREATE INDEX IF NOT EXISTS jgc_atendimentos_marcadores_idx ON public.jgc_atendimentos USING gin(marcadores);

CREATE TABLE IF NOT EXISTS public.jgc_acoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atendimento_id uuid REFERENCES public.jgc_atendimentos(id) ON DELETE SET NULL,
  aluno_id uuid NOT NULL REFERENCES public.jgc_alunos(id) ON DELETE RESTRICT,
  descricao text NOT NULL,
  responsavel_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  prazo date,
  status public.jgc_status_acao NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.jgc_encaminhamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atendimento_id uuid REFERENCES public.jgc_atendimentos(id) ON DELETE SET NULL,
  aluno_id uuid NOT NULL REFERENCES public.jgc_alunos(id) ON DELETE RESTRICT,
  destino text NOT NULL,
  motivo text NOT NULL,
  data date NOT NULL DEFAULT current_date,
  profissional_id uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  observacoes text,
  status public.jgc_status_encaminhamento NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE VIEW public.jgc_escolas AS
SELECT min(escola_nome) AS nome, lower(trim(escola_nome)) AS chave, count(*)::int AS utilizacoes
FROM public.jgc_alunos WHERE escola_nome IS NOT NULL AND deleted_at IS NULL
GROUP BY lower(trim(escola_nome));

CREATE OR REPLACE VIEW public.jgc_frequencia_resumo AS
SELECT f.aluno_id, count(*)::int total,
 count(*) FILTER (WHERE f.status IN ('presente','atraso'))::int presencas,
 count(*) FILTER (WHERE f.status IN ('ausente','justificada'))::int faltas,
 round(100.0 * count(*) FILTER (WHERE f.status IN ('presente','atraso')) / nullif(count(*),0),2) percentual
FROM public.jgc_frequencias f GROUP BY f.aluno_id;

CREATE OR REPLACE FUNCTION public.jgc_auditar()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _row jsonb; _id uuid;
BEGIN
  _row := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  _id := (_row->>'id')::uuid;
  INSERT INTO public.auditoria_logs(user_id,setor_id,entidade,entidade_id,acao,payload_resumido)
  SELECT auth.uid(),s.id,TG_TABLE_NAME,_id,lower(TG_OP),
    _row - ARRAY['relato','observacoes_profissionais','situacoes_identificadas','condicao_saude','medicamentos']
  FROM public.setores s WHERE s.slug='jovem-guarda';
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END; $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['jgc_alunos','jgc_turmas','jgc_responsaveis','jgc_atividades','jgc_diarios','jgc_atendimentos','jgc_acoes','jgc_encaminhamentos']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'audit_'||t, t);
    EXECUTE format('CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.jgc_auditar()', 'audit_'||t, t);
  END LOOP;
END $$;

ALTER TABLE public.jgc_configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jgc_perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jgc_turmas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jgc_turma_professores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jgc_alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jgc_aluno_saude ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jgc_responsaveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jgc_atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jgc_diarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jgc_frequencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jgc_atendimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jgc_acoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jgc_encaminhamentos ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['jgc_configuracoes','jgc_turmas','jgc_alunos','jgc_responsaveis','jgc_atividades','jgc_diarios','jgc_frequencias','jgc_acoes','jgc_encaminhamentos']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "jgc_select" ON public.%I', t);
    EXECUTE format('CREATE POLICY "jgc_select" ON public.%I FOR SELECT TO authenticated USING (public.jgc_tem_acesso())', t);
  END LOOP;
END $$;
CREATE POLICY "jgc_atendimentos_select" ON public.jgc_atendimentos FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.jgc_pode_ver_privacidade(privacidade,profissional_id));
CREATE POLICY "jgc_saude_select" ON public.jgc_aluno_saude FOR SELECT TO authenticated
  USING (public.jgc_tem_acesso(ARRAY['gestor','multiprofissional']::public.jgc_perfil[]));
CREATE POLICY "jgc_saude_insert" ON public.jgc_aluno_saude FOR INSERT TO authenticated
  WITH CHECK (public.jgc_tem_acesso(ARRAY['gestor','administrativo','multiprofissional']::public.jgc_perfil[]));
CREATE POLICY "jgc_saude_update" ON public.jgc_aluno_saude FOR UPDATE TO authenticated
  USING (public.jgc_tem_acesso(ARRAY['gestor','administrativo','multiprofissional']::public.jgc_perfil[]))
  WITH CHECK (public.jgc_tem_acesso(ARRAY['gestor','administrativo','multiprofissional']::public.jgc_perfil[]));
CREATE POLICY "jgc_alunos_manage" ON public.jgc_alunos FOR ALL TO authenticated
  USING (public.jgc_tem_acesso(ARRAY['gestor','administrativo']::public.jgc_perfil[]))
  WITH CHECK (public.jgc_tem_acesso(ARRAY['gestor','administrativo']::public.jgc_perfil[]));
CREATE POLICY "jgc_turmas_manage" ON public.jgc_turmas FOR ALL TO authenticated
  USING (public.jgc_tem_acesso(ARRAY['gestor','administrativo']::public.jgc_perfil[]))
  WITH CHECK (public.jgc_tem_acesso(ARRAY['gestor','administrativo']::public.jgc_perfil[]));
CREATE POLICY "jgc_responsaveis_manage" ON public.jgc_responsaveis FOR ALL TO authenticated
  USING (public.jgc_tem_acesso(ARRAY['gestor','administrativo']::public.jgc_perfil[]))
  WITH CHECK (public.jgc_tem_acesso(ARRAY['gestor','administrativo']::public.jgc_perfil[]));
CREATE POLICY "jgc_pedagogico_manage" ON public.jgc_atividades FOR ALL TO authenticated
  USING (public.jgc_tem_acesso(ARRAY['gestor','professor']::public.jgc_perfil[]))
  WITH CHECK (public.jgc_tem_acesso(ARRAY['gestor','professor']::public.jgc_perfil[]));
CREATE POLICY "jgc_diarios_manage" ON public.jgc_diarios FOR ALL TO authenticated
  USING (public.jgc_tem_acesso(ARRAY['gestor','professor']::public.jgc_perfil[]))
  WITH CHECK (public.jgc_tem_acesso(ARRAY['gestor','professor']::public.jgc_perfil[]));
CREATE POLICY "jgc_frequencias_manage" ON public.jgc_frequencias FOR ALL TO authenticated
  USING (public.jgc_tem_acesso(ARRAY['gestor','professor']::public.jgc_perfil[]))
  WITH CHECK (public.jgc_tem_acesso(ARRAY['gestor','professor']::public.jgc_perfil[]));
CREATE POLICY "jgc_atendimentos_insert" ON public.jgc_atendimentos FOR INSERT TO authenticated
  WITH CHECK (public.jgc_tem_acesso(ARRAY['gestor','multiprofissional']::public.jgc_perfil[]) AND profissional_id=auth.uid());
CREATE POLICY "jgc_atendimentos_update" ON public.jgc_atendimentos FOR UPDATE TO authenticated
  USING (public.jgc_pode_ver_privacidade(privacidade,profissional_id) AND public.jgc_tem_acesso(ARRAY['gestor','multiprofissional']::public.jgc_perfil[]))
  WITH CHECK (public.jgc_tem_acesso(ARRAY['gestor','multiprofissional']::public.jgc_perfil[]));
CREATE POLICY "jgc_acoes_manage" ON public.jgc_acoes FOR ALL TO authenticated
  USING (public.jgc_tem_acesso(ARRAY['gestor','multiprofissional']::public.jgc_perfil[]))
  WITH CHECK (public.jgc_tem_acesso(ARRAY['gestor','multiprofissional']::public.jgc_perfil[]));
CREATE POLICY "jgc_encaminhamentos_manage" ON public.jgc_encaminhamentos FOR ALL TO authenticated
  USING (public.jgc_tem_acesso(ARRAY['gestor','multiprofissional']::public.jgc_perfil[]))
  WITH CHECK (public.jgc_tem_acesso(ARRAY['gestor','multiprofissional']::public.jgc_perfil[]));
CREATE POLICY "jgc_perfis_select" ON public.jgc_perfis FOR SELECT TO authenticated USING (public.jgc_tem_acesso());
CREATE POLICY "jgc_perfis_manage" ON public.jgc_perfis FOR ALL TO authenticated
  USING (public.jgc_tem_acesso(ARRAY['gestor']::public.jgc_perfil[]))
  WITH CHECK (public.jgc_tem_acesso(ARRAY['gestor']::public.jgc_perfil[]));

GRANT SELECT,INSERT,UPDATE ON public.jgc_configuracoes,public.jgc_perfis,public.jgc_turmas,
  public.jgc_turma_professores,public.jgc_alunos,public.jgc_aluno_saude,public.jgc_responsaveis,
  public.jgc_atividades,public.jgc_diarios,public.jgc_frequencias,public.jgc_atendimentos,
  public.jgc_acoes,public.jgc_encaminhamentos TO authenticated;
GRANT USAGE,SELECT ON SEQUENCE public.jgc_matricula_seq TO authenticated;
GRANT SELECT ON public.jgc_escolas, public.jgc_frequencia_resumo TO authenticated;
GRANT EXECUTE ON FUNCTION public.jgc_perfil_atual() TO authenticated;
GRANT EXECUTE ON FUNCTION public.jgc_tem_acesso(public.jgc_perfil[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.jgc_pode_ver_privacidade(public.jgc_privacidade,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.jgc_criar_aluno(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.jgc_definir_perfil(uuid,public.jgc_perfil,text) TO authenticated;
