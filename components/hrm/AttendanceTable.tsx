import React from "react";

export interface AttendanceRecord {
  id: string;
  date: string;
  employeeCode: string;
  name: string;
  checkIn: string;
  checkOut: string;
  status: string;
}

interface AttendanceTableProps {
  records: AttendanceRecord[];
}

export const AttendanceTable: React.FC<AttendanceTableProps> = ({ records }) => (
  <div className="bg-white rounded-lg shadow p-4">
    <h2 className="text-xl font-bold mb-4">Bảng chấm công</h2>
    <table className="w-full table-auto">
      <thead>
        <tr>
          <th>Ngày</th>
          <th>Mã NV</th>
          <th>Họ tên</th>
          <th>Giờ vào</th>
          <th>Giờ ra</th>
          <th>Trạng thái</th>
        </tr>
      </thead>
      <tbody>
        {records.map(r => (
          <tr key={r.id}>
            <td>{r.date}</td>
            <td>{r.employeeCode}</td>
            <td>{r.name}</td>
            <td>{r.checkIn}</td>
            <td>{r.checkOut}</td>
            <td>{r.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default AttendanceTable;