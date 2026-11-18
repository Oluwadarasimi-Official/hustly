"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LogoCombo } from "@/components/ui";

function VerifyForm() {
  const params = useSearchParams(); const router = useRouter();
  const [email, setEmail] = useState(params.get("email") || "");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState(""); const [error, setError] = useState("");
  const [loading, setLoading] = useState(false); const [sending, setSending] = useState(false);

  async function resend() {
    setError(""); setMsg(""); setSending(true);
    const res = await fetch("/api/auth/otp/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const j = await res.json(); setSending(false);
    if (!res.ok) setError(j.error || "Could not send the code."); else setMsg("A new code was sent to your email. It expires in 10 minutes.");
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setMsg(""); setLoading(true);
    const res = await fetch("/api/auth/otp/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code }) });
    const j = await res.json(); setLoading(false);
    if (!res.ok) { setError(j.error || "That code did not work. Check it and try again."); return; }
    setMsg("Email verified. Now complete your student verification.");
    setTimeout(() => router.push("/verify"), 1200);
  }
  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6">
      <div className="flex justify-center"><LogoCombo className="w-48" /></div>
      <h1 className="mt-6 text-2xl font-bold text-ink">Verify your email</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">We sent a 6-digit code to your email. It expires in 10 minutes and can only be used once. Never share it with anyone.</p>
      <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-line bg-white p-6 shadow-card">
        <label className="block text-sm font-medium text-ink">Email address<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2.5" /></label>
        <label className="block text-sm font-medium text-ink">Verification code<input required inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="mt-1 w-full rounded-lg border border-line px-3 py-2.5 tracking-[0.3em]" placeholder="123456" /></label>
        {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p> : null}
        {msg ? <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-text" role="status">{msg}</p> : null}
        <button disabled={loading} className="w-full rounded-xl bg-brand px-4 py-3 font-medium text-white hover:bg-brand-hover disabled:opacity-50">{loading ? "Checking…" : "Verify email"}</button>
        <button type="button" onClick={resend} disabled={sending || !email} className="w-full rounded-xl border border-line bg-white px-4 py-3 font-medium text-ink disabled:opacity-50">{sending ? "Sending…" : "Resend code"}</button>
      </form>
      <p className="mt-4 text-center text-sm text-ink-muted">No code in your inbox? Check spam, then resend. <Link href="/auth/signup" className="font-medium">Back to sign-up</Link></p>
    </div>
  );
}
export default function VerifyPage() { return <Suspense><VerifyForm /></Suspense>; }
