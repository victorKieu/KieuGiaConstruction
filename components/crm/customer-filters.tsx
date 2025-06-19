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
                const { data, error } = await supabase.from("customer_tags").select("id, name").order("name");
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
        <div className="flex flex-col md:flex-row gap-2">
            <div className="flex-1 min-w-[120px]">
                <Label htmlFor="tag">Nhãn</Label>
                <Select
                    value={filter.tag}
                    onValueChange={(value) => onFilterChangeAction({ ...filter, tag: value })}
                    disabled={isLoading}
                >
                    <SelectTrigger id="tag">
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
            <div className="flex items-end gap-2">
                <Button onClick={handleSearch}>Lọc</Button>
                <Button variant="outline" onClick={handleReset}>
                    Đặt lại
                </Button>
            </div>
        </div>
    );
}
