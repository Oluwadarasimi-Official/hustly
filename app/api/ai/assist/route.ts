import { NextRequest } from "next/server";
import { callGroq } from "@/lib/groq";
import { CATEGORIES, FAQ_POLICY } from "@/lib/data";

// Bounded Groq assistance, server-side only, text only.
// Groq NEVER receives ID images or selfies, NEVER compares faces, and NEVER
// approves or rejects identity. Verification triage here is text only: check
// the TYPED fields for consistency and missing/unclear entries, and draft a
// short triage summary for the HUMAN admin. The admin decides.
export async function POST(req: NextRequest) {
  try {
    const { kind, text } = await req.json();
    if (!text || typeof text !== "string" || text.length > 2000) return Response.json({ ok: false, error: "Text of up to 2000 characters is required." }, { status: 400 });
    if (kind === "verification_triage") {
      const r = await callGroq(
        "You help an admin triage a student verification submission. Use ONLY the typed text given. Check that name, university, faculty, department and level are present and consistent, and flag anything missing or unclear. Do NOT claim to verify identity, do NOT claim face matching, do NOT approve or reject. Reply in 2 short sentences.",
        text,
      );
      if (!r.available) return Response.json({ ok: true, available: false, text: "AI triage is unavailable — the admin can still review the submission manually." });
      return Response.json({ ok: true, available: true, text: r.text });
    }
    if (kind === "category") {
      const r = await callGroq(
        `Suggest ONE category from this list: ${CATEGORIES.map((c) => c.name).join(", ")}. Reply with only the category name.`,
        text,
      );
      if (!r.available) return Response.json({ ok: true, available: false, text: "" });
      return Response.json({ ok: true, available: true, text: r.text });
    }
    const r = await callGroq(
      "You help a student write a clear, honest service listing for Hustly, a same-university student marketplace. Suggest a short improved description and safer wording. Do not invent qualifications, prices or guarantees. Keep it under 80 words.",
      text,
    );
    if (!r.available) return Response.json({ ok: true, available: false, text: "AI help is unavailable right now — your listing still works without it." });
    return Response.json({ ok: true, available: true, text: r.text });
  } catch { return Response.json({ ok: false, error: "AI help is unavailable right now." }, { status: 500 }); }
}
