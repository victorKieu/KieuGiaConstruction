"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { supplierSchema, purchaseOrderSchema, SupplierFormValues, PurchaseOrderFormValues } from "@/lib/schemas/procurement";
import { getUserProfile } from "@/lib/supabase/getUserProfile";

// ✅ IMPORT HÀM GỬI PUSH NOTIFICATION MOBILE
import { sendPushToUser } from "@/lib/action/pushNotification";

// ==============================================================================
// HỆ THỐNG THÔNG BÁO (NOTIFICATION ENGINE - APP & MOBILE)
// ==============================================================================

async function sendSystemNotification(supabase: any, params: { targetEmployeeId?: string, targetRole?: string, title: string, message: string, link?: string }) {
    try {
        let authIdsToNotify: string[] = [];

        // 1. Tìm Auth ID của một nhân viên cụ thể
        if (params.targetEmployeeId) {
            const { data: emp } = await supabase.from('employees').select('auth_id').eq('id', params.targetEmployeeId).single();
            if (emp?.auth_id) authIdsToNotify.push(emp.auth_id);
        }

        // 2. Tìm Auth ID của cả một phòng ban / chức vụ
        if (params.targetRole) {
            const { data: users } = await supabase
                .from('employees')
                .select('auth_id')
                .ilike('department', `%${params.targetRole}%`);

            if (users) {
                authIdsToNotify.push(...users.map((u: any) => u.auth_id).filter(Boolean));
            }
        }

        // 3. Lọc bỏ các ID trùng lặp
        authIdsToNotify = [...new Set(authIdsToNotify)];
        if (authIdsToNotify.length === 0) return;

        // 4. Lưu thông báo vào Database (Cho chuông thông báo trên Web App)
        const notifications = authIdsToNotify.map(authId => ({
            user_id: authId,
            title: params.title,
            message: params.message,
            link: params.link || '#',
            is_read: false,
            created_at: new Date().toISOString()
        }));
        await supabase.from('notifications').insert(notifications);

        // 5. Gửi thông báo Push về Mobile qua OneSignal
        for (const authId of authIdsToNotify) {
            await sendPushToUser(authId, params.title, params.message, params.link || '/');
        }

    } catch (error) {
        console.error("🔥 Lỗi khi gửi thông báo hệ thống:", error);
    }
}

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
        if (!data.code) {
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
            const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            data.code = `PR-${dateStr}-${randomSuffix}`;
        }

        if (!data.requester_id) throw new Error("Thiếu thông tin người đề xuất (Requester ID).");
        if (!data.project_id) throw new Error("Thiếu thông tin dự án.");

        const { data: req, error: reqError } = await supabase
            .from('material_requests')
            .insert({
                project_id: data.project_id,
                code: data.code,
                requester_id: data.requester_id,
                status: 'pending',
                note: data.note || '',
                expected_date: data.expected_date || null
            })
            .select()
            .single();

        if (reqError) throw new Error("Lỗi tạo phiếu: " + reqError.message);

        if (items && items.length > 0) {
            const cleanItems = items.map((i: any) => ({
                request_id: req.id,
                item_name: i.name || i.item_name || i.material_name || "Vật tư không tên",
                material_code: i.code || i.material_code || null,
                unit: i.unit || 'cái',
                quantity: Number(i.quantity) || 0,
                note: i.note || ''
            }));

            const { error: itemError } = await supabase.from('material_request_items').insert(cleanItems);
            if (itemError) {
                await supabase.from('material_requests').delete().eq('id', req.id);
                throw new Error("Lỗi lưu chi tiết vật tư: " + itemError.message);
            }
        }

        // 🔔 THÔNG BÁO 1: Tạo đơn thành công -> Báo cho Quản lý của người tạo
        const { data: emp } = await supabase.from('employees').select('manager_id, name').eq('id', data.requester_id).single();
        if (emp && emp.manager_id) {
            await sendSystemNotification(supabase, {
                targetEmployeeId: emp.manager_id,
                title: "Có đề xuất vật tư mới",
                message: `Nhân viên ${emp.name} vừa tạo đề xuất ${data.code}. Vui lòng kiểm tra và phê duyệt.`,
                link: `/projects/${data.project_id}/requests/${req.id}`
            });
        }

        revalidatePath(`/projects/${data.project_id}`);
        return { success: true, message: "Gửi yêu cầu thành công!", requestId: req.id };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteMaterialRequest(id: string, projectId: string) {
    try {
        const supabase = await createClient();
        const { error } = await supabase.from("material_requests").delete().eq("id", id);
        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getProjectMembers(projectId: string) {
    const supabase = await createClient();
    const { data } = await supabase.from('employees').select('id, name, code').order('name');
    return data || [];
}

// ==============================================================================
// PHẦN 2: LOGIC DUYỆT & XỬ LÝ (ĐÃ NHÚNG TỶ LỆ QUY ĐỔI ĐƠN VỊ TÍNH)
// ==============================================================================

export async function checkRequestFeasibility(requestId: string, projectId: string) {
    const supabase = await createClient();
    const { data: requestItems } = await supabase.from('material_request_items').select('*').eq('request_id', requestId);
    if (!requestItems || requestItems.length === 0) return { success: false, error: "Phiếu rỗng" };

    const { data: masterMaterials } = await supabase.from('materials').select('name, unit, purchase_unit, conversion_rate, ref_price');
    const catalogMap = new Map();
    masterMaterials?.forEach(m => {
        catalogMap.set(m.name.toLowerCase().trim(), {
            baseUnit: m.unit,
            purchaseUnit: m.purchase_unit,
            rate: m.conversion_rate || 1,
            refPrice: m.ref_price || 0
        });
    });

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
        const masterInfo = catalogMap.get(key) || { rate: 1, baseUnit: item.unit, purchaseUnit: item.unit, refPrice: 0 };

        const requestedQty = Number(item.quantity);
        const stock = inventoryMap[key] || 0;
        const budget = budgetMap[key] || 0;

        const issueQty = Math.min(stock, requestedQty);
        const purchaseQty = Math.max(0, requestedQty - stock);

        return {
            ...item,
            conversion_rate: masterInfo.rate,
            base_unit: masterInfo.baseUnit || item.unit,
            purchase_unit: masterInfo.purchaseUnit || masterInfo.baseUnit || item.unit,
            purchase_price: masterInfo.refPrice * masterInfo.rate,
            stock_available: stock,
            budget_quantity: budget,
            approved_quantity: requestedQty,
            action_issue: issueQty,
            action_purchase: purchaseQty
        };
    });

    return { success: true, data: analysis, warehouseId: warehouse?.id };
}


