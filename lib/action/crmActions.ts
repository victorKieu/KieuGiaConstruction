// lib/actions/crmActions.ts
"use server";

import { cookies } from "next/headers";
//import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
//import { getCurrentUser } from "./authActions"; // Import từ authActions

// --- Giao diện dữ liệu (Interfaces) ---
interface Customer {
    id: string; // UUID từ auth.users
    email: string;
    name: string;
    code: string | null;
    phone: string | null;
    address: string | null;
    status: string | null;
    tag_id: string | null;
    created_at: string;
    updated_at: string;
}

interface ActionResponse {
    success: boolean;
    message?: string;
    error?: string;
}

// --- CRM Actions (Customers) ---

/**
 * Lấy danh sách khách hàng chỉ với id, name, code để sử dụng trong các dropdown.
 */
export async function getCustomersForDropdown(): Promise<{ id: string; name: string; code: string | null }[]> {
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);
    if (!supabase) {
        console.error("Supabase client là null trong getCustomersForDropdown");
        return [];
    }

    const { data, error } = await supabase
        .from("customers")
        .select("id, name, code")
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Lỗi khi lấy khách hàng cho dropdown:", error.message);
        return [];
    }

    return data || [];
}

/**
 * Lấy danh sách khách hàng đầy đủ, có thể áp dụng các bộ lọc.
 */
export async function getCustomerList(filters: { search?: string; status?: string; tag?: string } = {}): Promise<Customer[]> {
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);
    if (!supabase) {
        console.error("Supabase client là null trong getCustomerList");
        return [];
    }

    let query = supabase.from("customers").select("*").order("created_at", { ascending: false });

    if (filters.search) {
        query = query.ilike("name", `%${filters.search}%`);
    }

    if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
    }

    if (filters.tag && filters.tag !== "all") {
        query = query.eq("tag_id", filters.tag);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Lỗi khi lấy danh sách khách hàng:", error.message);
        return [];
    }

    return data as Customer[];
}

/**
 * Lấy danh sách khách hàng gần đây nhất.
 */
export async function getRecentCustomers(): Promise<Customer[]> {
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);
    if (!supabase) {
        console.error("Supabase client là null trong getRecentCustomers");
        return [];
    }

    const { data, error } = await supabase
        .from("customers")
        .select("id, name, email, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

    if (error) {
        console.error("Lỗi khi lấy khách hàng gần đây:", error.message);
        return [];
    }

    return data as Customer[];
}

/**
 * Lấy thông tin chi tiết của một khách hàng theo ID.
 * Trả về cả dữ liệu và lỗi để dễ xử lý trong UI hoặc API.
 */
export async function getCustomerById(id: string): Promise<{ data: Customer | null; error: string | null }> {
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);

    if (!supabase) {
        console.error("Supabase client là null trong getCustomerById");
        return { data: null, error: "Không thể kết nối đến Supabase" };
    }

    const { data, error } = await supabase
        .from("customers")
        .select("*, customer_tags(name)") // nếu bạn có bảng tags liên kết
        .eq("tag_id", id)
        .maybeSingle();

    if (error) {
        console.error("Lỗi khi lấy thông tin khách hàng:", error.message);
        return { data: null, error: error.message };
    }

    if (!data) {
        return { data: null, error: "Không tìm thấy khách hàng với ID đã cung cấp" };
    }

    return { data, error: null };
}

// - createCustomerActivity
// - getCustomerActivities
