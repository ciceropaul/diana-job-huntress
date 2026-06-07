import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export const ACTIVE_PROFILE_COOKIE = "diana_active_profile";

type Profile = Tables<"profiles">;
type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

/** All profiles owned by the current user, oldest first. */
export async function listProfiles(supabase: SupabaseServer): Promise<Profile[]> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("updated_at", { ascending: true });
  return data ?? [];
}

/**
 * Resolve the active profile for the current request.
 * Reads the cookie; falls back to the user's first profile if the cookie is
 * missing or points at a profile that isn't theirs (RLS guarantees `profiles`
 * only contains the user's own rows).
 */
export async function getActiveProfile(
  supabase: SupabaseServer
): Promise<Profile | null> {
  const profiles = await listProfiles(supabase);
  if (profiles.length === 0) return null;

  const cookieStore = await cookies();
  const wanted = cookieStore.get(ACTIVE_PROFILE_COOKIE)?.value;
  const match = wanted ? profiles.find((p) => p.id === wanted) : null;
  return match ?? profiles[0];
}

export function profileLabel(p: Pick<Profile, "name">): string {
  return p.name?.trim() || "Untitled profile";
}
