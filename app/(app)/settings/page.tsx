import { createClient } from "@/lib/supabase/server";
import { getActiveProfile } from "@/lib/profile";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
  const supabase = await createClient();
  const profile = await getActiveProfile(supabase);

  const { data: settings } = await supabase
    .from("settings")
    .select("*")
    .eq("profile_id", profile?.id ?? "")
    .maybeSingle();

  return (
    <div className="p-5 sm:p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 mt-1">
          Daily scan &amp; email digest for{" "}
          <span className="text-slate-200">{profile?.name?.trim() || "this profile"}</span>.
        </p>
      </div>
      <SettingsForm settings={settings} />
    </div>
  );
}
