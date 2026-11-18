"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoCombo } from "@/components/ui";
import { getBrowserSupabase, isSupabaseConfigured } from "@/lib/supabase";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      if (!isSupabaseConfigured()) { setError("Sign-in is not connected yet. The owner needs to add the Supabase credentials in the deployment settings."); return; }
      const { error: err } = await getBrowserSupabase()!.auth.signInWithPassword({ email, password });
      if (err) throw err;
      router.push("/marketplace");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not sign you in. Check your email and password."); }
    finally { setLoading(false); }
  }
  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6">
      <div className="flex justify-center"><LogoCombo className="w-48" /></div>
      <h1 className="mt-6 text-2xl font-bold text-ink">Welcome back</h1>
      <p className="mt-2 text-sm text-ink-muted">Sign in with your email and password.</p>
      <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-line bg-white p-6 shadow-card">
        <label className="block text-sm font-medium text-ink">Email address<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2.5" placeholder="you@student.edu" /></label>
        <label className="block text-sm font-medium text-ink">Password<input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2.5" placeholder="Your password" /></label>
        {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p> : null}
        <button disabled={loading} className="w-full rounded-xl bg-brand px-4 py-3 font-medium text-white hover:bg-brand-hover disabled:opacity-50">{loading ? "Signing you in…" : "Sign in"}</button>
        <p className="text-center text-sm"><Link href="/auth/reset">Forgot your password?</Link></p>
      </form>
      <p className="mt-4 text-center text-sm text-ink-muted">New to Hustly? <Link href="/auth/signup" className="font-medium">Create an account</Link></p>
    </div>
  );
}
