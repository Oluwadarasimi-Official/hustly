import { hashOtp } from "./mailer";

// OTP records: only the hash is ever stored — never the plaintext code.
// In-memory per server instance; when Supabase is connected the hashed
// record is also written to hustly_email_verifications.
export type OtpRecord = { hash: string; expiresAt: number; attempts: number; resendAfter: number; consumed: boolean };
export const otpStore = new Map<string, OtpRecord>();
export const OTP_TTL_MS = 10 * 60_000;
export const OTP_RESEND_COOLDOWN_MS = 60_000;

export function setOtp(email: string, hash: string, now: number) {
  otpStore.set(email.toLowerCase(), { hash, expiresAt: now + OTP_TTL_MS, attempts: 0, resendAfter: now + OTP_RESEND_COOLDOWN_MS, consumed: false });
}

export function verifyOtpCode(email: string, code: string): { ok: boolean; error?: string } {
  const rec = otpStore.get(email.toLowerCase());
  if (!rec) return { ok: false, error: "No code was sent to this email. Ask for a new one." };
  if (rec.consumed) return { ok: false, error: "That code was already used. Ask for a new one." };
  if (Date.now() > rec.expiresAt) return { ok: false, error: "That code has expired. Ask for a new one." };
  if (rec.attempts >= 5) return { ok: false, error: "Too many wrong attempts. Ask for a new code." };
  rec.attempts += 1;
  if (rec.hash !== hashOtp(code)) return { ok: false, error: "That code is wrong. Check it and try again." };
  rec.consumed = true;
  return { ok: true };
}
