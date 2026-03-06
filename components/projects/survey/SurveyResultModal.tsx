"use client";

import { useState, useEffect, useRef } from "react";
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
import { Loader2, Edit3, Compass, Sparkles, Home, CheckCircle2, X, User, ImagePlus, Camera, Trash2 } from "lucide-react";
import { evaluateFengShui, type FullFengShuiAnalysis } from "@/lib/utils/fengShui";
import FengShuiCompass from "./FengShuiCompass";
import { toast } from "sonner";
import Image from "next/image";

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
                    Đang lưu & Tải ảnh...
                </>
            ) : "Xác nhận & Lưu kết quả"}
        </Button>
    );
}

const COMPANY_NAME = "CÔNG TY TNHH TM DV XÂY DỰNG KIỀU GIA";

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

    // --- State quản lý Ảnh đính kèm ---
    const [selectedImages, setSelectedImages] = useState<{ file: File, preview: string }[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ✅ 1. HÀM GET METADATA (Đã bổ sung để lấy GPS và thời gian)
    const getMetaData = async (): Promise<string> => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                resolve(`🕒 Thời gian: ${new Date().toLocaleString('vi-VN')}`);
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const lat = pos.coords.latitude.toFixed(6);
                    const lng = pos.coords.longitude.toFixed(6);
                    const time = new Date().toLocaleString('vi-VN');
                    resolve(`📍 Tọa độ: ${lat}, ${lng}\n🕒 Thời gian: ${time}`);
                },
                (err) => {
                    console.error(err);
                    resolve(`🕒 Thời gian: ${new Date().toLocaleString('vi-VN')}`);
                },
                { enableHighAccuracy: true }
            );
        });
    };

    // ✅ 2. HÀM BỌC ACTION ĐỂ GỬI ẢNH LÊN SERVER (Fix lỗi UUID "null" & thiếu ảnh)
    const wrappedAction = async (state: any, formData: FormData) => {
        const taskId = task?.id || task?._id;

        if (!taskId || taskId === "null") {
            toast.error("Lỗi: Không tìm thấy ID của nhiệm vụ!");
            return { success: false, message: "ID không hợp lệ" };
        }

        // Xóa các trường mặc định từ form (nếu có rác)
        formData.delete('taskId');
        formData.delete('projectId');
        formData.delete('analysis_json');
        formData.delete('status');
        formData.delete('images');

        // Truyền giá trị an toàn vào FormData để gửi Server
        formData.append('taskId', String(taskId));
        formData.append('projectId', String(projectId || ""));
        formData.append('status', status);
        formData.append('analysis_json', analysisJson || "");

        // Nhồi các file ảnh đã đóng dấu Watermark vào form
        selectedImages.forEach((item) => {
            formData.append('images', item.file);
        });

        // Gọi action thực tế
        return updateSurveyTaskResult(state, formData);
    };

    const [state, formAction] = useActionState(wrappedAction as any, {
        success: false,
        message: "",
        error: undefined
    });

    // Hàm QUAN TRỌNG: Vẽ Watermark lên ảnh
    const processImageWithWatermark = async (file: File): Promise<File> => {
        const meta = await getMetaData();
        const textWatermark = `${COMPANY_NAME}\n${meta}\nDự án: ${projectId}`;

        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new window.Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return resolve(file);

                    // Cố định chiều rộng tối đa để web không bị treo
                    const MAX_WIDTH = 1600;
                    let width = img.width;
                    let height = img.height;
                    if (width > MAX_WIDTH) {
                        height = (MAX_WIDTH / width) * height;
                        width = MAX_WIDTH;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);

                    const fontSize = Math.max(canvas.width / 40, 20);
                    ctx.font = `bold ${fontSize}px Arial`;

                    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
                    const margin = 20;
                    const lines = textWatermark.split('\n');
                    const rectHeight = lines.length * (fontSize + 10) + margin;
                    ctx.fillRect(0, canvas.height - rectHeight, canvas.width, rectHeight);

                    ctx.fillStyle = "white";
                    ctx.textBaseline = "top";
                    lines.forEach((line, i) => {
                        ctx.fillText(line, margin, canvas.height - rectHeight + margin + i * (fontSize + 10));
                    });

                    canvas.toBlob((blob) => {
                        if (blob) {
                            const newFile = new File([blob], file.name || `photo_${Date.now()}.jpg`, { type: "image/jpeg" });
                            resolve(newFile);
                        } else {
                            resolve(file);
                        }
                    }, "image/jpeg", 0.8);
                };
            };
        });
    };

    // Xử lý chọn ảnh & kích hoạt đóng dấu
    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const toastId = toast.loading("Đang đóng dấu thông tin ảnh...");
            const filesArray = Array.from(e.target.files);
            const processedImages: { file: File; preview: string }[] = [];

            try {
                for (const file of filesArray) {
                    const stampedFile = await processImageWithWatermark(file);
                    processedImages.push({
                        file: stampedFile,
                        preview: URL.createObjectURL(stampedFile)
                    });
                }
                setSelectedImages(prev => [...prev, ...processedImages]);
                toast.success("Đóng dấu ảnh thành công!", { id: toastId });
            } catch (err) {
                toast.error("Lỗi khi xử lý ảnh", { id: toastId });
            }
        }
    };

    // Xóa ảnh khỏi danh sách chờ
    const removeImage = (index: number) => {
        setSelectedImages(prev => {
            const updated = [...prev];
            URL.revokeObjectURL(updated[index].preview);
            updated.splice(index, 1);
            return updated;
        });
    };

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
            setSelectedImages([]);
            onUpdateSuccess(status);
            toast.success("Đã lưu kết quả và ảnh hiện trạng!");
        } else if (state.message && !state.success) {
            toast.error(state.message);
        }
    }, [state.success, state.message, isOpen, onUpdateSuccess, status]);

    const isFengShuiTask = task?.title?.toUpperCase().includes("HƯỚNG") || task?.title?.toUpperCase().includes("PHONG THỦY");

    const handleCompassSave = (data: any) => {
        const result = evaluateFengShui(birthYear, gender, data.heading);
        setFsAnalysis(result);

        const tot = result.allDirections.filter(d => d.type === 'good').map(d => `${d.star} (${d.dirName})`).join(", ");
        const xau = result.allDirections.filter(d => d.type === 'bad').map(d => `${d.star} (${d.dirName})`).join(", ");

        const listCongNang = result.allDirections.map(d => {
            const isGood = d.type === 'good';
            let goiY = isGood ? "✅ Cửa chính, Ban thờ, Phòng ngủ" : "❌ Nhà vệ sinh, Kho, Bếp (tọa hung)";
            return `- Hướng ${d.dirName} (${d.degree}°): ${d.star} -> ${goiY}`;
        }).join("\n");

        const fullData = {
            owner: { name: ownerName, birthYear, gender },
            compass: data,
            fengshui: result,
            generated_at: new Date().toISOString()
        };

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
                        <CheckCircle2 className="text-blue-400" /> {task?.title}
                    </DialogTitle>
                    <p className="text-slate-400 text-[10px] mt-1 relative z-10 tracking-widest uppercase opacity-70">Dự án: {projectId}</p>
                </div>

                {/* Form chính */}
                <form action={formAction} className="p-6 space-y-6 bg-white">
                    <input type="hidden" name="taskId" value={task?.id || ""} />
                    <input type="hidden" name="projectId" value={projectId || ""} />
                    <input type="hidden" name="analysis_json" value={analysisJson} />
                    <input type="hidden" name="status" value={status} />

                    {/* Input file ẩn để gửi ảnh */}
                    <div className="hidden">
                        <input
                            type="file"
                            name="images"
                            multiple
                            accept="image/*"
                            ref={fileInputRef}
                            onChange={handleImageChange}
                        />
                    </div>

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

                    <div className="space-y-2">
                        <Label className="text-xs font-black text-slate-500 uppercase tracking-widest">Ghi chú & Kết quả đo</Label>
                        <Textarea
                            name="result_data_text"
                            rows={4}
                            value={resultText}
                            onChange={(e) => setResultText(e.target.value)}
                            className="text-sm font-medium border-slate-200 rounded-xl bg-slate-50 focus:bg-white transition-colors"
                            placeholder="Thông tin chi tiết về hiện trạng..."
                        />
                    </div>

                    {/* --- KHU VỰC UPLOAD ẢNH --- */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-black text-slate-500 uppercase tracking-widest">Ảnh hiện trạng công trình</Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                className="h-8 border-dashed border-slate-300 text-blue-600 hover:bg-blue-50"
                            >
                                <Camera className="w-3.5 h-3.5 mr-2" /> Thêm ảnh
                            </Button>
                        </div>

                        {selectedImages.length > 0 ? (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                {selectedImages.map((img, index) => (
                                    <div key={index} className="relative aspect-square group rounded-lg overflow-hidden border border-white shadow-sm">
                                        <Image
                                            src={img.preview}
                                            alt="Preview"
                                            fill
                                            className="object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(index)}
                                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg hover:bg-white hover:border-blue-400 transition-all text-slate-400 hover:text-blue-500"
                                >
                                    <ImagePlus className="w-6 h-6 mb-1" />
                                    <span className="text-[8px] font-bold uppercase">Thêm</span>
                                </button>
                            </div>
                        ) : (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="py-8 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 cursor-pointer transition-colors"
                            >
                                <ImagePlus className="w-8 h-8 mb-2 opacity-20" />
                                <p className="text-[10px] font-medium uppercase tracking-widest">Bấm để chọn hoặc chụp ảnh</p>
                            </div>
                        )}
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