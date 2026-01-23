import { z } from "zod";

export const materialRequestSchema = z.object({
    id: z.string().optional(),
    project_id: z.string().min(1, "Dự án là bắt buộc"),
    code: z.string().min(1, "Mã phiếu là bắt buộc"),
    // priority: Bắt buộc chọn 1 trong các giá trị enum
    priority: z.enum(["low", "medium", "high", "urgent"], {
        required_error: "Vui lòng chọn mức độ ưu tiên",
    }),
    // deadline_date: Bắt buộc phải là Date
    deadline_date: z.date({
        required_error: "Vui lòng chọn ngày cần hàng",
        invalid_type_error: "Ngày không hợp lệ",
    }),
    notes: z.string().optional().nullable(), // Cho phép null hoặc undefined
    items: z.array(z.object({
        id: z.string().optional(), // ID của item (nếu sửa)
        item_name: z.string().min(1, "Tên vật tư là bắt buộc"),
        unit: z.string().min(1, "ĐVT là bắt buộc"),
        quantity: z.coerce.number().min(0.0001, "Số lượng phải lớn hơn 0"), // Dùng coerce để auto chuyển string -> number
        notes: z.string().optional().nullable()
    })).min(1, "Cần ít nhất 1 dòng vật tư")
});

// Tự động suy diễn Type từ Schema để đảm bảo khớp 100%
export type MaterialRequestFormValues = z.infer<typeof materialRequestSchema>;