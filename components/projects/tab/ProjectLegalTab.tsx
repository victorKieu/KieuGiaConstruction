"use client";

import { useState } from "react";
import { useRouter } from "next/navigation"; // Import router để refresh
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // Thêm Textarea
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    FileText, Save, Plus, MapPin, Building2,
    CheckCircle, AlertTriangle, Loader2, Trash2, Info, Pencil // Thêm icon Pencil
} from "lucide-react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog"; // Import Dialog components
import { toast } from "sonner";
// ✅ Import thêm hàm updateLegalDoc
import { updateProjectLegalInfo, deleteLegalDoc, updateLegalDoc } from "@/lib/action/legal-actions";
import { ProjectData, LegalDoc } from "@/types/project";
import { formatDate } from "@/lib/utils/utils";
import LegalDocPrintDialog from "@/components/projects/legal/LegalDocPrintDialog";

// --- 1. TỪ ĐIỂN LOẠI VĂN BẢN (VIỆT HÓA) ---
const DOC_TYPE_LABELS: Record<string, string> = {
    ORDER_COMMENCEMENT: "Lệnh Khởi Công",
    NOTICE_COMMENCEMENT: "Thông báo Khởi công",
    NOTICE_SUSPENSION: "Thông báo Tạm dừng",
    ORDER_RESUMPTION: "Lệnh Tái khởi động",
    HANDOVER_MINUTES: "Biên bản Bàn giao",
    TEMP_ACCEPTANCE_MINUTES: "Nghiệm thu Điểm dừng",
    CONSTRUCTION_PERMIT: "Giấy phép Xây dựng"
};

