# Sincronização com o GitHub

Este diretório contém scripts e instruções para sincronizar o projeto com o repositório GitHub em https://github.com/zeroumbit/site-smst

## Scripts Disponíveis

- `github_sync.sh`: Script de sincronização para sistemas Unix/Linux/Mac
- `github_sync.bat`: Script de sincronização para Windows
- `.gitignore`: Arquivo de configuração para ignorar arquivos desnecessários no versionamento

## Como Sincronizar com o GitHub

### Para sistemas Unix/Linux/Mac:

```bash
# Torne o script executável
chmod +x github_sync.sh

# Execute o script
./github_sync.sh
```

### Para Windows:

Execute o arquivo `github_sync.bat` como administrador.

## Recursos Adicionais

Este projeto inclui os seguintes recursos principais:

### 1. Módulo de Documentos
- Sistema completo de gerenciamento de documentos no painel administrativo
- Upload e armazenamento de arquivos PDF e Word
- Controle de status (ativo/inativo)
- Definição de local de exibição
- Interface completa com funcionalidades CRUD

### 2. Integração com Supabase
- Scripts de integração automática com o Supabase
- Configuração de tabelas, índices e políticas de segurança
- Criação de bucket de storage para documentos
- Configuração de permissões de acesso

### 3. Melhorias na Interface
- Atualização da tela de login do admin com a logo do sistema
- Implementação das regras para seção de últimas notícias na home
- Adição de informações sobre atuação da defesa civil no combate à seca

### 4. Outras Modificações
- Remoção da funcionalidade de projetos do painel admin (mantendo nas páginas públicas)
- Atualizações no layout e navegação do painel administrativo

## Execução dos Scripts

Para executar os scripts de integração com o Supabase:

```bash
npm install
npm run setup
```

Ou para integração completa:

```bash
npm run integrate
```

## Acesso ao Projeto

- Repositório: https://github.com/zeroumbit/site-smst
- URL do projeto Supabase: https://dtuojkipijsmrmsynqjw.supabase.co

## Próximos Passos

Após a sincronização com o GitHub:

1. O código-fonte estará disponível no repositório
2. Será possível implementar CI/CD para deploy automático
3. Outros desenvolvedores poderão colaborar no projeto
4. Será possível rastrear alterações e histórico de desenvolvimento

## Nota Importante

Este projeto está configurado para trabalhar com o Supabase como backend, incluindo autenticação, banco de dados e armazenamento de arquivos. Certifique-se de ter as credenciais adequadas antes de implementar em produção.