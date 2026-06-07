import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import CoverLetterSection from "./CoverLetterSection";
import FlagGreatFit from "./FlagGreatFit";
import ReanalyzeButton from "./ReanalyzeButton";
import { detectAts } from "@/lib/ats";
import { cn } from "@/lib/utils";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: job } = await supabase
    .from("job_listings")
    .select("*, job_scores(*), cover_letters(*), applications(*)")
    .eq("id", id)
    .single();

  if (!job) notFound();

  const { data: exemplarMatch } = await supabase
    .from("exemplars")
    .select("id")
    .eq("source_url", job.source_url)
    .maybeSingle();

  const score = Array.isArray(job.job_scores) && job.job_scores.length > 0
    ? (job.job_scores[0] as { overall: number; reasoning: string; fit_summary: string | null; matched_skills: string[]; gaps: string[] })
    : null;

  const coverLetter = Array.isArray(job.cover_letters) && job.cover_letters.length > 0
    ? (job.cover_letters[0] as { id: string; content: string; version: number })
    : null;

  const ats = detectAts(job.source_url);

  return (
    <div className="p-5 sm:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{job.title}</h1>
            <p className="text-slate-400 mt-1">
              {job.company}
              {job.location && <span className="text-slate-600"> · {job.location}</span>}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {score && (
              <span
                className={cn(
                  "text-lg font-bold px-4 py-2 rounded-xl",
                  score.overall >= 8
                    ? "bg-green-500/20 text-green-400"
                    : score.overall >= 6
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-red-500/20 text-red-400"
                )}
              >
                {score.overall}/10
              </span>
            )}
            <FlagGreatFit
              userId={user!.id}
              job={{
                title: job.title,
                company: job.company,
                location: job.location,
                source_url: job.source_url,
                description: job.description,
              }}
              alreadyFlagged={!!exemplarMatch}
            />
            <a
              href={job.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 bg-[#1B5E20] hover:bg-[#2E7D32] text-white rounded-lg text-sm font-semibold transition-colors"
              title={ats.note}
            >
              Apply on {ats.label} <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: description + score */}
        <div className="lg:col-span-2 space-y-6">
          {/* Why this fits you (second-person summary) */}
          {score?.fit_summary && (
            <div className="bg-[#1B5E20]/10 border border-[#1B5E20]/30 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-[#4CAF50] mb-2">Why this fits you</h2>
              <p className="text-sm text-slate-200 leading-relaxed">{score.fit_summary}</p>
            </div>
          )}

          {/* Score breakdown */}
          {score && (
            <div className="bg-[#0F1629] border border-[#1a2340] rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white">AI Scoring</h2>
                <ReanalyzeButton jobId={job.id} />
              </div>
              {score.reasoning && (
                <p className="text-sm text-slate-400 mb-4">{score.reasoning}</p>
              )}
              {score.matched_skills && score.matched_skills.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-green-400 mb-2">Matched skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {score.matched_skills.map((s) => (
                      <span key={s} className="text-xs px-2 py-0.5 bg-green-500/10 text-green-400 rounded-full">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {score.gaps && score.gaps.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-red-400 mb-2">Gaps</p>
                  <div className="flex flex-wrap gap-1.5">
                    {score.gaps.map((g) => (
                      <span key={g} className="text-xs px-2 py-0.5 bg-red-500/10 text-red-400 rounded-full">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {job.description && (
            <div className="bg-[#0F1629] border border-[#1a2340] rounded-xl p-5">
              <h2 className="text-sm font-semibold text-white mb-3">Job Description</h2>
              <p className="text-sm text-slate-400 whitespace-pre-wrap leading-relaxed">
                {job.description}
              </p>
            </div>
          )}
        </div>

        {/* Right: cover letter */}
        <div className="lg:col-span-1">
          <CoverLetterSection jobId={job.id} initialCoverLetter={coverLetter} />
        </div>
      </div>
    </div>
  );
}
