import Link from "next/link";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { MoreHorizontal, Plus, DollarSign, Calendar } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getAllOpportunities } from "@/lib/action/opportunity";

// Định nghĩa các cột (Stages) chuẩn
const PIPELINE_STAGES = [
    { id: "new", label: "Mới", color: "bg-blue-500" },
    { id: "qualification", label: "Đánh giá", color: "bg-purple-500" },
    { id: "proposal", label: "Gửi báo giá", color: "bg-yellow-500" },
    { id: "negotiation", label: "Đàm phán", color: "bg-orange-500" },
    { id: "closed_won", label: "Thắng thầu", color: "bg-green-500" },
    { id: "closed_lost", label: "Thất bại", color: "bg-gray-500" },
];

export async function PipelineBoard() {
    // 1. Fetch dữ liệu
    const opportunities = await getAllOpportunities();

    // 2. Nhóm dữ liệu theo Stage
    const groupedData: Record<string, any[]> = {};

    // Khởi tạo mảng rỗng cho tất cả stage để cột nào cũng hiện (kể cả không có dữ liệu)
    PIPELINE_STAGES.forEach(stage => groupedData[stage.id] = []);

    opportunities.forEach((opp) => {
        if (groupedData[opp.stage]) {
            groupedData[opp.stage].push(opp);
        } else {
            // Handle trường hợp dữ liệu rác (stage không tồn tại trong config)
            if (!groupedData["new"]) groupedData["new"] = [];
            groupedData["new"].push(opp);
        }
    });

    // Helper format tiền
    const formatMoney = (val: number) =>
        new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(val);

    return (
        <div className="flex h-[calc(100vh-220px)] overflow-x-auto pb-4 gap-4">
            {PIPELINE_STAGES.map((stage) => {
                const items = groupedData[stage.id];
                const totalValue = items.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

                return (
                    <div key={stage.id} className="min-w-[300px] flex flex-col h-full bg-muted/30 rounded-lg border p-2">
                        {/* Column Header */}
                        <div className="flex items-center justify-between p-2 mb-2">
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                                <h3 className="font-semibold text-sm uppercase">{stage.label}</h3>
                                <span className="text-xs text-muted-foreground font-medium px-2 py-0.5 bg-background rounded-full border">
                                    {items.length}
                                </span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Total Value Summary */}
                        {totalValue > 0 && (
                            <div className="px-2 pb-2 text-xs text-muted-foreground font-medium mb-1">
                                Tổng: <span className="text-foreground">{formatMoney(totalValue)}</span>
                            </div>
                        )}

                        {/* Scroll Area chứa Cards */}
                        <ScrollArea className="flex-1 px-1">
                            <div className="flex flex-col gap-3 pb-2">
                                {items.map((opp) => (
                                    <Card key={opp.id} className="cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors shadow-sm">
                                        <CardHeader className="p-3 pb-0 space-y-0">
                                            <div className="flex justify-between items-start gap-2">
                                                <Link href={`/crm/opportunities/${opp.id}`} className="text-sm font-semibold hover:underline line-clamp-2 leading-tight">
                                                    {opp.title}
                                                </Link>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-3 pt-2">
                                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                                                {/* Customer Info */}
                                                <div className="flex items-center gap-1.5">
                                                    <Avatar className="h-4 w-4">
                                                        <AvatarFallback className="text-[9px]">
                                                            {opp.customers?.name?.substring(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="truncate max-w-[100px]">{opp.customers?.name}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1 text-sm font-bold text-green-700">
                                                    <DollarSign className="h-3 w-3" />
                                                    {formatMoney(opp.value)}
                                                </div>
                                                {opp.expected_close_date && (
                                                    <div className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${new Date(opp.expected_close_date) < new Date() ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                                                        }`}>
                                                        <Calendar className="h-3 w-3" />
                                                        {format(new Date(opp.expected_close_date), "dd/MM")}
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}

                                {/* Empty State cho cột */}
                                {items.length === 0 && (
                                    <div className="h-24 border-2 border-dashed rounded-md flex items-center justify-center text-muted-foreground text-xs bg-muted/10">
                                        Trống
                                    </div>
                                )}
                            </div>
                        </ScrollArea>

                        {/* Quick Add Button */}
                        <Button variant="ghost" className="w-full justify-start text-muted-foreground text-xs mt-1 hover:text-primary">
                            <Plus className="h-3 w-3 mr-2" /> Thêm nhanh
                        </Button>
                    </div>
                );
            })}
        </div>
    );
}