import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { sendDigest } from "@/lib/email/digest";
import { getActiveProfile } from "@/lib/profile";

// POST /api/digest/test — send a digest of the active profile's top matches
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const profile = await getActiveProfile(supabase);
  if (!profile) return NextResponse.json({ error: "no active profile" }, { status: 404 });

  const { data: settings } = await supabase
    .from("settings")
    .select("digest_enabled, digest_recipient, digest_min_score")
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (!settings?.digest_enabled) {
    return NextResponse.json(
      { error: "Digest is disabled. Enable it above and save first." },
      { status: 400 }
    );
  }
  if (!settings.digest_recipient) {
    return NextResponse.json(
      { error: "No recipient email set. Add one above and save first." },
      { status: 400 }
    );
  }

  const minScore = settings.digest_min_score ?? 7;

  // Pull current top matches for the active profile
  const { data: jobs } = await supabase
    .from("job_listings")
    .select("id, title, company, location, source_url, job_scores(overall, fit_summary)")
    .eq("profile_id", profile.id)
    .order("date_found", { ascending: false });

  const matches = (jobs ?? [])
    .map((j) => {
      const s = Array.isArray(j.job_scores) && j.job_scores.length > 0
        ? (j.job_scores[0] as { overall: number; fit_summary: string | null })
        : null;
      return s
        ? {
            id: j.id,
            title: j.title,
            company: j.company,
            location: j.location,
            source_url: j.source_url,
            overall: s.overall,
            fit_summary: s.fit_summary,
          }
        : null;
    })
    .filter((m): m is NonNullable<typeof m> => m !== null && m.overall >= minScore)
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 10);

  if (matches.length === 0) {
    return NextResponse.json(
      { error: `No jobs at or above your min score (${minScore}) to include yet. Run a scan first.` },
      { status: 400 }
    );
  }

  const sent = await sendDigest({
    profileId: profile.id,
    candidateName: (profile.name ?? "there").split(" ")[0],
    matches,
  });

  if (!sent) {
    return NextResponse.json(
      { error: "Email failed to send. Check RESEND_API_KEY and EMAIL_FROM in Vercel." },
      { status: 500 }
    );
  }

  return NextResponse.json({ sent: true, count: matches.length, to: settings.digest_recipient });
}
