"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { format } from "date-fns";

// 1. Lấy danh sách tất cả các kho
export async function getAllWarehouses() {
    const supabase = await createClient();

    const { data: warehouses } = await supabase
        .from("warehouses")
        .select(`*, project:projects(code, name)`)
        .order("created_at", { ascending: false });

    if (!warehouses) return [];

    const result = await Promise.all(warehouses.map(async (w) => {
        const { count } = await supabase
            .from("project_inventory")
            .select("*", { count: 'exact', head: true })
            .eq("warehouse_id", w.id);

        return { ...w, items_count: count || 0 };
    }));

    return result;
}

// 2. Lấy chi tiết tồn kho
export async function getInventoryByWarehouse(warehouseId: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from("project_inventory")
        .select("*")
        .eq("warehouse_id", warehouseId)
        .gt("quantity_on_hand", 0)
        .order("item_name");

    return data || [];
}

// 3. Lấy thông tin 1 kho
export async function getWarehouseById(id: string) {
    const supabase = await createClient();
    const { data } = await supabase.from("warehouses").select("*, project:projects(name)").eq("id", id).single();
    return data;
}

// 4. HÀNH ĐỘNG ĐIỀU CHUYỂN KHO (Transfer)
export async function createTransferAction(
    fromId: string,
    toId: string,
    items: { item_name: string; unit: string; quantity: number }[],
    notes: string
) {
    const supabase = await createClient();

    if (fromId === toId) return { success: false, error: "Kho đi và Kho đến không được trùng nhau" };

    const code = `TR-${Date.now().toString().slice(-6)}`;
    const { data: transfer, error: trError } = await supabase.from("inventory_transfers").insert({
        code,
        from_warehouse_id: fromId,
        to_warehouse_id: toId,
        notes,
        status: 'completed',
        transfer_date: new Date().toISOString()
    }).select("id").single();

    if (trError || !transfer) return { success: false, error: "Lỗi tạo phiếu: " + trError?.message };

    const transferItems = items.map(i => ({
        transfer_id: transfer.id,
        item_name: i.item_name,
        unit: i.unit,
        quantity: i.quantity
    }));
    await supabase.from("inventory_transfer_items").insert(transferItems);

    for (const item of items) {
        // Trừ Kho đi
        const { data: sourceItem } = await supabase.from("project_inventory")
            .select("*").eq("warehouse_id", fromId).eq("item_name", item.item_name).eq("unit", item.unit).single();

        if (!sourceItem || sourceItem.quantity_on_hand < item.quantity) {
            return { success: false, error: `Kho nguồn không đủ hàng: ${item.item_name}` };
        }

        await supabase.from("project_inventory").update({
            quantity_on_hand: sourceItem.quantity_on_hand - item.quantity,
            last_updated: new Date().toISOString()
        }).eq("id", sourceItem.id);

        // Cộng Kho đến
        const { data: destItem } = await supabase.from("project_inventory")
            .select("*").eq("warehouse_id", toId).eq("item_name", item.item_name).eq("unit", item.unit).single();

        if (destItem) {
            const oldVal = destItem.quantity_on_hand * destItem.avg_price;
            const transferVal = item.quantity * sourceItem.avg_price;
            const newQty = destItem.quantity_on_hand + item.quantity;
            const newAvg = (oldVal + transferVal) / newQty;

            await supabase.from("project_inventory").update({
                quantity_on_hand: newQty,
                avg_price: newAvg,
                last_updated: new Date().toISOString()
            }).eq("id", destItem.id);
        } else {
            await supabase.from("project_inventory").insert({
                warehouse_id: toId,
                project_id: null,
                item_name: item.item_name,
                unit: item.unit,
                quantity_on_hand: item.quantity,
                avg_price: sourceItem.avg_price,
                last_updated: new Date().toISOString()
            });
        }
    }

    revalidatePath(`/inventory/${fromId}`);
    revalidatePath(`/inventory/${toId}`);
    return { success: true, message: "Điều chuyển thành công!" };
}