export async function rejectMaterialRequest(requestId: string, projectId: string, reason: string) {
    const supabase = await createClient();
    try {
        await supabase.from('material_requests').update({ status: 'rejected', note: reason }).eq('id', requestId);

        const { data: req } = await supabase.from('material_requests').select('code, requester_id').eq('id', requestId).single();

        if (req) {
            const { data: emp } = await supabase.from('employees').select('manager_id').eq('id', req.requester_id).single();
            const message = `Đề xuất ${req.code} đã bị từ chối. Lý do: ${reason}`;
            const link = `/projects/${projectId}/requests/${requestId}`;

            await sendSystemNotification(supabase, { targetEmployeeId: req.requester_id, title: "Đề xuất bị từ chối", message, link });

            if (emp?.manager_id) {
                await sendSystemNotification(supabase, { targetEmployeeId: emp.manager_id, title: "Đề xuất của nhân viên bị từ chối", message, link });
            }
        }

        revalidatePath(`/projects/${projectId}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ==============================================================================
// PHẦN 3: CENTRAL PROCUREMENT & SPLIT PO
// ==============================================================================

export async function getAllPendingRequests() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('material_requests')
        .select(`*, items:material_request_items(*), project:projects(id, name, code), requester:requester_id(name)`)
        .in('status', ['approved', 'processing'])
        .order('created_at', { ascending: false });

    if (error) return [];
    return data || [];
}

export async function getMaterialRequestForPO(requestId: string) {
    const supabase = await createClient();
    const { data: req } = await supabase.from('material_requests').select('id, project_id, code').eq('id', requestId).single();
    if (!req) return null;

    const { data: requestItems } = await supabase.from('material_request_items').select('*').eq('request_id', requestId);
    if (!requestItems) return { projectId: req.project_id, items: [] };

    const { data: existingPos } = await supabase.from('purchase_orders').select('id, items:purchase_order_items(item_name, quantity)').eq('reference_id', requestId);

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
            id: item.id, item_name: item.item_name, unit: item.unit, quantity: requested,
            remaining_quantity: remaining, is_fully_ordered: remaining === 0, unit_price: 0, vat_rate: 0
        };
    });

    return { projectId: req.project_id, items: itemsToOrder };
}

export async function createSplitPOAction(projectId: string, requestId: string, supplierId: string, warehouseId: string, deliveryDate: string, itemsToOrder: any[]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    try {
        if (!projectId) {
            const { data: req } = await supabase.from('material_requests').select('project_id').eq('id', requestId).single();
            if (req) projectId = req.project_id;
        }

        const code = `PO-${Date.now().toString().slice(-6)}`;

        const { data: po, error: poError } = await supabase.from('purchase_orders').insert({
            project_id: projectId, reference_id: requestId, supplier_id: supplierId, warehouse_id: warehouseId || null,
            code: code, order_date: new Date().toISOString(),
            expected_delivery_date: deliveryDate ? new Date(deliveryDate).toISOString() : null,
            status: 'ordered', total_amount: 0, created_by: user?.id
        }).select().single();

        if (poError) throw new Error("Lỗi tạo PO: " + poError.message);

        const poItemsData = itemsToOrder.map(item => ({
            po_id: po.id, item_name: item.item_name, unit: item.unit,
            quantity: Number(item.quantity), unit_price: Number(item.unit_price || 0), vat_rate: 0
        }));

        const { error: itemsError } = await supabase.from('purchase_order_items').insert(poItemsData);
        if (itemsError) throw new Error("Lỗi lưu chi tiết: " + itemsError.message);

        await supabase.from('material_requests').update({ status: 'processing' }).eq('id', requestId);

        await sendSystemNotification(supabase, {
            targetRole: 'warehouse',
            title: "Đơn mua hàng PO mới sắp giao",
            message: `Thu mua đã chốt đơn hàng ${code} với NCC. Vui lòng theo dõi tiến độ và chuẩn bị nhận hàng.`,
            link: `/inventory/inbound`
        });

        revalidatePath(`/procurement`);
        revalidatePath(`/procurement/orders`);
        return { success: true, message: "Đã tạo Đơn hàng thành công!", poId: po.id };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// ==============================================================================
// PHẦN 4: CRUD PO & GIAO NHẬN & THANH TOÁN
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

    try {
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

        await sendSystemNotification(supabase, {
            targetRole: 'accounting',
            title: "Hàng đã nhập kho, chờ thanh toán",
            message: `Đơn hàng ${po.code} đã hoàn tất thủ tục nhập kho. Vui lòng kiểm tra chứng từ và tiến hành thanh toán cho NCC.`,
            link: `/finance/payables`
        });

        revalidatePath(`/procurement/orders/${poId}`);
        return { success: true, message: "Nhập kho thành công" };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
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
    try {
        if (!categoryId) return { success: false, error: "Chọn hạng mục chi" };
        await supabase.from("finance_transactions").insert({
            amount, type: 'expense', category_id: categoryId, project_id: projectId, po_id: poId,
            description: notes, transaction_date: paymentDate.toISOString(), payment_method: method
        });

        const { data: po } = await supabase.from("purchase_orders").select("code, total_amount").eq("id", poId).single();
        if (po && amount >= po.total_amount) {
            await supabase.from("purchase_orders").update({ status: 'completed' }).eq("id", poId);
        }

        await sendSystemNotification(supabase, {
            targetRole: 'director',
            title: "Hoàn tất thanh toán đơn hàng",
            message: `Kế toán đã thanh toán thành công số tiền ${amount.toLocaleString()} VNĐ cho đơn hàng ${po?.code || poId}.`,
            link: `/finance/transactions`
        });

        revalidatePath(`/procurement/orders/${poId}`);
        return { success: true, message: "Đã chi tiền" };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getProjectStandardizedMaterials(projectId: string) {
    const supabase = await createClient();

    const { data: masterData } = await supabase.from('materials').select('name, unit, purchase_unit, conversion_rate');
    const masterMap = new Map();
    masterData?.forEach(m => masterMap.set(m.name.toLowerCase().trim(), m));

    const mapWithMasterData = (itemName: string, baseUnit: string, budgetQty: number) => {
        const mInfo = masterMap.get(itemName.toLowerCase().trim());
        return {
            name: itemName,
            unit: mInfo?.purchase_unit || baseUnit,
            base_unit: baseUnit,
            rate: mInfo?.conversion_rate || 1,
            budget: budgetQty
        };
    };

    const { data: estimates } = await supabase.from('estimation_items').select('material_name, unit, quantity').eq('project_id', projectId).gt('quantity', 0);
    if (estimates?.length) {
        return estimates.map(i => mapWithMasterData(i.material_name, i.unit, i.quantity));
    }

    const { data: budget } = await supabase.from('project_material_budget').select('material_name, unit, budget_quantity').eq('project_id', projectId);
    if (budget?.length) {
        return budget.map(i => mapWithMasterData(i.material_name, i.unit, i.budget_quantity));
    }

    const { data: raw } = await supabase.from('qto_items_calculated').select(`material_name, unit, quantity, qto_items!inner(project_id)`).eq('qto_items.project_id', projectId);
    if (raw?.length) {
        const map = new Map();
        raw.forEach((i: any) => {
            const key = i.material_name?.trim().toLowerCase();
            if (!key) return;
            if (map.has(key)) {
                map.get(key).budget += Number(i.quantity || 0);
            } else {
                map.set(key, mapWithMasterData(i.material_name, i.unit, Number(i.quantity || 0)));
            }
        });
        return Array.from(map.values());
    }

    return [];
}

// ==============================================================================
// PHẦN: NHÀ CUNG CẤP (SUPPLIER)
// ==============================================================================

export async function createSupplierAction(data: SupplierFormValues) {
    const supabase = await createClient();

    // Map chính xác 12 trường từ Form xuống Database
    const payload = {
        code: data.code || null,
        name: data.name,
        type: data.type || 'material',
        rating: data.rating || 'C',
        status: data.status || 'active',
        tax_code: data.tax_code || null,
        bank_name: data.bank_name || null,
        bank_account: data.bank_account || null,
        bank_account_name: data.bank_account_name || null,
        contact_person: data.contact_person || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
    };

    const { error } = await supabase.from('suppliers').insert(payload);

    if (error) {
        console.error("Lỗi khi thêm nhà cung cấp:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/procurement/suppliers");
    return { success: true, message: "Thêm hồ sơ nhà cung cấp thành công!" };
}

export async function updateSupplierAction(id: string, data: SupplierFormValues) {
    const supabase = await createClient();

    // Map chính xác 12 trường từ Form xuống Database
    const payload = {
        code: data.code || null,
        name: data.name,
        type: data.type || 'material',
        rating: data.rating || 'C',
        status: data.status || 'active',
        tax_code: data.tax_code || null,
        bank_name: data.bank_name || null,
        bank_account: data.bank_account || null,
        bank_account_name: data.bank_account_name || null,
        contact_person: data.contact_person || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
    };

    const { error } = await supabase.from('suppliers').update(payload).eq('id', id);

    if (error) {
        console.error("Lỗi khi cập nhật nhà cung cấp:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/procurement/suppliers");
    return { success: true, message: "Cập nhật hồ sơ thành công!" };
}
export async function deleteSupplierAction(id: string) {
    const supabase = await createClient();
    try {
        const { data: po } = await supabase.from('purchase_orders').select('id').eq('supplier_id', id).limit(1);
        if (po && po.length > 0) return { success: false, error: "Không thể xóa: NCC này đã có đơn hàng." };

        const { error } = await supabase.from('suppliers').delete().eq('id', id);
        if (error) throw new Error(error.message);

        revalidatePath('/procurement/suppliers');
        return { success: true, message: "Đã xóa nhà cung cấp." };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getPurchaseRequests() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('purchase_requests')
        .select(`
            id, code, status, created_at,
            project:projects(id, name, code),
            requester:employees(name) 
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Lỗi lấy danh sách Yêu cầu vật tư:", error);
        return [];
    }
    return data || [];
}

// ==============================================================================
// PHẦN: QUẢN LÝ GÓI THẦU (RFQ) & BÁO GIÁ
// ==============================================================================

// Tạo mã RFQ tự động, lấy project_id chuẩn, chuyển dữ liệu từ Giỏ nhu cầu sang rfq_items
export async function createRFQAction(payload: { title: string; deadline: string; needIds: string[] }) {
    try {
        const supabase = await createClient();
        const profile = await getUserProfile();

        if (!payload.needIds || payload.needIds.length === 0) {
            throw new Error("Không có vật tư nào được chọn.");
        }

        // 1. Kéo dữ liệu vật tư gốc từ bảng procurement_needs
        const { data: needs, error: needsError } = await supabase
            .from('procurement_needs')
            .select('*')
            .in('id', payload.needIds);

        if (needsError || !needs || needs.length === 0) {
            throw new Error("Lấy dữ liệu vật tư thất bại hoặc vật tư đã bị xóa.");
        }

        // 2. Lấy project_id từ món vật tư đầu tiên
        const projectId = needs[0].project_id;
        if (!projectId) {
            throw new Error("Không xác định được Dự án cho nhóm vật tư này.");
        }

        // 3. Tạo mã RFQ tự động
        const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
        const { count } = await supabase.from('rfqs').select('*', { count: 'exact', head: true });
        const rfqCode = `RFQ-${dateStr}-${String((count || 0) + 1).padStart(3, '0')}`;

        // 4. Insert vào bảng rfqs
        const { data: rfq, error: rfqError } = await supabase
            .from('rfqs')
            .insert({
                code: rfqCode,
                title: payload.title,
                project_id: projectId,
                deadline: payload.deadline,
                status: 'published',
                created_by: profile?.authId || profile?.id || null
            })
            .select('id')
            .single();

        if (rfqError) throw rfqError;

        // 5. Map dữ liệu từ procurement_needs sang rfq_items
        const rfqItemsData = needs.map(need => ({
            rfq_id: rfq.id,
            procurement_need_id: need.id,
            item_name: need.material_name || "Vật tư chưa có tên",
            material_name: need.material_name || "Vật tư chưa có tên",
            material_code: need.material_code || null,
            purchase_unit: need.purchase_unit || "Cái",
            purchase_quantity: Number(need.purchase_quantity) || 0
        }));

        const { error: itemsError } = await supabase.from('rfq_items').insert(rfqItemsData);
        if (itemsError) throw itemsError;

        // 6. Cập nhật trạng thái trong Giỏ nhu cầu
        const { error: updateNeedsError } = await supabase
            .from('procurement_needs')
            .update({ status: 'rfq_created', rfq_id: rfq.id })
            .in('id', payload.needIds);

        if (updateNeedsError) console.warn("Lỗi update trạng thái procurement_needs:", updateNeedsError);

        revalidatePath('/procurement/rfq');
        return { success: true, message: `Đã phát hành Gói thầu ${rfqCode} thành công!`, rfqId: rfq.id };
    } catch (error: any) {
        console.error("[createRFQAction] Lỗi:", error);
        return { success: false, error: error.message };
    }
}

export async function submitBidAction(payload: {
    rfq_id: string;
    supplier_id: string;
    bids: { rfq_item_id: string; unit_price: number; delivery_time_days?: number }[];
    profileData?: {
        tax_code?: string; phone?: string; email?: string; address?: string;
        bank_account?: string; bank_name?: string;
        bank_account_name?: string; // ✅ Bổ sung khai báo Type tại đây
        latitude?: string; longitude?: string;
    } | null;
}) {
    const supabase = await createClient();

    if (payload.profileData) {
        await supabase
            .from('suppliers')
            .update({
                tax_code: payload.profileData.tax_code,
                phone: payload.profileData.phone,
                email: payload.profileData.email,
                address: payload.profileData.address,
                bank_account: payload.profileData.bank_account,
                bank_name: payload.profileData.bank_name,
                bank_account_name: payload.profileData.bank_account_name, // ✅ Bổ sung map dữ liệu xuống DB
                latitude: payload.profileData.latitude ? parseFloat(payload.profileData.latitude) : null,
                longitude: payload.profileData.longitude ? parseFloat(payload.profileData.longitude) : null,
                status: 'active'
            })
            .eq('id', payload.supplier_id);
    }

    const bidData = payload.bids.map(bid => ({
        rfq_id: payload.rfq_id, supplier_id: payload.supplier_id,
        rfq_item_id: bid.rfq_item_id, unit_price: bid.unit_price, delivery_time_days: bid.delivery_time_days || 0
    }));

    const { error: bidError } = await supabase.from('rfq_bids').upsert(bidData, { onConflict: 'rfq_item_id, supplier_id' });
    if (bidError) return { success: false, error: bidError.message };

    await supabase.from('rfq_suppliers').update({ status: 'submitted' }).match({ rfq_id: payload.rfq_id, supplier_id: payload.supplier_id });
    return { success: true, message: "Đã cập nhật báo giá của Nhà cung cấp!" };
}

export async function getBidTabulation(rfqId: string) {
    try {
        const supabase = await createClient();
        const { data: rawSuppliers } = await supabase.from('rfq_suppliers').select('supplier_id, supplier:suppliers(name)').eq('rfq_id', rfqId);

        const suppliers = (rawSuppliers || []).map((s: any) => ({
            id: s.supplier_id,
            name: Array.isArray(s.supplier) ? s.supplier[0]?.name : s.supplier?.name
        }));

        const { data: matrix, error: matrixError } = await supabase.from('rfq_bids').select('supplier_id, rfq_item_id, unit_price, is_selected').eq('rfq_id', rfqId);
        if (matrixError) console.error("Lỗi kéo giá:", matrixError);

        return { suppliers, matrix: matrix || [] };
    } catch (error) {
        console.error("Lỗi getBidTabulation:", error);
        return null;
    }
}

export async function selectBidAction(rfqItemId: string, supplierId: string) {
    const supabase = await createClient();
    await supabase.from('rfq_bids').update({ is_selected: false }).eq('rfq_item_id', rfqItemId);
    const { error } = await supabase.from('rfq_bids').update({ is_selected: true }).match({ rfq_item_id: rfqItemId, supplier_id: supplierId });
    return { success: !error, error: error?.message };
}

export async function submitOpenBidAction(payload: {
    rfq_id: string;
    bids: { rfq_item_id: string; unit_price: number; delivery_time_days?: number }[];
    profileData: { name: string; tax_code: string; phone: string; email?: string; address: string; bank_account?: string; bank_name?: string; latitude?: string; longitude?: string; };
}) {
    const supabase = await createClient();
    const { data: newSupplier, error: supplierError } = await supabase
        .from('suppliers')
        .insert({
            name: payload.profileData.name, tax_code: payload.profileData.tax_code, phone: payload.profileData.phone,
            email: payload.profileData.email, address: payload.profileData.address, bank_account: payload.profileData.bank_account,
            bank_name: payload.profileData.bank_name, latitude: payload.profileData.latitude ? parseFloat(payload.profileData.latitude) : null,
            longitude: payload.profileData.longitude ? parseFloat(payload.profileData.longitude) : null, status: 'active'
        }).select('id').single();

    if (supplierError || !newSupplier) return { success: false, error: "Lỗi tạo hồ sơ đối tác: " + supplierError?.message };
    const supplierId = newSupplier.id;

    await supabase.from('rfq_suppliers').insert({ rfq_id: payload.rfq_id, supplier_id: supplierId, status: 'submitted', expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() });

    const bidData = payload.bids.map(bid => ({ rfq_id: payload.rfq_id, supplier_id: supplierId, rfq_item_id: bid.rfq_item_id, unit_price: bid.unit_price, delivery_time_days: bid.delivery_time_days || 0 }));
    const { error: bidError } = await supabase.from('rfq_bids').insert(bidData);
    if (bidError) return { success: false, error: bidError.message };

    return { success: true, message: "Đã ghi nhận báo giá và thiết lập hồ sơ đối tác!" };
}

export async function approveBidTabulationAction({ rfqId, selections, justification }: { rfqId: string; selections: Record<string, string>; justification: string; }) {
    const supabase = await createClient();
    const { error: tabError } = await supabase.from('bid_tabulations').insert({ rfq_id: rfqId, procurement_justification: justification, status: 'approved' });
    if (tabError) return { success: false, error: tabError.message };

    for (const [qtoItemId, supplierId] of Object.entries(selections)) {
        await supabase.from('estimation_items').update({ preferred_supplier_id_1: supplierId }).eq('qto_item_id', qtoItemId);
    }
    return { success: true };
}

export async function getRfqDetails(id: string) {
    try {
        const supabase = await createClient();
        const { data: rfq } = await supabase.from('rfqs').select('*').eq('id', id).single();
        const { data: items } = await supabase.from('rfq_items').select('*').eq('rfq_id', id);
        const { data: invitedSuppliers, error: invError } = await supabase
            .from('rfq_suppliers')
            .select(`id, rfq_id, supplier_id, status, token, supplier:suppliers (id, name, tax_code, phone, email)`)
            .eq('rfq_id', id);

        if (invError) console.error("Lỗi khi kéo list NCC:", invError);
        const { data: allSuppliers } = await supabase.from('suppliers').select('id, name, code').eq('status', 'active');
        return { rfq, items, invitedSuppliers, allSuppliers };
    } catch (error) {
        console.error("Lỗi getRfqDetails:", error);
        return null;
    }
}

export async function inviteSupplierAction(rfqId: string, supplierId: string) {
    try {
        const supabase = await createClient();
        const { data: exist } = await supabase.from('rfq_suppliers').select('id').eq('rfq_id', rfqId).eq('supplier_id', supplierId).single();
        if (exist) return { success: false, error: "Nhà cung cấp này đã có trong danh sách mời!" };

        const { data: rfq, error: rfqError } = await supabase.from('rfqs').select('deadline').eq('id', rfqId).single();
        if (rfqError) throw new Error("Không tìm thấy thông tin gói thầu!");

        const { error } = await supabase.from('rfq_suppliers').insert({ rfq_id: rfqId, supplier_id: supplierId, status: 'pending', expires_at: rfq.deadline });
        if (error) throw error;

        revalidatePath(`/procurement/rfq/${rfqId}`);
        return { success: true, message: "Đã thêm Nhà cung cấp vào danh sách mời!" };
    } catch (error: any) {
        console.error("[inviteSupplierAction] Lỗi:", error);
        return { success: false, error: error.message };
    }
}

export async function registerPublicSupplierAction(publicToken: string, formData: { name: string; phone: string; tax_code?: string; email?: string; contact_person: any }) {
    try {
        const supabase = await createClient();
        const { data: rfq, error: rfqError } = await supabase.from('rfqs').select('id, title, status, deadline').eq('public_token', publicToken).single();
        if (rfqError || !rfq) throw new Error("Đường dẫn không hợp lệ hoặc đã hết hạn!");
        if (rfq.status !== 'published') throw new Error("Gói thầu này đã đóng, không thể nhận thêm báo giá!");

        const { data: newSupplier, error: suppError } = await supabase.from('suppliers').insert({
            name: formData.name, phone: formData.phone, tax_code: formData.tax_code || null, email: formData.email || null,
            contact_person: formData.contact_person, status: 'active', type: 'material'
        }).select('id').single();

        if (suppError) throw suppError;

        const { data: rfqSupp, error: inviteError } = await supabase.from('rfq_suppliers').insert({
            rfq_id: rfq.id, supplier_id: newSupplier.id, status: 'viewed', expires_at: rfq.deadline
        }).select('token').single();

        if (inviteError) throw inviteError;
        return { success: true, privateToken: rfqSupp.token };
    } catch (error: any) {
        console.error("[registerPublicSupplier] Lỗi:", error);
        return { success: false, error: error.message };
    }
}

export async function getBidDataByToken(token: string) {
    try {
        const supabase = await createClient();

        const { data: rfqSupplier, error: tokenError } = await supabase
            .from('rfq_suppliers')
            .select('*, supplier:suppliers(*), rfq:rfqs(*)')
            .eq('token', token)
            .single();

        if (tokenError || !rfqSupplier) throw new Error("Đường dẫn không hợp lệ hoặc không tồn tại!");
        if (rfqSupplier.rfq.status !== 'published') throw new Error("Gói thầu này đã kết thúc hoặc bị đóng. Không thể cập nhật báo giá!");

        const { data: items } = await supabase.from('rfq_items').select('*').eq('rfq_id', rfqSupplier.rfq_id);
        const { data: existingBids } = await supabase.from('rfq_bids').select('*').eq('supplier_id', rfqSupplier.supplier_id).eq('rfq_id', rfqSupplier.rfq_id);

        let projectInfo = null;

        // ĐÃ SỬA: Bỏ latitude và longitude ra khỏi câu lệnh select vì Database không có
        if (rfqSupplier.rfq.project_id) {
            const { data: proj } = await supabase
                .from('projects')
                .select('name, address, geocode')
                .eq('id', rfqSupplier.rfq.project_id)
                .single();

            if (proj) {
                projectInfo = proj;
            }
        }

        const finalRfq = { ...rfqSupplier.rfq, project: projectInfo };

        return {
            success: true,
            data: { rfqSupplier, rfq: finalRfq, supplier: rfqSupplier.supplier, items: items || [], existingBids: existingBids || [] }
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteRFQAction(rfqId: string) {
    try {
        const supabase = await createClient();
        const { error: resetError } = await supabase.from('procurement_needs').update({ status: 'pending', rfq_id: null }).eq('rfq_id', rfqId);
        if (resetError) throw resetError;

        const { error: deleteError } = await supabase.from('rfqs').delete().eq('id', rfqId);
        if (deleteError) throw deleteError;

        revalidatePath('/procurement/rfq');
        return { success: true, message: "Đã hủy gói thầu và hoàn trả vật tư về giỏ nhu cầu!" };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function awardRfqAction(rfqId: string, winningSupplierId: string) {
    try {
        const supabase = await createClient();

        // Cập nhật trạng thái Gói thầu và Báo giá
        await supabase.from('rfqs').update({ status: 'completed' }).eq('id', rfqId);
        await supabase.from('rfq_bids').update({ is_selected: false }).eq('rfq_id', rfqId);
        await supabase.from('rfq_bids').update({ is_selected: true }).eq('rfq_id', rfqId).eq('supplier_id', winningSupplierId);
        await supabase.from('rfq_suppliers').update({ status: 'won' }).eq('rfq_id', rfqId).eq('supplier_id', winningSupplierId);
        await supabase.from('rfq_suppliers').update({ status: 'lost' }).eq('rfq_id', rfqId).neq('supplier_id', winningSupplierId);

        // BƯỚC QUAN TRỌNG: CẬP NHẬT GIÁ VÀO GIỎ NHU CẦU ĐỂ DỰ TOÁN LẤY DỮ LIỆU
        const { data: rfq } = await supabase.from('rfqs').select('project_id, title, code').eq('id', rfqId).single();
        const { data: items } = await supabase.from('rfq_items').select('id, procurement_need_id').eq('rfq_id', rfqId);
        const { data: bids } = await supabase.from('rfq_bids').select('rfq_item_id, unit_price').eq('rfq_id', rfqId).eq('supplier_id', winningSupplierId);

        if (items && bids) {
            for (const item of items) {
                const bid = bids.find(b => b.rfq_item_id === item.id);
                if (bid && item.procurement_need_id) {
                    await supabase.from('procurement_needs').update({
                        status: 'awarded', // Chuyển trạng thái để Dự toán biết là đã chốt xong
                        awarded_supplier_id: winningSupplierId,
                        awarded_price: bid.unit_price // Lưu giá thực tế chốt được
                    }).eq('id', item.procurement_need_id);
                }
            }
        }

        // BẮN TÍN HIỆU (THÔNG BÁO) CHO BỘ PHẬN DỰ TOÁN
        if (rfq) {
            await sendSystemNotification(supabase, {
                targetRole: 'qs', // Gửi cho những ai có role là qs hoặc estimator
                title: "Đã chốt giá vật tư thi công",
                message: `Phòng Thu mua đã chốt xong giá cho Gói thầu ${rfq.code} - ${rfq.title}. Vui lòng cập nhật dự toán để làm báo giá.`,
                link: `/estimation/projects/${rfq.project_id}/review` // Dẫn Kỹ sư QS chui thẳng vào trang review của dự án đó
            });
        }

        revalidatePath(`/procurement/rfq/${rfqId}`);
        return { success: true };
    } catch (error: any) {
        console.error("Lỗi awardRfqAction:", error);
        return { success: false, error: error.message };
    }
}

export async function verifySupplierByTaxCode(publicToken: string, taxCode: string) {
    try {
        const supabase = await createClient();
        const { data: rfq } = await supabase.from('rfqs').select('id, status, deadline').eq('public_token', publicToken).single();
        if (!rfq) return { error: "Đường dẫn không tồn tại!" };
        if (rfq.status === 'completed') return { error: "Gói thầu này đã chốt nhà cung cấp!" };

        const { data: supplier } = await supabase.from('suppliers').select('id').eq('tax_code', taxCode).single();
        if (supplier) {
            const { data: existingInvite } = await supabase.from('rfq_suppliers').select('token').eq('rfq_id', rfq.id).eq('supplier_id', supplier.id).single();
            if (existingInvite) return { exists: true, privateToken: existingInvite.token };

            const { data: newInvite, error: insertError } = await supabase.from('rfq_suppliers').insert({ rfq_id: rfq.id, supplier_id: supplier.id, status: 'viewed', expires_at: rfq.deadline }).select('token').single();
            if (insertError) throw insertError;
            return { exists: true, privateToken: newInvite.token };
        }
        return { exists: false };
    } catch (error: any) {
        return { error: error.message };
    }
}

export async function extendRfqDeadlineAction(rfqId: string, newDeadline: string) {
    try {
        const supabase = await createClient();
        const { error: rfqError } = await supabase.from('rfqs').update({ deadline: newDeadline, status: 'published' }).eq('id', rfqId);
        if (rfqError) throw rfqError;

        const { error: linkError } = await supabase.from('rfq_suppliers').update({ expires_at: newDeadline }).eq('rfq_id', rfqId);
        if (linkError) throw linkError;

        revalidatePath(`/procurement/rfq/${rfqId}`);
        return { success: true, message: "Đã gia hạn gói thầu thành công!" };
    } catch (error: any) {
        console.error("Lỗi gia hạn RFQ:", error);
        return { success: false, error: error.message };
    }
}

// Chuẩn hóa vật tư phát sinh từ công trường vào Master Data
export async function standardizeProcurementNeedAction(payload: {
    needId: string;
    materialCode: string;
    materialName: string;
    unit: string;
    groupId?: string | null;
}) {
    try {
        const supabase = await createClient();

        // 1. Kiểm tra mã vật tư này đã có trong danh mục chuẩn (materials) chưa
        const { data: existingMat } = await supabase
            .from('materials')
            .select('code')
            .eq('code', payload.materialCode)
            .single();

        // 2. Nếu chưa có, TỰ ĐỘNG TẠO MỚI vật tư vào danh mục
        if (!existingMat) {
            const { error: insertMatError } = await supabase
                .from('materials')
                .insert({
                    code: payload.materialCode,
                    name: payload.materialName,
                    unit: payload.unit,
                    purchase_unit: payload.unit,
                    group_id: payload.groupId || null,
                    conversion_rate: 1
                });
            if (insertMatError) throw new Error("Lỗi tạo mã vật tư mới vào danh mục: " + insertMatError.message);
        }

        // 3. Cập nhật lại thông tin chuẩn xác cho món hàng trong Giỏ nhu cầu
        const { error: updateNeedError } = await supabase
            .from('procurement_needs')
            .update({
                material_code: payload.materialCode,
                material_name: payload.materialName, // Cập nhật lại tên chuẩn
                purchase_unit: payload.unit
            })
            .eq('id', payload.needId);

        if (updateNeedError) throw new Error("Lỗi cập nhật Giỏ nhu cầu: " + updateNeedError.message);

        revalidatePath('/procurement/rfq');
        return { success: true, message: "Đã chuẩn hóa vật tư thành công!" };
    } catch (error: any) {
        console.error("Lỗi chuẩn hóa vật tư:", error);
        return { success: false, error: error.message };
    }
}

// Chốt thầu từng phần (Split Award): Ghi nhận chi tiết từng món hàng thuộc về NCC nào
export async function awardSplitRfqAction(rfqId: string, selections: Record<string, string>) {
    try {
        const supabase = await createClient();

        await supabase.from('rfq_bids').update({ is_selected: false }).eq('rfq_id', rfqId);

        for (const [itemId, suppId] of Object.entries(selections)) {
            if (suppId) {
                await supabase.from('rfq_bids').update({ is_selected: true }).match({ rfq_item_id: itemId, supplier_id: suppId });
            }
        }

        const winningSuppliers = [...new Set(Object.values(selections).filter(Boolean))];
        await supabase.from('rfq_suppliers').update({ status: 'lost' }).eq('rfq_id', rfqId);

        if (winningSuppliers.length > 0) {
            await supabase.from('rfq_suppliers').update({ status: 'won' }).eq('rfq_id', rfqId).in('supplier_id', winningSuppliers);
        }
        await supabase.from('rfqs').update({ status: 'completed' }).eq('id', rfqId);

        // BƯỚC QUAN TRỌNG: CẬP NHẬT TỪNG MÓN VÀO GIỎ NHU CẦU
        const { data: rfq } = await supabase.from('rfqs').select('project_id, title, code').eq('id', rfqId).single();
        const { data: items } = await supabase.from('rfq_items').select('id, procurement_need_id').eq('rfq_id', rfqId);

        if (items) {
            for (const item of items) {
                const suppId = selections[item.id];
                if (suppId) {
                    const { data: bid } = await supabase.from('rfq_bids').select('unit_price').eq('rfq_item_id', item.id).eq('supplier_id', suppId).single();
                    if (bid && item.procurement_need_id) {
                        await supabase.from('procurement_needs').update({
                            status: 'awarded',
                            awarded_supplier_id: suppId,
                            awarded_price: bid.unit_price
                        }).eq('id', item.procurement_need_id);
                    }
                }
            }
        }

        // BẮN TÍN HIỆU
        if (rfq) {
            await sendSystemNotification(supabase, {
                targetRole: 'qs',
                title: "Đã chốt giá vật tư (Bóc tách từng phần)",
                message: `Phòng Thu mua đã chốt xong các mặt hàng tốt nhất cho Gói thầu ${rfq.code} - ${rfq.title}. Vui lòng kiểm tra lại.`,
                link: `/estimation/projects/${rfq.project_id}/review`
            });
        }

        revalidatePath(`/procurement/rfq/${rfqId}`);
        return { success: true };
    } catch (error: any) {
        console.error("Lỗi awardSplitRfqAction:", error);
        return { success: false, error: error.message };
    }
}

// Hủy chốt thầu (Revert Award)
export async function unawardRfqAction(rfqId: string) {
    try {
        const supabase = await createClient();

        await supabase.from('rfq_bids').update({ is_selected: false }).eq('rfq_id', rfqId);
        await supabase.from('rfq_suppliers').update({ status: 'submitted' }).eq('rfq_id', rfqId);
        await supabase.from('rfqs').update({ status: 'closed' }).eq('id', rfqId);

        // XÓA DỮ LIỆU ĐÃ CHỐT TRONG GIỎ NHU CẦU ĐỂ DỰ TOÁN KHÔNG BỊ NHẦM LẪN
        const { data: items } = await supabase.from('rfq_items').select('procurement_need_id').eq('rfq_id', rfqId);
        if (items) {
            const needIds = items.map(i => i.procurement_need_id).filter(Boolean);
            if (needIds.length > 0) {
                await supabase.from('procurement_needs').update({
                    status: 'rfq_created', // Trả về trạng thái đang chạy thầu
                    awarded_supplier_id: null,
                    awarded_price: null
                }).in('id', needIds);
            }
        }

        revalidatePath(`/procurement/rfq/${rfqId}`);
        return { success: true, message: "Đã hủy chốt thầu và thu hồi thông báo!" };
    } catch (error: any) {
        console.error("Lỗi unawardRfqAction:", error);
        return { success: false, error: error.message };
    }
}