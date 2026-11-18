import { getServerSupabase } from "@/lib/supabase";
import { isAdminSession } from "@/lib/admin-auth";

// Admin-only detail for one verification submission, including short-lived
// signed URLs for the ID card and selfie in the PRIVATE hustly-verification
// bucket. The bucket is never public; the signed URLs expire after 10
// minutes and are only ever issued to a holder of the admin password
// session. No image bytes or storage paths are exposed to non-admin users,
// and images are never sent to Groq or any AI service.
//
// Rows created before migration 003 have no typed fields stored on the row:
// their name/university/faculty/department/level only survive in the
// audit-log reason string, so for those rows we parse that string as a
// fallback (same as the queue API), so the Preview shows everything.
function parseAuditReason(reason: string | null) {
  if (!reason) return {};
  const [namePart, rest] = reason.split(" — ");
  if (!rest) return { full_name: reason.trim() || null };
  const parts = rest.split(",").map((s) => s.trim());
  return {
    full_name: namePart?.trim() || null,
    university: parts[0] || null,
    faculty: parts[1] || null,
    department: parts[2] || null,
    academic_level: parts[3] || null,
  };
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!isAdminSession()) return Response.json({ ok: false, error: "Admin sign-in required." }, { status: 401 });
  const supabase = getServerSupabase();
  if (!supabase) return Response.json({ ok: false, error: "Hustly is not connected to its database yet." }, { status: 503 });
  const { data, error } = await supabase.from("hustly_student_verifications")
    .select("id, status, submitted_at, reviewed_at, decision_reason, review_due_at, full_name, email, university, faculty, department, academic_level, document_path, selfie_path")
    .eq("id", params.id).single();
  if (error || !data) return Response.json({ ok: false, error: "Submission not found." }, { status: 404 });
  const row = data as typeof data & { full_name: string | null; university: string | null; faculty: string | null; department: string | null; academic_level: string | null };
  if (!row.full_name || !row.university) {
    const { data: logs } = await supabase.from("hustly_admin_audit_logs")
      .select("reason").eq("action", "verification_submitted").eq("target_id", params.id).limit(1);
    const parsed = parseAuditReason(logs?.[0]?.reason ?? null);
    row.full_name = row.full_name || parsed.full_name || null;
    row.university = row.university || parsed.university || null;
    row.faculty = row.faculty || parsed.faculty || null;
    row.department = row.department || parsed.department || null;
    row.academic_level = row.academic_level || parsed.academic_level || null;
  }
  async function signed(path: string | null) {
    if (!path) return null;
    const { data: s, error: e } = await supabase!.storage.from("hustly-verification").createSignedUrl(path, 600);
    if (e || !s?.signedUrl) return null;
    return s.signedUrl;
  }
  return Response.json({
    ok: true,
    item: {
      id: data.id,
      name: row.full_name || "Student submission",
      email: data.email || "",
      university: row.university || "",
      faculty: row.faculty || "",
      department: row.department || "",
      level: row.academic_level || "",
      submitted: data.submitted_at,
      reviewed_at: data.reviewed_at,
      decision_reason: data.decision_reason,
      review_due_at: data.review_due_at,
      status: data.status,
      idCardUrl: await signed(data.document_path),
      selfieUrl: await signed(data.selfie_path),
    },
  });
}
