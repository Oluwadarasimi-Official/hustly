// Server-side student-verification checks. A student is "verified" only
// when their latest hustly_student_verifications row is approved by a
// human admin. Everything else (never submitted, pending, rejected,
// resubmission requested) is unverified and the verification gate applies.
import type { NextRequest } from "next/server";
import { getServerSupabase, getUserFromBearer } from "@/lib/supabase";

export type VerificationStatus =
  | "approved"
  | "pending_manual_review"
  | "rejected"
  | "resubmission_requested"
  | "none";

export type LatestVerification = {
  status: VerificationStatus;
  submittedAt: string | null;
  reviewDueAt: string | null;
  reviewedAt: string | null;
  decisionReason: string | null;
  fullName: string | null;
  university: string | null;
};

export async function getLatestVerification(userId: string): Promise<LatestVerification | null> {
  const supabase = getServerSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("hustly_student_verifications")
    .select("status, submitted_at, review_due_at, reviewed_at, decision_reason, full_name, university")
    .eq("user_id", userId)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return {
    status: (data.status as VerificationStatus) || "none",
    submittedAt: (data.submitted_at as string | null) ?? null,
    reviewDueAt: (data.review_due_at as string | null) ?? null,
    reviewedAt: (data.reviewed_at as string | null) ?? null,
    decisionReason: (data.decision_reason as string | null) ?? null,
    fullName: (data.full_name as string | null) ?? null,
    university: (data.university as string | null) ?? null,
  };
}

type VerifiedUser = { user: { id: string; email: string | null }; verification: LatestVerification };

// Require a signed-in AND admin-approved student. Returns the user on
// success, or an error Response the route should return directly.
// 401 = not signed in, 403 = signed in but not verified yet,
// 503 = database not connected.
export async function requireVerifiedUser(
  req: NextRequest,
): Promise<VerifiedUser | { response: Response }> {
  const user = await getUserFromBearer(req);
  if (!user) {
    return {
      response: Response.json(
        { ok: false, error: "Please sign in to your Hustly account first." },
        { status: 401 },
      ),
    };
  }
  const supabase = getServerSupabase();
  if (!supabase) {
    return {
      response: Response.json(
        { ok: false, configured: false, error: "Hustly is not connected to its database yet." },
        { status: 503 },
      ),
    };
  }
  const verification = await getLatestVerification(user.id);
  if (!verification || verification.status !== "approved") {
    return {
      response: Response.json(
        {
          ok: false,
          needsVerification: true,
          error:
            "Your student verification is not approved yet. Complete your verification first — you can do that at /verify.",
        },
        { status: 403 },
      ),
    };
  }
  return { user, verification };
}
