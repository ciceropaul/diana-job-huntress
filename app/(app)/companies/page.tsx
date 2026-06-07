import { createClient } from "@/lib/supabase/server";
import CompaniesTable from "./CompaniesTable";

export default async function CompaniesPage() {
  const supabase = await createClient();
  const { data: companies } = await supabase
    .from("target_companies")
    .select("*")
    .order("tier", { ascending: true })
    .order("name");

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Target Companies</h1>
        <p className="text-slate-400 mt-1">
          {companies?.length ?? 0} companies seeded. Diana scans their careers pages daily.
        </p>
      </div>
      <CompaniesTable companies={companies ?? []} />
    </div>
  );
}
