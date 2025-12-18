import { z } from "zod";

export const contractSchema = z.object({
    contract_number: z.string().min(1, "Mã hợp đồng không được để trống"),
    title: z.string().min(5, "Tên gói thầu phải có ít nhất 5 ký tự"),
    customer_id: z.string().min(1, "Vui lòng chọn khách hàng"),

    // z.coerce giúp chuyển đổi string từ input type="number" sang number an toàn
    value: z.coerce.number().min(0, "Giá trị hợp đồng không hợp lệ"),
    content: z.string().optional(), // Nội dung hợp đồng chi tiết
    signed_date: z.date({ required_error: "Vui lòng chọn ngày ký" }),
    start_date: z.date().optional(),
    end_date: z.date().optional(),

    status: z.enum(["draft", "signed", "processing", "warranty", "liquidated", "cancelled"]),

    // Link file (tạm thời optional, sau này làm upload sẽ update)
    file_url: z.string().optional(),
});

export type ContractFormValues = z.infer<typeof contractSchema>;