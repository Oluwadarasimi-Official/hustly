import Link from "next/link";
import { CATEGORIES } from "@/lib/data";
import { LogoCombo, SafetyBanner } from "@/components/ui";
import { HeroCtas, ClosingCtas } from "@/components/home-ctas";

export default function Home() {
  return (
    <div className="bg-white">
      {/* Hero — full logo combo as supplied, generous whitespace, no gradient blobs */}
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-12 text-center sm:px-6 sm:pt-16">
        <div className="flex justify-center">
          <LogoCombo className="w-64 sm:w-80" priority />
        </div>
        <h1 className="mx-auto mt-8 max-w-2xl text-3xl font-bold leading-tight text-ink sm:text-4xl">
          Find trusted student services on your own campus.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
          Hustly connects verified students in the same university, so you can offer a service,
          find someone who does it well, and agree the work clearly — without leaving your campus.
        </p>
        {/* Session-aware: signed-in users get logged-in actions, never a sign-up CTA. */}
        <HeroCtas />
        <p className="mt-4 text-sm text-ink-muted">Verified students only. Same university only. No payments through Hustly.</p>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h2 className="text-2xl font-bold text-ink">How it works</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {[
            { n: "1", t: "Verify as a student", d: "Sign up with your email, confirm it with a one-time code, then verify with your student ID card and a selfie. An admin reviews unclear cases within 24 hours." },
            { n: "2", t: "List or find a service", d: "Offer a service on your campus, or search listings from verified students at your university only. Save the ones you like and message the seller in the app." },
            { n: "3", t: "Agree, deliver, confirm", d: "Send a job request with the scope, price and deadline. The seller accepts, delivers, and both sides confirm completion. Reviews open only after both confirm." },
          ].map((s) => (
            <article key={s.n} className="rounded-2xl border border-line bg-white p-6 shadow-card">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-base font-bold text-brand-text">{s.n}</span>
              <h3 className="mt-4 text-lg font-semibold text-ink">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.d}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Safety */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h2 className="text-2xl font-bold text-ink">Stay safe on Hustly</h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-soft">
          Hustly is a discovery, communication and trust platform. It is not a payment processor and never holds,
          escrows, collects, splits or releases your money. Buyer and seller arrange payment directly.
        </p>
        <div className="mt-6">
          <SafetyBanner />
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {[
            { t: "The 50/50 rule", d: "Agree no more than 50% upfront, with the balance after delivery. This is a safety guideline between you and the other student — not a Hustly payment feature or a guarantee." },
            { t: "Contact after you understand", d: "Before a phone number or direct contact is revealed, you must read the safety warning and press “I understand”. The acknowledgement is recorded." },
            { t: "Verified, same campus", d: "You only see listings and people from your own verified university. Report scams, harassment or impersonation — an admin reviews every report." },
          ].map((s) => (
            <article key={s.t} className="rounded-2xl border border-line bg-white p-6 shadow-card">
              <h3 className="text-lg font-semibold text-ink">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.d}</p>
            </article>
          ))}
        </div>
        <p className="mt-6 text-sm"><Link href="/safety" className="font-medium">Read the full Safety Tips page →</Link></p>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-bold text-ink">What students offer</h2>
          <Link href="/marketplace" className="shrink-0 text-sm font-medium">See all →</Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c) => (
            <Link key={c.slug} href={`/marketplace?category=${c.slug}`} className="rounded-2xl border border-line bg-white p-5 shadow-card hover:border-brand">
              <h3 className="font-semibold text-ink">{c.name}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">{c.blurb}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
        <div className="rounded-2xl bg-brand-soft px-6 py-10 text-center sm:px-10">
          <h2 className="text-2xl font-bold text-ink">Your campus. Your hustle.</h2>
          {/* Session-aware: signed-in users get logged-in actions, never "Sign up free" / "Sign in". */}
          <ClosingCtas />
        </div>
      </section>
    </div>
  );
}
