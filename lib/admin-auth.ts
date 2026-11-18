import { randomBytes, createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

// Server-only admin password gate for /admin.
// The password is NEVER hard-coded anywhere in this repo. It is read only
// from process.env.ADMIN_PASSWORD (set in the Vercel dashboard). The
// browser only ever holds an opaque session cookie — never the password.
//
// SECURITY MODEL (hardened 2026-11-18):
// - The session token is NOT a static value derived from the password.
//   Every successful login issues a fresh random token with a 2-hour
//   expiry: `v1.<expiryEpochSeconds>.<nonce>.<hmac>`, where the HMAC is
//   keyed by the password. A stolen cookie therefore stops working after
//   2 hours at most, and stops working immediately if the password is
//   rotated. There is no permanent admin token anywhere.
// - Verification is timing-safe and checks the expiry before accepting.

export const ADMIN_COOKIE = "hustly_admin";
const SESSION_VERSION = "v1";
const SESSION_LABEL = "hustly-admin-session-v1";
export const ADMIN_SESSION_TTL_SECONDS = 2 * 60 * 60; // 2 hours

export function isAdminPasswordConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

function sha256(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Timing-safe check of a submitted password against ADMIN_PASSWORD. */
export function verifyAdminPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !input) return false;
  return safeEqual(sha256(input).toString("hex"), sha256(expected).toString("hex"));
}

function sessionHmac(password: string, expiry: number, nonce: string): string {
  return createHmac("sha256", password)
    .update(`${SESSION_LABEL}.${expiry}.${nonce}`, "utf8")
    .digest("hex");
}

/** Issue a fresh, random, short-lived session token. One per login. */
export function issueAdminSessionToken(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  const expiry = Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS;
  const nonce = randomBytes(16).toString("hex");
  const hmac = sessionHmac(password, expiry, nonce);
  return `${SESSION_VERSION}.${expiry}.${nonce}.${hmac}`;
}

export function isAdminSession(): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  const token = cookies().get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== SESSION_VERSION) return false;
  const expiry = Number(parts[1]);
  const nonce = parts[2] || "";
  const presented = parts[3] || "";
  if (!Number.isFinite(expiry) || expiry <= Math.floor(Date.now() / 1000)) return false;
  if (!/^[0-9a-f]{32}$/.test(nonce) || !/^[0-9a-f]{64}$/.test(presented)) return false;
  return safeEqual(presented, sessionHmac(password, expiry, nonce));
}
