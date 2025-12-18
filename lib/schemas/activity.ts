import { z } from "zod";

export const activitySchema = z.object({
    title: z.string().min(1, { message: "Tiêu đề không được để trống" }),
    activity_type: z.enum(["call", "meeting", "task", "email"], {
        required_error: "Vui lòng chọn loại hoạt động",
    }),
    description: z.string().optional(),
    scheduled_at: z.date({
        required_error: "Vui lòng chọn thời gian",
    }),
    // Trong thực tế, bạn sẽ cần validate customer_id tồn tại, 
    // tạm thời check string non-empty
    customer_id: z.string().min(1, { message: "Vui lòng chọn khách hàng" }),
});

export type ActivityFormValues = z.infer<typeof activitySchema>;