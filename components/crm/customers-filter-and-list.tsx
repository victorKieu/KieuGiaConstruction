"use client";

import { useState } from "react";
import { CustomersList } from "@/components/crm/customers-list";
import { CustomerFilters } from "@/components/crm/customer-filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

type StatusType = "all" | "active" | "inactive" | "lead";
type TagType = "all" | string;

interface FilterType {
    search: string;
    status: StatusType;
    tag: TagType;
}

export function CustomersFilterAndList() {
    const [filter, setFilter] = useState<FilterType>({
        search: "",
        status: "all",
        tag: "all",
    });

    return (
        <div>
            {/* Filter Row */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 w-full">
                {/* Tabs */}
                <Tabs value={filter.status} onValueChange={(status) => setFilter(f => ({ ...f, status: status as StatusType }))}>
                    <TabsList>
                        <TabsTrigger value="all">Tất cả</TabsTrigger>
                        <TabsTrigger value="active">Đang hoạt động</TabsTrigger>
                        <TabsTrigger value="inactive">Không hoạt động</TabsTrigger>
                        <TabsTrigger value="lead">Tiềm năng</TabsTrigger>
                    </TabsList>
                </Tabs>
                {/* Search Box */}
                <div className="relative w-full md:max-w-xs">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Tìm kiếm khách hàng..."
                        className="w-full pl-8"
                        value={filter.search}
                        onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
                    />
                </div>
                {/* Customer Filters */}
                <div className="w-full md:max-w-[400px]">
                    <CustomerFilters filter={filter} onFilterChangeAction={setFilter} />
                </div>
                {/* Add Customer Button */}
                <Button asChild className="whitespace-nowrap h-10">
                    <Link href="/crm/customers/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Thêm khách hàng
                    </Link>
                </Button>
            </div>
            {/* Danh sách khách hàng */}
            <CustomersList filters={filter} />
        </div>
    );
}
