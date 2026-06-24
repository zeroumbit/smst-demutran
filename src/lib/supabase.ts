import { createClient } from '@supabase/supabase-js';

// Função para sanitizar strings para uso em headers HTTP (remove caracteres não-ASCII)
const sanitizeString = (str: string) => {
  if (!str) return '';
  // Remove qualquer caractere que não seja ASCII imprimível (33-126)
  // Isso elimina espaços invisíveis, acentos não permitidos em headers, etc.
  return str.replace(/[^\x21-\x7E]/g, '');
};

const supabaseUrl = sanitizeString(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = sanitizeString(import.meta.env.VITE_SUPABASE_ANON_KEY);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Variáveis de ambiente do Supabase não configuradas corretamente (verifique VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY).');
}

// Configuração do cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Função para verificar a conexão
export const checkConnection = async () => {
  try {
    // Testar a conexão fazendo uma chamada simples
    const { data, error } = await supabase.from('test_table').select('*').limit(1);

    if (error) {
      console.error('Erro na conexão com o Supabase:', error.message);
      return false;
    }

    console.log('Conexão com o Supabase bem sucedida!');
    return true;
  } catch (error) {
    console.error('Erro ao verificar conexão com o Supabase:', error.message);
    return false;
  }
};