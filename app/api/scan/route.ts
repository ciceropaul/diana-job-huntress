import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { Database } from "@/lib/supabase/database.types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function isCronRequest(req: NextRequest) {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function POST(req: NextRequest) {
  // Allow manual trigger (authenticated user) or cron
  let userId: string;
  let serviceSupabase: ReturnType<typeof createSupabaseClient<Database>>;

  const isCron = isCronRequest(req);

  if (isCron) {
    // Cron path: use service role, find all users
    serviceSupabase = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    // For single-user app: find first user with settings
    const { data: settings } = await serviceSupabase
      .from("settings")
      .select("user_id")
      .limit(1)
      .single();
    if (!settings) return NextResponse.json({ error: "no users" }, { status: 404 });
    userId = settings.user_id;
  } else {
    // Manual trigger: authenticate via session
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    userId = user.id;

    serviceSupabase = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  // Create scan log
  const { data: scanLog } = await serviceSupabase
    .from("scan_logs")
    .insert({ user_id: userId, triggered_by: isCron ? "cron" : "manual" })
    .select()
    .single();

  const scanLogId = scanLog?.id;

  try {
    // Load profile + companies
    const [{ data: profile }, { data: companies }] = await Promise.all([
      serviceSupabase.from("profiles").select("*").eq("user_id", userId).single(),
      serviceSupabase
        .from("target_companies")
        .select("*")
        .eq("user_id", userId)
        .eq("suppressed", false),
    ]);

    if (!profile || !companies?.length) {
      throw new Error("No profile or companies configured");
    }

    const profileSummary = `
Name: ${profile.name}
Location: ${profile.location}
Positioning: ${profile.positioning_statement}
Skills: ${Array.isArray(profile.skills) ? (profile.skills as string[]).join(", ") : ""}
Deal-breakers: ${profile.deal_breakers?.join(", ") ?? "none"}
`.trim();

    // Search for jobs at each company using Claude + web_search
    const searchPrompt = `You are a job search assistant. Search for currently open job listings at these companies for a candidate with this profile:

CANDIDATE PROFILE:
${profileSummary}

TARGET COMPANIES (search each for open roles):
${companies.map((c) => `- ${c.name}${c.careers_url ? ` (${c.careers_url})` : ""}`).join("\n")}

For each company, use web_search to find current open job listings. Look on their careers page and job boards.

Return results as a JSON array of objects with these fields:
- title: string
- company: string
- location: string (or null)
- description: string (brief, 2-3 sentences)
- source_url: string (direct link to the job posting)
- date_posted: string (ISO date, or null if unknown)

Return ONLY the JSON array, no other text. Include only real, currently open listings you found. If no relevant listings found for a company, skip it.`;

    let jobsRaw: Array<{
      title: string;
      company: string;
      location: string | null;
      description: string | null;
      source_url: string;
      date_posted: string | null;
    }> = [];

    const searchResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      tools: [{ type: "web_search_20250305" as const, name: "web_search" }],
      messages: [{ role: "user", content: searchPrompt }],
    });

    // Extract text from response
    const textBlocks = searchResponse.content.filter((b) => b.type === "text");
    const rawText = textBlocks.map((b) => (b as { type: "text"; text: string }).text).join("");

    try {
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        jobsRaw = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.error("Failed to parse jobs JSON:", rawText);
    }

    // Deduplicate against existing listings
    const { data: existingListings } = await serviceSupabase
      .from("job_listings")
      .select("source_url")
      .eq("user_id", userId);

    const existingUrls = new Set(existingListings?.map((l) => l.source_url) ?? []);
    const newJobs = jobsRaw.filter((j) => j.source_url && !existingUrls.has(j.source_url));

    if (newJobs.length === 0) {
      await serviceSupabase
        .from("scan_logs")
        .update({ completed_at: new Date().toISOString(), jobs_found: 0, jobs_scored: 0, jobs_above_threshold: 0 })
        .eq("id", scanLogId!);
      return NextResponse.json({ jobs_found: 0, jobs_scored: 0, jobs_above_threshold: 0 });
    }

    // Insert new listings
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

    // Score each job against profile
    const { data: userSettings } = await serviceSupabase
      .from("settings")
      .select("digest_min_score")
      .eq("user_id", userId)
      .single();

    const minScore = userSettings?.digest_min_score ?? 7;
    let jobsScored = 0;
    let jobsAboveThreshold = 0;

    for (const job of insertedJobs ?? []) {
      const scorePrompt = `Score this job listing for this candidate on a scale of 1-10.

CANDIDATE PROFILE:
${profileSummary}

JOB:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location ?? "Not specified"}
Description: ${job.description ?? "Not provided"}

Respond ONLY with valid JSON in this format:
{
  "overall": <number 1-10>,
  "dimensions": {
    "skills_match": <1-10>,
    "seniority_fit": <1-10>,
    "location_ok": <1-10>
  },
  "reasoning": "<2-3 sentences>",
  "matched_skills": ["<skill1>", "<skill2>"],
  "gaps": ["<gap1>", "<gap2>"]
}`;

      try {
        const scoreResponse = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 512,
          messages: [{ role: "user", content: scorePrompt }],
        });

        const scoreText = scoreResponse.content
          .filter((b) => b.type === "text")
          .map((b) => (b as { type: "text"; text: string }).text)
          .join("");

        const jsonMatch = scoreText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const score = JSON.parse(jsonMatch[0]);
          await serviceSupabase.from("job_scores").insert({
            job_listing_id: job.id,
            overall: score.overall,
            dimensions: score.dimensions ?? null,
            reasoning: score.reasoning ?? null,
            matched_skills: score.matched_skills ?? [],
            gaps: score.gaps ?? [],
          });
          jobsScored++;
          if (score.overall >= minScore) jobsAboveThreshold++;
        }
      } catch (err) {
        console.error("Scoring error for job", job.id, err);
      }
    }

    // Update scan log
    await serviceSupabase
      .from("scan_logs")
      .update({
        completed_at: new Date().toISOString(),
        jobs_found: newJobs.length,
        jobs_scored: jobsScored,
        jobs_above_threshold: jobsAboveThreshold,
      })
      .eq("id", scanLogId!);

    return NextResponse.json({
      jobs_found: newJobs.length,
      jobs_scored: jobsScored,
      jobs_above_threshold: jobsAboveThreshold,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    if (scanLogId) {
      await serviceSupabase
        .from("scan_logs")
        .update({ completed_at: new Date().toISOString(), error: msg })
        .eq("id", scanLogId);
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
