"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UploadCloud, FileSpreadsheet, Trash2, MapPin } from "lucide-react";
import { toast } from "sonner";

export interface RTKPoint {
    pointId: string;
    x: string; // Easting
    y: string; // Northing
    z: string; // Elevation
    code: string; // Description
}

interface RTKDataUploaderProps {
    data: RTKPoint[];
    onChange: (data: RTKPoint[]) => void;
}

export function RTKDataUploader({ data, onChange }: RTKDataUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Hàm phân tích file CSV/TXT cơ bản
    const parseFile = async (file: File) => {
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim() !== '');

        if (lines.length === 0) {
            toast.error("File trống!");
            return;
        }

        // Tự động nhận diện dấu phân cách (Tab, Phẩy, hoặc Khoảng trắng)
        const sampleLine = lines[0];
        const separator = sampleLine.includes('\t') ? '\t' : (sampleLine.includes(',') ? ',' : ' ');

        const parsedPoints: RTKPoint[] = [];
        let startIndex = 0;

        // Kiểm tra xem dòng đầu tiên có phải là Header không (bằng cách check cột thứ 2 là X có phải là số không)
        const firstRowCols = lines[0].split(separator).filter(Boolean);
        if (isNaN(Number(firstRowCols[1]))) {
            startIndex = 1; // Bỏ qua header
        }

        for (let i = startIndex; i < lines.length; i++) {
            // Lọc bỏ các khoảng trắng thừa giữa các cột
            const cols = lines[i].split(separator).map(c => c.trim()).filter(Boolean);
            if (cols.length >= 3) { // Ít nhất phải có ID, X, Y
                parsedPoints.push({
                    pointId: cols[0] || `P${i}`,
                    x: cols[1] || "0",
                    y: cols[2] || "0",
                    z: cols[3] || "0",
                    code: cols[4] || ""
                });
            }
        }

        if (parsedPoints.length > 0) {
            onChange(parsedPoints);
            toast.success(`Đã đọc thành công ${parsedPoints.length} điểm tọa độ!`);
        } else {
            toast.error("Không tìm thấy dữ liệu hợp lệ trong file.");
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && (file.name.endsWith('.csv') || file.name.endsWith('.txt'))) {
            parseFile(file);
        } else {
            toast.error("Vui lòng tải lên file .csv hoặc .txt");
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) parseFile(file);
        // Reset input để có thể chọn lại cùng 1 file
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    if (data.length > 0) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 p-3 dark:border-blue-900/50 dark:bg-blue-900/20">
                    <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-600 p-2 text-white">
                            <FileSpreadsheet className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-blue-900 dark:text-blue-400">Dữ liệu máy Toàn đạc / RTK</p>
                            <p className="text-xs text-blue-700 dark:text-blue-500">Tổng cộng: {data.length} điểm đo</p>
                        </div>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => onChange([])} className="h-8">
                        <Trash2 className="mr-2 h-4 w-4" /> Xóa file
                    </Button>
                </div>

                <div className="custom-scrollbar max-h-[300px] overflow-hidden overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <Table>
                        <TableHeader className="sticky top-0 z-10 bg-slate-100 shadow-sm dark:bg-slate-900">
                            <TableRow>
                                <TableHead className="w-[80px] text-center font-bold">Điểm</TableHead>
                                <TableHead className="text-right font-bold">Tọa độ X</TableHead>
                                <TableHead className="text-right font-bold">Tọa độ Y</TableHead>
                                <TableHead className="text-right font-bold">Cao độ Z</TableHead>
                                <TableHead className="font-bold">Mã / Ghi chú</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="bg-white dark:bg-slate-950">
                            {data.slice(0, 100).map((pt, idx) => ( // Render tối đa 100 dòng để tránh lag DOM
                                <TableRow key={idx} className="dark:border-slate-800">
                                    <TableCell className="text-center font-mono font-bold text-slate-600 dark:text-slate-400">{pt.pointId}</TableCell>
                                    <TableCell className="text-right font-mono text-slate-700 dark:text-slate-300">{pt.x}</TableCell>
                                    <TableCell className="text-right font-mono text-slate-700 dark:text-slate-300">{pt.y}</TableCell>
                                    <TableCell className="text-right font-mono text-emerald-600 dark:text-emerald-400">{pt.z}</TableCell>
                                    <TableCell className="text-xs text-slate-500">{pt.code}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {data.length > 100 && (
                        <div className="border-t bg-slate-50 p-2 text-center text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                            Đang ẩn bớt {data.length - 100} điểm để tối ưu hiển thị...
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
                border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-200
                ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 bg-white dark:bg-slate-950'}
            `}
        >
            <input type="file" ref={fileInputRef} onChange={handleChange} accept=".csv,.txt" className="hidden" />
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <UploadCloud className="h-7 w-7" />
            </div>
            <h4 className="mb-1 text-sm font-bold text-slate-700 dark:text-slate-200">Kéo thả file tọa độ vào đây</h4>
            <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                Hỗ trợ file trút từ máy toàn đạc, cục thu RTK (.csv, .txt).<br />
                Định dạng chuẩn: Tên điểm, X, Y, Z, Mã.
            </p>
        </div>
    );
}