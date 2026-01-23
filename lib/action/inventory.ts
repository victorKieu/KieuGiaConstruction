"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { format } from "date-fns";

// --- HELPER: LẤY EMPLOYEE ID TỪ USER HIỆN TẠI ---
// (Cần thiết vì Database yêu cầu khóa ngoại tới bảng employees)
async function getCurrentEmployeeId(supabase: any) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Tìm profile linked với auth_id
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('auth_id', user.id)
        .single();

    return profile?.id || null;
}

// ==============================================================================
// PHẦN 1: TRUY VẤN DỮ LIỆU (READ)
// ==============================================================================

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

// 2. Lấy kho theo phân quyền user (My Warehouses)
export async function getMyAuthorizedWarehouses() {
    const supabase = await createClient();
    const employeeId = await getCurrentEmployeeId(supabase);

    if (!employeeId) return [];

    // Lấy dự án user tham gia
    const { data: members } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('employee_id', employeeId);

    const projectIds = members?.map(m => m.project_id) || [];

    let query = supabase
        .from("warehouses")
        .select(`*, project:projects(code, name)`)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

    if (projectIds.length > 0) {
        // Lấy kho thuộc dự án tham gia OR Kho chung (project_id is null)
        query = query.or(`project_id.in.(${projectIds.join(',')}),project_id.is.null`);
    } else {
        query = query.is('project_id', null);
    }

    const { data: warehouses } = await query;
    const result = await Promise.all((warehouses || []).map(async (w) => {
        const { count } = await supabase
            .from("project_inventory")
            .select("*", { count: 'exact', head: true })
            .eq("warehouse_id", w.id);
        return { ...w, items_count: count || 0 };
    }));

    return result;
}

// 3. Lấy chi tiết tồn kho (Bao gồm tính toán SL đã xuất)
export async function getInventoryByWarehouse(warehouseId: string) {
    const supabase = await createClient();

    // 1. Lấy danh sách tồn kho
    const { data: inventory } = await supabase
        .from("project_inventory")
        .select("*")
        .eq("warehouse_id", warehouseId)
        .order("item_name");

    if (!inventory) return [];

    // 2. Tính tổng số lượng đã xuất từ bảng goods_issue_items (Giữ nguyên logic cũ của bạn)
    const { data: issueItems } = await supabase
        .from("goods_issue_items")
        .select("item_name, quantity, issue:goods_issues!inner(warehouse_id)")
        .eq("issue.warehouse_id", warehouseId);

    const issuedMap = new Map<string, number>();
    issueItems?.forEach((item: any) => {
        const current = issuedMap.get(item.item_name) || 0;
        issuedMap.set(item.item_name, current + item.quantity);
    });

    // 3. Merge dữ liệu
    const result = inventory.map(item => ({
        ...item,
        quantity_issued: issuedMap.get(item.item_name) || 0
    }));

    return result;
}

// 4. Lấy thông tin 1 kho
export async function getWarehouseById(id: string) {
    const supabase = await createClient();
    const { data } = await supabase.from("warehouses").select("*, project:projects(name)").eq("id", id).single();
    return data;
}

// 5. Lấy danh sách PO chờ nhập (Incoming)
export async function getIncomingOrdersByWarehouse(warehouseId: string) {
    const supabase = await createClient();
    const { data: wh } = await supabase.from('warehouses').select('project_id').eq('id', warehouseId).single();
    if (!wh?.project_id) return [];

    const { data: orders } = await supabase
        .from('purchase_orders')
        .select(`
            id, code, order_date, status, total_amount, expected_delivery_date,
            supplier:suppliers(name),
            items:purchase_order_items(id, item_name, unit, quantity)
        `)
        .eq('project_id', wh.project_id)
        .in('status', ['ordered', 'partial_received'])
        .order('created_at', { ascending: false });

    return orders || [];
}

// 6. Lấy danh sách PO đã nhập (Received)
export async function getReceivedPOsByWarehouse(warehouseId: string) {
    const supabase = await createClient();
    const { data: wh } = await supabase.from('warehouses').select('project_id').eq('id', warehouseId).single();

    const query = supabase
        .from('purchase_orders')
        .select(`id, code, created_at, supplier:suppliers(name), items:purchase_order_items(item_name, unit)`)
        .eq('status', 'received')
        .order('created_at', { ascending: false });

    if (wh?.project_id) query.eq('project_id', wh.project_id);

    const { data: pos } = await query;
    return pos || [];
}

