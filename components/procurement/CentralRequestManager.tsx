"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ShoppingCart, Building2, Search, Filter } from "lucide-react";

interface Props {
    allRequests: any[];
}

export default function CentralRequestManager({ allRequests }: Props) {
    const router = useRouter();
    const [filterProject, setFilterProject] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");

    // 1. LỌC DỮ LIỆU
    const filteredRequests = useMemo(() => {
        return allRequests.filter(req => {
            const matchProject = filterProject === "all" || req.project?.id === filterProject;
            const codeMatch = req.code.toLowerCase().includes(searchTerm.toLowerCase());
            const projectMatch = req.project?.name.toLowerCase().includes(searchTerm.toLowerCase());
            return matchProject && (codeMatch || projectMatch);
        });
    }, [allRequests, filterProject, searchTerm]);

    const uniqueProjects = useMemo(() => {
        const map = new Map();
        allRequests.forEach(r => { if (r.project) map.set(r.project.id, r.project.name); });
        return Array.from(map.entries());
    }, [allRequests]);

    // 2. CHUYỂN HƯỚNG SANG TRANG TẠO PO CÓ SẴN
    const handleCreatePO = (reqId: string) => {
        // Chuyển sang trang orders/new và kèm theo requestId
        router.push(`/procurement/orders/new?requestId=${reqId}`);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 transition-colors">
            {/* TOOLBAR */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <div className="w-full md:w-[300px]">
                        <Label className="text-xs mb-1.5 block text-slate-500 dark:text-slate-400 font-medium transition-colors">Tìm kiếm</Label>
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 dark:text-slate-500 transition-colors" />
                            <Input
                                placeholder="Mã phiếu, tên dự án..."
                                className="pl-9 bg-slate-50 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 transition-colors"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="w-full md:w-[250px]">
                        <Label className="text-xs mb-1.5 block text-slate-500 dark:text-slate-400 font-medium transition-colors">Lọc theo Dự án</Label>
                        <Select value={filterProject} onValueChange={setFilterProject}>
                            <SelectTrigger className="bg-slate-50 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 transition-colors">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                                <SelectItem value="all" className="dark:text-slate-200">-- Tất cả dự án --</SelectItem>
                                {uniqueProjects.map(([id, name]) => (
                                    <SelectItem key={id} value={id} className="dark:text-slate-200">{name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* DANH SÁCH YÊU CẦU */}
            <Card className="border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-950 transition-colors">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-900 border-b-slate-100 dark:border-b-slate-800 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900">
                            <TableHead className="font-bold text-slate-700 dark:text-slate-300">Mã YC</TableHead>
                            <TableHead className="font-bold text-slate-700 dark:text-slate-300">Dự án</TableHead>
                            <TableHead className="font-bold text-slate-700 dark:text-slate-300">Ngày tạo</TableHead>
                            <TableHead className="font-bold text-slate-700 dark:text-slate-300">Người yêu cầu</TableHead>
                            <TableHead className="font-bold text-slate-700 dark:text-slate-300">Trạng thái</TableHead>
                            <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">Tác vụ</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100 dark:divide-slate-800 transition-colors">
                        {filteredRequests.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-10 text-slate-500 dark:text-slate-400 italic">
                                    Không có dữ liệu.
                                </TableCell>
                            </TableRow>
                        ) : filteredRequests.map((req) => (
                            <TableRow key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 border-none transition-colors">
                                <TableCell className="font-mono font-bold text-blue-600 dark:text-blue-400 transition-colors">{req.code}</TableCell>
                                <TableCell>
                                    <div className="font-semibold text-slate-700 dark:text-slate-200 text-sm transition-colors">{req.project?.name}</div>
                                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono transition-colors">{req.project?.code}</div>
                                </TableCell>
                                <TableCell className="text-slate-700 dark:text-slate-300">
                                    {new Date(req.created_at).toLocaleDateString('vi-VN')}
                                </TableCell>
                                <TableCell className="text-slate-700 dark:text-slate-300">
                                    {req.requester?.name || '---'}
                                </TableCell>
                                <TableCell>
                                    {req.status === 'processing' ? (
                                        <Badge variant="secondary" className="dark:bg-slate-800 dark:text-slate-300 border-none transition-colors">Đang xử lý</Badge>
                                    ) : (
                                        <Badge variant="default" className="bg-slate-900 dark:bg-slate-100 dark:text-slate-900 border-none transition-colors">Chờ đặt hàng</Badge>
                                    )}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" onClick={() => handleCreatePO(req.id)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-8 transition-colors">
                                        <ShoppingCart className="w-3.5 h-3.5 mr-1.5" /> Tạo PO
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}