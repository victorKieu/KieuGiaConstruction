"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { updateSurveyTaskResult } from "@/lib/action/surveyActions";
import { useActionState } from 'react';
import { useFormStatus } from "react-dom";
import { Loader2, Edit3, Compass, Sparkles, CheckCircle2, X, ImagePlus, Camera, Eye, FileText, AlertTriangle, Crosshair, Map, Truck, Droplets, Zap, Pickaxe, FileBadge, AlertCircle, Hammer, Mountain, Ruler, ShieldAlert, Clock, ClipboardList, Plus, Trash2, Sofa, Palette, Grid, Layout } from "lucide-react";
import FengShuiCompass from "./FengShuiCompass";
import { toast } from "sonner";
import Image from "next/image";
import { evaluateFengShui, generateFengShuiReportText, type FullFengShuiAnalysis, LOAN_DAU_DICTIONARY, generateLoanDauReportText } from "@/lib/utils/fengShui";
import { calculateFlyingStars, calculateThanSat, type FlyingStarResult, type ThanSatResult } from "@/lib/utils/advancedFengShui";

// ================= CÁC TÙY CHỌN CHO KHẢO SÁT =================
const GEO_OPTIONS = {
    roadAccess: ["Ngõ < 2m (Chỉ xe ba gác)", "Ngõ 2-3m (Xe tải 1 tấn)", "Đường > 3m (Xe cẩu, bê tông vào tận nơi)"],
    storage: ["Có bãi tập kết rộng", "Phải để vật tư ngoài đường", "Rất chật, phải vận chuyển vật tư theo ngày"],
    elevation: ["Thấp hơn mặt đường (Dễ ngập)", "Bằng mặt đường", "Cao hơn mặt đường"],
    soilType: ["Đất thổ cư lâu năm (Cứng)", "Đất ruộng, ao hồ san lấp (Mềm, sình lầy)", "Đất pha cát / sỏi đá"],
    waterLevel: ["Sâu (Khô ráo, dễ làm móng)", "Nông (Đào móng dễ ngập nước)"],
    electricity: ["Có sẵn đồng hồ", "Phải kéo nhờ hàng xóm", "Chưa có, phải xin cấp mới"],
    water: ["Có nước máy", "Dùng nước giếng khoan", "Chưa có nguồn nước"],
    drainage: ["Có hệ thống cống thành phố", "Chưa có, phải tự thấm"],
    neighbor: ["Nhà cấp 4 cũ/yếu", "Nhà cao tầng móng cọc", "Đất trống", "Tường xây sát ranh, không khe hở", "Đã nứt tường/thấm dột từ trước"],
    workingHours: ["Được thi công cả ngày", "Cấm thi công giờ nghỉ trưa", "Chỉ làm giờ hành chính (Nghỉ Chủ Nhật)"],
    vehicleLimit: ["Không cấm tải/cấm giờ", "Cấm xe tải theo giờ hành chính", "Cấm xe bồn, phải trộn tay/trạm mini"],
    sanitation: ["Bình thường", "Phải quây bạt kín 100%", "Khu vực khắt khe về tiếng ồn/bụi"]
};

const TOPO_OPTIONS = {
    obstaclesAir: ["Không vướng mắc", "Vướng dây điện/Cáp viễn thông chằng chịt", "Vướng cây xanh lớn, ban công nhà đối diện"],
    obstaclesUnderground: ["Đất nguyên thổ", "Có hầm tự hoại/bể nước ngầm cũ", "Có giếng khoan cũ", "Có đường ống nước/cáp ngầm chạy ngang"],
    demolition: ["Đất trống, thi công được ngay", "Có nhà cũ cần đập phá tháo dỡ", "Nhà cũ mượn tường hàng xóm (Cực kỳ cẩn thận)"],
    debris: ["Không có", "Có cây cổ thụ cần bứng gốc/xin phép", "Cần dọn dẹp nhiều xà bần"],
    foundationEquip: ["Vào được máy ép tải sắt / Robot ép", "Chỉ vào được máy ép Neo", "Chỉ thi công được cọc khoan nhồi mini", "Làm móng nông (Băng/Đơn)"],
    diggingMethod: ["Đào mở trần tự do", "Phải đóng cừ tràm/Cừ Larsen chặn đất", "Phải chống văng nhà hàng xóm"]
};

const RENO_OPTIONS = {
    beamColumnStatus: ["Bình thường, chịu lực tốt", "Nứt chân chim lớp vữa", "Nứt kết cấu, lòi thép han gỉ"],
    waterproofing: ["Không thấm", "Thấm tường ngoài", "Thấm sàn mái / Sê-nô", "Thấm vách giáp ranh hàng xóm"],
    oldFoundation: ["Khung BTCT (Đập tường thoải mái)", "Tường chịu lực 220 (Cấm đập)", "Không xác định rõ (Cần đục thăm dò)"],
    reusableMats: ["Bỏ hết (Đập trắng)", "Tận dụng cửa, thiết bị vệ sinh", "Tận dụng ngói, xà gồ mái"],
    landComparison: ["Khớp 100% với Sổ đỏ", "Thực tế NHỎ HƠN sổ (Bị lấn chiếm)", "Thực tế LỚN HƠN sổ (Đất dư)"],
    landShape: ["Vuông vức", "Nở hậu (Tốt)", "Thóp hậu (Cần xử lý kiến trúc/phong thủy)", "Đa giác phức tạp"],
    boundary: ["Đã xây tường rào rõ rệt", "Chỉ cắm cọc tạm", "Chưa xác định rõ, cần địa chính đo lại"]
};

