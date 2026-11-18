import { NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { jobId, conversationId, body } = await req.json();
    if (!body || String(body).length > 2000) return Response.json({ ok: false, error: "Message must be 1–2000 characters." }, { status: 400 });
    const supabase = getServerSupabase();
    if (!supabase) return Response.json({ ok: true, configured: false, id: `m-${Date.now()}`, note: "Database not connected yet — message kept on this device only." });
    const { data, error } = await supabase.from("hustly_messages").insert({ conversation_id: conversationId || null, sender_id: null, body: String(body), moderation_status: "ok" }).select("id").single();
    if (error) return Response.json({ ok: false, error: "Message could not be sent." }, { status: 500 });
    return Response.json({ ok: true, id: data.id });
  } catch { return Response.json({ ok: false, error: "Message could not be sent." }, { status: 500 }); }
}
