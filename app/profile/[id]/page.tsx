"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { naira, type Listing } from "@/lib/utils";
import { EmptyState } from "@/components/ui";

export default function ProfilePage() {
  const params = useParams(); const id = decodeURIComponent(String(params.id));
  const [listings, setListings] = useState<Listing[]>([]);
  const [reported, setReported] = useState(false);
  useEffect(() => {
    fetch("/api/listings")
      .then((r) => r.json())
      .then((j) => {
        const rows = ((j.listings || []) as Record<string, unknown>[])
          .filter((row) => String(row.seller_id || "") === id)
          .map((row) => {
            const cat = row.hustly_categories as { name?: string } | null;
            return {
              id: String(row.id), title: String(row.title || ""), category: cat?.name || "Other",
              description: String(row.description || ""), priceMin: Number(row.price_min || 0),
              priceMax: row.price_max == null ? null : Number(row.price_max), university: "",
              seller: String(row.seller_id || ""), verified: false, delivery: String(row.delivery_estimate || ""),
            } as Listing;
          });
        setListings(rows);
      })
      .catch(() => setListings([]));
  }, [id]);
  async function report() {
    await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetName: id, reason: "other", details: "Reported from public profile." }) });
    setReported(true);
  }
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-2xl font-bold text-brand-text">H</div>
        <h1 className="mt-4 text-2xl font-bold text-ink">Student seller</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">A student seller on Hustly. Only public information is shown here — email, phone, hostel address and ID details are private and never appear on profiles.</p>
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
      <p className="mt-2 text-sm text-ink-muted">Reviews appear here only after a job is completed and both sides confirm it. No reviews yet for this student.</p>
    </div>
  );
}
