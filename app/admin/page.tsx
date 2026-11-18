"use client";
import { useEffect, useState } from "react";
import { CATEGORIES } from "@/lib/data";

type QueueItem = { id: string; name: string; university: string; submitted: string; status: string };

export default function AdminPage() {
  const [tab, setTab] = useState<"overview" | "verification" | "reports" | "users" | "listings" | "settings" | "audit">("overview");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [msg, setMsg] = useState(""); const [error, setError] = useState("");
  const [aiOn, setAiOn] = useState(true);
  useEffect(() => {
    fetch("/api/admin/queue").then((r) => r.json()).then((j) => { if (Array.isArray(j.items)) setQueue(j.items); }).catch(() => {});
  }, []);
  async function decide(id: string, decision: "approved" | "rejected" | "resubmission_requested") {
    setError(""); setMsg("");
    const res = await fetch("/api/verify", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, decision, reason: decision === "approved" ? "ID and selfie checked by admin." : "Please resubmit a clearer photo." }) });
    const j = await res.json();
    if (!res.ok) { setError(j.error || "Admin action needs a connected database and an admin account."); return; }
    setQueue(queue.filter((q) => q.id !== id));
    setMsg(`Verification ${decision.replace("_", " ")}. The decision was recorded in the audit log.`);
  }
  const tabs = [["overview", "Overview"], ["verification", "Verification queue"], ["reports", "Reports"], ["users", "Users"], ["listings", "Listings"], ["settings", "Settings"], ["audit", "Audit log"]] as const;
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-ink">Admin dashboard</h1>
      <p className="mt-2 max-w-2xl text-base leading-relaxed text-ink-soft">
        This area is for admins only. Every action here is checked server-side against the admin role and written to the audit log.
        Verification decisions are made by a human admin comparing the ID card and selfie — never by AI.
      </p>
      <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Admin sections">
        {tabs.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-full px-4 py-2 text-sm font-medium ${tab === k ? "bg-brand text-white" : "border border-line bg-white text-ink-soft"}`}>{label}</button>
        ))}
      </div>
      {msg ? <p className="mt-4 rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-text" role="status">{msg}</p> : null}
      {error ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p> : null}

      {tab === "overview" && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[["Total users", "—"], ["Verified students", "—"], ["Pending reviews", String(queue.length)], ["Active listings", "—"], ["Active jobs", "—"], ["Reports awaiting action", "—"], ["Suspended users", "0"], ["Audit entries", "—"]].map(([label, v]) => (
            <div key={label} className="rounded-2xl border border-line bg-white p-5 shadow-card"><p className="text-sm text-ink-muted">{label}</p><p className="mt-1 text-2xl font-bold text-ink">{v}</p></div>
          ))}
          <p className="text-sm text-ink-muted sm:col-span-2 lg:col-span-4">Live numbers appear once Hustly is connected to its Supabase database and the first admin account is created through the secure bootstrap process.</p>
        </div>
      )}
      {tab === "verification" && (
        <div className="mt-6 space-y-4">
          {queue.length === 0 ? (
            <div className="rounded-2xl border border-line bg-white p-6 shadow-card"><p className="font-semibold text-ink">No pending verifications</p><p className="mt-1 text-sm text-ink-muted">New student ID + selfie submissions will appear here. Open each one to view the private images via a short-lived signed URL, compare the face with the ID, then approve, reject, or ask for a resubmission with a reason.</p></div>
          ) : queue.map((q) => (
            <article key={q.id} className="rounded-2xl border border-line bg-white p-5 shadow-card">
              <p className="font-semibold text-ink">{q.name}</p>
              <p className="text-sm text-ink-muted">{q.university} · submitted {q.submitted} · {q.status}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => decide(q.id, "approved")} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">Approve</button>
                <button onClick={() => decide(q.id, "rejected")} className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium">Reject with reason</button>
                <button onClick={() => decide(q.id, "resubmission_requested")} className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium">Request resubmission</button>
              </div>
            </article>
          ))}
        </div>
      )}
      {tab === "reports" && <div className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-card"><p className="font-semibold text-ink">No reports awaiting action</p><p className="mt-1 text-sm text-ink-muted">Reports from listings, profiles and chats arrive here with their context, the reporter, and any earlier reports or strikes on the account.</p></div>}
      {tab === "users" && <div className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-card"><p className="font-semibold text-ink">User management</p><p className="mt-1 text-sm text-ink-muted">Search users by safe identifiers, inspect public profile and status, issue a warning or strike, suspend or restore an account. Every action is written to the audit log.</p></div>}
      {tab === "listings" && <div className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-card"><p className="font-semibold text-ink">Listing moderation</p><p className="mt-1 text-sm text-ink-muted">Review, hide, restore or remove listings, with the reason recorded.</p></div>}
      {tab === "settings" && (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <h2 className="font-semibold text-ink">Categories</h2>
            <p className="mt-1 text-sm text-ink-muted">{CATEGORIES.map((c) => c.name).join(" · ")}</p>
          </div>
          <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <h2 className="font-semibold text-ink">AI features</h2>
            <label className="mt-2 flex items-center gap-3 text-sm text-ink"><input type="checkbox" checked={aiOn} onChange={(e) => setAiOn(e.target.checked)} className="h-5 w-5 accent-[#10B981]" /> Enable Groq assistance (listing help, FAQ, report summaries)</label>
            <p className="mt-2 text-sm text-ink-muted">AI never approves identity, bans users, or decides job and review states. Those are human and rule-based decisions.</p>
          </div>
        </div>
      )}
      {tab === "audit" && <div className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-card"><p className="font-semibold text-ink">Audit log</p><p className="mt-1 text-sm text-ink-muted">Admin actions — who did what, to whom, when, and why — are recorded here once the database is connected.</p></div>}
    </div>
  );
}
