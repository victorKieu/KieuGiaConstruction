import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/utils";

interface Finance {
    budget: number;
    spent: number;
    remaining: number;
    allocation?: {
        materials?: number;
        labor?: number;
        equipment?: number;
        others?: number;
    };
}

export default function ProjectFinanceTab({ finance }: { finance: Finance | null }) {
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

    const allocation = {
        materials: finance.allocation?.materials ?? 0,
        labor: finance.allocation?.labor ?? 0,
        equipment: finance.allocation?.equipment ?? 0,
        others: finance.allocation?.others ?? 0,
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg font-semibold">Thông tin tài chính</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Tổng quan tài chính */}
                <div>
                    <h3 className="text-sm font-semibold mb-2">Tổng quan tài chính</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                            <p className="font-medium">Ngân sách</p>
                            <p>{formatCurrency(finance.budget)}</p>
                        </div>
                        <div>
                            <p className="font-medium">Chi phí hiện tại</p>
                            <p>{formatCurrency(finance.spent)}</p>
                        </div>
                        <div>
                            <p className="font-medium">Còn lại</p>
                            <p>{formatCurrency(finance.remaining)}</p>
                        </div>
                    </div>
                </div>

                {/* Phân bổ chi phí */}
                <div>
                    <h3 className="text-sm font-semibold mb-2">Phân bổ chi phí</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <p>Vật liệu</p>
                            <p>{allocation.materials}%</p>
                        </div>
                        <div>
                            <p>Nhân công</p>
                            <p>{allocation.labor}%</p>
                        </div>
                        <div>
                            <p>Thiết bị</p>
                            <p>{allocation.equipment}%</p>
                        </div>
                        <div>
                            <p>Khác</p>
                            <p>{allocation.others}%</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}