-- =====================================================
-- Migration: Secure Demutran Anexos Bucket
-- Descricao: Atualiza a propriedade public do bucket
--            'demutran-anexos' para false (privado),
--            garantindo que anexos sensíveis (CNH,
--            laudos médicos, comprovantes) só possam
--            ser acessados via URLs assinadas ou RLS.
-- =====================================================

UPDATE storage.buckets
SET public = false
WHERE id = 'demutran-anexos';
