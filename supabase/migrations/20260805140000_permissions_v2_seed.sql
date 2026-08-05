-- =====================================================
-- Migration: Permissions V2 - Seed do catalogo
-- Fase: Entrega 2
-- Descricao: Popula setor_modulos e permissoes_sistema
--            apenas com o que JA EXISTE e e usado:
--              - Modulos por setor derivados do frontend
--                (MODULOS_DEMUTRAN, MODULOS_GUARDA, MODULOS_JOVEM_GUARDA)
--              - Codigos granulares JGC reais (usados em RLS)
--            Nao inventa codigos sem funcionalidade nem cria
--            perfis funcionais (comportamento JGC atual e por
--            usuario via app_metadata; perfis serao criados pelo
--            admin na UI na Entrega 3).
-- Reversivel: DELETE dos registros desta migration.
-- =====================================================

-- -----------------------------------------------------
-- 0. Corrige unicidade de prefixo: o mesmo modulo (ex: midias)
--    pode existir em setores diferentes, entao a unicidade
--    deve ser composta (setor_id, prefixo), nao global.
-- -----------------------------------------------------
ALTER TABLE public.setor_modulos
  DROP CONSTRAINT IF EXISTS setor_modulos_prefixo_key;
ALTER TABLE public.setor_modulos
  ADD CONSTRAINT setor_modulos_setor_prefixo_unq UNIQUE (setor_id, prefixo);

-- -----------------------------------------------------
-- 1. setor_modulos: modulos por setor (conforme frontend)
-- -----------------------------------------------------
INSERT INTO public.setor_modulos (setor_id, slug, prefixo, nome, ativo)
SELECT s.id, m.slug, m.prefixo, m.nome, true
FROM public.setores s
JOIN (
  VALUES
    ('demutran', 'veiculos', 'veiculos', 'Veiculos'),
    ('demutran', 'concessionarios', 'concessionarios', 'Concessionarios'),
    ('demutran', 'credenciais', 'credenciais', 'Credenciais'),
    ('demutran', 'recursos', 'recursos', 'Recursos'),
    ('demutran', 'frota', 'frota', 'Frota Municipal'),
    ('demutran', 'documentos', 'documentos', 'Documentos'),
    ('demutran', 'midias', 'midias', 'Midias'),
    ('guarda-municipal', 'iros', 'iros', 'IROs'),
    ('guarda-municipal', 'guardas', 'guardas', 'Guardas'),
    ('guarda-municipal', 'guarda_escalas', 'guarda_escalas', 'Escalas da Guarda'),
    ('guarda-municipal', 'guarda_frota', 'guarda_frota', 'Frota da Guarda'),
    ('guarda-municipal', 'guarda_equipes', 'guarda_equipes', 'Equipes da Guarda'),
    ('guarda-municipal', 'fiscalizacao', 'fiscalizacao', 'Fiscalizacao'),
    ('guarda-municipal', 'midias', 'midias', 'Midias'),
    ('jovem-guarda', 'jgc_dashboard', 'jovem_guarda.dashboard', 'Painel Jovem Guarda'),
    ('jovem-guarda', 'jgc_alunos', 'jovem_guarda.alunos', 'Alunos'),
    ('jovem-guarda', 'jgc_responsaveis', 'jovem_guarda.responsaveis', 'Responsaveis'),
    ('jovem-guarda', 'jgc_turmas', 'jovem_guarda.turmas', 'Turmas'),
    ('jovem-guarda', 'jgc_frequencia', 'jovem_guarda.frequencia', 'Frequencia'),
    ('jovem-guarda', 'jgc_atividades', 'jovem_guarda.atividades', 'Atividades'),
    ('jovem-guarda', 'jgc_acompanhamento', 'jovem_guarda.acompanhamento', 'Acompanhamento do Aluno'),
    ('jovem-guarda', 'jgc_relatorios', 'jovem_guarda.relatorios', 'Relatorios')
) AS m(setor_slug, slug, prefixo, nome) ON m.setor_slug = s.slug
ON CONFLICT (setor_id, slug) DO NOTHING;

