"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export default function ReanalyzeButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={run}
        disabled={loading}
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors disabled:opacity-60"
        title="Re-run the AI analysis for this job"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Analyzing…" : "Re-analyze"}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </span>
  );
}
