"use server";

import { createClient } from "@/lib/supabase/server";

// 1. Lấy số liệu tổng quan chung (Cũ - vẫn giữ để đảm bảo tương thích nếu cần)
export async function getDashboardSummary() {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_dashboard_summary");
    if (error) {
        console.error("Dashboard Summary Error:", error);
        return null;
    }
    return data[0];
}

// 2. Lấy số liệu SẢN XUẤT & TÀI CHÍNH (Mới - Dùng cho khối 1 & 3)
export async function getProductionStats() {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_dashboard_production_stats");

    if (error) {
        console.error("Production Stats Error:", error);
        return null;
    }
    return data[0];
}

// 3. Lấy số liệu CRM (Mới - Dùng cho khối 2)
export async function getCRMStats() {
    const supabase = await createClient();
    // Lưu ý: Đảm bảo bạn đã chạy SQL tạo hàm get_dashboard_crm_stats ở bước trước
    const { data, error } = await supabase.rpc("get_dashboard_crm_stats");

    if (error) {
        // Nếu chưa tạo RPC hoặc bảng customers, trả về default để không crash trang
        console.warn("CRM Stats Error (Có thể chưa tạo RPC):", error);
        return {
            total_customers: 0,
            new_leads_month: 0,
            negotiating_count: 0,
            conversion_rate: 0
        };
    }
    return data[0];
}

// 4. Lấy danh sách Khách hàng mới nhất (Mới - Dùng cho khối 2)
export async function getRecentCustomers() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

    if (error) {
        console.warn("Recent Customers Error:", error);
        return [];
    }
    return data || [];
}

// 5. Lấy danh sách vật tư sắp hết hàng (Dùng cho khối 4)
export async function getLowStockItems() {
    const supabase = await createClient();
    const { data } = await supabase
        .from("project_inventory")
        .select("id, item_name, unit, quantity_on_hand, warehouse:warehouses(name)")
        .lt("quantity_on_hand", 10) // Dưới 10 là báo động
        .order("quantity_on_hand", { ascending: true })
        .limit(5);
    return data || [];
}

// 6. Lấy hoạt động kho gần đây (Nhập kho & Xuất kho) (Dùng cho khối 4)
export async function getRecentWarehouseActivity() {
    const supabase = await createClient();

    // Lấy 5 phiếu nhập gần nhất
    const { data: receipts } = await supabase
        .from("goods_receipts")
        .select("id, code:purchase_orders(code), created_at, notes")
        .order("created_at", { ascending: false })
        .limit(5);

    // Lấy 5 phiếu xuất gần nhất
    const { data: issues } = await supabase
        .from("goods_issues")
        .select("id, code, created_at, notes, receiver_name")
        .order("created_at", { ascending: false })
        .limit(5);

    // Gộp và sort lại theo thời gian
    const combined = [
        ...(receipts || []).map(r => ({
            id: r.id,
            type: 'IN', // Nhập
            code: r.code?.code || 'PN-???',
            date: r.created_at,
            desc: `Nhập kho: ${r.notes || 'Không ghi chú'}`
        })),
        ...(issues || []).map(i => ({
            id: i.id,
            type: 'OUT', // Xuất
            code: i.code,
            date: i.created_at,
            desc: `Xuất cho: ${i.receiver_name}`
        }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

    return combined;
}

export async function getUpcomingCRMActivities() {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("customer_activities") // <--- Đổi tên bảng
        .select(`
            id, 
            type:activity_type, 
            subject:title, 
            due_date:scheduled_at, 
            status,
            customer:customers(name, phone)
        `)
        .eq("status", "pending") // Hoặc trạng thái tương đương bạn dùng để chỉ việc chưa làm
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(5);

    if (error) {
        console.warn("CRM Activities Error:", error);
        return [];
    }

    // Map dữ liệu về format chuẩn cho Component hiển thị
    return (data || []).map(item => ({
        id: item.id,
        type: item.type, // call, meeting...
        subject: item.subject,
        due_date: item.due_date,
        status: item.status,
        customer: item.customer
    }));
}

// 👇 8. LẤY THỐNG KÊ NGUỒN KHÁCH HÀNG (Cho biểu đồ tròn)
export async function getCustomerSourceStats() {
    const supabase = await createClient();

    // 1. Lấy toàn bộ khách hàng (chỉ cần cột source_id)
    const { data: customers, error } = await supabase
        .from("customers")
        .select("source_id");

    if (error || !customers) {
        console.error("Lỗi lấy data khách hàng:", error);
        return [];
    }

    // 2. Lấy danh sách định nghĩa Nguồn từ từ điển hệ thống
    // Lấy các dictionary mà id có xuất hiện trong list khách hàng để tối ưu
    const sourceIds = Array.from(new Set(customers.map(c => c.source_id).filter(Boolean))) as string[];

    let dictMap: Record<string, any> = {};

    if (sourceIds.length > 0) {
        const { data: dicts } = await supabase
            .from("sys_dictionaries")
            .select("id, name, color")
            .in("id", sourceIds);

        if (dicts) {
            dicts.forEach(d => { dictMap[d.id] = d; });
        }
    }

    // 3. Tổng hợp dữ liệu
    const statsMap = new Map<string, number>();
    let unknownCount = 0;

    customers.forEach(c => {
        if (c.source_id && dictMap[c.source_id]) {
            const id = c.source_id;
            statsMap.set(id, (statsMap.get(id) || 0) + 1);
        } else {
            unknownCount++;
        }
    });

    // 4. Format dữ liệu cho Recharts
    const chartData = Array.from(statsMap.entries()).map(([id, count]) => ({
        name: dictMap[id].name,
        value: count,
        fill: dictMap[id].color || `hsl(${Math.random() * 360}, 70%, 50%)`, // Màu mặc định nếu thiếu
    }));

    // Thêm mục "Khác/Chưa rõ" nếu có
    if (unknownCount > 0) {
        chartData.push({
            name: "Chưa xác định",
            value: unknownCount,
            fill: "#94a3b8", // Màu xám slate-400
        });
    }

    return chartData.sort((a, b) => b.value - a.value); // Sắp xếp giảm dần
}