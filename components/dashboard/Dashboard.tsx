import React from 'react';
// import { Camera } from "lucide-react"; // Tạm thời comment nếu không dùng
// import { getRecentCustomers } from "@/lib/actions"; // Tạm thời comment nếu không dùng

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

    // --- FIX: Tính toán tổng tồn kho (vì CSDL không có tên 'Cement'/'Steel') ---
    const totalInventoryItems = inventoryLevels?.length || 0;
    const totalInventoryQuantity = inventoryLevels?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

    return (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 p-4">

            {/* Overview Statistics */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-md p-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Tổng quan Thống kê</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Tổng dự án</p>
                        {/* --- FIX: Sửa 'active_projects' thành 'total_projects' --- */}
                        <p className="font-medium text-gray-800 dark:text-gray-200">{overviewStats?.total_projects || 0}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Dự án Dân dụng</p>
                        {/* --- FIX: Sửa 'total_revenue' thành 'total_civil_projects' --- */}
                        <p className="font-medium text-gray-800 dark:text-gray-200">{overviewStats?.total_civil_projects || 0}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Dự án Công nghiệp</p>
                        {/* --- FIX: Sửa 'upcoming_deadlines' thành 'total_industrial_projects' --- */}
                        <p className="font-medium text-gray-800 dark:text-gray-200">{overviewStats?.total_industrial_projects || 0}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Tổng Khách hàng</p>
                        {/* --- FIX: Thêm 'total_customers' --- */}
                        <p className="font-medium text-gray-800 dark:text-gray-200">{overviewStats?.total_customers || 0}</p>
                    </div>
                </div>
            </div>

            {/* Design Consulting Activities */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-md p-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Tư vấn Thiết kế (Tạm ẩn)</h3>
                <ul>
                    {/* --- FIX: RPC đã trả về '[]' nên logic này chạy đúng --- */}
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

            {/* Construction Supervision Status (project_milestones) */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-md p-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Giám sát Thi công</h3>
                <ul>
                    {constructionSupervision?.length > 0 ? constructionSupervision.map((item, index) => (
                        <li key={index} className="py-2 border-b dark:border-gray-700 last:border-b-0">
                            <div className="flex justify-between items-center">
                                {/* --- FIX: Sửa 'item.project' thành 'item.milestone' (tên cột trong project_milestones) --- */}
                                <span className="text-gray-600 dark:text-gray-300">{item.milestone}</span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">{item.status}</span>
                            </div>
                        </li>
                    )) : <li>Không có dữ liệu</li>}
                </ul>
            </div>

            {/* Civil Construction Projects (projects) */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-md p-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Dự án Dân dụng</h3>
                <ul>
                    {civilProjects?.length > 0 ? civilProjects.map((item, index) => (
                        <li key={index} className="py-2 border-b dark:border-gray-700 last:border-b-0">
                            <div className="flex justify-between items-center">
                                {/* --- FIX: Sửa 'item.project' thành 'item.name' (tên cột trong projects) --- */}
                                <span className="text-gray-600 dark:text-gray-300">{item.name}</span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">{item.status}</span>
                            </div>
                        </li>
                    )) : <li>Không có dữ liệu</li>}
                </ul>
            </div>

            {/* Industrial Construction Projects (projects) */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-md p-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Dự án Công nghiệp</h3>
                <ul>
                    {industrialProjects?.length > 0 ? industrialProjects.map((item, index) => (
                        <li key={index} className="py-2 border-b dark:border-gray-700 last:border-b-0">
                            <div className="flex justify-between items-center">
                                {/* --- FIX: Sửa 'item.project' thành 'item.name' (tên cột trong projects) --- */}
                                <span className="text-gray-600 dark:text-gray-300">{item.name}</span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">{item.status}</span>
                            </div>
                        </li>
                    )) : <li>Không có dữ liệu</li>}
                </ul>
            </div>

            {/* Warranty Tasks (warranties) */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-md p-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Tác vụ Bảo hành</h3>
                <ul>
                    {warrantyTasks?.length > 0 ? warrantyTasks.map((item, index) => (
                        <li key={index} className="py-2 border-b dark:border-gray-700 last:border-b-0">
                            <div className="flex justify-between items-center">
                                {/* --- FIX: Sửa 'item.task' thành 'item.description' (tên cột trong warranties) --- */}
                                <span className="text-gray-600 dark:text-gray-300">{item.description || `Bảo hành #${item.id.substring(0, 5)}`}</span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">{item.status}</span>
                            </div>
                        </li>
                    )) : <li>Không có dữ liệu</li>}
                </ul>
            </div>

            {/* Customer Management (customers) */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-md p-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Quản lý Khách hàng</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Tổng Khách hàng</p>
                        {/* --- FIX: Tên prop này đã đúng --- */}
                        <p className="font-medium text-gray-800 dark:text-gray-200">{customerManagement?.total_customers || 0}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Yêu cầu mới</p>
                        {/* --- FIX: Tên prop này đã đúng --- */}
                        <p className="font-medium text-gray-800 dark:text-gray-200">{customerManagement?.new_inquiries || 0}</p>
                    </div>
                </div>
            </div>

            {/* Inventory Levels (warehouse_inventory) */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-md p-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Tồn kho</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Số loại Vật tư</p>
                        {/* --- FIX: Logic cũ (Cement/Steel) bị hỏng, thay bằng logic tính tổng --- */}
                        <p className="font-medium text-gray-800 dark:text-gray-200">{totalInventoryItems}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Tổng Số lượng</p>
                        {/* --- FIX: Logic cũ (Cement/Steel) bị hỏng, thay bằng logic tính tổng --- */}
                        <p className="font-medium text-gray-800 dark:text-gray-200">{totalInventoryQuantity}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConstructionDashboard;