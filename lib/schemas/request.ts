import { z } from "zod";

export const materialRequestSchema = z.object({
    id: z.string().optional(),
    project_id: z.string().min(1, "Dự án là bắt buộc"),
    code: z.string().min(1, "Mã phiếu là bắt buộc"),

    // ✅ Dùng 'destination_warehouse_id' (Kho nhận)
    destination_warehouse_id: z.string().optional().nullable(),

    priority: z.enum(["low", "medium", "high", "urgent"], {
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
        unit: z.string().min(1, "ĐVT là bắt buộc"),
        quantity: z.coerce.number().min(0.0001, "Số lượng phải lớn hơn 0"),
        // ✅ Dùng 'notes' (Ghi chú chi tiết)
        notes: z.string().optional().nullable()
    })).min(1, "Cần ít nhất 1 dòng vật tư")
});

export type MaterialRequestFormValues = z.infer<typeof materialRequestSchema>;