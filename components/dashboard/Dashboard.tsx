import React from 'react';
import { Camera } from "lucide-react";
import { getRecentCustomers } from "@/lib/actions"; // Đường dẫn đến hàm getRecentCustomers

interface DashboardProps {
    overviewStats: any;
    designConsulting: any[];
    constructionSupervision: any[];
    civilProjects: any[];
    industrialProjects: any[];
    warrantyTasks: any[];
    customerManagement: any;
    inventoryLevels: any[];
    user: any;        // <-- BỔ SUNG
    userRole: string; // <-- BỔ SUNG
}

const ConstructionDashboard: React.FC<DashboardProps> = ({
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
}) => {

    return (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 p-4">
            {/* Overview Statistics */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-md p-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Overview Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Active Projects</p>
                        <p className="font-medium text-gray-800 dark:text-gray-200">{overviewStats?.active_projects || 0}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
                        <p className="font-medium text-gray-800 dark:text-gray-200">{overviewStats?.total_revenue || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Upcoming Deadlines</p>
                        <p className="font-medium text-gray-800 dark:text-gray-200">{overviewStats?.upcoming_deadlines || 0}</p>
                    </div>
                    <div>
                        {/* Placeholder for Revenue Chart */}
                        <div className="h-20 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400">
                            Revenue Chart
                        </div>
                    </div>
                </div>
            </div>

            {/* Design Consulting Activities */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-md p-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Design Consulting</h3>
                <ul>
                    {designConsulting?.length > 0 ? designConsulting.map((item, index) => (
                        <li key={index} className="py-2 border-b dark:border-gray-700 last:border-b-0">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-300">{item.task}</span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">{item.status}</span>
                            </div>
                        </li>
                    )) : <li>Không có dữ liệu</li>}
                </ul>
            </div>

            {/* Construction Supervision Status */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-md p-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Construction Supervision</h3>
                <ul>
                    {constructionSupervision?.length > 0 ? constructionSupervision.map((item, index) => (
                        <li key={index} className="py-2 border-b dark:border-gray-700 last:border-b-0">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-300">{item.project}</span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">{item.status}</span>
                            </div>
                        </li>
                    )) : <li>Không có dữ liệu</li>}
                </ul>
            </div>

            {/* Civil Construction Projects */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-md p-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Civil Projects</h3>
                <ul>
                    {civilProjects?.length > 0 ? civilProjects.map((item, index) => (
                        <li key={index} className="py-2 border-b dark:border-gray-700 last:border-b-0">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-300">{item.project}</span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">{item.status}</span>
                            </div>
                        </li>
                    )) : <li>Không có dữ liệu</li>}
                </ul>
            </div>

            {/* Industrial Construction Projects */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-md p-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Industrial Projects</h3>
                <ul>
                    {industrialProjects?.length > 0 ? industrialProjects.map((item, index) => (
                        <li key={index} className="py-2 border-b dark:border-gray-700 last:border-b-0">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-300">{item.project}</span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">{item.status}</span>
                            </div>
                        </li>
                    )) : <li>Không có dữ liệu</li>}
                </ul>
            </div>

            {/* Warranty Tasks */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-md p-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Warranty Tasks</h3>
                <ul>
                    {warrantyTasks?.length > 0 ? warrantyTasks.map((item, index) => (
                        <li key={index} className="py-2 border-b dark:border-gray-700 last:border-b-0">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-300">{item.task}</span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">{item.status}</span>
                            </div>
                        </li>
                    )) : <li>Không có dữ liệu</li>}
                </ul>
            </div>

            {/* Customer Management */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-md p-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Customer Management</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total Customers</p>
                        <p className="font-medium text-gray-800 dark:text-gray-200">{customerManagement?.total_customers || 0}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">New Inquiries</p>
                        <p className="font-medium text-gray-800 dark:text-gray-200">{customerManagement?.new_inquiries || 0}</p>
                    </div>
                    {/* Placeholder for Customer Chart */}
                    <div className="h-20 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 md:col-span-2">
                        Customer Chart
                    </div>
                </div>
            </div>

            {/* Inventory Levels */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-md p-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Inventory Levels</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Cement</p>
                        <p className="font-medium text-gray-800 dark:text-gray-200">{inventoryLevels?.find(item => item.item_name === "Cement")?.level || 'N/A'}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Steel</p>
                        <p className="font-medium text-gray-800 dark:text-gray-200">{inventoryLevels?.find(item => item.item_name === "Steel")?.level || 'N/A'}</p>
                    </div>
                    {/* Placeholder for Inventory Chart */}
                    <div className="h-20 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 md:col-span-2">
                        Inventory Chart
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConstructionDashboard;