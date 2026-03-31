"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const getClient = async () => await createSupabaseServerClient();

// 1. TỐI ƯU SẢN XUẤT: Chạy song song 4 query + Chỉ select 'id' thay vì '*' để đếm cho nhẹ DB
export async function getProductionStats() {
    const supabase = await getClient();
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();

    try {
        const [totalRes, completedRes, activeRes, planningRes] = await Promise.all([
            supabase.from("projects").select("id", { count: "exact", head: true }).gte("created_at", startOfYear),
            supabase.from("projects").select("id", { count: "exact", head: true }).eq("status", "completed").gte("created_at", startOfYear),
            supabase.from("projects").select("id", { count: "exact", head: true }).in("status", ["processing", "construction"]).gte("created_at", startOfYear),
            supabase.from("projects").select("id", { count: "exact", head: true }).eq("status", "planning").gte("created_at", startOfYear)
        ]);

        return {
            total_projects: totalRes.count || 0,
            completed_projects: completedRes.count || 0,
            active_projects: activeRes.count || 0,
            planning_projects: planningRes.count || 0,
            delayed_projects: 0,
            total_revenue: 0, // Sếp có thể bổ sung query tính doanh thu sau
            total_cost: 0
        };
    } catch (error) { return null; }
}

// 2. TỐI ƯU CRM: Chạy song song 4 query
export async function getCRMStats() {
    const supabase = await getClient();
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    try {
        const [totalRes, negotiatingRes, newLeadsRes, signedRes] = await Promise.all([
            supabase.from("customers").select("id", { count: "exact", head: true }),
            supabase.from("customers").select("id", { count: "exact", head: true }).eq("status", "negotiating"),
            supabase.from("customers").select("id", { count: "exact", head: true }).gte("created_at", startOfMonth),
            supabase.from("customers").select("id", { count: "exact", head: true }).eq("status", "signed")
        ]);

        const total = totalRes.count || 0;
        const signed = signedRes.count || 0;
        const conversion_rate = total > 0 ? (signed / total) * 100 : 0;

        return {
            total_customers: total,
            new_leads_month: newLeadsRes.count || 0,
            negotiating_count: negotiatingRes.count || 0,
            conversion_rate: conversion_rate
        };
    } catch (error) { return null; }
}

export async function getCustomerSourceStats() {
    const supabase = await getClient();
    try {
        const { data: customers } = await supabase.from("customers").select("source_id");
        if (!customers || customers.length === 0) return [];

        const countMap = new Map<string, number>();
        let nullCount = 0;

        customers.forEach(c => {
            if (c.source_id) countMap.set(c.source_id, (countMap.get(c.source_id) || 0) + 1);
            else nullCount++;
        });

        const sourceIds = Array.from(countMap.keys());
        let dictMap: Record<string, { name: string, color: string }> = {};

        if (sourceIds.length > 0) {
            const { data: dicts } = await supabase.from("sys_dictionaries").select("id, name, color, code").in("id", sourceIds);
            if (dicts) {
                dicts.forEach(d => { dictMap[d.id] = { name: d.name, color: d.color || getRandomColor(d.name) }; });
            }
        }

        const result = sourceIds.map(id => {
            const info = dictMap[id];
            return { name: info ? info.name : "Nguồn lạ", value: countMap.get(id) || 0, fill: info ? info.color : "#94a3b8" };
        });

        if (nullCount > 0) result.push({ name: "Chưa xác định", value: nullCount, fill: "#e2e8f0" });
        return result.sort((a, b) => b.value - a.value);
    } catch (e) { return []; }
}

function getRandomColor(str: string) {
    const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#6366f1", "#14b8a6"];
    let hash = 0; for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash % colors.length)];
}

export async function getRecentCustomers() {
    const supabase = await getClient();
    try {
        const { data: customers } = await supabase.from("customers").select("*").order("created_at", { ascending: false }).limit(5);
        if (!customers || customers.length === 0) return [];

        const statusIds = customers.map(c => c.status).filter(id => id && typeof id === 'string' && id.length > 10);
        let statusMap: Record<string, string> = {};

        if (statusIds.length > 0) {
            const { data: dicts } = await supabase.from("sys_dictionaries").select("id, code").in("id", statusIds);
            if (dicts) dicts.forEach(d => { statusMap[d.id] = d.code; });
        }
        return customers.map(c => ({ ...c, status: statusMap[c.status] || c.status }));
    } catch (e) { return []; }
}

export async function getLowStockItems() {
    const supabase = await getClient();
    try {
        const { data } = await supabase.from("project_inventory").select("id, item_name, unit, quantity_on_hand, warehouse:warehouses(name)").lt("quantity_on_hand", 10).limit(5);
        return data || [];
    } catch (e) { return []; }
}

export async function getRecentWarehouseActivity() {
    const supabase = await getClient();
    try {
        const [receiptsRes, issuesRes] = await Promise.all([
            supabase.from("goods_receipts").select("id, code:purchase_orders(code), created_at, notes").order("created_at", { ascending: false }).limit(5),
            supabase.from("goods_issues").select("id, code, created_at, notes, receiver_name").order("created_at", { ascending: false }).limit(5)
        ]);

        const combined = [
            ...(receiptsRes.data || []).map(r => {
                const poCodeObj: any = r.code;
                const displayCode = Array.isArray(poCodeObj) ? poCodeObj[0]?.code : poCodeObj?.code;
                return { id: r.id, type: 'IN', code: displayCode || 'PN-???', date: r.created_at, desc: r.notes || 'Nhập kho' };
            }),
            ...(issuesRes.data || []).map(i => ({ id: i.id, type: 'OUT', code: i.code, date: i.created_at, desc: i.receiver_name }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

        return combined;
    } catch (e) { return []; }
}

// ✅ VŨ KHÍ BÍ MẬT: GỘP TẤT CẢ VÀO 1 API DUY NHẤT CHO FRONTEND GỌI
export async function getFullDashboardData() {
    const [prodStats, crmStats, sourceStats, recentCustomers, lowStock, activities] = await Promise.all([
        getProductionStats(),
        getCRMStats(),
        getCustomerSourceStats(),
        getRecentCustomers(),
        getLowStockItems(),
        getRecentWarehouseActivity()
    ]);

    return { prodStats, crmStats, sourceStats, recentCustomers, lowStock, activities };
}