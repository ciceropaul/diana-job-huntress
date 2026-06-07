import Anthropic from "@anthropic-ai/sdk";
import type { Tables } from "@/lib/supabase/database.types";

type Profile = Tables<"profiles">;
type Exemplar = Tables<"exemplars">;

export type CandidateContext = {
  profileSummary: string;
  exemplarBlock: string;
  firstName: string;
};

/** Build the reusable candidate context (profile summary + ideal-fit examples). */
export function buildCandidateContext(
  profile: Profile,
  exemplars: Exemplar[] | null
): CandidateContext {
  const firstName = (profile.name ?? "the candidate").split(" ")[0];

  const profileSummary = `
Name: ${profile.name}
Location: ${profile.location}
Positioning: ${profile.positioning_statement}
Skills: ${Array.isArray(profile.skills) ? (profile.skills as string[]).join(", ") : ""}
Green flags (things ${firstName} WANTS): ${profile.green_flags?.join("; ") || "none specified"}
Deal-breakers (avoid): ${profile.deal_breakers?.join("; ") ?? "none"}
`.trim();

  const exemplarBlock =
    exemplars && exemplars.length > 0
      ? `\n\nIDEAL-FIT EXAMPLES (roles ${firstName} confirmed are excellent fits — use them as the gold standard for what a great match looks like):\n${exemplars
          .map(
            (e) =>
              `- ${e.title} @ ${e.company ?? "?"} (${e.location ?? "?"}): ${e.description ?? ""}${e.why_great ? ` — Why it's great: ${e.why_great}` : ""}`
          )
          .join("\n")}`
      : "";

  return { profileSummary, exemplarBlock, firstName };
}

export type ScoreResult = {
  overall: number;
  dimensions: Record<string, number> | null;
  reasoning: string | null;
  fit_summary: string | null;
  matched_skills: string[];
  gaps: string[];
};

export function textOf(content: Anthropic.Messages.ContentBlock[]): string {
  return content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");
}

/** Score a single job for the candidate. Returns null if parsing fails. */
export async function scoreJob(
  anthropic: Anthropic,
  job: { title: string; company: string; location: string | null; description: string | null },
  ctx: CandidateContext
): Promise<ScoreResult | null> {
  const prompt = `Score this job listing for this candidate on a scale of 1-10. A 10 means it is as good a fit as the IDEAL-FIT EXAMPLES. Reward roles that match the green flags and resemble the ideal examples; penalize anything hitting a deal-breaker.

CANDIDATE PROFILE:
${ctx.profileSummary}${ctx.exemplarBlock}

JOB:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location ?? "Not specified"}
Description: ${job.description ?? "Not provided"}

Respond ONLY with valid JSON in this exact shape:
{
  "overall": <number 1-10>,
  "dimensions": { "skills_match": <1-10>, "seniority_fit": <1-10>, "location_ok": <1-10> },
  "reasoning": "<2-3 sentences of analysis, third person>",
  "fit_summary": "<2-4 sentences written in the SECOND PERSON, addressed directly to ${ctx.firstName} (use 'you'/'your'), explaining why this role does or doesn't fit. e.g. 'This role aligns well with your strengths in video production and...'>",
  "matched_skills": ["<skill1>", "<skill2>"],
  "gaps": ["<gap1>", "<gap2>"]
}`;

  const res = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 700,
    messages: [{ role: "user", content: prompt }],
  });

  const match = textOf(res.content).match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const s = JSON.parse(match[0]);
    return {
      overall: s.overall,
      dimensions: s.dimensions ?? null,
      reasoning: s.reasoning ?? null,
      fit_summary: s.fit_summary ?? null,
      matched_skills: s.matched_skills ?? [],
      gaps: s.gaps ?? [],
    };
  } catch {
    return null;
  }
}