// 5. TẠO PHIẾU XUẤT KHO (Goods Issue)
export async function createGoodsIssueAction(data: {
    warehouse_id: string;
    project_id?: string; // Sửa thành optional để tránh lỗi type nếu kho tổng không có project
    receiver_name: string;
    issue_date: Date;
    notes?: string;
    items: { item_name: string; unit: string; quantity: number; notes?: string }[]
}) {
    const supabase = await createClient();

    // Validate tồn kho
    for (const item of data.items) {
        const { data: stock } = await supabase
            .from("project_inventory")
            .select("quantity_on_hand")
            .eq("warehouse_id", data.warehouse_id)
            .eq("item_name", item.item_name)
            .single();

        const currentQty = stock?.quantity_on_hand || 0;
        if (currentQty < item.quantity) {
            return {
                success: false,
                error: `Lỗi: Vật tư "${item.item_name}" chỉ còn tồn ${currentQty} ${item.unit}. Không đủ để xuất ${item.quantity}.`
            };
        }
    }

    const code = `PX-${format(new Date(), "yyyyMMdd")}-${Math.floor(Math.random() * 1000)}`;

    const { data: issue, error: issueError } = await supabase.from("goods_issues").insert({
        code,
        warehouse_id: data.warehouse_id,
        project_id: data.project_id,
        issue_date: data.issue_date.toISOString(),
        receiver_name: data.receiver_name,
        notes: data.notes
    }).select("id").single();

    if (issueError || !issue) return { success: false, error: "Lỗi tạo phiếu xuất: " + issueError?.message };

    for (const item of data.items) {
        await supabase.from("goods_issue_items").insert({
            issue_id: issue.id,
            item_name: item.item_name,
            unit: item.unit,
            quantity: item.quantity,
            notes: item.notes
        });

        const { data: currentStock } = await supabase
            .from("project_inventory")
            .select("*")
            .eq("warehouse_id", data.warehouse_id)
            .eq("item_name", item.item_name)
            .single();

        if (currentStock) {
            await supabase.from("project_inventory").update({
                quantity_on_hand: Number(currentStock.quantity_on_hand) - Number(item.quantity),
                last_updated: new Date().toISOString()
            }).eq("id", currentStock.id);
        }
    }

    revalidatePath(`/inventory/${data.warehouse_id}`);
    return { success: true, message: "Đã xuất kho thành công!" };
}

// 6. NHẬP TRẢ TỰ DO (Backup cũ - có thể không dùng nếu dùng logic mới)
export async function createGoodsReturnAction(data: {
    warehouse_id: string;
    project_id?: string;
    returner_name: string;
    return_date: Date;
    notes?: string;
    items: { item_name: string; unit: string; quantity: number; reason?: string }[]
}) {
    const supabase = await createClient();

    const code = `TH-${format(new Date(), "yyyyMMdd")}-${Math.floor(Math.random() * 1000)}`;
    const { data: ret, error } = await supabase.from("goods_returns").insert({
        code,
        warehouse_id: data.warehouse_id,
        project_id: data.project_id,
        returner_name: data.returner_name,
        return_date: data.return_date.toISOString(),
        notes: data.notes
    }).select("id").single();

    if (error || !ret) return { success: false, error: "Lỗi tạo phiếu trả: " + error?.message };

    for (const item of data.items) {
        await supabase.from("goods_return_items").insert({
            return_id: ret.id,
            item_name: item.item_name,
            unit: item.unit,
            quantity: item.quantity,
            reason: item.reason
        });

        const { data: currentStock } = await supabase
            .from("project_inventory")
            .select("*")
            .eq("warehouse_id", data.warehouse_id)
            .eq("item_name", item.item_name)
            .single();

        if (currentStock) {
            await supabase.from("project_inventory").update({
                quantity_on_hand: Number(currentStock.quantity_on_hand) + Number(item.quantity),
                last_updated: new Date().toISOString()
            }).eq("id", currentStock.id);
        } else {
            await supabase.from("project_inventory").insert({
                warehouse_id: data.warehouse_id,
                item_name: item.item_name,
                unit: item.unit,
                quantity_on_hand: item.quantity,
                avg_price: 0,
                last_updated: new Date().toISOString()
            });
        }
    }

    revalidatePath(`/inventory/${data.warehouse_id}`);
    return { success: true, message: "Đã nhập trả hàng thành công!" };
}

// 7. KIỂM KÊ (Check)
export async function createInventoryCheckAction(
    warehouseId: string,
    items: { item_name: string; system_qty: number; actual_qty: number; reason?: string }[]
) {
    const supabase = await createClient();

    const { data: check, error } = await supabase.from("inventory_checks").insert({
        warehouse_id: warehouseId,
        check_date: new Date().toISOString(),
        status: 'completed',
        notes: "Kiểm kê định kỳ / Đột xuất"
    }).select("id").single();

    if (error || !check) return { success: false, error: error?.message };

    for (const item of items) {
        await supabase.from("inventory_check_items").insert({
            check_id: check.id,
            item_name: item.item_name,
            system_qty: item.system_qty,
            actual_qty: item.actual_qty,
            diff_reason: item.reason
        });

        if (item.system_qty !== item.actual_qty) {
            await supabase.from("project_inventory")
                .update({
                    quantity_on_hand: item.actual_qty,
                    last_updated: new Date().toISOString()
                })
                .eq("warehouse_id", warehouseId)
                .eq("item_name", item.item_name);
        }
    }

    revalidatePath(`/inventory/${warehouseId}`);
    return { success: true, message: "Đã cân bằng kho thành công!" };
}

