import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { buildCandidateContext, scoreJob } from "@/lib/scoring";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// POST /api/score { jobId } — (re)score a single job for its profile
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { jobId } = await req.json();
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const { data: job } = await supabase
    .from("job_listings")
    .select("*")
    .eq("id", jobId)
    .single();
  if (!job) return NextResponse.json({ error: "job not found" }, { status: 404 });

  const [{ data: profile }, { data: exemplars }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", job.profile_id).single(),
    supabase.from("exemplars").select("*").eq("profile_id", job.profile_id),
  ]);

  if (!profile) {
    return NextResponse.json({ error: "profile not found" }, { status: 404 });
  }

  const ctx = buildCandidateContext(profile, exemplars);
  const score = await scoreJob(anthropic, job, ctx);
  if (!score) {
    return NextResponse.json({ error: "scoring failed" }, { status: 500 });
  }

  // Replace any existing score for this job
  await supabase.from("job_scores").delete().eq("job_listing_id", jobId);
  const { data: saved, error } = await supabase
    .from("job_scores")
    .insert({
      job_listing_id: jobId,
      overall: score.overall,
      dimensions: score.dimensions,
      reasoning: score.reasoning,
      fit_summary: score.fit_summary,
      matched_skills: score.matched_skills,
      gaps: score.gaps,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(saved);
}
