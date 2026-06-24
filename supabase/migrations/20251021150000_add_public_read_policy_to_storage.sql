DROP POLICY IF EXISTS "Public read access for imagens bucket" ON storage.objects;
CREATE POLICY "Public read access for imagens bucket" ON storage.objects
FOR SELECT
USING (bucket_id = 'imagens');
