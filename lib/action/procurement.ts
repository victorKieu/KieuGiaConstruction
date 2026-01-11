"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { supplierSchema, purchaseOrderSchema, SupplierFormValues, PurchaseOrderFormValues } from "@/lib/schemas/procurement";

// --- PHẦN 1: NHÀ CUNG CẤP ---

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

// --- PHẦN 2: ĐƠN MUA HÀNG (PO) ---

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

// Lấy chi tiết 1 đơn hàng (Dùng cho Edit và Detail)
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

// --- 4. TẠO PO THỦ CÔNG (MANUAL) ---
export async function createPurchaseOrderAction(data: PurchaseOrderFormValues) {
    const supabase = await createClient();

    try {
        // ... (Giữ nguyên các đoạn validate đầu hàm) ...
        if (!data.project_id) return { success: false, error: "Vui lòng chọn Dự án" };
        if (!data.supplier_id) return { success: false, error: "Vui lòng chọn Nhà cung cấp" };
        if (!data.items || data.items.length === 0) return { success: false, error: "Đơn hàng phải có ít nhất 1 sản phẩm" };

        const { data: { user } } = await supabase.auth.getUser();

        // ✅ FIX: Tính tổng tiền trước khi tạo Header
        // Công thức: Tổng = SL * Đơn giá * (1 + VAT%)
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
                total_amount: calculatedTotal // ✅ LƯU TỔNG TIỀN ĐÃ TÍNH
            })
            .select()
            .single();

        if (poError) throw new Error("Lỗi tạo PO: " + poError.message);

        // B. Tạo PO Items (Giữ nguyên logic cũ)
        const poItemsData = data.items.map(item => ({
            po_id: po.id,
            item_name: item.item_name,
            unit: item.unit,
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price || 0),
            vat_rate: Number(item.vat_rate || 0),
            // Lưu thêm total_price cho từng dòng để sau này dễ đối chiếu
            // total_price: Number(item.quantity) * Number(item.unit_price) * (1 + (item.vat_rate || 0) / 100)
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
export async function updatePurchaseOrderAction(id: string, data: PurchaseOrderFormValues & { status?: string }) { // Nhận thêm status
    const supabase = await createClient();

    // Validate
    const validated = purchaseOrderSchema.safeParse(data);
    if (!validated.success) return { success: false, error: "Dữ liệu lỗi" };

    const { items, ...poData } = validated.data;

    // Tính tổng tiền
    const totalAmount = items.reduce((sum, item) => {
        const preTaxTotal = item.quantity * item.unit_price;
        const vatAmount = preTaxTotal * (item.vat_rate / 100);
        return sum + preTaxTotal + vatAmount;
    }, 0);

    // 1. Update Header (Bao gồm cả Status)
    const updateData: any = {
        code: poData.code,
        project_id: poData.project_id,
        supplier_id: poData.supplier_id,
        order_date: poData.order_date.toISOString(),
        expected_delivery_date: poData.expected_delivery_date?.toISOString(),
        notes: poData.notes,
        total_amount: totalAmount,
    };

    // Nếu người dùng có gửi status lên thì cập nhật (VD: chuyển từ draft -> ordered)
    if (data.status) {
        updateData.status = data.status;
    }

    const { error: poError } = await supabase
        .from("purchase_orders")
        .update(updateData)
        .eq("id", id);

    if (poError) return { success: false, error: "Lỗi cập nhật đơn hàng: " + poError.message };

    // 2. Xóa Items cũ
    const { error: deleteError } = await supabase.from("purchase_order_items").delete().eq("po_id", id);
    if (deleteError) return { success: false, error: "Lỗi xóa dữ liệu cũ" };

    // 3. Thêm Items mới
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

    // 1. Kiểm tra trạng thái trước khi xóa
    const { data: po } = await supabase.from("purchase_orders").select("status").eq("id", id).single();

    if (!po) return { success: false, error: "Đơn hàng không tồn tại" };
    if (po.status === 'received' || po.status === 'completed') {
        return { success: false, error: "Không thể xóa đơn hàng đã nhập kho hoặc hoàn thành!" };
    }

    // 2. Xóa Items (Chi tiết) trước
    const { error: itemsError } = await supabase.from("purchase_order_items").delete().eq("po_id", id);
    if (itemsError) return { success: false, error: "Lỗi xóa chi tiết: " + itemsError.message };

    // 3. Xóa Header (Đơn hàng)
    const { error: poError } = await supabase.from("purchase_orders").delete().eq("id", id);
    if (poError) return { success: false, error: "Lỗi xóa đơn hàng: " + poError.message };

    revalidatePath("/procurement/orders");
    return { success: true, message: "Đã xóa đơn hàng thành công" };
}

// Tạo phiếu nhập kho (GRN)

export async function createGoodsReceiptAction(
    poId: string,
    notes: string,
    targetWarehouseId: string, // <--- THÊM THAM SỐ NÀY
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

    // 2. Sử dụng kho người dùng đã chọn
    const warehouseId = targetWarehouseId;

    if (!warehouseId) return { success: false, error: "Vui lòng chọn kho để nhập hàng!" };

    // 3. Tạo phiếu nhập (GRN)
    const { error: grnError } = await supabase.from("goods_receipts").insert({
        po_id: poId,
        received_date: new Date().toISOString(),
        notes: notes,
        receipt_image_url: image_url || null,
        created_at: new Date().toISOString(),
    });

    if (grnError) return { success: false, error: "Lỗi tạo phiếu nhập: " + grnError.message };

    // 4. CẬP NHẬT TỒN KHO
    for (const item of po.items) {
        // Kiểm tra tồn kho hiện tại
        const { data: currentStock } = await supabase
            .from("project_inventory")
            .select("*")
            .eq("warehouse_id", warehouseId)
            .eq("item_name", item.item_name) // Quan trọng: Tên phải khớp chính xác
            .single(); // Bỏ .eq("unit", item.unit) nếu muốn linh động, nhưng nên giữ để chặt chẽ

        if (currentStock) {
            // CỘNG DỒN & TÍNH GIÁ BÌNH QUÂN
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
            // TẠO MỚI TRONG KHO
            await supabase.from("project_inventory").insert({
                project_id: po.project_id, // Gán vào dự án của đơn hàng
                warehouse_id: warehouseId,
                item_name: item.item_name,
                unit: item.unit,
                quantity_on_hand: item.quantity,
                avg_price: item.unit_price,
                last_updated: new Date().toISOString()
            });
        }
    }

    // 5. Cập nhật trạng thái Đơn hàng -> Received
    await supabase.from("purchase_orders").update({ status: 'received' }).eq("id", poId);

    revalidatePath(`/procurement/orders/${poId}`);
    return { success: true, message: "Đã nhập kho thành công!" };
}
// --- PHẦN 6: THANH TOÁN (PAYMENT) ---

// 1. Lấy danh sách Hạng mục chi (để chọn khi chi tiền)
export async function getExpenseCategories() {
    const supabase = await createClient();
    // Lấy các hạng mục loại 'expense' (Chi phí)
    const { data } = await supabase
        .from("finance_categories")
        .select("id, name")
        .eq("type", "expense")
        .order("name");
    return data || [];
}

// 2. Lấy lịch sử thanh toán của 1 Đơn hàng
export async function getPOTransactions(poId: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from("finance_transactions")
        .select("*")
        .eq("po_id", poId)
        .order("transaction_date", { ascending: false });
    return data || [];
}

// 3. TẠO PHIẾU CHI CHO ĐƠN HÀNG
// 3. TẠO PHIẾU CHI CHO ĐƠN HÀNG
export async function createPaymentForPOAction(
    poId: string,
    projectId: string,
    amount: number,
    categoryId: string, // <-- Đảm bảo cái này không được rỗng
    paymentDate: Date,
    method: string,
    notes: string
) {
    const supabase = await createClient();

    console.log("--- BẮT ĐẦU CHI TIỀN ---");
    console.log("Payload:", { poId, projectId, amount, categoryId, method });

    // Validate cơ bản
    if (!categoryId) {
        return { success: false, error: "Lỗi: Chưa chọn hạng mục chi (Category ID bị thiếu)" };
    }

    // A. Tạo giao dịch tài chính (Phiếu chi)
    const { data: trans, error: transError } = await supabase.from("finance_transactions").insert({
        amount: amount,
        type: 'expense', // Là khoản CHI
        category_id: categoryId,
        project_id: projectId,
        po_id: poId, // <-- Quan trọng: Cột này phải tồn tại trong DB
        description: notes,
        transaction_date: paymentDate.toISOString(),
        payment_method: method,
        created_at: new Date().toISOString()
    }).select();

    if (transError) {
        console.error("LỖI SQL INSERT:", transError); // Xem lỗi chi tiết ở Terminal
        return { success: false, error: "Lỗi tạo phiếu chi: " + transError.message };
    }

    // B. Kiểm tra công nợ để cập nhật trạng thái PO
    const { data: po } = await supabase.from("purchase_orders").select("total_amount").eq("id", poId).single();

    const { data: transactions } = await supabase.from("finance_transactions").select("amount").eq("po_id", poId);
    const totalPaid = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

    console.log(`Tổng đơn: ${po?.total_amount} - Đã trả: ${totalPaid}`);

    // Nếu đã trả đủ (hoặc dư) -> Đổi trạng thái thành Completed
    if (po && totalPaid >= po.total_amount - 1000) {
        await supabase.from("purchase_orders").update({ status: 'completed' }).eq("id", poId);
    }

    revalidatePath(`/procurement/orders/${poId}`);
    revalidatePath("/finance");

    return { success: true, message: "Đã lập phiếu chi thành công!" };
}

// ==========================================
// [MỚI] LOGIC XỬ LÝ YÊU CẦU -> PO (SPLIT PO)
// ==========================================

// 1. Lấy danh sách Yêu cầu vật tư cần xử lý (Pending/Approved) của Dự án
export async function getProjectProcurementRequests(projectId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('material_requests')
        .select(`*, items:material_request_items(*), requester:requester_id(name)`) // requester link user_profiles
        .eq('project_id', projectId)
        .in('status', ['approved', 'processing']) // Chỉ lấy đơn đã duyệt hoặc đang xử lý dở
        .order('created_at', { ascending: false });

    if (error) return [];
    return data || [];
}

// 2. Tính toán trạng thái từng món trong Yêu cầu (Đã đặt bao nhiêu / Còn lại bao nhiêu)
export async function getRequestItemsWithStatus(requestId: string) {
    const supabase = await createClient();

    // A. Lấy items gốc của Request
    const { data: requestItems } = await supabase
        .from('material_request_items')
        .select('*')
        .eq('request_id', requestId);

    if (!requestItems) return [];

    // B. Lấy các PO Items đã tạo từ Request này
    const { data: existingPos } = await supabase
        .from('purchase_orders')
        .select('id, items:purchase_order_items(item_name, quantity)')
        .eq('request_id', requestId);

    // C. Tính tổng đã đặt
    const orderedMap = new Map<string, number>();
    existingPos?.forEach(po => {
        po.items.forEach((poItem: any) => {
            const current = orderedMap.get(poItem.item_name) || 0;
            orderedMap.set(poItem.item_name, current + Number(poItem.quantity));
        });
    });

    // D. Merge dữ liệu
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

// 3. Tạo PO từ các món được chọn (Split PO)
export async function getWarehouses() {
    const supabase = await createClient();
    const { data } = await supabase.from('warehouses').select('*').eq('status', 'active');
    return data || [];
}

// [CẬP NHẬT] Tạo PO có chỉ định KHO NHẬP (warehouseId)
export async function createSplitPOAction(
    projectId: string,
    requestId: string,
    supplierId: string,
    warehouseId: string, // <-- THAM SỐ MỚI QUAN TRỌNG
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
        // A. Tạo Header PO
        const code = `PO-${Date.now().toString().slice(-6)}`;

        const { data: po, error: poError } = await supabase
            .from('purchase_orders')
            .insert({
                project_id: projectId,
                request_id: requestId,
                supplier_id: supplierId,

                // ✅ LƯU KHO NHẬN HÀNG VÀO PO
                warehouse_id: warehouseId, // Cần đảm bảo bảng purchase_orders có cột này

                code: code,
                order_date: new Date().toISOString(),
                expected_delivery_date: deliveryDate ? new Date(deliveryDate).toISOString() : null,
                status: 'draft', // ✅ Tạo ở trạng thái Draft để còn sửa/duyệt như quy trình cũ
                total_amount: 0
            })
            .select()
            .single();

        if (poError) throw new Error("Lỗi tạo PO: " + poError.message);

        // B. Tạo PO Items
        const poItemsData = itemsToOrder.map(item => ({
            po_id: po.id,
            item_name: item.item_name,
            unit: item.unit,
            quantity: Number(item.quantity),
            unit_price: 0, // Giá tạm = 0, Kế toán sẽ vào Edit để nhập giá
            vat_rate: 0
        }));

        const { error: itemsError } = await supabase
            .from('purchase_order_items')
            .insert(poItemsData);

        if (itemsError) throw new Error("Lỗi lưu chi tiết: " + itemsError.message);

        // C. Update trạng thái Request -> 'processing'
        await supabase.from('material_requests').update({ status: 'processing' }).eq('id', requestId);

        revalidatePath(`/procurement`);

        // Trả về ID của PO để redirect sang trang Edit
        return { success: true, message: "Đã tạo PO Nháp!", poId: po.id };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
// ==========================================
// [MỚI] CENTRAL PROCUREMENT (XỬ LÝ TRUNG TÂM)
// ==========================================

// 1. Lấy TẤT CẢ yêu cầu đã duyệt từ MỌI dự án
export async function getAllPendingRequests() {
    const supabase = await createClient();

    // Lấy các request có status là 'approved' (đã duyệt) hoặc 'processing' (đang mua dở)
    // Join thêm bảng projects để biết của dự án nào
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

    if (error) {
        console.error("Lỗi getAllPendingRequests:", error);
        return [];
    }
    return data || [];
}

// 2. Hàm thống kê nhanh (Dashboard)
export async function getProcurementStats() {
    const supabase = await createClient();

    // Đếm số lượng request chờ xử lý
    const { count: pendingCount } = await supabase
        .from('material_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

    // Đếm số PO đang chờ hàng
    const { count: orderedCount } = await supabase
        .from('purchase_orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ordered');

    return {
        pendingRequests: pendingCount || 0,
        activePOs: orderedCount || 0
    };
}

// --- 5. LẤY CHI TIẾT REQUEST ĐỂ FILL VÀO FORM PO ---
export async function getMaterialRequestForPO(requestId: string) {
    const supabase = await createClient();

    // 1. Lấy thông tin Header (để biết Project nào)
    const { data: req, error } = await supabase
        .from('material_requests')
        .select('id, project_id, code')
        .eq('id', requestId)
        .single();

    if (error || !req) return null;

    // 2. Lấy danh sách vật tư gốc
    const { data: requestItems } = await supabase
        .from('material_request_items')
        .select('*')
        .eq('request_id', requestId);

    if (!requestItems) return { projectId: req.project_id, items: [] };

    // 3. Tính toán số lượng đã đặt (để trừ ra số còn lại)
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

    // 4. Lọc ra các món chưa mua hết
    const itemsToOrder = requestItems
        .map(item => {
            const ordered = orderedMap.get(item.item_name) || 0;
            const remaining = Math.max(0, Number(item.quantity) - ordered);
            return {
                item_name: item.item_name,
                unit: item.unit,
                quantity: remaining, // Gợi ý số lượng là số còn lại
                unit_price: 0,
                vat_rate: 0
            };
        })
        .filter(item => item.quantity > 0); // Chỉ lấy món còn cần mua

    return {
        projectId: req.project_id,
        items: itemsToOrder
    };
}