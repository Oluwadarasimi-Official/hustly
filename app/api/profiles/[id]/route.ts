import type { NextRequest } from "next/server";
import { getServerSupabase, getUserFromBearer } from "@/lib/supabase";
import { resolveUniversity, getApprovedUserIds } from "@/lib/verification";

// Public seller profile — only information that is safe to show to anyone:
// display name, university, faculty/department/level, bio, verified status
// and public reviews. Email, phone, hostel address and ID details are
// NEVER returned here. Returns { profile: null } (not a 404) when no public
// information exists for the id, so /profile/<id> never breaks on a real
// seller who simply has not filled in a profile yet.
//
// Same-university rule: a signed-in viewer from a DIFFERENT university
// gets a 403 (crossUniversity) and no profile at all — seller profiles are
// only visible inside the seller's own university. A signed-out visitor
// has no university to compare, so they see the public-safe profile only.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id || "");
  if (!id) return Response.json({ ok: true, profile: null });
  const supabase = getServerSupabase();
  if (!supabase) return Response.json({ ok: true, profile: null });

  let name = ""; let university = ""; let universityId: string | null = null; let faculty = ""; let department = ""; let level = ""; let bio = "";
  const { data: row } = await supabase.from("hustly_profiles").select("*, hustly_universities(name)").eq("id", id).maybeSingle();
  if (row) {
    name = String((row as Record<string, unknown>).display_name || (row as Record<string, unknown>).full_name || "");
    const uni = (row as Record<string, unknown>).hustly_universities as { name?: string } | null;
    university = uni?.name || "";
    universityId = (row as Record<string, unknown>).university_id ? String((row as Record<string, unknown>).university_id) : null;
    faculty = String((row as Record<string, unknown>).faculty || "");
    department = String((row as Record<string, unknown>).department || "");
    level = String((row as Record<string, unknown>).academic_level || "");
    bio = String((row as Record<string, unknown>).bio || "");
  }
  // Fallback: details saved at sign-up live in the auth user's metadata.
  if (!name || !university) {
    try {
      const { data } = await supabase.auth.admin.getUserById(id);
      const meta = (data?.user?.user_metadata || {}) as Record<string, unknown>;
      if (!name) name = String(meta.display_name || meta.full_name || "");
      if (!university) university = String(meta.university || "");
      if (!faculty) faculty = String(meta.faculty || "");
      if (!department) department = String(meta.department || "");
      if (!level) level = String(meta.academic_level || "");
    } catch { /* no auth record — profile stays as found above */ }
  }
  // Resolve the seller's university id for the same-university check.
  if (!universityId && university) {
    const { data: uni } = await supabase.from("hustly_universities").select("id").eq("name", university).maybeSingle();
    if (uni) universityId = String((uni as { id: unknown }).id);
  }
  if (!universityId) {
    const sellerUni = await resolveUniversity(supabase, id);
    universityId = sellerUni.id;
    if (!university) university = sellerUni.name || "";
  }
  // Same-university check for a signed-in viewer — never for your OWN
  // profile: you can always see yourself, even if the university on your
  // account and on your profile ever disagree.
  const viewer = await getUserFromBearer(req);
  if (viewer && viewer.id !== id && universityId) {
    const viewerUni = await resolveUniversity(supabase, viewer.id, viewer.meta);
    if (viewerUni.id && viewerUni.id !== universityId) {
      return Response.json({ ok: false, crossUniversity: true, profile: null, error: "This profile is not available at your university. You can only see sellers from your own university." }, { status: 403 });
    }
  }
  // Verified = an approved student verification exists for this user.
  let verified = false;
  try {
    const { data: v } = await supabase.from("hustly_student_verifications").select("id").eq("user_id", id).eq("status", "approved").limit(1);
    verified = Boolean(v && v.length > 0);
  } catch { verified = false; }
  // Public reviews left for this seller on completed jobs, with the
  // reviewer's name and REAL verified status (approved verification only).
  // Reviewers are verified students by construction (reviews require an
  // approved account), but the badge is still sourced from the DB, never assumed.
  let reviews: { rating: number; comment: string; created: string; reviewer: string; reviewerVerified: boolean }[] = [];
  try {
    const { data: r } = await supabase.from("hustly_reviews").select("rating, comment, created_at, reviewer_id").eq("reviewee_id", id).order("created_at", { ascending: false }).limit(20);
    const rows = r || [];
    const reviewerIds = rows.map((x) => String((x as Record<string, unknown>).reviewer_id || "")).filter(Boolean);
    const approvedReviewers = await getApprovedUserIds(supabase, reviewerIds);
    const reviewerNames = new Map<string, string>();
    if (reviewerIds.length > 0) {
      const { data: profs } = await supabase.from("hustly_profiles").select("id, display_name, full_name").in("id", [...new Set(reviewerIds)]);
      (profs || []).forEach((p) => {
        const rec = p as Record<string, unknown>;
        reviewerNames.set(String(rec.id), String(rec.display_name || rec.full_name || ""));
      });
    }
    reviews = rows.map((x) => {
      const rid = String((x as Record<string, unknown>).reviewer_id || "");
      return {
        rating: Number((x as Record<string, unknown>).rating || 0),
        comment: String((x as Record<string, unknown>).comment || ""),
        created: String((x as Record<string, unknown>).created_at || ""),
        reviewer: reviewerNames.get(rid) || "",
        reviewerVerified: approvedReviewers.has(rid),
      };
    });
  } catch { reviews = []; }

  if (!name && !university && !row && reviews.length === 0) return Response.json({ ok: true, profile: null });
  return Response.json({ ok: true, profile: { id, name, university, faculty, department, level, bio, verified, reviews } });
}
