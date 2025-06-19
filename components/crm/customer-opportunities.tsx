"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import supabase from '@/lib/supabase/client';
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { ArrowRight, Briefcase } from "lucide-react";

interface Opportunity {
    id: string;
    title: string;
    description: string;
    stage: string;
    estimated_value: number;
    probability: number;
    expected_close_date: string;
    created_at: string;
}

interface CustomerOpportunitiesProps {
    customerId: string;
}

const stageLabels: Record<string, string> = {
    lead: "Tiềm năng",
    qualified: "Đủ điều kiện",
    proposal: "Đề xuất",
    negotiation: "Đàm phán",
    closed_won: "Thành công",
    closed_lost: "Thất bại",
};

const stageColors: Record<string, string> = {
    lead: "bg-blue-100 text-blue-800",
    qualified: "bg-indigo-100 text-indigo-800",
    proposal: "bg-purple-100 text-purple-800",
    negotiation: "bg-amber-100 text-amber-800",
    closed_won: "bg-green-100 text-green-800",
    closed_lost: "bg-red-100 text-red-800",
};

export function CustomerOpportunities({ customerId }: CustomerOpportunitiesProps) {
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchOpportunities() {
            setIsLoading(true); // Đặt loading là true khi bắt đầu fetch

            try {
                const { data, error } = await supabase
                    .from("opportunities")
                    .select("*")
                    .eq("customer_id", customerId)
                    .order("created_at", { ascending: false });

                if (error) {
                    console.error("Lỗi khi lấy cơ hội:", error.message);
                    throw new Error(error.message); // Ném lỗi để dừng quá trình
                }

                setOpportunities(data || []);
            } catch (error) {
                console.error("Error fetching customer opportunities:", error);
            } finally {
                setIsLoading(false); // Đặt loading là false khi hoàn thành
            }
        }

        fetchOpportunities();
    }, [customerId]);

    if (isLoading) {
        return (
            <div className="space-y-4">
                {Array(2)
                    .fill(0)
                    .map((_, i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader className="h-16 bg-muted/20"></CardHeader>
                            <CardContent className="h-24 bg-muted/10"></CardContent>
                        </Card>
                    ))}
            </div>
        );
    }

    if (opportunities.length === 0) {
        return (
            <Card>
                <CardContent className="text-center py-10">
                    <p className="text-muted-foreground mb-4">Chưa có cơ hội bán hàng nào với khách hàng này</p>
                    <Button>Thêm cơ hội mới</Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {opportunities.map((opportunity) => {
                const stageLabel = stageLabels[opportunity.stage] || opportunity.stage;
                const stageColor = stageColors[opportunity.stage] || "bg-gray-100 text-gray-800";
                const isClosed = opportunity.stage === "closed_won" || opportunity.stage === "closed_lost";

                return (
                    <Card key={opportunity.id}>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                                    <CardTitle className="text-base">{opportunity.title}</CardTitle>
                                </div>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${stageColor}`}>
                                    {stageLabel}
                                </span>
                            </div>
                            <p className="text-xs">
                                Ngày dự kiến: {format(new Date(opportunity.expected_close_date), "PPP", { locale: vi })}
                            </p>
                        </CardHeader>
                        <CardContent className="pb-2 space-y-3">
                            <p className="text-sm">{opportunity.description}</p>
                            <div className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                    <span>Xác suất thành công</span>
                                    <span className="font-medium">{opportunity.probability}%</span>
                                </div>
                                <Progress value={opportunity.probability} className="h-2" />
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Giá trị dự kiến:</span>
                                <span className="font-medium">
                                    {new Intl.NumberFormat("vi-VN", {
                                        style: "currency",
                                        currency: "VND",
                                        maximumFractionDigits: 0,
                                    }).format(opportunity.estimated_value)}
                                </span>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-2 flex justify-between">
                            <span className="text-xs text-muted-foreground">
                                Tạo lúc: {format(new Date(opportunity.created_at), "PPp", { locale: vi })}
                            </span>
                            <Button size="sm" variant="outline" className="h-7 gap-1" disabled={isClosed}>
                                {isClosed ? (
                                    "Đã đóng"
                                ) : (
                                    <>
                                        Cập nhật <ArrowRight className="h-3 w-3" />
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                );
            })}
            <div className="flex justify-center">
                <Button>Thêm cơ hội mới</Button>
            </div>
        </div>
    );
}