import { createHash, createHmac } from "crypto";
import { getServerSupabase } from "./supabase";

// Brute-force protection for the admin login, persisted in the database
// (hustly_admin_login_attempts) so it survives server restarts and works
// across every serverless instance — the old in-memory map could be
// bypassed by a restart and did not share state between instances.
// If the database is unavailable, an in-memory map is used as a fallback
// so the lockout still applies on the current instance.
//
// Escalating lockout, per client IP (hashed, never stored raw):
//   5 failed attempts  -> locked 5 minutes
//   10 failed attempts -> locked 30 minutes
//   15+ failed attempts -> locked 60 minutes
// A successful login clears the record. Failures older than the 15-minute
// counting window reset the counter (unless currently locked).

const WINDOW_MS = 15 * 60 * 1000;
const TABLE = "hustly_admin_login_attempts";

type Entry = { count: number; firstAt: number };
const memoryFallback = new Map<string, Entry & { lockedUntil: number }>();

/** One-way hash of the client IP. Keyed by the admin password when it is
 *  set, so the stored hash is useless without it; falls back to plain
 *  SHA-256. The raw IP is never written to the database. */
export function hashClientIp(ip: string): string {
  const key = process.env.ADMIN_PASSWORD;
  if (key) return createHmac("sha256", key).update(ip, "utf8").digest("hex");
  return createHash("sha256").update(ip, "utf8").digest("hex");
}

function lockoutMsFor(failures: number): number {
  if (failures >= 15) return 60 * 60 * 1000;
  if (failures >= 10) return 30 * 60 * 1000;
  if (failures >= 5) return 5 * 60 * 1000;
  return 0;
}

async function dbRow(ipHash: string) {
  const supabase = getServerSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .select("failures, first_failed_at, locked_until")
    .eq("ip_hash", ipHash)
    .single();
  if (error || !data) return null;
  return data as { failures: number; first_failed_at: string; locked_until: string | null };
}

async function dbUpsert(ipHash: string, failures: number, firstFailedAt: Date, lockedUntil: Date | null) {
  const supabase = getServerSupabase();
  if (!supabase) return false;
  const { error } = await supabase.from(TABLE).upsert({
    ip_hash: ipHash,
    failures,
    first_failed_at: firstFailedAt.toISOString(),
    locked_until: lockedUntil ? lockedUntil.toISOString() : null,
    updated_at: new Date().toISOString(),
  });
  return !error;
}

async function dbDelete(ipHash: string) {
  const supabase = getServerSupabase();
  if (!supabase) return;
  await supabase.from(TABLE).delete().eq("ip_hash", ipHash);
}

export async function isAdminLockedOut(ipHash: string): Promise<{ locked: boolean; retryAfterSeconds: number }> {
  const now = Date.now();
  const row = await dbRow(ipHash);
  if (row) {
    if (row.locked_until && new Date(row.locked_until).getTime() > now) {
      return { locked: true, retryAfterSeconds: Math.ceil((new Date(row.locked_until).getTime() - now) / 1000) };
    }
    return { locked: false, retryAfterSeconds: 0 };
  }
  const mem = memoryFallback.get(ipHash);
  if (mem && mem.lockedUntil > now) {
    return { locked: true, retryAfterSeconds: Math.ceil((mem.lockedUntil - now) / 1000) };
  }
  return { locked: false, retryAfterSeconds: 0 };
}

export async function recordAdminLoginFailure(ipHash: string): Promise<void> {
  const now = Date.now();
  const row = await dbRow(ipHash);
  let failures = 1;
  let firstAt = new Date(now);
  if (row) {
    const firstFailedMs = new Date(row.first_failed_at).getTime();
    if (now - firstFailedMs > WINDOW_MS && !(row.locked_until && new Date(row.locked_until).getTime() > now)) {
      failures = 1;
      firstAt = new Date(now);
    } else {
      failures = (row.failures || 0) + 1;
      firstAt = new Date(firstFailedMs);
    }
  }
  const lockMs = lockoutMsFor(failures);
  const lockedUntil = lockMs > 0 ? new Date(now + lockMs) : null;
  const saved = await dbUpsert(ipHash, failures, firstAt, lockedUntil);
  if (!saved) {
    const mem = memoryFallback.get(ipHash);
    const memFailures = mem && now - mem.firstAt <= WINDOW_MS ? mem.count + 1 : 1;
    const memFirstAt = mem && now - mem.firstAt <= WINDOW_MS ? mem.firstAt : now;
    const memLock = lockoutMsFor(memFailures);
    memoryFallback.set(ipHash, {
      count: memFailures,
      firstAt: memFirstAt,
      lockedUntil: memLock > 0 ? now + memLock : 0,
    });
  }
}

export async function clearAdminLoginFailures(ipHash: string): Promise<void> {
  memoryFallback.delete(ipHash);
  await dbDelete(ipHash);
}
