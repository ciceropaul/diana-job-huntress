import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse, after } from "next/server";
import type { Database } from "@/lib/supabase/database.types";
import { buildCandidateContext, scoreJob, textOf } from "@/lib/scoring";
import { sendDigest } from "@/lib/email/digest";

export const maxDuration = 300;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type ServiceClient = ReturnType<typeof createSupabaseClient<Database>>;

function serviceClient(): ServiceClient {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function isCronRequest(req: NextRequest) {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

// GET /api/scan?id=<scanLogId> — poll status of a scan
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  const query = supabase
    .from("scan_logs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(1);

  const { data } = id
    ? await supabase.from("scan_logs").select("*").eq("id", id).single()
    : await query.single();

  return NextResponse.json(data ?? null);
}

// POST /api/scan — start a scan; returns immediately with the scan log id.
// Heavy work runs in the background via after().
export async function POST(req: NextRequest) {
  const isCron = isCronRequest(req);
  const serviceSupabase = serviceClient();
  let userId: string;

  if (isCron) {
    const { data: settings } = await serviceSupabase
      .from("settings")
      .select("user_id")
      .limit(1)
      .single();
    if (!settings) return NextResponse.json({ error: "no users" }, { status: 404 });
    userId = settings.user_id;
  } else {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    userId = user.id;
  }

  // Create the scan log up front so the client can poll it
  const { data: scanLog } = await serviceSupabase
    .from("scan_logs")
    .insert({ user_id: userId, triggered_by: isCron ? "cron" : "manual" })
    .select()
    .single();

  const scanLogId = scanLog?.id;
  if (!scanLogId) {
    return NextResponse.json({ error: "could not create scan log" }, { status: 500 });
  }

  // Run the scan after the response is sent (kept alive up to maxDuration)
  after(async () => {
    try {
      await runScan(serviceSupabase, userId, scanLogId);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      await serviceSupabase
        .from("scan_logs")
        .update({ completed_at: new Date().toISOString(), error: msg })
        .eq("id", scanLogId);
    }
  });

  // Respond immediately
  return NextResponse.json({ scanLogId, status: "started" }, { status: 202 });
}

async function runScan(
  serviceSupabase: ServiceClient,
  userId: string,
  scanLogId: string
) {
  // Load profile + companies + exemplars
  const [{ data: profile }, { data: companies }, { data: exemplars }] =
    await Promise.all([
      serviceSupabase.from("profiles").select("*").eq("user_id", userId).single(),
      serviceSupabase
        .from("target_companies")
        .select("*")
        .eq("user_id", userId)
        .eq("suppressed", false),
      serviceSupabase.from("exemplars").select("*").eq("user_id", userId),
    ]);

  if (!profile || !companies?.length) {
    throw new Error("No profile or companies configured");
  }

  const ctx = buildCandidateContext(profile, exemplars);
  const { profileSummary, exemplarBlock } = ctx;

  const searchPrompt = `You are a job search assistant. Search for currently open job listings at these companies for a candidate with this profile:

CANDIDATE PROFILE:
${profileSummary}${exemplarBlock}

TARGET COMPANIES (search each for open roles):
${companies.map((c) => `- ${c.name}${c.careers_url ? ` (${c.careers_url})` : ""}`).join("\n")}

For each company, use web_search to find current open job listings. Look on their careers page and job boards. Prioritize roles that resemble the IDEAL-FIT EXAMPLES above.

Return results as a JSON array of objects with these fields:
- title: string
- company: string
- location: string (or null)
- description: string (brief, 2-3 sentences)
- source_url: string (direct link to the job posting)
- date_posted: string (ISO date, or null if unknown)

Return ONLY the JSON array, no other text. Include only real, currently open listings you found. If no relevant listings found for a company, skip it.`;

  const searchResponse = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    tools: [{ type: "web_search_20250305" as const, name: "web_search" }],
    messages: [{ role: "user", content: searchPrompt }],
  });

  let jobsRaw: Array<{
    title: string;
    company: string;
    location: string | null;
    description: string | null;
    source_url: string;
    date_posted: string | null;
  }> = [];

  const rawText = textOf(searchResponse.content);
  try {
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (jsonMatch) jobsRaw = JSON.parse(jsonMatch[0]);
  } catch {
    console.error("Failed to parse jobs JSON:", rawText);
  }

  // Deduplicate against existing listings
  const { data: existingListings } = await serviceSupabase
    .from("job_listings")
    .select("source_url")
    .eq("user_id", userId);

  const existingUrls = new Set(existingListings?.map((l) => l.source_url) ?? []);
  // Dedup against the DB and within the batch itself (the model sometimes repeats)
  const seen = new Set<string>();
  const newJobs = jobsRaw.filter((j) => {
    if (!j.source_url || existingUrls.has(j.source_url) || seen.has(j.source_url)) {
      return false;
    }
    seen.add(j.source_url);
    return true;
  });

  if (newJobs.length === 0) {
    await serviceSupabase
      .from("scan_logs")
      .update({
        completed_at: new Date().toISOString(),
        jobs_found: 0,
        jobs_scored: 0,
        jobs_above_threshold: 0,
      })
      .eq("id", scanLogId);
    return;
  }

  const { data: insertedJobs } = await serviceSupabase
    .from("job_listings")
    .insert(
      newJobs.map((j) => ({
        user_id: userId,
        title: j.title,
        company: j.company,
        location: j.location ?? null,
        description: j.description ?? null,
        source_url: j.source_url,
        source: "ai_scan",
        date_posted: j.date_posted ?? null,
      }))
    )
    .select();

  const { data: userSettings } = await serviceSupabase
    .from("settings")
    .select("digest_min_score")
    .eq("user_id", userId)
    .single();

  const minScore = userSettings?.digest_min_score ?? 7;

  // Score jobs in parallel using the shared scoring helper
  const scoreResults = await Promise.all(
    (insertedJobs ?? []).map(async (job) => {
      try {
        const score = await scoreJob(anthropic, job, ctx);
        if (!score) return null;
        await serviceSupabase.from("job_scores").insert({
          job_listing_id: job.id,
          overall: score.overall,
          dimensions: score.dimensions,
          reasoning: score.reasoning,
          fit_summary: score.fit_summary,
          matched_skills: score.matched_skills,
          gaps: score.gaps,
        });
        return { job, overall: score.overall, fit_summary: score.fit_summary };
      } catch (err) {
        console.error("Scoring error for job", job.id, err);
        return null;
      }
    })
  );

  type ScoredEntry = NonNullable<(typeof scoreResults)[number]>;
  const scored = scoreResults.filter((s): s is ScoredEntry => s !== null);
  const jobsScored = scored.length;
  const strongMatches = scored.filter((s) => s.overall >= minScore);
  const jobsAboveThreshold = strongMatches.length;

  // Send the email digest (best-effort; never fail the scan because of email)
  let emailSent = false;
  try {
    emailSent = await sendDigest({
      userId,
      candidateName: ctx.firstName,
      matches: strongMatches.map((s) => ({
        id: s.job.id,
        title: s.job.title,
        company: s.job.company,
        location: s.job.location,
        source_url: s.job.source_url,
        overall: s.overall,
        fit_summary: s.fit_summary,
      })),
    });
  } catch (err) {
    console.error("Digest send failed:", err);
  }

  await serviceSupabase
    .from("scan_logs")
    .update({
      completed_at: new Date().toISOString(),
      jobs_found: newJobs.length,
      jobs_scored: jobsScored,
      jobs_above_threshold: jobsAboveThreshold,
      email_sent: emailSent,
    })
    .eq("id", scanLogId);
}
