// Client-side helpers for the signed-in session and the verification gate.
import { getBrowserSupabase } from "@/lib/supabase";

export async function getAccessToken(): Promise<string | null> {
  const supabase = getBrowserSupabase();
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  } catch {
    return null;
  }
}

export type VerificationStatusResponse = {
  ok: boolean;
  configured?: boolean;
  verified: boolean;
  status: "approved" | "pending_manual_review" | "rejected" | "resubmission_requested" | "none";
  submittedAt?: string | null;
  reviewDueAt?: string | null;
  reviewedAt?: string | null;
  decisionReason?: string | null;
  fullName?: string | null;
  university?: string | null;
};

// The signed-in student's verification status from the server, or null
// when there is no session / the check could not run. Callers must treat
// null as "unknown — do not block the user on it".
export async function fetchVerificationStatus(): Promise<VerificationStatusResponse | null> {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    const res = await fetch("/api/verify/status", { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    return (await res.json()) as VerificationStatusResponse;
  } catch {
    return null;
  }
}

// Human-readable WAT timestamp, e.g. "18 Nov 2026, 08:04 WAT" — never a
// raw ISO string on screen.
export function formatWAT(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return (
      new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Africa/Lagos",
      }).format(d) + " WAT"
    );
  } catch {
    return "—";
  }
}
