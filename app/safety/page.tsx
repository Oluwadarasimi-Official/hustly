import Link from "next/link";
import { SAFETY_COPY } from "@/lib/data";
import { SafetyBanner } from "@/components/ui";

export default function SafetyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-ink">Safety Tips</h1>
      <p className="mt-3 text-base leading-relaxed text-ink-soft">
        Hustly is a discovery, communication and trust platform. It is not a payment processor and never holds,
        escrows, collects, splits or releases your money.
      </p>
      <div className="mt-6"><SafetyBanner /></div>

      <section className="mt-10 space-y-8">
        <div>
          <h2 className="text-xl font-semibold text-ink">The 50/50 payment guideline</h2>
          <p className="mt-2 text-base leading-relaxed text-ink-soft">{SAFETY_COPY.fiftyFifty}</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-ink">Before you share contact details</h2>
          <p className="mt-2 text-base leading-relaxed text-ink-soft">{SAFETY_COPY.reveal}</p>
          <p className="mt-2 text-base leading-relaxed text-ink-soft">By continuing, you confirm that you understand these risks.</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-ink">Meeting safely</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-base leading-relaxed text-ink-soft">
            <li>Meet in a busy, public place on campus during the day.</li>
            <li>Tell a friend where you are going and when you expect to be back.</li>
            <li>Check the work before you pay the balance.</li>
            <li>Keep the conversation in Hustly so there is a record of what was agreed.</li>
          </ul>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-ink">Protect your privacy</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-base leading-relaxed text-ink-soft">
            <li>Never share passwords, OTPs, bank details or your student ID number in chat.</li>
            <li>Your exact hostel address, ID card image and selfie are private and are never shown on public profiles or listings.</li>
            <li>Only share a phone number after you have read the warning and pressed “I understand”.</li>
          </ul>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-ink">Reporting a problem</h2>
          <p className="mt-2 text-base leading-relaxed text-ink-soft">
            If someone asks for full payment upfront, pressures you, pretends to be someone else, or does not deliver,
            report them from the listing, profile or chat. An admin reviews every report. You can also block the account.
          </p>
          <p className="mt-4"><Link href="/marketplace" className="font-medium">Back to the marketplace →</Link></p>
        </div>
      </section>
    </div>
  );
}
