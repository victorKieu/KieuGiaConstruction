import Link from "next/link";
import { Plus, DollarSign, Calendar, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getOpportunitiesByCustomerId } from "@/lib/action/opportunity";

// Helper format tiền tệ VNĐ
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
};

// Map màu sắc cho các giai đoạn (Stages)
const STAGE_CONFIG: Record<string, { label: string; color: string }> = {
    new: { label: "Mới", color: "bg-blue-100 text-blue-800" },
    qualification: { label: "Đánh giá", color: "bg-purple-100 text-purple-800" },
    proposal: { label: "Gửi báo giá", color: "bg-yellow-100 text-yellow-800" },
    negotiation: { label: "Đàm phán", color: "bg-orange-100 text-orange-800" },
    closed_won: { label: "Thắng thầu", color: "bg-green-100 text-green-800" },
    closed_lost: { label: "Thất bại", color: "bg-gray-100 text-gray-800" },
};

export async function CustomerOpportunities({ customerId }: { customerId: string }) {
    // Fetch dữ liệu trực tiếp trong Server Component
    const opportunities = await getOpportunitiesByCustomerId(customerId);

    if (!opportunities || opportunities.length === 0) {
        return <EmptyOpportunities customerId={customerId} />;
    }

    // Tính tổng giá trị tiềm năng
    const totalValue = opportunities.reduce((sum, item) => sum + (item.value || 0), 0);

    return (
        <div className="space-y-4">
            {/* Header nhỏ thống kê */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    <span>Tổng giá trị tiềm năng: <span className="font-bold text-foreground">{formatCurrency(totalValue)}</span></span>
                </div>
                <Button size="sm" asChild>
                    <Link href={`/crm/opportunities/new?customer_id=${customerId}`}>
                        <Plus className="h-4 w-4 mr-1" /> Thêm cơ hội
                    </Link>
                </Button>
            </div>

            {/* Danh sách thẻ */}
            <div className="grid gap-4 md:grid-cols-2">
                {opportunities.map((opp) => {
                    const stage = STAGE_CONFIG[opp.stage] || { label: opp.stage, color: "bg-gray-100" };

                    return (
                        <Card key={opp.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-base font-semibold">
                                            <Link href={`/crm/opportunities/${opp.id}`} className="hover:underline">
                                                {opp.title}
                                            </Link>
                                        </CardTitle>
                                        <CardDescription className="text-xs mt-1">
                                            Tạo ngày: {format(new Date(opp.created_at), "dd/MM/yyyy", { locale: vi })}
                                        </CardDescription>
                                    </div>
                                    <Badge variant="secondary" className={stage.color}>
                                        {stage.label}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between mt-2">
                                    <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                                        <DollarSign className="h-4 w-4" />
                                        {formatCurrency(opp.value)}
                                    </div>
                                    {opp.expected_close_date && (
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Calendar className="h-3 w-3" />
                                            <span>Chốt: {format(new Date(opp.expected_close_date), "dd/MM/yy")}</span>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}

function EmptyOpportunities({ customerId }: { customerId: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed rounded-lg bg-muted/10">
            <TrendingUp className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="text-lg font-medium">Chưa có cơ hội bán hàng</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-xs">
                Tạo cơ hội mới để theo dõi tiến trình chào giá và chốt hợp đồng với khách hàng này.
            </p>
            <Button variant="outline" asChild>
                <Link href={`/crm/opportunities/new?customer_id=${customerId}`}>
                    <Plus className="h-4 w-4 mr-2" /> Tạo cơ hội đầu tiên
                </Link>
            </Button>
        </div>
    );
}