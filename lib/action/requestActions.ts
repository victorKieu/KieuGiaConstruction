"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { materialRequestSchema, MaterialRequestFormValues } from "@/lib/schemas/request";
import { checkApprovalPermission } from "@/lib/auth/permissions";
import { sendPushToUser } from "@/lib/action/pushNotification";

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
// PHẦN 1: CÁC HÀM GET (LẤY DỮ LIỆU) - Giữ nguyên, đã chuẩn
// ==============================================================================

export async function getProjectRequests(projectId: string) {
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

    if (error) return [];
    return data || [];
}

export async function getMaterialRequestById(id: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('material_requests')
        .select(`
            *,
            requester:employees!requester_id(id, name),
            items:material_request_items(*)
        `)
        .eq('id', id)
        .single();

    if (error) return null;
    return data;
}

export async function getAvailableMaterials(projectId: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from('project_material_budget')
        .select('material_name, unit')
        .eq('project_id', projectId)
        .order('material_name');
    return data || [];
}

export async function getProjectWarehouses(projectId: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from('warehouses')
        .select('id, name')
        .eq('project_id', projectId);
    return data || [];
}

// ==============================================================================
// PHẦN 2: CÁC HÀM ACTION (TẠO, SỬA, XÓA, DUYỆT)
// ==============================================================================

