"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
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
import { formatCategoryCode } from "@/lib/constants/dictionary";

interface CategoryComboboxProps {
    value: string;
    onChange: (value: string) => void;
    existingCategories: string[]; // Danh sách category đã có
    disabled?: boolean;
}

export function CategoryCombobox({
    value,
    onChange,
    existingCategories,
    disabled,
}: CategoryComboboxProps) {
    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState("");

    // Logic xử lý khi người dùng chọn hoặc tạo mới
    const handleSelect = (currentValue: string) => {
        onChange(currentValue);
        setOpen(false);
    };

    // Logic xử lý khi người dùng gõ text để tạo mới
    const handleCreateNew = () => {
        const formatted = formatCategoryCode(inputValue);
        if (formatted) {
            onChange(formatted);
            setOpen(false);
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                    disabled={disabled}
                >
                    {value ? value : "Chọn hoặc nhập phân hệ mới..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                    <CommandInput
                        placeholder="Tìm kiếm hoặc tạo mới..."
                        onValueChange={(val) => setInputValue(val)}
                    />
                    <CommandList>
                        <CommandEmpty className="py-2 px-2">
                            {/* Nếu không tìm thấy, hiển thị nút tạo mới */}
                            <div className="text-sm text-gray-500 mb-2">Không tìm thấy "{inputValue}"</div>
                            <Button
                                variant="secondary"
                                className="w-full justify-start text-xs h-8"
                                onClick={handleCreateNew}
                            >
                                <Plus className="mr-2 h-3 w-3" />
                                Tạo mới: <span className="font-bold ml-1">{formatCategoryCode(inputValue)}</span>
                            </Button>
                        </CommandEmpty>

                        <CommandGroup heading="Danh mục có sẵn">
                            {existingCategories.map((cat) => (
                                <CommandItem
                                    key={cat}
                                    value={cat}
                                    onSelect={(currentValue) => handleSelect(currentValue)}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === cat ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {cat}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}