"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

// Helper để tạo client
const getClient = async () => await createSupabaseServerClient();

// 1. Lấy số liệu SẢN XUẤT (Projects) - Query trực tiếp
export async function getProductionStats() {
    const supabase = await getClient();

    try {
        // Đếm tổng dự án
        const { count: total } = await supabase.from("projects").select("*", { count: "exact", head: true });

        // Đếm dự án hoàn thành (status = 'completed')
        const { count: completed } = await supabase.from("projects").select("*", { count: "exact", head: true }).eq("status", "completed");

        // Đếm dự án đang chạy (status = 'processing' hoặc 'construction')
        const { count: active } = await supabase.from("projects").select("*", { count: "exact", head: true }).in("status", ["processing", "construction"]);

        // Đếm dự án sắp chạy (status = 'planning')
        const { count: planning } = await supabase.from("projects").select("*", { count: "exact", head: true }).eq("status", "planning");

        return {
            total_projects: total || 0,
            completed_projects: completed || 0,
            active_projects: active || 0,
            planning_projects: planning || 0,
            delayed_projects: 0, // Tạm thời để 0, logic chậm tiến độ cần so sánh ngày
            total_revenue: 0,    // Cần bảng contracts để tính
            total_cost: 0        // Cần bảng expenses để tính
        };
    } catch (error) {
        console.error("Lỗi Production Stats:", error);
        return null;
    }
}

// 2. Lấy số liệu CRM (Customers) - Query trực tiếp
export async function getCRMStats() {
    const supabase = await getClient();

    try {
        // Tổng khách
        const { count: total } = await supabase.from("customers").select("*", { count: "exact", head: true });

        // Khách đang đàm phán (status = 'negotiating')
        const { count: negotiating } = await supabase.from("customers").select("*", { count: "exact", head: true }).eq("status", "negotiating");

        // Khách mới trong tháng này
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        const { count: newLeads } = await supabase.from("customers").select("*", { count: "exact", head: true }).gte("created_at", startOfMonth);

        // Tính tỷ lệ chuyển đổi (Signed / Total)
        const { count: signed } = await supabase.from("customers").select("*", { count: "exact", head: true }).eq("status", "signed");
        const conversion_rate = total && total > 0 ? ((signed || 0) / total) * 100 : 0;

        return {
            total_customers: total || 0,
            new_leads_month: newLeads || 0,
            negotiating_count: negotiating || 0,
            conversion_rate: conversion_rate
        };
    } catch (error) {
        console.error("Lỗi CRM Stats:", error);
        return null;
    }
}

// 3. Lấy nguồn khách hàng (Biểu đồ tròn)
export async function getCustomerSourceStats() {
    const supabase = await getClient();

    // Lấy source_id của tất cả khách hàng
    const { data: customers } = await supabase.from("customers").select("source_id");

    if (!customers || customers.length === 0) return [];

    // Lấy bảng từ điển để map tên nguồn
    const { data: dicts } = await supabase.from("sys_dictionaries").select("id, name, color").in("type", ["customer_source", "source"]); // Check lại type trong DB của bạn

    const statsMap = new Map<string, number>();
    const dictMap = new Map<string, { name: string, color: string }>();

    dicts?.forEach(d => dictMap.set(d.id, { name: d.name, color: d.color || "#cccccc" }));

    let unknownCount = 0;
    customers.forEach(c => {
        if (c.source_id && dictMap.has(c.source_id)) {
            statsMap.set(c.source_id, (statsMap.get(c.source_id) || 0) + 1);
        } else {
            unknownCount++;
        }
    });

    const result = Array.from(statsMap.entries()).map(([id, count]) => ({
        name: dictMap.get(id)?.name || "N/A",
        value: count,
        fill: dictMap.get(id)?.color || "#8884d8"
    }));

    if (unknownCount > 0) {
        result.push({ name: "Khác", value: unknownCount, fill: "#94a3b8" });
    }

    return result;
}

// 4. Các hàm phụ trợ khác (Giữ nguyên logic cũ nhưng thêm try-catch)
export async function getDashboardSummary() { return {}; } // Placeholder

export async function getRecentCustomers() {
    const supabase = await getClient();
    const { data } = await supabase.from("customers").select("*").order("created_at", { ascending: false }).limit(5);
    return data || [];
}

export async function getLowStockItems() {
    const supabase = await getClient();
    // Chú ý: đảm bảo bảng project_inventory và warehouses tồn tại
    try {
        const { data } = await supabase
            .from("project_inventory")
            .select("id, item_name, unit, quantity_on_hand, warehouse:warehouses(name)") // warehouse là tên relation
            .lt("quantity_on_hand", 10)
            .limit(5);
        return data || [];
    } catch (e) { return []; }
}

export async function getRecentWarehouseActivity() {
    const supabase = await getClient();
    try {
        const { data: receipts } = await supabase.from("goods_receipts").select("id, code:purchase_orders(code), created_at, notes").order("created_at", { ascending: false }).limit(5);
        const { data: issues } = await supabase.from("goods_issues").select("id, code, created_at, notes, receiver_name").order("created_at", { ascending: false }).limit(5);

        const combined = [
            ...(receipts || []).map(r => {
                const poCodeObj: any = r.code;
                const displayCode = Array.isArray(poCodeObj) ? poCodeObj[0]?.code : poCodeObj?.code;
                return { id: r.id, type: 'IN', code: displayCode || 'PN-???', date: r.created_at, desc: r.notes || 'Nhập kho' };
            }),
            ...(issues || []).map(i => ({ id: i.id, type: 'OUT', code: i.code, date: i.created_at, desc: i.receiver_name }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

        return combined;
    } catch (e) { return []; }
}