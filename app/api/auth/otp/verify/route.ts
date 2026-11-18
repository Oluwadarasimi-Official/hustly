import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();
    if (!email || !code) return Response.json({ ok: false, error: "Email and code are required." }, { status: 400 });
    const { verifyOtpCode } = await import("@/lib/otp-store");
    const result = verifyOtpCode(String(email), String(code));
    if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: 400 });
    return Response.json({ ok: true, message: "Email verified." });
  } catch { return Response.json({ ok: false, error: "Could not verify the code. Please try again." }, { status: 500 }); }
}
