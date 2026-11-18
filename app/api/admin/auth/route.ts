import { NextRequest } from "next/server";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_TTL_SECONDS,
  isAdminPasswordConfigured,
  isAdminSession,
  issueAdminSessionToken,
  verifyAdminPassword,
} from "@/lib/admin-auth";
import {
  clearAdminLoginFailures,
  hashClientIp,
  isAdminLockedOut,
  recordAdminLoginFailure,
} from "@/lib/admin-rate-limit";

// Admin password gate: POST { password } -> sets a secure httpOnly session
// cookie on success. GET -> { configured, authed } so /admin knows whether
// to show the password bar, the dashboard, or a "not configured" state.
// The password itself is never logged, never returned, and never stored
// anywhere except the Vercel ADMIN_PASSWORD environment variable.
//
// Hardening (2026-11-18):
// - Session tokens are fresh random values with a 2-hour expiry (see
//   lib/admin-auth.ts) — no permanent token exists to steal.
// - Failed logins are tracked in the database with escalating lockouts
//   (5 fails -> 5 min, 10 -> 30 min, 15+ -> 60 min), so restarts and
//   extra serverless instances do not reset the guard.
// - Failed attempts return a generic error that reveals nothing about
//   whether the password is configured or how many attempts remain.
// - Every response here is Cache-Control: no-store — admin auth state
//   must never be cached by a browser, CDN, or proxy.

function noStore(res: Response): Response {
  res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return res;
}

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function GET() {
  return noStore(
    Response.json({
      ok: true,
      configured: isAdminPasswordConfigured(),
      authed: isAdminSession(),
    }),
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      password?: unknown;
      logout?: unknown;
    };

    if (body.logout) {
      const res = noStore(Response.json({ ok: true }));
      res.headers.append(
        "Set-Cookie",
        `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
      );
      return res;
    }

    const ipHash = hashClientIp(clientIp(req));

    // Generic error for every failure path: an attacker learns nothing
    // about whether the password is configured or how close they are.
    const genericFail = (status: number) =>
      noStore(Response.json({ ok: false, error: "Wrong password. Try again." }, { status }));

    const lock = await isAdminLockedOut(ipHash);
    if (lock.locked) {
      const res = noStore(
        Response.json(
          { ok: false, error: "Too many wrong attempts. Please wait a while and try again." },
          { status: 429 },
        ),
      );
      res.headers.set("Retry-After", String(lock.retryAfterSeconds));
      return res;
    }

    if (!isAdminPasswordConfigured()) return genericFail(401);

    const password = typeof body.password === "string" ? body.password : "";
    if (!verifyAdminPassword(password)) {
      await recordAdminLoginFailure(ipHash);
      return genericFail(401);
    }

    await clearAdminLoginFailures(ipHash);
    const token = issueAdminSessionToken();
    if (!token) return genericFail(401);
    const res = noStore(Response.json({ ok: true }));
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    res.headers.append(
      "Set-Cookie",
      `${ADMIN_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ADMIN_SESSION_TTL_SECONDS}${secure}`,
    );
    return res;
  } catch {
    return noStore(
      Response.json({ ok: false, error: "Could not check the admin password. Please try again." }, { status: 500 }),
    );
  }
}
