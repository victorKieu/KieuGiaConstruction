"use client";

import React, { useState, useEffect, useRef } from "react";
import { Laptop, Monitor, Smartphone, Keyboard, Search, Plus, MoreVertical, ShieldCheck, CheckCircle2, User, X, Save, Package, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getAllAssignedAssets, getAvailableAssets, assignAssetToEmployee } from "@/lib/action/assetActions";
import { getEmployeeOptions } from "@/lib/action/employeeActions"; // Import hàm lấy NV

export default function EmployeeAssetManager() {
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    // States Dữ liệu
    const [assignedList, setAssignedList] = useState<any[]>([]);
    const [availableStock, setAvailableStock] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);

    // States Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [selectedEmpId, setSelectedEmpId] = useState("");

    const formRef = useRef<HTMLFormElement>(null);

    // Load dữ liệu khi vào trang
    useEffect(() => {
        loadInitialData();
    }, []);

    // Load lại kho mỗi khi đổi bộ lọc Category trong Modal
    useEffect(() => {
        if (isModalOpen) fetchStock();
    }, [selectedCategory, isModalOpen]);

    const loadInitialData = async () => {
        setIsLoading(true);
        try {
            const [assignRes, empRes] = await Promise.all([
                getAllAssignedAssets(),
                getEmployeeOptions() // Lấy danh sách NV cho Datalist
            ]);
            if (assignRes.success) setAssignedList(assignRes.data);
            setEmployees(empRes);
        } catch (error) {
            toast.error("Lỗi khi tải dữ liệu.");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchStock = async () => {
        const stockRes = await getAvailableAssets(selectedCategory);
        if (stockRes.success) setAvailableStock(stockRes.data);
    };

    // Hàm Icon
    const getCategoryIcon = (category: string) => {
        switch (category) {
            case "Laptop": return <Laptop className="w-5 h-5 text-slate-500" />;
            case "Monitor": return <Monitor className="w-5 h-5 text-slate-500" />;
            case "Smartphone": return <Smartphone className="w-5 h-5 text-slate-500" />;
            default: return <Keyboard className="w-5 h-5 text-slate-500" />;
        }
    };

    // Xử lý Submit Form cấp phát
    const handleAssignSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedEmpId) {
            toast.error("Vui lòng chọn một nhân viên hợp lệ từ danh sách.");
            return;
        }

        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        formData.append("employee_id", selectedEmpId); // Nhét UUID thực của NV vào

        const res = await assignAssetToEmployee(formData);
        if (res.success) {
            toast.success(res.message);
            setIsModalOpen(false);
            setSelectedEmpId(""); // Reset
            loadInitialData(); // Tải lại bảng ngay lập tức
        } else {
            toast.error(res.error);
        }
        setIsSubmitting(false);
    };

    // Bộ lọc hiển thị
    const filteredList = assignedList.filter(item => {
        const searchStr = searchQuery.toLowerCase();
        return (
            item.asset?.name?.toLowerCase().includes(searchStr) ||
            item.asset?.serial_number?.toLowerCase().includes(searchStr) ||
            item.employee?.name?.toLowerCase().includes(searchStr)
        );
    });

    const inputStyle = "w-full border rounded-md p-2.5 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-colors";

    return (
        <div className="p-4 md:p-6 bg-slate-50/50 dark:bg-slate-950/50 min-h-[calc(100vh-100px)] animate-in fade-in duration-500">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* --- HEADER --- */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Quản lý Tài sản</h2>
                        <p className="text-sm text-slate-500 mt-1">Quản lý và theo dõi thiết bị cấp phát cho nhân viên</p>
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm w-full sm:w-auto justify-center">
                        <Plus className="w-4 h-4" /> Cấp phát thiết bị
                    </button>
                </div>

                {/* --- BỘ LỌC --- */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" placeholder="Tìm tên NV, Tên thiết bị, Serial..." className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                </div>

                {/* --- BẢNG DỮ LIỆU --- */}
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                            <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-700 dark:text-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Tên thiết bị</th>
                                    <th className="px-6 py-4">Mã Serial</th>
                                    <th className="px-6 py-4">Người mượn</th>
                                    <th className="px-6 py-4">Ngày cấp</th>
                                    <th className="px-6 py-4">Tình trạng</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {isLoading ? (
                                    <tr><td colSpan={5} className="px-6 py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" /></td></tr>
                                ) : filteredList.length > 0 ? (
                                    filteredList.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4 flex items-center gap-3">
                                                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                                    {getCategoryIcon(item.asset?.category)}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{item.asset?.name}</p>
                                                    <p className="text-xs text-slate-500">{item.asset?.code}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-slate-500">{item.asset?.serial_number || 'N/A'}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4 text-slate-400" />
                                                    <span className="font-medium">{item.employee?.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">{new Date(item.assigned_date).toLocaleDateString('vi-VN')}</td>
                                            <td className="px-6 py-4">
                                                {item.status === 'Active' && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Đang dùng
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center">
                                            <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                            <p className="text-slate-500 font-medium">Chưa có tài sản nào được cấp phát</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* --- MODAL CẤP PHÁT --- */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Package className="w-5 h-5" /></div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800">Cấp phát tài sản</h3>
                                    <p className="text-xs text-slate-500">Giao thiết bị từ kho cho nhân viên</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-full"><X className="w-5 h-5" /></button>
                        </div>

                        <form ref={formRef} onSubmit={handleAssignSubmit} className="p-6 space-y-5">
                            {/* Combobox Nhân viên */}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Nhân viên nhận tài sản <span className="text-red-500">*</span></label>
                                <input
                                    list="emp-list" required placeholder="Gõ tên hoặc mã NV..." className={inputStyle}
                                    onChange={(e) => {
                                        const match = employees.find(emp => `${emp.code} - ${emp.name}` === e.target.value);
                                        setSelectedEmpId(match ? match.id : "");
                                    }}
                                />
                                <datalist id="emp-list">
                                    {employees.map(emp => <option key={emp.id} value={`${emp.code} - ${emp.name}`} />)}
                                </datalist>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Lọc theo loại thiết bị</label>
                                <select className={inputStyle} value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                                    <option value="all">Tất cả</option>
                                    <option value="Laptop">Laptop / Máy tính</option>
                                    <option value="Monitor">Màn hình</option>
                                    <option value="Accessory">Phụ kiện</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Thiết bị có sẵn trong kho <span className="text-red-500">*</span></label>
                                <select name="asset_id" required className={inputStyle}>
                                    <option value="">-- Chọn thiết bị để bàn giao --</option>
                                    {availableStock.map(asset => (
                                        <option key={asset.id} value={asset.id}>[{asset.code}] {asset.name} (SN: {asset.serial_number || 'N/A'})</option>
                                    ))}
                                </select>
                                {availableStock.length === 0 && <p className="text-xs text-amber-600 mt-1">⚠️ Không có thiết bị nào đang rảnh trong kho.</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Ngày bàn giao <span className="text-red-500">*</span></label>
                                    <input type="date" name="assigned_date" required defaultValue={new Date().toISOString().split('T')[0]} className={inputStyle} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium">Tình trạng lúc giao <span className="text-red-500">*</span></label>
                                    <input type="text" name="condition" required defaultValue="Hoạt động tốt" className={inputStyle} />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Ghi chú</label>
                                <textarea name="note" rows={2} className={inputStyle} placeholder="Cáp, sạc đi kèm..."></textarea>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-lg text-sm font-medium border text-slate-600 hover:bg-slate-50">Hủy bỏ</button>
                                <button type="submit" disabled={isSubmitting || !selectedEmpId} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Xác nhận cấp
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}