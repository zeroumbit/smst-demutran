# Instruções Finais de Sincronização com o Supabase

Este guia descreve como completar a sincronização do banco de dados com o Supabase.

## Passo 1: Acesse o SQL Editor do Supabase

1. Acesse o painel do Supabase: https://supabase.com/dashboard/project/dtuojkipijsmrmsynqjw/database/sql
2. Vá até a seção "SQL Editor"
3. Copie e cole todo o conteúdo do arquivo `supabase_final_sync_fixed.sql` no editor
4. Execute o script clicando no botão "Run"

## O que este script faz:

1. **Cria a tabela "paginas"** - Essa tabela é usada para controlar em quais páginas os documentos e fotos são exibidos
2. **Cria o bucket "documentos"** - Para armazenamento de arquivos PDF e Word
3. **Configura políticas de segurança** - Para permitir que usuários autenticados façam upload e leitura de documentos
4. **Atualiza a tabela "galeria_fotos"** - Adiciona a coluna pagina_exibicao se ainda não existir
5. **Cria funções e triggers** - Para validar que as páginas de exibição existem
6. **Insere páginas padrão** - Para todos os módulos do sistema (secretaria, demutran, guarda municipal, etc.)

## Passo 2: Verificação Final

Após executar o script:

1. Verifique se a tabela "paginas" foi criada com sucesso
2. Confirme que o bucket "documentos" aparece na seção de Storage
3. Teste o formulário de upload de documentos para garantir que está funcionando

## Status Atual Conhecido:

- ✅ Bucket "imagens" - já existente
- ❌ Bucket "documentos" - será criado com este script
- ❌ Tabela "paginas" - será criada com este script
- ✅ Todas as outras tabelas - já existentes

Após executar este script, sua base de dados estará completamente sincronizada com o código do repositório e todos os recursos de documentos e galeria estarão funcionais.