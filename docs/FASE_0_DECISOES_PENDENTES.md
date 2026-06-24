# Fase 0 - Decisoes Pendentes para Validacao

Use este documento como referencia rapida antes de iniciar a `Fase 1`.

## Decisoes recomendadas

- Conteudo institucional: modelo `hibrido`
- Primeiro submodulo DEMUTRAN: `liberacao de veiculos`
- Gerenciamento de usuarios do setor: exclusivo de `gestor` na primeira versao
- Notificacao externa por email: fora do escopo inicial
- Estrategia de produto: web responsivo como alvo principal

## Confirmacoes necessarias

- [ ] Noticias serao globais, setoriais ou hibridas
- [ ] Eventos serao globais, setoriais ou hibridos
- [ ] Galeria sera global, setorial ou hibrida
- [ ] Equipe sera global, setorial ou hibrida
- [ ] Documentos serao globais, setoriais ou hibridos
- [ ] `admin_setor` nao gerenciara usuarios na `Fase 1`
- [ ] Consultas publicas nao usarao `CPF` ou `CNPJ` como chave principal de busca
- [ ] `liberacao de veiculos` sera o primeiro piloto do DEMUTRAN

## Observacao

Se essas decisoes forem aprovadas, a `Fase 1` pode comecar imediatamente com migrations, nova modelagem de permissao e refatoracao da sessao administrativa.
