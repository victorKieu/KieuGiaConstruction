"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import supabase from "@/lib/supabase/client";

type StatusType = "all" | "active" | "inactive" | "lead";
type TagType = "all" | string;

interface FilterType {
    search: string;
    status: StatusType;
    tag: TagType;
}

interface CustomerTag {
    id: string;
    name: string;
}

interface CustomerFiltersProps {
    filter: FilterType;
    onFilterChangeAction: (newFilter: FilterType) => void;
}

export function CustomerFilters({ filter, onFilterChangeAction }: CustomerFiltersProps) {
    const [tags, setTags] = useState<CustomerTag[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchTags() {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from("customer_tags")
                    .select("id, name")
                    .order("name");

                if (error) throw error;
                setTags(data || []);
            } catch (error) {
                console.error("Error fetching customer tags:", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchTags();
    }, []);

    const handleSearch = () => {
        onFilterChangeAction(filter);
    };

    const handleReset = () => {
        onFilterChangeAction({
            search: "",
            status: "all",
            tag: "all",
        });
    };

    return (
        <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 min-w-[200px] space-y-2">
                <Label htmlFor="tag" className="text-foreground">Nhãn khách hàng</Label>
                <Select
                    value={filter.tag}
                    onValueChange={(value) => onFilterChangeAction({ ...filter, tag: value })}
                    disabled={isLoading}
                >
                    {/* ✅ FIX: bg-background để tránh trong suốt trong Dark Mode */}
                    <SelectTrigger id="tag" className="w-full bg-background border-input text-foreground">
                        <SelectValue placeholder="Chọn nhãn" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả nhãn</SelectItem>
                        {tags.map((tag) => (
                            <SelectItem key={tag.id} value={tag.id}>
                                {tag.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex items-center gap-2">
                <Button
                    onClick={handleSearch}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                    Lọc
                </Button>
                <Button
                    variant="outline"
                    onClick={handleReset}
                    className="bg-background hover:bg-accent hover:text-accent-foreground border-input"
                >
                    Đặt lại
                </Button>
            </div>
        </div>
    );
}