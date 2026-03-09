"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateSurveyTaskResult } from "@/lib/action/surveyActions";
import { useActionState } from 'react';
import { useFormStatus } from "react-dom";
import { Loader2, Edit3, Compass, Sparkles, Home, CheckCircle2, X, ImagePlus, Camera, Eye, FileText, AlertTriangle, Crosshair } from "lucide-react";
import FengShuiCompass from "./FengShuiCompass";
import { toast } from "sonner";
import Image from "next/image";
import { evaluateFengShui, generateFengShuiReportText, type FullFengShuiAnalysis, LOAN_DAU_DICTIONARY, generateLoanDauReportText } from "@/lib/utils/fengShui";
import { calculateFlyingStars, calculateThanSat, type FlyingStarResult, type ThanSatResult } from "@/lib/utils/advancedFengShui";

function SubmitResultButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto font-bold shadow-lg shadow-blue-200 min-w-[150px]">
            {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang lưu...</> : "Xác nhận & Lưu kết quả"}
        </Button>
    );
}

const COMPANY_NAME = "CÔNG TY TNHH TM DV XÂY DỰNG KIỀU GIA";

export default function SurveyResultModal({ task, projectId, projectCode = "", projectName = "", onUpdateSuccess }: any) {
    const [isOpen, setIsOpen] = useState(false);
    const [showCompass, setShowCompass] = useState(false);
    const [isViewMode, setIsViewMode] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const [ownerName, setOwnerName] = useState<string>("");
    const [birthYear, setBirthYear] = useState<number>(1990);
    const [buildYear, setBuildYear] = useState<number>(new Date().getFullYear());
    const [gender, setGender] = useState<'nam' | 'nu'>('nam');
    const [resultText, setResultText] = useState<string>("");
    const [status, setStatus] = useState<string>("completed");
    const [cost, setCost] = useState<number>(0);
    const [analysisJson, setAnalysisJson] = useState<string>("");

    // State Dữ liệu Cao cấp
    const [fsAnalysis, setFsAnalysis] = useState<FullFengShuiAnalysis | null>(null);
    const [selectedLoanDau, setSelectedLoanDau] = useState<string[]>([]);
    const [flyingStars, setFlyingStars] = useState<Record<string, FlyingStarResult> | null>(null);
    const [thanSat, setThanSat] = useState<ThanSatResult[] | null>(null);

    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [selectedImages, setSelectedImages] = useState<{ file: File, preview: string }[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const reportRef = useRef<HTMLDivElement>(null);

    // Phân loại Task
    const isFengShuiTask = task?.title?.toUpperCase().includes("HƯỚNG") || task?.title?.toUpperCase().includes("PHONG THỦY");
    const isLoanDauTask = task?.title?.toUpperCase().includes("LOAN ĐẦU") || task?.title?.toUpperCase().includes("CẢNH QUAN");

    useEffect(() => {
        if (isOpen) {
            const isCompleted = task?.status === 'completed';
            setIsViewMode(isCompleted);

            if (task?.result_data?.analysis) {
                const data = task.result_data.analysis;
                if (data.owner) {
                    setOwnerName(data.owner.name || "");
                    setBirthYear(data.owner.birthYear || 1990);
                    setBuildYear(data.owner.buildYear || new Date().getFullYear());
                    setGender(data.owner.gender || 'nam');
                }
                setFsAnalysis(data.fengshui || null);
                setFlyingStars(data.flyingStars || null);
                setThanSat(data.thanSat || null);
                if (data.loanDau) setSelectedLoanDau(data.loanDau);

                setAnalysisJson(JSON.stringify(data));
            }
            setResultText(task?.notes || "");
            setStatus(task?.status || "completed");
            setCost(task?.cost || 0);
            setExistingImages(task?.attachments || []);
            setSelectedImages([]);
        }
    }, [isOpen, task]);

    const getMetaData = async (): Promise<string> => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) return resolve(`🕒 Thời gian: ${new Date().toLocaleString('vi-VN')}`);
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve(`📍 Tọa độ: ${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}\n🕒 Thời gian: ${new Date().toLocaleString('vi-VN')}`),
                () => resolve(`🕒 Thời gian: ${new Date().toLocaleString('vi-VN')}`),
                { enableHighAccuracy: true }
            );
        });
    };

    const wrappedAction = async (state: any, formData: FormData) => {
        const taskId = task?.id || task?._id;
        if (!taskId) return { success: false, message: "ID không hợp lệ" };

        let finalAnalysisJson = analysisJson;
        if (isLoanDauTask) {
            let currentData = {};
            try { currentData = analysisJson ? JSON.parse(analysisJson) : {}; } catch (e) { }
            (currentData as any).loanDau = selectedLoanDau;
            finalAnalysisJson = JSON.stringify(currentData);
        }

        formData.delete('taskId'); formData.delete('projectId'); formData.delete('analysis_json'); formData.delete('status'); formData.delete('images');
        formData.append('taskId', String(taskId));
        formData.append('projectId', String(projectId || ""));
        formData.append('status', status);
        formData.append('analysis_json', finalAnalysisJson || "");
        formData.append('existing_attachments', JSON.stringify(existingImages));
        selectedImages.forEach((item) => formData.append('images', item.file));
        return updateSurveyTaskResult(state, formData);
    };

    const [state, formAction] = useActionState(wrappedAction as any, { success: false, message: "" });

    // HÀM XUẤT PDF
    const handleExportPDF = async () => {
        if (!reportRef.current) return;
        setIsExporting(true);
        const toastId = toast.loading("Đang xuất file PDF chuẩn ISO...");

        try {
            const html2pdf = (await import('html2pdf.js')).default;
            const element = reportRef.current;
            const opt = {
                margin: [15, 10, 20, 10] as [number, number, number, number],
                filename: `BM_KS_${projectCode || 'DA'}_${task?.title?.replace(/\s+/g, '_')}.pdf`,
                image: { type: 'jpeg' as const, quality: 1 },
                html2canvas: { scale: 4, useCORS: true, letterRendering: true, windowWidth: 800, width: 794 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
            };

            await (html2pdf().set(opt).from(element).toPdf().get('pdf').then((pdf: any) => {
                const totalPages = pdf.internal.getNumberOfPages();
                for (let i = 1; i <= totalPages; i++) {
                    pdf.setPage(i);
                    pdf.setFontSize(9);
                    pdf.setTextColor(100);
                    pdf.text(`Trang: ${i}/${totalPages}`, pdf.internal.pageSize.getWidth() / 2, pdf.internal.pageSize.getHeight() - 10, { align: 'center' });
                }
                return pdf;
            }) as any).save();

            toast.success("Thành công!", { id: toastId });
        } catch (error) {
            toast.error("Lỗi xuất PDF", { id: toastId });
        } finally {
            setIsExporting(false);
        }
    };

    const processImageWithWatermark = async (file: File): Promise<File> => {
        const meta = await getMetaData();
        const textLines = [COMPANY_NAME, `Dự án: ${projectCode ? `${projectCode} - ` : ""}${projectName || "N/A"}`, ...meta.split('\n')];
        return new Promise((resolve) => {
            const reader = new FileReader(); reader.readAsDataURL(file);
            reader.onload = (e) => {
                const img = new window.Image(); img.src = e.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
                    if (!ctx) return resolve(file);
                    const MAX_WIDTH = 1600; let w = img.width, h = img.height;
                    if (w > MAX_WIDTH) { h = (MAX_WIDTH / w) * h; w = MAX_WIDTH; }
                    canvas.width = w; canvas.height = h; ctx.drawImage(img, 0, 0, w, h);
                    const fs = Math.max(w / 40, 20); ctx.font = `bold ${fs}px Arial`;
                    const pad = 20, lh = fs + 10, rh = (textLines.length * lh) + pad;
                    ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; ctx.fillRect(0, h - rh, w, rh);
                    ctx.fillStyle = "white"; ctx.textBaseline = "top";
                    textLines.forEach((l, i) => ctx.fillText(l, pad, h - rh + pad + (i * lh)));
                    canvas.toBlob((blob) => {
                        if (blob) resolve(new File([blob], file.name || `photo_${Date.now()}.jpg`, { type: "image/jpeg" }));
                        else resolve(file);
                    }, "image/jpeg", 0.8);
                };
            };
        });
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const tId = toast.loading("Đang xử lý ảnh (GPS & Watermark)...");
            const files = Array.from(e.target.files);
            const processed: { file: File; preview: string }[] = [];
            try {
                for (const file of files) {
                    const stamped = await processImageWithWatermark(file);
                    processed.push({ file: stamped, preview: URL.createObjectURL(stamped) });
                }
                setSelectedImages(prev => [...prev, ...processed]);
                toast.success("Đóng dấu thành công!", { id: tId });
            } catch (err) { toast.error("Lỗi xử lý ảnh", { id: tId }); }
        }
    };

    const removeNewImage = (i: number) => { setSelectedImages(p => { const u = [...p]; URL.revokeObjectURL(u[i].preview); u.splice(i, 1); return u; }); };
    const removeExistingImage = (i: number) => { setExistingImages(p => { const u = [...p]; u.splice(i, 1); return u; }); };

    useEffect(() => {
        if (state.success && isOpen) {
            setIsOpen(false); setSelectedImages([]); onUpdateSuccess(status);
            toast.success("Đã lưu kết quả thành công!");
        } else if (state.message && !state.success) { toast.error(state.message); }
    }, [state.success, state.message, isOpen, onUpdateSuccess, status]);

    const handleCompassSave = (data: any) => {
        const fsResult = evaluateFengShui(birthYear, gender, data.heading);
        setFsAnalysis(fsResult);

        const fsFlyingStars = calculateFlyingStars(buildYear, data.heading);
        const fsThanSat = calculateThanSat(data.heading, birthYear);

        setFlyingStars(fsFlyingStars);
        setThanSat(fsThanSat);

        const fullReport = generateFengShuiReportText(ownerName, birthYear, gender, fsResult);
        setResultText(fullReport);

        setAnalysisJson(JSON.stringify({
            owner: { name: ownerName, birthYear, buildYear, gender },
            compass: data,
            fengshui: fsResult,
            flyingStars: fsFlyingStars,
            thanSat: fsThanSat,
            generated_at: new Date().toISOString()
        }));
        setShowCompass(false);
        toast.success("Đã phân tích Bát Trạch, Phi Tinh & Thần Sát!");
    };

    // HÀM RENDER KHỐI PHI TINH & THẦN SÁT
    const renderAdvancedFengShui = () => {
        if (!flyingStars || !thanSat) return null;
        return (
            // ✅ ĐÃ SỬA: Xóa bỏ style={{ pageBreakInside: 'avoid' }} ở thẻ div ngoài cùng
            // Để cho phép khối này tự động đứt gãy lấp đầy trang
            <div className="mt-8 bg-slate-50 p-5 rounded-2xl border border-slate-200">

                {/* 1. KHỐI TRẬN ĐỒ 9 Ô (Khối này bắt buộc bọc avoid để cái bảng không bị cắt ngang làm đôi) */}
                <div style={{ pageBreakInside: 'avoid' }}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-black text-indigo-700 uppercase tracking-widest flex items-center gap-2">
                            <Sparkles className="w-5 h-5" /> Trận Đồ Huyền Không Phi Tinh
                        </h3>
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">
                            Nhà Vận {flyingStars['CENTER']?.period || 9} (Xây năm {buildYear})
                        </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 aspect-square max-w-sm mx-auto mb-6">
                        {['SE', 'S', 'SW', 'E', 'CENTER', 'W', 'NE', 'N', 'NW'].map((dirId, idx) => {
                            const starData = flyingStars[dirId];
                            if (!starData) return <div key={idx} />;
                            const isCenter = dirId === 'CENTER';
                            // ✅ TỪ ĐIỂN VIỆT HÓA TÊN CUNG
                            const dirNamesVi: Record<string, string> = {
                                'NW': 'Tây Bắc', 'N': 'Bắc', 'NE': 'Đông Bắc',
                                'W': 'Tây', 'CENTER': 'Trung Cung', 'E': 'Đông',
                                'SW': 'Tây Nam', 'S': 'Nam', 'SE': 'Đông Nam'
                            };
                            return (
                                <div key={idx} className={`relative flex flex-col items-center justify-center p-2 border-2 rounded-xl shadow-sm ${isCenter ? 'bg-indigo-100 border-indigo-300' : 'bg-white border-slate-200'}`}>
                                    <span className="absolute top-1 left-2 text-sm font-black text-slate-800">{starData.mountainStar}</span>
                                    <span className={`absolute top-1 right-2 text-sm font-black ${starData.waterStar === 9 ? 'text-red-600 animate-pulse' : 'text-blue-600'}`}>{starData.waterStar}</span>
                                    <span className="text-xl font-bold text-slate-300 mt-4">{starData.baseStar}</span>
                                    <span className="absolute bottom-1 text-[8px] font-bold text-slate-400 uppercase tracking-widest">{dirNamesVi[dirId]}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 2. KHỐI THẦN SÁT (Cho phép tự do trôi sang trang sau để lấp khoảng trống) */}
                <div className="pt-5 border-t border-slate-200">
                    <h4 className="text-xs font-black text-slate-700 uppercase mb-3 flex items-center gap-2" style={{ pageBreakInside: 'avoid' }}>
                        <Crosshair className="w-4 h-4 text-amber-600" /> Tọa độ Thần Sát (Cắt cổng, Mở cửa)
                    </h4>
                    <div className="space-y-2">
                        {thanSat.map((item, idx) => (
                            // ✅ ĐÃ SỬA: Chỉ bọc avoid cho từng Thẻ thông tin nhỏ
                            <div key={idx} className={`flex items-start gap-3 p-3 border rounded-lg ${item.isGood ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`} style={{ pageBreakInside: 'avoid' }}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black shrink-0 text-xs text-center leading-tight ${item.isGood ? 'bg-amber-200 text-amber-700' : 'bg-red-200 text-red-700'}`}>
                                    {item.type.includes("Sát") || item.type.includes("Vong") ? "SÁT" : "CÁT"}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-800">{item.type}: <span className="text-red-600">{item.degree}</span></p>
                                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        );
    };

    // Kiểm tra xem ghi chú có phải là text tự động không
    const hasManualNotes = task?.notes && !task.notes.includes("[BÁO CÁO PHONG THỦY") && !task.notes.includes("[BÁO CÁO KHẢO SÁT LOAN ĐẦU");
    const isCompleted = task?.status === 'completed';

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className={`gap-2 h-8 transition-all ${task?.status === 'completed' ? 'border-blue-200 bg-blue-50/50 text-blue-700' : 'border-green-200 bg-green-50/50 text-green-700'}`}>
                    {task?.status === 'completed' ? <><Eye className="h-3.5 w-3.5" /> Xem kết quả</> : <><Edit3 className="h-3.5 w-3.5" /> Ghi kết quả</>}
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-2xl max-h-[95vh] overflow-y-auto !p-0 gap-0 border-none shadow-2xl bg-slate-50">

                {/* ================= PDF TEMPLATE (HIDDEN) ================= */}
                <div style={{ position: 'absolute', top: 0, left: 0, opacity: 0, pointerEvents: 'none', zIndex: -50 }}>
                    <div ref={reportRef} className="bg-white text-slate-900 font-sans" style={{ width: '794px', minHeight: '1123px', padding: '40px', boxSizing: 'border-box' }}>
                        {/* ✅ HEADER */}
                        <table className="w-full mb-8 border-collapse border border-slate-900" style={{ tableLayout: 'fixed', width: '100%', pageBreakInside: 'avoid' }}>
                            <tbody>
                                <tr>
                                    <td className="w-[20%] p-2 border border-slate-900 text-center align-middle">
                                        <img src="/images/logo.png" alt="Logo" style={{ maxHeight: '150px', margin: '0 auto', objectFit: 'contain' }} crossOrigin="anonymous" />
                                    </td>
                                    <td className="w-[50%] p-2 border border-slate-900 text-center align-middle overflow-hidden">
                                        <h1 className="text-lg font-black text-blue-900 uppercase tracking-widest leading-tight">{COMPANY_NAME}</h1>
                                        <p className="text-xs font-bold text-slate-600 mt-1 uppercase">Hồ sơ khảo sát & Tư vấn thiết kế</p>
                                    </td>
                                    <td className="w-[30%] p-3 border border-slate-900 text-[11px] text-slate-800 align-middle">
                                        <div className="flex justify-between items-center border-b border-slate-300 pb-1 mb-1 gap-2">
                                            <span className="shrink-0">Mã DA:</span><span className="font-bold text-blue-900 text-right text-[10px] leading-normal">{projectCode || "N/A"}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-slate-300 pb-1 mb-1 gap-2">
                                            <span className="shrink-0">Ngày lập:</span><span className="font-bold text-right leading-normal">{new Date().toLocaleDateString('vi-VN')}</span>
                                        </div>
                                        <div className="flex justify-between items-center gap-2">
                                            <span className="shrink-0">Mã số BM:</span><span className="font-bold text-right leading-normal">BM-KS-01</span>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <div className="text-center mb-8" style={{ pageBreakInside: 'avoid' }}>
                            <h2 className="text-[22px] font-black uppercase text-red-700 tracking-wide mb-2">{task?.title || "BÁO CÁO KHẢO SÁT HIỆN TRẠNG"}</h2>
                            <p className="text-sm font-bold text-slate-800 bg-slate-100 inline-block px-5 py-2 rounded-full border border-slate-300 shadow-sm break-words max-w-full">
                                Dự án: {projectName || "Tên dự án chưa được cập nhật"}
                            </p>
                        </div>

                        {/* RENDER BÁT TRẠCH & CỬU CUNG */}
                        {fsAnalysis && (
                            <>
                                {/* KHỐI I: Để chảy tự nhiên (Không dùng avoid bọc ngoài) */}
                                <div className="mb-6">
                                    <h3 className="text-sm font-bold text-white bg-blue-900 px-3 py-1.5 uppercase mb-2 inline-block rounded-t-md">I. KẾT QUẢ ĐO VÀ PHÂN TÍCH THỰC ĐỊA</h3>
                                    <div className="border border-blue-900/20 p-4 rounded-b-md rounded-tr-md bg-blue-50/30 text-sm space-y-4">
                                        <div className="grid grid-cols-2 gap-y-2 gap-x-8">
                                            <p><strong>Gia chủ:</strong> {ownerName || "Đang cập nhật"}</p><p><strong>Năm sinh:</strong> {birthYear} ({gender === 'nam' ? 'Nam' : 'Nữ'})</p>
                                            <p><strong>Cung mệnh:</strong> <span className="text-red-700 font-bold">{fsAnalysis.cung}</span></p><p><strong>Nhóm mệnh:</strong> <span className="text-red-700 font-bold">{fsAnalysis.nhom}</span></p>
                                        </div>
                                        <div className="pt-3 border-t border-blue-900/10">
                                            <p className="text-blue-900 font-bold mb-1">1. Luận giải Cung Sao:</p>
                                            <ul className="list-disc list-inside ml-2 space-y-1 text-slate-800">
                                                <li><strong>Hướng đo:</strong> {fsAnalysis.currentDirection.name} ({fsAnalysis.currentDirection.degree}°)</li>
                                                <li><strong>Cung Sao:</strong> <span className={fsAnalysis.currentDirection.isGood ? 'text-green-700 font-bold' : 'text-red-700 font-bold'}>{fsAnalysis.currentDirection.star} ({fsAnalysis.currentDirection.isGood ? 'CÁT' : 'HUNG'})</span></li>
                                                <li><strong>Luận giải:</strong> {fsAnalysis.currentDirection.desc}</li>
                                            </ul>
                                        </div>
                                        {fsAnalysis?.currentDirection?.climateAnalysis && (
                                            <div className="pt-3 border-t border-blue-900/10">
                                                <p className="text-blue-900 font-bold mb-1">2. Phân tích Vi khí hậu (Nắng & Gió):</p>
                                                <div className="italic text-slate-800 leading-normal whitespace-pre-line text-[12px]">{fsAnalysis.currentDirection.climateAnalysis}</div>
                                            </div>
                                        )}
                                        {fsAnalysis?.currentDirection?.remedy && (
                                            <div className="pt-3 border-t border-blue-900/10">
                                                <p className="text-blue-900 font-bold mb-1">3. Lời khuyên & Hóa giải:</p>
                                                <div className="text-slate-800 font-medium leading-normal whitespace-pre-line text-[12px]">{fsAnalysis.currentDirection.remedy}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* KHỐI II: Bảng Bát Trạch */}
                                <div className="mb-8">
                                    <h3 className="text-sm font-bold text-white bg-blue-900 px-3 py-1.5 uppercase mb-2 inline-block rounded-t-md">II. CHI TIẾT 8 HƯỚNG BÁT TRẠCH</h3>
                                    <table className="w-full border-collapse border border-slate-400 text-xs" style={{ tableLayout: 'fixed', width: '100%' }}>
                                        <thead>
                                            <tr className="bg-slate-200 text-slate-900">
                                                <th className="border border-slate-400 p-2 text-center" style={{ width: '15%' }}>Hướng</th><th className="border border-slate-400 p-2 text-center" style={{ width: '20%' }}>Cung Sao</th>
                                                <th className="border border-slate-400 p-2 text-center" style={{ width: '15%' }}>Đánh giá</th><th className="border border-slate-400 p-2 text-left" style={{ width: '50%' }}>Gợi ý bố trí công năng</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {fsAnalysis.allDirections.map((d, idx) => (
                                                /* TR giữ avoid để chữ trong hàng không bị cắt làm đôi */
                                                <tr key={idx} className="text-center" style={{ pageBreakInside: 'avoid' }}>
                                                    <td className="border border-slate-400 p-2 font-bold bg-slate-50 break-words">{d.dirName} ({d.degree}°)</td>
                                                    <td className={`border border-slate-400 p-2 font-bold ${d.type === 'good' ? 'text-green-700' : 'text-red-700'} break-words`}>{d.star}</td>
                                                    <td className="border border-slate-400 p-2 font-bold">{d.type === 'good' ? 'CÁT' : 'HUNG'}</td>
                                                    <td className="border border-slate-400 p-2 text-left whitespace-normal break-words leading-relaxed">{d.type === 'good' ? 'Cửa chính, Ban thờ, Phòng ngủ, Phòng khách' : 'Nhà vệ sinh, Kho chứa đồ, Bếp (Tọa hung hướng cát)'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* KHỐI III: Sơ đồ Cửu Cung */}
                                <div className="mb-10 pb-4">
                                    <h3 className="text-sm font-bold text-white bg-blue-900 px-3 py-1.5 uppercase mb-4 inline-block rounded-t-md" style={{ pageBreakInside: 'avoid' }}>III. SƠ ĐỒ CỬU CUNG BỐ TRÍ MẶT BẰNG</h3>
                                    {/* ✅ Đã bỏ h-[350px] để khối tự động co giãn, không bị tràn đè chữ */}
                                    <div className="border border-slate-300 bg-slate-50 rounded-xl p-4 max-w-[400px] mx-auto" style={{ pageBreakInside: 'avoid' }}>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['NW', 'N', 'NE', 'W', 'CENTER', 'E', 'SW', 'S', 'SE'].map((dirId, idx) => {
                                                if (dirId === 'CENTER') {
                                                    return (
                                                        <div key={idx} className="flex flex-col items-center justify-center p-4 bg-amber-100 border-2 border-amber-300 rounded-lg">
                                                            <span className="font-black text-amber-800 text-xs">TRUNG CUNG</span><span className="text-[9px] text-amber-700 text-center mt-1 font-medium">Lõi giao thông<br />Giếng trời</span>
                                                        </div>
                                                    );
                                                }
                                                const dirData = fsAnalysis?.allDirections?.find(d => d.dirId === dirId);
                                                if (!dirData) return <div key={idx} />;
                                                const isGood = dirData.type === 'good';
                                                return (
                                                    <div key={idx} className={`flex flex-col items-center justify-center p-3 border-2 rounded-lg ${isGood ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                                                        <span className="text-[10px] font-bold text-slate-600 uppercase">{dirData.dirName}</span>
                                                        <span className={`font-black text-xs uppercase text-center mt-1 ${isGood ? 'text-green-700' : 'text-red-700'}`}>{dirData.star}</span>
                                                        <span className="text-[9px] text-slate-800 text-center mt-1.5 font-medium whitespace-pre-line leading-relaxed">{isGood ? 'Cửa chính\nPhòng thờ\nPhòng ngủ' : 'Nhà vệ sinh\nPhòng Kho\nBếp (Tọa)'}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <p className="text-center text-[11px] text-slate-600 font-medium italic mt-4" style={{ pageBreakInside: 'avoid' }}>Sơ đồ ma trận 9 ô (Cửu cung) giúp định vị sơ bộ các khối chức năng trên mặt bằng khu đất.</p>
                                </div>
                            </>
                        )}

                        {/* RENDER PHI TINH TRONG PDF */}
                        {flyingStars && thanSat && (
                            <div className="mb-10 pb-4">
                                {renderAdvancedFengShui()}
                            </div>
                        )}

                        {/* LOAN ĐẦU TRONG PDF */}
                        {isLoanDauTask && selectedLoanDau.length > 0 && (
                            <div className="mb-10 pb-4">
                                <h3 className="text-sm font-bold text-white bg-emerald-700 px-3 py-1.5 uppercase mb-4 inline-block rounded-t-md" style={{ pageBreakInside: 'avoid' }}>I. KHẢO SÁT LOAN ĐẦU (CẢNH QUAN)</h3>
                                <div className="space-y-4">
                                    {selectedLoanDau.map((id, index) => {
                                        const item = LOAN_DAU_DICTIONARY.find(d => d.id === id);
                                        if (!item) return null;
                                        return (
                                            <div key={id} className="border border-emerald-700/20 p-4 rounded-xl bg-emerald-50/50 text-sm" style={{ pageBreakInside: 'avoid' }}>
                                                <p className="font-black text-emerald-800 mb-2 uppercase">{index + 1}. {item.name}</p>
                                                <p className="text-slate-700 mb-1.5 leading-relaxed"><strong>Hiện trạng:</strong> {item.desc}</p>
                                                <p className="text-amber-700 font-medium leading-relaxed"><strong>Giải pháp:</strong> {item.remedy}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ẨN GHI CHÚ TEXT THÔ TRONG PDF, CHỈ HIỆN GHI CHÚ TỰ GÕ HOẶC TASK BÌNH THƯỜNG */}
                        {(!isFengShuiTask && !isLoanDauTask) || hasManualNotes ? (
                            <div className="mb-10 pb-4" style={{ pageBreakInside: 'avoid' }}>
                                <h3 className="text-sm font-bold bg-blue-900 text-white px-3 py-1.5 uppercase mb-2 inline-block rounded-t-md">
                                    Ghi chú bổ sung
                                </h3>
                                <div className="border border-slate-400 p-4 text-sm leading-relaxed min-h-[60px] bg-slate-50/50 rounded-b-md rounded-tr-md">
                                    {task?.notes?.split('\n').map((line: string, index: number) => (
                                        <p key={index} style={{ marginBottom: '4px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                            {line || '\u00A0'}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {/* SECTION ẢNH PDF */}
                        {existingImages.length > 0 && (
                            <div className="mb-6">
                                <h3 className="text-sm font-bold bg-blue-900 text-white px-3 py-1.5 uppercase mb-4 inline-block rounded-t-md" style={{ pageBreakInside: 'avoid' }}>
                                    {isLoanDauTask || !fsAnalysis ? "II. HÌNH ẢNH HIỆN TRẠNG THỰC ĐỊA" : "IV. HÌNH ẢNH HIỆN TRẠNG THỰC ĐỊA"}
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {existingImages.map((url, i) => (
                                        <div key={i} className="rounded-md border border-slate-400 bg-slate-100 flex items-center justify-center p-1 overflow-hidden" style={{ height: '280px', pageBreakInside: 'avoid' }}>
                                            <img src={url} alt={`Hiện trạng ${i + 1}`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} crossOrigin="anonymous" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {/* ================= KẾT THÚC PDF TEMPLATE ================= */}

                {/* ================= GIAO DIỆN APP HIỂN THỊ ================= */}
                <div className={`p-6 text-white shrink-0 relative overflow-hidden ${isViewMode ? (isLoanDauTask ? 'bg-emerald-700' : 'bg-blue-700') : 'bg-slate-900'}`}>
                    <DialogTitle className="text-xl font-black uppercase flex items-center gap-3 relative z-10">
                        {isViewMode ? 'Chi tiết kết quả' : task?.title}
                    </DialogTitle>
                </div>

                {isViewMode ? (
                    <div className="p-6 space-y-6">

                        {/* ================= BÁT TRẠCH UI ================= */}
                        {fsAnalysis && (
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-3 opacity-5"><Compass size={100} /></div>
                                <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" /> KẾT QUẢ ĐO & PHÂN TÍCH THỰC ĐỊA
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-10 mb-5">
                                    <div><p className="text-[10px] text-slate-400 uppercase font-bold">Gia chủ</p><p className="font-black text-slate-800">{ownerName}</p></div>
                                    <div><p className="text-[10px] text-slate-400 uppercase font-bold">Năm sinh</p><p className="font-black text-slate-800">{birthYear} ({gender === 'nam' ? 'Nam' : 'Nữ'})</p></div>
                                    <div><p className="text-[10px] text-slate-400 uppercase font-bold">Cung Mệnh</p><p className="font-black text-blue-600">{fsAnalysis.cung} ({fsAnalysis.nhom})</p></div>
                                    <div><p className="text-[10px] text-slate-400 uppercase font-bold">Hướng nhà</p><p className="font-black text-blue-600">{fsAnalysis.currentDirection.name} ({fsAnalysis.currentDirection.degree}°)</p></div>
                                </div>
                                <div className="space-y-3 relative z-10">
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">1. Cung Sao & Luận giải</p>
                                        <p className="text-sm font-medium text-slate-800">
                                            <span className={fsAnalysis.currentDirection.isGood ? 'text-green-600 font-black' : 'text-red-600 font-black'}>{fsAnalysis.currentDirection.star} ({fsAnalysis.currentDirection.isGood ? 'CÁT' : 'HUNG'})</span> - {fsAnalysis.currentDirection.desc}
                                        </p>
                                    </div>
                                    {fsAnalysis?.currentDirection?.climateAnalysis && (
                                        <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                                            <p className="text-[10px] text-blue-600 uppercase font-bold mb-1">2. Phân tích Vi khí hậu</p>
                                            <div className="text-[13px] text-slate-700 italic font-medium whitespace-pre-line leading-relaxed">{fsAnalysis.currentDirection.climateAnalysis}</div>
                                        </div>
                                    )}
                                    {fsAnalysis?.currentDirection?.remedy && (
                                        <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                                            <p className="text-[10px] text-amber-600 uppercase font-bold mb-1">3. Lời khuyên & Hóa giải</p>
                                            <div className="text-[13px] text-amber-900 font-medium whitespace-pre-line leading-relaxed">{fsAnalysis.currentDirection.remedy}</div>
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 bg-slate-100/80 rounded-xl border border-slate-200 mt-4">
                                    <p className="text-[11px] text-slate-500 uppercase font-black mb-3 text-center tracking-widest">Sơ đồ Cửu Cung gợi ý định vị công năng</p>
                                    <div className="grid grid-cols-3 gap-2 aspect-square max-w-sm mx-auto">
                                        {['NW', 'N', 'NE', 'W', 'CENTER', 'E', 'SW', 'S', 'SE'].map((dirId, idx) => {
                                            if (dirId === 'CENTER') {
                                                return (
                                                    <div key={idx} className="flex flex-col items-center justify-center p-1 bg-amber-100 border-2 border-amber-300 rounded-lg shadow-inner h-full relative overflow-hidden">
                                                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500 to-transparent"></div>
                                                        <span className="font-black text-amber-800 text-[10px] sm:text-xs z-10">TRUNG CUNG</span>
                                                        <span className="text-[8px] text-amber-700 text-center mt-1 leading-tight font-medium z-10">Giếng trời<br />Sảnh chung</span>
                                                    </div>
                                                );
                                            }
                                            const dirData = fsAnalysis?.allDirections?.find(d => d.dirId === dirId);
                                            if (!dirData) return <div key={idx} />;

                                            const isGood = dirData.type === 'good';
                                            return (
                                                <div key={idx} className={`flex flex-col items-center justify-center p-1 border rounded-lg shadow-sm h-full transition-all hover:scale-105 ${isGood ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                                                    <span className="text-[9px] font-bold text-slate-500 uppercase">{dirData.dirName}</span>
                                                    <span className={`font-black text-[10px] sm:text-xs uppercase text-center leading-tight mt-0.5 ${isGood ? 'text-green-700' : 'text-red-700'}`}>
                                                        {dirData.star}
                                                    </span>
                                                    <span className="text-[8px] text-slate-600 text-center mt-1 font-medium leading-tight px-1">
                                                        {isGood ? '🚪 Cửa, Thờ\n🛏️ Ngủ, Khách' : '🚽 WC, Kho\n🔥 Bếp'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* RENDER PHI TINH TRÊN MÀN HÌNH APP */}
                        {renderAdvancedFengShui()}

                        {/* ================= THẺ LOAN ĐẦU (VIEW MODE) ================= */}
                        {isLoanDauTask && selectedLoanDau.length > 0 && (
                            <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-sm relative overflow-hidden mb-6 mt-6">
                                <div className="absolute top-0 right-0 p-3 opacity-5"><Eye size={100} className="text-emerald-500" /></div>
                                <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10">
                                    <AlertTriangle className="w-4 h-4" /> CÁC HÌNH THẾ SÁT KHÍ PHÁT HIỆN
                                </h3>
                                <div className="grid grid-cols-1 gap-3 relative z-10">
                                    {selectedLoanDau.map(id => {
                                        const item = LOAN_DAU_DICTIONARY.find(d => d.id === id);
                                        if (!item) return null;
                                        return (
                                            <div key={id} className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                                                <p className="text-sm font-black text-emerald-900 mb-1.5">{item.name}</p>
                                                <p className="text-xs text-slate-700 mb-2 leading-relaxed"><strong>Hiện trạng:</strong> {item.desc}</p>
                                                <p className="text-xs text-amber-800 font-medium leading-relaxed bg-amber-100/50 p-2 rounded-lg border border-amber-200">
                                                    <strong>Hóa giải:</strong> {item.remedy}
                                                </p>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ✅ ẨN Ô TEXT THÔ NẾU LÀ TASK PHONG THỦY / LOAN ĐẦU (CHỈ HIỆN GHI CHÚ NẾU CÓ CHỈNH SỬA TAY HOẶC LÀ TASK KHÁC) */}
                        {(!isFengShuiTask && !isLoanDauTask) ? (
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mt-6">
                                <Label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">GHI CHÚ & KẾT QUẢ</Label>
                                <div className="text-[13px] text-slate-700 whitespace-pre-wrap leading-relaxed font-medium bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    {task?.notes || <span className="italic text-slate-400">Không có ghi chú nào được lưu.</span>}
                                </div>
                            </div>
                        ) : hasManualNotes ? (
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mt-6">
                                <Label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">GHI CHÚ BỔ SUNG</Label>
                                <div className="text-[13px] text-slate-700 whitespace-pre-wrap leading-relaxed font-medium bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    {task?.notes}
                                </div>
                            </div>
                        ) : null}

                        {/* SECTION ẢNH (VIEW MODE) */}
                        {existingImages.length > 0 && (
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mt-6">
                                <Label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">ẢNH HIỆN TRẠNG KÈM TỌA ĐỘ</Label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {existingImages.map((url: string, i: number) => (
                                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group shadow-sm hover:shadow-lg transition-all hover:-translate-y-1">
                                            <Image src={url} alt={`Ảnh ${i + 1}`} fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
                                            <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-all flex items-center justify-center">
                                                <Eye className="text-white opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 drop-shadow-md" />
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end pt-4 border-t border-slate-200 mt-6 gap-2">
                            <Button variant="ghost" onClick={() => setIsOpen(false)}>Đóng</Button>
                            <Button className="bg-red-600 hover:bg-red-700 text-white font-bold" onClick={handleExportPDF} disabled={isExporting}>
                                {isExporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />} Xuất PDF
                            </Button>
                            <Button className="bg-amber-500 hover:bg-amber-600 text-white font-bold" onClick={() => setIsViewMode(false)}>
                                <Edit3 className="w-4 h-4 mr-2" /> Chỉnh sửa
                            </Button>
                        </div>
                    </div>
                ) : (
                    // FORM NHẬP LIỆU (EDIT MODE)
                    <form action={formAction} className="p-6 space-y-6 bg-white">
                        <input type="hidden" name="taskId" value={task?.id || ""} />
                        <input type="hidden" name="projectId" value={projectId || ""} />
                        <input type="hidden" name="analysis_json" value={analysisJson} />
                        <input type="hidden" name="status" value={status} />
                        <input type="file" name="images" multiple accept="image/*" hidden ref={fileInputRef} onChange={handleImageChange} />

                        {isFengShuiTask && (
                            <div className="space-y-4 p-5 bg-orange-50/50 border border-orange-100 rounded-2xl shadow-inner">
                                <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-2 text-orange-800 font-bold text-sm"><Sparkles className="w-4 h-4 text-orange-500" /> NHẬP DATA GIA CHỦ & NHÀ</Label>
                                    <Button type="button" size="sm" className="bg-orange-600 hover:bg-orange-700 shadow-lg" onClick={() => setShowCompass(true)}><Compass className="mr-2 h-4 w-4" /> Đo La bàn</Button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5 md:col-span-2">
                                        <span className="text-[10px] font-black text-orange-600 uppercase">Họ tên gia chủ</span>
                                        <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="h-10 border-orange-200 font-bold" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] font-black text-orange-600 uppercase">Năm sinh AL</span>
                                        <Input type="number" value={birthYear} onChange={(e) => setBirthYear(Number(e.target.value))} className="h-10 border-orange-200 font-bold" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] font-black text-indigo-600 uppercase">Năm Nhập Trạch (Xây)</span>
                                        <Input type="number" value={buildYear} onChange={(e) => setBuildYear(Number(e.target.value))} className="h-10 border-indigo-200 font-bold text-indigo-700 bg-indigo-50" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] font-black text-orange-600 uppercase">Giới tính</span>
                                        <Select value={gender} onValueChange={(v: any) => setGender(v)}>
                                            <SelectTrigger className="h-10 border-orange-200 font-bold"><SelectValue /></SelectTrigger>
                                            <SelectContent><SelectItem value="nam">Nam giới</SelectItem><SelectItem value="nu">Nữ giới</SelectItem></SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {isLoanDauTask && (
                            <div className="space-y-4 p-5 bg-emerald-50/50 border border-emerald-100 rounded-2xl shadow-inner">
                                <Label className="flex items-center gap-2 text-emerald-800 font-bold text-sm mb-2">
                                    <Eye className="w-4 h-4 text-emerald-500" /> CHECKLIST KHẢO SÁT LOAN ĐẦU (CẢNH QUAN)
                                </Label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {LOAN_DAU_DICTIONARY.map(item => {
                                        const isChecked = selectedLoanDau.includes(item.id);
                                        return (
                                            <div
                                                key={item.id}
                                                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isChecked ? 'bg-emerald-100 border-emerald-400 shadow-sm' : 'bg-white border-slate-200 hover:border-emerald-200'}`}
                                                onClick={() => {
                                                    let newSelected = [...selectedLoanDau];
                                                    if (isChecked) newSelected = newSelected.filter(id => id !== item.id);
                                                    else newSelected.push(item.id);

                                                    setSelectedLoanDau(newSelected);
                                                    setResultText(generateLoanDauReportText(newSelected));
                                                }}
                                            >
                                                <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 ${isChecked ? 'bg-emerald-500 text-white' : 'bg-slate-100 border border-slate-300'}`}>
                                                    {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                                                </div>
                                                <div>
                                                    <p className={`text-xs font-bold ${isChecked ? 'text-emerald-900' : 'text-slate-700'}`}>{item.name}</p>
                                                    <p className="text-[10px] text-slate-500 mt-1 leading-tight line-clamp-2">{item.desc}</p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Ô NHẬP TEXT VẪN GIỮ ĐỂ DEV / KỸ SƯ CÓ THỂ COPY HOẶC GÕ THÊM */}
                        <div className="space-y-2">
                            <Label className="text-xs font-black text-slate-500 uppercase tracking-widest">
                                {isLoanDauTask || isFengShuiTask ? "Ghi chú & Data Ẩn (Sẽ bị ẩn khi Xem/In)" : "Ghi chú & Kết quả đo"}
                            </Label>
                            <Textarea name="result_data_text" rows={7} value={resultText} onChange={(e) => setResultText(e.target.value)} className="text-sm font-medium border-slate-200 rounded-xl bg-slate-50" />
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-black text-slate-500 uppercase tracking-widest">Ảnh đính kèm</Label>
                                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="h-8 border-dashed border-slate-300 text-blue-600 hover:bg-blue-50"><Camera className="w-3.5 h-3.5 mr-2" /> Thêm ảnh</Button>
                            </div>

                            {(existingImages.length > 0 || selectedImages.length > 0) ? (
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    {existingImages.map((url, i) => (
                                        <div key={`old-${i}`} className="relative aspect-square group rounded-lg overflow-hidden border border-white shadow-sm">
                                            <Image src={url} alt="Old" fill className="object-cover opacity-90" />
                                            <div className="absolute bottom-0 inset-x-0 bg-slate-900/60 text-white text-[8px] text-center py-0.5 font-bold uppercase tracking-widest">Đã lưu</div>
                                            <button type="button" onClick={() => removeExistingImage(i)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                                        </div>
                                    ))}
                                    {selectedImages.map((img, i) => (
                                        <div key={`new-${i}`} className="relative aspect-square group rounded-lg overflow-hidden border border-white shadow-sm">
                                            <Image src={img.preview} alt="Preview" fill className="object-cover" />
                                            <div className="absolute bottom-0 inset-x-0 bg-blue-600/80 text-white text-[8px] text-center py-0.5 font-bold uppercase tracking-widest">Mới</div>
                                            <button type="button" onClick={() => removeNewImage(i)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => fileInputRef.current?.click()} className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg hover:bg-white hover:border-blue-400 text-slate-400">
                                        <ImagePlus className="w-6 h-6 mb-1" /><span className="text-[8px] font-bold uppercase">Thêm</span>
                                    </button>
                                </div>
                            ) : (
                                <div onClick={() => fileInputRef.current?.click()} className="py-8 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 cursor-pointer">
                                    <Camera className="w-8 h-8 mb-2 opacity-20" /><p className="text-[10px] font-medium uppercase tracking-widest">Chưa có ảnh tải lên</p>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Trạng thái</Label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger className="h-10 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="pending">Đang xử lý</SelectItem><SelectItem value="completed">Hoàn thành</SelectItem></SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Chi phí (VNĐ)</Label>
                                <Input name="cost" type="number" value={cost} onChange={(e) => setCost(Number(e.target.value))} className="h-10 rounded-xl font-mono font-bold" />
                            </div>
                        </div>

                        <DialogFooter className="pt-4">
                            {isCompleted && <Button type="button" variant="outline" onClick={() => setIsViewMode(true)}>Hủy sửa</Button>}
                            <SubmitResultButton />
                        </DialogFooter>
                    </form>
                )}

                {showCompass && (
                    <div className="absolute inset-0 z-[100] bg-slate-950/98 flex items-center justify-center p-4">
                        <div className="w-full max-w-md flex flex-col items-center relative">
                            <Button variant="ghost" size="icon" className="absolute -top-12 right-0 text-white/50" onClick={() => setShowCompass(false)}><X className="h-8 w-8" /></Button>
                            <FengShuiCompass projectId={projectId} ownerName={ownerName} birthYear={birthYear} gender={gender} onSaveResult={handleCompassSave} />
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}