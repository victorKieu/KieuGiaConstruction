"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch"; // Cần component Switch
import {
    FileText, Save, Plus, MapPin, Building2,
    CheckCircle, AlertTriangle, Loader2, Trash2, Info
} from "lucide-react";
import { toast } from "sonner";
import { updateProjectLegalInfo, deleteLegalDoc } from "@/lib/action/legal-actions";
import { ProjectData, LegalDoc } from "@/types/project";
import { formatDate } from "@/lib/utils/utils";

interface ProjectLegalTabProps {
    project: ProjectData;
    docs: LegalDoc[];
}

export default function ProjectLegalTab({ project, docs }: ProjectLegalTabProps) {
    const [loading, setLoading] = useState(false);

    // State quản lý Form thông tin
    const [info, setInfo] = useState({
        land_lot_number: project.land_lot_number || "",
        land_parcel_number: project.land_parcel_number || "",
        construction_permit_code: project.construction_permit_code || "",
        permit_issue_date: project.permit_issue_date ? project.permit_issue_date.split('T')[0] : "",
        total_floor_area: project.total_floor_area || 0,
        num_floors: project.num_floors || 0,
        construction_phase: project.construction_phase || 'legal',
        // Mặc định là TRUE nếu DB null
        is_permit_required: project.is_permit_required ?? true
    });

    // Hàm lưu thông tin chính
    const handleSaveInfo = async () => {
        setLoading(true);
        const res = await updateProjectLegalInfo(project.id, info);
        if (res.success) {
            toast.success("Đã cập nhật thông tin pháp lý thành công!");
        } else {
            toast.error("Lỗi cập nhật: " + res.error);
        }
        setLoading(false);
    };

    // Hàm xóa hồ sơ
    const handleDeleteDoc = async (id: string) => {
        if (!confirm("Bạn có chắc muốn xóa hồ sơ này?")) return;
        const res = await deleteLegalDoc(id, project.id);
        if (res.success) toast.success("Đã xóa hồ sơ");
    }

    // LOGIC HIỂN THỊ TRẠNG THÁI
    const renderStatusAlert = () => {
        // Trường hợp 1: Không cần xin phép (Sửa chữa nhỏ)
        if (!info.is_permit_required) {
            return (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg flex items-start gap-3 shadow-sm">
                    <Info className="w-6 h-6 text-blue-600 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-base">Dự án được miễn/Không yêu cầu GPXD</h4>
                        <p className="text-sm mt-1">
                            Dự án này thuộc diện sửa chữa, cải tạo hoặc công trình được miễn giấy phép xây dựng theo quy định.
                            Chỉ cần đảm bảo an toàn lao động và vệ sinh môi trường.
                        </p>
                    </div>
                </div>
            );
        }

        // Trường hợp 2: Cần xin phép nhưng chưa có
        if (!info.construction_permit_code) {
            return (
                <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg flex items-start gap-3 shadow-sm">
                    <AlertTriangle className="w-6 h-6 text-red-600 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-base">CẢNH BÁO: Chưa có Giấy phép xây dựng!</h4>
                        <p className="text-sm mt-1">
                            Dự án này được đánh dấu là <b>Bắt buộc phải có GPXD</b>.
                            Hiện tại chưa nhập số GPXD. Việc thi công có thể gặp rủi ro pháp lý.
                        </p>
                    </div>
                </div>
            );
        }

        // Trường hợp 3: Đã có GPXD
        return (
            <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg flex items-start gap-3 shadow-sm">
                <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
                <div>
                    <h4 className="font-bold text-base">Pháp lý khởi công: Đủ điều kiện</h4>
                    <p className="text-sm mt-1">
                        Đã cập nhật GPXD số <b>{info.construction_permit_code}</b>.
                        <br />Lưu ý: Cần nộp <b>Thông báo khởi công</b> lên UBND Phường/Xã trước khi ép cọc 07 ngày.
                    </p>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* 1. THANH ĐIỀU KHIỂN LOẠI DỰ ÁN */}
            <div className="flex items-center justify-between bg-white p-4 border rounded-lg shadow-sm">
                <div className="space-y-0.5">
                    <Label className="text-base font-bold">Yêu cầu Giấy phép Xây dựng</Label>
                    <p className="text-sm text-slate-500">
                        Bật nếu đây là công trình xây mới hoặc sửa chữa lớn cần xin phép.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${info.is_permit_required ? 'text-blue-600' : 'text-slate-400'}`}>
                        {info.is_permit_required ? "BẮT BUỘC" : "KHÔNG CẦN"}
                    </span>
                    <Switch
                        checked={info.is_permit_required}
                        onCheckedChange={(checked) => setInfo({ ...info, is_permit_required: checked })}
                    />
                </div>
            </div>

            {/* 2. HIỂN THỊ TRẠNG THÁI (DYNAMIC) */}
            {renderStatusAlert()}

            {/* 3. FORM NHẬP LIỆU THÔNG TIN */}
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-opacity duration-300 ${!info.is_permit_required ? 'opacity-80' : ''}`}>

                {/* Cột Trái: Thông tin Đất đai */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-3 border-b bg-slate-50/50">
                        <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                            <MapPin className="w-4 h-4 text-blue-600" /> Vị trí & Đất đai
                        </CardTitle>
                        <CardDescription>Thông tin trên Sổ đỏ / Giấy chứng nhận QSDĐ</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase">Số tờ bản đồ</Label>
                                <Input
                                    value={info.land_lot_number}
                                    onChange={e => setInfo({ ...info, land_lot_number: e.target.value })}
                                    placeholder="VD: 15"
                                    className="font-semibold"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase">Số thửa đất</Label>
                                <Input
                                    value={info.land_parcel_number}
                                    onChange={e => setInfo({ ...info, land_parcel_number: e.target.value })}
                                    placeholder="VD: 502"
                                    className="font-semibold"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase">Địa chỉ thực tế</Label>
                            <Input value={project.address || ""} disabled className="bg-slate-100 text-slate-600" />
                        </div>
                    </CardContent>
                </Card>

                {/* Cột Phải: Thông tin Cấp phép */}
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-3 border-b bg-slate-50/50">
                        <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                            <Building2 className="w-4 h-4 text-orange-600" /> Thông số Cấp phép xây dựng
                        </CardTitle>
                        <CardDescription>
                            {info.is_permit_required
                                ? "Dữ liệu bắt buộc để đối chiếu Hoàn công"
                                : "Có thể bỏ trống nếu không xin phép"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 col-span-2 md:col-span-1">
                                <Label className="text-xs font-bold text-slate-500 uppercase">Số Giấy phép XD</Label>
                                <Input
                                    value={info.construction_permit_code}
                                    onChange={e => setInfo({ ...info, construction_permit_code: e.target.value })}
                                    placeholder={info.is_permit_required ? "VD: 123/GPXD-UBND" : "Không yêu cầu"}
                                    className={`font-bold ${info.is_permit_required && !info.construction_permit_code ? 'border-red-300 ring-red-100' : 'text-blue-700'}`}
                                    disabled={!info.is_permit_required}
                                />
                            </div>
                            <div className="space-y-2 col-span-2 md:col-span-1">
                                <Label className="text-xs font-bold text-slate-500 uppercase">Ngày cấp</Label>
                                <Input
                                    type="date"
                                    value={info.permit_issue_date}
                                    onChange={e => setInfo({ ...info, permit_issue_date: e.target.value })}
                                    disabled={!info.is_permit_required}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase">Số tầng</Label>
                                <Input
                                    type="number"
                                    value={info.num_floors}
                                    onChange={e => setInfo({ ...info, num_floors: parseInt(e.target.value) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase">Tổng diện tích sàn (m2)</Label>
                                <Input
                                    type="number"
                                    value={info.total_floor_area}
                                    onChange={e => setInfo({ ...info, total_floor_area: parseFloat(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <Button onClick={handleSaveInfo} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Lưu thông tin Pháp lý
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 3. DANH SÁCH HỒ SƠ LƯU TRỮ */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 py-4">
                    <div>
                        <CardTitle className="text-base text-slate-800">Hồ sơ lưu trữ (Scan)</CardTitle>
                        <CardDescription>Lưu trữ bản scan: GPXD, Bản vẽ xin phép, Thông báo khởi công...</CardDescription>
                    </div>
                    {/* Nút thêm hồ sơ sẽ làm sau (kết hợp upload file) */}
                    <Button variant="outline" size="sm" disabled title="Tính năng Upload đang phát triển">
                        <Plus className="w-4 h-4 mr-2" /> Thêm hồ sơ
                    </Button>
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
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {docs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-slate-500 py-8 italic">
                                        Chưa có hồ sơ nào được tải lên.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                docs.map((doc, index) => (
                                    <TableRow key={doc.id} className="hover:bg-slate-50">
                                        <TableCell className="font-medium text-slate-500">{index + 1}</TableCell>
                                        <TableCell className="font-medium flex items-center gap-2 text-blue-700">
                                            <FileText className="w-4 h-4" /> {doc.doc_type}
                                        </TableCell>
                                        <TableCell>{doc.doc_code || "---"}</TableCell>
                                        <TableCell>{formatDate(doc.issue_date)}</TableCell>
                                        <TableCell>{doc.issuing_authority || "---"}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Đã lưu</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteDoc(doc.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
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