import { z } from "zod";

export const employeeSchema = z.object({
    // ✅ FIX: Thêm code (optional) để khớp với dữ liệu khi Sửa (Update)
    code: z.string().optional(),

    // Thông tin bắt buộc
    name: z.string().min(2, "Tên phải có ít nhất 2 ký tự"),
    email: z.string().email("Email không hợp lệ"),

    // Thông tin tùy chọn
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    identity_card: z.string().optional().nullable(),

    // ✅ FIX: Lương luôn ép về số, mặc định là 0 nếu rỗng
    basic_salary: z.coerce.number().default(0),

    // Các trường Dropdown (UUID) - Cho phép null/undefined
    gender_id: z.string().optional().nullable(),
    department_id: z.string().optional().nullable(),
    position_id: z.string().optional().nullable(),
    status_id: z.string().optional().nullable(),
    contract_type_id: z.string().optional().nullable(),
    marital_status_id: z.string().optional().nullable(),

    // Ngày tháng
    // ✅ FIX: Cho phép hire_date nhận string (từ JSON) hoặc Date, sau đó chuẩn hóa về Date
    hire_date: z.preprocess((arg) => {
        if (typeof arg === "string" || arg instanceof Date) return new Date(arg);
    }, z.date({ required_error: "Ngày vào làm là bắt buộc" })),

    birth_date: z.preprocess((arg) => {
        if (!arg) return undefined;
        return new Date(arg as string | Date);
    }, z.date().optional().nullable()),

    // Avatar
    avatar_url: z.string().optional().nullable(),
});

// Xuất type trực tiếp từ Zod để đảm bảo đồng bộ 100%
export type EmployeeFormData = z.infer<typeof employeeSchema>;