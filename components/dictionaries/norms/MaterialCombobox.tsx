"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
// Nhớ import hàm gọi API của anh vào đây, ví dụ:
// import { searchMaterialsFromDB } from "@/lib/action/materialActions";

interface Material {
    id: string;
    code: string;
    name: string;
    unit: string;
    group?: { name: string };
}

interface Props {
    value?: string;
    onChange: (material: Material) => void;
    // Bỏ prop materials tĩnh đi, thay bằng hàm fetch
    fetchMaterials?: (query: string) => Promise<Material[]>;
    disabled?: boolean;
    defaultLabel?: string; // Dùng để hiển thị tên khi chưa bật popover
}

export function MaterialCombobox({ value, onChange, fetchMaterials, disabled, defaultLabel }: Props) {
    const [open, setOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [results, setResults] = React.useState<Material[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);

    // Xử lý gọi API khi gõ chữ (có chống dội - debounce)
    React.useEffect(() => {
        if (!open || !fetchMaterials) return;

        const timer = setTimeout(async () => {
            setIsLoading(true);
            try {
                // Gọi API xuống DB truyền vào searchQuery
                const data = await fetchMaterials(searchQuery);
                setResults(data || []);
            } catch (error) {
                console.error("Lỗi tìm kiếm vật tư:", error);
                setResults([]);
            } finally {
                setIsLoading(false);
            }
        }, 300); // Đợi 300ms sau khi người dùng ngừng gõ mới gọi API

        return () => clearTimeout(timer);
    }, [searchQuery, open, fetchMaterials]);

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal h-9 px-3 dark:bg-slate-950 dark:border-slate-800 dark:hover:bg-slate-900"
                    disabled={disabled}
                >
                    {value ? (
                        <span className="truncate font-medium text-slate-900 dark:text-slate-100">
                            {defaultLabel || value}
                        </span>
                    ) : (
                        <span className="text-muted-foreground">Chọn vật tư...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[450px] p-0 dark:bg-slate-950 dark:border-slate-800" align="start">
                <Command shouldFilter={false}>
                    <div className="relative">
                        <CommandInput
                            placeholder="Gõ mã hoặc tên để tìm dưới Database..."
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                        />
                        {isLoading && (
                            <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-blue-500" />
                        )}
                    </div>

                    <CommandList className="max-h-[300px] overflow-y-auto">
                        {!isLoading && results.length === 0 && (
                            <div className="py-6 text-center text-sm dark:text-slate-400">
                                {searchQuery.trim() === "" ? "Gõ để tìm kiếm..." : "Không tìm thấy vật tư."}
                            </div>
                        )}

                        {!isLoading && results.length > 0 && (
                            <CommandGroup>
                                {results.map((mat) => (
                                    <CommandItem
                                        key={mat.id}
                                        value={mat.code}
                                        onSelect={() => {
                                            onChange(mat);
                                            setOpen(false);
                                        }}
                                        className="cursor-pointer border-b last:border-0 dark:border-slate-800 aria-selected:bg-slate-100 dark:aria-selected:bg-slate-800"
                                    >
                                        <Check className={cn("mr-2 h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0", value === mat.code ? "opacity-100" : "opacity-0")} />
                                        <div className="flex flex-col flex-1 overflow-hidden">
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium text-slate-900 dark:text-slate-200 truncate">{mat.name}</span>
                                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded ml-2 shrink-0">{mat.unit}</span>
                                            </div>
                                            <div className="flex justify-between items-center mt-0.5">
                                                <span className="text-[10px] text-slate-500 dark:text-slate-500 font-mono">{mat.code}</span>
                                                {mat.group && <span className="text-[10px] text-slate-400 dark:text-slate-600 italic">{mat.group.name}</span>}
                                            </div>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}