"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { naira, type Listing } from "@/lib/utils";
import { getAccessToken } from "@/lib/client-auth";
import { getBrowserSupabase } from "@/lib/supabase";
import { EmptyState, VerifiedBadge } from "@/components/ui";

type Profile = {
  id: string; name: string; university: string; faculty: string; department: string;
  level: string; bio: string; avatarUrl: string; verified: boolean;
  reviews: { rating: number; comment: string; created: string; reviewer: string; reviewerVerified: boolean }[];
};

export default function ProfilePage() {
  const params = useParams(); const id = decodeURIComponent(String(params.id));
  const [listings, setListings] = useState<Listing[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [crossUniversity, setCrossUniversity] = useState(false);
  const [reported, setReported] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  // Whether the one-time profile edit is already used (own profile only).
  // null = unknown yet — the "add a picture" prompt waits for this, so it
  // never points at the edit page after the edit is already spent.
  const [editUsed, setEditUsed] = useState<boolean | null>(null);
  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      // Who is signed in — so your OWN profile can say so and offer Edit.
      let sessionId: string | null = null;
      try {
        const { data } = await getBrowserSupabase()!.auth.getSession();
        sessionId = data.session?.user?.id || null;
        setMyId(sessionId);
      } catch { setMyId(null); }
      // Own profile only: has the one-time edit been used? Needed to know
      // whether to offer "Add your profile picture" (only when unused).
      if (token && sessionId && sessionId === id) {
        try {
          const meRes = await fetch("/api/profiles/me", { headers: { Authorization: `Bearer ${token}` } });
          const meJson = await meRes.json();
          if (meRes.ok && meJson.profile) setEditUsed(Boolean(meJson.profile.editUsed));
        } catch { /* prompt stays hidden on error — never a dead end */ }
      }
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      try {
        const res = await fetch(`/api/profiles/${encodeURIComponent(id)}`, { headers });
        const j = await res.json();
        if (j.crossUniversity) { setCrossUniversity(true); setProfile(null); return; }
        setProfile((j.profile || null) as Profile | null);
      } catch { setProfile(null); }
      if (!token) return; // listings are university-filtered on the server
      try {
        const res = await fetch("/api/listings", { headers: { Authorization: `Bearer ${token}` } });
        const j = await res.json();
        if (!res.ok) return;
        const rows = ((j.listings || []) as Record<string, unknown>[])
          .filter((row) => String(row.seller_id || "") === id)
          .map((row) => {
            const cat = row.hustly_categories as { name?: string } | null;
            const uni = row.hustly_universities as { name?: string } | null;
            return {
              id: String(row.id), title: String(row.title || ""), category: cat?.name || "Other",
              description: String(row.description || ""), priceMin: Number(row.price_min || 0),
              priceMax: row.price_max == null ? null : Number(row.price_max), university: uni?.name || "",
              seller: String(row.seller_id || ""), verified: Boolean(row.seller_verified), delivery: String(row.delivery_estimate || ""),
            } as Listing;
          });
        setListings(rows);
      } catch { setListings([]); }
    })();
  }, [id]);
  async function report() {
    await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetName: profile?.name || id, reason: "other", details: "Reported from public profile." }) });
    setReported(true);
  }
  const initial = (profile?.name || "H").trim().charAt(0).toUpperCase() || "H";
  if (crossUniversity) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <EmptyState title="Not available at your university" body="This profile belongs to a student at another university. You can only see sellers from your own university." action={<Link href="/marketplace" className="rounded-xl bg-brand px-5 py-3 font-medium text-white">Back to marketplace</Link>} />
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
        {profile?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatarUrl} alt={profile?.name || "Profile picture"} className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-2xl font-bold text-brand-text">{initial}</div>
        )}
        {/* No picture yet on your OWN profile and the one edit is still
            unused: say so plainly and point at Edit profile — never a
            broken image, and never the private verification selfie. */}
        {myId && myId === id && profile && !profile.avatarUrl && editUsed === false ? (
          <p className="mt-3 text-sm">
            <Link href="/profile/edit" className="font-medium text-brand-text underline">Add your profile picture</Link>
            <span className="text-ink-muted"> — you can edit your profile once, name and picture only.</span>
          </p>
        ) : null}
        <h1 className="mt-4 text-2xl font-bold text-ink">{profile?.name || "Student seller"}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
          {profile?.university ? <span>{profile.university}</span> : null}
          {profile?.verified ? <VerifiedBadge /> : null}
        </div>
        {profile?.faculty || profile?.department || profile?.level ? (
          <p className="mt-1 text-sm text-ink-muted">{[profile?.faculty, profile?.department, profile?.level].filter(Boolean).join(" · ")}</p>
        ) : null}
        {myId && myId === id ? (
          <p className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="font-medium text-brand-text">This is your profile.</span>
            <Link href="/profile/edit" className="rounded-lg border border-line px-3 py-1.5 font-medium text-ink hover:bg-wash">Edit profile</Link>
          </p>
        ) : null}
        {profile?.bio ? <p className="mt-3 text-sm leading-relaxed text-ink-soft">{profile.bio}</p> : (
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">A student seller on Hustly. Only public information is shown here — email, phone, hostel address and ID details are private and never appear on profiles.</p>
        )}
        <div className="mt-5 flex gap-3">
          <Link href="/marketplace" className="rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white">Browse the marketplace</Link>
          <button onClick={report} disabled={reported} className="rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink disabled:opacity-50">{reported ? "Reported — admin will review" : "Report"}</button>
        </div>
      </div>
      <h2 className="mt-8 text-xl font-semibold text-ink">Active listings</h2>
      {listings.length === 0 ? (
        <div className="mt-4"><EmptyState title="No active listings" body="This student has no active listings right now." /></div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {listings.map((l) => (
            <Link key={l.id} href={`/listings/${l.id}`} className="rounded-2xl border border-line bg-white p-5 shadow-card hover:border-brand">
              <h3 className="font-semibold text-ink">{l.title}</h3>
              <p className="mt-1 text-sm text-ink-muted">{l.category} · {naira(l.priceMin)}{l.priceMax ? ` – ${naira(l.priceMax)}` : ""}</p>
            </Link>
          ))}
        </div>
      )}
      <h2 className="mt-8 text-xl font-semibold text-ink">Reviews</h2>
      {!profile || profile.reviews.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">Reviews appear here only after a job is completed and both sides confirm it. No reviews yet for this student.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {profile.reviews.map((r, i) => (
            <div key={i} className="rounded-2xl border border-line bg-white p-4 shadow-card">
              <p className="text-sm font-semibold text-ink">{"★".repeat(Math.max(0, Math.min(5, r.rating)))}{"☆".repeat(Math.max(0, 5 - Math.min(5, r.rating)))} <span className="font-normal text-ink-muted">{r.rating}/5</span></p>
              {r.comment ? <p className="mt-1 text-sm leading-relaxed text-ink-soft">{r.comment}</p> : null}
              {r.reviewer ? <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-muted">Reviewed by {r.reviewer} {r.reviewerVerified ? <VerifiedBadge /> : null}</p> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
