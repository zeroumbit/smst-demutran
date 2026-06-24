INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('imagens', 'imagens', false, 5242880, '{image/png,image/jpeg,image/webp}')
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow read access to authenticated users for imagens bucket" ON storage.objects;
CREATE POLICY "Allow read access to authenticated users for imagens bucket" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'imagens');

DROP POLICY IF EXISTS "Allow insert access to authenticated users for imagens bucket" ON storage.objects;
CREATE POLICY "Allow insert access to authenticated users for imagens bucket" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'imagens');

DROP POLICY IF EXISTS "Allow update access to authenticated users for imagens bucket" ON storage.objects;
CREATE POLICY "Allow update access to authenticated users for imagens bucket" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'imagens');
