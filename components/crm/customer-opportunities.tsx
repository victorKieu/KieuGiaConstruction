import Link from "next/link";
import { Plus, DollarSign, Calendar, TrendingUp, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress"; // Cần cài component này từ shadcn
import { getOpportunitiesByCustomerId } from "@/lib/action/opportunity";

// --- TYPES ---
interface Opportunity {
    id: string;
    title: string;
    value: number | null;
    stage: string; // Có thể là code (new, negotiation) hoặc UUID nếu dùng dictionary
    expected_close_date: string | null;
    created_at: string;
}

// --- CONFIG ---
// Map màu sắc + Tỷ lệ thành công (Probability)
const STAGE_CONFIG: Record<string, { label: string; color: string; probability: number }> = {
    new: { label: "Mới", color: "bg-blue-100 text-blue-800 hover:bg-blue-200", probability: 10 },
    qualification: { label: "Đánh giá", color: "bg-purple-100 text-purple-800 hover:bg-purple-200", probability: 30 },
    proposal: { label: "Gửi báo giá", color: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200", probability: 50 },
    negotiation: { label: "Đàm phán", color: "bg-orange-100 text-orange-800 hover:bg-orange-200", probability: 80 },
    closed_won: { label: "Thắng thầu", color: "bg-green-100 text-green-800 hover:bg-green-200", probability: 100 },
    closed_lost: { label: "Thất bại", color: "bg-gray-100 text-gray-800 hover:bg-gray-200", probability: 0 },
};

// Helper format tiền tệ
const formatCurrency = (amount: number | null) => {
    if (!amount) return "0 ₫";
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
};

export async function CustomerOpportunities({ customerId }: { customerId: string }) {
    // Fetch dữ liệu
    const opportunities = await getOpportunitiesByCustomerId(customerId) as Opportunity[];

    if (!opportunities || opportunities.length === 0) {
        return <EmptyOpportunities customerId={customerId} />;
    }

    // Tính tổng giá trị tiềm năng (Pipeline Value)
    const totalValue = opportunities.reduce((sum, item) => {
        // Chỉ cộng những deal chưa đóng (khác closed_lost/won) hoặc tùy logic của bạn
        if (item.stage !== 'closed_lost') {
            return sum + (item.value || 0);
        }
        return sum;
    }, 0);

    return (
        <div className="space-y-4">
            {/* Header thống kê */}
            <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg border">
                <div className="flex items-center gap-2 text-sm">
                    <div className="p-2 bg-primary/10 rounded-full text-primary">
                        <TrendingUp className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs uppercase font-bold">Pipeline</span>
                        <span className="font-bold text-lg text-foreground">{formatCurrency(totalValue)}</span>
                    </div>
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
                    const config = STAGE_CONFIG[opp.stage] || {
                        label: opp.stage,
                        color: "bg-gray-100 text-gray-800",
                        probability: 0
                    };

                    return (
                        <Card key={opp.id} className="group hover:shadow-md transition-all border-l-4" style={{ borderLeftColor: getBorderColor(opp.stage) }}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start gap-2">
                                    <div className="space-y-1">
                                        <CardTitle className="text-sm font-semibold leading-tight">
                                            <Link href={`/crm/opportunities/${opp.id}`} className="hover:text-primary hover:underline decoration-primary decoration-1 underline-offset-2">
                                                {opp.title}
                                            </Link>
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Tạo: {format(new Date(opp.created_at), "dd/MM/yyyy", { locale: vi })}
                                        </CardDescription>
                                    </div>
                                    <Badge variant="secondary" className={`whitespace-nowrap ${config.color} border-0`}>
                                        {config.label}
                                    </Badge>
                                </div>
                            </CardHeader>

                            <CardContent className="pb-3">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-1.5 text-sm font-bold text-green-700">
                                        <DollarSign className="h-4 w-4" />
                                        {formatCurrency(opp.value)}
                                    </div>

                                    {opp.expected_close_date && (
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-gray-50 px-2 py-1 rounded">
                                            <Calendar className="h-3 w-3" />
                                            <span>{format(new Date(opp.expected_close_date), "dd/MM/yyyy")}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Thanh xác suất thành công */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] text-muted-foreground">
                                        <span>Xác suất</span>
                                        <span>{config.probability}%</span>
                                    </div>
                                    <Progress value={config.probability} className="h-1.5" />
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}

// Helper để lấy màu border (Styling trick)
function getBorderColor(stage: string) {
    // Bạn có thể dùng mã màu HEX tương ứng với class Tailwind
    switch (stage) {
        case 'new': return '#3b82f6'; // blue-500
        case 'qualification': return '#a855f7'; // purple-500
        case 'proposal': return '#eab308'; // yellow-500
        case 'negotiation': return '#f97316'; // orange-500
        case 'closed_won': return '#22c55e'; // green-500
        case 'closed_lost': return '#6b7280'; // gray-500
        default: return '#e5e7eb';
    }
}

function EmptyOpportunities({ customerId }: { customerId: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg bg-muted/5">
            <div className="p-3 bg-muted rounded-full mb-3">
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">Chưa có cơ hội kinh doanh</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-xs">
                Khởi tạo cơ hội mới để theo dõi tiến trình chào giá và tăng doanh thu từ khách hàng này.
            </p>
            <Button variant="default" asChild>
                <Link href={`/crm/opportunities/new?customer_id=${customerId}`}>
                    <Plus className="h-4 w-4 mr-2" /> Tạo cơ hội đầu tiên
                </Link>
            </Button>
        </div>
    );
}