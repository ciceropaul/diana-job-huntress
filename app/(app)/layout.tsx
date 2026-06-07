import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { getActiveProfile, listProfiles } from "@/lib/profile";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [profiles, active] = await Promise.all([
    listProfiles(supabase),
    getActiveProfile(supabase),
  ]);

  return (
    <div className="flex h-screen bg-[#0A0F1E] overflow-hidden">
      <Sidebar
        user={user}
        profiles={profiles.map((p) => ({ id: p.id, name: p.name }))}
        activeProfileId={active?.id ?? null}
      />
      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">{children}</main>
    </div>
  );
}
