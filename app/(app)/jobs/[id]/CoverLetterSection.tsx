"use client";

import { useState } from "react";
import { Wand2, Copy, Check } from "lucide-react";

interface CoverLetter {
  id: string;
  content: string;
  version: number;
}

export default function CoverLetterSection({
  jobId,
  initialCoverLetter,
}: {
  jobId: string;
  initialCoverLetter: CoverLetter | null;
}) {
  const [coverLetter, setCoverLetter] = useState(initialCoverLetter);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/cover-letter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setCoverLetter(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setGenerating(false);
    }
  }

  async function copy() {
    if (!coverLetter) return;
    await navigator.clipboard.writeText(coverLetter.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-[#0F1629] border border-[#1a2340] rounded-xl p-5 sticky top-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white">Cover Letter</h2>
        {coverLetter && (
          <button onClick={copy} className="text-slate-500 hover:text-slate-300 transition-colors">
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
        )}
      </div>

      {coverLetter ? (
        <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
          {coverLetter.content}
        </p>
      ) : (
        <p className="text-xs text-slate-600 mb-4">No cover letter yet.</p>
      )}

      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}

      <button
        onClick={generate}
        disabled={generating}
        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1B5E20] hover:bg-[#2E7D32] text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
      >
        <Wand2 className="w-4 h-4" />
        {generating ? "Generating…" : coverLetter ? "Regenerate" : "Generate"}
      </button>
    </div>
  );
}
