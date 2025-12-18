"use client";

import React from 'react';
import {
    Briefcase,
    HardHat,
    Factory,
    Users,
    AlertTriangle,
    Package
} from "lucide-react";

interface DashboardProps {
    overviewStats: any;
    designConsulting: any[];
    constructionSupervision: any[];
    civilProjects: any[];
    industrialProjects: any[];
    warrantyTasks: any[];
    customerManagement: any;
    inventoryLevels: any[];
    user: any;
    userRole: string;
}

export default function Dashboard({
    overviewStats,
    designConsulting,
    constructionSupervision,
    civilProjects,
    industrialProjects,
    warrantyTasks,
    customerManagement,
    inventoryLevels,
    user,
    userRole
}: DashboardProps) {

    // --- FIX: Tính toán tổng tồn kho ---
    const totalInventoryItems = inventoryLevels?.length || 0;
    const totalInventoryQuantity = inventoryLevels?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;

    return (
        <div className="flex-1 p-4 space-y-4">
            {/* Header chào mừng */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold tracking-tight">Tổng quan</h2>
                <div className="text-sm text-muted-foreground">
                    Xin chào, <span className="font-semibold text-primary">{user?.email}</span>
                </div>
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">

                {/* 1. Overview Statistics */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-md p-4 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Thống kê chung</h3>
                        <Briefcase className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Tổng dự án</p>
                            <p className="text-xl font-bold text-gray-800 dark:text-gray-200">{overviewStats?.total_projects || 0}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Dân dụng</p>
                            <p className="text-xl font-bold text-gray-800 dark:text-gray-200">{overviewStats?.total_civil_projects || 0}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Công nghiệp</p>
                            <p className="text-xl font-bold text-gray-800 dark:text-gray-200">{overviewStats?.total_industrial_projects || 0}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Khách hàng</p>
                            <p className="text-xl font-bold text-gray-800 dark:text-gray-200">{overviewStats?.total_customers || 0}</p>
                        </div>
                    </div>
                </div>

                {/* 2. Customer Management */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-md p-4 border-l-4 border-orange-500">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Khách hàng</h3>
                        <Users className="h-5 w-5 text-orange-500" />
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <p className="text-sm text-gray-500">Tổng số lượng</p>
                            <span className="font-bold text-lg">{customerManagement?.total_customers || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <p className="text-sm text-gray-500">Yêu cầu mới</p>
                            <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-sm font-bold">
                                +{customerManagement?.new_inquiries || 0}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 3. Inventory Levels */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-md p-4 border-l-4 border-emerald-500">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Kho vật tư</h3>
                        <Package className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-500">Mã vật tư</p>
                            <p className="text-xl font-bold">{totalInventoryItems}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Tổng tồn</p>
                            <p className="text-xl font-bold">{totalInventoryQuantity}</p>
                        </div>
                    </div>
                </div>

                {/* 4. Civil Projects List */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-md p-4 md:col-span-2 lg:col-span-1">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Dự án Dân dụng</h3>
                        <HardHat className="h-5 w-5 text-gray-400" />
                    </div>
                    <ul className="space-y-2">
                        {civilProjects?.length > 0 ? civilProjects.map((item, index) => (
                            <li key={index} className="flex justify-between items-center text-sm border-b pb-2 last:border-0 last:pb-0">
                                <span className="font-medium truncate max-w-[180px]" title={item.name}>{item.name}</span>
                                <span className={`px-2 py-0.5 rounded text-xs ${item.status === 'Hoàn thành' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {item.status}
                                </span>
                            </li>
                        )) : <li className="text-sm text-gray-500 italic">Chưa có dự án</li>}
                    </ul>
                </div>

                {/* 5. Industrial Projects List */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-md p-4 md:col-span-2 lg:col-span-1">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Dự án Công nghiệp</h3>
                        <Factory className="h-5 w-5 text-gray-400" />
                    </div>
                    <ul className="space-y-2">
                        {industrialProjects?.length > 0 ? industrialProjects.map((item, index) => (
                            <li key={index} className="flex justify-between items-center text-sm border-b pb-2 last:border-0 last:pb-0">
                                <span className="font-medium truncate max-w-[180px]" title={item.name}>{item.name}</span>
                                <span className="text-xs text-gray-500">{item.status}</span>
                            </li>
                        )) : <li className="text-sm text-gray-500 italic">Chưa có dự án</li>}
                    </ul>
                </div>

                {/* 6. Warranty Tasks */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-md p-4 md:col-span-2 lg:col-span-1">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Bảo hành</h3>
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    </div>
                    <ul className="space-y-2">
                        {warrantyTasks?.length > 0 ? warrantyTasks.map((item, index) => (
                            <li key={index} className="flex justify-between items-center text-sm border-b pb-2 last:border-0 last:pb-0">
                                <span className="truncate max-w-[180px]">{item.description || `Bảo hành #${item.id?.substring(0, 5)}`}</span>
                                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">{item.status}</span>
                            </li>
                        )) : <li className="text-sm text-gray-500 italic">Không có yêu cầu</li>}
                    </ul>
                </div>

            </div>
        </div>
    );
};