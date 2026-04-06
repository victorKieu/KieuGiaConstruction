"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Calendar as CalendarIcon, Cloud, Sun, CloudRain,
    Users, AlertCircle, Plus, Trash2, Edit, Image as ImageIcon, X, Loader2, Maximize2
} from "lucide-react";
import { toast } from "sonner";
import { createConstructionLog, deleteConstructionLog, updateConstructionLog } from "@/lib/action/log-actions";
import { formatDate } from "@/lib/utils/utils";
import { ConstructionLog } from "@/types/project";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";

const WeatherIcon = ({ type }: { type: string }) => {
    if (type?.includes("Nắng")) return <Sun className="w-5 h-5 text-orange-500" />;
    if (type?.includes("Mưa")) return <CloudRain className="w-5 h-5 text-blue-500" />;
    return <Cloud className="w-5 h-5 text-slate-500 dark:text-slate-400" />;
};

export default function ConstructionLogManager({ projectId, logs }: { projectId: string, logs: ConstructionLog[] }) {
    const supabase = createClient();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    // State dùng để xem ảnh phóng to
    const [previewImage, setPreviewImage] = useState<string | null>(null);

    // State cho chế độ Edit
    const [isEditing, setIsEditing] = useState(false);
    const [currentLogId, setCurrentLogId] = useState<string | null>(null);

    const initialForm = {
        log_date: new Date().toISOString().split('T')[0],
        weather: "Nắng ráo",
        manpower_count: "0",
        work_description: "",
        issues: "",
        images: [] as string[]
    };

    const [formData, setFormData] = useState(initialForm);

    const handleOpenCreate = () => {
        setIsEditing(false);
        setCurrentLogId(null);
        setFormData(initialForm);
        setOpen(true);
    };

    const handleOpenEdit = (log: ConstructionLog) => {
        setIsEditing(true);
        setCurrentLogId(log.id);
        setFormData({
            log_date: log.log_date,
            weather: log.weather || "Nắng ráo",
            manpower_count: log.manpower_count?.toString() || "0",
            work_description: log.work_description || "",
            issues: log.issues || "",
            images: log.images || []
        });
        setOpen(true);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        setUploading(true);
        const files = Array.from(e.target.files);
        const newImageUrls: string[] = [];

        try {
            for (const file of files) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${projectId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('project-images')
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('project-images')
                    .getPublicUrl(fileName);

                newImageUrls.push(publicUrl);
            }

            setFormData(prev => ({
                ...prev,
                images: [...prev.images, ...newImageUrls]
            }));
            toast.success(`Đã tải lên ${newImageUrls.length} ảnh`);
        } catch (error: any) {
            toast.error("Lỗi upload ảnh: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    const removeImage = (indexToRemove: number) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, index) => index !== indexToRemove)
        }));
    };

    const handleSubmit = async () => {
        if (!formData.work_description) {
            toast.error("Vui lòng nhập mô tả công việc");
            return;
        }

        setLoading(true);
        const payload = {
            ...formData,
            manpower_count: parseInt(formData.manpower_count) || 0,
            project_id: projectId
        };

        let res;
        if (isEditing && currentLogId) {
            res = await updateConstructionLog(currentLogId, projectId, payload);
        } else {
            res = await createConstructionLog(payload);
        }

        if (res.success) {
            toast.success(isEditing ? "Đã cập nhật nhật ký!" : "Đã ghi nhật ký mới!");
            setOpen(false);
            setFormData(initialForm);
        } else {
            toast.error("Lỗi: " + res.error);
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc muốn xóa nhật ký này?")) return;
        await deleteConstructionLog(id, projectId);
        toast.success("Đã xóa");
    };

    return (
        <div className="space-y-6 transition-colors">
            {/* Header Tổng */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm gap-4 transition-colors">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 transition-colors">Nhật ký thi công hàng ngày</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 transition-colors">Theo dõi tiến độ, thời tiết và nhân lực trực tiếp trên công trường.</p>
                </div>

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-colors w-full sm:w-auto" onClick={handleOpenCreate}>
                            <Plus className="w-4 h-4 mr-2" /> Ghi Nhật ký
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto dark:bg-slate-900 dark:border-slate-800 transition-colors">
                        <DialogHeader>
                            <DialogTitle className="dark:text-slate-100 text-xl font-bold flex items-center gap-2">
                                <Edit className="w-5 h-5 text-blue-500" />
                                {isEditing ? "Chỉnh sửa Báo cáo" : "Báo cáo công việc hàng ngày"}
                            </DialogTitle>
                        </DialogHeader>

                        <div className="grid gap-5 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Ngày báo cáo</Label>
                                    <Input
                                        type="date"
                                        value={formData.log_date}
                                        onChange={e => setFormData({ ...formData, log_date: e.target.value })}
                                        className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 focus-visible:ring-blue-500 transition-colors"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Thời tiết</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm shadow-sm transition-colors outline-none focus:border-blue-500 dark:text-slate-200"
                                        value={formData.weather}
                                        onChange={e => setFormData({ ...formData, weather: e.target.value })}
                                    >
                                        <option value="Nắng ráo">☀️ Nắng ráo</option>
                                        <option value="Nhiều mây">☁️ Nhiều mây</option>
                                        <option value="Mưa nhỏ">🌦️ Mưa nhỏ</option>
                                        <option value="Mưa lớn">⛈️ Mưa lớn (Ngưng thi công)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Số lượng nhân công (Thợ + Phụ)</Label>
                                <Input
                                    type="number"
                                    value={formData.manpower_count}
                                    onChange={e => setFormData({ ...formData, manpower_count: e.target.value })}
                                    placeholder="0"
                                    min="0"
                                    className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 focus-visible:ring-blue-500 transition-colors h-10 font-bold"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Nội dung công việc chi tiết <span className="text-red-500">*</span></Label>
                                <Textarea
                                    value={formData.work_description}
                                    onChange={e => setFormData({ ...formData, work_description: e.target.value })}
                                    placeholder="- Sáng: Đổ bê tông móng M1...&#10;- Chiều: Gia công cốt thép..."
                                    className="h-32 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 focus-visible:ring-blue-500 transition-colors leading-relaxed"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-red-500 dark:text-red-400 uppercase tracking-widest">Sự cố / Phát sinh (Nếu có)</Label>
                                <Textarea
                                    value={formData.issues}
                                    onChange={e => setFormData({ ...formData, issues: e.target.value })}
                                    placeholder="VD: Mất điện lúc 14h, kẹt xe tải vật tư..."
                                    className="border-red-200 dark:border-red-900/50 bg-red-50/30 dark:bg-red-900/10 focus-visible:ring-red-500 h-20 transition-colors dark:text-slate-200"
                                />
                            </div>

                            <div className="space-y-3 pt-2">
                                <Label className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                    <span>Hình ảnh đính kèm hiện trường</span>
                                    <Button variant="outline" size="sm" className="relative cursor-pointer dark:bg-slate-950 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors h-8" disabled={uploading}>
                                        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <ImageIcon className="w-3.5 h-3.5 mr-2" />}
                                        {uploading ? "Đang tải..." : "Thêm ảnh"}
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={handleImageUpload}
                                            disabled={uploading}
                                        />
                                    </Button>
                                </Label>

                                {formData.images.length > 0 ? (
                                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 mt-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 transition-colors">
                                        {formData.images.map((img, idx) => (
                                            <div key={idx} className="relative group aspect-square rounded-md overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                                                <img src={img} alt="site" className="w-full h-full object-cover" />
                                                <button
                                                    onClick={() => removeImage(idx)}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-xs text-slate-400 dark:text-slate-500 italic text-center py-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-900/50 transition-colors">
                                        <ImageIcon className="w-6 h-6 mx-auto mb-2 opacity-20" />
                                        Chưa có hình ảnh hiện trường nào được tải lên.
                                    </div>
                                )}
                            </div>

                            <Button onClick={handleSubmit} disabled={loading || uploading} className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 text-base mt-2 shadow-md transition-colors">
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isEditing ? "Lưu thay đổi" : "Hoàn tất báo cáo")}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* DANH SÁCH NHẬT KÝ (TIMELINE DỌC) */}
            <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-3 sm:ml-4 space-y-8 pb-10 pt-4 animate-in slide-in-from-bottom-4 transition-colors">
                {logs.length === 0 && (
                    <div className="ml-6 py-12 text-slate-500 dark:text-slate-400 italic text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 shadow-sm transition-colors">
                        <CalendarIcon className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        Dự án chưa có báo cáo nhật ký thi công nào.
                    </div>
                )}

                {logs.map((log) => (
                    <div key={log.id} className="relative ml-6 sm:ml-8 group">
                        {/* Dấu chấm tròn Timeline */}
                        <span className="absolute -left-[35px] sm:-left-[43px] top-4 flex h-4 w-4 items-center justify-center rounded-full bg-white dark:bg-slate-950 border-4 border-slate-100 dark:border-slate-800 ring-2 ring-blue-500 dark:ring-blue-400 shadow-sm transition-colors">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                        </span>

                        <Card className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 bg-white dark:bg-slate-900 overflow-hidden">
                            <CardHeader className="py-3 px-4 sm:px-6 bg-slate-50 dark:bg-slate-950/50 border-b dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors">
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm font-bold tracking-wider shadow-sm">
                                        {formatDate(log.log_date)}
                                    </div>

                                    <div className="flex items-center gap-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-md border dark:border-slate-700 shadow-sm transition-colors">
                                        <WeatherIcon type={log.weather || ""} />
                                        <span>{log.weather}</span>
                                    </div>

                                    <div className="flex items-center gap-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-md border dark:border-slate-700 shadow-sm transition-colors">
                                        <Users className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                                        <span>{log.manpower_count} nhân sự</span>
                                    </div>
                                </div>

                                <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity self-end sm:self-auto">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors" onClick={() => handleOpenEdit(log)}>
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" onClick={() => handleDelete(log.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-5 px-4 sm:px-6 space-y-5">
                                <div className="bg-slate-50/50 dark:bg-slate-950/30 p-4 rounded-lg border border-slate-100 dark:border-slate-800 transition-colors">
                                    <p className="whitespace-pre-line text-slate-800 dark:text-slate-200 text-sm leading-loose font-medium transition-colors">
                                        {log.work_description}
                                    </p>
                                </div>

                                {log.issues && (
                                    <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-100 dark:border-red-900/30 flex gap-3 items-start text-sm text-red-800 dark:text-red-300 transition-colors">
                                        <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-red-600 dark:text-red-500" />
                                        <div className="leading-relaxed">
                                            <span className="font-bold uppercase tracking-wider text-[11px] block mb-1">Sự cố / Phát sinh</span>
                                            {log.issues}
                                        </div>
                                    </div>
                                )}

                                {log.images && log.images.length > 0 && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-2">
                                        {log.images.map((img, idx) => (
                                            <div
                                                key={idx}
                                                className="aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 cursor-zoom-in hover:opacity-90 relative group shadow-sm transition-colors"
                                                onClick={() => setPreviewImage(img)}
                                            >
                                                <img src={img} alt="Site photo" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Maximize2 className="w-6 h-6 text-white drop-shadow-md" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                ))}
            </div>

            {/* --- MODAL XEM ẢNH PHÓNG TO (LIGHTBOX) --- */}
            <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
                <DialogContent className="max-w-screen-xl p-0 bg-transparent border-none shadow-none h-[90vh] flex items-center justify-center">
                    <DialogHeader className="sr-only">
                        <DialogTitle>Xem ảnh chi tiết</DialogTitle>
                    </DialogHeader>

                    <div className="relative w-full h-full flex items-center justify-center pointer-events-auto">
                        <button
                            onClick={() => setPreviewImage(null)}
                            className="absolute -top-12 right-0 md:-right-12 text-white hover:text-red-400 z-50 bg-black/60 hover:bg-black/80 transition-colors rounded-full p-2 backdrop-blur-sm"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        {previewImage && (
                            <img
                                src={previewImage}
                                alt="Preview"
                                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl ring-1 ring-white/10"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}