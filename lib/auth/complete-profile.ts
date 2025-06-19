import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function completeProfile({
  auth_user_id,
  role,
  profileData,
}: {
  auth_user_id: string;
  role: string;
  profileData: any;
}) {
  const profileTable = role === "customer" ? "customers" : role === "employee" ? "employees" : "contractors";
  const { data: profile, error: profileError } = await supabase
    .from(profileTable)
    .insert([profileData])
    .select()
    .single();
  if (profileError || !profile) throw profileError || new Error("Insert profile failed");

  // Update profile_id in users table
  const { error: updateError } = await supabase
    .from("users")
    .update({ profile_id: profile.id })
    .eq("auth_user_id", auth_user_id);
  if (updateError) throw updateError;

  return profile;
}