// components/CustomerStatusBadge.tsx

type CustomerStatus = "active" | "inactive" | "lead" | "unknown";

const styles: Record<CustomerStatus, string> = {
    active: "bg-green-100 text-green-800",
    inactive: "bg-gray-100 text-gray-800",
    lead: "bg-yellow-100 text-yellow-800",
    unknown: "bg-gray-100 text-gray-800",
};

const labels: Record<CustomerStatus, string> = {
    active: "Đang hoạt động",
    inactive: "Không hoạt động",
    lead: "Tiềm năng",
    unknown: "Không xác định",
};

export default function CustomerStatusBadge({ status }: { status?: string }) {
    const key = (status?.toLowerCase() as CustomerStatus) ?? "unknown";

    return (
        <span className={`px-2 py-1 rounded text-xs ${styles[key]}`}>
            {labels[key]}
        </span>
    );
}