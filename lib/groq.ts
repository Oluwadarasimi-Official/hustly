// Server-only Groq helper. Key is read only from process.env.GROQ_API_KEY.
// If the key is missing or Groq fails, callers get { available: false } and the
// app keeps working — AI is an enhancement, never a dependency.
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

export type GroqResult = { available: boolean; text?: string; error?: string };

export async function callGroq(system: string, user: string, maxTokens = 400): Promise<GroqResult> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return { available: false, error: "AI help is not set up yet." };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(GROQ_URL, {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user.slice(0, 2000) },
        ],
        max_tokens: maxTokens,
        temperature: 0.5,
      }),
    });
    clearTimeout(timer);
    if (!res.ok) return { available: false, error: "AI help is unavailable right now. Please try again later." };
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) return { available: false, error: "AI help returned an empty answer." };
    return { available: true, text };
  } catch {
    return { available: false, error: "AI help is unavailable right now. Please try again later." };
  }
}
