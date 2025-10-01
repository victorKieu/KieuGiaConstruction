// app/components/ui/label.ts
export function getStatusLabel(status: string): string {
    switch (status) {
        case "planning":
            return "Đang lập kế hoạch";
        case "in_progress":
            return "Đang thi công";
        case "completed":
            return "Hoàn thành";
        case "paused":
            return "Tạm dừng";
        case "cancelled":
            return "Đã hủy";
        default:
            return "Không xác định";
    }
}
export function getProjectTypeLabel(type: string): string {
    switch (type) {
        case "residential":
            return "Nhà ở dân dụng";
        case "commercial":
            return "Công trình thương mại";
        case "industrial":
            return "Công nghiệp";
        case "infrastructure":
            return "Hạ tầng";
        default:
            return "Không xác định";
    }
}
export function getConstructionTypeLabel(type: string): string {
    switch (type) {
        case "design_build":
            return "Thiết kế & thi công";
        case "general_contract":
            return "Tổng thầu";
        case "turnkey":
            return "Chìa khóa trao tay";
        default:
            return "Không xác định";
    }
}
export default function getRoleLabel(role: string): string {
    switch (role) {
        case "manager":
            return "Quản lý dự án";
        case "supervisor":
            return "Giám sát";
        case "worker":
            return "Nhân viên";
        case "admin":
            return "Quản trị";
        default:
            return "Không xác định";
    }
}