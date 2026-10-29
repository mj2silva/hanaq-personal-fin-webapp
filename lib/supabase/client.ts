import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database.types';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Faltan las variables de entorno de Supabase (NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY). Por favor, configure el archivo .env.local con las credenciales correspondientes.'
    );
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
