import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { jobId } = await req.json();
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const { data: job } = await supabase
    .from("job_listings")
    .select("*, job_scores(*)")
    .eq("id", jobId)
    .single();
  if (!job) return NextResponse.json({ error: "job not found" }, { status: 404 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", job.profile_id)
    .single();
  if (!profile) {
    return NextResponse.json({ error: "profile not found" }, { status: 404 });
  }

  const score = Array.isArray(job.job_scores) && job.job_scores.length > 0
    ? (job.job_scores[0] as { matched_skills: string[]; gaps: string[]; reasoning: string })
    : null;

  const prompt = `Write a tailored, compelling cover letter for this job application.

CANDIDATE PROFILE:
Name: ${profile.name}
Location: ${profile.location}
Positioning: ${profile.positioning_statement}
Skills: ${Array.isArray(profile.skills) ? (profile.skills as string[]).join(", ") : ""}

JOB:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location ?? "Not specified"}
Description: ${job.description ?? "Not provided"}

${score ? `AI ANALYSIS:
Matched skills: ${score.matched_skills?.join(", ")}
Gaps: ${score.gaps?.join(", ")}
Reasoning: ${score.reasoning}` : ""}

Write a professional cover letter (3-4 paragraphs) that:
1. Opens with a specific hook about the role/company
2. Connects the candidate's experience to the job requirements
3. Addresses any gaps briefly and positively
4. Closes with a clear call to action

Write in first person, professional but warm tone. Do not include date/address headers. Start directly with "Dear Hiring Team," or similar.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  // Check for existing cover letter
  const { data: existing } = await supabase
    .from("cover_letters")
    .select("id, version")
    .eq("job_listing_id", jobId)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  const nextVersion = existing ? (existing.version ?? 1) + 1 : 1;

  const { data: saved } = await supabase
    .from("cover_letters")
    .insert({
      job_listing_id: jobId,
      content,
      version: nextVersion,
    })
    .select()
    .single();

  return NextResponse.json(saved);
}
