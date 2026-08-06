-- =====================================================
-- Ativacao do motor de Permissoes V2
-- Liga a flag global e roda a auditoria de divergencias
-- =====================================================

-- 1. Liga a flag
INSERT INTO public.configuracoes (grupo, tipo, config, ativo, ordem)
VALUES (
  'permissions_v2',
  'enabled',
  '{"enabled": true}'::jsonb,
  true,
  1
)
ON CONFLICT (grupo, tipo)
DO UPDATE SET config = '{"enabled": true}'::jsonb, ativo = true;

-- 2. Auditoria de divergencias (modo sombra: registra, nao bloqueia)
--    Roda para o setor Administracao Central para detectar divergencias
--    entre o motor v2 e o legado antes da adocao total.
SELECT public.auditar_permissoes_v2(public.get_administracao_setor_id());
