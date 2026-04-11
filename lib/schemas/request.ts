import { z } from "zod";

export const materialRequestSchema = z.object({
    id: z.string().optional(),
    project_id: z.string().min(1, "Dự án là bắt buộc"),
    code: z.string().min(1, "Mã phiếu là bắt buộc"),

    // ✅ Dùng 'destination_warehouse_id' (Kho nhận)
    destination_warehouse_id: z.string().optional().nullable(),

    // 🚀 FIX 1: Đổi "medium" thành "normal" để qua mặt Database Check Constraint
    priority: z.enum(["low", "normal", "high", "urgent"], {
        required_error: "Vui lòng chọn mức độ ưu tiên",
    }),

    // ✅ Dùng 'deadline_date' (Ngày cần hàng)
    deadline_date: z.date({
        required_error: "Vui lòng chọn ngày cần hàng",
        invalid_type_error: "Ngày không hợp lệ",
    }),

    // ✅ Dùng 'notes' (Ghi chú chung)
    notes: z.string().optional().nullable(),

    items: z.array(z.object({
        id: z.string().optional(),

        // ✅ Dùng 'item_name'
        item_name: z.string().min(1, "Tên vật tư là bắt buộc"),

        // 🚀 FIX 2: Khai báo thêm item_category để Zod cho phép dữ liệu này lọt qua
        item_category: z.enum(["material", "asset"]).default("material"),

        unit: z.string().min(1, "ĐVT là bắt buộc"),

        // Ép kiểu (coerce) cực kỳ tốt để chống lỗi gõ chữ vào ô số
        quantity: z.coerce.number().min(0.0001, "Số lượng phải lớn hơn 0"),

        // ✅ Dùng 'notes' (Ghi chú chi tiết)
        notes: z.string().optional().nullable()
    })).min(1, "Cần ít nhất 1 dòng vật tư")
});

export type MaterialRequestFormValues = z.infer<typeof materialRequestSchema>;