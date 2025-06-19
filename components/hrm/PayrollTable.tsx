import React from "react";

export interface PayrollRecord {
  id: string;
  employeeCode: string;
  name: string;
  department: string;
  month: string;
  salary: number;
  bonus: number;
  deduction: number;
  netSalary: number;
}

interface PayrollTableProps {
  records: PayrollRecord[];
}

export const PayrollTable: React.FC<PayrollTableProps> = ({ records }) => (
  <div className="bg-white rounded-lg shadow p-4">
    <h2 className="text-xl font-bold mb-4">Bảng lương</h2>
    <table className="w-full table-auto">
      <thead>
        <tr>
          <th>Tháng</th>
          <th>Mã NV</th>
          <th>Họ tên</th>
          <th>Phòng ban</th>
          <th>Lương cơ bản</th>
          <th>Thưởng</th>
          <th>Khấu trừ</th>
          <th>Lương thực nhận</th>
        </tr>
      </thead>
      <tbody>
        {records.map(rec => (
          <tr key={rec.id}>
            <td>{rec.month}</td>
            <td>{rec.employeeCode}</td>
            <td>{rec.name}</td>
            <td>{rec.department}</td>
            <td>{rec.salary.toLocaleString()} đ</td>
            <td>{rec.bonus.toLocaleString()} đ</td>
            <td>{rec.deduction.toLocaleString()} đ</td>
            <td className="font-bold text-green-600">{rec.netSalary.toLocaleString()} đ</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default PayrollTable;