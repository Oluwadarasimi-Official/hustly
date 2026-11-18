"use client";
import { useState } from "react";
import Link from "next/link";
import { LogoCombo } from "@/components/ui";
import { getBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase";

export default function ResetPage() {
  const [email, setEmail] = useState(""); const [msg, setMsg] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setMsg(""); setLoading(true);
    try {
      if (!isSupabaseConfigured()) { setError("Password reset is not connected yet. The owner needs to add the Supabase credentials in the deployment settings."); return; }
      const { error: err } = await getBrowserSupabase()!.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth/signin` });
      if (err) throw err;
      setMsg("If an account exists for that email, a password reset link is on its way.");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not send the reset link."); }
    finally { setLoading(false); }
  }
  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6">
      <div className="flex justify-center"><LogoCombo className="w-48" /></div>
      <h1 className="mt-6 text-2xl font-bold text-ink">Reset your password</h1>
      <p className="mt-2 text-sm text-ink-muted">Enter the email you signed up with and we will send you a reset link.</p>
      <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-line bg-white p-6 shadow-card">
        <label className="block text-sm font-medium text-ink">Email address<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2.5" placeholder="you@student.edu" /></label>
        {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p> : null}
        {msg ? <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-text" role="status">{msg}</p> : null}
        <button disabled={loading} className="w-full rounded-xl bg-brand px-4 py-3 font-medium text-white hover:bg-brand-hover disabled:opacity-50">{loading ? "Sending…" : "Send reset link"}</button>
      </form>
      <p className="mt-4 text-center text-sm text-ink-muted"><Link href="/auth/signin" className="font-medium">Back to sign in</Link></p>
    </div>
  );
}
