"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";
import { ExternalLink, EyeOff, Eye, Plus, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Company = Tables<"target_companies">;

const tierLabel: Record<number, string> = { 1: "Tier 1", 2: "Tier 2", 3: "Tier 3" };
const tierColor: Record<number, string> = {
  1: "text-yellow-400 bg-yellow-400/10",
  2: "text-blue-400 bg-blue-400/10",
  3: "text-slate-400 bg-slate-400/10",
};

type FormState = {
  name: string;
  careers_url: string;
  sector: string;
  tier: number;
  notes: string;
};

const emptyForm: FormState = {
  name: "",
  careers_url: "",
  sector: "",
  tier: 2,
  notes: "",
};

export default function CompaniesTable({
  companies: initial,
  userId,
  profileId,
}: {
  companies: Company[];
  userId: string;
  profileId: string;
}) {
  const supabase = createClient();
  const [companies, setCompanies] = useState(initial);
  const [filter, setFilter] = useState<"all" | "active" | "suppressed">("active");

  // Modal state: null = closed, "new" = add, otherwise editing that company
  const [editing, setEditing] = useState<Company | "new" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  function openNew() {
    setForm(emptyForm);
    setEditing("new");
  }

  function openEdit(c: Company) {
    setForm({
      name: c.name,
      careers_url: c.careers_url ?? "",
      sector: c.sector ?? "",
      tier: c.tier ?? 2,
      notes: c.notes ?? "",
    });
    setEditing(c);
  }

  async function save() {
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      careers_url: form.careers_url.trim() || null,
      sector: form.sector.trim() || null,
      tier: form.tier,
      notes: form.notes.trim() || null,
    };

    if (editing === "new") {
      const { data, error } = await supabase
        .from("target_companies")
        .insert({ ...payload, user_id: userId, profile_id: profileId })
        .select()
        .single();
      if (!error && data) {
        setCompanies((prev) =>
          [...prev, data].sort(
            (a, b) =>
              (a.tier ?? 9) - (b.tier ?? 9) || a.name.localeCompare(b.name)
          )
        );
      }
    } else if (editing) {
      const { data, error } = await supabase
        .from("target_companies")
        .update(payload)
        .eq("id", editing.id)
        .select()
        .single();
      if (!error && data) {
        setCompanies((prev) =>
          prev
            .map((c) => (c.id === data.id ? data : c))
            .sort(
              (a, b) =>
                (a.tier ?? 9) - (b.tier ?? 9) || a.name.localeCompare(b.name)
            )
        );
      }
    }
    setSaving(false);
    setEditing(null);
  }

  async function toggleSuppressed(company: Company) {
    const next = !company.suppressed;
    await supabase
      .from("target_companies")
      .update({ suppressed: next })
      .eq("id", company.id);
    setCompanies((prev) =>
      prev.map((c) => (c.id === company.id ? { ...c, suppressed: next } : c))
    );
  }

  const filtered = companies.filter((c) => {
    if (filter === "active") return !c.suppressed;
    if (filter === "suppressed") return c.suppressed;
    return true;
  });

  const field =
    "w-full bg-[#0A0F1E] border border-[#1a2340] rounded-lg px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#1B5E20] text-sm";

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex gap-2">
          {(["active", "suppressed", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-medium capitalize transition-colors",
                filter === f
                  ? "bg-[#1B5E20] text-white"
                  : "bg-[#1a2340] text-slate-400 hover:text-white"
              )}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#1B5E20] hover:bg-[#2E7D32] text-white rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add company
        </button>
      </div>

      {/* Table (desktop) */}
      <div className="hidden sm:block bg-[#0F1629] border border-[#1a2340] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1a2340]">
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">Company</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">Sector</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">Tier</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">Open</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((company) => (
              <tr
                key={company.id}
                className={cn(
                  "border-b border-[#1a2340] last:border-0 transition-colors",
                  company.suppressed ? "opacity-40" : "hover:bg-white/[0.02]"
                )}
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{company.name}</span>
                    {company.careers_url && (
                      <a
                        href={company.careers_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-600 hover:text-slate-400"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3.5 text-slate-400">{company.sector ?? "—"}</td>
                <td className="px-5 py-3.5">
                  {company.tier ? (
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium",
                        tierColor[company.tier]
                      )}
                    >
                      {tierLabel[company.tier]}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full inline-block",
                      company.has_open_role ? "bg-green-400" : "bg-slate-600"
                    )}
                  />
                </td>
                <td className="px-5 py-3.5 text-right whitespace-nowrap">
                  <button
                    onClick={() => openEdit(company)}
                    className="text-slate-500 hover:text-slate-300 transition-colors mr-3"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleSuppressed(company)}
                    className="text-slate-500 hover:text-slate-300 transition-colors"
                    title={company.suppressed ? "Un-suppress" : "Suppress"}
                  >
                    {company.suppressed ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-slate-500 text-sm">
            No companies in this view.
          </div>
        )}
      </div>

      {/* Cards (mobile) */}
      <div className="sm:hidden space-y-3">
        {filtered.map((company) => (
          <div
            key={company.id}
            className={cn(
              "bg-[#0F1629] border border-[#1a2340] rounded-xl p-4",
              company.suppressed && "opacity-40"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{company.name}</span>
                  {company.careers_url && (
                    <a
                      href={company.careers_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-600"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{company.sector ?? "—"}</p>
              </div>
              {company.tier && (
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0",
                    tierColor[company.tier]
                  )}
                >
                  {tierLabel[company.tier]}
                </span>
              )}
            </div>
            <div className="flex gap-4 mt-3 pt-3 border-t border-[#1a2340]">
              <button
                onClick={() => openEdit(company)}
                className="text-xs text-slate-400 flex items-center gap-1.5"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                onClick={() => toggleSuppressed(company)}
                className="text-xs text-slate-400 flex items-center gap-1.5"
              >
                {company.suppressed ? (
                  <>
                    <Eye className="w-3.5 h-3.5" /> Un-suppress
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5" /> Suppress
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="py-12 text-center text-slate-500 text-sm">
            No companies in this view.
          </div>
        )}
      </div>

      {/* Add/Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setEditing(null)}
          />
          <div className="relative w-full max-w-lg bg-[#0F1629] border border-[#1a2340] rounded-xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">
                {editing === "new" ? "Add company" : "Edit company"}
              </h2>
              <button
                onClick={() => setEditing(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Name</label>
                <input
                  className={field}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Company name"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Careers URL</label>
                <input
                  className={field}
                  value={form.careers_url}
                  onChange={(e) => setForm({ ...form, careers_url: e.target.value })}
                  placeholder="https://company.com/careers"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Sector</label>
                  <input
                    className={field}
                    value={form.sector}
                    onChange={(e) => setForm({ ...form, sector: e.target.value })}
                    placeholder="e.g. Travel Tech"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Tier</label>
                  <select
                    className={field}
                    value={form.tier}
                    onChange={(e) => setForm({ ...form, tier: parseInt(e.target.value, 10) })}
                  >
                    <option value={1}>Tier 1</option>
                    <option value={2}>Tier 2</option>
                    <option value={3}>Tier 3</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Notes</label>
                <textarea
                  className={`${field} resize-none h-20`}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Why this company is a target..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2.5 text-slate-400 hover:text-white text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving || !form.name.trim()}
                className="px-6 py-2.5 bg-[#1B5E20] hover:bg-[#2E7D32] text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {saving ? "Saving…" : editing === "new" ? "Add" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
