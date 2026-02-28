"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Save, Trash2, Edit, FileText, Settings, Calculator, ArrowUp, ArrowDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { getTemplates, getTasksByTemplate, saveTask, createTemplate, updateTemplate, deleteTemplate, deleteTask, updateTasksOrder } from "@/lib/action/templateAction";

export default function TemplateManager() {
    const [templates, setTemplates] = useState<any[]>([]);
    const [activeTemplate, setActiveTemplate] = useState<any>(null);
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal Tạo Template Mới
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTemplate, setNewTemplate] = useState({ name: "", foundation_type: "bang", roof_type: "ton" });

    // Modal Sửa Template (🔴 TÍNH NĂNG MỚI BỔ SUNG)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editTemplateData, setEditTemplateData] = useState({ id: "", name: "", foundation_type: "", roof_type: "" });

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        const res = await getTemplates();
        if (res.success && res.data) {
            setTemplates(res.data);
            if (res.data.length > 0 && !activeTemplate) {
                handleSelectTemplate(res.data[0]);
            }
        }
        setLoading(false);
    };

    const handleSelectTemplate = async (template: any) => {
        setActiveTemplate(template);
        const res = await getTasksByTemplate(template.id);
        if (res.success && res.data) setTasks(res.data);
    };

    // --- XỬ LÝ TEMPLATE (CHA) ---
    const handleCreateTemplate = async () => {
        if (!newTemplate.name) return toast.error("Vui lòng nhập tên Template!");
        const res = await createTemplate(newTemplate.name, newTemplate.foundation_type, newTemplate.roof_type);
        if (res.success) {
            toast.success("Đã tạo Template mới!");
            setIsModalOpen(false);
            fetchTemplates();
        } else {
            toast.error("Lỗi: " + res.error);
        }
    };

    // Mở Modal Sửa & Đổ dữ liệu cũ vào (🔴 TÍNH NĂNG MỚI)
    const handleOpenEditModal = () => {
        if (!activeTemplate) return;
        setEditTemplateData({
            id: activeTemplate.id,
            name: activeTemplate.name,
            foundation_type: activeTemplate.foundation_type,
            roof_type: activeTemplate.roof_type
        });
        setIsEditModalOpen(true);
    };

    // Lưu thông tin Sửa (🔴 TÍNH NĂNG MỚI)
    const handleUpdateTemplate = async () => {
        if (!editTemplateData.name) return toast.error("Vui lòng nhập tên Template!");
        const res = await updateTemplate(editTemplateData.id, editTemplateData.name, editTemplateData.foundation_type, editTemplateData.roof_type);
        if (res.success) {
            toast.success("Đã cập nhật thông tin Template!");
            setIsEditModalOpen(false);
            setActiveTemplate(res.data); // Cập nhật lại UI cột phải
            fetchTemplates(); // Tải lại cột trái
        } else {
            toast.error("Lỗi cập nhật: " + res.error);
        }
    };

    const handleDeleteTemplate = async () => {
        if (!confirm(`Sếp có chắc chắn muốn xóa mẫu "${activeTemplate.name}" và toàn bộ công thức bên trong không?`)) return;
        const res = await deleteTemplate(activeTemplate.id);
        if (res.success) {
            toast.success("Đã xóa mẫu thành công!");
            setActiveTemplate(null);
            fetchTemplates();
        } else {
            toast.error("Lỗi khi xóa: " + res.error);
        }
    };

    // --- XỬ LÝ TASKS (CON) ---
    const handleAddEmptyTask = () => {
        const newTask = {
            template_id: activeTemplate.id,
            section_name: "I. PHẦN MỚI",
            item_name: "Tên công tác...",
            norm_code: "",
            unit: "m3",
            formula: "L * W",
            sort_order: tasks.length + 1
        };
        setTasks([...tasks, newTask]);
    };

    const handleTaskChange = (index: number, field: string, value: string) => {
        const newTasks = [...tasks];
        newTasks[index][field] = value;
        setTasks(newTasks);
    };

    const handleSaveTask = async (task: any) => {
        const res = await saveTask(task);
        if (res.success) {
            toast.success("Đã lưu công thức!");
            handleSelectTemplate(activeTemplate); // Reload lưới
        } else {
            toast.error("Lỗi: " + res.error);
        }
    };

    const handleDeleteTask = async (taskId: string, index: number) => {
        if (!confirm("Xóa dòng công tác này?")) return;
        if (!taskId) {
            const newTasks = [...tasks];
            newTasks.splice(index, 1);
            setTasks(newTasks);
            return;
        }
        const res = await deleteTask(taskId);
        if (res.success) {
            toast.success("Đã xóa!");
            setTasks(tasks.filter(t => t.id !== taskId));
        }
    };

    const moveTask = async (index: number, direction: "up" | "down") => {
        if (direction === "up" && index === 0) return;
        if (direction === "down" && index === tasks.length - 1) return;

        const newTasks = [...tasks];
        const swapIndex = direction === "up" ? index - 1 : index + 1;

        [newTasks[index], newTasks[swapIndex]] = [newTasks[swapIndex], newTasks[index]];

        const updatedTasks = newTasks.map((t, i) => ({ ...t, sort_order: i + 1 }));
        setTasks(updatedTasks);

        const tasksToSave = updatedTasks.filter(t => t.id).map(t => ({ id: t.id, sort_order: t.sort_order }));
        if (tasksToSave.length > 0) {
            await updateTasksOrder(tasksToSave);
        }
    };

    if (loading) return <div className="p-10 text-center text-slate-500 font-medium">Đang tải Dữ liệu lõi...</div>;

    return (
        <div className="flex h-[85vh] bg-slate-50 border rounded-xl overflow-hidden shadow-sm mt-4">

            {/* CỘT TRÁI: DANH SÁCH TEMPLATES */}
            <div className="w-1/4 bg-white border-r flex flex-col">
                <div className="p-4 border-b bg-slate-100 flex justify-between items-center">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        Kho Template Mẫu
                    </h2>
                    <Button size="sm" onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {templates.map(tpl => (
                        <div
                            key={tpl.id}
                            onClick={() => handleSelectTemplate(tpl)}
                            className={`p-3 rounded-lg cursor-pointer border transition-all ${activeTemplate?.id === tpl.id ? 'bg-blue-50 border-blue-500 shadow-sm' : 'hover:bg-slate-50 border-transparent'}`}
                        >
                            <h3 className="font-semibold text-sm text-slate-800">{tpl.name}</h3>
                            <p className="text-xs text-slate-500 mt-1">Móng: {tpl.foundation_type === 'all' ? 'Tất cả' : tpl.foundation_type} | Mái: {tpl.roof_type === 'all' ? 'Tất cả' : tpl.roof_type}</p>
                        </div>
                    ))}
                    {templates.length === 0 && <p className="text-sm text-slate-400 text-center py-5">Chưa có Template nào</p>}
                </div>
            </div>

            {/* CỘT PHẢI: CHI TIẾT CÔNG THỨC */}
            <div className="flex-1 flex flex-col bg-white">
                {activeTemplate ? (
                    <>
                        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                            <div>
                                <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                    {activeTemplate.name}
                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-blue-600 hover:bg-blue-100" onClick={handleOpenEditModal} title="Sửa thông tin Template">
                                        <Edit className="w-3.5 h-3.5" />
                                    </Button>
                                </h2>
                                <p className="text-sm text-slate-500">Variables hỗ trợ: <strong className="text-orange-600">L, W, Floors, WcCount</strong></p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" className="text-red-600 hover:bg-red-50" onClick={handleDeleteTemplate}>
                                    <Trash2 className="w-4 h-4 mr-2" /> Xóa Form này
                                </Button>
                                <Button className="bg-orange-500 hover:bg-orange-600" onClick={handleAddEmptyTask}>
                                    <Plus className="w-4 h-4 mr-2" /> Thêm Công Tác Động
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            <table className="w-full text-sm text-left border rounded-lg overflow-hidden">
                                <thead className="bg-slate-100 text-slate-600">
                                    <tr>
                                        <th className="p-3 border-b w-10">TT</th>
                                        <th className="p-3 border-b">Hạng Mục Cha</th>
                                        <th className="p-3 border-b">Tên Công Tác</th>
                                        <th className="p-3 border-b w-24">Mã ĐM</th>
                                        <th className="p-3 border-b w-16">ĐVT</th>
                                        <th className="p-3 border-b w-56 bg-amber-50">Công thức nội suy</th>
                                        <th className="p-3 border-b w-32 text-center">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tasks.map((task, index) => (
                                        <tr key={task.id || index} className="border-b hover:bg-slate-50">
                                            <td className="p-2 text-center text-slate-400">{index + 1}</td>
                                            <td className="p-2"><Input value={task.section_name} onChange={(e) => handleTaskChange(index, "section_name", e.target.value)} className="h-8" /></td>
                                            <td className="p-2"><Input value={task.item_name} onChange={(e) => handleTaskChange(index, "item_name", e.target.value)} className="h-8" /></td>
                                            <td className="p-2"><Input value={task.norm_code} onChange={(e) => handleTaskChange(index, "norm_code", e.target.value)} className="h-8 text-center font-mono text-xs" /></td>
                                            <td className="p-2"><Input value={task.unit} onChange={(e) => handleTaskChange(index, "unit", e.target.value)} className="h-8 text-center" /></td>
                                            <td className="p-2">
                                                <div className="relative">
                                                    <Calculator className="w-3 h-3 absolute left-2 top-2.5 text-orange-500" />
                                                    <Input
                                                        value={task.formula}
                                                        onChange={(e) => handleTaskChange(index, "formula", e.target.value)}
                                                        className="h-8 pl-6 font-mono text-orange-700 bg-orange-50/50 border-orange-200 text-xs"
                                                    />
                                                </div>
                                            </td>
                                            <td className="p-2 flex justify-center gap-1">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-500 hover:bg-blue-100" onClick={() => moveTask(index, "up")} disabled={index === 0} title="Lên trên">
                                                    <ArrowUp className="w-4 h-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-500 hover:bg-blue-100" onClick={() => moveTask(index, "down")} disabled={index === tasks.length - 1} title="Xuống dưới">
                                                    <ArrowDown className="w-4 h-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:bg-green-100" onClick={() => handleSaveTask(task)} title="Lưu">
                                                    <Save className="w-4 h-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-100" onClick={() => handleDeleteTask(task.id, index)} title="Xóa">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {tasks.length === 0 && (
                                <div className="text-center py-10 text-slate-400">Template này chưa có công tác nào. Bấm "Thêm Công Tác Động" để bắt đầu!</div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-400 flex-col gap-3">
                        <Settings className="w-12 h-12 text-slate-300" />
                        <p>Vui lòng chọn một Template bên trái để bắt đầu thiết lập</p>
                    </div>
                )}
            </div>

            {/* 🔴 MODAL THÊM TEMPLATE */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Tạo Template Mẫu Mới</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Tên mẫu dự toán (VD: Nhà Xưởng Mái Tôn)</label>
                            <Input value={newTemplate.name} onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })} placeholder="Nhập tên..." />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Áp dụng Loại Móng</label>
                                <select className="w-full h-10 px-3 border rounded-md outline-none bg-white" value={newTemplate.foundation_type} onChange={(e) => setNewTemplate({ ...newTemplate, foundation_type: e.target.value })}>
                                    <option value="bang">Móng Băng</option>
                                    <option value="coc">Móng Cọc</option>
                                    <option value="don">Móng Đơn</option>
                                    <option value="all">Tất cả loại móng</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Áp dụng Loại Mái</label>
                                <select className="w-full h-10 px-3 border rounded-md outline-none bg-white" value={newTemplate.roof_type} onChange={(e) => setNewTemplate({ ...newTemplate, roof_type: e.target.value })}>
                                    <option value="ton">Mái Tôn</option>
                                    <option value="btct">Mái BTCT</option>
                                    <option value="ngoi">Mái Ngói</option>
                                    <option value="all">Tất cả loại mái</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Hủy</Button>
                        <Button onClick={handleCreateTemplate} className="bg-blue-600 hover:bg-blue-700">Tạo Template</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 🔴 MODAL SỬA TEMPLATE (TÍNH NĂNG MỚI) */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Sửa thông tin Template</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Tên mẫu dự toán</label>
                            <Input value={editTemplateData.name} onChange={(e) => setEditTemplateData({ ...editTemplateData, name: e.target.value })} placeholder="Nhập tên..." />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Áp dụng Loại Móng</label>
                                <select className="w-full h-10 px-3 border rounded-md outline-none bg-white" value={editTemplateData.foundation_type} onChange={(e) => setEditTemplateData({ ...editTemplateData, foundation_type: e.target.value })}>
                                    <option value="bang">Móng Băng</option>
                                    <option value="coc">Móng Cọc</option>
                                    <option value="don">Móng Đơn</option>
                                    <option value="all">Tất cả loại móng</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Áp dụng Loại Mái</label>
                                <select className="w-full h-10 px-3 border rounded-md outline-none bg-white" value={editTemplateData.roof_type} onChange={(e) => setEditTemplateData({ ...editTemplateData, roof_type: e.target.value })}>
                                    <option value="ton">Mái Tôn</option>
                                    <option value="btct">Mái BTCT</option>
                                    <option value="ngoi">Mái Ngói</option>
                                    <option value="all">Tất cả loại mái</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Hủy</Button>
                        <Button onClick={handleUpdateTemplate} className="bg-green-600 hover:bg-green-700">Cập nhật thay đổi</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}