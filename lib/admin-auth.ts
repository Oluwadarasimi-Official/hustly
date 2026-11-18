import { cookies } from "next/headers";
import { createHash, createHmac, timingSafeEqual } from "crypto";

// Server-only admin password gate for /admin.
// The password is NEVER hard-coded anywhere in this repo. It is read only
// from process.env.ADMIN_PASSWORD (set in the Vercel dashboard). The
// browser only ever holds an opaque session cookie — never the password.

export const ADMIN_COOKIE = "hustly_admin";
const SESSION_LABEL = "hustly-admin-session";

export function isAdminPasswordConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

function safeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Timing-safe check of a submitted password against ADMIN_PASSWORD. */
export function verifyAdminPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !input) return false;
  return safeEqual(sha256(input), sha256(expected));
}

/** Opaque session token derived from the password (HMAC). It changes if the
 *  password changes, so old sessions stop working after a password rotation. */
function expectedSessionToken(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return createHmac("sha256", password).update(SESSION_LABEL).digest("hex");
}

export function adminSessionCookieValue(): string | null {
  return expectedSessionToken();
}

export function isAdminSession(): boolean {
  const expected = expectedSessionToken();
  if (!expected) return false;
  const token = cookies().get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return safeEqual(Buffer.from(token, "utf8"), Buffer.from(expected, "utf8"));
}