// --- 2. COMPONENT CON: DIALOG SỬA VĂN BẢN ---
function EditLegalDocDialog({ doc, onSuccess }: { doc: LegalDoc, onSuccess: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // State form
    const [formData, setFormData] = useState({
        doc_code: doc.doc_code || "",
        issue_date: doc.issue_date ? new Date(doc.issue_date).toISOString().split('T')[0] : "",
        issuing_authority: doc.issuing_authority || "",
        notes: doc.notes || ""
    });

    const handleUpdate = async () => {
        setLoading(true);
        const res = await updateLegalDoc(doc.id, formData);
        setLoading(false);

        if (res.success) {
            toast.success("Đã cập nhật văn bản.");
            setOpen(false);
            onSuccess(); // Refresh lại danh sách cha
        } else {
            toast.error(res.error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50">
                    <Pencil className="w-4 h-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Hiệu chỉnh Văn bản</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                    <div className="space-y-2">
                        <Label>Loại văn bản</Label>
                        <Input disabled value={DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type} className="bg-slate-100 font-bold text-slate-700" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Số hiệu văn bản</Label>
                            <Input
                                value={formData.doc_code}
                                onChange={(e) => setFormData({ ...formData, doc_code: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Ngày ban hành</Label>
                            <Input
                                type="date"
                                value={formData.issue_date}
                                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Cơ quan ban hành / Nơi gửi</Label>
                        <Input
                            value={formData.issuing_authority}
                            onChange={(e) => setFormData({ ...formData, issuing_authority: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Ghi chú / Nội dung tóm tắt</Label>
                        <Textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="min-h-[80px]"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
                    <Button onClick={handleUpdate} disabled={loading} className="bg-blue-600">
                        {loading ? "Đang lưu..." : "Lưu thay đổi"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- 3. MAIN COMPONENT ---
interface ProjectLegalTabProps {
    project: ProjectData;
    docs: LegalDoc[];
}

export default function ProjectLegalTab({ project, docs }: ProjectLegalTabProps) {
    const [loading, setLoading] = useState(false);
    const router = useRouter(); // Dùng để refresh dữ liệu sau khi sửa/xóa

    // State quản lý Form thông tin
    const [info, setInfo] = useState({
        land_lot_number: project.land_lot_number || "",
        land_parcel_number: project.land_parcel_number || "",
        construction_permit_code: project.construction_permit_code || "",
        permit_issue_date: project.permit_issue_date ? project.permit_issue_date.split('T')[0] : "",
        total_floor_area: project.total_floor_area || 0,
        num_floors: project.num_floors || 0,
        construction_phase: project.construction_phase || 'legal',
        is_permit_required: project.is_permit_required ?? true
    });

    // Hàm lưu thông tin chính
    const handleSaveInfo = async () => {
        setLoading(true);
        const res = await updateProjectLegalInfo(project.id, info);
        if (res.success) {
            toast.success("Đã cập nhật thông tin pháp lý thành công!");
            router.refresh();
        } else {
            toast.error("Lỗi cập nhật: " + res.error);
        }
        setLoading(false);
    };

    // Hàm xóa hồ sơ
    const handleDeleteDoc = async (id: string) => {
        if (!confirm("Bạn có chắc muốn xóa hồ sơ này?")) return;
        const res = await deleteLegalDoc(id, project.id);
        if (res.success) {
            toast.success("Đã xóa hồ sơ");
            router.refresh();
        }
    }

    // LOGIC HIỂN THỊ TRẠNG THÁI (Giữ nguyên như cũ)
    const renderStatusAlert = () => {
        if (!info.is_permit_required) {
            return (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg flex items-start gap-3 shadow-sm">
                    <Info className="w-6 h-6 text-blue-600 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-base">Dự án được miễn/Không yêu cầu GPXD</h4>
                        <p className="text-sm mt-1">Dự án thuộc diện sửa chữa/miễn phép. Chỉ cần đảm bảo an toàn & vệ sinh.</p>
                    </div>
                </div>
            );
        }
        if (!info.construction_permit_code) {
            return (
                <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg flex items-start gap-3 shadow-sm">
                    <AlertTriangle className="w-6 h-6 text-red-600 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-base">CẢNH BÁO: Chưa có Giấy phép xây dựng!</h4>
                        <p className="text-sm mt-1">Dự án bắt buộc có GPXD. Vui lòng cập nhật để tránh rủi ro pháp lý.</p>
                    </div>
                </div>
            );
        }
        return (
            <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg flex items-start gap-3 shadow-sm">
                <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
                <div>
                    <h4 className="font-bold text-base">Pháp lý khởi công: Đủ điều kiện</h4>
                    <p className="text-sm mt-1">Đã có GPXD số <b>{info.construction_permit_code}</b>. Nhớ nộp Thông báo khởi công trước 07 ngày.</p>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 1. THANH ĐIỀU KHIỂN & 2. TRẠNG THÁI & 3. FORM NHẬP LIỆU (Giữ nguyên code cũ) */}
            <div className="flex items-center justify-between bg-white p-4 border rounded-lg shadow-sm">
                <div className="space-y-0.5">
                    <Label className="text-base font-bold">Yêu cầu Giấy phép Xây dựng</Label>
                    <p className="text-sm text-slate-500">Bật nếu đây là công trình xây mới hoặc sửa chữa lớn cần xin phép.</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${info.is_permit_required ? 'text-blue-600' : 'text-slate-400'}`}>
                        {info.is_permit_required ? "BẮT BUỘC" : "KHÔNG CẦN"}
                    </span>
                    <Switch checked={info.is_permit_required} onCheckedChange={(checked) => setInfo({ ...info, is_permit_required: checked })} />
                </div>
            </div>

            {renderStatusAlert()}

            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity duration-300 ${!info.is_permit_required ? 'opacity-80' : ''}`}>
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-3 border-b bg-slate-50/50"><CardTitle className="text-base flex items-center gap-2 text-slate-800"><MapPin className="w-4 h-4 text-blue-600" /> Vị trí & Đất đai</CardTitle></CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label className="text-xs font-bold text-slate-500 uppercase">Số tờ bản đồ</Label><Input value={info.land_lot_number} onChange={e => setInfo({ ...info, land_lot_number: e.target.value })} className="font-semibold" /></div>
                            <div className="space-y-2"><Label className="text-xs font-bold text-slate-500 uppercase">Số thửa đất</Label><Input value={info.land_parcel_number} onChange={e => setInfo({ ...info, land_parcel_number: e.target.value })} className="font-semibold" /></div>
                        </div>
                        <div className="space-y-2"><Label className="text-xs font-bold text-slate-500 uppercase">Địa chỉ thực tế</Label><Input value={project.address || ""} disabled className="bg-slate-100 text-slate-600" /></div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-3 border-b bg-slate-50/50"><CardTitle className="text-base flex items-center gap-2 text-slate-800"><Building2 className="w-4 h-4 text-orange-600" /> Thông số Cấp phép xây dựng</CardTitle></CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 col-span-2 md:col-span-1"><Label className="text-xs font-bold text-slate-500 uppercase">Số GPXD</Label><Input value={info.construction_permit_code} onChange={e => setInfo({ ...info, construction_permit_code: e.target.value })} className={`font-bold ${info.is_permit_required && !info.construction_permit_code ? 'border-red-300 ring-red-100' : 'text-blue-700'}`} disabled={!info.is_permit_required} /></div>
                            <div className="space-y-2 col-span-2 md:col-span-1"><Label className="text-xs font-bold text-slate-500 uppercase">Ngày cấp</Label><Input type="date" value={info.permit_issue_date} onChange={e => setInfo({ ...info, permit_issue_date: e.target.value })} disabled={!info.is_permit_required} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label className="text-xs font-bold text-slate-500 uppercase">Số tầng</Label><Input type="number" value={info.num_floors} onChange={e => setInfo({ ...info, num_floors: parseInt(e.target.value) })} /></div>
                            <div className="space-y-2"><Label className="text-xs font-bold text-slate-500 uppercase">DT Sàn (m2)</Label><Input type="number" value={info.total_floor_area} onChange={e => setInfo({ ...info, total_floor_area: parseFloat(e.target.value) })} /></div>
                        </div>
                        <div className="pt-2"><Button onClick={handleSaveInfo} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">{loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Lưu thông tin Pháp lý</Button></div>
                    </CardContent>
                </Card>
            </div>

            {/* 4. DANH SÁCH HỒ SƠ LƯU TRỮ (ĐÃ CẬP NHẬT) */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 py-4">
                    <div><CardTitle className="text-base text-slate-800">Hồ sơ lưu trữ (Scan)</CardTitle><CardDescription>Lưu trữ bản scan: GPXD, Bản vẽ xin phép, Thông báo khởi công...</CardDescription></div>
                    <Button variant="outline" size="sm" disabled><Plus className="w-4 h-4 mr-2" /> Thêm hồ sơ</Button>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead className="w-[50px]">#</TableHead>
                                <TableHead>Loại hồ sơ</TableHead>
                                <TableHead>Số hiệu</TableHead>
                                <TableHead>Ngày ban hành</TableHead>
                                <TableHead>Cơ quan cấp</TableHead>
                                <TableHead className="text-center">Trạng thái</TableHead>
                                <TableHead className="text-right pr-6">Thao tác</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {docs.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="text-center text-slate-500 py-8 italic">Chưa có hồ sơ nào được tải lên.</TableCell></TableRow>
                            ) : (
                                docs.map((doc, index) => (
                                    <TableRow key={doc.id} className="hover:bg-slate-50">
                                        <TableCell className="font-medium text-slate-500">{index + 1}</TableCell>
                                        <TableCell className="font-medium flex items-center gap-2 text-blue-700">
                                            <FileText className="w-4 h-4" />
                                            {/* ✅ HIỂN THỊ TÊN TIẾNG VIỆT */}
                                            {DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}
                                        </TableCell>
                                        <TableCell>{doc.doc_code || "---"}</TableCell>
                                        <TableCell>{doc.issue_date ? formatDate(doc.issue_date) : "---"}</TableCell>
                                        <TableCell>{doc.issuing_authority || "---"}</TableCell>
                                        <TableCell className="text-center"><Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Đã lưu</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                {/* Nút In */}
                                                <LegalDocPrintDialog doc={doc} projectName={project.name} />

                                                {/* ✅ Nút Sửa (Mới) */}
                                                <EditLegalDocDialog doc={doc} onSuccess={() => router.refresh()} />

                                                {/* Nút Xóa */}
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteDoc(doc.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}