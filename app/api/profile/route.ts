import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { ACTIVE_PROFILE_COOKIE } from "@/lib/profile";

// POST /api/profile { name } — create a new (empty) candidate profile + its
// settings row, and switch to it. Companies/jobs start empty for new profiles.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { name } = await req.json();
  const trimmed = (name ?? "").trim();
  if (!trimmed) return NextResponse.json({ error: "name required" }, { status: 400 });

  const { data: profile, error } = await supabase
    .from("profiles")
    .insert({ user_id: user.id, name: trimmed })
    .select()
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: error?.message ?? "could not create profile" }, { status: 500 });
  }

  // Each profile gets its own settings row (per-profile digest config)
  await supabase.from("settings").insert({
    user_id: user.id,
    profile_id: profile.id,
    digest_recipient: user.email,
  });

  const res = NextResponse.json({ profile });
  res.cookies.set(ACTIVE_PROFILE_COOKIE, profile.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
