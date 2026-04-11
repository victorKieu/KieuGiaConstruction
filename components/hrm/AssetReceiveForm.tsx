"use client";

import React, { useState, useRef } from "react";
import {
    PackagePlus, Save, QrCode, Printer, CheckCircle2,
    RotateCcw, ArrowLeft, Building2, Calendar, Tag, Hash
} from "lucide-react";
import { toast } from "sonner";
import QRCode from "react-qr-code"; // Yêu cầu: npm install react-qr-code
// import { receiveAssetToWarehouse } from "@/lib/action/assetActions"; // Nối API thật của bạn vào đây

export default function AssetReceiveForm() {
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Lưu trữ thông tin tài sản vừa nhập thành công để hiển thị lên Tem dán
    const [successAsset, setSuccessAsset] = useState<{
        code: string;
        name: string;
        category: string;
        serialNumber: string;
        purchaseDate: string;
    } | null>(null);

    const formRef = useRef<HTMLFormElement>(null);

    // Xử lý submit form
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData(e.currentTarget);

        try {
            // ==========================================
            // MÔ PHỎNG GỌI API BACKEND (Thay bằng API thật của bạn)
            // const res = await receiveAssetToWarehouse(formData);
            // ==========================================

            await new Promise(resolve => setTimeout(resolve, 1000)); // Giả lập loading

            // Giả lập Dữ liệu trả về từ Backend sau khi sinh mã thành công
            const fakeGeneratedCode = `AST-${formData.get("category")?.toString().substring(0, 3).toUpperCase()}-24-${Math.floor(Math.random() * 900 + 100)}`;

            toast.success("Nhập kho thiết bị thành công!");

            // Chuyển sang màn hình In Tem
            setSuccessAsset({
                code: fakeGeneratedCode,
                name: formData.get("name") as string,
                category: formData.get("category") as string,
                serialNumber: formData.get("serial_number") as string,
                purchaseDate: formData.get("purchase_date") as string,
            });

        } catch (error) {
            toast.error("Lỗi khi nhập kho thiết bị.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Xử lý In Tem (Chỉ in khu vực tem, ẩn các UI khác)
    const handlePrint = () => {
        window.print();
    };

    const resetForm = () => {
        setSuccessAsset(null);
        if (formRef.current) formRef.current.reset();
    };

    const inputStyle = "w-full border rounded-md p-2.5 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-colors";

    return (
        <div className="p-4 md:p-6 bg-slate-50/50 dark:bg-slate-950/50 min-h-[calc(100vh-100px)] animate-in fade-in duration-500">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Ẩn Header khi đang ở chế độ in ấn (print:hidden) */}
                <div className="flex items-center gap-3 print:hidden">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                        <PackagePlus className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Nhập Kho Thiết Bị</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Đăng ký tài sản mới và sinh mã định danh (QR Code)</p>
                    </div>
                </div>

                {!successAsset ? (
                    /* ========================================================= */
                    /* TRẠNG THÁI 1: FORM NHẬP KHO */
                    /* ========================================================= */
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden print:hidden">
                        <form ref={formRef} onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tên thiết bị / Tài sản <span className="text-red-500">*</span></label>
                                    <input type="text" name="name" required placeholder="VD: Laptop Dell XPS 15 9520..." className={inputStyle} />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Phân loại <span className="text-red-500">*</span></label>
                                    <select name="category" required className={inputStyle}>
                                        <option value="">-- Chọn phân loại --</option>
                                        <option value="Laptop">Máy tính / Laptop</option>
                                        <option value="Monitor">Màn hình</option>
                                        <option value="Smartphone">Điện thoại / Tablet</option>
                                        <option value="Accessory">Phụ kiện (Phím, Chuột...)</option>
                                        <option value="Furniture">Nội thất (Bàn, Ghế...)</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Số Serial / Service Tag (S/N)</label>
                                    <div className="relative">
                                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input type="text" name="serial_number" placeholder="Dùng súng quét mã vạch bắn vào đây..." className={`${inputStyle} pl-9 font-mono`} />
                                    </div>
                                    <p className="text-[11px] text-slate-500">Để trống nếu là nội thất hoặc phụ kiện không có Serial.</p>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Nhà cung cấp</label>
                                    <select name="supplier_id" className={inputStyle}>
                                        <option value="">-- Chọn NCC --</option>
                                        <option value="S01">Công ty Cổ phần Thế Giới Di Động</option>
                                        <option value="S02">FPT Shop</option>
                                        <option value="S03">GearVN</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Ngày nhập kho <span className="text-red-500">*</span></label>
                                    <input type="date" name="purchase_date" required defaultValue={new Date().toISOString().split('T')[0]} className={inputStyle} />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Đơn giá (VNĐ)</label>
                                    <input type="number" name="price" placeholder="0" className={inputStyle} />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Bảo hành đến ngày</label>
                                    <input type="date" name="warranty_expiry" className={inputStyle} />
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                                <button type="button" className="px-5 py-2.5 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                                    Hủy bỏ
                                </button>
                                <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50">
                                    {isSubmitting ? (
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    ) : (
                                        <Save className="w-4 h-4" />
                                    )}
                                    Lưu & Sinh Mã Tài Sản
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    /* ========================================================= */
                    /* TRẠNG THÁI 2: MÀN HÌNH IN TEM TÀI SẢN (Label Printing) */
                    /* ========================================================= */
                    <div className="space-y-6 animate-in zoom-in-95 duration-300">

                        {/* Thanh công cụ (Ẩn khi in) */}
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/50 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
                            <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
                                <CheckCircle2 className="w-6 h-6" />
                                <div>
                                    <p className="font-semibold">Đã lưu tài sản vào hệ thống!</p>
                                    <p className="text-sm opacity-90">Mã tài sản đã được sinh tự động. Vui lòng in tem và dán lên thiết bị.</p>
                                </div>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <button onClick={resetForm} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition-colors shadow-sm">
                                    <RotateCcw className="w-4 h-4" /> Nhập tiếp
                                </button>
                                <button onClick={handlePrint} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm">
                                    <Printer className="w-4 h-4" /> In Tem (Ctrl+P)
                                </button>
                            </div>
                        </div>

                        {/* KHU VỰC TEM DÁN (Chỉ in khu vực này) */}
                        {/* Lưu ý: Các class print:* giúp định dạng lại UI khi bấm nút in */}
                        <div className="flex justify-center mt-8 print:mt-0">
                            <div className="bg-white border-2 border-dashed border-slate-300 print:border-solid print:border-black p-6 rounded-xl w-full max-w-sm shadow-sm print:shadow-none print:w-[350px] print:m-0">

                                {/* Header Tem */}
                                <div className="text-center border-b border-slate-200 print:border-black pb-4 mb-4">
                                    <div className="flex items-center justify-center gap-2 mb-1 text-slate-800 print:text-black">
                                        <Building2 className="w-5 h-5" />
                                        <h3 className="font-bold text-lg tracking-wide uppercase">CÔNG TY KIỀU GIA</h3>
                                    </div>
                                    <p className="text-xs text-slate-500 print:text-black uppercase font-medium tracking-widest">Tem Quản Lý Tài Sản</p>
                                </div>

                                {/* Nội dung Tem */}
                                <div className="space-y-3 mb-6">
                                    <div>
                                        <p className="text-[10px] text-slate-400 print:text-gray-600 uppercase font-semibold">Tên thiết bị</p>
                                        <p className="font-bold text-slate-800 print:text-black leading-tight">{successAsset.name}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] text-slate-400 print:text-gray-600 uppercase font-semibold flex items-center gap-1"><Tag className="w-3 h-3" /> Mã Tài Sản</p>
                                            <p className="font-mono font-bold text-blue-600 print:text-black text-lg">{successAsset.code}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 print:text-gray-600 uppercase font-semibold flex items-center gap-1"><Hash className="w-3 h-3" /> Serial Number</p>
                                            <p className="font-mono font-semibold text-slate-700 print:text-black text-sm mt-0.5">{successAsset.serialNumber || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-slate-400 print:text-gray-600 uppercase font-semibold flex items-center gap-1"><Calendar className="w-3 h-3" /> Ngày nhập</p>
                                        <p className="font-medium text-slate-700 print:text-black text-sm">{new Date(successAsset.purchaseDate).toLocaleDateString('vi-VN')}</p>
                                    </div>
                                </div>

                                {/* QR Code Area */}
                                <div className="flex flex-col items-center justify-center bg-slate-50 print:bg-white p-4 rounded-lg border border-slate-100 print:border-none">
                                    <div className="bg-white p-2 rounded-lg print:p-0">
                                        <QRCode
                                            value={successAsset.code}
                                            size={120}
                                            level="M"
                                            className="print:w-[100px] print:h-[100px]"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-500 print:text-black mt-2 font-medium">Quét để xem / bàn giao tài sản</p>
                                </div>

                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}