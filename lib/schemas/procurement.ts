import { z } from "zod";

// 1. Schema Nhà cung cấp
export const supplierSchema = z.object({
    name: z.string().min(1, "Tên nhà cung cấp là bắt buộc"),
    type: z.string().min(1, "Vui lòng phân loại NCC"),

    tax_code: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
    address: z.string().optional(),
    contact_person: z.string().optional(),
    bank_account: z.string().optional(),
    bank_name: z.string().optional(),
});

// 2. Schema Item (SỬA LẠI CHỖ NÀY)
export const poItemSchema = z.object({
    item_name: z.string().min(1, "Tên vật tư thiếu"),
    unit: z.string().min(1, "Thiếu ĐVT"),
    quantity: z.coerce.number().min(0.1, "SL phải > 0"),

    // Luôn là GIÁ TRƯỚC THUẾ
    unit_price: z.coerce.number().min(0, "Giá không âm"),

    // 👇 SỬA LỖI TS2322: Xóa .default(0) đi
    // Để TypeScript hiểu đây là trường BẮT BUỘC (number), khớp với defaultValues trong Form
    vat_rate: z.coerce.number().min(0),
});

// 3. Schema PO
export const purchaseOrderSchema = z.object({
    code: z.string().min(1, "Mã đơn hàng là bắt buộc"),
    project_id: z.string().min(1, "Phải chọn dự án"),
    supplier_id: z.string().min(1, "Phải chọn nhà cung cấp"),
    order_date: z.date(),
    expected_delivery_date: z.date().optional(),
    notes: z.string().optional(),
    items: z.array(poItemSchema).min(1, "Phải có ít nhất 1 vật tư"),
});

export type SupplierFormValues = z.infer<typeof supplierSchema>;
export type PurchaseOrderFormValues = z.infer<typeof purchaseOrderSchema>;