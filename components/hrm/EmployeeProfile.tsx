import React from "react";
import type { Employee } from "./EmployeeList";

interface EmployeeProfileProps {
  employee: Employee;
  onEdit?: () => void;
}

export const EmployeeProfile: React.FC<EmployeeProfileProps> = ({ employee, onEdit }) => (
  <div className="bg-white rounded-lg shadow p-4">
    <h2 className="text-xl font-bold mb-4">Hồ sơ nhân viên</h2>
    <div className="space-y-2">
      <div><strong>Mã NV:</strong> {employee.code}</div>
      <div><strong>Họ tên:</strong> {employee.name}</div>
      <div><strong>Phòng ban:</strong> {employee.department}</div>
      <div><strong>Chức vụ:</strong> {employee.position}</div>
      <div><strong>Trạng thái:</strong> {employee.status === "active" ? "Đang làm" : "Nghỉ việc"}</div>
      {/* Thêm thông tin chi tiết khác ở đây */}
    </div>
    {onEdit && (
      <button onClick={onEdit} className="mt-4 bg-blue-500 text-white px-4 py-2 rounded">
        Chỉnh sửa
      </button>
    )}
  </div>
);

export default EmployeeProfile;