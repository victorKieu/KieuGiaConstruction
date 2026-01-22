"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { runDtProAutomation } from "@/lib/action/dtpro-automation";
import { useRouter } from "next/navigation";

export default function DtProInputForm({ projectId }: { projectId: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // State chứa toàn bộ thông số đầu vào (Global Parameters)
    const [params, setParams] = useState({
        width: 5,
        length: 20,
        num_floors: 3,
        floor_height: 3.6,
        soil_type: 'yeu', // Mặc định đất yếu
        pile_length: 20,
        wall_type: '10',
        roof_type: 'btct'
    });

    const handleRun = async () => {
        setLoading(true);
        // @ts-ignore
        const res = await runDtProAutomation(projectId, params);
        setLoading(false);

        if (res.success) {
            toast.success(res.message);
            router.refresh(); // Refresh để hiện bảng kết quả bên dưới
        } else {
            toast.error(res.error);
        }
    };

    return (
        <Card className="border-t-4 border-purple-600 shadow-lg">
            <CardHeader className="bg-purple-50 pb-3">
                <CardTitle className="text-purple-800 flex items-center gap-2">
                    <Zap className="w-5 h-5 fill-purple-600" />
                    Tự động hóa Dự toán (Automation Engine)
                </CardTitle>
                <p className="text-xs text-slate-500">Nhập thông số tổng thể, hệ thống tự chọn gói thầu và tính khối lượng.</p>
            </CardHeader>
            <CardContent className="pt-4 space-y-6">

                {/* NHÓM 1: KÍCH THƯỚC */}
                <div className="space-y-3">
                    <h4 className="font-semibold text-sm border-b pb-1">1. Thông số Hình học</h4>
                    <div className="grid grid-cols-4 gap-3">
                        <div className="space-y-1">
                            <Label>Rộng (m)</Label>
                            <Input type="number" value={params.width} onChange={e => setParams({ ...params, width: Number(e.target.value) })} />
                        </div>
                        <div className="space-y-1">
                            <Label>Dài (m)</Label>
                            <Input type="number" value={params.length} onChange={e => setParams({ ...params, length: Number(e.target.value) })} />
                        </div>
                        <div className="space-y-1">
                            <Label>Số tầng</Label>
                            <Input type="number" value={params.num_floors} onChange={e => setParams({ ...params, num_floors: Number(e.target.value) })} />
                        </div>
                        <div className="space-y-1">
                            <Label>Cao tầng (m)</Label>
                            <Input type="number" value={params.floor_height} onChange={e => setParams({ ...params, floor_height: Number(e.target.value) })} />
                        </div>
                    </div>
                </div>

                {/* NHÓM 2: KỸ THUẬT */}
                <div className="space-y-3">
                    <h4 className="font-semibold text-sm border-b pb-1">2. Tùy chọn Kỹ thuật (Quyết định Gói thầu)</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Địa chất / Loại móng</Label>
                            <Select value={params.soil_type} onValueChange={(v: any) => setParams({ ...params, soil_type: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="tot">Đất tốt (Móng băng)</SelectItem>
                                    <SelectItem value="yeu">Đất yếu (Móng cọc)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {params.soil_type === 'yeu' && (
                            <div className="space-y-2 animate-in fade-in">
                                <Label className="text-purple-700">Chiều sâu ép cọc (m)</Label>
                                <Input type="number" value={params.pile_length} onChange={e => setParams({ ...params, pile_length: Number(e.target.value) })} />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Tường bao</Label>
                            <Select value={params.wall_type} onValueChange={(v: any) => setParams({ ...params, wall_type: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">Tường 100mm</SelectItem>
                                    <SelectItem value="20">Tường 200mm</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Loại mái</Label>
                            <Select value={params.roof_type} onValueChange={(v: any) => setParams({ ...params, roof_type: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="btct">Mái Bê tông</SelectItem>
                                    <SelectItem value="tole">Mái Tôn</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <Button onClick={handleRun} disabled={loading} className="w-full bg-purple-700 hover:bg-purple-800 font-bold py-6 text-md shadow-md">
                    {loading ? <Loader2 className="mr-2 animate-spin" /> : <Zap className="mr-2 fill-yellow-400 text-yellow-400" />}
                    CHẠY TỰ ĐỘNG & BÓC TÁCH VẬT TƯ
                </Button>
            </CardContent>
        </Card>
    );
}