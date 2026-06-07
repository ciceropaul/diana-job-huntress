import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Briefcase, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function JobsPage() {
  const supabase = await createClient();

  const { data: jobs } = await supabase
    .from("job_listings")
    .select("*, job_scores(overall, matched_skills, gaps)")
    .order("date_found", { ascending: false });

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Job Listings</h1>
          <p className="text-slate-400 mt-1">
            {jobs?.length ?? 0} jobs found across your target companies.
          </p>
        </div>
      </div>

      {!jobs || jobs.length === 0 ? (
        <div className="bg-[#0F1629] border border-[#1a2340] rounded-xl py-20 text-center">
          <Briefcase className="w-12 h-12 mx-auto mb-4 text-slate-600" />
          <p className="text-slate-400 font-medium">No jobs yet</p>
          <p className="text-slate-600 text-sm mt-1">
            Go to Dashboard and run a scan to populate jobs.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const score =
              Array.isArray(job.job_scores) && job.job_scores.length > 0
                ? (job.job_scores[0] as { overall: number }).overall
                : null;
            return (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="block bg-[#0F1629] border border-[#1a2340] rounded-xl p-5 hover:border-[#1B5E20]/50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white group-hover:text-[#4CAF50] transition-colors">
                        {job.title}
                      </h3>
                      <a
                        href={job.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-slate-600 hover:text-slate-400"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    <p className="text-sm text-slate-400">
                      {job.company}
                      {job.location && (
                        <span className="text-slate-600"> · {job.location}</span>
                      )}
                    </p>
                    {job.date_found && (
                      <p className="text-xs text-slate-600 mt-1.5">
                        Found {new Date(job.date_found).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {score !== null && (
                    <span
                      className={cn(
                        "flex-shrink-0 text-sm font-bold px-3 py-1 rounded-full",
                        score >= 8
                          ? "bg-green-500/20 text-green-400"
                          : score >= 6
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-red-500/20 text-red-400"
                      )}
                    >
                      {score}/10
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
