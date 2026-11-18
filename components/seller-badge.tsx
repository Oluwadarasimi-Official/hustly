"use client";
import { useEffect, useState } from "react";
import { VerifiedBadge } from "@/components/ui";

import { isUuid } from "@/lib/utils";

// Cache of user id -> real verified status, so a page showing many users
// (e.g. inbox) only asks the server once per person.
const cache = new Map<string, boolean>();

// Solid green verified badge for a user id, sourced from /api/profiles —
// which returns the REAL approved-verification status only. Renders
// nothing for display names (e.g. "You"), unknown ids, or users whose
// verification is not approved.
export function SellerBadge({ userId }: { userId: string }) {
  const isId = isUuid(userId || "");
  const [verified, setVerified] = useState<boolean | null>(() => (isId ? cache.get(userId) ?? null : false));
  useEffect(() => {
    if (!isId) { setVerified(false); return; }
    if (cache.has(userId)) { setVerified(cache.get(userId) ?? false); return; }
    let live = true;
    fetch(`/api/profiles/${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((j) => {
        const v = Boolean(j.profile?.verified);
        cache.set(userId, v);
        if (live) setVerified(v);
      })
      .catch(() => { if (live) setVerified(false); });
    return () => { live = false; };
  }, [userId, isId]);
  if (!verified) return null;
  return <VerifiedBadge />;
}
