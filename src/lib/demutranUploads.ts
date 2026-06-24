import { supabase } from '@/lib/supabase';
import { DOCUMENT_UPLOAD_RULES, PDF_UPLOAD_RULES, sanitizeFileName, validateFileUpload } from '@/lib/upload';

/**
 * Extrai o caminho relativo do arquivo no bucket a partir de uma URL do Supabase Storage.
 * Suporta URLs públicas e URLs assinadas.
 */
export function getStoragePathFromUrl(urlOrPath: string): string {
  if (!urlOrPath) return '';
  
  // Se não for uma URL (não começa com http/https), assume que já é o path relativo
  if (!urlOrPath.startsWith('http://') && !urlOrPath.startsWith('https://')) {
    return urlOrPath;
  }

  const publicMarker = '/storage/v1/object/public/demutran-anexos/';
  const publicIndex = urlOrPath.indexOf(publicMarker);
  if (publicIndex !== -1) {
    return urlOrPath.substring(publicIndex + publicMarker.length);
  }

  const signMarker = '/storage/v1/object/sign/demutran-anexos/';
  const signIndex = urlOrPath.indexOf(signMarker);
  if (signIndex !== -1) {
    const pathWithQuery = urlOrPath.substring(signIndex + signMarker.length);
    return pathWithQuery.split('?')[0]; // Remove os query params de assinatura
  }

  // Fallback caso seja de outro bucket ou estrutura diferente
  try {
    const urlObj = new URL(urlOrPath);
    const pathParts = urlObj.pathname.split('/');
    const bucketIndex = pathParts.indexOf('demutran-anexos');
    if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
      return pathParts.slice(bucketIndex + 1).join('/').split('?')[0];
    }
  } catch (e) {
    // Ignora erro de URL inválida
  }

  return urlOrPath;
}

/**
 * Gera uma URL assinada temporária para visualizar arquivos do bucket demutran-anexos.
 */
export async function getSignedUrl(urlOrPath: string, expiresInSeconds = 600): Promise<string> {
  if (!urlOrPath) return '';
  const path = getStoragePathFromUrl(urlOrPath);
  
  const { data, error } = await supabase.storage
    .from('demutran-anexos')
    .createSignedUrl(path, expiresInSeconds);

  if (error) {
    console.error('Erro ao gerar URL assinada para', path, ':', error);
    return urlOrPath; // Fallback para a URL/path original
  }

  return data.signedUrl;
}

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
