-- Insere as páginas existentes no sistema para que as fotos possam ser associadas a elas

INSERT INTO paginas (nome, titulo, descricao, ativo) VALUES
('secretaria', 'Secretaria', 'Página da Secretaria', true),
('demutran', 'Demutran', 'Página da Demutran', true),
('guarda-municipal', 'Guarda Municipal', 'Página da Guarda Municipal', true),
('jovem-guarda', 'Jovem Guarda', 'Página da Jovem Guarda', true),
('guarda-cidada', 'Guarda Cidadã', 'Página da Guarda Cidadã', true),
('rope', 'ROPE', 'Página do ROPE', true),
('gmam', 'GMAM', 'Página do GMAM', true),
('gsu', 'GSU', 'Página do GSU', true),
('defesa-civil', 'Defesa Civil', 'Página da Defesa Civil', true)
ON CONFLICT (nome) DO NOTHING;