"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { loadSaved, naira, toggleSaved, type Listing } from "@/lib/utils";
import { getAccessToken } from "@/lib/client-auth";
import { EmptyState, VerifiedBadge } from "@/components/ui";

export default function SavedPage() {
  const [saved, setSaved] = useState<string[]>([]);
  const [items, setItems] = useState<Listing[]>([]);
  const [notice, setNotice] = useState<"" | "signin" | "verify">("");
  useEffect(() => {
    const ids = loadSaved("hustly_saved");
    setSaved(ids);
    if (ids.length === 0) return;
    // Saved listings come back university-filtered on the server, so a
    // saved listing from another university simply does not appear here.
    (async () => {
      const token = await getAccessToken();
      if (!token) { setNotice("signin"); return; }
      try {
        const res = await fetch("/api/listings", { headers: { Authorization: `Bearer ${token}` } });
        const j = await res.json();
        if (!res.ok) { if (res.status === 401) setNotice("signin"); else if (j.needsVerification) setNotice("verify"); return; }
        const rows = ((j.listings || []) as Record<string, unknown>[])
          .filter((row) => ids.includes(String(row.id)))
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
        setItems(rows);
      } catch { setItems([]); }
    })();
  }, []);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-ink">Saved listings</h1>
      <p className="mt-2 text-base text-ink-soft">Services you saved for later.</p>
      {notice === "signin" ? (
        <div className="mt-8"><EmptyState title="Sign in to see your saved listings" body="Listings are only shown to verified students of the same university. Sign in to see services on your campus." action={<Link href="/auth/signin" className="rounded-xl bg-brand px-5 py-3 font-medium text-white">Sign in</Link>} /></div>
      ) : notice === "verify" ? (
        <div className="mt-8"><EmptyState title="Complete your verification first" body="Listings are only shown to verified students of the same university. Verify as a student to see services on your campus." action={<Link href="/verify" className="rounded-xl bg-brand px-5 py-3 font-medium text-white">Verify as a student</Link>} /></div>
      ) : items.length === 0 ? (
        <div className="mt-8"><EmptyState title="Nothing saved yet" body="Tap Save on any listing in the marketplace and it will show up here." action={<Link href="/marketplace" className="rounded-xl bg-brand px-5 py-3 font-medium text-white">Browse the marketplace</Link>} /></div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((l) => (
            <article key={l.id} className="rounded-2xl border border-line bg-white p-5 shadow-card">
              <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand-text">{l.category}</span>
              <Link href={`/listings/${l.id}`} className="mt-3 block text-lg font-semibold text-ink">{l.title}</Link>
              <p className="mt-2 text-sm text-ink-soft">{l.description}</p>
              <p className="mt-3 font-semibold text-ink">{naira(l.priceMin)}{l.priceMax ? ` – ${naira(l.priceMax)}` : ""}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
                {l.seller ? <Link href={`/profile/${encodeURIComponent(l.seller)}`} className="font-medium text-ink hover:text-brand-text">View seller</Link> : null}
                {l.university ? <span>· {l.university}</span> : null}
                {l.verified ? <VerifiedBadge /> : null}
              </div>
              <button onClick={() => { const next = toggleSaved("hustly_saved", l.id); setSaved(next); setItems(items.filter((x) => x.id !== l.id)); }} className="mt-4 rounded-lg border border-line px-3 py-2 text-sm">Remove</button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
