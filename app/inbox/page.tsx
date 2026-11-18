"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { JOB_STATUSES, naira, type Job } from "@/lib/utils";
import { EmptyState } from "@/components/ui";

export default function InboxPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  useEffect(() => { try { setJobs(JSON.parse(localStorage.getItem("hustly_jobs") || "[]")); } catch { setJobs([]); } }, []);
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-ink">Inbox</h1>
      <p className="mt-2 text-base text-ink-soft">Your job requests and conversations.</p>
      {jobs.length === 0 ? (
        <div className="mt-8"><EmptyState title="No conversations yet" body="Send a job request from a listing and it will appear here, with its chat." action={<Link href="/marketplace" className="rounded-xl bg-brand px-5 py-3 font-medium text-white">Browse the marketplace</Link>} /></div>
      ) : (
        <div className="mt-6 space-y-4">
          {jobs.map((j) => (
            <article key={j.id} className="rounded-2xl border border-line bg-white p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link href={`/jobs/${j.id}`} className="text-lg font-semibold text-ink hover:text-brand-text">{j.listingTitle}</Link>
                  <p className="mt-1 text-sm text-ink-muted">{j.buyer} · {j.seller} · {naira(j.price)} · due {j.deadline}</p>
                </div>
                <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand-text">{JOB_STATUSES[j.status]}</span>
              </div>
              <div className="mt-4 flex gap-3">
                <Link href={`/jobs/${j.id}`} className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white">View job</Link>
                <Link href={`/chat/${j.id}`} className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink">Open chat</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
