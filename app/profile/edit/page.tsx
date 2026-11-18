"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getAccessToken } from "@/lib/client-auth";
import { getBrowserSupabase } from "@/lib/supabase";
import { VerifiedBadge } from "@/components/ui";

// DAVID'S RULE — ONE EDIT, EVER: a profile may be edited exactly once.
// The only things that edit may change are the NAME and the PROFILE
// PICTURE. University and all verification details (university, faculty,
// department, level, ID card, selfie) can NEVER be changed here, and
// after the one edit is saved the form locks for good.
export default function EditProfilePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [myId, setMyId] = useState("");
  const [name, setName] = useState("");
  const [university, setUniversity] = useState("");
  const [verified, setVerified] = useState(false);
  const [editUsed, setEditUsed] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState("");
  const [picture, setPicture] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      if (!token) { setSignedIn(false); setLoading(false); return; }
      setSignedIn(true);
      try {
        const { data } = await getBrowserSupabase()!.auth.getSession();
        setMyId(data.session?.user?.id || "");
      } catch { /* session id is best-effort; the token is what the server checks */ }
      try {
        const res = await fetch("/api/profiles/me", { headers: { Authorization: `Bearer ${token}` } });
        const j = await res.json();
        if (res.ok && j.profile) {
          setName(String(j.profile.displayName || ""));
          setUniversity(String(j.profile.university || ""));
          setVerified(Boolean(j.profile.verified));
          setEditUsed(Boolean(j.profile.editUsed));
          setCurrentAvatar(String(j.profile.avatarUrl || ""));
        } else {
          setError(String(j.error || "Could not load your profile. Please try again."));
        }
      } catch {
        setError("Could not load your profile. Please check your connection and try again.");
      }
      setLoading(false);
    })();
  }, []);

  function pickPicture(file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Your profile picture must be a JPG, PNG or WebP image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Your profile picture must be 2MB or smaller.");
      return;
    }
    setError("");
    setPicture(file);
    setPreview(URL.createObjectURL(file));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setMsg(""); setSaving(true);
    try {
      const token = await getAccessToken();
      if (!token) { setError("You are not signed in. Please sign in and try again."); setSaving(false); return; }
      const form = new FormData();
      form.append("displayName", name.trim());
      if (picture) form.append("picture", picture);
      const res = await fetch("/api/profiles/me", { method: "PATCH", headers: { Authorization: `Bearer ${token}` }, body: form });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        if (j.editUsed) setEditUsed(true);
        setError(String(j.error || "Could not save your profile. Please try again."));
      } else {
        setEditUsed(true);
        setMsg("Profile saved. Your one edit is now used — your profile is locked from here.");
        setTimeout(() => router.push(myId ? `/profile/${encodeURIComponent(myId)}` : "/marketplace"), 900);
      }
    } catch {
      setError("Could not save your profile. Please check your connection and try again.");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold text-ink">Edit profile</h1>
        <p className="mt-2 text-sm text-ink-muted">Loading your profile…</p>
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold text-ink">Edit profile</h1>
        <p className="mt-2 text-sm text-ink-muted">You need to sign in first to edit your profile.</p>
        <p className="mt-4"><Link href="/auth/signin" className="rounded-xl bg-brand px-5 py-3 font-medium text-white">Sign in</Link></p>
      </div>
    );
  }

  // The one edit has already been used — locked, server-enforced too.
  if (editUsed) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold text-ink">Edit profile</h1>
        <div className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-card">
          <p className="text-sm font-medium text-ink">You have already used your one profile edit.</p>
          <p className="mt-2 text-sm text-ink-muted">Your profile can only be edited once — name and profile picture. Your university and verification details can never be changed here.</p>
          <p className="mt-4"><Link href={myId ? `/profile/${encodeURIComponent(myId)}` : "/marketplace"} className="rounded-xl bg-brand px-5 py-3 font-medium text-white">View my profile</Link></p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-ink">Edit profile</h1>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
        You can edit your profile <strong className="text-ink">once only</strong> — your name and profile picture. After you save, it is locked.
        {verified ? <VerifiedBadge /> : null}
      </p>
      <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-line bg-white p-6 shadow-card">
        <label className="block text-sm font-medium text-ink">Name<input required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2.5" /></label>
        <div>
          <span className="block text-sm font-medium text-ink">Profile picture</span>
          <div className="mt-2 flex items-center gap-4">
            {preview || currentAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview || currentAvatar} alt="Profile picture preview" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-2xl font-bold text-brand-text">{(name || "H").trim().charAt(0).toUpperCase()}</div>
            )}
            <button type="button" onClick={() => fileRef.current?.click()} className="rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink">Choose a picture</button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pickPicture(e.target.files?.[0])} />
          </div>
          <p className="mt-1 text-xs text-ink-muted">JPG, PNG or WebP, 2MB or smaller. Leave it empty to keep your current picture.</p>
        </div>
        <div>
          <span className="block text-sm font-medium text-ink">University</span>
          <p className="mt-1 w-full rounded-lg border border-line bg-wash px-3 py-2.5 text-sm text-ink-soft">{university || "Not set yet"}</p>
          <p className="mt-1 text-xs text-ink-muted">Your university and verification details can never be changed here.</p>
        </div>
        {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p> : null}
        {msg ? <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-text" role="status">{msg}</p> : null}
        <button disabled={saving} className="w-full rounded-xl bg-brand px-4 py-3 font-medium text-white hover:bg-brand-hover disabled:opacity-60">{saving ? "Saving…" : "Save — this uses your one edit"}</button>
        <p className="text-center text-sm"><Link href={myId ? `/profile/${encodeURIComponent(myId)}` : "/marketplace"}>Back to my profile</Link></p>
      </form>
    </div>
  );
}
