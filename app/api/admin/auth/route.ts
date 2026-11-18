import { NextRequest } from "next/server";
import {
  ADMIN_COOKIE,
  adminSessionCookieValue,
  isAdminPasswordConfigured,
  isAdminSession,
  verifyAdminPassword,
} from "@/lib/admin-auth";

// Admin password gate: POST { password } -> sets a secure httpOnly session
// cookie on success. GET -> { configured, authed } so /admin knows whether
// to show the password bar, the dashboard, or a "not configured" state.
// The password itself is never logged, never returned, and never stored
// anywhere except the Vercel ADMIN_PASSWORD environment variable.

// Small in-memory brute-force guard: 5 failed attempts per IP per 5 minutes.
const failures = new Map<string, { count: number; firstAt: number }>();
const WINDOW_MS = 5 * 60 * 1000;
const MAX_FAILURES = 5;

function clientKey(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function isRateLimited(key: string): boolean {
  const entry = failures.get(key);
  if (!entry) return false;
  if (Date.now() - entry.firstAt > WINDOW_MS) {
    failures.delete(key);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

function recordFailure(key: string): void {
  const entry = failures.get(key);
  if (!entry || Date.now() - entry.firstAt > WINDOW_MS) {
    failures.set(key, { count: 1, firstAt: Date.now() });
  } else {
    entry.count += 1;
  }
}

export async function GET() {
  return Response.json({
    ok: true,
    configured: isAdminPasswordConfigured(),
    authed: isAdminSession(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      password?: unknown;
      logout?: unknown;
    };

    if (body.logout) {
      const res = Response.json({ ok: true });
      res.headers.append(
        "Set-Cookie",
        `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
      );
      return res;
    }

    if (!isAdminPasswordConfigured()) {
      return Response.json(
        {
          ok: false,
          configured: false,
          error:
            "Admin password is not configured yet. The owner needs to set ADMIN_PASSWORD in the deployment settings, then this will work.",
        },
        { status: 503 },
      );
    }

    const key = clientKey(req);
    if (isRateLimited(key)) {
      return Response.json(
        { ok: false, error: "Too many wrong attempts. Please wait a few minutes and try again." },
        { status: 429 },
      );
    }

    const password = typeof body.password === "string" ? body.password : "";
    if (!verifyAdminPassword(password)) {
      recordFailure(key);
      return Response.json({ ok: false, error: "Wrong password. Try again." }, { status: 401 });
    }

    failures.delete(key);
    const token = adminSessionCookieValue();
    if (!token) {
      return Response.json({ ok: false, error: "Admin password is not configured yet." }, { status: 503 });
    }
    const res = Response.json({ ok: true });
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    res.headers.append(
      "Set-Cookie",
      `${ADMIN_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200${secure}`,
    );
    return res;
  } catch {
    return Response.json({ ok: false, error: "Could not check the admin password. Please try again." }, { status: 500 });
  }
}
