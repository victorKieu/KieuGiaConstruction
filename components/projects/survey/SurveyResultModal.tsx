"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateSurveyTaskResult } from "@/lib/action/surveyActions";
import { useActionState } from 'react';
import { useFormStatus } from "react-dom";
import { Loader2, Edit3, Compass, Sparkles, CheckCircle2, X, Camera, Eye, FileText, Crosshair, Map, Truck, ShieldAlert, ClipboardList, Plus, Trash2, Sofa, Palette, Satellite, Clock, Settings2 } from "lucide-react";
import FengShuiCompass from "./FengShuiCompass";
import { toast } from "sonner";
import Image from "next/image";
import { evaluateFengShui, generateFengShuiReportText, type FullFengShuiAnalysis, LOAN_DAU_DICTIONARY } from "@/lib/utils/fengShui";
import { calculateFlyingStars, calculateThanSat, type FlyingStarResult, type ThanSatResult } from "@/lib/utils/advancedFengShui";
import { RTKDataUploader, type RTKPoint } from "@/components/projects/survey/RTKDataUploader";
import { useDictionary } from "@/hooks/useDictionary";

function SubmitResultButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full min-w-[150px] bg-blue-600 font-bold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 sm:w-auto dark:shadow-none">
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

    const { dicts, loading: dictLoading } = useDictionary([
        'GEO_ROAD_ACCESS',
        'GEO_ELEVATION',
        'GEO_WORKING_HOURS',
        'GEO_SOIL_TYPE',
        'RENO_BEAM_COLUMN',
        'INT_DESIGN_STYLE'
    ]);

    const [status, setStatus] = useState<string>("completed");
    const [cost, setCost] = useState<number>(0);
    const [resultText, setResultText] = useState<string>("");
    const [analysisJson, setAnalysisJson] = useState<string>("");

    // State Phong Thủy
    const [ownerName, setOwnerName] = useState<string>("");
    const [birthYear, setBirthYear] = useState<number>(1990);
    const [buildYear, setBuildYear] = useState<number>(new Date().getFullYear());
    const [gender, setGender] = useState<'nam' | 'nu'>('nam');
    const [fsAnalysis, setFsAnalysis] = useState<FullFengShuiAnalysis | null>(null);
    const [selectedLoanDau, setSelectedLoanDau] = useState<string[]>([]);
    const [flyingStars, setFlyingStars] = useState<Record<string, FlyingStarResult> | null>(null);
    const [thanSat, setThanSat] = useState<ThanSatResult[] | null>(null);

    // ✅ THÊM STATE ĐỂ LƯU TRỮ RÀNG BUỘC PHONG THỦY TỪ LA BÀN
    const [compassConstraints, setCompassConstraints] = useState<any>(null);

    const defaultGeoData = {
        isDrilling: false, roadAccess: "Ngõ 2-3m (Xe tải 1 tấn)", storage: "Có bãi tập kết rộng", elevation: "Bằng mặt đường",
        soilType: "Đất thổ cư lâu năm (Cứng)", waterLevel: "Sâu (Khô ráo, dễ làm móng)", electricity: "Có sẵn đồng hồ", water: "Có nước máy", drainage: "Có hệ thống cống thành phố",
        neighborLeft: "Nhà cấp 4 cũ/yếu", neighborRight: "Nhà cấp 4 cũ/yếu", neighborBack: "Đất trống",
        workingHours: "Được thi công cả ngày", vehicleLimit: "Không cấm tải/cấm giờ", sanitation: "Bình thường",
        drillingHoles: 3, drillingDepth: 30, drillingWaterLevel: 2.5, drillingSpt: "Có thực hiện 2m / 1 nhát",
        drillingMethod: "Khoan xoay bơm rửa bằng bentonite", foundationLayer: "Sét pha trạng thái dẻo cứng", loadCapacity: "15 - 20 Tấn/m2"
    };

    const defaultTopoData = {
        obstaclesAir: "Không vướng mắc", obstaclesUnderground: "Đất nguyên thổ",
        demolition: "Đất trống, thi công được ngay", debris: "Không có",
        foundationEquip: "Vào được máy ép tải sắt / Robot ép", diggingMethod: "Đào mở trần tự do",
    };

    const defaultRenoData = {
        beamColumnStatus: "Bình thường, chịu lực tốt", waterproofing: "Không thấm",
        oldFoundation: "Khung BTCT (Đập tường thoải mái)", reusableMats: "Bỏ hết (Đập trắng)",
        landComparison: "Khớp 100% với Sổ đỏ", landShape: "Vuông vức", boundary: "Đã xây tường rào rõ rệt",
        repairItems: [] as { id: string, area: string, task: string, volume: string }[]
    };

    const defaultInteriorData = {
        designStyle: "Hiện đại (Modern)", ceilingState: "Trần thạch cao phẳng (Giữ nguyên)",
        floorState: "Gạch men cũ (Cần đập bỏ cán nền)", wallState: "Tường sơn bả tốt (Chỉ sơn lại)",
        kitchenState: "Chưa có gì (Làm mới hoàn toàn)", wcState: "Thiết bị tốt, ốp lát đẹp (Giữ lại)",
        interiorItems: [] as { id: string, name: string, dimensions: string, material: string, notes: string }[]
    };

    const [rtkData, setRtkData] = useState<RTKPoint[]>([]);
    const [geoData, setGeoData] = useState(defaultGeoData);
    const [topoData, setTopoData] = useState(defaultTopoData);
    const [renoData, setRenoData] = useState(defaultRenoData);
    const [interiorData, setInteriorData] = useState(defaultInteriorData);

    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [selectedImages, setSelectedImages] = useState<{ file: File, preview: string }[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const reportRef = useRef<HTMLDivElement>(null);

    const taskCode = (task?.code || "").toUpperCase();
    const taskTitleOrName = (task?.title || task?.name || "").toUpperCase();

    let activeForm = "DEFAULT";
    if (taskCode === "PHON_THUY" || taskTitleOrName.includes("PHONG THỦY") || taskTitleOrName.includes("HƯỚNG VỊ") || taskTitleOrName.includes("LA BÀN")) {
        activeForm = "FENG_SHUI";
    } else if (taskCode === "NOI_THAT" || taskTitleOrName.includes("NỘI THẤT") || taskTitleOrName.includes("INTERIOR")) {
        activeForm = "NOI_THAT";
    } else if (taskCode === "CT_SC" || taskTitleOrName.includes("CẢI TẠO") || taskTitleOrName.includes("SỬA CHỮA") || taskTitleOrName.includes("KẾT CẤU")) {
        activeForm = "CAI_TAO";
    } else if (taskCode === "DIA_CHAT" || taskTitleOrName.includes("ĐỊA CHẤT") || taskTitleOrName.includes("HẠ TẦNG")) {
        activeForm = "DIA_CHAT";
    } else if (taskCode === "TOA_DO" || taskCode === "RTK" || taskTitleOrName.includes("TỌA ĐỘ") || taskTitleOrName.includes("RTK") || taskTitleOrName.includes("MỐC RANH")) {
        activeForm = "RTK_TOA_DO";
    } else if (taskCode === "DIA_HINH" || taskTitleOrName.includes("ĐỊA HÌNH") || taskTitleOrName.includes("HIỆN TRẠNG")) {
        activeForm = "DIA_HINH";
    } else if (taskCode === "LOAN_DAU" || taskTitleOrName.includes("LOAN ĐẦU") || taskTitleOrName.includes("CẢNH QUAN")) {
        activeForm = "LOAN_DAU";
    }

    const isFengShuiTask = activeForm === "FENG_SHUI";
    const isNoiThatTask = activeForm === "NOI_THAT";
    const isCaiTaoTask = activeForm === "CAI_TAO";
    const isDiaChatTask = activeForm === "DIA_CHAT";
    const isDiaHinhTask = activeForm === "DIA_HINH";
    const isLoanDauTask = activeForm === "LOAN_DAU";
    const isRtkTask = activeForm === "RTK_TOA_DO";

    const getFormCode = () => {
        if (isNoiThatTask) return "BM-KS-06";
        if (isCaiTaoTask) return "BM-KS-05";
        if (isDiaHinhTask) return "BM-KS-04";
        if (isDiaChatTask) return "BM-KS-03";
        if (isLoanDauTask) return "BM-KS-02";
        if (isFengShuiTask) return "BM-KS-01";
        if (isRtkTask) return "BM-KS-07";
        return "BM-KS-00";
    };
    const formCode = getFormCode();
    const finalTaskTitle = task?.title || task?.name || "BÁO CÁO KHẢO SÁT HIỆN TRẠNG";

    useEffect(() => {
        if (isOpen) {
            const isCompleted = task?.status === 'completed';
            setIsViewMode(isCompleted);

            if (task?.result_data?.analysis) {
                const data = task.result_data.analysis;
                if (data.owner) {
                    setOwnerName(data.owner.name || ""); setBirthYear(data.owner.birthYear || 1990);
                    setBuildYear(data.owner.buildYear || new Date().getFullYear()); setGender(data.owner.gender || 'nam');
                }
                setFsAnalysis(data.fengshui || null);
                setFlyingStars(data.flyingStars || null); setThanSat(data.thanSat || null);

                // ✅ PHỤC HỒI RÀNG BUỘC TỪ DỮ LIỆU ĐÃ LƯU
                if (data.compass?.constraints) {
                    setCompassConstraints(data.compass.constraints);
                }

                if (data.loanDau) setSelectedLoanDau(data.loanDau);
                if (data.geoData) setGeoData({ ...defaultGeoData, ...data.geoData });
                if (data.topoData) setTopoData({ ...defaultTopoData, ...data.topoData });
                if (data.renoData) setRenoData({ ...defaultRenoData, ...data.renoData, repairItems: data.renoData.repairItems || [] });
                if (data.interiorData) setInteriorData({ ...defaultInteriorData, ...data.interiorData, interiorItems: data.interiorData.interiorItems || [] });
                if (data.rtkData) setRtkData(data.rtkData);
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
        let currentData = {};
        try { currentData = analysisJson ? JSON.parse(analysisJson) : {}; } catch (e) { }

        if (isLoanDauTask) (currentData as any).loanDau = selectedLoanDau;
        if (isDiaChatTask) (currentData as any).geoData = geoData;
        if (isDiaHinhTask) (currentData as any).topoData = topoData;
        if (isCaiTaoTask) (currentData as any).renoData = renoData;
        if (isNoiThatTask) (currentData as any).interiorData = interiorData;
        if (isRtkTask) (currentData as any).rtkData = rtkData;

        const finalAnalysisJson = JSON.stringify(currentData);
        formData.delete('taskId'); formData.delete('projectId'); formData.delete('analysis_json'); formData.delete('status'); formData.delete('images');
        formData.append('taskId', String(taskId));
        formData.append('projectId', String(projectId || ""));
        formData.append('status', status);
        formData.append('analysis_json', finalAnalysisJson || "");
        formData.append('existing_attachments', JSON.stringify(existingImages));
        selectedImages.forEach((item: { file: File, preview: string }) => formData.append('images', item.file));
        return updateSurveyTaskResult(state, formData);
    };

    const [state, formAction] = useActionState(wrappedAction as any, { success: false, message: "" });

    const addRepairItem = () => setRenoData({ ...renoData, repairItems: [...renoData.repairItems, { id: Date.now().toString(), area: '', task: '', volume: '' }] });
    const removeRepairItem = (id: string) => setRenoData({ ...renoData, repairItems: renoData.repairItems.filter((item: any) => item.id !== id) });
    const handleRepairItemChange = (id: string, field: 'area' | 'task' | 'volume', value: string) => setRenoData({ ...renoData, repairItems: renoData.repairItems.map((item: any) => item.id === id ? { ...item, [field]: value } : item) });

    const addInteriorItem = () => setInteriorData({ ...interiorData, interiorItems: [...interiorData.interiorItems, { id: Date.now().toString(), name: '', dimensions: '', material: '', notes: '' }] });
    const removeInteriorItem = (id: string) => setInteriorData({ ...interiorData, interiorItems: interiorData.interiorItems.filter((item: any) => item.id !== id) });
    const handleInteriorItemChange = (id: string, field: 'name' | 'dimensions' | 'material' | 'notes', value: string) => setInteriorData({ ...interiorData, interiorItems: interiorData.interiorItems.map((item: any) => item.id === id ? { ...item, [field]: value } : item) });

    const handleExportPDF = async () => {
        if (!reportRef.current) return;
        setIsExporting(true);
        const toastId = toast.loading("Đang xuất file PDF chuẩn ISO...");
        try {
            const html2pdf = (await import('html2pdf.js')).default;
            const element = reportRef.current;
            const opt = {
                margin: [15, 10, 20, 10] as [number, number, number, number],
                filename: `${formCode}_${projectCode || 'DA'}_${finalTaskTitle.replace(/\s+/g, '_')}.pdf`,
                image: { type: 'jpeg' as const, quality: 1 },
                html2canvas: { scale: 2, useCORS: true, letterRendering: true }, // Giảm scale xuống 2 để chống tràn RAM Mobile
                pagebreak: { mode: ['css', 'legacy'] },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
            };
            await (html2pdf().set(opt).from(element).toPdf().get('pdf').then((pdf: any) => {
                const totalPages = pdf.internal.getNumberOfPages();
                for (let i = 1; i <= totalPages; i++) {
                    pdf.setPage(i); pdf.setFontSize(9); pdf.setTextColor(100);
                    pdf.text(`Trang: ${i}/${totalPages}`, pdf.internal.pageSize.getWidth() / 2, pdf.internal.pageSize.getHeight() - 10, { align: 'center' });
                }
                return pdf;
            }) as any).save();
            toast.success("Thành công!", { id: toastId });
        } catch (error) { toast.error("Lỗi xuất PDF", { id: toastId }); } finally { setIsExporting(false); }
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
        setFlyingStars(fsFlyingStars); setThanSat(fsThanSat);

        // ✅ CẬP NHẬT RÀNG BUỘC
        if (data.constraints) setCompassConstraints(data.constraints);

        const fullReport = generateFengShuiReportText(ownerName, birthYear, gender, fsResult);
        setResultText(fullReport);
        setAnalysisJson(JSON.stringify({
            owner: { name: ownerName, birthYear, buildYear, gender },
            compass: data, fengshui: fsResult, flyingStars: fsFlyingStars, thanSat: fsThanSat,
            generated_at: new Date().toISOString()
        }));
        setShowCompass(false);
        toast.success("Đã phân tích Bát Trạch, Phi Tinh & Thần Sát!");
    };

    const renderAdvancedFengShui = () => {
        if (!flyingStars || !thanSat) return null;
        return (
            <div style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }} className="mt-6 mb-6">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="flex items-center gap-2 text-sm font-black tracking-widest text-indigo-700 uppercase">
                            <Sparkles className="h-5 w-5" /> Trận Đồ Huyền Không Phi Tinh
                        </h3>
                        <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                            Nhà Vận {flyingStars['CENTER']?.period || 9} (Xây năm {buildYear})
                        </span>
                    </div>
                    <div className="mx-auto mb-6 grid aspect-square max-w-sm grid-cols-3 gap-2">
                        {['SE', 'S', 'SW', 'E', 'CENTER', 'W', 'NE', 'N', 'NW'].map((dirId, idx) => {
                            const starData = flyingStars[dirId];
                            if (!starData) return <div key={idx} />;
                            const isCenter = dirId === 'CENTER';
                            const dirNamesVi: Record<string, string> = { 'NW': 'Tây Bắc', 'N': 'Bắc', 'NE': 'Đông Bắc', 'W': 'Tây', 'CENTER': 'Trung Cung', 'E': 'Đông', 'SW': 'Tây Nam', 'S': 'Nam', 'SE': 'Đông Nam' };
                            return (
                                <div key={idx} className={`relative flex flex-col items-center justify-center p-2 border-2 rounded-xl shadow-sm ${isCenter ? 'bg-indigo-100 border-indigo-300' : 'bg-white border-slate-200'}`}>
                                    <span className="absolute top-1 left-2 text-sm font-black text-slate-800">{starData.mountainStar}</span>
                                    <span className={`absolute top-1 right-2 text-sm font-black ${starData.waterStar === 9 ? 'text-red-600 animate-pulse' : 'text-blue-600'}`}>{starData.waterStar}</span>
                                    <span className="mt-4 text-xl font-bold text-slate-300">{starData.baseStar}</span>
                                    <span className="absolute bottom-1 font-bold tracking-widest text-[8px] text-slate-400 uppercase">{dirNamesVi[dirId]}</span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="border-t border-slate-200 pt-5">
                        <h4 className="mb-3 flex items-center gap-2 text-xs font-black text-slate-700 uppercase">
                            <Crosshair className="h-4 w-4 text-amber-600" /> Tọa độ Thần Sát (Cắt cổng, Mở cửa)
                        </h4>
                        <div className="space-y-2">
                            {thanSat.map((item, idx) => (
                                <div key={idx} className={`flex items-start gap-3 p-3 border rounded-lg ${item.isGood ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black shrink-0 text-xs text-center leading-tight ${item.isGood ? 'bg-amber-200 text-amber-700' : 'bg-red-200 text-red-700'}`}>
                                        {item.type.includes("Sát") || item.type.includes("Vong") ? "SÁT" : "CÁT"}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-800">{item.type}: <span className="text-red-600">{item.degree}</span></p>
                                        <p className="mt-0.5 leading-relaxed text-[11px] text-slate-600">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const isCompleted = task?.status === 'completed';

    // Hàm phụ trợ để dịch value Constraints ra Label tiếng Việt
    const getLabel = (type: string, value: string) => {
        if (type === 'loBanDoor') {
            if (value === 'bat_buoc') return 'Bắt buộc 100% Cung Đỏ';
            if (value === 'tuong_doi') return 'Chỉ Cửa Chính';
            return 'Không yêu cầu';
        }
        if (type === 'remedyScreen') {
            if (value === 'co_vach_ngan') return 'Xây Vách bình phong';
            if (value === 'doi_cua') return 'Đổi hướng cửa';
            return 'Không';
        }
        if (type === 'septicTankRule') {
            if (value === 'tranh_trung_cung') return 'Tránh Trung Cung';
            if (value === 'duoi_gam_bep') return 'Tránh Gầm Bếp';
            return 'Đặt sân trước';
        }
        return value;
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <div className={`cursor-pointer group flex-1 p-3 hover:bg-blue-50/40 dark:hover:bg-blue-900/20 rounded-lg transition-all border-b last:border-0 border-slate-100 dark:border-slate-800`}>
                    <div className="flex items-center justify-between">
                        <Button variant="outline" size="sm" className={`gap-2 h-8 transition-all dark:bg-slate-950 dark:border-slate-800 ${isCompleted ? 'border-blue-200 bg-blue-50/50 text-blue-700 dark:text-blue-400' : 'border-green-200 bg-green-50/50 text-green-700 dark:text-green-400'}`}>
                            {isCompleted ? <><Eye className="h-3.5 w-3.5" /> Xem kết quả</> : <><Edit3 className="h-3.5 w-3.5" /> Ghi kết quả</>}
                        </Button>
                    </div>
                </div>
            </DialogTrigger>

            <DialogContent aria-describedby={undefined} className="flex max-h-[95vh] w-[95vw] flex-col gap-0 overflow-hidden border-none bg-slate-200 !p-0 shadow-2xl transition-colors sm:max-w-[900px] dark:bg-slate-950">
                {isViewMode ? (
                    <>
                        <div className="z-10 flex shrink-0 items-center justify-between bg-slate-900 p-4 text-white shadow-md transition-colors dark:bg-black">
                            <div>
                                <DialogTitle className="flex items-center gap-2 text-lg font-black uppercase">
                                    <FileText className="h-5 w-5 text-blue-400" /> BẢN XEM TRƯỚC BÁO CÁO
                                </DialogTitle>
                                <p className="mt-1 max-w-sm truncate text-xs text-slate-400">{finalTaskTitle}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" className="border-slate-600 bg-slate-800 text-white hover:bg-slate-700" onClick={() => setIsOpen(false)}>Đóng</Button>
                                <Button size="sm" className="bg-amber-500 font-bold text-white shadow-lg hover:bg-amber-600" onClick={() => setIsViewMode(false)}>
                                    <Edit3 className="mr-2 h-4 w-4" /> Chỉnh sửa
                                </Button>
                                <Button size="sm" className="bg-red-600 font-bold text-white shadow-lg hover:bg-red-700" onClick={handleExportPDF} disabled={isExporting}>
                                    {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />} Xuất PDF
                                </Button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-slate-200 p-4 transition-colors sm:p-8 dark:bg-slate-800">
                            <div ref={reportRef} className="mx-auto bg-white font-sans text-slate-900 shadow-xl" style={{ maxWidth: '794px', width: '100%', padding: '40px' }}>
                                {/* Phần nội dung báo cáo PDF luôn giữ nền trắng */}
                                <table className="mb-8 w-full border-collapse border border-slate-900" style={{ tableLayout: 'fixed', width: '100%', pageBreakInside: 'avoid' }}>
                                    <tbody>
                                        <tr>
                                            <td className="w-[20%] border border-slate-900 p-2 text-center align-middle">
                                                <img src="/images/logo.png" alt="Logo" style={{ maxHeight: '150px', margin: '0 auto', objectFit: 'contain' }} crossOrigin="anonymous" />
                                            </td>
                                            <td className="w-[50%] overflow-hidden border border-slate-900 p-2 text-center align-middle">
                                                <h1 className="text-lg leading-tight font-black tracking-widest text-blue-900 uppercase">{COMPANY_NAME}</h1>
                                                <p className="mt-1 text-xs font-bold text-slate-600 uppercase">Hồ sơ khảo sát & Tư vấn thiết kế</p>
                                            </td>
                                            <td className="w-[30%] border border-slate-900 p-3 align-middle text-[11px] text-slate-800">
                                                <div className="mb-1 flex items-center justify-between gap-2 border-b border-slate-300 pb-1">
                                                    <span className="shrink-0">Mã DA:</span><span className="text-right leading-normal font-bold text-blue-900 text-[10px]">{projectCode || "N/A"}</span>
                                                </div>
                                                <div className="mb-1 flex items-center justify-between gap-2 border-b border-slate-300 pb-1">
                                                    <span className="shrink-0">Ngày lập:</span><span className="text-right leading-normal font-bold">{new Date().toLocaleDateString('vi-VN')}</span>
                                                </div>
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="shrink-0">Mã số BM:</span><span className="text-right leading-normal font-bold text-red-700">{formCode}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>

                                <div className="mb-8 text-center" style={{ pageBreakInside: 'avoid' }}>
                                    <h2 className="mb-2 font-black tracking-wide text-[22px] text-red-700 uppercase">{finalTaskTitle}</h2>
                                    <p className="inline-block max-w-full rounded-full border border-slate-300 bg-slate-100 px-5 py-2 text-sm font-bold break-words text-slate-800 shadow-sm">
                                        Dự án: {projectName || "Tên dự án chưa được cập nhật"}
                                    </p>
                                </div>

                                {isFengShuiTask && fsAnalysis && (
                                    <>
                                        <div className="mb-6" style={{ pageBreakInside: 'avoid' }}>
                                            <h3 className="mb-2 inline-block rounded-t-md bg-blue-900 px-3 py-1.5 text-sm font-bold text-white uppercase">I. KẾT QUẢ ĐO VÀ PHÂN TÍCH THỰC ĐỊA</h3>
                                            <div className="space-y-4 rounded-tr-md rounded-b-md border border-blue-900/20 bg-blue-50/30 p-4 text-sm">
                                                <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                                                    <p><strong>Gia chủ:</strong> {ownerName || "Đang cập nhật"}</p><p><strong>Năm sinh:</strong> {birthYear} ({gender === 'nam' ? 'Nam' : 'Nữ'})</p>
                                                    <p><strong>Cung mệnh:</strong> <span className="font-bold text-red-700">{fsAnalysis.cung}</span></p><p><strong>Nhóm mệnh:</strong> <span className="font-bold text-red-700">{fsAnalysis.nhom}</span></p>
                                                </div>
                                                <div className="border-t border-blue-900/10 pt-3">
                                                    <p className="mb-1 font-bold text-blue-900">1. Luận giải Cung Sao:</p>
                                                    <ul className="ml-2 list-inside list-disc space-y-1 text-slate-800">
                                                        <li><strong>Hướng đo:</strong> {fsAnalysis.currentDirection.name} ({fsAnalysis.currentDirection.degree}°)</li>
                                                        <li><strong>Cung Sao:</strong> <span className={fsAnalysis.currentDirection.isGood ? 'text-green-700 font-bold' : 'text-red-700 font-bold'}>{fsAnalysis.currentDirection.star} ({fsAnalysis.currentDirection.isGood ? 'CÁT' : 'HUNG'})</span></li>
                                                        <li><strong>Luận giải:</strong> {fsAnalysis.currentDirection.desc}</li>
                                                    </ul>
                                                </div>
                                                {fsAnalysis.currentDirection.climateAnalysis && (
                                                    <div className="border-t border-blue-900/10 pt-3">
                                                        <p className="mb-1 font-bold text-blue-900">2. Phân tích Vi khí hậu (Nắng & Gió):</p>
                                                        <div className="leading-normal whitespace-pre-line text-slate-800 text-[12px] italic">{fsAnalysis.currentDirection.climateAnalysis}</div>
                                                    </div>
                                                )}
                                                {fsAnalysis.currentDirection.remedy && (
                                                    <div className="border-t border-blue-900/10 pt-3">
                                                        <p className="mb-1 font-bold text-blue-900">3. Lời khuyên & Hóa giải:</p>
                                                        <div className="leading-normal font-medium whitespace-pre-line text-slate-800 text-[12px]">{fsAnalysis.currentDirection.remedy}</div>
                                                    </div>
                                                )}

                                                {/* ✅ HIỂN THỊ RÀNG BUỘC KỸ THUẬT DỰ TOÁN TRONG BÁO CÁO PDF */}
                                                {compassConstraints && (
                                                    <div className="mt-4 border-t border-blue-900/20 pt-4">
                                                        <p className="mb-2 flex items-center gap-2 text-xs font-bold tracking-widest text-amber-700 uppercase">
                                                            <Settings2 className="h-4 w-4" /> 4. Thông số Ràng buộc Dự toán (BIM 5D):
                                                        </p>
                                                        <div className="grid grid-cols-2 gap-3 rounded-lg border border-amber-200/50 bg-white/60 p-3 text-xs text-slate-800 shadow-sm">
                                                            <p><strong>Cửa Lỗ Ban:</strong> <span className="font-medium text-blue-700">{getLabel('loBanDoor', compassConstraints.loBanDoor)}</span></p>
                                                            <p><strong>Bậc cầu thang:</strong> <span className="font-medium text-blue-700">{compassConstraints.stairSteps} bậc</span></p>
                                                            <p><strong>Hóa giải hướng:</strong> <span className={compassConstraints.remedyScreen !== 'khong' ? 'text-red-600 font-bold' : 'text-blue-700 font-medium'}>{getLabel('remedyScreen', compassConstraints.remedyScreen)}</span></p>
                                                            <p><strong>Vị trí Hầm cầu:</strong> <span className="font-medium text-blue-700">{getLabel('septicTankRule', compassConstraints.septicTankRule)}</span></p>
                                                        </div>
                                                        <p className="mt-2 text-[10px] text-slate-500 italic">* Các thông số này sẽ tự động liên kết để kiểm soát thiết kế và bóc tách dự toán.</p>
                                                    </div>
                                                )}

                                            </div>
                                        </div>
                                        {flyingStars && thanSat && renderAdvancedFengShui()}
                                    </>
                                )}

                                {isRtkTask && rtkData && rtkData.length > 0 && (
                                    <div className="mb-8" style={{ pageBreakInside: 'avoid' }}>
                                        <h3 className="mb-4 inline-block rounded-t-md bg-blue-700 px-3 py-1.5 text-sm font-bold text-white uppercase">CHI TIẾT TỌA ĐỘ ĐO ĐẠC HIỆN TRẠNG</h3>
                                        <table className="w-full border-collapse border border-slate-300 text-center text-sm">
                                            <thead>
                                                <tr className="bg-slate-100">
                                                    <th className="border border-slate-300 p-2">Tên Điểm</th>
                                                    <th className="border border-slate-300 p-2">Tọa độ X (Easting)</th>
                                                    <th className="border border-slate-300 p-2">Tọa độ Y (Northing)</th>
                                                    <th className="border border-slate-300 p-2">Cao độ Z</th>
                                                    <th className="border border-slate-300 p-2">Mã / Ghi chú</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rtkData.slice(0, 50).map((pt: RTKPoint, idx: number) => (
                                                    <tr key={idx}>
                                                        <td className="border border-slate-200 p-1 font-mono text-xs">{pt.pointId}</td>
                                                        <td className="border border-slate-200 p-1 font-mono text-xs">{pt.x}</td>
                                                        <td className="border border-slate-200 p-1 font-mono text-xs">{pt.y}</td>
                                                        <td className="border border-slate-200 p-1 font-mono text-xs text-green-700">{pt.z}</td>
                                                        <td className="border border-slate-200 p-1 text-[10px]">{pt.code}</td>
                                                    </tr>
                                                ))}
                                                {rtkData.length > 50 && (
                                                    <tr>
                                                        <td colSpan={5} className="border border-slate-200 p-2 text-xs text-slate-500 italic">
                                                            ... Đã ẩn bớt {rtkData.length - 50} điểm. Vui lòng xuất file đính kèm trên phần mềm để xem toàn bộ.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {isLoanDauTask && selectedLoanDau.length > 0 && (
                                    <div className="mb-8" style={{ pageBreakInside: 'avoid' }}>
                                        <h3 className="mb-4 inline-block rounded-t-md bg-emerald-700 px-3 py-1.5 text-sm font-bold text-white uppercase">I. KHẢO SÁT LOAN ĐẦU (CẢNH QUAN)</h3>
                                        <div className="space-y-4">
                                            {selectedLoanDau.map((id: string, index: number) => {
                                                const item = LOAN_DAU_DICTIONARY.find(d => d.id === id);
                                                if (!item) return null;
                                                return (
                                                    <div key={id} className="rounded-xl border border-emerald-700/20 bg-emerald-50/50 p-4 text-sm">
                                                        <p className="mb-2 font-black text-emerald-800 uppercase">{index + 1}. {item.name}</p>
                                                        <p className="mb-1.5 leading-relaxed text-slate-700"><strong>Hiện trạng:</strong> {item.desc}</p>
                                                        <p className="leading-relaxed font-medium text-amber-700"><strong>Giải pháp:</strong> {item.remedy}</p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {isDiaChatTask && (
                                    <div className="mb-8">
                                        {/* ✅ ĐỔI TIÊU ĐỀ THÀNH RÀNG BUỘC THEO HỆ THỐNG */}
                                        <h3 className="mb-4 inline-block rounded-t-md bg-amber-700 px-3 py-1.5 text-sm font-bold text-white uppercase">I. BÁO CÁO RÀNG BUỘC HẠ TẦNG & THI CÔNG</h3>
                                        <div className="mb-6 overflow-hidden rounded-lg border border-slate-300">
                                            <table className="w-full border-collapse text-left text-sm">
                                                <tbody>
                                                    <tr className="bg-slate-100"><th colSpan={2} className="border-b border-slate-300 p-2 text-xs font-bold text-slate-800 uppercase">1. Logistics & Điều kiện thi công</th></tr>
                                                    <tr><td className="w-[35%] border-r border-b border-slate-200 p-2 font-medium">Đường tiếp cận (Giới hạn xe tải)</td><td className="border-b border-slate-200 p-2 font-bold text-amber-700">{geoData.roadAccess}</td></tr>
                                                    <tr><td className="border-r border-b border-slate-200 p-2 font-medium">Giờ giấc thi công</td><td className="border-b border-slate-200 p-2 font-bold text-amber-700">{geoData.workingHours}</td></tr>
                                                    <tr className="bg-slate-100"><th colSpan={2} className="border-b border-slate-300 p-2 text-xs font-bold text-slate-800 uppercase">2. Địa chất sơ bộ</th></tr>
                                                    <tr><td className="border-r border-b border-slate-200 p-2 font-medium">Loại đất bề mặt</td><td className="border-b border-slate-200 p-2">{geoData.soilType}</td></tr>
                                                    <tr><td className="border-r border-b border-slate-200 p-2 font-medium">Cốt nền</td><td className="border-b border-slate-200 p-2">{geoData.elevation}</td></tr>
                                                </tbody>
                                            </table>
                                            <p className="bg-white p-2 text-[10px] text-slate-500 italic">* Số liệu giao thông và đất nền sẽ đóng vai trò cảnh báo sai định mức máy thi công trong Dự toán.</p>
                                        </div>
                                    </div>
                                )}

                                {isCaiTaoTask && renoData.repairItems.length > 0 && (
                                    <div className="mb-8">
                                        <h3 className="mb-4 inline-block rounded-t-md bg-rose-700 px-3 py-1.5 text-sm font-bold text-white uppercase">CHI TIẾT HẠNG MỤC CẢI TẠO</h3>
                                        <table className="w-full border-collapse border border-slate-300 text-left text-sm">
                                            <thead>
                                                <tr className="bg-slate-100">
                                                    <th className="border border-slate-300 p-2">Khu vực</th>
                                                    <th className="border border-slate-300 p-2">Nội dung</th>
                                                    <th className="border border-slate-300 p-2">KL</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {renoData.repairItems.map((item: any, idx: number) => (
                                                    <tr key={idx}>
                                                        <td className="border border-slate-200 p-2">{item.area}</td>
                                                        <td className="border border-slate-200 p-2">{item.task}</td>
                                                        <td className="border border-slate-200 p-2">{item.volume}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {existingImages.length > 0 && (
                                    <div style={{ pageBreakInside: 'avoid' }}>
                                        <h3 className="mb-4 inline-block rounded-t-md bg-slate-800 px-3 py-1.5 text-sm font-bold text-white uppercase">HÌNH ẢNH HIỆN TRẠNG THỰC ĐỊA</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            {existingImages.map((url, i) => (
                                                <div key={i} className="flex items-center justify-center overflow-hidden rounded-md border border-slate-400 bg-slate-100 p-1" style={{ height: '260px', pageBreakInside: 'avoid' }}>
                                                    <img src={url} alt={`Hiện trạng ${i + 1}`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} crossOrigin="anonymous" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <form action={formAction} className="h-full space-y-6 overflow-y-auto bg-white p-6 transition-colors dark:bg-slate-900">
                        <div className="mb-4 flex items-center justify-between border-b pb-4 transition-colors dark:border-slate-800">
                            <DialogTitle className="flex items-center gap-3 text-xl font-black text-slate-800 uppercase dark:text-slate-100">
                                <Edit3 className="h-5 w-5 text-blue-600 dark:text-blue-500" /> CẬP NHẬT KẾT QUẢ KHẢO SÁT
                            </DialogTitle>
                            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="dark:text-slate-400 dark:hover:bg-slate-800"><X className="h-5 w-5" /></Button>
                        </div>

                        <input type="hidden" name="taskId" value={task?.id || ""} />
                        <input type="hidden" name="projectId" value={projectId || ""} />
                        <input type="hidden" name="analysis_json" value={analysisJson} />
                        <input type="hidden" name="status" value={status} />
                        <input type="file" name="images" multiple accept="image/*" hidden ref={fileInputRef} onChange={handleImageChange} />

                        {isRtkTask && (
                            <div className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-5 shadow-inner transition-colors dark:border-blue-500/20 dark:bg-blue-500/10">
                                <Label className="flex items-center gap-2 border-b border-blue-200 pb-2 text-sm font-black tracking-widest text-blue-800 uppercase dark:border-blue-500/20 dark:text-blue-400">
                                    <Satellite className="h-4 w-4 text-blue-600 dark:text-blue-500" /> NHẬP DỮ LIỆU ĐO ĐẠC HIỆN TRẠNG (RTK)
                                </Label>
                                <RTKDataUploader data={rtkData} onChange={setRtkData} />
                            </div>
                        )}

                        {isDiaChatTask && (
                            <div className="space-y-6">
                                <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-inner transition-colors dark:border-amber-500/20 dark:bg-amber-500/10">
                                    <Label className="flex items-center gap-2 border-b border-amber-200 pb-2 text-sm font-black tracking-widest text-amber-800 uppercase dark:border-amber-500/20 dark:text-amber-400">
                                        <Map className="h-4 w-4 text-amber-600 dark:text-amber-500" /> THÔNG TIN HẠ TẦNG & MẶT BẰNG
                                    </Label>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <span className="flex items-center gap-1 font-bold text-[10px] text-amber-700 uppercase dark:text-amber-500"><Truck className="h-3 w-3" /> Giao thông</span>
                                            <Select value={geoData.roadAccess} onValueChange={v => setGeoData({ ...geoData, roadAccess: v })}>
                                                <SelectTrigger className="h-10 bg-white dark:border-slate-800 dark:bg-slate-950"><SelectValue /></SelectTrigger>
                                                <SelectContent className="dark:border-slate-800 dark:bg-slate-900">
                                                    {dictLoading ? <SelectItem value="loading" disabled>Đang tải...</SelectItem> : dicts['GEO_ROAD_ACCESS']?.map((o: any) => <SelectItem key={o.code} value={o.name}>{o.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <span className="flex items-center gap-1 font-bold text-[10px] text-amber-700 uppercase dark:text-amber-500"><Clock className="h-3 w-3" /> Giờ thi công</span>
                                            <Select value={geoData.workingHours} onValueChange={v => setGeoData({ ...geoData, workingHours: v })}>
                                                <SelectTrigger className="h-10 bg-white dark:border-slate-800 dark:bg-slate-950"><SelectValue /></SelectTrigger>
                                                <SelectContent className="dark:border-slate-800 dark:bg-slate-900">
                                                    {dictLoading ? <SelectItem value="loading" disabled>Đang tải...</SelectItem> : dicts['GEO_WORKING_HOURS']?.map((o: any) => <SelectItem key={o.code} value={o.name}>{o.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <span className="font-bold text-[10px] text-amber-700 uppercase dark:text-amber-500">Loại đất bề mặt</span>
                                            <Select value={geoData.soilType} onValueChange={v => setGeoData({ ...geoData, soilType: v })}>
                                                <SelectTrigger className="h-10 bg-white dark:border-slate-800 dark:bg-slate-950"><SelectValue /></SelectTrigger>
                                                <SelectContent className="dark:border-slate-800 dark:bg-slate-900">
                                                    {dictLoading ? <SelectItem value="loading" disabled>Đang tải...</SelectItem> : dicts['GEO_SOIL_TYPE']?.map((o: any) => <SelectItem key={o.code} value={o.name}>{o.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <span className="font-bold text-[10px] text-amber-700 uppercase dark:text-amber-500">Cốt nền</span>
                                            <Select value={geoData.elevation} onValueChange={v => setGeoData({ ...geoData, elevation: v })}>
                                                <SelectTrigger className="h-10 bg-white dark:border-slate-800 dark:bg-slate-950"><SelectValue /></SelectTrigger>
                                                <SelectContent className="dark:border-slate-800 dark:bg-slate-900">
                                                    {dictLoading ? <SelectItem value="loading" disabled>Đang tải...</SelectItem> : dicts['GEO_ELEVATION']?.map((o: any) => <SelectItem key={o.code} value={o.name}>{o.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {isCaiTaoTask && (
                            <div className="space-y-6">
                                <div className="space-y-4 rounded-2xl border border-rose-200 bg-rose-50/50 p-5 shadow-inner transition-colors dark:border-rose-500/20 dark:bg-rose-500/10">
                                    <Label className="flex items-center gap-2 border-b border-rose-200 pb-2 text-sm font-black tracking-widest text-rose-800 uppercase dark:border-rose-500/20 dark:text-rose-400">
                                        <ShieldAlert className="h-4 w-4 text-rose-600 dark:text-rose-500" /> HIỆN TRẠNG KẾT CẤU CŨ
                                    </Label>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-1.5">
                                            <span className="font-bold text-[10px] text-rose-700 uppercase dark:text-rose-500">Tình trạng Dầm / Cột</span>
                                            <Select value={renoData.beamColumnStatus} onValueChange={v => setRenoData({ ...renoData, beamColumnStatus: v })}>
                                                <SelectTrigger className="h-10 bg-white font-bold text-rose-800 dark:border-slate-800 dark:bg-slate-950 dark:text-rose-400"><SelectValue /></SelectTrigger>
                                                <SelectContent className="dark:border-slate-800 dark:bg-slate-900">
                                                    {dictLoading ? <SelectItem value="loading" disabled>Đang tải...</SelectItem> : dicts['RENO_BEAM_COLUMN']?.map((o: any) => <SelectItem key={o.code} value={o.name}>{o.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-inner transition-colors dark:border-emerald-500/20 dark:bg-emerald-500/10">
                                    <Label className="flex items-center gap-2 border-b border-emerald-200 pb-2 text-sm font-black tracking-widest text-emerald-800 uppercase dark:border-emerald-500/20 dark:text-emerald-400">
                                        <ClipboardList className="h-4 w-4 text-emerald-600 dark:text-emerald-500" /> CHI TIẾT HẠNG MỤC CẢI TẠO
                                    </Label>
                                    <div className="space-y-3">
                                        {renoData.repairItems.map((item: any) => (
                                            <div key={item.id} className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-white p-2 shadow-sm transition-all hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-950">
                                                <Input placeholder="Khu vực" value={item.area} onChange={(e) => handleRepairItemChange(item.id, 'area', e.target.value)} className="w-1/3 text-xs bg-slate-50 dark:bg-slate-900 border-none" />
                                                <Input placeholder="Công tác" value={item.task} onChange={(e) => handleRepairItemChange(item.id, 'task', e.target.value)} className="w-1/2 text-xs bg-slate-50 dark:bg-slate-900 border-none" />
                                                <Input placeholder="KL" value={item.volume} onChange={(e) => handleRepairItemChange(item.id, 'volume', e.target.value)} className="w-1/4 text-xs bg-slate-50 dark:bg-slate-900 border-none" />
                                                <Button type="button" variant="ghost" size="icon" className="shrink-0 text-red-400 hover:text-red-600 dark:hover:bg-red-500/10" onClick={() => removeRepairItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                        ))}
                                        <Button type="button" variant="outline" size="sm" onClick={addRepairItem} className="w-full border-dashed border-emerald-300 bg-emerald-50 text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-500/5 dark:text-emerald-400 dark:hover:bg-emerald-500/10"><Plus className="mr-2 h-4 w-4" /> Thêm hạng mục</Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {isNoiThatTask && (
                            <div className="space-y-6">
                                <div className="space-y-4 rounded-2xl border border-violet-200 bg-violet-50/50 p-5 shadow-inner transition-colors dark:border-violet-500/20 dark:bg-violet-500/10">
                                    <Label className="flex items-center gap-2 border-b border-violet-200 pb-2 text-sm font-black tracking-widest text-violet-800 uppercase dark:border-violet-500/20 dark:text-violet-400">
                                        <Palette className="h-4 w-4 text-violet-600 dark:text-violet-500" /> PHONG CÁCH NỘI THẤT
                                    </Label>
                                    <Select value={interiorData.designStyle} onValueChange={v => setInteriorData({ ...interiorData, designStyle: v })}>
                                        <SelectTrigger className="h-10 bg-white font-bold text-violet-800 dark:border-slate-800 dark:bg-slate-950 dark:text-violet-400"><SelectValue /></SelectTrigger>
                                        <SelectContent className="dark:border-slate-800 dark:bg-slate-900">
                                            {dictLoading ? <SelectItem value="loading" disabled>Đang tải...</SelectItem> : dicts['INT_DESIGN_STYLE']?.map((o: any) => <SelectItem key={o.code} value={o.name}>{o.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-4 rounded-2xl border border-violet-200 bg-violet-50/50 p-5 shadow-inner transition-colors dark:border-violet-500/20 dark:bg-violet-500/10">
                                    <Label className="flex items-center gap-2 border-b border-violet-200 pb-2 text-sm font-black tracking-widest text-violet-800 uppercase dark:border-violet-500/20 dark:text-violet-400">
                                        <Sofa className="h-4 w-4 text-violet-600 dark:text-violet-500" /> BẢNG KÊ NỘI THẤT
                                    </Label>
                                    <div className="space-y-3">
                                        {interiorData.interiorItems.map((item: any) => (
                                            <div key={item.id} className="flex items-center gap-2 rounded-lg border border-violet-100 bg-white p-2 transition-all dark:border-slate-800 dark:bg-slate-950">
                                                <Input placeholder="Tên" value={item.name} onChange={(e) => handleInteriorItemChange(item.id, 'name', e.target.value)} className="w-1/4 text-xs bg-slate-50 dark:bg-slate-900 border-none" />
                                                <Input placeholder="Vật liệu" value={item.material} onChange={(e) => handleInteriorItemChange(item.id, 'material', e.target.value)} className="w-1/4 text-xs bg-slate-50 dark:bg-slate-900 border-none" />
                                                <Button type="button" variant="ghost" size="icon" className="text-red-400 hover:text-red-600" onClick={() => removeInteriorItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                        ))}
                                        <Button type="button" variant="outline" size="sm" onClick={addInteriorItem} className="w-full border-dashed border-violet-300 bg-violet-50 text-violet-700 transition-colors dark:border-violet-800 dark:bg-violet-500/5 dark:text-violet-400"><Plus className="mr-2 h-4 w-4" /> Thêm đồ gỗ</Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {isFengShuiTask && (
                            <div className="space-y-4 rounded-2xl border border-orange-100 bg-orange-50/50 p-5 shadow-inner transition-colors dark:border-orange-500/20 dark:bg-orange-500/10">
                                <div className="flex items-center justify-between border-b pb-2 dark:border-slate-800">
                                    <Label className="flex items-center gap-2 text-sm font-bold text-orange-800 dark:text-orange-400"><Sparkles className="h-4 w-4 text-orange-500" /> DATA GIA CHỦ & NHÀ</Label>
                                    <Button type="button" size="sm" className="bg-orange-600 text-white shadow-lg hover:bg-orange-700" onClick={() => setShowCompass(true)}><Compass className="mr-2 h-4 w-4" /> Đo La bàn</Button>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input placeholder="Họ tên" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100 h-10 border-orange-200" />
                                    <Input type="number" placeholder="Năm sinh" value={birthYear} onChange={(e) => setBirthYear(Number(e.target.value))} className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100 h-10 border-orange-200" />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label className="text-xs font-black tracking-widest text-slate-500 uppercase dark:text-slate-400">Ghi chú & Data Ẩn</Label>
                            <Textarea name="result_data_text" rows={5} value={resultText} onChange={(e) => setResultText(e.target.value)} className="text-sm font-medium border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 dark:text-slate-100 transition-colors" />
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-black tracking-widest text-slate-500 uppercase dark:text-slate-400">Ảnh đính kèm</Label>
                                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="h-8 border-dashed border-slate-300 dark:border-slate-800 text-blue-600 dark:text-blue-400 dark:bg-slate-950 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"><Camera className="mr-2 h-3.5 w-3.5" /> Thêm ảnh</Button>
                            </div>
                            {(existingImages.length > 0 || selectedImages.length > 0) ? (
                                <div className="grid grid-cols-3 gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3 transition-colors sm:grid-cols-4 dark:border-slate-800 dark:bg-slate-950">
                                    {existingImages.map((url, i) => (
                                        <div key={`old-${i}`} className="group relative aspect-square overflow-hidden rounded-lg border border-white shadow-sm transition-colors dark:border-slate-800">
                                            <Image src={url} alt="Old" fill className="object-cover opacity-90" />
                                            <div className="absolute inset-x-0 bottom-0 bg-slate-900/60 py-0.5 text-center font-bold tracking-widest text-white text-[8px] uppercase dark:bg-black/60">Đã lưu</div>
                                            <button type="button" onClick={() => removeExistingImage(i)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3" /></button>
                                        </div>
                                    ))}
                                    {selectedImages.map((img, i) => (
                                        <div key={`new-${i}`} className="group relative aspect-square overflow-hidden rounded-lg border border-white shadow-sm transition-colors dark:border-slate-800">
                                            <Image src={img.preview} alt="Preview" fill className="object-cover" />
                                            <div className="absolute inset-x-0 bottom-0 bg-blue-600/80 py-0.5 text-center font-bold tracking-widest text-white text-[8px] uppercase">Mới</div>
                                            <button type="button" onClick={() => removeNewImage(i)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3" /></button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div onClick={() => fileInputRef.current?.click()} className="py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer transition-colors">
                                    <Camera className="mb-2 h-8 w-8 opacity-20" /><p className="font-medium tracking-widest text-[10px] uppercase">Chưa có ảnh tải lên</p>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 border-t pt-4 transition-colors dark:border-slate-800">
                            <div className="space-y-2">
                                <Label className="font-black tracking-widest text-[10px] text-slate-500 uppercase dark:text-slate-400">Trạng thái</Label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger className="h-10 rounded-xl font-bold dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"><SelectValue /></SelectTrigger>
                                    <SelectContent className="dark:border-slate-800 dark:bg-slate-900"><SelectItem value="pending">Đang xử lý</SelectItem><SelectItem value="completed">Hoàn thành</SelectItem></SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="font-black tracking-widest text-[10px] text-slate-500 uppercase dark:text-slate-400">Chi phí (VNĐ)</Label>
                                <Input name="cost" type="number" value={cost} onChange={(e) => setCost(Number(e.target.value))} className="h-10 rounded-xl font-mono font-bold dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100" />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800">Đóng</Button>
                            <SubmitResultButton />
                        </div>
                    </form>
                )}

                {showCompass && (
                    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-950/98 p-4 transition-all">
                        <div className="relative flex w-full max-w-md flex-col items-center">
                            <Button variant="ghost" size="icon" className="absolute -top-12 right-0 text-white/50 hover:text-white" onClick={() => setShowCompass(false)}><X className="h-8 w-8" /></Button>
                            <FengShuiCompass projectId={projectId} ownerName={ownerName} birthYear={birthYear} gender={gender} onSaveResult={handleCompassSave} />
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}