// 7. Lấy lịch sử kho (Tổng hợp Xuất, Nhập trả)
export async function getWarehouseHistory(warehouseId: string) {
    const supabase = await createClient();

    const { data: issues } = await supabase
        .from("goods_issues")
        .select("id, code, issue_date, receiver_name, notes, created_at")
        .eq("warehouse_id", warehouseId)
        .order("created_at", { ascending: false })
        .limit(10);

    const { data: returns } = await supabase
        .from("goods_returns")
        .select("id, code, return_date, returner_name, notes, created_at")
        .eq("warehouse_id", warehouseId)
        .order("created_at", { ascending: false })
        .limit(10);

    const history = [
        ...(issues || []).map(i => ({
            id: i.id, type: 'ISSUE', code: i.code, date: i.issue_date, partner: i.receiver_name, notes: i.notes
        })),
        ...(returns || []).map(r => ({
            id: r.id, type: 'RETURN', code: r.code, date: r.return_date, partner: r.returner_name, notes: r.notes
        }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return history;
}

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

// ==============================================================================
// PHẦN 2: CÁC NGHIỆP VỤ KHO (WRITE ACTIONS)
// ==============================================================================

// 1. NHẬP KHO (GOODS RECEIPT)
export async function createGoodsReceiptAction(data: {
    po_id: string; warehouse_id: string; delivery_note: string; notes?: string;
    items: { po_item_id: string; item_name: string; unit: string; quantity_ordered: number; quantity_received: number; note?: string }[]
}) {
    const supabase = await createClient();
    const employeeId = await getCurrentEmployeeId(supabase);

    if (!data.warehouse_id) return { success: false, error: "Thiếu thông tin kho nhập." };

    const code = `GR-${format(new Date(), "yyyyMMdd")}-${Math.floor(Math.random() * 1000)}`;
    const { data: gr, error: grError } = await supabase.from('goods_receipts').insert({
        code: code, po_id: data.po_id, warehouse_id: data.warehouse_id,
        receiver_id: employeeId,
        delivery_note_number: data.delivery_note,
        notes: data.notes, received_date: new Date().toISOString()
    }).select('id').single();

    if (grError) return { success: false, error: "Lỗi tạo phiếu nhập: " + grError.message };

    for (const item of data.items) {
        if (item.quantity_received > 0) {
            await supabase.from('goods_receipt_items').insert({
                receipt_id: gr.id, po_item_id: item.po_item_id,
                item_name: item.item_name, unit: item.unit,
                quantity_ordered: item.quantity_ordered, quantity_received: item.quantity_received,
                notes: item.note
            });

            // Cộng Tồn kho
            const { data: currentStock } = await supabase.from('project_inventory')
                .select('*').eq('warehouse_id', data.warehouse_id).eq('item_name', item.item_name).maybeSingle();

            if (currentStock) {
                await supabase.from('project_inventory').update({
                    quantity_on_hand: Number(currentStock.quantity_on_hand) + Number(item.quantity_received),
                    last_updated: new Date().toISOString()
                }).eq('id', currentStock.id);
            } else {
                const { data: wh } = await supabase.from('warehouses').select('project_id').eq('id', data.warehouse_id).single();
                await supabase.from('project_inventory').insert({
                    warehouse_id: data.warehouse_id, project_id: wh?.project_id,
                    item_name: item.item_name, unit: item.unit,
                    quantity_on_hand: item.quantity_received, avg_price: 0,
                    last_updated: new Date().toISOString()
                });
            }
        }
    }

    await supabase.from('purchase_orders').update({ status: 'received' }).eq('id', data.po_id);
    revalidatePath(`/inventory/${data.warehouse_id}`);
    return { success: true, message: "Nhập kho thành công!" };
}

// 2. XUẤT KHO SỬ DỤNG (ISSUE)
export async function createGoodsIssueAction(data: {
    warehouse_id: string; project_id?: string; receiver_name: string; issue_date: Date; notes?: string;
    items: { item_name: string; unit: string; quantity: number; notes?: string }[]
}) {
    const supabase = await createClient();
    const employeeId = await getCurrentEmployeeId(supabase);

    const code = `PX-${format(new Date(), "yyyyMMdd")}-${Math.floor(Math.random() * 1000)}`;
    const { data: issue, error } = await supabase.from("goods_issues").insert({
        code, warehouse_id: data.warehouse_id, project_id: data.project_id,
        issue_date: data.issue_date.toISOString(), receiver_name: data.receiver_name,
        notes: data.notes, type: 'out', created_by: employeeId
    }).select("id").single();

    if (error) return { success: false, error: "Lỗi tạo phiếu xuất: " + error.message };

    let issueTotalValue = 0;
    for (const item of data.items) {
        // Lấy giá vốn hiện tại
        const { data: currentStock } = await supabase.from("project_inventory")
            .select("*").eq("warehouse_id", data.warehouse_id).eq("item_name", item.item_name).single();

        const currentPrice = currentStock?.avg_price || 0;

        await supabase.from("goods_issue_items").insert({
            issue_id: issue.id, item_name: item.item_name, unit: item.unit,
            quantity: item.quantity, unit_price: currentPrice, notes: item.notes
        });

        issueTotalValue += (item.quantity * currentPrice);

        if (currentStock) {
            await supabase.from("project_inventory").update({
                quantity_on_hand: Number(currentStock.quantity_on_hand) - Number(item.quantity),
                // quantity_issued: ... (Cập nhật cột này nếu DB đã có, không thì thôi)
                last_updated: new Date().toISOString()
            }).eq("id", currentStock.id);
        }
    }

    await supabase.from("goods_issues").update({ total_value: issueTotalValue }).eq("id", issue.id);

    revalidatePath(`/inventory/${data.warehouse_id}`);
    if (data.project_id) revalidatePath(`/projects/${data.project_id}`);
    return { success: true, message: "Đã xuất kho thành công!" };
}

// 3. ĐIỀU CHUYỂN KHO (TRANSFER)
export async function createTransferAction(
    fromId: string, toId: string, items: { item_name: string; unit: string; quantity: number }[], notes: string
) {
    const supabase = await createClient();
    const employeeId = await getCurrentEmployeeId(supabase);

    if (fromId === toId) return { success: false, error: "Kho đi và Kho đến trùng nhau" };

    const code = `TR-${Date.now().toString().slice(-6)}`;
    const { data: transfer, error } = await supabase.from("inventory_transfers").insert({
        code, from_warehouse_id: fromId, to_warehouse_id: toId,
        notes, status: 'completed', transfer_date: new Date().toISOString(), created_by: employeeId
    }).select("id").single();

    if (error) return { success: false, error: "Lỗi tạo phiếu: " + error.message };

    for (const item of items) {
        await supabase.from("inventory_transfer_items").insert({
            transfer_id: transfer.id, item_name: item.item_name, unit: item.unit, quantity: item.quantity
        });

        // Trừ Kho đi
        const { data: source } = await supabase.from("project_inventory")
            .select("*").eq("warehouse_id", fromId).eq("item_name", item.item_name).single();

        if (!source || source.quantity_on_hand < item.quantity) return { success: false, error: `Kho nguồn thiếu hàng: ${item.item_name}` };

        await supabase.from("project_inventory").update({
            quantity_on_hand: source.quantity_on_hand - item.quantity, last_updated: new Date().toISOString()
        }).eq("id", source.id);

        // Cộng Kho đến
        const { data: dest } = await supabase.from("project_inventory")
            .select("*").eq("warehouse_id", toId).eq("item_name", item.item_name).maybeSingle();

        if (dest) {
            const oldVal = dest.quantity_on_hand * (dest.avg_price || 0);
            const transferVal = item.quantity * (source.avg_price || 0);
            const newQty = dest.quantity_on_hand + item.quantity;
            const newAvg = newQty > 0 ? (oldVal + transferVal) / newQty : 0;

            await supabase.from("project_inventory").update({
                quantity_on_hand: newQty, avg_price: newAvg, last_updated: new Date().toISOString()
            }).eq("id", dest.id);
        } else {
            await supabase.from("project_inventory").insert({
                warehouse_id: toId, item_name: item.item_name, unit: item.unit,
                quantity_on_hand: item.quantity, avg_price: source.avg_price, last_updated: new Date().toISOString()
            });
        }
    }

    revalidatePath(`/inventory/${fromId}`);
    revalidatePath(`/inventory/${toId}`);
    return { success: true, message: "Điều chuyển thành công!" };
}

// 4. NHẬP TRẢ TỰ DO / TỪ CÔNG TRƯỜNG
export async function createGoodsReturnAction(data: {
    warehouse_id: string; returner_name: string; return_date: Date; notes?: string;
    items: { item_name: string; unit: string; quantity: number; reason?: string }[]
}) {
    const supabase = await createClient();
    const employeeId = await getCurrentEmployeeId(supabase);

    const code = `TH-${format(new Date(), "yyyyMMdd")}-${Math.floor(Math.random() * 1000)}`;
    const { data: ret, error } = await supabase.from("goods_returns").insert({
        code, warehouse_id: data.warehouse_id, returner_name: data.returner_name,
        return_date: data.return_date.toISOString(), notes: data.notes, created_by: employeeId
    }).select("id").single();

    if (error) return { success: false, error: "Lỗi tạo phiếu trả: " + error.message };

    for (const item of data.items) {
        await supabase.from("goods_return_items").insert({
            return_id: ret.id, item_name: item.item_name, unit: item.unit,
            quantity: item.quantity, reason: item.reason
        });

        const { data: currentStock } = await supabase.from("project_inventory")
            .select("*").eq("warehouse_id", data.warehouse_id).eq("item_name", item.item_name).maybeSingle();

        if (currentStock) {
            await supabase.from("project_inventory").update({
                quantity_on_hand: Number(currentStock.quantity_on_hand) + Number(item.quantity),
                last_updated: new Date().toISOString()
            }).eq("id", currentStock.id);
        } else {
            await supabase.from("project_inventory").insert({
                warehouse_id: data.warehouse_id, item_name: item.item_name, unit: item.unit,
                quantity_on_hand: item.quantity, avg_price: 0, last_updated: new Date().toISOString()
            });
        }
    }

    revalidatePath(`/inventory/${data.warehouse_id}`);
    return { success: true, message: "Đã nhập trả hàng thành công!" };
}

// 5. NHẬP TRẢ TỪ PHIẾU XUẤT CỤ THỂ
export async function createGoodsReturnFromIssueAction(data: {
    warehouse_id: string; issue_id: string; returner_name: string; return_date: Date; notes?: string;
    items: { item_name: string; unit: string; quantity: number; reason?: string }[]
}) {
    const supabase = await createClient();
    const employeeId = await getCurrentEmployeeId(supabase);

    const code = `TH-${format(new Date(), "yyyyMMdd")}-${Math.floor(Math.random() * 1000)}`;
    const { data: ret, error } = await supabase.from("goods_returns").insert({
        code, warehouse_id: data.warehouse_id, issue_id: data.issue_id,
        returner_name: data.returner_name, return_date: data.return_date.toISOString(),
        notes: data.notes, created_by: employeeId
    }).select("id").single();

    if (error) return { success: false, error: "Lỗi tạo phiếu trả: " + error.message };

    for (const item of data.items) {
        if (item.quantity <= 0) continue;
        await supabase.from("goods_return_items").insert({
            return_id: ret.id, item_name: item.item_name, unit: item.unit,
            quantity: item.quantity, reason: item.reason
        });

        const { data: currentStock } = await supabase.from("project_inventory")
            .select("*").eq("warehouse_id", data.warehouse_id).eq("item_name", item.item_name).maybeSingle();

        if (currentStock) {
            await supabase.from("project_inventory").update({
                quantity_on_hand: Number(currentStock.quantity_on_hand) + Number(item.quantity),
                last_updated: new Date().toISOString()
            }).eq("id", currentStock.id);
        } else {
            await supabase.from("project_inventory").insert({
                warehouse_id: data.warehouse_id, item_name: item.item_name, unit: item.unit,
                quantity_on_hand: item.quantity, avg_price: 0, last_updated: new Date().toISOString()
            });
        }
    }

    revalidatePath(`/inventory/${data.warehouse_id}`);
    return { success: true, message: "Đã nhập trả hàng thành công!" };
}

// 6. KIỂM KÊ KHO (CHECK)
export async function createInventoryCheckAction(
    warehouseId: string, items: { item_name: string; system_qty: number; actual_qty: number; reason?: string }[]
) {
    const supabase = await createClient();
    const employeeId = await getCurrentEmployeeId(supabase);

    const { data: check, error } = await supabase.from("inventory_checks").insert({
        warehouse_id: warehouseId, check_date: new Date().toISOString(),
        status: 'completed', notes: "Kiểm kê định kỳ / Đột xuất", checked_by: employeeId // ✅ Dùng checked_by
    }).select("id").single();

    if (error) return { success: false, error: error.message };

    for (const item of items) {
        await supabase.from("inventory_check_items").insert({
            check_id: check.id, item_name: item.item_name,
            system_qty: item.system_qty, actual_qty: item.actual_qty, diff_reason: item.reason
        });

        if (item.system_qty !== item.actual_qty) {
            await supabase.from("project_inventory").update({
                quantity_on_hand: item.actual_qty, last_updated: new Date().toISOString()
            }).eq("warehouse_id", warehouseId).eq("item_name", item.item_name);
        }
    }

    revalidatePath(`/inventory/${warehouseId}`);
    return { success: true, message: "Đã cân bằng kho thành công!" };
}

// 7. XUẤT HỦY / TRẢ NCC (OTHER ISSUE)
export async function createOtherIssueAction(data: {
    warehouse_id: string; type: 'RETURN_VENDOR' | 'DISPOSAL'; partner_name: string; issue_date: Date; notes?: string;
    items: { item_name: string; unit: string; quantity: number; notes?: string }[]
}) {
    const supabase = await createClient();
    const employeeId = await getCurrentEmployeeId(supabase);

    const prefix = data.type === 'RETURN_VENDOR' ? 'XT' : 'XH';
    const code = `${prefix}-${format(new Date(), "yyyyMMdd")}-${Math.floor(Math.random() * 1000)}`;

    const { data: issue, error } = await supabase.from("goods_issues").insert({
        code, warehouse_id: data.warehouse_id, project_id: null,
        created_by: employeeId, receiver_name: data.partner_name,
        issue_date: data.issue_date.toISOString(), notes: data.notes,
        type: data.type === 'RETURN_VENDOR' ? 'return_vendor' : 'disposal'
    }).select("id").single();

    if (error) return { success: false, error: "Lỗi tạo phiếu: " + error.message };

    for (const item of data.items) {
        const { data: stock } = await supabase.from("project_inventory")
            .select("id, quantity_on_hand, avg_price").eq("warehouse_id", data.warehouse_id).eq("item_name", item.item_name).single();

        await supabase.from("goods_issue_items").insert({
            issue_id: issue.id, item_name: item.item_name, unit: item.unit,
            quantity: item.quantity, unit_price: stock?.avg_price || 0, notes: item.notes
        });

        if (stock) {
            if (stock.quantity_on_hand < item.quantity) return { success: false, error: `Vật tư "${item.item_name}" không đủ tồn.` };
            await supabase.from("project_inventory").update({
                quantity_on_hand: Number(stock.quantity_on_hand) - Number(item.quantity),
                last_updated: new Date().toISOString()
            }).eq("id", stock.id);
        }
    }

    revalidatePath(`/inventory/${data.warehouse_id}`);
    return { success: true, message: "Xử lý thành công!" };
}

// 8. CRUD ITEM (Cập nhật / Xóa danh mục)
export async function updateInventoryItemAction(id: string, newName: string, newUnit: string) {
    const supabase = await createClient();
    try {
        if (newName) {
            const { data: existing } = await supabase.from("project_inventory").select("id, warehouse_id").eq("item_name", newName).neq("id", id).single();
            const { data: current } = await supabase.from("project_inventory").select("warehouse_id").eq("id", id).single();
            if (existing && current && existing.warehouse_id === current.warehouse_id) return { success: false, error: "Tên vật tư đã tồn tại!" };
        }
        await supabase.from("project_inventory").update({ item_name: newName, unit: newUnit, last_updated: new Date().toISOString() }).eq("id", id);
        return { success: true, message: "Cập nhật thành công!" };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function deleteInventoryItemAction(id: string) {
    const supabase = await createClient();
    try {
        const { data: item } = await supabase.from("project_inventory").select("quantity_on_hand, item_name").eq("id", id).single();
        if (item && item.quantity_on_hand > 0) return { success: false, error: `Không thể xóa khi còn tồn (${item.quantity_on_hand})` };
        await supabase.from("project_inventory").delete().eq("id", id);
        return { success: true, message: "Đã xóa vật tư!" };
    } catch (e: any) { return { success: false, error: e.message }; }
}