"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UNIVERSITIES } from "@/lib/data";
import { LogoCombo } from "@/components/ui";
import { PasswordField } from "@/components/password-field";
import { getBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase";

export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: "", displayName: "", email: "", password: "", university: UNIVERSITIES[0], faculty: "", department: "", level: "100 Level" });
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      if (!isSupabaseConfigured()) { setError("Sign-up is not connected yet. The owner needs to add the Supabase credentials in the deployment settings."); return; }
      const supabase = getBrowserSupabase()!;
      const { data, error: err } = await supabase.auth.signUp({ email: form.email, password: form.password, options: { data: { full_name: form.fullName, display_name: form.displayName, university: form.university, faculty: form.faculty, department: form.department, academic_level: form.level } } });
      if (err) throw err;
      const res = await fetch("/api/auth/otp/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.email, userId: data.user?.id }) });
      const j = await res.json();
      if (!res.ok) { setError(j.error || "Account created, but we could not send the verification code. Try again from the verification page."); return; }
      router.push(`/auth/verify?email=${encodeURIComponent(form.email)}`);
    } catch (err) { setError(err instanceof Error ? err.message : "Something went wrong. Please try again."); }
    finally { setLoading(false); }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6">
      <div className="flex justify-center"><LogoCombo className="w-48" /></div>
      <h1 className="mt-6 text-2xl font-bold text-ink">Create your account</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">No phone number is needed. We verify you by email, then as a student.</p>
      <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-line bg-white p-6 shadow-card">
        <label className="block text-sm font-medium text-ink">Full name<input required value={form.fullName} onChange={(e) => set("fullName", e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2.5" placeholder="Your full name" /></label>
        <label className="block text-sm font-medium text-ink">Display name<input required value={form.displayName} onChange={(e) => set("displayName", e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2.5" placeholder="How other students will see you" /></label>
        <label className="block text-sm font-medium text-ink">Email address<input required type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2.5" placeholder="you@student.edu" /></label>
        <label className="block text-sm font-medium text-ink">Password<PasswordField required minLength={8} value={form.password} onChange={(v) => set("password", v)} autoComplete="new-password" className="mt-1 w-full rounded-lg border border-line px-3 py-2.5" placeholder="At least 8 characters" /></label>
        <label className="block text-sm font-medium text-ink">University<select value={form.university} onChange={(e) => set("university", e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2.5">{UNIVERSITIES.map((u) => <option key={u}>{u}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-ink">Faculty<input required value={form.faculty} onChange={(e) => set("faculty", e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2.5" placeholder="e.g. Science" /></label>
          <label className="block text-sm font-medium text-ink">Department<input required value={form.department} onChange={(e) => set("department", e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2.5" placeholder="e.g. Computer Science" /></label>
        </div>
        <label className="block text-sm font-medium text-ink">Academic level<select value={form.level} onChange={(e) => set("level", e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2.5">{["100 Level", "200 Level", "300 Level", "400 Level", "500 Level", "Postgraduate"].map((l) => <option key={l}>{l}</option>)}</select></label>
        <p className="text-xs leading-relaxed text-ink-muted">By signing up you agree to student verification: we collect your university details, student ID card and a selfie so an admin can confirm you are a current student. These are kept private and are never shown publicly.</p>
        {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p> : null}
        <button disabled={loading} className="w-full rounded-xl bg-brand px-4 py-3 font-medium text-white hover:bg-brand-hover disabled:opacity-50">{loading ? "Creating your account…" : "Create account"}</button>
      </form>
      <p className="mt-4 text-center text-sm text-ink-muted">Already have an account? <Link href="/auth/signin" className="font-medium">Sign in</Link></p>
    </div>
  );
}
