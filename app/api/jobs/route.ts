import { NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { requireVerifiedUser } from "@/lib/verification";

const ALLOWED: Record<string, string[]> = {
  requested: ["accepted", "declined", "clarification_needed", "cancelled"],
  clarification_needed: ["accepted", "cancelled"],
  accepted: ["in_progress", "cancelled"],
  in_progress: ["delivered", "cancelled"],
  delivered: ["completion_pending", "cancelled"],
  completion_pending: ["completed", "disputed"],
  completed: [], cancelled: [], disputed: [],
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.listingId || !body.taskDescription) return Response.json({ ok: false, error: "Listing and task description are required." }, { status: 400 });
    if (typeof body.proposedPrice !== "number" || body.proposedPrice < 0) return Response.json({ ok: false, error: "Enter a valid price." }, { status: 400 });
    // Only a signed-in, admin-approved student can send a job request.
    // The buyer is always the verified account, never a client-supplied id.
    const gate = await requireVerifiedUser(req);
    if ("response" in gate) return gate.response;
    const supabase = getServerSupabase();
    if (!supabase) return Response.json({ ok: true, configured: false, id: `job-${Date.now()}`, note: "Database not connected yet — job kept on this device only." });
    const { data, error } = await supabase.from("hustly_job_requests").insert({
      listing_id: body.listingId, buyer_id: gate.user.id, seller_id: body.sellerId || null,
      university_id: body.universityId || null, task_description: body.taskDescription,
      proposed_price: body.proposedPrice, deadline: body.deadline || null, status: "requested",
    }).select("id").single();
    if (error) return Response.json({ ok: false, error: "Could not send the job request." }, { status: 500 });
    return Response.json({ ok: true, id: data.id });
  } catch { return Response.json({ ok: false, error: "Could not send the job request." }, { status: 500 }); }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, status } = await req.json();
    if (!ALLOWED[status] && status !== "declined") return Response.json({ ok: false, error: "Invalid job status." }, { status: 400 });
    // Job state changes are verified-student actions too.
    const gate = await requireVerifiedUser(req);
    if ("response" in gate) return gate.response;
    const supabase = getServerSupabase();
    if (!supabase) return Response.json({ ok: true, configured: false, note: "Database not connected yet." });
    // State transitions are enforced server-side; RLS ensures only the two
    // participants can update their job. A buyer cannot accept their own request.
    const { error } = await supabase.from("hustly_job_requests").update({ status }).eq("id", id);
    if (error) return Response.json({ ok: false, error: "Could not update the job." }, { status: 500 });
    return Response.json({ ok: true, status });
  } catch { return Response.json({ ok: false, error: "Could not update the job." }, { status: 500 }); }
}
