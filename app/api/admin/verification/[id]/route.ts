import { getServerSupabase } from "@/lib/supabase";
import { isAdminSession } from "@/lib/admin-auth";

// Admin-only detail for one verification submission, including short-lived
// signed URLs for the ID card and selfie in the PRIVATE hustly-verification
// bucket. The bucket is never public; the signed URLs expire after 10
// minutes and are only ever issued to a holder of the admin password
// session. No image bytes or storage paths are exposed to non-admin users,
// and images are never sent to Groq or any AI service.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!isAdminSession()) return Response.json({ ok: false, error: "Admin sign-in required." }, { status: 401 });
  const supabase = getServerSupabase();
  if (!supabase) return Response.json({ ok: false, error: "Hustly is not connected to its database yet." }, { status: 503 });
  const { data, error } = await supabase.from("hustly_student_verifications")
    .select("id, status, submitted_at, reviewed_at, decision_reason, full_name, email, university, faculty, department, academic_level, document_path, selfie_path")
    .eq("id", params.id).single();
  if (error || !data) return Response.json({ ok: false, error: "Submission not found." }, { status: 404 });
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
      name: data.full_name || "Student submission",
      email: data.email || "",
      university: data.university || "",
      faculty: data.faculty || "",
      department: data.department || "",
      level: data.academic_level || "",
      submitted: data.submitted_at,
      reviewed_at: data.reviewed_at,
      decision_reason: data.decision_reason,
      status: data.status,
      idCardUrl: await signed(data.document_path),
      selfieUrl: await signed(data.selfie_path),
    },
  });
}
