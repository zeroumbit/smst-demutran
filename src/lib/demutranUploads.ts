import { supabase } from '@/lib/supabase';
import { DOCUMENT_UPLOAD_RULES, PDF_UPLOAD_RULES, sanitizeFileName, validateFileUpload } from '@/lib/upload';

export async function uploadDemutranAnexo(file: File, folder: 'credenciais' | 'recursos' | 'midias') {
  const rules = folder === 'midias' ? PDF_UPLOAD_RULES : DOCUMENT_UPLOAD_RULES;
  validateFileUpload(file, rules);

  const fileName = `${folder}/${sanitizeFileName(file.name)}`;
  const { data, error } = await supabase.storage.from('demutran-anexos').upload(fileName, file, {
    upsert: false,
  });

  if (error) {
    throw error;
  }

  return supabase.storage.from('demutran-anexos').getPublicUrl(data.path).data.publicUrl;
}
