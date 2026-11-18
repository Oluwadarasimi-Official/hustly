import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { getServerSupabase, getUserFromBearer, notConfiguredResponse } from "@/lib/supabase";
import { isAdminSession } from "@/lib/admin-auth";

// Student verification submission + admin decision.
// RETENTION: ID image + selfie are stored in the PRIVATE Supabase Storage
// bucket (hustly-verification) and the student_verifications row + admin
// audit entry are retained for safety/audit. Nothing here is ever public.
// Groq NEVER receives images, NEVER compares faces, NEVER approves/rejects.
//
// IDENTITY: the submission is tied to the SIGNED-IN account. The client
// sends its Supabase access token (Authorization: Bearer ...); the server
// validates it with Supabase and takes the user id + email from that
// verified token only. No email or user id from the form body is ever
// trusted, so a submission can never be filed under someone else's email.
//
// Upload hardening: only real image files are accepted (JPEG/PNG/WebP by
// MIME type), filenames are never taken from the upload — every file is
// stored under a random name — so a crafted filename or a non-image file
// (HTML/SVG/script) can never be stored or later served as content.
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function cleanText(value: FormDataEntryValue | null, max = 120): string {
  return String(value || "").trim().slice(0, max);
}

export async function POST(req: NextRequest) {
  try {
    const fd = await req.formData();
    const fullName = cleanText(fd.get("fullName"));
    const university = cleanText(fd.get("university"));
    const faculty = cleanText(fd.get("faculty"));
    const department = cleanText(fd.get("department"));
    const level = cleanText(fd.get("level"));
    const idCard = fd.get("idCard") as File | null;
    const selfie = fd.get("selfie") as File | null;
    if (!fullName || !university || !idCard || !selfie) return Response.json({ ok: false, error: "Full name, university, ID card and selfie are all required." }, { status: 400 });
    const idExt = idCard.type ? ALLOWED_IMAGE_TYPES[idCard.type] : undefined;
    const selfieExt = selfie.type ? ALLOWED_IMAGE_TYPES[selfie.type] : undefined;
    if (!idExt || !selfieExt) return Response.json({ ok: false, error: "ID card and selfie must be JPG, PNG or WebP images." }, { status: 400 });
    if (idCard.size > 5 * 1024 * 1024 || selfie.size > 5 * 1024 * 1024) return Response.json({ ok: false, error: "Each image must be under 5MB." }, { status: 400 });
    const supabase = getServerSupabase();
    if (!supabase) {
      // No database yet: accept the submission shape and return pending so the
      // UI flow can be previewed; the real record is created once Supabase is connected.
      return Response.json({ ok: true, status: "pending_manual_review", id: `pending-${Date.now()}`, note: "Database not connected yet — this submission was not stored. Connect Supabase to record verifications." });
    }
    // Who is submitting? Validated server-side from the signed-in account's
    // access token. No valid session => no submission: without an account
    // there is no trustworthy email to show the admin, and the row could
    // never be linked back to the student.
    const submitter = await getUserFromBearer(req);
    if (!submitter) return Response.json({ ok: false, error: "Please sign in to your Hustly account first, then submit your verification." }, { status: 401 });
    const stamp = Date.now();
    const idPath = `verifications/${stamp}-id-${randomUUID()}.${idExt}`;
    const selfiePath = `verifications/${stamp}-selfie-${randomUUID()}.${selfieExt}`;
    const up1 = await supabase.storage.from("hustly-verification").upload(idPath, idCard, { contentType: idCard.type, upsert: false });
    if (up1.error) return Response.json({ ok: false, error: "Could not store the ID image. Please try again." }, { status: 500 });
    const up2 = await supabase.storage.from("hustly-verification").upload(selfiePath, selfie, { contentType: selfie.type, upsert: false });
    if (up2.error) return Response.json({ ok: false, error: "Could not store the selfie. Please try again." }, { status: 500 });
    const { data, error } = await supabase.from("hustly_student_verifications").insert({
      status: "pending_manual_review", document_path: idPath, selfie_path: selfiePath,
      full_name: fullName, university, faculty, department, academic_level: level,
      user_id: submitter.id, email: submitter.email,
      review_due_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    }).select("id").single();
    if (error) return Response.json({ ok: false, error: "Could not save the verification. Please try again." }, { status: 500 });
    await supabase.from("hustly_admin_audit_logs").insert({ action: "verification_submitted", target_type: "student_verification", target_id: data.id, reason: `${fullName} — ${university}, ${faculty}, ${department}, ${level}` });
    return Response.json({ ok: true, status: "pending_manual_review", id: data.id });
  } catch { return Response.json({ ok: false, error: "Could not submit your verification. Please try again." }, { status: 500 }); }
}

// Admin decision — server-side only. The caller must hold the admin
// password session (POST /api/admin/auth) AND, where an adminId is given,
// the hustly_admin_roles check below. A human admin compares face vs ID; AI never decides.
export async function PATCH(req: NextRequest) {
  try {
    if (!isAdminSession()) return Response.json({ ok: false, error: "Admin sign-in required." }, { status: 401 });
    const { id, decision, reason, adminId } = await req.json();
    if (!["approved", "rejected", "resubmission_requested"].includes(decision)) return Response.json({ ok: false, error: "Invalid decision." }, { status: 400 });
    const supabase = getServerSupabase();
    if (!supabase) return notConfiguredResponse();
    if (adminId) {
      const { data: role } = await supabase.from("hustly_admin_roles").select("role").eq("user_id", adminId).single();
      if (!role) return Response.json({ ok: false, error: "Only admins can decide verifications." }, { status: 403 });
    }
    // The submission must exist and still be awaiting a decision. Without
    // this check the old code returned success for a made-up ID (the
    // update matched zero rows) and allowed re-deciding an already
    // decided submission.
    const { data: existing, error: fetchError } = await supabase
      .from("hustly_student_verifications")
      .select("id, status")
      .eq("id", id)
      .single();
    if (fetchError || !existing) return Response.json({ ok: false, error: "Submission not found." }, { status: 404 });
    if (!["pending_manual_review", "resubmission_requested"].includes(existing.status)) {
      return Response.json({ ok: false, error: "This submission has already been decided." }, { status: 409 });
    }
    const { data: updated, error } = await supabase
      .from("hustly_student_verifications")
      .update({ status: decision, decision_reason: reason || null, reviewed_at: new Date().toISOString(), reviewer_id: adminId || null })
      .eq("id", id)
      .eq("status", existing.status)
      .select("id")
      .single();
    if (error || !updated) return Response.json({ ok: false, error: "Could not record the decision." }, { status: 500 });
    const { error: auditError } = await supabase.from("hustly_admin_audit_logs").insert({ actor_id: adminId || null, action: `verification_${decision}`, target_type: "student_verification", target_id: id, reason: reason || null });
    if (auditError) return Response.json({ ok: false, error: "Decision saved but the audit record failed. Tell the owner — do not decide this submission again." }, { status: 500 });
    return Response.json({ ok: true, status: decision });
  } catch { return Response.json({ ok: false, error: "Could not record the decision." }, { status: 500 }); }
}
