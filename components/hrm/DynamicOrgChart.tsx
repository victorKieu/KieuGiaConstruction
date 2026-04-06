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
            <div className={`space-y-4 ${level > 0 ? "ml-8 mt-4 border-l-2 border-slate-200 dark:border-slate-800 pl-6" : ""}`}>
                {children.map(node => {
                    const hasChildren = nodes.some(n => n.parent_id === node.id);
                    const manager = employees.find(e => e.id === node.manager_id);
                    const isExp = expanded[node.id];

                    return (
                        <div key={node.id} className="relative">
                            {/* Đường nối ngang */}
                            {level > 0 && <div className="absolute -left-[26px] top-6 w-6 h-0.5 bg-slate-200 dark:bg-slate-800"></div>}

                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:border-blue-400 dark:hover:border-blue-500/50 transition-all group/node">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => toggleExpand(node.id)}
                                            className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors focus:outline-none"
                                        >
                                            {hasChildren ? (isExp ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />) : <div className="w-5 h-5"></div>}
                                        </button>
                                        <div>
                                            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base transition-colors">
                                                {node.name}
                                            </h4>
                                            {manager ? (
                                                <div className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center mt-1.5 bg-emerald-50 dark:bg-emerald-500/10 w-fit px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-500/20 font-medium">
                                                    <User className="w-3 h-3 mr-1.5" /> Quản lý: {manager.name}
                                                </div>
                                            ) : (
                                                <div className="text-xs text-slate-400 dark:text-slate-500 flex items-center mt-1.5 font-medium">
                                                    <User className="w-3 h-3 mr-1.5" /> Chưa chỉ định quản lý
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover/node:opacity-100 transition-opacity ml-8 sm:ml-0">
                                        <button onClick={() => openModal(null, node.id)} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Thêm bộ phận con">
                                            <Plus className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => openModal(node)} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Sửa">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(node.id)} className="p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Xóa">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {isExp && renderTree(node.id, level + 1)}
                        </div>
                    );
                })}
            </div>
        );
    };

    if (loading) return <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" /></div>;

    return (
        <div className="bg-slate-50/50 dark:bg-slate-950/30 p-4 md:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 transition-colors">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center transition-colors">
                        <Users className="w-6 h-6 mr-3 text-blue-600 dark:text-blue-500" /> Sơ đồ tổ chức Doanh nghiệp
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Quản lý cấu trúc phòng ban và phân cấp nhân sự</p>
                </div>
                <button onClick={() => openModal(null, null)} className="bg-white dark:bg-slate-900 border border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center transition-all shadow-sm active:scale-95">
                    <Plus className="w-4 h-4 mr-2" /> Thêm Khối/Ban gốc
                </button>
            </div>

            {nodes.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 transition-colors">
                    <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-4" />
                    <p className="text-slate-500 dark:text-slate-400 mb-6 font-medium">Hệ thống chưa có dữ liệu sơ đồ tổ chức.</p>
                    <button onClick={() => openModal(null, null)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all">Tạo Bộ phận đầu tiên</button>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900/50 p-4 md:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner overflow-x-auto transition-colors">
                    <div className="min-w-[600px]">
                        {renderTree(null, 0)}
                    </div>
                </div>
            )}

            {/* MODAL THÊM / SỬA BỘ PHẬN */}
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border dark:border-slate-800 transform animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-5 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center transition-colors">
                            <h3 className="font-bold text-lg dark:text-slate-100">{editingNode ? "Chỉnh sửa Bộ phận" : "Thêm Bộ phận mới"}</h3>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="space-y-2">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tên bộ phận <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-slate-100"
                                    placeholder="VD: Phòng Kỹ thuật"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Thuộc cấp (Bộ phận cha)</label>
                                <select
                                    value={formData.parent_id || ""}
                                    onChange={e => setFormData({ ...formData, parent_id: e.target.value })}
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-slate-100 cursor-pointer"
                                >
                                    <option value="">-- Là cấp cao nhất (Root) --</option>
                                    {nodes.filter(n => n.id !== editingNode?.id).map(n => (
                                        <option key={n.id} value={n.id}>{n.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Trưởng bộ phận (Quản lý)</label>
                                <select
                                    value={formData.manager_id || ""}
                                    onChange={e => setFormData({ ...formData, manager_id: e.target.value })}
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-slate-100 cursor-pointer"
                                >
                                    <option value="">-- Chưa chỉ định --</option>
                                    {employees.map(e => (
                                        <option key={e.id} value={e.id}>{e.name} {e.code ? `(${e.code})` : ""}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="px-6 py-5 bg-slate-50 dark:bg-slate-950 flex justify-end gap-3 border-t dark:border-slate-800 transition-colors">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="px-5 py-2.5 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-sm transition-all"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 flex items-center transition-all disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Lưu dữ liệu"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}