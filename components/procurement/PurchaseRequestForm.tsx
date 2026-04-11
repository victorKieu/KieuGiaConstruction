"use client";

import React, { useState, useEffect } from "react";
import { Plus, Trash2, Save, ShoppingCart, Building2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { createPurchaseRequest } from "@/lib/action/requestActions";

// Khởi tạo cấu trúc 1 dòng mặt hàng
const INITIAL_ITEM = { name: "", category: "asset", quantity: 1, unit: "Cái", estimatedPrice: 0, note: "" };

export default function PurchaseRequestForm() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([{ ...INITIAL_ITEM, id: Date.now() }]);

    const supabase = createClient();

    // Kéo danh sách Kho từ DB để đổ vào Dropdown
    useEffect(() => {
        async function fetchWarehouses() {
            const { data } = await supabase.from('warehouses').select('id, name, location').eq('is_active', true);
            if (data) setWarehouses(data);
        }
        fetchWarehouses();
    }, []);

    // Các hàm xử lý bảng (Thêm/Xóa/Sửa dòng)
    const addItemRow = () => setItems([...items, { ...INITIAL_ITEM, id: Date.now() }]);

    const removeItemRow = (id: number) => {
        if (items.length === 1) return toast.error("Phải có ít nhất 1 mặt hàng!");
        setItems(items.filter(item => item.id !== id));
    };

    const updateItem = (id: number, field: string, value: any) => {
        setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    // Tổng tiền dự kiến
    const totalEstimated = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.estimatedPrice)), 0);

    // Xử lý Submit
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Validate dữ liệu bảng
        const invalidItems = items.filter(i => !i.name.trim() || i.quantity <= 0);
        if (invalidItems.length > 0) {
            return toast.error("Vui lòng nhập tên và số lượng hợp lệ cho tất cả mặt hàng.");
        }

        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);

        const res = await createPurchaseRequest(formData, items);

        if (res.success) {
            toast.success(res.message);
            // Có thể dùng router.push('/requests') để chuyển trang sau khi tạo xong
            setItems([{ ...INITIAL_ITEM, id: Date.now() }]);
            e.currentTarget.reset();
        } else {
            toast.error(res.error);
        }
        setIsSubmitting(false);
    };

    const inputStyle = "w-full border rounded-md p-2 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm";

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-6 bg-slate-50 dark:bg-slate-900/50 rounded-xl animate-in fade-in">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><ShoppingCart className="w-6 h-6" /></div>
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Đề xuất mua sắm Tài sản / Vật tư</h2>
                    <p className="text-sm text-slate-500">Tạo phiếu yêu cầu trang bị thiết bị, vật tư cho dự án hoặc phòng ban</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* PHẦN 1: THÔNG TIN CHUNG */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200 border-b pb-2">Thông tin Đề xuất</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1 md:col-span-2">
                            <label className="text-sm font-medium">Tiêu đề đề xuất <span className="text-red-500">*</span></label>
                            <input type="text" name="title" required placeholder="VD: Đề xuất mua 5 Laptop cho nhân sự mới phòng Sale..." className={inputStyle} />
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium">Mức độ ưu tiên</label>
                            <select name="priority" className={inputStyle}>
                                <option value="Normal">Bình thường</option>
                                <option value="High">Cao (Cần sớm)</option>
                                <option value="Urgent">Khẩn cấp (Ngay lập tức)</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium">Ngày cần hàng dự kiến <span className="text-red-500">*</span></label>
                            <input type="date" name="expected_date" required className={inputStyle} />
                        </div>

                        <div className="space-y-1 md:col-span-2 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-800/50">
                            <label className="text-sm font-bold text-amber-800 dark:text-amber-500 flex items-center gap-1">
                                <Building2 className="w-4 h-4" /> Kho / Nơi nhận hàng <span className="text-red-500">*</span>
                            </label>
                            <select name="destination_warehouse_id" required className={`${inputStyle} mt-1 border-amber-300 focus:ring-amber-500`}>
                                <option value="">-- Chọn Kho lưu trữ / Dự án sẽ nhận hàng --</option>
                                {warehouses.map(wh => (
                                    <option key={wh.id} value={wh.id}>{wh.name} - {wh.location}</option>
                                ))}
                            </select>
                            <p className="text-[11px] text-amber-700 mt-1 italic">* Bắt buộc chọn đúng kho để Nhà cung cấp giao hàng và Thủ kho nhập hàng.</p>
                        </div>

                        <div className="space-y-1 md:col-span-2">
                            <label className="text-sm font-medium">Lý do / Mục đích sử dụng <span className="text-red-500">*</span></label>
                            <textarea name="reason" required rows={2} placeholder="Giải trình lý do cần mua sắm..." className={inputStyle}></textarea>
                        </div>
                    </div>
                </div>

                {/* PHẦN 2: DANH SÁCH MẶT HÀNG */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="p-4 border-b flex justify-between items-center bg-slate-50 dark:bg-slate-950/50">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200">Danh sách cần mua</h3>
                        <button type="button" onClick={addItemRow} className="text-sm flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium">
                            <Plus className="w-4 h-4" /> Thêm dòng
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-100/50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400">
                                <tr>
                                    <th className="p-3 w-10 text-center">#</th>
                                    <th className="p-3 min-w-[200px]">Tên Tài sản / Vật tư <span className="text-red-500">*</span></th>
                                    <th className="p-3 w-32">Phân loại</th>
                                    <th className="p-3 w-24">SL <span className="text-red-500">*</span></th>
                                    <th className="p-3 w-24">ĐVT</th>
                                    <th className="p-3 w-40">Đơn giá d.kiến</th>
                                    <th className="p-3 min-w-[150px]">Ghi chú</th>
                                    <th className="p-3 w-12 text-center">Xóa</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {items.map((item, index) => (
                                    <tr key={item.id}>
                                        <td className="p-3 text-center font-medium text-slate-400">{index + 1}</td>
                                        <td className="p-2"><input type="text" value={item.name} onChange={(e) => updateItem(item.id, 'name', e.target.value)} required placeholder="Vd: Laptop Dell..." className={inputStyle} /></td>
                                        <td className="p-2">
                                            <select value={item.category} onChange={(e) => updateItem(item.id, 'category', e.target.value)} className={inputStyle}>
                                                <option value="asset">Tài sản (Asset)</option>
                                                <option value="material">Vật tư (Material)</option>
                                            </select>
                                        </td>
                                        <td className="p-2"><input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', e.target.value)} required className={inputStyle} /></td>
                                        <td className="p-2"><input type="text" value={item.unit} onChange={(e) => updateItem(item.id, 'unit', e.target.value)} className={inputStyle} /></td>
                                        <td className="p-2"><input type="number" min="0" value={item.estimatedPrice} onChange={(e) => updateItem(item.id, 'estimatedPrice', e.target.value)} className={inputStyle} /></td>
                                        <td className="p-2"><input type="text" value={item.note} onChange={(e) => updateItem(item.id, 'note', e.target.value)} placeholder="..." className={inputStyle} /></td>
                                        <td className="p-2 text-center">
                                            <button type="button" onClick={() => removeItemRow(item.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/50 text-right">
                        <span className="text-slate-500 mr-4">Tổng dự toán (Tạm tính):</span>
                        <span className="text-lg font-bold text-red-600">{totalEstimated.toLocaleString('vi-VN')} VNĐ</span>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <button type="button" className="px-6 py-2.5 border rounded-lg text-slate-600 font-medium hover:bg-slate-50">Hủy</button>
                    <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-lg font-medium transition-colors shadow-md disabled:opacity-50">
                        {isSubmitting ? "Đang xử lý..." : <><Save className="w-4 h-4" /> Gửi Yêu Cầu</>}
                    </button>
                </div>
            </form>
        </div>
    );
}