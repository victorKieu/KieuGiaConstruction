import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function registerUser({ email, password, role }: { email: string, password: string, role: string }) {
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { role } }
  });
  if (signUpError || !signUpData.user) throw signUpError || new Error("Không tạo được auth user");

  const { data: usersData, error: usersError } = await supabase
    .from("users")
    .insert([{ auth_user_id: signUpData.user.id, role }])
    .select()
    .single();
  if (usersError || !usersData) throw usersError || new Error("Không tạo được users row");

  return { authUser: signUpData.user, usersRow: usersData };
}