# Instruções para Configurar Buckets de Armazenamento no Supabase

Este guia descreve como aplicar as configurações de storage no seu projeto Supabase.

## Passo 1: Acesse o SQL Editor do Supabase

1. Acesse o painel do Supabase: https://supabase.com/dashboard/project/dtuojkipijsmrmsynqjw/database/sql
2. Vá até a seção "SQL Editor"
3. Copie e cole todo o conteúdo do arquivo `setup_storage_buckets.sql` no editor
4. Execute o script clicando no botão "Run"

## Passo 2: Verificação

Após executar o script, os seguintes itens estarão configurados:

1. **Buckets criados**:
   - `imagens` - Para armazenamento de imagens (máx. 5MB)
   - `documentos` - Para armazenamento de documentos (máx. 10MB)

2. **Políticas de segurança configuradas**:
   - Apenas usuários autenticados podem ler, escrever, atualizar e excluir arquivos
   - Acesso restrito por bucket (imagens ou documentos)

## Passo 3: Testando a funcionalidade

Após configurar os buckets, você poderá:

1. Fazer upload de imagens na seção de galeria
2. Fazer upload de documentos na seção de documentos
3. Os arquivos serão armazenados nos buckets apropriados e as URLs públicas serão salvas no banco de dados

## Observações Importantes

- Certifique-se de que sua aplicação esteja usando credenciais com permissões adequadas
- Os arquivos já estão configurados no código para usar os buckets corretos
- O componente ImageUpload em `src/components/ui/image-upload.tsx` já está configurado para usar o bucket "imagens"
- A página de documentos em `src/pages/admin/Documentos.tsx` já está configurada para usar o bucket "documentos"

## Solução de Problemas

Se encontrar algum problema:

1. Verifique se você está logado como um usuário com permissões de administração
2. Confirme que o RLS (Row Level Security) está configurado corretamente
3. Verifique se os nomes dos buckets correspondem exatamente a "imagens" e "documentos"