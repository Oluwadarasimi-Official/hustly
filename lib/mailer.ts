import crypto from "crypto";
import nodemailer from "nodemailer";

// Server-only. SMTP credentials come from env vars only; never hard-code them.
// Dedicated sender mailbox: techdavid211@gmail.com (SMTP_USER / SMTP_FROM).
export function smtpConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function hashOtp(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function sendOtpEmail(to: string, code: string): Promise<{ ok: boolean; error?: string }> {
  if (!smtpConfigured()) {
    return { ok: false, error: "Email is not configured yet. The owner needs to add the Gmail app password (SMTP_PASS) in the deployment settings." };
  }
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: `Your Hustly verification code: ${code}`,
      text: `Hello,\n\nYour Hustly verification code is ${code}. It expires in 10 minutes and can only be used once.\n\nNever share this code with anyone. Hustly will never ask you for it.\n\n— Hustly (Your Campus. Your Hustle.)`,
      html: `<p>Hello,</p><p>Your Hustly verification code is <strong style="font-size:20px">${code}</strong>.</p><p>It expires in 10 minutes and can only be used once. Never share this code with anyone.</p><p>— Hustly (Your Campus. Your Hustle.)</p>`,
    });
    return { ok: true };
  } catch (e) {
    console.error("OTP email failed", e instanceof Error ? e.message : "unknown error");
    return { ok: false, error: "We could not send the email right now. Please try again in a few minutes." };
  }
}
