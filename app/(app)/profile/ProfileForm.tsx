"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";
import TagInput from "@/components/ui/TagInput";

type Profile = Tables<"profiles">;

export default function ProfileForm({ profile }: { profile: Profile | null }) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState(profile?.name ?? "");
  const [location, setLocation] = useState(profile?.location ?? "");
  const [positioning, setPositioning] = useState(
    profile?.positioning_statement ?? ""
  );
  const [skills, setSkills] = useState(
    Array.isArray(profile?.skills) ? (profile.skills as string[]).join(", ") : ""
  );
  const [dealBreakers, setDealBreakers] = useState<string[]>(
    profile?.deal_breakers ?? []
  );
  const [greenFlags, setGreenFlags] = useState<string[]>(
    profile?.green_flags ?? []
  );

  function dirty() {
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    const skillsArr = skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    await supabase
      .from("profiles")
      .update({
        name,
        location,
        positioning_statement: positioning,
        skills: skillsArr,
        deal_breakers: dealBreakers,
        green_flags: greenFlags,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", profile!.user_id);

    setSaving(false);
    setSaved(true);
  }

  const field =
    "w-full bg-[#0A0F1E] border border-[#1a2340] rounded-lg px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#1B5E20] text-sm";

  return (
    <div className="bg-[#0F1629] border border-[#1a2340] rounded-xl p-5 sm:p-6 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Candidate name
          </label>
          <input
            className={field}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              dirty();
            }}
            placeholder="Stella Bennett"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Location
          </label>
          <input
            className={field}
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              dirty();
            }}
            placeholder="New York, NY"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">
          Positioning statement
        </label>
        <textarea
          className={`${field} resize-none h-28`}
          value={positioning}
          onChange={(e) => {
            setPositioning(e.target.value);
            dirty();
          }}
          placeholder="2-3 sentence summary of who you are and what you bring..."
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">
          Skills <span className="text-slate-600">(comma-separated)</span>
        </label>
        <textarea
          className={`${field} resize-none h-20`}
          value={skills}
          onChange={(e) => {
            setSkills(e.target.value);
            dirty();
          }}
          placeholder="Video production, Runway AI, social media, copywriting..."
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-green-400 mb-2">
          Green flags <span className="text-slate-500 font-normal">— things she wants</span>
        </label>
        <TagInput
          items={greenFlags}
          onChange={(v) => {
            setGreenFlags(v);
            dirty();
          }}
          placeholder="e.g. Intentional, people-first culture"
          accent="green"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-red-400 mb-2">
          Deal-breakers <span className="text-slate-500 font-normal">— things to avoid</span>
        </label>
        <TagInput
          items={dealBreakers}
          onChange={(v) => {
            setDealBreakers(v);
            dirty();
          }}
          placeholder="e.g. Requires 5+ years experience"
          accent="red"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={save}
          disabled={saving}
          className="px-6 py-2.5 bg-[#1B5E20] hover:bg-[#2E7D32] text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
        {saved && <span className="text-sm text-green-400">Saved ✓</span>}
      </div>
    </div>
  );
}
