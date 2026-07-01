-- Adiciona a coluna cpf na tabela guardas_municipais se não existir
ALTER TABLE public.guardas_municipais ADD COLUMN IF NOT EXISTS cpf text;

-- Garante índice único para o cpf, permitindo múltiplos nulos
CREATE UNIQUE INDEX IF NOT EXISTS guardas_municipais_cpf_unq ON public.guardas_municipais (cpf) WHERE cpf IS NOT NULL;

-- Garante as graduações padrão existam
INSERT INTO public.guarda_municipal_graduacoes (nome, ordem)
VALUES
  ('Gcm de 2ª classe (inicial)', 1),
  ('Gcm de 1ª classe', 2),
  ('Subinspetor', 3),
  ('Inspetor de 2ª classe', 4),
  ('Inspetor de 1ª classe', 5),
  ('Inspetor Especial', 6)
ON CONFLICT (nome) DO UPDATE SET ordem = EXCLUDED.ordem, ativo = true;

-- Insere os guardas municipais listados no PDF
-- 1. Inspetores de 1ª classe
INSERT INTO public.guardas_municipais (matricula, nome, cpf, graduacao_id, ativo)
VALUES
  ('03179', 'ANTONIA CRISTHIANY LESSA MAGALHAES', '81984227300', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe' LIMIT 1), true),
  ('02992', 'ANTONIO AREMILSON MARTINS FREITAS', '12412457387', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe' LIMIT 1), true),
  ('03180', 'ANTONIO FABIO NASCIMENTO GONCALVES', '90293819300', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe' LIMIT 1), true),
  ('03181', 'ANTONIO OCLECIO DE PAULA ROCHA', '15966625816', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe' LIMIT 1), true),
  ('03182', 'ANTONIO RAIMUNDO FERREIRA ANASTACIO', '76242277387', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe' LIMIT 1), true),
  ('03183', 'ARISTOTELES FREITAS ROCHA', '79581986391', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe' LIMIT 1), true),
  ('03184', 'CHARLES CRUZ UCHOA', '55659640320', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe' LIMIT 1), true),
  ('03185', 'CLARA MARIA ANASTACIO FREIRE', '56895534334', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe' LIMIT 1), true),
  ('03186', 'CLAUDIO RODRIGUES DA SILVA', '36048569300', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe' LIMIT 1), true),
  ('03189', 'EDUARDO PEREIRA CHAVES', '91752094387', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe' LIMIT 1), true),
  ('03190', 'ERIONALDO DANIEL COSTA', '83850872300', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe' LIMIT 1), true),
  ('03191', 'ERYVAN DE ALMEIDA LIRA', '61632007304', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe' LIMIT 1), true),
  ('03192', 'FRANCISCA ERIVANIA FREITAS MARTINS', '64370216320', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe' LIMIT 1), true),
  ('01826', 'FRANCISCO DAS CHAGAS SILVA RAMOS', '83773576315', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe' LIMIT 1), true),
  ('03195', 'FRANCISCO DE PAULO BARBOSA JUNIOR', '76710700330', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe' LIMIT 1), true),
  ('03044', 'FRANCISCO GEAN GOMES DA SILVA', '75101661368', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe' LIMIT 1), true),
  ('00265', 'FRANCISCO GERVASIO LOPES DA SILVA', '69296707315', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe' LIMIT 1), true),
  ('03187', 'FRANCISCO GLAUBER SILVA FERREIRA', '69567310378', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe' LIMIT 1), true),
  ('03197', 'FRANCISCO MALBERIO ESTEVAO GOMES', '92211453368', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe' LIMIT 1), true),
  ('03198', 'FRANCISCO MARCUS VIEIRA SOUSA', '76201996320', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe' LIMIT 1), true),
  ('03199', 'GLEYSSIANO FREITAS DOMINGOS', '81085982300', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe' LIMIT 1), true),
  ('02899', 'JOSE SERGIO CAVALCANTE BRAGA', '77129156368', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe' LIMIT 1), true),
  ('03202', 'JOSE TEIXEIRA RODRIGUES JUNIOR', '91915023300', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe' LIMIT 1), true),
  ('03204', 'LUIS ALBERTO RODRIGUES LIMA', '31554865387', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe' LIMIT 1), true),
  ('03205', 'MARCELO PAULINO', '91002232360', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe' LIMIT 1), true),
  ('02694', 'MARCOS ANTONIO DANIEL VIANA', '24726427334', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe' LIMIT 1), true),
  ('03206', 'MARIA DO SOCORRO GOMES GONCALVES', '63679132387', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe' LIMIT 1), true),
  ('03207', 'MARIA LUCILENE TEIXEIRA UCHOA', '70117500372', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe' LIMIT 1), true),
  ('03208', 'RAIMUNDO NONATO DE ABREU', '11492074349', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe' LIMIT 1), true),
  ('03194', 'RICARDO BRAGA DE SOUSA', '79868657334', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe' LIMIT 1), true),
  ('01299', 'SARMENTO NETO DE OLIVEIRA', '76231119300', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Inspetor de 1ª classe' LIMIT 1), true)
ON CONFLICT (matricula) DO UPDATE SET
  nome = EXCLUDED.nome,
  cpf = EXCLUDED.cpf,
  graduacao_id = EXCLUDED.graduacao_id,
  ativo = true,
  updated_at = now();

-- 2. Guardas de 1ª classe
INSERT INTO public.guardas_municipais (matricula, nome, cpf, graduacao_id, ativo)
VALUES
  ('11215', 'ANTONIA MARCIA UCHOA LESSA', '00062418327', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Gcm de 1ª classe' LIMIT 1), true),
  ('11067', 'CARLIANE CAVALCANTE RODRIGUES FEITOSA', '01817123343', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Gcm de 1ª classe' LIMIT 1), true),
  ('11068', 'DIEGO FREIRE ABREU', '01034381300', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Gcm de 1ª classe' LIMIT 1), true),
  ('11216', 'FABIO CARDOSO ALMEIDA', '84625112320', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Gcm de 1ª classe' LIMIT 1), true),
  ('11233', 'FRANCISCO GILVANE DE SOUSA CRUZ', '72555009353', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Gcm de 1ª classe' LIMIT 1), true),
  ('11221', 'FRANCISCO LEANDRO SILVA PAULINO', '02691650375', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Gcm de 1ª classe' LIMIT 1), true),
  ('11220', 'FRANCISCO ROMARIO LIMA BRAGA', '02783643308', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Gcm de 1ª classe' LIMIT 1), true),
  ('05034', 'JONAS NERI DE CASTRO', '92340695368', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Gcm de 1ª classe' LIMIT 1), true),
  ('11069', 'JOSE ERILSON SOUSA FEITOSA', '63648725300', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Gcm de 1ª classe' LIMIT 1), true),
  ('11218', 'JOSE GILSON COELHO DIAS', '69584176315', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Gcm de 1ª classe' LIMIT 1), true),
  ('11227', 'JOSE HAROLDO LOPES DE ABREU', '32304382304', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Gcm de 1ª classe' LIMIT 1), true),
  ('11219', 'MARIA AURINEIDE INACIO COSTA', '36579262320', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Gcm de 1ª classe' LIMIT 1), true),
  ('11217', 'MARIA DO SOCORRO COSTA ADERALDO', '57357510344', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Gcm de 1ª classe' LIMIT 1), true),
  ('11222', 'SANDRO RIELMESON FERNANDES LIRA ALVES', '02666660354', (SELECT id FROM public.guarda_municipal_graduacoes WHERE nome = 'Gcm de 1ª classe' LIMIT 1), true)
ON CONFLICT (matricula) DO UPDATE SET
  nome = EXCLUDED.nome,
  cpf = EXCLUDED.cpf,
  graduacao_id = EXCLUDED.graduacao_id,
  ativo = true,
  updated_at = now();
