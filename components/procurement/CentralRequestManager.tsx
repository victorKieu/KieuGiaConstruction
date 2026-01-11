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
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* TOOLBAR */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center bg-white p-4 rounded-xl border shadow-sm">
                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <div className="w-full md:w-[300px]">
                        <Label className="text-xs mb-1.5 block text-slate-500 font-medium">Tìm kiếm</Label>
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                            <Input
                                placeholder="Mã phiếu, tên dự án..."
                                className="pl-9 bg-slate-50"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="w-full md:w-[250px]">
                        <Label className="text-xs mb-1.5 block text-slate-500 font-medium">Lọc theo Dự án</Label>
                        <Select value={filterProject} onValueChange={setFilterProject}>
                            <SelectTrigger className="bg-slate-50"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">-- Tất cả dự án --</SelectItem>
                                {uniqueProjects.map(([id, name]) => (
                                    <SelectItem key={id} value={id}>{name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* DANH SÁCH YÊU CẦU */}
            <Card className="border-none shadow-sm overflow-hidden bg-white">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50 border-b-slate-100">
                            <TableHead>Mã YC</TableHead>
                            <TableHead>Dự án</TableHead>
                            <TableHead>Ngày tạo</TableHead>
                            <TableHead>Người yêu cầu</TableHead>
                            <TableHead>Trạng thái</TableHead>
                            <TableHead className="text-right">Tác vụ</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredRequests.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center py-10 text-slate-500">Không có dữ liệu.</TableCell></TableRow>
                        ) : filteredRequests.map((req) => (
                            <TableRow key={req.id} className="hover:bg-slate-50">
                                <TableCell className="font-mono font-bold text-blue-600">{req.code}</TableCell>
                                <TableCell>
                                    <div className="font-semibold text-slate-700 text-sm">{req.project?.name}</div>
                                    <div className="text-[10px] text-slate-400 font-mono">{req.project?.code}</div>
                                </TableCell>
                                <TableCell>{new Date(req.created_at).toLocaleDateString('vi-VN')}</TableCell>
                                <TableCell>{req.requester?.name || '---'}</TableCell>
                                <TableCell>
                                    <Badge variant={req.status === 'processing' ? 'secondary' : 'default'}>
                                        {req.status === 'processing' ? 'Đang xử lý' : 'Chờ đặt hàng'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button size="sm" onClick={() => handleCreatePO(req.id)} className="bg-blue-600 hover:bg-blue-700 h-8">
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