"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Star } from "lucide-react";

export default function FlagGreatFit({
  userId,
  profileId,
  job,
  alreadyFlagged,
}: {
  userId: string;
  profileId: string;
  job: {
    title: string;
    company: string;
    location: string | null;
    source_url: string;
    description: string | null;
  };
  alreadyFlagged: boolean;
}) {
  const supabase = createClient();
  const [flagged, setFlagged] = useState(alreadyFlagged);
  const [saving, setSaving] = useState(false);

  async function flag() {
    setSaving(true);
    const { error } = await supabase.from("exemplars").insert({
      user_id: userId,
      profile_id: profileId,
      title: job.title,
      company: job.company,
      location: job.location,
      source_url: job.source_url,
      description: job.description,
      why_great: "Flagged from a scanned job as an ideal-fit example.",
    });
    if (!error) setFlagged(true);
    setSaving(false);
  }

  if (flagged) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-sm font-medium">
        <Star className="w-3.5 h-3.5 fill-yellow-400" />
        Great fit
      </span>
    );
  }

  return (
    <button
      onClick={flag}
      disabled={saving}
      title="Flag as a great fit — Diana uses these to tune scoring"
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1a2340] hover:bg-[#243056] text-slate-300 hover:text-yellow-400 text-sm font-medium transition-colors disabled:opacity-60"
    >
      <Star className="w-3.5 h-3.5" />
      {saving ? "Flagging…" : "Flag as great fit"}
    </button>
  );
}
