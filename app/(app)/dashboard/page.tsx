import { createClient } from "@/lib/supabase/server";
import { Briefcase, Building2, TrendingUp, Clock } from "lucide-react";
import DashboardHeader from "./DashboardHeader";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { count: jobCount },
    { count: companyCount },
    { data: recentJobs },
    { data: recentScans },
  ] = await Promise.all([
    supabase.from("job_listings").select("*", { count: "exact", head: true }),
    supabase
      .from("target_companies")
      .select("*", { count: "exact", head: true })
      .eq("suppressed", false),
    supabase
      .from("job_listings")
      .select("*, job_scores(overall)")
      .order("date_found", { ascending: false })
      .limit(5),
    supabase
      .from("scan_logs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(3),
  ]);

  // Greet the operator (logged-in user) by their Google name — not the candidate profile
  const meta = user?.user_metadata ?? {};
  const fullName: string =
    meta.full_name || meta.name || user?.email?.split("@")[0] || "there";
  const firstName = fullName.split(" ")[0];

  const stats = [
    {
      label: "Total Jobs Found",
      value: jobCount ?? 0,
      icon: Briefcase,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
    {
      label: "Target Companies",
      value: companyCount ?? 0,
      icon: Building2,
      color: "text-green-400",
      bg: "bg-green-400/10",
    },
    {
      label: "Scans Run",
      value: recentScans?.length ?? 0,
      icon: TrendingUp,
      color: "text-purple-400",
      bg: "bg-purple-400/10",
    },
  ];

  return (
    <div className="p-5 sm:p-8 max-w-5xl mx-auto">
      <DashboardHeader name={firstName} />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className="bg-[#0F1629] border border-[#1a2340] rounded-xl p-5"
          >
            <div className={`inline-flex p-2 rounded-lg ${bg} mb-3`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div className="text-3xl font-bold text-white">{value}</div>
            <div className="text-sm text-slate-400 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Recent jobs */}
      <div className="bg-[#0F1629] border border-[#1a2340] rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Recent Job Finds
        </h2>
        {!recentJobs || recentJobs.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No jobs yet — run a scan to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentJobs.map((job) => {
              const score =
                Array.isArray(job.job_scores) && job.job_scores.length > 0
                  ? (job.job_scores[0] as { overall: number }).overall
                  : null;
              return (
                <div
                  key={job.id}
                  className="flex items-center justify-between py-3 border-b border-[#1a2340] last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{job.title}</p>
                    <p className="text-xs text-slate-400">{job.company}</p>
                  </div>
                  {score !== null && (
                    <span
                      className={`text-sm font-bold px-2.5 py-1 rounded-full ${
                        score >= 8
                          ? "bg-green-500/20 text-green-400"
                          : score >= 6
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {score}/10
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Scan history */}
      <div className="bg-[#0F1629] border border-[#1a2340] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          Recent Scans
        </h2>
        {!recentScans || recentScans.length === 0 ? (
          <p className="text-slate-500 text-sm">No scans run yet.</p>
        ) : (
          <div className="space-y-2">
            {recentScans.map((scan) => (
              <div
                key={scan.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-slate-400">
                  {new Date(scan.started_at!).toLocaleString()}
                </span>
                <span className="text-white">
                  {scan.jobs_found} found · {scan.jobs_scored} scored ·{" "}
                  {scan.jobs_above_threshold} high-match
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