// 5. TẠO YÊU CẦU MỚI (Action cũ dùng Zod - Dành cho luồng Project)
export async function createMaterialRequestAction(
    projectId: string,
    data: MaterialRequestFormValues
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Vui lòng đăng nhập." };

    try {
        // ✅ FIX 1: Lấy ID gốc của employee thay vì dùng auth_id
        const { data: employee } = await supabase.from('employees').select('id').eq('auth_id', user.id).single();
        if (!employee) return { success: false, error: "Không tìm thấy hồ sơ nhân sự." };

        const validated = materialRequestSchema.safeParse(data);
        if (!validated.success) return { success: false, error: "Dữ liệu lỗi: " + validated.error.message };

        const payload = validated.data;
        const code = `MR-${Date.now().toString().slice(-6)}`;

        // A. Tạo Header
        const { data: req, error: reqError } = await supabase
            .from('material_requests')
            .insert({
                project_id: projectId,
                code: code,
                requester_id: employee.id, // ✅ Đã sửa
                created_by: employee.id,   // ✅ Đã sửa
                status: 'pending',
                priority: payload.priority,
                deadline_date: payload.deadline_date.toISOString(),
                destination_warehouse_id: payload.destination_warehouse_id || null,
                notes: payload.notes
            })
            .select('id')
            .single();

        if (reqError) throw new Error("Lỗi tạo phiếu: " + reqError.message);

        // B. Tạo Items
        if (payload.items && payload.items.length > 0) {
            const itemsData = payload.items.map(item => ({
                request_id: req.id,
                item_name: item.item_name,
                item_category: 'material', // Mặc định luồng cũ là vật tư
                unit: item.unit,
                quantity: Number(item.quantity),
                notes: item.notes
            }));

            const { error: itemsError } = await supabase.from('material_request_items').insert(itemsData);
            if (itemsError) {
                await supabase.from('material_requests').delete().eq('id', req.id);
                throw new Error("Lỗi lưu chi tiết: " + itemsError.message);
            }
        }

        revalidatePath(`/projects/${projectId}`);
        return { success: true, message: "Tạo yêu cầu thành công!" };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// 6. CẬP NHẬT YÊU CẦU (Action cũ dùng Zod)
export async function updateMaterialRequestAction(id: string, data: any) {
    const supabase = await createClient();

    const validated = materialRequestSchema.safeParse(data);
    if (!validated.success) return { success: false, error: "Dữ liệu lỗi: " + validated.error.message };

    const payload = validated.data;

    try {
        const { error: headerErr } = await supabase
            .from('material_requests')
            .update({
                deadline_date: payload.deadline_date.toISOString(),
                priority: payload.priority,
                notes: payload.notes,
                destination_warehouse_id: payload.destination_warehouse_id || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (headerErr) throw new Error("Lỗi cập nhật phiếu: " + headerErr.message);

        if (payload.items && payload.items.length > 0) {
            await supabase.from('material_request_items').delete().eq('request_id', id);

            const items = payload.items.map((i: any) => ({
                request_id: id,
                item_name: i.item_name,
                item_category: i.item_category || 'material',
                unit: i.unit,
                quantity: Number(i.quantity),
                notes: i.notes
            }));

            const { error: itemsErr } = await supabase.from('material_request_items').insert(items);
            if (itemsErr) throw new Error("Lỗi cập nhật chi tiết: " + itemsErr.message);
        }

        revalidatePath(`/projects/${payload.project_id}/requests/${id}`);
        return { success: true, message: "Cập nhật thành công!" };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// 7. XÓA YÊU CẦU
export async function deleteMaterialRequest(requestId: string, projectId?: string) {
    const supabase = await createClient();

    try {
        const { data: currentReq } = await supabase.from('material_requests').select('status').eq('id', requestId).single();
        if (currentReq?.status !== 'pending') {
            return { success: false, error: "Chỉ được xóa phiếu đang chờ xử lý." };
        }

        await supabase.from('material_request_items').delete().eq('request_id', requestId);
        const { error } = await supabase.from('material_requests').delete().eq('id', requestId);
        if (error) throw new Error(error.message);

        if (projectId) revalidatePath(`/projects/${projectId}`);
        revalidatePath('/requests'); // Revalidate luôn trang tổng

        return { success: true, message: "Đã xóa phiếu yêu cầu." };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// 8. DUYỆT / TỪ CHỐI (Cho Ban Giám Đốc)
export async function updateRequestStatus(requestId: string, status: 'approved' | 'rejected', projectId?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    try {
        // ✅ FIX 2: Lấy ID của người duyệt (BOD)
        let approverId = null;
        if (user) {
            const { data: employee } = await supabase.from('employees').select('id').eq('auth_id', user.id).single();
            if (employee) approverId = employee.id;
        }

        const { error } = await supabase
            .from('material_requests')
            .update({
                status: status,
                approved_by: approverId, // Cột này nếu có trong DB sẽ được cập nhật chuẩn
                updated_at: new Date().toISOString()
            })
            .eq('id', requestId);

        if (error) throw error;

        if (projectId) revalidatePath(`/projects/${projectId}`);
        revalidatePath('/requests');

        return { success: true, message: `Đã ${status === 'approved' ? 'duyệt' : 'từ chối'} phiếu yêu cầu.` };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// ==============================================================================
// 9. TẠO YÊU CẦU MUA SẮM TÀI SẢN & VẬT TƯ (Luồng mới Đa Kho - Dùng FormData)
// ==============================================================================
export async function createPurchaseRequest(formData: FormData, items: any[]) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return { success: false, error: "Vui lòng đăng nhập." };

        const { data: employee } = await supabase
            .from('employees')
            .select('id, department_id')
            .eq('auth_id', user.id)
            .single();

        if (!employee) return { success: false, error: "Không tìm thấy thông tin nhân sự." };

        // ✅ FIX 3: Ghép title và reason thành "notes" để khớp với Schema Database
        const title = formData.get("title") as string;
        const reason = formData.get("reason") as string;
        const priority = formData.get("priority") as string;
        const expected_date = formData.get("expected_date") as string;
        const destination_warehouse_id = formData.get("destination_warehouse_id") as string;

        const combinedNotes = `[${title}]\nLý do: ${reason}`; // Ghép chuỗi

        if (!destination_warehouse_id) {
            return { success: false, error: "BẮT BUỘC: Vui lòng chọn Kho nhận hàng." };
        }

        if (!items || items.length === 0) {
            return { success: false, error: "Vui lòng thêm ít nhất 1 mặt hàng cần mua." };
        }

        const code = `MR-${Date.now().toString().slice(-6)}`;

        const requestData = {
            code: code,
            requester_id: employee.id,
            created_by: employee.id,
            department_id: employee.department_id,
            destination_warehouse_id,
            priority,
            deadline_date: expected_date ? new Date(expected_date).toISOString() : new Date().toISOString(), // Đổi sang deadline_date
            notes: combinedNotes, // Đẩy vào notes
            status: 'pending',
        };

        const { data: newRequest, error: reqError } = await supabase
            .from('material_requests')
            .insert(requestData)
            .select('id')
            .single();

        if (reqError) throw reqError;

        const requestItemsData = items.map(item => ({
            request_id: newRequest.id,
            item_name: item.name,
            item_category: item.category, // Cột này cần có trong DB để phân biệt Asset/Material
            quantity: Number(item.quantity) || 1,
            unit: item.unit || 'Cái',
            estimated_price: Number(item.estimatedPrice) || 0, // Cột này cần có trong DB
            notes: item.note || ''
        }));

        const { error: itemsError } = await supabase
            .from('material_request_items')
            .insert(requestItemsData);

        if (itemsError) {
            await supabase.from('material_requests').delete().eq('id', newRequest.id);
            throw itemsError;
        }

        revalidatePath('/requests');
        return { success: true, message: "Đã gửi phiếu đề xuất mua sắm thành công! Chờ Quản lý duyệt." };

    } catch (error: any) {
        console.error("[SERVER_ERROR] createPurchaseRequest:", error);
        return { success: false, error: "Lỗi hệ thống khi tạo phiếu yêu cầu." };
    }
}

// 10. DUYỆT YÊU CẦU MUA SẮM (Dành cho Quản lý dự án hoặc Quản trị viên - Sinh ra PO & PXK nếu có) - Luồng mới Đa Kho
export async function approveAndProcessRequest(requestId: string, projectId: string, approvedItems: any[], warehouseId: string) {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    try {
        let employeeId = null;
        if (user) {
            const { data: emp } = await supabase.from('employees').select('id').eq('auth_id', user.id).single();
            employeeId = emp?.id || null;
        }

        const hasPermission = await checkApprovalPermission(projectId);
        if (!hasPermission) throw new Error("Từ chối truy cập: Chỉ Quản trị viên hoặc Ban quản lý dự án mới có quyền phê duyệt phiếu này!");

        const toIssueItems = approvedItems.filter(i => (Number(i.action_issue) || 0) > 0);
        const toPurchaseItems = approvedItems.filter(i => (Number(i.action_purchase) || 0) > 0);

        const { data: originalReq } = await supabase.from('material_requests').select('code, requester_id').eq('id', requestId).single();

        if (toIssueItems.length === 0 && toPurchaseItems.length === 0) {
            await supabase.from('material_requests').update({ status: 'approved' }).eq('id', requestId);
            return { success: true, message: "Đã duyệt phiếu thành công." };
        }

        // ==========================================
        // A. XUẤT KHO
        // ==========================================
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
                item_name: item.item_name || item.material_name,
                unit: item.unit,
                quantity: Number(item.action_issue),
                unit_price: 0
            }));

            await supabase.from('goods_issue_items').insert(issueDetails);

            for (const item of toIssueItems) {
                const { data: stock } = await supabase.from('project_inventory').select('id, quantity_on_hand')
                    .eq('warehouse_id', warehouseId).ilike('item_name', item.item_name || item.material_name).maybeSingle();
                if (stock) {
                    await supabase.from('project_inventory').update({ quantity_on_hand: stock.quantity_on_hand - Number(item.action_issue) }).eq('id', stock.id);
                }
            }
        }

        let poCount = 0;
        let emptyPoCreated = false;

        // ==========================================
        // B. MUA HÀNG PO
        // ==========================================
        if (toPurchaseItems.length > 0) {
            const { data: awardedNeeds } = await supabase
                .from('vw_awarded_bids')
                .select('material_code, material_name, awarded_supplier_id, awarded_price')
                .eq('project_id', projectId);

            const { data: masterMats } = await supabase.from('materials').select('code, name, supplier_id');

            const groupedItems = new Map<string, any[]>();
            const orphanItems: any[] = [];

            toPurchaseItems.forEach(item => {
                const itemNameToCheck = (item.material_name || item.item_name || "").trim().toLowerCase();
                const itemCodeToCheck = (item.material_code || "").trim().toUpperCase();

                const matchedNeed = awardedNeeds?.find(need =>
                    (itemCodeToCheck && need.material_code && need.material_code.trim().toUpperCase() === itemCodeToCheck) ||
                    (need.material_name && need.material_name.trim().toLowerCase() === itemNameToCheck)
                );

                const matchedMaster = masterMats?.find(m => m.code === itemCodeToCheck || m.name.trim().toLowerCase() === itemNameToCheck);

                let payloadSupplierId = item.awarded_supplier_id || item.supplier_id || item.supplierId || item.suggested_supplier_id;
                if (typeof payloadSupplierId === 'object' && payloadSupplierId !== null) {
                    payloadSupplierId = payloadSupplierId.id || payloadSupplierId.supplier_id || null;
                }
                if (typeof payloadSupplierId !== 'string' || payloadSupplierId.length < 10) payloadSupplierId = null;

                const actualSupplierId = matchedNeed?.awarded_supplier_id || payloadSupplierId || matchedMaster?.supplier_id || null;
                const actualPrice = matchedNeed?.awarded_price || Number(item.awarded_price || item.purchase_price || item.unit_price || 0);

                if (actualSupplierId && actualSupplierId !== 'null' && actualSupplierId !== 'undefined') {
                    if (!groupedItems.has(actualSupplierId)) groupedItems.set(actualSupplierId, []);
                    groupedItems.get(actualSupplierId)!.push({ ...item, final_unit_price: actualPrice });
                } else {
                    orphanItems.push(item);
                }
            });

            // TẠO PO ĐÃ CHỐT NCC
            for (const [supplierId, itemsForSupplier] of Array.from(groupedItems.entries())) {
                const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
                const poCode = `PO-${Date.now().toString().slice(-6)}-${randomSuffix}`;

                const { data: po, error: poErr } = await supabase.from('purchase_orders').insert({
                    project_id: projectId, supplier_id: supplierId, code: poCode, status: 'draft',
                    order_date: new Date().toISOString(), notes: `Tạo tự động từ Đề xuất vật tư`,
                    reference_id: requestId, created_by: employeeId, warehouse_id: warehouseId
                }).select().single();

                if (!poErr && po) {
                    const poDetails = itemsForSupplier.map(item => {
                        const rate = Number(item.conversion_rate) || 1;
                        const purchaseUnit = item.purchase_unit || item.base_unit || item.unit;
                        let purchaseQtyConverted = Number(item.action_purchase) || 0;
                        if (item.unit?.toLowerCase().trim() !== purchaseUnit?.toLowerCase().trim() && rate > 1) {
                            purchaseQtyConverted = Math.ceil(purchaseQtyConverted / rate);
                        }
                        return {
                            po_id: po.id,
                            item_name: item.item_name || item.material_name,
                            unit: purchaseUnit,
                            quantity: purchaseQtyConverted,
                            unit_price: item.final_unit_price || 0
                            // Đã gỡ bỏ total_price để Database tự động tính toán
                        };
                    });
                    const { error: itemErr } = await supabase.from('purchase_order_items').insert(poDetails);
                    if (itemErr) throw new Error("Lỗi chèn chi tiết PO: " + itemErr.message);
                    poCount++;
                }
            }

            // TẠO PO TRỐNG
            if (orphanItems.length > 0) {
                const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
                const emptyPoCode = `PO-${Date.now().toString().slice(-6)}-${randomSuffix}`;

                const { data: emptyPo, error: emptyPoErr } = await supabase.from('purchase_orders').insert({
                    project_id: projectId, supplier_id: null, code: emptyPoCode, status: 'draft',
                    order_date: new Date().toISOString(), notes: `PO trống NCC - Chờ Phòng Thu mua gán NCC`,
                    reference_id: requestId, created_by: employeeId, warehouse_id: warehouseId
                }).select().single();

                if (!emptyPoErr && emptyPo) {
                    const emptyPoDetails = orphanItems.map(item => {
                        const rate = Number(item.conversion_rate) || 1;
                        const purchaseUnit = item.purchase_unit || item.base_unit || item.unit;
                        let purchaseQtyConverted = Number(item.action_purchase) || 0;
                        if (item.unit?.toLowerCase().trim() !== purchaseUnit?.toLowerCase().trim() && rate > 1) {
                            purchaseQtyConverted = Math.ceil(purchaseQtyConverted / rate);
                        }
                        return {
                            po_id: emptyPo.id,
                            item_name: item.item_name || item.material_name,
                            unit: purchaseUnit,
                            quantity: purchaseQtyConverted,
                            unit_price: 0
                            // Đã gỡ bỏ total_price để Database tự động tính toán
                        };
                    });
                    const { error: itemErr } = await supabase.from('purchase_order_items').insert(emptyPoDetails);
                    if (itemErr) throw new Error("Lỗi chèn chi tiết PO Trống: " + itemErr.message);
                    poCount++;
                    emptyPoCreated = true;
                }
            }
        }

        await supabase.from('material_requests').update({ status: 'approved' }).eq('id', requestId);

        revalidatePath(`/projects/${projectId}`);
        return { success: true, message: `Đã duyệt thành công! Sinh ra tổng cộng ${poCount} đơn hàng PO.${emptyPoCreated ? " (Bao gồm 1 PO trống)" : ""}` };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}