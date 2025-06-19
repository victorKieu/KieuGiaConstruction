import React from "react";

export interface LeaveRequest {
  id: string;
  employeeCode: string;
  name: string;
  fromDate: string;
  toDate: string;
  leaveType: string;
  status: "pending" | "approved" | "rejected";
}

interface LeaveManagementProps {
  requests: LeaveRequest[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export const LeaveManagement: React.FC<LeaveManagementProps> = ({ requests, onApprove, onReject }) => (
  <div className="bg-white rounded-lg shadow p-4">
    <h2 className="text-xl font-bold mb-4">Quản lý nghỉ phép</h2>
    <table className="w-full table-auto">
      <thead>
        <tr>
          <th>Mã NV</th>
          <th>Họ tên</th>
          <th>Từ ngày</th>
          <th>Đến ngày</th>
          <th>Loại phép</th>
          <th>Trạng thái</th>
          <th>Hành động</th>
        </tr>
      </thead>
      <tbody>
        {requests.map(req => (
          <tr key={req.id}>
            <td>{req.employeeCode}</td>
            <td>{req.name}</td>
            <td>{req.fromDate}</td>
            <td>{req.toDate}</td>
            <td>{req.leaveType}</td>
            <td>
              {req.status === "pending" && <span className="text-yellow-500">Chờ duyệt</span>}
              {req.status === "approved" && <span className="text-green-600">Đã duyệt</span>}
              {req.status === "rejected" && <span className="text-red-600">Từ chối</span>}
            </td>
            <td>
              {req.status === "pending" && (
                <>
                  <button onClick={() => onApprove(req.id)} className="bg-green-500 text-white px-2 py-1 rounded mr-2">Duyệt</button>
                  <button onClick={() => onReject(req.id)} className="bg-red-500 text-white px-2 py-1 rounded">Từ chối</button>
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default LeaveManagement;