import React from "react";
// Nếu bạn chưa cài lucide-react: npm install lucide-react
import { User, Mail, Phone, MapPin, Briefcase, Building, Calendar, Edit } from "lucide-react";
import { Employee } from '@/types/hrm';

interface EmployeeProfileProps {
    employee: Employee;
    onEdit?: () => void;
}

// Component con để hiển thị từng dòng thông tin
const InfoItem = ({ icon: Icon, label, value }: { icon: any, label: string, value?: string | number }) => (
    <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md transition-colors">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-600">
            <Icon size={16} />
        </div>
        <div>
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <p className="text-sm text-gray-900 font-semibold">{value || "Chưa cập nhật"}</p>
        </div>
    </div>
);

export const EmployeeProfile: React.FC<EmployeeProfileProps> = ({ employee, onEdit }) => {
    // Hàm lấy màu cho trạng thái
    const getStatusColor = (status: string) => {
        return status === "active"
            ? "bg-green-100 text-green-700 border-green-200"
            : "bg-gray-100 text-gray-600 border-gray-200";
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-w-2xl mx-auto">
            {/* Header: Cover & Avatar */}
            <div className="h-32 bg-gradient-to-r from-blue-500 to-cyan-400 relative">
                {onEdit && (
                    <button
                        onClick={onEdit}
                        className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full backdrop-blur-sm transition-all"
                        title="Chỉnh sửa hồ sơ"
                    >
                        <Edit size={18} />
                    </button>
                )}
            </div>

            <div className="px-6 pb-6 relative">
                {/* Avatar Section */}
                <div className="flex justify-between items-end -mt-12 mb-6">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full border-4 border-white bg-gray-200 overflow-hidden shadow-md flex items-center justify-center">
                            {employee.avatar ? (
                                <img src={employee.avatar} alt={employee.name} className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-2xl font-bold text-gray-400">{employee.name.charAt(0).toUpperCase()}</span>
                            )}
                        </div>
                        <span className={`absolute bottom-1 right-1 w-5 h-5 border-4 border-white rounded-full ${employee.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                    </div>

                    <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(employee.status)}`}>
                        {employee.status === "active" ? "Đang làm việc" : "Đã nghỉ việc"}
                    </div>
                </div>

                {/* Name & Role */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">{employee.name}</h1>
                    <p className="text-blue-600 font-medium flex items-center gap-1 mt-1">
                        <Briefcase size={14} /> {employee.position}
                    </p>
                    <p className="text-gray-500 text-sm mt-1">Mã NV: <span className="font-mono text-gray-700">{employee.code}</span></p>
                </div>

                <hr className="border-gray-100 mb-6" />

                {/* Grid thông tin chi tiết */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoItem icon={Building} label="Phòng ban" value={employee.department} />
                    <InfoItem icon={Mail} label="Email" value={employee.email} />
                    <InfoItem icon={Phone} label="Điện thoại" value={employee.phone} />
                    <InfoItem icon={Calendar} label="Ngày vào làm" value={employee.joinDate} />
                    <div className="md:col-span-2">
                        <InfoItem icon={MapPin} label="Địa chỉ" value={employee.address} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeProfile;