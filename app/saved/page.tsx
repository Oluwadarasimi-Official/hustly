"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { loadSaved, naira, toggleSaved, type Listing } from "@/lib/utils";
import { EmptyState, VerifiedBadge } from "@/components/ui";

export default function SavedPage() {
  const [saved, setSaved] = useState<string[]>([]);
  const [items, setItems] = useState<Listing[]>([]);
  useEffect(() => {
    const ids = loadSaved("hustly_saved");
    setSaved(ids);
    if (ids.length === 0) return;
    fetch("/api/listings")
      .then((r) => r.json())
      .then((j) => {
        const rows = ((j.listings || []) as Record<string, unknown>[])
          .filter((row) => ids.includes(String(row.id)))
          .map((row) => {
            const cat = row.hustly_categories as { name?: string } | null;
            return {
              id: String(row.id), title: String(row.title || ""), category: cat?.name || "Other",
              description: String(row.description || ""), priceMin: Number(row.price_min || 0),
              priceMax: row.price_max == null ? null : Number(row.price_max), university: "",
              seller: String(row.seller_id || ""), verified: false, delivery: String(row.delivery_estimate || ""),
            } as Listing;
          });
        setItems(rows);
      })
      .catch(() => setItems([]));
  }, []);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-ink">Saved listings</h1>
      <p className="mt-2 text-base text-ink-soft">Services you saved for later.</p>
      {items.length === 0 ? (
        <div className="mt-8"><EmptyState title="Nothing saved yet" body="Tap Save on any listing in the marketplace and it will show up here." action={<Link href="/marketplace" className="rounded-xl bg-brand px-5 py-3 font-medium text-white">Browse the marketplace</Link>} /></div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((l) => (
            <article key={l.id} className="rounded-2xl border border-line bg-white p-5 shadow-card">
              <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand-text">{l.category}</span>
              <Link href={`/listings/${l.id}`} className="mt-3 block text-lg font-semibold text-ink">{l.title}</Link>
              <p className="mt-2 text-sm text-ink-soft">{l.description}</p>
              <p className="mt-3 font-semibold text-ink">{naira(l.priceMin)}{l.priceMax ? ` – ${naira(l.priceMax)}` : ""}</p>
              <div className="mt-2 flex items-center gap-2 text-sm text-ink-soft"><Link href={`/profile/${encodeURIComponent(l.seller)}`} className="hover:text-brand-text">View seller</Link>{l.verified ? <VerifiedBadge /> : null}</div>
              <button onClick={() => { const next = toggleSaved("hustly_saved", l.id); setSaved(next); setItems(items.filter((x) => x.id !== l.id)); }} className="mt-4 rounded-lg border border-line px-3 py-2 text-sm">Remove</button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
