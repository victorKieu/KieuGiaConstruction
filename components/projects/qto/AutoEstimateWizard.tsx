"use client";

import React, { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wand2, ChevronRight, ChevronLeft, CheckCircle2, Home, Layers, Ruler, Grid, Hammer, Settings } from "lucide-react";
import { toast } from "sonner";
import { generateAutoEstimate } from "@/lib/action/autoEstimateAction";
import { useRouter } from "next/navigation";

export default function AutoEstimateWizard({ projectId, onSuccess }: { projectId: string; onSuccess: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const router = useRouter();

    const [isPending, startTransition] = useTransition();

    // BỘ THAM SỐ KHỔNG LỒ (Đủ 6 bước như dtPro)
    const [formData, setFormData] = useState({
        // Bước 1
        houseType: "nha_pho",
        // Bước 2
        floors: "3", mezzanine: "0", totalHeight: "14.2", basement: "khong_ham",
        // Bước 3
        shape: "vuong_van", length: "16", width: "4", buildArea: "64",
        // Bước 4
        columns: "12", wcCount: "3", rooms: "3", roofType: "ton",
        // Bước 5
        concreteMac: "M250", brickType: "8x8x18",
        // Bước 6
        soilType: "tot", digType: "may", foundation: "bang"
    });

    const handleChange = (field: string, value: string) => {
        setFormData(prev => {
            const newData = { ...prev, [field]: value };
            // Tự động tính Diện tích nếu nhập Dài Rộng
            if (field === "length" || field === "width") {
                const l = parseFloat(field === "length" ? value : prev.length) || 0;
                const w = parseFloat(field === "width" ? value : prev.width) || 0;
                newData.buildArea = (l * w).toString();
            }
            return newData;
        });
    };

    const handleCalculate = async () => {
        try {
            // 1. Kiểm tra đầu vào
            if (!formData.length || !formData.width) {
                toast.error("Vui lòng nhập Chiều dài và Chiều rộng ở Bước 3!");
                setStep(3); // Quay lại bước 3 cho user nhập
                return;
            }

            setLoading(true);
            console.log("🚀 Đang gửi dữ liệu lên Server:", formData);

            // 2. Gọi Server Action
            const res = await generateAutoEstimate({
                projectId: projectId,
                length: parseFloat(formData.length),
                width: parseFloat(formData.width),
                floors: parseInt(formData.floors),
                foundation: formData.foundation,
                roof: formData.roofType,
                wcCount: parseInt(formData.wcCount)
            });

            console.log("📦 Kết quả từ Server:", res);
            setLoading(false);

            // 3. Xử lý kết quả
            if (res.success) {
                // 🔴 1. Dùng alert() thay cho toast để ăn chắc 100%
                alert("✨ " + res.message);

                setIsOpen(false); if (res.success) {
                    //alert("✨ " + res.message); // Hoặc toast.success
                    setIsOpen(false);
                    setStep(1);
                    onSuccess(); // 🔴 Gọi hàm này để báo Cha tải lại data
                }
            } else {
                alert("❌ Lỗi: " + res.error);
            }
        } catch (error: any) {
            setLoading(false);
            console.error("🔥 Lỗi Client:", error);
            toast.error("Lỗi hệ thống: " + error.message);
        }
    };

    // --- RENDER GIAO DIỆN TỪNG BƯỚC ---
    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800 mb-4">
                            <strong>Hướng dẫn:</strong> Bấm chọn loại nhà cần lập dự toán. Nhà phố thường 2 bên giáp tường nhà khác.
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div
                                className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${formData.houseType === 'nha_pho' ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-orange-300'}`}
                                onClick={() => handleChange("houseType", "nha_pho")}
                            >
                                <div className="h-32 bg-slate-200 rounded-md mb-3 flex items-center justify-center text-slate-400 font-bold">ẢNH NHÀ PHỐ</div>
                                <h3 className="text-center font-bold text-slate-700">Nhà Phố</h3>
                            </div>
                            <div
                                className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${formData.houseType === 'biet_thu' ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-orange-300'}`}
                                onClick={() => handleChange("houseType", "biet_thu")}
                            >
                                <div className="h-32 bg-slate-200 rounded-md mb-3 flex items-center justify-center text-slate-400 font-bold">ẢNH BIỆT THỰ</div>
                                <h3 className="text-center font-bold text-slate-700">Biệt Thự</h3>
                            </div>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">Số tầng (Không tính hầm/lửng)</label>
                                    <Input type="number" value={formData.floors} onChange={e => handleChange("floors", e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">Tầng lửng</label>
                                    <Input type="number" value={formData.mezzanine} onChange={e => handleChange("mezzanine", e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">Tổng Cao (H)</label>
                                    <Input type="number" value={formData.totalHeight} onChange={e => handleChange("totalHeight", e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">Loại Hầm</label>
                                    <select value={formData.basement} onChange={e => handleChange("basement", e.target.value)} className="w-full h-10 px-3 border rounded-md outline-none">
                                        <option value="khong_ham">Không hầm</option>
                                        <option value="ban_ham">Bán hầm</option>
                                        <option value="ham_full">Hầm toàn bộ</option>
                                    </select>
                                </div>
                            </div>
                            <div className="bg-slate-100 rounded-xl p-4 flex items-center justify-center border border-slate-200">
                                <span className="text-slate-400 font-bold">SƠ ĐỒ MẶT CẮT TẦNG</span>
                            </div>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">Hình dạng nhà</label>
                                    <select value={formData.shape} onChange={e => handleChange("shape", e.target.value)} className="w-full h-10 px-3 border rounded-md outline-none">
                                        <option value="vuong_van">Vuông vắn</option>
                                        <option value="chu_l">Nhữ L</option>
                                        <option value="hinh_cheo">Hình chéo</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">Chiều dài nhà (m)</label>
                                    <Input type="number" value={formData.length} onChange={e => handleChange("length", e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">Chiều rộng nhà (m)</label>
                                    <Input type="number" value={formData.width} onChange={e => handleChange("width", e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-orange-600">Diện tích xây dựng (m2)</label>
                                    <Input type="number" className="bg-orange-50 font-bold text-orange-700" value={formData.buildArea} onChange={e => handleChange("buildArea", e.target.value)} />
                                </div>
                            </div>
                            <div className="bg-slate-100 rounded-xl p-4 flex items-center justify-center border border-slate-200">
                                <span className="text-slate-400 font-bold">MÔ HÌNH NHÀ VUÔNG</span>
                            </div>
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-xs font-semibold text-slate-700">Số Cột (Tự nội suy)</label><Input type="number" value={formData.columns} onChange={e => handleChange("columns", e.target.value)} /></div>
                            <div><label className="text-xs font-semibold text-slate-700">Số phòng Vệ sinh (WC)</label><Input type="number" value={formData.wcCount} onChange={e => handleChange("wcCount", e.target.value)} /></div>
                            <div><label className="text-xs font-semibold text-slate-700">Số phòng ngủ/kín</label><Input type="number" value={formData.rooms} onChange={e => handleChange("rooms", e.target.value)} /></div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700">Loại Mái Tum</label>
                                <select value={formData.roofType} onChange={e => handleChange("roofType", e.target.value)} className="w-full h-10 px-3 border rounded-md outline-none">
                                    <option value="ton">Mái Tôn</option>
                                    <option value="btct">Mái bằng BTCT</option>
                                    <option value="ngoi">Mái Ngói</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );
            case 5:
                return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">Mác Bê Tông (Móng, Cột, Dầm, Sàn)</label>
                                    <select value={formData.concreteMac} onChange={e => handleChange("concreteMac", e.target.value)} className="w-full h-10 px-3 border rounded-md outline-none">
                                        <option value="M200">BT Trộn M200</option>
                                        <option value="M250">BT Trộn M250</option>
                                        <option value="M300">BT Trộn M300</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-700">Loại gạch xây</label>
                                    <select value={formData.brickType} onChange={e => handleChange("brickType", e.target.value)} className="w-full h-10 px-3 border rounded-md outline-none">
                                        <option value="8x8x18">Gạch ống 8x8x18 (Miền Nam)</option>
                                        <option value="6.5x10.5x22">Gạch ống 6.5x10.5x22 (Miền Bắc)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 6:
                return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-700">Loại Đất Nền</label>
                                <select value={formData.soilType} onChange={e => handleChange("soilType", e.target.value)} className="w-full h-10 px-3 border rounded-md outline-none">
                                    <option value="tot">Đất Tốt (Chịu tải cao)</option>
                                    <option value="yeu">Đất Yếu</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700">Giải pháp Móng (Rút ra từ đất nền)</label>
                                <select value={formData.foundation} onChange={e => handleChange("foundation", e.target.value)} className="w-full h-10 px-3 border rounded-md outline-none">
                                    <option value="bang">Móng Băng</option>
                                    <option value="coc">Móng Cọc</option>
                                    <option value="don">Móng Đơn</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700">Hình thức Đào Đất</label>
                                <select value={formData.digType} onChange={e => handleChange("digType", e.target.value)} className="w-full h-10 px-3 border rounded-md outline-none">
                                    <option value="may">Đào bằng Máy</option>
                                    <option value="thu_cong">Thủ công - Cấp 2</option>
                                </select>
                            </div>
                        </div>
                        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                            <strong>Bước cuối cùng:</strong> Bấm <b>"Bắt đầu tính toán"</b> để hệ thống tự động bóc tách khối lượng (QTO) dựa trên 6 bước bạn vừa thiết lập!
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    const stepIcons = [Home, Layers, Ruler, Grid, Hammer, Settings];

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setStep(1); }}>
            <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md">
                    <Wand2 className="w-4 h-4 mr-2" /> Wizard Lập Dự Toán (6 Bước)
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[750px] bg-white p-0 overflow-hidden">
                {/* HEADER */}
                <div className="bg-slate-50 border-b p-4 flex items-center justify-between">
                    <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Wand2 className="w-5 h-5 text-orange-500" />
                        Thiết Lập Thông Số (dtPro Engine)
                    </DialogTitle>
                    <div className="text-sm font-bold text-slate-400">
                        Bước {step} / 6
                    </div>
                </div>

                {/* STEP INDICATOR */}
                <div className="flex px-6 pt-4 justify-between relative">
                    <div className="absolute top-8 left-10 right-10 h-1 bg-slate-100 -z-10"></div>
                    <div className="absolute top-8 left-10 h-1 bg-orange-500 transition-all duration-300 -z-10" style={{ width: `${((step - 1) / 5) * 100}%` }}></div>

                    {[1, 2, 3, 4, 5, 6].map((i) => {
                        const Icon = stepIcons[i - 1];
                        const isActive = i === step;
                        const isDone = i < step;
                        return (
                            <div key={i} className="flex flex-col items-center gap-2 z-10">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${isActive ? 'border-orange-500 bg-white text-orange-600 shadow-md scale-110' : isDone ? 'border-orange-500 bg-orange-500 text-white' : 'border-slate-200 bg-white text-slate-300'}`}>
                                    {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* CONTENT */}
                <div className="p-6 min-h-[350px]">
                    <h2 className="text-lg font-bold text-slate-700 border-b pb-2 mb-4">
                        {step === 1 && "Bước 1/6: Chọn loại nhà"}
                        {step === 2 && "Bước 2/6: Nhập số tầng và chiều cao nhà"}
                        {step === 3 && "Bước 3/6: Nhập hình dạng và kích thước nhà"}
                        {step === 4 && "Bước 4/6: Số phòng, DT ban công, cầu thang, mái"}
                        {step === 5 && "Bước 5/6: Mác bê tông và loại gạch"}
                        {step === 6 && "Bước 6/6: Một số thông số chi tiết hơn"}
                    </h2>
                    {renderStep()}
                </div>

                {/* FOOTER */}
                <div className="bg-slate-50 border-t p-4 flex justify-between items-center">
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Hủy bỏ</Button>
                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => setStep(s => s - 1)} disabled={step === 1}>
                            <ChevronLeft className="w-4 h-4 mr-1" /> Trở lại
                        </Button>

                        {step < 6 ? (
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6" onClick={() => setStep(s => s + 1)}>
                                Tiếp tục <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        ) : (
                                <Button onClick={handleCalculate} disabled={loading || isPending} className="bg-orange-600 hover:bg-orange-700 text-white px-6">
                                {loading ? "Đang tính..." : "Bắt đầu tính toán"}
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}