// Định nghĩa danh sách Category chuẩn dùng trong code
export const DICTIONARY_CATEGORIES = {
    // --- CRM ---
    CRM_CUSTOMER_TYPE: "CRM_CUSTOMER_TYPE",
    CRM_CUSTOMER_STATUS: "CRM_CUSTOMER_STATUS",
    CRM_CONTACT_TITLE: "CRM_CONTACT_TITLE",
    CRM_SOURCE: "CRM_SOURCE",

    // --- HRM ---
    HRM_POSITION: "HRM_POSITION",
    HRM_DEPARTMENT: "HRM_DEPARTMENT",

    // --- PROJECT ---
    PROJ_TYPE: "PROJ_TYPE",
    PROJ_STATUS: "PROJ_STATUS",
} as const;

// Hàm helper để convert text thường thành Category Code chuẩn
export function formatCategoryCode(input: string): string {
    return input
        .trim()
        .toUpperCase() // Chuyển thành chữ hoa
        .replace(/\s+/g, '_') // Khoảng trắng thành gạch dưới
        .replace(/[^A-Z0-9_]/g, '') // Bỏ ký tự đặc biệt (chỉ giữ chữ, số, gạch dưới)
        .replace(/_+/g, '_'); // Xóa gạch dưới kép
}