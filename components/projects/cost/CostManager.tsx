"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { ListChecks, Calculator, Boxes } from "lucide-react"; // Import thêm Boxes

import QTOClient from "@/components/projects/qto/QTOClient";
import ProjectEstimationTab from "@/components/projects/tab/ProjectEstimationTab";
import BudgetTable from "./BudgetTable"; // ✅ Import Component mới

interface CostManagerProps {
    projectId: string;
    qtoItems: any[];
    norms: any[];
    initialEstimates?: any[];
    costTemplates?: any[];
    canEdit?: boolean;
    budgetItems?: any[]; // ✅ Thêm prop này
}

export default function CostManager({
    projectId,
    qtoItems,
    norms,
    initialEstimates,
    costTemplates,
    canEdit,
    budgetItems = [] // ✅ Default empty array
}: CostManagerProps) {
    return (
        <Card className="border-none shadow-none bg-transparent">
            <Tabs defaultValue="qto" className="w-full">

                <div className="flex items-center justify-between mb-4">
                    <TabsList className="bg-white border border-slate-200">
                        <TabsTrigger value="qto" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                            <ListChecks className="w-4 h-4 mr-2" />
                            1. Bóc tách khối lượng
                        </TabsTrigger>

                        {/* ✅ THÊM TAB KẾT QUẢ TÍNH TOÁN */}
                        <TabsTrigger value="budget" className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700">
                            <Boxes className="w-4 h-4 mr-2" />
                            2. Tổng hợp Vật tư (Result)
                        </TabsTrigger>

                        <TabsTrigger value="estimation" className="data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700">
                            <Calculator className="w-4 h-4 mr-2" />
                            3. Dự toán chi phí (Cost)
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="qto" className="mt-0">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1 min-h-[600px]">
                        <QTOClient projectId={projectId} items={qtoItems} norms={norms} />
                    </div>
                </TabsContent>

                {/* ✅ NỘI DUNG TAB BUDGET */}
                <TabsContent value="budget" className="mt-0">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[600px] p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                            <Boxes className="w-5 h-5 mr-2 text-green-600" />
                            Bảng Tổng hợp Nhu cầu Vật tư & Tài nguyên
                        </h3>
                        <BudgetTable budgetItems={budgetItems} />
                    </div>
                </TabsContent>

                <TabsContent value="estimation" className="mt-0">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[600px] p-4">
                        <ProjectEstimationTab projectId={projectId} />
                    </div>
                </TabsContent>
            </Tabs>
        </Card>
    );
}