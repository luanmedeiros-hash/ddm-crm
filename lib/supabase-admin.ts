import { createClient } from '@supabase/supabase-js';

// Cliente com service_role — usar SOMENTE em server-side (API routes).
// Nunca expor no browser.
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
