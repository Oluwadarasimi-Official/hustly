import { NextRequest } from "next/server";
import { getServerSupabase, getUserFromBearer, notConfiguredResponse } from "@/lib/supabase";
import { getLatestVerification, resolveUniversity, resolveViewerUniversity, getApprovedUserIds } from "@/lib/verification";

// Listings: university isolation is enforced HERE, server-side, from the
// viewer's verified signed-in account — never from a client-supplied
// universityId (a signed-in student only ever sees listings from their own
// university). Only real listings from the hustly_listings table are ever
// returned — no sample data.
export async function GET(req: NextRequest) {
  const supabase = getServerSupabase();
  if (!supabase) return Response.json({ ok: true, configured: false, listings: [] });
  // The viewer is always the verified signed-in account; a signed-out
  // visitor has no university, so they see no listings.
  const user = await getUserFromBearer(req);
  if (!user) return Response.json({ ok: false, error: "Please sign in to your Hustly account to see services at your university." }, { status: 401 });
  const verification = await getLatestVerification(user.id);
  if (!verification || verification.status !== "approved") {
    return Response.json({ ok: false, needsVerification: true, error: "Your student verification is not approved yet. Complete your verification first — you can do that at /verify." }, { status: 403 });
  }
  const viewerUni = await resolveViewerUniversity(supabase, user, verification);
  if (!viewerUni.id) return Response.json({ ok: false, error: "We could not confirm your university. Complete your verification first — you can do that at /verify." }, { status: 403 });
  const id = req.nextUrl.searchParams.get("id");
  const categoryId = req.nextUrl.searchParams.get("categoryId");
  const q = req.nextUrl.searchParams.get("q") || "";
  const select = "*, hustly_categories(name), hustly_universities(name)";
  // Single listing (detail page): a listing from another university is a
  // clear 403, not a 404, so the page can explain why it is unavailable.
  if (id) {
    const { data, error } = await supabase.from("hustly_listings").select(select).eq("id", id).maybeSingle();
    if (error || !data) return Response.json({ ok: false, error: "Listing not found." }, { status: 404 });
    const row = data as Record<string, unknown>;
    const listingUniId = (row.university_id as string | null) || null;
    if (listingUniId && listingUniId !== viewerUni.id) {
      return Response.json({ ok: false, crossUniversity: true, error: "This service is from a student at another university. You can only order services from students at your own university." }, { status: 403 });
    }
    if (!listingUniId && row.seller_id) {
      // Legacy listing with no university stored: resolve the seller's.
      const sellerUni = await resolveUniversity(supabase, String(row.seller_id));
      if (sellerUni.id && sellerUni.id !== viewerUni.id) {
        return Response.json({ ok: false, crossUniversity: true, error: "This service is from a student at another university. You can only order services from students at your own university." }, { status: 403 });
      }
    }
    // Verified badge: real approved-verification status for this seller.
    const approved = await getApprovedUserIds(supabase, [String(row.seller_id || "")]);
    return Response.json({ ok: true, listing: { ...data, seller_verified: approved.has(String(row.seller_id || "")) } });
  }
  let query = supabase.from("hustly_listings").select(select).eq("status", "active").eq("university_id", viewerUni.id);
  if (categoryId) query = query.eq("category_id", categoryId);
  if (q) query = query.ilike("title", `%${q}%`);
  const { data, error } = await query.order("created_at", { ascending: false }).limit(50);
  if (error) return Response.json({ ok: false, error: "Could not load listings." }, { status: 500 });
  // Verified badge: one batched lookup of approved verifications for all
  // sellers on this page — never a hard-coded flag.
  const sellerIds = (data || []).map((r) => String((r as Record<string, unknown>).seller_id || ""));
  const approvedSellers = await getApprovedUserIds(supabase, sellerIds);
  return Response.json({
    ok: true,
    listings: (data || []).map((r) => ({
      ...(r as Record<string, unknown>),
      seller_verified: approvedSellers.has(String((r as Record<string, unknown>).seller_id || "")),
    })),
  });
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
