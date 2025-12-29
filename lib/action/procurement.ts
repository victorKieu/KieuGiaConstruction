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

// Tạo mới Đơn hàng
export async function createPurchaseOrderAction(data: PurchaseOrderFormValues) {
    const supabase = await createClient();

    const validated = purchaseOrderSchema.safeParse(data);
    if (!validated.success) return { success: false, error: "Dữ liệu đơn hàng lỗi" };

    const { items, ...poData } = validated.data;

    // Tính tổng tiền (đã gồm VAT)
    const totalAmount = items.reduce((sum, item) => {
        const preTaxTotal = item.quantity * item.unit_price;
        const vatAmount = preTaxTotal * (item.vat_rate / 100);
        return sum + preTaxTotal + vatAmount;
    }, 0);

    // 1. Tạo Header
    const { data: po, error: poError } = await supabase
        .from("purchase_orders")
        .insert({
            code: poData.code,
            project_id: poData.project_id,
            supplier_id: poData.supplier_id,
            order_date: poData.order_date.toISOString(),
            expected_delivery_date: poData.expected_delivery_date?.toISOString(),
            notes: poData.notes,
            total_amount: totalAmount,
            status: 'ordered',
            created_at: new Date().toISOString(),
        })
        .select("id")
        .single();

    if (poError || !po) {
        return { success: false, error: "Lỗi khi tạo đơn hàng: " + poError?.message };
    }

    // 2. Tạo Items
    const itemsToInsert = items.map(item => ({
        po_id: po.id,
        item_name: item.item_name,
        unit: item.unit,
        quantity: item.quantity,
        unit_price: item.unit_price,
        vat_rate: item.vat_rate
    }));

    const { error: itemsError } = await supabase.from("purchase_order_items").insert(itemsToInsert);

    if (itemsError) {
        await supabase.from("purchase_orders").delete().eq("id", po.id);
        return { success: false, error: "Lỗi khi lưu chi tiết vật tư" };
    }

    revalidatePath("/procurement/orders");
    return { success: true, message: "Tạo đơn mua hàng thành công!" };
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