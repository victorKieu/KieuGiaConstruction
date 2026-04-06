"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Save, Trash2, Edit, FileText, Settings, Calculator, ArrowUp, ArrowDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { getTemplates, getTasksByTemplate, saveTask, createTemplate, updateTemplate, deleteTemplate, deleteTask, updateTasksOrder } from "@/lib/action/templateAction";
import { cn } from "@/lib/utils/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
export default function TemplateManager() {
    const [templates, setTemplates] = useState<any[]>([]);
    const [activeTemplate, setActiveTemplate] = useState<any>(null);
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal Tạo Template Mới
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTemplate, setNewTemplate] = useState({ name: "", foundation_type: "bang", roof_type: "ton" });

    // Modal Sửa Template
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

    const handleUpdateTemplate = async () => {
        if (!editTemplateData.name) return toast.error("Vui lòng nhập tên Template!");
        const res = await updateTemplate(editTemplateData.id, editTemplateData.name, editTemplateData.foundation_type, editTemplateData.roof_type);
        if (res.success) {
            toast.success("Đã cập nhật thông tin Template!");
            setIsEditModalOpen(false);
            setActiveTemplate(res.data);
            fetchTemplates();
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
            handleSelectTemplate(activeTemplate);
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

    if (loading) return <div className="p-10 text-center text-slate-500 font-medium transition-colors">Đang tải Dữ liệu lõi...</div>;

    const selectClass = "w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-md outline-none bg-white dark:bg-slate-950 dark:text-slate-200 transition-colors";
    const inputTableClass = "h-8 bg-transparent border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:bg-white dark:focus:bg-slate-950 focus:border-blue-500 dark:focus:border-blue-500 transition-all";

    return (
        <div className="flex flex-col lg:flex-row h-[85vh] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm mt-4 transition-colors duration-500">

            {/* CỘT TRÁI: DANH SÁCH TEMPLATES */}
            <div className="w-full lg:w-1/4 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-colors">
                <div className="p-4 border-b dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950/50 flex justify-between items-center">
                    <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                        Kho Template Mẫu
                    </h2>
                    <Button size="sm" onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>
                <ScrollArea className="flex-1 p-2 space-y-2">
                    {templates.map(tpl => (
                        <div
                            key={tpl.id}
                            onClick={() => handleSelectTemplate(tpl)}
                            className={cn(
                                "p-3 rounded-lg cursor-pointer border transition-all mb-2",
                                activeTemplate?.id === tpl.id
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-500 shadow-sm'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-transparent dark:text-slate-400'
                            )}
                        >
                            <h3 className={cn("font-bold text-sm", activeTemplate?.id === tpl.id ? "text-blue-700 dark:text-blue-400" : "text-slate-800 dark:text-slate-200")}>{tpl.name}</h3>
                            <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-500 mt-1.5 tracking-wider">
                                Móng: {tpl.foundation_type} • Mái: {tpl.roof_type}
                            </p>
                        </div>
                    ))}
                    {templates.length === 0 && <p className="text-sm text-slate-400 text-center py-10 italic">Chưa có Template nào</p>}
                </ScrollArea>
            </div>

            {/* CỘT PHẢI: CHI TIẾT CÔNG THỨC */}
            <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 transition-colors">
                {activeTemplate ? (
                    <>
                        <div className="p-4 border-b dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50/50 dark:bg-slate-950/30 gap-4">
                            <div>
                                <h2 className="font-black text-xl text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    {activeTemplate.name}
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30" onClick={handleOpenEditModal} title="Sửa thông tin Template">
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                </h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Biến hỗ trợ:</span>
                                    <Badge variant="outline" className="text-[10px] font-mono border-orange-200 dark:border-orange-900/50 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20">L, W, Floors, WcCount</Badge>
                                </div>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <Button variant="outline" className="flex-1 sm:flex-none text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" onClick={handleDeleteTemplate}>
                                    <Trash2 className="w-4 h-4 mr-2" /> Xóa Form
                                </Button>
                                <Button className="flex-1 sm:flex-none bg-orange-500 hover:bg-orange-600 text-white shadow-md" onClick={handleAddEmptyTask}>
                                    <Plus className="w-4 h-4 mr-2" /> Thêm Công Tác
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="p-3 border-b dark:border-slate-800 w-10 text-center font-bold">#</th>
                                        <th className="p-3 border-b dark:border-slate-800 font-bold uppercase text-[11px]">Hạng Mục Cha</th>
                                        <th className="p-3 border-b dark:border-slate-800 font-bold uppercase text-[11px]">Tên Công Tác</th>
                                        <th className="p-3 border-b dark:border-slate-800 w-24 text-center font-bold uppercase text-[11px]">Mã ĐM</th>
                                        <th className="p-3 border-b dark:border-slate-800 w-16 text-center font-bold uppercase text-[11px]">ĐVT</th>
                                        <th className="p-3 border-b dark:border-slate-800 w-64 bg-amber-50 dark:bg-amber-950/20 font-bold uppercase text-[11px] text-amber-700 dark:text-amber-500 tracking-wider">Công thức nội suy</th>
                                        <th className="p-3 border-b dark:border-slate-800 w-36 text-center font-bold uppercase text-[11px]">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-slate-800">
                                    {tasks.map((task, index) => (
                                        <tr key={task.id || index} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="p-2 text-center text-slate-400 font-mono text-xs">{index + 1}</td>
                                            <td className="p-1"><Input value={task.section_name} onChange={(e) => handleTaskChange(index, "section_name", e.target.value)} className={inputTableClass} /></td>
                                            <td className="p-1"><Input value={task.item_name} onChange={(e) => handleTaskChange(index, "item_name", e.target.value)} className={cn(inputTableClass, "font-semibold")} /></td>
                                            <td className="p-1"><Input value={task.norm_code} onChange={(e) => handleTaskChange(index, "norm_code", e.target.value)} className={cn(inputTableClass, "text-center font-mono text-xs uppercase")} /></td>
                                            <td className="p-1"><Input value={task.unit} onChange={(e) => handleTaskChange(index, "unit", e.target.value)} className={cn(inputTableClass, "text-center")} /></td>
                                            <td className="p-1 bg-amber-50/30 dark:bg-amber-950/10">
                                                <div className="relative group/formula">
                                                    <Calculator className="w-3 h-3 absolute left-2 top-2.5 text-amber-500 opacity-50 group-focus-within/formula:opacity-100 transition-opacity" />
                                                    <Input
                                                        value={task.formula}
                                                        onChange={(e) => handleTaskChange(index, "formula", e.target.value)}
                                                        className="h-8 pl-7 font-mono text-amber-700 dark:text-amber-400 bg-transparent border-transparent hover:border-amber-200 dark:hover:border-amber-900 focus:bg-white dark:focus:bg-slate-950 focus:border-amber-500 text-xs"
                                                    />
                                                </div>
                                            </td>
                                            <td className="p-1">
                                                <div className="flex justify-center gap-0.5">
                                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400" onClick={() => moveTask(index, "up")} disabled={index === 0}><ArrowUp className="w-3.5 h-3.5" /></Button>
                                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400" onClick={() => moveTask(index, "down")} disabled={index === tasks.length - 1}><ArrowDown className="w-3.5 h-3.5" /></Button>
                                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 dark:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30" onClick={() => handleSaveTask(task)}><Save className="w-3.5 h-3.5" /></Button>
                                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30" onClick={() => handleDeleteTask(task.id, index)}><Trash2 className="w-3.5 h-3.5" /></Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {tasks.length === 0 && (
                                <div className="text-center py-20 text-slate-400 flex flex-col items-center gap-2">
                                    <Settings className="w-10 h-10 opacity-20" />
                                    <p className="italic">Chưa có công tác nào. Sếp bấm "Thêm Công Tác" nhé!</p>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-400 flex-col gap-4 bg-slate-50/30 dark:bg-slate-950/20 transition-colors">
                        <div className="p-6 rounded-full bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
                            <Settings className="w-12 h-12 text-blue-500 animate-pulse" />
                        </div>
                        <p className="font-medium">Chọn một Template bên trái để cấu hình công thức</p>
                    </div>
                )}
            </div>

            {/* MODAL THÊM TEMPLATE */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[425px] dark:bg-slate-900 dark:border-slate-800 transition-colors">
                    <DialogHeader>
                        <DialogTitle className="dark:text-slate-100">Tạo Template Mẫu Mới</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-5 py-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tên mẫu dự toán</label>
                            <Input value={newTemplate.name} onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })} placeholder="VD: Nhà Phố Hiện Đại" className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Loại Móng</label>
                                <select className={selectClass} value={newTemplate.foundation_type} onChange={(e) => setNewTemplate({ ...newTemplate, foundation_type: e.target.value })}>
                                    <option value="bang">Móng Băng</option>
                                    <option value="coc">Móng Cọc</option>
                                    <option value="don">Móng Đơn</option>
                                    <option value="all">Tất cả</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Loại Mái</label>
                                <select className={selectClass} value={newTemplate.roof_type} onChange={(e) => setNewTemplate({ ...newTemplate, roof_type: e.target.value })}>
                                    <option value="ton">Mái Tôn</option>
                                    <option value="btct">Mái BTCT</option>
                                    <option value="ngoi">Mái Ngói</option>
                                    <option value="all">Tất cả</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="dark:border-slate-800 pt-2">
                        <Button variant="outline" onClick={() => setIsModalOpen(false)} className="dark:border-slate-700 dark:text-slate-300">Hủy</Button>
                        <Button onClick={handleCreateTemplate} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20">Tạo Template</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL SỬA TEMPLATE */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-[425px] dark:bg-slate-900 dark:border-slate-800 transition-colors">
                    <DialogHeader>
                        <DialogTitle className="dark:text-slate-100">Sửa thông tin Template</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-5 py-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tên mẫu dự toán</label>
                            <Input value={editTemplateData.name} onChange={(e) => setEditTemplateData({ ...editTemplateData, name: e.target.value })} className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Loại Móng</label>
                                <select className={selectClass} value={editTemplateData.foundation_type} onChange={(e) => setEditTemplateData({ ...editTemplateData, foundation_type: e.target.value })}>
                                    <option value="bang">Móng Băng</option>
                                    <option value="coc">Móng Cọc</option>
                                    <option value="don">Móng Đơn</option>
                                    <option value="all">Tất cả</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Loại Mái</label>
                                <select className={selectClass} value={editTemplateData.roof_type} onChange={(e) => setEditTemplateData({ ...editTemplateData, roof_type: e.target.value })}>
                                    <option value="ton">Mái Tôn</option>
                                    <option value="btct">Mái BTCT</option>
                                    <option value="ngoi">Mái Ngói</option>
                                    <option value="all">Tất cả</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="dark:border-slate-800 pt-2">
                        <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="dark:border-slate-700 dark:text-slate-300">Hủy</Button>
                        <Button onClick={handleUpdateTemplate} className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20">Cập nhật thay đổi</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}