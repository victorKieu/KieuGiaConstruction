"use client";

import { useState, useEffect, useCallback } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils/utils";

interface GeneratorProps {
    templates: any[];
    customer: any;
    contractData: {
        contract_number: string;
        value: number;
        signed_date: Date;
        start_date?: Date;
        end_date?: Date;
    };
    onContentGenerated: (content: string) => void;
}

export function ContractGenerator({ templates, customer, contractData, onContentGenerated }: GeneratorProps) {
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
    const [previewContent, setPreviewContent] = useState("");

    // 1. Dùng useCallback để ổn định hàm này, tránh bị tạo lại không cần thiết
    const generateContent = useCallback(() => {
        const template = templates.find(t => t.id === selectedTemplateId);
        if (!template) return;

        let text = template.content;

        // --- LOGIC ĐẠI DIỆN ---
        const benA_Ten = customer?.name || "...";
        let benA_DaiDien = "";

        if (customer?.type === 'business') {
            const nguoiDaiDien = customer.contact_person || "...";
            const chucVu = customer.title || "...";
            benA_DaiDien = `Đại diện bởi: Ông/Bà ${nguoiDaiDien} - Chức vụ: ${chucVu}`;
        } else {
            benA_DaiDien = `CMND/CCCD: ${customer?.tax_code || "..."}`;
        }

        // Mapping
        const replacements: Record<string, string> = {
            "{{MA_HOP_DONG}}": contractData.contract_number || "...",
            "{{TEN_KHACH_HANG}}": benA_Ten.toUpperCase(),
            "{{NGUOI_DAI_DIEN}}": benA_DaiDien,
            "{{MA_SO_THUE}}": customer?.tax_code || "...",
            "{{DIA_CHI_KH}}": customer?.address || "...",
            "{{SDT_KH}}": customer?.phone || "...",
            "{{TONG_GIA_TRI}}": formatCurrency(contractData.value),
            "{{NGAY_KY}}": formatDate(contractData.signed_date),
            "{{NGAY_BAT_DAU}}": contractData.start_date ? formatDate(contractData.start_date) : "...",
            "{{NGAY_KET_THUC}}": contractData.end_date ? formatDate(contractData.end_date) : "...",
        };

        Object.keys(replacements).forEach((key) => {
            text = text.replace(new RegExp(key, "g"), replacements[key]);
        });

        // 2. QUAN TRỌNG: Chỉ cập nhật nếu nội dung thực sự thay đổi
        // Điều này giúp cắt đứt vòng lặp vô tận
        if (text !== previewContent) {
            setPreviewContent(text);
            onContentGenerated(text);
        }
    }, [selectedTemplateId, templates, customer, contractData, previewContent, onContentGenerated]);

    // 3. useEffect thông minh hơn
    useEffect(() => {
        if (selectedTemplateId) {
            generateContent();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        selectedTemplateId,
        customer?.id,
        // Kỹ thuật so sánh sâu: Chỉ chạy lại khi GIÁ TRỊ thay đổi, không chạy khi OBJECT REFERENCE thay đổi
        JSON.stringify(contractData)
    ]);

    return (
        <div className="space-y-4 border p-4 rounded-md bg-muted/10">
            <div className="flex items-end gap-4">
                <div className="flex-1 space-y-2">
                    <Label>Chọn Mẫu Hợp Đồng</Label>
                    <Select onValueChange={setSelectedTemplateId}>
                        <SelectTrigger>
                            <SelectValue placeholder="-- Chọn loại hình thi công --" />
                        </SelectTrigger>
                        <SelectContent>
                            {templates.map((t) => (
                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button type="button" variant="secondary" onClick={() => {
                    // Khi bấm nút làm mới thủ công, ta bỏ qua check trùng lặp để ép render
                    const template = templates.find(t => t.id === selectedTemplateId);
                    if (template) setSelectedTemplateId(template.id);
                    // Hoặc đơn giản là gọi hàm generate nhưng bỏ qua check state
                    // Tuy nhiên cách đơn giản nhất là re-trigger useEffect bằng cách giả lập change
                }} title="Làm mới nội dung">
                    <RefreshCw className="h-4 w-4" />
                </Button>
            </div>

            <div className="space-y-2">
                <Label>Nội dung hợp đồng (Có thể chỉnh sửa)</Label>
                <Textarea
                    value={previewContent}
                    onChange={(e) => {
                        setPreviewContent(e.target.value);
                        // Khi user tự sửa tay, ta không muốn vòng lặp chạy lại, chỉ update form cha
                        onContentGenerated(e.target.value);
                    }}
                    className="min-h-[300px] font-mono text-sm bg-white"
                    placeholder="Nội dung sẽ hiển thị ở đây..."
                />
            </div>
        </div>
    );
}