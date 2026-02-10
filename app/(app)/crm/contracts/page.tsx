import { getAllContracts } from "@/lib/action/contractActions";
import ContractManager from "@/components/projects/contract/ContractManager";

// Force dynamic để luôn lấy dữ liệu mới nhất khi vào trang
export const dynamic = 'force-dynamic';

export default async function ContractsPage() {
    // 1. Lấy dữ liệu từ Server
    const { data: contracts, error } = await getAllContracts();

    // ✅ FIX: Giao diện lỗi chuẩn Dark Mode (Đồng bộ với ProjectsPage)
    if (error) {
        return (
            <div className="flex w-full h-screen items-center justify-center bg-background">
                <div className="p-6 text-center text-red-600 dark:text-red-400 bg-card rounded-lg shadow border border-red-100 dark:border-red-900/50 max-w-md">
                    <h3 className="font-bold text-lg mb-2">Lỗi tải dữ liệu</h3>
                    <p>{typeof error === 'string' ? error : "Không thể tải danh sách hợp đồng."}</p>
                </div>
            </div>
        );
    }

    return (
        // ✅ FIX: Thêm bg-background và min-h-screen, text-foreground
        <div className="container mx-auto py-8 bg-background min-h-screen">
            {/* text-slate-800 -> text-foreground */}
            <h1 className="text-2xl font-bold mb-6 text-foreground">Hệ thống Quản lý Hợp đồng</h1>

            {/* Truyền dữ liệu sang Client Component để xử lý tương tác */}
            <ContractManager initialContracts={contracts || []} />
        </div>
    );
}