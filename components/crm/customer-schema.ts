import { z } from "zod";

// --- SCHEMA DEFINITIONS ---

// Helper: Chuyển chuỗi rỗng hoặc undefined thành NULL (để lưu vào DB)
const zOptionalString = z.string().optional().transform(val => {
    if (val === undefined || val === "") return null;
    return val;
});

// Helper: Email cũng chuyển thành NULL nếu rỗng
const zEmailOrNull = z
    .string()
    .email({ message: "Email không hợp lệ." })
    .or(z.literal(""))
    .optional()
    .transform(val => (val === "" || val === undefined ? null : val));

// Zod Schema
export const customerFormSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, { message: "Tên khách hàng không được để trống." }),
    code: z.string().optional(),
    type: z.enum(["individual", "company", "agency"], {
        required_error: "Vui lòng chọn loại khách hàng.",
    }),

    email: zEmailOrNull,
    phone: zOptionalString,
    address: zOptionalString,
    contactPerson: zOptionalString,
    taxCode: zOptionalString,
    birthday: zOptionalString,
    notes: zOptionalString,
    // Source có thể là UUID hoặc các giá trị string đặc biệt như "other"
    source: z.string().optional().transform(val => val || "other"),
    avatarUrl: zOptionalString,

    gender: z.enum(["male", "female", "other"]).default("other"),
    status: z.enum(["active", "inactive", "lead"]).default("active"),
    tag: zOptionalString,
    ownerId: zOptionalString,
}).refine((data) => data.email !== null || data.phone !== null, {
    message: "Phải cung cấp ít nhất một phương thức liên hệ (Email hoặc Số điện thoại).",
    path: ["email"],
});

export type CustomerFormData = z.infer<typeof customerFormSchema>;

// --- INTERFACES ---

// Interface Dữ liệu thô từ DB (Cho phép NULL để khớp với Supabase)
export interface RawCustomerDataFromDB {
    id?: string;
    name: string;
    code?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    contact_person?: string | null;
    tax_code?: string | null;
    notes?: string | null; // DB dùng 'notes'
    avatar_url?: string | null;
    birthday?: string | null;
    gender?: "other" | "male" | "female" | null;
    owner_id?: string | null;
    source_id?: string | null; // DB dùng 'source_id'
    source?: string | null;
    status?: "active" | "inactive" | "lead" | null;
    type?: "individual" | "company" | "agency" | null;
    tag_id?: string | null;
    created_at?: string;
    updated_at?: string;
}

// --- HELPER FUNCTIONS ---

// Hàm mapping: Chuyển NULL từ DB thành "" cho Form
export const mapRawDataToFormData = (rawData: RawCustomerDataFromDB): CustomerFormData => {
    return {
        id: rawData.id,
        name: rawData.name,
        code: rawData.code ?? "",
        type: rawData.type ?? "individual",
        contactPerson: rawData.contact_person ?? "",
        email: rawData.email ?? "",
        phone: rawData.phone ?? "",
        address: rawData.address ?? "",
        taxCode: rawData.tax_code ?? "",
        birthday: rawData.birthday ?? "",
        gender: rawData.gender ?? "other",
        status: rawData.status ?? "active",
        tag: rawData.tag_id ?? "",
        ownerId: rawData.owner_id ?? "",
        notes: rawData.notes ?? "",
        // Ưu tiên source_id, fallback về "other"
        source: rawData.source_id || "other",
        avatarUrl: rawData.avatar_url ?? "",
    };
};