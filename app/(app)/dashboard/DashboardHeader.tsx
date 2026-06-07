"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Search } from "lucide-react";

export default function DashboardHeader({
  name,
  profileName,
}: {
  name: string;
  profileName?: string;
}) {
  const router = useRouter();
  const [greeting, setGreeting] = useState("Hello");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting("Good morning");
    else if (h < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function pollStatus(scanLogId: string) {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/scan?id=${scanLogId}`);
        if (!res.ok) return;
        const log = await res.json();
        if (log?.error) {
          stopPolling();
          setError(log.error);
          setScanning(false);
          return;
        }
        if (log?.completed_at) {
          stopPolling();
          setResult(
            `Scan complete — ${log.jobs_found} found, ${log.jobs_scored} scored, ${log.jobs_above_threshold} strong matches.`
          );
          setScanning(false);
          router.refresh();
        }
      } catch {
        // transient network error — keep polling
      }
    }, 4000);
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function runScan() {
    setScanning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/scan", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed to start");
      if (!data.scanLogId) throw new Error("No scan id returned");
      pollStatus(data.scanLogId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
      setScanning(false);
    }
  }

  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {greeting}, {name} 👋
          </h1>
          <p className="text-slate-400 mt-1">
            {profileName
              ? `Job search snapshot for ${profileName}.`
              : "Here's your job search snapshot."}
          </p>
        </div>
        <button
          onClick={runScan}
          disabled={scanning}
          className="flex-shrink-0 self-start sm:self-auto flex items-center gap-2 px-5 py-2.5 bg-[#1B5E20] hover:bg-[#2E7D32] text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
        >
          {scanning ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          {scanning ? "Scanning…" : "Run scan now"}
        </button>
      </div>

      {scanning && (
        <p className="mt-3 text-xs text-slate-500">
          Searching your target companies and scoring matches — this runs in the
          background and can take a couple of minutes. You can leave this page; results
          will appear on the dashboard.
        </p>
      )}
      {result && (
        <div className="mt-3 px-4 py-2.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
          {result}
        </div>
      )}
      {error && (
        <div className="mt-3 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm break-words">
          {error}
        </div>
      )}
    </div>
  );
}
