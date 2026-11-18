import type { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { getServerSupabase, getUserFromBearer, notConfiguredResponse } from "@/lib/supabase";
import { getLatestVerification, resolveUniversity } from "@/lib/verification";

// Your OWN profile — the only profile you may edit. The user id is ALWAYS
// derived server-side from the verified Bearer token; a client-supplied
// id is never trusted, so you can only ever edit yourself.
//
// DAVID'S RULE — ONE EDIT, EVER: a profile may be edited exactly once.
// profile_edit_used is set the first time an edit is saved and the server
// refuses every later edit (403), even if the button is somehow shown.
// The ONLY things that edit may change are the NAME and the PROFILE
// PICTURE. University and ALL verification details (university, faculty,
// department, level, ID card, selfie) can NEVER be changed through
// profile editing — they come from the admin-approved verification.
const MAX_PICTURE_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function clean(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export async function GET(req: NextRequest) {
  const user = await getUserFromBearer(req);
  if (!user) return Response.json({ ok: false, error: "Please sign in to your Hustly account first." }, { status: 401 });
  const supabase = getServerSupabase();
  if (!supabase) return notConfiguredResponse();
  const { data: row } = await supabase.from("hustly_profiles").select("*").eq("id", user.id).maybeSingle();
  const rec = (row || {}) as Record<string, unknown>;
  const uni = await resolveUniversity(supabase, user.id, user.meta);
  const verification = await getLatestVerification(user.id);
  return Response.json({
    ok: true,
    profile: {
      id: user.id,
      displayName: String(rec.display_name || rec.full_name || user.meta.display_name || user.meta.full_name || ""),
      avatarUrl: String(rec.avatar_url || ""),
      university: uni.name || "",
      verified: verification?.status === "approved",
      editUsed: Boolean(rec.profile_edit_used),
    },
  });
}

export async function PATCH(req: NextRequest) {
  const user = await getUserFromBearer(req);
  if (!user) return Response.json({ ok: false, error: "Please sign in to your Hustly account first." }, { status: 401 });
  const supabase = getServerSupabase();
  if (!supabase) return notConfiguredResponse();

  // One-edit lock — checked BEFORE anything is changed.
  const { data: existing } = await supabase.from("hustly_profiles").select("profile_edit_used, avatar_url").eq("id", user.id).maybeSingle();
  if (existing && Boolean((existing as Record<string, unknown>).profile_edit_used)) {
    return Response.json({ ok: false, editUsed: true, error: "You have already used your one profile edit. Your profile is now locked and can't be changed again." }, { status: 403 });
  }

  let displayName = "";
  let picture: File | null = null;
  try {
    const form = await req.formData();
    displayName = clean(form.get("displayName"), 80);
    const f = form.get("picture");
    if (f instanceof File && f.size > 0) picture = f;
  } catch {
    return Response.json({ ok: false, error: "Could not read your edit. Please try again." }, { status: 400 });
  }
  if (!displayName) return Response.json({ ok: false, error: "Please enter a name." }, { status: 400 });

  // Profile picture: real image only, 2MB max, random filename.
  let avatarUrl: string | null = existing ? String((existing as Record<string, unknown>).avatar_url || "") || null : null;
  if (picture) {
    if (!ALLOWED_TYPES.includes(picture.type)) {
      return Response.json({ ok: false, error: "Your profile picture must be a JPG, PNG or WebP image." }, { status: 400 });
    }
    if (picture.size > MAX_PICTURE_BYTES) {
      return Response.json({ ok: false, error: "Your profile picture must be 2MB or smaller." }, { status: 400 });
    }
    const ext = picture.type === "image/png" ? "png" : picture.type === "image/webp" ? "webp" : "jpg";
    const path = `${user.id}/${randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("hustly-avatars").upload(path, picture, { contentType: picture.type, upsert: false });
    if (upErr) return Response.json({ ok: false, error: "Could not save your profile picture. Please try again." }, { status: 500 });
    const { data: pub } = supabase.storage.from("hustly-avatars").getPublicUrl(path);
    avatarUrl = pub.publicUrl;
  }

  // The one edit is now spent — set the lock in the same write.
  const { error } = await supabase.from("hustly_profiles").upsert({
    id: user.id,
    display_name: displayName,
    avatar_url: avatarUrl,
    profile_edit_used: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });
  if (error) return Response.json({ ok: false, error: "Could not save your profile. Please try again." }, { status: 500 });
  return Response.json({ ok: true, editUsed: true });
}
