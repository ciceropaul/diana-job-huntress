"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

type Settings = Tables<"settings">;

export default function SettingsForm({ settings }: { settings: Settings | null }) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    scan_time: settings?.scan_time ?? "06:00",
    digest_enabled: settings?.digest_enabled ?? true,
    digest_recipient: settings?.digest_recipient ?? "",
    digest_min_score: settings?.digest_min_score ?? 7,
  });

  function set<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    await supabase.from("settings").update({
      scan_time: form.scan_time,
      digest_enabled: form.digest_enabled,
      digest_recipient: form.digest_recipient,
      digest_min_score: form.digest_min_score,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    setSaved(true);
  }

  const input =
    "w-full bg-[#0A0F1E] border border-[#1a2340] rounded-lg px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#1B5E20] text-sm";

  return (
    <div className="bg-[#0F1629] border border-[#1a2340] rounded-xl p-6 space-y-6">
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5">
          Daily scan time (UTC)
        </label>
        <input
          type="time"
          className={input}
          value={form.scan_time}
          onChange={(e) => set("scan_time", e.target.value)}
        />
        <p className="text-xs text-slate-600 mt-1">
          The Vercel cron runs at this time each day.
        </p>
      </div>

      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only"
              checked={form.digest_enabled}
              onChange={(e) => set("digest_enabled", e.target.checked)}
            />
            <div
              className={`w-10 h-6 rounded-full transition-colors ${
                form.digest_enabled ? "bg-[#1B5E20]" : "bg-[#1a2340]"
              }`}
            />
            <div
              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                form.digest_enabled ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </div>
          <span className="text-sm text-white">Email digest enabled</span>
        </label>
      </div>

      {form.digest_enabled && (
        <>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Digest recipient email
            </label>
            <input
              type="email"
              className={input}
              value={form.digest_recipient}
              onChange={(e) => set("digest_recipient", e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Minimum score to include in digest (1–10)
            </label>
            <input
              type="number"
              min={1}
              max={10}
              className={`${input} w-24`}
              value={form.digest_min_score}
              onChange={(e) => set("digest_min_score", parseInt(e.target.value, 10))}
            />
          </div>
        </>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={save}
          disabled={saving}
          className="px-6 py-2.5 bg-[#1B5E20] hover:bg-[#2E7D32] text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
        {saved && <span className="text-sm text-green-400">Saved ✓</span>}
      </div>
    </div>
  );
}
