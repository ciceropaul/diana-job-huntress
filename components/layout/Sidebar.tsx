"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";
import ProfileSwitcher from "./ProfileSwitcher";
import {
  LayoutDashboard,
  User as UserIcon,
  Building2,
  Briefcase,
  KanbanSquare,
  Settings,
  LogOut,
  Search,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profile", label: "Profile", icon: UserIcon },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/tracker", label: "Tracker", icon: KanbanSquare },
  { href: "/settings", label: "Settings", icon: Settings },
];

type ProfileLite = { id: string; name: string | null };

function NavContent({
  user,
  profiles,
  activeProfileId,
  onNavigate,
}: {
  user: User;
  profiles: ProfileLite[];
  activeProfileId: string | null;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Logo */}
      <div className="px-6 py-5 border-b border-[#1a2340]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#1B5E20]/30 border border-[#1B5E20]/50 flex items-center justify-center">
            <Search className="w-4 h-4 text-[#4CAF50]" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">Diana</span>
        </div>
      </div>

      {/* Profile switcher */}
      <ProfileSwitcher profiles={profiles} activeId={activeProfileId} />

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-[#1B5E20]/20 text-[#4CAF50] border border-[#1B5E20]/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User + sign out */}
      <div className="px-3 py-4 border-t border-[#1a2340]">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-[#1B5E20]/30 border border-[#1B5E20]/50 flex items-center justify-center text-xs text-[#4CAF50] font-bold">
            {user.email?.[0]?.toUpperCase() ?? "D"}
          </div>
          <span className="text-xs text-slate-400 truncate">{user.email}</span>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </>
  );
}

export default function Sidebar({
  user,
  profiles,
  activeProfileId,
}: {
  user: User;
  profiles: ProfileLite[];
  activeProfileId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 flex-shrink-0 bg-[#0F1629] border-r border-[#1a2340] flex-col">
        <NavContent user={user} profiles={profiles} activeProfileId={activeProfileId} />
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 bg-[#0F1629] border-b border-[#1a2340] flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#1B5E20]/30 border border-[#1B5E20]/50 flex items-center justify-center">
            <Search className="w-3.5 h-3.5 text-[#4CAF50]" />
          </div>
          <span className="text-white font-bold tracking-tight">Diana</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="p-2 text-slate-300 hover:text-white"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-[#0F1629] border-r border-[#1a2340] flex flex-col">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-3 p-2 text-slate-400 hover:text-white z-10"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
            <NavContent
              user={user}
              profiles={profiles}
              activeProfileId={activeProfileId}
              onNavigate={() => setOpen(false)}
            />
          </aside>
        </div>
      )}
    </>
  );
}
