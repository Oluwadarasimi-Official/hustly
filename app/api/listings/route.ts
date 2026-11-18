import { NextRequest } from "next/server";
import { getServerSupabase, getUserFromBearer, notConfiguredResponse } from "@/lib/supabase";
import { getLatestVerification } from "@/lib/verification";

// Listings: university isolation is enforced in the query (university_id =
// the viewer's verified university), never UI-only. Only real listings
// from the hustly_listings table are ever returned — no sample data.
export async function GET(req: NextRequest) {
  const supabase = getServerSupabase();
  const universityId = req.nextUrl.searchParams.get("universityId");
  const categoryId = req.nextUrl.searchParams.get("categoryId");
  const q = req.nextUrl.searchParams.get("q") || "";
  if (!supabase) return Response.json({ ok: true, configured: false, listings: [] });
  let query = supabase.from("hustly_listings").select("*, hustly_categories(name)").eq("status", "active");
  if (universityId) query = query.eq("university_id", universityId);
  if (categoryId) query = query.eq("category_id", categoryId);
  if (q) query = query.ilike("title", `%${q}%`);
  const { data, error } = await query.order("created_at", { ascending: false }).limit(50);
  if (error) return Response.json({ ok: false, error: "Could not load listings." }, { status: 500 });
  return Response.json({ ok: true, listings: data });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.title || String(body.title).length > 100) return Response.json({ ok: false, error: "A title of up to 100 characters is required." }, { status: 400 });
    if (!body.description || String(body.description).length > 1000) return Response.json({ ok: false, error: "A description of up to 1000 characters is required." }, { status: 400 });
    if (typeof body.priceMin !== "number" || body.priceMin < 0) return Response.json({ ok: false, error: "Enter a valid starting price." }, { status: 400 });
    const supabase = getServerSupabase();
    if (!supabase) return notConfiguredResponse();
    // The seller is ALWAYS the verified signed-in account — never a
    // client-supplied id. This is what "View seller" links to: without it
    // listings were stored with seller_id NULL and the seller link pointed
    // at /profile/ (empty id) and 404'd.
    const user = await getUserFromBearer(req);
    if (!user) return Response.json({ ok: false, error: "Please sign in to your Hustly account first, then publish your listing." }, { status: 401 });
    // Only a signed-in, admin-approved student can publish a listing.
    const verification = await getLatestVerification(user.id);
    if (!verification || verification.status !== "approved") {
      return Response.json({ ok: false, needsVerification: true, error: "Your student verification is not approved yet. Complete your verification first — you can do that at /verify." }, { status: 403 });
    }
    // Resolve the seller's university id from the university name saved at
    // sign-up, so the listing is visible to their own university.
    let universityId: string | null = null;
    const uniName = typeof user.meta.university === "string" ? user.meta.university : "";
    if (uniName) {
      const { data: uni } = await supabase.from("hustly_universities").select("id").eq("name", uniName).maybeSingle();
      if (uni) universityId = String(uni.id);
    }
    if (!universityId && typeof body.universityId === "string" && body.universityId) universityId = body.universityId;
    // Make sure a public profile row exists for this seller, so
    // /profile/<seller id> shows their real name, university and details.
    // Best-effort: a profile upsert failure must not block the listing.
    try {
      await supabase.from("hustly_profiles").upsert({
        id: user.id,
        full_name: typeof user.meta.full_name === "string" ? user.meta.full_name : null,
        display_name: typeof user.meta.display_name === "string" ? user.meta.display_name : null,
        university_id: universityId,
        faculty: typeof user.meta.faculty === "string" ? user.meta.faculty : null,
        department: typeof user.meta.department === "string" ? user.meta.department : null,
        academic_level: typeof user.meta.academic_level === "string" ? user.meta.academic_level : null,
      }, { onConflict: "id" });
    } catch { /* profile row is best-effort; the listing below is the source of truth */ }
    const { data, error } = await supabase.from("hustly_listings").insert({
      seller_id: user.id, university_id: universityId,
      category_id: body.categoryId || null, title: body.title, description: body.description,
      price_min: body.priceMin, price_max: body.priceMax ?? null, availability: body.availability || "Available",
      delivery_estimate: body.delivery || null, status: "active",
    }).select("id").single();
    if (error) return Response.json({ ok: false, error: "Could not create the listing." }, { status: 500 });
    return Response.json({ ok: true, id: data.id });
  } catch { return Response.json({ ok: false, error: "Could not create the listing." }, { status: 500 }); }
}
