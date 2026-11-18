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

export async function lookupUniversityId(supabase: NonNullable<ReturnType<typeof getServerSupabase>>, name: string | null | undefined): Promise<string | null> {
  if (!name) return null;
  const { data } = await supabase.from("hustly_universities").select("id").eq("name", name).maybeSingle();
  return data ? String((data as { id: unknown }).id) : null;
}

export type ResolvedUniversity = { id: string | null; name: string | null };

// Resolve a student's university, server-side, from the most reliable
// source available: (1) their approved verification row, (2) their
// hustly_profiles row, (3) the university name saved at sign-up. The
// university is NEVER taken from a client-supplied id or query param.
export async function resolveUniversity(
  supabase: NonNullable<ReturnType<typeof getServerSupabase>>,
  userId: string,
  meta?: Record<string, unknown>,
  verificationUniversity?: string | null,
): Promise<ResolvedUniversity> {
  if (verificationUniversity) {
    const id = await lookupUniversityId(supabase, verificationUniversity);
    if (id) return { id, name: verificationUniversity };
  }
  const { data: profile } = await supabase.from("hustly_profiles").select("university_id").eq("id", userId).maybeSingle();
  const profileUniId = (profile as { university_id?: unknown } | null)?.university_id;
  if (profileUniId) {
    const { data: uni } = await supabase.from("hustly_universities").select("name").eq("id", String(profileUniId)).maybeSingle();
    return { id: String(profileUniId), name: (uni as { name?: string } | null)?.name ?? null };
  }
  let metaUniversity: string | null = null;
  if (meta && typeof meta.university === "string") metaUniversity = meta.university;
  if (!metaUniversity) {
    try {
      const { data } = await supabase.auth.admin.getUserById(userId);
      const m = (data?.user?.user_metadata || {}) as Record<string, unknown>;
      if (typeof m.university === "string") metaUniversity = m.university;
    } catch { /* no auth record — university stays unresolved */ }
  }
  if (metaUniversity) {
    const id = await lookupUniversityId(supabase, metaUniversity);
    if (id) return { id, name: metaUniversity };
  }
  return { id: null, name: null };
}

// Resolve a student's university for a signed-in, verified account, using
// their verification row first (it is the admin-approved source of truth).
export async function resolveViewerUniversity(
  supabase: NonNullable<ReturnType<typeof getServerSupabase>>,
  user: { id: string; meta: Record<string, unknown> },
  verification: LatestVerification,
): Promise<ResolvedUniversity> {
  return resolveUniversity(supabase, user.id, user.meta, verification.university);
}

// Batch check: which of these user ids have an APPROVED student
// verification (human admin decision)? The verified badge is shown ONLY
// for ids in this set — never from signup, a pending/rejected status, or
// a client-supplied flag. Unknown / unapproved ids are simply absent.
export async function getApprovedUserIds(
  supabase: NonNullable<ReturnType<typeof getServerSupabase>>,
  userIds: string[],
): Promise<Set<string>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return new Set();
  try {
    const { data } = await supabase
      .from("hustly_student_verifications")
      .select("user_id")
      .in("user_id", ids)
      .eq("status", "approved");
    return new Set((data || []).map((r) => String((r as { user_id: unknown }).user_id)));
  } catch {
    return new Set();
  }
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
