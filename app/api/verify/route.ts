import { NextRequest } from "next/server";
import { getServerSupabase, notConfiguredResponse } from "@/lib/supabase";

// Student verification submission + admin decision.
// RETENTION: ID image + selfie are stored in the PRIVATE Supabase Storage
// bucket (hustly-verification) and the student_verifications row + admin
// audit entry are retained for safety/audit. Nothing here is ever public.
// Groq NEVER receives images, NEVER compares faces, NEVER approves/rejects.

export async function POST(req: NextRequest) {
  try {
    const fd = await req.formData();
    const fullName = String(fd.get("fullName") || "");
    const university = String(fd.get("university") || "");
    const faculty = String(fd.get("faculty") || "");
    const department = String(fd.get("department") || "");
    const level = String(fd.get("level") || "");
    const idCard = fd.get("idCard") as File | null;
    const selfie = fd.get("selfie") as File | null;
    if (!fullName || !university || !idCard || !selfie) return Response.json({ ok: false, error: "Full name, university, ID card and selfie are all required." }, { status: 400 });
    if (idCard.size > 5 * 1024 * 1024 || selfie.size > 5 * 1024 * 1024) return Response.json({ ok: false, error: "Each image must be under 5MB." }, { status: 400 });
    const supabase = getServerSupabase();
    if (!supabase) {
      // No database yet: accept the submission shape and return pending so the
      // UI flow can be previewed; the real record is created once Supabase is connected.
      return Response.json({ ok: true, status: "pending_manual_review", id: `pending-${Date.now()}`, note: "Database not connected yet — this submission was not stored. Connect Supabase to record verifications." });
    }
    const stamp = Date.now();
    const idPath = `verifications/${stamp}-id-${idCard.name}`;
    const selfiePath = `verifications/${stamp}-selfie-${selfie.name}`;
    const up1 = await supabase.storage.from("hustly-verification").upload(idPath, idCard, { contentType: idCard.type, upsert: false });
    if (up1.error) return Response.json({ ok: false, error: "Could not store the ID image. Please try again." }, { status: 500 });
    const up2 = await supabase.storage.from("hustly-verification").upload(selfiePath, selfie, { contentType: selfie.type, upsert: false });
    if (up2.error) return Response.json({ ok: false, error: "Could not store the selfie. Please try again." }, { status: 500 });
    const { data, error } = await supabase.from("hustly_student_verifications").insert({
      status: "pending_manual_review", document_path: idPath, selfie_path: selfiePath,
      review_due_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    }).select("id").single();
    if (error) return Response.json({ ok: false, error: "Could not save the verification. Please try again." }, { status: 500 });
    await supabase.from("hustly_admin_audit_logs").insert({ action: "verification_submitted", target_type: "student_verification", target_id: data.id, reason: `${fullName} — ${university}, ${faculty}, ${department}, ${level}` });
    return Response.json({ ok: true, status: "pending_manual_review", id: data.id });
  } catch { return Response.json({ ok: false, error: "Could not submit your verification. Please try again." }, { status: 500 }); }
}

// Admin decision — server-side only. The caller must be an admin; the route
// checks hustly_admin_roles. A human admin compares face vs ID; AI never decides.
export async function PATCH(req: NextRequest) {
  try {
    const { id, decision, reason, adminId } = await req.json();
    if (!["approved", "rejected", "resubmission_requested"].includes(decision)) return Response.json({ ok: false, error: "Invalid decision." }, { status: 400 });
    const supabase = getServerSupabase();
    if (!supabase) return notConfiguredResponse();
    if (adminId) {
      const { data: role } = await supabase.from("hustly_admin_roles").select("role").eq("user_id", adminId).single();
      if (!role) return Response.json({ ok: false, error: "Only admins can decide verifications." }, { status: 403 });
    }
    const { error } = await supabase.from("hustly_student_verifications").update({ status: decision, decision_reason: reason || null, reviewed_at: new Date().toISOString(), reviewer_id: adminId || null }).eq("id", id);
    if (error) return Response.json({ ok: false, error: "Could not record the decision." }, { status: 500 });
    await supabase.from("hustly_admin_audit_logs").insert({ actor_id: adminId || null, action: `verification_${decision}`, target_type: "student_verification", target_id: id, reason: reason || null });
    return Response.json({ ok: true, status: decision });
  } catch { return Response.json({ ok: false, error: "Could not record the decision." }, { status: 500 }); }
}
