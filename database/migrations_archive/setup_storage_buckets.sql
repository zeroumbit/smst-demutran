-- Script para criar buckets de armazenamento e configurar políticas de segurança no Supabase

-- Primeiro, vamos criar os buckets de armazenamento
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('imagens', 'imagens', false, 5242880, '{image/png,image/jpeg,image/webp,image/gif,image/svg+xml}'),
  ('documentos', 'documentos', false, 10485760, '{application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel}');

-- Agora vamos configurar as políticas de segurança para o bucket de imagens
CREATE POLICY "Allow read access to authenticated users for imagens bucket" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'imagens');

CREATE POLICY "Allow insert access to authenticated users for imagens bucket" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'imagens');

CREATE POLICY "Allow update access to authenticated users for imagens bucket" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'imagens');

CREATE POLICY "Allow delete access to authenticated users for imagens bucket" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'imagens');

-- Agora vamos configurar as políticas de segurança para o bucket de documentos
CREATE POLICY "Allow read access to authenticated users for documentos bucket" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'documentos');

CREATE POLICY "Allow insert access to authenticated users for documentos bucket" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documentos');

CREATE POLICY "Allow update access to authenticated users for documentos bucket" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'documentos');

CREATE POLICY "Allow delete access to authenticated users for documentos bucket" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'documentos');

-- Pronto! Os buckets e políticas de segurança foram configurados.
-- Agora o sistema pode fazer upload e leitura de arquivos de imagem e documentos.