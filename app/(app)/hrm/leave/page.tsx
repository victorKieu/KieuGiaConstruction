'use client'
import React from "react";
import { LeaveManagement, LeaveRequest } from "@/components/hrm/LeaveManagement";

const leaves: LeaveRequest[] = [
  { id: "1", employeeCode: "NV001", name: "Nguyễn Văn A", fromDate: "2025-06-01", toDate: "2025-06-03", leaveType: "Phép năm", status: "pending" },
];

export default function LeavePage() {
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Quản lý nghỉ phép</h1>
      <LeaveManagement
        requests={leaves}
        onApprove={id => alert("Duyệt đơn " + id)}
        onReject={id => alert("Từ chối đơn " + id)}
      />
    </div>
  );
}