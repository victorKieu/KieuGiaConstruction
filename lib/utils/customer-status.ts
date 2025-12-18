export const CUSTOMER_STATUS_MAP: Record<string, { label: string; color: string }> = {
    active: { label: "Đang hoạt động", color: "bg-green-100 text-green-800" },
    inactive: { label: "Không hoạt động", color: "bg-gray-100 text-gray-800" },
    lead: { label: "Tiềm năng", color: "bg-yellow-100 text-yellow-800" },
};

export const getCustomerStatusConfig = (status: string | null) => {
    const normalizedStatus = status?.toLowerCase() || "unknown";
    return CUSTOMER_STATUS_MAP[normalizedStatus] || { label: "Không xác định", color: "bg-gray-100 text-gray-800" };
};

export const getInitials = (name: string | null) => {
    return name
        ? name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2)
        : "N/A";
}