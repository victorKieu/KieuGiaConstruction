"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PackageCheck, Loader2, UploadCloud, FileImage } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { createGoodsReceiptAction } from "@/lib/action/procurement";
// 👇 Import client supabase để upload file từ trình duyệt
import { createClient } from "@/lib/supabase/client";

export function GoodsReceiptDialog({ poId, poCode }: { poId: string; poCode: string }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [notes, setNotes] = useState("");
    const [file, setFile] = useState<File | null>(null);

    async function handleReceive() {
        setLoading(true);
        let imageUrl = "";

        // 1. Xử lý Upload ảnh (nếu có)
        if (file) {
            const supabase = createClient();
            const fileExt = file.name.split('.').pop();
            const fileName = `${poId}-${Date.now()}.${fileExt}`;
            const filePath = `receipts/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('procurement')
                .upload(filePath, file);

            if (uploadError) {
                toast.error("Lỗi upload ảnh: " + uploadError.message);
                setLoading(false);
                return;
            }

            // Lấy URL public
            const { data } = supabase.storage.from('procurement').getPublicUrl(filePath);
            imageUrl = data.publicUrl;
        }

        // 2. Gọi Server Action để lưu dữ liệu
        const res = await createGoodsReceiptAction(poId, notes, imageUrl);
        setLoading(false);

        if (res.success) {
            toast.success(res.message);
            setOpen(false);
            // Reset form
            setNotes("");
            setFile(null);
        } else {
            toast.error(res.error);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                    <PackageCheck className="mr-2 h-4 w-4" />
                    Nhập kho
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Nghiệm thu đơn hàng {poCode}</DialogTitle>
                    <DialogDescription>
                        Xác nhận số lượng và tải lên bằng chứng giao hàng (Phiếu giao hàng, hóa đơn...).
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Ghi chú nghiệm thu <span className="text-red-500">*</span></Label>
                        <Textarea
                            placeholder="VD: Đã nhận đủ hàng, chất lượng tốt..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Hình ảnh / Chứng từ đính kèm</Label>
                        <div className="flex items-center gap-4">
                            <Input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="cursor-pointer"
                            />
                        </div>
                        {file && (
                            <div className="text-sm text-green-600 flex items-center mt-1">
                                <FileImage className="mr-1 h-3 w-3" /> Đã chọn: {file.name}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Hủy bỏ</Button>
                    <Button onClick={handleReceive} disabled={loading || !notes} className="bg-green-600 hover:bg-green-700">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {loading ? "Đang xử lý..." : "Xác nhận & Lưu"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}