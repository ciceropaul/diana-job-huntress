"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";
import { ExternalLink, EyeOff, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

type Company = Tables<"target_companies">;

const tierLabel: Record<number, string> = {
  1: "Tier 1",
  2: "Tier 2",
  3: "Tier 3",
};

const tierColor: Record<number, string> = {
  1: "text-yellow-400 bg-yellow-400/10",
  2: "text-blue-400 bg-blue-400/10",
  3: "text-slate-400 bg-slate-400/10",
};

export default function CompaniesTable({
  companies: initial,
}: {
  companies: Company[];
}) {
  const supabase = createClient();
  const [companies, setCompanies] = useState(initial);
  const [filter, setFilter] = useState<"all" | "active" | "suppressed">("active");

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

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
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

      <div className="bg-[#0F1629] border border-[#1a2340] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1a2340]">
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">Company</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">Sector</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">Tier</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-500">Open roles</th>
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
                  {company.has_open_role ? (
                    <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-600 inline-block" />
                  )}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button
                    onClick={() => toggleSuppressed(company)}
                    className="text-slate-500 hover:text-slate-300 transition-colors"
                    title={company.suppressed ? "Un-suppress" : "Suppress"}
                  >
                    {company.suppressed ? (
                      <Eye className="w-4 h-4" />
                    ) : (
                      <EyeOff className="w-4 h-4" />
                    )}
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
    </div>
  );
}
