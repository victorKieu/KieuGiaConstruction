"use client";

// --- PHẦN FIX: Thêm useTransition ---
import { useState, useRef, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createQtoItem } from "@/lib/action/qtoActions";
// --- PHẦN FIX: Bỏ useActionState, useFormStatus ---
import { AlertCircle, Loader2, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ActionResponse } from "@/lib/action/projectActions";
import type { QtoTemplate } from "@/types/project";
import { Textarea } from "@/components/ui/textarea";

interface QtoCreateModalProps {
    projectId: string;
    qtoTemplates: QtoTemplate[];
    onSuccess: () => void;
}

// (Component Input Tham số 'ParamInput' giữ nguyên - File 281)
const ParamInput = ({ name, label }: { name: string, label: string }) => (
    <div className="space-y-1">
        <Label htmlFor={name} className="text-xs">{label}</Label>
        <Input id={name} name={name} type="number" step="0.01" placeholder={label} className="h-8" required />
    </div>
);

export default function QtoCreateModal({ projectId, qtoTemplates, onSuccess }: QtoCreateModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    // --- PHẦN FIX: Chuyển sang useTransition + useState ---
    const [isPending, startTransition] = useTransition();
    const [state, setState] = useState<ActionResponse>({ success: false });
    // --- KẾT THÚC FIX ---

    const [selectedTemplateCode, setSelectedTemplateCode] = useState<string>('manual');
    const [selectedTemplate, setSelectedTemplate] = useState<QtoTemplate | null>(null);
    const isManual = selectedTemplateCode === 'manual';

    // (useEffect xử lý success giữ nguyên)
    useEffect(() => {
        if (state.success) {
            // Khi thành công, chỉ cần đóng modal VÀ gọi refresh
            setIsOpen(false);
            // Các bước reset (formRef.current?.reset(), setSelectedTemplateCode...)
            // đã được xử lý TỰ ĐỘNG bởi cơ chế 'key={refreshKey}' (buộc remount)
            onSuccess();
        }
    }, [state.success, isOpen, onSuccess]);

    // (handleTemplateChange giữ nguyên)
    const handleTemplateChange = (templateCode: string) => {
        setSelectedTemplateCode(templateCode);
        if (templateCode === 'manual') {
            setSelectedTemplate(null);
        } else {
            const template = qtoTemplates.find(t => t.code === templateCode) || null;
            setSelectedTemplate(template);
        }
    };

    // --- PHẦN FIX: Tạo hàm handleSubmit ---
    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setState({ success: false, error: undefined }); // Reset state lỗi

        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
            const result = await createQtoItem(formData); // Gọi Action (đã bỏ prevState)
            setState(result); // Cập nhật state (lỗi hoặc thành công)
        });
    };
    // --- KẾT THÚC FIX ---

    // (hàm renderDynamicParams giữ nguyên)
    const renderDynamicParams = () => {
        if (!selectedTemplateCode || isManual) {
            // Chế độ Thủ công
            return (
                <>
                    <div className="space-y-1">
                        <Label htmlFor="item_name">Tên công tác</Label>
                        <Input id="item_name" name="item_name" required />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="quantity">Khối lượng</Label>
                            <Input id="quantity" name="quantity" type="number" defaultValue={1} required />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="unit">Đơn vị</Label>
                            <Input id="unit" name="unit" required />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="unit_price">Đơn giá</Label>
                            <Input id="unit_price" name="unit_price" type="number" defaultValue={0} />
                        </div>
                    </div>
                </>
            );
        }

        // Chế độ Bán Tự Động
        const code = selectedTemplateCode;
        return (
            <div className="p-3 bg-gray-50 border rounded-md">
                <p className="text-sm font-semibold mb-2">Nhập tham số cho: {selectedTemplate?.name}</p>
                <div className="grid grid-cols-3 gap-2">
                    <ParamInput name="param_N" label="Số lượng (N)" />
                    {(code.includes('MONG') || code.includes('COT') || code.includes('DAM') || code.includes('DAO_DAT')) && (
                        <>
                            <ParamInput name="param_L" label="Dài (L)" />
                            <ParamInput name="param_W" label="Rộng (W)" />
                            <ParamInput name="param_H" label="Cao/Sâu (H)" />
                        </>
                    )}
                    {(code.includes('BT_DAM') || code.includes('VK_DAM') || code.includes('BT_SAN') || code.includes('VK_SAN')) && (
                        <ParamInput name="param_T" label="Dày Sàn (T)" />
                    )}
                    {!(code.includes('MONG') || code.includes('COT') || code.includes('DAM') || code.includes('DAO_DAT') || code.includes('SAN')) && (
                        <ParamInput name="quantity" label="Khối lượng (mặc định)" />
                    )}
                </div>
            </div>
        );
    };

    // Hàm reset form khi mở/đóng Modal (RẤT QUAN TRỌNG)
    const onOpenChange = (open: boolean) => {
        if (!open) {
            // Khi đóng modal, reset mọi thứ
            formRef.current?.reset();
            setState({ success: false });
            setSelectedTemplateCode('manual');
            setSelectedTemplate(null);
        }
        setIsOpen(open);
    };

    return (
        // --- PHẦN FIX: Dùng onOpenChange ---
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Thêm Công tác
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Thêm Công tác QTO</DialogTitle>
                </DialogHeader>

                {/* --- PHẦN FIX: Dùng onSubmit thay vì action --- */}
                <form ref={formRef} onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <input type="hidden" name="projectId" value={projectId} />

                    {/* 1. Chọn Mẫu (Bán tự động) hoặc Thủ công */}
                    <div className="space-y-1">
                        <Label htmlFor="template_code">Phương thức</Label>
                        <Select name="template_code" defaultValue="manual" onValueChange={handleTemplateChange} required>
                            <SelectTrigger>
                                <SelectValue placeholder="Chọn từ Mẫu..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="manual" className="font-bold text-blue-600">
                                    -- Nhập Thủ công --
                                </SelectItem>
                                {qtoTemplates.map((template) => (
                                    <SelectItem key={template.id} value={template.code}>
                                        {template.code} - {template.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* 2. Render các ô nhập động */}
                    {renderDynamicParams()}

                    {/* 3. Các trường chung (Phân loại, Ghi chú) */}
                    <div className="space-y-1">
                        <Label htmlFor="item_type">Phân loại (Chi phí)</Label>
                        <Select name="item_type"
                            key={selectedTemplateCode} // <-- Thêm key để reset
                            defaultValue={isManual ? 'material' : selectedTemplate?.type || 'material'}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Chọn loại chi phí" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="material">Vật liệu</SelectItem>
                                <SelectItem value="labor">Nhân công</SelectItem>
                                <SelectItem value="equipment">Thiết bị</SelectItem>
                                <SelectItem value="subcontractor">Thầu phụ</SelectItem>
                                <SelectItem value="other">Khác</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="notes">Ghi chú</Label>
                        <Textarea id="notes" name="notes" rows={2} />
                    </div>

                    {state.error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{state.error}</AlertDescription>
                        </Alert>
                    )}

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline">Hủy</Button>
                        </DialogClose>
                        {/* --- PHẦN FIX: Dùng isPending --- */}
                        <Button type="submit" disabled={isPending}>
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Lưu Công tác"}
                        </Button>
                        {/* --- KẾT THÚC FIX --- */}
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}