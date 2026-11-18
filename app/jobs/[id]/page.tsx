"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { JOB_STATUSES, isUuid, naira, type Job } from "@/lib/utils";
import { getAccessToken } from "@/lib/client-auth";
import { EmptyState, SafetyBanner } from "@/components/ui";
import { SellerBadge } from "@/components/seller-badge";

const FLOW: Job["status"][] = ["requested", "accepted", "in_progress", "delivered", "completion_pending", "completed"];

export default function JobPage() {
  const params = useParams(); const id = String(params.id);
  const [job, setJob] = useState<Job | null>(null);
  const [rating, setRating] = useState(5); const [comment, setComment] = useState("");
  const [msg, setMsg] = useState(""); const [error, setError] = useState("");
  useEffect(() => {
    const jobs: Job[] = JSON.parse(localStorage.getItem("hustly_jobs") || "[]");
    setJob(jobs.find((j) => j.id === id) || null);
  }, [id]);
  function update(patch: Partial<Job>, note: string) {
    if (!job) return;
    const next = { ...job, ...patch };
    const jobs: Job[] = JSON.parse(localStorage.getItem("hustly_jobs") || "[]");
    localStorage.setItem("hustly_jobs", JSON.stringify(jobs.map((j) => (j.id === job.id ? next : j))));
    setJob(next); setMsg(note);
  }
  async function review(e: React.FormEvent) {
    e.preventDefault(); setError("");
    if (!job || !job.buyerConfirmed || !job.sellerConfirmed) { setError("Reviews open only after both sides confirm the job is complete."); return; }
    const token = await getAccessToken();
    if (!token) { setError("Please sign in to your Hustly account first, then leave the review."); return; }
    const res = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ jobId: job.id, rating, comment }) });
    const j = await res.json();
    if (!res.ok) { setError(j.error || "Could not save the review."); return; }
    setMsg("Review saved. Thank you.");
  }
  if (!job) return <div className="mx-auto max-w-3xl px-4 py-10"><EmptyState title="Job not found" body="This job request may have been removed, or the link is wrong." action={<Link href="/inbox" className="rounded-xl bg-brand px-5 py-3 font-medium text-white">Go to inbox</Link>} /></div>;
  const step = FLOW.indexOf(job.status);
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-sm"><Link href="/inbox">← Back to inbox</Link></p>
      <h1 className="mt-3 text-3xl font-bold leading-tight text-ink">{job.listingTitle}</h1>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-muted">Buyer: {job.buyer} · {job.seller ? <><Link href={`/profile/${encodeURIComponent(job.seller)}`} className="font-medium text-ink hover:text-brand-text">View seller</Link> <SellerBadge userId={job.seller} /></> : "Seller: —"}</p>
      {isUuid(job.seller) ? <p className="mt-2 text-sm"><Link href={`/profile/${encodeURIComponent(job.seller)}`} className="font-medium text-ink hover:text-brand-text">View seller</Link></p> : null}
      <p className="mt-2"><span className="rounded-full bg-brand-soft px-3 py-1 text-sm font-medium text-brand-text">{JOB_STATUSES[job.status]}</span></p>
      <ol className="mt-6 space-y-2">
        {FLOW.map((s, i) => (
          <li key={s} className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm ${i <= step ? "border-brand-soft2 bg-brand-soft text-ink" : "border-line bg-white text-ink-muted"}`}>
            <span className="font-semibold">{i + 1}.</span> {JOB_STATUSES[s]}
          </li>
        ))}
      </ol>
      <div className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-card">
        <h2 className="text-lg font-semibold text-ink">Agreed scope</h2>
        <p className="mt-2 text-base leading-relaxed text-ink-soft">{job.task}</p>
        <p className="mt-3 text-base"><strong>Agreed total:</strong> {naira(job.price)}</p>
        <p className="mt-1 text-sm text-ink-muted"><strong>Deadline:</strong> {job.deadline}</p>
        <p className="mt-3 rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-text">50/50 guidance: no more than 50% upfront ({naira(Math.round(job.price / 2))} at most), balance after delivery. Hustly never holds or moves money.</p>
      </div>
      <div className="mt-6"><SafetyBanner /></div>
      <div className="mt-6 flex flex-wrap gap-3">
        {job.status === "requested" && (<><button onClick={() => update({ status: "accepted" }, "Request accepted. The job is now agreed.")} className="rounded-xl bg-brand px-5 py-2.5 font-medium text-white">Accept request</button><button onClick={() => update({ status: "clarification_needed" }, "Clarification requested. Message the other side in chat.")} className="rounded-xl border border-line bg-white px-5 py-2.5 font-medium">Ask for clarification</button><button onClick={() => update({ status: "cancelled" }, "Request declined.")} className="rounded-xl border border-line bg-white px-5 py-2.5 font-medium">Decline</button></>)}
        {job.status === "accepted" && <button onClick={() => update({ status: "in_progress" }, "Work started.")} className="rounded-xl bg-brand px-5 py-2.5 font-medium text-white">Start work</button>}
        {job.status === "in_progress" && <button onClick={() => update({ status: "delivered" }, "Marked as delivered. The buyer now confirms completion.")} className="rounded-xl bg-brand px-5 py-2.5 font-medium text-white">Mark as delivered</button>}
        {job.status === "delivered" && <button onClick={() => update({ status: "completion_pending", buyerConfirmed: true }, "You confirmed completion. Waiting for the seller to confirm too.")} className="rounded-xl bg-brand px-5 py-2.5 font-medium text-white">Confirm completion (buyer)</button>}
        {job.status === "completion_pending" && <button onClick={() => update({ status: "completed", sellerConfirmed: true }, "Both sides confirmed. The job is complete — reviews are now open.")} className="rounded-xl bg-brand px-5 py-2.5 font-medium text-white">Confirm completion (seller)</button>}
        {job.status === "completed" && <span className="rounded-xl bg-brand-soft px-4 py-2.5 text-sm font-medium text-brand-text">Completed — reviews are open below.</span>}
        <Link href={`/chat/${job.id}`} className="rounded-xl border border-line bg-white px-5 py-2.5 font-medium text-ink">Open chat</Link>
      </div>
      {msg ? <p className="mt-4 rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-text" role="status">{msg}</p> : null}
      {job.status === "completed" && (
        <form onSubmit={review} className="mt-6 space-y-4 rounded-2xl border border-line bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold text-ink">Leave a review</h2>
          <p className="text-sm text-ink-muted">One review per job, only after both sides confirm completion. You cannot review yourself.</p>
          <label className="block text-sm font-medium text-ink">Rating<select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2.5">{[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} star{r > 1 ? "s" : ""}</option>)}</select></label>
          <label className="block text-sm font-medium text-ink">Comment<textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2.5" placeholder="How was the work?" /></label>
          {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p> : null}
          <button className="w-full rounded-xl bg-brand px-4 py-3 font-medium text-white hover:bg-brand-hover">Submit review</button>
        </form>
      )}
    </div>
  );
}
