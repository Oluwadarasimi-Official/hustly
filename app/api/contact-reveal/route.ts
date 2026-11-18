import { NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { requireVerifiedUser } from "@/lib/verification";

// Contact reveal: records that the user read the safety warning and pressed
// "I understand", with user, timestamp and job/conversation. The contact
// detail itself is never stored in this record.
export async function POST(req: NextRequest) {
  try {
    const { jobId, conversationId } = await req.json();
    // Only a signed-in, admin-approved student can reveal contact details.
    // The acknowledgement is always filed under the verified account.
    const gate = await requireVerifiedUser(req);
    if ("response" in gate) return gate.response;
    const supabase = getServerSupabase();
    if (!supabase) return Response.json({ ok: true, configured: false, acknowledgedAt: new Date().toISOString(), note: "Database not connected yet — acknowledgement kept on this device only." });
    const { error } = await supabase.from("hustly_contact_reveal_acknowledgements").insert({ conversation_id: conversationId || null, job_id: jobId || null, user_id: gate.user.id, acknowledged_at: new Date().toISOString(), warning_version: "v1" });
    if (error) return Response.json({ ok: false, error: "Could not record the acknowledgement." }, { status: 500 });
    return Response.json({ ok: true, acknowledgedAt: new Date().toISOString() });
  } catch { return Response.json({ ok: false, error: "Could not record the acknowledgement." }, { status: 500 }); }
}
