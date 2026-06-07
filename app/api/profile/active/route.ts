import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { ACTIVE_PROFILE_COOKIE } from "@/lib/profile";

// POST /api/profile/active { profileId } — switch the active profile (cookie)
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { profileId } = await req.json();
  if (!profileId) return NextResponse.json({ error: "profileId required" }, { status: 400 });

  // Verify the profile belongs to this user (RLS-scoped select)
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", profileId)
    .single();
  if (!profile) return NextResponse.json({ error: "not found" }, { status: 404 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ACTIVE_PROFILE_COOKIE, profileId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
