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

    const selectedCategory = categories.find((c) => c.code === value);

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal bg-background dark:bg-slate-950 border-input dark:border-slate-800 transition-colors"
                    disabled={disabled}
                >
                    {selectedCategory ? (
                        <span className="font-semibold text-foreground">{selectedCategory.name}</span>
                    ) : (
                        <span className="text-muted-foreground">-- Chọn phân hệ --</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>

            <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-0 shadow-xl border-slate-200 dark:border-slate-800 dark:bg-slate-900 transition-colors"
                align="start"
            >
                <Command className="dark:bg-slate-900">
                    <CommandInput
                        placeholder="Tìm theo tên phân hệ..."
                        className="h-9 dark:text-slate-100"
                    />
                    <CommandList className="max-h-[300px] overflow-y-auto bg-popover dark:bg-slate-900 transition-colors">
                        <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                            Không tìm thấy phân hệ nào.
                        </CommandEmpty>

                        <CommandGroup>
                            {categories.map((category, index) => (
                                <CommandItem
                                    key={`${category.code}-${index}`}
                                    value={`${category.name} ${category.code}`}
                                    onSelect={() => {
                                        onChange(category.code);
                                        setOpen(false);
                                    }}
                                    className="cursor-pointer dark:text-slate-200 dark:hover:bg-slate-800 dark:aria-selected:bg-slate-800 transition-colors py-2"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4 text-blue-600 dark:text-blue-400",
                                            value === category.code ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="font-medium text-foreground truncate">
                                            {category.name}
                                        </span>
                                        <span className="text-[10px] text-slate-500 dark:text-slate-500 font-mono uppercase tracking-tight">
                                            {category.code}
                                        </span>
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