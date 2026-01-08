"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

// Định nghĩa kiểu dữ liệu khớp với bảng materials
interface Material {
    id: string;
    code: string;
    name: string;
    unit: string;
    group?: { name: string }; // Nếu có join với group
}

interface Props {
    value?: string; // Giá trị hiện tại (Mã Code)
    onChange: (material: Material) => void; // Trả về cả object để điền form
    materials: Material[];
    disabled?: boolean;
}

export function MaterialCombobox({ value, onChange, materials = [], disabled }: Props) {
    const [open, setOpen] = React.useState(false);

    // Tìm vật tư đang được chọn để hiển thị tên
    const selectedMaterial = materials.find((m) => m.code === value);

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal h-9 px-3"
                    disabled={disabled}
                >
                    {selectedMaterial ? (
                        <span className="truncate font-medium text-slate-900">
                            {selectedMaterial.name}
                        </span>
                    ) : (
                        <span className="text-muted-foreground">Chọn vật tư...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[450px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Tìm tên hoặc mã vật tư..." />
                    <CommandList className="max-h-[300px] overflow-y-auto">
                        <CommandEmpty>Không tìm thấy vật tư.</CommandEmpty>
                        <CommandGroup>
                            {materials.map((mat) => (
                                <CommandItem
                                    key={mat.id}
                                    // Value search kết hợp cả tên và mã để tìm kiếm linh hoạt
                                    value={`${mat.name} ${mat.code}`}
                                    onSelect={() => {
                                        onChange(mat); // Trả về object mat
                                        setOpen(false);
                                    }}
                                    className="cursor-pointer border-b last:border-0"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4 text-blue-600 shrink-0",
                                            value === mat.code ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col flex-1 overflow-hidden">
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium text-slate-900 truncate">{mat.name}</span>
                                            <span className="text-xs text-slate-500 font-mono bg-slate-100 px-1 rounded ml-2 shrink-0">{mat.unit}</span>
                                        </div>
                                        <div className="flex justify-between items-center mt-0.5">
                                            <span className="text-[10px] text-slate-500 font-mono">{mat.code}</span>
                                            {mat.group && <span className="text-[10px] text-slate-400 italic">{mat.group.name}</span>}
                                        </div>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}