"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase";

// Session-aware homepage calls to action. The hero and the closing CTA
// used to show "Create a free account" / "Sign up free" / "Sign in" to
// EVERYONE — including a signed-in user, who has no use for them. These
// components read the same real Supabase session the header uses, so:
//   Signed out: the sign-up CTAs show as normal.
//   Signed in:  no sign-up CTA anywhere — logged-in actions instead
//                ("Browse the marketplace", "My profile", "Create a listing").
// While the session is still being read, nothing renders in the CTA slot,
// so a signed-in user never briefly sees a sign-up button.
function useSessionUser() {
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setReady(true);
      return;
    }
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setUserId(data.session?.user?.id || null);
      setReady(true);
    }).catch(() => {
      if (!cancelled) setReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setUserId(session?.user?.id || null);
      setReady(true);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [pathname]);

  return { userId, ready };
}

export function HeroCtas() {
  const { userId, ready } = useSessionUser();
  if (!ready) return <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row" aria-hidden="true" />;
  if (userId) {
    return (
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link href="/marketplace" className="w-full rounded-xl bg-brand px-6 py-3 text-center font-medium text-white hover:bg-brand-hover sm:w-auto">
          Browse the marketplace
        </Link>
        <Link href={`/profile/${encodeURIComponent(userId)}`} className="w-full rounded-xl border border-line bg-white px-6 py-3 text-center font-medium text-ink hover:border-brand sm:w-auto">
          My profile
        </Link>
        <Link href="/listings/new" className="w-full rounded-xl border border-line bg-white px-6 py-3 text-center font-medium text-ink hover:border-brand sm:w-auto">
          Create a listing
        </Link>
      </div>
    );
  }
  return (
    <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
      <Link href="/auth/signup" className="w-full rounded-xl bg-brand px-6 py-3 text-center font-medium text-white hover:bg-brand-hover sm:w-auto">
        Create a free account
      </Link>
      <Link href="/marketplace" className="w-full rounded-xl border border-line bg-white px-6 py-3 text-center font-medium text-ink hover:border-brand sm:w-auto">
        Browse the marketplace
      </Link>
    </div>
  );
}

export function ClosingCtas() {
  const { userId, ready } = useSessionUser();
  if (!ready) return <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row" aria-hidden="true" />;
  if (userId) {
    return (
      <>
        <p className="mx-auto mt-3 max-w-lg text-base leading-relaxed text-ink-soft">
          You are signed in — browse services on your campus, or offer one of your own.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/marketplace" className="w-full rounded-xl bg-brand px-6 py-3 text-center font-medium text-white hover:bg-brand-hover sm:w-auto">Browse the marketplace</Link>
          <Link href={`/profile/${encodeURIComponent(userId)}`} className="w-full rounded-xl border border-line bg-white px-6 py-3 text-center font-medium text-ink sm:w-auto">My profile</Link>
        </div>
      </>
    );
  }
  return (
    <>
      <p className="mx-auto mt-3 max-w-lg text-base leading-relaxed text-ink-soft">
        Join Hustly, verify as a student, and start offering or finding services on your campus today.
      </p>
      <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link href="/auth/signup" className="w-full rounded-xl bg-brand px-6 py-3 text-center font-medium text-white hover:bg-brand-hover sm:w-auto">Sign up free</Link>
        <Link href="/auth/signin" className="w-full rounded-xl border border-line bg-white px-6 py-3 text-center font-medium text-ink sm:w-auto">Sign in</Link>
      </div>
    </>
  );
}
