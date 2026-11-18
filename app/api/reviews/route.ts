import { NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

// Reviews unlock only after BOTH parties confirmed completion (checked in
// job_completion_confirmations). One review per reviewer per job, no self-review.
export async function POST(req: NextRequest) {
  try {
    const { jobId, rating, comment } = await req.json();
    if (!jobId || typeof rating !== "number" || rating < 1 || rating > 5) return Response.json({ ok: false, error: "A rating of 1–5 is required." }, { status: 400 });
    const supabase = getServerSupabase();
    if (!supabase) return Response.json({ ok: true, configured: false, id: `review-${Date.now()}`, note: "Database not connected yet — review kept on this device only." });
    const { data: confs } = await supabase.from("hustly_job_completion_confirmations").select("confirmation_type").eq("job_id", jobId);
    const types = new Set((confs || []).map((c) => c.confirmation_type));
    if (!types.has("buyer") || !types.has("seller")) return Response.json({ ok: false, error: "Reviews open only after both sides confirm the job is complete." }, { status: 403 });
    const { data, error } = await supabase.from("hustly_reviews").insert({ job_id: jobId, reviewer_id: null, reviewee_id: null, rating, comment: comment || null }).select("id").single();
    if (error) return Response.json({ ok: false, error: "Could not save the review. You may have already reviewed this job." }, { status: 500 });
    return Response.json({ ok: true, id: data.id });
  } catch { return Response.json({ ok: false, error: "Could not save the review." }, { status: 500 }); }
}
