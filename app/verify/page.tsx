"use client";
import { useState } from "react";
import { UNIVERSITIES } from "@/lib/data";

const STATUSES = ["pending_manual_review", "approved", "rejected", "resubmission_requested"] as const;

export default function VerifyStudentPage() {
  const [form, setForm] = useState({ university: UNIVERSITIES[0], faculty: "", department: "", level: "100 Level", fullName: "" });
  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [triage, setTriage] = useState("");
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      if (!idFile || !selfieFile) { setError("Please attach both your student ID card and a fresh selfie."); return; }
      // Text-only Groq triage: consistency of the TYPED fields only. No images are
      // ever sent to Groq, Groq never compares faces and never approves or rejects.
      const triageRes = await fetch("/api/ai/assist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "verification_triage", text: `Name: ${form.fullName}. University: ${form.university}. Faculty: ${form.faculty}. Department: ${form.department}. Level: ${form.level}.` }) });
      const triageJson = await triageRes.json();
      if (triageJson.text) setTriage(triageJson.text);

      const fd = new FormData();
      fd.append("fullName", form.fullName); fd.append("university", form.university);
      fd.append("faculty", form.faculty); fd.append("department", form.department); fd.append("level", form.level);
      fd.append("idCard", idFile); fd.append("selfie", selfieFile);
      const res = await fetch("/api/verify", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) { setError(j.error || "Could not submit your verification. Please try again."); return; }
      setStatus(j.status || "pending_manual_review");
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong."); }
    finally { setLoading(false); }
  }

  if (status) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-line bg-white p-8 text-center shadow-card">
          <h1 className="text-2xl font-bold text-ink">Verification submitted</h1>
          <p className="mt-3 text-base leading-relaxed text-ink-soft">
            Your submission is <strong>pending manual review</strong>. A human admin will check your ID card and selfie
            and decide within 24 hours. You will be notified of the decision.
          </p>
          {triage ? <p className="mt-4 rounded-lg bg-wash px-3 py-2 text-left text-sm text-ink-soft"><strong>Checklist for the admin:</strong> {triage}</p> : null}
          <p className="mt-4 text-sm text-ink-muted">Your ID image and selfie are stored privately and are never shown on your profile, listings or chats.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-ink">Verify as a student</h1>
      <p className="mt-3 text-base leading-relaxed text-ink-soft">
        Upload a clear photo of your current student ID card and a fresh selfie. A human admin compares them —
        no automated face matching is used, and no identity image is ever sent to an AI service.
        Your documents are stored privately for safety and audit, and are never shown publicly.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-5 rounded-2xl border border-line bg-white p-6 shadow-card">
        <label className="block text-sm font-medium text-ink">Full name (as on your ID)<input required value={form.fullName} onChange={(e) => set("fullName", e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2.5" placeholder="Your full name" /></label>
        <label className="block text-sm font-medium text-ink">University<select value={form.university} onChange={(e) => set("university", e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2.5">{UNIVERSITIES.map((u) => <option key={u}>{u}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-ink">Faculty<input required value={form.faculty} onChange={(e) => set("faculty", e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2.5" /></label>
          <label className="block text-sm font-medium text-ink">Department<input required value={form.department} onChange={(e) => set("department", e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2.5" /></label>
        </div>
        <label className="block text-sm font-medium text-ink">Academic level<select value={form.level} onChange={(e) => set("level", e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2.5">{["100 Level", "200 Level", "300 Level", "400 Level", "500 Level", "Postgraduate"].map((l) => <option key={l}>{l}</option>)}</select></label>
        <label className="block text-sm font-medium text-ink">Student ID card photo<input required type="file" accept="image/*" onChange={(e) => setIdFile(e.target.files?.[0] || null)} className="mt-1 w-full rounded-lg border border-line px-3 py-2.5" /><span className="mt-1 block text-xs font-normal text-ink-muted">Clear, genuine, unaltered photo. Blurry, expired or mismatched cards are rejected and you can resubmit.</span></label>
        <label className="block text-sm font-medium text-ink">Fresh selfie<input required type="file" accept="image/*" onChange={(e) => setSelfieFile(e.target.files?.[0] || null)} className="mt-1 w-full rounded-lg border border-line px-3 py-2.5" /><span className="mt-1 block text-xs font-normal text-ink-muted">A clear photo of your face, taken now, in good light.</span></label>
        {triage ? <p className="rounded-lg bg-wash px-3 py-2 text-sm text-ink-soft">{triage}</p> : null}
        {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p> : null}
        <button disabled={loading} className="w-full rounded-xl bg-brand px-4 py-3 font-medium text-white hover:bg-brand-hover disabled:opacity-50">{loading ? "Submitting…" : "Submit for review"}</button>
        <p className="text-xs leading-relaxed text-ink-muted">NIN is not required for Hustly. We do not claim government verification or guaranteed fraud prevention.</p>
      </form>
    </div>
  );
}
