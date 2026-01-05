"use client";

import { useState, useCallback, useEffect, Fragment } from "react"; // Thêm Fragment
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckSquare, Square, ChevronRight, ChevronDown, Loader2, Box } from "lucide-react";
//import QtoCreateModal from "../qto/QtoCreateModal";
//import QtoEditModal from "../qto/QtoEditModal";
//import QtoDeleteButton from "../qto/QtoDeleteButton";
import type { QtoItem, QtoTemplate } from "@/types/project";
import { getQtoItems } from "@/lib/action/qtoActions";

interface ProjectQtoTabProps {
    projectId: string;
    qtoItems: QtoItem[];
    qtoTemplates: QtoTemplate[];
}

export default function ProjectQtoTab({ projectId, qtoItems: initialQtoItems, qtoTemplates }: ProjectQtoTabProps) {
    const [qtoItems, setQtoItems] = useState(initialQtoItems);
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set()); // Quản lý dòng mở rộng
    const [isLoading, setIsLoading] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const triggerRefresh = useCallback(async () => {
        setIsLoading(true);
        const result = await getQtoItems(projectId);
        if (result.data) {
            setQtoItems(result.data as QtoItem[]);
        }
        setIsLoading(false);
        setRefreshKey(prev => prev + 1);
    }, [projectId]);

    // Hàm toggle mở rộng dòng
    const toggleExpand = (id: string) => {
        setExpandedItems(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold">Bóc tách Khối lượng & Thành phần</CardTitle>
                <QtoCreateModal
                    key={refreshKey} // <-- Thêm key (buộc remount)
                    projectId={projectId}
                    qtoTemplates={qtoTemplates}
                    onSuccess={triggerRefresh} // Hàm này sẽ cập nhật key
                />
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40px]"></TableHead>
                            <TableHead>Tên Công tác / Thành phần</TableHead>
                            <TableHead className="w-[100px]">Đơn vị</TableHead>
                            <TableHead className="w-[120px] text-right">Khối lượng</TableHead>
                            <TableHead className="w-[120px] text-center">Hành động</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && <TableRow><TableCell colSpan={5} className="text-center"><Loader2 className="animate-spin" /></TableCell></TableRow>}

                        {!isLoading && qtoItems.map(item => {
                            const isExpanded = expandedItems.has(item.id);
                            const hasComponents = item.components && item.components.length > 0;

                            return (
                                <Fragment key={item.id}>
                                    {/* DÒNG CHA (CÔNG TÁC) */}
                                    <TableRow className="bg-gray-50 font-medium">
                                        <TableCell>
                                            {hasComponents && (
                                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => toggleExpand(item.id)}>
                                                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                </Button>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span className="flex items-center gap-2">
                                                <Box className="h-4 w-4 text-blue-600" />
                                                {item.item_name}
                                            </span>
                                        </TableCell>
                                        <TableCell>{item.unit}</TableCell>
                                        <TableCell className="text-right font-bold text-blue-700">
                                            {item.quantity.toLocaleString('vi-VN')}
                                        </TableCell>
                                        <TableCell className="text-center p-2">
                                            <div className="flex justify-center space-x-1">
                                                <QtoEditModal item={item} projectId={projectId} onSuccess={triggerRefresh} />
                                                <QtoDeleteButton itemId={item.id} projectId={projectId} onSuccess={triggerRefresh} />
                                            </div>
                                        </TableCell>
                                    </TableRow>

                                    {/* CÁC DÒNG CON (THÀNH PHẦN HAO PHÍ) */}
                                    {isExpanded && item.components?.map((comp) => (
                                        <TableRow key={comp.id} className="hover:bg-white">
                                            <TableCell></TableCell>
                                            <TableCell className="pl-10 text-gray-600 text-sm">
                                                • {comp.material_name} <span className="text-xs text-gray-400">({comp.material_code})</span>
                                            </TableCell>
                                            <TableCell className="text-gray-600 text-sm">{comp.unit}</TableCell>
                                            <TableCell className="text-right text-gray-600 text-sm">
                                                {comp.quantity.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}
                                            </TableCell>
                                            <TableCell></TableCell>
                                        </TableRow>
                                    ))}
                                </Fragment>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}