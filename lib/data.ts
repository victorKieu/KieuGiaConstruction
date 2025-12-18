import { createSupabaseServerClient } from "@/lib/supabase/server";
import supabase from '@/lib/supabase/client';
import { cookies } from "next/headers";

type ProjectMember = {
    employee_id: string;
    role: string;
    users: {
        name: string;
        email: string;
    };
};

type Employee = {
    id: string;
    name: string;
    email: string;
    // thêm các trường khác nếu cần
};

// Lấy danh sách thành viên dự án (bao gồm employee_id, role, users: { name, email })
export async function getProjectMembers(projectId: string) {
    console.log("[DEBUG] Fetching members for project:", projectId);
    const { data, error } = await supabase
        .from("project_members")
        .select("*") // hoặc select đúng fields bạn cần
        .eq("project_id", projectId);

    if (error) {
        console.error("[ Server ] Error fetching project members:", error, error.message, error.details);
        throw error;
    }
    if (!data) {
        console.error("[ Server ] No data returned for project members");
        return [];
    }

    return data;
}
// Lấy danh sách employee toàn hệ thống (id, name, email)
export async function getAllEmployees(): Promise<Employee[]> {
    
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
        .from("employees")
        .select("id, name, email");

    if (error || !data) {
        console.error("Error fetching all employees:", { data, error });
        return [];
    }

    return data;
}