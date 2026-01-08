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

interface CategoryOption {
    code: string;
    name: string;
}

interface Props {
    value?: string;
    onChange: (value: string) => void;
    categories: CategoryOption[];
    disabled?: boolean;
}

export function CategoryCombobox({ value, onChange, categories = [], disabled }: Props) {
    const [open, setOpen] = React.useState(false);

    // Debug: Log để xem dữ liệu có vào không
    // console.log("CategoryCombobox Data:", categories);

    const selectedCategory = categories.find((c) => c.code === value);

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            {/* modal={true} giúp fix lỗi focus trên Dialog */}

            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal bg-white"
                    disabled={disabled}
                >
                    {selectedCategory ? (
                        <span className="font-semibold text-slate-900">{selectedCategory.name}</span>
                    ) : (
                        <span className="text-muted-foreground">-- Chọn phân hệ --</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>

            <PopoverContent className="w-[400px] p-0 shadow-lg border-slate-200" align="start">
                <Command className="bg-white">
                    <CommandInput placeholder="Tìm theo tên phân hệ..." className="h-9" />

                    {/* 👇 Set chiều cao cứng và màu nền để tránh bị trắng trơn */}
                    <CommandList className="max-h-[300px] overflow-y-auto bg-white">
                        <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                            Không tìm thấy phân hệ nào.
                        </CommandEmpty>

                        <CommandGroup>
                            {categories.map((category, index) => (
                                <CommandItem
                                    // Kết hợp index để key luôn unique
                                    key={`${category.code}-${index}`}
                                    value={`${category.name} ${category.code}`}
                                    onSelect={() => {
                                        onChange(category.code);
                                        setOpen(false);
                                    }}
                                    className="cursor-pointer hover:bg-slate-100"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4 text-blue-600",
                                            value === category.code ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col">
                                        {/* 👇 Ép màu chữ đen */}
                                        <span className="font-medium text-slate-900">{category.name}</span>
                                        <span className="text-[10px] text-slate-500 font-mono">{category.code}</span>
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