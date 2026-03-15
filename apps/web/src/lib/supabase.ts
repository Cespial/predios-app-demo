import { createClient, SupabaseClient } from '@supabase/supabase-js';

function getEnvOrThrow(name: string): string {
  const value = process.env[name];
  if (!value || value === 'placeholder') {
    // During build time, env vars may not be available.
    // Return empty string to allow static generation; runtime calls will fail gracefully.
    if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
      console.warn(`[supabase] Missing env var: ${name}`);
    }
    return value ?? '';
  }
  return value;
}

const supabaseUrl = getEnvOrThrow('NEXT_PUBLIC_SUPABASE_URL') || 'https://placeholder.supabase.co';
const supabaseAnonKey = getEnvOrThrow('NEXT_PUBLIC_SUPABASE_ANON_KEY') || 'placeholder-key';

let _supabase: SupabaseClient | null = null;

export const supabase = (() => {
  if (!_supabase) {
    _supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _supabase;
})();

let _serviceClient: SupabaseClient | null = null;

export function getServiceClient() {
  if (!_serviceClient) {
    const serviceKey = getEnvOrThrow('SUPABASE_SERVICE_ROLE_KEY') || 'placeholder-key';
    _serviceClient = createClient(supabaseUrl, serviceKey);
  }
  return _serviceClient;
}
