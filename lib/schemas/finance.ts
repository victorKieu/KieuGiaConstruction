import { z } from "zod";

export const transactionSchema = z.object({
    amount: z.coerce.number().min(1000, "Số tiền tối thiểu là 1.000đ"), // Tự động ép kiểu chuỗi sang số

    type: z.enum(["income", "expense"], {
        required_error: "Vui lòng chọn loại giao dịch",
    }),

    category_id: z.string().min(1, "Vui lòng chọn danh mục"),

    transaction_date: z.date({
        required_error: "Vui lòng chọn ngày",
    }),

    description: z.string().optional(),

    // Các trường liên kết (Optional vì có thể là chi phí chung không gắn dự án)
    project_id: z.string().optional().nullable(),
    customer_id: z.string().optional().nullable(),
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;