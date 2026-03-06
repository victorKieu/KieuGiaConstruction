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
import { Loader2, Edit3, Compass, Sparkles, Home, CheckCircle2, X, User, ImagePlus, Camera, Eye, FileText } from "lucide-react";
import FengShuiCompass from "./FengShuiCompass";
import { toast } from "sonner";
import Image from "next/image";
import { evaluateFengShui, generateFengShuiReportText, type FullFengShuiAnalysis } from "@/lib/utils/fengShui";
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
    const [gender, setGender] = useState<'nam' | 'nu'>('nam');
    const [resultText, setResultText] = useState<string>("");
    const [status, setStatus] = useState<string>("completed");
    const [cost, setCost] = useState<number>(0);
    const [analysisJson, setAnalysisJson] = useState<string>("");
    const [fsAnalysis, setFsAnalysis] = useState<FullFengShuiAnalysis | null>(null);

    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [selectedImages, setSelectedImages] = useState<{ file: File, preview: string }[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const reportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            const isCompleted = task?.status === 'completed';
            setIsViewMode(isCompleted);

            if (task?.result_data?.analysis) {
                const data = task.result_data.analysis;
                if (data.owner) {
                    setOwnerName(data.owner.name || "");
                    setBirthYear(data.owner.birthYear || 1990);
                    setGender(data.owner.gender || 'nam');
                }
                setFsAnalysis(data.fengshui || null);
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
        if (!taskId) { toast.error("Lỗi: Không tìm thấy ID nhiệm vụ!"); return { success: false, message: "ID không hợp lệ" }; }
        formData.delete('taskId'); formData.delete('projectId'); formData.delete('analysis_json'); formData.delete('status'); formData.delete('images');
        formData.append('taskId', String(taskId));
        formData.append('projectId', String(projectId || ""));
        formData.append('status', status);
        formData.append('analysis_json', analysisJson || "");
        formData.append('existing_attachments', JSON.stringify(existingImages));
        selectedImages.forEach((item) => formData.append('images', item.file));
        return updateSurveyTaskResult(state, formData);
    };

    const [state, formAction] = useActionState(wrappedAction as any, { success: false, message: "" });

    // ✅ HÀM XUẤT PDF - FIX LỖI TRÀN LỀ
    const handleExportPDF = async () => {
        if (!reportRef.current) return;
        setIsExporting(true);
        const toastId = toast.loading("Đang xuất file PDF chuẩn ISO...");

        try {
            const html2pdf = (await import('html2pdf.js')).default;
            const element = reportRef.current;

            const opt = {
                // Tăng margin bottom lên 20 để có chỗ trống cho số trang
                margin: [15, 10, 20, 10] as [number, number, number, number],
                filename: `BM_KS_${projectCode || 'DA'}_${ownerName ? ownerName.replace(/\s+/g, '_') : 'KH'}.pdf`,
                image: { type: 'jpeg' as const, quality: 1 },
                html2canvas: { scale: 4, useCORS: true, letterRendering: true, windowWidth: 800, width: 794 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
                pagebreak: { mode: ['css', 'legacy'] }
            };

            // Sử dụng chuỗi Promise được ép kiểu 'as any' để gọi .save() và thêm số trang
            await (html2pdf().set(opt).from(element).toPdf().get('pdf').then((pdf: any) => {
                const totalPages = pdf.internal.getNumberOfPages();

                for (let i = 1; i <= totalPages; i++) {
                    pdf.setPage(i);
                    pdf.setFontSize(9);
                    pdf.setTextColor(100); // Màu xám nhẹ

                    const pageWidth = pdf.internal.pageSize.getWidth();
                    const pageHeight = pdf.internal.pageSize.getHeight();

                    // Vẽ dòng chữ "Trang: i/n" vào giữa chân trang, cách mép dưới 10mm
                    pdf.text(`Trang: ${i}/${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
                }
                return pdf;
            }) as any).save();

            toast.success("Đã tải xuống thành công!", { id: toastId });
        } catch (error) {
            console.error("Lỗi xuất PDF:", error);
            toast.error("Lỗi khi xuất PDF. Hãy thử lại!", { id: toastId });
        } finally {
            setIsExporting(false);
        }
    };

    const processImageWithWatermark = async (file: File): Promise<File> => {
        const meta = await getMetaData();
        const displayProjectCode = projectCode ? `${projectCode} - ` : "";
        const displayProjectName = projectName ? projectName : "Chưa cập nhật tên dự án";
        const textLines = [
            COMPANY_NAME,
            `Dự án: ${displayProjectCode}${displayProjectName}`,
            ...meta.split('\n')
        ];

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

    const isFengShuiTask = task?.title?.toUpperCase().includes("HƯỚNG") || task?.title?.toUpperCase().includes("PHONG THỦY");

    const handleCompassSave = (data: any) => {
        // 1. Lấy kết quả tổng thể từ fengShui.ts
        const result = evaluateFengShui(birthYear, gender, data.heading);
        setFsAnalysis(result);

        // 2. Lấy DUY NHẤT chuỗi báo cáo đã được format chuẩn (nắng gió 2 dòng, hóa giải...)
        const fullReport = generateFengShuiReportText(ownerName, birthYear, gender, result);

        // 3. Đưa vào State và chuẩn bị lưu Database
        setResultText(fullReport);
        setAnalysisJson(JSON.stringify({
            owner: { name: ownerName, birthYear, gender },
            compass: data,
            fengshui: result,
            generated_at: new Date().toISOString()
        }));
        setShowCompass(false);
        toast.success("Đã cập nhật báo cáo thực địa đồng bộ!");
    };

    const isCompleted = task?.status === 'completed';

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className={`gap-2 h-8 transition-all ${isCompleted ? 'border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100' : 'border-green-200 bg-green-50/50 text-green-700 hover:bg-green-100'}`}>
                    {isCompleted ? <><Eye className="h-3.5 w-3.5" /> Xem kết quả</> : <><Edit3 className="h-3.5 w-3.5" /> Ghi kết quả</>}
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-2xl max-h-[95vh] overflow-y-auto !p-0 gap-0 border-none shadow-2xl bg-slate-50">

                {/* ========================================================= */}
                {/* 🌟 TEMPLATE IN PDF NGẦM CHUYÊN NGHIỆP CỠ A4 (794px) 🌟 */}
                {/* ✅ Bỏ w-0 h-0 overflow-hidden. Đổi sang absolute, opacity 0 */}
                {/* ========================================================= */}
                <div style={{ position: 'absolute', top: 0, left: 0, opacity: 0, pointerEvents: 'none', zIndex: -50 }}>
                    <div ref={reportRef} className="bg-white text-slate-900 font-sans" style={{ width: '794px', minHeight: '1123px', padding: '40px', boxSizing: 'border-box' }}>

                        {/* ✅ HEADER THEO CHUẨN ISO */}
                        <table className="w-full mb-8 border-collapse border border-slate-900" style={{ tableLayout: 'fixed', width: '100%', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                            <tbody>
                                <tr>
                                    <td className="w-[20%] p-2 border border-slate-900 text-center align-middle">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src="/images/logo.png" alt="Logo" style={{ maxHeight: '150px', margin: '0 auto', objectFit: 'contain' }} crossOrigin="anonymous" />
                                    </td>
                                    <td className="w-[50%] p-2 border border-slate-900 text-center align-middle overflow-hidden">
                                        <h1 className="text-lg font-black text-blue-900 uppercase tracking-widest leading-tight">{COMPANY_NAME}</h1>
                                        <p className="text-xs font-bold text-slate-600 mt-1 uppercase">Hồ sơ khảo sát & Tư vấn thiết kế</p>
                                    </td>
                                    <td className="w-[30%] p-2 border border-slate-900 text-[11px] text-slate-800 align-middle">
                                        <div className="flex justify-between items-end border-b border-slate-300 pb-1.5 mb-1.5 gap-2">
                                            <span className="shrink-0">Mã DA:</span>
                                            <span className="font-bold text-blue-900 text-right text-[10px] leading-normal">{projectCode || "N/A"}</span>
                                        </div>
                                        <div className="flex justify-between items-end border-b border-slate-300 pb-1.5 mb-1.5 gap-2">
                                            <span className="shrink-0">Ngày lập:</span>
                                            <span className="font-bold text-right leading-tight">{new Date().toLocaleDateString('vi-VN')}</span>
                                        </div>
                                        <div className="flex justify-between items-end gap-2">
                                            <span className="shrink-0">Mã số BM:</span>
                                            <span className="font-bold text-right leading-tight">BM-KS-01</span>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {/* TIÊU ĐỀ */}
                        <div className="text-center mb-8" style={{ pageBreakInside: 'avoid' }}>
                            <h2 className="text-[22px] font-black uppercase text-red-700 tracking-wide mb-2">
                                {task?.title || "BÁO CÁO KHẢO SÁT HIỆN TRẠNG"}
                            </h2>
                            <p className="text-sm font-bold text-slate-800 bg-slate-100 inline-block px-5 py-2 rounded-full border border-slate-300 shadow-sm break-words max-w-full">
                                Dự án: {projectName || "Tên dự án chưa được cập nhật"}
                            </p>
                        </div>

                        {/* SECTION 1: BÁT TRẠCH */}
                        {fsAnalysis && (
                            <div className="mb-6">
                                <h3 className="text-sm font-bold text-white bg-blue-900 px-3 py-1.5 uppercase mb-2 inline-block rounded-t-md" style={{ pageBreakInside: 'avoid' }}>
                                    I. Thông số Gia chủ & Bát Trạch
                                </h3>
                                <div className="grid grid-cols-2 gap-y-2 gap-x-8 border border-blue-900/20 p-4 rounded-b-md rounded-tr-md bg-blue-50/30 text-sm" style={{ pageBreakInside: 'avoid' }}>
                                    <p><strong>Gia chủ:</strong> {ownerName || "Đang cập nhật"}</p>
                                    <p><strong>Năm sinh:</strong> {birthYear} ({gender === 'nam' ? 'Nam' : 'Nữ'})</p>
                                    <p><strong>Cung mệnh:</strong> <span className="text-red-700 font-bold">{fsAnalysis.cung}</span></p>
                                    <p><strong>Nhóm mệnh:</strong> <span className="text-red-700 font-bold">{fsAnalysis.nhom}</span></p>
                                    <p className="col-span-2 mt-2 pt-2 border-t border-slate-300 text-blue-900 font-bold">
                                        ➤ Hướng đo thực tế: {fsAnalysis.currentDirection.name} ({fsAnalysis.currentDirection.degree}°) - {fsAnalysis.currentDirection.star}
                                    </p>
                                </div>

                                {/* ✅ TABLE BÁT TRẠCH ÉP CỨNG ĐỘ RỘNG % */}
                                <table className="w-full mt-4 border-collapse border border-slate-400 text-xs" style={{ tableLayout: 'fixed', width: '100%' }}>
                                    <thead>
                                        <tr className="bg-slate-200 text-slate-900">
                                            <th className="border border-slate-400 p-2 text-center" style={{ width: '15%' }}>Hướng</th>
                                            <th className="border border-slate-400 p-2 text-center" style={{ width: '20%' }}>Cung Sao</th>
                                            <th className="border border-slate-400 p-2 text-center" style={{ width: '15%' }}>Đánh giá</th>
                                            <th className="border border-slate-400 p-2 text-left" style={{ width: '50%' }}>Gợi ý bố trí công năng</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {fsAnalysis.allDirections.map((d, idx) => (
                                            <tr key={idx} className="text-center" style={{ pageBreakInside: 'avoid' }}>
                                                <td className="border border-slate-400 p-2 font-bold bg-slate-50 break-words">{d.dirName} ({d.degree}°)</td>
                                                <td className={`border border-slate-400 p-2 font-bold ${d.type === 'good' ? 'text-green-700' : 'text-red-700'} break-words`}>{d.star}</td>
                                                <td className="border border-slate-400 p-2 font-bold">{d.type === 'good' ? 'CÁT' : 'HUNG'}</td>
                                                <td className="border border-slate-400 p-2 text-left whitespace-normal break-words leading-relaxed">
                                                    {d.type === 'good' ? 'Cửa chính, Ban thờ, Phòng ngủ, Phòng khách' : 'Nhà vệ sinh, Kho chứa đồ, Bếp (Tọa hung hướng cát)'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div className="col-span-2 mt-3 pt-3 border-t border-slate-300">
                            <p className="text-blue-900 font-bold mb-1.5">➤ Phân tích Vi khí hậu (Nắng & Gió):</p>
                            <p className="italic text-slate-700 leading-relaxed whitespace-pre-line">
                                {fsAnalysis?.currentDirection?.climateAnalysis && (
                                    <div className="col-span-2 mt-3 pt-3 border-t border-slate-300">
                                        <p className="text-blue-900 font-bold mb-1">➤ Phân tích Vi khí hậu (Nắng & Gió):</p>
                                        <p className="italic text-slate-800 leading-normal whitespace-pre-line text-[11px]">
                                            {fsAnalysis?.currentDirection?.climateAnalysis}
                                        </p>
                                    </div>
                                )}
                            </p>
                        </div>
                        {/* SECTION 2: GHI CHÚ */}
                        <div className="mb-6">
                            <h3 className="text-sm font-bold bg-blue-900 text-white px-3 py-1.5 uppercase mb-2 inline-block rounded-t-md" style={{ pageBreakInside: 'avoid' }}>
                                II. Luận giải chi tiết & Hóa giải phong thủy
                            </h3>
                            <div className="border border-slate-400 p-4 text-sm leading-relaxed min-h-[100px] bg-slate-50/50 rounded-b-md rounded-tr-md">
                                {(resultText || task?.notes) ? (
                                    (resultText || task?.notes).split('\n').map((line: string, index: number) => (
                                        <p key={index} style={{ pageBreakInside: 'avoid', marginBottom: '4px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                            {line || '\u00A0'}
                                        </p>
                                    ))
                                ) : (
                                    <p style={{ pageBreakInside: 'avoid' }} className="italic text-slate-500">Chưa có dữ liệu luận giải.</p>
                                )}
                            </div>
                        </div>

                        {/* SECTION 3: HÌNH ẢNH */}
                        {existingImages.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold bg-blue-900 text-white px-3 py-1.5 uppercase mb-2 inline-block">
                                    III. Hình ảnh hiện trạng thực địa
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {existingImages.map((url, i) => (
                                        <div key={i} className="rounded-md border border-slate-400 bg-slate-100 flex items-center justify-center p-1 overflow-hidden" style={{ height: '260px', pageBreakInside: 'avoid' }}>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={url}
                                                alt={`Hiện trạng ${i + 1}`}
                                                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                                crossOrigin="anonymous"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                </div>
                {/* ========================================================= */}


                {/* --- UI HIỂN THỊ CHÍNH TRÊN MÀN HÌNH --- */}
                <div className={`p-6 text-white shrink-0 relative overflow-hidden ${isViewMode ? 'bg-blue-700' : 'bg-slate-900'}`}>
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Home size={80} /></div>
                    <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3 relative z-10">
                        {isViewMode ? <Eye className="text-white" /> : <CheckCircle2 className="text-blue-400" />}
                        {isViewMode ? 'Chi tiết kết quả' : task?.title}
                    </DialogTitle>
                    <p className="text-white/60 text-[10px] mt-1 relative z-10 tracking-widest uppercase font-bold">
                        {isViewMode ? `Nhiệm vụ: ${task?.title}` : `Dự án: ${projectCode || projectId}`}
                    </p>
                </div>

                {isViewMode ? (
                    <div className="p-6 space-y-6 animate-in fade-in duration-300">
                        {/* Khối hiển thị Bát Trạch UI */}
                        {fsAnalysis && (
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-3 opacity-5"><Compass size={100} /></div>
                                <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" /> THÔNG SỐ BÁT TRẠCH
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-10">
                                    <div><p className="text-[10px] text-slate-400 uppercase font-bold">Gia chủ</p><p className="font-black text-slate-800">{ownerName}</p></div>
                                    <div><p className="text-[10px] text-slate-400 uppercase font-bold">Năm sinh</p><p className="font-black text-slate-800">{birthYear} ({gender === 'nam' ? 'Nam' : 'Nữ'})</p></div>
                                    <div><p className="text-[10px] text-slate-400 uppercase font-bold">Cung Mệnh</p><p className="font-black text-blue-600">{fsAnalysis.cung}</p></div>
                                    <div><p className="text-[10px] text-slate-400 uppercase font-bold">Nhóm Mệnh</p><p className="font-black text-blue-600">{fsAnalysis.nhom}</p></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><p className="text-slate-400 font-bold text-[10px]">CUNG MỆNH</p><p className="font-black text-slate-800">{fsAnalysis.cung}</p></div>
                                    <div><p className="text-slate-400 font-bold text-[10px]">HƯỚNG NHÀ</p><p className="font-black text-blue-600">{fsAnalysis.currentDirection.name} ({fsAnalysis.currentDirection.degree}°)</p></div>
                                </div>
                                <div className="col-span-2 mt-3 pt-3 border-t border-slate-300">
                                    <p className="text-blue-900 font-bold mb-1">➤ Phân tích Vi khí hậu (Nắng & Gió):</p>
                                    <p className="italic text-slate-800 leading-normal whitespace-pre-line text-[11px]">
                                        {fsAnalysis?.currentDirection?.climateAnalysis}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <Label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">GHI CHÚ & KẾT QUẢ</Label>
                            <div className="text-[13px] text-slate-700 whitespace-pre-wrap leading-relaxed font-medium bg-slate-50 p-4 rounded-xl border border-slate-100">
                                {task?.notes || <span className="italic text-slate-400">Không có ghi chú nào được lưu.</span>}
                            </div>
                        </div>

                        {existingImages.length > 0 && (
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                <Label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">
                                    ẢNH HIỆN TRẠNG KÈM TỌA ĐỘ
                                </Label>
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

                        <div className="flex justify-between pt-4 border-t border-slate-200 mt-6">
                            <Button type="button" variant="ghost" className="text-slate-500 font-bold" onClick={() => setIsOpen(false)}>Đóng</Button>

                            <div className="flex gap-2">
                                <Button type="button" className="bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-200" onClick={handleExportPDF} disabled={isExporting}>
                                    {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                                    Xuất PDF
                                </Button>

                                <Button type="button" className="bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg shadow-amber-200" onClick={() => setIsViewMode(false)}>
                                    <Edit3 className="w-4 h-4 mr-2" /> Chỉnh sửa
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    // --- GIAO DIỆN NHẬP / CHỈNH SỬA ---
                    <form action={formAction} className="p-6 space-y-6 bg-white">
                        <input type="hidden" name="taskId" value={task?.id || ""} />
                        <input type="hidden" name="projectId" value={projectId || ""} />
                        <input type="hidden" name="analysis_json" value={analysisJson} />
                        <input type="hidden" name="status" value={status} />
                        <input type="file" name="images" multiple accept="image/*" hidden ref={fileInputRef} onChange={handleImageChange} />

                        {isFengShuiTask && (
                            <div className="space-y-4 p-5 bg-orange-50/50 border border-orange-100 rounded-2xl shadow-inner">
                                <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-2 text-orange-800 font-bold text-sm">
                                        <Sparkles className="w-4 h-4 text-orange-500" /> NHẬP DATA GIA CHỦ
                                    </Label>
                                    <Button type="button" size="sm" className="bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-200" onClick={() => setShowCompass(true)}>
                                        <Compass className="mr-2 h-4 w-4" /> Mở La bàn
                                    </Button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5 md:col-span-2">
                                        <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-1">Họ tên gia chủ</span>
                                        <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="h-10 border-orange-200 font-bold" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Năm sinh AL</span>
                                        <Input type="number" value={birthYear} onChange={(e) => setBirthYear(Number(e.target.value))} className="h-10 border-orange-200 font-bold" />
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
                            <Textarea name="result_data_text" rows={5} value={resultText} onChange={(e) => setResultText(e.target.value)} className="text-sm font-medium border-slate-200 rounded-xl bg-slate-50" />
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-black text-slate-500 uppercase tracking-widest">Ảnh đính kèm</Label>
                                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="h-8 border-dashed border-slate-300 text-blue-600 hover:bg-blue-50">
                                    <Camera className="w-3.5 h-3.5 mr-2" /> Thêm ảnh
                                </Button>
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
                                        <ImagePlus className="w-6 h-6 mb-1" />
                                        <span className="text-[8px] font-bold uppercase">Thêm</span>
                                    </button>
                                </div>
                            ) : (
                                <div onClick={() => fileInputRef.current?.click()} className="py-8 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 cursor-pointer">
                                    <Camera className="w-8 h-8 mb-2 opacity-20" />
                                    <p className="text-[10px] font-medium uppercase tracking-widest">Chưa có ảnh tải lên</p>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Trạng thái</Label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger className="h-10 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pending">Đang xử lý</SelectItem>
                                        <SelectItem value="completed">Hoàn thành</SelectItem>
                                    </SelectContent>
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
                    <div className="absolute inset-0 z-[100] bg-slate-950/98 backdrop-blur-md flex items-center justify-center p-4">
                        <div className="w-full max-w-md flex flex-col items-center relative">
                            <Button type="button" variant="ghost" size="icon" className="absolute -top-12 right-0 text-white/50 hover:text-white" onClick={() => setShowCompass(false)}>
                                <X className="h-8 w-8" />
                            </Button>
                            <FengShuiCompass projectId={projectId} ownerName={ownerName} birthYear={birthYear} gender={gender} onSaveResult={handleCompassSave} />
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}