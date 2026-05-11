"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils/utils";
import { DictionaryOption } from "@/types/employee";
import { createEmployee, updateEmployee } from "@/lib/action/employeeActions";
import AvatarUpload from "./AvatarUpload";
import { Loader2, Save, Briefcase, Banknote, ShieldCheck, UserCircle, MapPin, Landmark, FileText, ScanFace, CheckCircle2, XCircle, Trash2, Route, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { registerFaceDescriptor, deleteFaceDescriptor } from "@/lib/action/employeeActions";

// ✅ IMPORT COMPONENT FACE REGISTRATION
import FaceRegistration from "./FaceRegistration";

export interface ActionState {
    success: boolean;
    message?: string;
    error?: string;
    fields?: Record<string, any>;
}

interface EmployeeFormProps {
    initialData?: any;
    onSuccess?: () => void;
    options?: {
        departments: DictionaryOption[];
        positions: DictionaryOption[];
        genders: DictionaryOption[];
        statuses: DictionaryOption[];
        contractTypes: DictionaryOption[];
        maritalStatuses: DictionaryOption[];
    };
}

export default function EmployeeForm({ initialData, options, onSuccess }: EmployeeFormProps) {
    const router = useRouter();
    const formRef = useRef<HTMLFormElement>(null);

    // State quản lý Tab đang active
    const [activeTab, setActiveTab] = useState<"info" | "finance">("info");

    const [state, setState] = useState<ActionState>({
        success: false,
        message: "",
        error: "",
        fields: initialData || {}
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string>(
        initialData?.user_profiles?.avatar_url || initialData?.avatar_url || ""
    );
    const [hasFaceId, setHasFaceId] = useState<boolean>(!!initialData?.face_descriptor);

    // ✅ STATE QUẢN LÝ MODAL FACE ID
    const [isFaceIdModalOpen, setIsFaceIdModalOpen] = useState(false);

    // --- QUẢN LÝ TIỀN TỆ ---
    const [basicSalaryDisplay, setBasicSalaryDisplay] = useState<string>(
        initialData?.basic_salary ? formatCurrency(initialData.basic_salary) : ""
    );
    const [allowanceDisplay, setAllowanceDisplay] = useState<string>(
        initialData?.allowance_amount ? formatCurrency(initialData.allowance_amount) : ""
    );
    // ✅ State mới quản lý hiển thị tiền cho Định mức riêng
    const [allowanceRateDisplay, setAllowanceRateDisplay] = useState<string>(
        initialData?.allowance_rate ? formatCurrency(initialData.allowance_rate) : ""
    );
    const [mealAllowanceRateDisplay, setMealAllowanceRateDisplay] = useState<string>(
        initialData?.meal_allowance_rate ? formatCurrency(initialData.meal_allowance_rate) : ""
    );
    const [phoneAllowanceRateDisplay, setPhoneAllowanceRateDisplay] = useState<string>(
        initialData?.phone_allowance_rate ? formatCurrency(initialData.phone_allowance_rate) : ""
    );

    const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
        const rawValue = e.target.value.replace(/[^0-9]/g, "");
        if (!rawValue) { setter(""); return; }
        setter(formatCurrency(Number(rawValue)));
    };

    const handleSubmit = async (e?: React.MouseEvent<HTMLButtonElement>) => {
        if (e) e.preventDefault();
        if (!formRef.current) return;
        if (!formRef.current.checkValidity()) {
            formRef.current.reportValidity();
            toast.error("Vui lòng điền đầy đủ các trường bắt buộc (có dấu *)");
            return;
        }

        setIsSubmitting(true);
        setState(prev => ({ ...prev, error: "", success: false }));

        const formData = new FormData(formRef.current);
        formData.append("avatar_url", avatarUrl);

        try {
            const result = initialData?.id
                ? await updateEmployee(initialData.id, formData)
                : await createEmployee(formData);

            if (result.success) {
                toast.success(result.message);
                if (onSuccess) {
                    onSuccess();
                } else {
                    router.push("/hrm/employees");
                }
            } else {
                toast.error(result.error);
                setState({
                    success: false,
                    message: "",
                    error: result.error,
                    fields: result.fields || state.fields
                });
            }
        } catch (err: any) {
            setState(prev => ({ ...prev, success: false, error: "Lỗi hệ thống không xác định" }));
            toast.error("Lỗi hệ thống");
        } finally {
            setIsSubmitting(false);
        }
    };

    const [isDeleting, setIsDeleting] = useState(false);

    const handleDeleteFaceId = async () => {
        if (!confirm("Bạn có chắc chắn muốn xóa dữ liệu Face ID của nhân viên này? Thao tác này không thể hoàn tác.")) return;

        setIsDeleting(true);
        try {
            const res = await deleteFaceDescriptor(initialData.id);
            if (res.success) {
                toast.success(res.message);
                setHasFaceId(false);
            } else {
                toast.error(res.error);
            }
        } catch (error) {
            toast.error("Lỗi kết nối khi xóa dữ liệu.");
        } finally {
            setIsDeleting(false);
        }
    };

    const safeOptions = (list: DictionaryOption[] | undefined) => list || [];
    const getFieldValue = (fieldName: string) => state.fields?.[fieldName] || "";
    const inputStyle = "w-full border rounded-md p-2 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors";

    return (
        <form ref={formRef} className="animate-in fade-in duration-500 relative flex flex-col min-h-full">
            {state?.error && (
                <div className="p-4 mb-6 rounded border flex items-center bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20">
                    <span className="mr-2 text-xl">⚠️</span> {state.error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
                {/* CỘT TRÁI: AVATAR & FACE ID NẰM CỐ ĐỊNH */}
                <div className="lg:col-span-1">
                    <div className="sticky top-6 flex flex-col items-center bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-4">Ảnh hồ sơ</label>
                        <AvatarUpload defaultValue={avatarUrl} onUploadSuccess={(url) => setAvatarUrl(url)} />
                        <div className="mt-4 text-center w-full">
                            <h3 className="font-bold text-lg">{getFieldValue("name") || "Họ và tên"}</h3>
                            <p className="text-sm text-slate-500">{getFieldValue("code") || "Mã NV"}</p>
                        </div>

                        {/* TRẠNG THÁI & NÚT FACE REGISTRATION */}
                        <div className="mt-6 w-full pt-6 border-t border-slate-100 dark:border-slate-800">
                            {initialData?.id ? (
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-2 items-center">
                                        {hasFaceId ? (
                                            <div className="flex items-center gap-2">
                                                <span className="flex items-center text-[13px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full">
                                                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Đã đăng ký Face ID
                                                </span>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    disabled={isDeleting}
                                                    onClick={handleDeleteFaceId}
                                                    className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                                    title="Xóa dữ liệu khuôn mặt"
                                                >
                                                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                </Button>
                                            </div>
                                        ) : (
                                            <span className="flex items-center text-[13px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                                                <XCircle className="w-4 h-4 mr-1.5" /> Chưa có dữ liệu Face ID
                                            </span>
                                        )}
                                    </div>

                                    <Dialog open={isFaceIdModalOpen} onOpenChange={setIsFaceIdModalOpen}>
                                        <DialogTrigger asChild>
                                            <Button type="button" variant="outline" className="w-full flex items-center justify-center gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:border-indigo-900/50 dark:hover:bg-indigo-900/20">
                                                <ScanFace className="w-4 h-4" />
                                                {hasFaceId ? "Cập nhật Face ID" : "Đăng ký Face ID"}
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[400px] p-0 border-none bg-transparent shadow-none">
                                            <DialogTitle className="sr-only">Đăng ký hoặc Cập nhật Face ID</DialogTitle>
                                            {isFaceIdModalOpen && (
                                                <FaceRegistration
                                                    employeeId={initialData.id}
                                                    employeeName={getFieldValue("name")}
                                                    onSuccess={() => {
                                                        setIsFaceIdModalOpen(false);
                                                        setHasFaceId(true);
                                                    }}
                                                />
                                            )}
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            ) : (
                                <div className="text-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
                                    <ScanFace className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Vui lòng <strong>Lưu hồ sơ</strong> trước khi đăng ký Face ID cho nhân sự này.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* CỘT PHẢI: TABS & NỘI DUNG FORM */}
                <div className="lg:col-span-3 space-y-6">

                    {/* --- MENU TABS --- */}
                    <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setActiveTab("info")}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === "info"
                                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm"
                                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                }`}
                        >
                            <FileText className="w-4 h-4" />
                            Thông định danh
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("finance")}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === "finance"
                                ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                }`}
                        >
                            <Banknote className="w-4 h-4" />
                            Lương & Tài chính
                        </button>
                    </div>

                    {/* ========================================= */}
                    {/* TAB 1: THÔNG TIN CHUNG */}
                    {/* ========================================= */}
                    <div className={activeTab === "info" ? "space-y-6 animate-in slide-in-from-left-2 duration-300" : "hidden"}>
                        {/* 1. THÔNG TIN ĐỊNH DANH */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center gap-2 mb-4 text-blue-600 dark:text-blue-400 border-b pb-2">
                                <UserCircle className="w-5 h-5" />
                                <h3 className="text-lg font-semibold">1. Thông tin định danh</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Mã nhân viên</label>
                                    <input name="code" defaultValue={getFieldValue("code")} readOnly className="w-full border rounded-md p-2 bg-gray-100 dark:bg-slate-800 text-gray-500 cursor-not-allowed" placeholder="Tự động sinh mã" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Họ và tên <span className="text-red-500">*</span></label>
                                    <input name="name" defaultValue={getFieldValue("name")} required className={inputStyle} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Ngày sinh</label>
                                    <input type="date" name="birth_date" defaultValue={getFieldValue("birth_date")?.split('T')[0]} className={inputStyle} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Giới tính</label>
                                    <select name="gender_id" defaultValue={getFieldValue("gender_id")} className={inputStyle}>
                                        <option value="">Chọn giới tính</option>
                                        {safeOptions(options?.genders).map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">CCCD / CMND</label>
                                    <input name="identity_card" defaultValue={getFieldValue("identity_card")} className={inputStyle} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Ngày cấp CCCD</label>
                                    <input type="date" name="identity_date" defaultValue={getFieldValue("identity_date")?.split('T')[0]} className={inputStyle} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Nơi cấp</label>
                                    <input name="identity_place" defaultValue={getFieldValue("identity_place")} className={inputStyle} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Nơi sinh</label>
                                    <input name="place_of_birth" defaultValue={getFieldValue("place_of_birth")} className={inputStyle} />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-sm font-medium">Tình trạng hôn nhân</label>
                                    <select name="marital_status_id" defaultValue={getFieldValue("marital_status_id")} className={inputStyle}>
                                        <option value="">Chọn tình trạng</option>
                                        {safeOptions(options?.maritalStatuses).map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* 2. CÔNG VIỆC & HỢP ĐỒNG */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center gap-2 mb-4 text-orange-600 border-b pb-2">
                                <Briefcase className="w-5 h-5" />
                                <h3 className="text-lg font-semibold">2. Công việc & Hợp đồng</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Phòng ban</label>
                                    <select name="department_id" defaultValue={getFieldValue("department_id")} className={inputStyle}>
                                        <option value="">Chọn phòng ban</option>
                                        {safeOptions(options?.departments).map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Chức vụ</label>
                                    <select name="position_id" defaultValue={getFieldValue("position_id")} className={inputStyle}>
                                        <option value="">Chọn chức vụ</option>
                                        {safeOptions(options?.positions).map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Loại hợp đồng</label>
                                    <select name="contract_type_id" defaultValue={getFieldValue("contract_type_id")} className={inputStyle}>
                                        <option value="">Chọn loại HĐ</option>
                                        {safeOptions(options?.contractTypes).map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Ngày vào làm <span className="text-red-500">*</span></label>
                                    <input type="date" name="hire_date" required defaultValue={getFieldValue("hire_date")?.split('T')[0] || new Date().toISOString().split('T')[0]} className={inputStyle} />
                                </div>
                                <div className="space-y-1 md:col-span-2">
                                    <label className="text-sm font-medium">Trạng thái làm việc</label>
                                    <select name="status_id" defaultValue={getFieldValue("status_id")} className={inputStyle}>
                                        <option value="">Chọn trạng thái</option>
                                        {safeOptions(options?.statuses).map(opt => (
                                            <option key={opt.id} value={opt.id} style={{ color: opt.color || 'inherit' }}>{opt.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* 3. LIÊN HỆ */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center gap-2 mb-4 text-violet-600 border-b pb-2">
                                <MapPin className="w-5 h-5" />
                                <h3 className="text-lg font-semibold">3. Thông tin liên hệ</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1"><label className="text-sm font-medium">Email *</label><input type="email" name="email" required defaultValue={getFieldValue("email")} className={inputStyle} /></div>
                                <div className="space-y-1"><label className="text-sm font-medium">Số điện thoại</label><input name="phone" defaultValue={getFieldValue("phone")} className={inputStyle} /></div>
                                <div className="md:col-span-2 space-y-1"><label className="text-sm font-medium">Địa chỉ thường trú</label><input name="address" defaultValue={getFieldValue("address")} className={inputStyle} /></div>
                                <div className="md:col-span-2 space-y-1"><label className="text-sm font-medium">Nơi ở hiện tại</label><input name="current_address" defaultValue={getFieldValue("current_address")} className={inputStyle} /></div>
                            </div>
                        </div>
                    </div>

                    {/* ========================================= */}
                    {/* TAB 2: LƯƠNG & TÀI CHÍNH */}
                    {/* ========================================= */}
                    <div className={activeTab === "finance" ? "space-y-6 animate-in slide-in-from-right-2 duration-300" : "hidden"}>

                        {/* 1. LƯƠNG & PHỤ CẤP */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center gap-2 mb-4 text-emerald-600 border-b pb-2">
                                <Banknote className="w-5 h-5" />
                                <h3 className="text-lg font-semibold">1. Cấu hình Lương</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Lương cơ bản (Đóng BHXH) *</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={basicSalaryDisplay}
                                            onChange={(e) => handleCurrencyChange(e, setBasicSalaryDisplay)}
                                            className={`${inputStyle} pr-12 font-mono text-right font-bold text-emerald-700 dark:text-emerald-400`}
                                            placeholder="0"
                                            required
                                        />
                                        <span className="absolute right-3 top-2.5 text-slate-400 text-sm">VNĐ</span>
                                        <input type="hidden" name="basic_salary" value={basicSalaryDisplay.replace(/[^0-9]/g, "")} />
                                    </div>
                                    <p className="text-[11px] text-slate-500">Mức lương chính thức ghi trên hợp đồng. Là căn cứ để tính bảo hiểm và lương ngày công.</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Phụ cấp cố định</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={allowanceDisplay}
                                            onChange={(e) => handleCurrencyChange(e, setAllowanceDisplay)}
                                            className={`${inputStyle} pr-12 font-mono text-right`}
                                            placeholder="0"
                                        />
                                        <span className="absolute right-3 top-2.5 text-slate-400 text-sm">VNĐ</span>
                                        <input type="hidden" name="allowance_amount" value={allowanceDisplay.replace(/[^0-9]/g, "")} />
                                    </div>
                                    <p className="text-[11px] text-slate-500">Tổng các khoản phụ cấp cố định (ăn ca, xăng xe...) theo phụ lục hợp đồng.</p>
                                </div>
                            </div>
                        </div>

                        {/* 2. THUẾ & BẢO HIỂM */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center gap-2 mb-4 text-rose-600 border-b pb-2">
                                <ShieldCheck className="w-5 h-5" />
                                <h3 className="text-lg font-semibold">2. Thuế & Bảo hiểm</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Mã số thuế cá nhân</label>
                                    <input name="tax_code" defaultValue={getFieldValue("tax_code")} className={inputStyle} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Số người phụ thuộc</label>
                                    <input type="number" name="dependents_count" min="0" defaultValue={getFieldValue("dependents_count") || 0} className={inputStyle} />
                                    <p className="text-[11px] text-slate-500">Dùng để tính giảm trừ gia cảnh thuế TNCN.</p>
                                </div>

                                <div className="md:col-span-2 flex items-center gap-3 p-4 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-lg border border-emerald-100 dark:border-emerald-800/30 mt-2">
                                    <input
                                        type="checkbox"
                                        id="is_insurance_active"
                                        name="is_insurance_active"
                                        defaultChecked={state.fields?.is_insurance_active ?? true}
                                        className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                    />
                                    <label htmlFor="is_insurance_active" className="text-sm font-bold text-emerald-800 dark:text-emerald-200 cursor-pointer">
                                        Kích hoạt trích đóng Bảo hiểm (BHXH, BHYT, BHTN) hàng tháng
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* ✅ 3. ĐỊNH MỨC CÔNG TÁC PHÍ (RIÊNG CHO NHÂN VIÊN NÀY) */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center gap-2 mb-4 text-blue-600 border-b pb-2">
                                <Route className="w-5 h-5" />
                                <h3 className="text-lg font-semibold">3. Định mức Công tác phí (Tùy chỉnh)</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Hình thức chi trả</label>
                                    <select name="allowance_type" defaultValue={getFieldValue("allowance_type") || "per_km"} className={inputStyle}>
                                        <option value="per_km">Tính theo Km di chuyển thực tế</option>
                                        <option value="flat_rate">Khoán cố định (Trọn gói theo tháng)</option>
                                    </select>
                                    <p className="text-[11px] text-slate-500">Mặc định tính tiền tự động dựa trên bảng cài đặt hệ số chung của toàn bộ công ty.</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Định mức riêng (Tùy chọn)</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={allowanceRateDisplay}
                                            onChange={(e) => handleCurrencyChange(e, setAllowanceRateDisplay)}
                                            className={`${inputStyle} pr-12 font-mono text-right`}
                                            placeholder="Để trống = Mặc định"
                                        />
                                        <span className="absolute right-3 top-2.5 text-slate-400 text-sm">VNĐ</span>
                                        {/* Nếu user xoá trống => Gửi chuỗi rỗng lên backend để set null */}
                                        <input type="hidden" name="allowance_rate" value={allowanceRateDisplay.replace(/[^0-9]/g, "")} />
                                    </div>
                                    <p className="text-[11px] text-slate-500">Điền số tiền nếu muốn ghi đè mức mặc định của công ty (VNĐ/km hoặc VNĐ/tháng).</p>
                                </div>
                            </div>
                        </div>
                        {/* 4. CÁC KHOẢN PHỤ CẤP KHÁC */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center gap-2 mb-4 text-indigo-600 border-b pb-2">
                                <DollarSign className="w-5 h-5" />
                                <h3 className="text-lg font-semibold">4. Các khoản Phụ cấp khác</h3>
                            </div>

                            <div className="space-y-6">
                                {/* PHỤ CẤP ĂN TRƯA */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            name="is_meal_allowance_active"
                                            id="is_meal_allowance_active"
                                            defaultChecked={initialData?.is_meal_allowance_active ?? true}
                                            className="w-5 h-5 rounded text-indigo-600 cursor-pointer"
                                        />
                                        <label htmlFor="is_meal_allowance_active" className="font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
                                            Phụ cấp ăn trưa
                                        </label>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500">Định mức riêng (Để trống = Mặc định)</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={mealAllowanceRateDisplay}
                                                onChange={(e) => handleCurrencyChange(e, setMealAllowanceRateDisplay)}
                                                className={`${inputStyle} pr-12 text-right text-xs`}
                                                placeholder="VD: 40.000"
                                            />
                                            <span className="absolute right-3 top-2 text-slate-400 text-[10px]">VNĐ/ngày</span>
                                            <input type="hidden" name="meal_allowance_rate" value={mealAllowanceRateDisplay.replace(/[^0-9]/g, "")} />
                                        </div>
                                    </div>
                                </div>

                                {/* PHỤ CẤP ĐIỆN THOẠI */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            name="is_phone_allowance_active"
                                            id="is_phone_allowance_active"
                                            defaultChecked={initialData?.is_phone_allowance_active ?? false}
                                            className="w-5 h-5 rounded text-indigo-600 cursor-pointer"
                                        />
                                        <label htmlFor="is_phone_allowance_active" className="font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
                                            Phụ cấp điện thoại
                                        </label>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-500">Định mức riêng (Để trống = Mặc định)</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={phoneAllowanceRateDisplay}
                                                onChange={(e) => handleCurrencyChange(e, setPhoneAllowanceRateDisplay)}
                                                className={`${inputStyle} pr-12 text-right text-xs`}
                                                placeholder="VD: 500.000"
                                            />
                                            <span className="absolute right-3 top-2 text-slate-400 text-[10px]">VNĐ/tháng</span>
                                            <input type="hidden" name="phone_allowance_rate" value={phoneAllowanceRateDisplay.replace(/[^0-9]/g, "")} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* 4. NGÂN HÀNG */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center gap-2 mb-4 text-amber-600 border-b pb-2">
                                <Landmark className="w-5 h-5" />
                                <h3 className="text-lg font-semibold">4. Tài khoản Ngân hàng</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Tên Ngân hàng / Chi nhánh</label>
                                    <input name="bank_name" defaultValue={getFieldValue("bank_name")} className={inputStyle} placeholder="VD: Vietcombank CN Hà Nội" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Số tài khoản</label>
                                    <input name="bank_account" defaultValue={getFieldValue("bank_account")} className={`${inputStyle} font-mono font-bold`} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-auto sticky bottom-0 z-50 flex justify-end gap-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 border-t border-slate-200 dark:border-slate-800">
                <button
                    type="button"
                    onClick={() => (onSuccess ? onSuccess() : router.push("/hrm/employees"))}
                    className="px-6 py-2 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                    Hủy bỏ
                </button>
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 transition-all shadow-md"
                >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {initialData ? "Cập nhật hồ sơ" : "Lưu hồ sơ"}
                </button>
            </div>
        </form>
    );
}