import { createClient } from "@/lib/supabase/client";

const BUCKET_NAME = "project-logs"; // Đổi thành tên bucket của bạn

export async function uploadImagesToSupabase(files: File[], projectId: string): Promise<string[]> {
    const supabase = createClient();
    const urls: string[] = [];
    for (const file of files) {
        const filePath = `${projectId}/${Date.now()}_${file.name}`;
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, file);
        if (error) {
            console.error("Lỗi upload ảnh:", error, error?.message);
            throw new Error("Lỗi upload ảnh: " + (error.message || JSON.stringify(error) || "Unknown error"));
        }
        const url = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath).data.publicUrl;
        urls.push(url);
    }
    return urls;
}