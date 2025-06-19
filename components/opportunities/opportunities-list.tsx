"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import supabase from '@/lib/supabase/client'; // Import createClientComponentClient

interface Opportunity {
    id: string;
    title: string;
    description: string;
    stage: string;
    estimated_value: number;
    probability: number;
    expected_close_date: string;
    created_at: string;
    customer_id: string | null; // Loại bỏ customers và chỉ giữ customer_id
}

interface OpportunitiesListProps {
    status?: string;
}

export function OpportunitiesList({ status }: OpportunitiesListProps) {
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchOpportunities() {
            setLoading(true);
            setError(null);

            try {
                
                let query = supabase.from("opportunities").select(`
                    id, 
                    title, 
                    description, 
                    stage, 
                    estimated_value, 
                    probability, 
                    expected_close_date, 
                    created_at,
                    customer_id
                `);

                if (status === "open") {
                    query = query.not("stage", "in", '("closed_won","closed_lost")');
                } else if (status) {
                    query = query.eq("stage", status);
                }

                const { data: opportunitiesData, error } = await query.order("created_at", { ascending: false });

                if (error) {
                    console.error("Error fetching opportunities:", error);
                    setError("Đã xảy ra lỗi khi tải dữ liệu");
                } else {
                    setOpportunities(opportunitiesData || []);
                }
            } catch (error: any) {
                console.error("Unexpected error fetching opportunities:", error);
                setError("Đã xảy ra lỗi không xác định");
            } finally {
                setLoading(false);
            }
        }

        fetchOpportunities();
    }, [status]);

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

    if (loading) {
        return <div>Đang tải...</div>;
    }

    if (error) {
        return <div className="text-red-500">{error}</div>;
    }

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {opportunities.map((opportunity) => {
                const stageLabel = stageLabels[opportunity.stage] || opportunity.stage;
                const stageColor = stageColors[opportunity.stage] || "bg-gray-100 text-gray-800";
                const isClosed = opportunity.stage === "closed_won" || opportunity.stage === "closed_lost";

                return (
                    <Card key={opportunity.id}>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">{opportunity.title}</CardTitle>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${stageColor}`}>
                                    {stageLabel}
                                </span>
                            </div>
                            <CardDescription className="flex justify-between items-center">
                                <span>{opportunity.customer_id || "Khách hàng không xác định"}</span>
                                <span>{format(new Date(opportunity.expected_close_date), "dd/MM/yyyy", { locale: vi })}</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pb-2 space-y-3">
                            <p className="text-sm line-clamp-2">{opportunity.description}</p>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Giá trị</p>
                                    <p className="font-medium">
                                        {new Intl.NumberFormat("vi-VN", {
                                            style: "currency",
                                            currency: "VND",
                                            maximumFractionDigits: 0,
                                        }).format(opportunity.estimated_value)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Xác suất</p>
                                    <p className="font-medium">{opportunity.probability}%</p>
                                </div>
                            </div>
                        </CardContent>
                        <CardContent className="pt-0 pb-2">
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${opportunity.stage === "closed_won"
                                        ? "bg-green-500"
                                        : opportunity.stage === "closed_lost"
                                            ? "bg-red-500"
                                            : "bg-blue-500"
                                        }`}
                                    style={{ width: `${opportunity.probability}%` }}
                                />
                            </div>
                        </CardContent>
                        <CardContent className="pt-0 pb-2 flex justify-between text-xs text-muted-foreground">
                            <span>Tạo lúc: {format(new Date(opportunity.created_at), "PPp", { locale: vi })}</span>
                        </CardContent>
                        <CardFooter className="pt-0 pb-4 flex justify-end">
                            <Button variant="outline" size="sm" className="gap-1" asChild>
                                <Link href={`/crm/opportunities/${opportunity.id}`}>
                                    Chi tiết <ArrowRight className="h-3 w-3" />
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                );
            })}
        </div>
    );
}