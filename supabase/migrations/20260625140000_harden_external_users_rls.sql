-- =====================================================
-- Migration: Endurecimento de segurança para usuários externos e tabelas administrativas
-- Descrição: Ativa RLS e restringe privilégios de acesso direto via REST API
--            para as tabelas de cidadãos externos (usuários e sessões).
-- =====================================================

-- 1. Habilitar RLS nas tabelas de cidadãos e sessões externas
ALTER TABLE public.demutran_usuarios_externos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demutran_externo_sessoes ENABLE ROW LEVEL SECURITY;

-- 2. Revogar privilégios padrão de acesso direto via API REST (anon e authenticated)
REVOKE ALL ON TABLE public.demutran_usuarios_externos FROM anon, authenticated;
REVOKE ALL ON TABLE public.demutran_externo_sessoes FROM anon, authenticated;

-- Garantir privilégios plenos apenas para a service_role (usada pelas migrações e backend interno)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demutran_usuarios_externos TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.demutran_externo_sessoes TO service_role;

-- 3. Criar política RLS para permitir consulta administrativa de cidadãos externos
-- Apenas administradores do sistema autenticados e ativos podem visualizar a lista de cidadãos
DROP POLICY IF EXISTS "Admins can view external users" ON public.demutran_usuarios_externos;
CREATE POLICY "Admins can view external users"
ON public.demutran_usuarios_externos
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.perfis_usuarios pu
    WHERE pu.user_id = auth.uid()
      AND pu.ativo = true
  )
);

-- 4. Criar política RLS de negação de acesso direto a sessões externas via REST API
-- Todo acesso direto às sessões externas por perfis de API (anon/authenticated) é bloqueado por RLS.
-- (as sessões continuam acessíveis e gerenciáveis via funções SECURITY DEFINER no banco)
DROP POLICY IF EXISTS "Deny direct sessions access" ON public.demutran_externo_sessoes;
CREATE POLICY "Deny direct sessions access"
ON public.demutran_externo_sessoes
FOR ALL
TO PUBLIC
USING (false)
WITH CHECK (false);

-- 5. Habilitar RLS e aplicar políticas na tabela paginas
ALTER TABLE public.paginas ENABLE ROW LEVEL SECURITY;

-- Admins ativos podem gerenciar paginas
DROP POLICY IF EXISTS "Admins can manage paginas" ON public.paginas;
CREATE POLICY "Admins can manage paginas"
ON public.paginas
FOR ALL
TO authenticated
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.perfis_usuarios pu
    WHERE pu.user_id = auth.uid() AND pu.ativo = true
  )
)
WITH CHECK (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.perfis_usuarios pu
    WHERE pu.user_id = auth.uid() AND pu.ativo = true
  )
);

-- Leitura pública de páginas se estiver ativa (caso futuramente seja consumida pelo portal)
DROP POLICY IF EXISTS "Public read active paginas" ON public.paginas;
CREATE POLICY "Public read active paginas"
ON public.paginas
FOR SELECT
TO anon, authenticated
USING (ativo = true);
