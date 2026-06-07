"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, Plus, Check, UserCircle2 } from "lucide-react";

type ProfileLite = { id: string; name: string | null };

export default function ProfileSwitcher({
  profiles,
  activeId,
}: {
  profiles: ProfileLite[];
  activeId: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  const active = profiles.find((p) => p.id === activeId) ?? profiles[0];
  const label = (p?: ProfileLite) => p?.name?.trim() || "Untitled profile";

  async function switchTo(id: string) {
    if (id === activeId) {
      setOpen(false);
      return;
    }
    setBusy(true);
    await fetch("/api/profile/active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: id }),
    });
    setOpen(false);
    setBusy(false);
    router.push("/dashboard");
    router.refresh();
  }

  async function addProfile() {
    if (!newName.trim()) return;
    setBusy(true);
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    setBusy(false);
    if (res.ok) {
      setNewName("");
      setAdding(false);
      setOpen(false);
      router.push("/profile");
      router.refresh();
    }
  }

  return (
    <div className="relative px-3 py-3 border-b border-[#1a2340]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-[#0A0F1E] border border-[#1a2340] hover:border-[#1B5E20]/40 transition-colors"
      >
        <UserCircle2 className="w-5 h-5 text-[#4CAF50] flex-shrink-0" />
        <div className="flex-1 min-w-0 text-left">
          <div className="text-xs text-slate-500">Profile</div>
          <div className="text-sm text-white truncate">{label(active)}</div>
        </div>
        <ChevronsUpDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-3 right-3 mt-2 z-20 bg-[#0F1629] border border-[#1a2340] rounded-lg shadow-2xl overflow-hidden">
            <div className="max-h-64 overflow-y-auto py-1">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => switchTo(p.id)}
                  disabled={busy}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5 transition-colors text-left"
                >
                  <span className="flex-1 truncate">{label(p)}</span>
                  {p.id === activeId && <Check className="w-4 h-4 text-[#4CAF50]" />}
                </button>
              ))}
            </div>

            <div className="border-t border-[#1a2340] p-2">
              {adding ? (
                <div className="space-y-2">
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addProfile()}
                    placeholder="New profile name"
                    className="w-full bg-[#0A0F1E] border border-[#1a2340] rounded-md px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-[#1B5E20]"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={addProfile}
                      disabled={busy || !newName.trim()}
                      className="flex-1 px-3 py-1.5 bg-[#1B5E20] hover:bg-[#2E7D32] text-white rounded-md text-xs font-semibold disabled:opacity-60"
                    >
                      {busy ? "Creating…" : "Create"}
                    </button>
                    <button
                      onClick={() => {
                        setAdding(false);
                        setNewName("");
                      }}
                      className="px-3 py-1.5 text-slate-400 hover:text-white text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAdding(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#4CAF50] hover:bg-white/5 rounded-md transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add profile
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
