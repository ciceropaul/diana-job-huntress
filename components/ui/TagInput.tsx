"use client";

import { useState, type KeyboardEvent } from "react";
import { Plus, X } from "lucide-react";

export default function TagInput({
  items,
  onChange,
  placeholder,
  accent = "green",
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  accent?: "green" | "red";
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const v = draft.trim();
    if (!v) return;
    if (items.includes(v)) {
      setDraft("");
      return;
    }
    onChange([...items, v]);
    setDraft("");
  }

  function remove(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      add();
    }
  }

  const chip =
    accent === "green"
      ? "bg-green-500/10 text-green-300 border-green-500/30"
      : "bg-red-500/10 text-red-300 border-red-500/30";

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2.5">
        {items.map((item, idx) => (
          <span
            key={`${item}-${idx}`}
            className={`inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full border text-xs ${chip}`}
          >
            {item}
            <button
              type="button"
              onClick={() => remove(idx)}
              className="hover:bg-white/10 rounded-full p-0.5 transition-colors"
              aria-label={`Remove ${item}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {items.length === 0 && (
          <span className="text-xs text-slate-600 py-1.5">Nothing added yet.</span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-[#0A0F1E] border border-[#1a2340] rounded-lg px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#1B5E20] text-sm"
        />
        <button
          type="button"
          onClick={add}
          className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 bg-[#1a2340] hover:bg-[#243056] text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>
    </div>
  );
}
