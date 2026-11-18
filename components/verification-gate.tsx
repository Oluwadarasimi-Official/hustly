"use client";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase";
import { fetchVerificationStatus } from "@/lib/client-auth";

// Verification gate: a signed-in student whose profile is NOT yet
// admin-approved is sent straight to /verify and kept there — they cannot
// use the marketplace, listings, jobs, chat, inbox, saved, profile or
// notifications until an admin approves them. Signed-out visitors can
// still browse publicly; the gate only applies to signed-in accounts.
//
// Open to everyone, verified or not: the landing page, sign-in / sign-up /
// email-OTP, the verification page itself, safety info, and the admin
// panel (which has its own separate password gate and is untouched here).
const OPEN_PATHS = ["/", "/safety", "/verify"];
function isOpenPath(path: string): boolean {
  if (OPEN_PATHS.includes(path)) return true;
  if (path.startsWith("/auth/")) return true;
  if (path.startsWith("/admin")) return true;
  return false;
}

export default function VerificationGate() {
  const pathname = usePathname();
  const router = useRouter();
  // Short cache so navigating between gated pages does not re-check the
  // database every single time; approval is picked up within a minute.
  const cache = useRef<{ userId: string; verified: boolean; at: number } | null>(null);
  useEffect(() => {
    if (isOpenPath(pathname)) return;
    let cancelled = false;
    (async () => {
      const supabase = getBrowserSupabase();
      if (!supabase) return;
      const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      const session = data.session;
      if (!session || cancelled) return; // not signed in: public browsing stays open
      const now = Date.now();
      if (cache.current && cache.current.userId === session.user.id && now - cache.current.at < 60_000) {
        if (!cache.current.verified) router.replace("/verify");
        return;
      }
      const status = await fetchVerificationStatus();
      // Unknown status (database down, request failed): never strand the
      // user on a guess — leave them where they are.
      if (cancelled || !status || status.configured === false) return;
      cache.current = { userId: session.user.id, verified: status.verified, at: now };
      if (!status.verified) router.replace("/verify");
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);
  return null;
}
