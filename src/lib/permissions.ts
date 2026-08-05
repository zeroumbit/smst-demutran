import { supabase } from '@/lib/supabase';

const cache = new Map<string, boolean>();

export const clearPermissionCache = () => cache.clear();

export async function hasPermissionRpc(codigo: string): Promise<boolean> {
  if (cache.has(codigo)) {
    return cache.get(codigo)!;
  }

  try {
    const { data, error } = await supabase.rpc('tem_permissao', { _codigo: codigo });
    const result = !error && data === true;
    cache.set(codigo, result);
    return result;
  } catch {
    return false;
  }
}
