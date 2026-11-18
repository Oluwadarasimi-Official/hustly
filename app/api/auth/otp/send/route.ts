import { NextRequest } from "next/server";
import { generateOtp, hashOtp, sendOtpEmail, smtpConfigured } from "@/lib/mailer";
import { otpStore, setOtp, OTP_RESEND_COOLDOWN_MS, OTP_TTL_MS } from "@/lib/otp-store";
import { getServerSupabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { email, userId } = await req.json();
    if (!email || typeof email !== "string" || !email.includes("@")) return Response.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
    const now = Date.now();
    const prev = otpStore.get(email.toLowerCase());
    if (prev && now < prev.resendAfter) return Response.json({ ok: false, error: "Please wait a minute before asking for another code." }, { status: 429 });
    if (!smtpConfigured()) return Response.json({ ok: false, configured: false, error: "Email is not configured yet. The owner needs to add the Gmail app password (SMTP_PASS) in the deployment settings." }, { status: 503 });
    const code = generateOtp();
    setOtp(email, hashOtp(code), now);
    const supabase = getServerSupabase();
    if (supabase && userId) {
      await supabase.from("hustly_email_verifications").insert({ user_id: userId, code_hash: hashOtp(code), expires_at: new Date(now + OTP_TTL_MS).toISOString(), attempts: 0, resend_after: new Date(now + OTP_RESEND_COOLDOWN_MS).toISOString() });
    }
    const sent = await sendOtpEmail(email, code);
    if (!sent.ok) return Response.json({ ok: false, error: sent.error }, { status: 502 });
    return Response.json({ ok: true, message: "Verification code sent." });
  } catch { return Response.json({ ok: false, error: "Could not send the code. Please try again." }, { status: 500 }); }
}
