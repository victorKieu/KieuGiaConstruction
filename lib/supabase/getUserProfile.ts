import { createSupabaseServerClient } from "./server";

export interface UserProfile {
    id: string;
    email: string;
    name: string; // Đã đổi từ full_name thành name
    phone?: string | null;
    address?: string | null;
    avatar_url?: string | null;
    position?: string | null;
    department?: string | null;
    code?: string | null;
    hire_date?: string | null;
    status?: string | null;
}

export async function getUserProfile(): Promise<UserProfile | null> {
    const supabase = await createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('employees')
        .select(`
      id,
      email,
      name,  
      phone,
      address,
      avatar_url,
      position,
      code,
      hire_date,
      status,
      departments (
        name
      )
    `)
        .eq('id', user.id)
        .single();

    if (error || !data) {
        console.error("Error fetching profile:", error);
        return null;
    }

    // Không cần map dòng này nữa, gán trực tiếp
    const profile: UserProfile = {
        id: data.id,
        email: data.email,
        name: data.name, // Sử dụng trực tiếp name
        phone: data.phone,
        address: data.address,
        avatar_url: data.avatar_url,
        position: data.position,
        department: Array.isArray(data.departments) ? data.departments[0]?.name : (data.departments as any)?.name || "Chưa cập nhật",
        code: data.code,
        hire_date: data.hire_date,
        status: data.status
    };

    return profile;
}