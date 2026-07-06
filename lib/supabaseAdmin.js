import { createClient } from '@supabase/supabase-js';

// Usa la SERVICE ROLE KEY (mai NEXT_PUBLIC, resta segreta sul server).
// Serve alle API route che scrivono dati per conto del cron o di un
// utente già autenticato lato client.
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Config Supabase mancante (URL o SERVICE_ROLE_KEY).');
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

// Verifica che la richiesta arrivi da un utente loggato, leggendo il
// token che il frontend passa nell'header Authorization: Bearer <token>.
export async function requireUser(request, supabaseAdmin) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error) return null;
  return data.user;
}
