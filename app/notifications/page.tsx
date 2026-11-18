import Link from "next/link";
import { EmptyState } from "@/components/ui";

export default function NotificationsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-ink">Notifications</h1>
      <p className="mt-2 text-base text-ink-soft">Verification decisions, job requests, messages, delivery and reviews will appear here.</p>
      <div className="mt-8"><EmptyState title="No notifications yet" body="When something needs your attention — a new job request, a message, or a verification decision — it will show up here." action={<Link href="/marketplace" className="rounded-xl bg-brand px-5 py-3 font-medium text-white">Browse the marketplace</Link>} /></div>
    </div>
  );
}
