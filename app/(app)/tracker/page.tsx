import { createClient } from "@/lib/supabase/server";
import { getActiveProfile } from "@/lib/profile";
import KanbanBoard from "./KanbanBoard";

export default async function TrackerPage() {
  const supabase = await createClient();
  const profile = await getActiveProfile(supabase);

  const { data: applications } = await supabase
    .from("applications")
    .select("*, job_listings(title, company, source_url)")
    .eq("profile_id", profile?.id ?? "")
    .order("status_updated_at", { ascending: false });

  return (
    <div className="p-5 sm:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Application Tracker</h1>
        <p className="text-slate-400 mt-1">Drag cards between columns to update status.</p>
      </div>
      <KanbanBoard applications={applications ?? []} />
    </div>
  );
}
