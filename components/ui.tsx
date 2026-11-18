import Image from "next/image";
import Link from "next/link";

/** Official Hustly logo combo as supplied — icon + "Hustly" wordmark + tagline, full lockup. Never redrawn or cropped. */
export function LogoCombo({ className = "w-44", priority = false }: { className?: string; priority?: boolean }) {
  return (
    <Image src="/logo.jpg" alt="Hustly — Your Campus. Your Hustle." width={1254} height={1254} className={`${className} h-auto`} priority={priority} />
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center" aria-label="Hustly home">
          {/* Scaled-down full combo, aspect ratio preserved — it is square, so it stays compact. */}
          <Image src="/logo.jpg" alt="Hustly — Your Campus. Your Hustle." width={1254} height={1254} className="h-12 w-12 rounded-lg object-cover" priority />
          <span className="ml-2 hidden text-base font-semibold text-ink sm:block">Hustly</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm sm:gap-2" aria-label="Main">
          <Link href="/marketplace" className="whitespace-nowrap rounded-lg px-2 py-2 text-ink-soft hover:bg-wash hover:text-ink sm:px-3">Marketplace</Link>
          <Link href="/safety" className="hidden whitespace-nowrap rounded-lg px-3 py-2 text-ink-soft hover:bg-wash hover:text-ink md:block">Safety</Link>
          <Link href="/inbox" className="hidden whitespace-nowrap rounded-lg px-3 py-2 text-ink-soft hover:bg-wash hover:text-ink sm:block">Inbox</Link>
          <Link href="/auth/signin" className="whitespace-nowrap rounded-lg px-3 py-2 text-ink-soft hover:bg-wash hover:text-ink">Sign in</Link>
          <Link href="/auth/signup" className="whitespace-nowrap rounded-lg bg-brand px-3 py-2 font-medium text-white hover:bg-brand-hover">Sign up</Link>
        </nav>
      </div>
    </header>
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
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand-text">
      Verified student
    </span>
  );
}
