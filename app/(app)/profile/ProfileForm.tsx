"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

type Profile = Tables<"profiles">;

export default function ProfileForm({ profile }: { profile: Profile | null }) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    name: profile?.name ?? "",
    location: profile?.location ?? "",
    positioning_statement: profile?.positioning_statement ?? "",
    skills: Array.isArray(profile?.skills)
      ? (profile.skills as string[]).join(", ")
      : "",
    deal_breakers: profile?.deal_breakers?.join(", ") ?? "",
  });

  function set(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    const skills = form.skills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const deal_breakers = form.deal_breakers
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    await supabase.from("profiles").update({
      name: form.name,
      location: form.location,
      positioning_statement: form.positioning_statement,
      skills,
      deal_breakers,
      updated_at: new Date().toISOString(),
    });

    setSaving(false);
    setSaved(true);
  }

  const field =
    "w-full bg-[#0A0F1E] border border-[#1a2340] rounded-lg px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#1B5E20] text-sm";

  return (
    <div className="bg-[#0F1629] border border-[#1a2340] rounded-xl p-6 space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Full name
          </label>
          <input
            className={field}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Diana Prince"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Location
          </label>
          <input
            className={field}
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
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
          value={form.positioning_statement}
          onChange={(e) => set("positioning_statement", e.target.value)}
          placeholder="2-sentence summary of who you are and what you bring..."
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">
          Skills{" "}
          <span className="text-slate-600">(comma-separated)</span>
        </label>
        <textarea
          className={`${field} resize-none h-20`}
          value={form.skills}
          onChange={(e) => set("skills", e.target.value)}
          placeholder="Python, SQL, dbt, Looker, Tableau, stakeholder management..."
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">
          Deal-breakers{" "}
          <span className="text-slate-600">(comma-separated)</span>
        </label>
        <input
          className={field}
          value={form.deal_breakers}
          onChange={(e) => set("deal_breakers", e.target.value)}
          placeholder="Requires relocation, no remote, requires security clearance..."
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
        {saved && (
          <span className="text-sm text-green-400">Saved ✓</span>
        )}
      </div>
    </div>
  );
}
