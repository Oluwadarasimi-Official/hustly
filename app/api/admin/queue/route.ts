import { getServerSupabase } from "@/lib/supabase";
import { isAdminSession } from "@/lib/admin-auth";

// Admin verification queue. Server-side: only admins may read it (RLS on
// student_verifications + the admin password session). Evidence images are
// served only as short-lived signed URLs from the private bucket — never
// public — and only through GET /api/admin/verification/[id], never here.
// The admin password session (set by POST /api/admin/auth) is required too:
// no admin data is served without it, even to a direct API call.
//
// Rows created before migration 003 have no typed fields stored on the row:
// their name/university/faculty/department/level only survive in the
// audit-log reason string ("Name — University, Faculty, Department,
// Level"), so for those rows we parse that string as a fallback.
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

export async function GET() {
  if (!isAdminSession()) return Response.json({ ok: false, error: "Admin sign-in required." }, { status: 401 });
  const supabase = getServerSupabase();
  if (!supabase) return Response.json({ ok: true, configured: false, items: [] });
  const { data, error } = await supabase.from("hustly_student_verifications")
    .select("id, status, submitted_at, full_name, email, university, faculty, department, academic_level")
    .in("status", ["pending_manual_review", "resubmission_requested"])
    .order("submitted_at", { ascending: true }).limit(50);
  if (error) return Response.json({ ok: false, error: "Could not load the queue." }, { status: 500 });
  const rows = data || [];
  // Fallback for pre-migration rows: fill missing typed fields from the
  // verification_submitted audit entry for the same submission.
  const missing = rows.filter((r) => !r.full_name || !r.university);
  if (missing.length > 0) {
    const { data: logs } = await supabase.from("hustly_admin_audit_logs")
      .select("target_id, reason").eq("action", "verification_submitted")
      .in("target_id", missing.map((r) => r.id));
    const byTarget = new Map((logs || []).map((l) => [l.target_id, l.reason as string | null]));
    for (const row of missing) {
      const parsed = parseAuditReason(byTarget.get(row.id) ?? null);
      row.full_name = row.full_name || parsed.full_name || null;
      row.university = row.university || parsed.university || null;
      row.faculty = row.faculty || parsed.faculty || null;
      row.department = row.department || parsed.department || null;
      row.academic_level = row.academic_level || parsed.academic_level || null;
    }
  }
  return Response.json({
    ok: true,
    items: rows.map((d) => ({
      id: d.id,
      name: d.full_name || "Student submission",
      email: d.email || "",
      university: d.university || "",
      faculty: d.faculty || "",
      department: d.department || "",
      level: d.academic_level || "",
      submitted: d.submitted_at,
      status: d.status,
    })),
  });
}
