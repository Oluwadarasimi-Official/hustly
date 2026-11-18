"use client";
import { useEffect, useState } from "react";
import { CATEGORIES } from "@/lib/data";
import { PasswordField } from "@/components/password-field";

type QueueItem = { id: string; name: string; email: string; university: string; faculty: string; department: string; level: string; submitted: string; status: string };
type PreviewItem = QueueItem & { reviewed_at: string | null; decision_reason: string | null; review_due_at: string | null; idCardUrl: string | null; selfieUrl: string | null };

// Human-readable submitted time, e.g. "18 Nov 2026, 08:04 WAT" — never the
// raw ISO timestamp. Africa/Lagos is WAT year-round (no daylight saving).
function formatSubmitted(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Lagos" }).format(d);
  const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Africa/Lagos" }).format(d);
  return `${date}, ${time} WAT`;
}

const STATUS_LABELS: Record<string, string> = {
  pending_manual_review: "Pending review",
  resubmission_requested: "Resubmission requested",
  approved: "Approved",
  rejected: "Rejected",
};

export default function AdminPage() {
  const [tab, setTab] = useState<"overview" | "verification" | "reports" | "users" | "listings" | "settings" | "audit">("overview");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [msg, setMsg] = useState(""); const [error, setError] = useState("");
  const [aiOn, setAiOn] = useState(true);
  // Admin password gate: /admin shows the password bar first. The dashboard
  // only renders after the server confirms the session cookie.
  const [auth, setAuth] = useState<"checking" | "locked" | "not-configured" | "authed">("checking");
  const [pw, setPw] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  // Preview modal: one submission at a time, with its ID card + selfie.
  const [preview, setPreview] = useState<PreviewItem | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [previewReason, setPreviewReason] = useState("");
  useEffect(() => {
    fetch("/api/admin/auth").then((r) => r.json()).then((j) => {
      if (j.configured === false) setAuth("not-configured");
      else if (j.authed) setAuth("authed");
      else setAuth("locked");
    }).catch(() => setAuth("locked"));
  }, []);
  useEffect(() => {
    if (auth !== "authed") return;
    fetch("/api/admin/queue").then((r) => r.json()).then((j) => { if (Array.isArray(j.items)) setQueue(j.items); }).catch(() => {});
  }, [auth]);
  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(""); setAuthBusy(true);
    try {
      const res = await fetch("/api/admin/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
      const j = await res.json();
      if (!res.ok) { setAuthError(j.error || "Wrong password. Try again."); setPw(""); return; }
      setPw("");
      setAuth("authed");
    } catch { setAuthError("Could not check the password. Please try again."); }
    finally { setAuthBusy(false); }
  }
  async function signOut() {
    await fetch("/api/admin/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ logout: true }) }).catch(() => {});
    setAuth("locked"); setQueue([]); setPw("");
  }
  if (auth === "checking") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-line bg-white p-8 text-center shadow-card">
          <p className="text-base text-ink-soft">Checking admin sign-in…</p>
        </div>
      </div>
    );
  }
  if (auth === "not-configured") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-line bg-white p-8 shadow-card">
          <img src="/logo.jpg" alt="Hustly — Your Campus. Your Hustle." className="mx-auto h-auto w-56" />
          <h1 className="mt-6 text-center text-2xl font-bold text-ink">Admin sign-in</h1>
          <p className="mt-3 text-center text-base leading-relaxed text-ink-soft">The admin password is not configured yet. The owner needs to set the ADMIN_PASSWORD in the deployment settings, then this page will ask for it.</p>
        </div>
      </div>
    );
  }
  if (auth === "locked") {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-line bg-white p-8 shadow-card">
          <img src="/logo.jpg" alt="Hustly — Your Campus. Your Hustle." className="mx-auto h-auto w-56" />
          <h1 className="mt-6 text-center text-2xl font-bold text-ink">Admin sign-in</h1>
          <p className="mt-2 text-center text-base leading-relaxed text-ink-soft">Enter the admin password to open the Hustly admin dashboard.</p>
          <form onSubmit={submitPassword} className="mt-6 space-y-4">
            <div>
              <label htmlFor="admin-password" className="block text-sm font-medium text-ink">Admin password</label>
              <PasswordField
                id="admin-password"
                autoComplete="current-password"
                value={pw}
                onChange={setPw}
                placeholder="Enter admin password"
                className="mt-1 w-full rounded-lg border border-line bg-white px-4 py-3 text-base text-ink placeholder:text-ink-muted"
                autoFocus
              />
            </div>
            {authError ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{authError}</p> : null}
            <button type="submit" disabled={authBusy || !pw} className="w-full rounded-lg bg-brand px-4 py-3 text-base font-semibold text-white disabled:opacity-50">
              {authBusy ? "Checking…" : "Open admin dashboard"}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-ink-muted">Admins only. Every action is checked server-side and written to the audit log.</p>
        </div>
      </div>
    );
  }
  async function decide(id: string, decision: "approved" | "rejected" | "resubmission_requested", reason?: string) {
    setError(""); setMsg("");
    const defaultReason = decision === "approved" ? "ID and selfie checked by admin." : "Please resubmit a clearer photo.";
    const res = await fetch("/api/verify", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, decision, reason: reason?.trim() || defaultReason }) });
    const j = await res.json();
    if (!res.ok) { setError(j.error || "Admin action needs a connected database and an admin account."); return; }
    setQueue(queue.filter((q) => q.id !== id));
    setPreview(null); setPreviewReason("");
    setMsg(`Verification ${decision.replace("_", " ")}. The decision was recorded in the audit log.`);
  }
  async function openPreview(id: string) {
    setPreviewError(""); setPreviewReason(""); setPreviewLoading(true);
    try {
      const res = await fetch(`/api/admin/verification/${id}`);
      const j = await res.json();
      if (!res.ok || !j.item) { setPreviewError(j.error || "Could not load the submission preview."); setPreviewLoading(false); return; }
      setPreview(j.item as PreviewItem);
    } catch { setPreviewError("Could not load the submission preview. Please try again."); }
    finally { setPreviewLoading(false); }
  }
  const tabs = [["overview", "Overview"], ["verification", "Verification queue"], ["reports", "Reports"], ["users", "Users"], ["listings", "Listings"], ["settings", "Settings"], ["audit", "Audit log"]] as const;
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-3xl font-bold text-ink">Admin dashboard</h1>
        <button onClick={signOut} className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-ink-soft">Sign out</button>
      </div>
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
              <p className="text-lg font-semibold text-ink">{q.name}</p>
              {q.email ? <p className="text-sm text-ink-muted">{q.email}</p> : null}
              <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                <div><dt className="text-ink-muted">University</dt><dd className="font-medium text-ink">{q.university || "—"}</dd></div>
                <div><dt className="text-ink-muted">Faculty</dt><dd className="font-medium text-ink">{q.faculty || "—"}</dd></div>
                <div><dt className="text-ink-muted">Department</dt><dd className="font-medium text-ink">{q.department || "—"}</dd></div>
                <div><dt className="text-ink-muted">Level</dt><dd className="font-medium text-ink">{q.level || "—"}</dd></div>
                <div><dt className="text-ink-muted">Submitted</dt><dd className="font-medium text-ink">{formatSubmitted(q.submitted)}</dd></div>
                <div><dt className="text-ink-muted">Status</dt><dd className="font-medium text-ink">{STATUS_LABELS[q.status] || q.status}</dd></div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => openPreview(q.id)} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">Preview</button>
                <button onClick={() => decide(q.id, "approved")} className="rounded-lg border border-brand bg-brand-soft px-4 py-2 text-sm font-medium text-brand-text">Approve</button>
                <button onClick={() => decide(q.id, "rejected")} className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium">Reject with reason</button>
                <button onClick={() => decide(q.id, "resubmission_requested")} className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium">Request resubmission</button>
              </div>
              {previewLoading && !preview ? <p className="mt-3 text-sm text-ink-muted">Loading preview…</p> : null}
              {previewError && !preview ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{previewError}</p> : null}
            </article>
          ))}
        </div>
      )}
      {/* Preview modal: full submission — every typed field plus the ID card
          and selfie photos, so the admin can compare face vs ID before
          deciding. Photos are short-lived signed URLs (10 min), issued only
          to this admin session. Tap a photo to view it full size. */}
      {preview ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 px-3 py-6" role="dialog" aria-modal="true" aria-label={`Preview verification for ${preview.name}`} onClick={() => setPreview(null)}>
          <div className="mx-auto w-full max-w-2xl rounded-2xl bg-white p-5 shadow-card sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-ink">{preview.name}</h2>
                <p className="mt-1 text-sm text-ink-muted">Submitted {formatSubmitted(preview.submitted)} · {STATUS_LABELS[preview.status] || preview.status}</p>
              </div>
              <button onClick={() => setPreview(null)} aria-label="Close preview" className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium text-ink-soft">Close</button>
            </div>
            <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div><dt className="text-ink-muted">Email</dt><dd className="font-medium break-words text-ink">{preview.email || "—"}</dd></div>
              <div><dt className="text-ink-muted">University</dt><dd className="font-medium text-ink">{preview.university || "—"}</dd></div>
              <div><dt className="text-ink-muted">Faculty</dt><dd className="font-medium text-ink">{preview.faculty || "—"}</dd></div>
              <div><dt className="text-ink-muted">Department</dt><dd className="font-medium text-ink">{preview.department || "—"}</dd></div>
              <div><dt className="text-ink-muted">Level</dt><dd className="font-medium text-ink">{preview.level || "—"}</dd></div>
              <div><dt className="text-ink-muted">Status</dt><dd className="font-medium text-ink">{STATUS_LABELS[preview.status] || preview.status}</dd></div>
              <div><dt className="text-ink-muted">Review due by</dt><dd className="font-medium text-ink">{preview.review_due_at ? formatSubmitted(preview.review_due_at) : "—"}</dd></div>
              {preview.reviewed_at ? <div><dt className="text-ink-muted">Reviewed</dt><dd className="font-medium text-ink">{formatSubmitted(preview.reviewed_at)}</dd></div> : null}
              {preview.decision_reason ? <div className="sm:col-span-2"><dt className="text-ink-muted">Decision reason</dt><dd className="font-medium text-ink">{preview.decision_reason}</dd></div> : null}
            </dl>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <figure>
                <figcaption className="mb-2 text-sm font-semibold text-ink">Student ID card</figcaption>
                {preview.idCardUrl ? (
                  <a href={preview.idCardUrl} target="_blank" rel="noreferrer" title="Tap to view full size">
                    <img src={preview.idCardUrl} alt="Student ID card photo" className="w-full rounded-xl border border-line object-contain" />
                  </a>
                ) : <p className="rounded-xl border border-line bg-wash px-3 py-6 text-center text-sm text-ink-muted">ID card photo could not be loaded.</p>}
                <p className="mt-1 text-xs text-ink-muted">Tap the photo to view it full size.</p>
              </figure>
              <figure>
                <figcaption className="mb-2 text-sm font-semibold text-ink">Selfie</figcaption>
                {preview.selfieUrl ? (
                  <a href={preview.selfieUrl} target="_blank" rel="noreferrer" title="Tap to view full size">
                    <img src={preview.selfieUrl} alt="Student selfie photo" className="w-full rounded-xl border border-line object-contain" />
                  </a>
                ) : <p className="rounded-xl border border-line bg-wash px-3 py-6 text-center text-sm text-ink-muted">Selfie could not be loaded.</p>}
                <p className="mt-1 text-xs text-ink-muted">Tap the photo to view it full size.</p>
              </figure>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">Compare the face in the selfie with the photo and name on the ID card. Decide as a human — AI never approves or rejects identity.</p>
            <label className="mt-4 block text-sm font-medium text-ink">Reason (for Reject or Request resubmission)
              <input value={previewReason} onChange={(e) => setPreviewReason(e.target.value)} placeholder="e.g. ID photo is blurry — please resubmit a clearer one" className="mt-1 w-full rounded-lg border border-line px-3 py-2.5 text-base font-normal" />
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => decide(preview.id, "approved")} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">Approve</button>
              <button onClick={() => decide(preview.id, "rejected", previewReason)} className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium">Reject with reason</button>
              <button onClick={() => decide(preview.id, "resubmission_requested", previewReason)} className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium">Request resubmission</button>
            </div>
          </div>
        </div>
      ) : null}
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
