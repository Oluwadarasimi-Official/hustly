"use client";
import { useState } from "react";
import Link from "next/link";
import { UNIVERSITIES } from "@/lib/data";

export default function EditProfilePage() {
  const [form, setForm] = useState({ displayName: "", bio: "", university: UNIVERSITIES[0], faculty: "", department: "", level: "100 Level", role: "both" });
  const [msg, setMsg] = useState(""); const [error, setError] = useState("");
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  function submit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    localStorage.setItem("hustly_profile", JSON.stringify(form));
    setMsg("Profile saved on this device. Once you are signed in with Supabase, your profile is saved to your account.");
  }
  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-ink">Edit profile</h1>
      <p className="mt-2 text-sm text-ink-muted">Only your display name, photo, bio, university and listings are public. Email, phone and hostel address stay private.</p>
      <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-line bg-white p-6 shadow-card">
        <label className="block text-sm font-medium text-ink">Display name<input required value={form.displayName} onChange={(e) => set("displayName", e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2.5" /></label>
        <label className="block text-sm font-medium text-ink">Short bio<textarea rows={3} maxLength={300} value={form.bio} onChange={(e) => set("bio", e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2.5" placeholder="What do you do, and what are you good at?" /></label>
        <label className="block text-sm font-medium text-ink">University<select value={form.university} onChange={(e) => set("university", e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2.5">{UNIVERSITIES.map((u) => <option key={u}>{u}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-ink">Faculty<input value={form.faculty} onChange={(e) => set("faculty", e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2.5" /></label>
          <label className="block text-sm font-medium text-ink">Department<input value={form.department} onChange={(e) => set("department", e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2.5" /></label>
        </div>
        <label className="block text-sm font-medium text-ink">I want to<select value={form.role} onChange={(e) => set("role", e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2.5"><option value="buyer">Find services (buyer)</option><option value="seller">Offer services (seller)</option><option value="both">Both — buy and sell</option></select></label>
        {msg ? <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-text" role="status">{msg}</p> : null}
        <button className="w-full rounded-xl bg-brand px-4 py-3 font-medium text-white hover:bg-brand-hover">Save profile</button>
        <p className="text-center text-sm"><Link href="/marketplace">Back to marketplace</Link></p>
      </form>
    </div>
  );
}
