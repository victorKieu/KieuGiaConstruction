"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Action Nhập kho
export async function createGoodsReceipt(
    poId: string,
    warehouseId: string,
    deliveryNote: string,
    items: any[],
    notes: string
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!warehouseId) return { success: false, error: "Chưa xác định kho nhập." };

    try {
        // 1. Tạo Header (goods_receipts)
        // Lưu ý: Dùng 'receiver_id' theo đúng schema hiện tại của bạn
        const code = `GR-${Date.now().toString().slice(-6)}`;
        const { data: gr, error: grError } = await supabase
            .from('goods_receipts')
            .insert({
                code: code,
                po_id: poId,
                warehouse_id: warehouseId,
                receiver_id: user?.id, // ✅ Khớp với supabase.ts
                delivery_note_number: deliveryNote,
                notes: notes,
                received_date: new Date().toISOString()
            })
            .select()
            .single();

        if (grError) throw new Error("Lỗi tạo phiếu nhập: " + grError.message);

        // 2. Tạo Items & Update Inventory
        for (const item of items) {
            if (item.quantity_received > 0) {
                // Insert chi tiết nhập
                await supabase.from('goods_receipt_items').insert({
                    receipt_id: gr.id,
                    po_item_id: item.po_item_id,
                    item_name: item.item_name,
                    unit: item.unit,
                    quantity_ordered: item.quantity_ordered,
                    quantity_received: item.quantity_received,
                    notes: item.note
                });

                // Upsert Inventory (Cập nhật tồn kho)
                const { data: existItem } = await supabase
                    .from('inventory')
                    .select('id, quantity')
                    .eq('warehouse_id', warehouseId)
                    .eq('item_name', item.item_name)
                    .single();

                if (existItem) {
                    await supabase.from('inventory').update({
                        quantity: Number(existItem.quantity) + Number(item.quantity_received),
                        last_updated: new Date().toISOString()
                    }).eq('id', existItem.id);
                } else {
                    await supabase.from('inventory').insert({
                        warehouse_id: warehouseId,
                        item_name: item.item_name,
                        unit: item.unit,
                        quantity: item.quantity_received
                    });
                }
            }
        }

        // 3. Cập nhật trạng thái PO
        await supabase
            .from('purchase_orders')
            .update({ status: 'received' })
            .eq('id', poId);

        revalidatePath(`/procurement/orders/${poId}`);
        return { success: true, message: "Đã nhập kho thành công!" };

    } catch (e: any) {
        console.error(e);
        return { success: false, error: e.message };
    }
}