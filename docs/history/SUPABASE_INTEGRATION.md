# Integração Supabase Automática

Este diretório contém scripts para automatizar a integração do sistema com o Supabase.

## Scripts Disponíveis

- `supabase_integration.js`: Script principal para integração com o Supabase
- `auto_integrate.js`: Script de integração automática que executa todo o processo
- `install.sh`: Script de instalação para sistemas Unix/Linux/Mac
- `install.bat`: Script de instalação para Windows
- `package.json`: Arquivo de configuração do projeto e dependências

## Como Executar a Integração Automática

### Método 1: Usando npm (recomendado)

```bash
# Instale as dependências
npm install

# Execute a integração
npm run setup-supabase
```

### Método 2: Executando o script diretamente

```bash
node auto_integrate.js
```

### Método 3: Para Windows

Execute o arquivo `install.bat` como administrador.

## O que o script faz

1. Verifica a conexão com o Supabase usando o URL e access token fornecidos
2. Cria a tabela `documentos` com todas as colunas necessárias
3. Configura os índices para otimizar as buscas
4. Define as políticas de segurança para acesso aos documentos
5. Cria o bucket de storage para armazenamento de arquivos de documentos
6. Configura as políticas de acesso para o bucket de documentos

## Importante

- Este script usa o access token do Supabase que você forneceu: `sbp_xxx...` (substitua pelo seu token)
- O script se conecta ao projeto Supabase com ID: `jpztntmwmrhdobxsyulj`
- O URL do projeto é: `https://dtuojkipijsmrmsynqjw.supabase.co`

Após a execução bem-sucedida deste script, o módulo de documentos no painel administrativo funcionará corretamente, resolvendo o erro do console que estava ocorrendo.