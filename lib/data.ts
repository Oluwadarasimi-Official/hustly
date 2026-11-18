export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://hustlyapp.vercel.app";
export const APP_NAME = "Hustly";
export const TAGLINE = "Your Campus. Your Hustle.";

export const CATEGORIES = [
  { slug: "design-creative", name: "Design & Creative", blurb: "Graphics, branding, illustrations and creative work." },
  { slug: "writing-editing", name: "Writing & Editing", blurb: "Essays, CVs, articles, proofreading and research help." },
  { slug: "tech-development", name: "Tech & Development", blurb: "Websites, apps, coding help and tech support." },
  { slug: "academic-support", name: "Academic Support", blurb: "Tutorials, past questions, study help and exam prep." },
  { slug: "photography-media", name: "Photography & Media", blurb: "Photoshoots, video, editing and event coverage." },
  { slug: "repairs-practical", name: "Repairs & Practical Help", blurb: "Phone and laptop fixes, errands and hands-on help." },
  { slug: "business-marketing", name: "Business & Marketing", blurb: "Social media, flyers, business plans and promotion." },
  { slug: "events", name: "Events", blurb: "MC, DJ, decoration, ushering and event support." },
  { slug: "other", name: "Other", blurb: "Any other service a student on your campus offers." },
] as const;

export const UNIVERSITIES = [
  "University of Ilorin",
  "University of Lagos",
  "University of Ibadan",
  "Obafemi Awolowo University",
  "University of Nigeria, Nsukka",
  "Ahmadu Bello University",
  "Lagos State University",
  "Kwara State University",
  "University of Abuja",
  "Federal University of Technology, Akure",
] as const;

export const SAFETY_COPY = {
  banner:
    "Safety first: Hustly does not hold payments or guarantee work done outside the platform. Never pay more than 50% upfront — pay the balance only after delivery. Never share passwords or OTPs. Meet safely and report suspicious behaviour.",
  reveal:
    "Hustly does not hold payments or guarantee work performed outside the platform. If you choose to transact directly, agree on the scope and delivery first. Never pay more than 50% upfront; pay the balance only after delivery. Never share passwords, OTPs, or sensitive account details. Meet safely and report suspicious behaviour.",
  fiftyFifty:
    "The 50/50 rule is a safety guideline, not a Hustly payment feature or guarantee. Agree no more than 50% upfront, with the balance after delivery. Hustly never holds, collects, splits or releases your money — buyer and seller arrange payment directly.",
};

export const FAQ_POLICY = `Hustly is a verified same-university student services marketplace. Students only see listings from their own verified university. Hustly is not a payment processor and never holds, escrows, collects, splits or releases money. The 50/50 rule is a safety guideline: no more than 50% upfront, balance after delivery. Before a phone number or direct contact detail is revealed, the user must press "I understand" on a safety warning and the acknowledgement is recorded. A safety notice is pinned at the top of every chat. Student verification uses a student ID card and a selfie; NIN is not required. There is no phone-number OTP. Email is verified with a one-time code sent to the student's email. Reviews are only allowed after both parties confirm a job is complete. Report scams, harassment or impersonation from any listing, profile or chat and an admin will review it.`;
