import { createClient } from "@/lib/supabase/server";
import { getActiveProfile } from "@/lib/profile";
import CompaniesTable from "./CompaniesTable";

export default async function CompaniesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = await getActiveProfile(supabase);

  const { data: companies } = await supabase
    .from("target_companies")
    .select("*")
    .eq("profile_id", profile?.id ?? "")
    .order("tier", { ascending: true })
    .order("name");

  return (
    <div className="p-5 sm:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Target Companies</h1>
        <p className="text-slate-400 mt-1">
          {companies?.length ?? 0} companies. Diana scans their careers pages daily.
        </p>
      </div>
      <CompaniesTable
        companies={companies ?? []}
        userId={user!.id}
        profileId={profile?.id ?? ""}
      />
    </div>
  );
}
