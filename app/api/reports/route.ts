import { NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

const REASONS = ["suspected_scam", "harassment", "impersonation", "misleading_listing", "non_delivery", "unsafe_conduct", "other"];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!REASONS.includes(body.reason) && body.reason !== "other") return Response.json({ ok: false, error: "Choose a report reason." }, { status: 400 });
    const supabase = getServerSupabase();
    if (!supabase) return Response.json({ ok: true, configured: false, id: `report-${Date.now()}`, note: "Database not connected yet — report kept on this device only." });
    const { data, error } = await supabase.from("hustly_reports").insert({
      reporter_id: null, target_user_id: body.targetUserId || null, listing_id: body.listingId || null,
      job_id: body.jobId || null, reason: body.reason, details: body.details || null, status: "open",
    }).select("id").single();
    if (error) return Response.json({ ok: false, error: "Could not send the report." }, { status: 500 });
    return Response.json({ ok: true, id: data.id });
  } catch { return Response.json({ ok: false, error: "Could not send the report." }, { status: 500 }); }
}