const INTERIOR_OPTIONS = {
    designStyle: ["Hiện đại (Modern)", "Tân cổ điển (Neoclassic)", "Đông Dương (Indochine)", "Tối giản (Minimalist)", "Bắc Âu / Japandi", "Chưa xác định"],
    ceilingState: ["Trần thạch cao phẳng (Giữ nguyên)", "Trần giật cấp cũ (Cần sửa/thay)", "Trần bê tông nguyên thủy", "Trần nhựa/nhôm (Cần tháo dỡ)"],
    floorState: ["Gạch men cũ (Cần đập bỏ cán nền)", "Gạch men/Đá mới (Giữ nguyên)", "Sàn gỗ công nghiệp (Cần lột bỏ)", "Sàn gỗ tự nhiên (Bảo dưỡng lại)", "Sàn bê tông thô"],
    wallState: ["Tường sơn bả tốt (Chỉ sơn lại)", "Tường bong tróc, ẩm mốc (Cần chống thấm)", "Tường dán giấy/ốp nhựa (Cần lột bỏ)"],
    kitchenState: ["Chưa có gì (Làm mới hoàn toàn)", "Tủ bếp cũ (Giữ khung, thay cánh)", "Tủ bếp hỏng (Đập bỏ làm mới)", "Hiện trạng tốt (Giữ nguyên)"],
    wcState: ["Thiết bị tốt, ốp lát đẹp (Giữ lại)", "Cần thay thiết bị vệ sinh mới", "Cần đập phá ốp lát, đi lại điện nước"]
};

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

    const defaultGeoData = {
        isDrilling: false, roadAccess: GEO_OPTIONS.roadAccess[1], storage: GEO_OPTIONS.storage[0], elevation: GEO_OPTIONS.elevation[1],
        soilType: GEO_OPTIONS.soilType[0], waterLevel: GEO_OPTIONS.waterLevel[0], electricity: GEO_OPTIONS.electricity[0], water: GEO_OPTIONS.water[0], drainage: GEO_OPTIONS.drainage[0],
        neighborLeft: GEO_OPTIONS.neighbor[0], neighborRight: GEO_OPTIONS.neighbor[0], neighborBack: GEO_OPTIONS.neighbor[2],
        workingHours: GEO_OPTIONS.workingHours[0], vehicleLimit: GEO_OPTIONS.vehicleLimit[0], sanitation: GEO_OPTIONS.sanitation[0],
        drillingHoles: 3, drillingDepth: 30, drillingWaterLevel: 2.5, drillingSpt: "Có thực hiện 2m / 1 nhát",
        drillingMethod: "Khoan xoay bơm rửa bằng bentonite", foundationLayer: "Sét pha trạng thái dẻo cứng", loadCapacity: "15 - 20 Tấn/m2"
    };
    const [geoData, setGeoData] = useState(defaultGeoData);

    const defaultTopoData = {
        obstaclesAir: TOPO_OPTIONS.obstaclesAir[0], obstaclesUnderground: TOPO_OPTIONS.obstaclesUnderground[0],
        demolition: TOPO_OPTIONS.demolition[0], debris: TOPO_OPTIONS.debris[0],
        foundationEquip: TOPO_OPTIONS.foundationEquip[0], diggingMethod: TOPO_OPTIONS.diggingMethod[0],
    };
    const [topoData, setTopoData] = useState(defaultTopoData);

    const defaultRenoData = {
        beamColumnStatus: RENO_OPTIONS.beamColumnStatus[0], waterproofing: RENO_OPTIONS.waterproofing[0],
        oldFoundation: RENO_OPTIONS.oldFoundation[0], reusableMats: RENO_OPTIONS.reusableMats[0],
        landComparison: RENO_OPTIONS.landComparison[0], landShape: RENO_OPTIONS.landShape[0], boundary: RENO_OPTIONS.boundary[0],
        repairItems: [] as { id: string, area: string, task: string, volume: string }[]
    };
    const [renoData, setRenoData] = useState(defaultRenoData);

    // State Nội thất
    const defaultInteriorData = {
        designStyle: INTERIOR_OPTIONS.designStyle[0],
        ceilingState: INTERIOR_OPTIONS.ceilingState[0],
        floorState: INTERIOR_OPTIONS.floorState[0],
        wallState: INTERIOR_OPTIONS.wallState[0],
        kitchenState: INTERIOR_OPTIONS.kitchenState[0],
        wcState: INTERIOR_OPTIONS.wcState[0],
        // Dữ liệu bóc tách chi tiết hạng mục nội thất
        interiorItems: [] as { id: string, name: string, dimensions: string, material: string, notes: string }[]
    };
    const [interiorData, setInteriorData] = useState(defaultInteriorData);

    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [selectedImages, setSelectedImages] = useState<{ file: File, preview: string }[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const reportRef = useRef<HTMLDivElement>(null);

    // ==============================================================
    // ✅ THUẬT TOÁN NHẬN DIỆN TASK ĐỘC QUYỀN
    // ==============================================================
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

    const getFormCode = () => {
        if (isNoiThatTask) return "BM-KS-06";
        if (isCaiTaoTask) return "BM-KS-05";
        if (isDiaHinhTask) return "BM-KS-04";
        if (isDiaChatTask) return "BM-KS-03";
        if (isLoanDauTask) return "BM-KS-02";
        if (isFengShuiTask) return "BM-KS-01";
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
                if (data.loanDau) setSelectedLoanDau(data.loanDau);

                if (data.geoData) setGeoData({ ...defaultGeoData, ...data.geoData });
                if (data.topoData) setTopoData({ ...defaultTopoData, ...data.topoData });
                if (data.renoData) setRenoData({ ...defaultRenoData, ...data.renoData, repairItems: data.renoData.repairItems || [] });
                if (data.interiorData) setInteriorData({ ...defaultInteriorData, ...data.interiorData, interiorItems: data.interiorData.interiorItems || [] });

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

        const finalAnalysisJson = JSON.stringify(currentData);

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

    // HÀM QUẢN LÝ BẢNG KÊ CẢI TẠO
    const addRepairItem = () => setRenoData({ ...renoData, repairItems: [...renoData.repairItems, { id: Date.now().toString(), area: '', task: '', volume: '' }] });
    const removeRepairItem = (id: string) => setRenoData({ ...renoData, repairItems: renoData.repairItems.filter(item => item.id !== id) });
    const handleRepairItemChange = (id: string, field: 'area' | 'task' | 'volume', value: string) => setRenoData({ ...renoData, repairItems: renoData.repairItems.map(item => item.id === id ? { ...item, [field]: value } : item) });

    // HÀM QUẢN LÝ BẢNG KÊ NỘI THẤT
    const addInteriorItem = () => setInteriorData({ ...interiorData, interiorItems: [...interiorData.interiorItems, { id: Date.now().toString(), name: '', dimensions: '', material: '', notes: '' }] });
    const removeInteriorItem = (id: string) => setInteriorData({ ...interiorData, interiorItems: interiorData.interiorItems.filter(item => item.id !== id) });
    const handleInteriorItemChange = (id: string, field: 'name' | 'dimensions' | 'material' | 'notes', value: string) => setInteriorData({ ...interiorData, interiorItems: interiorData.interiorItems.map(item => item.id === id ? { ...item, [field]: value } : item) });

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
                html2canvas: { scale: 3, useCORS: true, letterRendering: true },
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
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
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
                            const dirNamesVi: Record<string, string> = { 'NW': 'Tây Bắc', 'N': 'Bắc', 'NE': 'Đông Bắc', 'W': 'Tây', 'CENTER': 'Trung Cung', 'E': 'Đông', 'SW': 'Tây Nam', 'S': 'Nam', 'SE': 'Đông Nam' };

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

                    <div className="pt-5 border-t border-slate-200">
                        <h4 className="text-xs font-black text-slate-700 uppercase mb-3 flex items-center gap-2">
                            <Crosshair className="w-4 h-4 text-amber-600" /> Tọa độ Thần Sát (Cắt cổng, Mở cửa)
                        </h4>
                        <div className="space-y-2">
                            {thanSat.map((item, idx) => (
                                <div key={idx} className={`flex items-start gap-3 p-3 border rounded-lg ${item.isGood ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
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
            </div>
        );
    };

    const hasManualNotes = task?.notes && !task.notes.includes("[BÁO CÁO PHONG THỦY") && !task.notes.includes("[BÁO CÁO KHẢO SÁT LOAN ĐẦU");
    const isCompleted = task?.status === 'completed';

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className={`gap-2 h-8 transition-all ${isCompleted ? 'border-blue-200 bg-blue-50/50 text-blue-700' : 'border-green-200 bg-green-50/50 text-green-700'}`}>
                    {isCompleted ? <><Eye className="h-3.5 w-3.5" /> Xem kết quả</> : <><Edit3 className="h-3.5 w-3.5" /> Ghi kết quả</>}
                </Button>
            </DialogTrigger>

            <DialogContent aria-describedby={undefined} className="sm:max-w-[900px] w-[95vw] max-h-[95vh] overflow-hidden !p-0 gap-0 border-none shadow-2xl bg-slate-200 flex flex-col">

                {/* ========================================================================= */}
                {/* ✅ MÀN HÌNH VIEW MODE (CHẾ ĐỘ IN A4 TRỰC QUAN - WYSIWYG) */}
                {/* ========================================================================= */}
                {isViewMode ? (
                    <>
                        <div className="shrink-0 flex items-center justify-between p-4 bg-slate-900 text-white shadow-md z-10">
                            <div>
                                <DialogTitle className="text-lg font-black uppercase flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-blue-400" /> BẢN XEM TRƯỚC BÁO CÁO
                                </DialogTitle>
                                <p className="text-xs text-slate-400 mt-1 truncate max-w-sm">{finalTaskTitle}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" className="border-slate-600 bg-slate-800 hover:bg-slate-700 text-white" onClick={() => setIsOpen(false)}>
                                    Đóng
                                </Button>
                                <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg" onClick={() => setIsViewMode(false)}>
                                    <Edit3 className="w-4 h-4 mr-2" /> Chỉnh sửa
                                </Button>
                                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg" onClick={handleExportPDF} disabled={isExporting}>
                                    {isExporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />} Xuất PDF
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200">
                            <div
                                ref={reportRef}
                                className="bg-white mx-auto shadow-xl text-slate-900 font-sans"
                                style={{ maxWidth: '794px', width: '100%', padding: '40px' }}
                            >
                                {/* HEADER BÁO CÁO */}
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
                                                    <span className="shrink-0">Mã số BM:</span><span className="font-bold text-red-700 text-right leading-normal">{formCode}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>

                                <div className="text-center mb-8" style={{ pageBreakInside: 'avoid' }}>
                                    <h2 className="text-[22px] font-black uppercase text-red-700 tracking-wide mb-2">{finalTaskTitle}</h2>
                                    <p className="text-sm font-bold text-slate-800 bg-slate-100 inline-block px-5 py-2 rounded-full border border-slate-300 shadow-sm break-words max-w-full">
                                        Dự án: {projectName || "Tên dự án chưa được cập nhật"}
                                    </p>
                                </div>

                                {/* ============ KHỐI 1: PHONG THỦY ============ */}
                                {fsAnalysis && isFengShuiTask && (
                                    <>
                                        <div className="mb-6" style={{ pageBreakInside: 'avoid' }}>
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

                                        <div className="mb-8" style={{ pageBreakInside: 'avoid' }}>
                                            <h3 className="text-sm font-bold text-white bg-blue-900 px-3 py-1.5 uppercase mb-4 inline-block rounded-t-md">III. SƠ ĐỒ CỬU CUNG BỐ TRÍ MẶT BẰNG</h3>
                                            <div className="border border-slate-300 bg-slate-50 rounded-xl p-4 max-w-[400px] mx-auto">
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
                                            <p className="text-center text-[11px] text-slate-600 font-medium italic mt-4">Sơ đồ ma trận 9 ô (Cửu cung) giúp định vị sơ bộ các khối chức năng trên mặt bằng khu đất.</p>
                                        </div>

                                        <div className="html2pdf__page-break"></div>
                                        {flyingStars && thanSat && (
                                            <div className="mb-8" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                                                {renderAdvancedFengShui()}
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* ============ KHỐI 2: LOAN ĐẦU ============ */}
                                {isLoanDauTask && selectedLoanDau.length > 0 && (
                                    <div className="mb-8" style={{ pageBreakInside: 'avoid' }}>
                                        <h3 className="text-sm font-bold text-white bg-emerald-700 px-3 py-1.5 uppercase mb-4 inline-block rounded-t-md">I. KHẢO SÁT LOAN ĐẦU (CẢNH QUAN)</h3>
                                        <div className="space-y-4">
                                            {selectedLoanDau.map((id, index) => {
                                                const item = LOAN_DAU_DICTIONARY.find(d => d.id === id);
                                                if (!item) return null;
                                                return (
                                                    <div key={id} className="border border-emerald-700/20 p-4 rounded-xl bg-emerald-50/50 text-sm">
                                                        <p className="font-black text-emerald-800 mb-2 uppercase">{index + 1}. {item.name}</p>
                                                        <p className="text-slate-700 mb-1.5 leading-relaxed"><strong>Hiện trạng:</strong> {item.desc}</p>
                                                        <p className="text-amber-700 font-medium leading-relaxed"><strong>Giải pháp:</strong> {item.remedy}</p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* ============ KHỐI 3: ĐỊA CHẤT & LOGISTICS ============ */}
                                {isDiaChatTask && (
                                    <div className="mb-8">
                                        <h3 className="text-sm font-bold text-white bg-amber-700 px-3 py-1.5 uppercase mb-4 inline-block rounded-t-md" style={{ pageBreakInside: 'avoid' }}>I. BÁO CÁO KHẢO SÁT ĐỊA CHẤT & HẠ TẦNG</h3>
                                        <div className="border border-slate-300 rounded-lg overflow-hidden mb-6" style={{ pageBreakInside: 'avoid' }}>
                                            <table className="w-full text-sm text-left border-collapse">
                                                <tbody>
                                                    <tr className="bg-slate-100"><th colSpan={2} className="p-2 border-b border-slate-300 font-bold text-slate-800 uppercase text-xs">1. Giao thông & Điều kiện thi công</th></tr>
                                                    <tr><td className="p-2 border-b border-r border-slate-200 w-[35%] font-medium">Đường tiếp cận</td><td className="p-2 border-b border-slate-200">{geoData.roadAccess}</td></tr>
                                                    <tr><td className="p-2 border-b border-r border-slate-200 font-medium">Bãi tập kết vật tư</td><td className="p-2 border-b border-slate-200">{geoData.storage}</td></tr>
                                                    <tr><td className="p-2 border-b border-r border-slate-200 font-medium">Cốt nền hiện trạng</td><td className="p-2 border-b border-slate-200">{geoData.elevation}</td></tr>
                                                    <tr><td className="p-2 border-b border-r border-slate-200 font-medium text-amber-700">Giờ giấc thi công</td><td className="p-2 border-b border-slate-200 font-medium text-amber-700">{geoData.workingHours}</td></tr>
                                                    <tr><td className="p-2 border-b border-r border-slate-200 font-medium text-amber-700">Hạn chế xe cơ giới</td><td className="p-2 border-b border-slate-200 font-medium text-amber-700">{geoData.vehicleLimit}</td></tr>
                                                    <tr><td className="p-2 border-b border-r border-slate-200 font-medium text-amber-700">Quy định Vệ sinh/Môi trường</td><td className="p-2 border-b border-slate-200 font-medium text-amber-700">{geoData.sanitation}</td></tr>

                                                    <tr className="bg-slate-100"><th colSpan={2} className="p-2 border-b border-slate-300 font-bold text-slate-800 uppercase text-xs">2. Địa chất sơ bộ & Điện nước</th></tr>
                                                    <tr><td className="p-2 border-b border-r border-slate-200 font-medium">Loại đất bề mặt</td><td className="p-2 border-b border-slate-200">{geoData.soilType}</td></tr>
                                                    <tr><td className="p-2 border-b border-r border-slate-200 font-medium">Mực nước ngầm</td><td className="p-2 border-b border-slate-200">{geoData.waterLevel}</td></tr>
                                                    <tr><td className="p-2 border-b border-r border-slate-200 font-medium">Nguồn điện</td><td className="p-2 border-b border-slate-200">{geoData.electricity}</td></tr>
                                                    <tr><td className="p-2 border-b border-r border-slate-200 font-medium">Nguồn nước</td><td className="p-2 border-b border-slate-200">{geoData.water}</td></tr>
                                                    <tr><td className="p-2 border-b border-r border-slate-200 font-medium">Hệ thống thoát nước</td><td className="p-2 border-b border-slate-200">{geoData.drainage}</td></tr>

                                                    <tr className="bg-slate-100"><th colSpan={2} className="p-2 border-b border-slate-300 font-bold text-slate-800 uppercase text-xs">3. Khảo sát công trình giáp ranh</th></tr>
                                                    <tr><td className="p-2 border-b border-r border-slate-200 font-medium">Giáp ranh Bên Trái</td><td className="p-2 border-b border-slate-200">{geoData.neighborLeft}</td></tr>
                                                    <tr><td className="p-2 border-b border-r border-slate-200 font-medium">Giáp ranh Bên Phải</td><td className="p-2 border-b border-slate-200">{geoData.neighborRight}</td></tr>
                                                    <tr><td className="p-2 border-b border-r border-slate-200 font-medium">Giáp ranh Phía Sau</td><td className="p-2 border-b border-slate-200">{geoData.neighborBack}</td></tr>
                                                </tbody>
                                            </table>
                                        </div>

                                        {geoData.isDrilling && (
                                            <div style={{ pageBreakInside: 'avoid' }}>
                                                <h4 className="text-xs font-bold text-red-800 bg-red-100 px-3 py-1.5 uppercase mb-2 inline-block rounded-t-md">THÔNG SỐ KHOAN ĐỊA CHẤT (TCVN 9363:2012)</h4>
                                                <table className="w-full text-sm text-left border-collapse border border-red-200">
                                                    <tbody>
                                                        <tr><td className="p-2 border-b border-r border-red-200 bg-red-50 w-1/3 font-medium">Tổng số hố khoan</td><td className="p-2 border-b border-red-200 font-bold">{geoData.drillingHoles} hố</td></tr>
                                                        <tr><td className="p-2 border-b border-r border-red-200 bg-red-50 font-medium">Chiều sâu thiết kế</td><td className="p-2 border-b border-red-200">{geoData.drillingDepth} mét</td></tr>
                                                        <tr><td className="p-2 border-b border-r border-red-200 bg-red-50 font-medium">Mực nước tĩnh</td><td className="p-2 border-b border-red-200">Độ sâu {geoData.drillingWaterLevel} mét</td></tr>
                                                        <tr><td className="p-2 border-b border-r border-red-200 bg-red-50 font-medium">Thí nghiệm SPT</td><td className="p-2 border-b border-red-200">{geoData.drillingSpt}</td></tr>
                                                        <tr><td className="p-2 border-b border-r border-red-200 bg-red-50 font-medium">Phương pháp khoan</td><td className="p-2 border-b border-red-200">{geoData.drillingMethod}</td></tr>
                                                        <tr><td className="p-2 border-b border-r border-red-200 bg-red-50 font-medium text-red-800">Lớp đất đặt mũi cọc</td><td className="p-2 border-b border-red-200 font-bold text-red-800">{geoData.foundationLayer}</td></tr>
                                                        <tr><td className="p-2 border-b border-r border-red-200 bg-red-50 font-medium text-red-800">Sức chịu tải (Rtc)</td><td className="p-2 border-b border-red-200 font-bold text-red-800">{geoData.loadCapacity}</td></tr>
                                                    </tbody>
                                                </table>
                                                <p className="text-[10px] text-slate-500 italic mt-2">Kết quả dựa trên hồ sơ Báo cáo Khảo sát Địa chất có pháp nhân.</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ============ KHỐI 4: ĐỊA HÌNH & HIỆN TRẠNG ============ */}
                                {isDiaHinhTask && (
                                    <div className="mb-8">
                                        <h3 className="text-sm font-bold text-white bg-teal-700 px-3 py-1.5 uppercase mb-4 inline-block rounded-t-md" style={{ pageBreakInside: 'avoid' }}>I. BÁO CÁO KHẢO SÁT ĐỊA HÌNH & HIỆN TRẠNG</h3>
                                        <div className="border border-slate-300 rounded-lg overflow-hidden" style={{ pageBreakInside: 'avoid' }}>
                                            <table className="w-full text-sm text-left border-collapse">
                                                <tbody>
                                                    <tr className="bg-slate-100"><th colSpan={2} className="p-2 border-b border-slate-300 font-bold text-slate-800 uppercase text-xs">1. Chướng ngại vật (Không gian & Ngầm)</th></tr>
                                                    <tr><td className="p-2 border-b border-r border-slate-200 w-[35%] font-medium">Không gian trên không</td><td className="p-2 border-b border-slate-200 font-medium text-amber-700">{topoData.obstaclesAir}</td></tr>
                                                    <tr><td className="p-2 border-b border-r border-slate-200 font-medium">Hiện trạng ngầm</td><td className="p-2 border-b border-slate-200 font-medium text-amber-700">{topoData.obstaclesUnderground}</td></tr>

                                                    <tr className="bg-slate-100"><th colSpan={2} className="p-2 border-b border-slate-300 font-bold text-slate-800 uppercase text-xs">2. Công tác Tháo dỡ & Giải phóng mặt bằng</th></tr>
                                                    <tr><td className="p-2 border-b border-r border-slate-200 font-medium">Hiện trạng công trình</td><td className="p-2 border-b border-slate-200">{topoData.demolition}</td></tr>
                                                    <tr><td className="p-2 border-b border-r border-slate-200 font-medium">Dọn dẹp mặt bằng</td><td className="p-2 border-b border-slate-200">{topoData.debris}</td></tr>

                                                    <tr className="bg-slate-100"><th colSpan={2} className="p-2 border-b border-slate-300 font-bold text-slate-800 uppercase text-xs">3. Định hướng Biện pháp thi công</th></tr>
                                                    <tr><td className="p-2 border-b border-r border-slate-200 font-medium">Thiết bị thi công móng</td><td className="p-2 border-b border-slate-200 font-bold text-teal-800">{topoData.foundationEquip}</td></tr>
                                                    <tr><td className="p-2 border-b border-r border-slate-200 font-medium">Đào đất & Giữ vách móng</td><td className="p-2 border-b border-slate-200 font-bold text-teal-800">{topoData.diggingMethod}</td></tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* ============ KHỐI 5: KẾT CẤU & CẢI TẠO ============ */}
                                {isCaiTaoTask && (
                                    <div className="mb-8">
                                        <h3 className="text-sm font-bold text-white bg-rose-700 px-3 py-1.5 uppercase mb-4 inline-block rounded-t-md" style={{ pageBreakInside: 'avoid' }}>I. BÁO CÁO HIỆN TRẠNG KẾT CẤU & HÌNH HỌC</h3>
                                        <div className="border border-slate-300 rounded-lg overflow-hidden mb-6" style={{ pageBreakInside: 'avoid' }}>
                                            <table className="w-full text-sm text-left border-collapse">
                                                <tbody>
                                                    <tr className="bg-slate-100"><th colSpan={2} className="p-2 border-b border-slate-300 font-bold text-slate-800 uppercase text-xs">1. Hiện trạng Kết cấu công trình cũ</th></tr>
                                                    <tr><td className="p-2 border-b border-r border-slate-200 w-[35%] font-medium">Tình trạng Dầm/Cột</td><td className="p-2 border-b border-slate-200 font-bold text-rose-700">{renoData.beamColumnStatus}</td></tr>
                                                    <tr><td className="p-2 border-b border-r border-slate-200 font-medium">Khảo sát Thấm dột</td><td className="p-2 border-b border-slate-200 font-bold text-rose-700">{renoData.waterproofing}</td></tr>
                                                    <tr><td className="p-2 border-b border-r border-slate-200 font-medium">Kết cấu chịu tải chính</td><td className="p-2 border-b border-slate-200">{renoData.oldFoundation}</td></tr>
                                                    <tr><td className="p-2 border-b border-r border-slate-200 font-medium">Tận dụng vật tư</td><td className="p-2 border-b border-slate-200">{renoData.reusableMats}</td></tr>

                                                    <tr className="bg-slate-100"><th colSpan={2} className="p-2 border-b border-slate-300 font-bold text-slate-800 uppercase text-xs">2. Hình học khu đất & Ranh mốc</th></tr>
                                                    <tr><td className="p-2 border-b border-r border-slate-200 font-medium">Sổ đỏ vs Thực tế</td><td className="p-2 border-b border-slate-200 font-bold text-indigo-700">{renoData.landComparison}</td></tr>
                                                    <tr><td className="p-2 border-b border-r border-slate-200 font-medium">Hình dáng khu đất</td><td className="p-2 border-b border-slate-200">{renoData.landShape}</td></tr>
                                                    <tr><td className="p-2 border-b border-r border-slate-200 font-medium">Tình trạng ranh mốc</td><td className="p-2 border-b border-slate-200">{renoData.boundary}</td></tr>
                                                </tbody>
                                            </table>
                                        </div>

                                        {renoData.repairItems && renoData.repairItems.length > 0 && (
                                            <div className="border border-slate-300 rounded-lg overflow-hidden" style={{ pageBreakInside: 'avoid' }}>
                                                <table className="w-full text-sm text-left border-collapse">
                                                    <thead>
                                                        <tr className="bg-slate-100"><th colSpan={3} className="p-2 border-b border-slate-300 font-bold text-slate-800 uppercase text-xs">3. Bảng kê chi tiết hạng mục cần sửa chữa</th></tr>
                                                        <tr className="bg-slate-50 text-slate-600 text-xs">
                                                            <th className="p-2 border-b border-r border-slate-200 w-1/4">Khu vực / Phòng</th>
                                                            <th className="p-2 border-b border-r border-slate-200 w-1/2">Nội dung công việc đề xuất</th>
                                                            <th className="p-2 border-b border-slate-200 w-1/4">KL Sơ bộ</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {renoData.repairItems.map((item, idx) => (
                                                            <tr key={idx} className="hover:bg-slate-50">
                                                                <td className="p-2 border-b border-r border-slate-200 font-medium text-slate-800">{item.area || "-"}</td>
                                                                <td className="p-2 border-b border-r border-slate-200 text-slate-700">{item.task || "-"}</td>
                                                                <td className="p-2 border-b border-slate-200 text-slate-700">{item.volume || "-"}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ============ KHỐI 6: KHẢO SÁT NỘI THẤT ============ */}
                                {isNoiThatTask && (
                                    <div className="mb-8">
                                        <h3 className="text-sm font-bold text-white bg-violet-700 px-3 py-1.5 uppercase mb-4 inline-block rounded-t-md" style={{ pageBreakInside: 'avoid' }}>I. BÁO CÁO KHẢO SÁT HIỆN TRẠNG NỘI THẤT</h3>
                                        <div className="border border-slate-300 rounded-lg overflow-hidden mb-6" style={{ pageBreakInside: 'avoid' }}>
                                            <table className="w-full text-sm text-left border-collapse">
                                                <tbody>
                                                    <tr className="bg-slate-100"><th colSpan={2} className="p-2 border-b border-slate-300 font-bold text-slate-800 uppercase text-xs">1. Định hướng Thiết kế (Concept)</th></tr>
                                                    <tr><td className="p-2 border-b border-r border-slate-200 w-[35%] font-medium">Phong cách mong muốn</td><td className="p-2 border-b border-slate-200 font-bold text-violet-700">{interiorData.designStyle}</td></tr>

                                                    <tr className="bg-slate-100"><th colSpan={2} className="p-2 border-b border-slate-300 font-bold text-slate-800 uppercase text-xs">2. Hiện trạng Phần thô Nội thất (Fit-out)</th></tr>
                                                    <tr><td className="p-2 border-b border-r border-slate-200 font-medium">Trần nhà</td><td className="p-2 border-b border-slate-200">{interiorData.ceilingState}</td></tr>
                                                    <tr><td className="p-2 border-b border-r border-slate-200 font-medium">Sàn nhà</td><td className="p-2 border-b border-slate-200">{interiorData.floorState}</td></tr>
                                                    <tr><td className="p-2 border-b border-r border-slate-200 font-medium">Tường bao</td><td className="p-2 border-b border-slate-200">{interiorData.wallState}</td></tr>

                                                    <tr className="bg-slate-100"><th colSpan={2} className="p-2 border-b border-slate-300 font-bold text-slate-800 uppercase text-xs">3. Hiện trạng Đồ gỗ & Thiết bị</th></tr>
                                                    <tr><td className="p-2 border-b border-r border-slate-200 font-medium">Khu vực Bếp</td><td className="p-2 border-b border-slate-200 font-medium text-orange-700">{interiorData.kitchenState}</td></tr>
                                                    <tr><td className="p-2 border-b border-r border-slate-200 font-medium">Khu vực Vệ sinh</td><td className="p-2 border-b border-slate-200 font-medium text-orange-700">{interiorData.wcState}</td></tr>
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* BẢNG KÊ CHI TIẾT HẠNG MỤC NỘI THẤT TRONG PDF */}
                                        {interiorData.interiorItems && interiorData.interiorItems.length > 0 && (
                                            <div className="border border-slate-300 rounded-lg overflow-hidden" style={{ pageBreakInside: 'avoid' }}>
                                                <table className="w-full text-sm text-left border-collapse">
                                                    <thead>
                                                        <tr className="bg-slate-100"><th colSpan={4} className="p-2 border-b border-slate-300 font-bold text-slate-800 uppercase text-xs">4. Bảng kê chi tiết hạng mục đồ Nội thất dự kiến</th></tr>
                                                        <tr className="bg-slate-50 text-slate-600 text-xs">
                                                            <th className="p-2 border-b border-r border-slate-200 w-1/4">Tên hạng mục</th>
                                                            <th className="p-2 border-b border-r border-slate-200 w-1/4">Kích thước (D x R x C)</th>
                                                            <th className="p-2 border-b border-r border-slate-200 w-1/4">Vật liệu</th>
                                                            <th className="p-2 border-b border-slate-200 w-1/4">Ghi chú thêm</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {interiorData.interiorItems.map((item, idx) => (
                                                            <tr key={idx} className="hover:bg-slate-50">
                                                                <td className="p-2 border-b border-r border-slate-200 font-bold text-violet-700">{item.name || "-"}</td>
                                                                <td className="p-2 border-b border-r border-slate-200 text-slate-700">{item.dimensions || "-"}</td>
                                                                <td className="p-2 border-b border-r border-slate-200 text-slate-700">{item.material || "-"}</td>
                                                                <td className="p-2 border-b border-slate-200 text-slate-700">{item.notes || "-"}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ============ KHỐI GHI CHÚ CHUNG ============ */}
                                {hasManualNotes && (
                                    <div className="mb-8" style={{ pageBreakInside: 'avoid' }}>
                                        <h3 className="text-sm font-bold bg-slate-800 text-white px-3 py-1.5 uppercase mb-2 inline-block rounded-t-md">
                                            Ghi chú bổ sung
                                        </h3>
                                        <div className="border border-slate-400 p-4 text-sm leading-relaxed min-h-[60px] bg-slate-50 rounded-b-md rounded-tr-md">
                                            {task?.notes?.split('\n').map((line: string, index: number) => (
                                                <p key={index} style={{ marginBottom: '4px', whiteSpace: 'normal', wordBreak: 'break-word' }}>
                                                    {line || '\u00A0'}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* ============ KHỐI ẢNH ĐÍNH KÈM ============ */}
                                {existingImages.length > 0 && (
                                    <div style={{ pageBreakInside: 'avoid' }}>
                                        <h3 className="text-sm font-bold bg-slate-800 text-white px-3 py-1.5 uppercase mb-4 inline-block rounded-t-md">
                                            HÌNH ẢNH HIỆN TRẠNG THỰC ĐỊA
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            {existingImages.map((url, i) => (
                                                <div key={i} className="rounded-md border border-slate-400 bg-slate-100 flex items-center justify-center p-1 overflow-hidden" style={{ height: '260px', pageBreakInside: 'avoid' }}>
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
                    // =========================================================================
                    // ✅ MÀN HÌNH EDIT MODE (FORM NHẬP LIỆU)
                    // =========================================================================
                    <form action={formAction} className="p-6 space-y-6 bg-white overflow-y-auto h-full">
                        <div className="flex items-center justify-between border-b pb-4 mb-4">
                            <DialogTitle className="text-xl font-black uppercase flex items-center gap-3 text-slate-800">
                                <Edit3 className="w-5 h-5 text-blue-600" /> CẬP NHẬT KẾT QUẢ KHẢO SÁT
                            </DialogTitle>
                            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}><X className="h-5 w-5 text-slate-500" /></Button>
                        </div>

                        <input type="hidden" name="taskId" value={task?.id || ""} />
                        <input type="hidden" name="projectId" value={projectId || ""} />
                        <input type="hidden" name="analysis_json" value={analysisJson} />
                        <input type="hidden" name="status" value={status} />
                        <input type="file" name="images" multiple accept="image/*" hidden ref={fileInputRef} onChange={handleImageChange} />

                        {/* ĐỊA CHẤT FORM */}
                        {isDiaChatTask && (
                            <div className="space-y-6">
                                <div className="p-5 bg-amber-50/50 border border-amber-200 rounded-2xl shadow-inner space-y-4">
                                    <Label className="flex items-center gap-2 text-amber-800 font-black text-sm uppercase tracking-widest border-b border-amber-200 pb-2">
                                        <Map className="w-4 h-4 text-amber-600" /> THÔNG TIN HẠ TẦNG & MẶT BẰNG
                                    </Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-amber-700 uppercase flex items-center gap-1"><Truck className="w-3 h-3" /> Giao thông</span>
                                            <Select value={geoData.roadAccess} onValueChange={v => setGeoData({ ...geoData, roadAccess: v })}><SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger><SelectContent>{GEO_OPTIONS.roadAccess.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-amber-700 uppercase">Bãi tập kết vật tư</span>
                                            <Select value={geoData.storage} onValueChange={v => setGeoData({ ...geoData, storage: v })}><SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger><SelectContent>{GEO_OPTIONS.storage.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-amber-700 uppercase">Cốt nền</span>
                                            <Select value={geoData.elevation} onValueChange={v => setGeoData({ ...geoData, elevation: v })}><SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger><SelectContent>{GEO_OPTIONS.elevation.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-amber-700 uppercase">Đất bề mặt</span>
                                            <Select value={geoData.soilType} onValueChange={v => setGeoData({ ...geoData, soilType: v })}><SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger><SelectContent>{GEO_OPTIONS.soilType.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 bg-orange-50/50 border border-orange-200 rounded-2xl shadow-inner space-y-4">
                                    <Label className="flex items-center gap-2 text-orange-800 font-black text-sm uppercase tracking-widest border-b border-orange-200 pb-2">
                                        <Clock className="w-4 h-4 text-orange-600" /> ĐIỀU KIỆN THI CÔNG & LOGISTICS
                                    </Label>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-orange-700 uppercase">Giờ giấc thi công</span>
                                            <Select value={geoData.workingHours} onValueChange={v => setGeoData({ ...geoData, workingHours: v })}><SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger><SelectContent>{GEO_OPTIONS.workingHours.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-orange-700 uppercase">Giới hạn phương tiện</span>
                                            <Select value={geoData.vehicleLimit} onValueChange={v => setGeoData({ ...geoData, vehicleLimit: v })}><SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger><SelectContent>{GEO_OPTIONS.vehicleLimit.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-orange-700 uppercase">Yêu cầu môi trường/vệ sinh</span>
                                            <Select value={geoData.sanitation} onValueChange={v => setGeoData({ ...geoData, sanitation: v })}><SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger><SelectContent>{GEO_OPTIONS.sanitation.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 bg-blue-50/50 border border-blue-200 rounded-2xl shadow-inner space-y-4">
                                    <Label className="flex items-center gap-2 text-blue-800 font-black text-sm uppercase tracking-widest border-b border-blue-200 pb-2">
                                        <Droplets className="w-4 h-4 text-blue-600" /> ĐIỆN NƯỚC THI CÔNG
                                    </Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-blue-700 uppercase flex items-center gap-1"><Zap className="w-3 h-3" /> Nguồn điện</span>
                                            <Select value={geoData.electricity} onValueChange={v => setGeoData({ ...geoData, electricity: v })}><SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger><SelectContent>{GEO_OPTIONS.electricity.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-blue-700 uppercase">Nguồn nước</span>
                                            <Select value={geoData.water} onValueChange={v => setGeoData({ ...geoData, water: v })}><SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger><SelectContent>{GEO_OPTIONS.water.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                                        </div>
                                        <div className="space-y-1.5 sm:col-span-2">
                                            <span className="text-[10px] font-bold text-blue-700 uppercase">Cống thoát nước</span>
                                            <Select value={geoData.drainage} onValueChange={v => setGeoData({ ...geoData, drainage: v })}><SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger><SelectContent>{GEO_OPTIONS.drainage.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 bg-red-50/50 border border-red-200 rounded-2xl shadow-inner">
                                    <div className="flex items-center justify-between border-b border-red-200 pb-4 mb-4">
                                        <Label className="flex items-center gap-2 text-red-800 font-black text-sm uppercase tracking-widest">
                                            <Pickaxe className="w-4 h-4 text-red-600" /> KHOAN ĐỊA CHẤT TCVN
                                        </Label>
                                        <Switch checked={geoData.isDrilling} onCheckedChange={(v) => setGeoData({ ...geoData, isDrilling: v })} />
                                    </div>

                                    {geoData.isDrilling && (
                                        <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in duration-300">
                                            <div className="space-y-1.5">
                                                <span className="text-[10px] font-bold text-red-700 uppercase">Số hố khoan</span>
                                                <Input type="number" value={geoData.drillingHoles} onChange={e => setGeoData({ ...geoData, drillingHoles: Number(e.target.value) })} className="h-10 bg-white" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <span className="text-[10px] font-bold text-red-700 uppercase">Độ sâu (m)</span>
                                                <Input type="number" value={geoData.drillingDepth} onChange={e => setGeoData({ ...geoData, drillingDepth: Number(e.target.value) })} className="h-10 bg-white" />
                                            </div>
                                            <div className="space-y-1.5 col-span-2">
                                                <span className="text-[10px] font-bold text-red-700 uppercase">Lớp đất đặt mũi cọc (Lớp tốt)</span>
                                                <Input value={geoData.foundationLayer} onChange={e => setGeoData({ ...geoData, foundationLayer: e.target.value })} className="h-10 bg-white border-red-300 text-red-800 font-bold" />
                                            </div>
                                            <div className="space-y-1.5 col-span-2">
                                                <span className="text-[10px] font-bold text-red-700 uppercase">Sức chịu tải Rtc (Tấn/m2)</span>
                                                <Input value={geoData.loadCapacity} onChange={e => setGeoData({ ...geoData, loadCapacity: e.target.value })} className="h-10 bg-white border-red-300 font-bold" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ĐỊA HÌNH FORM */}
                        {isDiaHinhTask && (
                            <div className="space-y-6">
                                <div className="p-5 bg-amber-50/50 border border-amber-200 rounded-2xl shadow-inner space-y-4">
                                    <Label className="flex items-center gap-2 text-amber-800 font-black text-sm uppercase tracking-widest border-b border-amber-200 pb-2">
                                        <AlertCircle className="w-4 h-4 text-amber-600" /> CHƯỚNG NGẠI VẬT & MẶT BẰNG
                                    </Label>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-amber-700 uppercase flex items-center gap-1">Không gian trên không</span>
                                            <Select value={topoData.obstaclesAir} onValueChange={v => setTopoData({ ...topoData, obstaclesAir: v })}><SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger><SelectContent>{TOPO_OPTIONS.obstaclesAir.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-amber-700 uppercase flex items-center gap-1">Hiện trạng ngầm</span>
                                            <Select value={topoData.obstaclesUnderground} onValueChange={v => setTopoData({ ...topoData, obstaclesUnderground: v })}><SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger><SelectContent>{TOPO_OPTIONS.obstaclesUnderground.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-amber-700 uppercase flex items-center gap-1">Tình trạng tháo dỡ</span>
                                            <Select value={topoData.demolition} onValueChange={v => setTopoData({ ...topoData, demolition: v })}><SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger><SelectContent>{TOPO_OPTIONS.demolition.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-amber-700 uppercase flex items-center gap-1">Dọn dẹp xà bần/cây</span>
                                            <Select value={topoData.debris} onValueChange={v => setTopoData({ ...topoData, debris: v })}><SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger><SelectContent>{TOPO_OPTIONS.debris.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 bg-teal-50/50 border border-teal-200 rounded-2xl shadow-inner space-y-4">
                                    <Label className="flex items-center gap-2 text-teal-800 font-black text-sm uppercase tracking-widest border-b border-teal-200 pb-2">
                                        <Hammer className="w-4 h-4 text-teal-600" /> ĐỊNH HƯỚNG BIỆN PHÁP THI CÔNG
                                    </Label>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-teal-700 uppercase flex items-center gap-1">Thiết bị thi công móng</span>
                                            <Select value={topoData.foundationEquip} onValueChange={v => setTopoData({ ...topoData, foundationEquip: v })}><SelectTrigger className="h-10 bg-white font-bold text-teal-800"><SelectValue /></SelectTrigger><SelectContent>{TOPO_OPTIONS.foundationEquip.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-teal-700 uppercase flex items-center gap-1">Đào đất & Giữ vách</span>
                                            <Select value={topoData.diggingMethod} onValueChange={v => setTopoData({ ...topoData, diggingMethod: v })}><SelectTrigger className="h-10 bg-white font-bold text-teal-800"><SelectValue /></SelectTrigger><SelectContent>{TOPO_OPTIONS.diggingMethod.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* CẢI TẠO FORM */}
                        {isCaiTaoTask && (
                            <div className="space-y-6">
                                <div className="p-5 bg-rose-50/50 border border-rose-200 rounded-2xl shadow-inner space-y-4">
                                    <Label className="flex items-center gap-2 text-rose-800 font-black text-sm uppercase tracking-widest border-b border-rose-200 pb-2">
                                        <ShieldAlert className="w-4 h-4 text-rose-600" /> HIỆN TRẠNG KẾT CẤU CŨ
                                    </Label>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-rose-700 uppercase">Tình trạng Dầm / Cột</span>
                                            <Select value={renoData.beamColumnStatus} onValueChange={v => setRenoData({ ...renoData, beamColumnStatus: v })}><SelectTrigger className="h-10 bg-white font-bold text-rose-800"><SelectValue /></SelectTrigger><SelectContent>{RENO_OPTIONS.beamColumnStatus.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-rose-700 uppercase">Tình trạng Thấm dột</span>
                                            <Select value={renoData.waterproofing} onValueChange={v => setRenoData({ ...renoData, waterproofing: v })}><SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger><SelectContent>{RENO_OPTIONS.waterproofing.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-rose-700 uppercase">Kết cấu chịu tải chính</span>
                                            <Select value={renoData.oldFoundation} onValueChange={v => setRenoData({ ...renoData, oldFoundation: v })}><SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger><SelectContent>{RENO_OPTIONS.oldFoundation.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-rose-700 uppercase">Khả năng tận dụng vật tư</span>
                                            <Select value={renoData.reusableMats} onValueChange={v => setRenoData({ ...renoData, reusableMats: v })}><SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger><SelectContent>{RENO_OPTIONS.reusableMats.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 bg-indigo-50/50 border border-indigo-200 rounded-2xl shadow-inner space-y-4">
                                    <Label className="flex items-center gap-2 text-indigo-800 font-black text-sm uppercase tracking-widest border-b border-indigo-200 pb-2">
                                        <Ruler className="w-4 h-4 text-indigo-600" /> HÌNH HỌC KẾT CẤU & RANH MỐC
                                    </Label>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-indigo-700 uppercase">Đối chiếu Sổ đỏ vs Thực tế</span>
                                            <Select value={renoData.landComparison} onValueChange={v => setRenoData({ ...renoData, landComparison: v })}><SelectTrigger className="h-10 bg-white font-bold text-indigo-800"><SelectValue /></SelectTrigger><SelectContent>{RENO_OPTIONS.landComparison.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-indigo-700 uppercase">Hình dáng khu đất</span>
                                            <Select value={renoData.landShape} onValueChange={v => setRenoData({ ...renoData, landShape: v })}><SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger><SelectContent>{RENO_OPTIONS.landShape.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-indigo-700 uppercase">Tình trạng ranh mốc</span>
                                            <Select value={renoData.boundary} onValueChange={v => setRenoData({ ...renoData, boundary: v })}><SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger><SelectContent>{RENO_OPTIONS.boundary.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                                        </div>
                                    </div>
                                </div>

                                {/* BẢNG KÊ SỬA CHỮA DYNAMIC */}
                                <div className="p-5 bg-emerald-50/50 border border-emerald-200 rounded-2xl shadow-inner space-y-4">
                                    <Label className="flex items-center gap-2 text-emerald-800 font-black text-sm uppercase tracking-widest border-b border-emerald-200 pb-2">
                                        <ClipboardList className="w-4 h-4 text-emerald-600" /> BẢNG CHI TIẾT HẠNG MỤC CẦN SỬA CHỮA
                                    </Label>
                                    <div className="space-y-3">
                                        {renoData.repairItems.length === 0 && (
                                            <p className="text-xs text-emerald-600 italic text-center py-2">Chưa có hạng mục sửa chữa nào. Bấm thêm hạng mục để tạo bảng dự toán sơ bộ.</p>
                                        )}
                                        {renoData.repairItems.map((item) => (
                                            <div key={item.id} className="flex gap-2 items-center bg-white p-2 rounded-lg border border-emerald-100 shadow-sm transition-all hover:border-emerald-300">
                                                <Input placeholder="Khu vực (VD: WC Tầng 1)" value={item.area} onChange={(e) => handleRepairItemChange(item.id, 'area', e.target.value)} className="w-1/3 text-xs bg-slate-50 focus:bg-white" />
                                                <Input placeholder="Công tác (VD: Đập gạch cũ, lát nền mới)" value={item.task} onChange={(e) => handleRepairItemChange(item.id, 'task', e.target.value)} className="w-1/2 text-xs bg-slate-50 focus:bg-white" />
                                                <Input placeholder="KL Sơ bộ (VD: 15m2)" value={item.volume} onChange={(e) => handleRepairItemChange(item.id, 'volume', e.target.value)} className="w-1/4 text-xs bg-slate-50 focus:bg-white" />
                                                <Button type="button" variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0" onClick={() => removeRepairItem(item.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                        <Button type="button" variant="outline" size="sm" onClick={addRepairItem} className="w-full border-dashed border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors">
                                            <Plus className="w-4 h-4 mr-2" /> Thêm hạng mục
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* NỘI THẤT FORM */}
                        {isNoiThatTask && (
                            <div className="space-y-6">
                                <div className="p-5 bg-violet-50/50 border border-violet-200 rounded-2xl shadow-inner space-y-4">
                                    <Label className="flex items-center gap-2 text-violet-800 font-black text-sm uppercase tracking-widest border-b border-violet-200 pb-2">
                                        <Palette className="w-4 h-4 text-violet-600" /> ĐỊNH HƯỚNG THIẾT KẾ (CONCEPT)
                                    </Label>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-violet-700 uppercase">Phong cách thiết kế dự kiến</span>
                                            <Select value={interiorData.designStyle} onValueChange={v => setInteriorData({ ...interiorData, designStyle: v })}><SelectTrigger className="h-10 bg-white font-bold text-violet-800"><SelectValue /></SelectTrigger><SelectContent>{INTERIOR_OPTIONS.designStyle.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 bg-slate-50/50 border border-slate-200 rounded-2xl shadow-inner space-y-4">
                                    <Label className="flex items-center gap-2 text-slate-800 font-black text-sm uppercase tracking-widest border-b border-slate-200 pb-2">
                                        <Grid className="w-4 h-4 text-slate-600" /> HIỆN TRẠNG PHẦN THÔ NỘI THẤT
                                    </Label>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-slate-700 uppercase">Hiện trạng Trần</span>
                                            <Select value={interiorData.ceilingState} onValueChange={v => setInteriorData({ ...interiorData, ceilingState: v })}><SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger><SelectContent>{INTERIOR_OPTIONS.ceilingState.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-slate-700 uppercase">Hiện trạng Sàn</span>
                                            <Select value={interiorData.floorState} onValueChange={v => setInteriorData({ ...interiorData, floorState: v })}><SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger><SelectContent>{INTERIOR_OPTIONS.floorState.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-slate-700 uppercase">Hiện trạng Tường</span>
                                            <Select value={interiorData.wallState} onValueChange={v => setInteriorData({ ...interiorData, wallState: v })}><SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger><SelectContent>{INTERIOR_OPTIONS.wallState.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 bg-orange-50/50 border border-orange-200 rounded-2xl shadow-inner space-y-4">
                                    <Label className="flex items-center gap-2 text-orange-800 font-black text-sm uppercase tracking-widest border-b border-orange-200 pb-2">
                                        <Layout className="w-4 h-4 text-orange-600" /> HIỆN TRẠNG ĐỒ GỖ & THIẾT BỊ
                                    </Label>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-orange-700 uppercase">Khu vực Bếp</span>
                                            <Select value={interiorData.kitchenState} onValueChange={v => setInteriorData({ ...interiorData, kitchenState: v })}><SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger><SelectContent>{INTERIOR_OPTIONS.kitchenState.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <span className="text-[10px] font-bold text-orange-700 uppercase">Khu vực Vệ sinh (WC)</span>
                                            <Select value={interiorData.wcState} onValueChange={v => setInteriorData({ ...interiorData, wcState: v })}><SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger><SelectContent>{INTERIOR_OPTIONS.wcState.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
                                        </div>
                                    </div>
                                </div>

                                {/* BẢNG KÊ NỘI THẤT DYNAMIC */}
                                <div className="p-5 bg-violet-50/50 border border-violet-200 rounded-2xl shadow-inner space-y-4">
                                    <Label className="flex items-center gap-2 text-violet-800 font-black text-sm uppercase tracking-widest border-b border-violet-200 pb-2">
                                        <Sofa className="w-4 h-4 text-violet-600" /> BẢNG KÊ CHI TIẾT HẠNG MỤC NỘI THẤT
                                    </Label>
                                    <div className="space-y-3">
                                        {interiorData.interiorItems.length === 0 && (
                                            <p className="text-xs text-violet-600 italic text-center py-2">Chưa có đồ nội thất nào được liệt kê.</p>
                                        )}
                                        {interiorData.interiorItems.map((item) => (
                                            <div key={item.id} className="flex gap-2 items-center bg-white p-2 rounded-lg border border-violet-100 shadow-sm transition-all hover:border-violet-300">
                                                <Input placeholder="Tên Hạng mục (Vd: Hệ vách Tivi)" value={item.name} onChange={(e) => handleInteriorItemChange(item.id, 'name', e.target.value)} className="w-1/4 text-xs font-bold text-violet-800 bg-slate-50 focus:bg-white" />
                                                <Input placeholder="Kích thước (Dài x Rộng x Cao)" value={item.dimensions} onChange={(e) => handleInteriorItemChange(item.id, 'dimensions', e.target.value)} className="w-1/4 text-xs bg-slate-50 focus:bg-white" />
                                                <Input placeholder="Vật liệu (Vd: MDF chống ẩm)" value={item.material} onChange={(e) => handleInteriorItemChange(item.id, 'material', e.target.value)} className="w-1/4 text-xs bg-slate-50 focus:bg-white" />
                                                <Input placeholder="Ghi chú (Vd: Cắt khoét công tắc)" value={item.notes} onChange={(e) => handleInteriorItemChange(item.id, 'notes', e.target.value)} className="w-1/4 text-xs bg-slate-50 focus:bg-white" />
                                                <Button type="button" variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0" onClick={() => removeInteriorItem(item.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                        <Button type="button" variant="outline" size="sm" onClick={addInteriorItem} className="w-full border-dashed border-violet-300 text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors">
                                            <Plus className="w-4 h-4 mr-2" /> Thêm hạng mục nội thất
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PHONG THỦY FORM */}
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

                        {/* LOAN ĐẦU FORM */}
                        {isLoanDauTask && (
                            <div className="space-y-4 p-5 bg-emerald-50/50 border border-emerald-100 rounded-2xl shadow-inner">
                                <Label className="flex items-center gap-2 text-emerald-800 font-bold text-sm mb-2"><Eye className="w-4 h-4 text-emerald-500" /> CHECKLIST KHẢO SÁT LOAN ĐẦU</Label>
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

                        <div className="space-y-2">
                            <Label className="text-xs font-black text-slate-500 uppercase tracking-widest">Ghi chú & Data Ẩn</Label>
                            <Textarea name="result_data_text" rows={5} value={resultText} onChange={(e) => setResultText(e.target.value)} className="text-sm font-medium border-slate-200 rounded-xl bg-slate-50" />
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

                        <div className="pt-4 flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Đóng</Button>
                            <SubmitResultButton />
                        </div>
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