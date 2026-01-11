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

    // 1. Lấy danh sách tồn kho (Bỏ điều kiện .gt > 0 để lấy tất cả)
    const { data: inventory, error } = await supabase
        .from("project_inventory")
        .select("*")
        .eq("warehouse_id", warehouseId)
        .order("item_name");

    if (error || !inventory) return [];

    // 2. Tính tổng số lượng đã xuất (SL Xuất) từ bảng goods_issue_items
    // (Logic: Lấy tất cả phiếu xuất của kho này -> sum quantity group by item_name)
    const { data: issueItems } = await supabase
        .from("goods_issue_items")
        .select("item_name, quantity, issue:goods_issues!inner(warehouse_id)")
        .eq("issue.warehouse_id", warehouseId);

    // Map để tính tổng xuất
    const issuedMap = new Map<string, number>();
    issueItems?.forEach((item: any) => {
        const current = issuedMap.get(item.item_name) || 0;
        issuedMap.set(item.item_name, current + item.quantity);
    });

    // 3. Merge dữ liệu
    const result = inventory.map(item => ({
        ...item,
        quantity_issued: issuedMap.get(item.item_name) || 0 // Thêm cột SL Xuất
    }));

    return result;
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

// 5. TẠO PHIẾU XUẤT KHO (Cập nhật logic tính tiền)
export async function createGoodsIssueAction(data: {
    warehouse_id: string;
    project_id?: string;
    receiver_name: string;
    issue_date: Date;
    notes?: string;
    items: { item_name: string; unit: string; quantity: number; notes?: string }[]
}) {
    const supabase = await createClient();

    // ... (Phần validate tồn kho giữ nguyên) ...

    const code = `PX-${format(new Date(), "yyyyMMdd")}-${Math.floor(Math.random() * 1000)}`;

    const { data: issue, error: issueError } = await supabase.from("goods_issues").insert({
        code,
        warehouse_id: data.warehouse_id,
        project_id: data.project_id, // Quan trọng: Phải có cái này để link với Tài chính
        issue_date: data.issue_date.toISOString(),
        receiver_name: data.receiver_name,
        notes: data.notes
    }).select("id").single();

    if (issueError || !issue) return { success: false, error: "Lỗi tạo phiếu xuất: " + issueError?.message };

    // Biến tính tổng giá trị phiếu xuất
    let issueTotalValue = 0;

    for (const item of data.items) {
        // Lấy thông tin tồn kho (bao gồm giá AVG)
        const { data: currentStock } = await supabase
            .from("project_inventory")
            .select("*")
            .eq("warehouse_id", data.warehouse_id)
            .eq("item_name", item.item_name)
            .single();

        // Lấy giá vốn hiện tại (Nếu chưa có thì = 0)
        const currentPrice = currentStock?.avg_price || 0;

        // Lưu vào chi tiết phiếu xuất (Kèm ĐƠN GIÁ)
        await supabase.from("goods_issue_items").insert({
            issue_id: issue.id,
            item_name: item.item_name,
            unit: item.unit,
            quantity: item.quantity,
            unit_price: currentPrice, // ✅ LƯU GIÁ VỐN
            notes: item.notes
        });

        // Cộng dồn tổng tiền
        issueTotalValue += (item.quantity * currentPrice);

        // Trừ tồn kho (Giữ nguyên)
        if (currentStock) {
            await supabase.from("project_inventory").update({
                quantity_on_hand: Number(currentStock.quantity_on_hand) - Number(item.quantity),
                last_updated: new Date().toISOString()
            }).eq("id", currentStock.id);
        }
    }

    // (Tùy chọn) Cập nhật tổng tiền ngược lại vào header phiếu xuất để query nhanh
    await supabase.from("goods_issues")
        .update({ total_value: issueTotalValue })
        .eq("id", issue.id);

    revalidatePath(`/inventory/${data.warehouse_id}`);
    // Revalidate dự án để cập nhật tài chính ngay lập tức
    if (data.project_id) revalidatePath(`/projects/${data.project_id}`);

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

// --- [NEW] 9. LẤY DANH SÁCH ĐƠN HÀNG CHỜ NHẬP (INCOMING) THEO KHO ---
export async function getIncomingOrdersByWarehouse(warehouseId: string) {
    const supabase = await createClient();

    // 1. Lấy Project ID của kho này
    const { data: wh } = await supabase.from('warehouses').select('project_id').eq('id', warehouseId).single();
    if (!wh?.project_id) return [];

    // 2. Lấy PO thuộc Project đó và có trạng thái đang đặt hàng
    const { data: orders } = await supabase
        .from('purchase_orders')
        .select(`
            id, code, order_date, status, total_amount,
            supplier:suppliers(name),
            items:purchase_order_items(id, item_name, unit, quantity)
        `)
        .eq('project_id', wh.project_id)
        .in('status', ['ordered', 'partial_received'])
        .order('created_at', { ascending: false });

    return orders || [];
}

// 10. HÀNH ĐỘNG NHẬP KHO (GOODS RECEIPT) ---
export async function createGoodsReceiptAction(data: {
    po_id: string;
    warehouse_id: string;
    delivery_note: string;
    notes?: string;
    items: { po_item_id: string; item_name: string; unit: string; quantity_ordered: number; quantity_received: number; note?: string }[]
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Validate
    if (!data.warehouse_id) return { success: false, error: "Thiếu thông tin kho nhập." };

    // 2. Tạo Header Goods Receipt
    const code = `GR-${format(new Date(), "yyyyMMdd")}-${Math.floor(Math.random() * 1000)}`;

    const { data: gr, error: grError } = await supabase.from('goods_receipts').insert({
        code: code,
        po_id: data.po_id,
        warehouse_id: data.warehouse_id,
        receiver_id: user?.id, // Dùng receiver_id khớp với supabase.ts
        delivery_note_number: data.delivery_note,
        notes: data.notes,
        received_date: new Date().toISOString()
    }).select('id').single();

    if (grError || !gr) return { success: false, error: "Lỗi tạo phiếu nhập: " + grError?.message };

    // 3. Xử lý Chi tiết & Tăng Tồn Kho
    for (const item of data.items) {
        if (item.quantity_received > 0) {
            // 3a. Lưu vào bảng chi tiết phiếu nhập
            await supabase.from('goods_receipt_items').insert({
                receipt_id: gr.id,
                po_item_id: item.po_item_id,
                item_name: item.item_name,
                unit: item.unit,
                quantity_ordered: item.quantity_ordered,
                quantity_received: item.quantity_received,
                notes: item.note
            });

            // 3b. Cập nhật PROJECT_INVENTORY (Bảng tồn kho hiện tại của bạn)
            const { data: currentStock } = await supabase
                .from('project_inventory')
                .select('*')
                .eq('warehouse_id', data.warehouse_id)
                .eq('item_name', item.item_name)
                .single();

            // Tính giá nhập mới (Giả sử lấy giá từ PO Item nếu cần, ở đây tạm thời giữ nguyên giá avg cũ hoặc = 0 nếu mới)
            // Để chính xác, cần query purchase_order_items để lấy unit_price, rồi tính lại avg_price.
            // Tạm thời chỉ cộng số lượng để chạy quy trình.

            if (currentStock) {
                await supabase.from('project_inventory').update({
                    quantity_on_hand: Number(currentStock.quantity_on_hand) + Number(item.quantity_received),
                    last_updated: new Date().toISOString()
                }).eq('id', currentStock.id);
            } else {
                // Lấy project_id từ warehouse
                const { data: wh } = await supabase.from('warehouses').select('project_id').eq('id', data.warehouse_id).single();

                await supabase.from('project_inventory').insert({
                    warehouse_id: data.warehouse_id,
                    project_id: wh?.project_id,
                    item_name: item.item_name,
                    unit: item.unit,
                    quantity_on_hand: item.quantity_received,
                    avg_price: 0, // Cần update logic giá sau
                    last_updated: new Date().toISOString()
                });
            }
        }
    }

    // 4. Cập nhật trạng thái PO -> received
    await supabase.from('purchase_orders').update({ status: 'received' }).eq('id', data.po_id);

    revalidatePath(`/inventory/${data.warehouse_id}`);
    return { success: true, message: "Nhập kho thành công!" };
}

// LẤY DANH SÁCH KHO ĐƯỢC PHÂN QUYỀN (MY WAREHOUSES) ---
export async function getMyAuthorizedWarehouses() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    // 1. Lấy Profile từ Auth ID
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, role_id')
        .eq('auth_id', user.id)
        .single();

    if (!profile) return [];

    // 2. Xác định Employee ID
    // Theo Schema supabase.ts: employees.id LINK 1-1 với user_profiles.id
    // Do đó: Employee ID chính là Profile ID
    const employeeId = profile.id;

    // (Optional) Kiểm tra xem nhân viên này có tồn tại trong bảng employees không
    // để tránh lỗi FK nếu profile có mà employee chưa tạo
    const { count } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('id', employeeId);

    if (count === 0) {
        // Nếu không phải nhân viên, có thể return kho chung hoặc rỗng
        // return []; 
    }

    // 3. Lấy danh sách dự án mà nhân viên này tham gia
    const { data: members } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('employee_id', employeeId); // ✅ Dùng profile.id làm employee_id

    const projectIds = members?.map(m => m.project_id) || [];

    // 4. Query Kho (Kho của dự án tham gia HOẶC Kho chung)
    let query = supabase
        .from("warehouses")
        .select(`*, project:projects(code, name)`)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

    if (projectIds.length > 0) {
        // Lấy kho thuộc dự án tham gia OR Kho chung (project_id is null)
        query = query.or(`project_id.in.(${projectIds.join(',')}),project_id.is.null`);
    } else {
        // Nếu không tham gia dự án nào, chỉ thấy Kho chung
        query = query.is('project_id', null);
    }

    const { data: warehouses, error } = await query;

    if (error) {
        console.error("Lỗi lấy danh sách kho:", error);
        return [];
    }

    // 5. Đếm số lượng vật tư
    const result = await Promise.all((warehouses || []).map(async (w) => {
        const { count } = await supabase
            .from("project_inventory")
            .select("*", { count: 'exact', head: true })
            .eq("warehouse_id", w.id);

        return { ...w, items_count: count || 0 };
    }));

    return result;
}
// ... (Các hàm cũ giữ nguyên)

// 11. ACTION: XUẤT KHÁC (TRẢ NCC / HỦY / THANH LÝ)
export async function createOtherIssueAction(data: {
    warehouse_id: string;
    type: 'RETURN_VENDOR' | 'DISPOSAL'; // Loại nghiệp vụ
    partner_name: string; // Tên NCC hoặc Lý do hủy
    issue_date: Date;
    notes?: string;
    items: { item_name: string; unit: string; quantity: number; notes?: string }[]
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    try {
        // Tạo mã phiếu tùy theo loại
        const prefix = data.type === 'RETURN_VENDOR' ? 'XT' : 'XH'; // XT: Xuất Trả, XH: Xuất Hủy
        const code = `${prefix}-${format(new Date(), "yyyyMMdd")}-${Math.floor(Math.random() * 1000)}`;

        // Tạo Header (Lưu vào bảng goods_issues nhưng project_id để null)
        const { data: issue, error } = await supabase.from("goods_issues").insert({
            code,
            warehouse_id: data.warehouse_id,
            project_id: null, // Không gắn vào dự án cụ thể
            created_by: user?.id,
            receiver_name: data.partner_name, // Lưu tên NCC hoặc ghi chú hủy
            issue_date: data.issue_date.toISOString(),
            notes: data.notes
        }).select("id").single();

        if (error) throw new Error("Lỗi tạo phiếu: " + error.message);

        // Tạo Items & Trừ Tồn kho
        for (const item of data.items) {
            // Lấy giá vốn hiện tại để ghi nhận giá trị hàng hủy/trả
            const { data: stock } = await supabase.from("project_inventory")
                .select("id, quantity_on_hand, avg_price")
                .eq("warehouse_id", data.warehouse_id)
                .eq("item_name", item.item_name)
                .single();

            const unitPrice = stock?.avg_price || 0;

            await supabase.from("goods_issue_items").insert({
                issue_id: issue.id,
                item_name: item.item_name,
                unit: item.unit,
                quantity: item.quantity,
                unit_price: unitPrice,
                notes: item.notes
            });

            // TRỪ TỒN KHO
            if (stock) {
                // Kiểm tra lại lần cuối
                if (stock.quantity_on_hand < item.quantity) {
                    throw new Error(`Vật tư "${item.item_name}" không đủ tồn để xuất.`);
                }

                await supabase.from("project_inventory").update({
                    quantity_on_hand: Number(stock.quantity_on_hand) - Number(item.quantity),
                    last_updated: new Date().toISOString()
                }).eq("id", stock.id);
            }
        }

        revalidatePath(`/inventory/${data.warehouse_id}`);
        return { success: true, message: data.type === 'RETURN_VENDOR' ? "Đã xuất trả NCC thành công!" : "Đã xuất hủy thành công!" };
    } catch (e: any) { return { success: false, error: e.message }; }
}
// 12. [MỚI] LẤY DANH SÁCH PO ĐÃ NHẬP KHO (Để chọn khi xuất trả)
export async function getReceivedPOsByWarehouse(warehouseId: string) {
    const supabase = await createClient();

    // 1. Lấy Project ID của kho
    const { data: wh } = await supabase.from('warehouses').select('project_id').eq('id', warehouseId).single();

    // Nếu kho không thuộc dự án nào (Kho tổng), có thể lấy tất cả PO hoặc PO không thuộc dự án
    // Ở đây giả định luồng chuẩn là theo dự án
    const query = supabase
        .from('purchase_orders')
        .select(`
            id, code, created_at,
            supplier:suppliers(name),
            items:purchase_order_items(item_name, unit)
        `)
        .eq('status', 'received') // Chỉ lấy đơn đã nhập hàng xong mới có cái để trả
        .order('created_at', { ascending: false });

    if (wh?.project_id) {
        query.eq('project_id', wh.project_id);
    }

    const { data: pos, error } = await query;

    if (error) {
        console.error("Lỗi lấy PO đã nhập:", error);
        return [];
    }
    return pos || [];
}
// 13. [MỚI] CẬP NHẬT THÔNG TIN VẬT TƯ (Sửa tên, ĐVT)
export async function updateInventoryItemAction(id: string, newName: string, newUnit: string) {
    const supabase = await createClient();

    try {
        // Kiểm tra xem tên mới có bị trùng với vật tư khác trong cùng kho không
        if (newName) {
            const { data: existing } = await supabase
                .from("project_inventory")
                .select("id, warehouse_id")
                .eq("item_name", newName)
                .neq("id", id) // Không tính chính nó
                .single();

            // Lấy warehouse_id của item đang sửa để check trùng trong cùng kho
            const { data: current } = await supabase.from("project_inventory").select("warehouse_id").eq("id", id).single();

            if (existing && current && existing.warehouse_id === current.warehouse_id) {
                return { success: false, error: "Tên vật tư này đã tồn tại trong kho!" };
            }
        }

        const { error } = await supabase
            .from("project_inventory")
            .update({
                item_name: newName,
                unit: newUnit,
                last_updated: new Date().toISOString()
            })
            .eq("id", id);

        if (error) throw new Error(error.message);

        // Revalidate lại trang inventory (cần lấy warehouseId để revalidate đúng path)
        // Tuy nhiên ở đây revalidate path chung hoặc trả về success để client tự refresh
        return { success: true, message: "Cập nhật thành công!" };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// 14. [MỚI] XÓA VẬT TƯ (Chỉ xóa được khi Tồn = 0)
export async function deleteInventoryItemAction(id: string) {
    const supabase = await createClient();

    try {
        // 1. Kiểm tra tồn kho
        const { data: item } = await supabase.from("project_inventory").select("quantity_on_hand, item_name").eq("id", id).single();

        if (!item) return { success: false, error: "Vật tư không tồn tại" };
        if (item.quantity_on_hand > 0) return { success: false, error: `Không thể xóa "${item.item_name}" vì vẫn còn tồn kho (${item.quantity_on_hand})` };

        // 2. Thực hiện xóa
        const { error } = await supabase.from("project_inventory").delete().eq("id", id);

        if (error) throw new Error(error.message);

        return { success: true, message: "Đã xóa vật tư khỏi danh mục!" };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}