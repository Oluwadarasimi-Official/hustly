"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CATEGORIES } from "@/lib/data";
import { naira, toggleSaved, loadSaved, type Listing } from "@/lib/utils";
import { getAccessToken } from "@/lib/client-auth";
import { EmptyState, VerifiedBadge } from "@/components/ui";

function mapRow(row: Record<string, unknown>): Listing {
  const cat = row.hustly_categories as { name?: string } | null;
  const uni = row.hustly_universities as { name?: string } | null;
  return {
    id: String(row.id),
    title: String(row.title || ""),
    category: cat?.name || "Other",
    description: String(row.description || ""),
    priceMin: Number(row.price_min || 0),
    priceMax: row.price_max == null ? null : Number(row.price_max),
    university: uni?.name || "",
    seller: String(row.seller_id || ""),
    verified: Boolean(row.seller_verified),
    delivery: String(row.delivery_estimate || ""),
  };
}

function MarketplaceInner() {
  const params = useSearchParams();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState(params.get("category") || "all");
  const [saved, setSaved] = useState<string[]>([]);
  const [all, setAll] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<"" | "signin" | "verify">("");
  useEffect(() => {
    setSaved(loadSaved("hustly_saved"));
    // Listings are university-isolated on the server: the request carries
    // the signed-in account, and only that university's listings come back.
    (async () => {
      const token = await getAccessToken();
      if (!token) { setNotice("signin"); setLoading(false); return; }
      try {
        const res = await fetch("/api/listings", { headers: { Authorization: `Bearer ${token}` } });
        const j = await res.json();
        if (!res.ok) {
          if (res.status === 401) { setNotice("signin"); return; }
          if (j.needsVerification) { setNotice("verify"); return; }
          setError(j.error || "Listings are unavailable right now. Please try again later."); return;
        }
        if (!j.ok || j.configured === false) { setError("Listings are unavailable right now. Please try again later."); return; }
        setAll(((j.listings || []) as Record<string, unknown>[]).map(mapRow));
      } catch { setError("Listings could not be loaded. Please try again."); }
      finally { setLoading(false); }
    })();
  }, []);
  const filtered = all.filter((l) => (cat === "all" || l.category === CATEGORIES.find((c) => c.slug === cat)?.name) && (l.title + " " + l.description).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-ink">Marketplace</h1>
      <p className="mt-2 text-base text-ink-soft">Services from verified students at your university only.</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search services…" aria-label="Search services" className="w-full flex-1 rounded-xl border border-line px-4 py-3" />
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter by category" className="rounded-xl border border-line bg-white px-4 py-3">
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <Link href="/listings/new" className="rounded-xl bg-brand px-5 py-3 text-center font-medium text-white hover:bg-brand-hover">Create a listing</Link>
      </div>
      {loading ? (
        <p className="mt-8 text-center text-sm text-ink-muted">Loading listings…</p>
      ) : notice === "signin" ? (
        <div className="mt-8"><EmptyState title="Sign in to see services at your university" body="Listings are only shown to verified students of the same university. Sign in to see services on your campus." action={<Link href="/auth/signin" className="rounded-xl bg-brand px-5 py-3 font-medium text-white">Sign in</Link>} /></div>
      ) : notice === "verify" ? (
        <div className="mt-8"><EmptyState title="Complete your verification first" body="Listings are only shown to verified students of the same university. Verify as a student to see services on your campus." action={<Link href="/verify" className="rounded-xl bg-brand px-5 py-3 font-medium text-white">Verify as a student</Link>} /></div>
      ) : error ? (
        <div className="mt-8"><EmptyState title="Listings are unavailable right now" body={error} /></div>
      ) : all.length === 0 ? (
        <div className="mt-8"><EmptyState title="No listings yet" body="No listings yet — be the first to offer a service on your campus." action={<Link href="/listings/new" className="rounded-xl bg-brand px-5 py-3 font-medium text-white">Create a listing</Link>} /></div>
      ) : filtered.length === 0 ? (
        <div className="mt-8"><EmptyState title="No services found" body="Try a different search or category. If nothing matches, you can be the first to list this service on your campus." action={<Link href="/listings/new" className="rounded-xl bg-brand px-5 py-3 font-medium text-white">Create a listing</Link>} /></div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((l) => (
            <article key={l.id} className="flex flex-col rounded-2xl border border-line bg-white p-5 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand-text">{l.category}</span>
                <button onClick={() => setSaved(toggleSaved("hustly_saved", l.id))} aria-label={saved.includes(l.id) ? "Remove from saved" : "Save listing"} className="rounded-lg border border-line px-2.5 py-1 text-sm text-ink-soft hover:border-brand">{saved.includes(l.id) ? "Saved" : "Save"}</button>
              </div>
              <Link href={`/listings/${l.id}`} className="mt-3 text-lg font-semibold leading-snug text-ink hover:text-brand-text">{l.title}</Link>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">{l.description}</p>
              <p className="mt-3 text-base font-semibold text-ink">{naira(l.priceMin)}{l.priceMax ? ` – ${naira(l.priceMax)}` : ""}</p>
              {l.delivery ? <p className="mt-1 text-xs text-ink-muted">Delivery: {l.delivery}</p> : null}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
                {l.seller ? <Link href={`/profile/${encodeURIComponent(l.seller)}`} className="font-medium text-ink hover:text-brand-text">View seller</Link> : null}
                {l.university ? <span>· {l.university}</span> : null}
                {l.verified ? <VerifiedBadge /> : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
export default function MarketplacePage() { return <Suspense><MarketplaceInner /></Suspense>; }
