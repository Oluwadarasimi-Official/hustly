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

// Validate a Supabase Auth access token sent as `Authorization: Bearer ...`
// and return the verified user (id + email) — or null when there is no token
// or Supabase rejects it. The token is verified server-side by Supabase
// itself; a client-supplied email or user id is NEVER trusted on its own.
// Use this for any route that must know who the signed-in submitter is
// (e.g. student verification), so the stored email always comes from the
// account, never from a form field the client could forge.
export async function getUserFromBearer(req: Request): Promise<{ id: string; email: string | null; meta: Record<string, unknown> } | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  if (!token) return null;
  try {
    const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data?.user) return null;
    return { id: data.user.id, email: data.user.email ?? null, meta: (data.user.user_metadata || {}) as Record<string, unknown> };
  } catch { return null; }
}
