"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

// Helper để tạo client
const getClient = async () => await createSupabaseServerClient();

// 1. Lấy số liệu SẢN XUẤT (Projects) - Đã lọc theo NĂM HIỆN TẠI
export async function getProductionStats() {
    const supabase = await getClient();

    // Tính ngày đầu tiên của năm hiện tại
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();

    try {
        // Đếm tổng dự án (Chỉ đếm dự án được tạo từ đầu năm nay)
        const { count: total } = await supabase
            .from("projects")
            .select("*", { count: "exact", head: true })
            .gte("created_at", startOfYear);

        // Đếm dự án hoàn thành trong năm nay
        const { count: completed } = await supabase
            .from("projects")
            .select("*", { count: "exact", head: true })
            .eq("status", "completed")
            .gte("created_at", startOfYear);

        // Đếm dự án đang chạy trong năm nay
        const { count: active } = await supabase
            .from("projects")
            .select("*", { count: "exact", head: true })
            .in("status", ["processing", "construction"])
            .gte("created_at", startOfYear);

        // Đếm dự án sắp chạy trong năm nay
        const { count: planning } = await supabase
            .from("projects")
            .select("*", { count: "exact", head: true })
            .eq("status", "planning")
            .gte("created_at", startOfYear);

        return {
            total_projects: total || 0,
            completed_projects: completed || 0,
            active_projects: active || 0,
            planning_projects: planning || 0,
            delayed_projects: 0,
            total_revenue: 0,
            total_cost: 0
        };
    } catch (error) {
        console.error("Lỗi Production Stats:", error);
        return null;
    }
}

// 2. Lấy số liệu CRM (Customers)
export async function getCRMStats() {
    const supabase = await getClient();

    try {
        // Tổng khách (All-time)
        const { count: total } = await supabase.from("customers").select("*", { count: "exact", head: true });

        // Khách đang đàm phán
        const { count: negotiating } = await supabase.from("customers").select("*", { count: "exact", head: true }).eq("status", "negotiating");

        // Khách mới trong tháng này
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        const { count: newLeads } = await supabase.from("customers").select("*", { count: "exact", head: true }).gte("created_at", startOfMonth);

        // Tính tỷ lệ chuyển đổi
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

    try {
        // B1: Lấy toàn bộ source_id từ bảng customers
        const { data: customers } = await supabase
            .from("customers")
            .select("source_id");

        if (!customers || customers.length === 0) return [];

        // B2: Đếm số lượng theo từng UUID trước
        // Map: source_id -> count
        const countMap = new Map<string, number>();
        let nullCount = 0;

        customers.forEach(c => {
            if (c.source_id) {
                countMap.set(c.source_id, (countMap.get(c.source_id) || 0) + 1);
            } else {
                nullCount++;
            }
        });

        // B3: Lấy danh sách các ID duy nhất để tra cứu tên
        const sourceIds = Array.from(countMap.keys());

        let dictMap: Record<string, { name: string, color: string }> = {};

        if (sourceIds.length > 0) {
            // Tra cứu bảng từ điển dựa trên ID thực tế đang dùng (Không phụ thuộc vào column 'type' nữa để tránh sai sót)
            const { data: dicts } = await supabase
                .from("sys_dictionaries")
                .select("id, name, color, code")
                .in("id", sourceIds);

            if (dicts) {
                dicts.forEach(d => {
                    // Ưu tiên lấy màu từ DB, nếu không có thì random màu đẹp
                    dictMap[d.id] = {
                        name: d.name,
                        color: d.color || getRandomColor(d.name)
                    };
                });
            }
        }

        // B4: Format dữ liệu trả về cho Recharts
        const result = sourceIds.map(id => {
            const info = dictMap[id];
            return {
                name: info ? info.name : "Nguồn lạ (Đã xóa)", // Trường hợp ID có trong khách hàng nhưng đã bị xóa khỏi từ điển
                value: countMap.get(id) || 0,
                fill: info ? info.color : "#94a3b8"
            };
        });

        // Thêm mục "Chưa xác định" nếu có khách hàng không chọn nguồn
        if (nullCount > 0) {
            result.push({
                name: "Chưa xác định",
                value: nullCount,
                fill: "#e2e8f0" // Màu xám nhạt
            });
        }

        // Sắp xếp từ lớn đến bé để hiển thị đẹp hơn
        return result.sort((a, b) => b.value - a.value);

    } catch (e) {
        console.error("Lỗi thống kê nguồn:", e);
        return [];
    }
}
// Hàm phụ trợ random màu nhất quán (cùng 1 tên sẽ ra cùng 1 màu)
function getRandomColor(str: string) {
    const colors = [
        "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
        "#ec4899", "#06b6d4", "#f97316", "#6366f1", "#14b8a6"
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % colors.length);
    return colors[index];
}

// 4. Lấy danh sách khách hàng mới nhất (Đã fix lỗi UUID -> Code status)
export async function getRecentCustomers() {
    const supabase = await getClient();

    try {
        const { data: customers } = await supabase
            .from("customers")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(5);

        if (!customers || customers.length === 0) return [];

        // Map status UUID sang Code
        const statusIds = customers
            .map(c => c.status)
            .filter(id => id && typeof id === 'string' && id.length > 10);

        let statusMap: Record<string, string> = {};

        if (statusIds.length > 0) {
            const { data: dicts } = await supabase
                .from("sys_dictionaries")
                .select("id, code")
                .in("id", statusIds);

            if (dicts) {
                dicts.forEach(d => { statusMap[d.id] = d.code; });
            }
        }

        return customers.map(c => ({
            ...c,
            status: statusMap[c.status] || c.status
        }));
    } catch (e) {
        console.error("Lỗi Recent Customers:", e);
        return [];
    }
}

// 5. Placeholder
export async function getDashboardSummary() { return {}; }

// 6. Lấy vật tư sắp hết hàng (Hàm bị thiếu gây lỗi Build)
export async function getLowStockItems() {
    const supabase = await getClient();
    try {
        // Đảm bảo bảng project_inventory và quan hệ warehouses tồn tại
        const { data } = await supabase
            .from("project_inventory")
            .select("id, item_name, unit, quantity_on_hand, warehouse:warehouses(name)")
            .lt("quantity_on_hand", 10)
            .limit(5);
        return data || [];
    } catch (e) {
        return [];
    }
}

// 7. Lấy hoạt động kho gần đây (Đã fix lỗi Array/Object code)
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