"use client";

import * as React from "react";
import { Check, Paintbrush } from "lucide-react";

import { cn } from "@/lib/utils/utils";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

// 1. Định nghĩa bảng màu chuẩn (Dựa theo Tailwind CSS Palette)
// Bạn có thể thêm/bớt màu tùy ý thích
export const PRESET_COLORS = [
    "#64748b", // Slate
    "#ef4444", // Red
    "#f97316", // Orange
    "#f59e0b", // Amber
    "#eab308", // Yellow
    "#84cc16", // Lime
    "#22c55e", // Green
    "#10b981", // Emerald
    "#14b8a6", // Teal
    "#06b6d4", // Cyan
    "#0ea5e9", // Sky
    "#3b82f6", // Blue
    "#6366f1", // Indigo
    "#8b5cf6", // Violet
    "#a855f7", // Purple
    "#d946ef", // Fuchsia
    "#ec4899", // Pink
    "#f43f5e", // Rose
];

interface ColorPickerProps {
    value?: string;
    onChange: (value: string) => void;
    className?: string;
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
    const [open, setOpen] = React.useState(false);

    // Nếu chưa có value thì dùng mặc định (ví dụ màu xám)
    const activeColor = value || "#64748b";

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "w-full justify-start text-left font-normal px-3",
                        !value && "text-muted-foreground",
                        className
                    )}
                >
                    <div className="w-full flex items-center gap-2">
                        {/* Hiển thị ô màu demo */}
                        {value ? (
                            <div
                                className="h-4 w-4 rounded-full border border-slate-200 shadow-sm"
                                style={{ backgroundColor: value }}
                            />
                        ) : (
                            <Paintbrush className="h-4 w-4" />
                        )}

                        {/* Hiển thị mã màu text */}
                        <span className="truncate flex-1">
                            {value ? value : "Chọn màu..."}
                        </span>
                    </div>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3">
                <div className="space-y-3">
                    <h4 className="font-medium leading-none text-sm text-slate-500">Bảng màu hệ thống</h4>

                    {/* Grid màu */}
                    <div className="grid grid-cols-5 gap-2">
                        {PRESET_COLORS.map((color) => (
                            <button
                                key={color}
                                className={cn(
                                    "h-8 w-8 rounded-full border border-slate-200 cursor-pointer flex items-center justify-center transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-400",
                                    color === value && "ring-2 ring-offset-1 ring-slate-900 border-transparent"
                                )}
                                style={{ backgroundColor: color }}
                                onClick={() => {
                                    onChange(color);
                                    setOpen(false); // Đóng popover sau khi chọn
                                }}
                                type="button" // Quan trọng để không submit form
                            >
                                {color === value && (
                                    <Check className="h-4 w-4 text-white drop-shadow-md" strokeWidth={3} />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* (Optional) Nếu muốn cho nhập mã màu tùy chỉnh thì mở comment này */}
                    {/* <div className="flex items-center gap-2 border-t pt-3 mt-3">
              <span className="text-xs text-muted-foreground">Custom:</span>
              <Input 
                className="h-8 text-xs" 
                placeholder="#000000" 
                value={value} 
                onChange={(e) => onChange(e.target.value)}
              />
          </div> */}
                </div>
            </PopoverContent>
        </Popover>
    );
}