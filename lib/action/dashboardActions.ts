// app/(app)/dashboard/actions.ts
"use server";

import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";



export async function getOverviewStats() {
    const supabase = await createSupabaseServerClient();
    try {
        const { data, error } = await supabase
            .from("overview_statistics")
            .select("*")
            .single();

        if (error) {
            console.error("Lỗi khi tìm nạp thống kê tổng quan:", error);
            return null;
        }

        return data;
    } catch (error) {
        console.error("Lỗi không xác định khi tìm nạp thống kê tổng quan:", error);
        return null;
    }
}

export async function getDesignConsultingActivities() {
    try {
        const supabase = await createSupabaseServerClient();
        const { data, error } = await supabase
            .from("design_consulting")
            .select("task, status, deadline")
            .order("deadline", { ascending: true })
            .limit(5); // Lấy tối đa 5 hoạt động

        if (error) {
            console.error("Lỗi khi tìm nạp các hoạt động tư vấn thiết kế:", error);
            return null;
        }

        return data;
    } catch (error) {
        console.error("Lỗi không xác định khi tìm nạp các hoạt động tư vấn thiết kế:", error);
        return null;
    }
}

export async function getConstructionSupervisionStatus() {
    try {
        const supabase = await createSupabaseServerClient();
        const { data, error } = await supabase
            .from("construction_supervision_status")
            .select("*");

        if (error) {
            console.error("Lỗi khi tìm nạp trạng thái giám sát xây dựng:", error);
            return null;
        }

        return data;
    } catch (error) {
        console.error("Lỗi không xác định khi tìm nạp trạng thái giám sát xây dựng:", error);
        return null;
    }
}

export async function getCivilConstructionProjects() {
    try {
        const supabase = await createSupabaseServerClient();
        const { data, error } = await supabase
            .from("civil_construction_projects")
            .select("*");

        if (error) {
            console.error("Lỗi khi tìm nạp dự án xây dựng dân dụng:", error);
            return null;
        }

        return data;
    } catch (error) {
        console.error("Lỗi không xác định khi tìm nạp dự án xây dựng dân dụng:", error);
        return null;
    }
}

export async function getIndustrialConstructionProjects() {
    try {
        const supabase = await createSupabaseServerClient();
        const { data, error } = await supabase
            .from("industrial_construction_projects")
            .select("*");

        if (error) {
            console.error("Lỗi khi tìm nạp dự án xây dựng công nghiệp:", error);
            return null;
        }

        return data;
    } catch (error) {
        console.error("Lỗi không xác định khi tìm nạp dự án xây dựng công nghiệp:", error);
        return null;
    }
}

export async function getWarrantyTasks() {
    try {
        const supabase = await createSupabaseServerClient();
        const { data, error } = await supabase
            .from("warranty_tasks")
            .select("*");

        if (error) {
            console.error("Lỗi khi tìm nạp nhiệm vụ bảo hành:", error);
            return null;
        }

        return data;
    } catch (error) {
        console.error("Lỗi không xác định khi tìm nạp nhiệm vụ bảo hành:", error);
        return null;
    }
}

export async function getCustomerManagementStats() {
    try {
        const supabase = await createSupabaseServerClient();
        const { data, error } = await supabase
            .from("customers")
            .select(`
                total_customers:count(*),
                new_inquiries:count(CASE WHEN created_at >= NOW() - interval '7 days' THEN 1 END)
            `)
            .single();

        if (error) {
            console.error("Lỗi khi tìm nạp thống kê quản lý khách hàng:", error);
            return null;
        }

        return data;
    } catch (error) {
        console.error("Lỗi không xác định khi tìm nạp thống kê quản lý khách hàng:", error);
        return null;
    }
}

export async function getInventoryLevels() {
    try {
        const supabase = await createSupabaseServerClient();
        const { data, error } = await supabase
            .from("inventory")
            .select("item_name, level");

        if (error) {
            console.error("Lỗi khi tìm nạp mức tồn kho:", error);
            return null;
        }

        return data;
    } catch (error) {
        console.error("Lỗi không xác định khi tìm nạp mức tồn kho:", error);
        return null;
    }
}