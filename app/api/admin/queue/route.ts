import { getServerSupabase } from "@/lib/supabase";
import { isAdminSession } from "@/lib/admin-auth";

// Admin verification queue. Server-side: only admins may read it (RLS on
// student_verifications + the admin-role check). Evidence images are
// served only as short-lived signed URLs from the private bucket — never public.
// The admin password session (set by POST /api/admin/auth) is required too:
// no admin data is served without it, even to a direct API call.
export async function GET() {
  if (!isAdminSession()) return Response.json({ ok: false, error: "Admin sign-in required." }, { status: 401 });
  const supabase = getServerSupabase();
  if (!supabase) return Response.json({ ok: true, configured: false, items: [] });
  const { data, error } = await supabase.from("hustly_student_verifications").select("id, status, submitted_at").in("status", ["pending_manual_review", "resubmission_requested"]).order("submitted_at", { ascending: true }).limit(50);
  if (error) return Response.json({ ok: false, error: "Could not load the queue." }, { status: 500 });
  return Response.json({ ok: true, items: (data || []).map((d) => ({ id: d.id, name: "Student submission", university: "", submitted: d.submitted_at, status: d.status })) });
}
