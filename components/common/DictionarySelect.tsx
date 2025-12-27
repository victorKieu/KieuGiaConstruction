"use client";

import * as React from "react";
import { createSupabaseClient } from "@/lib/supabase/client"; // Đảm bảo đường dẫn đúng tới client-side supabase
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

// Định nghĩa kiểu dữ liệu trả về từ bảng sys_dictionaries
export interface DictionaryItem {
    id: string;
    code: string;
    name: string;
    meta_data?: any; // Dành cho các logic mở rộng sau này (prefix, lương, v.v.)
    color?: string;
}

interface DictionarySelectProps {
    category: string; // BẮT BUỘC: Key để filter (VD: 'CRM_CONTACT_TITLE', 'HRM_POSITION')

    // Props cho Form Control
    value?: string;
    onValueChange?: (value: string) => void;

    // UI Props
    placeholder?: string;
    label?: string; // (Optional) Nếu muốn render label ngay trong component
    disabled?: boolean;
    className?: string;

    // Filter nâng cao (Optional)
    excludeCodes?: string[]; // Nếu muốn loại bỏ 1 vài option cụ thể
}

export function DictionarySelect({
    category,
    value,
    onValueChange,
    placeholder = "Chọn giá trị",
    disabled = false,
    excludeCodes = [],
    className,
}: DictionarySelectProps) {
    const [items, setItems] = React.useState<DictionaryItem[]>([]);
    const [loading, setLoading] = React.useState(true);
    const supabase = createSupabaseClient();

    // Fetch dữ liệu khi component mount hoặc category thay đổi
    React.useEffect(() => {
        let isMounted = true;

        const fetchDictionary = async () => {
            setLoading(true);
            try {
                let query = supabase
                    .from("sys_dictionaries")
                    .select("id, code, name, meta_data, color")
                    .eq("category", category)
                    .eq("is_active", true) // Chỉ lấy cái đang hoạt động
                    .order("sort_order", { ascending: true }) // Ưu tiên sắp xếp theo thứ tự
                    .order("name", { ascending: true });      // Sau đó theo tên

                // Nếu có danh sách loại trừ
                if (excludeCodes.length > 0) {
                    query = query.not("code", "in", `(${excludeCodes.join(",")})`);
                }

                const { data, error } = await query;

                if (error) {
                    console.error(`Error fetching dictionary [${category}]:`, error);
                } else if (isMounted) {
                    setItems(data || []);
                }
            } catch (err) {
                console.error("System error:", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchDictionary();

        return () => {
            isMounted = false;
        };
    }, [category, JSON.stringify(excludeCodes)]); // Re-fetch nếu category hoặc excludeCodes thay đổi

    return (
        <Select value={value} onValueChange={onValueChange} disabled={disabled || loading}>
            <SelectTrigger className={className}>
                <SelectValue placeholder={loading ? "Đang tải..." : placeholder} />
            </SelectTrigger>
            <SelectContent>
                {loading ? (
                    <div className="flex items-center justify-center p-2 text-sm text-muted-foreground">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang tải dữ liệu...
                    </div>
                ) : items.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                        Không có dữ liệu
                    </div>
                ) : (
                    items.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                            {/* Hiển thị tên. Có thể custom thêm màu sắc badge ở đây nếu muốn */}
                            {item.name}
                        </SelectItem>
                    ))
                )}
            </SelectContent>
        </Select>
    );
}