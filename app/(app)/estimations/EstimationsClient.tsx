"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Building2, ArrowRight, Layers, TrendingUp, Clock,
    CheckCircle2, AlertCircle, Search, Filter, Lock, Unlock
} from "lucide-react";

export default function EstimationsClient({ projects, stats }: { projects: any[], stats: any }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");

    // Lọc mảng dự án dựa trên Search (Tên/Mã) và Filter (Trạng thái)
    const filteredProjects = projects.filter((p) => {
        const matchesSearch = (p.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
            (p.code?.toLowerCase() || "").includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "ALL" || p.estimationStatus === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* 1. BAR THỐNG KÊ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-3.5">
                        <div className="p-2.5 bg-blue-500/10 text-blue-600 rounded-lg"><Layers className="w-5 h-5" /></div>
                        <div>
                            <p className="text-xs text-slate-400 font-medium uppercase">Tổng số hồ sơ</p>
                            <p className="text-xl font-black">{stats.total}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-3.5">
                        <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-lg"><CheckCircle2 className="w-5 h-5" /></div>
                        <div>
                            <p className="text-xs text-slate-400 font-medium uppercase">Đã có số liệu</p>
                            <p className="text-xl font-black">{stats.completed}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-3.5">
                        <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-lg"><Clock className="w-5 h-5" /></div>
                        <div>
                            <p className="text-xs text-slate-400 font-medium uppercase">Đang bóc tách</p>
                            <p className="text-xl font-black">{stats.inProgress}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 shadow-sm">
                    <CardContent className="p-4 flex items-center gap-3.5">
                        <div className="p-2.5 bg-slate-500/10 text-slate-500 rounded-lg"><AlertCircle className="w-5 h-5" /></div>
                        <div>
                            <p className="text-xs text-slate-400 font-medium uppercase">Chưa khởi tạo</p>
                            <p className="text-xl font-black">{stats.notStarted}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 2. THANH CÔNG CỤ (TÌM KIẾM & LỌC) THAY THẾ CHO NÚT TẠO MỚI */}
            <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo mã hoặc tên công trình..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="relative min-w-[200px]">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                    >
                        <option value="ALL">Tất cả trạng thái dự toán</option>
                        <option value="COMPLETED">✅ Đã có số liệu dự toán</option>
                        <option value="IN_PROGRESS">⏳ Đang bóc tách dở dang</option>
                        <option value="NOT_STARTED">❌ Chưa khởi tạo hồ sơ</option>
                    </select>
                </div>
            </div>

            {/* 3. DANH SÁCH DỰ ÁN */}
            {filteredProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
                    {filteredProjects.map((project) => (
                        <Card
                            key={project.id}
                            className={`group flex flex-col justify-between border bg-white dark:bg-slate-950 transition-all duration-300 hover:shadow-xl rounded-xl overflow-hidden relative ${project.isLocked
                                    ? "border-slate-200 bg-slate-50 dark:bg-slate-900/40 opacity-80" // Style cho thẻ bị khóa
                                    : project.estimationStatus === "COMPLETED"
                                        ? "border-emerald-200 hover:border-emerald-400 dark:border-emerald-900/40"
                                        : project.estimationStatus === "IN_PROGRESS"
                                            ? "border-amber-200 hover:border-amber-400 dark:border-amber-900/40"
                                            : "border-slate-200 hover:border-blue-400 dark:border-slate-800"
                                }`}
                        >
                            <div className="p-5 flex-1">
                                <div className="flex justify-between items-start">
                                    <div className={`p-2 rounded-lg ${project.isLocked ? "bg-slate-200 text-slate-500 dark:bg-slate-800"
                                            : project.estimationStatus === "COMPLETED" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20"
                                                : project.estimationStatus === "IN_PROGRESS" ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20"
                                                    : "bg-blue-50 text-blue-600 dark:bg-blue-900/20"
                                        }`}>
                                        <Building2 className="w-5 h-5" />
                                    </div>

                                    <div className="flex gap-2">
                                        {/* Hiển thị Icon Khóa nếu dự án đã đóng */}
                                        {project.isLocked && (
                                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-red-100 text-red-700 flex items-center gap-1">
                                                <Lock className="w-3 h-3" /> Dự án Đóng
                                            </span>
                                        )}
                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${project.estimationStatus === "COMPLETED" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                                                : project.estimationStatus === "IN_PROGRESS" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                                                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                                            }`}>
                                            {project.estimationStatus === "COMPLETED" && "Đã có số liệu"}
                                            {project.estimationStatus === "IN_PROGRESS" && "Đang bóc tách"}
                                            {project.estimationStatus === "NOT_STARTED" && "Chưa lập hồ sơ"}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <span className="font-mono text-xs font-bold text-slate-400 block mb-1">
                                        Mã CT: {project.code || "---"}
                                    </span>
                                    <h2 className="text-base font-black text-slate-800 dark:text-slate-200 line-clamp-2 leading-tight" title={project.name}>
                                        {project.name.toUpperCase()}
                                    </h2>
                                </div>

                                <div className="mt-5 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800/50 space-y-2 text-xs">
                                    <div className="flex justify-between items-center text-slate-500">
                                        <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5" /> Khối lượng (QTO):</span>
                                        <span className="font-bold text-slate-700 dark:text-slate-300">{project.totalTasks} dòng</span>
                                    </div>
                                    <div className="flex justify-between items-center border-t dark:border-slate-800/80 pt-2 text-slate-500">
                                        <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> Tổng tiền:</span>
                                        <span className={`font-mono font-black text-sm ${project.totalCost > 0 ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`}>
                                            {project.totalCost > 0 ? `${project.totalCost.toLocaleString("vi-VN")} đ` : "0 đ"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="px-5 pb-5 pt-2 border-t border-slate-50 dark:border-slate-900/50 bg-slate-50/30 dark:bg-slate-950/20">
                                <Link href={`/estimations/${project.id}`}>
                                    <Button
                                        variant={project.isLocked ? "outline" : "default"}
                                        className={`w-full font-black text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5 shadow-sm rounded-lg py-2.5 h-auto ${project.isLocked ? "bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700 border-slate-300"
                                                : project.estimationStatus === "COMPLETED" ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                                    : project.estimationStatus === "IN_PROGRESS" ? "bg-amber-600 hover:bg-amber-700 text-white"
                                                        : "bg-slate-900 hover:bg-blue-600 text-white dark:bg-slate-800 dark:hover:bg-blue-600"
                                            }`}
                                    >
                                        {project.isLocked ? (
                                            <><Lock className="w-3.5 h-3.5" /> Xem dự toán (Đã khóa)</>
                                        ) : project.estimationStatus === "NOT_STARTED" ? (
                                            <><Unlock className="w-3.5 h-3.5" /> Bắt đầu lập dự toán</>
                                        ) : (
                                            <>Mở không gian tính toán <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" /></>
                                        )}
                                    </Button>
                                </Link>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="py-20 flex flex-col items-center justify-center text-center border-2 border-dashed rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 max-w-2xl mx-auto shadow-sm px-4">
                    <Search className="w-10 h-10 text-slate-300 mb-3" />
                    <h3 className="font-bold text-slate-700 dark:text-slate-300">Không tìm thấy dự án phù hợp</h3>
                    <p className="text-sm text-slate-500 mt-1">Hãy thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.</p>
                </div>
            )}
        </div>
    );
}