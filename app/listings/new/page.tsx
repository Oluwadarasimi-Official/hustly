"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES, UNIVERSITIES } from "@/lib/data";
import { naira } from "@/lib/utils";

export default function NewListingPage() {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", category: CATEGORIES[0].name, description: "", priceMin: "", priceMax: "", delivery: "2 days", university: UNIVERSITIES[0] });
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res = await fetch("/api/listings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, priceMin: Number(form.priceMin), priceMax: form.priceMax ? Number(form.priceMax) : null }) });
      const j = await res.json();
      if (!res.ok) { setError(j.error || "Could not create the listing."); return; }
      router.push(j.id ? `/listings/${j.id}` : "/marketplace");
    } catch { setError("Could not create the listing. Please try again."); }
    finally { setLoading(false); }
  }
  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-ink">Create a listing</h1>
      <p className="mt-2 text-base text-ink-soft">Only verified students can publish listings. Your listing is visible only to students at your university.</p>
      <form onSubmit={submit} className="mt-6 space-y-5 rounded-2xl border border-line bg-white p-6 shadow-card">
        <label className="block text-sm font-medium text-ink">Title<input required maxLength={100} value={form.title} onChange={(e) => set("title", e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2.5" placeholder="What service do you offer?" /></label>
        <label className="block text-sm font-medium text-ink">Category<select value={form.category} onChange={(e) => set("category", e.target.value)} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2.5">{CATEGORIES.map((c) => <option key={c.slug} value={c.name}>{c.name}</option>)}</select></label>
        <label className="block text-sm font-medium text-ink">Description<textarea required maxLength={1000} rows={5} value={form.description} onChange={(e) => set("description", e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2.5" placeholder="What is included, how it works, and what the buyer gets." /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-ink">Starting price (₦)<input required type="number" min={0} value={form.priceMin} onChange={(e) => set("priceMin", e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2.5" placeholder="5000" /></label>
          <label className="block text-sm font-medium text-ink">Highest price (₦, optional)<input type="number" min={0} value={form.priceMax} onChange={(e) => set("priceMax", e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2.5" placeholder="15000" /></label>
        </div>
        <label className="block text-sm font-medium text-ink">Delivery estimate<input required value={form.delivery} onChange={(e) => set("delivery", e.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2.5" placeholder="e.g. 2 days" /></label>
        {form.priceMin ? <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-text">Starting at {naira(Number(form.priceMin) || 0)}. Remember: agree no more than 50% upfront, balance after delivery. Hustly never takes payment.</p> : null}
        {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p> : null}
        <button disabled={loading} className="w-full rounded-xl bg-brand px-4 py-3 font-medium text-white hover:bg-brand-hover disabled:opacity-50">{loading ? "Publishing…" : "Publish listing"}</button>
      </form>
    </div>
  );
}
