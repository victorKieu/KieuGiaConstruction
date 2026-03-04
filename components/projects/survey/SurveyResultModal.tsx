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
import { Loader2, Edit3, Compass, Sparkles, Home, CheckCircle2, X, User, ImagePlus, Camera, MapPin, CloudSun } from "lucide-react";
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
    const [selectedImages, setSelectedImages] = useState<{ file: File, preview: string }[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [state, formAction] = useActionState(updateSurveyTaskResult as any, {
        success: false,
        message: "",
        error: undefined
    });

    // ✅ HÀM MỚI: Lấy thông tin tọa độ và địa chỉ
    const getMetaData = async (): Promise<string> => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                resolve("Không hỗ trợ GPS");
                return;
            }

            navigator.geolocation.getCurrentPosition(async (pos) => {
                const lat = pos.coords.latitude.toFixed(6);
                const lng = pos.coords.longitude.toFixed(6);
                const time = new Date().toLocaleString('vi-VN');

                // Thêm thông tin thời tiết giả lập (hoặc gọi API nếu có key)
                const weather = "Nắng nhẹ, 28°C";

                // Thử lấy địa chỉ thô (Nếu sếp có Google API Key thì dùng Geocoding sẽ chuẩn hơn)
                // Ở đây ta ghi tọa độ để đảm bảo tính pháp lý trước
                resolve(`📍 Tọa độ: ${lat}, ${lng}\n☁️ Thời tiết: ${weather}\n🕒 Thời gian: ${time}`);
            }, (err) => {
                console.error(err);
                resolve(`🕒 Thời gian: ${new Date().toLocaleString('vi-VN')}`);
            }, { enableHighAccuracy: true });
        });
    };

    // ✅ FIX LỖI: Vẽ Watermark lên ảnh
    const processImageWithWatermark = async (file: File): Promise<File> => {
        const meta = await getMetaData();
        const textLines = [
            COMPANY_NAME,
            `Dự án: ${projectId}`,
            ...meta.split('\n')
        ];

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

                    // Giữ kích thước gốc
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);

                    // Cấu hình chữ
                    const fontSize = Math.max(canvas.width / 45, 18);
                    ctx.font = `bold ${fontSize}px Arial`;

                    const margin = fontSize;
                    const lineHeight = fontSize * 1.4;
                    const padding = 20;

                    // Tính toán chiều cao vùng đen
                    const rectHeight = (textLines.length * lineHeight) + (padding * 2);

                    // Vẽ dải đen mờ phía dưới
                    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
                    ctx.fillRect(0, canvas.height - rectHeight, canvas.width, rectHeight);

                    // Vẽ chữ lên trên dải đen
                    ctx.fillStyle = "white";
                    ctx.textBaseline = "top";
                    textLines.forEach((line, i) => {
                        ctx.fillText(line, padding, canvas.height - rectHeight + padding + (i * lineHeight));
                    });

                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(new File([blob], file.name, { type: "image/jpeg" }));
                        } else {
                            resolve(file);
                        }
                    }, "image/jpeg", 0.85);
                };
            };
        });
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const loadingToast = toast.loading("Đang đóng dấu thông tin tọa độ & công ty...");
            const filesArray = Array.from(e.target.files);
            const processedImages = [];

            try {
                for (const file of filesArray) {
                    const stampedFile = await processImageWithWatermark(file);
                    processedImages.push({
                        file: stampedFile,
                        preview: URL.createObjectURL(stampedFile)
                    });
                }
                setSelectedImages(prev => [...prev, ...processedImages]);
                toast.dismiss(loadingToast);
                toast.success(`Đã xử lý xong ${filesArray.length} ảnh!`);
            } catch (error) {
                toast.dismiss(loadingToast);
                toast.error("Lỗi khi xử lý ảnh");
            }
        }
    };

    const removeImage = (index: number) => {
        setSelectedImages(prev => {
            const updated = [...prev];
            URL.revokeObjectURL(updated[index].preview);
            updated.splice(index, 1);
            return updated;
        });
    };

    useEffect(() => {
        if (state.success && isOpen) {
            setIsOpen(false);
            setSelectedImages([]);
            onUpdateSuccess(status);
            toast.success("Đã lưu kết quả khảo sát thành công!");
        } else if (state.message && !state.success) {
            toast.error(state.message);
        }
    }, [state.success, state.message, isOpen, onUpdateSuccess, status]);

    const isFengShuiTask = task.title.toUpperCase().includes("HƯỚNG") || task.title.toUpperCase().includes("PHONG THỦY");

    const handleCompassSave = (data: any) => {
        const result = evaluateFengShui(birthYear, gender, data.heading);
        // ... (Giữ nguyên logic handleCompassSave cũ của sếp)
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

        const formattedText = `[BÁO CÁO PHONG THỦY GIA CHỦ: ${ownerName.toUpperCase()}]\nNăm sinh: ${birthYear} - Cung mệnh: ${result.cung} (${result.nhom})\n-----------------------------------------\n1. KẾT QUẢ ĐO HIỆN TẠI:\n- Hướng đo: ${result.currentDirection.name} (${data.heading}°)\n- Cung: ${result.currentDirection.star} -> Đánh giá: ${result.currentDirection.isGood ? 'TỐT (Nên dùng)' : 'XẤU (Cần hóa giải)'}\n\n2. CHI TIẾT 8 HƯỚNG BÁT TRẠCH:\n${listCongNang}\n-----------------------------------------\nGhi chú thêm: Hướng tốt (${tot}). Hướng xấu (${xau}).`;

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
                    <input type="hidden" name="taskId" value={task.id} />
                    <input type="hidden" name="projectId" value={projectId} />
                    <input type="hidden" name="analysis_json" value={analysisJson} />
                    <input type="hidden" name="status" value={status} />

                    {/* Input file ẩn */}
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

                    {/* KHU VỰC UPLOAD ẢNH CÓ WATERMARK */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-black text-slate-500 uppercase tracking-widest">Ảnh đính kèm (Có đóng dấu GPS)</Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                className="h-8 border-dashed border-slate-300 text-blue-600 hover:bg-blue-50"
                            >
                                <Camera className="w-3.5 h-3.5 mr-2" /> Chụp/Chọn ảnh
                            </Button>
                        </div>

                        {selectedImages.length > 0 ? (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                {selectedImages.map((img, index) => (
                                    <div key={index} className="relative aspect-square group rounded-lg overflow-hidden border border-white shadow-sm">
                                        <Image src={img.preview} alt="Preview" fill className="object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(index)}
                                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg text-slate-400"
                                >
                                    <ImagePlus className="w-6 h-6 mb-1" />
                                    <span className="text-[8px] font-bold">THÊM</span>
                                </button>
                            </div>
                        ) : (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="py-8 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 cursor-pointer"
                            >
                                <Camera className="w-8 h-8 mb-2 opacity-20" />
                                <p className="text-[10px] font-medium uppercase tracking-widest text-center">Bấm để chụp ảnh hiện trạng<br />(Tự động chèn tọa độ & công ty)</p>
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
                    <div className="absolute inset-0 z-[100] bg-slate-950/98 backdrop-blur-md flex items-center justify-center p-4">
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
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}