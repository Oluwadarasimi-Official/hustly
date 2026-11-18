import { NextRequest } from "next/server";
import { getServerSupabase, getUserFromBearer } from "@/lib/supabase";
import { getLatestVerification } from "@/lib/verification";

// The signed-in student's own verification status. Used by the
// verification gate after sign-in and by the /verify page, so a student
// who already submitted sees their real status instead of a blank form.
// Requires the signed-in account's access token (Authorization: Bearer ...);
// the user id always comes from the verified token, never from the client.
export async function GET(req: NextRequest) {
  const user = await getUserFromBearer(req);
  if (!user) return Response.json({ ok: false, error: "Sign in required." }, { status: 401 });
  const supabase = getServerSupabase();
  if (!supabase) return Response.json({ ok: true, configured: false, verified: false, status: "none" });
  const v = await getLatestVerification(user.id);
  if (!v) return Response.json({ ok: true, verified: false, status: "none" });
  return Response.json({
    ok: true,
    verified: v.status === "approved",
    status: v.status,
    submittedAt: v.submittedAt,
    reviewDueAt: v.reviewDueAt,
    reviewedAt: v.reviewedAt,
    decisionReason: v.decisionReason,
    fullName: v.fullName,
    university: v.university,
  });
}
