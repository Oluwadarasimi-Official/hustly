"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase";
import { getAccessToken } from "@/lib/client-auth";

// Session-aware header. The old header was a static server component that
// always showed "Sign in / Sign up", even for a signed-in user — that is
// what David saw in his screenshot. This one reads the real Supabase
// session in the browser, so it shows the logged-in state immediately
// after sign-in (re-checked on every navigation, because the sign-in page
// uses its own Supabase client instance and its auth event may not reach
// this component's subscription in the same tab).
//
// Signed in:  Marketplace, Safety, Inbox, Saved, My profile, Sign out.
// Signed out: Marketplace, Safety, Inbox, Sign in, Sign up.
// While the session is still being read, no auth links are shown at all,
// so a signed-in user never briefly sees "Sign in / Sign up".
export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  // The signed-in user's profile picture, so the header can show it next
  // to "My profile". Fetched only when the signed-in user changes, and
  // only from the public avatar — never the verification selfie.
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    if (!userId) {
      setAvatarUrl("");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;
        const res = await fetch("/api/profiles/me", { headers: { Authorization: `Bearer ${token}` } });
        const j = await res.json();
        if (!cancelled && res.ok && j.profile) setAvatarUrl(String(j.profile.avatarUrl || ""));
      } catch { /* header works without a picture — text link only */ }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

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

  async function signOut() {
    const supabase = getBrowserSupabase();
    try {
      await supabase?.auth.signOut();
    } catch { /* sign out locally either way */ }
    setUserId(null);
    router.push("/");
    router.refresh();
  }

  const signedIn = ready && userId !== null;
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
          {ready && signedIn ? (
            <>
              <Link href="/saved" className="hidden whitespace-nowrap rounded-lg px-3 py-2 text-ink-soft hover:bg-wash hover:text-ink sm:block">Saved</Link>
              <Link href={`/profile/${encodeURIComponent(userId!)}`} className="flex items-center gap-2 whitespace-nowrap rounded-lg px-2 py-2 font-medium text-ink hover:bg-wash sm:px-3">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
                ) : null}
                My profile
              </Link>
              <button onClick={signOut} className="whitespace-nowrap rounded-lg border border-line bg-white px-3 py-2 text-ink-soft hover:bg-wash hover:text-ink">Sign out</button>
            </>
          ) : ready ? (
            <>
              <Link href="/auth/signin" className="whitespace-nowrap rounded-lg px-3 py-2 text-ink-soft hover:bg-wash hover:text-ink">Sign in</Link>
              <Link href="/auth/signup" className="whitespace-nowrap rounded-lg bg-brand px-3 py-2 font-medium text-white hover:bg-brand-hover">Sign up</Link>
            </>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