// 8. LẤY LỊCH SỬ KHO (History) - ĐÃ CÓ LẠI HÀM NÀY
export async function getWarehouseHistory(warehouseId: string) {
    const supabase = await createClient();

    // Lấy phiếu xuất
    const { data: issues } = await supabase
        .from("goods_issues")
        .select("id, code, issue_date, receiver_name, notes, created_at")
        .eq("warehouse_id", warehouseId)
        .order("created_at", { ascending: false })
        .limit(10);

    // Lấy phiếu trả
    const { data: returns } = await supabase
        .from("goods_returns")
        .select("id, code, return_date, returner_name, notes, created_at")
        .eq("warehouse_id", warehouseId)
        .order("created_at", { ascending: false })
        .limit(10);

    // Lấy phiếu nhập (GRN) - Link qua PO
    const { data: receipts } = await supabase
        .from("goods_receipts")
        .select(`
            id, created_at, received_date, notes, 
            po:purchase_orders!inner(code, warehouse_id:request(destination_warehouse_id))
        `)
        .limit(10);
    // Lưu ý: Logic lấy receipt chính xác theo kho sẽ phức tạp hơn chút do join sâu, 
    // tạm thời ta hiển thị Xuất và Trả (quan trọng nhất cho thủ kho)

    const history = [
        ...(issues || []).map(i => ({
            id: i.id,
            type: 'ISSUE', // Xuất kho
            code: i.code,
            date: i.issue_date,
            partner: i.receiver_name, // Người nhận
            notes: i.notes
        })),
        ...(returns || []).map(r => ({
            id: r.id,
            type: 'RETURN', // Nhập trả
            code: r.code,
            date: r.return_date,
            partner: r.returner_name, // Người trả
            notes: r.notes
        }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return history;
}

// 9. LẤY DANH SÁCH PHIẾU XUẤT GẦN ĐÂY (Để chọn trả hàng)
export async function getRecentIssues(warehouseId: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from("goods_issues")
        .select(`*, items:goods_issue_items(*)`)
        .eq("warehouse_id", warehouseId)
        .order("issue_date", { ascending: false })
        .limit(20);
    return data || [];
}

// 10. NHẬP TRẢ TỪ PHIẾU XUẤT (Logic chuẩn)
export async function createGoodsReturnFromIssueAction(data: {
    warehouse_id: string;
    issue_id: string; // Link tới phiếu xuất gốc
    returner_name: string;
    return_date: Date;
    notes?: string;
    items: { item_name: string; unit: string; quantity: number; reason?: string }[]
}) {
    const supabase = await createClient();

    // 1. Tạo Phiếu Trả (Có link tới issue_id)
    const code = `TH-${format(new Date(), "yyyyMMdd")}-${Math.floor(Math.random() * 1000)}`;

    // Tìm project_id từ issue gốc nếu cần, hoặc truyền từ client
    // Ở đây ta đơn giản hóa việc insert
    const { data: ret, error } = await supabase.from("goods_returns").insert({
        code,
        warehouse_id: data.warehouse_id,
        issue_id: data.issue_id,
        returner_name: data.returner_name,
        return_date: data.return_date.toISOString(),
        notes: data.notes
    }).select("id").single();

    if (error || !ret) return { success: false, error: "Lỗi tạo phiếu trả: " + error?.message };

    // 2. Xử lý Items & TĂNG TỒN KHO
    for (const item of data.items) {
        if (item.quantity <= 0) continue;

        // Lưu chi tiết
        await supabase.from("goods_return_items").insert({
            return_id: ret.id,
            item_name: item.item_name,
            unit: item.unit,
            quantity: item.quantity,
            reason: item.reason
        });

        // Cộng tồn kho
        const { data: currentStock } = await supabase
            .from("project_inventory")
            .select("*")
            .eq("warehouse_id", data.warehouse_id)
            .eq("item_name", item.item_name)
            .single();

        if (currentStock) {
            await supabase.from("project_inventory").update({
                quantity_on_hand: Number(currentStock.quantity_on_hand) + Number(item.quantity),
                last_updated: new Date().toISOString()
            }).eq("id", currentStock.id);
        } else {
            // Tạo mới nếu chưa có (lấy lại từ kho)
            await supabase.from("project_inventory").insert({
                warehouse_id: data.warehouse_id,
                item_name: item.item_name,
                unit: item.unit,
                quantity_on_hand: item.quantity,
                avg_price: 0,
                last_updated: new Date().toISOString()
            });
        }
    }

    revalidatePath(`/inventory/${data.warehouse_id}`);
    return { success: true, message: "Đã nhập trả hàng thành công!" };
}