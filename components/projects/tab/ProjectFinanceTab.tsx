import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/utils";
import { FinanceData } from "@/types/project";

// Component hiển thị thông tin tài chính của dự án.
// Chấp nhận prop 'finance' có thể là null nếu dự án chưa có dữ liệu tài chính.
export default function ProjectFinanceTab({ finance }: { finance: FinanceData | null }) {
    // 1. Xử lý trường hợp không có dữ liệu tài chính
    if (!finance) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg font-semibold">Thông tin tài chính</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-500">Chưa có dữ liệu tài chính cho dự án này.</p>
                </CardContent>
            </Card>
        );
    }

    // 2. Xử lý an toàn cho thuộc tính allocation (ngăn lỗi TypeError)
    // Nếu finance.allocation là null/undefined, gán cho nó một đối tượng rỗng
    const allocationData = finance.allocation || {};

    // 3. Khởi tạo dữ liệu phân bổ, sử dụng 0 nếu giá trị bị null/undefined
    const allocation = {
        materials: allocationData.materials ?? 0,
        labor: allocationData.labor ?? 0,
        equipment: allocationData.equipment ?? 0,
        others: allocationData.others ?? 0,
    };

    return (
        <Card className="shadow-lg border-2 border-slate-100 rounded-xl">
            <CardHeader className="bg-slate-50 border-b rounded-t-xl p-4">
                <CardTitle className="text-xl font-bold text-gray-800">Thông tin tài chính</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8 p-6">
                {/* Tổng quan tài chính */}
                <div>
                    <h3 className="text-lg font-semibold mb-3 text-indigo-600 border-b pb-1">Tổng quan ngân sách</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-base">
                        <div className="p-3 bg-blue-50 rounded-lg">
                            <p className="font-medium text-blue-700">Ngân sách dự kiến</p>
                            <p className="text-lg font-bold text-blue-900">{formatCurrency(finance.budget)}</p>
                        </div>
                        <div className="p-3 bg-red-50 rounded-lg">
                            <p className="font-medium text-red-700">Chi phí hiện tại</p>
                            <p className="text-lg font-bold text-red-900">{formatCurrency(finance.spent)}</p>
                        </div>
                        <div
                            // Thay đổi màu sắc dựa trên ngân sách còn lại
                            className={finance.remaining >= 0 ? "p-3 bg-green-50 rounded-lg" : "p-3 bg-yellow-50 rounded-lg"}
                        >
                            <p className="font-medium text-gray-700">Còn lại</p>
                            <p className="text-lg font-bold text-gray-900">{formatCurrency(finance.remaining)}</p>
                        </div>
                    </div>
                </div>

                {/* Phân bổ chi phí */}
                <div>
                    <h3 className="text-lg font-semibold mb-3 text-indigo-600 border-b pb-1">Phân bổ chi phí (%)</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div className="bg-gray-50 p-3 rounded-md">
                            <p className="font-medium text-gray-600">Vật liệu</p>
                            <p className="text-base font-semibold text-gray-800">{allocation.materials}%</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-md">
                            <p className="font-medium text-gray-600">Nhân công</p>
                            <p className="text-base font-semibold text-gray-800">{allocation.labor}%</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-md">
                            <p className="font-medium text-gray-600">Thiết bị</p>
                            <p className="text-base font-semibold text-gray-800">{allocation.equipment}%</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-md">
                            <p className="font-medium text-gray-600">Khác</p>
                            <p className="text-base font-semibold text-gray-800">{allocation.others}%</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
