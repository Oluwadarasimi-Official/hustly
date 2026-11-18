// Shared types and small helpers. No sample data lives here —
// listings, jobs, messages and reviews come only from the Supabase
// hustly_* tables (or from the signed-in user's own actions on this device).
export type Listing = {
  id: string; title: string; category: string; description: string;
  priceMin: number; priceMax: number | null; university: string;
  seller: string; verified: boolean; delivery: string;
};
export type Job = {
  id: string; listingId: string; listingTitle: string; buyer: string; seller: string;
  status: "requested" | "clarification_needed" | "accepted" | "in_progress" | "delivered" | "completion_pending" | "completed" | "cancelled" | "disputed";
  task: string; price: number; deadline: string; buyerConfirmed: boolean; sellerConfirmed: boolean;
};
export type ChatMessage = { id: string; jobId: string; from: string; body: string; at: string };

export const JOB_STATUSES: Record<Job["status"], string> = {
  requested: "Requested", clarification_needed: "Needs clarification", accepted: "Accepted",
  in_progress: "In progress", delivered: "Delivered", completion_pending: "Completion pending",
  completed: "Completed", cancelled: "Cancelled", disputed: "Reported / disputed",
};

export function naira(n: number): string {
  return "₦" + n.toLocaleString("en-NG");
}

export function loadSaved(key: string): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}
export function toggleSaved(key: string, id: string): string[] {
  const cur = loadSaved(key);
  const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
  localStorage.setItem(key, JSON.stringify(next));
  return next;
}
