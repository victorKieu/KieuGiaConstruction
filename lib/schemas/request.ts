import { z } from "zod";

export const requestItemSchema = z.object({
    item_name: z.string().min(1, "Tên vật tư là bắt buộc"),
    unit: z.string().min(1, "Thiếu ĐVT"),
    quantity: z.coerce.number().min(0.1, "Số lượng phải lớn hơn 0"),
    notes: z.string().optional(),
});

export const materialRequestSchema = z.object({
    code: z.string().min(1, "Mã phiếu thiếu"),
    project_id: z.string().min(1, "Phải chọn dự án"),

    // 👇 THÊM TRƯỜNG KHO NHẬP
    destination_warehouse_id: z.string().min(1, "Phải chọn kho nhập hàng"),

    deadline_date: z.date({ required_error: "Vui lòng chọn ngày cần hàng" }),
    priority: z.enum(["normal", "urgent"]),
    notes: z.string().optional(),
    items: z.array(requestItemSchema).min(1, "Phải có ít nhất 1 vật tư"),
});

export type MaterialRequestFormValues = z.infer<typeof materialRequestSchema>;