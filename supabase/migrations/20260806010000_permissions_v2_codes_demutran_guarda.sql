-- =====================================================
-- Permissions V2 - Seed codigos granulares Demutran/Guarda
-- Fase 2. Nao altera comportamento (flag ainda off).
-- Reversivel: DELETE ... WHERE codigo LIKE 'demutran.%' OR 'guarda_municipal.%'
-- =====================================================
INSERT INTO public.permissoes_sistema (modulo_id, codigo, nome, descricao, acao, sensivel, ativo)
SELECT sm.id, m.codigo, m.codigo, m.descricao, m.acao, m.sensivel, true
FROM public.setor_modulos sm
JOIN public.setores s ON s.id = sm.setor_id
JOIN (
  VALUES
    -- ---- Demutran (24) ----
    ('demutran', 'veiculos', 'demutran.veiculos.visualizar', 'Visualizar veiculos', 'visualizar', false),
    ('demutran', 'veiculos', 'demutran.veiculos.criar', 'Cadastrar veiculos', 'criar', false),
    ('demutran', 'veiculos', 'demutran.veiculos.editar', 'Editar veiculos', 'editar', false),
    ('demutran', 'veiculos', 'demutran.veiculos.inativar', 'Inativar veiculos', 'inativar', true),
    ('demutran', 'concessionarios', 'demutran.concessionarios.visualizar', 'Visualizar concessionarios', 'visualizar', false),
    ('demutran', 'concessionarios', 'demutran.concessionarios.criar', 'Cadastrar concessionarios', 'criar', false),
    ('demutran', 'concessionarios', 'demutran.concessionarios.editar', 'Editar concessionarios', 'editar', false),
    ('demutran', 'credenciais', 'demutran.credenciais.visualizar', 'Visualizar credenciais', 'visualizar', false),
    ('demutran', 'credenciais', 'demutran.credenciais.criar', 'Cadastrar credenciais', 'criar', false),
    ('demutran', 'credenciais', 'demutran.credenciais.editar', 'Editar credenciais', 'editar', false),
    ('demutran', 'recursos', 'demutran.recursos.visualizar', 'Visualizar recursos', 'visualizar', false),
    ('demutran', 'recursos', 'demutran.recursos.criar', 'Cadastrar recursos', 'criar', false),
    ('demutran', 'recursos', 'demutran.recursos.editar', 'Editar recursos', 'editar', false),
    ('demutran', 'recursos', 'demutran.recursos.excluir', 'Excluir recursos', 'excluir', true),
    ('demutran', 'frota', 'demutran.frota.visualizar', 'Visualizar frota municipal', 'visualizar', false),
    ('demutran', 'frota', 'demutran.frota.criar', 'Cadastrar veiculo de frota', 'criar', false),
    ('demutran', 'frota', 'demutran.frota.editar', 'Editar veiculo de frota', 'editar', false),
    ('demutran', 'documentos', 'demutran.documentos.visualizar', 'Visualizar documentos', 'visualizar', false),
    ('demutran', 'documentos', 'demutran.documentos.criar', 'Cadastrar documentos', 'criar', false),
    ('demutran', 'documentos', 'demutran.documentos.editar', 'Editar documentos', 'editar', false),
    ('demutran', 'midias', 'demutran.midias.visualizar', 'Visualizar midias', 'visualizar', false),
    ('demutran', 'midias', 'demutran.midias.criar', 'Cadastrar midias', 'criar', false),
    ('demutran', 'midias', 'demutran.midias.editar', 'Editar midias', 'editar', false),
    ('demutran', 'midias', 'demutran.midias.excluir', 'Excluir midias', 'excluir', true),
    -- ---- Guarda Municipal (26) ----
    ('guarda-municipal', 'iros', 'guarda_municipal.iros.visualizar', 'Visualizar IROs', 'visualizar', false),
    ('guarda-municipal', 'iros', 'guarda_municipal.iros.criar', 'Cadastrar IROs', 'criar', false),
    ('guarda-municipal', 'iros', 'guarda_municipal.iros.editar', 'Editar IROs', 'editar', false),
    ('guarda-municipal', 'guardas', 'guarda_municipal.guardas.visualizar', 'Visualizar guardas', 'visualizar', false),
    ('guarda-municipal', 'guardas', 'guarda_municipal.guardas.criar', 'Cadastrar guardas', 'criar', false),
    ('guarda-municipal', 'guardas', 'guarda_municipal.guardas.editar', 'Editar guardas', 'editar', false),
    ('guarda-municipal', 'guardas', 'guarda_municipal.guardas.inativar', 'Inativar guardas', 'inativar', true),
    ('guarda-municipal', 'guarda_escalas', 'guarda_municipal.escalas.visualizar', 'Visualizar escalas da guarda', 'visualizar', false),
    ('guarda-municipal', 'guarda_escalas', 'guarda_municipal.escalas.criar', 'Cadastrar escalas', 'criar', false),
    ('guarda-municipal', 'guarda_escalas', 'guarda_municipal.escalas.editar', 'Editar escalas', 'editar', false),
    ('guarda-municipal', 'guarda_escalas', 'guarda_municipal.escalas.excluir', 'Excluir escalas', 'excluir', true),
    ('guarda-municipal', 'guarda_frota', 'guarda_municipal.frota.visualizar', 'Visualizar frota da guarda', 'visualizar', false),
    ('guarda-municipal', 'guarda_frota', 'guarda_municipal.frota.criar', 'Cadastrar veiculo da guarda', 'criar', false),
    ('guarda-municipal', 'guarda_frota', 'guarda_municipal.frota.editar', 'Editar veiculo da guarda', 'editar', false),
    ('guarda-municipal', 'guarda_equipes', 'guarda_municipal.equipes.visualizar', 'Visualizar equipes da guarda', 'visualizar', false),
    ('guarda-municipal', 'guarda_equipes', 'guarda_municipal.equipes.criar', 'Cadastrar equipes', 'criar', false),
    ('guarda-municipal', 'guarda_equipes', 'guarda_municipal.equipes.editar', 'Editar equipes', 'editar', false),
    ('guarda-municipal', 'guarda_equipes', 'guarda_municipal.equipes.excluir', 'Excluir equipes', 'excluir', true),
    ('guarda-municipal', 'fiscalizacao', 'guarda_municipal.fiscalizacao.visualizar', 'Visualizar fiscalizacao', 'visualizar', false),
    ('guarda-municipal', 'fiscalizacao', 'guarda_municipal.fiscalizacao.criar', 'Cadastrar infracoes', 'criar', false),
    ('guarda-municipal', 'fiscalizacao', 'guarda_municipal.fiscalizacao.editar', 'Editar infracoes', 'editar', false),
    ('guarda-municipal', 'fiscalizacao', 'guarda_municipal.fiscalizacao.excluir', 'Excluir infracoes', 'excluir', true),
    ('guarda-municipal', 'midias', 'guarda_municipal.midias.visualizar', 'Visualizar midias', 'visualizar', false),
    ('guarda-municipal', 'midias', 'guarda_municipal.midias.criar', 'Cadastrar midias', 'criar', false),
    ('guarda-municipal', 'midias', 'guarda_municipal.midias.editar', 'Editar midias', 'editar', false),
    ('guarda-municipal', 'midias', 'guarda_municipal.midias.excluir', 'Excluir midias', 'excluir', true)
) AS m(setor_slug, modulo_slug, codigo, descricao, acao, sensivel)
  ON m.setor_slug = s.slug AND m.modulo_slug = sm.slug
ON CONFLICT (codigo) DO NOTHING;
