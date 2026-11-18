"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { SAFETY_COPY } from "@/lib/data";
import { SafetyBanner } from "@/components/ui";
import { getAccessToken } from "@/lib/client-auth";
import type { ChatMessage, Job } from "@/lib/utils";

export default function ChatPage() {
  const params = useParams(); const jobId = String(params.id);
  const [job, setJob] = useState<Job | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [showReveal, setShowReveal] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [reported, setReported] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const jobs: Job[] = JSON.parse(localStorage.getItem("hustly_jobs") || "[]");
    setJob(jobs.find((j) => j.id === jobId) || null);
    try { setMessages(JSON.parse(localStorage.getItem(`hustly_chat_${jobId}`) || "[]")); } catch { setMessages([]); }
    setRevealed(localStorage.getItem(`hustly_reveal_${jobId}`) === "yes");
  }, [jobId]);
  function saveMsgs(next: ChatMessage[]) { setMessages(next); localStorage.setItem(`hustly_chat_${jobId}`, JSON.stringify(next)); }
  async function send(e: React.FormEvent) {
    e.preventDefault(); if (!body.trim() || blocked) return;
    const token = await getAccessToken();
    if (!token) { setError("Please sign in to your Hustly account first, then send the message."); return; }
    const res = await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ jobId, body: body.trim() }) });
    if (!res.ok) { setError("Message could not be sent. Please try again."); return; }
    saveMsgs([...messages, { id: `m-${Date.now()}`, jobId, from: "You", body: body.trim(), at: new Date().toLocaleTimeString() }]);
    setBody("");
  }
  async function acknowledge() {
    const token = await getAccessToken();
    if (!token) { setError("Please sign in to your Hustly account first."); return; }
    const res = await fetch("/api/contact-reveal", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ jobId }) });
    if (!res.ok) { setError("Could not record the acknowledgement. Please try again."); return; }
    localStorage.setItem(`hustly_reveal_${jobId}`, "yes");
    setRevealed(true); setShowReveal(false);
  }
  async function report() {
    await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId, reason: "other", details: "Reported from chat." }) });
    setReported(true);
  }
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col px-4 py-6 sm:px-6">
      <p className="text-sm"><Link href="/inbox">← Back to inbox</Link></p>
      <h1 className="mt-3 text-2xl font-bold text-ink">{job ? job.listingTitle : "Chat"}</h1>
      {job ? <p className="mt-1 text-sm text-ink-muted">{job.buyer} · {job.seller}</p> : null}
      {/* Pinned safety notice — always visible at the top of every chat, never dismissible. */}
      <div className="sticky top-16 z-10 mt-4"><SafetyBanner /></div>
      <div className="mt-4 flex flex-1 flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-card sm:p-5">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-muted">No messages yet. Say hello and agree the scope before any payment.</p>
        ) : messages.map((m) => (
          <div key={m.id} className="max-w-[85%] rounded-2xl bg-wash px-4 py-3">
            <p className="text-xs font-medium text-ink-muted">{m.from} · {m.at}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink">{m.body}</p>
          </div>
        ))}
      </div>
      {error ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {revealed ? (
          <span className="rounded-xl bg-brand-soft px-4 py-2.5 text-sm font-medium text-brand-text">Contact revealed — you acknowledged the safety warning.</span>
        ) : (
          <button onClick={() => setShowReveal(true)} className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink">Reveal contact details</button>
        )}
        <button onClick={() => setBlocked(true)} disabled={blocked} className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink disabled:opacity-50">{blocked ? "Blocked" : "Block"}</button>
        <button onClick={report} disabled={reported} className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink disabled:opacity-50">{reported ? "Reported — admin will review" : "Report"}</button>
        {job ? <Link href={`/jobs/${job.id}`} className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink">View job</Link> : null}
      </div>
      <form onSubmit={send} className="mt-4 flex gap-2">
        <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a message…" aria-label="Write a message" className="w-full flex-1 rounded-xl border border-line px-4 py-3" />
        <button disabled={!body.trim() || blocked} className="shrink-0 rounded-xl bg-brand px-5 py-3 font-medium text-white hover:bg-brand-hover disabled:opacity-50">Send</button>
      </form>
      {showReveal ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="reveal-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lift">
            <h2 id="reveal-title" className="text-xl font-bold text-ink">Safety first</h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{SAFETY_COPY.reveal}</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">By continuing, you confirm that you understand these risks.</p>
            <div className="mt-6 flex flex-col gap-2">
              <button onClick={acknowledge} className="w-full rounded-xl bg-brand px-4 py-3 font-medium text-white hover:bg-brand-hover">I understand</button>
              <button onClick={() => setShowReveal(false)} className="w-full rounded-xl border border-line bg-white px-4 py-3 font-medium text-ink">Cancel</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
