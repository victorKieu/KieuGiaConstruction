"use client";

import React, { useState, useEffect } from "react";
import { Users, Plus, Edit, Trash2, User, ChevronRight, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getDynamicOrgChart, upsertOrgNode, deleteOrgNode } from "@/lib/action/orgActions";

export default function DynamicOrgChart() {
    const [nodes, setNodes] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    // State cho Popup Modal Form
    const [isOpen, setIsOpen] = useState(false);
    const [editingNode, setEditingNode] = useState<any>(null);
    const [formData, setFormData] = useState({ name: "", parent_id: "", manager_id: "" });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const res = await getDynamicOrgChart();
        if (res.success) {
            setNodes(res.nodes || []);
            setEmployees(res.employees || []);
            // Mặc định mở rộng tất cả các nhánh
            const initialExpanded: any = {};
            (res.nodes || []).forEach(n => initialExpanded[n.id] = true);
            setExpanded(initialExpanded);
        }
        setLoading(false);
    };

    const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

    const openModal = (node?: any, parentId?: string) => {
        setEditingNode(node || null);
        setFormData({
            name: node ? node.name : "",
            parent_id: node ? (node.parent_id || "") : (parentId || ""),
            manager_id: node ? (node.manager_id || "") : ""
        });
        setIsOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name) return toast.error("Vui lòng nhập tên bộ phận!");
        setIsSaving(true);
        const res = await upsertOrgNode({
            id: editingNode?.id,
            name: formData.name,
            parent_id: formData.parent_id || null,
            manager_id: formData.manager_id || null
        });
        setIsSaving(false);
        if (res.success) {
            toast.success(res.message);
            setIsOpen(false);
            loadData();
        } else {
            toast.error(res.error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa bộ phận này?")) return;
        const res = await deleteOrgNode(id);
        if (res.success) {
            toast.success(res.message);
            loadData();
        } else {
            toast.error(res.error);
        }
    };

    // HÀM ĐỆ QUY VẼ SƠ ĐỒ CÂY
    const renderTree = (parentId: string | null = null, level: number = 0) => {
        const children = nodes.filter(n => n.parent_id === parentId);
        if (children.length === 0) return null;

        return (
            <div className={`space-y-3 ${level > 0 ? "ml-8 mt-3 border-l-2 border-blue-100 pl-4" : ""}`}>
                {children.map(node => {
                    const hasChildren = nodes.some(n => n.parent_id === node.id);
                    const manager = employees.find(e => e.id === node.manager_id);
                    const isExp = expanded[node.id];

                    return (
                        <div key={node.id} className="relative">
                            {/* Dấu chấm nối dây */}
                            {level > 0 && <div className="absolute -left-[21px] top-5 w-4 h-0.5 bg-blue-100"></div>}

                            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm hover:border-blue-300 transition-all">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                    {/* Cột trái: Tên & Nút mở rộng */}
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => toggleExpand(node.id)} className="text-slate-400 hover:text-blue-600 focus:outline-none">
                                            {hasChildren ? (isExp ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />) : <span className="w-5 h-5 block"></span>}
                                        </button>
                                        <div>
                                            <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                                {node.name}
                                            </h4>
                                            {manager ? (
                                                <div className="text-sm text-emerald-600 flex items-center mt-1 bg-emerald-50 w-fit px-2 py-0.5 rounded-full border border-emerald-100">
                                                    <User className="w-3 h-3 mr-1" /> Quản lý: {manager.name}
                                                </div>
                                            ) : (
                                                <div className="text-sm text-orange-500 flex items-center mt-1">
                                                    <User className="w-3 h-3 mr-1" /> Chưa có quản lý
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Cột phải: Các nút hành động */}
                                    <div className="flex items-center gap-2 ml-7 sm:ml-0">
                                        <button onClick={() => openModal(null, node.id)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Thêm bộ phận con">
                                            <Plus className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => openModal(node)} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded" title="Sửa">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(node.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Xóa">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Render đệ quy các con của Node này */}
                            {isExp && renderTree(node.id, level + 1)}
                        </div>
                    );
                })}
            </div>
        );
    };

    if (loading) return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" /></div>;

    return (
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800 flex items-center">
                    <Users className="w-5 h-5 mr-2 text-blue-600" /> Sơ đồ tổ chức phân cấp
                </h3>
                <button onClick={() => openModal(null, null)} className="bg-white border border-blue-600 text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-md text-sm font-medium flex items-center">
                    <Plus className="w-4 h-4 mr-1" /> Thêm Khối/Ban gốc
                </button>
            </div>

            {nodes.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-lg border border-dashed border-slate-300">
                    <p className="text-slate-500 mb-4">Chưa có bộ phận nào trong sơ đồ.</p>
                    <button onClick={() => openModal(null, null)} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm">Tạo Khối/Ban đầu tiên</button>
                </div>
            ) : (
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-inner overflow-x-auto">
                    {/* Bắt đầu vẽ cây từ gốc (parent_id = null) */}
                    {renderTree(null, 0)}
                </div>
            )}

            {/* MODAL THÊM / SỬA BỘ PHẬN */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center">
                            <h3 className="font-bold text-lg">{editingNode ? "Chỉnh sửa Bộ phận" : "Thêm Bộ phận mới"}</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Tên bộ phận <span className="text-red-500">*</span></label>
                                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border rounded-md p-2" placeholder="VD: Phòng IT" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Thuộc cấp (Bộ phận cha)</label>
                                <select value={formData.parent_id || ""} onChange={e => setFormData({ ...formData, parent_id: e.target.value })} className="w-full border rounded-md p-2">
                                    <option value="">-- Là cấp cao nhất (Root) --</option>
                                    {nodes.filter(n => n.id !== editingNode?.id).map(n => (
                                        <option key={n.id} value={n.id}>{n.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Trưởng bộ phận (Quản lý)</label>
                                <select value={formData.manager_id || ""} onChange={e => setFormData({ ...formData, manager_id: e.target.value })} className="w-full border rounded-md p-2">
                                    <option value="">-- Chưa chỉ định --</option>
                                    {employees.map(e => (
                                        <option key={e.id} value={e.id}>{e.name} {e.code ? `(${e.code})` : ""}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3 border-t">
                            <button onClick={() => setIsOpen(false)} className="px-4 py-2 text-slate-600 bg-white border rounded hover:bg-slate-100">Hủy</button>
                            <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center">
                                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Lưu dữ liệu"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}