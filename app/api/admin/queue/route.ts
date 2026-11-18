import { getServerSupabase } from "@/lib/supabase";

// Admin verification queue. Server-side: only admins may read it (RLS on
// student_verifications + the admin-role check). Evidence images are
// served only as short-lived signed URLs from the private bucket — never public.
export async function GET() {
  const supabase = getServerSupabase();
  if (!supabase) return Response.json({ ok: true, configured: false, items: [] });
  const { data, error } = await supabase.from("hustly_student_verifications").select("id, status, submitted_at").in("status", ["pending_manual_review", "resubmission_requested"]).order("submitted_at", { ascending: true }).limit(50);
  if (error) return Response.json({ ok: false, error: "Could not load the queue." }, { status: 500 });
  return Response.json({ ok: true, items: (data || []).map((d) => ({ id: d.id, name: "Student submission", university: "", submitted: d.submitted_at, status: d.status })) });
}
