import { NextRequest } from "next/server";
import { callGroq } from "@/lib/groq";
import { FAQ_POLICY } from "@/lib/data";

// FAQ answers grounded ONLY in Hustly's own published policy text.
// Groq is optional: if it is missing or fails, the policy text is returned.
export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();
    if (!question || typeof question !== "string" || question.length > 500) return Response.json({ ok: false, error: "Ask a question of up to 500 characters." }, { status: 400 });
    const r = await callGroq(
      `Answer ONLY from this Hustly policy text. If the answer is not in the text, say so plainly and do not invent it. Keep the answer under 100 words.\n\n${FAQ_POLICY}`,
      question,
    );
    if (!r.available) return Response.json({ ok: true, available: false, text: "AI answers are unavailable right now. The Safety Tips page has the full policy: https://hustlyapp.vercel.app/safety" });
    return Response.json({ ok: true, available: true, text: r.text });
  } catch { return Response.json({ ok: false, error: "AI help is unavailable right now." }, { status: 500 }); }
}
