"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { supplierSchema, purchaseOrderSchema, SupplierFormValues, PurchaseOrderFormValues } from "@/lib/schemas/procurement";
import { getUserProfile } from "@/lib/supabase/getUserProfile";
import { checkApprovalPermission } from "@/lib/auth/permissions";

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

    // ✅ SỬA LỖI TÍNH TOÁN: SO SÁNH TRỰC TIẾP THEO ĐVT NGƯỜI DÙNG NHẬP
    const analysis = requestItems.map(item => {
        const key = item.item_name.toLowerCase().trim();
        const masterInfo = catalogMap.get(key) || { rate: 1, baseUnit: item.unit, purchaseUnit: item.unit, refPrice: 0 };

        const requestedQty = Number(item.quantity);
        const stock = inventoryMap[key] || 0;
        const budget = budgetMap[key] || 0;

        // Không nhân chia hệ số ở bước này để tránh lệch đơn vị với kho (VD: 5 Bao vs 35 Bao)
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

export async function approveAndProcessRequest(requestId: string, projectId: string, approvedItems: any[], warehouseId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    try {
        let employeeId = null;
        if (user) {
            const { data: emp } = await supabase.from('employees').select('id').eq('auth_id', user.id).single();
            employeeId = emp?.id || null;
        }

        // ✅ GỌI SANG TRUNG TÂM PHÂN QUYỀN
        const hasPermission = await checkApprovalPermission(projectId);
        if (!hasPermission) {
            throw new Error("Từ chối truy cập: Chỉ Quản trị viên hoặc Ban quản lý dự án mới có quyền phê duyệt phiếu này!");
        }

        const toIssueItems = approvedItems.filter(i => i.action_issue > 0);
        const toPurchaseItems = approvedItems.filter(i => i.action_purchase > 0);

        const { data: originalReq } = await supabase.from('material_requests').select('code, requester_id').eq('id', requestId).single();

        if (toIssueItems.length === 0 && toPurchaseItems.length === 0) {
            await supabase.from('material_requests').update({ status: 'approved' }).eq('id', requestId);
        } else {
            // A. XUẤT KHO
            if (toIssueItems.length > 0) {
                if (!warehouseId) throw new Error("Dự án chưa được gán kho vật tư.");
                const issueCode = `PXK-${Date.now().toString().slice(-6)}`;

                const { data: issue, error: issueErr } = await supabase.from('goods_issues').insert({
                    code: issueCode, project_id: projectId, warehouse_id: warehouseId, type: 'out',
                    issue_date: new Date().toISOString(), status: 'approved', description: `Xuất tự động từ Đề xuất`,
                    reference_id: requestId, created_by: employeeId
                }).select().single();

                if (issueErr) throw new Error("Lỗi tạo phiếu xuất: " + issueErr.message);

                const issueDetails = toIssueItems.map(item => ({
                    issue_id: issue.id,
                    item_name: item.item_name,
                    unit: item.unit,
                    quantity: Number(item.action_issue),
                    unit_price: 0
                }));

                const { error: issueItemsErr } = await supabase.from('goods_issue_items').insert(issueDetails);
                if (issueItemsErr) throw new Error("Lỗi thêm chi tiết phiếu xuất: " + issueItemsErr.message);

                for (const item of toIssueItems) {
                    const { data: stock } = await supabase.from('project_inventory').select('id, quantity_on_hand')
                        .eq('warehouse_id', warehouseId).ilike('item_name', item.item_name).maybeSingle();
                    if (stock) {
                        await supabase.from('project_inventory').update({ quantity_on_hand: stock.quantity_on_hand - Number(item.action_issue) }).eq('id', stock.id);
                    }
                }
            }

            // B. MUA HÀNG PO
            if (toPurchaseItems.length > 0) {
                const { data: po, error: poErr } = await supabase.from('purchase_orders').insert({
                    project_id: projectId, code: `PO-AUTO-${Date.now().toString().slice(-6)}`, status: 'draft',
                    order_date: new Date().toISOString(), notes: `Tự động tạo từ Đề xuất`, reference_id: requestId,
                    created_by: employeeId, warehouse_id: warehouseId
                }).select().single();

                if (poErr) throw new Error("Lỗi tạo PO: " + poErr.message);

                const poDetails = toPurchaseItems.map(item => {
                    const rate = Number(item.conversion_rate) || 1;
                    const purchaseUnit = item.purchase_unit || item.base_unit || item.unit;

                    let purchaseQtyConverted = item.action_purchase;
                    const unitPrice = Number(item.purchase_price || 0);

                    // CHỈ QUY ĐỔI NẾU NGƯỜI DÙNG YÊU CẦU BẰNG ĐVT NHỎ
                    if (item.unit?.toLowerCase().trim() !== purchaseUnit?.toLowerCase().trim() && rate > 1) {
                        purchaseQtyConverted = Math.ceil(item.action_purchase / rate);
                    }

                    return {
                        po_id: po.id,
                        item_name: item.item_name,
                        unit: purchaseUnit,
                        quantity: purchaseQtyConverted,
                        unit_price: unitPrice
                    };
                });

                const { error: poItemsErr } = await supabase.from('purchase_order_items').insert(poDetails);
                if (poItemsErr) throw new Error("Lỗi thêm chi tiết PO: " + poItemsErr.message);
            }

            await supabase.from('material_requests').update({ status: 'approved' }).eq('id', requestId);
        }

        if (originalReq) {
            // Send system notifications
            try {
                await sendSystemNotification(supabase, {
                    targetEmployeeId: originalReq.requester_id,
                    title: "Đề xuất đã được duyệt",
                    message: `Đề xuất ${originalReq.code} của bạn đã được phê duyệt.`,
                    link: `/projects/${projectId}/requests/${requestId}`
                });

                await sendSystemNotification(supabase, {
                    targetRole: 'procurement',
                    title: "Đề xuất cần tiến hành mua sắm",
                    message: `Phiếu yêu cầu ${originalReq.code} đã được duyệt. Vui lòng tiến hành tìm kiếm NCC và báo giá.`,
                    link: `/procurement/orders`
                });
            } catch (notifyErr) {
                console.error("Lỗi gửi thông báo:", notifyErr);
            }
        }

        revalidatePath(`/projects/${projectId}`);
        return { success: true, message: "Đã duyệt và thực thi thành công!" };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
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

            // 🔔 THÔNG BÁO TỪ CHỐI 1: Gửi cho người tạo
            await sendSystemNotification(supabase, { targetEmployeeId: req.requester_id, title: "Đề xuất bị từ chối", message, link });

            // 🔔 THÔNG BÁO TỪ CHỐI 2: Gửi cho Quản lý của người tạo
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

        // 🔔 THÔNG BÁO 3: Chốt được NCC và Giá (Tạo PO) -> Báo cho bộ phận Kho chờ nhận hàng
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

        // 🔔 THÔNG BÁO 4: Đã nhận hàng -> Báo cho Kế toán
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

        // 🔔 THÔNG BÁO 5: Thanh toán hoàn tất -> Báo cáo Ban Giám Đốc
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

// ==============================================================================
// PHẦN: CENTRAL & QTO (ĐÃ KHÔI PHỤC ĐẦY ĐỦ LOGIC FALLBACK & THÊM QUY ĐỔI)
// ==============================================================================
export async function getProjectStandardizedMaterials(projectId: string) {
    const supabase = await createClient();

    // 1. Kéo Master Data để ánh xạ đơn vị mua sắm và quy đổi
    const { data: masterData } = await supabase.from('materials').select('name, unit, purchase_unit, conversion_rate');
    const masterMap = new Map();
    masterData?.forEach(m => masterMap.set(m.name.toLowerCase().trim(), m));

    // Hàm helper để map dữ liệu chuẩn (Thêm đơn vị mua sắm và quy đổi)
    const mapWithMasterData = (itemName: string, baseUnit: string, budgetQty: number) => {
        const mInfo = masterMap.get(itemName.toLowerCase().trim());
        return {
            name: itemName,
            unit: mInfo?.purchase_unit || baseUnit, // Ưu tiên đơn vị mua sắm để hiển thị
            base_unit: baseUnit,
            rate: mInfo?.conversion_rate || 1,
            budget: budgetQty
        };
    };

    // Ưu tiên 1: Lấy từ Dự toán chi tiết
    const { data: estimates } = await supabase.from('estimation_items').select('material_name, unit, quantity').eq('project_id', projectId).gt('quantity', 0);
    if (estimates?.length) {
        return estimates.map(i => mapWithMasterData(i.material_name, i.unit, i.quantity));
    }

    // Ưu tiên 2 (Dự phòng): Ngân sách vật tư tổng quan
    const { data: budget } = await supabase.from('project_material_budget').select('material_name, unit, budget_quantity').eq('project_id', projectId);
    if (budget?.length) {
        return budget.map(i => mapWithMasterData(i.material_name, i.unit, i.budget_quantity));
    }

    // Ưu tiên 3 (Dự phòng cuối): Bóc tách khối lượng tự động (QTO)
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

export async function createSupplierAction(data: any) {
    const supabase = await createClient();
    try {
        const payload = {
            name: data.name, type: data.type, contact_person: data.contact_person, phone: data.phone,
            email: data.email, address: data.address, tax_code: data.tax_code, created_at: new Date().toISOString()
        };
        const { error } = await supabase.from('suppliers').insert(payload).select().single();
        if (error) throw new Error(error.message);

        revalidatePath('/procurement/suppliers');
        return { success: true, message: "Thêm nhà cung cấp thành công!" };
    } catch (e: any) {
        return { success: false, error: "Lỗi Server: " + e.message };
    }
}

export async function updateSupplierAction(id: string, data: any) {
    const supabase = await createClient();
    try {
        const { error } = await supabase.from('suppliers').update({
            name: data.name, type: data.type, contact_person: data.contact_person, phone: data.phone,
            email: data.email, address: data.address, tax_code: data.tax_code,
        }).eq('id', id);

        if (error) throw new Error(error.message);

        revalidatePath('/procurement/suppliers');
        return { success: true, message: "Cập nhật thành công!" };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
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
    // Lưu ý: Đảm bảo anh đã import createClient ở đầu file này
    // import { createClient } from "@/lib/supabase/server"; 
    const supabase = await createClient();

    // Thay 'purchase_requests' bằng tên bảng Yêu cầu vật tư thực tế trong DB của anh
    const { data, error } = await supabase
        .from('purchase_requests')
        .select(`
            id,
            code,
            status,
            created_at,
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

export async function createRfqAction(payload: {
    project_id: string;
    purchase_request_id: string;
    deadline: string;
    items: { item_name: string; unit: string; quantity: number }[];
}) {
    try {
        const supabase = await createClient();
        const profile = await getUserProfile();

        // 1. Tạo mã RFQ tự động (Dùng timestamp kết hợp để không bị trùng)
        const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
        const rfqCode = `RFQ-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;

        // 2. Insert vào bảng rfqs (Bổ sung title và created_by)
        const { data: rfq, error: rfqError } = await supabase
            .from('rfqs')
            .insert({
                code: rfqCode,
                // Bọc fallback trường hợp slice ID bị lỗi nếu purchase_request_id bị undefined
                title: `Báo giá cho yêu cầu PR-${(payload.purchase_request_id || 'NEW').slice(0, 6).toUpperCase()}`,
                project_id: payload.project_id,
                purchase_request_id: payload.purchase_request_id,
                deadline: payload.deadline,
                status: 'published',
                created_by: profile?.authId || profile?.id || null
            })
            .select('id')
            .single();

        if (rfqError) throw rfqError;

        // 3. Insert danh sách vật tư vào rfq_items (Chống lỗi NOT NULL triệt để)
        const rfqItemsData = payload.items.map(item => ({
            rfq_id: rfq.id,
            // Ép giá trị mặc định nếu item_name bị rỗng
            item_name: item.item_name || "Vật tư chưa có tên",
            material_name: item.item_name || "Vật tư chưa có tên",
            purchase_unit: item.unit || "Cái",
            // Ép chắc chắn kiểu Số (tránh lỗi string "1.05")
            purchase_quantity: Number(item.quantity) || 0
        }));

        const { error: itemsError } = await supabase
            .from('rfq_items')
            .insert(rfqItemsData);

        if (itemsError) throw itemsError;

        return { success: true, message: "Đã tạo Yêu cầu báo giá (RFQ) từ PR thành công!", rfqId: rfq.id };
    } catch (error: any) {
        console.error("[createRfqAction] Lỗi:", error);
        return { success: false, error: error.message };
    }
}

// Hàm nhập Báo giá từ Nhà cung cấp
export async function submitBidAction(payload: {
    rfq_id: string;
    supplier_id: string;
    bids: { rfq_item_id: string; unit_price: number; delivery_time_days?: number }[];
    profileData?: {
        tax_code?: string;
        phone?: string;
        email?: string;
        address?: string;
        bank_account?: string;
        bank_name?: string;
        latitude?: string;
        longitude?: string;
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
                latitude: payload.profileData.latitude ? parseFloat(payload.profileData.latitude) : null,
                longitude: payload.profileData.longitude ? parseFloat(payload.profileData.longitude) : null,
                status: 'active'
            })
            .eq('id', payload.supplier_id);
    }

    const bidData = payload.bids.map(bid => ({
        rfq_id: payload.rfq_id,
        supplier_id: payload.supplier_id,
        rfq_item_id: bid.rfq_item_id,
        unit_price: bid.unit_price,
        delivery_time_days: bid.delivery_time_days || 0
    }));

    const { error: bidError } = await supabase
        .from('rfq_bids')
        .upsert(bidData, { onConflict: 'rfq_item_id, supplier_id' });

    if (bidError) return { success: false, error: bidError.message };

    await supabase
        .from('rfq_suppliers')
        .update({ status: 'submitted' })
        .match({ rfq_id: payload.rfq_id, supplier_id: payload.supplier_id });

    return { success: true, message: "Đã cập nhật báo giá của Nhà cung cấp!" };
}

// hàm Lấy Ma trận so sánh giá (Bid Tabulation)
export async function getBidTabulation(rfqId: string) {
    try {
        const supabase = await createClient();

        // 1. Lấy danh sách NCC đã mời (hoặc đã nộp)
        const { data: rawSuppliers } = await supabase
            .from('rfq_suppliers')
            .select('supplier_id, supplier:suppliers(name)')
            .eq('rfq_id', rfqId);

        // Format lại dữ liệu supplier cho dễ đọc
        const suppliers = (rawSuppliers || []).map((s: any) => ({
            id: s.supplier_id, // Bắt buộc phải là ID thật của bảng suppliers
            name: Array.isArray(s.supplier) ? s.supplier[0]?.name : s.supplier?.name
        }));

        // 2. LẤY BÁO GIÁ (ĐÂY LÀ PHẦN QUAN TRỌNG NHẤT)
        // Chú ý: Thay 'rfq_bids' bằng đúng tên bảng lưu giá của anh nếu khác
        const { data: matrix, error: matrixError } = await supabase
            .from('rfq_bids')
            .select('supplier_id, rfq_item_id, unit_price')
            .eq('rfq_id', rfqId);

        if (matrixError) console.error("Lỗi kéo giá:", matrixError);

        return {
            suppliers,
            matrix: matrix || []
        };
    } catch (error) {
        console.error("Lỗi getBidTabulation:", error);
        return null;
    }
}

// Hàm Chốt thầu (Select Bid)
export async function selectBidAction(rfqItemId: string, supplierId: string) {
    const supabase = await createClient();

    // Bước 1: Reset tất cả bids của item này về false
    await supabase
        .from('rfq_bids')
        .update({ is_selected: false })
        .eq('rfq_item_id', rfqItemId);

    // Bước 2: Set true cho bid được chọn
    const { error } = await supabase
        .from('rfq_bids')
        .update({ is_selected: true })
        .match({ rfq_item_id: rfqItemId, supplier_id: supplierId });

    return { success: !error, error: error?.message };
}

// Hàm Submit báo giá từ Nhà cung cấp MỚI HOÀN TOÀN (Không có hồ sơ trong hệ thống, phải tạo mới)
export async function submitOpenBidAction(payload: {
    rfq_id: string;
    bids: { rfq_item_id: string; unit_price: number; delivery_time_days?: number }[];
    profileData: {
        name: string;
        tax_code: string;
        phone: string;
        email?: string;
        address: string;
        bank_account?: string;
        bank_name?: string;
        latitude?: string;
        longitude?: string;
    };
}) {
    const supabase = await createClient();

    const { data: newSupplier, error: supplierError } = await supabase
        .from('suppliers')
        .insert({
            name: payload.profileData.name,
            tax_code: payload.profileData.tax_code,
            phone: payload.profileData.phone,
            email: payload.profileData.email,
            address: payload.profileData.address,
            bank_account: payload.profileData.bank_account,
            bank_name: payload.profileData.bank_name,
            latitude: payload.profileData.latitude ? parseFloat(payload.profileData.latitude) : null,
            longitude: payload.profileData.longitude ? parseFloat(payload.profileData.longitude) : null,
            status: 'active'
        })
        .select('id')
        .single();

    if (supplierError || !newSupplier) {
        return { success: false, error: "Lỗi tạo hồ sơ đối tác: " + supplierError?.message };
    }

    const supplierId = newSupplier.id;

    await supabase
        .from('rfq_suppliers')
        .insert({
            rfq_id: payload.rfq_id,
            supplier_id: supplierId,
            status: 'submitted',
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });

    const bidData = payload.bids.map(bid => ({
        rfq_id: payload.rfq_id,
        supplier_id: supplierId,
        rfq_item_id: bid.rfq_item_id,
        unit_price: bid.unit_price,
        delivery_time_days: bid.delivery_time_days || 0
    }));

    const { error: bidError } = await supabase.from('rfq_bids').insert(bidData);
    if (bidError) return { success: false, error: bidError.message };

    return { success: true, message: "Đã ghi nhận báo giá và thiết lập hồ sơ đối tác!" };
}

// Ghi nhận giải trình và Cập nhật danh mục dự toán (estimation_items)
export async function approveBidTabulationAction({ rfqId, selections, justification }: {
    rfqId: string;
    selections: Record<string, string>; // { qto_item_id: supplier_id }
    justification: string;
}) {
    const supabase = await createClient();

    // 1. Lưu biên bản phê duyệt vào bid_tabulations
    const { error: tabError } = await supabase.from('bid_tabulations').insert({
        rfq_id: rfqId,
        procurement_justification: justification,
        status: 'approved'
    });

    if (tabError) return { success: false, error: tabError.message };

    // 2. Cập nhật NCC ưu tiên vào bảng estimation_items (theo đúng logic đã chốt)
    for (const [qtoItemId, supplierId] of Object.entries(selections)) {
        await supabase
            .from('estimation_items')
            .update({ preferred_supplier_id_1: supplierId })
            .eq('qto_item_id', qtoItemId);
    }

    return { success: true };
}

// Tạo mã RFQ tự động, chuyển dữ liệu từ "Giỏ nhu cầu" sang rfq_items và khóa các nhu cầu đã được xử lý
export async function createRFQAction({ title, deadline, needIds }: { title: string, deadline: string, needIds: string[] }) {
    try {
        const supabase = await createClient();

        // 1. Sử dụng getUserProfile thay vì supabase.auth.getUser() để lấy ID chuẩn xác
        const profile = await getUserProfile();

        if (!profile || !profile.authId) {
            throw new Error("Không xác thực được phiên đăng nhập. Vui lòng thử lại!");
        }

        // 2. Sinh mã RFQ tự động (VD: RFQ-2606-001)
        const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
        const { count } = await supabase.from('rfqs').select('*', { count: 'exact', head: true });
        const rfqCode = `RFQ-${dateStr}-${String((count || 0) + 1).padStart(3, '0')}`;

        // 3. Tạo bản ghi RFQ mới
        const { data: rfq, error: rfqError } = await supabase
            .from('rfqs')
            .insert({
                code: rfqCode,
                title: title,
                deadline: deadline,
                created_by: profile.authId, // Dùng ID chuẩn từ profile để không vi phạm Foreign Key
                status: 'published'
            })
            .select()
            .single();

        if (rfqError) throw rfqError;

        // 4. Lấy chi tiết các Nhu cầu (Procurement Needs) đang được chọn
        const { data: needs, error: needsError } = await supabase
            .from('procurement_needs')
            .select('*')
            .in('id', needIds);

        if (needsError) throw needsError;

        // 5. Đẩy vào bảng rfq_items (Snapshots)
        const rfqItems = needs.map(need => ({
            rfq_id: rfq.id,
            procurement_need_id: need.id,
            material_code: need.material_code,
            material_name: need.material_name,
            purchase_unit: need.purchase_unit,
            purchase_quantity: need.purchase_quantity
        }));

        const { error: itemsError } = await supabase.from('rfq_items').insert(rfqItems);
        if (itemsError) throw itemsError;

        // 6. Cập nhật trạng thái trong Giỏ nhu cầu thành 'rfq_created'
        const { error: updateError } = await supabase
            .from('procurement_needs')
            .update({ status: 'rfq_created', rfq_id: rfq.id })
            .in('id', needIds);

        if (updateError) throw updateError;

        revalidatePath('/procurement/rfq');
        return { success: true, message: `Đã tạo gói thầu ${rfqCode} thành công!`, rfqId: rfq.id };
    } catch (error: any) {
        console.error("[createRFQAction] Lỗi:", error);
        return { success: false, error: error.message };
    }
}

// Lấy chi tiết RFQ
export async function getRfqDetails(id: string) {
    try {
        const supabase = await createClient();

        // 1. Lấy thông tin RFQ
        const { data: rfq } = await supabase.from('rfqs').select('*').eq('id', id).single();

        // 2. Lấy danh sách Vật tư
        const { data: items } = await supabase.from('rfq_items').select('*').eq('rfq_id', id);

        // 3. LẤY DANH SÁCH NCC ĐÃ MỜI
        const { data: invitedSuppliers, error: invError } = await supabase
            .from('rfq_suppliers')
            .select(`
                id, rfq_id, supplier_id, status, token, 
                supplier:suppliers (id, name, tax_code, phone, email) 
            `) // <-- Đổi 'code' thành 'tax_code'
            .eq('rfq_id', id);

        if (invError) {
            console.error("Lỗi khi kéo list NCC:", invError);
        }

        // 4. Lấy tất cả NCC để bỏ vào Combobox mời thêm
        const { data: allSuppliers } = await supabase.from('suppliers').select('id, name, code').eq('status', 'active');

        return { rfq, items, invitedSuppliers, allSuppliers };
    } catch (error) {
        console.error("Lỗi getRfqDetails:", error);
        return null;
    }
}

// Thêm NCC vào danh sách mời thầu
export async function inviteSupplierAction(rfqId: string, supplierId: string) {
    try {
        const supabase = await createClient();

        // 1. Kiểm tra xem NCC này đã được mời trong gói này chưa
        const { data: exist } = await supabase
            .from('rfq_suppliers')
            .select('id')
            .eq('rfq_id', rfqId)
            .eq('supplier_id', supplierId)
            .single();

        if (exist) return { success: false, error: "Nhà cung cấp này đã có trong danh sách mời!" };

        // 2. Lấy deadline của gói thầu để gán làm hạn chốt link báo giá
        const { data: rfq, error: rfqError } = await supabase
            .from('rfqs')
            .select('deadline')
            .eq('id', rfqId)
            .single();

        if (rfqError) throw new Error("Không tìm thấy thông tin gói thầu!");

        // 3. Insert với đầy đủ các trường bắt buộc (bao gồm expires_at)
        const { error } = await supabase.from('rfq_suppliers').insert({
            rfq_id: rfqId,
            supplier_id: supplierId,
            status: 'pending',
            expires_at: rfq.deadline // Gán hạn chốt của link bằng deadline gói thầu
        });

        if (error) throw error;

        revalidatePath(`/procurement/rfq/${rfqId}`);
        return { success: true, message: "Đã thêm Nhà cung cấp vào danh sách mời!" };
    } catch (error: any) {
        console.error("[inviteSupplierAction] Lỗi:", error);
        return { success: false, error: error.message };
    }
}

// Xử lý Nhà cung cấp đăng ký từ Link Công Khai
export async function registerPublicSupplierAction(publicToken: string, formData: { name: string; phone: string; tax_code?: string; email?: string }) {
    try {
        const supabase = await createClient();

        // 1. Kiểm tra xem Link Công Khai này có hợp lệ và gói thầu còn mở không
        const { data: rfq, error: rfqError } = await supabase
            .from('rfqs')
            // BỔ SUNG: Gọi thêm trường deadline ở đây
            .select('id, title, status, deadline')
            .eq('public_token', publicToken)
            .single();

        if (rfqError || !rfq) throw new Error("Đường dẫn không hợp lệ hoặc đã hết hạn!");
        if (rfq.status !== 'published') throw new Error("Gói thầu này đã đóng, không thể nhận thêm báo giá!");

        // 2. Tạo Nhà cung cấp mới vào danh bạ (Bảng suppliers)
        const { data: newSupplier, error: suppError } = await supabase
            .from('suppliers')
            .insert({
                name: formData.name,
                phone: formData.phone,
                tax_code: formData.tax_code || null,
                email: formData.email || null,
                status: 'active',
                type: 'material'
            })
            .select('id')
            .single();

        if (suppError) throw suppError;

        // 3. Đưa NCC này vào danh sách dự thầu của RFQ (Tạo token bí mật)
        const { data: rfqSupp, error: inviteError } = await supabase
            .from('rfq_suppliers')
            .insert({
                rfq_id: rfq.id,
                supplier_id: newSupplier.id,
                status: 'viewed',
                // BỔ SUNG: Gắn hạn sử dụng link bằng đúng deadline của gói thầu
                expires_at: rfq.deadline
            })
            .select('token')
            .single();

        if (inviteError) throw inviteError;

        // 4. Trả về token bí mật để Redirect họ sang trang nhập giá
        return { success: true, privateToken: rfqSupp.token };
    } catch (error: any) {
        console.error("[registerPublicSupplier] Lỗi:", error);
        return { success: false, error: error.message };
    }
}

// Lấy dữ liệu để hiển thị lên Cổng báo giá bằng Token
export async function getBidDataByToken(token: string) {
    try {
        const supabase = await createClient();

        // 1. Lấy thông tin từ token
        const { data: rfqSupplier, error: tokenError } = await supabase
            .from('rfq_suppliers')
            .select('*, supplier:suppliers(*), rfq:rfqs(*)')
            .eq('token', token)
            .single();

        if (tokenError || !rfqSupplier) throw new Error("Đường dẫn không hợp lệ hoặc không tồn tại!");

        // 2. Kiểm tra trạng thái gói thầu
        if (rfqSupplier.rfq.status !== 'published') {
            throw new Error("Gói thầu này đã kết thúc hoặc bị đóng. Không thể cập nhật báo giá!");
        }

        // 3. Lấy danh sách vật tư cần mua
        const { data: items } = await supabase
            .from('rfq_items')
            .select('*')
            .eq('rfq_id', rfqSupplier.rfq_id);

        // 4. Lấy báo giá cũ (nếu NCC đã từng vào điền rồi muốn sửa lại)
        const { data: existingBids } = await supabase
            .from('rfq_bids')
            .select('*')
            .eq('supplier_id', rfqSupplier.supplier_id)
            .eq('rfq_id', rfqSupplier.rfq_id);

        return {
            success: true,
            data: {
                rfqSupplier,
                rfq: rfqSupplier.rfq,
                supplier: rfqSupplier.supplier,
                items: items || [],
                existingBids: existingBids || []
            }
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// Xóa gói thầu (RFQ) - Cập nhật lại trạng thái của các nhu cầu vật tư về 'pending' để có thể tạo lại gói thầu mới
export async function deleteRFQAction(rfqId: string) {
    try {
        const supabase = await createClient();

        // 1. Cập nhật lại status của các "nhu cầu vật tư" trong giỏ về 'pending' 
        // để người dùng có thể tạo lại gói thầu mới
        const { error: resetError } = await supabase
            .from('procurement_needs')
            .update({ status: 'pending', rfq_id: null })
            .eq('rfq_id', rfqId);

        if (resetError) throw resetError;

        // 2. Xóa gói thầu (RFQ) - Các rfq_items và rfq_suppliers sẽ bị xóa theo 
        // nhờ ràng buộc "on delete cascade" mà chúng ta đã cấu hình
        const { error: deleteError } = await supabase
            .from('rfqs')
            .delete()
            .eq('id', rfqId);

        if (deleteError) throw deleteError;

        revalidatePath('/procurement/rfq');
        return { success: true, message: "Đã hủy gói thầu và hoàn trả vật tư về giỏ nhu cầu!" };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// Chốt thầu: Cập nhật trạng thái gói thầu thành Completed, đánh dấu NCC trúng thầu và các NCC còn lại
export async function awardRfqAction(rfqId: string, winningSupplierId: string) {
    try {
        const supabase = await createClient();

        // 1. Cập nhật trạng thái Gói thầu thành Completed
        const { error: rfqError } = await supabase
            .from('rfqs')
            .update({
                status: 'completed',
                // Nếu bảng rfqs có cột winning_supplier_id thì uncomment dòng dưới:
                // winning_supplier_id: winningSupplierId 
            })
            .eq('id', rfqId);

        if (rfqError) throw rfqError;

        // 2. Đánh dấu NCC trúng thầu (won)
        await supabase
            .from('rfq_suppliers')
            .update({ status: 'won' })
            .eq('rfq_id', rfqId)
            .eq('supplier_id', winningSupplierId);

        // 3. Đánh dấu các NCC còn lại là trượt (lost)
        await supabase
            .from('rfq_suppliers')
            .update({ status: 'lost' })
            .eq('rfq_id', rfqId)
            .neq('supplier_id', winningSupplierId);

        revalidatePath(`/procurement/rfq/${rfqId}`);
        return { success: true };
    } catch (error: any) {
        console.error("Lỗi awardRfqAction:", error);
        return { success: false, error: error.message };
    }
}