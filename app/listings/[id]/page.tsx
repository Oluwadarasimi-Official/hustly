"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { naira, type Listing } from "@/lib/utils";
import { getAccessToken } from "@/lib/client-auth";
import { EmptyState, SafetyBanner, VerifiedBadge } from "@/components/ui";

function mapRow(row: Record<string, unknown>): Listing {
  const cat = row.hustly_categories as { name?: string } | null;
  return {
    id: String(row.id),
    title: String(row.title || ""),
    category: cat?.name || "Other",
    description: String(row.description || ""),
    priceMin: Number(row.price_min || 0),
    priceMax: row.price_max == null ? null : Number(row.price_max),
    university: "",
    seller: String(row.seller_id || ""),
    verified: false,
    delivery: String(row.delivery_estimate || ""),
  };
}

export default function ListingDetailPage() {
  const params = useParams(); const id = String(params.id);
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState(""); const [price, setPrice] = useState(""); const [deadline, setDeadline] = useState("");
  const [msg, setMsg] = useState(""); const [error, setError] = useState(""); const [sending, setSending] = useState(false);
  useEffect(() => {
    fetch("/api/listings")
      .then((r) => r.json())
      .then((j) => {
        const rows = ((j.listings || []) as Record<string, unknown>[]).map(mapRow);
        setListing(rows.find((l) => l.id === id) || null);
      })
      .catch(() => setListing(null))
      .finally(() => setLoading(false));
  }, [id]);
  async function request(e: React.FormEvent) {
    e.preventDefault(); setError(""); setMsg(""); setSending(true);
    // Job requests go to the server under the signed-in, verified account.
    const token = await getAccessToken();
    if (!token) { setError("Please sign in to your Hustly account first, then send the request."); setSending(false); return; }
    const res = await fetch("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ listingId: id, taskDescription: task, proposedPrice: Number(price), deadline }) });
    const j = await res.json(); setSending(false);
    if (!res.ok) { setError(j.needsVerification ? "Your student verification is not approved yet. Complete your verification first." : (j.error || "Could not send the request.")); return; }
    const jobs = JSON.parse(localStorage.getItem("hustly_jobs") || "[]");
    jobs.unshift({ id: j.id || `job-${Date.now()}`, listingId: id, listingTitle: listing?.title || "", buyer: "You", seller: listing?.seller || "", status: "requested", task, price: Number(price), deadline, buyerConfirmed: false, sellerConfirmed: false });
    localStorage.setItem("hustly_jobs", JSON.stringify(jobs));
    setMsg("Request sent. The seller can accept, decline, or ask for clarification.");
  }
  if (loading) return <div className="mx-auto max-w-3xl px-4 py-10"><p className="text-center text-sm text-ink-muted">Loading listing…</p></div>;
  if (!listing) return <div className="mx-auto max-w-3xl px-4 py-10"><EmptyState title="Listing not found" body="This listing may have been removed or the link is wrong." action={<Link href="/marketplace" className="rounded-xl bg-brand px-5 py-3 font-medium text-white">Back to marketplace</Link>} /></div>;
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-sm"><Link href="/marketplace">← Back to marketplace</Link></p>
      <span className="mt-4 inline-block rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand-text">{listing.category}</span>
      <h1 className="mt-3 text-3xl font-bold leading-tight text-ink">{listing.title}</h1>
      <p className="mt-3 text-base leading-relaxed text-ink-soft">{listing.description}</p>
      <p className="mt-4 text-xl font-bold text-ink">{naira(listing.priceMin)}{listing.priceMax ? ` – ${naira(listing.priceMax)}` : ""}</p>
      {listing.delivery ? <p className="mt-1 text-sm text-ink-muted">Delivery: {listing.delivery}</p> : null}
      <div className="mt-4 flex items-center gap-2">{listing.seller ? <Link href={`/profile/${encodeURIComponent(listing.seller)}`} className="font-medium text-ink">View seller</Link> : null}{listing.verified ? <VerifiedBadge /> : null}</div>
      <div className="mt-6"><SafetyBanner /></div>
      <form onSubmit={request} className="mt-6 space-y-4 rounded-2xl border border-line bg-white p-6 shadow-card">
        <h2 className="text-lg font-semibold text-ink">Request this service</h2>
        <label className="block text-sm font-medium text-ink">Describe the task<textarea required rows={4} value={task} onChange={(e) => setTask(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2.5" placeholder="What do you need, and by when?" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-ink">Your price (₦)<input required type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2.5" /></label>
          <label className="block text-sm font-medium text-ink">Deadline<input required type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2.5" /></label>
        </div>
        <p className="text-xs leading-relaxed text-ink-muted">The 50/50 rule is a safety guideline: agree no more than 50% upfront, balance after delivery. Hustly never holds or moves money.</p>
        {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p> : null}
        {msg ? <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-text" role="status">{msg}</p> : null}
        <button disabled={sending} className="w-full rounded-xl bg-brand px-4 py-3 font-medium text-white hover:bg-brand-hover disabled:opacity-50">{sending ? "Sending…" : "Send job request"}</button>
      </form>
    </div>
  );
}
