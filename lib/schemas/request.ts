import { z } from "zod";

// Schema cho từng dòng vật tư
export const requestItemSchema = z.object({
    id: z.string().optional(), // Dùng khi edit
    item_name: z.string().min(1, "Tên vật tư là bắt buộc"),
    unit: z.string().min(1, "Thiếu ĐVT"),
    quantity: z.coerce.number().min(0.0001, "Số lượng phải > 0"),
    notes: z.string().optional().nullable(), // DB cho phép null
});

// Schema cho phiếu yêu cầu (Header)
export const materialRequestSchema = z.object({
    id: z.string().optional(),
    code: z.string().min(1, "Mã phiếu bắt buộc"), // Form tự sinh hoặc nhập
    project_id: z.string().uuid("Dự án không hợp lệ"),

    // Kho nhập (cho phép null nếu chưa xác định)
    destination_warehouse_id: z.string().uuid().optional().nullable(),

    deadline_date: z.date({ required_error: "Vui lòng chọn ngày cần hàng" }),

    // Enum khớp với DB hoặc logic business
    priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),

    notes: z.string().optional(),

    // Danh sách items
    items: z.array(requestItemSchema).min(1, "Phải có ít nhất 1 dòng vật tư"),
});

export type MaterialRequestFormValues = z.infer<typeof materialRequestSchema>;