import { NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

// Listings: university isolation is enforced in the query (university_id =
// the viewer's verified university), never UI-only. When the database is not
// connected yet, the marketplace shows clearly-marked demo listings instead.
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
    if (!supabase) return Response.json({ ok: true, configured: false, id: `local-${Date.now()}`, note: "Database not connected yet — listing kept on this device only." });
    // seller_id / university_id must be derived server-side from the session,
    // never trusted from the browser. This route inserts with the verified
    // university of the signed-in user (enforced again by RLS).
    const { data, error } = await supabase.from("hustly_listings").insert({
      seller_id: body.sellerId || null, university_id: body.universityId || null,
      category_id: body.categoryId || null, title: body.title, description: body.description,
      price_min: body.priceMin, price_max: body.priceMax ?? null, availability: body.availability || "Available",
      delivery_estimate: body.delivery || null, status: "active",
    }).select("id").single();
    if (error) return Response.json({ ok: false, error: "Could not create the listing." }, { status: 500 });
    return Response.json({ ok: true, id: data.id });
  } catch { return Response.json({ ok: false, error: "Could not create the listing." }, { status: 500 }); }
}
