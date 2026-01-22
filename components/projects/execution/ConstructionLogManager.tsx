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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"; // ✅ Thêm DialogDescription nếu cần
import { createClient } from "@/lib/supabase/client";

const WeatherIcon = ({ type }: { type: string }) => {
    if (type?.includes("Nắng")) return <Sun className="w-5 h-5 text-orange-500" />;
    if (type?.includes("Mưa")) return <CloudRain className="w-5 h-5 text-blue-500" />;
    return <Cloud className="w-5 h-5 text-gray-500" />;
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
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Nhật ký thi công</h3>
                    <p className="text-sm text-slate-500">Ghi chép hoạt động, nhân sự và hình ảnh hiện trường</p>
                </div>

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm" onClick={handleOpenCreate}>
                            <Plus className="w-4 h-4 mr-2" /> Viết Nhật ký
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{isEditing ? "Chỉnh sửa Nhật ký" : "Báo cáo công việc hàng ngày"}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Ngày báo cáo</Label>
                                    <Input type="date" value={formData.log_date} onChange={e => setFormData({ ...formData, log_date: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Thời tiết</Label>
                                    <select
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
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
                                <Label>Số lượng nhân công (Thợ + Phụ)</Label>
                                <Input
                                    type="number"
                                    value={formData.manpower_count}
                                    onChange={e => setFormData({ ...formData, manpower_count: e.target.value })}
                                    placeholder="0"
                                    min="0"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Nội dung công việc <span className="text-red-500">*</span></Label>
                                <Textarea
                                    value={formData.work_description}
                                    onChange={e => setFormData({ ...formData, work_description: e.target.value })}
                                    placeholder="- Sáng: Đổ bê tông móng M1...&#10;- Chiều: Gia công cốt thép..."
                                    className="h-28"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Sự cố / Phát sinh (Nếu có)</Label>
                                <Textarea
                                    value={formData.issues}
                                    onChange={e => setFormData({ ...formData, issues: e.target.value })}
                                    placeholder="VD: Mất điện, thiếu vật tư..."
                                    className="border-red-200 focus:border-red-400 h-20"
                                />
                            </div>

                            <div className="space-y-2 border-t pt-4">
                                <Label className="flex items-center justify-between">
                                    <span>Hình ảnh hiện trường</span>
                                    <Button variant="outline" size="sm" className="relative cursor-pointer" disabled={uploading}>
                                        {uploading ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <ImageIcon className="w-3 h-3 mr-2" />}
                                        {uploading ? "Đang tải..." : "Chọn ảnh"}
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
                                    <div className="grid grid-cols-4 gap-2 mt-2">
                                        {formData.images.map((img, idx) => (
                                            <div key={idx} className="relative group aspect-square rounded-md overflow-hidden border">
                                                <img src={img} alt="site" className="w-full h-full object-cover" />
                                                <button
                                                    onClick={() => removeImage(idx)}
                                                    className="absolute top-1 right-1 bg-black/50 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-xs text-slate-400 italic text-center py-2 border border-dashed rounded bg-slate-50">
                                        Chưa có hình ảnh nào.
                                    </div>
                                )}
                            </div>

                            <Button onClick={handleSubmit} disabled={loading || uploading} className="w-full bg-blue-600 mt-2">
                                {loading ? "Đang lưu..." : (isEditing ? "Cập nhật Nhật ký" : "Lưu Nhật ký")}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* DANH SÁCH NHẬT KÝ (TIMELINE) */}
            <div className="relative border-l-2 border-slate-200 ml-3 space-y-8 pb-10 animate-in slide-in-from-bottom-2">
                {logs.length === 0 && (
                    <div className="ml-6 py-10 text-slate-500 italic text-center bg-slate-50 rounded border border-dashed">
                        Chưa có nhật ký nào. Hãy viết báo cáo đầu tiên.
                    </div>
                )}

                {logs.map((log) => (
                    <div key={log.id} className="relative ml-6 group">
                        <span className="absolute -left-[33px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white border-4 border-blue-100 ring-2 ring-blue-600 shadow-sm">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                        </span>

                        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
                            <CardHeader className="py-3 bg-slate-50/50 border-b flex flex-row items-center justify-between">
                                <div className="flex flex-wrap items-center gap-2 md:gap-4">
                                    <div className="flex items-center gap-2 font-bold text-slate-700 text-lg">
                                        <div className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs font-mono">
                                            {formatDate(log.log_date)}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs font-medium bg-white px-2 py-1 rounded border shadow-sm">
                                        <WeatherIcon type={log.weather || ""} />
                                        <span>{log.weather}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs font-medium bg-white px-2 py-1 rounded border shadow-sm text-slate-600">
                                        <Users className="w-3.5 h-3.5" />
                                        <b>{log.manpower_count}</b> nhân sự
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500 hover:text-blue-700 hover:bg-blue-50" onClick={() => handleOpenEdit(log)}>
                                        <Edit className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={() => handleDelete(log.id)}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                <div>
                                    <p className="whitespace-pre-line text-slate-700 text-sm leading-relaxed font-medium">
                                        {log.work_description}
                                    </p>
                                </div>

                                {log.issues && (
                                    <div className="bg-red-50 p-3 rounded-md border border-red-100 flex gap-2 items-start text-sm text-red-800">
                                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
                                        <div>
                                            <span className="font-bold">Sự cố/Phát sinh: </span>
                                            {log.issues}
                                        </div>
                                    </div>
                                )}

                                {log.images && log.images.length > 0 && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 mt-2 pt-2 border-t border-slate-100 border-dashed">
                                        {log.images.map((img, idx) => (
                                            <div
                                                key={idx}
                                                className="aspect-square rounded-md overflow-hidden border bg-slate-100 cursor-zoom-in hover:opacity-90 relative group"
                                                onClick={() => setPreviewImage(img)}
                                            >
                                                <img src={img} alt="Site photo" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
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
                <DialogContent className="max-w-screen-lg p-0 bg-transparent border-none shadow-none h-[90vh] flex items-center justify-center">

                    {/* ✅ FIX LỖI: Thêm DialogHeader + DialogTitle và ẩn đi bằng class sr-only */}
                    <DialogHeader className="sr-only">
                        <DialogTitle>Xem ảnh chi tiết</DialogTitle>
                    </DialogHeader>

                    <div className="relative w-full h-full flex items-center justify-center pointer-events-auto">
                        <button
                            onClick={() => setPreviewImage(null)}
                            className="absolute -top-10 right-0 md:-right-10 text-white hover:text-gray-300 z-50 bg-black/50 rounded-full p-2"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        {previewImage && (
                            <img
                                src={previewImage}
                                alt="Preview"
                                className="max-w-full max-h-full object-contain rounded-md shadow-2xl"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}