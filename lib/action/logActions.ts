// lib/actions/logActions.ts
"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "./authActions"; // Import từ authActions

// --- Giao diện dữ liệu (Interfaces) ---
interface Log {
    id: string;
    project_id: string;
    log_date: string;
    section: string | null;
    content: string | null;
    images: string[] | null;
    weather: string | null;
    temperature: number | null;
    participants: string | null;
    directive: string | null;
    user_id: string;
    created_at: string;
    updated_at: string;
    projectname?: { name: string } | null;
    creator?: { avatar_url: string | null; name: string } | null;
}

interface ActionResponse {
    success: boolean;
    message?: string;
    error?: string;
}

// --- Project Log Actions ---

/**
 * Lấy danh sách các nhật ký công trình cho một dự án cụ thể.
 */
export async function getLogs(projectId: string): Promise<Log[]> {
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);
    if (!supabase) {
        console.error("Supabase client là null trong getLogs");
        return [];
    }

    const { data, error } = await supabase
        .from("project_logs")
        .select(
            `
            id,
            log_date,
            section,
            content,
            images,
            weather,
            temperature,
            participants,
            directive,
            user_id,
            created_at,
            updated_at,
            projectname:project_id (
                name
            ),
            creator:user_profiles (
                avatar_url,
                name
            )
            `
        )
        .eq("project_id", projectId)
        .order("log_date", { ascending: false });

    if (error) {
        console.error("Lỗi khi lấy nhật ký:", JSON.stringify(error, null, 2));
        return [];
    }

    const normalized = (data as any[]).map((log) => ({
        ...log,
        images: Array.isArray(log.images)
            ? log.images
            : typeof log.images === "string" && log.images
                ? JSON.parse(log.images)
                : [],
    })) as Log[];

    return normalized;
}

/**
 * Tạo một bản ghi nhật ký công trình mới.
 */
export async function createLog(formData: FormData): Promise<ActionResponse> {
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);
    if (!supabase) {
        console.error("Supabase client là null trong createLog");
        return { success: false, error: "Không thể kết nối đến Supabase để tạo log" };
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return { success: false, error: "Bạn cần đăng nhập để thực hiện thao tác này" };
    }

    const projectId = formData.get("project_id") as string;
    const logDate = formData.get("log_date") as string;
    const section = (formData.get("section") as string) || null;
    const content = (formData.get("content") as string) || null;
    const weather = (formData.get("weather") as string) || null;
    const temperature = Number.parseFloat(formData.get("temperature") as string) || null;
    const participants = (formData.get("participants") as string) || null;
    const directive = (formData.get("directive") as string) || null;
    const images = formData.getAll("images") as string[];

    const { error } = await supabase.from("project_logs").insert({
        project_id: projectId,
        log_date: logDate,
        section,
        content,
        images: images.length > 0 ? JSON.stringify(images) : null,
        weather,
        temperature,
        participants,
        directive,
        user_id: currentUser.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    });

    if (error) {
        console.error("Lỗi khi tạo nhật ký:", error.message);
        return { success: false, error: error.message };
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Nhật ký đã được tạo thành công!" };
}