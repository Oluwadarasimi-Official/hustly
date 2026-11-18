import { getServerSupabase } from "@/lib/supabase";

// Public seller profile — only information that is safe to show to anyone:
// display name, university, faculty/department/level, bio, verified status
// and public reviews. Email, phone, hostel address and ID details are
// NEVER returned here. Returns { profile: null } (not a 404) when no public
// information exists for the id, so /profile/<id> never breaks on a real
// seller who simply has not filled in a profile yet.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = decodeURIComponent(params.id || "");
  if (!id) return Response.json({ ok: true, profile: null });
  const supabase = getServerSupabase();
  if (!supabase) return Response.json({ ok: true, profile: null });

  let name = ""; let university = ""; let faculty = ""; let department = ""; let level = ""; let bio = "";
  const { data: row } = await supabase.from("hustly_profiles").select("*, hustly_universities(name)").eq("id", id).maybeSingle();
  if (row) {
    name = String((row as Record<string, unknown>).display_name || (row as Record<string, unknown>).full_name || "");
    const uni = (row as Record<string, unknown>).hustly_universities as { name?: string } | null;
    university = uni?.name || "";
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
  // Verified = an approved student verification exists for this user.
  let verified = false;
  try {
    const { data: v } = await supabase.from("hustly_student_verifications").select("id").eq("user_id", id).eq("status", "approved").limit(1);
    verified = Boolean(v && v.length > 0);
  } catch { verified = false; }
  // Public reviews left for this seller on completed jobs.
  let reviews: { rating: number; comment: string; created: string }[] = [];
  try {
    const { data: r } = await supabase.from("hustly_reviews").select("rating, comment, created_at").eq("reviewee_id", id).order("created_at", { ascending: false }).limit(20);
    reviews = (r || []).map((x) => ({ rating: Number((x as Record<string, unknown>).rating || 0), comment: String((x as Record<string, unknown>).comment || ""), created: String((x as Record<string, unknown>).created_at || "") }));
  } catch { reviews = []; }

  if (!name && !university && !row && reviews.length === 0) return Response.json({ ok: true, profile: null });
  return Response.json({ ok: true, profile: { id, name, university, faculty, department, level, bio, verified, reviews } });
}
