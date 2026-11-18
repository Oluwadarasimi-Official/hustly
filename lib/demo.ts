export type Listing = {
  id: string; title: string; category: string; description: string;
  priceMin: number; priceMax: number | null; university: string;
  seller: string; verified: boolean; delivery: string; demo?: boolean;
};
export type Job = {
  id: string; listingId: string; listingTitle: string; buyer: string; seller: string;
  status: "requested" | "clarification_needed" | "accepted" | "in_progress" | "delivered" | "completion_pending" | "completed" | "cancelled" | "disputed";
  task: string; price: number; deadline: string; buyerConfirmed: boolean; sellerConfirmed: boolean;
};
export type ChatMessage = { id: string; jobId: string; from: string; body: string; at: string };

// Clearly-marked demo content only. Real listings come from Supabase once connected.
// Demo listings are samples so the marketplace can be previewed before launch.
export const DEMO_LISTINGS: Listing[] = [
  { id: "demo-1", title: "Logo and flyer design for your business", category: "Design & Creative", description: "Clean, simple flyers and logos designed in 2 days. Two revisions included, source files delivered.", priceMin: 5000, priceMax: 15000, university: "University of Ilorin", seller: "Adaeze O.", verified: true, delivery: "2 days", demo: true },
  { id: "demo-2", title: "Website for your small business", category: "Tech & Development", description: "A simple one-page website for your shop or service, with WhatsApp contact and photos.", priceMin: 20000, priceMax: 50000, university: "University of Ilorin", seller: "Tunde A.", verified: true, delivery: "5 days", demo: true },
  { id: "demo-3", title: "Maths and Physics tutorials", category: "Academic Support", description: "One-on-one tutorials for 100 and 200 level Maths and Physics, on campus or online.", priceMin: 3000, priceMax: 8000, university: "University of Ilorin", seller: "Chiamaka N.", verified: true, delivery: "Same week", demo: true },
  { id: "demo-4", title: "Birthday and event photoshoot", category: "Photography & Media", description: "Outdoor photoshoot with 20 edited photos delivered within 3 days.", priceMin: 15000, priceMax: 30000, university: "University of Ilorin", seller: "Emeka J.", verified: true, delivery: "3 days", demo: true },
  { id: "demo-5", title: "CV writing and LinkedIn setup", category: "Writing & Editing", description: "A clear, professional CV and a tidy LinkedIn profile, ready for applications.", priceMin: 4000, priceMax: 10000, university: "University of Ilorin", seller: "Fatima B.", verified: true, delivery: "2 days", demo: true },
  { id: "demo-6", title: "Phone screen and battery repair", category: "Repairs & Practical Help", description: "Screen replacement and battery fixes for common Android phones, with a 2-week check-back.", priceMin: 8000, priceMax: 25000, university: "University of Ilorin", seller: "Ibrahim S.", verified: true, delivery: "1 day", demo: true },
];

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
