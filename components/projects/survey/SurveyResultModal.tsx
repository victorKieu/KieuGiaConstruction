"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateSurveyTaskResult } from "@/lib/action/surveyActions";
import { useActionState } from 'react';
import { useFormStatus } from "react-dom";
import { Loader2, Edit3, Compass, Sparkles, Home, CheckCircle2, X, User } from "lucide-react";
import { evaluateFengShui, type FullFengShuiAnalysis } from "@/lib/utils/fengShui";
import FengShuiCompass from "./FengShuiCompass";
import { toast } from "sonner";

function SubmitResultButton() {
    const { pending } = useFormStatus();
    return (
        <Button
            type="submit"
            disabled={pending}
            className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto font-bold shadow-lg shadow-blue-200 min-w-[150px]"
        >
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang lưu...
                </>
            ) : "Xác nhận & Lưu kết quả"}
        </Button>
    );
}

export default function SurveyResultModal({ task, projectId, onUpdateSuccess }: any) {
    const [isOpen, setIsOpen] = useState(false);
    const [showCompass, setShowCompass] = useState(false);

    // --- State quản lý dữ liệu Form ---
    const [ownerName, setOwnerName] = useState<string>("");
    const [birthYear, setBirthYear] = useState<number>(1990);
    const [gender, setGender] = useState<'nam' | 'nu'>('nam');
    const [resultText, setResultText] = useState<string>("");
    const [status, setStatus] = useState<string>("completed");
    const [cost, setCost] = useState<number>(0);
    const [analysisJson, setAnalysisJson] = useState<string>("");
    const [fsAnalysis, setFsAnalysis] = useState<FullFengShuiAnalysis | null>(null);

    const [state, formAction] = useActionState(updateSurveyTaskResult as any, {
        success: false,
        message: "",
        error: undefined
    });

    // Thoát la bàn bằng ESC
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowCompass(false); };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    // Xử lý sau khi Server phản hồi
    useEffect(() => {
        if (state.success && isOpen) {
            setIsOpen(false);
            // CỰC KỲ QUAN TRỌNG: Truyền thẳng cái 'status' sếp vừa chọn ra ngoài
            onUpdateSuccess(status);
        } else if (state.message && !state.success) {
            toast.error(state.message);
        }
    }, [state.success, state.message, isOpen, onUpdateSuccess, status]);

    const isFengShuiTask = task.title.toUpperCase().includes("HƯỚNG") || task.title.toUpperCase().includes("PHONG THỦY");

    const handleCompassSave = (data: any) => {
        const result = evaluateFengShui(birthYear, gender, data.heading);
        setFsAnalysis(result);

        // --- Tự động lập danh sách công năng theo 8 hướng ---
        const tot = result.allDirections.filter(d => d.type === 'good').map(d => `${d.star} (${d.dirName})`).join(", ");
        const xau = result.allDirections.filter(d => d.type === 'bad').map(d => `${d.star} (${d.dirName})`).join(", ");

        const listCongNang = result.allDirections.map(d => {
            const isGood = d.type === 'good';
            // Gợi ý bố trí
            let goiY = isGood ? "✅ Cửa chính, Ban thờ, Phòng ngủ" : "❌ Nhà vệ sinh, Kho, Bếp (tọa hung)";
            return `- Hướng ${d.dirName} (${d.degree}°): ${d.star} -> ${goiY}`;
        }).join("\n");

        const fullData = {
            owner: { name: ownerName, birthYear, gender },
            compass: data,
            fengshui: result,
            generated_at: new Date().toISOString()
        };

        // Tạo văn bản chuyên nghiệp để lưu vào DB
        const formattedText = `[BÁO CÁO PHONG THỦY GIA CHỦ: ${ownerName.toUpperCase()}]
Năm sinh: ${birthYear} - Cung mệnh: ${result.cung} (${result.nhom})
-----------------------------------------
1. KẾT QUẢ ĐO HIỆN TẠI:
- Hướng đo: ${result.currentDirection.name} (${data.heading}°)
- Cung: ${result.currentDirection.star} -> Đánh giá: ${result.currentDirection.isGood ? 'TỐT (Nên dùng)' : 'XẤU (Cần hóa giải)'}

2. CHI TIẾT 8 HƯỚNG BÁT TRẠCH:
${listCongNang}
-----------------------------------------
Ghi chú thêm: Hướng tốt (${tot}). Hướng xấu (${xau}).`;

        setResultText(formattedText);
        setAnalysisJson(JSON.stringify(fullData));
        setShowCompass(false);
        toast.success("Đã phân tích toàn bộ công năng 8 hướng!");
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 h-8 border-green-200 bg-green-50/50 text-green-700 hover:bg-green-100 transition-all">
                    <Edit3 className="h-3.5 w-3.5" /> Ghi kết quả
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[95vh] overflow-y-auto !p-0 gap-0 border-none shadow-2xl">
                {/* Header */}
                <div className="bg-slate-900 p-6 text-white shrink-0 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Home size={80} /></div>
                    <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3 relative z-10">
                        <CheckCircle2 className="text-blue-400" /> {task.title}
                    </DialogTitle>
                    <p className="text-slate-400 text-[10px] mt-1 relative z-10 tracking-widest uppercase opacity-70">Dự án: {projectId}</p>
                </div>

                {/* Form chính */}
                <form action={formAction} className="p-6 space-y-6 bg-white">
                    {/* Các input ẩn quan trọng để gửi lên Server */}
                    <input type="hidden" name="taskId" value={task.id} />
                    <input type="hidden" name="projectId" value={projectId} />
                    <input type="hidden" name="analysis_json" value={analysisJson} />
                    <input type="hidden" name="status" value={status} />

                    {isFengShuiTask && (
                        <div className="space-y-4 p-5 bg-orange-50/50 border border-orange-100 rounded-2xl shadow-inner">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-2 text-orange-800 font-bold text-sm">
                                    <Sparkles className="w-4 h-4 text-orange-500" /> THÔNG TIN GIA CHỦ
                                </Label>
                                <Button type="button" size="sm" className="bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-200" onClick={() => setShowCompass(true)}>
                                    <Compass className="mr-2 h-4 w-4" /> Mở La bàn
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5 md:col-span-2">
                                    <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-1">
                                        <User className="w-3 h-3" /> Họ và tên gia chủ
                                    </span>
                                    <Input
                                        placeholder="Nhập tên khách hàng..."
                                        value={ownerName}
                                        onChange={(e) => setOwnerName(e.target.value)}
                                        className="h-10 border-orange-200 focus:ring-orange-500 font-bold"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Năm sinh (Âm Lịch)</span>
                                    <Input
                                        type="number"
                                        value={birthYear}
                                        onChange={(e) => setBirthYear(Number(e.target.value))}
                                        className="h-10 border-orange-200 focus:ring-orange-500 font-bold"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Giới tính</span>
                                    <Select value={gender} onValueChange={(v: any) => setGender(v)}>
                                        <SelectTrigger className="h-10 border-orange-200 font-bold"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="nam">Nam giới</SelectItem>
                                            <SelectItem value="nu">Nữ giới</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    )}

                    {fsAnalysis && (
                        <div className="space-y-3 animate-in fade-in zoom-in-95 duration-300">
                            <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-xl border-t-4 border-blue-500">
                                <div className="flex items-center gap-4 mb-3 border-b border-white/10 pb-3">
                                    <div className="bg-blue-600 px-3 py-1 rounded text-lg font-black">{fsAnalysis.cung}</div>
                                    <div>
                                        <p className="text-[10px] opacity-50 uppercase font-bold tracking-widest">Mệnh chủ</p>
                                        <p className="text-sm font-bold text-blue-400">{fsAnalysis.nhom}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[10px]">
                                    <div className="p-2 bg-green-500/10 rounded border border-green-500/20">
                                        <p className="text-green-500 font-black mb-1">4 HƯỚNG CÁT (NÊN MỞ CỬA)</p>
                                        <ul className="space-y-1 opacity-80">
                                            {fsAnalysis.allDirections.filter(d => d.type === 'good').map(d => (
                                                <li key={d.dirId}>• {d.dirName}: {d.star}</li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="p-2 bg-red-500/10 rounded border border-red-500/20">
                                        <p className="text-red-500 font-black mb-1">4 HƯỚNG HUNG (ĐẶT WC/KHO)</p>
                                        <ul className="space-y-1 opacity-80">
                                            {fsAnalysis.allDirections.filter(d => d.type === 'bad').map(d => (
                                                <li key={d.dirId}>• {d.dirName}: {d.star}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label className="text-xs font-black text-slate-500 uppercase tracking-widest">Ghi chú & Kết quả đo</Label>
                        <Textarea
                            name="result_data_text"
                            rows={4}
                            value={resultText}
                            onChange={(e) => setResultText(e.target.value)}
                            className="text-sm font-medium border-slate-200 rounded-xl bg-slate-50 focus:bg-white transition-colors"
                            placeholder="Thông tin chi tiết về hướng đất, hướng nhà..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-black text-slate-500 uppercase tracking-widest">Trạng thái</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">⏳ Đang xử lý</SelectItem>
                                    <SelectItem value="completed">✅ Hoàn thành</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-black text-slate-500 uppercase tracking-widest">Chi phí khảo sát</Label>
                            <Input
                                name="cost"
                                type="number"
                                value={cost}
                                onChange={(e) => setCost(Number(e.target.value))}
                                className="h-11 rounded-xl font-mono"
                            />
                        </div>
                    </div>

                    <DialogFooter className="border-t pt-6 gap-2">
                        <DialogClose asChild><Button type="button" variant="ghost">Hủy bỏ</Button></DialogClose>
                        <SubmitResultButton />
                    </DialogFooter>
                </form>

                {/* Overlay La bàn */}
                {showCompass && (
                    <div className="absolute inset-0 z-[100] bg-slate-950/98 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200 p-4">
                        <div className="w-full max-w-md flex flex-col items-center relative">
                            <Button type="button" variant="ghost" size="icon" className="absolute -top-12 right-0 text-white/50 hover:text-white" onClick={() => setShowCompass(false)}>
                                <X className="h-8 w-8" />
                            </Button>

                            <FengShuiCompass
                                projectId={projectId}
                                ownerName={ownerName}
                                birthYear={birthYear}
                                gender={gender}
                                onSaveResult={handleCompassSave}
                            />

                            <Button type="button" variant="outline" className="mt-8 border-white/20 text-white hover:bg-white/10 rounded-full px-10 h-11" onClick={() => setShowCompass(false)}>
                                Đóng công cụ
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}