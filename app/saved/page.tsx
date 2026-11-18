"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { DEMO_LISTINGS, loadSaved, naira, toggleSaved } from "@/lib/demo";
import { EmptyState, VerifiedBadge } from "@/components/ui";

export default function SavedPage() {
  const [saved, setSaved] = useState<string[]>([]);
  useEffect(() => { setSaved(loadSaved("hustly_saved")); }, []);
  const items = DEMO_LISTINGS.filter((l) => saved.includes(l.id));
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
              <div className="mt-2 flex items-center gap-2 text-sm text-ink-soft"><span>{l.seller}</span>{l.verified ? <VerifiedBadge /> : null}</div>
              <button onClick={() => setSaved(toggleSaved("hustly_saved", l.id))} className="mt-4 rounded-lg border border-line px-3 py-2 text-sm">Remove</button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
