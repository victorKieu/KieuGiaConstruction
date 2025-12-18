// lib/actions/supplierActions.ts
"use server";

import { cookies } from "next/headers";
//import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
//import { getCurrentUser } from "./authActions"; // Import từ authActions

// --- Giao diện dữ liệu (Interfaces) ---
interface Supplier {
    id: string; // UUID từ auth.users
    email: string;
    name: string; // Tên công ty/tổ chức
    phone: string | null;
    address: string | null;
    website: string | null;
    created_at: string;
    updated_at: string;
}

interface ActionResponse {
    success: boolean;
    message?: string;
    error?: string;
}

// --- Supplier Actions ---

// Hiện tại, bạn chỉ có `signUpSupplier` trong file gốc.
// Tôi để lại file này để bạn có thể thêm các hàm quản lý nhà cung cấp khác vào đây.
// Ví dụ: getSuppliers, getSupplierById, updateSupplier, deleteSupplier

// Thêm các actions liên quan đến Supplier khác tại đây, ví dụ:
/**
 * Lấy danh sách tất cả nhà cung cấp.
 */
export async function getSuppliers(): Promise<Supplier[]> {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
        console.error("Supabase client là null trong getSuppliers");
        return [];
    }

    const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Lỗi khi lấy danh sách nhà cung cấp:", error.message);
        return [];
    }

    return data as Supplier[];
}