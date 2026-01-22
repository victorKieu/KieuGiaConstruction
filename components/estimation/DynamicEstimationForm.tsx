"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, Loader2, Wrench, Building2 } from "lucide-react";
import { toast } from "sonner";
import { generateDynamicEstimate } from "@/lib/action/auto-estimate";

export default function DtProWizard({ projectId }: { projectId: string }) {
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState("new_build");

    // State cho Xây mới
    const [newBuildParams, setNewBuildParams] = useState({
        width: 5,
        length: 20,
        num_floors: 3,
        // Có thể thêm bao nhiêu tham số tùy ý, miễn là khớp với biến trong DB
    });

    // State cho Sửa chữa
    const [renoParams, setRenoParams] = useState({
        repair_area: 25, // Diện tích sàn sửa chữa
        repair_perimeter: 20, // Chu vi phòng (để tính ốp tường/len chân tường)
    });

    const handleCalculate = async () => {
        setLoading(true);
        let params = {};
        let categories: string[] = [];

        if (mode === "new_build") {
            params = newBuildParams;
            // Logic chọn category: Tùy user chọn Móng gì mà push category tương ứng
            // Ở đây demo lấy full bộ cơ bản
            categories = ['mong_bang', 'than', 'hoan_thien'];
        } else {
            params = renoParams;
            categories = ['sua_chua_wc']; // Lấy bộ công thức sửa chữa
        }

        // @ts-ignore
        const res = await generateDynamicEstimate(projectId, params, categories);

        setLoading(false);
        if (res.success) {
            toast.success(res.message);
        } else {
            toast.error("Lỗi: " + res.error);
        }
    };

    return (
        <Card className="border-indigo-100 shadow-md">
            <CardHeader className="bg-indigo-50/50 pb-3">
                <CardTitle className="text-indigo-800 flex items-center gap-2 text-lg">
                    <Calculator className="w-5 h-5" /> Công cụ Dự toán
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
                <Tabs value={mode} onValueChange={setMode} className="w-full">
                    <TabsList className="grid grid-cols-2 mb-4 w-full">
                        <TabsTrigger value="new_build"><Building2 className="w-4 h-4 mr-2" />Xây mới (dtPro)</TabsTrigger>
                        <TabsTrigger value="renovation"><Wrench className="w-4 h-4 mr-2" />Sửa chữa nhỏ</TabsTrigger>
                    </TabsList>

                    {/* FORM XÂY MỚI */}
                    <TabsContent value="new_build" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Chiều rộng (m)</Label>
                                <Input type="number" value={newBuildParams.width} onChange={e => setNewBuildParams({ ...newBuildParams, width: Number(e.target.value) })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Chiều dài (m)</Label>
                                <Input type="number" value={newBuildParams.length} onChange={e => setNewBuildParams({ ...newBuildParams, length: Number(e.target.value) })} />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label>Tổng số tầng</Label>
                                <Input type="number" value={newBuildParams.num_floors} onChange={e => setNewBuildParams({ ...newBuildParams, num_floors: Number(e.target.value) })} />
                            </div>
                        </div>
                        <div className="text-xs text-slate-500 italic mt-2">
                            * Hệ thống sẽ tự động áp dụng các công thức trong Database cho Móng băng, Phần Thân và Hoàn thiện.
                        </div>
                    </TabsContent>

                    {/* FORM SỬA CHỮA */}
                    <TabsContent value="renovation" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>DT sàn cần sửa (m2)</Label>
                                <Input type="number" value={renoParams.repair_area} onChange={e => setRenoParams({ ...renoParams, repair_area: Number(e.target.value) })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Chu vi phòng (m)</Label>
                                <Input type="number" value={renoParams.repair_perimeter} onChange={e => setRenoParams({ ...renoParams, repair_perimeter: Number(e.target.value) })} />
                            </div>
                        </div>
                        <div className="text-xs text-slate-500 italic mt-2">
                            * Áp dụng cho các công tác: Đục nền, Chống thấm, Ốp lát lại.
                        </div>
                    </TabsContent>
                </Tabs>

                <Button
                    onClick={handleCalculate}
                    disabled={loading}
                    className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 font-bold"
                >
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    TÍNH TOÁN
                </Button>
            </CardContent>
        </Card>
    );
}