import { z } from "zod";

export const activitySchema = z.object({
    title: z.string().min(1, "Vui lòng nhập tiêu đề hoạt động."),

    description: z.string().optional(),

    // --- SỬA LẠI DÒNG NÀY ---
    // Tên key PHẢI LÀ "activity_type" (để khớp với input form và cột database)
    activity_type: z.enum(["call", "meeting", "task", "email"], {
        errorMap: () => ({ message: "Vui lòng chọn loại hoạt động." }),
    }),
    // -------------------------

    customer_id: z.string().min(1, "Vui lòng chọn khách hàng."),

    scheduled_at: z.date({
        required_error: "Vui lòng chọn ngày thực hiện.",
        invalid_type_error: "Định dạng ngày không hợp lệ.",
    }),
});

export type ActivityFormValues = z.infer<typeof activitySchema>;