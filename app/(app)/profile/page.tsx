import { createClient } from "@/lib/supabase/server";
import { getActiveProfile } from "@/lib/profile";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  const supabase = await createClient();
  const profile = await getActiveProfile(supabase);

  return (
    <div className="p-5 sm:p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Profile</h1>
        <p className="text-slate-400 mt-1">
          This is what Diana uses when scoring jobs and writing cover letters for{" "}
          <span className="text-slate-200">{profile?.name?.trim() || "this profile"}</span>.
        </p>
      </div>
      <ProfileForm profile={profile} />
    </div>
  );
}
