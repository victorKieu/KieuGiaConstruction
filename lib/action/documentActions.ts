"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentSession } from "@/lib/supabase/session";
import { isValidUUID } from "@/lib/utils/uuid";
import { DocumentData } from "@/types/project";
import { ActionFormState, ActionFetchResult } from "./projectActions";

export async function getProjectDocuments(projectId: string): Promise<ActionFetchResult<DocumentData[]>> {
    if (!isValidUUID(projectId)) return { data: null, error: { message: "ID không hợp lệ", code: "400" } };

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("project_documents")
        .select(`id, name, type, url, uploaded_at, project_id, description, category, uploaded_by:employees!project_documents_uploaded_by_fkey ( name )`)
        .eq("project_id", projectId);

    if (error) return { data: null, error: { message: error.message, code: error.code } };

    const documentsData: DocumentData[] = (data || []).map((item: any) => ({
        ...item,
        uploaded_by: Array.isArray(item.uploaded_by) ? item.uploaded_by[0] : item.uploaded_by || { name: "N/A" }
    }));

    return { data: documentsData, error: null };
}

export async function uploadDocument(prevState: ActionFormState, formData: FormData): Promise<ActionFormState> {
    const session = await getCurrentSession();
    if (!session.isAuthenticated) return { success: false, error: "Chưa đăng nhập." };

    const projectId = formData.get("projectId") as string;
    const file = formData.get("document_file") as File;
    const name = (formData.get("name") as string)?.trim();
    const category = (formData.get("category") as string)?.trim() || 'others';

    if (!projectId || !file || !name) return { success: false, error: "Thiếu thông tin." };

    const supabase = await createSupabaseServerClient();
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    const filePath = `${projectId}/${category}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const bucketName = 'project-documents';

    const { error: uploadError } = await supabase.storage.from(bucketName).upload(filePath, file);
    if (uploadError) return { success: false, error: `Lỗi upload: ${uploadError.message}` };

    const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);

    const { error: insertError } = await supabase.from("project_documents").insert({
        project_id: projectId,
        name: name,
        description: formData.get("description") as string,
        type: fileExt,
        url: urlData.publicUrl,
        uploaded_by: session.entityId,
        category: category,
    });

    if (insertError) {
        await supabase.storage.from(bucketName).remove([filePath]);
        return { success: false, error: insertError.message };
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Tải tài liệu thành công!" };
}

export async function updateDocument(prevState: ActionFormState, formData: FormData): Promise<ActionFormState> {
    const session = await getCurrentSession();
    if (!session.isAuthenticated) return { success: false, error: "Auth required" };

    const documentId = formData.get("documentId") as string;
    const projectId = formData.get("projectId") as string;

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("project_documents").update({
        name: formData.get("name"),
        description: formData.get("description"),
        category: formData.get("category"),
    }).eq("id", documentId);

    if (error) return { success: false, error: error.message };
    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Cập nhật thành công!" };
}

export async function deleteDocument(prevState: ActionFormState, formData: FormData): Promise<ActionFormState> {
    const session = await getCurrentSession();
    if (!session.isAuthenticated) return { success: false, error: "Auth required" };

    const documentId = formData.get("documentId") as string;
    const projectId = formData.get("projectId") as string;
    const supabase = await createSupabaseServerClient();

    const { data: doc } = await supabase.from("project_documents").select("url").eq("id", documentId).single();
    const { error } = await supabase.from("project_documents").delete().eq("id", documentId);

    if (error) return { success: false, error: error.message };

    if (doc?.url) {
        const bucketName = 'project-documents';
        const filePath = doc.url.split(`${bucketName}/`)[1];
        if (filePath) await supabase.storage.from(bucketName).remove([filePath]);
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã xóa tài liệu." };
}