-- -----------------------------------------------------
-- 2. permissoes_sistema: codigos granulares JGC reais
--    (extraidos do uso em RLS e do frontend JGC_PERMISSION_MODULES)
--    sensivel = true para acoes destrutivas/irreversiveis:
--    excluir, inativar, gerenciar_alunos, editar frequencia, exportar.
-- -----------------------------------------------------
INSERT INTO public.permissoes_sistema (modulo_id, codigo, nome, descricao, acao, sensivel, ativo)
SELECT sm.id, m.codigo, m.nome, m.descricao, m.acao, m.sensivel, true
FROM public.setor_modulos sm
JOIN (
  VALUES
    ('jovem_guarda.dashboard', 'jovem_guarda.dashboard.visualizar', 'Visualizar painel', 'Indicadores e visao geral do projeto', 'visualizar', false),
    ('jovem_guarda.alunos', 'jovem_guarda.alunos.visualizar', 'Visualizar alunos', 'Cadastro e ficha completa dos participantes', 'visualizar', false),
    ('jovem_guarda.alunos', 'jovem_guarda.alunos.criar', 'Cadastrar alunos', 'Criar novos registros de participantes', 'criar', false),
    ('jovem_guarda.alunos', 'jovem_guarda.alunos.editar', 'Editar alunos', 'Alterar dados da ficha dos participantes', 'editar', false),
    ('jovem_guarda.alunos', 'jovem_guarda.alunos.inativar', 'Inativar alunos', 'Desativar participante do projeto', 'inativar', true),
    ('jovem_guarda.responsaveis', 'jovem_guarda.responsaveis.visualizar', 'Visualizar responsaveis', 'Contatos e vinculos familiares', 'visualizar', false),
    ('jovem_guarda.responsaveis', 'jovem_guarda.responsaveis.criar', 'Cadastrar responsaveis', 'Criar registros de responsaveis', 'criar', false),
    ('jovem_guarda.responsaveis', 'jovem_guarda.responsaveis.editar', 'Editar responsaveis', 'Alterar dados de responsaveis', 'editar', false),
    ('jovem_guarda.turmas', 'jovem_guarda.turmas.visualizar', 'Visualizar turmas', 'Turmas, instrutores e vinculo de alunos', 'visualizar', false),
    ('jovem_guarda.turmas', 'jovem_guarda.turmas.criar', 'Cadastrar turmas', 'Criar novas turmas', 'criar', false),
    ('jovem_guarda.turmas', 'jovem_guarda.turmas.editar', 'Editar turmas', 'Alterar dados das turmas', 'editar', false),
    ('jovem_guarda.turmas', 'jovem_guarda.turmas.excluir', 'Excluir turmas', 'Remover turmas do projeto', 'excluir', true),
    ('jovem_guarda.turmas', 'jovem_guarda.turmas.gerenciar_alunos', 'Gerenciar alunos da turma', 'Vincular/desvincular alunos de turmas', 'gerenciar_alunos', true),
    ('jovem_guarda.frequencia', 'jovem_guarda.frequencia.visualizar', 'Visualizar frequencia', 'Chamadas e acompanhamento de presenca', 'visualizar', false),
    ('jovem_guarda.frequencia', 'jovem_guarda.frequencia.registrar', 'Registrar frequencia', 'Realizar chamadas (somente professor)', 'registrar', false),
    ('jovem_guarda.frequencia', 'jovem_guarda.frequencia.editar', 'Editar frequencia', 'Corrigir chamadas ja registradas', 'editar', true),
    ('jovem_guarda.atividades', 'jovem_guarda.atividades.visualizar', 'Visualizar atividades', 'Aulas, eventos, visitas e oficinas', 'visualizar', false),
    ('jovem_guarda.atividades', 'jovem_guarda.atividades.criar', 'Cadastrar atividades', 'Criar novas atividades', 'criar', false),
    ('jovem_guarda.atividades', 'jovem_guarda.atividades.editar', 'Editar atividades', 'Alterar dados das atividades', 'editar', false),
    ('jovem_guarda.atividades', 'jovem_guarda.atividades.excluir', 'Excluir atividades', 'Remover atividades do projeto', 'excluir', true),
    ('jovem_guarda.acompanhamento', 'jovem_guarda.acompanhamento.visualizar', 'Visualizar acompanhamento', 'Registros socioeducativos (acesso rigoroso)', 'visualizar', false),
    ('jovem_guarda.acompanhamento', 'jovem_guarda.acompanhamento.criar', 'Registrar acompanhamento', 'Criar registros socioeducativos', 'criar', false),
    ('jovem_guarda.acompanhamento', 'jovem_guarda.acompanhamento.editar', 'Editar acompanhamento', 'Alterar registros socioeducativos', 'editar', true),
    ('jovem_guarda.relatorios', 'jovem_guarda.relatorios.visualizar', 'Visualizar relatorios', 'Consultas do Jovem Guarda', 'visualizar', false),
    ('jovem_guarda.relatorios', 'jovem_guarda.relatorios.gerar', 'Gerar relatorios', 'Gerar novos relatorios', 'gerar', false),
    ('jovem_guarda.relatorios', 'jovem_guarda.relatorios.exportar', 'Exportar relatorios', 'Exportar dados em arquivo', 'exportar', true)
) AS m(prefixo, codigo, nome, descricao, acao, sensivel) ON m.prefixo = sm.prefixo
ON CONFLICT (codigo) DO NOTHING;
