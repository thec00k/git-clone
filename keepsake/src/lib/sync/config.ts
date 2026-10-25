/**
 * Supabase connection, from the build environment (.env.local or the host's settings):
 *   VITE_SUPABASE_URL=https://<project>.supabase.co
 *   VITE_SUPABASE_PUBLISHABLE_KEY=<publishable (anon) key>
 * Both are public by design; row level security protects the data. Never put the service role key here.
 * Without them, sign-in and backup stay hidden and the app works only on this device, as before.
 */
const env = (import.meta as {env?: Record<string, string | undefined>}).env ?? {};
export const SUPABASE_URL = env.VITE_SUPABASE_URL?.trim() ?? '';
export const SUPABASE_KEY = (env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_ANON_KEY)?.trim() ?? '';
export const syncConfigured = !!SUPABASE_URL && !!SUPABASE_KEY;
