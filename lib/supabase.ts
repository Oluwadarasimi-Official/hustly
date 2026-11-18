import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getBrowserSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

export function getServerSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !(service || anon)) return null;
  // Service-role key is server-only; never import this in client components.
  return createClient(url, service || anon!, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function notConfiguredResponse() {
  return Response.json(
    { ok: false, configured: false, error: "Hustly is not connected to its database yet. The owner needs to set the Supabase credentials in the deployment settings, then this will work." },
    { status: 503 },
  );
}
