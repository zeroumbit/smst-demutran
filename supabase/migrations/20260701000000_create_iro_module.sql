-- ============================================
-- MÓDULO IRO (Integração de Recursos Operacionais)
-- ============================================

-- Remove tabela legada da versão anterior
DROP TABLE IF EXISTS public.guarda_municipal_iros CASCADE;

-- 1. Tabela: iro_operacoes
CREATE TABLE IF NOT EXISTS public.iro_operacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome varchar(200) NOT NULL,
  descricao text,
  horario_previsto time NOT NULL,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  vagas_por_dia integer NOT NULL DEFAULT 1,
  horas_por_dia numeric(5,2) NOT NULL DEFAULT 8.0,
  tempo_solicitacao varchar(20) NOT NULL DEFAULT 'imediato' CHECK (tempo_solicitacao IN ('imediato', '1h', '6h', '8h', '12h', '24h', '48h')),
  setor_id uuid NOT NULL REFERENCES public.setores(id) ON DELETE RESTRICT,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.perfis_usuarios(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_iro_operacoes_datas ON public.iro_operacoes (data_inicio, data_fim);
CREATE INDEX IF NOT EXISTS idx_iro_operacoes_ativo ON public.iro_operacoes (ativo);
CREATE INDEX IF NOT EXISTS idx_iro_operacoes_setor ON public.iro_operacoes (setor_id);

DROP TRIGGER IF EXISTS trigger_atualizar_iro_operacoes_updated_at ON public.iro_operacoes;
CREATE TRIGGER trigger_atualizar_iro_operacoes_updated_at
BEFORE UPDATE ON public.iro_operacoes
FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

-- 2. Tabela: iro_candidaturas
CREATE TABLE IF NOT EXISTS public.iro_candidaturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operacao_id uuid NOT NULL REFERENCES public.iro_operacoes(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_operacao date NOT NULL,
  horas_trabalhadas numeric(5,2) NOT NULL DEFAULT 0,
  status varchar(20) NOT NULL DEFAULT 'confirmado' CHECK (status IN ('pendente', 'confirmado', 'cancelado', 'realizado')),
  adicionado_manual boolean NOT NULL DEFAULT false,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (operacao_id, usuario_id, data_operacao)
);

CREATE INDEX IF NOT EXISTS idx_iro_candidaturas_usuario ON public.iro_candidaturas (usuario_id);
CREATE INDEX IF NOT EXISTS idx_iro_candidaturas_operacao ON public.iro_candidaturas (operacao_id);
CREATE INDEX IF NOT EXISTS idx_iro_candidaturas_data ON public.iro_candidaturas (data_operacao);
CREATE INDEX IF NOT EXISTS idx_iro_candidaturas_status ON public.iro_candidaturas (status);

-- 3. Tabela: iro_horas_manuais
CREATE TABLE IF NOT EXISTS public.iro_horas_manuais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quantidade_horas numeric(5,2) NOT NULL,
  data_referencia date NOT NULL,
  justificativa text,
  gestor_id uuid REFERENCES public.perfis_usuarios(id) ON DELETE SET NULL,
  operacao_id uuid REFERENCES public.iro_operacoes(id) ON DELETE SET NULL,
  setor_id uuid NOT NULL REFERENCES public.setores(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_iro_horas_manuais_usuario ON public.iro_horas_manuais (usuario_id);
CREATE INDEX IF NOT EXISTS idx_iro_horas_manuais_data ON public.iro_horas_manuais (data_referencia);
CREATE INDEX IF NOT EXISTS idx_iro_horas_manuais_setor ON public.iro_horas_manuais (setor_id);

-- 4. Tabela: iro_banco_horas
CREATE TABLE IF NOT EXISTS public.iro_banco_horas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  horas_excedentes numeric(5,2) NOT NULL DEFAULT 0,
  origem varchar(50) DEFAULT 'manual',
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_iro_banco_horas_usuario ON public.iro_banco_horas (usuario_id);

DROP TRIGGER IF EXISTS trigger_atualizar_iro_banco_horas_updated_at ON public.iro_banco_horas;
CREATE TRIGGER trigger_atualizar_iro_banco_horas_updated_at
BEFORE UPDATE ON public.iro_banco_horas
FOR EACH ROW EXECUTE FUNCTION public.atualizar_updated_at();

-- 5. Tabela: iro_notificacoes
CREATE TABLE IF NOT EXISTS public.iro_notificacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo varchar(200) NOT NULL,
  mensagem text NOT NULL,
  tipo varchar(20) NOT NULL DEFAULT 'info' CHECK (tipo IN ('info', 'sucesso', 'alerta', 'erro', 'manual')),
  lida boolean NOT NULL DEFAULT false,
  link varchar(500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_iro_notificacoes_usuario ON public.iro_notificacoes (usuario_id);
CREATE INDEX IF NOT EXISTS idx_iro_notificacoes_lida ON public.iro_notificacoes (lida);
CREATE INDEX IF NOT EXISTS idx_iro_notificacoes_data ON public.iro_notificacoes (created_at);

-- ============================================
-- FUNÇÕES RPC
-- ============================================

CREATE OR REPLACE FUNCTION public.verificar_disponibilidade_iro(
  p_operacao_id uuid,
  p_data date
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_vagas_por_dia integer;
  v_ocupadas integer;
begin
  select vagas_por_dia into v_vagas_por_dia
  from iro_operacoes
  where id = p_operacao_id;

  select count(*) into v_ocupadas
  from iro_candidaturas
  where operacao_id = p_operacao_id
    and data_operacao = p_data
    and status in ('confirmado', 'realizado');

  return v_vagas_por_dia - v_ocupadas;
end;
$$;

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

CREATE OR REPLACE FUNCTION public.calcular_banco_horas_iro(
  p_usuario_id uuid,
  p_mes date default current_date
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_total_mes numeric;
  v_limite_mes numeric := 72;
  v_excedente numeric;
  v_manual numeric;
  v_existente numeric;
begin
  select coalesce(sum(horas_trabalhadas), 0) into v_total_mes
  from iro_candidaturas
  where usuario_id = p_usuario_id
    and date_trunc('month', data_operacao) = date_trunc('month', p_mes)
    and status in ('confirmado', 'realizado')
    and adicionado_manual = false;

  select coalesce(sum(quantidade_horas), 0) into v_manual
  from iro_horas_manuais
  where usuario_id = p_usuario_id
    and date_trunc('month', data_referencia) = date_trunc('month', p_mes);

  v_total_mes := v_total_mes + v_manual;
  v_excedente := greatest(v_total_mes - v_limite_mes, 0);

  select coalesce(horas_excedentes, 0) into v_existente
  from iro_banco_horas
  where usuario_id = p_usuario_id;

  if v_existente > 0 then
    update iro_banco_horas
    set horas_excedentes = v_existente + v_excedente, updated_at = now()
    where usuario_id = p_usuario_id;
  elsif v_excedente > 0 then
    insert into iro_banco_horas (usuario_id, horas_excedentes, descricao)
    values (p_usuario_id, v_excedente, 'Excedente do mes ' || to_char(p_mes, 'MM/YYYY'));
  end if;

  return jsonb_build_object(
    'total_mes', round(v_total_mes::numeric, 2),
    'limite_mes', v_limite_mes,
    'excedente', round(v_excedente::numeric, 2),
    'banco_horas', round(coalesce(v_existente + v_excedente, 0)::numeric, 2)
  );
end;
$$;

-- ============================================
-- POLÍTICAS RLS
-- ============================================

alter table public.iro_operacoes enable row level security;
alter table public.iro_candidaturas enable row level security;
alter table public.iro_horas_manuais enable row level security;
alter table public.iro_banco_horas enable row level security;
alter table public.iro_notificacoes enable row level security;

drop policy if exists "Super admin and gestor can manage iro_operacoes" on public.iro_operacoes;
create policy "Super admin and gestor can manage iro_operacoes"
on public.iro_operacoes for all to authenticated
using (public.is_super_admin() or public.is_admin_of_setor(setor_id))
with check (public.is_super_admin() or public.is_admin_of_setor(setor_id));

drop policy if exists "Users can view active iro_operacoes" on public.iro_operacoes;
create policy "Users can view active iro_operacoes"
on public.iro_operacoes for select to authenticated
using (ativo = true);

drop policy if exists "Gestor can manage iro_candidaturas" on public.iro_candidaturas;
create policy "Gestor can manage iro_candidaturas"
on public.iro_candidaturas for all to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1 from public.iro_operacoes o
    where o.id = operacao_id
      and public.is_admin_of_setor(o.setor_id)
  )
)
with check (
  public.is_super_admin()
  or exists (
    select 1 from public.iro_operacoes o
    where o.id = operacao_id
      and public.is_admin_of_setor(o.setor_id)
  )
);

drop policy if exists "Users can view own iro_candidaturas" on public.iro_candidaturas;
create policy "Users can view own iro_candidaturas"
on public.iro_candidaturas for select to authenticated
using (usuario_id = auth.uid());

drop policy if exists "Users can insert own iro_candidaturas" on public.iro_candidaturas;
create policy "Users can insert own iro_candidaturas"
on public.iro_candidaturas for insert to authenticated
with check (usuario_id = auth.uid());

drop policy if exists "Gestor can manage iro_horas_manuais" on public.iro_horas_manuais;
create policy "Gestor can manage iro_horas_manuais"
on public.iro_horas_manuais for all to authenticated
using (public.is_super_admin() or public.is_admin_of_setor(setor_id))
with check (public.is_super_admin() or public.is_admin_of_setor(setor_id));

drop policy if exists "Users can view own iro_horas_manuais" on public.iro_horas_manuais;
create policy "Users can view own iro_horas_manuais"
on public.iro_horas_manuais for select to authenticated
using (usuario_id = auth.uid());

drop policy if exists "Users can view own iro_banco_horas" on public.iro_banco_horas;
create policy "Users can view own iro_banco_horas"
on public.iro_banco_horas for select to authenticated
using (usuario_id = auth.uid());

drop policy if exists "Gestor can view all iro_banco_horas" on public.iro_banco_horas;
create policy "Gestor can view all iro_banco_horas"
on public.iro_banco_horas for select to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1 from public.perfis_usuarios pu
    where pu.user_id = auth.uid()
      and pu.ativo = true
      and pu.papel in ('gestor', 'admin_setor')
  )
);

drop policy if exists "Users can view own iro_notificacoes" on public.iro_notificacoes;
create policy "Users can view own iro_notificacoes"
on public.iro_notificacoes for select to authenticated
using (usuario_id = auth.uid());

drop policy if exists "Users can update own iro_notificacoes" on public.iro_notificacoes;
create policy "Users can update own iro_notificacoes"
on public.iro_notificacoes for update to authenticated
using (usuario_id = auth.uid())
with check (usuario_id = auth.uid());
