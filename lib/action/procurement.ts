"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { supplierSchema, purchaseOrderSchema, SupplierFormValues, PurchaseOrderFormValues } from "@/lib/schemas/procurement";
import { startOfMonth, subMonths, format } from "date-fns";

// ==============================================================================
// PHẦN 1: QUẢN LÝ ĐỀ XUẤT VẬT TƯ (MATERIAL REQUESTS) - [BỔ SUNG]
// ==============================================================================

// 1. Lấy danh sách phiếu đề xuất của dự án
export async function getMaterialRequests(projectId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('material_requests')
        .select(`
            *,
            requester:employees!requester_id(name),
            items:material_request_items(*)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Lỗi lấy đề xuất vật tư:", error);
        return [];
    }
    return data || [];
}

// 2. Tạo phiếu đề xuất mới
export async function createMaterialRequest(data: any, items: any[]) {
    const supabase = await createClient();

    const { data: request, error: reqError } = await supabase
        .from('material_requests')
        .insert({
            project_id: data.project_id,
            code: data.code,
            request_date: data.request_date,
            deadline_date: data.deadline_date,
            requester_id: data.requester_id,
            priority: data.priority,
            notes: data.notes,
            status: 'pending'
        })
        .select()
        .single();

    if (reqError || !request) return { success: false, error: reqError?.message };

    if (items.length > 0) {
        const itemsPayload = items.map(item => ({
            request_id: request.id,
            item_name: item.item_name,
            unit: item.unit,
            quantity: Number(item.quantity),
            notes: item.notes
        }));

        const { error: itemsError } = await supabase
            .from('material_request_items')
            .insert(itemsPayload);

        if (itemsError) {
            await supabase.from('material_requests').delete().eq('id', request.id);
            return { success: false, error: "Lỗi lưu chi tiết vật tư: " + itemsError.message };
        }
    }

    revalidatePath(`/projects/${data.project_id}`);
    return { success: true, message: "Đã tạo phiếu đề xuất thành công!" };
}

// 3. Xóa phiếu đề xuất
export async function deleteMaterialRequest(requestId: string, projectId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('material_requests')
        .delete()
        .eq('id', requestId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
}

// 4. Lấy danh sách nhân viên
export async function getProjectMembers(projectId: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from('employees')
        .select('id, name, code')
        .order('name');
    return data || [];
}

// ==============================================================================
// PHẦN 2: LOGIC XỬ LÝ NÂNG CAO (CHECK TỒN KHO & TỰ ĐỘNG TÁCH PHIẾU) - [BỔ SUNG]
// ==============================================================================

// 5. Kiểm tra khả thi (Check Feasibility)
export async function checkRequestFeasibility(requestId: string, projectId: string) {
    const supabase = await createClient();

    // A. Lấy chi tiết phiếu đề xuất
    const { data: requestItems } = await supabase
        .from('material_request_items')
        .select('*')
        .eq('request_id', requestId);

    if (!requestItems || requestItems.length === 0) return { success: false, error: "Phiếu rỗng, không có vật tư" };

    // B. Lấy kho của dự án
    const { data: warehouse } = await supabase
        .from('warehouses')
        .select('id')
        .eq('project_id', projectId)
        .limit(1)
        .single();

    // C. Lấy tồn kho hiện tại
    let inventoryMap: Record<string, number> = {};
    if (warehouse) {
        const { data: inventory } = await supabase
            .from('project_inventory')
            .select('item_name, quantity_on_hand')
            .eq('warehouse_id', warehouse.id);

        inventory?.forEach(item => {
            inventoryMap[item.item_name.toLowerCase().trim()] = item.quantity_on_hand;
        });
    }

    // D. Phân tích
    const analysis = requestItems.map(item => {
        const itemNameKey = item.item_name.toLowerCase().trim();
        const stock = inventoryMap[itemNameKey] || 0;
        const requested = item.quantity;

        const issueQty = Math.min(stock, requested);
        const purchaseQty = Math.max(0, requested - stock);

        return {
            ...item,
            stock_available: stock,
            action_issue: issueQty,
            action_purchase: purchaseQty
        };
    });

    return { success: true, data: analysis, warehouseId: warehouse?.id };
}

// 6. Duyệt & Xử lý tự động (Approve & Process)
export async function approveAndProcessRequest(
    requestId: string,
    projectId: string,
    analysisData: any[],
    warehouseId: string
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    try {
        const toIssueItems = analysisData.filter(i => i.action_issue > 0);
        const toPurchaseItems = analysisData.filter(i => i.action_purchase > 0);

        // A. TẠO PHIẾU XUẤT KHO (Goods Issue)
        if (toIssueItems.length > 0) {
            if (!warehouseId) throw new Error("Không tìm thấy kho của dự án để xuất hàng.");

            const { data: issue, error: issueErr } = await supabase
                .from('goods_issues')
                .insert({
                    project_id: projectId,
                    warehouse_id: warehouseId,
                    type: 'out',
                    issue_date: new Date().toISOString(),
                    status: 'approved',
                    description: `Xuất tự động từ Đề xuất vật tư`,
                    reference_id: requestId,
                    created_by: user?.id
                })
                .select()
                .single();

            if (issueErr) throw new Error("Lỗi tạo phiếu xuất: " + issueErr.message);

            const issueDetails = toIssueItems.map(item => ({
                issue_id: issue.id,
                item_name: item.item_name,
                unit: item.unit,
                quantity: item.action_issue,
                unit_price: 0
            }));

            await supabase.from('goods_issue_items').insert(issueDetails);

            // TRỪ TỒN KHO NGAY LẬP TỨC
            for (const item of toIssueItems) {
                const { data: currentStock } = await supabase
                    .from('project_inventory')
                    .select('id, quantity_on_hand')
                    .eq('warehouse_id', warehouseId)
                    .ilike('item_name', item.item_name)
                    .single();

                if (currentStock) {
                    const newQty = currentStock.quantity_on_hand - item.action_issue;
                    await supabase
                        .from('project_inventory')
                        .update({ quantity_on_hand: newQty })
                        .eq('id', currentStock.id);
                }
            }
        }

        // B. TẠO ĐƠN MUA HÀNG (Purchase Order - Draft)
        if (toPurchaseItems.length > 0) {
            const { data: po, error: poErr } = await supabase
                .from('purchase_orders')
                .insert({
                    project_id: projectId,
                    code: `PO-AUTO-${Date.now().toString().slice(-6)}`,
                    status: 'draft',
                    order_date: new Date().toISOString(),
                    notes: `Tự động tạo từ Đề xuất (Phần thiếu hàng)`,
                    reference_id: requestId,
                    created_by: user?.id,
                    warehouse_id: warehouseId // Gán kho mặc định
                })
                .select()
                .single();

            if (poErr) throw new Error("Lỗi tạo PO: " + poErr.message);

            const poDetails = toPurchaseItems.map(item => ({
                po_id: po.id,
                item_name: item.item_name,
                unit: item.unit,
                quantity: item.action_purchase,
                unit_price: 0
            }));

            await supabase.from('purchase_order_items').insert(poDetails);
        }

        // C. CẬP NHẬT TRẠNG THÁI PHIẾU YÊU CẦU
        await supabase
            .from('material_requests')
            .update({ status: 'approved' })
            .eq('id', requestId);

        revalidatePath(`/projects/${projectId}`);
        revalidatePath('/inventory');
        revalidatePath('/finance');

        return { success: true, message: "Đã xử lý: Tạo Phiếu xuất & PO thành công!" };

    } catch (e: any) {
        console.error("Lỗi xử lý duyệt:", e);
        return { success: false, error: e.message };
    }
}

// ==============================================================================
// PHẦN 3: NHÀ CUNG CẤP (SUPPLIERS)
// ==============================================================================

export async function getSuppliers() {
    const supabase = await createClient();
    const { data } = await supabase.from("suppliers").select("*").order("created_at", { ascending: false });
    return data || [];
}

export async function createSupplierAction(data: SupplierFormValues) {
    const supabase = await createClient();

    const validated = supplierSchema.safeParse(data);
    if (!validated.success) return { success: false, error: "Dữ liệu không hợp lệ" };

    const { error } = await supabase.from("suppliers").insert({
        ...validated.data,
        created_at: new Date().toISOString(),
    });

    if (error) return { success: false, error: error.message };

    revalidatePath("/procurement/suppliers");
    return { success: true, message: "Thêm nhà cung cấp thành công" };
}

// ==============================================================================
// PHẦN 4: ĐƠN MUA HÀNG (PURCHASE ORDERS)
// ==============================================================================

// Lấy danh sách có Filter
export async function getPurchaseOrders(filters?: { projectId?: string; supplierId?: string }) {
    const supabase = await createClient();

    let query = supabase
        .from("purchase_orders")
        .select(`
        *,
        supplier:suppliers (name),
        project:projects (name, code)
      `)
        .order("created_at", { ascending: false });

    if (filters?.projectId && filters.projectId !== "all") {
        query = query.eq("project_id", filters.projectId);
    }

    if (filters?.supplierId && filters.supplierId !== "all") {
        query = query.eq("supplier_id", filters.supplierId);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Lỗi lấy danh sách đơn hàng:", error);
        return [];
    }
    return data || [];
}

// Lấy chi tiết 1 đơn hàng
export async function getPurchaseOrderById(id: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("purchase_orders")
        .select(`
        *,
        supplier:suppliers (*),
        project:projects (id, name, code, address),
        items:purchase_order_items (*)
      `)
        .eq("id", id)
        .single();

    if (error) return null;
    return data;
}

// TẠO PO THỦ CÔNG (MANUAL)
export async function createPurchaseOrderAction(data: PurchaseOrderFormValues) {
    const supabase = await createClient();

    try {
        if (!data.project_id) return { success: false, error: "Vui lòng chọn Dự án" };
        if (!data.supplier_id) return { success: false, error: "Vui lòng chọn Nhà cung cấp" };
        if (!data.items || data.items.length === 0) return { success: false, error: "Đơn hàng phải có ít nhất 1 sản phẩm" };

        const { data: { user } } = await supabase.auth.getUser();

        // Tính tổng tiền
        const calculatedTotal = data.items.reduce((sum, item) => {
            const qty = Number(item.quantity) || 0;
            const price = Number(item.unit_price) || 0;
            const vat = Number(item.vat_rate) || 0;
            const lineTotal = qty * price * (1 + vat / 100);
            return sum + lineTotal;
        }, 0);

        // A. Tạo Header PO
        const { data: po, error: poError } = await supabase
            .from('purchase_orders')
            .insert({
                code: data.code,
                project_id: data.project_id,
                request_id: null,
                supplier_id: data.supplier_id,
                created_by: user?.id,
                order_date: data.order_date ? new Date(data.order_date).toISOString() : new Date().toISOString(),
                notes: data.notes || "",
                status: 'ordered',
                total_amount: calculatedTotal
            })
            .select()
            .single();

        if (poError) throw new Error("Lỗi tạo PO: " + poError.message);

        // B. Tạo PO Items
        const poItemsData = data.items.map(item => ({
            po_id: po.id,
            item_name: item.item_name,
            unit: item.unit,
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price || 0),
            vat_rate: Number(item.vat_rate || 0),
        }));

        const { error: itemsError } = await supabase
            .from('purchase_order_items')
            .insert(poItemsData);

        if (itemsError) throw new Error("Lỗi lưu chi tiết PO: " + itemsError.message);

        revalidatePath("/procurement/orders");
        revalidatePath("/procurement");

        return { success: true, message: "Đã tạo đơn hàng thành công!" };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// Cập nhật Đơn hàng (Edit)
export async function updatePurchaseOrderAction(id: string, data: PurchaseOrderFormValues & { status?: string }) {
    const supabase = await createClient();

    const validated = purchaseOrderSchema.safeParse(data);
    if (!validated.success) return { success: false, error: "Dữ liệu lỗi" };

    const { items, ...poData } = validated.data;

    const totalAmount = items.reduce((sum, item) => {
        const preTaxTotal = item.quantity * item.unit_price;
        const vatAmount = preTaxTotal * (item.vat_rate / 100);
        return sum + preTaxTotal + vatAmount;
    }, 0);

    const updateData: any = {
        code: poData.code,
        project_id: poData.project_id,
        supplier_id: poData.supplier_id,
        order_date: poData.order_date.toISOString(),
        expected_delivery_date: poData.expected_delivery_date?.toISOString(),
        notes: poData.notes,
        total_amount: totalAmount,
    };

    if (data.status) {
        updateData.status = data.status;
    }

    const { error: poError } = await supabase
        .from("purchase_orders")
        .update(updateData)
        .eq("id", id);

    if (poError) return { success: false, error: "Lỗi cập nhật đơn hàng: " + poError.message };

    const { error: deleteError } = await supabase.from("purchase_order_items").delete().eq("po_id", id);
    if (deleteError) return { success: false, error: "Lỗi xóa dữ liệu cũ" };

    const itemsToInsert = items.map(item => ({
        po_id: id,
        item_name: item.item_name,
        unit: item.unit,
        quantity: item.quantity,
        unit_price: item.unit_price,
        vat_rate: item.vat_rate
    }));

    const { error: insertError } = await supabase.from("purchase_order_items").insert(itemsToInsert);

    if (insertError) return { success: false, error: "Lỗi lưu chi tiết vật tư mới" };

    revalidatePath(`/procurement/orders/${id}`);
    revalidatePath("/procurement/orders");

    return { success: true, message: "Cập nhật đơn hàng thành công!" };
}

export async function deletePurchaseOrderAction(id: string) {
    const supabase = await createClient();

    const { data: po } = await supabase.from("purchase_orders").select("status").eq("id", id).single();

    if (!po) return { success: false, error: "Đơn hàng không tồn tại" };
    if (po.status === 'received' || po.status === 'completed') {
        return { success: false, error: "Không thể xóa đơn hàng đã nhập kho hoặc hoàn thành!" };
    }

    const { error: itemsError } = await supabase.from("purchase_order_items").delete().eq("po_id", id);
    if (itemsError) return { success: false, error: "Lỗi xóa chi tiết: " + itemsError.message };

    const { error: poError } = await supabase.from("purchase_orders").delete().eq("id", id);
    if (poError) return { success: false, error: "Lỗi xóa đơn hàng: " + poError.message };

    revalidatePath("/procurement/orders");
    return { success: true, message: "Đã xóa đơn hàng thành công" };
}

// ==============================================================================
// PHẦN 5: NHẬP KHO (GOODS RECEIPTS / GRN)
// ==============================================================================

export async function createGoodsReceiptAction(
    poId: string,
    notes: string,
    targetWarehouseId: string,
    image_url?: string
) {
    const supabase = await createClient();

    // 1. Lấy thông tin Đơn hàng
    const { data: po, error: poError } = await supabase
        .from("purchase_orders")
        .select(`*, items:purchase_order_items(*)`)
        .eq("id", poId)
        .single();

    if (poError || !po) return { success: false, error: "Không tìm thấy đơn hàng gốc" };

    const warehouseId = targetWarehouseId;
    if (!warehouseId) return { success: false, error: "Vui lòng chọn kho để nhập hàng!" };

    // 2. Tạo phiếu nhập (GRN)
    const { error: grnError } = await supabase.from("goods_receipts").insert({
        po_id: poId,
        received_date: new Date().toISOString(),
        notes: notes,
        receipt_image_url: image_url || null,
        created_at: new Date().toISOString(),
    });

    if (grnError) return { success: false, error: "Lỗi tạo phiếu nhập: " + grnError.message };

    // 3. CẬP NHẬT TỒN KHO (Tương tự logic cũ)
    for (const item of po.items) {
        const { data: currentStock } = await supabase
            .from("project_inventory")
            .select("*")
            .eq("warehouse_id", warehouseId)
            .eq("item_name", item.item_name)
            .single();

        if (currentStock) {
            const oldQty = Number(currentStock.quantity_on_hand);
            const oldPrice = Number(currentStock.avg_price);
            const newQty = Number(item.quantity);
            const newPrice = Number(item.unit_price);

            const totalQty = oldQty + newQty;
            const avgPrice = totalQty > 0 ? ((oldQty * oldPrice) + (newQty * newPrice)) / totalQty : newPrice;

            await supabase.from("project_inventory").update({
                quantity_on_hand: totalQty,
                avg_price: avgPrice,
                last_updated: new Date().toISOString()
            }).eq("id", currentStock.id);

        } else {
            await supabase.from("project_inventory").insert({
                project_id: po.project_id,
                warehouse_id: warehouseId,
                item_name: item.item_name,
                unit: item.unit,
                quantity_on_hand: item.quantity,
                avg_price: item.unit_price,
                last_updated: new Date().toISOString()
            });
        }
    }

    // 4. Cập nhật trạng thái Đơn hàng -> Received
    await supabase.from("purchase_orders").update({ status: 'received' }).eq("id", poId);

    revalidatePath(`/procurement/orders/${poId}`);
    return { success: true, message: "Đã nhập kho thành công!" };
}

// ==============================================================================
// PHẦN 6: THANH TOÁN (PAYMENTS)
// ==============================================================================

export async function getExpenseCategories() {
    const supabase = await createClient();
    const { data } = await supabase
        .from("finance_categories")
        .select("id, name")
        .eq("type", "expense")
        .order("name");
    return data || [];
}

export async function getPOTransactions(poId: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from("finance_transactions")
        .select("*")
        .eq("po_id", poId)
        .order("transaction_date", { ascending: false });
    return data || [];
}

export async function createPaymentForPOAction(
    poId: string,
    projectId: string,
    amount: number,
    categoryId: string,
    paymentDate: Date,
    method: string,
    notes: string
) {
    const supabase = await createClient();

    if (!categoryId) {
        return { success: false, error: "Lỗi: Chưa chọn hạng mục chi (Category ID bị thiếu)" };
    }

    const { data: trans, error: transError } = await supabase.from("finance_transactions").insert({
        amount: amount,
        type: 'expense',
        category_id: categoryId,
        project_id: projectId,
        po_id: poId,
        description: notes,
        transaction_date: paymentDate.toISOString(),
        payment_method: method,
        created_at: new Date().toISOString()
    }).select();

    if (transError) {
        return { success: false, error: "Lỗi tạo phiếu chi: " + transError.message };
    }

    // Kiểm tra công nợ để cập nhật trạng thái PO
    const { data: po } = await supabase.from("purchase_orders").select("total_amount").eq("id", poId).single();
    const { data: transactions } = await supabase.from("finance_transactions").select("amount").eq("po_id", poId);
    const totalPaid = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    if (po && totalPaid >= po.total_amount - 1000) {
        await supabase.from("purchase_orders").update({ status: 'completed' }).eq("id", poId);
    }

    revalidatePath(`/procurement/orders/${poId}`);
    revalidatePath("/finance");

    return { success: true, message: "Đã lập phiếu chi thành công!" };
}

// ==============================================================================
// PHẦN 7: CENTRAL PROCUREMENT (XỬ LÝ TRUNG TÂM / SPLIT PO)
// ==============================================================================

// 1. Lấy danh sách Yêu cầu vật tư cần xử lý
export async function getProjectProcurementRequests(projectId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('material_requests')
        .select(`*, items:material_request_items(*), requester:requester_id(name)`)
        .eq('project_id', projectId)
        .in('status', ['approved', 'processing'])
        .order('created_at', { ascending: false });

    if (error) return [];
    return data || [];
}

// 2. Tính toán trạng thái từng món
export async function getRequestItemsWithStatus(requestId: string) {
    const supabase = await createClient();

    const { data: requestItems } = await supabase
        .from('material_request_items')
        .select('*')
        .eq('request_id', requestId);

    if (!requestItems) return [];

    const { data: existingPos } = await supabase
        .from('purchase_orders')
        .select('id, items:purchase_order_items(item_name, quantity)')
        .eq('request_id', requestId);

    const orderedMap = new Map<string, number>();
    existingPos?.forEach(po => {
        po.items.forEach((poItem: any) => {
            const current = orderedMap.get(poItem.item_name) || 0;
            orderedMap.set(poItem.item_name, current + Number(poItem.quantity));
        });
    });

    return requestItems.map(item => {
        const ordered = orderedMap.get(item.item_name) || 0;
        const requested = Number(item.quantity);
        const remaining = Math.max(0, requested - ordered);

        return {
            ...item,
            ordered_quantity: ordered,
            remaining_quantity: remaining,
            is_fully_ordered: remaining === 0
        };
    });
}

// 3. Helper lấy danh sách kho
export async function getWarehouses() {
    const supabase = await createClient();
    const { data } = await supabase.from('warehouses').select('*').eq('status', 'active');
    return data || [];
}

// 4. Tạo PO Split từ Central
export async function createSplitPOAction(
    projectId: string,
    requestId: string,
    supplierId: string,
    warehouseId: string,
    deliveryDate: string,
    itemsToOrder: any[]
) {
    const supabase = await createClient();
    if (!projectId) {
        const { data: req } = await supabase.from('material_requests').select('project_id').eq('id', requestId).single();
        if (req) projectId = req.project_id;
    }
    if (!warehouseId) return { success: false, error: "Vui lòng chọn Kho nhận hàng!" };
    if (itemsToOrder.length === 0) return { success: false, error: "Chưa chọn vật tư nào!" };

    try {
        const code = `PO-${Date.now().toString().slice(-6)}`;

        const { data: po, error: poError } = await supabase
            .from('purchase_orders')
            .insert({
                project_id: projectId,
                request_id: requestId,
                supplier_id: supplierId,
                warehouse_id: warehouseId,
                code: code,
                order_date: new Date().toISOString(),
                expected_delivery_date: deliveryDate ? new Date(deliveryDate).toISOString() : null,
                status: 'draft',
                total_amount: 0
            })
            .select()
            .single();

        if (poError) throw new Error("Lỗi tạo PO: " + poError.message);

        const poItemsData = itemsToOrder.map(item => ({
            po_id: po.id,
            item_name: item.item_name,
            unit: item.unit,
            quantity: Number(item.quantity),
            unit_price: 0,
            vat_rate: 0
        }));

        const { error: itemsError } = await supabase
            .from('purchase_order_items')
            .insert(poItemsData);

        if (itemsError) throw new Error("Lỗi lưu chi tiết: " + itemsError.message);

        await supabase.from('material_requests').update({ status: 'processing' }).eq('id', requestId);

        revalidatePath(`/procurement`);
        return { success: true, message: "Đã tạo PO Nháp!", poId: po.id };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// 5. Thống kê nhanh
export async function getProcurementStats() {
    const supabase = await createClient();

    const { count: pendingCount } = await supabase
        .from('material_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

    const { count: orderedCount } = await supabase
        .from('purchase_orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ordered');

    return {
        pendingRequests: pendingCount || 0,
        activePOs: orderedCount || 0
    };
}

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

export async function getMaterialRequestForPO(requestId: string) {
    const supabase = await createClient();

    const { data: req, error } = await supabase
        .from('material_requests')
        .select('id, project_id, code')
        .eq('id', requestId)
        .single();

    if (error || !req) return null;

    const { data: requestItems } = await supabase
        .from('material_request_items')
        .select('*')
        .eq('request_id', requestId);

    if (!requestItems) return { projectId: req.project_id, items: [] };

    const { data: existingPos } = await supabase
        .from('purchase_orders')
        .select('id, items:purchase_order_items(item_name, quantity)')
        .eq('request_id', requestId);

    const orderedMap = new Map<string, number>();
    existingPos?.forEach(po => {
        po.items.forEach((poItem: any) => {
            const current = orderedMap.get(poItem.item_name) || 0;
            orderedMap.set(poItem.item_name, current + Number(poItem.quantity));
        });
    });

    const itemsToOrder = requestItems
        .map(item => {
            const ordered = orderedMap.get(item.item_name) || 0;
            const remaining = Math.max(0, Number(item.quantity) - ordered);
            return {
                item_name: item.item_name,
                unit: item.unit,
                quantity: remaining,
                unit_price: 0,
                vat_rate: 0
            };
        })
        .filter(item => item.quantity > 0);

    return {
        projectId: req.project_id,
        items: itemsToOrder
    };
}

// PHẦN 8: HỖ TRỢ TỪ QTO (DỰ TOÁN)
// ==============================================================================

// Lấy danh mục vật tư đã bóc tách trong Dự toán (để làm gợi ý nhập liệu)
export async function getProjectStandardizedMaterials(projectId: string) {
    const supabase = await createClient();

    // 1. Lấy dữ liệu thô từ bảng chi tiết (qto_items_calculated)
    // Join với bảng cha (qto_items) để lọc theo project_id
    const { data, error } = await supabase
        .from('qto_items_calculated')
        .select(`
            material_name, 
            unit, 
            quantity, 
            qto_items!inner (project_id)
        `)
        .eq('qto_items.project_id', projectId);

    if (error) {
        console.error("Lỗi lấy danh mục vật tư QTO:", error);
        return [];
    }

    // 2. Gộp các vật tư trùng tên (Aggregation)
    // Ví dụ: "Cát xây" xuất hiện ở 3 đầu việc -> Cộng dồn số lượng lại
    const materialMap = new Map<string, { name: string, unit: string, budget: number }>();

    data?.forEach((item: any) => {
        // Chuẩn hóa key (bỏ khoảng trắng thừa, chữ thường) để tránh trùng lặp do gõ sai
        const key = item.material_name?.trim().toLowerCase();

        if (!key) return;

        if (materialMap.has(key)) {
            // Nếu đã có -> Cộng dồn số lượng
            const current = materialMap.get(key)!;
            current.budget += Number(item.quantity || 0);
        } else {
            // Nếu chưa có -> Thêm mới
            materialMap.set(key, {
                name: item.material_name.trim(), // Giữ tên hiển thị đẹp
                unit: item.unit,
                budget: Number(item.quantity || 0)
            });
        }
    });

    // 3. Chuyển về mảng và sắp xếp A-Z
    return Array.from(materialMap.values())
        .sort((a, b) => a.name.localeCompare(b.name));
}