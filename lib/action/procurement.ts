"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { supplierSchema, purchaseOrderSchema, SupplierFormValues, PurchaseOrderFormValues } from "@/lib/schemas/procurement";
import { getUserProfile } from "@/lib/supabase/getUserProfile";

// ==============================================================================
// PHẦN 1: QUẢN LÝ ĐỀ XUẤT VẬT TƯ (MATERIAL REQUESTS)
// ==============================================================================

export async function getCurrentRequesterInfo() {
    const profile = await getUserProfile();
    if (!profile) return null;
    return {
        id: profile.entityId || profile.id,
        name: profile.name || "Người dùng",
        email: profile.email
    };
}

export async function getMaterialRequests(projectId: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from('material_requests')
        .select(`*, requester:employees!requester_id(name), items:material_request_items(*)`)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
    return data || [];
}

export async function createMaterialRequest(data: any, items: any[]) {
    const supabase = await createClient();
    try {
        if (!data.code) throw new Error("Thiếu Mã phiếu");
        if (!data.requester_id || data.requester_id.trim() === "") return { success: false, error: "Lỗi: Không xác định được ID người dùng." };

        const { data: request, error: reqError } = await supabase
            .from('material_requests')
            .insert({
                project_id: data.project_id, code: data.code, request_date: data.request_date,
                deadline_date: data.deadline_date, requester_id: data.requester_id,
                priority: data.priority, notes: data.notes, status: 'pending'
            }).select().single();

        if (reqError) return { success: false, error: "Lỗi tạo phiếu: " + reqError.message };

        const itemsPayload = items.map(item => ({
            request_id: request.id, item_name: item.item_name, unit: item.unit,
            quantity: Number(item.quantity), notes: item.notes || ""
        }));

        const { error: itemsError } = await supabase.from('material_request_items').insert(itemsPayload);
        if (itemsError) {
            await supabase.from('material_requests').delete().eq('id', request.id);
            return { success: false, error: itemsError.message };
        }

        revalidatePath(`/projects/${data.project_id}`);
        return { success: true, message: "Đã gửi yêu cầu thành công!" };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function deleteMaterialRequest(id: string, projectId: string) {
    const supabase = await createClient();
    await supabase.from('material_requests').delete().eq('id', id);
    revalidatePath(`/projects/${projectId}`);
}

export async function getProjectMembers(projectId: string) {
    const supabase = await createClient();
    const { data } = await supabase.from('employees').select('id, name, code').order('name');
    return data || [];
}

// ==============================================================================
// PHẦN 2: LOGIC DUYỆT & XỬ LÝ (CHECK TỒN KHO)
// ==============================================================================

export async function checkRequestFeasibility(requestId: string, projectId: string) {
    const supabase = await createClient();
    const { data: requestItems } = await supabase.from('material_request_items').select('*').eq('request_id', requestId);
    if (!requestItems || requestItems.length === 0) return { success: false, error: "Phiếu rỗng" };

    const { data: warehouse } = await supabase.from('warehouses').select('id').eq('project_id', projectId).limit(1).single();

    let inventoryMap: Record<string, number> = {};
    if (warehouse) {
        const { data: inventory } = await supabase.from('project_inventory').select('item_name, quantity_on_hand').eq('warehouse_id', warehouse.id);
        inventory?.forEach(item => { inventoryMap[item.item_name.toLowerCase().trim()] = item.quantity_on_hand; });
    }

    let budgetMap: Record<string, number> = {};
    const { data: estimates } = await supabase.from('estimation_items').select('material_name, quantity').eq('project_id', projectId);
    estimates?.forEach(item => { budgetMap[item.material_name.toLowerCase().trim()] = item.quantity; });

    const analysis = requestItems.map(item => {
        const key = item.item_name.toLowerCase().trim();
        const stock = inventoryMap[key] || 0;
        const budget = budgetMap[key] || 0;
        const requested = Number(item.quantity);
        const issueQty = Math.min(stock, requested);
        const purchaseQty = Math.max(0, requested - stock);

        return { ...item, stock_available: stock, budget_quantity: budget, approved_quantity: requested, action_issue: issueQty, action_purchase: purchaseQty };
    });

    return { success: true, data: analysis, warehouseId: warehouse?.id };
}

export async function approveAndProcessRequest(requestId: string, projectId: string, approvedItems: any[], warehouseId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    try {
        const toIssueItems = approvedItems.filter(i => i.action_issue > 0);
        const toPurchaseItems = approvedItems.filter(i => i.action_purchase > 0);

        if (toIssueItems.length === 0 && toPurchaseItems.length === 0) {
            await supabase.from('material_requests').update({ status: 'approved' }).eq('id', requestId);
            return { success: true, message: "Đã duyệt phiếu." };
        }

        // A. XUẤT KHO
        if (toIssueItems.length > 0) {
            if (!warehouseId) throw new Error("Dự án chưa có kho.");
            const issueCode = `PXK-${Date.now().toString().slice(-6)}`;
            const { data: issue, error: issueErr } = await supabase.from('goods_issues').insert({
                code: issueCode, project_id: projectId, warehouse_id: warehouseId, type: 'out', issue_date: new Date().toISOString(),
                status: 'approved', description: `Xuất tự động từ Đề xuất`, reference_id: requestId, created_by: user?.id
            }).select().single();

            if (issueErr) throw new Error("Lỗi tạo phiếu xuất: " + issueErr.message);

            const issueDetails = toIssueItems.map(item => ({ issue_id: issue.id, item_name: item.item_name, unit: item.unit, quantity: Number(item.action_issue), unit_price: 0 }));
            await supabase.from('goods_issue_items').insert(issueDetails);

            for (const item of toIssueItems) {
                const { data: stock } = await supabase.from('project_inventory').select('id, quantity_on_hand').eq('warehouse_id', warehouseId).ilike('item_name', item.item_name).maybeSingle();
                if (stock) await supabase.from('project_inventory').update({ quantity_on_hand: stock.quantity_on_hand - Number(item.action_issue) }).eq('id', stock.id);
            }
        }

        // B. MUA HÀNG (PO DRAFT)
        if (toPurchaseItems.length > 0) {
            const { data: po, error: poErr } = await supabase.from('purchase_orders').insert({
                project_id: projectId, code: `PO-AUTO-${Date.now().toString().slice(-6)}`, status: 'draft',
                order_date: new Date().toISOString(), notes: `Tự động tạo từ Đề xuất`, reference_id: requestId,
                created_by: user?.id, warehouse_id: warehouseId
            }).select().single();

            if (poErr) throw new Error("Lỗi tạo PO: " + poErr.message);

            const poDetails = toPurchaseItems.map(item => ({ po_id: po.id, item_name: item.item_name, unit: item.unit, quantity: Number(item.action_purchase), unit_price: 0 }));
            await supabase.from('purchase_order_items').insert(poDetails);
        }

        await supabase.from('material_requests').update({ status: 'approved' }).eq('id', requestId);
        revalidatePath(`/projects/${projectId}`);
        return { success: true, message: "Đã duyệt và thực thi thành công!" };

    } catch (e: any) { return { success: false, error: e.message }; }
}

// ==============================================================================
// PHẦN 3: CENTRAL PROCUREMENT & SPLIT PO (ĐÃ FIX - BỔ SUNG ĐẦY ĐỦ)
// ==============================================================================

// 1. Lấy dữ liệu cho trang Central Request
export async function getAllPendingRequests() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('material_requests')
        .select(`
            *,
            items:material_request_items(*),
            project:projects(id, name, code),
            requester:requester_id(name)
        `)
        .in('status', ['approved', 'processing'])
        .order('created_at', { ascending: false });

    if (error) return [];
    return data || [];
}

// 2. Lấy chi tiết Yêu cầu để tạo PO (Tính số lượng còn lại)
export async function getMaterialRequestForPO(requestId: string) {
    const supabase = await createClient();

    // Lấy Header
    const { data: req } = await supabase.from('material_requests').select('id, project_id, code').eq('id', requestId).single();
    if (!req) return null;

    // Lấy Items
    const { data: requestItems } = await supabase.from('material_request_items').select('*').eq('request_id', requestId);
    if (!requestItems) return { projectId: req.project_id, items: [] };

    // Lấy các PO đã tạo từ Request này để trừ lùi
    const { data: existingPos } = await supabase
        .from('purchase_orders')
        .select('id, items:purchase_order_items(item_name, quantity)')
        .eq('reference_id', requestId); // Dùng reference_id

    const orderedMap = new Map<string, number>();
    existingPos?.forEach(po => {
        po.items.forEach((poItem: any) => {
            const current = orderedMap.get(poItem.item_name) || 0;
            orderedMap.set(poItem.item_name, current + Number(poItem.quantity));
        });
    });

    const itemsToOrder = requestItems.map(item => {
        const ordered = orderedMap.get(item.item_name) || 0;
        const requested = Number(item.quantity);
        const remaining = Math.max(0, requested - ordered);

        return {
            id: item.id,
            item_name: item.item_name,
            unit: item.unit,
            quantity: requested,
            remaining_quantity: remaining,
            is_fully_ordered: remaining === 0,
            unit_price: 0,
            vat_rate: 0
        };
    });

    return {
        projectId: req.project_id,
        items: itemsToOrder
    };
}

// 3. Tạo Split PO (ĐÃ FIX: Trả về object đúng chuẩn)
export async function createSplitPOAction(
    projectId: string,
    requestId: string,
    supplierId: string,
    warehouseId: string,
    deliveryDate: string,
    itemsToOrder: any[]
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    try {
        if (!projectId) {
            const { data: req } = await supabase.from('material_requests').select('project_id').eq('id', requestId).single();
            if (req) projectId = req.project_id;
        }

        const code = `PO-${Date.now().toString().slice(-6)}`;

        const { data: po, error: poError } = await supabase
            .from('purchase_orders')
            .insert({
                project_id: projectId,
                reference_id: requestId,
                supplier_id: supplierId,
                warehouse_id: warehouseId || null,
                code: code,
                order_date: new Date().toISOString(),
                expected_delivery_date: deliveryDate ? new Date(deliveryDate).toISOString() : null,
                status: 'ordered',
                total_amount: 0,
                created_by: user?.id
            })
            .select()
            .single();

        if (poError) throw new Error("Lỗi tạo PO: " + poError.message);

        const poItemsData = itemsToOrder.map(item => ({
            po_id: po.id,
            item_name: item.item_name,
            unit: item.unit,
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price || 0),
            vat_rate: 0
        }));

        const { error: itemsError } = await supabase.from('purchase_order_items').insert(poItemsData);
        if (itemsError) throw new Error("Lỗi lưu chi tiết: " + itemsError.message);

        // Update trạng thái Request
        await supabase.from('material_requests').update({ status: 'processing' }).eq('id', requestId);

        revalidatePath(`/procurement`);
        revalidatePath(`/procurement/orders`);

        // ✅ TRẢ VỀ ĐÚNG FORMAT MÀ FRONTEND MONG ĐỢI
        return { success: true, message: "Đã tạo Đơn hàng thành công!", poId: po.id };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// ==============================================================================
// PHẦN 4: CRUD PO & SUPPLIER (GIỮ NGUYÊN)
// ==============================================================================

export async function getSuppliers() {
    const supabase = await createClient();
    const { data } = await supabase.from("suppliers").select("*").order("created_at", { ascending: false });
    return data || [];
}

export async function getPurchaseOrders(filters?: { projectId?: string; supplierId?: string }) {
    const supabase = await createClient();
    let query = supabase.from("purchase_orders").select(`*, supplier:suppliers(name), project:projects(name, code)`).order("created_at", { ascending: false });
    if (filters?.projectId && filters.projectId !== "all") query = query.eq("project_id", filters.projectId);
    if (filters?.supplierId && filters.supplierId !== "all") query = query.eq("supplier_id", filters.supplierId);
    const { data } = await query;
    return data || [];
}

export async function getPurchaseOrderById(id: string) {
    const supabase = await createClient();
    const { data } = await supabase.from("purchase_orders").select(`*, supplier:suppliers(*), project:projects(id,name,code,address), items:purchase_order_items(*)`).eq("id", id).single();
    return data;
}

export async function createPurchaseOrderAction(data: PurchaseOrderFormValues) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    try {
        const total = data.items.reduce((sum, i) => sum + (i.quantity * i.unit_price * (1 + i.vat_rate / 100)), 0);

        const { data: po, error } = await supabase.from('purchase_orders').insert({
            code: data.code, project_id: data.project_id, supplier_id: data.supplier_id, created_by: user?.id,
            order_date: data.order_date ? new Date(data.order_date).toISOString() : new Date().toISOString(),
            notes: data.notes || "", status: 'ordered', total_amount: total
        }).select().single();

        if (error) throw new Error(error.message);

        const items = data.items.map(i => ({ po_id: po.id, item_name: i.item_name, unit: i.unit, quantity: i.quantity, unit_price: i.unit_price, vat_rate: i.vat_rate }));
        await supabase.from('purchase_order_items').insert(items);

        revalidatePath("/procurement/orders");
        return { success: true, message: "Tạo PO thành công" };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function updatePurchaseOrderAction(id: string, data: any) {
    const supabase = await createClient();
    try {
        const { items, ...poData } = data;
        const total = items.reduce((sum: number, i: any) => sum + (i.quantity * i.unit_price * (1 + (i.vat_rate || 0) / 100)), 0);

        const updateData: any = { ...poData, total_amount: total };
        if (updateData.order_date) updateData.order_date = new Date(updateData.order_date).toISOString();
        if (updateData.expected_delivery_date) updateData.expected_delivery_date = new Date(updateData.expected_delivery_date).toISOString();

        await supabase.from("purchase_orders").update(updateData).eq("id", id);
        await supabase.from("purchase_order_items").delete().eq("po_id", id);
        const newItems = items.map((i: any) => ({ po_id: id, item_name: i.item_name, unit: i.unit, quantity: i.quantity, unit_price: i.unit_price, vat_rate: i.vat_rate }));
        await supabase.from("purchase_order_items").insert(newItems);

        revalidatePath(`/procurement/orders/${id}`);
        return { success: true, message: "Cập nhật thành công" };
    } catch (e: any) { return { success: false, error: e.message }; }
}

export async function deletePurchaseOrderAction(id: string) {
    const supabase = await createClient();
    const { data: po } = await supabase.from("purchase_orders").select("status").eq("id", id).single();
    if (po?.status === 'received' || po?.status === 'completed') return { success: false, error: "Không thể xóa PO đã nhập kho" };
    await supabase.from("purchase_order_items").delete().eq("po_id", id);
    await supabase.from("purchase_orders").delete().eq("id", id);
    revalidatePath("/procurement/orders");
    return { success: true, message: "Đã xóa" };
}

export async function createGoodsReceiptAction(poId: string, notes: string, targetWarehouseId: string, image_url?: string) {
    const supabase = await createClient();
    const { data: po } = await supabase.from("purchase_orders").select(`*, items:purchase_order_items(*)`).eq("id", poId).single();
    if (!po) return { success: false, error: "Không tìm thấy PO" };

    await supabase.from("goods_receipts").insert({ po_id: poId, received_date: new Date().toISOString(), notes, receipt_image_url: image_url });

    for (const item of po.items) {
        const { data: stock } = await supabase.from("project_inventory").select("*").eq("warehouse_id", targetWarehouseId).eq("item_name", item.item_name).single();
        if (stock) {
            const newQty = stock.quantity_on_hand + item.quantity;
            await supabase.from("project_inventory").update({ quantity_on_hand: newQty }).eq("id", stock.id);
        } else {
            await supabase.from("project_inventory").insert({
                project_id: po.project_id, warehouse_id: targetWarehouseId, item_name: item.item_name,
                unit: item.unit, quantity_on_hand: item.quantity, avg_price: item.unit_price
            });
        }
    }
    await supabase.from("purchase_orders").update({ status: 'received' }).eq("id", poId);
    revalidatePath(`/procurement/orders/${poId}`);
    return { success: true, message: "Nhập kho thành công" };
}

export async function getExpenseCategories() {
    const supabase = await createClient();
    const { data } = await supabase.from("finance_categories").select("id, name").eq("type", "expense");
    return data || [];
}

export async function getPOTransactions(poId: string) {
    const supabase = await createClient();
    const { data } = await supabase.from("finance_transactions").select("*").eq("po_id", poId).order("transaction_date", { ascending: false });
    return data || [];
}

export async function createPaymentForPOAction(poId: string, projectId: string, amount: number, categoryId: string, paymentDate: Date, method: string, notes: string) {
    const supabase = await createClient();
    if (!categoryId) return { success: false, error: "Chọn hạng mục chi" };
    await supabase.from("finance_transactions").insert({
        amount, type: 'expense', category_id: categoryId, project_id: projectId, po_id: poId,
        description: notes, transaction_date: paymentDate.toISOString(), payment_method: method
    });

    // Auto complete PO if paid enough (logic đơn giản)
    const { data: po } = await supabase.from("purchase_orders").select("total_amount").eq("id", poId).single();
    if (po && amount >= po.total_amount) await supabase.from("purchase_orders").update({ status: 'completed' }).eq("id", poId);

    revalidatePath(`/procurement/orders/${poId}`);
    return { success: true, message: "Đã chi tiền" };
}

// PHẦN CENTRAL & QTO
export async function getProjectStandardizedMaterials(projectId: string) {
    const supabase = await createClient();
    const { data: estimates } = await supabase.from('estimation_items').select('material_name, unit, quantity').eq('project_id', projectId).gt('quantity', 0);
    if (estimates?.length) return estimates.map(i => ({ name: i.material_name, unit: i.unit, budget: i.quantity }));

    const { data: budget } = await supabase.from('project_material_budget').select('material_name, unit, budget_quantity').eq('project_id', projectId);
    if (budget?.length) return budget.map(i => ({ name: i.material_name, unit: i.unit, budget: i.budget_quantity }));

    // Fallback: Raw QTO
    const { data: raw } = await supabase.from('qto_items_calculated').select(`material_name, unit, quantity, qto_items!inner(project_id)`).eq('qto_items.project_id', projectId);
    if (raw?.length) {
        const map = new Map();
        raw.forEach((i: any) => {
            const key = i.material_name?.trim().toLowerCase();
            if (!key) return;
            if (map.has(key)) map.get(key).budget += Number(i.quantity || 0);
            else map.set(key, { name: i.material_name, unit: i.unit, budget: Number(i.quantity || 0) });
        });
        return Array.from(map.values());
    }
    return [];
}

// --- BỔ SUNG HÀM TẠO NHÀ CUNG CẤP ---
export async function createSupplierAction(data: any) {
    const supabase = await createClient();
    try {
        const { error } = await supabase.from('suppliers').insert({
            name: data.name,
            type: data.type,
            contact_person: data.contact_person,
            phone: data.phone,
            email: data.email,
            address: data.address,
            tax_code: data.tax_code,
            created_at: new Date().toISOString()
        });

        if (error) throw new Error(error.message);

        revalidatePath('/procurement/suppliers');
        return { success: true, message: "Thêm nhà cung cấp thành công!" };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}