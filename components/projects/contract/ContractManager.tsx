"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ContractList from "./ContractList";
import { ContractForm } from "./contract-form";
import { useRouter } from "next/navigation";

interface ContractManagerProps {
    initialContracts: any[];
}

export default function ContractManager({ initialContracts }: ContractManagerProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedContract, setSelectedContract] = useState<any>(null);

    // --- STATE BỘ LỌC ---
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("active");
    const [filterType, setFilterType] = useState("all");

    // --- LOGIC LỌC DỮ LIỆU ---
    const filteredContracts = useMemo(() => {
        return initialContracts.filter((contract) => {
            // 1. Lọc theo từ khóa
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch =
                contract.contract_number?.toLowerCase().includes(searchLower) ||
                contract.title?.toLowerCase().includes(searchLower) ||
                contract.customers?.name?.toLowerCase().includes(searchLower);

            // 2. Lọc theo trạng thái
            let matchesStatus = true;
            if (filterStatus === "active") {
                matchesStatus = !["liquidated", "cancelled"].includes(contract.status);
            } else if (filterStatus !== "all") {
                matchesStatus = contract.status === filterStatus;
            }

            // 3. Lọc theo loại hợp đồng
            const matchesType = filterType === "all" || contract.contract_type === filterType;

            return matchesSearch && matchesStatus && matchesType;
        });
    }, [initialContracts, searchTerm, filterStatus, filterType]);

    // Các hàm xử lý hành động
    const handleCreate = () => {
        setSelectedContract(null);
        setIsOpen(true);
    };

    const handleViewDetail = (contract: any) => {
        setSelectedContract(contract);
        setIsOpen(true);
    };

    const handleSuccess = () => {
        setIsOpen(false);
        router.refresh();
    };

    const clearFilters = () => {
        setSearchTerm("");
        setFilterStatus("active");
        setFilterType("all");
    };

    return (
        <div className="space-y-6">
            {/* Header & Title - ✅ FIX: bg-white -> bg-card */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-4 rounded-lg border border-border shadow-sm">
                <div>
                    {/* ✅ FIX: text-slate-800 -> text-foreground */}
                    <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        Danh sách Hợp đồng & Pháp lý
                        {/* ✅ FIX: bg-slate-100 -> bg-muted, text-slate-600 -> text-muted-foreground */}
                        <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">
                            {filteredContracts.length}
                        </span>
                    </h2>
                    {/* ✅ FIX: text-slate-500 -> text-muted-foreground */}
                    <p className="text-sm text-muted-foreground">Quản lý toàn bộ hợp đồng thi công, thiết kế và phụ lục.</p>
                </div>
                <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700 shadow-sm whitespace-nowrap text-white">
                    <Plus className="w-4 h-4 mr-2" /> Soạn Hợp đồng
                </Button>
            </div>

            {/* --- THANH CÔNG CỤ LỌC --- */}
            {/* ✅ FIX: bg-slate-50 -> bg-muted/40 */}
            <div className="bg-muted/40 p-4 rounded-lg border border-border flex flex-col md:flex-row gap-4 items-end md:items-center">

                {/* 1. Tìm kiếm */}
                <div className="w-full md:w-1/3 relative">
                    {/* ✅ FIX: text-slate-400 -> text-muted-foreground */}
                    <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                    <Input
                        placeholder="Tìm số HĐ, tên khách hàng..."
                        // ✅ FIX: bg-white -> bg-background, border-slate-200 -> border-input
                        className="pl-9 bg-background border-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* 2. Lọc Trạng thái */}
                <div className="w-full md:w-1/5">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        {/* ✅ FIX: bg-white -> bg-background */}
                        <SelectTrigger className="bg-background border-input">
                            <SelectValue placeholder="Trạng thái" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="active">⚡ Đang thực hiện</SelectItem>
                            <SelectItem value="all">📂 Tất cả (Cả cũ)</SelectItem>
                            <SelectItem value="draft">📝 Dự thảo</SelectItem>
                            <SelectItem value="signed">✅ Đã ký</SelectItem>
                            <SelectItem value="liquidated">🏁 Đã thanh lý</SelectItem>
                            <SelectItem value="cancelled">❌ Đã hủy</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* 3. Lọc Loại Hợp đồng */}
                <div className="w-full md:w-1/5">
                    <Select value={filterType} onValueChange={setFilterType}>
                        {/* ✅ FIX: bg-white -> bg-background */}
                        <SelectTrigger className="bg-background border-input">
                            <SelectValue placeholder="Loại hợp đồng" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tất cả loại</SelectItem>
                            <SelectItem value="construction">🏗️ Thi công</SelectItem>
                            <SelectItem value="design">🎨 Thiết kế</SelectItem>
                            <SelectItem value="consulting">📋 Tư vấn</SelectItem>
                            <SelectItem value="supply">📦 Cung cấp VT</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Nút Xóa bộ lọc */}
                {(searchTerm || filterStatus !== 'active' || filterType !== 'all') && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={clearFilters}
                        // ✅ FIX: Hover colors for dark mode
                        className="text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Về mặc định"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                )}
            </div>

            {/* Danh sách Hợp đồng - ✅ FIX: bg-white -> bg-card */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-6 min-h-[500px]">
                {filteredContracts.length > 0 ? (
                    <ContractList
                        contracts={filteredContracts}
                        projectId=""
                        onViewDetail={handleViewDetail}
                    />
                ) : (
                    // ✅ FIX: text-slate-400 -> text-muted-foreground
                    <div className="text-center py-20 text-muted-foreground">
                        <Filter className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>Không tìm thấy hợp đồng nào.</p>
                        {filterStatus === 'active' && (
                            <Button variant="link" onClick={() => setFilterStatus('all')} className="mt-2 text-indigo-600 dark:text-indigo-400">
                                Xem hợp đồng cũ (Thanh lý/Hủy)
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Modal Form */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogTitle className="sr-only">
                        {selectedContract ? "Cập nhật Hợp đồng" : "Tạo Hợp đồng mới"}
                    </DialogTitle>

                    <ContractForm
                        initialData={selectedContract || {}}
                        projectId={selectedContract?.project_id || ""}
                        existingContracts={initialContracts}
                        onCancel={() => setIsOpen(false)}
                        onSuccess={handleSuccess}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}