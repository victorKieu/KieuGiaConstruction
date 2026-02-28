"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wand2, Calculator, Building2, Layers } from "lucide-react";
import { toast } from "sonner";
import { generateAutoEstimate } from "@/lib/action/autoEstimateAction";
import { useRouter } from "next/navigation";

export default function AutoEstimateModal({ projectId, onSuccess }: { projectId: string; onSuccess: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    

    // 8 Tham số đầu vào chuẩn Kiều Gia
    const [formData, setFormData] = useState({
        length: "",
        width: "",
        floors: "3", // Mặc định 3 tầng
        foundation: "bang", // bang | coc | don
        roof: "ton", // ton | btct | ngoi
        floorType: "btct", // btct | panel
        wcCount: "3",
        finishLevel: "tieu_chuan" // tieu_chuan | kha | cao_cap
    });

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleGenerate = async () => {
        if (!formData.length || !formData.width) {
            toast.error("Vui lòng nhập Chiều dài và Chiều rộng!");
            return;
        }
        setLoading(true);

        // Gọi hàm Trái Tim Nội Suy
        const res = await generateAutoEstimate({
            projectId: projectId,
            length: parseFloat(formData.length),
            width: parseFloat(formData.width),
            floors: parseInt(formData.floors),
            foundation: formData.foundation,
            roof: formData.roof,
            wcCount: parseInt(formData.wcCount)
        });

        setLoading(false);
        setIsOpen(false);

        if (res.success) {
            toast.success(res.message);
            // 🔴 2. Chỉ gọi onSuccess, TUYỆT ĐỐI KHÔNG dùng router.refresh() ở đây nữa
            if (onSuccess) onSuccess();
        } else {
            toast.error("Lỗi: " + res.error);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md">
                    <Wand2 className="w-4 h-4 mr-2" />
                    Tạo Dự Toán Tự Động
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] bg-slate-50">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-orange-500" />
                        Thiết Lập Thông Số Công Trình
                    </DialogTitle>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* BƯỚC 1: QUY MÔ */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2 border-b pb-1">
                            <Building2 className="w-4 h-4" /> 1. Quy mô xây dựng
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-700">Chiều dài (m)</label>
                                <Input type="number" placeholder="VD: 20" value={formData.length} onChange={(e) => handleChange("length", e.target.value)} className="mt-1 bg-white" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700">Chiều rộng (m)</label>
                                <Input type="number" placeholder="VD: 5" value={formData.width} onChange={(e) => handleChange("width", e.target.value)} className="mt-1 bg-white" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700">Số tầng cao</label>
                                <Input type="number" placeholder="VD: 3" value={formData.floors} onChange={(e) => handleChange("floors", e.target.value)} className="mt-1 bg-white" />
                            </div>
                        </div>
                    </div>

                    {/* BƯỚC 2: KẾT CẤU */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2 border-b pb-1">
                            <Layers className="w-4 h-4" /> 2. Giải pháp kết cấu & Hoàn thiện
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-700">Giải pháp Móng</label>
                                <select value={formData.foundation} onChange={(e) => handleChange("foundation", e.target.value)} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm mt-1 outline-none focus:border-orange-500">
                                    <option value="bang">Móng Băng</option>
                                    <option value="coc">Móng Cọc</option>
                                    <option value="don">Móng Đơn</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700">Giải pháp Mái</label>
                                <select value={formData.roof} onChange={(e) => handleChange("roof", e.target.value)} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm mt-1 outline-none focus:border-orange-500">
                                    <option value="ton">Mái Tôn</option>
                                    <option value="btct">Mái BTCT Phẳng</option>
                                    <option value="ngoi">Mái Ngói</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700">Mức độ hoàn thiện</label>
                                <select value={formData.finishLevel} onChange={(e) => handleChange("finishLevel", e.target.value)} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm mt-1 outline-none focus:border-orange-500">
                                    <option value="tieu_chuan">Tiêu chuẩn (Cơ bản)</option>
                                    <option value="kha">Khá (Tốt)</option>
                                    <option value="cao_cap">Cao cấp (VIP)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700">Số phòng Vệ sinh (WC)</label>
                                <Input type="number" placeholder="VD: 3" value={formData.wcCount} onChange={(e) => handleChange("wcCount", e.target.value)} className="mt-1 bg-white" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-200">
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Hủy bỏ</Button>
                    <Button onClick={handleGenerate} disabled={loading} className="bg-orange-600 hover:bg-orange-700 text-white">
                        {loading ? "Đang nội suy khối lượng..." : "Bắt đầu tính toán"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}