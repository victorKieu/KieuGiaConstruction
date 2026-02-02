import { getAllContracts } from "@/lib/action/contractActions";
import ContractManager from "@/components/projects/contract/ContractManager";

// Force dynamic để luôn lấy dữ liệu mới nhất khi vào trang
export const dynamic = 'force-dynamic';

export default async function ContractsPage() {
    // 1. Lấy dữ liệu từ Server (đã fix lỗi relationship ở bước trước)
    const { data: contracts, error } = await getAllContracts();

    if (error) {
        return <div className="p-10 text-center text-red-500">Lỗi tải dữ liệu: {error}</div>;
    }

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-2xl font-bold mb-6 text-slate-800">Hệ thống Quản lý Hợp đồng</h1>

            {/* Truyền dữ liệu sang Client Component để xử lý tương tác */}
            <ContractManager initialContracts={contracts || []} />
        </div>
    );
}