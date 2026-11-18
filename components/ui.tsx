import Image from "next/image";
import Link from "next/link";

/** Official Hustly logo combo as supplied — icon + "Hustly" wordmark + tagline, full lockup. Never redrawn or cropped. */
export function LogoCombo({ className = "w-44", priority = false }: { className?: string; priority?: boolean }) {
  return (
    <Image src="/logo.jpg" alt="Hustly — Your Campus. Your Hustle." width={1254} height={1254} className={`${className} h-auto`} priority={priority} />
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <LogoCombo className="w-40" />
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-muted">
          Hustly is a discovery, communication and trust platform for verified students in the same university.
          Hustly never holds, collects or releases money. Buyer and seller arrange payment directly.
        </p>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link href="/marketplace">Marketplace</Link>
          <Link href="/safety">Safety Tips</Link>
          <Link href="/verify">Student verification</Link>
        </div>
        <p className="mt-6 text-xs text-ink-muted">© 2026 Hustly. Your Campus. Your Hustle.</p>
      </div>
    </footer>
  );
}

export function SafetyBanner() {
  return (
    <div className="rounded-xl border border-brand-soft2 bg-brand-soft px-4 py-3 text-sm leading-relaxed text-ink" role="note">
      <strong className="font-semibold">Safety first.</strong> Hustly does not hold payments or guarantee work done outside the platform.
      Never pay more than 50% upfront — pay the balance only after delivery. Never share passwords or OTPs.
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-white px-6 py-12 text-center shadow-card">
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-muted">{body}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function VerifiedBadge() {
  // REAL green verified badge: solid emerald #10B981, white check, bold
  // white "Verified" text — unmistakable, never a pale tint or blue.
  return (
    <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-[#10B981] px-2.5 py-0.5 text-xs font-bold text-white" title="Verified student — identity confirmed by a Hustly admin">
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5 shrink-0">
        <circle cx="10" cy="10" r="9" fill="#ffffff" />
        <path d="M6 10.5l2.5 2.5L14 7.5" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Verified
    </span>
  );
}
