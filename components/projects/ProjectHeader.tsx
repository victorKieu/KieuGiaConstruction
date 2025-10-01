import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from 'lucide-react';
// 💡 Bổ sung: Import useRouter từ next/navigation
import { useRouter } from 'next/navigation';

// Hàm giả định để lấy class badge và label
function getStatusLabel(status: string): string {
    // ... (logic cũ)
    switch (status) {
        case "in_progress": return "Đang tiến hành";
        case "completed": return "Hoàn thành";
        case "on_hold": return "Tạm dừng";
        default: return "Khởi tạo";
    }
}
function getBadgeClass(status: string): string {
    // ... (logic cũ)
    switch (status) {
        case "completed": return "bg-green-100 text-green-700";
        case "in_progress": return "bg-blue-100 text-blue-800";
        case "on_hold": return "bg-yellow-100 text-yellow-700";
        default: return "bg-gray-100 text-gray-700";
    }
}

// Định nghĩa props mới
interface ProjectHeaderProps {
    project: {
        name: string;
        code: string;
        status: string;
    };
    // 💡 Bổ sung: Các hàm handler cho các nút
    onEditClick: () => void;
    onDeleteClick: () => void;
    onTaskClick: () => void;
    // onBack sẽ được xử lý nội bộ bằng useRouter
}


export default function ProjectHeader({ project, onEditClick, onDeleteClick, onTaskClick }: ProjectHeaderProps) {
    // 💡 Bổ sung: Sử dụng useRouter
    const router = useRouter();

    // Hàm xử lý Quay lại (dùng cho cả nút ChevronLeft và nút Quay về)
    const handleBack = () => {
        router.back();
    };

    return (
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className='w-full'>
                {/* Nút Back - Dùng hàm router.back() */}
                <div className="mb-2 -mt-4">
                    <button
                        onClick={handleBack} // 💡 Gán action
                        className="inline-flex items-center px-3 py-1.5 rounded-full text-sm tracking-wider
                                   text-indigo-700 bg-indigo-50 
                                   hover:bg-indigo-100 hover:shadow-sm
                                   transition duration-150 active:bg-indigo-200 font-semibold border border-indigo-200"
                        aria-label="Quay lại"
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        <span>Quay lại</span>
                    </button>
                </div>

                {/* Tiêu đề chính */}
                <h1 className="text-3xl font-extrabold text-gray-800 leading-none mb-1">{project.name}</h1>

                {/* Thông tin phụ */}
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span>Mã dự án: <span className="font-semibold text-gray-700">{project.code}</span></span>
                    <span className="h-4 border-l"></span>
                    <span>Trạng thái:
                        <Badge className={`${getBadgeClass(project.status)} ml-2 border border-current`}>
                            {getStatusLabel(project.status)}
                        </Badge>
                    </span>
                </div>
            </div>

            {/* Các nút hành động */}
            <div className="flex gap-2 mt-4 sm:mt-0 flex-shrink-0">
                <Button onClick={onTaskClick}>Công việc</Button>           {/* 💡 Gán prop */}
                <Button variant="outline" onClick={onEditClick}>Chỉnh sửa</Button> {/* 💡 Gán prop */}
                <Button variant="destructive" onClick={onDeleteClick}>Xóa dự án</Button> {/* 💡 Gán prop */}
            </div>
        </div>
    );
}