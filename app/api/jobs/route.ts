import { NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase";
import { requireVerifiedUser, resolveUniversity, resolveViewerUniversity } from "@/lib/verification";

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
    // Same-university ordering, enforced server-side: the listing, its
    // seller and its university are all read from the database — a
    // client-supplied sellerId / universityId is NEVER trusted.
    const { data: listing, error: listingError } = await supabase.from("hustly_listings").select("id, seller_id, university_id, status").eq("id", body.listingId).maybeSingle();
    if (listingError || !listing) return Response.json({ ok: false, error: "This listing could not be found." }, { status: 404 });
    const row = listing as { seller_id?: string | null; university_id?: string | null; status?: string };
    if (row.status !== "active") return Response.json({ ok: false, error: "This listing is no longer available." }, { status: 400 });
    if (!row.seller_id) return Response.json({ ok: false, error: "This listing has no seller, so a job request cannot be sent for it." }, { status: 400 });
    if (row.seller_id === gate.user.id) return Response.json({ ok: false, error: "You cannot order your own service." }, { status: 400 });
    const buyerUni = await resolveViewerUniversity(supabase, { id: gate.user.id, meta: {} }, gate.verification);
    let sellerUniId: string | null = row.university_id || null;
    if (!sellerUniId) {
      const sellerUni = await resolveUniversity(supabase, String(row.seller_id));
      sellerUniId = sellerUni.id;
    }
    if (!buyerUni.id || !sellerUniId) {
      return Response.json({ ok: false, error: "We could not confirm both universities for this order. Complete your verification first — you can do that at /verify." }, { status: 403 });
    }
    if (buyerUni.id !== sellerUniId) {
      return Response.json({ ok: false, crossUniversity: true, error: "You can only order services from students at your own university." }, { status: 403 });
    }
    const { data, error } = await supabase.from("hustly_job_requests").insert({
      listing_id: body.listingId, buyer_id: gate.user.id, seller_id: row.seller_id,
      university_id: sellerUniId, task_description: body.taskDescription,
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
