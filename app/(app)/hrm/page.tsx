'use client'
import React, { useState } from "react";
import { EmployeeList, Employee } from "@/components/hrm/EmployeeList";
import { EmployeeProfile } from "@/components/hrm/EmployeeProfile";
import { AttendanceTable, AttendanceRecord } from "@/components/hrm/AttendanceTable";
import { LeaveManagement, LeaveRequest } from "@/components/hrm/LeaveManagement";
import { PayrollTable, PayrollRecord } from "@/components/hrm/PayrollTable";

const employees: Employee[] = [
  { id: "1", name: "Nguyễn Văn A", code: "NV001", department: "Kế toán", position: "Nhân viên", status: "active" },
  { id: "2", name: "Trần Thị B", code: "NV002", department: "Kỹ thuật", position: "Trưởng phòng", status: "inactive" },
];
const attendance: AttendanceRecord[] = [
  { id: "1", date: "2025-05-20", employeeCode: "NV001", name: "Nguyễn Văn A", checkIn: "08:05", checkOut: "17:00", status: "Đủ công" },
];
const leaves: LeaveRequest[] = [
  { id: "1", employeeCode: "NV001", name: "Nguyễn Văn A", fromDate: "2025-06-01", toDate: "2025-06-03", leaveType: "Phép năm", status: "pending" },
];
const payroll: PayrollRecord[] = [
  { id: "1", employeeCode: "NV001", name: "Nguyễn Văn A", department: "Kế toán", month: "05/2025", salary: 10000000, bonus: 500000, deduction: 200000, netSalary: 10300000 },
];

export default function HRMDashboard() {
  const [selected, setSelected] = useState<Employee | null>(null);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-extrabold">Dashboard HRM</h1>
      <EmployeeList employees={employees} onSelect={setSelected} />
      {selected && <EmployeeProfile employee={selected} />}
      <AttendanceTable records={attendance} />
      <LeaveManagement
        requests={leaves}
        onApprove={id => alert("Duyệt đơn " + id)}
        onReject={id => alert("Từ chối đơn " + id)}
      />
      <PayrollTable records={payroll} />
    </div>
  );
}